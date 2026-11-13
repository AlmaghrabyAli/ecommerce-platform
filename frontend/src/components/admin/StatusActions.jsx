import { useState } from 'react'
import { allowedNextStatuses } from '../../utils/orderStatus.js'
import { Button } from '../ui/Button.jsx'
import { Modal } from '../ui/Modal.jsx'

const ACTION_LABELS = {
  Confirmed: 'Confirm order',
  Shipped: 'Mark as shipped',
  Delivered: 'Mark as delivered',
}

export function StatusActions({ status, onUpdateStatus, isPending = false }) {
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [pendingTarget, setPendingTarget] = useState(null)

  const allowed = allowedNextStatuses(status)
  const forwardStatus = allowed.find((s) => s !== 'Cancelled')
  const canCancel = allowed.includes('Cancelled')

  async function handleStatusChange(nextStatus) {
    if (isPending) return
    setPendingTarget(nextStatus)
    try {
      await onUpdateStatus(nextStatus)
      if (nextStatus === 'Cancelled') {
        setConfirmCancelOpen(false)
      }
    } catch {
      if (nextStatus === 'Cancelled') {
        setConfirmCancelOpen(false)
      }
    } finally {
      setPendingTarget(null)
    }
  }

  return (
    <>
      <div className="rounded-[12px] border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-navy">Update status</h2>

        {allowed.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No further actions</p>
        ) : (
          <div className="mt-4 space-y-3">
            {forwardStatus ? (
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={isPending}
                loading={isPending && pendingTarget === forwardStatus}
                onClick={() => handleStatusChange(forwardStatus)}
              >
                {ACTION_LABELS[forwardStatus] || forwardStatus}
              </Button>
            ) : null}

            {canCancel ? (
              <div>
                <Button
                  type="button"
                  variant="destructive"
                  fullWidth
                  disabled={isPending}
                  onClick={() => setConfirmCancelOpen(true)}
                >
                  Cancel order
                </Button>
                <p className="mt-1.5 text-xs text-muted">
                  Cancelling returns the items to stock.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Modal
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        title="Cancel this order?"
        preventClose={isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => setConfirmCancelOpen(false)}
            >
              Keep order
            </Button>
            <Button
              type="button"
              variant="destructive-solid"
              loading={isPending && pendingTarget === 'Cancelled'}
              onClick={() => handleStatusChange('Cancelled')}
            >
              Cancel order
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Cancelling this order will return all ordered items back to product stock. This action
          cannot be undone.
        </p>
      </Modal>
    </>
  )
}
