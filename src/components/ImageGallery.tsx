import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { ZoomableImage } from './ZoomableImage'
import { Plus, X } from './icons'

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
      <button className="btn" onClick={addImages} disabled={adding} style={{ marginTop: images.length ? 0 : 6, width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Plus size={16} />{adding ? 'Adding…' : 'Add Images'}
      </button>

      {lightbox && (
        <Modal title="Image" onClose={() => setLightbox(null)} wide>
          <ZoomableImage src={lightbox} alt="attachment full size" />
        </Modal>
      )}
    </div>
  )
}
