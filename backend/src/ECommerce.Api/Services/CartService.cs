using ECommerce.Api.Data;
using ECommerce.Api.Dtos;
using ECommerce.Api.Entities;
using ECommerce.Api.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Services;

public interface ICartService
{
    Task<CartResponse> GetAsync(int userId);
    Task<CartResponse> AddItemAsync(int userId, AddCartItemRequest request);
    Task<CartResponse> UpdateItemAsync(int userId, int productId, UpdateCartItemRequest request);
    Task<CartResponse> RemoveItemAsync(int userId, int productId);
    Task ClearAsync(int userId);
}

public class CartService : ICartService
{
    private readonly AppDbContext _db;

    public CartService(AppDbContext db)
    {
        _db = db;
    }

    private Task<Cart?> LoadCartAsync(int userId) =>
        _db.Carts
            .Include(c => c.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.UserId == userId);

    public async Task<CartResponse> GetAsync(int userId)
    {
        var cart = await _db.Carts
            .AsNoTracking()
            .Include(c => c.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        var response = new CartResponse();
        if (cart == null) return response;

        response.Items = cart.Items
            .OrderBy(i => i.Id)
            .Select(i => new CartItemResponse
            {
                ProductId = i.ProductId,
                Name = i.Product.Name,
                Slug = i.Product.Slug,
                ImageUrl = i.Product.ImageUrl,
                UnitPrice = i.Product.Price,
                Quantity = i.Quantity,
                LineTotal = i.Product.Price * i.Quantity,
                StockQuantity = i.Product.StockQuantity,
                IsAvailable = i.Product.IsActive && i.Product.StockQuantity >= i.Quantity
            })
            .ToList();

        response.ItemCount = response.Items.Sum(i => i.Quantity);
        response.Subtotal = response.Items.Sum(i => i.LineTotal);
        return response;
    }

    public async Task<CartResponse> AddItemAsync(int userId, AddCartItemRequest request)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId)
            ?? throw new NotFoundException("Product not found.");

        if (!product.IsActive)
            throw new BadRequestException("This product is not available.");

        if (product.StockQuantity <= 0)
            throw new BadRequestException("This product is out of stock.");

        var cart = await LoadCartAsync(userId);
        if (cart == null)
        {
            cart = new Cart { UserId = userId };
            _db.Carts.Add(cart);
        }

        var item = cart.Items.FirstOrDefault(i => i.ProductId == product.Id);
        var newQuantity = (item?.Quantity ?? 0) + request.Quantity;

        if (newQuantity > product.StockQuantity)
            throw new BadRequestException($"Only {product.StockQuantity} item(s) in stock.");

        if (item == null)
            cart.Items.Add(new CartItem { ProductId = product.Id, Quantity = newQuantity });
        else
            item.Quantity = newQuantity;

        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetAsync(userId);
    }

    public async Task<CartResponse> UpdateItemAsync(int userId, int productId, UpdateCartItemRequest request)
    {
        var cart = await LoadCartAsync(userId);
        var item = cart?.Items.FirstOrDefault(i => i.ProductId == productId)
            ?? throw new NotFoundException("Item not found in cart.");

        if (!item.Product.IsActive)
            throw new BadRequestException("This product is not available.");

        if (request.Quantity > item.Product.StockQuantity)
            throw new BadRequestException($"Only {item.Product.StockQuantity} item(s) in stock.");

        item.Quantity = request.Quantity;
        cart!.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetAsync(userId);
    }

    public async Task<CartResponse> RemoveItemAsync(int userId, int productId)
    {
        var cart = await LoadCartAsync(userId);
        var item = cart?.Items.FirstOrDefault(i => i.ProductId == productId)
            ?? throw new NotFoundException("Item not found in cart.");

        _db.CartItems.Remove(item);
        cart!.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetAsync(userId);
    }

    public async Task ClearAsync(int userId)
    {
        var cart = await LoadCartAsync(userId);
        if (cart == null) return;

        _db.CartItems.RemoveRange(cart.Items);
        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
