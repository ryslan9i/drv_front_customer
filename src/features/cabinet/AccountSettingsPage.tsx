import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountApi } from '@/api/endpoints/account'
import { LoadingState } from '@/components/data/LoadingState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast-store'
import { applyTheme } from '@/lib/theme'
import type { AccountLanguage, AccountSettings, AccountTheme } from '@/types/domain'

const LANGUAGES: { value: AccountLanguage; label: string }[] = [
  { value: 'uk', label: 'Українська' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
]

const TIME_ZONES = ['Europe/Kyiv', 'America/Chicago', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'UTC']

const THEMES: { value: AccountTheme; label: string }[] = [
  { value: 'light', label: 'Світла' },
  { value: 'dark', label: 'Темна' },
  { value: 'system', label: 'Системна' },
]

const NOTIFICATION_ITEMS: { key: keyof AccountSettings['notifications']; label: string; description: string }[] = [
  { key: 'email', label: 'Сповіщення поштою', description: 'Отримувати листи про акаунт і безпеку.' },
  { key: 'scheduleGenerated', label: 'Розклад згенеровано', description: 'Сповіщати про завершення генерації нового розкладу.' },
  { key: 'conflicts', label: 'Виявлено конфлікти', description: 'Сповіщати про нові конфлікти в розкладі.' },
  { key: 'productUpdates', label: 'Оновлення продукту', description: 'Періодичні новини про нові функції.' },
]

export default function AccountSettingsPage() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({ queryKey: ['account', 'settings'], queryFn: accountApi.getSettings })

  const mutation = useMutation({
    mutationFn: (partial: Partial<AccountSettings>) => accountApi.updateSettings(partial),
    onMutate: async (partial) => {
      await queryClient.cancelQueries({ queryKey: ['account', 'settings'] })
      const previous = queryClient.getQueryData<AccountSettings>(['account', 'settings'])
      if (previous) {
        const next = { ...previous, ...partial, notifications: { ...previous.notifications, ...partial.notifications } }
        queryClient.setQueryData(['account', 'settings'], next)
        if (partial.theme) applyTheme(partial.theme)
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['account', 'settings'], context.previous)
      toast({ title: 'Не вдалося зберегти налаштування', variant: 'destructive' })
    },
    onSuccess: () => toast({ title: 'Налаштування збережено', variant: 'success' }),
  })

  if (isLoading || !settings) return <LoadingState label="Завантаження налаштувань…" />

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Уподобання</CardTitle>
          <CardDescription>Мова, часовий пояс та вигляд.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-sm font-medium">Мова</p>
            <Select value={settings.language} onValueChange={(v) => mutation.mutate({ language: v as AccountLanguage })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Часовий пояс</p>
            <Select value={settings.timeZone} onValueChange={(v) => mutation.mutate({ timeZone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIME_ZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Тема</p>
            <Select value={settings.theme} onValueChange={(v) => mutation.mutate({ theme: v as AccountTheme })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{THEMES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сповіщення</CardTitle>
          <CardDescription>Оберіть, про що ви хочете отримувати сповіщення.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {NOTIFICATION_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={settings.notifications[item.key]}
                onCheckedChange={(checked) => mutation.mutate({ notifications: { ...settings.notifications, [item.key]: checked } })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
