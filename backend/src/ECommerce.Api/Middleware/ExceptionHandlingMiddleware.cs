using System.Text.Json;
using ECommerce.Api.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                throw;
            }

            var (status, title, detail) = ex switch
            {
                NotFoundException => (StatusCodes.Status404NotFound, "Resource not found.", ex.Message),
                ConflictException => (StatusCodes.Status409Conflict, "Conflict.", ex.Message),
                BadRequestException => (StatusCodes.Status400BadRequest, "Bad request.", ex.Message),
                _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.",
                      _env.IsDevelopment() ? ex.Message : null)
            };

            if (status == StatusCodes.Status500InternalServerError)
            {
                _logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
            }

            context.Response.Clear();
            context.Response.StatusCode = status;
            context.Response.ContentType = "application/problem+json";

            var problem = new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = detail,
                Instance = context.Request.Path
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
        }
    }
}
