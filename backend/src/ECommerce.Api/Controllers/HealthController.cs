using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "Healthy", timeUtc = DateTime.UtcNow });
}
