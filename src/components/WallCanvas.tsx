import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Image as KonvaImage, Layer, Stage } from 'react-konva'
import useImage from 'use-image'
import type Konva from 'konva'
import { useAppStore, type HoldRole } from '../store/useAppStore'
import { useWallViewport } from '../hooks/useWallViewport'

interface WallCanvasProps {
  selectedRouteId?: string | null
  selectedRoles?: Record<string, HoldRole>
  transparentUnmarked?: boolean
  onHoldTap?: (holdId: string) => void
}

const roleColors: Record<HoldRole | 'UNUSED', string> = {
  START: '#70e39b', HAND: '#61b9ff', FOOT: '#b08aff', TOP: '#ff655f', UNUSED: '#aeb6b0',
}

export async function compressPhoto(file: File): Promise<string> {
  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = URL.createObjectURL(file)
  })
  const maxSide = 1800
  const ratio = Math.min(1, maxSide / Math.max(source.naturalWidth, source.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(source.naturalWidth * ratio)
  canvas.height = Math.round(source.naturalHeight * ratio)
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(source.src)
  return canvas.toDataURL('image/jpeg', 0.82)
}

export default function WallCanvas({ selectedRouteId, selectedRoles = {}, transparentUnmarked = false, onHoldTap }: WallCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const mode = useAppStore((state) => state.appMode)
  const wallImage = useAppStore((state) => state.wallImage)
  const holds = useAppStore((state) => state.holds)
  const routes = useAppStore((state) => state.routes)
  const addHold = useAppStore((state) => state.addHold)
  const updateHold = useAppStore((state) => state.updateHold)
  const removeHold = useAppStore((state) => state.removeHold)
  const setWallImage = useAppStore((state) => state.setWallImage)
  const [image, imageStatus] = useImage(wallImage ?? '', 'anonymous')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const imageWidth = image?.naturalWidth ?? image?.width ?? 0
  const imageHeight = image?.naturalHeight ?? image?.height ?? 0
  const view = useWallViewport(stageRef, imageWidth, imageHeight)
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(null)
  const route = routes.find((item) => item.id === selectedRouteId)
  const routeHoldMap = useMemo(() => new Map(route?.holds.map((item) => [item.holdId, item.role])), [route])

  useEffect(() => {
    if (mode !== 'ADMIN_MAPPING') setSelectedHoldId(null)
  }, [mode])
  useEffect(() => {
    if (selectedHoldId && !holds.some((hold) => hold.id === selectedHoldId)) setSelectedHoldId(null)
  }, [holds, selectedHoldId])

  const stageToImage = (point: { x: number; y: number }) => ({
    x: (point.x - view.position.x) / view.scale,
    y: (point.y - view.position.y) / view.scale,
  })

  const handleStageTap = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (view.hasTouchMoved()) return
    if (event.target !== event.target.getStage()) return
    if (mode === 'ADMIN_MAPPING' && image) {
      const pointer = event.target.getStage()?.getPointerPosition()
      if (!pointer) return
      const point = stageToImage(pointer)
      if (point.x < 0 || point.y < 0 || point.x > imageWidth || point.y > imageHeight) return
      addHold({ x: point.x, y: point.y, radius: 25 / view.scale })
      return
    }
    setSelectedHoldId(null)
  }

  const visibleHolds = selectedRouteId ? holds.filter((hold) => routeHoldMap.has(hold.id)) : holds
  const selectedHold = holds.find((hold) => hold.id === selectedHoldId)
  const resizeSelectedHold = (changePx: number) => {
    if (!selectedHold) return
    const screenRadius = Math.max(13, Math.min(80, selectedHold.radius * view.scale + changePx))
    updateHold(selectedHold.id, { radius: screenRadius / view.scale })
  }
  const zoomControls = <div className="canvas-controls" aria-label="Масштаб полотна">
    <button aria-label="Збільшити" onClick={() => view.zoomAtCenter(1.25)}>＋</button>
    <button aria-label="Зменшити" onClick={() => view.zoomAtCenter(0.8)}>−</button>
    <button className="fit-control" aria-label="Умістити фото" onClick={view.reset}>Умістити</button>
  </div>

  return (
    <div className="wall-canvas-wrap">
      <div className="wall-canvas" ref={view.containerRef}>
        {wallImage && view.viewport.width > 0 && <Stage
          ref={stageRef} width={view.viewport.width} height={view.viewport.height}
          onClick={handleStageTap} onTap={handleStageTap}
          onTouchStart={view.onTouchStart} onTouchMove={view.onTouchMove}
        >
          <Layer>
            {image && <KonvaImage image={image} x={view.position.x} y={view.position.y} width={imageWidth * view.scale} height={imageHeight * view.scale} listening={false} />}
            {visibleHolds.map((hold) => {
              const role = selectedRoles[hold.id] ?? routeHoldMap.get(hold.id)
              const assigned = Boolean(role)
              const x = view.position.x + hold.x * view.scale
              const y = view.position.y + hold.y * view.scale
              const radius = Math.max(13, hold.radius * view.scale)
              const isSelected = mode === 'ADMIN_MAPPING' && selectedHoldId === hold.id
              const color = isSelected ? '#d5ff6f' : role ? roleColors[role] : roleColors.UNUSED
              return <Fragment key={hold.id}>
                <Circle
                x={x} y={y}
                radius={radius} fill="rgba(16,19,18,0.01)" hitStrokeWidth={24}
                opacity={assigned || isSelected ? 1 : transparentUnmarked ? 0 : 0.78} stroke={color} strokeWidth={assigned || isSelected ? 3 : 2}
                shadowColor={color} shadowBlur={isSelected ? 11 : assigned ? 8 : 3} draggable={mode === 'ADMIN_MAPPING'}
                onClick={(event) => { event.cancelBubble = true; mode === 'ADMIN_MAPPING' ? setSelectedHoldId(hold.id) : onHoldTap?.(hold.id) }}
                onTap={(event) => { event.cancelBubble = true; mode === 'ADMIN_MAPPING' ? setSelectedHoldId(hold.id) : onHoldTap?.(hold.id) }}
                onDragEnd={(event) => {
                  const point = stageToImage({ x: event.target.x(), y: event.target.y() })
                  const x = Math.max(0, Math.min(imageWidth, point.x)); const y = Math.max(0, Math.min(imageHeight, point.y))
                  updateHold(hold.id, { x, y })
                  event.target.position({ x: view.position.x + x * view.scale, y: view.position.y + y * view.scale })
                }}
                />
              </Fragment>
            })}
          </Layer>
        </Stage>}
        {!wallImage && <div className="canvas-onboarding"><span className="wall-icon">＋</span><h2>Додай фото стіни</h2><p>Обери знімок із телефону, щоб поставити перші зачіпки.</p><label className="primary-button upload-button">Обрати фото <span>↗</span><input type="file" accept="image/*" onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          setUploading(true); setUploadError('')
          try { setWallImage(await compressPhoto(file)) } catch { setUploadError('Не вдалося прочитати це фото. Спробуй інше.') } finally { setUploading(false) }
        }} /></label>{uploading && <p>Оптимізую фото…</p>}{uploadError && <p className="upload-error">{uploadError}</p>}</div>}
        {wallImage && imageStatus === 'failed' && <div className="canvas-error">Не вдалося завантажити фото. Додай його ще раз.</div>}
        {wallImage && zoomControls}
        {mode === 'ADMIN_MAPPING' && selectedHoldId && <div className="hold-actions"><span className="hold-selected-label">Зачіпка вибрана</span><div className="hold-size-control"><span>Розмір</span><button aria-label="Зменшити зачіпку" onClick={() => resizeSelectedHold(-6)}>−</button><button aria-label="Збільшити зачіпку" onClick={() => resizeSelectedHold(6)}>＋</button></div><button className="danger-button" onClick={() => { removeHold(selectedHoldId); setSelectedHoldId(null) }}>Видалити</button></div>}
      </div>
      <div className="canvas-caption"><span className="live-dot" /> {mode === 'ADMIN_MAPPING' ? 'Торкнись фото, щоб додати зачіпку' : selectedRouteId ? 'Показано зачіпки маршруту' : 'Полотно стіни'} <span className="caption-zoom">{Math.round(view.zoom * 100)}%</span></div>
    </div>
  )
}
