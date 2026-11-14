using ECommerce.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/images")]
public class ImagesController : ControllerBase
{
    private readonly IImageService _images;

    public ImagesController(IImageService images)
    {
        _images = images;
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var image = await _images.GetAsync(id);

        // An uploaded image never changes, so browsers may keep it for a year.
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(
            image.Data,
            image.ContentType,
            lastModified: null,
            entityTag: new EntityTagHeaderValue("\"" + id + "\""));
    }
}
