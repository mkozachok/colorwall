import { useEffect, useMemo, useState } from 'react'
import WallCanvas, { compressPhoto } from './components/WallCanvas'
import { DEFAULT_WALL_ID, useAppStore, type AppMode, type HoldRole } from './store/useAppStore'

const grades = ['5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '7a', '7a+', '7b', '7b+', '7c', '8a']
const roleOrder: HoldRole[] = ['HAND', 'START', 'FOOT', 'TOP']
const roleNames: Record<HoldRole, string> = { START: 'Старт', HAND: 'Рука', FOOT: 'Нога', TOP: 'Топ' }
const roleColors: Record<HoldRole, string> = { START: '#70e39b', HAND: '#61b9ff', FOOT: '#b08aff', TOP: '#ff655f' }

export default function App() {
  const mode = useAppStore((state) => state.appMode)
  const setAppMode = useAppStore((state) => state.setAppMode)
  const holds = useAppStore((state) => state.holds)
  const routes = useAppStore((state) => state.routes)
  const walls = useAppStore((state) => state.walls)
  const activeWallId = useAppStore((state) => state.activeWallId)
  const progress = useAppStore((state) => state.progress)
  const saveRoute = useAppStore((state) => state.saveRoute)
  const addWall = useAppStore((state) => state.addWall)
  const setActiveWall = useAppStore((state) => state.setActiveWall)
  const removeRoute = useAppStore((state) => state.removeRoute)
  const updateProgress = useAppStore((state) => state.updateProgress)
  const replaceWallImage = useAppStore((state) => state.replaceWallImage)
  const clearWallMapping = useAppStore((state) => state.clearWallMapping)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [routeWallId, setRouteWallId] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, HoldRole>>({})
  const [transparentMode, setTransparentMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('6a')
  const [rating, setRating] = useState(3)
  const [formError, setFormError] = useState('')
  const [gradeFilter, setGradeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [newWallName, setNewWallName] = useState('')
  const [wallError, setWallError] = useState('')
  const selectedRoute = routes.find((route) => route.id === selectedRouteId)
  const currentWallId = routeWallId && walls.some((wall) => wall.id === routeWallId) ? routeWallId : activeWallId
  const activeWallHolds = holds.filter((hold) => hold.wallId === activeWallId)
  const activeWallRoutes = routes.filter((route) => route.wallId === activeWallId)
  const defaultRouteWallId = walls.some((wall) => wall.id === DEFAULT_WALL_ID) ? DEFAULT_WALL_ID : activeWallId

  useEffect(() => {
    setAppMode('VIEW')
  }, [setAppMode])

  useEffect(() => {
    if (mode === 'CREATE_ROUTE' && !editingRouteId) setSelectedRoles({})
  }, [editingRouteId, mode])

  const filteredRoutes = useMemo(() => routes.filter((route) => {
    const current = progress.find((item) => item.routeId === route.id)?.status
    return (gradeFilter === 'ALL' || route.grade === gradeFilter) && (statusFilter === 'ALL' || current === statusFilter)
  }), [gradeFilter, progress, routes, statusFilter])

  const navigate = (nextMode: AppMode) => {
    setMenuOpen(false)
    setSelectedRouteId(null)
    setFormError('')
    if (nextMode === 'CREATE_ROUTE') {
      setEditingRouteId(null); setRouteWallId(defaultRouteWallId); setSelectedRoles({}); setName(''); setGrade('6a'); setRating(3)
    } else {
      setEditingRouteId(null); setRouteWallId(null); setSelectedRoles({}); setName('')
    }
    setAppMode(nextMode)
  }

  const goBack = () => {
    if (mode === 'VIEW') {
      setSelectedRouteId(null)
      return
    }
    if (mode === 'CREATE_ROUTE' && editingRouteId) {
      setEditingRouteId(null); setRouteWallId(null); setSelectedRoles({}); setName(''); setFormError('')
    } else if (mode === 'CREATE_ROUTE') {
      setRouteWallId(null); setSelectedRoles({}); setName(''); setFormError('')
    }
    setAppMode('VIEW')
  }

  const cycleRole = (holdId: string) => {
    setSelectedRoles((previous) => {
      const index = roleOrder.indexOf(previous[holdId])
      return { ...previous, [holdId]: roleOrder[(index + 1) % roleOrder.length] }
    })
  }

  const handleEditRoute = (route: (typeof routes)[number]) => {
    setEditingRouteId(route.id); setSelectedRouteId(route.id); setRouteWallId(route.wallId); setName(route.name); setGrade(route.grade); setRating(route.rating)
    setSelectedRoles(Object.fromEntries(route.holds.map(({ holdId, role }) => [holdId, role])))
    setFormError(''); setAppMode('CREATE_ROUTE')
  }

  const handleSaveRoute = () => {
    const selectedHolds = Object.entries(selectedRoles).map(([holdId, role]) => ({ holdId, role }))
    if (!name.trim()) { setFormError('Додай назву маршруту.'); return }
    if (selectedHolds.length < 2) { setFormError('Обери щонайменше дві зачіпки.'); return }
    if (!selectedHolds.some((hold) => hold.role === 'START') || !selectedHolds.some((hold) => hold.role === 'TOP')) { setFormError('Познач старт і топ маршруту.'); return }
    const id = saveRoute({ ...(editingRouteId ? { id: editingRouteId } : {}), wallId: currentWallId, name: name.trim(), grade, rating, holds: selectedHolds })
    setSelectedRouteId(id); setName(''); setSelectedRoles({}); setFormError(''); setEditingRouteId(null); setRouteWallId(null); setAppMode('VIEW')
  }

  const cancelRouteEdit = () => {
    setEditingRouteId(null); setRouteWallId(null); setSelectedRoles({}); setName(''); setFormError(''); setAppMode('VIEW')
  }

  const deleteRoute = (routeId: string) => {
    removeRoute(routeId)
    if (selectedRouteId === routeId) setSelectedRouteId(null)
  }

  const currentProgress = selectedRoute ? progress.find((item) => item.routeId === selectedRoute.id) : undefined
  const headerTitle = selectedRoute?.name ?? (mode === 'CREATE_ROUTE' ? editingRouteId ? 'Редагувати маршрут' : 'Додати маршрут' : mode === 'ADMIN_MAPPING' ? 'Розмітка' : 'Маршрути')
  const showCanvas = mode !== 'VIEW' || Boolean(selectedRoute)
  const canvasWallId = mode === 'VIEW' ? selectedRoute?.wallId ?? activeWallId : mode === 'CREATE_ROUTE' ? currentWallId : activeWallId

  return (
    <main className="app-shell">
      <header className="app-header">
        {mode !== 'VIEW' || selectedRouteId ? <button className="header-action back-button" aria-label="Назад" onClick={goBack}>←</button> : <span className="brand-mark" aria-hidden="true">●</span>}
        <div className="header-title"><p className="eyebrow">SPRAY WALL</p><h1>{headerTitle}</h1></div>
        <button className="header-action menu-button" aria-label="Відкрити меню" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? '×' : '☰'}</button>
        {menuOpen && <nav className="app-menu" aria-label="Головне меню">
          <button className={mode === 'VIEW' && !selectedRouteId ? 'is-current' : ''} onClick={() => navigate('VIEW')}><span>▤</span>Маршрути</button>
          <button className={mode === 'CREATE_ROUTE' ? 'is-current' : ''} onClick={() => navigate('CREATE_ROUTE')}><span>＋</span>Додати маршрут</button>
          <button className={mode === 'ADMIN_MAPPING' ? 'is-current' : ''} onClick={() => navigate('ADMIN_MAPPING')}><span>◉</span>Розмітка</button>
        </nav>}
      </header>

      {showCanvas && <section className="canvas-section" aria-label="Полотно стіни">
        <WallCanvas key={canvasWallId} wallId={canvasWallId} selectedRouteId={mode === 'VIEW' ? selectedRouteId : null} selectedRoles={selectedRoles} transparentUnmarked={mode === 'CREATE_ROUTE' && transparentMode} onHoldTap={mode === 'CREATE_ROUTE' ? cycleRole : undefined} />
      </section>}

      {mode === 'ADMIN_MAPPING' && <section className="quick-panel">
        <div className="section-heading"><div><p className="eyebrow">РОЗМІТКА СТІНИ</p><h2>{walls.find((wall) => wall.id === activeWallId)?.name ?? 'Стіна'}</h2></div><span className="count-pill">{activeWallHolds.length}</span></div>
        <label className="field-label wall-select-label">Активна стіна<select value={activeWallId} onChange={(event) => setActiveWall(event.target.value)}>{walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.name}</option>)}</select></label>
        <p className="panel-copy">Торкнись фото, щоб додати зачіпку. Перетягни маркер для точного розташування; вибрану зачіпку можна видалити або змінити її розмір.</p>
        <div className="new-wall-form"><label className="field-label">Назва нової стіни<input value={newWallName} onChange={(event) => setNewWallName(event.target.value)} placeholder={`Стіна ${walls.length + 1}`} maxLength={40} /></label>
          <label className="primary-button wall-upload-button">Додати фото стіни <span>↗</span><input type="file" accept="image/*" onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setWallError('')
            try { addWall({ name: newWallName.trim() || `Стіна ${walls.length + 1}`, image: await compressPhoto(file) }); setNewWallName(''); setSelectedRouteId(null) }
            catch { setWallError('Не вдалося додати фото. Перевір його формат і вільне місце у сховищі браузера.') }
            event.target.value = ''
          }} /></label>
          {wallError && <p className="form-error" role="alert">{wallError}</p>}
        </div>
        <label className="secondary-button replace-photo">Замінити фото цієї стіни<input type="file" accept="image/*" onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          if (!window.confirm('Заміна фото цієї стіни очистить її розмітку, маршрути й прогрес. Продовжити?')) { event.target.value = ''; return }
          try { replaceWallImage(activeWallId, await compressPhoto(file)); setSelectedRouteId(null) } catch { window.alert('Не вдалося прочитати це фото. Спробуй інше.') }
          event.target.value = ''
        }} /></label>
        {(activeWallHolds.length > 0 || activeWallRoutes.length > 0) && <button className="clear-mapping-button" onClick={() => clearWallMapping(activeWallId)}>Очистити розмітку цієї стіни</button>}
      </section>}

      {mode === 'CREATE_ROUTE' && <section className="quick-panel">
        <div className="section-heading"><div><p className="eyebrow">{editingRouteId ? 'РЕДАГУВАННЯ' : 'НОВИЙ МАРШРУТ'}</p><h2>{editingRouteId ? 'Зміни маршрут' : 'Додай маршрут'}</h2></div><span className="count-pill">{Object.keys(selectedRoles).length}</span></div>
        <div className="transparent-mode-row"><span><strong>Прозорий режим</strong><small>Приховати невідмічені кільця</small></span><button type="button" role="switch" aria-checked={transparentMode} aria-label="Прозорий режим" className={transparentMode ? 'toggle-switch is-on' : 'toggle-switch'} onClick={() => setTransparentMode((enabled) => !enabled)}><i /></button></div>
        <p className="panel-copy">Торкнись зачіпки, щоб змінити роль: рука → старт → нога → топ. Рука — початковий стан.</p>
        <div className="route-form">
          <label className="field-label">Фото стіни<select value={currentWallId} onChange={(event) => { setRouteWallId(event.target.value); setSelectedRoles({}) }}>{walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.name}</option>)}</select></label>
          <label className="field-label">Назва<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Наприклад, Лимонна хвиля" maxLength={40} /></label>
          <label className="field-label">Складність<select value={grade} onChange={(event) => setGrade(event.target.value)}>{grades.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="field-label">Рейтинг <div className="rating-picker" aria-label="Рейтинг маршруту">{[1, 2, 3, 4, 5].map((value) => <button key={value} className={rating >= value ? 'rating-star is-active' : 'rating-star'} aria-label={`${value} з 5`} onClick={() => setRating(value)}>★</button>)}</div></div>
          <div className="role-legend">{Object.entries(roleNames).map(([role, label]) => <span key={role}><i style={{ background: roleColors[role as HoldRole] }} />{label}</span>)}</div>
          {Object.keys(selectedRoles).length > 0 && <div className="selected-holds"><span className="selected-holds-title">Зачіпки маршруту</span>{Object.entries(selectedRoles).map(([holdId, role], index) => <div className="selected-hold-row" key={holdId}><span><i style={{ background: roleColors[role] }} />Зачіпка {index + 1} · {roleNames[role]}</span><button type="button" aria-label={`Прибрати зачіпку ${index + 1} з маршруту`} onClick={() => setSelectedRoles((previous) => { const next = { ...previous }; delete next[holdId]; return next })}>×</button></div>)}</div>}
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button className="primary-button" onClick={handleSaveRoute}>{editingRouteId ? 'Зберегти зміни' : 'Зберегти маршрут'} <span>↗</span></button>
          {editingRouteId && <button className="secondary-button cancel-edit-button" onClick={cancelRouteEdit}>Скасувати редагування</button>}
        </div>
      </section>}

      {mode === 'VIEW' && !selectedRoute && <section className="quick-panel">
        <div className="section-heading"><div><p className="eyebrow">ТВОЯ СТІНА</p><h2>Маршрути</h2></div><span className="count-pill">{filteredRoutes.length}</span></div>
        <div className="filters-row">
          <label className="filter-control"><span>Складність</span><select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option value="ALL">Усі рівні</option>{grades.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="filter-control"><span>Статус</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Усі</option><option value="SENT">Пройдені</option><option value="PROJECTING">Проєкти</option></select></label>
        </div>
        {filteredRoutes.length > 0 ? <div className="route-list">{filteredRoutes.map((route) => {
          const state = progress.find((item) => item.routeId === route.id)
          return <div key={route.id} className="route-card">
            <button className="route-select" onClick={() => setSelectedRouteId(route.id)}>
              <span className="route-swatch" /><span className="route-info"><strong>{route.name}</strong><small>{route.grade} · {walls.find((wall) => wall.id === route.wallId)?.name ?? 'Стіна'} · {route.holds.length} зачіпок</small></span><span className={state ? `progress-tag ${state.status.toLowerCase()}` : 'route-arrow'}>{state ? state.status === 'SENT' ? 'Пройдено' : 'Проєкт' : '›'}</span>
            </button>
            <button className="edit-route" aria-label={`Редагувати маршрут ${route.name}`} title="Редагувати маршрут" onClick={() => handleEditRoute(route)}>✎</button>
            <button className="delete-route" aria-label={`Видалити маршрут ${route.name}`} title="Видалити маршрут" onClick={() => deleteRoute(route.id)}>×</button>
          </div>
        })}</div> : <div className="empty-card"><p>{routes.length ? 'Немає маршрутів із такими фільтрами.' : 'Маршрути, які ти створиш, з’являться тут.'}</p><button className="primary-button" onClick={() => routes.length ? (setGradeFilter('ALL'), setStatusFilter('ALL')) : navigate('ADMIN_MAPPING')}>{routes.length ? 'Очистити фільтри' : 'Почати з розмітки'} <span>↗</span></button></div>}
      </section>}

      {mode === 'VIEW' && selectedRoute && <section className="quick-panel">
        <div className="section-heading"><div><p className="eyebrow">{walls.find((wall) => wall.id === selectedRoute.wallId)?.name ?? 'СТІНА'} · {selectedRoute.grade}</p><h2>{selectedRoute.name}</h2></div><span className="count-pill">{'★'.repeat(selectedRoute.rating)}</span></div>
        <p className="panel-copy">{selectedRoute.holds.length} зачіпок на цій стіні. Старт і топ позначені кольором.</p>
        <div className="progress-panel"><div className="progress-heading"><span>Мій прогрес</span><span className="progress-date">{currentProgress ? new Date(currentProgress.date).toLocaleDateString('uk-UA') : 'Ще не відмічено'}</span></div><div className="progress-actions"><button className={currentProgress?.status === 'SENT' ? 'progress-button sent is-active' : 'progress-button sent'} onClick={() => updateProgress(selectedRoute.id, 'SENT')}>✓ Пройдено</button><button className={currentProgress?.status === 'PROJECTING' ? 'progress-button project is-active' : 'progress-button project'} onClick={() => updateProgress(selectedRoute.id, 'PROJECTING')}>◷ Проєктую</button></div></div>
        <div className="route-detail-actions"><button className="secondary-button" onClick={() => handleEditRoute(selectedRoute)}>Редагувати маршрут</button><button className="danger-button" onClick={() => deleteRoute(selectedRoute.id)}>Видалити</button></div>
      </section>}

      <footer className="app-footer"><span className="status-dot" /> Дані зберігаються на пристрої <span className="footer-divider">·</span> Працює офлайн</footer>
    </main>
  )
}
