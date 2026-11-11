namespace ECommerce.Api.Security;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this System.Security.Claims.ClaimsPrincipal user)
    {
        var value = user.FindFirst("sub")?.Value;
        if (!int.TryParse(value, out var id))
            throw new UnauthorizedAccessException("Invalid user token.");
        return id;
    }
}
