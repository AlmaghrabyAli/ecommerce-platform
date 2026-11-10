using ECommerce.Api.Data;
using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using ECommerce.Api.Exceptions;
using ECommerce.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Services;

public interface IProductService
{
    Task<PagedResult<ProductResponse>> GetPublicAsync(ProductQuery query);
    Task<ProductResponse> GetBySlugAsync(string slug);

    Task<PagedResult<ProductResponse>> GetAdminListAsync(ProductQuery query);
    Task<ProductResponse> GetByIdAsync(int id);
    Task<ProductResponse> CreateAsync(ProductRequest request);
    Task<ProductResponse> UpdateAsync(int id, ProductRequest request);
    Task DeleteAsync(int id);
}

public class ProductService : IProductService
{
    private const int MaxPageSize = 50;
    private readonly AppDbContext _db;

    public ProductService(AppDbContext db)
    {
        _db = db;
    }

    // ---------- Public ----------

    public Task<PagedResult<ProductResponse>> GetPublicAsync(ProductQuery query)
        => GetListAsync(query, includeInactive: false);

    public async Task<ProductResponse> GetBySlugAsync(string slug)
    {
        var product = await _db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive)
            ?? throw new NotFoundException("Product not found.");

        return ToResponse(product);
    }

    // ---------- Admin ----------

    public Task<PagedResult<ProductResponse>> GetAdminListAsync(ProductQuery query)
        => GetListAsync(query, includeInactive: true);

    public async Task<ProductResponse> GetByIdAsync(int id)
    {
        var product = await _db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException("Product not found.");

        return ToResponse(product);
    }

    public async Task<ProductResponse> CreateAsync(ProductRequest request)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == request.CategoryId)
            ?? throw new BadRequestException("Category does not exist.");

        var name = request.Name.Trim();
        var baseSlug = SlugHelper.Slugify(name);
        var slug = baseSlug;
        var counter = 2;
        while (await _db.Products.AnyAsync(p => p.Slug == slug))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        var now = DateTime.UtcNow;
        var product = new Product
        {
            Name = name,
            Slug = slug,
            Description = request.Description.Trim(),
            Price = request.Price,
            StockQuantity = request.StockQuantity,
            ImageUrl = request.ImageUrl?.Trim(),
            CategoryId = category.Id,
            Category = category,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        return ToResponse(product);
    }

    public async Task<ProductResponse> UpdateAsync(int id, ProductRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RowVersion))
            throw new BadRequestException("RowVersion is required to update a product.");

        byte[] originalVersion;
        try
        {
            originalVersion = Convert.FromBase64String(request.RowVersion);
        }
        catch (FormatException)
        {
            throw new BadRequestException("RowVersion is not valid.");
        }

        var product = await _db.Products.Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException("Product not found.");

        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == request.CategoryId)
            ?? throw new BadRequestException("Category does not exist.");

        // Tell EF which version the client saw; the UPDATE will only match that version.
        _db.Entry(product).Property(p => p.RowVersion).OriginalValue = originalVersion;

        // Slug is kept as is so existing URLs do not break.
        product.Name = request.Name.Trim();
        product.Description = request.Description.Trim();
        product.Price = request.Price;
        product.StockQuantity = request.StockQuantity;
        product.ImageUrl = request.ImageUrl?.Trim();
        product.CategoryId = category.Id;
        product.Category = category;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("This product was changed by someone else. Reload it and try again.");
        }

        return ToResponse(product);
    }

    public async Task DeleteAsync(int id)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException("Product not found.");

        // Soft delete: keep the row so old orders stay valid.
        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("This product was changed by someone else. Reload it and try again.");
        }
    }

    // ---------- Shared ----------

    private async Task<PagedResult<ProductResponse>> GetListAsync(ProductQuery query, bool includeInactive)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var products = _db.Products.AsNoTracking().AsQueryable();

        if (!includeInactive)
            products = products.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            products = products.Where(p => p.Name.Contains(term));
        }

        if (query.CategoryId.HasValue)
            products = products.Where(p => p.CategoryId == query.CategoryId.Value);

        if (query.MinPrice.HasValue)
            products = products.Where(p => p.Price >= query.MinPrice.Value);

        if (query.MaxPrice.HasValue)
            products = products.Where(p => p.Price <= query.MaxPrice.Value);

        if (query.InStock == true)
            products = products.Where(p => p.StockQuantity > 0);

        var totalCount = await products.CountAsync();

        var desc = string.Equals(query.SortDir, "desc", StringComparison.OrdinalIgnoreCase);
        var sortBy = (query.SortBy ?? "newest").ToLowerInvariant();

        IOrderedQueryable<Product> ordered = sortBy switch
        {
            "price" => desc ? products.OrderByDescending(p => p.Price) : products.OrderBy(p => p.Price),
            "name" => desc ? products.OrderByDescending(p => p.Name) : products.OrderBy(p => p.Name),
            // newest: default direction is newest first unless sortDir=asc is sent
            _ => string.Equals(query.SortDir, "asc", StringComparison.OrdinalIgnoreCase)
                    ? products.OrderBy(p => p.CreatedAt)
                    : products.OrderByDescending(p => p.CreatedAt)
        };

        var entities = await ordered
            .ThenBy(p => p.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(p => p.Category)
            .ToListAsync();

        return new PagedResult<ProductResponse>
        {
            Items = entities.Select(ToResponse).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    internal static ProductResponse ToResponse(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Slug = p.Slug,
        Description = p.Description,
        Price = p.Price,
        StockQuantity = p.StockQuantity,
        ImageUrl = p.ImageUrl,
        IsActive = p.IsActive,
        CategoryId = p.CategoryId,
        CategoryName = p.Category?.Name ?? string.Empty,
        CreatedAt = p.CreatedAt,
        RowVersion = Convert.ToBase64String(p.RowVersion)
    };
}
