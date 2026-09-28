import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './LoginPage.module.css'

const ROLES = [
  { key: 'inspector', label: 'בודק שטח', icon: '👷', user: 'isotop', pass: '' },
  { key: 'admin',     label: 'סדרן / מנהל', icon: '🔧', user: 'admin', pass: '' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [role, setRole]     = useState('inspector')
  const [username, setUsername] = useState('isotop')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')

  function pickRole(r) {
    const found = ROLES.find(x => x.key === r)
    setRole(r)
    setUsername(found.user)
    setPassword(found.pass)
    setErr('')
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await login(username, password)
      nav('/', { replace: true })
    } catch {
      setErr('שם משתמש או סיסמה שגויים')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>CT</div>
          <div>
            <div className={styles.brandText}>ConcreteTrack</div>
            <div className={styles.brandSub}>מערכת מעקב יציקות</div>
          </div>
        </div>

        <div className={styles.tabs}>
          {ROLES.map(r => (
            <button
              key={r.key}
              type="button"
              className={styles.tab + (role === r.key ? ' ' + styles.tabActive : '')}
              onClick={() => pickRole(r.key)}
            >
              <span>{r.icon}</span> {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>שם משתמש</label>
            <input
              className={styles.input}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>סיסמה</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {err && <div className={styles.err}>{err}</div>}

          <button type="submit" className={styles.btnLogin} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'כניסה למערכת →'}
          </button>
        </form>

        <div className={styles.hint}>
          {role === 'inspector'
            ? 'בודקים: כולם נכנסים עם אותו חשבון משותף'
            : 'גישת סדרן: צפייה בכל הרשומות וניהול מלא'}
        </div>
      </div>
    </div>
  )
}
