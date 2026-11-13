import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ImagePlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseApiError } from '../../utils/errors.js'
import { ProductImage } from '../product/ProductImage.jsx'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'
import { Textarea } from '../ui/Textarea.jsx'
import { Toggle } from '../ui/Toggle.jsx'

async function createPreviewImageUrl(file) {
  const objectUrl = URL.createObjectURL(file)
  if (typeof document === 'undefined') return objectUrl

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = objectUrl
    })

    const maxDim = 800
    const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim))
    const width = Math.max(1, Math.round((img.width || maxDim) * scale))
    const height = Math.max(1, Math.round((img.height || maxDim) * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return objectUrl

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    if (!blob) return objectUrl

    URL.revokeObjectURL(objectUrl)
    return URL.createObjectURL(blob)
  } catch {
    return objectUrl
  }
}

export function ProductForm({
  initialProduct = null,
  categories = [],
  onSubmitProduct,
  onCancel,
  onReload,
  isSubmitting = false,
}) {
  const isEdit = Boolean(initialProduct)
  const [bannerError, setBannerError] = useState(null)
  const [processingImage, setProcessingImage] = useState(false)
  const fileInputRef = useRef(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: initialProduct?.name || '',
      description: initialProduct?.description || '',
      price: initialProduct?.price ?? '',
      stockQuantity: initialProduct?.stockQuantity ?? '',
      imageUrl: initialProduct?.imageUrl || '',
      categoryId: initialProduct?.categoryId ? String(initialProduct.categoryId) : '',
      isActive: initialProduct?.isActive ?? true,
    },
  })

  useEffect(() => {
    setBannerError(null)
    reset({
      name: initialProduct?.name || '',
      description: initialProduct?.description || '',
      price: initialProduct?.price ?? '',
      stockQuantity: initialProduct?.stockQuantity ?? '',
      imageUrl: initialProduct?.imageUrl || '',
      categoryId: initialProduct?.categoryId ? String(initialProduct.categoryId) : '',
      isActive: initialProduct?.isActive ?? true,
    })
  }, [initialProduct, reset])

  const imageUrlValue = watch('imageUrl')
  const nameValue = watch('name')

  async function handleImageFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.', { id: 'invalid-product-image' })
      return
    }

    setProcessingImage(true)
    try {
      const nextUrl = await createPreviewImageUrl(file)
      setValue('imageUrl', nextUrl, { shouldDirty: true, shouldValidate: true })
      toast.success('Product image added to preview', { id: 'product-image-added' })
    } catch {
      toast.error('Could not load the selected image.', { id: 'product-image-error' })
    } finally {
      setProcessingImage(false)
    }
  }

  function handleClearImage() {
    setValue('imageUrl', '', { shouldDirty: true, shouldValidate: true })
  }

  async function onSubmit(values) {
    setBannerError(null)
    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      price: Number(values.price),
      stockQuantity: Number(values.stockQuantity),
      imageUrl: values.imageUrl?.trim() || '',
      categoryId: Number(values.categoryId),
      isActive: Boolean(values.isActive),
      ...(isEdit ? { rowVersion: initialProduct.rowVersion } : {}),
    }

    try {
      await onSubmitProduct(payload)
    } catch (err) {
      const parsed = parseApiError(err)
      if (parsed.status === 409) {
        setBannerError({
          variant: 'warning',
          isConflict: true,
          message: parsed.message,
        })
        return
      }
      if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
        Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: msg })
        })
      } else {
        setBannerError({
          variant: 'error',
          isConflict: false,
          message: parsed.message,
        })
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-[12px] border border-border bg-surface p-6 space-y-6"
      noValidate
    >
      {bannerError ? (
        <Alert
          variant={bannerError.variant}
          message={bannerError.message}
          action={
            bannerError.isConflict && onReload ? (
              <Button type="button" variant="secondary" size="sm" onClick={onReload}>
                Reload
              </Button>
            ) : null
          }
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            label="Product name"
            error={errors.name?.message}
            {...register('name', {
              required: 'Product name is required.',
              validate: (v) => {
                const len = v.trim().length
                if (len < 2 || len > 200) return 'Name must be between 2 and 200 characters.'
                return true
              },
            })}
          />
          {isEdit && initialProduct?.slug ? (
            <p className="mt-1.5 text-xs text-muted">
              Slug: <span className="font-mono text-ink">{initialProduct.slug}</span>
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <Textarea
            label="Description"
            rows={4}
            error={errors.description?.message}
            {...register('description', {
              required: 'Description is required.',
              validate: (v) => {
                const len = v.trim().length
                if (len < 1) return 'Description is required.'
                if (len > 4000) return 'Description must be 4000 characters or less.'
                return true
              },
            })}
          />
        </div>

        <Input
          label="Price (EGP)"
          type="number"
          step="0.01"
          error={errors.price?.message}
          {...register('price', {
            required: 'Price is required.',
            validate: (v) => {
              const n = Number(v)
              if (Number.isNaN(n) || n < 0.01 || n > 1000000) {
                return 'Price must be between 0.01 and 1,000,000.'
              }
              return true
            },
          })}
        />

        <Input
          label="Stock quantity"
          type="number"
          step="1"
          error={errors.stockQuantity?.message}
          {...register('stockQuantity', {
            required: 'Stock quantity is required.',
            validate: (v) => {
              const n = Number(v)
              if (!Number.isInteger(n) || n < 0 || n > 1000000) {
                return 'Stock quantity must be a whole number from 0 to 1,000,000.'
              }
              return true
            },
          })}
        />

        <Select
          label="Category"
          error={errors.categoryId?.message}
          {...register('categoryId', {
            required: 'Please select a category.',
            validate: (v) => (Number(v) >= 1 ? true : 'Please select a category.'),
          })}
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>

        <div className="flex items-end pb-1">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Toggle
                label="Active"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 sm:items-start">
          <div className="flex-1 space-y-2">
            <Input
              label="Image URL"
              optional
              placeholder="Paste image URL or upload from Preview"
              helperText="Paste a direct image link or add an image from your device in the Preview."
              error={errors.imageUrl?.message}
              {...register('imageUrl', {
                maxLength: {
                  value: 500,
                  message: 'Image URL must be 500 characters or less.',
                },
              })}
            />
          </div>

          <div className="shrink-0 space-y-2">
            <p className="text-xs font-medium text-muted">Preview</p>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={imageUrlValue ? 'Change product image' : 'Add product image'}
                className="group relative h-24 w-24 overflow-hidden rounded-[8px] border border-border hover:border-primary transition-colors cursor-pointer"
              >
                <ProductImage
                  src={imageUrlValue}
                  alt={nameValue || 'Product preview'}
                  iconClassName="h-7 w-7"
                />
              </button>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="sr-only"
                  aria-label="Upload product image file"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={processingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  <span>{imageUrlValue ? 'Change image' : 'Add image'}</span>
                </Button>
                {imageUrlValue ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearImage}
                    className="text-danger hover:bg-danger-tint/40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Remove</span>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  )
}
