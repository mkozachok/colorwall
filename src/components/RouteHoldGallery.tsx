import { useEffect, useRef } from 'react'
import useImage from 'use-image'
import type { Hold, HoldRole, Wall } from '../store/useAppStore'

interface RouteHoldGalleryProps {
  wall: Wall
  items: Array<{ hold: Hold; role: HoldRole }>
  onRemove?: (holdId: string) => void
}

const roleNames: Record<HoldRole, string> = { START: 'Старт', HAND: 'Рука', FOOT: 'Нога', TOP: 'Топ' }
const roleColors: Record<HoldRole, string> = { START: '#70e39b', HAND: '#61b9ff', FOOT: '#b08aff', TOP: '#ff655f' }
const THUMB_SIZE = 112

function HoldThumbnail({ hold, role, index, imageUrl, onRemove }: { hold: Hold; role: HoldRole; index: number; imageUrl: string; onRemove?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image] = useImage(imageUrl, 'anonymous')

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !image) return

    const cropSize = Math.min(Math.max(hold.radius * 4, 80), image.naturalWidth, image.naturalHeight)
    const maxX = Math.max(0, image.naturalWidth - cropSize)
    const maxY = Math.max(0, image.naturalHeight - cropSize)
    const sourceX = Math.max(0, Math.min(maxX, hold.x - cropSize / 2))
    const sourceY = Math.max(0, Math.min(maxY, hold.y - cropSize / 2))

    context.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE)
    context.fillStyle = '#191e1c'
    context.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE)
    context.save()
    context.beginPath()
    context.arc(THUMB_SIZE / 2, THUMB_SIZE / 2, THUMB_SIZE / 2, 0, Math.PI * 2)
    context.clip()
    context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, THUMB_SIZE, THUMB_SIZE)
    context.restore()
  }, [hold.radius, hold.x, hold.y, image])

  const diameter = Math.max(14, Math.min(88, (hold.radius * 2 / Math.max(hold.radius * 4, 80)) * THUMB_SIZE))

  return <div className="route-hold-item">
    <div className="route-hold-thumb">
      <div className="route-hold-image">
        <canvas ref={canvasRef} width={THUMB_SIZE} height={THUMB_SIZE} aria-label={`Фрагмент стіни із зачіпкою ${index + 1}`} />
        <span className="route-hold-marker" style={{ width: diameter, height: diameter, borderColor: roleColors[role], color: roleColors[role] }} />
      </div>
      {onRemove && <button type="button" className="route-hold-remove" aria-label={`Прибрати зачіпку ${index + 1} з маршруту`} onClick={onRemove}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}
    </div>
    <strong>{index + 1}. {roleNames[role]}</strong>
  </div>
}

export default function RouteHoldGallery({ wall, items, onRemove }: RouteHoldGalleryProps) {
  return <section className="route-hold-gallery" aria-label="Зачіпки маршруту">
    <div className="gallery-heading"><div><p className="eyebrow">ПОСЛІДОВНІСТЬ</p><h3>Зачіпки маршруту</h3></div><span className="count-pill">{items.length}</span></div>
    {items.length > 0 ? <div className="route-hold-grid">{items.map(({ hold, role }, index) => <HoldThumbnail key={hold.id} hold={hold} role={role} index={index} imageUrl={wall.image} onRemove={onRemove ? () => onRemove(hold.id) : undefined} />)}</div> : <p className="panel-copy">У маршруті поки немає зачіпок.</p>}
  </section>
}
