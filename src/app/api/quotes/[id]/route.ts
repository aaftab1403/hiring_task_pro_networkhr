import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
          include: {
            feature: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
