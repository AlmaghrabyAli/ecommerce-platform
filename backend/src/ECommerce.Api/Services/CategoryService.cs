using ECommerce.Api.Data;
using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using ECommerce.Api.Exceptions;
using ECommerce.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryResponse>> GetAllAsync();
    Task<CategoryResponse> CreateAsync(CategoryRequest request);
    Task<CategoryResponse> UpdateAsync(int id, CategoryRequest request);
    Task DeleteAsync(int id);
}

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync()
    {
        return await _db.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryResponse
            {
                Id = c.Id,
                Name = c.Name,
                Slug = c.Slug,
                Description = c.Description
            })
            .ToListAsync();
    }

    public async Task<CategoryResponse> CreateAsync(CategoryRequest request)
    {
        var name = request.Name.Trim();

        if (await _db.Categories.AnyAsync(c => c.Name == name))
            throw new ConflictException("A category with this name already exists.");

        var baseSlug = SlugHelper.Slugify(name);
        var slug = baseSlug;
        var counter = 2;
        while (await _db.Categories.AnyAsync(c => c.Slug == slug))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        var category = new Category
        {
            Name = name,
            Slug = slug,
            Description = request.Description?.Trim()
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return ToResponse(category);
    }

    public async Task<CategoryResponse> UpdateAsync(int id, CategoryRequest request)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException("Category not found.");

        var name = request.Name.Trim();

        if (await _db.Categories.AnyAsync(c => c.Name == name && c.Id != id))
            throw new ConflictException("A category with this name already exists.");

        // Slug is kept as is so existing URLs do not break.
        category.Name = name;
        category.Description = request.Description?.Trim();

        await _db.SaveChangesAsync();

        return ToResponse(category);
    }

    public async Task DeleteAsync(int id)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException("Category not found.");

        if (await _db.Products.AnyAsync(p => p.CategoryId == id))
            throw new ConflictException("Cannot delete a category that still has products.");

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
    }

    private static CategoryResponse ToResponse(Category c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Slug = c.Slug,
        Description = c.Description
    };
}
