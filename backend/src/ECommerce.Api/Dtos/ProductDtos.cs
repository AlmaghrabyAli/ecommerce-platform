using System.ComponentModel.DataAnnotations;

namespace ECommerce.Api.Dtos;

public class ProductResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal Price { get; init; }
    public int StockQuantity { get; init; }
    public string? ImageUrl { get; init; }
    public bool IsActive { get; init; }
    public int CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public string RowVersion { get; init; } = string.Empty;
}

public class ProductRequest
{
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [Required, StringLength(4000)]
    public string Description { get; init; } = string.Empty;

    [Range(0.01, 1000000)]
    public decimal Price { get; init; }

    [Range(0, 1000000)]
    public int StockQuantity { get; init; }

    [StringLength(500)]
    public string? ImageUrl { get; init; }

    [Range(1, int.MaxValue)]
    public int CategoryId { get; init; }

    public bool IsActive { get; init; } = true;

    // Only used on update (Base64 of the RowVersion the client last saw)
    public string? RowVersion { get; init; }
}

public class ProductQuery
{
    public string? Search { get; init; }
    public int? CategoryId { get; init; }
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public bool? InStock { get; init; }
    public string? SortBy { get; init; }
    public string? SortDir { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 12;
}
