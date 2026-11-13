import { useNavigate, useParams } from 'react-router-dom'
import {
  useAdminProductById,
  useCreateAdminProduct,
  useUpdateAdminProduct,
} from '../../hooks/useAdmin.js'
import { useCategories } from '../../hooks/useCategories.js'
import { parseApiError } from '../../utils/errors.js'
import { ProductForm } from '../../components/admin/ProductForm.jsx'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'

export function ProductEdit() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const categoriesQuery = useCategories()
  const productQuery = useAdminProductById(id)
  const createProduct = useCreateAdminProduct()
  const updateProduct = useUpdateAdminProduct()

  if (categoriesQuery.isLoading || (isEdit && productQuery.isLoading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-[460px] w-full rounded-[12px]" />
      </div>
    )
  }

  if (categoriesQuery.isError) {
    return (
      <ErrorState
        message={parseApiError(categoriesQuery.error).message}
        onRetry={() => categoriesQuery.refetch()}
      />
    )
  }

  if (isEdit && productQuery.isError) {
    const parsed = parseApiError(productQuery.error)
    if (parsed.status === 404) {
      return (
        <ErrorState
          title="Product not found"
          message="This product could not be found."
          actionLabel="Back to products"
          actionTo="/admin/products"
        />
      )
    }
    return <ErrorState message={parsed.message} onRetry={() => productQuery.refetch()} />
  }

  const product = isEdit ? productQuery.data : null

  async function handleSubmit(payload) {
    if (isEdit) {
      await updateProduct.mutateAsync({ id: Number(id), ...payload })
      navigate('/admin/products')
    } else {
      const created = await createProduct.mutateAsync(payload)
      navigate(`/admin/products/${created.id}/edit`, { replace: true })
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: 'Products', to: '/admin/products' },
            { label: isEdit ? 'Edit product' : 'Add product' },
          ]}
        />
        <h1 className="text-[28px] font-bold text-navy">
          {isEdit ? 'Edit product' : 'Add product'}
        </h1>
      </div>

      <ProductForm
        initialProduct={product}
        categories={categoriesQuery.data || []}
        onSubmitProduct={handleSubmit}
        onCancel={() => navigate('/admin/products')}
        onReload={() => productQuery.refetch()}
        isSubmitting={createProduct.isPending || updateProduct.isPending}
      />
    </div>
  )
}
