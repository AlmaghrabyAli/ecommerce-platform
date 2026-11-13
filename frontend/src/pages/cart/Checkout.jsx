import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FLAT_FEE, FREE_THRESHOLD } from '../../config/shipping.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCart } from '../../hooks/useCart.js'
import { usePlaceOrder } from '../../hooks/useOrders.js'
import { parseApiError } from '../../utils/errors.js'
import { formatMoney } from '../../utils/money.js'
import { ProductImage } from '../../components/product/ProductImage.jsx'
import { Alert } from '../../components/ui/Alert.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { Textarea } from '../../components/ui/Textarea.jsx'

export function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const cartQuery = useCart()
  const placeOrder = usePlaceOrder()
  const [bannerError, setBannerError] = useState('')
  const [orderCompleted, setOrderCompleted] = useState(false)
  const submittingRef = useRef(false)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: user?.fullName || '',
      phone: '',
      addressLine: '',
      city: '',
      postalCode: '',
      notes: '',
      paymentMethod: 'CashOnDelivery',
    },
  })

  useEffect(() => {
    if (user?.fullName) {
      setValue('fullName', user.fullName)
    }
  }, [user?.fullName, setValue])

  const selectedPayment = watch('paymentMethod')

  if (cartQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-96 w-full rounded-[12px]" />
            <Skeleton className="h-44 w-full rounded-[12px]" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-72 w-full rounded-[12px]" />
          </div>
        </div>
      </div>
    )
  }

  if (cartQuery.isError) {
    return (
      <ErrorState
        message={parseApiError(cartQuery.error).message}
        onRetry={() => cartQuery.refetch()}
      />
    )
  }

  const cart = cartQuery.data
  const items = cart?.items || []

  if (!orderCompleted && items.length === 0) {
    return <Navigate to="/cart" replace />
  }

  async function onSubmit(values) {
    if (submittingRef.current || placeOrder.isPending) return
    submittingRef.current = true
    setBannerError('')

    const payload = {
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      addressLine: values.addressLine.trim(),
      city: values.city.trim(),
      postalCode: values.postalCode?.trim() || null,
      notes: values.notes?.trim() || null,
      paymentMethod: values.paymentMethod,
    }

    try {
      const order = await placeOrder.mutateAsync(payload)
      setOrderCompleted(true)
      navigate(`/order-confirmation/${order.id}`, { replace: true })
    } catch (err) {
      const parsed = parseApiError(err)
      if (parsed.status === 401 || parsed.status === 403) return
      if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
        Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: msg })
        })
      } else {
        setBannerError(parsed.message)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] sm:text-[36px] font-bold text-navy">Checkout</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12"
        noValidate
      >
        <div className="lg:col-span-8 space-y-6">
          {bannerError ? (
            <Alert
              variant="error"
              message={bannerError}
              onDismiss={() => setBannerError('')}
              action={
                <Link to="/cart">
                  <Button type="button" variant="secondary" size="sm">
                    Review cart
                  </Button>
                </Link>
              }
            />
          ) : null}

          <section className="rounded-[12px] border border-border bg-surface p-6 space-y-5">
            <h2 className="text-xl font-semibold text-navy">Shipping details</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Full name"
                  error={errors.fullName?.message}
                  {...register('fullName', {
                    required: 'Full name is required.',
                    validate: (v) => {
                      const len = v.trim().length
                      if (len < 2 || len > 100) {
                        return 'Full name must be between 2 and 100 characters.'
                      }
                      return true
                    },
                  })}
                />
              </div>

              <Input
                label="Phone"
                type="tel"
                placeholder="01012345678"
                error={errors.phone?.message}
                {...register('phone', {
                  required: 'Phone number is required.',
                  validate: (v) => {
                    const len = v.trim().length
                    if (len < 7 || len > 20) {
                      return 'Phone must be between 7 and 20 characters.'
                    }
                    return true
                  },
                })}
              />

              <Input
                label="City"
                placeholder="Cairo"
                error={errors.city?.message}
                {...register('city', {
                  required: 'City is required.',
                  validate: (v) => {
                    const len = v.trim().length
                    if (len < 2 || len > 100) {
                      return 'City must be between 2 and 100 characters.'
                    }
                    return true
                  },
                })}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  placeholder="Street name, building, apartment"
                  error={errors.addressLine?.message}
                  {...register('addressLine', {
                    required: 'Address is required.',
                    validate: (v) => {
                      const len = v.trim().length
                      if (len < 5 || len > 200) {
                        return 'Address must be between 5 and 200 characters.'
                      }
                      return true
                    },
                  })}
                />
              </div>

              <Input
                label="Postal code"
                optional
                error={errors.postalCode?.message}
                {...register('postalCode', {
                  maxLength: {
                    value: 20,
                    message: 'Postal code must be 20 characters or less.',
                  },
                })}
              />

              <div className="sm:col-span-2">
                <Textarea
                  label="Delivery notes"
                  optional
                  rows={3}
                  placeholder="Optional instructions for delivery"
                  error={errors.notes?.message}
                  {...register('notes', {
                    maxLength: {
                      value: 500,
                      message: 'Delivery notes must be 500 characters or less.',
                    },
                  })}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[12px] border border-border bg-surface p-6 space-y-4">
            <h2 className="text-xl font-semibold text-navy">Payment method</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label
                className={[
                  'flex items-start gap-3 rounded-[12px] p-4 cursor-pointer transition-colors',
                  selectedPayment === 'CashOnDelivery'
                    ? 'border-2 border-primary bg-primary-tint/50'
                    : 'border border-border-strong bg-surface hover:bg-bg',
                ].join(' ')}
              >
                <input
                  type="radio"
                  value="CashOnDelivery"
                  className="mt-1 h-4 w-4 accent-[#F97316]"
                  {...register('paymentMethod')}
                />
                <div>
                  <p className="text-sm font-semibold text-navy">Cash on delivery</p>
                  <p className="mt-0.5 text-xs text-muted">Pay when you receive your order</p>
                </div>
              </label>

              <label
                className={[
                  'flex items-start gap-3 rounded-[12px] p-4 cursor-pointer transition-colors',
                  selectedPayment === 'MockCard'
                    ? 'border-2 border-primary bg-primary-tint/50'
                    : 'border border-border-strong bg-surface hover:bg-bg',
                ].join(' ')}
              >
                <input
                  type="radio"
                  value="MockCard"
                  className="mt-1 h-4 w-4 accent-[#F97316]"
                  {...register('paymentMethod')}
                />
                <div>
                  <p className="text-sm font-semibold text-navy">Card (demo)</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Demo only, no card details are collected
                  </p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-4 lg:sticky lg:top-[132px] rounded-[12px] border border-border bg-surface p-6 space-y-5">
          <h2 className="text-xl font-semibold text-navy">Order summary</h2>

          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3 py-3 first:pt-0">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-border">
                  <ProductImage src={item.imageUrl} alt={item.name} iconClassName="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">{item.name}</p>
                  <p className="text-xs text-muted">Qty {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-navy tabular-nums">
                  {formatMoney(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-lg font-bold text-navy tabular-nums">
                {formatMoney(cart?.subtotal || 0)}
              </dd>
            </div>
          </dl>

          <p className="rounded-[8px] bg-bg p-3 text-xs leading-5 text-muted">
            Shipping: {formatMoney(FLAT_FEE)}, free on orders over {formatMoney(FREE_THRESHOLD)}.
            The final total is confirmed when you place the order.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={placeOrder.isPending}
          >
            Place order
          </Button>
        </aside>
      </form>
    </div>
  )
}
