import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'

export function Forbidden() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-tint text-danger">
        <ShieldAlert className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-navy">
        You don&apos;t have access to this page
      </h1>
      <p className="mt-2 text-sm text-muted">
        This area is restricted to store administrators.
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button variant="primary" size="lg">
          Go to home
        </Button>
      </Link>
    </div>
  )
}
