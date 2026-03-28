import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, CalendarDays, BarChart3, Settings } from 'lucide-react';
import './BottomNav.css';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/monthly', icon: CalendarDays, labelKey: 'nav.monthly' },
  { path: '/analytics', icon: BarChart3, labelKey: 'nav.analytics' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, icon: Icon, labelKey }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
          }
          end={path === '/'}
        >
          <Icon size={22} />
          <span className="bottom-nav__label">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
