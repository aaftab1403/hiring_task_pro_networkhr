import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  calculateQuote,
  formatCurrency,
  formatDate,
  TERM_CONFIG,
} from '@/lib/pricing';
import type { AddOnInput } from '@/lib/pricing';
import type { PricingModel, TermLength } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface QuotePageProps {
  params: Promise<{ id: string }>;
}

// ─── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: QuotePageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { product: true, tier: true },
    });
    if (!quote) return { title: 'Quote Not Found' };
    return {
      title: `${quote.quoteName} — ${quote.customerName} | PriceEngine`,
      description: `Pricing proposal for ${quote.customerName}: ${quote.product.name} ${quote.tier.name} plan.`,
    };
  } catch {
    return { title: 'Quote' };
  }
}

// ─── Main Page (Server Component) ──────────────────────────────────────────────
export default async function QuoteViewPage({ params }: QuotePageProps) {
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      product: true,
      tier: {
        include: {
          addOnPricings: { include: { feature: true } },
        },
      },
      quoteAddOns: {
        include: { feature: true },
      },
    },
  });

  if (!quote) notFound();

  // Build add-on inputs for calculation
  const addOnInputs: AddOnInput[] = quote.quoteAddOns.map((qa) => {
    const addonPricing = quote.tier.addOnPricings.find(
      (ap) => ap.featureId === qa.featureId
    );
    return {
      featureId: qa.featureId,
      featureName: qa.feature.name,
      pricingModel: (addonPricing?.pricingModel ?? 'FIXED_MONTHLY') as PricingModel,
      value: Number(addonPricing?.value ?? 0),
      selectedSeats: qa.selectedSeats,
    };
  });

  const result = calculateQuote({
    coreSeats: quote.coreSeats,
    tierBasePrice: Number(quote.tier.basePrice),
    termLength: quote.termLength as TermLength,
    globalDiscountPercent: Number(quote.globalDiscount),
    addOns: addOnInputs,
    tierName: quote.tier.name,
    productName: quote.product.name,
  });

  const termConfig = TERM_CONFIG[quote.termLength as TermLength];
  const isExpired = new Date(quote.validUntil) < new Date();

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Top Bar */}
      <div
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}
          >
            PE
          </div>
          <span className="text-sm font-600" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            PriceEngine
          </span>
          <span style={{ color: 'var(--border-accent)' }}>·</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pricing Proposal</span>
        </div>
        <div className="flex items-center gap-3">
          {isExpired ? (
            <span className="badge badge-red">EXPIRED</span>
          ) : (
            <span className="badge badge-green">ACTIVE</span>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Quote ID: {id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Back Navigation */}
        <div className="mb-6">
          <Link
            href="/admin/quotes"
            className="inline-flex items-center gap-2 text-xs font-mono transition-colors hover:text-white"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>←</span> BACK TO QUOTES
          </Link>
        </div>

        {/* Quote Header */}
        <div className="mb-8">
          <div className="text-xs mb-2" style={{ color: 'var(--accent-blue)', letterSpacing: '0.12em' }}>
            ● PRICING PROPOSAL
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {quote.quoteName}
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Prepared for <strong style={{ color: 'var(--text-primary)' }}>{quote.customerName}</strong>
          </p>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Quote Date', value: formatDate(quote.createdAt) },
            {
              label: 'Valid Until',
              value: formatDate(quote.validUntil),
              highlight: isExpired ? 'var(--accent-red)' : 'var(--accent-green)',
            },
            { label: 'Product', value: quote.product.name },
            { label: 'Tier', value: quote.tier.name },
            { label: 'Core Seats', value: quote.coreSeats.toString() },
            { label: 'Contract Term', value: termConfig.label },
            {
              label: 'Term Discount',
              value: termConfig.termDiscount > 0 ? `${termConfig.termDiscount * 100}%` : 'None',
              highlight: termConfig.termDiscount > 0 ? 'var(--accent-green)' : undefined,
            },
            {
              label: 'Global Discount',
              value: Number(quote.globalDiscount) > 0 ? `${quote.globalDiscount}%` : 'None',
              highlight: Number(quote.globalDiscount) > 0 ? 'var(--accent-amber)' : undefined,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                {item.label.toUpperCase()}
              </div>
              <div
                className="text-sm font-600"
                style={{ color: item.highlight ?? 'var(--text-primary)', fontWeight: 600 }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Cost Breakdown */}
        <div className="card overflow-hidden mb-6">
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
          >
            <div>
              <span className="text-sm font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                Cost Breakdown
              </span>
              <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Total Contract Value (TCV)
              </span>
            </div>
            <span className="badge badge-blue">{termConfig.durationMonths}-Month Contract</span>
          </div>

          <table className="table" id="quote-breakdown-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Line Item</th>
                <th style={{ width: '45%' }}>Calculation Formula</th>
                <th className="text-right" style={{ width: '15%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {result.lineItems.map((item, idx) => (
                <tr
                  key={idx}
                  className={item.type === 'total' ? 'total-row' : ''}
                >
                  <td>
                    <span
                      style={{
                        color: item.type === 'total' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: item.type === 'total' ? 700 : 400,
                      }}
                    >
                      {item.name}
                    </span>
                    {item.type === 'base' && (
                      <span className="ml-2 badge badge-blue" style={{ fontSize: '10px' }}>BASE</span>
                    )}
                    {item.type === 'addon' && (
                      <span className="ml-2 badge badge-amber" style={{ fontSize: '10px' }}>ADD-ON</span>
                    )}
                    {item.type === 'discount' && (
                      <span className="ml-2 badge badge-red" style={{ fontSize: '10px' }}>DISCOUNT</span>
                    )}
                  </td>
                  <td>
                    <code
                      className="formula-block"
                      data-testid={`formula-${idx}`}
                    >
                      {item.formula}
                    </code>
                  </td>
                  <td className="text-right">
                    <span
                      className="font-600"
                      data-testid={`amount-${idx}`}
                      style={{
                        fontWeight: item.type === 'total' ? 700 : 600,
                        color: item.type === 'total'
                          ? 'var(--accent-blue)'
                          : item.type === 'discount'
                          ? 'var(--accent-red)'
                          : 'var(--text-primary)',
                      }}
                    >
                      {formatCurrency(item.subtotal)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Final TCV Callout */}
        <div
          className="rounded-xl p-6 mb-8 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.04) 100%)',
            border: '1px solid var(--border-accent)',
          }}
        >
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--accent-blue)', letterSpacing: '0.1em' }}>
              TOTAL CONTRACT VALUE (TCV)
            </div>
            <div
              className="text-3xl font-bold"
              id="quote-total-value"
              style={{ color: 'var(--text-primary)', fontWeight: 700 }}
            >
              {formatCurrency(result.finalTotal)}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {termConfig.label} contract · {quote.coreSeats} core seat{quote.coreSeats !== 1 ? 's' : ''}
              {addOnInputs.length > 0 && ` · ${addOnInputs.length} add-on${addOnInputs.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="text-right">
            {Number(quote.globalDiscount) > 0 && (
              <div className="mb-2">
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Before discount</div>
                <div
                  className="text-lg line-through"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {formatCurrency(result.subtotal)}
                </div>
              </div>
            )}
            <div className="badge badge-green text-sm px-3 py-1">
              {isExpired ? '⚠ Expired' : `Valid until ${formatDate(quote.validUntil)}`}
            </div>
          </div>
        </div>

        {/* Add-Ons Summary */}
        {quote.quoteAddOns.length > 0 && (
          <div className="card overflow-hidden mb-8">
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-sm font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                Selected Add-Ons
              </span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Add-On Feature</th>
                  <th>Pricing Model</th>
                  <th>Configuration</th>
                </tr>
              </thead>
              <tbody>
                {quote.quoteAddOns.map((qa) => {
                  const ap = quote.tier.addOnPricings.find((a) => a.featureId === qa.featureId);
                  return (
                    <tr key={qa.id}>
                      <td style={{ color: 'var(--text-primary)' }}>{qa.feature.name}</td>
                      <td>
                        <span className="badge badge-amber">
                          {ap?.pricingModel.replace(/_/g, ' ') ?? '—'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {ap?.pricingModel === 'FIXED_MONTHLY' && `$${Number(ap.value).toFixed(2)}/mo`}
                        {ap?.pricingModel === 'PER_SEAT' && `${qa.selectedSeats ?? 0} seats × $${Number(ap.value).toFixed(2)}/seat/mo`}
                        {ap?.pricingModel === 'PERCENT_OF_PRODUCT' && `${Number(ap.value)}% of base product cost`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div
          className="text-center text-xs pt-4 border-t"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          Generated by PriceEngine · Quote ID {id} · This proposal is valid for 30 days from issue date.
        </div>
      </div>
    </div>
  );
}
