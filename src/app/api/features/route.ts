import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const FeatureSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  try {
    const features = await prisma.feature.findMany({
      where: productId ? { productId } : undefined,
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(features);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch features' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = FeatureSchema.parse(body);
    const feature = await prisma.feature.create({ data: validated });
    return NextResponse.json(feature, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create feature' }, { status: 500 });
  }
}
