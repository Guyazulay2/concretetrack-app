// AllEntries.jsx
import { useState, useEffect } from 'react'
import { getEntries, cancelEntry } from '../services/api'
import CollectModal from '../components/CollectModal'
import { markCollected } from '../services/api'
import s from './Table.module.css'

const ST = {
  waiting:   { label: 'ממתין',  cls: s.waiting },
  collected: { label: 'נאסף',   cls: s.collected },
  cancelled: { label: 'בוטל',   cls: s.cancelled },
}

export function AllEntries() {
  const [entries, setEntries] = useState([])
  const [region, setRegion]   = useState('all')
  const [status, setStatus]   = useState('all')
  const [collectE, setCollect]= useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (region !== 'all') params.region = region
      if (status !== 'all') params.status = status
      const { data } = await getEntries(params)
      setEntries(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [region, status])

  async function onCollect(id, name, notes) {
    await markCollected(id, name, notes)
    setCollect(null); load()
  }
  async function onCancel(id) {
    if (!confirm('לבטל?')) return
    await cancelEntry(id); load()
  }

  return (
    <div className={s.page + ' fade-up'}>
      <div className={s.header}>
        <div><h1 className={s.title}>כל הרשומות</h1><p className={s.sub}>מבט מלא — כל הבודקים</p></div>
      </div>
      <div className={s.filters}>
        <span className={s.filterLabel}>אזור:</span>
        {['all','north','center','south'].map(r=>(
          <button key={r} className={s.chip+(region===r?' '+s.chipActive:'')} onClick={()=>setRegion(r)}>
            {r==='all'?'הכל':{north:'צפון',center:'מרכז',south:'דרום'}[r]}
          </button>
        ))}
        <span className={s.filterLabel} style={{marginRight:16}}>סטטוס:</span>
        {['all','waiting','collected','cancelled'].map(st=>(
          <button key={st} className={s.chip+(status===st?' '+s.chipActive:'')} onClick={()=>setStatus(st)}>
            {st==='all'?'הכל':ST[st]?.label}
          </button>
        ))}
      </div>
      {loading ? <div className={s.loading}>טוען...</div> : (
        <div className={s.card}>
          <table className={s.table}>
            <thead><tr>
              <th>בודק</th><th>אזור</th><th>מיקום</th><th>תאריך</th><th>מדיה</th><th>סטטוס</th><th>נאסף ע"י</th><th>פעולה</th>
            </tr></thead>
            <tbody>
              {entries.length===0 && <tr><td colSpan={8} className={s.empty}>אין רשומות</td></tr>}
              {entries.map(e=>{
                const st = ST[e.status]
                return (
                  <tr key={e.id}>
                    <td><div className={s.insp}><div className={s.av}>{e.inspector_name?.[0]}</div>{e.inspector_name}</div></td>
                    <td><span className={s.regionBadge+' '+s[e.region]}>{
                      {north:'צפון',center:'מרכז',south:'דרום'}[e.region]
                    }</span></td>
                    <td><div className={s.city}>{e.city}</div><div className={s.desc}>{e.location_desc}</div></td>
                    <td className={s.time}>{new Date(e.created_at).toLocaleString('he-IL')}</td>
                    <td>
                      {e.thumbnail_url
                        ? <a href={e.media_url} target="_blank" rel="noreferrer"><img src={e.thumbnail_url} className={s.thumb} alt="" /></a>
                        : <span className={s.noMedia}>—</span>}
                    </td>
                    <td><span className={s.badge+' '+st?.cls}><span className={s.dot}/>{st?.label}</span></td>
                    <td className={s.time}>{e.collector_name||'—'}</td>
                    <td>
                      {e.status==='waiting' && (
                        <div className={s.acts}>
                          <button className={s.btnC} onClick={()=>setCollect(e)}>נאסף</button>
                          <button className={s.btnX} onClick={()=>onCancel(e.id)}>בטל</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {collectE && <CollectModal entry={collectE} onConfirm={onCollect} onClose={()=>setCollect(null)} />}
    </div>
  )
}

export default AllEntries
