namespace ECommerce.Api.Dtos;

public class LowStockProductResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
}

public class TopProductResponse
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal Revenue { get; set; }
}

public class AdminStatsResponse
{
    public int TotalOrders { get; set; }
    public decimal Revenue { get; set; }
    public Dictionary<string, int> OrdersByStatus { get; set; } = new();
    public List<LowStockProductResponse> LowStockProducts { get; set; } = new();
    public List<TopProductResponse> TopProducts { get; set; } = new();
}
