import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { type SubjectInput, subjectsApi } from '@/api/endpoints/subjects'
import { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/ui/toast-store'

const schema = z.object({ name: z.string().min(1, 'Введіть назву предмета') })
type FormValues = z.infer<typeof schema>

export function SubjectFormSheet({ open, onOpenChange, schoolId }: { open: boolean; onOpenChange: (o: boolean) => void; schoolId: string }) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  useEffect(() => {
    if (open) form.reset({ name: '' })
  }, [open, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: SubjectInput = { ...values, schoolId }
      return subjectsApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast({ title: 'Предмет створено', variant: 'success' })
      onOpenChange(false)
    },
    onError: (error) => toast({ title: 'Не вдалося створити предмет', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Створити предмет</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-1 flex-col gap-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Назва предмета</FormLabel><FormControl><Input placeholder="Математика" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Створення…' : 'Створити предмет'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
