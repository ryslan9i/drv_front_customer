import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { classesApi } from '@/api/endpoints/classes'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { type WorkloadInput, workloadApi } from '@/api/endpoints/workload'
import { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast-store'

const schema = z.object({
  classId: z.string().min(1, 'Оберіть клас'),
  subjectId: z.string().min(1, 'Оберіть предмет'),
  teacherId: z.string().min(1, 'Оберіть вчителя'),
  lessonsPerWeek: z.coerce.number().min(0.5).max(40),
})
type FormValues = z.infer<typeof schema>

export function WorkloadFormSheet({ open, onOpenChange, schoolId }: { open: boolean; onOpenChange: (o: boolean) => void; schoolId: string }) {
  const queryClient = useQueryClient()
  const { data: classes = [] } = useQuery({ queryKey: ['classes', schoolId], queryFn: () => classesApi.list(schoolId) })
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', schoolId], queryFn: () => subjectsApi.list(schoolId) })
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => teachersApi.list(schoolId) })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { classId: '', subjectId: '', teacherId: '', lessonsPerWeek: 2 },
  })

  useEffect(() => {
    if (open) form.reset({ classId: '', subjectId: '', teacherId: '', lessonsPerWeek: 2 })
  }, [open, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: WorkloadInput = { ...values, schoolId }
      return workloadApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload'] })
      toast({ title: 'Навантаження призначено', variant: 'success' })
      onOpenChange(false)
    },
    onError: (error) => toast({ title: 'Не вдалося зберегти навантаження', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Призначити навантаження</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-1 flex-col gap-4 py-2">
            <FormField control={form.control} name="classId" render={({ field }) => (
              <FormItem>
                <FormLabel>Клас</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Оберіть клас" /></SelectTrigger></FormControl>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="subjectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Предмет</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Оберіть предмет" /></SelectTrigger></FormControl>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="teacherId" render={({ field }) => (
              <FormItem>
                <FormLabel>Вчитель</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Оберіть вчителя" /></SelectTrigger></FormControl>
                  <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lessonsPerWeek" render={({ field }) => (
              <FormItem><FormLabel>Уроків на тиждень</FormLabel><FormControl><Input type="number" step="0.5" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Збереження…' : 'Зберегти'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
