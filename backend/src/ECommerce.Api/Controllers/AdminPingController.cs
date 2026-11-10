using ECommerce.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/admin/ping")]
[Authorize(Policy = Policies.AdminOnly)]
public class AdminPingController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { message = "Admin access OK" });
}
