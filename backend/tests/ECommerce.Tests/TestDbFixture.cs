using ECommerce.Api.Data;
using ECommerce.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Tests;

// Creates a throw-away LocalDB database (built from the real migrations) once per test class.
public class TestDbFixture : IAsyncLifetime
{
    private readonly string _dbName = "ECommerceTest_" + Guid.NewGuid().ToString("N");

    private string ConnectionString =>
        "Server=(localdb)\\MSSQLLocalDB;Database=" + _dbName + ";Trusted_Connection=True;TrustServerCertificate=True";

    public int CategoryId { get; private set; }

    public AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    public async Task InitializeAsync()
    {
        await using var db = CreateContext();
        await db.Database.MigrateAsync();

        var category = new Category { Name = "Test Category", Slug = "test-category" };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        CategoryId = category.Id;
    }

    public async Task DisposeAsync()
    {
        await using var db = CreateContext();
        await db.Database.EnsureDeletedAsync();
    }

    public async Task<User> CreateUserAsync()
    {
        await using var db = CreateContext();
        var id = Guid.NewGuid().ToString("N");
        var user = new User
        {
            FullName = "Test User",
            Email = "u" + id + "@test.local",
            PasswordHash = "x",
            Role = Roles.Customer
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<Product> CreateProductAsync(decimal price, int stock, bool isActive = true)
    {
        await using var db = CreateContext();
        var id = Guid.NewGuid().ToString("N");
        var product = new Product
        {
            Name = "Test Product " + id,
            Slug = "test-product-" + id,
            Description = "Test",
            Price = price,
            StockQuantity = stock,
            ImageUrl = string.Empty,
            IsActive = isActive,
            CategoryId = CategoryId
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product;
    }

    public async Task AddToCartAsync(int userId, int productId, int quantity)
    {
        await using var db = CreateContext();
        var cart = await db.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
        if (cart == null)
        {
            cart = new Cart { UserId = userId };
            db.Carts.Add(cart);
        }
        cart.Items.Add(new CartItem { ProductId = productId, Quantity = quantity });
        await db.SaveChangesAsync();
    }
}
