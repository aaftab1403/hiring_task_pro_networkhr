import type { Metadata } from 'next';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: {
    template: '%s | Admin — PriceEngine',
    default: 'Admin — PriceEngine',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-6 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
