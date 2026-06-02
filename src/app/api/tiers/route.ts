import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const TierSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  basePrice: z.number().positive('Base price must be positive'),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  try {
    const tiers = await prisma.tier.findMany({
      where: productId ? { productId } : undefined,
      include: {
        featureMatrix: { include: { feature: true } },
        addOnPricings: { include: { feature: true } },
      },
      orderBy: { basePrice: 'asc' },
    });
    return NextResponse.json(tiers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = TierSchema.parse(body);
    const tier = await prisma.tier.create({
      data: {
        ...validated,
        basePrice: validated.basePrice,
      },
    });
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create tier' }, { status: 500 });
  }
}
