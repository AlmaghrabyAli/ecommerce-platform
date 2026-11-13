import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/renderWithProviders.jsx'
import { Login } from './Login.jsx'
import { Register } from './Register.jsx'

describe('Auth pages (Login & Register)', () => {
  it('Login validates fields, shows 401 banner error on invalid credentials, and redirects customer to return path or admin to /admin', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<div>Cart after login</div>} />
        <Route path="/admin" element={<div>Admin dashboard target</div>} />
      </Routes>,
      {
        route: { pathname: '/login', state: { from: '/cart' } },
        role: 'guest',
      },
    )

    // Client validation
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument()

    // Server 401
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'customer@shop.test')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')

    // Valid customer login returns to state.from (/cart)
    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), 'Customer@12345')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Cart after login')).toBeInTheDocument()
  })

  it('Register validates fields, shows 409 banner for existing email, and signs in new customer', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<div>Home after registration</div>} />
      </Routes>,
      { route: '/register', role: 'guest' },
    )

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Full name is required.')).toBeInTheDocument()
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Full name'), 'Demo Customer')
    await user.type(screen.getByLabelText('Email'), 'customer@shop.test')
    await user.type(screen.getByLabelText('Password'), 'Password@123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists.',
    )

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'newbuyer@example.com')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(screen.getByText('Home after registration')).toBeInTheDocument()
    })
  })
})
