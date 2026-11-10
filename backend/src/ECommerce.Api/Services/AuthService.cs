using ECommerce.Api.Data;
using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Services;

public interface IAuthService
{
    Task<AuthResponse?> RegisterAsync(RegisterRequest request);
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<UserDto?> GetByIdAsync(int id);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;

    public AuthService(AppDbContext db, ITokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email))
            return null;

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = Roles.Customer
        };

        _db.Users.Add(user);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return null; // unique email index hit by a concurrent request
        }

        return BuildResponse(user);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;

        return BuildResponse(user);
    }

    public async Task<UserDto?> GetByIdAsync(int id)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        return user is null ? null : ToDto(user);
    }

    private AuthResponse BuildResponse(User user)
    {
        var (token, expires) = _tokens.CreateToken(user);
        return new AuthResponse { Token = token, ExpiresAtUtc = expires, User = ToDto(user) };
    }

    private static UserDto ToDto(User user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role
    };
}
