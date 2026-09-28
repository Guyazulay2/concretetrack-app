import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getEntriesByRegion, getDashboardStats, markCollected, cancelEntry } from '../services/api'
import CollectModal from '../components/CollectModal'
import MediaViewer from '../components/MediaViewer'
import styles from './Dashboard.module.css'

const REGIONS = [
  { key: 'north',  label: 'צפון',  sub: 'מנתניה צפונה', cls: 'north' },
  { key: 'center', label: 'מרכז',  sub: 'אזור נתניה',    cls: 'center' },
  { key: 'south',  label: 'דרום',  sub: 'דרום הארץ',     cls: 'south' },
]

const STATUS_MAP = {
  waiting:   { label: 'ממתין',  cls: 'waiting' },
  collected: { label: 'נאסף',   cls: 'collected' },
  cancelled: { label: 'בוטל',   cls: 'cancelled' },
}

function hoursAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 36e5
  if (diff < 1)  return 'לפני פחות משעה'
  if (diff < 24) return `לפני ${Math.floor(diff)} שע'`
  const d = Math.floor(diff / 24)
  return `לפני ${d} ${d === 1 ? 'יום' : 'ימים'}`
}

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [byRegion, setByRegion]    = useState({})
  const [collapsed, setCollapsed]  = useState({})
  const [collectEntry, setCollect] = useState(null)
  const [viewMedia, setViewMedia]  = useState(null)
  const [loading, setLoading]      = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await getEntriesByRegion()
      setByRegion(res.data || {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(key) {
    setCollapsed(c => ({ ...c, [key]: !c[key] }))
  }

  async function onCollect(entryId, collectorName, notes) {
    await markCollected(entryId, collectorName, notes)
    setCollect(null)
    load()
  }

  async function onCancel(entryId) {
    if (!confirm('לבטל את הרשומה הזו?')) return
    await cancelEntry(entryId)
    load()
  }

  const allEntries = Object.values(byRegion).flat()
  const waiting   = allEntries.filter(e => e.status === 'waiting').length
  const collected = allEntries.filter(e => e.status === 'collected').length
  const urgent    = allEntries.filter(e => {
    if (e.status !== 'waiting') return false
    return (Date.now() - new Date(e.created_at)) / 36e5 > 24
  }).length

  if (loading) return (
    <div className={styles.loading}>
      <div className="loading-spinner" style={{width:28,height:28,border:'2px solid var(--surface2)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
    </div>
  )

  return (
    <div className={`${styles.page} fade-up`}>
      <div className={styles.header}>
        <h1 className={styles.title}>{isAdmin ? 'לוח בקרה' : 'לוח ראשי'}</h1>
        <p className={styles.sub}>סקירת ההכנות הפעילות לפי אזורים</p>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'var(--accent)'}}>{allEntries.length}</div>
          <div className={styles.statLabel}>סה"כ</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'var(--amber)'}}>{waiting}</div>
          <div className={styles.statLabel}>ממתינות</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'var(--green)'}}>{collected}</div>
          <div className={styles.statLabel}>נאספו</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'var(--red)'}}>{urgent}</div>
          <div className={styles.statLabel}>דחופות</div>
        </div>
      </div>

      <div className={styles.regions}>
        {REGIONS.map(region => {
          const entries = Array.isArray(byRegion[region.key]) ? byRegion[region.key] : []
          const open = !collapsed[region.key]

          return (
            <div key={region.key} className={styles.regionCard}>
              <div className={styles.regionHeader} onClick={() => toggle(region.key)}>
                <div className={styles.regionTitle}>
                  <span className={styles.regionName}>{region.label}</span>
                  <span className={`${styles.regionBadge} ${styles[region.cls]}`}>{region.sub}</span>
                </div>
                <div className={styles.regionMeta}>
                  <span className={styles.regionCount}>{entries.length} הכנות</span>
                  <span className={styles.regionToggle}>{open ? '▲' : '▼'}</span>
                </div>
              </div>

              {open && (
                <div className={styles.entryCards}>
                  {entries.length === 0 ? (
                    <div className={styles.empty}>אין הכנות באזור זה</div>
                  ) : (
                    entries.map((entry, i) => {
                      const st = STATUS_MAP[entry.status] || STATUS_MAP.waiting
                      const diffH = (Date.now() - new Date(entry.created_at)) / 36e5
                      const isUrgent = entry.status === 'waiting' && diffH > 24

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
                              <span className={styles.inspectorName}>{entry.inspector_name}</span>
                            </div>
                            <span className={`${styles.badge} ${styles[st.cls]}`}>
                              <span className={styles.dot} />
                              {st.label}
                              {entry.collector_name && ` — ${entry.collector_name}`}
                            </span>
                          </div>

                          <div className={styles.entryCardBody}>
                            <div className={styles.entryCardInfo}>
                              <span className={styles.city}>{entry.city}</span>
                              <span className={styles.locDesc}>{entry.location_desc}</span>

                              {entry.lat && (
                                <a
                                  href={`https://maps.google.com/?q=${entry.lat},${entry.lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={styles.mapLink}
                                  onClick={e => e.stopPropagation()}
                                >
                                  📍 מפה
                                </a>
                              )}

                              <div className={styles.timeRow}>
                                <span>{hoursAgo(entry.created_at)}</span>
                                {isUrgent && <span className={styles.urgentTag}>⚠ דחוף</span>}
                              </div>
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

                          {entry.status === 'waiting' && (
                            <div className={styles.entryCardActions}>
                              <button className={styles.btnCollect} onClick={() => setCollect(entry)}>
                                ✓ סמן נאסף
                              </button>
                              {isAdmin && (
                                <button className={styles.btnCancel} onClick={() => onCancel(entry.id)}>
                                  ✕ בטל
                                </button>
                              )}
                            </div>
                          )}
                          {entry.status === 'collected' && (
                            <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
                              <span className={styles.doneText}>✓ נאסף</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {collectEntry && (
        <CollectModal
          entry={collectEntry}
          onConfirm={onCollect}
          onClose={() => setCollect(null)}
        />
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
