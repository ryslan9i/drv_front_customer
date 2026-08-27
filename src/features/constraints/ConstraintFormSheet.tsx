import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { classesApi } from '@/api/endpoints/classes'
import { type ConstraintInput, constraintsApi } from '@/api/endpoints/constraints'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast-store'
import { CONSTRAINT_TYPE_OPTIONS, CONSTRAINT_TYPES } from '@/lib/constraintTypes'
import type { ConstraintType, SchedulingConstraint } from '@/types/domain'

const DAY_LABELS: Record<number, string> = { 0: 'Пн', 1: 'Вт', 2: 'Ср', 3: 'Чт', 4: 'Пт', 5: 'Сб', 6: 'Нд' }
const NONE = '__none__'

const schema = z
  .object({
    type: z.custom<ConstraintType>((v) => typeof v === 'string' && v in CONSTRAINT_TYPES, "Оберіть тип обмеження"),
    subjectId: z.string(),
    teacherId: z.string(),
    classId: z.string(),
    dayOfWeek: z.string(),
    periodFrom: z.string(),
    periodTo: z.string(),
    value: z.string(),
    isHard: z.boolean(),
    weight: z.coerce.number().int().min(0),
    priority: z.coerce.number().int().min(0),
    description: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const meta = CONSTRAINT_TYPES[data.type]
    if (!meta) return
    for (const [field, rule] of Object.entries(meta.fields)) {
      if (rule === 'required' && (!data[field as keyof typeof data] || data[field as keyof typeof data] === NONE)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Обов'язкове поле для цього типу обмеження" })
      }
    }
  })
type FormValues = z.infer<typeof schema>

// Select fields default to '' (not the NONE sentinel) so Radix's placeholder actually renders —
// it only falls back to the placeholder when the value is an empty string, not an unmatched one.
const EMPTY_VALUES: FormValues = {
  type: 'SubjectForbiddenPeriod',
  subjectId: '',
  teacherId: '',
  classId: '',
  dayOfWeek: '',
  periodFrom: '',
  periodTo: '',
  value: '',
  isHard: true,
  weight: 10,
  priority: 0,
  description: '',
  isActive: true,
}

function toFormValues(c: SchedulingConstraint): FormValues {
  return {
    type: c.type,
    subjectId: c.subjectId ?? '',
    teacherId: c.teacherId ?? '',
    classId: c.classId ?? '',
    dayOfWeek: c.dayOfWeek === null ? '' : String(c.dayOfWeek),
    periodFrom: c.periodFrom === null ? '' : String(c.periodFrom),
    periodTo: c.periodTo === null ? '' : String(c.periodTo),
    value: c.value === null ? '' : String(c.value),
    isHard: c.isHard,
    weight: c.weight,
    priority: c.priority,
    description: c.description ?? '',
    isActive: c.isActive,
  }
}

export function ConstraintFormSheet({
  open,
  onOpenChange,
  schoolId,
  workingDays,
  periodsPerDay,
  constraint,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId: string
  workingDays: number
  periodsPerDay: number
  constraint?: SchedulingConstraint
}) {
  const queryClient = useQueryClient()
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', schoolId], queryFn: () => subjectsApi.list(schoolId) })
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => teachersApi.list(schoolId) })
  const { data: classes = [] } = useQuery({ queryKey: ['classes', schoolId], queryFn: () => classesApi.list(schoolId) })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES })

  useEffect(() => {
    if (open) form.reset(constraint ? toFormValues(constraint) : EMPTY_VALUES)
  }, [open, constraint, form])

  const type = form.watch('type')
  const meta = CONSTRAINT_TYPES[type]
  const isHard = form.watch('isHard')

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: ConstraintInput = {
        schoolId,
        type: values.type,
        subjectId: values.subjectId === NONE || values.subjectId === '' ? null : values.subjectId,
        teacherId: values.teacherId === NONE || values.teacherId === '' ? null : values.teacherId,
        classId: values.classId === NONE || values.classId === '' ? null : values.classId,
        dayOfWeek: values.dayOfWeek === NONE || values.dayOfWeek === '' ? null : Number(values.dayOfWeek),
        periodFrom: values.periodFrom === NONE || values.periodFrom === '' ? null : Number(values.periodFrom),
        periodTo: values.periodTo === NONE || values.periodTo === '' ? null : Number(values.periodTo),
        value: values.value === '' ? null : Number(values.value),
        isHard: values.isHard,
        weight: values.isHard ? 0 : values.weight,
        priority: values.priority,
        parametersJson: null,
        description: values.description || null,
        isActive: values.isActive,
      }
      return constraint ? constraintsApi.update(constraint.id, payload) : constraintsApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constraints'] })
      toast({ title: constraint ? 'Обмеження оновлено' : 'Обмеження створено', variant: 'success' })
      onOpenChange(false)
    },
    onError: (error) => toast({ title: 'Не вдалося зберегти обмеження', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{constraint ? 'Редагувати обмеження' : 'Нове обмеження'}</SheetTitle>
          <SheetDescription>{meta?.hint}</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-1 flex-col gap-4 overflow-y-auto py-2">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Тип обмеження</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!!constraint}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {CONSTRAINT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {meta?.fields.subjectId && (
              <FormField control={form.control} name="subjectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Предмет {meta.fields.subjectId === 'optional' && '(необов’язково)'}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Оберіть предмет" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {meta.fields.subjectId === 'optional' && <SelectItem value={NONE}>Будь-який предмет</SelectItem>}
                      {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {meta?.fields.teacherId && (
              <FormField control={form.control} name="teacherId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Вчитель {meta.fields.teacherId === 'optional' && '(необов’язково)'}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Оберіть вчителя" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {meta.fields.teacherId === 'optional' && <SelectItem value={NONE}>Будь-який вчитель</SelectItem>}
                      {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {meta?.fields.classId && (
              <FormField control={form.control} name="classId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Клас {meta.fields.classId === 'optional' && '(необов’язково)'}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Оберіть клас" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {meta.fields.classId === 'optional' && <SelectItem value={NONE}>Будь-який клас</SelectItem>}
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {meta?.fields.dayOfWeek && (
              <FormField control={form.control} name="dayOfWeek" render={({ field }) => (
                <FormItem>
                  <FormLabel>День тижня</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Оберіть день" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Array.from({ length: workingDays }, (_, d) => (
                        <SelectItem key={d} value={String(d)}>{DAY_LABELS[d] ?? `День ${d + 1}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {meta?.fields.periodFrom && (
              <FormField control={form.control} name="periodFrom" render={({ field }) => (
                <FormItem>
                  <FormLabel>{meta.fields.periodTo ? 'Урок від' : 'Урок'}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Оберіть урок" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Array.from({ length: periodsPerDay }, (_, p) => (
                        <SelectItem key={p} value={String(p)}>Урок {p + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {meta?.fields.periodTo && (
              <FormField control={form.control} name="periodTo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Урок до</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Оберіть урок" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Array.from({ length: periodsPerDay }, (_, p) => (
                        <SelectItem key={p} value={String(p)}>Урок {p + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {meta?.fields.value && (
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem><FormLabel>Значення</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}

            <FormField control={form.control} name="isHard" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <FormLabel>Жорстке обмеження</FormLabel>
                  <p className="text-xs text-muted-foreground">Не може бути порушене — інакше генерація поверне «Неможливо».</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            {!isHard && (
              <FormField control={form.control} name="weight" render={({ field }) => (
                <FormItem><FormLabel>Вага (пріоритет серед м’яких правил)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}

            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem><FormLabel>Пріоритет відображення</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Опис</FormLabel><FormControl><Input placeholder="Напр.: «Фізкультура не першим уроком»" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                <FormLabel>Активне</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
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
