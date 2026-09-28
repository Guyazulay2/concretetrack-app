import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCollected } from '../services/api'
import MediaViewer from '../components/MediaViewer'
import styles from './Dashboard.module.css'

const REGION_LABELS = { north: 'צפון', center: 'מרכז', south: 'דרום' }

function fmt(d) {
  return new Date(d).toLocaleString('he-IL', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
}

export default function CollectedPage() {
  const { isAdmin } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMedia, setViewMedia] = useState(null)

  useEffect(() => {
    getCollected()
      .then(r => setEntries(Array.isArray(r.data) ? r.data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className={styles.loading}>
      <div style={{width:28,height:28,border:'2px solid var(--surface2)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
    </div>
  )

  return (
    <div className={`${styles.page} fade-up`}>
      <div className={styles.header}>
        <h1 className={styles.title}>נאספו</h1>
        <p className={styles.sub}>היסטוריית יציקות שנאספו — {entries.length} סה"כ</p>
      </div>

      {entries.length === 0 ? (
        <div className={styles.regionCard} style={{padding:40,textAlign:'center',color:'var(--text3)'}}>
          אין יציקות נאספות עדיין
        </div>
      ) : (
        <div className={styles.entryCards}>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={styles.entryCard}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className={styles.entryCardTop}>
                <div className={styles.inspectorRow}>
                  <div className={styles.miniAvatar}>
                    {entry.inspector_name?.[0] || '?'}
                  </div>
                  <div>
                    <span className={styles.inspectorName}>{entry.inspector_name}</span>
                    <span style={{fontSize:11,color:'var(--text3)',display:'block',marginTop:1}}>
                      {REGION_LABELS[entry.region] || entry.region}
                    </span>
                  </div>
                </div>
                <span className={`${styles.badge} ${styles.collected}`}>
                  <span className={styles.dot} />
                  נאסף ע"י {entry.collector_name}
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
                    <span>נאסף: {fmt(entry.collected_at || entry.created_at)}</span>
                  </div>
                  {entry.notes && (
                    <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>
                      📝 {entry.notes}
                    </div>
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
            </div>
          ))}
        </div>
      )}

      {viewMedia && (
        <MediaViewer
          url={viewMedia.url}
          type={viewMedia.type}
          onClose={() => setViewMedia(null)}
        />
      )}
    </div>
  )
}
