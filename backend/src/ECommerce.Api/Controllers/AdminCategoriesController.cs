using ECommerce.Api.Dtos;
using ECommerce.Api.Security;
using ECommerce.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/admin/categories")]
[Authorize(Policy = Policies.AdminOnly)]
public class AdminCategoriesController : ControllerBase
{
    private readonly ICategoryService _categories;

    public AdminCategoriesController(ICategoryService categories)
    {
        _categories = categories;
    }

    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create(CategoryRequest request)
    {
        var created = await _categories.CreateAsync(request);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CategoryResponse>> Update(int id, CategoryRequest request)
    {
        return Ok(await _categories.UpdateAsync(id, request));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _categories.DeleteAsync(id);
        return NoContent();
    }
}
