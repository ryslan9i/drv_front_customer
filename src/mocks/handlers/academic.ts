import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { FS, problem } from './base'

function schoolIdParam(request: Request) {
  return new URL(request.url).searchParams.get('schoolId')
}

export const teacherHandlers = [
  http.get(FS('/teachers'), ({ request }) => {
    const schoolId = schoolIdParam(request)
    return HttpResponse.json(db.teachers.filter((t) => !schoolId || t.schoolId === schoolId))
  }),

  http.get(FS('/teachers/:id'), ({ params }) => {
    const teacher = db.teachers.find((t) => t.id === params.id)
    if (!teacher) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    return HttpResponse.json(teacher)
  }),

  http.post(FS('/teachers'), async ({ request }) => {
    const body = (await request.json()) as { schoolId: string; firstName: string; lastName: string; maxLessonsPerDay: number; maxLessonsPerWeek: number }
    if (!db.schools.some((s) => s.id === body.schoolId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Школу не знайдено.'), { status: 404 })
    }
    const teacher = { id: `teacher-${Date.now()}-${Math.round(Math.random() * 1000)}`, createdAt: new Date().toISOString(), ...body }
    db.teachers.push(teacher)
    return HttpResponse.json(teacher, { status: 201 })
  }),

  http.put(FS('/teachers/:id'), async ({ params, request }) => {
    const index = db.teachers.findIndex((t) => t.id === params.id)
    if (index === -1) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    const body = (await request.json()) as { firstName: string; lastName: string; maxLessonsPerDay: number; maxLessonsPerWeek: number }
    db.teachers[index] = { ...db.teachers[index], ...body }
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(FS('/teachers/:id'), ({ params }) => {
    const index = db.teachers.findIndex((t) => t.id === params.id)
    if (index === -1) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    db.teachers.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]

export const classHandlers = [
  http.get(FS('/classes'), ({ request }) => {
    const schoolId = schoolIdParam(request)
    return HttpResponse.json(db.classes.filter((c) => !schoolId || c.schoolId === schoolId))
  }),

  http.post(FS('/classes'), async ({ request }) => {
    const body = (await request.json()) as { schoolId: string; name: string; grade: number; studentsCount: number }
    if (!db.schools.some((s) => s.id === body.schoolId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Школу не знайдено.'), { status: 404 })
    }
    const cls = { id: `class-${Date.now()}-${Math.round(Math.random() * 1000)}`, createdAt: new Date().toISOString(), ...body }
    db.classes.push(cls)
    return HttpResponse.json(cls, { status: 201 })
  }),

  // Soft delete server-side — workload rows referencing this class are left as-is.
  http.delete(FS('/classes/:id'), ({ params }) => {
    const index = db.classes.findIndex((c) => c.id === params.id)
    if (index === -1) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    db.classes.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]

export const subjectHandlers = [
  http.get(FS('/subjects'), ({ request }) => {
    const schoolId = schoolIdParam(request)
    return HttpResponse.json(db.subjects.filter((s) => !schoolId || s.schoolId === schoolId))
  }),

  http.post(FS('/subjects'), async ({ request }) => {
    const body = (await request.json()) as { schoolId: string; name: string }
    if (!db.schools.some((s) => s.id === body.schoolId)) {
      return HttpResponse.json(problem(404, 'Not Found', 'Школу не знайдено.'), { status: 404 })
    }
    const subject = { id: `subject-${Date.now()}-${Math.round(Math.random() * 1000)}`, createdAt: new Date().toISOString(), ...body }
    db.subjects.push(subject)
    return HttpResponse.json(subject, { status: 201 })
  }),

  // Soft delete server-side — workload rows referencing this subject are left as-is.
  http.delete(FS('/subjects/:id'), ({ params }) => {
    const index = db.subjects.findIndex((s) => s.id === params.id)
    if (index === -1) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    db.subjects.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]

export const workloadHandlers = [
  http.get(FS('/workloads'), ({ request }) => {
    const schoolId = schoolIdParam(request)
    return HttpResponse.json(db.workload.filter((w) => !schoolId || w.schoolId === schoolId))
  }),

  http.post(FS('/workloads'), async ({ request }) => {
    const body = (await request.json()) as { schoolId: string; classId: string; subjectId: string; teacherId: string; lessonsPerWeek: number }
    const missing = [
      !db.classes.some((c) => c.id === body.classId) && 'клас',
      !db.subjects.some((s) => s.id === body.subjectId) && 'предмет',
      !db.teachers.some((t) => t.id === body.teacherId) && 'вчителя',
    ].filter(Boolean)
    if (missing.length > 0) {
      return HttpResponse.json(problem(404, 'Not Found', `Не знайдено: ${missing.join(', ')}.`), { status: 404 })
    }
    const entry = { id: `workload-${Date.now()}-${Math.round(Math.random() * 1000)}`, createdAt: new Date().toISOString(), ...body }
    db.workload.push(entry)
    return HttpResponse.json(entry, { status: 201 })
  }),

  // Hard delete server-side — nothing else references a workload row.
  http.delete(FS('/workloads/:id'), ({ params }) => {
    const index = db.workload.findIndex((w) => w.id === params.id)
    if (index === -1) return HttpResponse.json(problem(404, 'Not Found', 'Не знайдено.'), { status: 404 })
    db.workload.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
