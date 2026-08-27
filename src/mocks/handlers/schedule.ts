import { http, HttpResponse } from 'msw'
import { db, startGenerationJob } from '../db'
import { FS, problem } from './base'

function schoolIdParam(request: Request) {
  return new URL(request.url).searchParams.get('schoolId')
}

export const scheduleHandlers = [
  http.post(FS('/schedules/generate'), async ({ request }) => {
    const body = (await request.json()) as { schoolId: string }
    if (!db.schools.some((s) => s.id === body.schoolId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Школу не знайдено.'), { status: 404 })
    }
    const job = startGenerationJob()
    return HttpResponse.json({ generationId: job.id, status: job.status }, { status: 202 })
  }),

  http.get(FS('/schedules/generations/:id'), ({ params }) => {
    const job = db.generations.get(params.id as string)
    if (!job) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    const { _pendingLessons, ...generation } = job
    void _pendingLessons
    return HttpResponse.json(generation)
  }),

  http.post(FS('/schedules/generations/:id/cancel'), ({ params }) => {
    const job = db.generations.get(params.id as string)
    if (!job) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    if (job.status === 'Queued' || job.status === 'Validating' || job.status === 'Running') {
      job.status = 'Cancelled'
      job.completedAt = new Date().toISOString()
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(FS('/schedules'), ({ request }) => {
    const schoolId = schoolIdParam(request)
    const list = db.schedules
      .filter((s) => !schoolId || s.schoolId === schoolId)
      .map(({ id, schoolId: sid, status, score, createdAt }) => ({ id, schoolId: sid, status, score, createdAt }))
    return HttpResponse.json(list)
  }),

  http.get(FS('/schedules/:id'), ({ params }) => {
    const schedule = db.schedules.find((s) => s.id === params.id)
    if (!schedule) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    return HttpResponse.json(schedule)
  }),
]
