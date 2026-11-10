using System.Security.Claims;
using System.Text;
using ECommerce.Api.Entities;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ECommerce.Api.Services;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) CreateToken(User user);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
    {
        var key = _config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be configured and at least 32 characters.");

        var minutes = _config.GetValue<int>("Jwt:ExpiryMinutes", 60);
        var expires = DateTime.UtcNow.AddMinutes(minutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", user.Id.ToString()),
                new Claim("email", user.Email),
                new Claim("name", user.FullName),
                new Claim("role", user.Role)
            }),
            Expires = expires,
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                SecurityAlgorithms.HmacSha256)
        };

        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        return (token, expires);
    }
}
