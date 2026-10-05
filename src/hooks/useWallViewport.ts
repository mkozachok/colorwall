import { useCallback, useEffect, useRef, useState } from 'react'
import type Konva from 'konva'

interface ViewportSize { width: number; height: number }
interface GestureStart { distance: number; scale: number; x: number; y: number; centerX: number; centerY: number }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function useWallViewport(stageRef: React.RefObject<Konva.Stage | null>, imageWidth: number, imageHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<GestureStart | null>(null)
  const touchMoved = useRef(false)
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const fitScale = imageWidth && imageHeight && viewport.width && viewport.height ? Math.min(viewport.width / imageWidth, viewport.height / imageHeight) : 1
  const scale = fitScale * zoom
  const clampPosition = useCallback((x: number, y: number, nextZoom = zoom) => {
    const nextScale = fitScale * nextZoom
    const scaledWidth = imageWidth * nextScale; const scaledHeight = imageHeight * nextScale
    const minX = scaledWidth <= viewport.width ? (viewport.width - scaledWidth) / 2 : viewport.width - scaledWidth
    const minY = scaledHeight <= viewport.height ? (viewport.height - scaledHeight) / 2 : viewport.height - scaledHeight
    setPosition({ x: clamp(x, minX, scaledWidth <= viewport.width ? minX : 0), y: clamp(y, minY, scaledHeight <= viewport.height ? minY : 0) })
  }, [fitScale, imageHeight, imageWidth, viewport.height, viewport.width, zoom])

  useEffect(() => {
    if (!imageWidth || !viewport.width || !viewport.height) return
    setZoom(1)
    const base = Math.min(viewport.width / imageWidth, viewport.height / imageHeight)
    setPosition({ x: (viewport.width - imageWidth * base) / 2, y: (viewport.height - imageHeight * base) / 2 })
  }, [imageHeight, imageWidth, viewport.height, viewport.width])

  const onTouchStart = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = event.evt.touches
    if (!touches.length) return
    const rect = stageRef.current?.container().getBoundingClientRect()
    const a = touches[0]; const b = touches[1]
    touchMoved.current = false
    const ax = a.clientX - (rect?.left ?? 0); const ay = a.clientY - (rect?.top ?? 0)
    const bx = b ? b.clientX - (rect?.left ?? 0) : ax; const by = b ? b.clientY - (rect?.top ?? 0) : ay
    gesture.current = { distance: b ? Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) : 0, scale: zoom, x: position.x, y: position.y, centerX: (ax + bx) / 2, centerY: (ay + by) / 2 }
  }

  const onTouchMove = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const start = gesture.current; const touches = event.evt.touches
    if (!start || !touches.length) return
    touchMoved.current = true
    event.evt.preventDefault()
    const rect = stageRef.current?.container().getBoundingClientRect()
    if (touches.length >= 2) {
      const a = touches[0]; const b = touches[1]
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const centerX = (a.clientX + b.clientX) / 2 - (rect?.left ?? 0); const centerY = (a.clientY + b.clientY) / 2 - (rect?.top ?? 0)
      const nextZoom = clamp(start.scale * distance / Math.max(start.distance, 1), 1, 4); const ratio = nextZoom / start.scale
      setZoom(nextZoom); clampPosition(centerX - (start.centerX - start.x) * ratio, centerY - (start.centerY - start.y) * ratio, nextZoom)
    } else {
      const dx = touches[0].clientX - (start.centerX + (rect?.left ?? 0)); const dy = touches[0].clientY - (start.centerY + (rect?.top ?? 0))
      clampPosition(start.x + dx, start.y + dy)
    }
  }

  const reset = () => {
    setZoom(1)
    if (!viewport.width || !imageWidth) return
    const base = Math.min(viewport.width / imageWidth, viewport.height / imageHeight)
    setPosition({ x: (viewport.width - imageWidth * base) / 2, y: (viewport.height - imageHeight * base) / 2 })
  }
  const zoomAtCenter = (factor: number) => {
    const next = clamp(zoom * factor, 1, 4); const ratio = next / zoom
    setZoom(next); clampPosition(viewport.width / 2 - (viewport.width / 2 - position.x) * ratio, viewport.height / 2 - (viewport.height / 2 - position.y) * ratio, next)
  }
  return { containerRef, viewport, zoom, scale, position, onTouchStart, onTouchMove, reset, zoomAtCenter, hasTouchMoved: () => touchMoved.current }
}
