import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <p className="text-muted-foreground">Цієї сторінки не існує.</p>
      <Button asChild>
        <Link to="/dashboard">На дашборд</Link>
      </Button>
    </div>
  )
}
