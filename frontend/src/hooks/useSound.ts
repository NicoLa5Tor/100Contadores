import { useCallback, useRef } from 'react'

const DEFAULT_VOLUME = 0.7

/**
 * Loads sound files from /public/sounds/{name}.mp3
 * Silently ignores missing files (404 / decode errors).
 * Caches Audio objects per name for faster replay.
 */
export function useSound() {
  const cache = useRef<Map<string, HTMLAudioElement>>(new Map())

  const play = useCallback((name: string, opts?: { volume?: number; loop?: boolean }) => {
    try {
      let audio = cache.current.get(name)
      if (!audio) {
        audio = new Audio(`/sounds/${name}.mp3`)
        audio.preload = 'auto'
        cache.current.set(name, audio)
      }
      audio.volume = opts?.volume ?? DEFAULT_VOLUME
      audio.loop = opts?.loop ?? false
      audio.currentTime = 0
      // play() returns a Promise — swallow rejection (autoplay block, missing file)
      audio.play().catch(() => {})
    } catch {
      // ignore
    }
  }, [])

  const stop = useCallback((name: string) => {
    const audio = cache.current.get(name)
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  return { play, stop }
}
