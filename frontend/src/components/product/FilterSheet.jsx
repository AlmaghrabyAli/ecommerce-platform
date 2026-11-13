import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { FilterPanel } from './FilterSidebar.jsx'

export function FilterSheet({ open, onClose, onClearAll, ...filterProps }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => {
              onClearAll()
              onClose()
            }}
          >
            Clear
          </Button>
          <Button type="button" variant="primary" fullWidth onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <FilterPanel
        {...filterProps}
        idPrefix="sheet"
        onClearAll={onClearAll}
        onCloseMobile={onClose}
      />
    </Modal>
  )
}
