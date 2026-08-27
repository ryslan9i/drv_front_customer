import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { accountApi } from '@/api/endpoints/account'
import { LoadingState } from '@/components/data/LoadingState'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast-store'
import { ROLE_LABELS } from '@/lib/roles'
import { formatDate, formatDateTime, initials } from '@/lib/utils'

const schema = z.object({
  firstName: z.string().min(1, "Введіть ім'я"),
  lastName: z.string().min(1, 'Введіть прізвище'),
  email: z.string().email('Введіть дійсну електронну адресу'),
  phone: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { data: profile, isLoading } = useQuery({ queryKey: ['account', 'profile'], queryFn: accountApi.getProfile })
  const [editOpen, setEditOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: profile })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => accountApi.updateProfile(values),
    onSuccess: (updated) => {
      queryClient.setQueryData(['account', 'profile'], updated)
      toast({ title: 'Профіль оновлено', variant: 'success' })
      setEditOpen(false)
    },
    onError: () => toast({ title: 'Не вдалося оновити профіль', variant: 'destructive' }),
  })

  const avatarMutation = useMutation({
    mutationFn: (dataUrl: string) => accountApi.updateAvatar(dataUrl),
    onSuccess: ({ avatarUrl }) => {
      queryClient.setQueryData(['account', 'profile'], (prev: typeof profile) => (prev ? { ...prev, avatarUrl } : prev))
      toast({ title: 'Аватар оновлено', variant: 'success' })
    },
  })

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => avatarMutation.mutate(reader.result as string)
    reader.readAsDataURL(file)
  }

  if (isLoading || !profile) return <LoadingState label="Завантаження профілю…" />

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="relative">
            <Avatar className="size-20">
              <AvatarImage src={profile.avatarUrl} alt="" />
              <AvatarFallback className="text-xl">{initials(profile.firstName, profile.lastName)}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm"
            >
              <Camera className="size-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
          <Badge variant="outline">{ROLE_LABELS[profile.role]}</Badge>
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => { form.reset(profile); setEditOpen(true) }}>
            <Pencil className="size-3.5" /> Редагувати профіль
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Деталі акаунта</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Ім'я користувача" value={`@${profile.username}`} />
          <Field label="Роль" value={ROLE_LABELS[profile.role]} />
          <Field label="Ім'я" value={profile.firstName} />
          <Field label="Прізвище" value={profile.lastName} />
          <Field label="Електронна пошта" value={profile.email} />
          <Field label="Телефон" value={profile.phone || '—'} />
          <Field label="Школа" value={profile.schoolName} />
          <Field label="Організація" value={profile.organization} />
          <Field
            label="Статус акаунта"
            value={<Badge variant={profile.status === 'active' ? 'success' : 'secondary'}>{profile.status === 'active' ? 'Активний' : 'Неактивний'}</Badge>}
          />
          <Field label="Створено" value={formatDate(profile.createdAt)} />
          <Field label="Останній вхід" value={profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '—'} />
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редагувати профіль</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>Ім'я</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Прізвище</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Електронна пошта</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Телефон</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Скасувати</Button>
                <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Збереження…' : 'Зберегти зміни'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  )
}
