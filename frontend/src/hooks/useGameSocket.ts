import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

export function useGameSocket() {
  const [state, setState] = useState<GameState | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let stopped = false
    let retry = 0

    const connect = () => {
      if (stopped) return
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => {
        setConnected(true)
        retry = 0
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'STATE_UPDATE') setState(msg.data)
        } catch {}
      }
      ws.onclose = () => {
        setConnected(false)
        if (!stopped) {
          retry = Math.min(retry + 1, 5)
          setTimeout(connect, 500 * retry)
        }
      }
      ws.onerror = () => ws.close()
    }
    connect()

    return () => {
      stopped = true
      wsRef.current?.close()
    }
  }, [])

  return { state, connected }
}
