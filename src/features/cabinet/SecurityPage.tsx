import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Laptop, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { accountApi } from '@/api/endpoints/account'
import { authApi } from '@/api/endpoints/auth'
import { ApiError } from '@/api/errors'
import { ConfirmDialog } from '@/components/data/ConfirmDialog'
import { LoadingState } from '@/components/data/LoadingState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast-store'
import { relativeDay } from '@/lib/utils'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Введіть поточний пароль'),
    newPassword: z.string().min(8, 'Має містити принаймні 8 символів'),
    confirmPassword: z.string().min(1, 'Підтвердіть новий пароль'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'Паролі не збігаються', path: ['confirmPassword'] })
type PasswordValues = z.infer<typeof passwordSchema>

export default function SecurityPage() {
  const queryClient = useQueryClient()
  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ['account', 'profile'], queryFn: accountApi.getProfile })
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({ queryKey: ['account', 'sessions'], queryFn: accountApi.getSessions })

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [enableOpen, setEnableOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [revokeAllOpen, setRevokeAllOpen] = useState(false)

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordValues) => accountApi.changePassword(values),
    onSuccess: () => {
      toast({ title: 'Пароль оновлено', variant: 'success' })
      setPasswordOpen(false)
      passwordForm.reset()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const fe of error.fieldErrors) passwordForm.setError(fe.field as keyof PasswordValues, { message: fe.message })
        return
      }
      toast({ title: 'Не вдалося оновити пароль', variant: 'destructive' })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => accountApi.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] })
      toast({ title: 'Сеанс завершено', variant: 'success' })
    },
    onError: (error) => toast({ title: 'Не вдалося завершити сеанс', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  const revokeAllMutation = useMutation({
    mutationFn: () => accountApi.revokeOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] })
      toast({ title: 'Усі інші сеанси завершено', variant: 'success' })
    },
  })

  if (profileLoading || !profile) return <LoadingState label="Завантаження налаштувань безпеки…" />

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Пароль</CardTitle>
          <CardDescription>Оберіть надійний пароль, який ви не використовуєте деінде.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>
            Змінити пароль
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Двофакторна автентифікація</CardTitle>
            <CardDescription>Код із застосунку автентифікації (TOTP) при кожному вході.</CardDescription>
          </div>
          <Badge variant={profile.twoFactorEnabled ? 'success' : 'secondary'}>{profile.twoFactorEnabled ? 'Увімкнено' : 'Вимкнено'}</Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {profile.twoFactorEnabled ? (
            <Button variant="destructive" onClick={() => setDisableOpen(true)}>
              <ShieldOff className="size-4" /> Вимкнути 2FA
            </Button>
          ) : (
            <Button onClick={() => setEnableOpen(true)}>
              <ShieldCheck className="size-4" /> Увімкнути 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Активні сеанси</CardTitle>
            <CardDescription>Пристрої, з яких зараз виконано вхід у ваш акаунт.</CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => setRevokeAllOpen(true)}>
              Вийти з усіх інших сеансів
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {sessionsLoading ? (
            <LoadingState label="Завантаження сеансів…" />
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  {session.browser.toLowerCase().includes('chrome') || session.browser.toLowerCase().includes('firefox') ? (
                    <Laptop className="size-4 text-muted-foreground" />
                  ) : (
                    <Smartphone className="size-4 text-muted-foreground" />
                  )}
                  <div className="text-sm">
                    <p className="font-medium">
                      {session.browser} — {session.os}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {relativeDay(session.lastActiveAt)}
                      {session.location ? ` · ${session.location}` : ''}
                    </p>
                  </div>
                </div>
                {session.isCurrent ? (
                  <Badge variant="outline">Поточний сеанс</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => revokeMutation.mutate(session.id)}>
                    Вийти
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Змінити пароль</DialogTitle>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))} className="space-y-4">
              <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                <FormItem><FormLabel>Поточний пароль</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem><FormLabel>Новий пароль</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem><FormLabel>Підтвердіть новий пароль</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>Скасувати</Button>
                <Button type="submit" disabled={passwordMutation.isPending}>{passwordMutation.isPending ? 'Оновлення…' : 'Оновити пароль'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <EnableTwoFactorDialog
        open={enableOpen}
        onOpenChange={setEnableOpen}
        onEnabled={() => queryClient.invalidateQueries({ queryKey: ['account', 'profile'] })}
      />

      <DisableTwoFactorDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onDisabled={() => queryClient.invalidateQueries({ queryKey: ['account', 'profile'] })}
      />

      <ConfirmDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        title="Вийти з усіх інших сеансів?"
        description="Ви залишитеся в системі на цьому пристрої, але всім іншим пристроям потрібно буде увійти знову."
        confirmLabel="Вийти з інших"
        onConfirm={() => revokeAllMutation.mutateAsync()}
      />
    </div>
  )
}

function EnableTwoFactorDialog({
  open,
  onOpenChange,
  onEnabled,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onEnabled: () => void
}) {
  const [setup, setSetup] = useState<{ secret: string; provisioningUri: string; qrDataUrl: string } | null>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    const res = await authApi.setupTwoFactor()
    const qrDataUrl = await QRCode.toDataURL(res.provisioningUri, { margin: 1, width: 200 })
    setSetup({ ...res, qrDataUrl })
  }

  async function confirm() {
    setSubmitting(true)
    setError(null)
    try {
      await authApi.confirmTwoFactor(code)
      onOpenChange(false)
      onEnabled()
      setSetup(null)
      setCode('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Цей код невірний.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setSetup(null)
      setCode('')
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o && !setup) start()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Налаштування автентифікатора</DialogTitle>
          <DialogDescription>Відскануйте цей QR-код у застосунку автентифікації, а потім введіть 6-значний код.</DialogDescription>
        </DialogHeader>
        {setup ? (
          <div className="space-y-4">
            <img src={setup.qrDataUrl} alt="QR-код 2FA" className="mx-auto size-40 rounded-md border border-border" />
            <p className="text-center text-xs text-muted-foreground">
              Або введіть цей ключ вручну: <span className="font-mono">{setup.secret}</span>
            </p>
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-lg tracking-[0.4em]"
            />
          </div>
        ) : (
          <LoadingState label="Підготовка налаштувань…" />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button disabled={code.length !== 6 || submitting} onClick={confirm}>
            <Check className="size-4" /> {submitting ? 'Перевірка…' : 'Увімкнути'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DisableTwoFactorDialog({ open, onOpenChange, onDisabled }: { open: boolean; onOpenChange: (o: boolean) => void; onDisabled: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => authApi.disableTwoFactor(code),
    onSuccess: () => {
      onDisabled()
      toast({ title: 'Двофакторну автентифікацію вимкнено' })
      onOpenChange(false)
      setCode('')
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Не вдалося вимкнути 2FA.'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Вимкнути двофакторну автентифікацію</DialogTitle>
          <DialogDescription>Введіть поточний код із застосунку автентифікації, щоб підтвердити вимкнення 2FA.</DialogDescription>
        </DialogHeader>
        <Input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="text-center text-lg tracking-[0.4em]"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button variant="destructive" disabled={code.length !== 6 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Вимкнення…' : 'Вимкнути 2FA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
