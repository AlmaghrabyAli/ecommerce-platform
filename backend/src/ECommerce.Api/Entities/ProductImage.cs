namespace ECommerce.Api.Entities;

// One uploaded product image, stored as bytes in the database.
public class ProductImage
{
    public int Id { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public int SizeBytes { get; set; }
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
