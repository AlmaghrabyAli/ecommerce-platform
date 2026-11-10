using ECommerce.Api.Dtos;
using ECommerce.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _products;

    public ProductsController(IProductService products)
    {
        _products = products;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductResponse>>> GetAll([FromQuery] ProductQuery query)
    {
        return Ok(await _products.GetPublicAsync(query));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<ProductResponse>> GetBySlug(string slug)
    {
        return Ok(await _products.GetBySlugAsync(slug));
    }
}
