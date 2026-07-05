import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 70  // px of pull needed to trigger refresh

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [progress, setProgress] = useState(0)
  const startY = useRef(null)

  useEffect(() => {
    const el = document.querySelector('main') || document.documentElement

    const onTouchStart = (e) => {
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY
      }
    }

    const onTouchMove = (e) => {
      if (startY.current === null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0 && el.scrollTop <= 0) {
        setPulling(true)
        setProgress(Math.min(dy / THRESHOLD, 1))
      }
    }

    const onTouchEnd = () => {
      if (pulling && progress >= 1) {
        onRefresh()
      }
      setPulling(false)
      setProgress(0)
      startY.current = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh, pulling, progress])

  return { pulling, progress }
}
