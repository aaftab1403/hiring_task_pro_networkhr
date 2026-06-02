import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const MatrixUpdateSchema = z.object({
  tierId: z.string().uuid(),
  featureId: z.string().uuid(),
  availability: z.enum(['INCLUDED', 'NOT_AVAILABLE', 'PAID_ADD_ON']),
  addOnPricing: z
    .object({
      pricingModel: z.enum(['FIXED_MONTHLY', 'PER_SEAT', 'PERCENT_OF_PRODUCT']),
      value: z.number().positive(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tierId = searchParams.get('tierId');
  const productId = searchParams.get('productId');

  try {
    const matrix = await prisma.featureMatrix.findMany({
      where: {
        ...(tierId ? { tierId } : {}),
        ...(productId ? { tier: { productId } } : {}),
      },
      include: {
        feature: true,
        tier: true,
      },
    });
    return NextResponse.json(matrix);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch feature matrix' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = MatrixUpdateSchema.parse(body);

    // Upsert the feature matrix entry
    const matrixEntry = await prisma.featureMatrix.upsert({
      where: {
        tierId_featureId: {
          tierId: validated.tierId,
          featureId: validated.featureId,
        },
      },
      create: {
        tierId: validated.tierId,
        featureId: validated.featureId,
        availability: validated.availability,
      },
      update: {
        availability: validated.availability,
      },
    });

    // Handle add-on pricing
    if (validated.availability === 'PAID_ADD_ON' && validated.addOnPricing) {
      await prisma.addOnPricing.upsert({
        where: {
          tierId_featureId: {
            tierId: validated.tierId,
            featureId: validated.featureId,
          },
        },
        create: {
          tierId: validated.tierId,
          featureId: validated.featureId,
          pricingModel: validated.addOnPricing.pricingModel,
          value: validated.addOnPricing.value,
        },
        update: {
          pricingModel: validated.addOnPricing.pricingModel,
          value: validated.addOnPricing.value,
        },
      });
    } else if (validated.availability !== 'PAID_ADD_ON') {
      // Remove add-on pricing if availability is no longer PAID_ADD_ON
      await prisma.addOnPricing
        .delete({
          where: {
            tierId_featureId: {
              tierId: validated.tierId,
              featureId: validated.featureId,
            },
          },
        })
        .catch(() => {}); // Ignore if not found
    }

    return NextResponse.json(matrixEntry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update feature matrix' }, { status: 500 });
  }
}
