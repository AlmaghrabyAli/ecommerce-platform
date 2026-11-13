import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { parseApiError } from '../../utils/errors.js'
import { Alert } from '../ui/Alert.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Modal } from '../ui/Modal.jsx'
import { Textarea } from '../ui/Textarea.jsx'

export function CategoryModal({
  open,
  onClose,
  category = null,
  onSubmitCategory,
  isSubmitting = false,
}) {
  const isEdit = Boolean(category)
  const [bannerError, setBannerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
    },
  })

  useEffect(() => {
    if (open) {
      setBannerError('')
      reset({
        name: category?.name || '',
        description: category?.description || '',
      })
    }
  }, [open, category, reset])

  async function onSubmit(values) {
    setBannerError('')
    try {
      await onSubmitCategory({
        name: values.name.trim(),
        description: values.description.trim() || null,
      })
      onClose()
    } catch (err) {
      const parsed = parseApiError(err)
      if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
        Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: msg })
        })
      } else {
        setBannerError(parsed.message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit category' : 'Add category'}
      preventClose={isSubmitting}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="category-modal-form"
            variant="primary"
            loading={isSubmitting}
          >
            Save
          </Button>
        </>
      }
    >
      <form id="category-modal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {bannerError ? <Alert variant="error" message={bannerError} /> : null}

        <Input
          label="Category name"
          error={errors.name?.message}
          {...register('name', {
            required: 'Category name is required.',
            validate: (v) => {
              const len = v.trim().length
              if (len < 2 || len > 100) return 'Name must be between 2 and 100 characters.'
              return true
            },
          })}
        />

        <Textarea
          label="Description"
          optional
          rows={3}
          error={errors.description?.message}
          {...register('description', {
            maxLength: {
              value: 500,
              message: 'Description must be 500 characters or less.',
            },
          })}
        />
      </form>
    </Modal>
  )
}
