using ECommerce.Api.Data;
using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using ECommerce.Api.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Services;

public interface IAdminOrderService
{
    Task<PagedResult<AdminOrderSummaryResponse>> ListAsync(OrderStatus? status, int page, int pageSize);
    Task<AdminOrderResponse> GetAsync(int id);
    Task<AdminOrderResponse> UpdateStatusAsync(int id, OrderStatus newStatus);
}

public class AdminOrderService : IAdminOrderService
{
    private const int MaxPageSize = 50;

    // Allowed status changes. Anything not listed here is rejected with 400.
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Transitions = new()
    {
        [OrderStatus.Pending] = new[] { OrderStatus.Confirmed, OrderStatus.Cancelled },
        [OrderStatus.Confirmed] = new[] { OrderStatus.Shipped, OrderStatus.Cancelled },
        [OrderStatus.Shipped] = new[] { OrderStatus.Delivered },
        [OrderStatus.Delivered] = Array.Empty<OrderStatus>(),
        [OrderStatus.Cancelled] = Array.Empty<OrderStatus>()
    };

    private readonly AppDbContext _db;
    private readonly IOrderService _orders;

    public AdminOrderService(AppDbContext db, IOrderService orders)
    {
        _db = db;
        _orders = orders;
    }

    public async Task<PagedResult<AdminOrderSummaryResponse>> ListAsync(OrderStatus? status, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _db.Orders.AsNoTracking().AsQueryable();
        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .ThenByDescending(o => o.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new AdminOrderSummaryResponse
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Status = o.Status,
                PaymentMethod = o.PaymentMethod,
                PaymentStatus = o.PaymentStatus,
                Total = o.Total,
                ItemCount = o.Items.Sum(i => i.Quantity),
                CreatedAt = o.CreatedAt,
                CustomerName = o.User.FullName,
                CustomerEmail = o.User.Email
            })
            .ToListAsync();

        return new PagedResult<AdminOrderSummaryResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<AdminOrderResponse> GetAsync(int id)
    {
        var order = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id)
            ?? throw new NotFoundException("Order not found.");

        return ToAdminResponse(order);
    }

    public async Task<AdminOrderResponse> UpdateStatusAsync(int id, OrderStatus newStatus)
    {
        // Cancel reuses the shared logic (validates the status, restores stock, one transaction).
        if (newStatus == OrderStatus.Cancelled)
        {
            await _orders.CancelAsAdminAsync(id);
            return await GetAsync(id);
        }

        var order = await _db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id)
            ?? throw new NotFoundException("Order not found.");

        if (!Transitions[order.Status].Contains(newStatus))
            throw new BadRequestException($"Cannot change order status from '{order.Status}' to '{newStatus}'.");

        order.Status = newStatus;
        order.UpdatedAt = DateTime.UtcNow;

        // Cash on delivery is paid when the customer receives the order.
        if (newStatus == OrderStatus.Delivered && order.PaymentMethod == PaymentMethod.CashOnDelivery)
            order.PaymentStatus = PaymentStatus.Paid;

        await _db.SaveChangesAsync();

        return ToAdminResponse(order);
    }

    private static AdminOrderResponse ToAdminResponse(Order order) => new()
    {
        CustomerName = order.User.FullName,
        CustomerEmail = order.User.Email,
        Order = OrderService.Map(order)
    };
}
