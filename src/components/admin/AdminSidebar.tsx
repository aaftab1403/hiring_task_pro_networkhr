'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '⬛' },
  { href: '/admin/products', label: 'Products & Tiers', icon: '📦' },
  { href: '/admin/matrix', label: 'Feature Matrix', icon: '⊞' },
  { href: '/admin/quotes', label: 'Quotes', icon: '📄' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-full md:w-56 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r min-h-0 md:min-h-screen"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)',
      }}
    >
      {/* Logo / Header */}
      <div
        className="p-4 md:p-5 border-b flex items-center justify-between md:block"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}
          >
            PE
          </div>
          <div>
            <div className="text-sm font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              PriceEngine
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Admin Console
            </div>
          </div>
        </div>
        <div className="text-xs md:hidden" style={{ color: 'var(--text-muted)' }}>
          v1.0.0
        </div>
      </div>

      {/* Nav */}
      <nav className="p-3 flex flex-row md:flex-col flex-wrap gap-1 md:space-y-1">
        <div className="hidden md:block mb-3 px-3 text-xs font-600" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          CATALOG
        </div>
        {navItems.slice(0, 3).map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link py-1.5 md:py-2 ${isActive ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-xs md:text-sm">{item.label}</span>
            </Link>
          );
        })}

        <div className="hidden md:block mt-4 mb-3 px-3 text-xs font-600" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          TRANSACTIONS
        </div>
        {navItems.slice(3).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link py-1.5 md:py-2 ${isActive ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-xs md:text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="hidden md:block p-4 mt-auto border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          v1.0.0 · Vercel-ready
        </div>
      </div>
    </aside>
  );
}
