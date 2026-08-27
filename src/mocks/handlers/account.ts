import { http, HttpResponse } from 'msw'
import { db } from '../db'

export const accountHandlers = [
  http.get('/api/account/profile', () => HttpResponse.json(db.user)),

  http.patch('/api/account/profile', async ({ request }) => {
    const body = (await request.json()) as Partial<typeof db.user>
    Object.assign(db.user, body)
    return HttpResponse.json(db.user)
  }),

  http.post('/api/account/avatar', async ({ request }) => {
    const body = (await request.json()) as { dataUrl: string }
    db.user.avatarUrl = body.dataUrl
    return HttpResponse.json({ avatarUrl: db.user.avatarUrl })
  }),

  http.post('/api/account/password', async ({ request }) => {
    const body = (await request.json()) as { currentPassword: string; newPassword: string }
    if (body.currentPassword !== 'Password123!') {
      return HttpResponse.json(
        { message: 'Деякі поля потребують уваги.', errors: [{ field: 'currentPassword', message: 'Поточний пароль невірний.' }] },
        { status: 422 },
      )
    }
    if (body.newPassword.length < 8) {
      return HttpResponse.json(
        { message: 'Деякі поля потребують уваги.', errors: [{ field: 'newPassword', message: 'Пароль має містити принаймні 8 символів.' }] },
        { status: 422 },
      )
    }
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/account/settings', () => HttpResponse.json(db.accountSettings)),

  http.patch('/api/account/settings', async ({ request }) => {
    const body = (await request.json()) as Partial<typeof db.accountSettings>
    Object.assign(db.accountSettings, body, {
      notifications: { ...db.accountSettings.notifications, ...body.notifications },
    })
    return HttpResponse.json(db.accountSettings)
  }),

  http.get('/api/account/sessions', () => HttpResponse.json(db.sessions)),

  http.delete('/api/account/sessions/:id', ({ params }) => {
    const session = db.sessions.find((s) => s.id === params.id)
    if (session?.isCurrent) {
      return HttpResponse.json({ message: 'Ви не можете завершити поточний сеанс звідси. Скористайтеся виходом з акаунта.' }, { status: 409 })
    }
    db.sessions = db.sessions.filter((s) => s.id !== params.id)
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/account/sessions/revoke-others', () => {
    db.sessions = db.sessions.filter((s) => s.isCurrent)
    return HttpResponse.json({ ok: true })
  }),
]
