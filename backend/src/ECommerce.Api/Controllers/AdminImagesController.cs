using ECommerce.Api.Dtos;
using ECommerce.Api.Security;
using ECommerce.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/admin/images")]
[Authorize(Policy = Policies.AdminOnly)]
public class AdminImagesController : ControllerBase
{
    private readonly IImageService _images;

    public AdminImagesController(IImageService images)
    {
        _images = images;
    }

    // Files between 2 MB and 10 MB reach the service, which answers with a clear message. Bigger requests are rejected by the server before they are read.
    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ImageUploadResponse>> Upload([FromForm] IFormFile file)
    {
        var id = await _images.UploadAsync(file);
        var url = $"{Request.Scheme}://{Request.Host}/api/images/{id}";
        return StatusCode(StatusCodes.Status201Created, new ImageUploadResponse { Id = id, Url = url });
    }
}
