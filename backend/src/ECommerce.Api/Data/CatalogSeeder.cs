using ECommerce.Api.Entities;
using ECommerce.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Data;

public static class CatalogSeeder
{
    private record SeedProduct(string Name, string Category, decimal Price, int Stock, string Description);

    private static readonly (string Name, string Description)[] Categories =
    {
        ("Electronics", "Phones, audio, and smart gadgets."),
        ("Computers & Accessories", "Laptops, peripherals, and storage."),
        ("Home & Kitchen", "Appliances and everyday home essentials."),
        ("Fashion", "Clothing, bags, and accessories."),
        ("Sports & Outdoors", "Gear for training and the outdoors."),
        ("Books & Stationery", "Books, notebooks, and office supplies.")
    };

    private static readonly SeedProduct[] Products =
    {
        new("Wireless Earbuds Pro", "Electronics", 1299m, 40, "Bluetooth 5.3 earbuds with noise reduction and a 24-hour charging case."),
        new("Smart Watch Active", "Electronics", 2499m, 25, "Fitness smart watch with heart rate monitor, GPS, and 7-day battery."),
        new("Portable Bluetooth Speaker", "Electronics", 899m, 60, "Waterproof speaker with deep bass and 12 hours of playtime."),
        new("Power Bank 20000mAh", "Electronics", 649m, 0, "Fast-charging power bank with dual USB-C ports."),

        new("Mechanical Keyboard RGB", "Computers & Accessories", 1599m, 30, "Hot-swappable mechanical keyboard with RGB backlight."),
        new("Wireless Mouse Ergonomic", "Computers & Accessories", 449m, 80, "Silent ergonomic mouse with adjustable DPI."),
        new("USB-C Hub 7-in-1", "Computers & Accessories", 799m, 45, "HDMI, USB 3.0, SD card reader, and power delivery in one hub."),
        new("External SSD 1TB", "Computers & Accessories", 3299m, 15, "Pocket-size portable SSD with up to 1000 MB/s read speed."),

        new("Air Fryer 5L", "Home & Kitchen", 2199m, 20, "Digital air fryer with 8 presets and a non-stick basket."),
        new("Electric Kettle 1.7L", "Home & Kitchen", 549m, 50, "Stainless steel kettle with auto shut-off."),
        new("Non-Stick Cookware Set", "Home & Kitchen", 1899m, 12, "Set of 7 non-stick pots and pans, induction compatible."),
        new("Vacuum Storage Bags (10 pack)", "Home & Kitchen", 199m, 150, "Space-saving vacuum bags for clothes and bedding."),

        new("Classic Cotton T-Shirt", "Fashion", 299m, 200, "Soft 100% cotton crew-neck t-shirt."),
        new("Slim Fit Jeans", "Fashion", 749m, 70, "Stretch denim jeans with a slim fit."),
        new("Leather Wallet", "Fashion", 399m, 55, "Genuine leather bi-fold wallet with card slots."),
        new("Canvas Backpack", "Fashion", 899m, 35, "Durable backpack with a padded 15-inch laptop sleeve."),

        new("Yoga Mat 6mm", "Sports & Outdoors", 349m, 90, "Non-slip yoga mat with carrying strap."),
        new("Adjustable Dumbbell Set", "Sports & Outdoors", 2799m, 10, "Adjustable dumbbells from 2 to 20 kg per hand."),
        new("Insulated Water Bottle 1L", "Sports & Outdoors", 279m, 120, "Keeps drinks cold for 24 hours or hot for 12."),
        new("Camping Tent 3-Person", "Sports & Outdoors", 2399m, 8, "Lightweight waterproof tent with quick setup."),

        new("Hardcover Notebook A5", "Books & Stationery", 129m, 300, "Dotted-grid notebook with 192 pages of thick paper."),
        new("Gel Pens Set (12 colors)", "Books & Stationery", 99m, 250, "Smooth-writing gel pens in assorted colors."),
        new("Desk Organizer Wooden", "Books & Stationery", 349m, 40, "Multi-compartment desk organizer for pens and papers."),
        new("Programming Fundamentals Book", "Books & Stationery", 459m, 3, "Beginner-friendly guide to programming concepts.")
    };

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var categoryMap = new Dictionary<string, Category>();
        foreach (var (name, description) in Categories)
        {
            var slug = SlugHelper.Slugify(name);
            var category = await db.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
            if (category == null)
            {
                category = new Category { Name = name, Slug = slug, Description = description };
                db.Categories.Add(category);
            }
            categoryMap[name] = category;
        }
        await db.SaveChangesAsync();

        var existingSlugs = (await db.Products.Select(p => p.Slug).ToListAsync()).ToHashSet();
        var now = DateTime.UtcNow;
        var index = 0;

        foreach (var item in Products)
        {
            index++;
            var slug = SlugHelper.Slugify(item.Name);
            if (existingSlugs.Contains(slug)) continue;

            db.Products.Add(new Product
            {
                Name = item.Name,
                Slug = slug,
                Description = item.Description,
                Price = item.Price,
                StockQuantity = item.Stock,
                ImageUrl = "https://placehold.co/600x600/png?text=" + Uri.EscapeDataString(item.Name),
                CategoryId = categoryMap[item.Category].Id,
                IsActive = true,
                CreatedAt = now.AddMinutes(-index),
                UpdatedAt = now
            });
        }

        await db.SaveChangesAsync();
    }
}
