import { PrismaClient, Availability, PricingModel, TermLength } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('🌱 Seeding database...');

  // ── Product ──────────────────────────────────────────────────────────────
  const product = await prisma.product.upsert({
    where: { id: 'seed-product-001' },
    update: {},
    create: {
      id: 'seed-product-001',
      name: 'Acme Analytics Platform',
      description: 'Enterprise data analytics with real-time insights and AI-powered dashboards.',
    },
  });
  console.log(`  ✓ Product: ${product.name}`);

  // ── Tiers ────────────────────────────────────────────────────────────────
  const [starter, growth, enterprise] = await Promise.all([
    prisma.tier.upsert({
      where: { id: 'seed-tier-starter' },
      update: {},
      create: {
        id: 'seed-tier-starter',
        productId: product.id,
        name: 'Starter',
        basePrice: 29,
        description: 'For small teams getting started with analytics.',
      },
    }),
    prisma.tier.upsert({
      where: { id: 'seed-tier-growth' },
      update: {},
      create: {
        id: 'seed-tier-growth',
        productId: product.id,
        name: 'Growth',
        basePrice: 59,
        description: 'For scaling teams with advanced analytics needs.',
      },
    }),
    prisma.tier.upsert({
      where: { id: 'seed-tier-enterprise' },
      update: {},
      create: {
        id: 'seed-tier-enterprise',
        productId: product.id,
        name: 'Enterprise',
        basePrice: 99,
        description: 'For large organizations with full platform access.',
      },
    }),
  ]);
  console.log(`  ✓ Tiers: Starter ($29), Growth ($59), Enterprise ($99)`);

  // ── Features ─────────────────────────────────────────────────────────────
  const [apiAccess, sso, advancedReports, premiumSupport, dataExport] = await Promise.all([
    prisma.feature.upsert({ where: { id: 'seed-feature-api' }, update: {}, create: { id: 'seed-feature-api', productId: product.id, name: 'API Access', description: 'Programmatic access to platform data.' } }),
    prisma.feature.upsert({ where: { id: 'seed-feature-sso' }, update: {}, create: { id: 'seed-feature-sso', productId: product.id, name: 'SSO / SAML', description: 'Enterprise single sign-on integration.' } }),
    prisma.feature.upsert({ where: { id: 'seed-feature-reports' }, update: {}, create: { id: 'seed-feature-reports', productId: product.id, name: 'Advanced Reports', description: 'Custom report builder with scheduling.' } }),
    prisma.feature.upsert({ where: { id: 'seed-feature-support' }, update: {}, create: { id: 'seed-feature-support', productId: product.id, name: 'Priority Support', description: '24/7 dedicated support with 2-hour SLA.' } }),
    prisma.feature.upsert({ where: { id: 'seed-feature-export' }, update: {}, create: { id: 'seed-feature-export', productId: product.id, name: 'Data Export', description: 'Export to CSV, Excel, and BigQuery.' } }),
  ]);
  console.log(`  ✓ Features: API Access, SSO/SAML, Advanced Reports, Priority Support, Data Export`);

  // ── Feature Matrix ────────────────────────────────────────────────────────
  const matrixEntries = [
    // Starter Tier
    { tierId: starter.id, featureId: apiAccess.id, availability: 'PAID_ADD_ON' as Availability },
    { tierId: starter.id, featureId: sso.id, availability: 'NOT_AVAILABLE' as Availability },
    { tierId: starter.id, featureId: advancedReports.id, availability: 'NOT_AVAILABLE' as Availability },
    { tierId: starter.id, featureId: premiumSupport.id, availability: 'PAID_ADD_ON' as Availability },
    { tierId: starter.id, featureId: dataExport.id, availability: 'INCLUDED' as Availability },
    // Growth Tier
    { tierId: growth.id, featureId: apiAccess.id, availability: 'INCLUDED' as Availability },
    { tierId: growth.id, featureId: sso.id, availability: 'PAID_ADD_ON' as Availability },
    { tierId: growth.id, featureId: advancedReports.id, availability: 'INCLUDED' as Availability },
    { tierId: growth.id, featureId: premiumSupport.id, availability: 'PAID_ADD_ON' as Availability },
    { tierId: growth.id, featureId: dataExport.id, availability: 'INCLUDED' as Availability },
    // Enterprise Tier
    { tierId: enterprise.id, featureId: apiAccess.id, availability: 'INCLUDED' as Availability },
    { tierId: enterprise.id, featureId: sso.id, availability: 'INCLUDED' as Availability },
    { tierId: enterprise.id, featureId: advancedReports.id, availability: 'INCLUDED' as Availability },
    { tierId: enterprise.id, featureId: premiumSupport.id, availability: 'INCLUDED' as Availability },
    { tierId: enterprise.id, featureId: dataExport.id, availability: 'INCLUDED' as Availability },
  ];

  for (const entry of matrixEntries) {
    await prisma.featureMatrix.upsert({
      where: { tierId_featureId: { tierId: entry.tierId, featureId: entry.featureId } },
      update: { availability: entry.availability },
      create: entry,
    });
  }
  console.log(`  ✓ Feature Matrix: ${matrixEntries.length} entries`);

  // ── Add-On Pricings ────────────────────────────────────────────────────────
  const addOnEntries = [
    // Starter: API Access = PER_SEAT $10/seat
    { tierId: starter.id, featureId: apiAccess.id, pricingModel: 'PER_SEAT' as PricingModel, value: 10 },
    // Starter: Priority Support = FIXED_MONTHLY $200/mo
    { tierId: starter.id, featureId: premiumSupport.id, pricingModel: 'FIXED_MONTHLY' as PricingModel, value: 200 },
    // Growth: SSO = FIXED_MONTHLY $150/mo
    { tierId: growth.id, featureId: sso.id, pricingModel: 'FIXED_MONTHLY' as PricingModel, value: 150 },
    // Growth: Priority Support = PERCENT_OF_PRODUCT 10%
    { tierId: growth.id, featureId: premiumSupport.id, pricingModel: 'PERCENT_OF_PRODUCT' as PricingModel, value: 10 },
  ];

  for (const entry of addOnEntries) {
    await prisma.addOnPricing.upsert({
      where: { tierId_featureId: { tierId: entry.tierId, featureId: entry.featureId } },
      update: { pricingModel: entry.pricingModel, value: entry.value },
      create: entry,
    });
  }
  console.log(`  ✓ Add-On Pricings: ${addOnEntries.length} entries`);

  // ── Sample Quote ───────────────────────────────────────────────────────────
  const now = new Date();
  const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const quote = await prisma.quote.upsert({
    where: { id: 'seed-quote-001' },
    update: {},
    create: {
      id: 'seed-quote-001',
      customerName: 'TechCorp Inc.',
      quoteName: 'Annual Enterprise Growth Proposal',
      productId: product.id,
      tierId: growth.id,
      coreSeats: 25,
      termLength: 'ANNUAL' as TermLength,
      globalDiscount: 5,
      validUntil,
      quoteAddOns: {
        create: [
          { featureId: sso.id, selectedSeats: null },
          { featureId: premiumSupport.id, selectedSeats: null },
        ],
      },
    },
  });
  console.log(`  ✓ Sample Quote: ${quote.quoteName} → /quote/${quote.id}`);

  console.log('\n✅ Seed complete! Visit http://localhost:3000/admin to get started.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
