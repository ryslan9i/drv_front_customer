import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { authApi } from '@/api/endpoints/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AuthLayout } from './AuthLayout'

const schema = z.object({ username: z.string().min(1, "Введіть ім'я користувача") })

export default function ForgotPasswordPage() {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { username: '' } })
  const sent = form.formState.isSubmitSuccessful

  async function onSubmit(values: z.infer<typeof schema>) {
    await authApi.forgotPassword(values.username)
  }

  return (
    <AuthLayout title="Відновлення пароля" description="Ми надішлемо посилання для відновлення на пошту, прив'язану до цього акаунта.">
      {sent ? (
        <Alert variant="success">
          <CheckCircle2 className="mt-0.5" />
          <div>
            <AlertTitle>Перевірте вашу пошту</AlertTitle>
            <AlertDescription>Якщо такий акаунт існує, посилання для відновлення вже в дорозі.</AlertDescription>
          </div>
        </Alert>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Надсилання…' : 'Надіслати посилання'}
            </Button>
          </form>
        </Form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Повернутися до входу
        </Link>
      </p>
    </AuthLayout>
  )
}
