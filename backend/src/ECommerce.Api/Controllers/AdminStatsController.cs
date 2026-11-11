using ECommerce.Api.Dtos;
using ECommerce.Api.Security;
using ECommerce.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/admin/stats")]
[Authorize(Policy = Policies.AdminOnly)]
public class AdminStatsController : ControllerBase
{
    private readonly IStatsService _stats;

    public AdminStatsController(IStatsService stats)
    {
        _stats = stats;
    }

    [HttpGet]
    public async Task<ActionResult<AdminStatsResponse>> Get() =>
        Ok(await _stats.GetAsync());
}
