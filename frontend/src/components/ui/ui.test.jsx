import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Alert } from './Alert.jsx'
import { Badge } from './Badge.jsx'
import { Breadcrumbs } from './Breadcrumbs.jsx'
import { Button } from './Button.jsx'
import { Chip } from './Chip.jsx'
import { EmptyState } from './EmptyState.jsx'
import { ErrorState } from './ErrorState.jsx'
import { Input } from './Input.jsx'
import { Select } from './Select.jsx'
import { ProductCardSkeleton, Skeleton, TableSkeleton } from './Skeleton.jsx'
import { Spinner } from './Spinner.jsx'
import { Textarea } from './Textarea.jsx'
import { Toggle } from './Toggle.jsx'

describe('UI primitives', () => {
  it('Button renders variants, loading spinner, disabled state, and handles clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(
      <Button variant="primary" size="lg" fullWidth onClick={onClick}>
        Save item
      </Button>,
    )

    const btn = screen.getByRole('button', { name: 'Save item' })
    expect(btn).toBeEnabled()
    expect(btn).toHaveClass('w-full')
    await user.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button variant="destructive" loading onClick={onClick}>
        Save item
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Save item' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save item' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('Input binds label, helper text, error with aria-invalid, and toggles password visibility', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <Input label="Password" type="password" optional helperText="Min 8 chars" />,
    )

    const input = screen.getByLabelText(/Password/)
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByText('Min 8 chars')).toBeInTheDocument()
    expect(screen.getByText('(optional)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')

    rerender(<Input label="Email" error="Invalid email" helperText="Ignored when error" />)
    const emailInput = screen.getByLabelText('Email')
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.queryByText('Ignored when error')).not.toBeInTheDocument()
  })

  it('Textarea and Select wire label, optional tag, helperText, error, and disabled', () => {
    render(
      <div>
        <Textarea label="Notes" optional helperText="Optional notes" />
        <Textarea label="Bio" error="Bio required" disabled />
        <Select label="Category" optional helperText="Choose one">
          <option value="">Pick</option>
          <option value="1">Electronics</option>
        </Select>
        <Select label="Broken" error="Required field">
          <option value="">None</option>
        </Select>
      </div>,
    )

    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
    expect(screen.getByText('Optional notes')).toBeInTheDocument()
    expect(screen.getByLabelText('Bio')).toBeDisabled()
    expect(screen.getByLabelText('Bio')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Bio required')).toBeInTheDocument()

    expect(screen.getByLabelText(/Category/)).toBeInTheDocument()
    expect(screen.getByText('Choose one')).toBeInTheDocument()
    expect(screen.getByLabelText('Broken')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('Toggle renders switch state and invokes onChange unless disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <Toggle checked={false} onChange={onChange} label="In stock only" />,
    )

    const sw = screen.getByRole('switch', { name: 'In stock only' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await user.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)

    rerender(<Toggle checked={true} onChange={onChange} label="In stock only" disabled />)
    expect(screen.getByRole('switch', { name: 'In stock only' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('switch', { name: 'In stock only' })).toBeDisabled()
  })

  it('Badge and Chip render labels, custom dot, and remove action', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(
      <div>
        <Badge label="Admin" bg="#EDE9FE" text="#6D28D9" dot="#6D28D9" />
        <Badge>Fallback</Badge>
        <Chip label="Search: keyboard" onRemove={onRemove} removeLabel="Clear search" />
        <Chip label="Static chip" />
      </div>,
    )

    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Fallback')).toBeInTheDocument()
    expect(screen.getByText('Search: keyboard')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('Alert uses alert role for error/warning, status role for success/info, and supports dismiss and action', () => {
    const onDismiss = vi.fn()
    render(
      <div>
        <Alert variant="error" title="Error title" message="Error body" onDismiss={onDismiss} />
        <Alert variant="warning" message="Warning body" action={<button type="button">Fix</button>} />
        <Alert variant="success" message="Success body" />
        <Alert variant="info" message="Info body" />
      </div>,
    )

    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(screen.getByText('Error title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fix' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('Skeleton, Spinner, EmptyState, ErrorState, and Breadcrumbs render expected semantics', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    const onRetry = vi.fn()

    render(
      <MemoryRouter>
        <Skeleton className="h-4 w-4" />
        <ProductCardSkeleton />
        <TableSkeleton rows={2} cols={3} />
        <Spinner label="Loading data..." />
        <EmptyState title="No items" hint="Try clearing filters" actionLabel="Clear" onAction={onAction} />
        <EmptyState title="Empty link" actionLabel="Browse store" actionTo="/shop" />
        <ErrorState title="Oops" message="Failed" onRetry={onRetry} />
        <ErrorState actionLabel="Go home" actionTo="/" />
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Shop', to: '/shop' },
            { label: 'Earbuds' },
          ]}
        />
        <Breadcrumbs items={[]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading data...')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Browse store' })).toHaveAttribute('href', '/shop')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByText('Earbuds')).toHaveAttribute('aria-current', 'page')
  })
})
