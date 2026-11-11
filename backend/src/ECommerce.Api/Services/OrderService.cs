using ECommerce.Api.Data;
using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using ECommerce.Api.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Services;

public interface IOrderService
{
    Task<OrderResponse> CheckoutAsync(int userId, CheckoutRequest request);
    Task<List<OrderSummaryResponse>> ListForUserAsync(int userId);
    Task<OrderResponse> GetForUserAsync(int userId, int orderId);
    Task<OrderResponse> CancelForUserAsync(int userId, int orderId);
    Task<OrderResponse> CancelAsAdminAsync(int orderId);
}

public class OrderService : IOrderService
{
    private const string NumberChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private readonly AppDbContext _db;
    private readonly decimal _flatFee;
    private readonly decimal _freeThreshold;

    public OrderService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _flatFee = config.GetValue<decimal>("Shipping:FlatFee", 50m);
        _freeThreshold = config.GetValue<decimal>("Shipping:FreeThreshold", 1000m);
    }

    public async Task<OrderResponse> CheckoutAsync(int userId, CheckoutRequest request)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var cart = await _db.Carts
            .Include(c => c.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart == null || cart.Items.Count == 0)
            throw new BadRequestException("Your cart is empty.");

        var now = DateTime.UtcNow;
        var order = new Order
        {
            OrderNumber = GenerateOrderNumber(now),
            UserId = userId,
            Status = OrderStatus.Pending,
            PaymentMethod = request.PaymentMethod,
            PaymentStatus = request.PaymentMethod == PaymentMethod.MockCard ? PaymentStatus.Paid : PaymentStatus.Pending,
            FullName = request.FullName.Trim(),
            Phone = request.Phone.Trim(),
            AddressLine = request.AddressLine.Trim(),
            City = request.City.Trim(),
            PostalCode = request.PostalCode?.Trim(),
            Notes = request.Notes?.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        foreach (var item in cart.Items)
        {
            var product = item.Product;

            if (!product.IsActive)
                throw new BadRequestException($"'{product.Name}' is no longer available. Please remove it from your cart.");

            if (item.Quantity > product.StockQuantity)
                throw new BadRequestException($"Only {product.StockQuantity} item(s) left of '{product.Name}'. Please update your cart.");

            order.Items.Add(new OrderItem
            {
                ProductId = product.Id,
                ProductName = product.Name,
                UnitPrice = product.Price,
                Quantity = item.Quantity,
                LineTotal = Math.Round(product.Price * item.Quantity, 2)
            });

            product.StockQuantity -= item.Quantity;
            product.UpdatedAt = now;
        }

        order.Subtotal = order.Items.Sum(i => i.LineTotal);
        order.ShippingFee = order.Subtotal >= _freeThreshold ? 0m : _flatFee;
        order.Total = order.Subtotal + order.ShippingFee;

        _db.Orders.Add(order);
        _db.CartItems.RemoveRange(cart.Items);
        cart.UpdatedAt = now;

        try
        {
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Stock changed while placing your order. Please review your cart and try again.");
        }

        return Map(order);
    }

    public async Task<List<OrderSummaryResponse>> ListForUserAsync(int userId)
    {
        return await _db.Orders
            .AsNoTracking()
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new OrderSummaryResponse
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Status = o.Status,
                PaymentMethod = o.PaymentMethod,
                Total = o.Total,
                ItemCount = o.Items.Sum(i => i.Quantity),
                CreatedAt = o.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<OrderResponse> GetForUserAsync(int userId, int orderId)
    {
        var order = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId)
            ?? throw new NotFoundException("Order not found.");

        return Map(order);
    }

    public Task<OrderResponse> CancelForUserAsync(int userId, int orderId) =>
        CancelCoreAsync(orderId, userId);

    public Task<OrderResponse> CancelAsAdminAsync(int orderId) =>
        CancelCoreAsync(orderId, null);

    // userId = null means "admin" (no ownership filter); reused in the admin step.
    private async Task<OrderResponse> CancelCoreAsync(int orderId, int? userId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var order = await _db.Orders
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == orderId && (userId == null || o.UserId == userId))
            ?? throw new NotFoundException("Order not found.");

        if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed)
            throw new BadRequestException($"An order with status '{order.Status}' cannot be cancelled.");

        var now = DateTime.UtcNow;
        foreach (var item in order.Items)
        {
            item.Product.StockQuantity += item.Quantity;
            item.Product.UpdatedAt = now;
        }

        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = now;

        try
        {
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("The order was changed by someone else. Please try again.");
        }

        return Map(order);
    }

    private static string GenerateOrderNumber(DateTime now)
    {
        var chars = new char[6];
        for (var i = 0; i < chars.Length; i++)
            chars[i] = NumberChars[Random.Shared.Next(NumberChars.Length)];
        return $"ORD-{now:yyyyMMdd}-{new string(chars)}";
    }

    internal static OrderResponse Map(Order o) => new()
    {
        Id = o.Id,
        OrderNumber = o.OrderNumber,
        Status = o.Status,
        PaymentMethod = o.PaymentMethod,
        PaymentStatus = o.PaymentStatus,
        Subtotal = o.Subtotal,
        ShippingFee = o.ShippingFee,
        Total = o.Total,
        FullName = o.FullName,
        Phone = o.Phone,
        AddressLine = o.AddressLine,
        City = o.City,
        PostalCode = o.PostalCode,
        Notes = o.Notes,
        CreatedAt = o.CreatedAt,
        UpdatedAt = o.UpdatedAt,
        Items = o.Items.Select(i => new OrderItemResponse
        {
            ProductId = i.ProductId,
            ProductName = i.ProductName,
            UnitPrice = i.UnitPrice,
            Quantity = i.Quantity,
            LineTotal = i.LineTotal
        }).ToList()
    };
}
