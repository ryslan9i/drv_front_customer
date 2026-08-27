/**
 * The auth API returns the refresh token in the JSON body (not a Set-Cookie
 * header) and there's no backend-for-frontend in this app to hold it for us.
 * Per the API's own guidance, persisted storage is the accepted fallback here
 * — the access token itself (the one actually usable against any API) still
 * never touches storage and lives in memory only (see api/client.ts).
 */
const REFRESH_TOKEN_KEY = 'refresh_token'

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
  else localStorage.removeItem(REFRESH_TOKEN_KEY)
}
