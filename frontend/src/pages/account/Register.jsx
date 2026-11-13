import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext.jsx'
import { parseApiError } from '../../utils/errors.js'
import { Alert } from '../../components/ui/Alert.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'

export function Register() {
  const { isAuthenticated, isAdmin, register: registerAccount } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [bannerError, setBannerError] = useState('')

  const from = location.state?.from

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  })

  if (isAuthenticated) {
    return <Navigate to={from || (isAdmin ? '/admin' : '/')} replace />
  }

  async function onSubmit(values) {
    setBannerError('')
    try {
      await registerAccount({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      navigate(from || '/', { replace: true })
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Start shopping on Bazaaro</p>
      </div>

      {bannerError ? <Alert variant="error" message={bannerError} /> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Sara Ali"
          error={errors.fullName?.message}
          {...register('fullName', {
            required: 'Full name is required.',
            validate: (v) => {
              const len = v.trim().length
              if (len < 2 || len > 100) {
                return 'Full name must be between 2 and 100 characters.'
              }
              return true
            },
          })}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required.',
            maxLength: {
              value: 256,
              message: 'Email must be 256 characters or less.',
            },
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address.',
            },
          })}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          helperText="At least 8 characters"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required.',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters.',
            },
            maxLength: {
              value: 100,
              message: 'Password must be 100 characters or less.',
            },
          })}
        />

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link
          to="/login"
          state={from ? { from } : undefined}
          className="font-semibold text-primary-dark hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
