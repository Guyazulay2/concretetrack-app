import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './AppShell.module.css'

const INSPECTOR_NAV = [
  { to: '/',     icon: '◉', label: 'לוח ראשי' },
  { to: '/new',  icon: '+', label: 'תיעוד חדש' },
  { to: '/mine',      icon: '≡', label: 'הרשומות שלי' },
  { to: '/collected', icon: '✓', label: 'נאספו' },
]

const ADMIN_NAV = [
  { to: '/',      icon: '◉', label: 'לוח בקרה' },
  { to: '/all',   icon: '≡', label: 'כל הרשומות' },
  { to: '/log',   icon: '📜', label: 'יומן' },
  { to: '/admin', icon: '⚙', label: 'ניהול' },
]

export default function AppShell() {
  const { user, logout, isAdmin } = useAuth()
  const nav = useNavigate()
  const navItems = isAdmin ? ADMIN_NAV : INSPECTOR_NAV
  const initials = user?.full_name?.[0] || '?'

  function handleLogout() {
    logout()
    nav('/login', { replace: true })
  }

  return (
    <div className={styles.shell}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>CT</div>
          <div>
            <div className={styles.brandName}>ConcreteTrack</div>
            <div className={styles.brandSub}>מעקב יציקות</div>
          </div>
        </div>

        <div className={styles.navSection}>
          <div className={styles.navLabel}>{isAdmin ? 'ניהול' : 'בודק שטח'}</div>
          <nav className={styles.nav}>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  styles.navItem + (isActive ? ' ' + styles.active : '')
                }
              >
                <span className={styles.navDot} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={styles.userFooter}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.full_name}</div>
            <div className={styles.userRole}>{isAdmin ? 'מנהל מערכת' : 'בודק שטח'}</div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="יציאה">
            ↩
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        {/* Mobile header */}
        <header className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <div className={styles.brandMark} style={{width:28,height:28,fontSize:11}}>CT</div>
            <span>ConcreteTrack</span>
          </div>
          <div className={styles.mobileUser}>
            <div className={styles.avatar} style={{width:32,height:32,fontSize:13}}>{initials}</div>
            <button className={styles.logoutBtn} onClick={handleLogout}>↩</button>
          </div>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className={styles.bottomNav}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              styles.bottomNavItem + (isActive ? ' ' + styles.bottomActive : '')
            }
          >
            <span className={styles.bottomNavIcon}>{item.icon}</span>
            <span className={styles.bottomNavLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
