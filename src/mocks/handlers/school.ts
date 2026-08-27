import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { FS } from './base'

export const schoolHandlers = [
  http.get(FS('/schools'), () => HttpResponse.json(db.schools)),

  http.post(FS('/schools'), async ({ request }) => {
    const body = (await request.json()) as { name: string; workingDays: number; periodsPerDay: number }
    const school = { id: `school-${Date.now()}`, ...body, createdAt: new Date().toISOString() }
    db.schools.push(school)
    return HttpResponse.json(school, { status: 201 })
  }),
]
