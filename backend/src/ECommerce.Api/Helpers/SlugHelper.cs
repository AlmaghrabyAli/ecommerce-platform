using System.Text;
using System.Text.RegularExpressions;

namespace ECommerce.Api.Helpers;

public static class SlugHelper
{
    // "Wireless Mouse!" -> "wireless-mouse". Falls back to "item" if nothing ASCII is left.
    public static string Slugify(string text)
    {
        var lower = (text ?? string.Empty).Trim().ToLowerInvariant();
        var sb = new StringBuilder();
        foreach (var ch in lower)
        {
            if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9'))
                sb.Append(ch);
            else
                sb.Append('-');
        }

        var slug = Regex.Replace(sb.ToString(), "-{2,}", "-").Trim('-');
        if (slug.Length > 150) slug = slug.Substring(0, 150).Trim('-');
        return slug.Length == 0 ? "item" : slug;
    }
}
