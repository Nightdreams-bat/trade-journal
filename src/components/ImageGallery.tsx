import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { ZoomableImage } from './ZoomableImage'
import { Plus, X, Clipboard } from './icons'

export function ImageGallery({ entityType, entityId }: { entityType: 'trade' | 'missed_trade'; entityId: number }) {
  const [images, setImages] = useState<{ id: number; dataUrl: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    window.api.images.get(entityType, entityId).then((imgs) => {
      setImages(imgs)
      setLoading(false)
    })
  }

  useEffect(load, [entityType, entityId])

  const addImages = async () => {
    setAdding(true)
    try {
      await window.api.images.add(entityType, entityId)
      load()
    } finally {
      setAdding(false)
    }
  }

  const addFromClipboard = async () => {
    setAdding(true)
    try {
      const added = await window.api.images.addFromClipboard(entityType, entityId)
      if (added) load()
    } finally {
      setAdding(false)
    }
  }

  // Lets you screenshot a chart and hit Ctrl+V anywhere in this trade's form to attach it,
  // instead of always going through the file-open dialog. Triggered on the raw keydown rather
  // than the browser's 'paste' event: Chromium only dispatches 'paste' to a focused *editable*
  // element, so with nothing focused (or focus on a plain button) it never fires at all — and
  // even when it does, ClipboardEvent.clipboardData doesn't reliably surface a Windows
  // screenshot-tool bitmap the way Electron's native clipboard.readImage() (called in
  // images:addFromClipboard, main-process side) does. Keydown always fires regardless of focus;
  // we don't preventDefault, so a real text paste into Notes etc. still goes through normally
  // and this just does a harmless no-op image check alongside it.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') addFromClipboard()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addFromClipboard closes over stable entityType/entityId
  }, [entityType, entityId])

  const removeImage = async (id: number) => {
    await window.api.images.remove(id)
    load()
  }

  return (
    <div className="field">
      <span>Images</span>
      {!loading && images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 8 }}>
          {images.map((img) => (
            <div key={img.id} style={{ position: 'relative' }}>
              <img
                src={img.dataUrl}
                onClick={() => setLightbox(img.dataUrl)}
                alt="attachment"
                style={{
                  width: 88,
                  height: 88,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'block',
                }}
              />
              <button
                onClick={() => removeImage(img.id)}
                title="Remove image"
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--red)',
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: images.length ? 0 : 6 }}>
        <button className="btn" onClick={addImages} disabled={adding} style={{ width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Plus size={16} />{adding ? 'Adding…' : 'Add Images'}
        </button>
        <button className="btn" onClick={addFromClipboard} disabled={adding} title="Paste an image from the clipboard (Ctrl+V also works anywhere in this form)" style={{ width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clipboard size={16} />Paste
        </button>
      </div>

      {lightbox && (
        <Modal title="Image" onClose={() => setLightbox(null)} wide>
          <ZoomableImage src={lightbox} alt="attachment full size" />
        </Modal>
      )}
    </div>
  )
}
