'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Metadata } from 'next';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Feature {
  id: string;
  name: string;
  description?: string;
}

interface Tier {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  tiers: Tier[];
  features: Feature[];
  _count: { quotes: number };
}

// ─── Product Form Modal ─────────────────────────────────────────────────────────
function ProductModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc }),
      });
      if (!res.ok) throw new Error('Failed to create product');
      onCreated();
      onClose();
    } catch (err) {
      setError('Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            + New Product
          </h2>
          <button onClick={onClose} className="btn btn-ghost text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Product Name *</label>
            <input
              id="product-name"
              className="input"
              placeholder="e.g. Acme Analytics Platform"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              id="product-description"
              className="input"
              placeholder="Brief product description..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
          {error && (
            <div className="text-xs p-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating…' : 'Create Product'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tier Form Modal ────────────────────────────────────────────────────────────
function TierModal({
  productId,
  onClose,
  onCreated,
}: {
  productId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, name, basePrice: parseFloat(basePrice), description: desc }),
      });
      if (!res.ok) throw new Error('Failed');
      onCreated();
      onClose();
    } catch {
      setError('Failed to create tier.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            + New Tier
          </h2>
          <button onClick={onClose} className="btn btn-ghost text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Tier Name *</label>
            <input
              id="tier-name"
              className="input"
              placeholder="e.g. Starter, Growth, Enterprise"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Base Price (USD / seat / month) *</label>
            <input
              id="tier-base-price"
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 49.00"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              id="tier-description"
              className="input"
              placeholder="Tier summary..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>
          {error && (
            <div className="text-xs p-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating…' : 'Add Tier'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Feature Form Modal ─────────────────────────────────────────────────────────
function FeatureModal({
  productId,
  onClose,
  onCreated,
}: {
  productId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, name, description: desc }),
      });
      if (!res.ok) throw new Error('Failed');
      onCreated();
      onClose();
    } catch {
      setError('Failed to add feature.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            + New Feature
          </h2>
          <button onClick={onClose} className="btn btn-ghost text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Feature Name *</label>
            <input
              id="feature-name"
              className="input"
              placeholder="e.g. API Access, SSO, Advanced Analytics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              id="feature-description"
              className="input"
              placeholder="What does this feature enable?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>
          {error && (
            <div className="text-xs p-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? 'Adding…' : 'Add Feature'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Product Detail Panel ───────────────────────────────────────────────────────
function ProductDetail({
  product,
  onRefresh,
}: {
  product: Product;
  onRefresh: () => void;
}) {
  const [showTierModal, setShowTierModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Tiers */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <span className="text-sm font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Pricing Tiers
            </span>
            <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              ({product.tiers.length})
            </span>
          </div>
          <button
            id={`add-tier-btn-${product.id}`}
            className="btn btn-primary text-xs py-1.5"
            onClick={() => setShowTierModal(true)}
          >
            + Add Tier
          </button>
        </div>
        {product.tiers.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No tiers yet. Add a Starter, Growth, or Enterprise tier.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Base Price</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {product.tiers.map((tier) => (
                <tr key={tier.id}>
                  <td>
                    <span className="badge badge-blue">{tier.name}</span>
                  </td>
                  <td>
                    <span className="font-600" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                      ${Number(tier.basePrice).toFixed(2)}
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                      /seat/mo
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{tier.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Features */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <span className="text-sm font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Feature Catalog
            </span>
            <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              ({product.features.length})
            </span>
          </div>
          <button
            id={`add-feature-btn-${product.id}`}
            className="btn btn-primary text-xs py-1.5"
            onClick={() => setShowFeatureModal(true)}
          >
            + Add Feature
          </button>
        </div>
        {product.features.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No features yet. Add features to configure in the matrix.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {product.features.map((feature) => (
                <tr key={feature.id}>
                  <td style={{ color: 'var(--text-primary)' }}>{feature.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{feature.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showTierModal && (
        <TierModal
          productId={product.id}
          onClose={() => setShowTierModal(false)}
          onCreated={onRefresh}
        />
      )}
      {showFeatureModal && (
        <FeatureModal
          productId={product.id}
          onClose={() => setShowFeatureModal(false)}
          onCreated={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
      if (data.length > 0 && !selected) setSelected(data[0].id);
    } catch {}
    setLoading(false);
  }, [selected]);

  useEffect(() => { fetchProducts(); }, []);

  const selectedProduct = products.find((p) => p.id === selected);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs mb-1.5" style={{ color: 'var(--accent-blue)', letterSpacing: '0.1em' }}>
            ● CATALOG CONFIGURATOR
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            Products &amp; Tiers
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Create products, configure pricing tiers, and list features.
          </p>
        </div>
        <button
          id="create-product-btn"
          className="btn btn-primary"
          onClick={() => setShowProductModal(true)}
        >
          + New Product
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Product List */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="text-xs mb-2 px-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            PRODUCTS ({products.length})
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="card p-4 text-center">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No products yet.
              </div>
              <button
                className="btn btn-primary text-xs mt-3 w-full"
                onClick={() => setShowProductModal(true)}
              >
                Create First
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {products.map((p) => (
                <button
                  key={p.id}
                  id={`product-item-${p.id}`}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                    selected === p.id
                      ? 'border'
                      : 'hover:bg-opacity-50'
                  }`}
                  style={
                    selected === p.id
                      ? {
                          background: 'rgba(59,130,246,0.08)',
                          borderColor: 'var(--accent-blue)',
                          color: 'var(--accent-blue)',
                        }
                      : {
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }
                  }
                  onClick={() => setSelected(p.id)}
                >
                  <div className="font-600" style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {p.tiers.length} tier{p.tiers.length !== 1 ? 's' : ''} · {p.features.length} features
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 min-w-0">
          {selectedProduct ? (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {selectedProduct.name}
                  </h2>
                  {selectedProduct.description && (
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {selectedProduct.description}
                    </p>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="badge badge-muted">{selectedProduct._count.quotes} quotes</span>
                </div>
              </div>
              <ProductDetail product={selectedProduct} onRefresh={fetchProducts} />
            </div>
          ) : !loading ? (
            <div className="card p-12 text-center">
              <div className="text-2xl mb-4">📦</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Select a product to configure its tiers and features.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showProductModal && (
        <ProductModal
          onClose={() => setShowProductModal(false)}
          onCreated={fetchProducts}
        />
      )}
    </div>
  );
}
