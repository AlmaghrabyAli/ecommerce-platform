import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext.jsx'
import { parseApiError } from '../../utils/errors.js'
import { Alert } from '../../components/ui/Alert.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'

export function Login() {
  const { isAuthenticated, isAdmin, login } = useAuth()
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
      const authData = await login({
        email: values.email.trim(),
        password: values.password,
      })
      const target = from || (authData.user?.role === 'Admin' ? '/admin' : '/')
      navigate(target, { replace: true })
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
        <h1 className="text-2xl font-bold text-navy">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Welcome back to Bazaaro</p>
      </div>

      {bannerError ? <Alert variant="error" message={bannerError} /> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required.',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address.',
            },
          })}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required.',
          })}
        />

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        New to Bazaaro?{' '}
        <Link
          to="/register"
          state={from ? { from } : undefined}
          className="font-semibold text-primary-dark hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}
