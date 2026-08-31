import { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from './icons'

const MIN_SCALE = 1
const MAX_SCALE = 6
const DOUBLE_CLICK_SCALE = 2.5

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragging = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  // New image opened -> start fresh.
  useEffect(() => {
    setScale(1)
    setTx(0)
    setTy(0)
  }, [src])

  const zoomAt = (offsetX: number, offsetY: number, nextScale: number) => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE)
    setTx((prevTx) => offsetX - ((offsetX - prevTx) * clamped) / scale)
    setTy((prevTy) => offsetY - ((offsetY - prevTy) * clamped) / scale)
    setScale(clamped)
    if (clamped === MIN_SCALE) {
      setTx(0)
      setTy(0)
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    const factor = Math.exp(-e.deltaY * 0.0015)
    zoomAt(offsetX, offsetY, scale * factor)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    zoomAt(offsetX, offsetY, scale > 1 ? 1 : DOUBLE_CLICK_SCALE)
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    dragging.current = { x: e.clientX, y: e.clientY, tx, ty }
    setIsDragging(true)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setTx(dragging.current.tx + (e.clientX - dragging.current.x))
      setTy(dragging.current.ty + (e.clientY - dragging.current.y))
    }
    const onUp = () => {
      dragging.current = null
      setIsDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const reset = () => {
    setScale(1)
    setTx(0)
    setTy(0)
  }
  const stepZoom = (dir: 1 | -1) => {
    const rect = containerRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    zoomAt(cx, cy, scale * (dir === 1 ? 1.5 : 1 / 1.5))
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onMouseDown={onMouseDown}
        style={{
          overflow: 'hidden',
          borderRadius: 'var(--radius-card)',
          background: 'var(--bg-elevated)',
          height: '62vh',
          maxHeight: 560,
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '62vh',
            margin: '0 auto',
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 120ms ease-out',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 999,
          padding: 4,
          backdropFilter: 'blur(8px)',
        }}
      >
        <button className="btn" title="Zoom out" onClick={() => stepZoom(-1)} style={{ padding: 6, borderRadius: 999 }}>
          <ZoomOut size={14} />
        </button>
        <span className="mono-label" style={{ fontSize: 10.5, color: 'var(--text-muted)', minWidth: 34, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </span>
        <button className="btn" title="Zoom in" onClick={() => stepZoom(1)} style={{ padding: 6, borderRadius: 999 }}>
          <ZoomIn size={14} />
        </button>
        <button className="btn" title="Reset zoom" onClick={reset} style={{ padding: 6, borderRadius: 999 }}>
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  )
}
