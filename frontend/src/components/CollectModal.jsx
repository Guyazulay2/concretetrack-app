import { useState } from 'react'
import styles from './CollectModal.module.css'

export default function CollectModal({ entry, onConfirm, onClose }) {
  const [name, setName]   = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) { setErr('חובה להזין שם לחתימה'); return }
    setBusy(true)
    try {
      await onConfirm(entry.id, name.trim(), notes.trim() || undefined)
    } catch {
      setErr('שגיאה בשמירה — נסה שוב')
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} fade-up`}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <h2 className={styles.title}>אישור איסוף</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>מיקום</span>
            <span className={styles.infoVal}>{entry.city} — {entry.location_desc}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>בודק שטח</span>
            <span className={styles.infoVal}>{entry.inspector_name}</span>
          </div>
          {entry.lat && (
            <a
              href={`https://maps.google.com/?q=${entry.lat},${entry.lng}`}
              target="_blank"
              rel="noreferrer"
              className={styles.mapBtn}
            >
              📍 פתח במפות Google
            </a>
          )}
        </div>

        <form onSubmit={submit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>שמך המלא (חתימה) *</label>
            <input
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="לדוגמה: מיכאל אברהם"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>הערות (אופציונלי)</label>
            <input
              className={styles.input}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="הערות לאיסוף..."
            />
          </div>

          {err && <div className={styles.err}>{err}</div>}

          <div className={styles.actions}>
            <button type="submit" className={styles.btnConfirm} disabled={busy}>
              {busy ? (
                <span className={styles.spinner} />
              ) : (
                '✓ אשר איסוף'
              )}
            </button>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
