using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using ECommerce.Api.Security;
using ECommerce.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Policy = Policies.AdminOnly)]
public class AdminOrdersController : ControllerBase
{
    private readonly IAdminOrderService _orders;

    public AdminOrdersController(IAdminOrderService orders)
    {
        _orders = orders;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AdminOrderSummaryResponse>>> List(
        [FromQuery] OrderStatus? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await _orders.ListAsync(status, page, pageSize));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminOrderResponse>> Get(int id) =>
        Ok(await _orders.GetAsync(id));

    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<AdminOrderResponse>> UpdateStatus(int id, UpdateOrderStatusRequest request) =>
        Ok(await _orders.UpdateStatusAsync(id, request.Status));
}
