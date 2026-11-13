export function ShippingDetails({ order }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-navy">Shipping details</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="sr-only">Full name</dt>
          <dd className="font-semibold text-ink">{order.fullName}</dd>
        </div>
        <div>
          <dt className="sr-only">Phone</dt>
          <dd className="text-muted tabular-nums">{order.phone}</dd>
        </div>
        <div>
          <dt className="sr-only">Address</dt>
          <dd className="text-ink">
            {order.addressLine}, {order.city}
            {order.postalCode ? `, ${order.postalCode}` : ''}
          </dd>
        </div>
        {order.notes ? (
          <div className="pt-1 border-t border-border">
            <dt className="text-xs font-medium text-muted">Delivery notes</dt>
            <dd className="mt-0.5 text-ink">{order.notes}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}
