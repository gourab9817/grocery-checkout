import { z } from 'zod';

export const CreateCatalogItemSchema = z.object({
  name: z.string().min(1, 'name is required'),
  category: z.enum(['vegetables', 'fruits', 'dairy', 'staples', 'snacks', 'beverages']),
  unitType: z.enum(['unit', 'weight']),
  unitPrice: z.number().int().positive('unitPrice must be a positive integer (paise)'),
  gstRateBps: z.number().int().refine((v) => [0, 500, 1200, 1800].includes(v), {
    message: 'gstRateBps must be one of 0, 500, 1200, 1800',
  }),
  active: z.boolean().optional().default(true),
});

export const UpdateCatalogItemSchema = CreateCatalogItemSchema.partial();

export const CreateOfferSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['percentage_category', 'flat_cart_threshold', 'buy_x_get_y', 'coupon']),
  priority: z.number().int().min(0).optional().default(10),
  exclusive: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  params: z.record(z.unknown()),
});

export const UpdateOfferSchema = CreateOfferSchema.partial();

export const CreateCouponSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  name: z.string().min(1),
  percentBps: z.number().int().optional(),
  amountPaise: z.number().int().optional(),
  maxDiscountPaise: z.number().int().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
}).refine((d) => d.percentBps !== undefined || d.amountPaise !== undefined, {
  message: 'Either percentBps or amountPaise is required',
});
