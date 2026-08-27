import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Clock } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuthStore } from '@/auth/store'
import { accountApi } from '@/api/endpoints/account'
import { authApi } from '@/api/endpoints/auth'
import { setAccessToken } from '@/api/client'
import { ApiError } from '@/api/errors'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCountdown } from '@/lib/useCountdown'
import { AuthLayout } from './AuthLayout'

const loginSchema = z.object({
  username: z.string().min(1, "Введіть ім'я користувача"),
  password: z.string().min(1, 'Введіть пароль'),
})
type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const beginAuthenticating = useAuthStore((s) => s.beginAuthenticating)
  const requireTwoFactor = useAuthStore((s) => s.requireTwoFactor)
  const completeAuthentication = useAuthStore((s) => s.completeAuthentication)
  const rateLimit = useCountdown()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const reason = searchParams.get('reason')
  const formError = form.formState.errors.root?.message

  useEffect(() => {
    if (reason === 'session-expired') {
      form.setError('root', { message: 'Термін дії вашої сесії минув. Будь ласка, увійдіть знову.' })
    }
  }, [reason, form])

  async function onSubmit(values: LoginValues) {
    form.clearErrors('root')
    beginAuthenticating()
    try {
      const res = await authApi.login(values)
      if (res.requiresTwoFactor) {
        requireTwoFactor(res.challengeId)
        navigate(`/verify-2fa${window.location.search}`)
        return
      }
      setAccessToken(res.tokens.accessToken) // needed before getProfile() can authenticate
      const user = await accountApi.getProfile()
      completeAuthentication({ user, accessToken: res.tokens.accessToken, refreshToken: res.tokens.refreshToken })
      const redirect = searchParams.get('redirect')
      navigate(redirect ?? '/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.isRateLimit) {
        rateLimit.start(error.retryAfterSeconds ?? 30)
        form.setError('root', { message: 'Забагато спроб. Зачекайте, перш ніж спробувати знову.' })
        return
      }
      if (error instanceof ApiError) {
        // The API returns one 401 for every failure (unknown user, wrong password,
        // blocked, deleted) on purpose — a differentiated message would leak which
        // accounts exist, so we never branch copy on the response here.
        form.setError('root', { message: "Невірне ім'я користувача або пароль." })
        return
      }
      form.setError('root', { message: 'Щось пішло не так. Спробуйте ще раз.' })
    }
  }

  return (
    <AuthLayout title="Вхід" description="Отримайте доступ до робочого простору вашої школи">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {formError && (
            <Alert variant={rateLimit.isActive ? 'warning' : 'destructive'}>
              {rateLimit.isActive ? <Clock className="mt-0.5" /> : <AlertTriangle className="mt-0.5" />}
              <div>
                <AlertTitle>{rateLimit.isActive ? 'Перевищено ліміт спроб' : 'Помилка входу'}</AlertTitle>
                <AlertDescription>
                  {formError}
                  {rateLimit.isActive && <span className="block font-medium">Спробуйте ще раз через {rateLimit.secondsLeft} с.</span>}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ім'я користувача</FormLabel>
                <FormControl>
                  <Input autoComplete="username" placeholder="admin" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Пароль</FormLabel>
                  <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    Забули пароль?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || rateLimit.isActive}>
            {form.formState.isSubmitting ? 'Вхід…' : rateLimit.isActive ? `Спробуйте через ${rateLimit.secondsLeft} с` : 'Увійти'}
          </Button>
        </form>
      </Form>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Демо-дані для входу</p>
        <p className="mt-1">admin / Password123!</p>
        <p>Код підтвердження: 123456</p>
      </div>
    </AuthLayout>
  )
}
