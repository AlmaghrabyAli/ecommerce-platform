using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using ECommerce.Api.Exceptions;
using ECommerce.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ECommerce.Tests;

public class OrderCheckoutTests : IClassFixture<TestDbFixture>
{
    private readonly TestDbFixture _fx;

    public OrderCheckoutTests(TestDbFixture fx)
    {
        _fx = fx;
    }

    private static IConfiguration ShippingConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Shipping:FlatFee"] = "50",
                ["Shipping:FreeThreshold"] = "1000"
            })
            .Build();

    private static CheckoutRequest ValidRequest() => new()
    {
        FullName = "Test Buyer",
        Phone = "01000000000",
        AddressLine = "1 Test Street",
        City = "Cairo",
        PaymentMethod = PaymentMethod.CashOnDelivery
    };

    [Fact]
    public async Task Checkout_ComputesTotalsFromDbPrices()
    {
        var user = await _fx.CreateUserAsync();
        var product = await _fx.CreateProductAsync(price: 449m, stock: 10);
        await _fx.AddToCartAsync(user.Id, product.Id, 2);

        await using var db = _fx.CreateContext();
        var service = new OrderService(db, ShippingConfig());
        var order = await service.CheckoutAsync(user.Id, ValidRequest());

        Assert.Equal(898m, order.Subtotal);
        Assert.Equal(50m, order.ShippingFee);
        Assert.Equal(948m, order.Total);
        Assert.Equal(OrderStatus.Pending, order.Status);

        var item = Assert.Single(order.Items);
        Assert.Equal(449m, item.UnitPrice);
        Assert.Equal(2, item.Quantity);
        Assert.Equal(898m, item.LineTotal);
        Assert.Equal(product.Name, item.ProductName);
    }

    [Fact]
    public async Task Checkout_HasFreeShipping_WhenSubtotalReachesThreshold()
    {
        var user = await _fx.CreateUserAsync();
        var product = await _fx.CreateProductAsync(price: 500m, stock: 10);
        await _fx.AddToCartAsync(user.Id, product.Id, 2);

        await using var db = _fx.CreateContext();
        var service = new OrderService(db, ShippingConfig());
        var order = await service.CheckoutAsync(user.Id, ValidRequest());

        Assert.Equal(1000m, order.Subtotal);
        Assert.Equal(0m, order.ShippingFee);
        Assert.Equal(1000m, order.Total);
    }

    [Fact]
    public async Task Checkout_DecrementsStock_AndClearsCart()
    {
        var user = await _fx.CreateUserAsync();
        var product = await _fx.CreateProductAsync(price: 100m, stock: 10);
        await _fx.AddToCartAsync(user.Id, product.Id, 3);

        await using (var db = _fx.CreateContext())
        {
            var service = new OrderService(db, ShippingConfig());
            await service.CheckoutAsync(user.Id, ValidRequest());
        }

        await using var check = _fx.CreateContext();
        var stock = await check.Products.Where(p => p.Id == product.Id).Select(p => p.StockQuantity).SingleAsync();
        var cartItems = await check.CartItems.CountAsync(i => i.Cart.UserId == user.Id);
        var orders = await check.Orders.CountAsync(o => o.UserId == user.Id);

        Assert.Equal(7, stock);
        Assert.Equal(0, cartItems);
        Assert.Equal(1, orders);
    }

    [Fact]
    public async Task Checkout_InsufficientStock_Fails_AndKeepsCartAndStock()
    {
        var user = await _fx.CreateUserAsync();
        var product = await _fx.CreateProductAsync(price: 100m, stock: 5);
        await _fx.AddToCartAsync(user.Id, product.Id, 3);

        // Stock drops after the item was added to the cart.
        await using (var change = _fx.CreateContext())
        {
            var p = await change.Products.SingleAsync(x => x.Id == product.Id);
            p.StockQuantity = 2;
            await change.SaveChangesAsync();
        }

        await using (var db = _fx.CreateContext())
        {
            var service = new OrderService(db, ShippingConfig());
            await Assert.ThrowsAsync<BadRequestException>(() => service.CheckoutAsync(user.Id, ValidRequest()));
        }

        await using var check = _fx.CreateContext();
        var stock = await check.Products.Where(p => p.Id == product.Id).Select(p => p.StockQuantity).SingleAsync();
        var cartQty = await check.CartItems.Where(i => i.Cart.UserId == user.Id).Select(i => i.Quantity).SingleAsync();
        var orders = await check.Orders.CountAsync(o => o.UserId == user.Id);

        Assert.Equal(2, stock);
        Assert.Equal(3, cartQty);
        Assert.Equal(0, orders);
    }
}
