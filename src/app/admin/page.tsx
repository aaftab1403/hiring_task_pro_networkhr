import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Dashboard' };

export default function AdminDashboard() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs mb-2" style={{ color: 'var(--accent-blue)', letterSpacing: '0.1em' }}>
          ● ADMIN CONSOLE
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          PriceEngine Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          B2B SaaS Pricing &amp; Packaging Platform — Catalog Configurator
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/products" className="card p-5 group cursor-pointer block">
          <div
            className="text-2xl mb-3 w-10 h-10 rounded flex items-center justify-center"
            style={{ background: 'rgba(59, 130, 246, 0.1)' }}
          >
            📦
          </div>
          <div className="text-sm font-600 mb-1" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Products & Tiers
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Create products, configure pricing tiers with base seat prices
          </div>
          <div
            className="mt-3 text-xs font-600 flex items-center gap-1"
            style={{ color: 'var(--accent-blue)', fontWeight: 600 }}
          >
            Configure →
          </div>
        </Link>

        <Link href="/admin/matrix" className="card p-5 group cursor-pointer block">
          <div
            className="text-2xl mb-3 w-10 h-10 rounded flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.1)' }}
          >
            ⊞
          </div>
          <div className="text-sm font-600 mb-1" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Feature Matrix
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Map features across tiers, toggle availability & add-on pricing
          </div>
          <div
            className="mt-3 text-xs font-600 flex items-center gap-1"
            style={{ color: 'var(--accent-green)', fontWeight: 600 }}
          >
            Build Matrix →
          </div>
        </Link>

        <Link href="/admin/quotes" className="card p-5 group cursor-pointer block">
          <div
            className="text-2xl mb-3 w-10 h-10 rounded flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.1)' }}
          >
            📄
          </div>
          <div className="text-sm font-600 mb-1" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Quote Builder
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Build step-by-step quotes with TCV calculations & shareable links
          </div>
          <div
            className="mt-3 text-xs font-600 flex items-center gap-1"
            style={{ color: 'var(--accent-amber)', fontWeight: 600 }}
          >
            Build Quote →
          </div>
        </Link>
      </div>

      {/* Workflow Guide */}
      <div className="card p-6">
        <h2 className="text-sm font-700 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          SETUP WORKFLOW
        </h2>
        <div className="space-y-3">
          {[
            { step: '01', label: 'Create a Product', desc: 'Define your software product with name and description.', link: '/admin/products', color: 'var(--accent-blue)' },
            { step: '02', label: 'Add Tiers', desc: 'Create Starter, Growth, Enterprise tiers with USD/seat/month base prices.', link: '/admin/products', color: 'var(--accent-purple)' },
            { step: '03', label: 'List Features', desc: 'Add all features that can be toggled per tier in the matrix.', link: '/admin/products', color: 'var(--accent-cyan)' },
            { step: '04', label: 'Configure Matrix', desc: 'Map each Feature × Tier combination: Included, Not Available, or Paid Add-On.', link: '/admin/matrix', color: 'var(--accent-green)' },
            { step: '05', label: 'Build a Quote', desc: 'Select product, tier, seats, term length, and add-ons. Get shareable TCV link.', link: '/admin/quotes', color: 'var(--accent-amber)' },
          ].map((item) => (
            <Link key={item.step} href={item.link} className="flex items-start gap-4 group">
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-xs font-700 flex-shrink-0"
                style={{ background: `${item.color}20`, color: item.color, fontWeight: 700 }}
              >
                {item.step}
              </div>
              <div>
                <div className="text-sm font-600" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {item.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
