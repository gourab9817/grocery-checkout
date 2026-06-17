/**
 * Boundary validation helper.
 * Parses a Zod schema against request body and throws a ZodError
 * (which globalErrorHandler converts to the standard envelope).
 *
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} data
 * @returns {T}
 */
export function validate(schema, data) {
  return schema.parse(data);
}
