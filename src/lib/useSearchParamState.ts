import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Binds a piece of UI state (search text, a select filter, a page index) to a URL
 * search param instead of component state, so it survives navigating away and back
 * (including the browser back button) rather than resetting on remount.
 */
export function useSearchParamState(key: string, defaultValue: string) {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === defaultValue || next === '') params.delete(key)
          else params.set(key, next)
          return params
        },
        { replace: true },
      )
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue] as const
}

export function useSearchParamNumber(key: string, defaultValue: number) {
  const [raw, setRaw] = useSearchParamState(key, String(defaultValue))
  const value = Number(raw)
  const parsed = Number.isFinite(value) ? value : defaultValue
  const setValue = useCallback((next: number) => setRaw(String(next)), [setRaw])
  return [parsed, setValue] as const
}
