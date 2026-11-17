using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ECommerce.Tests;

public class ProductDeleteTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _fx;

    public ProductDeleteTests(ApiFixture fx)
    {
        _fx = fx;
    }

    private Task<string> AdminTokenAsync() => _fx.LoginAsync(ApiFixture.AdminEmail, ApiFixture.AdminPassword);

    private Task<string> CustomerTokenAsync() => _fx.LoginAsync(ApiFixture.CustomerEmail, ApiFixture.CustomerPassword);

    private async Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, string token, object? body = null)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null)
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        return await _fx.Client.SendAsync(request);
    }

    private async Task<int> CreateProductAsync(string adminToken)
    {
        var categories = await _fx.Client.GetStringAsync("/api/categories");
        using var categoryDoc = JsonDocument.Parse(categories);
        var categoryId = categoryDoc.RootElement[0].GetProperty("id").GetInt32();

        var response = await SendAsync(HttpMethod.Post, "/api/admin/products", adminToken, new
        {
            name = "Delete Test " + Guid.NewGuid().ToString("N"),
            description = "Product used by the delete tests.",
            price = 100m,
            stockQuantity = 10,
            categoryId,
            isActive = true
        });
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.Created, "Create product failed: " + text);

        using var doc = JsonDocument.Parse(text);
        return doc.RootElement.GetProperty("id").GetInt32();
    }

    private async Task AddToCartAsync(string customerToken, int productId)
    {
        var response = await SendAsync(HttpMethod.Post, "/api/cart/items", customerToken, new { productId, quantity = 1 });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // Places an order that contains only this product and returns the order id.
    private async Task<int> PlaceOrderAsync(string customerToken, int productId)
    {
        await SendAsync(HttpMethod.Delete, "/api/cart", customerToken);
        await AddToCartAsync(customerToken, productId);

        var response = await SendAsync(HttpMethod.Post, "/api/orders", customerToken, new
        {
            fullName = "Test User",
            phone = "01012345678",
            addressLine = "12 Test Street",
            city = "Cairo",
            paymentMethod = "CashOnDelivery"
        });
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.Created, "Checkout failed: " + text);

        using var doc = JsonDocument.Parse(text);
        return doc.RootElement.GetProperty("id").GetInt32();
    }

    [Fact]
    public async Task Delete_NeverOrderedProduct_Returns204_AndTheProductIsGone()
    {
        var admin = await AdminTokenAsync();
        var productId = await CreateProductAsync(admin);

        var delete = await SendAsync(HttpMethod.Delete, "/api/admin/products/" + productId, admin);
        var get = await SendAsync(HttpMethod.Get, "/api/admin/products/" + productId, admin);

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    [Fact]
    public async Task Delete_ProductInACart_RemovesItFromTheCart()
    {
        var admin = await AdminTokenAsync();
        var customer = await CustomerTokenAsync();
        var productId = await CreateProductAsync(admin);
        await AddToCartAsync(customer, productId);

        var delete = await SendAsync(HttpMethod.Delete, "/api/admin/products/" + productId, admin);
        var cart = await SendAsync(HttpMethod.Get, "/api/cart", customer);
        var cartText = await cart.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.OK, cart.StatusCode);

        using var doc = JsonDocument.Parse(cartText);
        var ids = doc.RootElement.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("productId").GetInt32())
            .ToList();
        Assert.DoesNotContain(productId, ids);
    }

    [Fact]
    public async Task Delete_ProductWithAnActiveOrder_Returns409_AndKeepsTheProduct()
    {
        var admin = await AdminTokenAsync();
        var customer = await CustomerTokenAsync();
        var productId = await CreateProductAsync(admin);
        await PlaceOrderAsync(customer, productId);

        var delete = await SendAsync(HttpMethod.Delete, "/api/admin/products/" + productId, admin);
        var get = await SendAsync(HttpMethod.Get, "/api/admin/products/" + productId, admin);

        Assert.Equal(HttpStatusCode.Conflict, delete.StatusCode);
        Assert.Contains("has orders", await delete.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
    }

    [Fact]
    public async Task Delete_ProductWithOnlyACancelledOrder_Returns409_AndTheOrderItemsStay()
    {
        var admin = await AdminTokenAsync();
        var customer = await CustomerTokenAsync();
        var productId = await CreateProductAsync(admin);
        var orderId = await PlaceOrderAsync(customer, productId);

        var cancel = await SendAsync(HttpMethod.Post, "/api/orders/" + orderId + "/cancel", customer);
        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);

        var delete = await SendAsync(HttpMethod.Delete, "/api/admin/products/" + productId, admin);
        var order = await SendAsync(HttpMethod.Get, "/api/orders/" + orderId, customer);
        var orderText = await order.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Conflict, delete.StatusCode);
        Assert.Equal(HttpStatusCode.OK, order.StatusCode);

        using var doc = JsonDocument.Parse(orderText);
        Assert.Equal("Cancelled", doc.RootElement.GetProperty("status").GetString());
        Assert.Equal(1, doc.RootElement.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Delete_UnknownProduct_Returns404()
    {
        var admin = await AdminTokenAsync();

        var delete = await SendAsync(HttpMethod.Delete, "/api/admin/products/999999", admin);

        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }
}
