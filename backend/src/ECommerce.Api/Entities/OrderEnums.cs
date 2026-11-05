namespace ECommerce.Api.Entities;

public enum OrderStatus
{
    Pending,
    Confirmed,
    Shipped,
    Delivered,
    Cancelled
}

public enum PaymentMethod
{
    CashOnDelivery,
    MockCard
}

public enum PaymentStatus
{
    Pending,
    Paid
}
