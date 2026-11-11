using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using ECommerce.Api.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Tests;

// Starts the real API in-process (TestServer) on its own throw-away LocalDB database.
public class ApiFixture : IAsyncLifetime
{
    public const string AdminEmail = "admin@test.local";
    public const string AdminPassword = "Admin@12345";
    public const string CustomerEmail = "customer@test.local";
    public const string CustomerPassword = "Customer@12345";

    private readonly string _connectionString =
        "Server=(localdb)\\MSSQLLocalDB;Database=ECommerceTestApi_" + Guid.NewGuid().ToString("N") +
        ";Trusted_Connection=True;TrustServerCertificate=True";

    private WebApplicationFactory<Program>? _factory;

    public HttpClient Client { get; private set; } = null!;

    // Program.cs reads configuration immediately, so environment variables are set before the host starts.
    private Dictionary<string, string> Settings() => new()
    {
        ["ConnectionStrings__DefaultConnection"] = _connectionString,
        ["Jwt__Key"] = "test-only-jwt-key-0123456789-abcdefghijklmnopqrstuvwxyz",
        ["Seed__AdminEmail"] = AdminEmail,
        ["Seed__AdminPassword"] = AdminPassword,
        ["Seed__CustomerEmail"] = CustomerEmail,
        ["Seed__CustomerPassword"] = CustomerPassword
    };

    public Task InitializeAsync()
    {
        foreach (var setting in Settings())
            Environment.SetEnvironmentVariable(setting.Key, setting.Value);

        _factory = new WebApplicationFactory<Program>();
        Client = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        Client?.Dispose();
        if (_factory != null)
            await _factory.DisposeAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(_connectionString).Options;
        await using (var db = new AppDbContext(options))
        {
            await db.Database.EnsureDeletedAsync();
        }

        foreach (var key in Settings().Keys)
            Environment.SetEnvironmentVariable(key, null);
    }

    public async Task<string> LoginAsync(string email, string password)
    {
        var json = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
        var response = await Client.PostAsync("/api/auth/login", new StringContent(json, Encoding.UTF8, "application/json"));
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, "Login failed: " + (int)response.StatusCode + " " + body);

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("token").GetString()!;
    }

    public async Task<HttpResponseMessage> SendAsync(string method, string path, string? token)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (token != null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (method == "POST" || method == "PUT")
            request.Content = new StringContent("{\"status\":\"Confirmed\"}", Encoding.UTF8, "application/json");
        return await Client.SendAsync(request);
    }
}
