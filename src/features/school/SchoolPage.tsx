import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { schoolApi } from '@/api/endpoints/school'
import { ApiError } from '@/api/errors'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/data/LoadingState'
import { toast } from '@/components/ui/toast-store'
import { useSchool } from '@/lib/useSchool'

const schema = z.object({
  name: z.string().min(1, 'Введіть назву школи'),
  workingDays: z.coerce.number().int().min(1, 'Мінімум 1').max(7, 'Максимум 7'),
  periodsPerDay: z.coerce.number().int().min(1, 'Мінімум 1').max(20, 'Максимум 20'),
})
type SchoolValues = z.infer<typeof schema>

export default function SchoolPage() {
  const queryClient = useQueryClient()
  const { school, isLoading } = useSchool()

  const form = useForm<SchoolValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', workingDays: 5, periodsPerDay: 8 },
  })

  const mutation = useMutation({
    mutationFn: (values: SchoolValues) => schoolApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      toast({ title: 'Школу створено', variant: 'success' })
    },
    onError: (error) => toast({ title: 'Не вдалося створити школу', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  if (isLoading) return <LoadingState label="Завантаження школи…" />

  if (!school) {
    return (
      <div>
        <PageHeader title="Школа" description="Спочатку створіть школу — з неї починається все налаштування." />
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Створити школу</CardTitle>
            <CardDescription>Кількість робочих днів і уроків на день визначають сітку розкладу.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Назва школи</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="workingDays" render={({ field }) => (
                    <FormItem><FormLabel>Робочих днів на тиждень</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="periodsPerDay" render={({ field }) => (
                    <FormItem><FormLabel>Уроків на день</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Створення…' : 'Створити школу'}</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Школа" description="Профіль школи та структура розкладу." />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{school.name}</CardTitle>
          <CardDescription>Ці значення визначають сітку, на основі якої генератор будує розклад.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Робочих днів на тиждень</p>
            <p className="mt-1 font-display text-lg font-semibold">{school.workingDays}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Уроків на день</p>
            <p className="mt-1 font-display text-lg font-semibold">{school.periodsPerDay}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
