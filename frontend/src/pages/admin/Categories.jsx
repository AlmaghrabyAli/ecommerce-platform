import { useState } from 'react'
import { FolderTree, Plus } from 'lucide-react'
import {
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from '../../hooks/useAdmin.js'
import { useCategories } from '../../hooks/useCategories.js'
import { parseApiError } from '../../utils/errors.js'
import { CategoryModal } from '../../components/admin/CategoryModal.jsx'
import { Alert } from '../../components/ui/Alert.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { TableSkeleton } from '../../components/ui/Skeleton.jsx'

export function AdminCategories() {
  const categoriesQuery = useCategories()
  const createCategory = useCreateAdminCategory()
  const updateCategory = useUpdateAdminCategory()
  const deleteCategory = useDeleteAdminCategory()

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  function openAdd() {
    setEditingCategory(null)
    setFormModalOpen(true)
  }

  function openEdit(cat) {
    setEditingCategory(cat)
    setFormModalOpen(true)
  }

  function openDelete(cat) {
    setDeleteError('')
    setDeleteTarget(cat)
  }

  async function handleFormSubmit(values) {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, ...values })
    } else {
      await createCategory.mutateAsync(values)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteError('')
    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(parseApiError(err).message)
    }
  }

  const categories = categoriesQuery.data || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-bold text-navy">Categories</h1>
        <Button type="button" variant="primary" size="md" onClick={openAdd}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add category</span>
          </span>
        </Button>
      </div>

      {categoriesQuery.isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : categoriesQuery.isError ? (
        <ErrorState
          message={parseApiError(categoriesQuery.error).message}
          onRetry={() => categoriesQuery.refetch()}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories found"
          hint="Create your first category to organize products."
          actionLabel="Add category"
          onAction={openAdd}
        />
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-[12px] border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="h-11 border-b border-border bg-bg text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4">Name</th>
                    <th className="px-4">Slug</th>
                    <th className="px-4">Description</th>
                    <th className="px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="h-16 hover:bg-bg/60">
                      <td className="px-4 font-semibold text-navy whitespace-nowrap">{cat.name}</td>
                      <td className="px-4 font-mono text-xs text-muted whitespace-nowrap">
                        {cat.slug}
                      </td>
                      <td className="px-4 text-ink max-w-md truncate">
                        {cat.description || '—'}
                      </td>
                      <td className="px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(cat)}
                            className="text-sm font-semibold text-primary-dark hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDelete(cat)}
                            className="text-sm font-semibold text-danger hover:underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {categories.map((cat) => (
              <article
                key={cat.id}
                className="rounded-[12px] border border-border bg-surface p-4 space-y-2.5"
              >
                <div>
                  <p className="font-semibold text-navy">{cat.name}</p>
                  <p className="font-mono text-xs text-muted">{cat.slug}</p>
                </div>
                {cat.description ? <p className="text-sm text-ink">{cat.description}</p> : null}
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(cat)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => openDelete(cat)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <CategoryModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        category={editingCategory}
        onSubmitCategory={handleFormSubmit}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete category?"
        preventClose={deleteCategory.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={deleteCategory.isPending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive-solid"
              loading={deleteCategory.isPending}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {deleteError ? <Alert variant="error" message={deleteError} /> : null}
          <p className="text-sm text-ink">
            Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>?
          </p>
        </div>
      </Modal>
    </div>
  )
}
