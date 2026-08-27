import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { FS, problem } from './base'
import type { AvailabilityEntry } from '@/types/domain'

export const availabilityHandlers = [
  http.get(FS('/teacher-availability'), ({ request }) => {
    const teacherId = new URL(request.url).searchParams.get('teacherId')
    if (!teacherId || !db.teachers.some((t) => t.id === teacherId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Вчителя не знайдено.'), { status: 404 })
    }
    return HttpResponse.json(db.teacherAvailability.get(teacherId) ?? [])
  }),

  http.get(FS('/class-availability'), ({ request }) => {
    const classId = new URL(request.url).searchParams.get('classId')
    if (!classId || !db.classes.some((c) => c.id === classId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Клас не знайдено.'), { status: 404 })
    }
    return HttpResponse.json(db.classAvailability.get(classId) ?? [])
  }),

  http.post(FS('/teacher-availability'), async ({ request }) => {
    const body = (await request.json()) as { teacherId: string; entries: AvailabilityEntry[] }
    if (!db.teachers.some((t) => t.id === body.teacherId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Вчителя не знайдено.'), { status: 404 })
    }
    db.teacherAvailability.set(body.teacherId, body.entries)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(FS('/class-availability'), async ({ request }) => {
    const body = (await request.json()) as { classId: string; entries: AvailabilityEntry[] }
    if (!db.classes.some((c) => c.id === body.classId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Клас не знайдено.'), { status: 404 })
    }
    db.classAvailability.set(body.classId, body.entries)
    return new HttpResponse(null, { status: 204 })
  }),
]
