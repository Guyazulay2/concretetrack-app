import { useState, useEffect } from 'react'
import { getEntries, markCollected, deleteEntry } from '../services/api'
import CollectModal from '../components/CollectModal'
import MediaViewer  from '../components/MediaViewer'
import styles from './Dashboard.module.css'

const REGION_LABELS = { north: 'צפון', center: 'מרכז', south: 'דרום' }

function hoursAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 36e5
  if (diff < 1)  return 'לפני פחות משעה'
  if (diff < 24) return `לפני ${Math.floor(diff)} שע'`
  const d = Math.floor(diff / 24)
  return `לפני ${d} ${d === 1 ? 'יום' : 'ימים'}`
}

export default function MyEntries() {
  const [entries, setEntries]    = useState([])
  const [loading, setLoading]    = useState(true)
  const [collectE, setCollect]   = useState(null)
  const [viewMedia, setViewMedia] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await getEntries({ status: 'waiting' })
      setEntries(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function onCollect(id, name, notes) {
    await markCollected(id, name, notes)
    setCollect(null)
    load()
  }

  async function onDelete(id) {
    if (!confirm('למחוק את הרשומה לגמרי?')) return
    await deleteEntry(id)
    load()
  }

  if (loading) return (
    <div className={styles.loading}>
      <div style={{width:28,height:28,border:'2px solid var(--surface2)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
    </div>
  )

  return (
    <div className={`${styles.page} fade-up`}>
      <div className={styles.header}>
        <h1 className={styles.title}>הרשומות שלי</h1>
        <p className={styles.sub}>יציקות פתוחות שתיעדת — {entries.length} ממתינות</p>
      </div>

      {entries.length === 0 ? (
        <div className={styles.regionCard} style={{padding:40,textAlign:'center',color:'var(--text3)'}}>
          אין יציקות פתוחות — הכל אסוף! ✅
        </div>
      ) : (
        <div className={styles.entryCards}>
          {entries.map((entry, i) => {
            const diffH = (Date.now() - new Date(entry.created_at)) / 36e5
            const isUrgent = diffH > 24

            return (
              <div
                key={entry.id}
                className={`${styles.entryCard} ${isUrgent ? styles.urgentCard : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className={styles.entryCardTop}>
                  <div className={styles.inspectorRow}>
                    <div className={styles.miniAvatar}>
                      {entry.inspector_name?.[0] || '?'}
                    </div>
                    <div>
                      <span className={styles.inspectorName}>{entry.inspector_name}</span>
                      <span style={{fontSize:11,color:'var(--text3)',display:'block'}}>
                        {REGION_LABELS[entry.region] || entry.region}
                      </span>
                    </div>
                  </div>
                  <span className={`${styles.badge} ${styles.waiting}`}>
                    <span className={styles.dot} />
                    ממתין
                  </span>
                </div>

                <div className={styles.entryCardBody}>
                  <div className={styles.entryCardInfo}>
                    <span className={styles.city}>{entry.city}</span>
                    <span className={styles.locDesc}>{entry.location_desc}</span>

                    {entry.lat && (
                      <a
                        href={`https://waze.com/ul?ll=${entry.lat},${entry.lng}&navigate=yes`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.mapLink}
                      >
                        📍 Waze
                      </a>
                    )}

                    <div className={styles.timeRow}>
                      <span>{hoursAgo(entry.created_at)}</span>
                      {isUrgent && <span className={styles.urgentTag}>⚠ דחוף</span>}
                    </div>
                    {entry.notes && (
                      <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>📝 {entry.notes}</div>
                    )}
                  </div>

                  {entry.media_url && (
                    <button
                      className={styles.mediaBtn}
                      onClick={() => setViewMedia({ url: entry.media_url, type: entry.media_type })}
                    >
                      {entry.media_type === 'video' ? (
                        <div className={styles.videoThumb}>🎥</div>
                      ) : (
                        <img src={entry.media_url} className={styles.mediaThumb} alt="" />
                      )}
                    </button>
                  )}
                </div>

                <div className={styles.entryCardActions}>
                  <button className={styles.btnCollect} onClick={() => setCollect(entry)}>
                    ✓ סמן נאסף
                  </button>
                  <button className={styles.btnCancel} onClick={() => onDelete(entry.id)}>
                    🗑 מחק
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {collectE && (
        <CollectModal entry={collectE} onConfirm={onCollect} onClose={() => setCollect(null)} />
      )}
      {viewMedia && (
        <MediaViewer url={viewMedia.url} type={viewMedia.type} onClose={() => setViewMedia(null)} />
      )}
    </div>
  )
}
