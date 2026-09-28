// ActivityLog.jsx
import { useState, useEffect } from 'react'
import { getActivity } from '../services/api'
import s from './Table.module.css'

const ACTION_ICON = { created: '📦', collected: '✅', cancelled: '❌' }

export default function ActivityLog() {
  const [logs, setLogs]   = useState([])
  const [loading, setL]   = useState(true)

  useEffect(() => {
    getActivity()
      .then(r => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setL(false))
  }, [])

  return (
    <div className={s.page + ' fade-up'}>
      <div className={s.header}>
        <div><h1 className={s.title}>יומן פעילות</h1><p className={s.sub}>כל הפעולות שנעשו במערכת</p></div>
      </div>
      {loading ? <div className={s.loading}>טוען...</div> : (
        <div className={s.card} style={{padding:'8px 0'}}>
          {logs.length === 0 && <div className={s.empty}>אין פעילות עדיין</div>}
          {logs.map(log => (
            <div key={log.id} style={{display:'flex',alignItems:'flex-start',gap:14,padding:'14px 20px',borderBottom:'1px solid var(--border)'}}>
              <div style={{fontSize:20,flexShrink:0,marginTop:2}}>{ACTION_ICON[log.action]||'📝'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14}}>{log.description}</div>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:3}}>
                  {new Date(log.created_at).toLocaleString('he-IL')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
