import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Package, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useAdminProducts,
  useDeactivateAdminProduct,
  useUpdateAdminProduct,
} from '../../hooks/useAdmin.js'
import { useCategories } from '../../hooks/useCategories.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { parseApiError } from '../../utils/errors.js'
import { stockState } from '../../utils/format.js'
import { formatMoney } from '../../utils/money.js'
import { PRODUCT_STATUS_META, STOCK_BADGE_META } from '../../utils/orderStatus.js'
import { ProductImage } from '../../components/product/ProductImage.jsx'
import { SortSelect } from '../../components/product/SortSelect.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { TableSkeleton } from '../../components/ui/Skeleton.jsx'

export function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const sortBy = searchParams.get('sortBy') || 'newest'
  const sortDir = searchParams.get('sortDir') || (sortBy === 'newest' ? 'desc' : 'asc')
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)

  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 400)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [activatingId, setActivatingId] = useState(null)

  useEffect(() => {
    setSearchInput(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    if (debouncedSearch !== searchInput) return
    if (debouncedSearch.trim() === urlSearch.trim()) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch.trim()) next.set('search', debouncedSearch.trim())
      else next.delete('search')
      next.set('page', '1')
      return next
    }, { replace: true })
  }, [debouncedSearch, searchInput, urlSearch, setSearchParams])

  const categoriesQuery = useCategories()
  const categories = categoriesQuery.data || []

  const productsQuery = useAdminProducts({
    search: urlSearch || undefined,
    categoryId: categoryId || undefined,
    sortBy,
    sortDir,
    page,
    pageSize: 12,
  })

  const deactivateProduct = useDeactivateAdminProduct()
  const updateProduct = useUpdateAdminProduct()

  function updateParams(mutator) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      mutator(next)
      return next
    })
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget || deactivateProduct.isPending) return
    try {
      await deactivateProduct.mutateAsync(deactivateTarget.id)
      setDeactivateTarget(null)
    } catch {
      setDeactivateTarget(null)
    }
  }

  async function handleActivate(product) {
    if (activatingId !== null) return
    setActivatingId(product.id)
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stockQuantity: product.stockQuantity,
        imageUrl: product.imageUrl || '',
        categoryId: product.categoryId,
        isActive: true,
        rowVersion: product.rowVersion,
      })
    } catch (err) {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        toast.error(parsed.message, { id: `admin-prod-err-${parsed.message}`, duration: 6000 })
      }
    } finally {
      setActivatingId(null)
    }
  }

  const data = productsQuery.data
  const items = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-bold text-navy">Products</h1>
        <Link to="/admin/products/new">
          <Button variant="primary" size="md">
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Add product</span>
            </span>
          </Button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
          <div className="relative flex-1 max-w-sm">
            <label htmlFor="admin-products-search" className="sr-only">
              Search products
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
              aria-hidden="true"
            />
            <input
              id="admin-products-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by product name..."
              className="h-11 w-full rounded-[8px] border border-border-strong bg-surface pl-9 pr-3 text-base sm:text-sm text-ink placeholder:text-muted focus:border-primary"
            />
          </div>

          <Select
            aria-label="Filter by category"
            value={categoryId}
            onChange={(e) => {
              const val = e.target.value
              updateParams((next) => {
                if (val) next.set('categoryId', val)
                else next.delete('categoryId')
                next.set('page', '1')
              })
            }}
            containerClassName="w-full sm:w-[220px]"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <SortSelect
          id="admin-products-sort"
          sortBy={sortBy}
          sortDir={sortDir}
          onChange={(nextBy, nextDir) =>
            updateParams((next) => {
              next.set('sortBy', nextBy)
              next.set('sortDir', nextDir)
              next.set('page', '1')
            })
          }
        />
      </div>

      {/* Content */}
      {productsQuery.isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : productsQuery.isError ? (
        <ErrorState
          message={parseApiError(productsQuery.error).message}
          onRetry={() => productsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          hint="Try a different search or add a new product."
          actionLabel="Add product"
          actionTo="/admin/products/new"
        />
      ) : (
        <>
          {/* Desktop & Tablet Table */}
          <div className="hidden md:block overflow-hidden rounded-[12px] border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="h-11 border-b border-border bg-bg text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4">Product</th>
                    <th className="px-4">Category</th>
                    <th className="px-4 text-right">Price</th>
                    <th className="px-4 text-right">Stock</th>
                    <th className="px-4">Status</th>
                    <th className="px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((product) => {
                    const sState = stockState(product.stockQuantity)
                    const statusMeta = product.isActive
                      ? PRODUCT_STATUS_META.active
                      : PRODUCT_STATUS_META.inactive

                    return (
                      <tr key={product.id} className="h-16 hover:bg-bg/60">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[8px] border border-border">
                              <ProductImage
                                src={product.imageUrl}
                                alt={product.name}
                                iconClassName="h-5 w-5"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-navy">{product.name}</p>
                              <p className="truncate font-mono text-xs text-muted">{product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 text-ink whitespace-nowrap">{product.categoryName}</td>
                        <td className="px-4 text-right font-semibold text-navy tabular-nums whitespace-nowrap">
                          {formatMoney(product.price)}
                        </td>
                        <td className="px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2 tabular-nums">
                            <span className="font-medium text-ink">{product.stockQuantity}</span>
                            {sState === 'out' ? (
                              <Badge
                                label={STOCK_BADGE_META.out.label}
                                bg={STOCK_BADGE_META.out.bg}
                                text={STOCK_BADGE_META.out.text}
                              />
                            ) : sState === 'low' ? (
                              <Badge
                                label={STOCK_BADGE_META.low.label}
                                bg={STOCK_BADGE_META.low.bg}
                                text={STOCK_BADGE_META.low.text}
                              />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 whitespace-nowrap">
                          <Badge
                            label={statusMeta.label}
                            bg={statusMeta.bg}
                            text={statusMeta.text}
                            dot={statusMeta.dot}
                          />
                        </td>
                        <td className="px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-3">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="text-sm font-semibold text-primary-dark hover:underline"
                            >
                              Edit
                            </Link>
                            {product.isActive ? (
                              <button
                                type="button"
                                onClick={() => setDeactivateTarget(product)}
                                className="text-sm font-semibold text-danger hover:underline cursor-pointer"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={activatingId === product.id}
                                onClick={() => handleActivate(product)}
                                className="text-sm font-semibold text-success hover:underline disabled:opacity-50 cursor-pointer"
                              >
                                {activatingId === product.id ? 'Activating...' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((product) => {
              const sState = stockState(product.stockQuantity)
              const statusMeta = product.isActive
                ? PRODUCT_STATUS_META.active
                : PRODUCT_STATUS_META.inactive

              return (
                <article
                  key={product.id}
                  className="rounded-[12px] border border-border bg-surface p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-border">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        iconClassName="h-5 w-5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy">{product.name}</p>
                      <p className="font-mono text-xs text-muted truncate">{product.slug}</p>
                    </div>
                    <Badge label={statusMeta.label} bg={statusMeta.bg} text={statusMeta.text} />
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-3">
                    <div>
                      <dt className="text-xs text-muted">Category</dt>
                      <dd className="font-medium text-ink">{product.categoryName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Price</dt>
                      <dd className="font-semibold text-navy tabular-nums">
                        {formatMoney(product.price)}
                      </dd>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <dt className="text-xs text-muted">Stock:</dt>
                      <dd className="font-medium text-ink tabular-nums">{product.stockQuantity}</dd>
                      {sState === 'out' ? (
                        <Badge
                          label={STOCK_BADGE_META.out.label}
                          bg={STOCK_BADGE_META.out.bg}
                          text={STOCK_BADGE_META.out.text}
                        />
                      ) : sState === 'low' ? (
                        <Badge
                          label={STOCK_BADGE_META.low.label}
                          bg={STOCK_BADGE_META.low.bg}
                          text={STOCK_BADGE_META.low.text}
                        />
                      ) : null}
                    </div>
                  </dl>

                  <div className="flex items-center gap-3 border-t border-border pt-3">
                    <Link to={`/admin/products/${product.id}/edit`} className="flex-1">
                      <Button variant="secondary" size="sm" fullWidth>
                        Edit
                      </Button>
                    </Link>
                    {product.isActive ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDeactivateTarget(product)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        loading={activatingId === product.id}
                        onClick={() => handleActivate(product)}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <Pagination
            page={data?.page || page}
            totalPages={data?.totalPages || 0}
            onPageChange={(nextPage) =>
              updateParams((next) => {
                next.set('page', String(nextPage))
              })
            }
          />
        </>
      )}

      <Modal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate product?"
        preventClose={deactivateProduct.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={deactivateProduct.isPending}
              onClick={() => setDeactivateTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive-solid"
              loading={deactivateProduct.isPending}
              onClick={handleConfirmDeactivate}
            >
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          <span className="font-semibold">{deactivateTarget?.name}</span> will be hidden from the
          storefront. Existing orders remain unaffected and you can activate it again anytime.
        </p>
      </Modal>
    </div>
  )
}
