'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { calculateQuote, formatCurrency, TERM_CONFIG } from '@/lib/pricing';
import type { AddOnInput } from '@/lib/pricing';

type TermLength = 'MONTHLY' | 'ANNUAL' | 'TWO_YEAR';
type PricingModel = 'FIXED_MONTHLY' | 'PER_SEAT' | 'PERCENT_OF_PRODUCT';

interface Feature {
  id: string;
  name: string;
  description?: string;
}

interface Tier {
  id: string;
  name: string;
  basePrice: number;
  addOnPricings: Array<{
    featureId: string;
    pricingModel: PricingModel;
    value: number;
    feature: Feature;
  }>;
}

interface Product {
  id: string;
  name: string;
  tiers: Tier[];
}

interface Quote {
  id: string;
  customerName: string;
  quoteName: string;
  createdAt: string;
  validUntil: string;
  product: { name: string };
  tier: { name: string; basePrice: number };
  termLength: TermLength;
  coreSeats: number;
  globalDiscount: number;
}

// ─── Step Indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = ['Metadata', 'Product', 'Term', 'Add-Ons', 'Review'];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.slice(0, total).map((label, idx) => {
        const stepNum = idx + 1;
        const state = stepNum < current ? 'completed' : stepNum === current ? 'active' : 'pending';
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`step-dot ${state}`}>
                {state === 'completed' ? '✓' : stepNum}
              </div>
              <div
                className="text-xs mt-1 whitespace-nowrap"
                style={{ color: state === 'active' ? 'var(--accent-blue)' : 'var(--text-muted)' }}
              >
                {label}
              </div>
            </div>
            {idx < total - 1 && (
              <div
                className="h-px w-12 mx-1 mb-5"
                style={{
                  background: stepNum < current ? 'var(--accent-green)' : 'var(--border-default)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Quote Wizard Modal ─────────────────────────────────────────────────────────
function QuoteWizard({
  products,
  onClose,
  onCreated,
}: {
  products: Product[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;

  // Step 1: Metadata
  const [customerName, setCustomerName] = useState('');
  const [quoteName, setQuoteName] = useState('');

  // Step 2: Product / Tier / Seats
  const [productId, setProductId] = useState('');
  const [tierId, setTierId] = useState('');
  const [coreSeats, setCoreSeats] = useState(1);

  // Step 3: Term
  const [termLength, setTermLength] = useState<TermLength>('ANNUAL');

  // Step 4: Add-Ons
  const [selectedAddOns, setSelectedAddOns] = useState<
    Record<string, { selected: boolean; seats?: number }>
  >({});

  // Step 5: Discount
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedTier = selectedProduct?.tiers.find((t) => t.id === tierId);
  const paidAddOns = selectedTier?.addOnPricings ?? [];

  // Compute live preview
  const addOnInputs: AddOnInput[] = paidAddOns
    .filter((ap) => selectedAddOns[ap.featureId]?.selected)
    .map((ap) => ({
      featureId: ap.featureId,
      featureName: ap.feature.name,
      pricingModel: ap.pricingModel,
      value: ap.value,
      selectedSeats: ap.pricingModel === 'PER_SEAT' ? (selectedAddOns[ap.featureId]?.seats ?? 0) : undefined,
    }));

  const preview = selectedTier && step >= 3
    ? calculateQuote({
        coreSeats,
        tierBasePrice: Number(selectedTier.basePrice),
        termLength,
        globalDiscountPercent: globalDiscount,
        addOns: addOnInputs,
        tierName: selectedTier.name,
        productName: selectedProduct?.name ?? '',
      })
    : null;

  async function save() {
    setSaving(true);
    setError('');
    try {
      const addOnsPayload = paidAddOns
        .filter((ap) => selectedAddOns[ap.featureId]?.selected)
        .map((ap) => ({
          featureId: ap.featureId,
          selectedSeats: ap.pricingModel === 'PER_SEAT' ? (selectedAddOns[ap.featureId]?.seats ?? null) : null,
        }));

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          quoteName,
          productId,
          tierId,
          coreSeats,
          termLength,
          globalDiscount,
          addOns: addOnsPayload,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      onCreated();
      onClose();
    } catch {
      setError('Failed to save quote. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function canProceed() {
    if (step === 1) return customerName.trim() && quoteName.trim();
    if (step === 2) return productId && tierId && coreSeats > 0;
    if (step === 3) return !!termLength;
    return true;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '700px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            New Quote
          </h2>
          <button onClick={onClose} className="btn btn-ghost text-lg leading-none">×</button>
        </div>

        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* ─── Step 1: Metadata ─── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-sm font-700 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Step 1 — Quote Metadata
            </div>
            <div>
              <label className="label">Customer Name *</label>
              <input
                id="quote-customer-name"
                className="input"
                placeholder="e.g. Acme Corporation"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Proposal Name *</label>
              <input
                id="quote-name"
                className="input"
                placeholder="e.g. Q3 Enterprise Proposal"
                value={quoteName}
                onChange={(e) => setQuoteName(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {/* ─── Step 2: Product / Tier / Seats ─── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-sm font-700 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Step 2 — Product Configuration
            </div>
            <div>
              <label className="label">Product *</label>
              <select
                id="quote-product-select"
                className="select"
                value={productId}
                onChange={(e) => { setProductId(e.target.value); setTierId(''); setSelectedAddOns({}); }}
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {productId && (
              <div className="animate-fade-in">
                <label className="label">Tier *</label>
                <select
                  id="quote-tier-select"
                  className="select"
                  value={tierId}
                  onChange={(e) => { setTierId(e.target.value); setSelectedAddOns({}); }}
                >
                  <option value="">Select a tier…</option>
                  {selectedProduct?.tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — ${Number(t.basePrice).toFixed(2)}/seat/mo
                    </option>
                  ))}
                </select>
              </div>
            )}
            {tierId && (
              <div className="animate-fade-in">
                <label className="label">Core Seats *</label>
                <input
                  id="quote-core-seats"
                  className="input"
                  type="number"
                  min="1"
                  value={coreSeats}
                  onChange={(e) => setCoreSeats(parseInt(e.target.value) || 1)}
                />
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Term Length ─── */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="text-sm font-700 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Step 3 — Contract Term
            </div>
            <div className="space-y-3">
              {(Object.entries(TERM_CONFIG) as [TermLength, typeof TERM_CONFIG[TermLength]][]).map(([key, cfg]) => (
                <label
                  key={key}
                  className="flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${termLength === key ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                    background: termLength === key ? 'rgba(59,130,246,0.06)' : 'var(--bg-secondary)',
                  }}
                >
                  <input
                    type="radio"
                    name="termLength"
                    value={key}
                    checked={termLength === key}
                    onChange={() => setTermLength(key)}
                    className="checkbox"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-600" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {cfg.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {cfg.durationMonths} month{cfg.durationMonths !== 1 ? 's' : ''} duration
                    </div>
                  </div>
                  {cfg.termDiscount > 0 ? (
                    <span className="badge badge-green">{cfg.termDiscount * 100}% discount</span>
                  ) : (
                    <span className="badge badge-muted">No discount</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 4: Add-Ons ─── */}
        {step === 4 && (
          <div className="animate-fade-in">
            <div className="text-sm font-700 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Step 4 — Paid Add-Ons
            </div>
            {paidAddOns.length === 0 ? (
              <div
                className="p-6 rounded-lg text-center text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
              >
                No paid add-ons available for this tier.
              </div>
            ) : (
              <div className="space-y-3">
                {paidAddOns.map((ap) => {
                  const state = selectedAddOns[ap.featureId];
                  const isSelected = state?.selected ?? false;
                  return (
                    <div
                      key={ap.featureId}
                      className="p-4 rounded-lg transition-all"
                      style={{
                        border: `1px solid ${isSelected ? 'var(--accent-amber)' : 'var(--border-default)'}`,
                        background: isSelected ? 'rgba(245,158,11,0.04)' : 'var(--bg-secondary)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`addon-check-${ap.featureId}`}
                          className="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedAddOns((prev) => ({
                              ...prev,
                              [ap.featureId]: { ...prev[ap.featureId], selected: e.target.checked },
                            }));
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-600" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {ap.feature.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge badge-amber">{ap.pricingModel.replace('_', ' ')}</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {ap.pricingModel === 'FIXED_MONTHLY' && `$${Number(ap.value).toFixed(2)}/mo`}
                              {ap.pricingModel === 'PER_SEAT' && `$${Number(ap.value).toFixed(2)}/seat/mo`}
                              {ap.pricingModel === 'PERCENT_OF_PRODUCT' && `${Number(ap.value)}% of base`}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Per-seat allocation */}
                      {isSelected && ap.pricingModel === 'PER_SEAT' && (
                        <div className="mt-3 pl-7 animate-fade-in">
                          <label className="label">Add-On Seats (independent of core seats)</label>
                          <input
                            id={`addon-seats-${ap.featureId}`}
                            className="input"
                            type="number"
                            min="1"
                            placeholder="Number of seats for this add-on"
                            value={state?.seats ?? ''}
                            onChange={(e) => {
                              setSelectedAddOns((prev) => ({
                                ...prev,
                                [ap.featureId]: { ...prev[ap.featureId], seats: parseInt(e.target.value) || 0 },
                              }));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Global Discount */}
            <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <label className="label">Global Discount (%) — Optional</label>
              <input
                id="global-discount"
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 10 (= 10% off total)"
                value={globalDiscount || ''}
                onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        )}

        {/* ─── Step 5: Review ─── */}
        {step === 5 && preview && (
          <div className="animate-fade-in">
            <div className="text-sm font-700 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Step 5 — Review &amp; Confirm
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Customer', value: customerName },
                { label: 'Proposal', value: quoteName },
                { label: 'Product', value: selectedProduct?.name ?? '' },
                { label: 'Tier', value: selectedTier?.name ?? '' },
                { label: 'Core Seats', value: coreSeats.toString() },
                { label: 'Term', value: TERM_CONFIG[termLength].label },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                  <div className="text-sm font-600" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* TCV Preview */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                <span className="text-xs font-700" style={{ color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  COST BREAKDOWN PREVIEW
                </span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Line Item</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lineItems.map((item, i) => (
                    <tr
                      key={i}
                      className={item.type === 'total' ? 'total-row' : ''}
                    >
                      <td>
                        <div style={{ color: item.type === 'total' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: item.type === 'total' ? 700 : 400 }}>
                          {item.name}
                        </div>
                        <div className="formula-block mt-1">{item.formula}</div>
                      </td>
                      <td className="text-right">
                        <span
                          style={{
                            color: item.type === 'total' ? 'var(--accent-blue)' :
                              item.type === 'discount' ? 'var(--accent-red)' :
                              'var(--text-primary)',
                            fontWeight: item.type === 'total' ? 700 : 400,
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
          </div>
        )}

        {error && (
          <div className="text-xs p-3 rounded mt-4" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6 pt-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {step > 1 && (
            <button className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              className="btn btn-primary flex-1"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue →
            </button>
          ) : (
            <button
              id="save-quote-btn"
              className="btn btn-success flex-1"
              disabled={saving}
              onClick={save}
            >
              {saving ? 'Saving Quote…' : '✓ Save Quote'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Quotes Page ───────────────────────────────────────────────────────────
export default function QuotesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, qRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/quotes'),
      ]);
      const [pData, qData] = await Promise.all([pRes.json(), qRes.json()]);
      // Fetch tiers with add-on pricings for each product
      const pWithTiers = await Promise.all(
        pData.map(async (p: { id: string; name: string }) => {
          const tRes = await fetch(`/api/tiers?productId=${p.id}`);
          const tiers = await tRes.json();
          return { ...p, tiers };
        })
      );
      setProducts(pWithTiers);
      setQuotes(qData);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs mb-1.5" style={{ color: 'var(--accent-amber)', letterSpacing: '0.1em' }}>
            ● QUOTE BUILDER
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            Quotes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Build transactional quotes with TCV calculations and shareable links.
          </p>
        </div>
        <button
          id="new-quote-btn"
          className="btn btn-success"
          onClick={() => setShowWizard(true)}
          disabled={products.length === 0}
        >
          + New Quote
        </button>
      </div>

      {products.length === 0 && !loading && (
        <div
          className="card p-4 mb-6 flex items-center gap-3"
          style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}
        >
          <span style={{ color: 'var(--accent-amber)' }}>⚠</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No products configured yet. Go to <strong>Products & Tiers</strong> to set up your catalog first.
          </span>
        </div>
      )}

      {/* Quotes Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-sm font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            All Quotes
          </span>
          <span className="badge badge-muted">{quotes.length} total</span>
        </div>

        {loading ? (
          <div className="p-8">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded" />)}
            </div>
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-4">📄</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No quotes yet. Create your first quote above.
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Proposal</th>
                <th>Customer</th>
                <th>Product / Tier</th>
                <th>Term</th>
                <th>Created</th>
                <th>Valid Until</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <div className="font-600" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {q.quoteName}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{q.customerName}</td>
                  <td>
                    <span className="badge badge-blue mr-1">{q.tier.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.product.name}</span>
                  </td>
                  <td>
                    <span className="badge badge-muted">
                      {TERM_CONFIG[q.termLength as TermLength]?.label ?? q.termLength}
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(q.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span
                      className="text-xs"
                      style={{
                        color: new Date(q.validUntil) < new Date() ? 'var(--accent-red)' : 'var(--accent-green)',
                      }}
                    >
                      {new Date(q.validUntil).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <button
                      id={`view-quote-${q.id}`}
                      className="btn btn-secondary text-xs py-1"
                      onClick={() => router.push(`/quote/${q.id}`)}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showWizard && (
        <QuoteWizard
          products={products}
          onClose={() => setShowWizard(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  );
}
