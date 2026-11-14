using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ECommerce.Tests;

public class ProductImageTests : IClassFixture<ApiFixture>
{
    // A real 1x1 PNG (70 bytes).
    private const string TinyPngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    private static readonly byte[] PngSignature = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
    private static readonly byte[] JpegSignature = { 0xFF, 0xD8, 0xFF, 0xE0 };
    private static readonly byte[] WebpSignature =
        { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50 };

    private const int TwoMegabytes = 2 * 1024 * 1024;

    private readonly ApiFixture _fx;

    public ProductImageTests(ApiFixture fx)
    {
        _fx = fx;
    }

    public static IEnumerable<object[]> ImageSamples => new List<object[]>
    {
        new object[] { WithPrefix(PngSignature, 100), "image/png" },
        new object[] { WithPrefix(JpegSignature, 100), "image/jpeg" },
        new object[] { WithPrefix(WebpSignature, 100), "image/webp" }
    };

    private static byte[] TinyPng() => Convert.FromBase64String(TinyPngBase64);

    private static byte[] WithPrefix(byte[] prefix, int length)
    {
        var bytes = new byte[length];
        Array.Copy(prefix, bytes, prefix.Length);
        return bytes;
    }

    private Task<string> AdminTokenAsync() => _fx.LoginAsync(ApiFixture.AdminEmail, ApiFixture.AdminPassword);

    private Task<string> CustomerTokenAsync() => _fx.LoginAsync(ApiFixture.CustomerEmail, ApiFixture.CustomerPassword);

    // The client always claims "image/png" so the tests prove the server looks at the real content.
    private async Task<HttpResponseMessage> UploadAsync(byte[] bytes, string? token, string fieldName = "file")
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(file, fieldName, "photo.png");

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/images") { Content = content };
        if (token != null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return await _fx.Client.SendAsync(request);
    }

    private static async Task<(int Id, string Url)> ReadUploadAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.Created, "Upload failed: " + (int)response.StatusCode + " " + body);

        using var doc = JsonDocument.Parse(body);
        return (doc.RootElement.GetProperty("id").GetInt32(), doc.RootElement.GetProperty("url").GetString()!);
    }

    [Fact]
    public async Task Upload_ValidPng_Returns201_AndTheUrlServesTheSameBytes()
    {
        var token = await AdminTokenAsync();

        var (id, url) = await ReadUploadAsync(await UploadAsync(TinyPng(), token));

        Assert.EndsWith("/api/images/" + id, url);

        var get = await _fx.Client.GetAsync(new Uri(url).AbsolutePath);
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal("image/png", get.Content.Headers.ContentType?.MediaType);
        Assert.Equal(TinyPng(), await get.Content.ReadAsByteArrayAsync());
        Assert.Contains("immutable", string.Join(",", get.Headers.GetValues("Cache-Control")));
        Assert.Contains("nosniff", get.Headers.GetValues("X-Content-Type-Options"));
        Assert.NotNull(get.Headers.ETag);
    }

    [Theory]
    [MemberData(nameof(ImageSamples))]
    public async Task Upload_DetectsTheTypeFromTheContent_NotFromTheClientHeader(byte[] bytes, string expectedType)
    {
        var token = await AdminTokenAsync();

        var (_, url) = await ReadUploadAsync(await UploadAsync(bytes, token));

        var get = await _fx.Client.GetAsync(new Uri(url).AbsolutePath);
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal(expectedType, get.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Upload_TextFileNamedPng_Returns400()
    {
        var token = await AdminTokenAsync();
        var bytes = Encoding.UTF8.GetBytes("this is plain text, not an image");

        var response = await UploadAsync(bytes, token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Only JPEG, PNG or WebP images are allowed.", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Upload_FileOneByteOverTwoMegabytes_Returns400()
    {
        var token = await AdminTokenAsync();

        var response = await UploadAsync(WithPrefix(PngSignature, TwoMegabytes + 1), token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Image must be 2 MB or smaller.", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Upload_FileOfExactlyTwoMegabytes_IsAccepted()
    {
        var token = await AdminTokenAsync();

        var response = await UploadAsync(WithPrefix(PngSignature, TwoMegabytes), token);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Upload_WithoutTheFileField_Returns400()
    {
        var token = await AdminTokenAsync();

        var response = await UploadAsync(TinyPng(), token, fieldName: "other");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("file", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Upload_WithoutToken_Returns401()
    {
        var response = await UploadAsync(TinyPng(), null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Upload_WithCustomerToken_Returns403()
    {
        var token = await CustomerTokenAsync();

        var response = await UploadAsync(TinyPng(), token);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetImage_UnknownId_Returns404()
    {
        var response = await _fx.Client.GetAsync("/api/images/99999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("Image not found.", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task GetImage_WithMatchingETag_Returns304()
    {
        var token = await AdminTokenAsync();
        var (_, url) = await ReadUploadAsync(await UploadAsync(TinyPng(), token));
        var path = new Uri(url).AbsolutePath;

        var first = await _fx.Client.GetAsync(path);
        Assert.NotNull(first.Headers.ETag);

        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.IfNoneMatch.Add(first.Headers.ETag!);
        var second = await _fx.Client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotModified, second.StatusCode);
    }

    [Fact]
    public async Task UploadedImageUrl_CanBeSavedOnAProduct()
    {
        var token = await AdminTokenAsync();
        var (_, url) = await ReadUploadAsync(await UploadAsync(TinyPng(), token));

        // Use any category created by the seed data.
        var categories = await _fx.Client.GetStringAsync("/api/categories");
        using var categoryDoc = JsonDocument.Parse(categories);
        var categoryId = categoryDoc.RootElement[0].GetProperty("id").GetInt32();

        var json = JsonSerializer.Serialize(new
        {
            name = "Image Test " + Guid.NewGuid().ToString("N"),
            description = "Product with an uploaded image.",
            price = 99.5m,
            stockQuantity = 5,
            imageUrl = url,
            categoryId,
            isActive = true
        });
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/products")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _fx.Client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        Assert.True(response.StatusCode == HttpStatusCode.Created, "Create product failed: " + body);
        using var productDoc = JsonDocument.Parse(body);
        Assert.Equal(url, productDoc.RootElement.GetProperty("imageUrl").GetString());
    }
}
