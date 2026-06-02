import { describe, it, expect } from 'vitest';
import {
  calculateBaseProductCost,
  calculateAddOnCost,
  calculateQuote,
  TERM_CONFIG,
} from '../lib/pricing';
import type { AddOnInput, QuoteCalculationInput } from '../lib/pricing';

// ─── TERM CONFIG TESTS ─────────────────────────────────────────────────────────
describe('TERM_CONFIG', () => {
  it('MONTHLY has 1 month duration and 0% discount', () => {
    expect(TERM_CONFIG.MONTHLY.durationMonths).toBe(1);
    expect(TERM_CONFIG.MONTHLY.termDiscount).toBe(0.0);
  });

  it('ANNUAL has 12 months duration and 15% discount', () => {
    expect(TERM_CONFIG.ANNUAL.durationMonths).toBe(12);
    expect(TERM_CONFIG.ANNUAL.termDiscount).toBe(0.15);
  });

  it('TWO_YEAR has 24 months duration and 25% discount', () => {
    expect(TERM_CONFIG.TWO_YEAR.durationMonths).toBe(24);
    expect(TERM_CONFIG.TWO_YEAR.termDiscount).toBe(0.25);
  });
});

// ─── BASE PRODUCT COST TESTS ───────────────────────────────────────────────────
describe('calculateBaseProductCost', () => {
  it('MONTHLY: 10 seats × $50/seat/mo × 1 month × (1 - 0%) = $500', () => {
    const result = calculateBaseProductCost(10, 50, 1, 0.0);
    expect(result).toBeCloseTo(500, 2);
  });

  it('ANNUAL: 25 seats × $50/seat/mo × 12 months × (1 - 15%) = $12,750', () => {
    // 25 * 50 * 12 * 0.85 = 12750
    const result = calculateBaseProductCost(25, 50, 12, 0.15);
    expect(result).toBeCloseTo(12750, 2);
  });

  it('TWO_YEAR: 10 seats × $100/seat/mo × 24 months × (1 - 25%) = $18,000', () => {
    // 10 * 100 * 24 * 0.75 = 18000
    const result = calculateBaseProductCost(10, 100, 24, 0.25);
    expect(result).toBeCloseTo(18000, 2);
  });

  it('Single seat, $1/mo, 1 month, no discount = $1', () => {
    expect(calculateBaseProductCost(1, 1, 1, 0)).toBeCloseTo(1, 2);
  });

  it('handles fractional base prices correctly', () => {
    // 5 seats * $29.99 * 12 * 0.85 = 1529.49
    const result = calculateBaseProductCost(5, 29.99, 12, 0.15);
    expect(result).toBeCloseTo(1529.49, 1);
  });
});

// ─── ADD-ON PRICING MODEL TESTS ────────────────────────────────────────────────
describe('calculateAddOnCost - FIXED_MONTHLY', () => {
  const baseProductCost = 10000;

  it('FIXED_MONTHLY: $200/mo × 1 month = $200', () => {
    const addon: AddOnInput = {
      featureId: 'f1',
      featureName: 'Support SLA',
      pricingModel: 'FIXED_MONTHLY',
      value: 200,
    };
    const { cost, formula } = calculateAddOnCost(addon, baseProductCost, 1);
    expect(cost).toBeCloseTo(200, 2);
    expect(formula).toContain('$200.00/mo');
    expect(formula).toContain('1 months');
  });

  it('FIXED_MONTHLY: $200/mo × 12 months = $2,400', () => {
    const addon: AddOnInput = {
      featureId: 'f1',
      featureName: 'Support SLA',
      pricingModel: 'FIXED_MONTHLY',
      value: 200,
    };
    const { cost, formula } = calculateAddOnCost(addon, baseProductCost, 12);
    expect(cost).toBeCloseTo(2400, 2);
    expect(formula).toContain('12 months');
  });

  it('FIXED_MONTHLY: $500/mo × 24 months = $12,000', () => {
    const addon: AddOnInput = {
      featureId: 'f1',
      featureName: 'Priority Support',
      pricingModel: 'FIXED_MONTHLY',
      value: 500,
    };
    const { cost } = calculateAddOnCost(addon, baseProductCost, 24);
    expect(cost).toBeCloseTo(12000, 2);
  });
});

describe('calculateAddOnCost - PER_SEAT', () => {
  const baseProductCost = 10000;

  it('PER_SEAT: 5 seats × $15/seat × 1 month = $75 (independent of core seats)', () => {
    const addon: AddOnInput = {
      featureId: 'f2',
      featureName: 'API Access',
      pricingModel: 'PER_SEAT',
      value: 15,
      selectedSeats: 5,
    };
    const { cost, formula } = calculateAddOnCost(addon, baseProductCost, 1);
    expect(cost).toBeCloseTo(75, 2);
    expect(formula).toContain('5 seats');
    expect(formula).toContain('$15.00/seat/mo');
  });

  it('PER_SEAT: 10 seats × $25/seat × 12 months = $3,000', () => {
    const addon: AddOnInput = {
      featureId: 'f2',
      featureName: 'API Access',
      pricingModel: 'PER_SEAT',
      value: 25,
      selectedSeats: 10,
    };
    const { cost } = calculateAddOnCost(addon, baseProductCost, 12);
    expect(cost).toBeCloseTo(3000, 2);
  });

  it('PER_SEAT: 3 seats × $50/seat × 24 months = $3,600', () => {
    const addon: AddOnInput = {
      featureId: 'f2',
      featureName: 'Advanced Reports',
      pricingModel: 'PER_SEAT',
      value: 50,
      selectedSeats: 3,
    };
    const { cost } = calculateAddOnCost(addon, baseProductCost, 24);
    expect(cost).toBeCloseTo(3600, 2);
  });

  it('PER_SEAT with 0 seats returns $0', () => {
    const addon: AddOnInput = {
      featureId: 'f2',
      featureName: 'API Access',
      pricingModel: 'PER_SEAT',
      value: 25,
      selectedSeats: 0,
    };
    const { cost } = calculateAddOnCost(addon, baseProductCost, 12);
    expect(cost).toBe(0);
  });

  it('PER_SEAT add-on seats are independent of core seats', () => {
    // Core seats = 100, but add-on seats = 5 (user specified)
    const addon: AddOnInput = {
      featureId: 'f2',
      featureName: 'SSO',
      pricingModel: 'PER_SEAT',
      value: 10,
      selectedSeats: 5, // NOT 100 core seats
    };
    const { cost } = calculateAddOnCost(addon, baseProductCost, 12);
    // Must be 5 × $10 × 12 = 600, NOT 100 × $10 × 12
    expect(cost).toBeCloseTo(600, 2);
    expect(cost).not.toBeCloseTo(12000, 2);
  });
});

describe('calculateAddOnCost - PERCENT_OF_PRODUCT', () => {
  it('PERCENT_OF_PRODUCT: 10% of $10,000 base = $1,000', () => {
    const addon: AddOnInput = {
      featureId: 'f3',
      featureName: 'Premium Support',
      pricingModel: 'PERCENT_OF_PRODUCT',
      value: 10,
    };
    const { cost, formula } = calculateAddOnCost(addon, 10000, 12);
    expect(cost).toBeCloseTo(1000, 2);
    expect(formula).toContain('10%');
    expect(formula).toContain('$10000.00');
  });

  it('PERCENT_OF_PRODUCT: 15% of $12,750 (annual base) = $1,912.50', () => {
    // Annual base = 25 seats × $50 × 12 months × 0.85 = $12,750
    const base = calculateBaseProductCost(25, 50, 12, 0.15);
    const addon: AddOnInput = {
      featureId: 'f3',
      featureName: 'Managed Services',
      pricingModel: 'PERCENT_OF_PRODUCT',
      value: 15,
    };
    const { cost } = calculateAddOnCost(addon, base, 12);
    expect(cost).toBeCloseTo(1912.5, 2);
  });

  it('PERCENT_OF_PRODUCT: 5% of $0 base = $0', () => {
    const addon: AddOnInput = {
      featureId: 'f3',
      featureName: 'Test',
      pricingModel: 'PERCENT_OF_PRODUCT',
      value: 5,
    };
    const { cost } = calculateAddOnCost(addon, 0, 12);
    expect(cost).toBe(0);
  });
});

// ─── FULL QUOTE CALCULATION TESTS ─────────────────────────────────────────────
describe('calculateQuote - Full Integration', () => {
  const baseInput: QuoteCalculationInput = {
    coreSeats: 25,
    tierBasePrice: 50,
    termLength: 'ANNUAL',
    globalDiscountPercent: 0,
    addOns: [],
    tierName: 'Growth',
    productName: 'Acme Analytics',
  };

  it('ANNUAL, no add-ons, no discount: base product only', () => {
    const result = calculateQuote(baseInput);
    // 25 * 50 * 12 * 0.85 = 12750
    expect(result.baseProductCost).toBeCloseTo(12750, 2);
    expect(result.addOnsCost).toBe(0);
    expect(result.subtotal).toBeCloseTo(12750, 2);
    expect(result.finalTotal).toBeCloseTo(12750, 2);
    expect(result.globalDiscountAmount).toBe(0);
  });

  it('MONTHLY, no add-ons, no discount: 1-month TCV', () => {
    const result = calculateQuote({ ...baseInput, termLength: 'MONTHLY' });
    // 25 * 50 * 1 * 1.0 = 1250
    expect(result.baseProductCost).toBeCloseTo(1250, 2);
    expect(result.finalTotal).toBeCloseTo(1250, 2);
  });

  it('TWO_YEAR, no add-ons, no discount: 24-month TCV with 25% discount', () => {
    const result = calculateQuote({ ...baseInput, termLength: 'TWO_YEAR' });
    // 25 * 50 * 24 * 0.75 = 22500
    expect(result.baseProductCost).toBeCloseTo(22500, 2);
    expect(result.finalTotal).toBeCloseTo(22500, 2);
  });

  it('ANNUAL with FIXED_MONTHLY add-on: $200/mo × 12 months = $2,400 add-on', () => {
    const addOn: AddOnInput = {
      featureId: 'f1',
      featureName: 'Support SLA',
      pricingModel: 'FIXED_MONTHLY',
      value: 200,
    };
    const result = calculateQuote({ ...baseInput, addOns: [addOn] });
    expect(result.baseProductCost).toBeCloseTo(12750, 2);
    expect(result.addOnsCost).toBeCloseTo(2400, 2);
    expect(result.subtotal).toBeCloseTo(15150, 2);
    expect(result.finalTotal).toBeCloseTo(15150, 2);
  });

  it('ANNUAL with PER_SEAT add-on: 5 seats × $15 × 12 = $900 add-on', () => {
    const addOn: AddOnInput = {
      featureId: 'f2',
      featureName: 'API Access',
      pricingModel: 'PER_SEAT',
      value: 15,
      selectedSeats: 5,
    };
    const result = calculateQuote({ ...baseInput, addOns: [addOn] });
    expect(result.addOnsCost).toBeCloseTo(900, 2);
    expect(result.subtotal).toBeCloseTo(13650, 2);
  });

  it('ANNUAL with PERCENT_OF_PRODUCT add-on: 10% of $12,750 = $1,275 add-on', () => {
    const addOn: AddOnInput = {
      featureId: 'f3',
      featureName: 'Managed Services',
      pricingModel: 'PERCENT_OF_PRODUCT',
      value: 10,
    };
    const result = calculateQuote({ ...baseInput, addOns: [addOn] });
    expect(result.addOnsCost).toBeCloseTo(1275, 2);
    expect(result.subtotal).toBeCloseTo(14025, 2);
  });

  it('Global discount cascades on subtotal (base + all add-ons)', () => {
    // base = 12750, fixed add-on = 2400, subtotal = 15150, 10% off = 13635
    const addOn: AddOnInput = {
      featureId: 'f1',
      featureName: 'Support SLA',
      pricingModel: 'FIXED_MONTHLY',
      value: 200,
    };
    const result = calculateQuote({ ...baseInput, addOns: [addOn], globalDiscountPercent: 10 });
    expect(result.subtotal).toBeCloseTo(15150, 2);
    expect(result.globalDiscountAmount).toBeCloseTo(1515, 2);
    expect(result.finalTotal).toBeCloseTo(13635, 2);
  });

  it('Global discount 0% → finalTotal equals subtotal', () => {
    const result = calculateQuote({ ...baseInput, globalDiscountPercent: 0 });
    expect(result.finalTotal).toBeCloseTo(result.subtotal, 2);
    expect(result.globalDiscountAmount).toBe(0);
  });

  it('100% global discount → finalTotal = 0', () => {
    const result = calculateQuote({ ...baseInput, globalDiscountPercent: 100 });
    expect(result.finalTotal).toBeCloseTo(0, 2);
  });

  it('Multi-add-on scenario: FIXED + PER_SEAT + PERCENT_OF_PRODUCT', () => {
    const addOns: AddOnInput[] = [
      { featureId: 'f1', featureName: 'Support', pricingModel: 'FIXED_MONTHLY', value: 200 },
      { featureId: 'f2', featureName: 'API', pricingModel: 'PER_SEAT', value: 15, selectedSeats: 5 },
      { featureId: 'f3', featureName: 'Managed', pricingModel: 'PERCENT_OF_PRODUCT', value: 10 },
    ];
    const result = calculateQuote({ ...baseInput, addOns, globalDiscountPercent: 5 });
    // base: 12750
    // fixed: 200 * 12 = 2400
    // per-seat: 5 * 15 * 12 = 900
    // percent: 10% * 12750 = 1275
    // subtotal = 12750 + 2400 + 900 + 1275 = 17325
    // 5% off = 17325 * 0.95 = 16458.75
    expect(result.baseProductCost).toBeCloseTo(12750, 2);
    expect(result.addOnsCost).toBeCloseTo(4575, 2);
    expect(result.subtotal).toBeCloseTo(17325, 2);
    expect(result.finalTotal).toBeCloseTo(16458.75, 2);
  });

  it('produces correct line item types', () => {
    const addOn: AddOnInput = {
      featureId: 'f1',
      featureName: 'Support',
      pricingModel: 'FIXED_MONTHLY',
      value: 100,
    };
    const result = calculateQuote({ ...baseInput, addOns: [addOn], globalDiscountPercent: 10 });
    const types = result.lineItems.map((li) => li.type);
    expect(types).toContain('base');
    expect(types).toContain('addon');
    expect(types).toContain('discount');
    expect(types).toContain('total');
  });

  it('formula strings contain expected values for ANNUAL', () => {
    const result = calculateQuote(baseInput);
    const baseLine = result.lineItems.find((li) => li.type === 'base')!;
    expect(baseLine.formula).toContain('25 seats');
    expect(baseLine.formula).toContain('$50.00/seat/mo');
    expect(baseLine.formula).toContain('12 months');
    expect(baseLine.formula).toContain('15% term discount');
  });

  it('TWO_YEAR formula contains 24 months and 25% discount', () => {
    const result = calculateQuote({ ...baseInput, termLength: 'TWO_YEAR' });
    const baseLine = result.lineItems.find((li) => li.type === 'base')!;
    expect(baseLine.formula).toContain('24 months');
    expect(baseLine.formula).toContain('25% term discount');
  });

  it('MONTHLY formula has no discount text', () => {
    const result = calculateQuote({ ...baseInput, termLength: 'MONTHLY' });
    const baseLine = result.lineItems.find((li) => li.type === 'base')!;
    expect(baseLine.formula).not.toContain('discount');
  });
});
