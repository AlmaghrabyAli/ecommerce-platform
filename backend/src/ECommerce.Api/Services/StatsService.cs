using ECommerce.Api.Data;
using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Services;

public interface IStatsService
{
    Task<AdminStatsResponse> GetAsync();
}

public class StatsService : IStatsService
{
    private const int LowStockThreshold = 5;
    private const int LowStockLimit = 10;
    private const int TopProductsLimit = 5;

    private readonly AppDbContext _db;

    public StatsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AdminStatsResponse> GetAsync()
    {
        var totalOrders = await _db.Orders.CountAsync();

        var revenue = await _db.Orders
            .Where(o => o.Status != OrderStatus.Cancelled)
            .SumAsync(o => (decimal?)o.Total) ?? 0m;

        var grouped = await _db.Orders
            .GroupBy(o => o.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var byStatus = new Dictionary<string, int>();
        foreach (var status in Enum.GetValues<OrderStatus>())
            byStatus[status.ToString()] = grouped.FirstOrDefault(x => x.Status == status)?.Count ?? 0;

        var lowStock = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.StockQuantity <= LowStockThreshold)
            .OrderBy(p => p.StockQuantity)
            .ThenBy(p => p.Name)
            .Take(LowStockLimit)
            .Select(p => new LowStockProductResponse
            {
                Id = p.Id,
                Name = p.Name,
                Slug = p.Slug,
                StockQuantity = p.StockQuantity
            })
            .ToListAsync();

        var topProducts = await _db.OrderItems
            .AsNoTracking()
            .Where(i => i.Order.Status != OrderStatus.Cancelled)
            .GroupBy(i => i.ProductId)
            .Select(g => new TopProductResponse
            {
                ProductId = g.Key,
                ProductName = g.Max(i => i.ProductName) ?? string.Empty,
                QuantitySold = g.Sum(i => i.Quantity),
                Revenue = g.Sum(i => i.LineTotal)
            })
            .OrderByDescending(x => x.QuantitySold)
            .ThenBy(x => x.ProductId)
            .Take(TopProductsLimit)
            .ToListAsync();

        return new AdminStatsResponse
        {
            TotalOrders = totalOrders,
            Revenue = revenue,
            OrdersByStatus = byStatus,
            LowStockProducts = lowStock,
            TopProducts = topProducts
        };
    }
}
