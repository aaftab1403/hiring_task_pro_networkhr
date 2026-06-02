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
      className="w-56 flex-shrink-0 flex flex-col border-r"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)',
        minHeight: '100vh',
      }}
    >
      {/* Logo */}
      <div
        className="p-5 border-b"
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
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="mb-3 px-3 text-xs font-600" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
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
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="mt-4 mb-3 px-3 text-xs font-600" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          TRANSACTIONS
        </div>
        {navItems.slice(3).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          v1.0.0 · Vercel-ready
        </div>
      </div>
    </aside>
  );
}
