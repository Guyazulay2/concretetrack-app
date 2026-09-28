import { useState, useEffect } from 'react'
import { getUsers, createUser, getDashboardStats } from '../services/api'
import s from './Table.module.css'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [form, setForm]   = useState({ username:'', password:'', full_name:'', role:'inspector' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]     = useState('')

  useEffect(() => {
    getUsers().then(r=>setUsers(r.data)).catch(()=>{})
    getDashboardStats().then(r=>setStats(r.data)).catch(()=>{})
  }, [])

  async function addUser(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createUser(form)
      const r = await getUsers()
      setUsers(r.data)
      setForm({ username:'', password:'', full_name:'', role:'inspector' })
      setMsg('המשתמש נוסף בהצלחה ✓')
      setTimeout(() => setMsg(''), 3000)
    } catch(err) {
      setMsg('שגיאה: ' + (err.response?.data?.detail || err.message))
    } finally { setSaving(false) }
  }

  return (
    <div className={s.page + ' fade-up'}>
      <div className={s.header}>
        <div><h1 className={s.title}>ניהול מערכת</h1><p className={s.sub}>ניהול משתמשים וסטטיסטיקות</p></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
        {/* Stats */}
        {stats && (
          <div className={s.card} style={{padding:20}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>📊 סטטיסטיקות</div>
            {[
              ['ממתינות לאיסוף', stats.waiting, 'var(--amber)'],
              ['נאספו היום',     stats.collected_today, 'var(--green)'],
              ['דחופות +24ש\'',  stats.urgent, 'var(--red)'],
              ['סה"כ פעילות',    stats.active, 'var(--accent)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{fontSize:13,color:'var(--text2)'}}>{label}</span>
                <span style={{fontSize:20,fontWeight:800,fontFamily:'Space Mono',color}}>{val ?? '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Add user */}
        <div className={s.card} style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>➕ הוסף משתמש</div>
          <form onSubmit={addUser} style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              ['שם מלא', 'full_name', 'text', 'ישראל ישראלי'],
              ['שם משתמש', 'username', 'text', 'user1'],
              ['סיסמא', 'password', 'password', ''],
            ].map(([label, key, type, placeholder]) => (
              <div key={key}>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>{label}</div>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                  placeholder={placeholder}
                  required
                  style={{width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',padding:'9px 12px',fontFamily:'Heebo',fontSize:14,color:'var(--text)',outline:'none',direction:'rtl'}}
                />
              </div>
            ))}
            <div>
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>תפקיד</div>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
                style={{width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',padding:'9px 12px',fontFamily:'Heebo',fontSize:14,color:'var(--text)',outline:'none',direction:'rtl',appearance:'none'}}>
                <option value="inspector">בודק שטח</option>
                <option value="admin">סדרן / מנהל</option>
              </select>
            </div>
            {msg && <div style={{fontSize:13,color:msg.includes('שגיאה')?'var(--red)':'var(--green)'}}>{msg}</div>}
            <button type="submit" disabled={saving}
              style={{background:'var(--accent-g)',border:'none',borderRadius:'var(--radius-sm)',padding:'10px',fontFamily:'Heebo',fontSize:14,fontWeight:700,color:'#fff',marginTop:4,cursor:'pointer'}}>
              {saving ? '...' : 'הוסף משתמש'}
            </button>
          </form>
        </div>
      </div>

      {/* Users table */}
      <div className={s.card}>
        <div style={{padding:'16px 20px',fontWeight:700,borderBottom:'1px solid var(--border)'}}>👷 משתמשים במערכת</div>
        <table className={s.table}>
          <thead><tr><th>שם</th><th>שם משתמש</th><th>תפקיד</th><th>סטטוס</th></tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id}>
                <td style={{fontWeight:500}}>{u.full_name}</td>
                <td style={{fontFamily:'Space Mono',fontSize:13,color:'var(--text2)'}}>{u.username}</td>
                <td><span className={s.badge + (u.role==='admin'?' '+s.collected:' '+s.waiting)}>
                  {u.role==='admin'?'סדרן':'בודק'}
                </span></td>
                <td><span style={{fontSize:12,color:u.is_active?'var(--green)':'var(--red)'}}>
                  {u.is_active?'• פעיל':'• מושבת'}
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
