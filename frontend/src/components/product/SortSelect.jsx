import { Select } from '../ui/Select.jsx'

const SHOP_SORT_OPTIONS = [
  { value: 'newest:desc', label: 'Newest', sortBy: 'newest', sortDir: 'desc' },
  { value: 'price:asc', label: 'Price: low to high', sortBy: 'price', sortDir: 'asc' },
  { value: 'price:desc', label: 'Price: high to low', sortBy: 'price', sortDir: 'desc' },
  { value: 'name:asc', label: 'Name: A to Z', sortBy: 'name', sortDir: 'asc' },
  { value: 'name:desc', label: 'Name: Z to A', sortBy: 'name', sortDir: 'desc' },
]

function getSortValue(sortBy, sortDir) {
  const by = sortBy || 'newest'
  const dir = sortDir || (by === 'newest' ? 'desc' : 'asc')
  const key = `${by}:${dir}`
  const found = SHOP_SORT_OPTIONS.find((opt) => opt.value === key)
  return found ? found.value : 'newest:desc'
}

export function SortSelect({ sortBy, sortDir, onChange, id = 'shop-sort' }) {
  const value = getSortValue(sortBy, sortDir)

  return (
    <div className="flex items-center gap-2.5 w-full sm:w-auto">
      <label htmlFor={id} className="text-sm font-medium text-muted whitespace-nowrap">
        Sort by
      </label>
      <Select
        id={id}
        value={value}
        onChange={(e) => {
          const [nextBy, nextDir] = e.target.value.split(':')
          onChange(nextBy, nextDir)
        }}
        containerClassName="w-full sm:w-[200px]"
      >
        {SHOP_SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
