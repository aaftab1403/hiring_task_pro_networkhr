import { PricingModel, TermLength } from '@prisma/client';

// ─── Term Configuration ────────────────────────────────────────────────────────
export interface TermConfig {
  durationMonths: number;
  termDiscount: number; // as a decimal, e.g. 0.15 = 15%
  label: string;
}

export const TERM_CONFIG: Record<TermLength, TermConfig> = {
  MONTHLY: { durationMonths: 1, termDiscount: 0.0, label: 'Monthly' },
  ANNUAL: { durationMonths: 12, termDiscount: 0.15, label: 'Annual (12 mo)' },
  TWO_YEAR: { durationMonths: 24, termDiscount: 0.25, label: '2-Year (24 mo)' },
};

// ─── Line Item ─────────────────────────────────────────────────────────────────
export interface PricingLineItem {
  name: string;
  formula: string;
  subtotal: number;
  type: 'base' | 'addon' | 'discount' | 'total';
}

// ─── Add-On Input ──────────────────────────────────────────────────────────────
export interface AddOnInput {
  featureId: string;
  featureName: string;
  pricingModel: PricingModel;
  value: number;
  selectedSeats?: number | null;
}

// ─── Quote Calculation Input ───────────────────────────────────────────────────
export interface QuoteCalculationInput {
  coreSeats: number;
  tierBasePrice: number; // USD per seat per month
  termLength: TermLength;
  globalDiscountPercent: number; // 0-100
  addOns: AddOnInput[];
  tierName: string;
  productName: string;
}

// ─── Quote Calculation Result ──────────────────────────────────────────────────
export interface QuoteCalculationResult {
  lineItems: PricingLineItem[];
  baseProductCost: number;
  addOnsCost: number;
  subtotal: number;
  globalDiscountAmount: number;
  finalTotal: number;
  termConfig: TermConfig;
}

// ─── Core Calculation Engine ───────────────────────────────────────────────────

/**
 * Calculate Base Product Cost
 * Formula: Core Seats × Tier Base Price × Duration Months × (1 − Term Discount)
 */
export function calculateBaseProductCost(
  coreSeats: number,
  tierBasePrice: number,
  durationMonths: number,
  termDiscount: number
): number {
  return coreSeats * tierBasePrice * durationMonths * (1 - termDiscount);
}

/**
 * Calculate Add-On Cost based on Pricing Model
 * - FIXED_MONTHLY: value × durationMonths
 * - PER_SEAT: selectedSeats × value × durationMonths
 * - PERCENT_OF_PRODUCT: (value / 100) × baseProductCost
 */
export function calculateAddOnCost(
  addon: AddOnInput,
  baseProductCost: number,
  durationMonths: number
): { cost: number; formula: string } {
  const { featureName, pricingModel, selectedSeats } = addon;
  // Coerce to number: Prisma Decimal serializes as string in JSON responses
  const value = Number(addon.value);

  switch (pricingModel) {
    case 'FIXED_MONTHLY': {
      const cost = value * durationMonths;
      return {
        cost,
        formula: `$${value.toFixed(2)}/mo × ${durationMonths} months`,
      };
    }
    case 'PER_SEAT': {
      const seats = selectedSeats ?? 0;
      const cost = seats * value * durationMonths;
      return {
        cost,
        formula: `${seats} seats × $${value.toFixed(2)}/seat/mo × ${durationMonths} months`,
      };
    }
    case 'PERCENT_OF_PRODUCT': {
      const cost = (value / 100) * baseProductCost;
      return {
        cost,
        formula: `${value}% × $${baseProductCost.toFixed(2)} (Base Product Cost)`,
      };
    }
  }
}

/**
 * Full TCV Quote Calculator
 * Produces line items with human-readable formulas for the public quote view.
 */
export function calculateQuote(input: QuoteCalculationInput): QuoteCalculationResult {
  const { termLength, addOns, tierName } = input;
  // Coerce all numeric inputs: Prisma Decimal and integer fields can arrive as strings from JSON
  const coreSeats = Number(input.coreSeats);
  const tierBasePrice = Number(input.tierBasePrice);
  const globalDiscountPercent = Number(input.globalDiscountPercent);

  const termConfig = TERM_CONFIG[termLength];
  const { durationMonths, termDiscount } = termConfig;

  // ── 1. Base Product ────────────────────────────────────────────────────────
  const baseProductCost = calculateBaseProductCost(
    coreSeats,
    tierBasePrice,
    durationMonths,
    termDiscount
  );

  const termDiscountPct = termDiscount * 100;
  const baseFormula =
    termDiscount > 0
      ? `${coreSeats} seats × $${tierBasePrice.toFixed(2)}/seat/mo × ${durationMonths} months × (1 − ${termDiscountPct}% term discount)`
      : `${coreSeats} seats × $${tierBasePrice.toFixed(2)}/seat/mo × ${durationMonths} months`;

  const lineItems: PricingLineItem[] = [
    {
      name: `${tierName} Plan — Base Product`,
      formula: baseFormula,
      subtotal: baseProductCost,
      type: 'base',
    },
  ];

  // ── 2. Add-Ons ─────────────────────────────────────────────────────────────
  let addOnsCost = 0;
  for (const addon of addOns) {
    const { cost, formula } = calculateAddOnCost(addon, baseProductCost, durationMonths);
    addOnsCost += cost;
    lineItems.push({
      name: `Add-On: ${addon.featureName}`,
      formula,
      subtotal: cost,
      type: 'addon',
    });
  }

  // ── 3. Subtotal & Global Discount ──────────────────────────────────────────
  const subtotal = baseProductCost + addOnsCost;
  const globalDiscountAmount = subtotal * (globalDiscountPercent / 100);
  const finalTotal = subtotal * (1 - globalDiscountPercent / 100);

  if (globalDiscountPercent > 0) {
    lineItems.push({
      name: `Global Discount (${globalDiscountPercent}%)`,
      formula: `−${globalDiscountPercent}% × $${subtotal.toFixed(2)} subtotal`,
      subtotal: -globalDiscountAmount,
      type: 'discount',
    });
  }

  lineItems.push({
    name: 'Total Contract Value (TCV)',
    formula: globalDiscountPercent > 0
      ? `$${subtotal.toFixed(2)} − $${globalDiscountAmount.toFixed(2)} discount`
      : `$${subtotal.toFixed(2)}`,
    subtotal: finalTotal,
    type: 'total',
  });

  return {
    lineItems,
    baseProductCost,
    addOnsCost,
    subtotal,
    globalDiscountAmount,
    finalTotal,
    termConfig,
  };
}

// ─── Formatting Utilities ──────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
