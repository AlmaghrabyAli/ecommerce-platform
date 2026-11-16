import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AlertCircle, ImagePlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUploadProductImage } from '../../hooks/useAdmin.js'
import { parseApiError } from '../../utils/errors.js'
import { ProductImage } from '../product/ProductImage.jsx'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { Textarea } from '../ui/Textarea.jsx'
import { Toggle } from '../ui/Toggle.jsx'

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      return reject(new Error('FileReader not available'))
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function shrinkImageIfNeeded(file) {
  if (!file || file.size <= 500 * 1024) {
    return file
  }

  if (typeof document === 'undefined') {
    return file
  }

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext ? canvas.getContext('2d') : null
    if (!ctx) return file

    const img = await fileToImage(file)
    const maxDim = 800
    const originalWidth = img.width || maxDim
    const originalHeight = img.height || maxDim
    const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight))
    const width = Math.max(1, Math.round(originalWidth * scale))
    const height = Math.max(1, Math.round(originalHeight * scale))

    canvas.width = width
    canvas.height = height

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    if (typeof canvas.toBlob !== 'function') return file

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    if (!blob) return file

    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    return file
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
  const [imageError, setImageError] = useState(null)
  const fileInputRef = useRef(null)

  const uploadImageMutation = useUploadProductImage()
  const isUploadingImage = uploadImageMutation.isPending

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
    setImageError(null)
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

    setImageError(null)

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setImageError('Please choose a JPEG, PNG or WebP image.')
      return
    }

    let processedFile = file
    try {
      processedFile = await shrinkImageIfNeeded(file)
    } catch {
      processedFile = file
    }

    if (processedFile.size > 2 * 1024 * 1024) {
      setImageError('Image must be 2 MB or smaller.')
      return
    }

    try {
      const result = await uploadImageMutation.mutateAsync(processedFile)
      setValue('imageUrl', result.url, { shouldDirty: true, shouldValidate: true })
      setImageError(null)
      toast.success('Image uploaded')
    } catch (err) {
      const parsed = parseApiError(err)
      if (parsed.status !== 401 && parsed.status !== 403) {
        setImageError(parsed.message)
      }
    }
  }

  function handleClearImage() {
    setValue('imageUrl', '', { shouldDirty: true, shouldValidate: true })
    setImageError(null)
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

        {/* Product image upload section */}
        <div className="md:col-span-2 space-y-2">
          <input type="hidden" {...register('imageUrl')} />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">
              Product image <span className="font-normal text-muted">(optional)</span>
            </span>
          </div>

          <div className="sr-only" aria-live="polite">
            {isUploadingImage ? 'Uploading image…' : ''}
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="relative h-40 w-40 max-w-full rounded-[12px] border border-border bg-[#F5F5F4] overflow-hidden shrink-0 flex items-center justify-center">
              <ProductImage
                src={imageUrlValue}
                alt={nameValue || 'Product preview'}
                className="h-full w-full object-cover"
                iconClassName="h-10 w-10 text-muted"
              />
              {isUploadingImage ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Spinner className="h-8 w-8 text-white" />
                </div>
              ) : null}
            </div>

            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFileChange}
                className="sr-only"
                aria-label="Upload product image file"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isSubmitting || isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  <span>{imageUrlValue ? 'Change image' : 'Upload image'}</span>
                </Button>
                {imageUrlValue ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    disabled={isSubmitting || isUploadingImage}
                    onClick={handleClearImage}
                    className="text-danger hover:bg-danger-tint/40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Remove</span>
                  </Button>
                ) : null}
              </div>

              <p className="text-sm text-muted">JPEG, PNG or WebP, up to 2 MB</p>

              {imageError ? (
                <div role="alert" className="flex items-center gap-1.5 text-sm text-danger mt-1">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{imageError}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting || isUploadingImage}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting || isUploadingImage}
        >
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  )
}
