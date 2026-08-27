import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { type TeacherInput, teachersApi } from '@/api/endpoints/teachers'
import { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast-store'
import type { Teacher } from '@/types/domain'

const schema = z.object({
  firstName: z.string().min(1, "Введіть ім'я"),
  lastName: z.string().min(1, 'Введіть прізвище'),
  maxLessonsPerDay: z.coerce.number().int().min(1).max(20),
  maxLessonsPerWeek: z.coerce.number().int().min(1).max(100),
})
type FormValues = z.infer<typeof schema>

interface TeacherFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId: string
  teacher?: Teacher
}

export function TeacherFormSheet({ open, onOpenChange, schoolId, teacher }: TeacherFormSheetProps) {
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', maxLessonsPerDay: 6, maxLessonsPerWeek: 24 },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      teacher
        ? { firstName: teacher.firstName, lastName: teacher.lastName, maxLessonsPerDay: teacher.maxLessonsPerDay, maxLessonsPerWeek: teacher.maxLessonsPerWeek }
        : { firstName: '', lastName: '', maxLessonsPerDay: 6, maxLessonsPerWeek: 24 },
    )
  }, [open, teacher, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: TeacherInput = { ...values, schoolId }
      return teacher ? teachersApi.update(teacher.id, values) : teachersApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast({ title: teacher ? 'Вчителя оновлено' : 'Вчителя додано', variant: 'success' })
      onOpenChange(false)
    },
    onError: (error) => {
      toast({ title: 'Не вдалося зберегти вчителя', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' })
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{teacher ? 'Редагувати вчителя' : 'Додати вчителя'}</SheetTitle>
          <SheetDescription>Предмети та класи призначаються окремо на сторінці «Навантаження».</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-1 flex-col gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem><FormLabel>Ім'я</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem><FormLabel>Прізвище</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="maxLessonsPerDay" render={({ field }) => (
                <FormItem><FormLabel>Максимум уроків на день</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="maxLessonsPerWeek" render={({ field }) => (
                <FormItem><FormLabel>Максимум уроків на тиждень</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Збереження…' : 'Зберегти вчителя'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
