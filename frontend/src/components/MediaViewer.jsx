import { useEffect } from 'react'
import styles from './MediaViewer.module.css'

export default function MediaViewer({ url, type, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  async function handleDownload() {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const ext = type === 'video' ? 'mp4' : 'jpg'
      a.download = `concrete-${Date.now()}.${ext}`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      // fallback: open in new tab
      window.open(url, '_blank')
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} onClick={handleDownload} title="הורד">
          ⬇️ הורד
        </button>
        <a href={url} target="_blank" rel="noreferrer" className={styles.toolBtn}>
          🔗 פתח
        </a>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div className={styles.mediaWrap}>
        {type === 'video' ? (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            className={styles.video}
          />
        ) : (
          <img src={url} className={styles.image} alt="media" />
        )}
      </div>
    </div>
  )
}
