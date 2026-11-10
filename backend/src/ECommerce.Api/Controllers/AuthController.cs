using ECommerce.Api.Dtos;
using ECommerce.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var result = await _auth.RegisterAsync(request);
        if (result is null)
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Email is already registered.");

        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var result = await _auth.LoginAsync(request);
        if (result is null)
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid email or password.");

        return Ok(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var sub = User.FindFirst("sub")?.Value;
        if (!int.TryParse(sub, out var id))
            return Unauthorized();

        var user = await _auth.GetByIdAsync(id);
        return user is null ? Unauthorized() : Ok(user);
    }
}
