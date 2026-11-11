using ECommerce.Api.Dtos;
using ECommerce.Api.Security;
using ECommerce.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/cart")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly ICartService _cart;

    public CartController(ICartService cart)
    {
        _cart = cart;
    }

    [HttpGet]
    public async Task<ActionResult<CartResponse>> Get() =>
        Ok(await _cart.GetAsync(User.GetUserId()));

    [HttpPost("items")]
    public async Task<ActionResult<CartResponse>> AddItem(AddCartItemRequest request) =>
        Ok(await _cart.AddItemAsync(User.GetUserId(), request));

    [HttpPut("items/{productId:int}")]
    public async Task<ActionResult<CartResponse>> UpdateItem(int productId, UpdateCartItemRequest request) =>
        Ok(await _cart.UpdateItemAsync(User.GetUserId(), productId, request));

    [HttpDelete("items/{productId:int}")]
    public async Task<ActionResult<CartResponse>> RemoveItem(int productId) =>
        Ok(await _cart.RemoveItemAsync(User.GetUserId(), productId));

    [HttpDelete]
    public async Task<IActionResult> Clear()
    {
        await _cart.ClearAsync(User.GetUserId());
        return NoContent();
    }
}
