/** Builds an MSW path for a FutureSchool route, matching the real `/api/v1/future-school/...` mount. */
export function FS(path: string) {
  return `/api/v1/future-school${path}`
}

export function problem(status: number, title: string, detail: string) {
  return { status, title, detail }
}
