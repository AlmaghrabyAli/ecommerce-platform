using ECommerce.Api.Data;
using ECommerce.Api.Entities;
using ECommerce.Api.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Api.Services;

public record StoredImage(byte[] Data, string ContentType);

public interface IImageService
{
    Task<int> UploadAsync(IFormFile file);
    Task<StoredImage> GetAsync(int id);
}

public class ImageService : IImageService
{
    public const int MaxBytes = 2 * 1024 * 1024;

    private static readonly byte[] JpegSignature = { 0xFF, 0xD8, 0xFF };
    private static readonly byte[] PngSignature = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

    private readonly AppDbContext _db;

    public ImageService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<int> UploadAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new BadRequestException("The image file is empty.");

        if (file.Length > MaxBytes)
            throw new BadRequestException("Image must be 2 MB or smaller.");

        using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer);
        var data = buffer.ToArray();

        // The type comes from the real file content, never from the file name or the client's header.
        var contentType = DetectContentType(data)
            ?? throw new BadRequestException("Only JPEG, PNG or WebP images are allowed.");

        var image = new ProductImage
        {
            ContentType = contentType,
            SizeBytes = data.Length,
            Data = data,
            CreatedAt = DateTime.UtcNow
        };

        _db.ProductImages.Add(image);
        await _db.SaveChangesAsync();

        return image.Id;
    }

    public async Task<StoredImage> GetAsync(int id)
    {
        var image = await _db.ProductImages
            .AsNoTracking()
            .Where(i => i.Id == id)
            .Select(i => new StoredImage(i.Data, i.ContentType))
            .FirstOrDefaultAsync();

        return image ?? throw new NotFoundException("Image not found.");
    }

    private static string? DetectContentType(ReadOnlySpan<byte> data)
    {
        if (data.StartsWith(JpegSignature))
            return "image/jpeg";

        if (data.StartsWith(PngSignature))
            return "image/png";

        // WebP files start with "RIFF", then 4 size bytes, then "WEBP".
        if (data.Length >= 12 && data[..4].SequenceEqual("RIFF"u8) && data.Slice(8, 4).SequenceEqual("WEBP"u8))
            return "image/webp";

        return null;
    }
}
