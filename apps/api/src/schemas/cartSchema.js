/**
 * Zod schemas for cart-related requests.
 * These validate at the HTTP boundary — before any service call.
 * Bad input dies here; services never see malformed data.
 */

import { z } from 'zod';

const CartLineSchema = z.object({
  itemId: z.string().uuid({ message: 'itemId must be a valid UUID.' }),
  quantity: z
    .number({ required_error: 'quantity is required', invalid_type_error: 'quantity must be a number' })
    .positive({ message: 'quantity must be greater than zero' }),
});

export const QuoteRequestSchema = z.object({
  lines: z
    .array(CartLineSchema)
    .min(0), // empty cart allowed for /quote
  couponCode: z.string().max(50).optional(),
});

export const CheckoutRequestSchema = z.object({
  lines: z
    .array(CartLineSchema)
    .min(1, { message: 'Cannot checkout an empty cart. Add at least one item.' }),
  couponCode: z.string().max(50).optional(),
});
