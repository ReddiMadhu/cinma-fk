import { Link, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Upload, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: Upload, label: 'New Pipeline', to: '/upload' },
];

export default function AppShell({ children }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-full w-16 flex flex-col items-center py-6 gap-6 glass border-r">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary glow-primary-sm">
          <Activity className="w-5 h-5 text-white" />
        </Link>

        <div className="flex flex-col items-center gap-2 flex-1 mt-2">
          {navItems.map(({ icon: Icon, label, to }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
                  active
                    ? 'gradient-primary glow-primary-sm text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
                title={label}
              >
                <Icon className="w-5 h-5" />
                {/* Tooltip */}
                <span className="absolute left-14 px-2 py-1 rounded-md text-xs font-medium bg-popover border border-border text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg z-50">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Version badge */}
        <span className="text-[10px] text-muted-foreground/50 font-mono">v1.0</span>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
