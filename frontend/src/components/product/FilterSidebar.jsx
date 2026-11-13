import { useEffect, useState } from 'react'
import { Button } from '../ui/Button.jsx'
import { Toggle } from '../ui/Toggle.jsx'

export function FilterPanel({
  categories = [],
  categoryId,
  minPrice,
  maxPrice,
  inStock,
  onSelectCategory,
  onApplyPrice,
  onToggleInStock,
  onClearAll,
  hasActiveFilters,
  onCloseMobile,
  idPrefix = 'sidebar',
}) {
  const [minDraft, setMinDraft] = useState(minPrice || '')
  const [maxDraft, setMaxDraft] = useState(maxPrice || '')
  const [priceError, setPriceError] = useState('')

  useEffect(() => {
    setMinDraft(minPrice || '')
    setMaxDraft(maxPrice || '')
    setPriceError('')
  }, [minPrice, maxPrice])

  function handlePriceSubmit(e) {
    e.preventDefault()
    const minStr = String(minDraft).trim()
    const maxStr = String(maxDraft).trim()
    const minVal = minStr === '' ? null : Number(minStr)
    const maxVal = maxStr === '' ? null : Number(maxStr)

    if ((minVal !== null && (Number.isNaN(minVal) || minVal < 0)) ||
        (maxVal !== null && (Number.isNaN(maxVal) || maxVal < 0))) {
      setPriceError('Prices must be 0 or higher.')
      return
    }
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      setPriceError('Minimum price cannot be greater than maximum price.')
      return
    }

    setPriceError('')
    onApplyPrice(minStr, maxStr)
    if (onCloseMobile) onCloseMobile()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-navy">Filters</h2>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm font-medium text-primary-dark hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        ) : null}
      </div>

      {/* Category */}
      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold text-navy">Category</legend>
        <div className="space-y-1">
          <label className="flex min-h-[40px] items-center gap-2.5 rounded-[8px] px-2 py-1 text-sm text-ink hover:bg-bg cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-shop-category`}
              checked={!categoryId}
              onChange={() => {
                onSelectCategory('')
                if (onCloseMobile) onCloseMobile()
              }}
              className="h-4 w-4 accent-[#F97316]"
            />
            <span className={!categoryId ? 'font-semibold text-navy' : ''}>All</span>
          </label>
          {categories.map((cat) => {
            const active = String(cat.id) === String(categoryId || '')
            return (
              <label
                key={cat.id}
                className="flex min-h-[40px] items-center gap-2.5 rounded-[8px] px-2 py-1 text-sm text-ink hover:bg-bg cursor-pointer"
              >
                <input
                  type="radio"
                  name={`${idPrefix}-shop-category`}
                  checked={active}
                  onChange={() => {
                    onSelectCategory(String(cat.id))
                    if (onCloseMobile) onCloseMobile()
                  }}
                  className="h-4 w-4 accent-[#F97316]"
                />
                <span className={active ? 'font-semibold text-navy' : ''}>{cat.name}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="border-t border-border pt-5">
        <form onSubmit={handlePriceSubmit} className="space-y-3" noValidate>
          <p className="text-sm font-semibold text-navy">Price range (EGP)</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor={`${idPrefix}-min-price`}
                className="mb-1 block text-xs font-medium text-muted"
              >
                Min
              </label>
              <input
                id={`${idPrefix}-min-price`}
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={minDraft}
                onChange={(e) => {
                  setMinDraft(e.target.value)
                  if (priceError) setPriceError('')
                }}
                className="h-11 w-full rounded-[8px] border border-border-strong bg-surface px-3 text-base sm:text-sm text-ink"
              />
            </div>
            <div>
              <label
                htmlFor={`${idPrefix}-max-price`}
                className="mb-1 block text-xs font-medium text-muted"
              >
                Max
              </label>
              <input
                id={`${idPrefix}-max-price`}
                type="number"
                min="0"
                step="any"
                placeholder="Any"
                value={maxDraft}
                onChange={(e) => {
                  setMaxDraft(e.target.value)
                  if (priceError) setPriceError('')
                }}
                className="h-11 w-full rounded-[8px] border border-border-strong bg-surface px-3 text-base sm:text-sm text-ink"
              />
            </div>
          </div>

          {priceError ? (
            <p role="alert" className="text-xs font-medium text-danger">
              {priceError}
            </p>
          ) : null}

          <Button type="submit" variant="secondary" size="md" fullWidth>
            Apply
          </Button>
        </form>
      </div>

      <div className="border-t border-border pt-5">
        <Toggle
          label="In stock only"
          checked={inStock}
          onChange={(checked) => onToggleInStock(checked)}
        />
      </div>
    </div>
  )
}

export function FilterSidebar(props) {
  return (
    <aside className="hidden lg:block w-[280px] shrink-0">
      <div className="rounded-[12px] border border-border bg-surface p-5">
        <FilterPanel {...props} />
      </div>
    </aside>
  )
}
