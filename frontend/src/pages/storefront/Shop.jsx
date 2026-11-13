import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { useProducts } from '../../hooks/useProducts.js'
import { parseApiError } from '../../utils/errors.js'
import { pluralize } from '../../utils/format.js'
import { formatMoney } from '../../utils/money.js'
import { FilterSidebar } from '../../components/product/FilterSidebar.jsx'
import { FilterSheet } from '../../components/product/FilterSheet.jsx'
import { ProductGrid } from '../../components/product/ProductGrid.jsx'
import { SortSelect } from '../../components/product/SortSelect.jsx'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Chip } from '../../components/ui/Chip.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'

export function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)

  const urlSearch = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const inStock = searchParams.get('inStock') === 'true'
  const sortBy = searchParams.get('sortBy') || 'newest'
  const sortDir = searchParams.get('sortDir') || (sortBy === 'newest' ? 'desc' : 'asc')
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)

  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    setSearchInput(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    if (debouncedSearch !== searchInput) return
    if (debouncedSearch.trim() === urlSearch.trim()) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch.trim()) {
        next.set('search', debouncedSearch.trim())
      } else {
        next.delete('search')
      }
      next.set('page', '1')
      return next
    }, { replace: true })
  }, [debouncedSearch, searchInput, urlSearch, setSearchParams])

  const categoriesQuery = useCategories()
  const categories = categoriesQuery.data || []

  const productsQuery = useProducts({
    search: urlSearch || undefined,
    categoryId: categoryId || undefined,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    inStock: inStock ? 'true' : undefined,
    sortBy,
    sortDir,
    page,
    pageSize: 12,
  })

  function updateParams(mutator) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      mutator(next)
      return next
    })
  }

  function handleSelectCategory(nextCatId) {
    updateParams((next) => {
      if (nextCatId) next.set('categoryId', nextCatId)
      else next.delete('categoryId')
      next.set('page', '1')
    })
  }

  function handleApplyPrice(minVal, maxVal) {
    updateParams((next) => {
      if (minVal !== '') next.set('minPrice', minVal)
      else next.delete('minPrice')
      if (maxVal !== '') next.set('maxPrice', maxVal)
      else next.delete('maxPrice')
      next.set('page', '1')
    })
  }

  function handleToggleInStock(checked) {
    updateParams((next) => {
      if (checked) next.set('inStock', 'true')
      else next.delete('inStock')
      next.set('page', '1')
    })
  }

  function handleSortChange(nextBy, nextDir) {
    updateParams((next) => {
      next.set('sortBy', nextBy)
      next.set('sortDir', nextDir)
      next.set('page', '1')
    })
  }

  function handlePageChange(nextPage) {
    updateParams((next) => {
      next.set('page', String(nextPage))
    })
  }

  function handleClearAll() {
    setSearchInput('')
    setSearchParams(new URLSearchParams())
  }

  const selectedCategory = categories.find((c) => String(c.id) === categoryId)
  const heading = urlSearch
    ? `Results for "${urlSearch}"`
    : selectedCategory
      ? selectedCategory.name
      : 'All products'

  const activeChips = []
  if (urlSearch) {
    activeChips.push({
      key: 'search',
      label: `Search: ${urlSearch}`,
      onRemove: () => {
        setSearchInput('')
        updateParams((next) => {
          next.delete('search')
          next.set('page', '1')
        })
      },
    })
  }
  if (selectedCategory) {
    activeChips.push({
      key: 'category',
      label: selectedCategory.name,
      onRemove: () => handleSelectCategory(''),
    })
  }
  if (minPrice) {
    activeChips.push({
      key: 'minPrice',
      label: `Min: ${formatMoney(minPrice)}`,
      onRemove: () => handleApplyPrice('', maxPrice),
    })
  }
  if (maxPrice) {
    activeChips.push({
      key: 'maxPrice',
      label: `Max: ${formatMoney(maxPrice)}`,
      onRemove: () => handleApplyPrice(minPrice, ''),
    })
  }
  if (inStock) {
    activeChips.push({
      key: 'inStock',
      label: 'In stock only',
      onRemove: () => handleToggleInStock(false),
    })
  }

  const hasActiveFilters = activeChips.length > 0
  const data = productsQuery.data
  const items = data?.items || []
  const totalCount = data?.totalCount ?? 0

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop' }]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] leading-[36px] sm:text-[36px] sm:leading-[44px] font-bold text-navy">
            {heading}
          </h1>
          {!productsQuery.isLoading && !productsQuery.isError ? (
            <p className="mt-1 text-sm text-muted tabular-nums">
              {pluralize(totalCount, 'product')}
            </p>
          ) : null}
        </div>

        <div className="relative w-full sm:w-[260px]">
          <label htmlFor="shop-inline-search" className="sr-only">
            Filter products by name
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <input
            id="shop-inline-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by name..."
            className="h-11 w-full rounded-[8px] border border-border-strong bg-surface pl-9 pr-3 text-base sm:text-sm text-ink placeholder:text-muted focus:border-primary"
          />
        </div>
      </div>

      <div className="mt-6 flex items-start gap-8">
        <FilterSidebar
          categories={categories}
          categoryId={categoryId}
          minPrice={minPrice}
          maxPrice={maxPrice}
          inStock={inStock}
          onSelectCategory={handleSelectCategory}
          onApplyPrice={handleApplyPrice}
          onToggleInStock={handleToggleInStock}
          onClearAll={handleClearAll}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="min-w-0 flex-1 space-y-5">
          {/* Top bar: mobile filters button, active chips, sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="lg:hidden shrink-0"
                onClick={() => setSheetOpen(true)}
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
                  </span>
                </span>
              </Button>

              {activeChips.map((chip) => (
                <Chip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
              ))}
            </div>

            <SortSelect sortBy={sortBy} sortDir={sortDir} onChange={handleSortChange} />
          </div>

          {productsQuery.isError ? (
            <ErrorState
              message={parseApiError(productsQuery.error).message}
              onRetry={() => productsQuery.refetch()}
            />
          ) : !productsQuery.isLoading && items.length === 0 ? (
            <EmptyState
              title="No products match your filters"
              hint="Try removing a filter or searching for something else."
              actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
              onAction={hasActiveFilters ? handleClearAll : undefined}
            />
          ) : (
            <>
              <ProductGrid
                products={items}
                loading={productsQuery.isLoading}
                skeletonCount={12}
                columns="shop"
              />
              <Pagination
                page={data?.page || page}
                totalPages={data?.totalPages || 0}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categories={categories}
        categoryId={categoryId}
        minPrice={minPrice}
        maxPrice={maxPrice}
        inStock={inStock}
        onSelectCategory={handleSelectCategory}
        onApplyPrice={handleApplyPrice}
        onToggleInStock={handleToggleInStock}
        onClearAll={handleClearAll}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  )
}
