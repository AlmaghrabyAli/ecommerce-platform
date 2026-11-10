using ECommerce.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<AppDbContext>();
        var config = sp.GetRequiredService<IConfiguration>();
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");

        await db.Database.MigrateAsync();

        await EnsureUserAsync(db, config, logger, "Seed:AdminEmail", "Seed:AdminPassword", "Store Admin", Roles.Admin);
        await EnsureUserAsync(db, config, logger, "Seed:CustomerEmail", "Seed:CustomerPassword", "Demo Customer", Roles.Customer);
    }

    private static async Task EnsureUserAsync(
        AppDbContext db,
        IConfiguration config,
        ILogger logger,
        string emailKey,
        string passwordKey,
        string fullName,
        string role)
    {
        var email = config[emailKey]?.Trim().ToLowerInvariant();
        var password = config[passwordKey];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Seed skipped for {Role}: {EmailKey} or {PasswordKey} is not configured.", role, emailKey, passwordKey);
            return;
        }

        if (await db.Users.AnyAsync(u => u.Email == email))
            return;

        db.Users.Add(new User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Role} user {Email}.", role, email);
    }
}
