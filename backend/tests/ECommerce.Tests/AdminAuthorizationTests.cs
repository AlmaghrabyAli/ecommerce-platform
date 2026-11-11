using System.Net;
using System.Text;
using System.Text.Json;

namespace ECommerce.Tests;

public class AdminAuthorizationTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _fx;

    public AdminAuthorizationTests(ApiFixture fx)
    {
        _fx = fx;
    }

    public static IEnumerable<object[]> AdminEndpoints => new List<object[]>
    {
        new object[] { "GET", "/api/admin/orders" },
        new object[] { "GET", "/api/admin/orders/1" },
        new object[] { "PUT", "/api/admin/orders/1/status" },
        new object[] { "GET", "/api/admin/stats" },
        new object[] { "GET", "/api/admin/products" },
        new object[] { "POST", "/api/admin/categories" },
        new object[] { "DELETE", "/api/admin/products/1" }
    };

    [Theory]
    [MemberData(nameof(AdminEndpoints))]
    public async Task AdminEndpoint_WithoutToken_Returns401(string method, string path)
    {
        var response = await _fx.SendAsync(method, path, null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(AdminEndpoints))]
    public async Task AdminEndpoint_WithCustomerToken_Returns403(string method, string path)
    {
        var token = await _fx.LoginAsync(ApiFixture.CustomerEmail, ApiFixture.CustomerPassword);
        var response = await _fx.SendAsync(method, path, token);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/admin/orders")]
    [InlineData("/api/admin/stats")]
    [InlineData("/api/admin/products")]
    public async Task AdminEndpoint_WithAdminToken_Returns200(string path)
    {
        var token = await _fx.LoginAsync(ApiFixture.AdminEmail, ApiFixture.AdminPassword);
        var response = await _fx.SendAsync("GET", path, token);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Login_ReturnsTokenWithCorrectRoleClaim()
    {
        var adminToken = await _fx.LoginAsync(ApiFixture.AdminEmail, ApiFixture.AdminPassword);
        var customerToken = await _fx.LoginAsync(ApiFixture.CustomerEmail, ApiFixture.CustomerPassword);

        Assert.Equal("Admin", RoleOf(adminToken));
        Assert.Equal("Customer", RoleOf(customerToken));
    }

    private static string RoleOf(string jwt)
    {
        var payload = jwt.Split('.')[1].Replace('-', '+').Replace('_', '/');
        payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
        var json = Encoding.UTF8.GetString(Convert.FromBase64String(payload));
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("role").GetString()!;
    }
}
