import { PrismaClient, Availability, PricingModel, TermLength } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Stable UUIDs (deterministic for re-seeding) ──────────────────────────────
const IDS = {
  product:        '945fdf68-a2a2-4057-a8fa-d7d655013150',
  tierStarter:    '72d5957b-9199-40d9-a219-c7256a9cf894',
  tierGrowth:     'ddf3ec23-81f0-4941-96e0-1e84875a0f6c',
  tierEnterprise: '5999a006-4407-47fd-98f7-444a1996c892',
  featureApi:     '721bb20f-2483-4f67-8c69-8854626b2c95',
  featureSso:     'f7957cb0-86bc-4a88-a275-d9e6a29096e5',
  featureReports: '4a77d7a7-0322-4870-a8ce-41909c278b87',
  featureSupport: '2ab7bb53-ef52-4da5-b3d3-f88940b241a4',
  featureExport:  '4987ac37-9f7b-460a-b7c4-1f378f266a74',
  quote:          'd95fddd8-e28c-49dc-b5e2-7a167f5b12ec',
};

async function main() {
  console.log('🌱 Seeding database...');

  // ── Product ──────────────────────────────────────────────────────────────
  const product = await prisma.product.upsert({
    where: { id: IDS.product },
    update: {},
    create: {
      id: IDS.product,
      name: 'Acme Analytics Platform',
      description: 'Enterprise data analytics with real-time insights and AI-powered dashboards.',
    },
  });
  console.log(`  ✓ Product: ${product.name} (${product.id})`);

  // ── Tiers ────────────────────────────────────────────────────────────────
  const [starter, growth, enterprise] = await Promise.all([
    prisma.tier.upsert({
      where: { id: IDS.tierStarter },
      update: {},
      create: {
        id: IDS.tierStarter,
        productId: product.id,
        name: 'Starter',
        basePrice: 29,
        description: 'For small teams getting started with analytics.',
      },
    }),
    prisma.tier.upsert({
      where: { id: IDS.tierGrowth },
      update: {},
      create: {
        id: IDS.tierGrowth,
        productId: product.id,
        name: 'Growth',
        basePrice: 59,
        description: 'For scaling teams with advanced analytics needs.',
      },
    }),
    prisma.tier.upsert({
      where: { id: IDS.tierEnterprise },
      update: {},
      create: {
        id: IDS.tierEnterprise,
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
    prisma.feature.upsert({
      where: { id: IDS.featureApi },
      update: {},
      create: { id: IDS.featureApi, productId: product.id, name: 'API Access', description: 'Programmatic access to platform data.' },
    }),
    prisma.feature.upsert({
      where: { id: IDS.featureSso },
      update: {},
      create: { id: IDS.featureSso, productId: product.id, name: 'SSO / SAML', description: 'Enterprise single sign-on integration.' },
    }),
    prisma.feature.upsert({
      where: { id: IDS.featureReports },
      update: {},
      create: { id: IDS.featureReports, productId: product.id, name: 'Advanced Reports', description: 'Custom report builder with scheduling.' },
    }),
    prisma.feature.upsert({
      where: { id: IDS.featureSupport },
      update: {},
      create: { id: IDS.featureSupport, productId: product.id, name: 'Priority Support', description: '24/7 dedicated support with 2-hour SLA.' },
    }),
    prisma.feature.upsert({
      where: { id: IDS.featureExport },
      update: {},
      create: { id: IDS.featureExport, productId: product.id, name: 'Data Export', description: 'Export to CSV, Excel, and BigQuery.' },
    }),
  ]);
  console.log(`  ✓ Features: API Access, SSO/SAML, Advanced Reports, Priority Support, Data Export`);

  // ── Feature Matrix ────────────────────────────────────────────────────────
  const matrixEntries: Array<{ tierId: string; featureId: string; availability: Availability }> = [
    // Starter
    { tierId: starter.id, featureId: apiAccess.id,      availability: 'PAID_ADD_ON' },
    { tierId: starter.id, featureId: sso.id,            availability: 'NOT_AVAILABLE' },
    { tierId: starter.id, featureId: advancedReports.id,availability: 'NOT_AVAILABLE' },
    { tierId: starter.id, featureId: premiumSupport.id, availability: 'PAID_ADD_ON' },
    { tierId: starter.id, featureId: dataExport.id,     availability: 'INCLUDED' },
    // Growth
    { tierId: growth.id,  featureId: apiAccess.id,      availability: 'INCLUDED' },
    { tierId: growth.id,  featureId: sso.id,            availability: 'PAID_ADD_ON' },
    { tierId: growth.id,  featureId: advancedReports.id,availability: 'INCLUDED' },
    { tierId: growth.id,  featureId: premiumSupport.id, availability: 'PAID_ADD_ON' },
    { tierId: growth.id,  featureId: dataExport.id,     availability: 'INCLUDED' },
    // Enterprise
    { tierId: enterprise.id, featureId: apiAccess.id,      availability: 'INCLUDED' },
    { tierId: enterprise.id, featureId: sso.id,            availability: 'INCLUDED' },
    { tierId: enterprise.id, featureId: advancedReports.id,availability: 'INCLUDED' },
    { tierId: enterprise.id, featureId: premiumSupport.id, availability: 'INCLUDED' },
    { tierId: enterprise.id, featureId: dataExport.id,     availability: 'INCLUDED' },
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
  const addOnEntries: Array<{ tierId: string; featureId: string; pricingModel: PricingModel; value: number }> = [
    { tierId: starter.id, featureId: apiAccess.id,      pricingModel: 'PER_SEAT',           value: 10 },
    { tierId: starter.id, featureId: premiumSupport.id, pricingModel: 'FIXED_MONTHLY',       value: 200 },
    { tierId: growth.id,  featureId: sso.id,            pricingModel: 'FIXED_MONTHLY',       value: 150 },
    { tierId: growth.id,  featureId: premiumSupport.id, pricingModel: 'PERCENT_OF_PRODUCT',  value: 10 },
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
    where: { id: IDS.quote },
    update: {},
    create: {
      id: IDS.quote,
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
          { featureId: sso.id,            selectedSeats: null },
          { featureId: premiumSupport.id, selectedSeats: null },
        ],
      },
    },
  });
  console.log(`  ✓ Sample Quote: ${quote.quoteName}`);
  console.log(`    → http://localhost:3000/quote/${quote.id}`);

  console.log('\n✅ Seed complete! Visit http://localhost:3000/admin to get started.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
