using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using ECommerce.Api.Exceptions;
using ECommerce.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ECommerce.Tests;

public class OrderCancelAndAccessTests : IClassFixture<TestDbFixture>
{
    private readonly TestDbFixture _fx;

    public OrderCancelAndAccessTests(TestDbFixture fx)
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

    private async Task<OrderResponse> PlaceOrderAsync(int userId)
    {
        await using var db = _fx.CreateContext();
        return await new OrderService(db, ShippingConfig()).CheckoutAsync(userId, ValidRequest());
    }

    private async Task<int> StockOfAsync(int productId)
    {
        await using var check = _fx.CreateContext();
        return await check.Products.Where(p => p.Id == productId).Select(p => p.StockQuantity).SingleAsync();
    }

    [Fact]
    public async Task Cancel_RestoresStock_AndCannotBeCancelledTwice()
    {
        var user = await _fx.CreateUserAsync();
        var product = await _fx.CreateProductAsync(price: 100m, stock: 10);
        await _fx.AddToCartAsync(user.Id, product.Id, 4);

        var order = await PlaceOrderAsync(user.Id);
        Assert.Equal(6, await StockOfAsync(product.Id));

        await using (var db = _fx.CreateContext())
        {
            var cancelled = await new OrderService(db, ShippingConfig()).CancelForUserAsync(user.Id, order.Id);
            Assert.Equal(OrderStatus.Cancelled, cancelled.Status);
        }

        Assert.Equal(10, await StockOfAsync(product.Id));

        await using (var db = _fx.CreateContext())
        {
            var service = new OrderService(db, ShippingConfig());
            await Assert.ThrowsAsync<BadRequestException>(() => service.CancelForUserAsync(user.Id, order.Id));
        }

        Assert.Equal(10, await StockOfAsync(product.Id));
    }

    [Fact]
    public async Task AnotherCustomer_CannotReadOrCancelOrder()
    {
        var owner = await _fx.CreateUserAsync();
        var other = await _fx.CreateUserAsync();
        var product = await _fx.CreateProductAsync(price: 100m, stock: 10);
        await _fx.AddToCartAsync(owner.Id, product.Id, 1);
        var order = await PlaceOrderAsync(owner.Id);

        await using (var db = _fx.CreateContext())
        {
            var service = new OrderService(db, ShippingConfig());
            await Assert.ThrowsAsync<NotFoundException>(() => service.GetForUserAsync(other.Id, order.Id));
            await Assert.ThrowsAsync<NotFoundException>(() => service.CancelForUserAsync(other.Id, order.Id));
        }

        await using (var db = _fx.CreateContext())
        {
            var mine = await new OrderService(db, ShippingConfig()).GetForUserAsync(owner.Id, order.Id);
            Assert.Equal(order.Id, mine.Id);
            Assert.Equal(OrderStatus.Pending, mine.Status);
        }
    }

    [Fact]
    public async Task Checkout_InactiveProduct_Fails_AndKeepsCartAndStock()
    {
        var user = await _fx.CreateUserAsync();
        var product = await _fx.CreateProductAsync(price: 100m, stock: 10);
        await _fx.AddToCartAsync(user.Id, product.Id, 1);

        await using (var change = _fx.CreateContext())
        {
            var p = await change.Products.SingleAsync(x => x.Id == product.Id);
            p.IsActive = false;
            await change.SaveChangesAsync();
        }

        await using (var db = _fx.CreateContext())
        {
            var service = new OrderService(db, ShippingConfig());
            await Assert.ThrowsAsync<BadRequestException>(() => service.CheckoutAsync(user.Id, ValidRequest()));
        }

        await using var check = _fx.CreateContext();
        var cartQty = await check.CartItems.Where(i => i.Cart.UserId == user.Id).Select(i => i.Quantity).SingleAsync();
        var orders = await check.Orders.CountAsync(o => o.UserId == user.Id);

        Assert.Equal(10, await StockOfAsync(product.Id));
        Assert.Equal(1, cartQty);
        Assert.Equal(0, orders);
    }
}
