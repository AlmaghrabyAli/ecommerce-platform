using ECommerce.Api.Dtos;
using ECommerce.Api.Security;
using ECommerce.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;

    public OrdersController(IOrderService orders)
    {
        _orders = orders;
    }

    [HttpPost]
    public async Task<ActionResult<OrderResponse>> Checkout(CheckoutRequest request)
    {
        var created = await _orders.CheckoutAsync(User.GetUserId(), request);
        return StatusCode(201, created);
    }

    [HttpGet]
    public async Task<ActionResult<List<OrderSummaryResponse>>> List() =>
        Ok(await _orders.ListForUserAsync(User.GetUserId()));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderResponse>> Get(int id) =>
        Ok(await _orders.GetForUserAsync(User.GetUserId(), id));

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<OrderResponse>> Cancel(int id) =>
        Ok(await _orders.CancelForUserAsync(User.GetUserId(), id));
}
