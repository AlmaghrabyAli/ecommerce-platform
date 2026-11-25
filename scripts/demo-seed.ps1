<#
.SYNOPSIS
  Bazaaro demo data + end-to-end API test runner (Windows PowerShell 5.1 or PowerShell 7).

.DESCRIPTION
  Mode Images : gives every product that has no uploaded image yet a real, relevant photo
                from Pexels (uploaded through the admin API into the database). Products that
                already have an uploaded image are left alone. Needs a free Pexels API key in
                $env:PEXELS_API_KEY. Extra demo products are added only with -AddExtraProducts.
  Mode Prepare: creates the folder scripts\product-images and a checklist (_checklist.md) with the
                exact file name to use for every product and a Pexels search link. No login needed.
  Mode Local  : uploads the photos you saved in that folder (file name = product slug, for example
                air-fryer-5l.jpg) to the matching products. No Pexels key needed.
  Mode Shop   : registers demo customers and runs the whole shop through the real API:
                catalog filters, carts, checkout, payments, order status flow, cancellations,
                stock restore, role checks, concurrency, validation errors and dashboard stats.
  Mode All    : both, in that order.

  Everything goes through the public/admin REST API. Nothing touches the database directly
  and no secret is stored in this file (the demo passwords below are public demo credentials).

.EXAMPLE
  $env:PEXELS_API_KEY = 'your-key'
  powershell -ExecutionPolicy Bypass -File .\scripts\demo-seed.ps1 -Mode Images
  powershell -ExecutionPolicy Bypass -File .\scripts\demo-seed.ps1 -Mode Shop
#>
[CmdletBinding()]
param(
    [string]$BaseUrl       = 'https://bazaaro.tryasp.net/api',
    [ValidateSet('Prepare', 'Local', 'Images', 'Shop', 'All')]
    [string]$Mode          = 'All',
    [string]$AdminEmail    = 'admin@shop.test',
    [string]$AdminPassword = 'Admin@12345',
    [string]$DemoPassword  = 'Demo@12345',
    [string]$ImagesFolder  = '',
    [switch]$RefreshImages,
    [switch]$MoreOrders,
    [switch]$AddExtraProducts,
    [switch]$RemoveTestProduct
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Drawing

$BaseUrl = $BaseUrl.TrimEnd('/')
$Root    = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$WorkDir = Join-Path $Root 'demo-run'
if (-not $ImagesFolder) { $ImagesFolder = Join-Path $Root 'product-images' }
$ImgDir  = Join-Path $WorkDir 'images'
New-Item -ItemType Directory -Force -Path $ImgDir | Out-Null

# Shipping rules (must match Shipping:FlatFee / Shipping:FreeThreshold on the server)
$FlatFee  = 50
$FreeFrom = 1000

$script:Pass     = 0
$script:Fail     = 0
$script:Failures = @()
$script:AdminToken = $null
$script:PexelsKey  = $env:PEXELS_API_KEY

# ---------------------------------------------------------------- helpers

function Section([string]$Title) {
    Write-Host ''
    Write-Host "== $Title ==" -ForegroundColor Cyan
}

function Check([string]$Name, [bool]$Ok, [string]$Detail = '') {
    if ($Ok) {
        $script:Pass++
        Write-Host "  [PASS] $Name" -ForegroundColor Green
    }
    else {
        $script:Fail++
        $script:Failures += "$Name $Detail"
        Write-Host "  [FAIL] $Name  $Detail" -ForegroundColor Red
    }
}

function Api {
    param([string]$Method, [string]$Path, [string]$Token, $Body)

    $req = @{ UseBasicParsing = $true; Method = $Method; Uri = "$BaseUrl$Path"; TimeoutSec = 90 }
    if ($Token) { $req.Headers = @{ Authorization = "Bearer $Token" } }
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 6 -Compress
        $req.Body = [Text.Encoding]::UTF8.GetBytes($json)
        $req.ContentType = 'application/json; charset=utf-8'
    }

    $code = 0
    $text = ''
    try {
        $r = Invoke-WebRequest @req
        $code = [int]$r.StatusCode
        $text = [string]$r.Content
    }
    catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $code = [int]$resp.StatusCode
            try {
                $sr = New-Object IO.StreamReader($resp.GetResponseStream())
                $text = $sr.ReadToEnd()
                $sr.Close()
            }
            catch { $text = '' }
        }
        else { $text = $_.Exception.Message }
    }

    $data = $null
    if (-not [string]::IsNullOrWhiteSpace($text)) {
        $t = $text.TrimStart()
        if ($t.StartsWith('{') -or $t.StartsWith('[')) {
            try { $data = $text | ConvertFrom-Json } catch { $data = $null }
        }
    }
    return [pscustomobject]@{ Code = $code; Data = $data; Text = $text }
}

function Login([string]$Email, [string]$Password) {
    $r = Api POST '/auth/login' $null @{ email = $Email; password = $Password }
    if ($r.Code -ne 200) { return $null }
    return [string]$r.Data.token
}

function Ensure-Customer([string]$Name, [string]$Email) {
    $r = Api POST '/auth/register' $null @{ fullName = $Name; email = $Email; password = $DemoPassword }
    if ($r.Code -eq 200) { return [string]$r.Data.token }
    if ($r.Code -eq 409) { return (Login $Email $DemoPassword) }
    return $null
}

function Slugify([string]$Text) {
    $s = ($Text.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
    if ($s.Length -eq 0) { return 'item' }
    return $s
}

function Get-AdminProducts {
    $all = @()
    $page = 1
    do {
        $r = Api GET "/admin/products?page=$page&pageSize=50" $script:AdminToken $null
        if ($r.Code -ne 200) { throw "Cannot list admin products (status $($r.Code))" }
        $all += @($r.Data.items)
        $pages = [int]$r.Data.totalPages
        $page++
    } while ($page -le $pages)
    return $all
}

function Get-PublicProducts {
    $all = @()
    $page = 1
    do {
        $r = Api GET "/products?page=$page&pageSize=50" $null $null
        if ($r.Code -ne 200) { throw "Cannot list products (status $($r.Code))" }
        $all += @($r.Data.items)
        $pages = [int]$r.Data.totalPages
        $page++
    } while ($page -le $pages)
    return $all
}

function Get-AllAdminOrders {
    $all = @()
    $page = 1
    do {
        $r = Api GET "/admin/orders?page=$page&pageSize=50" $script:AdminToken $null
        if ($r.Code -ne 200) { throw "Cannot list admin orders (status $($r.Code))" }
        $all += @($r.Data.items)
        $pages = [int]$r.Data.totalPages
        $page++
    } while ($page -le $pages)
    return $all
}

function Get-Stock([string]$Slug) {
    $r = Api GET "/products/$Slug" $null $null
    if ($r.Code -ne 200) { return -1 }
    return [int]$r.Data.stockQuantity
}

# ---------------------------------------------------------------- images (Pexels)

$CreditsFile = Join-Path $WorkDir 'image-credits.json'
$script:Credits = @{}
if (Test-Path $CreditsFile) {
    $raw = Get-Content $CreditsFile -Raw
    if ($raw -and $raw.Length -gt 2) {
        foreach ($prop in ($raw | ConvertFrom-Json).PSObject.Properties) { $script:Credits[$prop.Name] = $prop.Value }
    }
}

$OverridesFile = Join-Path $WorkDir 'image-overrides.json'
$script:Overrides = @{}
if (Test-Path $OverridesFile) {
    $raw = Get-Content $OverridesFile -Raw
    if ($raw -and $raw.Length -gt 2) {
        foreach ($prop in ($raw | ConvertFrom-Json).PSObject.Properties) { $script:Overrides[$prop.Name] = [int]$prop.Value }
    }
}

function Pexels-Search([string]$Query, [bool]$Square) {
    $uri = 'https://api.pexels.com/v1/search?per_page=5&query=' + [uri]::EscapeDataString($Query)
    if ($Square) { $uri += '&orientation=square' }
    $r = Invoke-RestMethod -Uri $uri -Headers @{ Authorization = $script:PexelsKey } -TimeoutSec 60
    return @($r.photos)
}

function Pexels-Photo([int]$Id) {
    return (Invoke-RestMethod -Uri "https://api.pexels.com/v1/photos/$Id" -Headers @{ Authorization = $script:PexelsKey } -TimeoutSec 60)
}

function Is-Image([string]$Path) {
    $b = [IO.File]::ReadAllBytes($Path)
    if ($b.Length -lt 12) { return $false }
    if ($b[0] -eq 0xFF -and $b[1] -eq 0xD8 -and $b[2] -eq 0xFF) { return $true }
    if ($b[0] -eq 0x89 -and $b[1] -eq 0x50 -and $b[2] -eq 0x4E -and $b[3] -eq 0x47) { return $true }
    if ($b[0] -eq 0x52 -and $b[1] -eq 0x49 -and $b[2] -eq 0x46 -and $b[3] -eq 0x46 -and $b[8] -eq 0x57 -and $b[9] -eq 0x45 -and $b[10] -eq 0x42 -and $b[11] -eq 0x50) { return $true }
    return $false
}

function Save-Photo($Photo, [string]$Slug) {
    foreach ($variant in @('large', 'medium')) {
        $url = [string]$Photo.src.$variant
        if (-not $url) { continue }
        $ext = 'jpg'
        if ($url -match '\.png(\?|$)') { $ext = 'png' }
        $path = Join-Path $ImgDir "$Slug.$ext"
        Invoke-WebRequest -Uri $url -OutFile $path -UseBasicParsing -TimeoutSec 90
        $len = (Get-Item $path).Length
        if ($len -gt 0 -and $len -le 1900000 -and (Is-Image $path)) { return $path }
    }
    return $null
}

function New-FallbackImage([string]$Text, [string]$Path) {
    $bmp = New-Object System.Drawing.Bitmap 600, 600
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'AntiAlias'
    $colors = @('#FDE7D3', '#DCEBFA', '#E3F3E0', '#F6E1EE', '#FFF3C4')
    $idx = [Math]::Abs($Text.Length * 7) % $colors.Count
    $g.Clear([System.Drawing.ColorTranslator]::FromHtml($colors[$idx]))
    $font = New-Object System.Drawing.Font('Segoe UI', 36, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 60, 60))
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = 'Center'
    $fmt.LineAlignment = 'Center'
    $rect = New-Object System.Drawing.RectangleF(40, 40, 520, 520)
    $g.DrawString($Text, $font, $brush, $rect, $fmt)
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Upload-Image([string]$Path) {
    $out = & curl.exe -s -X POST "$BaseUrl/admin/images" -H "Authorization: Bearer $script:AdminToken" -F "file=@$Path"
    $j = $null
    try { $j = ($out -join '') | ConvertFrom-Json } catch { $j = $null }
    if ($j -and $j.url) {
        $u = [string]$j.url
        if ($u.StartsWith('http://')) { $u = 'https://' + $u.Substring(7) }
        return $u
    }
    Write-Host "    upload failed: $out" -ForegroundColor Yellow
    return $null
}

# Finds a photo, downloads it, uploads it to the API and returns the stored image URL.
function Get-ImageUrlFor([string]$Slug, [string]$Name, [string]$Query) {
    $photo = $null
    if ($script:Overrides.ContainsKey($Slug)) {
        try { $photo = Pexels-Photo $script:Overrides[$Slug] }
        catch { Write-Host "    override photo $($script:Overrides[$Slug]) not found, searching instead" -ForegroundColor Yellow }
    }
    if (-not $photo) {
        try {
            $found = @(Pexels-Search $Query $true)
            if ($found.Count -eq 0) { $found = @(Pexels-Search $Query $false) }
            if ($found.Count -gt 0) { $photo = $found[0] }
        }
        catch { Write-Host "    Pexels search failed for '$Query': $($_.Exception.Message)" -ForegroundColor Yellow }
    }

    $path = $null
    if ($photo) {
        try { $path = Save-Photo $photo $Slug }
        catch { Write-Host "    download failed: $($_.Exception.Message)" -ForegroundColor Yellow }
    }

    if ($path) {
        $script:Credits[$Slug] = [pscustomobject]@{
            product = $Name; query = $Query; fallback = $false
            photoId = [int]$photo.id; alt = [string]$photo.alt
            photographer = [string]$photo.photographer
            photographerUrl = [string]$photo.photographer_url
            photoUrl = [string]$photo.url
        }
        Write-Host "    photo $($photo.id) by $($photo.photographer): $($photo.alt)"
    }
    else {
        $path = Join-Path $ImgDir "$Slug.png"
        New-FallbackImage $Name $path
        $script:Credits[$Slug] = [pscustomobject]@{ product = $Name; query = $Query; fallback = $true }
        Write-Host '    no usable photo, generated a plain card instead' -ForegroundColor Yellow
    }

    return (Upload-Image $path)
}

function Save-Credits {
    $script:Credits | ConvertTo-Json -Depth 5 | Set-Content -Path $CreditsFile -Encoding UTF8

    $lines = @()
    $lines += 'Product photos are provided by [Pexels](https://www.pexels.com) and used under the Pexels License.'
    $lines += ''
    foreach ($key in ($script:Credits.Keys | Sort-Object)) {
        $c = $script:Credits[$key]
        if ($c.fallback) { $lines += "- $($c.product): generated placeholder card" }
        else { $lines += "- $($c.product): photo by [$($c.photographer)]($($c.photographerUrl)) on [Pexels]($($c.photoUrl))" }
    }
    $lines | Set-Content -Path (Join-Path $WorkDir 'image-credits.md') -Encoding UTF8
}

function Set-ProductImage([int]$Id, [string]$Url) {
    # Always re-read the product first so stock and row version are current.
    $g = Api GET "/admin/products/$Id" $script:AdminToken $null
    if ($g.Code -ne 200) { return $g }
    $p = $g.Data
    $body = @{
        name          = [string]$p.name
        description   = [string]$p.description
        price         = [decimal]$p.price
        stockQuantity = [int]$p.stockQuantity
        imageUrl      = $Url
        categoryId    = [int]$p.categoryId
        isActive      = [bool]$p.isActive
        rowVersion    = [string]$p.rowVersion
    }
    return (Api PUT "/admin/products/$Id" $script:AdminToken $body)
}

# Search query used to find a photo for each seeded product (keyed by product name).
$SeedQueries = [ordered]@{
    'Wireless Earbuds Pro'            = 'wireless earbuds'
    'Smart Watch Active'              = 'smart watch'
    'Portable Bluetooth Speaker'      = 'portable bluetooth speaker'
    'Power Bank 20000mAh'             = 'power bank'
    'Mechanical Keyboard RGB'         = 'mechanical keyboard rgb'
    'Wireless Mouse Ergonomic'        = 'ergonomic wireless mouse'
    'USB-C Hub 7-in-1'                = 'usb c hub adapter'
    'External SSD 1TB'                = 'portable external ssd'
    'Air Fryer 5L'                    = 'air fryer'
    'Electric Kettle 1.7L'            = 'electric kettle'
    'Non-Stick Cookware Set'          = 'cookware set pots pans'
    'Vacuum Storage Bags (10 pack)'   = 'vacuum storage bags'
    'Classic Cotton T-Shirt'          = 'white cotton t-shirt'
    'Slim Fit Jeans'                  = 'blue jeans'
    'Leather Wallet'                  = 'leather wallet'
    'Canvas Backpack'                 = 'canvas backpack'
    'Yoga Mat 6mm'                    = 'yoga mat'
    'Adjustable Dumbbell Set'         = 'dumbbells'
    'Insulated Water Bottle 1L'       = 'insulated water bottle'
    'Camping Tent 3-Person'           = 'camping tent'
    'Hardcover Notebook A5'           = 'hardcover notebook'
    'Gel Pens Set (12 colors)'        = 'colorful gel pens'
    'Desk Organizer Wooden'           = 'wooden desk organizer'
    'Programming Fundamentals Book'   = 'programming book'
}

$NewProducts = @(
    @{ Name = 'Noise Cancelling Headphones'; Category = 'Electronics'; Price = 2899; Stock = 18; Active = $true
       Query = 'over ear headphones'; Desc = 'Over-ear Bluetooth headphones with active noise cancelling and 30-hour battery life.' },
    @{ Name = 'Laptop Stand Aluminum'; Category = 'Computers & Accessories'; Price = 499; Stock = 60; Active = $true
       Query = 'laptop stand'; Desc = 'Foldable aluminum stand that lifts your laptop to eye level and improves airflow.' },
    @{ Name = 'Ceramic Mug Set (4 pcs)'; Category = 'Home & Kitchen'; Price = 329; Stock = 45; Active = $true
       Query = 'ceramic mugs'; Desc = 'Set of four glazed ceramic mugs, microwave and dishwasher safe.' },
    @{ Name = 'Running Shoes Lightweight'; Category = 'Sports & Outdoors'; Price = 1499; Stock = 30; Active = $true
       Query = 'running shoes'; Desc = 'Breathable lightweight running shoes with a cushioned sole for daily training.' },
    @{ Name = 'Denim Jacket Classic'; Category = 'Fashion'; Price = 1199; Stock = 22; Active = $true
       Query = 'denim jacket'; Desc = 'Classic blue denim jacket with a regular fit and button front.' },
    @{ Name = 'Sketchbook A4'; Category = 'Books & Stationery'; Price = 189; Stock = 100; Active = $true
       Query = 'sketchbook'; Desc = 'A4 sketchbook with 120 gsm paper, ideal for pencil, ink and markers.' },
    @{ Name = 'Limited Edition Desk Lamp'; Category = 'Home & Kitchen'; Price = 699; Stock = 20; Active = $false
       Query = 'desk lamp'; Desc = 'Hidden demo product. Shows how an inactive product is kept out of the storefront.' }
)

function Run-Images {
    if (-not $script:PexelsKey) {
        throw 'Set your free Pexels API key first:  $env:PEXELS_API_KEY = "your-key"  (get one at https://www.pexels.com/api/)'
    }

    $cats = @((Api GET '/categories' $null $null).Data | Where-Object { $null -ne $_ })
    $catId = @{}
    foreach ($c in $cats) { $catId[[string]$c.name] = [int]$c.id }

    $products = @(Get-AdminProducts)

    if ($RemoveTestProduct) {
        Section 'Cleanup'
        $test = @($products | Where-Object { $_.name -eq 'Almaghraby' -and $_.isActive })
        foreach ($t in $test) {
            $r = Api DELETE "/admin/products/$($t.id)" $script:AdminToken $null
            Check "test product 'Almaghraby' deactivated" ($r.Code -eq 204) "status $($r.Code)"
        }
        if ($test.Count -eq 0) { Write-Host '  nothing to clean' }
    }

    Section 'Images for the seeded products'
    foreach ($name in $SeedQueries.Keys) {
        $p = @($products | Where-Object { $_.name -eq $name }) | Select-Object -First 1
        if (-not $p) { Write-Host "  [skip] '$name' not found" -ForegroundColor Yellow; continue }

        $hasUpload = ([string]$p.imageUrl) -like '*/api/images/*'
        if ($hasUpload -and -not $RefreshImages) { Write-Host "  [keep] $name (already has an uploaded image)"; continue }

        Write-Host "  $name"
        $url = Get-ImageUrlFor ([string]$p.slug) $name $SeedQueries[$name]
        if (-not $url) { Check "image for $name" $false 'upload failed'; continue }
        $r = Set-ProductImage ([int]$p.id) $url
        Check "image set: $name" ($r.Code -eq 200) "status $($r.Code) $($r.Text)"
    }

    if ($AddExtraProducts) { Section 'Extra demo products' }
    foreach ($np in $(if ($AddExtraProducts) { $NewProducts } else { @() })) {
        $exists = @($products | Where-Object { $_.name -eq $np.Name })
        if ($exists.Count -gt 0) { Write-Host "  [keep] $($np.Name) already exists"; continue }
        if (-not $catId.ContainsKey($np.Category)) { Check "category for $($np.Name)" $false "missing '$($np.Category)'"; continue }

        Write-Host "  $($np.Name)"
        $slug = Slugify $np.Name
        $url = Get-ImageUrlFor $slug $np.Name $np.Query
        if (-not $url) { Check "image for $($np.Name)" $false 'upload failed'; continue }
        $body = @{
            name          = [string]$np.Name
            description   = [string]$np.Desc
            price         = [decimal]$np.Price
            stockQuantity = [int]$np.Stock
            imageUrl      = $url
            categoryId    = [int]$catId[$np.Category]
            isActive      = [bool]$np.Active
        }
        $r = Api POST '/admin/products' $script:AdminToken $body
        Check "created: $($np.Name)" ($r.Code -eq 201) "status $($r.Code) $($r.Text)"
    }

    Save-Credits
    Write-Host ''
    Write-Host "Credits written to: $(Join-Path $WorkDir 'image-credits.md')"
    Write-Host "Downloaded images:  $ImgDir"
    Write-Host 'To swap a photo you do not like, put  {"product-slug": <PexelsPhotoId>}  in demo-run\image-overrides.json and run again with -Mode Images -RefreshImages.'
}


function Get-ImageKind([string]$Path) {
    $b = [IO.File]::ReadAllBytes($Path)
    if ($b.Length -ge 3 -and $b[0] -eq 0xFF -and $b[1] -eq 0xD8 -and $b[2] -eq 0xFF) { return 'jpeg' }
    if ($b.Length -ge 8 -and $b[0] -eq 0x89 -and $b[1] -eq 0x50 -and $b[2] -eq 0x4E -and $b[3] -eq 0x47) { return 'png' }
    if ($b.Length -ge 12 -and $b[0] -eq 0x52 -and $b[1] -eq 0x49 -and $b[2] -eq 0x46 -and $b[3] -eq 0x46 -and $b[8] -eq 0x57 -and $b[9] -eq 0x45 -and $b[10] -eq 0x42 -and $b[11] -eq 0x50) { return 'webp' }
    return ''
}

# Shrinks big photos (max 900 px, JPEG quality 85) so uploads stay small.
# The real format is read from the file content, so a WebP saved as .jpg is still handled.
# WebP files cannot be resized by Windows PowerShell, so they are sent as they are (the API limit is 2 MB).
function Resize-ForUpload([string]$Path, [string]$Slug) {
    if ((Get-ImageKind $Path) -ne 'jpeg' -and (Get-ImageKind $Path) -ne 'png') { return $Path }

    $len = (Get-Item $Path).Length
    try { $img = [System.Drawing.Image]::FromFile($Path) }
    catch { return $Path }
    try {
        $max = 900
        if ($img.Width -le $max -and $img.Height -le $max -and $len -le 1500000) { return $Path }

        $ratio = [Math]::Min($max / $img.Width, $max / $img.Height)
        if ($ratio -gt 1) { $ratio = 1 }
        $w = [int]($img.Width * $ratio)
        $h = [int]($img.Height * $ratio)

        $bmp = New-Object System.Drawing.Bitmap -ArgumentList $w, $h
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = 'HighQualityBicubic'
        $g.Clear([System.Drawing.Color]::White)
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose()

        $out = Join-Path $ImgDir "$Slug-upload.jpg"
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
        $encParams = New-Object System.Drawing.Imaging.EncoderParameters -ArgumentList 1
        $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter -ArgumentList ([System.Drawing.Imaging.Encoder]::Quality), ([long]85)
        $bmp.Save($out, $codec, $encParams)
        $bmp.Dispose()
        return $out
    }
    finally { $img.Dispose() }
}

function Run-Prepare {
    New-Item -ItemType Directory -Force -Path $ImagesFolder | Out-Null

    $lines = @()
    $lines += '# Product photos checklist'
    $lines += ''
    $lines += 'Download one photo per product and save it in this folder with EXACTLY the file name in the third column (.jpg, .png or .webp).'
    $lines += 'Then run:  powershell -ExecutionPolicy Bypass -File .\scripts\demo-seed.ps1 -Mode Local'
    $lines += ''
    $lines += '| # | Product | Save as | Find a photo |'
    $lines += '|---|---------|---------|--------------|'
    $i = 0
    foreach ($name in $SeedQueries.Keys) {
        $i++
        $slug = Slugify $name
        $link = 'https://www.pexels.com/search/' + [uri]::EscapeDataString($SeedQueries[$name]) + '/'
        $lines += "| $i | $name | $slug.jpg | $link |"
    }
    $file = Join-Path $ImagesFolder '_checklist.md'
    $lines | Set-Content -Path $file -Encoding UTF8

    Write-Host "Folder ready: $ImagesFolder" -ForegroundColor Green
    Write-Host "Checklist:    $file"
    Write-Host 'Save one photo per product with the file name from the checklist, then run -Mode Local.'
}

function Run-Local {
    if (-not (Test-Path $ImagesFolder)) { throw "Images folder not found: $ImagesFolder  (run -Mode Prepare first)" }

    $files = @{}
    foreach ($f in @(Get-ChildItem -Path $ImagesFolder -File)) {
        $ext = $f.Extension.ToLowerInvariant()
        if (@('.jpg', '.jpeg', '.png', '.webp') -contains $ext) { $files[$f.BaseName.ToLowerInvariant()] = $f.FullName }
    }
    Write-Host "Found $($files.Count) image file(s) in $ImagesFolder"

    $products = @(Get-AdminProducts)
    $missing = @()
    $used = @{}

    Section 'Uploading your photos'
    foreach ($p in $products) {
        $slug = ([string]$p.slug).ToLowerInvariant()
        if (-not $files.ContainsKey($slug)) { $missing += [string]$p.name; continue }
        $used[$slug] = $true

        $hasUpload = ([string]$p.imageUrl) -like '*/api/images/*'
        if ($hasUpload -and -not $RefreshImages) { Write-Host "  [keep] $($p.name) (already has an uploaded image)"; continue }

        $src = $files[$slug]
        if (-not (Is-Image $src)) { Check "valid image file for $($p.name)" $false "$src is not a real JPEG/PNG/WebP"; continue }

        $kind = Get-ImageKind $src
        Write-Host "  $($p.name)  <-  $([IO.Path]::GetFileName($src))  ($kind)"
        try {
            $toSend = Resize-ForUpload $src $slug
            if ((Get-Item $toSend).Length -gt 2000000) {
                Check "size of $($p.name) image" $false 'file is bigger than 2 MB and could not be shrunk - save it as JPG or PNG and try again'
                continue
            }
            $url = Upload-Image $toSend
            if (-not $url) { Check "upload for $($p.name)" $false 'upload failed'; continue }
            $r = Set-ProductImage ([int]$p.id) $url
            Check "image set: $($p.name)" ($r.Code -eq 200) "status $($r.Code) $($r.Text)"
        }
        catch {
            Check "image for $($p.name)" $false $_.Exception.Message
        }
    }

    $unknown = @($files.Keys | Where-Object { -not $used.ContainsKey($_) })
    if ($unknown.Count -gt 0) {
        Write-Host ''
        Write-Host 'Files that did not match any product (check the spelling of the file name):' -ForegroundColor Yellow
        foreach ($u in $unknown) { Write-Host "   - $u" -ForegroundColor Yellow }
    }
    if ($missing.Count -gt 0) {
        Write-Host ''
        Write-Host 'Products with no file in the folder (they keep their current image):' -ForegroundColor Yellow
        foreach ($m in $missing) { Write-Host "   - $m" -ForegroundColor Yellow }
    }
}

# ---------------------------------------------------------------- shop test data

$Customers = @(
    @{ Key = 'sara';    Name = 'Sara Hassan';    Email = 'sara.hassan@shop.test' },
    @{ Key = 'omar';    Name = 'Omar Khaled';    Email = 'omar.khaled@shop.test' },
    @{ Key = 'mariam';  Name = 'Mariam Adel';    Email = 'mariam.adel@shop.test' },
    @{ Key = 'youssef'; Name = 'Youssef Samir';  Email = 'youssef.samir@shop.test' },
    @{ Key = 'nour';    Name = 'Nour Ahmed';     Email = 'nour.ahmed@shop.test' },
    @{ Key = 'hana';    Name = 'Hana Mostafa';   Email = 'hana.mostafa@shop.test' },
    @{ Key = 'karim';   Name = 'Karim Tarek';    Email = 'karim.tarek@shop.test' },
    @{ Key = 'laila';   Name = 'Laila Ibrahim';  Email = 'laila.ibrahim@shop.test' }
)

$Addresses = @{
    sara    = @{ Phone = '01012345601'; Address = '12 El Tahrir Street, Dokki'; City = 'Cairo' }
    omar    = @{ Phone = '01012345602'; Address = '45 Pyramids Road, Haram'; City = 'Giza' }
    mariam  = @{ Phone = '01012345603'; Address = '7 Corniche Avenue, Smouha'; City = 'Alexandria' }
    youssef = @{ Phone = '01012345604'; Address = '23 El Gomhoria Street'; City = 'Mansoura' }
    nour    = @{ Phone = '01012345605'; Address = '9 El Geish Street'; City = 'Tanta' }
    hana    = @{ Phone = '01012345606'; Address = '31 University District, 10th Zone'; City = 'Sadat City' }
    karim   = @{ Phone = '01012345607'; Address = '18 Makram Ebeid Street, Nasr City'; City = 'Cairo' }
    laila   = @{ Phone = '01012345608'; Address = '5 Mohandessin Square'; City = 'Giza' }
}

# Flow = admin status steps. Cancel = who cancels the order afterwards ('admin' or 'customer').
$OrderPlans = @(
    @{ Who = 'sara';    Pay = 'MockCard';        Flow = @('Confirmed', 'Shipped', 'Delivered'); Cancel = ''
       Items = @(@{ N = 'Wireless Earbuds Pro'; Q = 1 }, @{ N = 'Classic Cotton T-Shirt'; Q = 2 }) },
    @{ Who = 'omar';    Pay = 'CashOnDelivery';  Flow = @('Confirmed', 'Shipped', 'Delivered'); Cancel = ''
       Items = @(@{ N = 'Mechanical Keyboard RGB'; Q = 1 }, @{ N = 'Wireless Mouse Ergonomic'; Q = 1 }) },
    @{ Who = 'mariam';  Pay = 'MockCard';        Flow = @('Confirmed', 'Shipped'); Cancel = ''
       Items = @(@{ N = 'Yoga Mat 6mm'; Q = 1 }, @{ N = 'Insulated Water Bottle 1L'; Q = 2 }) },
    @{ Who = 'youssef'; Pay = 'CashOnDelivery';  Flow = @('Confirmed'); Cancel = ''
       Items = @(@{ N = 'Air Fryer 5L'; Q = 1 }) },
    @{ Who = 'nour';    Pay = 'CashOnDelivery';  Flow = @(); Cancel = ''
       Items = @(@{ N = 'Hardcover Notebook A5'; Q = 3 }, @{ N = 'Gel Pens Set (12 colors)'; Q = 2 }) },
    @{ Who = 'hana';    Pay = 'MockCard';        Flow = @('Confirmed', 'Shipped', 'Delivered'); Cancel = ''
       Items = @(@{ N = 'Leather Wallet'; Q = 1 }, @{ N = 'Canvas Backpack'; Q = 1 }, @{ N = 'Slim Fit Jeans'; Q = 1 }) },
    @{ Who = 'karim';   Pay = 'CashOnDelivery';  Flow = @('Confirmed'); Cancel = 'admin'
       Items = @(@{ N = 'Portable Bluetooth Speaker'; Q = 1 }, @{ N = 'USB-C Hub 7-in-1'; Q = 1 }) },
    @{ Who = 'laila';   Pay = 'CashOnDelivery';  Flow = @(); Cancel = 'customer'
       Items = @(@{ N = 'Programming Fundamentals Book'; Q = 1 }, @{ N = 'Desk Organizer Wooden'; Q = 1 }) },
    @{ Who = 'sara';    Pay = 'CashOnDelivery';  Flow = @(); Cancel = ''
       Items = @(@{ N = 'Electric Kettle 1.7L'; Q = 1 }) },
    @{ Who = 'omar';    Pay = 'MockCard';        Flow = @('Confirmed'); Cancel = ''
       Items = @(@{ N = 'External SSD 1TB'; Q = 1 }) },
    @{ Who = 'karim';   Pay = 'CashOnDelivery';  Flow = @(); Cancel = ''
       Items = @(@{ N = 'Camping Tent 3-Person'; Q = 1 }) }
)

function Place-Order($Plan) {
    $who = $Plan.Who
    $tok = $script:Tokens[$who]
    [void](Api DELETE '/cart' $tok $null)

    $expSub = [decimal]0
    foreach ($it in $Plan.Items) {
        $p = $script:ByName[$it.N]
        if (-not $p) { Check "$who : product '$($it.N)' exists" $false 'not in storefront'; return $null }
        $r = Api POST '/cart/items' $tok @{ productId = [int]$p.id; quantity = [int]$it.Q }
        Check "$who adds $($it.N) x$($it.Q)" ($r.Code -eq 200) "status $($r.Code) $($r.Text)"
        $expSub += [decimal]$p.price * [int]$it.Q
    }

    $cart = Api GET '/cart' $tok $null
    Check "$who cart subtotal is calculated by the server" ($cart.Code -eq 200 -and [decimal]$cart.Data.subtotal -eq $expSub) "expected $expSub got $($cart.Data.subtotal)"

    $fee = $FlatFee
    if ($expSub -ge $FreeFrom) { $fee = 0 }

    $addr = $Addresses[$who]
    $body = @{
        fullName      = ($Customers | Where-Object { $_.Key -eq $who }).Name
        phone         = $addr.Phone
        addressLine   = $addr.Address
        city          = $addr.City
        notes         = 'Demo order created by the test script'
        paymentMethod = $Plan.Pay
    }
    $o = Api POST '/orders' $tok $body
    Check "$who checkout ($($Plan.Pay))" ($o.Code -eq 201) "status $($o.Code) $($o.Text)"
    if ($o.Code -ne 201) { return $null }

    Check "$who order subtotal matches" ([decimal]$o.Data.subtotal -eq $expSub) "expected $expSub got $($o.Data.subtotal)"
    Check "$who shipping fee matches" ([decimal]$o.Data.shippingFee -eq [decimal]$fee) "expected $fee got $($o.Data.shippingFee)"
    Check "$who order total matches" ([decimal]$o.Data.total -eq ($expSub + $fee)) "expected $($expSub + $fee) got $($o.Data.total)"
    Check "$who order starts as Pending" ($o.Data.status -eq 'Pending')
    $expPay = 'Pending'
    if ($Plan.Pay -eq 'MockCard') { $expPay = 'Paid' }
    Check "$who payment status is $expPay" ($o.Data.paymentStatus -eq $expPay) "got $($o.Data.paymentStatus)"

    $after = Api GET '/cart' $tok $null
    Check "$who cart is cleared after checkout" ($after.Code -eq 200 -and [int]$after.Data.itemCount -eq 0)
    return $o.Data
}

function Move-Order([int]$OrderId, [string]$Status) {
    $r = Api PUT "/admin/orders/$OrderId/status" $script:AdminToken @{ status = $Status }
    $now = ''
    if ($r.Data -and $r.Data.order) { $now = [string]$r.Data.order.status }
    Check "admin moves order $OrderId to $Status" ($r.Code -eq 200 -and $now -eq $Status) "status $($r.Code) now '$now' $($r.Text)"
    return $r
}

function Run-Shop {
    Section 'Setup'
    $cats = @((Api GET '/categories' $null $null).Data | Where-Object { $null -ne $_ })
    $catId = @{}
    foreach ($c in $cats) { $catId[[string]$c.name] = [int]$c.id }
    Check 'six or more categories exist' ($cats.Count -ge 6) "found $($cats.Count)"

    $adminProducts = @(Get-AdminProducts)
    $publicProducts = @(Get-PublicProducts)
    $script:ByName = @{}
    foreach ($p in $publicProducts) { $script:ByName[[string]$p.name] = $p }
    Check 'storefront lists at least 24 products' ($publicProducts.Count -ge 24) "found $($publicProducts.Count)"

    # ------------------------------------------------------------ public catalog
    Section 'Public catalog'
    $r = Api GET '/products?search=watch&pageSize=50' $null $null
    Check 'search finds the smart watch' ($r.Code -eq 200 -and @($r.Data.items | Where-Object { $_.name -like '*Watch*' }).Count -ge 1)

    $r = Api GET "/products?categoryId=$($catId['Fashion'])&pageSize=50" $null $null
    $fashion = @($r.Data.items)
    Check 'category filter returns only Fashion products' ($fashion.Count -ge 4 -and @($fashion | Where-Object { $_.categoryName -ne 'Fashion' }).Count -eq 0)

    $r = Api GET '/products?minPrice=1000&maxPrice=2000&pageSize=50' $null $null
    $ranged = @($r.Data.items)
    Check 'price range filter works' ($ranged.Count -ge 1 -and @($ranged | Where-Object { [decimal]$_.price -lt 1000 -or [decimal]$_.price -gt 2000 }).Count -eq 0)

    $r = Api GET '/products?inStock=true&pageSize=50' $null $null
    Check 'in-stock filter hides the sold-out power bank' ($r.Code -eq 200 -and @($r.Data.items | Where-Object { $_.name -eq 'Power Bank 20000mAh' }).Count -eq 0)

    $r = Api GET '/products?sortBy=price&sortDir=asc&pageSize=10' $null $null
    $a = @($r.Data.items)
    Check 'sort by price ascending' ($a.Count -ge 2 -and [decimal]$a[0].price -le [decimal]$a[1].price)
    $r = Api GET '/products?sortBy=price&sortDir=desc&pageSize=10' $null $null
    $d = @($r.Data.items)
    Check 'sort by price descending' ($d.Count -ge 2 -and [decimal]$d[0].price -ge [decimal]$d[1].price)

    $r = Api GET '/products?page=2&pageSize=5' $null $null
    Check 'pagination returns page 2' ($r.Code -eq 200 -and [int]$r.Data.page -eq 2 -and @($r.Data.items).Count -eq 5 -and [int]$r.Data.totalPages -ge 5)

    $r = Api GET '/products?minPrice=abc' $null $null
    Check 'invalid price filter is rejected (400)' ($r.Code -eq 400) "status $($r.Code)"
    $r = Api GET '/products/does-not-exist' $null $null
    Check 'unknown product slug returns 404' ($r.Code -eq 404) "status $($r.Code)"

    $lamp = @($adminProducts | Where-Object { $_.name -eq 'Limited Edition Desk Lamp' }) | Select-Object -First 1
    if ($lamp) {
        $r = Api GET "/products/$($lamp.slug)" $null $null
        Check 'inactive product is hidden from the storefront' ($r.Code -eq 404) "status $($r.Code)"
    }

    # ------------------------------------------------------------ auth
    Section 'Auth and validation'
    $r = Api POST '/auth/register' $null @{}
    Check 'registration with an empty body is rejected (400)' ($r.Code -eq 400) "status $($r.Code)"
    $r = Api POST '/auth/register' $null @{ fullName = 'X'; email = 'not-an-email'; password = '123' }
    Check 'registration with invalid fields is rejected (400)' ($r.Code -eq 400) "status $($r.Code)"
    $r = Api POST '/auth/login' $null @{ email = $AdminEmail; password = 'definitely-wrong-password' }
    Check 'wrong password is rejected (401)' ($r.Code -eq 401) "status $($r.Code)"

    Section 'Demo customers'
    $script:Tokens = @{}
    foreach ($c in $Customers) {
        $t = Ensure-Customer $c.Name $c.Email
        Check "customer ready: $($c.Name)" ([bool]$t)
        $script:Tokens[$c.Key] = $t
    }
    $dup = Api POST '/auth/register' $null @{ fullName = 'Sara Hassan'; email = 'sara.hassan@shop.test'; password = $DemoPassword }
    Check 'duplicate registration is rejected (409)' ($dup.Code -eq 409) "status $($dup.Code)"
    $me = Api GET '/auth/me' $script:Tokens['sara'] $null
    Check '/auth/me returns the customer with role Customer' ($me.Code -eq 200 -and $me.Data.role -eq 'Customer')

    # ------------------------------------------------------------ access control
    Section 'Access control'
    $sara = $script:Tokens['sara']
    $r = Api GET '/cart' $null $null
    Check 'cart without a token returns 401' ($r.Code -eq 401) "status $($r.Code)"
    $r = Api GET '/orders' $null $null
    Check 'orders without a token returns 401' ($r.Code -eq 401) "status $($r.Code)"
    $r = Api GET '/admin/stats' $sara $null
    Check 'customer cannot read admin stats (403)' ($r.Code -eq 403) "status $($r.Code)"
    $r = Api GET '/admin/orders' $sara $null
    Check 'customer cannot list admin orders (403)' ($r.Code -eq 403) "status $($r.Code)"
    $r = Api POST '/admin/products' $sara @{ name = 'Hack'; description = 'x'; price = 1; stockQuantity = 1; categoryId = 1 }
    Check 'customer cannot create products (403)' ($r.Code -eq 403) "status $($r.Code)"

    # ------------------------------------------------------------ admin: categories
    Section 'Admin categories'
    foreach ($old in @($cats | Where-Object { $_.name -like 'Demo Temp Category*' })) {
        [void](Api DELETE "/admin/categories/$($old.id)" $script:AdminToken $null)
    }
    $r = Api POST '/admin/categories' $script:AdminToken @{ name = 'Demo Temp Category'; description = 'Temporary category created by the test script' }
    Check 'admin creates a category (201)' ($r.Code -eq 201) "status $($r.Code) $($r.Text)"
    if ($r.Code -eq 201) {
        $tempId = [int]$r.Data.id
        $r2 = Api PUT "/admin/categories/$tempId" $script:AdminToken @{ name = 'Demo Temp Category Renamed'; description = 'Renamed' }
        Check 'admin renames the category' ($r2.Code -eq 200 -and $r2.Data.name -eq 'Demo Temp Category Renamed') "status $($r2.Code)"
        $r3 = Api DELETE "/admin/categories/$tempId" $script:AdminToken $null
        Check 'admin deletes an empty category (204)' ($r3.Code -eq 204) "status $($r3.Code)"
    }
    $r = Api POST '/admin/categories' $script:AdminToken @{ name = 'Electronics' }
    Check 'duplicate category name is rejected (409)' ($r.Code -eq 409) "status $($r.Code)"
    $r = Api DELETE "/admin/categories/$($catId['Electronics'])" $script:AdminToken $null
    Check 'category with products cannot be deleted (409)' ($r.Code -eq 409) "status $($r.Code)"

    # ------------------------------------------------------------ admin: product concurrency
    Section 'Admin products and concurrency'
    $target = $script:ByName['Desk Organizer Wooden']
    if ($target) {
        $g = Api GET "/admin/products/$($target.id)" $script:AdminToken $null
        $staleVersion = [string]$g.Data.rowVersion
        $ok = Set-ProductImage ([int]$target.id) ([string]$g.Data.imageUrl)
        Check 'admin updates a product with the current row version' ($ok.Code -eq 200) "status $($ok.Code)"
        $p = $g.Data
        $stale = Api PUT "/admin/products/$($target.id)" $script:AdminToken @{
            name = [string]$p.name; description = [string]$p.description; price = [decimal]$p.price
            stockQuantity = [int]$p.stockQuantity; imageUrl = [string]$p.imageUrl; categoryId = [int]$p.categoryId
            isActive = [bool]$p.isActive; rowVersion = $staleVersion
        }
        Check 'update with an outdated row version is rejected (409)' ($stale.Code -eq 409) "status $($stale.Code)"
        $noVersion = Api PUT "/admin/products/$($target.id)" $script:AdminToken @{
            name = [string]$p.name; description = [string]$p.description; price = [decimal]$p.price
            stockQuantity = [int]$p.stockQuantity; imageUrl = [string]$p.imageUrl; categoryId = [int]$p.categoryId
            isActive = [bool]$p.isActive
        }
        Check 'update without a row version is rejected (400)' ($noVersion.Code -eq 400) "status $($noVersion.Code)"
    }

    # ------------------------------------------------------------ cart rules
    Section 'Cart rules'
    [void](Api DELETE '/cart' $sara $null)
    $earbuds = $script:ByName['Wireless Earbuds Pro']
    $kettle  = $script:ByName['Electric Kettle 1.7L']
    $power   = $script:ByName['Power Bank 20000mAh']

    $r = Api POST '/cart/items' $sara @{ productId = [int]$earbuds.id; quantity = 1 }
    Check 'add an item to the cart' ($r.Code -eq 200 -and [int]$r.Data.itemCount -eq 1)
    $r = Api POST '/cart/items' $sara @{ productId = [int]$kettle.id; quantity = 1 }
    $r = Api PUT "/cart/items/$($kettle.id)" $sara @{ quantity = 2 }
    Check 'update a cart quantity' ($r.Code -eq 200 -and [int]$r.Data.itemCount -eq 3) "status $($r.Code)"
    $r = Api DELETE "/cart/items/$($kettle.id)" $sara $null
    Check 'remove an item from the cart' ($r.Code -eq 200 -and [int]$r.Data.itemCount -eq 1)
    $r = Api PUT "/cart/items/$($kettle.id)" $sara @{ quantity = 1 }
    Check 'updating an item that is not in the cart returns 404' ($r.Code -eq 404) "status $($r.Code)"
    $r = Api POST '/cart/items' $sara @{ productId = [int]$power.id; quantity = 1 }
    Check 'sold-out product cannot be added (400)' ($r.Code -eq 400) "status $($r.Code)"
    $r = Api POST '/cart/items' $sara @{ productId = [int]$earbuds.id; quantity = 1000 }
    Check 'quantity above the stock is rejected (400)' ($r.Code -eq 400) "status $($r.Code) $($r.Text)"
    $r = Api POST '/cart/items' $sara @{ productId = [int]$earbuds.id; quantity = 0 }
    Check 'quantity 0 is rejected (400)' ($r.Code -eq 400) "status $($r.Code)"
    $r = Api POST '/cart/items' $sara @{ productId = 999999; quantity = 1 }
    Check 'unknown product returns 404' ($r.Code -eq 404) "status $($r.Code)"
    if ($lamp) {
        $r = Api POST '/cart/items' $sara @{ productId = [int]$lamp.id; quantity = 1 }
        Check 'inactive product cannot be added (400)' ($r.Code -eq 400) "status $($r.Code)"
    }
    [void](Api DELETE '/cart' $sara $null)
    $r = Api POST '/orders' $sara @{ fullName = 'Sara Hassan'; phone = '01012345601'; addressLine = '12 El Tahrir Street'; city = 'Cairo'; paymentMethod = 'CashOnDelivery' }
    Check 'checkout with an empty cart is rejected (400)' ($r.Code -eq 400) "status $($r.Code)"
    $r = Api POST '/orders' $sara @{}
    Check 'checkout with an empty body is rejected (400)' ($r.Code -eq 400) "status $($r.Code)"

    # ------------------------------------------------------------ orders
    $skipOrders = $false
    $existing = Api GET '/orders' $sara $null
    if ((@($existing.Data | Where-Object { $null -ne $_ }).Count -gt 0) -and (-not $MoreOrders)) {
        $skipOrders = $true
        Write-Host ''
        Write-Host 'Demo orders already exist for these customers, so no new orders are created. Use -MoreOrders to add another batch.' -ForegroundColor Yellow
    }

    $created = @()
    if (-not $skipOrders) {
        Section 'Checkout (11 orders from 8 customers)'
        foreach ($plan in $OrderPlans) {
            $o = Place-Order $plan
            $created += [pscustomobject]@{ Plan = $plan; Order = $o }
        }

        Section 'Customer view of orders'
        $o1 = $created[0].Order
        $o2 = $created[1].Order
        if ($o1) {
            $r = Api GET "/orders/$($o1.id)" $sara $null
            Check 'customer opens their own order' ($r.Code -eq 200 -and @($r.Data.items).Count -eq 2 -and $r.Data.orderNumber -eq $o1.orderNumber)
            $names = @($r.Data.items | ForEach-Object { $_.productName })
            Check 'order keeps the product name and price snapshot' ($names -contains 'Wireless Earbuds Pro' -and [decimal]($r.Data.items | Where-Object { $_.productName -eq 'Wireless Earbuds Pro' }).unitPrice -eq [decimal]$earbuds.price)
        }
        if ($o2) {
            $r = Api GET "/orders/$($o2.id)" $sara $null
            Check "customer cannot open another customer's order (404)" ($r.Code -eq 404) "status $($r.Code)"
        }
        $r = Api GET '/orders' $sara $null
        Check 'customer lists only their own orders' ($r.Code -eq 200 -and @($r.Data).Count -eq 2) "found $(@($r.Data).Count)"

        Section 'Admin handles the orders'
        $r = Api GET '/admin/orders?status=Bogus' $script:AdminToken $null
        Check 'invalid status filter is rejected (400)' ($r.Code -eq 400) "status $($r.Code)"

        $idx = 0
        foreach ($entry in $created) {
            $idx++
            $o = $entry.Order
            if (-not $o) { continue }
            $plan = $entry.Plan
            $oid = [int]$o.id

            foreach ($step in $plan.Flow) { [void](Move-Order $oid $step) }

            if ($plan.Cancel -eq 'admin') {
                $first = $script:ByName[$plan.Items[0].N]
                $before = Get-Stock ([string]$first.slug)
                [void](Move-Order $oid 'Cancelled')
                $afterStock = Get-Stock ([string]$first.slug)
                Check "cancelling order $oid restores stock of $($first.name)" ($afterStock -eq ($before + [int]$plan.Items[0].Q)) "before $before after $afterStock"
            }
            if ($plan.Cancel -eq 'customer') {
                $first = $script:ByName[$plan.Items[0].N]
                $before = Get-Stock ([string]$first.slug)
                $r = Api POST "/orders/$oid/cancel" $script:Tokens[$plan.Who] $null
                Check "customer cancels their pending order $oid" ($r.Code -eq 200 -and $r.Data.status -eq 'Cancelled') "status $($r.Code) $($r.Text)"
                $afterStock = Get-Stock ([string]$first.slug)
                Check "customer cancellation restores stock of $($first.name)" ($afterStock -eq ($before + [int]$plan.Items[0].Q)) "before $before after $afterStock"
            }
        }

        Section 'Status rules'
        $delivered = $created[0].Order
        $pending   = $created[4].Order
        $shipped   = $created[2].Order
        if ($delivered) {
            $r = Api PUT "/admin/orders/$($delivered.id)/status" $script:AdminToken @{ status = 'Pending' }
            Check 'delivered order cannot go back to Pending (400)' ($r.Code -eq 400) "status $($r.Code)"
            $r = Api PUT "/admin/orders/$($delivered.id)/status" $script:AdminToken @{ status = 'Cancelled' }
            Check 'delivered order cannot be cancelled (400)' ($r.Code -eq 400) "status $($r.Code)"
            $r = Api GET "/admin/orders/$($delivered.id)" $script:AdminToken $null
            Check 'cash/mock payment is marked Paid once delivered' ($r.Code -eq 200 -and $r.Data.order.paymentStatus -eq 'Paid') "got $($r.Data.order.paymentStatus)"
            Check 'admin sees the customer email on the order' ($r.Data.customerEmail -eq 'sara.hassan@shop.test') "got $($r.Data.customerEmail)"
        }
        if ($pending) {
            $r = Api PUT "/admin/orders/$($pending.id)/status" $script:AdminToken @{ status = 'Delivered' }
            Check 'pending order cannot jump to Delivered (400)' ($r.Code -eq 400) "status $($r.Code)"
        }
        if ($shipped) {
            $r = Api POST "/orders/$($shipped.id)/cancel" $script:Tokens['mariam'] $null
            Check 'customer cannot cancel a shipped order (400)' ($r.Code -eq 400) "status $($r.Code)"
        }
        $omarCod = $created[1].Order
        if ($omarCod) {
            $r = Api GET "/admin/orders/$($omarCod.id)" $script:AdminToken $null
            Check 'cash on delivery order becomes Paid when delivered' ($r.Code -eq 200 -and $r.Data.order.status -eq 'Delivered' -and $r.Data.order.paymentStatus -eq 'Paid') "status $($r.Data.order.status) payment $($r.Data.order.paymentStatus)"
        }
        $r = Api GET '/admin/orders?status=Delivered&pageSize=50' $script:AdminToken $null
        Check 'admin filters orders by status' ($r.Code -eq 200 -and @($r.Data.items).Count -ge 3 -and @($r.Data.items | Where-Object { $_.status -ne 'Delivered' }).Count -eq 0)
    }

    # ------------------------------------------------------------ dashboard
    Section 'Dashboard numbers'
    $stats = Api GET '/admin/stats' $script:AdminToken $null
    Check 'admin stats endpoint works' ($stats.Code -eq 200) "status $($stats.Code)"
    if ($stats.Code -eq 200) {
        $orders = @(Get-AllAdminOrders)
        $expectedRevenue = [decimal]0
        foreach ($o in $orders) { if ($o.status -ne 'Cancelled') { $expectedRevenue += [decimal]$o.total } }
        Check 'stats total orders matches the order list' ([int]$stats.Data.totalOrders -eq $orders.Count) "stats $($stats.Data.totalOrders) list $($orders.Count)"
        Check 'stats revenue ignores cancelled orders' ([decimal]$stats.Data.revenue -eq $expectedRevenue) "stats $($stats.Data.revenue) expected $expectedRevenue"
        $sum = 0
        foreach ($prop in $stats.Data.ordersByStatus.PSObject.Properties) { $sum += [int]$prop.Value }
        Check 'orders by status adds up to the total' ($sum -eq [int]$stats.Data.totalOrders) "sum $sum total $($stats.Data.totalOrders)"
        Check 'top products are listed' (@($stats.Data.topProducts).Count -ge 1)
        Check 'low-stock list contains the sold-out power bank' (@($stats.Data.lowStockProducts | Where-Object { $_.name -eq 'Power Bank 20000mAh' }).Count -eq 1)

        Write-Host ''
        Write-Host ("  Orders: {0}   Revenue: {1} EGP" -f $stats.Data.totalOrders, $stats.Data.revenue) -ForegroundColor Cyan
        foreach ($prop in $stats.Data.ordersByStatus.PSObject.Properties) { Write-Host ("    {0,-10} {1}" -f $prop.Name, $prop.Value) }
    }
}

# ---------------------------------------------------------------- main

$doImages = ($Mode -eq 'Images' -or $Mode -eq 'All')
$doShop   = ($Mode -eq 'Shop' -or $Mode -eq 'All')

Write-Host "Bazaaro demo runner  |  API: $BaseUrl  |  Mode: $Mode" -ForegroundColor Cyan

if ($Mode -eq 'Prepare') { Run-Prepare; exit 0 }

Section 'Admin login'
$script:AdminToken = Login $AdminEmail $AdminPassword
Check 'admin login' ([bool]$script:AdminToken)
if (-not $script:AdminToken) { throw 'Admin login failed. Check -AdminEmail / -AdminPassword and that the API is up.' }

if ($Mode -eq 'Local') { Run-Local }
if ($doImages) { Run-Images }
if ($doShop)   { Run-Shop }

Section 'Summary'
Write-Host ("  Passed: {0}   Failed: {1}" -f $script:Pass, $script:Fail) -ForegroundColor $(if ($script:Fail -eq 0) { 'Green' } else { 'Red' })
if ($script:Fail -gt 0) {
    Write-Host '  Failures:' -ForegroundColor Red
    foreach ($f in $script:Failures) { Write-Host "   - $f" -ForegroundColor Red }
}
$report = @("Bazaaro demo run $(Get-Date -Format 'yyyy-MM-dd HH:mm')", "Mode: $Mode", "Passed: $($script:Pass)  Failed: $($script:Fail)")
$report += $script:Failures
$report | Set-Content -Path (Join-Path $WorkDir 'run-report.txt') -Encoding UTF8

if ($doShop) {
    Write-Host ''
    Write-Host 'Demo accounts (public demo credentials):' -ForegroundColor Cyan
    Write-Host "  admin    $AdminEmail / $AdminPassword"
    Write-Host '  customer customer@shop.test / Customer@12345'
    Write-Host "  others   <name>@shop.test / $DemoPassword  (for example sara.hassan@shop.test)"
}

if ($script:Fail -gt 0) { exit 1 }
