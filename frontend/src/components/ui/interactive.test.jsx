import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dropdown } from './Dropdown.jsx'
import { Modal } from './Modal.jsx'
import { Pagination } from './Pagination.jsx'
import { QuantityStepper } from './QuantityStepper.jsx'

function ModalHarness({ preventClose = false }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm action"
        preventClose={preventClose}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              Confirm
            </button>
          </>
        }
      >
        <p>Modal content</p>
      </Modal>
    </div>
  )
}

describe('Interactive UI components', () => {
  it('Modal traps focus, closes on Esc and overlay click, and returns focus to opener', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)

    const opener = screen.getByRole('button', { name: 'Open dialog' })
    opener.focus()
    await user.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Confirm action' })
    expect(dialog).toBeInTheDocument()

    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true)
    })

    // Tab cycles inside dialog
    const closeBtn = screen.getByRole('button', { name: 'Close modal' })
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    confirmBtn.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(closeBtn)

    // Shift+Tab from first loops to last
    closeBtn.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirmBtn)

    // Escape closes and restores focus
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(opener)

    // Overlay backdrop closes modal
    await user.click(opener)
    const backdrop = document.querySelector('button[aria-hidden="true"]')
    await user.click(backdrop)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Modal ignores Esc, close button, and backdrop while preventClose is true', async () => {
    const user = userEvent.setup()
    render(<ModalHarness preventClose />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const backdrop = document.querySelector('button[aria-hidden="true"]')
    await user.click(backdrop)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Dropdown toggles menu, supports ArrowDown/ArrowUp/Esc, outside click, and selects items', async () => {
    const user = userEvent.setup()
    const onOrders = vi.fn()
    const onSignOut = vi.fn()

    render(
      <div>
        <button type="button">Outside</button>
        <Dropdown
          items={[
            { label: 'My orders', onClick: onOrders },
            { divider: true },
            { label: 'Sign out', danger: true, onClick: onSignOut },
          ]}
          trigger={({ ref, onClick, ariaProps }) => (
            <button ref={ref} type="button" onClick={onClick} {...ariaProps}>
              Account menu
            </button>
          )}
        />
      </div>,
    )

    const trigger = screen.getByRole('button', { name: 'Account menu' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const items = screen.getAllByRole('menuitem')
    expect(items).toHaveLength(2)

    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0])
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
    fireEvent.keyDown(document, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)

    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'My orders' }))
    expect(onOrders).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Pagination hides at totalPages <= 1, disables edges, shows ellipses and Page X of Y', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    const { rerender, container } = render(
      <Pagination page={1} totalPages={1} onPageChange={onPageChange} />,
    )
    expect(container).toBeEmptyDOMElement()

    rerender(<Pagination page={1} totalPages={10} onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    expect(screen.getByText('Page 1 of 10')).toBeInTheDocument()
    expect(screen.getByText('...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    rerender(<Pagination page={10} totalPages={10} onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByText('Page 10 of 10')).toBeInTheDocument()
  })

  it('QuantityStepper enforces min/max, handles typing/blur clamping and invalid text', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <QuantityStepper value={2} min={1} max={5} onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'Decrease quantity' }))
    expect(onChange).toHaveBeenCalledWith(1)
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }))
    expect(onChange).toHaveBeenCalledWith(3)

    const input = screen.getByRole('textbox', { name: 'Quantity' })
    await user.clear(input)
    await user.type(input, '99')
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(5)
    expect(input).toHaveValue('5')

    rerender(<QuantityStepper value={5} min={1} max={5} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    await user.clear(input)
    await user.type(input, 'abc{Enter}')
    expect(onChange).toHaveBeenCalledWith(1)
  })
})
