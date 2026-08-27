import { useEffect, useRef, useState } from 'react'

export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  function start(seconds: number) {
    clearInterval(intervalRef.current)
    setSecondsLeft(Math.ceil(seconds))
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  return { secondsLeft, start, isActive: secondsLeft > 0 }
}
