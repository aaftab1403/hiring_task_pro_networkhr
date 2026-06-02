import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addDays } from '@/lib/pricing';

const QuoteAddOnSchema = z.object({
  featureId: z.string().uuid(),
  selectedSeats: z.number().int().positive().optional().nullable(),
});

const QuoteSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  quoteName: z.string().min(1, 'Quote name is required'),
  productId: z.string().uuid(),
  tierId: z.string().uuid(),
  coreSeats: z.number().int().positive('Core seats must be positive'),
  termLength: z.enum(['MONTHLY', 'ANNUAL', 'TWO_YEAR']),
  globalDiscount: z.number().min(0).max(100).default(0),
  addOns: z.array(QuoteAddOnSchema).default([]),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '20');

  try {
    const quotes = await prisma.quote.findMany({
      include: {
        product: true,
        tier: true,
        quoteAddOns: { include: { feature: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return NextResponse.json(quotes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = QuoteSchema.parse(body);

    const createdAt = new Date();
    const validUntil = addDays(createdAt, 30);

    const quote = await prisma.quote.create({
      data: {
        customerName: validated.customerName,
        quoteName: validated.quoteName,
        productId: validated.productId,
        tierId: validated.tierId,
        coreSeats: validated.coreSeats,
        termLength: validated.termLength,
        globalDiscount: validated.globalDiscount,
        validUntil,
        quoteAddOns: {
          create: validated.addOns.map((a) => ({
            featureId: a.featureId,
            selectedSeats: a.selectedSeats ?? null,
          })),
        },
      },
      include: {
        product: true,
        tier: true,
        quoteAddOns: { include: { feature: true } },
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
