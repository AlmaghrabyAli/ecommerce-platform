import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button.jsx'

export function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-6xl font-bold text-primary-dark tabular-nums">404</p>
      <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-navy">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button variant="primary" size="lg">
          Go to home
        </Button>
      </Link>
    </div>
  )
}
