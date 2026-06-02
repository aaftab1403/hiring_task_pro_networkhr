'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────
type Availability = 'INCLUDED' | 'NOT_AVAILABLE' | 'PAID_ADD_ON';
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
}

interface Product {
  id: string;
  name: string;
  tiers: Tier[];
  features: Feature[];
}

interface MatrixCell {
  availability: Availability;
  addOnPricing?: {
    pricingModel: PricingModel;
    value: number;
  };
}

type MatrixState = Record<string, Record<string, MatrixCell>>; // tierId -> featureId -> cell

const AVAILABILITY_OPTIONS: { value: Availability; label: string; badge: string }[] = [
  { value: 'INCLUDED', label: 'Included', badge: 'badge-green' },
  { value: 'NOT_AVAILABLE', label: 'Not Available', badge: 'badge-muted' },
  { value: 'PAID_ADD_ON', label: 'Paid Add-On', badge: 'badge-amber' },
];

const PRICING_MODEL_OPTIONS: { value: PricingModel; label: string; desc: string }[] = [
  { value: 'FIXED_MONTHLY', label: 'Fixed Monthly', desc: 'Flat fee per month' },
  { value: 'PER_SEAT', label: 'Per Seat', desc: 'Per seat per month' },
  { value: 'PERCENT_OF_PRODUCT', label: '% of Product', desc: 'Percentage of base product cost' },
];

// ─── Matrix Cell Editor ─────────────────────────────────────────────────────────
function CellEditor({
  tierId,
  featureId,
  tierName,
  featureName,
  cell,
  onUpdate,
  onClose,
}: {
  tierId: string;
  featureId: string;
  tierName: string;
  featureName: string;
  cell: MatrixCell;
  onUpdate: (cell: MatrixCell) => void;
  onClose: () => void;
}) {
  const [availability, setAvailability] = useState<Availability>(cell.availability);
  const [pricingModel, setPricingModel] = useState<PricingModel>(
    cell.addOnPricing?.pricingModel ?? 'FIXED_MONTHLY'
  );
  const [value, setValue] = useState<string>(
    cell.addOnPricing?.value?.toString() ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { tierId, featureId, availability };
      if (availability === 'PAID_ADD_ON') {
        if (!value || parseFloat(value) <= 0) {
          setError('Please enter a valid price value.');
          setSaving(false);
          return;
        }
        body.addOnPricing = { pricingModel, value: parseFloat(value) };
      }

      const res = await fetch('/api/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');

      const newCell: MatrixCell = {
        availability,
        addOnPricing:
          availability === 'PAID_ADD_ON'
            ? { pricingModel, value: parseFloat(value) }
            : undefined,
      };
      onUpdate(newCell);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              {tierName} × {featureName}
            </div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Configure Matrix Cell
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost text-lg leading-none">×</button>
        </div>

        {/* Availability Toggle */}
        <div className="mb-5">
          <label className="label">Availability</label>
          <div className="flex flex-col gap-2">
            {AVAILABILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  border: `1px solid ${availability === opt.value ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                  background: availability === opt.value ? 'rgba(59,130,246,0.06)' : 'var(--bg-secondary)',
                }}
              >
                <input
                  type="radio"
                  name="availability"
                  value={opt.value}
                  checked={availability === opt.value}
                  onChange={() => setAvailability(opt.value)}
                  className="checkbox"
                />
                <span className={`badge ${opt.badge}`}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Add-On Pricing Config */}
        {availability === 'PAID_ADD_ON' && (
          <div
            className="p-4 rounded-lg mb-5 space-y-4 animate-fade-in"
            style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <div className="text-xs font-600" style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
              ADD-ON PRICING CONFIGURATION
            </div>
            <div>
              <label className="label">Pricing Model</label>
              <select
                id="pricing-model-select"
                className="select"
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value as PricingModel)}
              >
                {PRICING_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                {pricingModel === 'PERCENT_OF_PRODUCT' ? 'Percentage (%)' : 'Price (USD)'}
              </label>
              <input
                id="addon-value"
                className="input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={pricingModel === 'PERCENT_OF_PRODUCT' ? 'e.g. 10 (= 10%)' : 'e.g. 25.00'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <div className="mt-1.5 formula-block">
                {pricingModel === 'FIXED_MONTHLY' && `$${value || '0'} × duration months`}
                {pricingModel === 'PER_SEAT' && `seats × $${value || '0'}/seat × duration months`}
                {pricingModel === 'PERCENT_OF_PRODUCT' && `${value || '0'}% × base product cost`}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="text-xs p-3 rounded mb-4"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={save} className="btn btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Save Cell'}
          </button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Cell Display ───────────────────────────────────────────────────────────────
function CellDisplay({ cell, onClick }: { cell: MatrixCell | undefined; onClick: () => void }) {
  const availability = cell?.availability ?? 'NOT_AVAILABLE';
  const config = AVAILABILITY_OPTIONS.find((o) => o.value === availability)!;

  return (
    <button
      className="w-full h-full p-2 rounded transition-all group text-center"
      style={{
        background: 'transparent',
        border: '1px solid transparent',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(59,130,246,0.06)';
        e.currentTarget.style.borderColor = 'var(--border-accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <span className={`badge ${config.badge} text-xs`}>
        {availability === 'INCLUDED' ? '✓ Included' :
          availability === 'PAID_ADD_ON' ? (
            <span>
              $ Add-On
              {cell?.addOnPricing && (
                <span className="ml-1 opacity-70">
                  {cell.addOnPricing.pricingModel === 'FIXED_MONTHLY' && `$${cell.addOnPricing.value}/mo`}
                  {cell.addOnPricing.pricingModel === 'PER_SEAT' && `$${cell.addOnPricing.value}/seat`}
                  {cell.addOnPricing.pricingModel === 'PERCENT_OF_PRODUCT' && `${cell.addOnPricing.value}%`}
                </span>
              )}
            </span>
          ) : '✗ N/A'}
      </span>
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function MatrixPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [matrix, setMatrix] = useState<MatrixState>({});
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ tierId: string; featureId: string } | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      const data: Product[] = await res.json();
      setProducts(data);
      if (data.length > 0) setSelectedProductId(data[0].id);
    } catch {}
    setLoading(false);
  }, []);

  const fetchMatrix = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/matrix?productId=${productId}`);
      const data: Array<{
        tierId: string;
        featureId: string;
        availability: Availability;
        addOnPricing?: { pricingModel: PricingModel; value: number };
      }> = await res.json();

      const newMatrix: MatrixState = {};
      // also load add-on pricings
      const tierRes = await fetch(`/api/tiers?productId=${productId}`);
      const tiers: Array<{ id: string; addOnPricings: Array<{ featureId: string; pricingModel: PricingModel; value: number }> }> = await tierRes.json();

      const addOnMap: Record<string, Record<string, { pricingModel: PricingModel; value: number }>> = {};
      tiers.forEach((t) => {
        addOnMap[t.id] = {};
        t.addOnPricings.forEach((ap) => {
          addOnMap[t.id][ap.featureId] = { pricingModel: ap.pricingModel, value: ap.value };
        });
      });

      data.forEach((entry) => {
        if (!newMatrix[entry.tierId]) newMatrix[entry.tierId] = {};
        newMatrix[entry.tierId][entry.featureId] = {
          availability: entry.availability,
          addOnPricing: addOnMap[entry.tierId]?.[entry.featureId],
        };
      });
      setMatrix(newMatrix);
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => {
    if (selectedProductId) fetchMatrix(selectedProductId);
  }, [selectedProductId]);

  function updateCell(tierId: string, featureId: string, cell: MatrixCell) {
    setMatrix((prev) => ({
      ...prev,
      [tierId]: { ...prev[tierId], [featureId]: cell },
    }));
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="skeleton h-8 w-48 mb-6 rounded" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs mb-1.5" style={{ color: 'var(--accent-green)', letterSpacing: '0.1em' }}>
            ● FEATURE MATRIX
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            Tier × Feature Matrix
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Click any cell to toggle availability or configure add-on pricing.
          </p>
        </div>

        {products.length > 0 && (
          <div>
            <label className="label mb-2">Product</label>
            <select
              id="matrix-product-select"
              className="select w-48"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedProduct ? (
        <div className="card p-12 text-center">
          <div className="text-3xl mb-4">⊞</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No products found. Create a product with tiers and features first.
          </div>
        </div>
      ) : selectedProduct.tiers.length === 0 || selectedProduct.features.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-3xl mb-4">⊞</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Add at least one tier and one feature to &ldquo;{selectedProduct.name}&rdquo; before configuring the matrix.
          </div>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4">
            {AVAILABILITY_OPTIONS.map((opt) => (
              <span key={opt.value} className={`badge ${opt.badge}`}>
                {opt.label}
              </span>
            ))}
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              Click a cell to configure
            </span>
          </div>

          {/* Matrix Grid */}
          <div className="card overflow-x-auto">
            <table className="table" style={{ minWidth: `${200 + selectedProduct.tiers.length * 180}px` }}>
              <thead>
                <tr>
                  <th style={{ width: '200px', minWidth: '200px' }}>Feature</th>
                  {selectedProduct.tiers.map((tier) => (
                    <th key={tier.id} className="text-center" style={{ minWidth: '160px' }}>
                      <div>{tier.name}</div>
                      <div className="font-normal mt-0.5" style={{ color: 'var(--accent-green)', fontWeight: 400 }}>
                        ${Number(tier.basePrice).toFixed(2)}/seat/mo
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedProduct.features.map((feature) => (
                  <tr key={feature.id}>
                    <td>
                      <div className="font-600" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {feature.name}
                      </div>
                      {feature.description && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {feature.description}
                        </div>
                      )}
                    </td>
                    {selectedProduct.tiers.map((tier) => (
                      <td key={tier.id} className="p-1">
                        <CellDisplay
                          cell={matrix[tier.id]?.[feature.id]}
                          onClick={() => setEditingCell({ tierId: tier.id, featureId: feature.id })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingCell && selectedProduct && (
        <CellEditor
          tierId={editingCell.tierId}
          featureId={editingCell.featureId}
          tierName={selectedProduct.tiers.find((t) => t.id === editingCell.tierId)?.name ?? ''}
          featureName={selectedProduct.features.find((f) => f.id === editingCell.featureId)?.name ?? ''}
          cell={matrix[editingCell.tierId]?.[editingCell.featureId] ?? { availability: 'NOT_AVAILABLE' }}
          onUpdate={(cell) => updateCell(editingCell.tierId, editingCell.featureId, cell)}
          onClose={() => setEditingCell(null)}
        />
      )}
    </div>
  );
}
