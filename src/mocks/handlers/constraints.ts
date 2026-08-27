import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { FS, problem } from './base'
import type { SchedulingConstraint } from '@/types/domain'

export const constraintHandlers = [
  http.get(FS('/scheduling-constraints'), ({ request }) => {
    const schoolId = new URL(request.url).searchParams.get('schoolId')
    return HttpResponse.json(db.constraints.filter((c) => !schoolId || c.schoolId === schoolId))
  }),

  http.get(FS('/scheduling-constraints/:id'), ({ params }) => {
    const constraint = db.constraints.find((c) => c.id === params.id)
    if (!constraint) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    return HttpResponse.json(constraint)
  }),

  http.post(FS('/scheduling-constraints'), async ({ request }) => {
    const body = (await request.json()) as Omit<SchedulingConstraint, 'id' | 'createdAt' | 'updatedAt'>
    if (!db.schools.some((s) => s.id === body.schoolId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Школу не знайдено.'), { status: 404 })
    }
    const now = new Date().toISOString()
    const constraint: SchedulingConstraint = { id: `constraint-${Date.now()}-${Math.round(Math.random() * 1000)}`, createdAt: now, updatedAt: now, ...body }
    db.constraints.push(constraint)
    return HttpResponse.json(constraint, { status: 201 })
  }),

  http.put(FS('/scheduling-constraints/:id'), async ({ params, request }) => {
    const index = db.constraints.findIndex((c) => c.id === params.id)
    if (index === -1) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    const body = (await request.json()) as Omit<SchedulingConstraint, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
    db.constraints[index] = { ...db.constraints[index], ...body, updatedAt: new Date().toISOString() }
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(FS('/scheduling-constraints/:id/active'), async ({ params, request }) => {
    const index = db.constraints.findIndex((c) => c.id === params.id)
    if (index === -1) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    const body = (await request.json()) as { isActive: boolean }
    db.constraints[index] = { ...db.constraints[index], isActive: body.isActive, updatedAt: new Date().toISOString() }
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(FS('/scheduling-constraints/:id'), ({ params }) => {
    const index = db.constraints.findIndex((c) => c.id === params.id)
    if (index === -1) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    db.constraints.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
