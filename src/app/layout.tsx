import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | PriceEngine',
    default: 'PriceEngine — B2B SaaS Pricing & Packaging',
  },
  description:
    'A complete B2B SaaS pricing and packaging engine. Configure product catalogs, build transactional quotes, and share crystal-clear cost breakdowns with customers.',
  keywords: ['B2B', 'SaaS', 'pricing', 'packaging', 'quote', 'CPQ'],
  openGraph: {
    title: 'PriceEngine — B2B SaaS Pricing & Packaging',
    description: 'Configure products, build quotes, and share pricing with customers.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
