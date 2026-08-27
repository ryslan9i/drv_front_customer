import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { type ClassInput, classesApi } from '@/api/endpoints/classes'
import { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast-store'

const schema = z.object({
  name: z.string().min(1, 'Введіть назву класу'),
  grade: z.coerce.number().int().min(1).max(13),
  studentsCount: z.coerce.number().int().min(1).max(60),
})
type FormValues = z.infer<typeof schema>

export function ClassFormSheet({ open, onOpenChange, schoolId }: { open: boolean; onOpenChange: (o: boolean) => void; schoolId: string }) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', grade: 1, studentsCount: 25 } })

  useEffect(() => {
    if (open) form.reset({ name: '', grade: 1, studentsCount: 25 })
  }, [open, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: ClassInput = { ...values, schoolId }
      return classesApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      toast({ title: 'Клас створено', variant: 'success' })
      onOpenChange(false)
    },
    onError: (error) => {
      toast({ title: 'Не вдалося створити клас', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' })
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Створити клас</SheetTitle>
          <SheetDescription>Предмети та навантаження налаштовуються на сторінці «Навантаження».</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-1 flex-col gap-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Назва класу</FormLabel><FormControl><Input placeholder="5-A" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="grade" render={({ field }) => (
              <FormItem><FormLabel>Клас (рівень)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="studentsCount" render={({ field }) => (
              <FormItem><FormLabel>Кількість учнів</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Створення…' : 'Створити клас'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
