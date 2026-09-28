import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEntry, uploadMedia } from '../services/api'
import styles from './NewEntry.module.css'

const REGIONS = [
  { value: 'north',  label: 'צפון (מנתניה צפונה)' },
  { value: 'center', label: 'מרכז (אזור נתניה)' },
  { value: 'south',  label: 'דרום' },
]

export default function NewEntry() {
  const nav = useNavigate()
  const fileRef = useRef()

  const [form, setForm] = useState({
    region: 'north',
    city: '',
    location_desc: '',
    notes: '',
    lat: null,
    lng: null,
  })
  const [file, setFile]           = useState(null)
  const [preview, setPreview]     = useState(null)
  const [locMode, setLocMode]     = useState('waze') // 'waze' | 'manual'
  const [locStatus, setLocStatus] = useState('idle') // idle | loading | done | error
  const [uploadProgress, setUploadProgress] = useState(null) // null | 0-100
  const [saving, setSaving]       = useState(false)
  const [errors, setErrors]       = useState({})
  const [success, setSuccess]     = useState(false)

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: null }))
  }

  function getLocation() {
    if (!navigator.geolocation) { setLocStatus('error'); return }
    setLocStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('lat', pos.coords.latitude)
        set('lng', pos.coords.longitude)
        setLocStatus('done')
        setErrors(e => ({ ...e, location: null }))
      },
      () => setLocStatus('error'),
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (f.type.startsWith('image')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  function validate() {
    const errs = {}
    if (!form.city.trim()) errs.city = 'חובה למלא עיר'
    if (!form.location_desc.trim()) errs.location_desc = 'חובה למלא מיקום מדויק'

    if (locMode === 'waze') {
      if (locStatus !== 'done') errs.location = 'חובה לשתף מיקום GPS — לחץ על כפתור Waze'
    } else {
      if (!form.city.trim()) errs.city = 'חובה למלא עיר'
    }

    return errs
  }

  async function submit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const { data: entry } = await createEntry({
        region: form.region,
        city: form.city.trim(),
        location_desc: form.location_desc.trim(),
        notes: form.notes.trim() || undefined,
        lat: form.lat || undefined,
        lng: form.lng || undefined,
      })

      if (file) {
        setUploadProgress(0)
        // Upload with progress tracking via XHR
        await uploadWithProgress(entry.id, file, setUploadProgress)
      }

      setSuccess(true)
      setTimeout(() => nav('/'), 1800)
    } catch (err) {
      setErrors({ global: 'שגיאה בשמירה — ' + (err.response?.data?.detail || err.message) })
      setSaving(false)
      setUploadProgress(null)
    }
  }

  if (success) return (
    <div className={styles.successScreen}>
      <div className={styles.successIcon}>✅</div>
      <div className={styles.successTitle}>הרשומה נשמרה!</div>
      <div className={styles.successSub}>מעביר ללוח הראשי...</div>
    </div>
  )

  const hasGPS = locStatus === 'done'
  const wazeLink = hasGPS
    ? `https://waze.com/ul?ll=${form.lat},${form.lng}&navigate=yes`
    : null

  return (
    <div className={`${styles.page} fade-up`}>
      <div className={styles.header}>
        <h1 className={styles.title}>תיעוד הכנה חדשה</h1>
        <p className={styles.sub}>מלא את כל הפרטים הנדרשים</p>
      </div>

      <form onSubmit={submit} className={styles.card}>

        {/* Region + City + Location */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>פרטי הכנה</div>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>אזור *</label>
              <select value={form.region} onChange={e => set('region', e.target.value)}>
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className={`${styles.field} ${errors.city ? styles.fieldError : ''}`}>
              <label>עיר / יישוב *</label>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="לדוגמה: נתניה, חיפה"
              />
              {errors.city && <span className={styles.errMsg}>{errors.city}</span>}
            </div>

            <div className={`${styles.field} ${styles.full} ${errors.location_desc ? styles.fieldError : ''}`}>
              <label>מיקום מדויק (גוש / חלקה / כתובת) *</label>
              <input
                value={form.location_desc}
                onChange={e => set('location_desc', e.target.value)}
                placeholder="לדוגמה: גוש 123 חלקה 5 / רחוב הרצל 12"
              />
              {errors.location_desc && <span className={styles.errMsg}>{errors.location_desc}</span>}
            </div>

            <div className={`${styles.field} ${styles.full}`}>
              <label>הערות לאיסוף</label>
              <input
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="כמות דגימות, שעת כניסה, הערה מיוחדת..."
              />
            </div>
          </div>
        </div>

        {/* Location / GPS */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>מיקום *</div>

          <div className={styles.locTabs}>
            <button
              type="button"
              className={`${styles.locTab} ${locMode === 'waze' ? styles.locTabActive : ''}`}
              onClick={() => setLocMode('waze')}
            >
              📍 GPS / Waze
            </button>
            <button
              type="button"
              className={`${styles.locTab} ${locMode === 'manual' ? styles.locTabActive : ''}`}
              onClick={() => setLocMode('manual')}
            >
              ✏️ כתובת ידנית
            </button>
          </div>

          {locMode === 'waze' && (
            <div className={styles.wazeSection}>
              <button
                type="button"
                className={`${styles.locBtn} ${locStatus === 'done' ? styles.locDone : ''} ${errors.location ? styles.locErr : ''}`}
                onClick={getLocation}
                disabled={locStatus === 'loading'}
              >
                {locStatus === 'idle'    && <><span>📍</span> שתף מיקום נוכחי (חובה)</>}
                {locStatus === 'loading' && <><span>⏳</span> מאתר מיקום...</>}
                {locStatus === 'done'    && <><span>✅</span> מיקום נקבע: {form.lat?.toFixed(5)}, {form.lng?.toFixed(5)}</>}
                {locStatus === 'error'   && <><span>❌</span> לא הצליח — נסה שוב</>}
              </button>
              {errors.location && <span className={styles.errMsg}>{errors.location}</span>}

              {hasGPS && (
                <a href={wazeLink} target="_blank" rel="noreferrer" className={styles.wazeBtn}>
                  <span>🗺️</span> פתח ב-Waze
                </a>
              )}
            </div>
          )}

          {locMode === 'manual' && (
            <div className={styles.manualNote}>
              <span>ℹ️</span>
              מלא את שדות העיר והמיקום למעלה — ישמש לאיסוף
            </div>
          )}
        </div>

        {/* Media */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>תמונה / סרטון</div>
          <div
            className={`${styles.uploadZone} ${file ? styles.uploadDone : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={pickFile}
              style={{ display: 'none' }}
            />
            {file ? (
              preview ? (
                <img src={preview} alt="preview" className={styles.uploadPreview} />
              ) : (
                <>
                  <div className={styles.uploadIcon}>🎥</div>
                  <div className={styles.uploadText}>{file.name}</div>
                  <div className={styles.uploadSub}>לחץ להחלפה</div>
                </>
              )
            ) : (
              <>
                <div className={styles.uploadIcon}>📷</div>
                <div className={styles.uploadText}>לחץ לצילום או בחירת קובץ</div>
                <div className={styles.uploadSub}>תמונה או סרטון</div>
              </>
            )}
          </div>

          {file && (
            <button
              type="button"
              className={styles.removeFile}
              onClick={e => { e.stopPropagation(); setFile(null); setPreview(null) }}
            >
              ✕ הסר קובץ
            </button>
          )}

          {uploadProgress !== null && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
              <span className={styles.progressText}>{uploadProgress}%</span>
            </div>
          )}
        </div>

        {errors.global && <div className={styles.err}>{errors.global}</div>}

        <div className={styles.actions}>
          <button type="submit" className={styles.btnSave} disabled={saving}>
            {saving ? <span className={styles.spinner} /> : '✓ שמור תיעוד'}
          </button>
          <button type="button" className={styles.btnBack} onClick={() => nav('/')}>
            ביטול
          </button>
        </div>
      </form>
    </div>
  )
}

// XHR upload with real progress tracking
function uploadWithProgress(entryId, file, onProgress) {
  return new Promise((resolve, reject) => {
    const BACKEND = 'https://concretetrack-backend.onrender.com'
    const token = localStorage.getItem('ct_token')
    const fd = new FormData()
    fd.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BACKEND}/api/entries/${entryId}/media`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(fd)
  })
}
