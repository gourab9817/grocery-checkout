/**
 * JSDoc typedefs — the canonical domain shapes.
 * These mirror CONTRACT.md exactly. Every module in the project codes against these.
 * (Generated from CONTRACT.md; if they diverge, CONTRACT.md wins.)
 */

/**
 * @typedef {'vegetables'|'fruits'|'dairy'|'staples'|'snacks'|'beverages'} Category
 */

/**
 * @typedef {'unit'|'weight'} UnitType
 */

/**
 * An item in the grocery catalog.
 * @typedef {Object} CatalogItem
 * @property {string}   id          - UUID
 * @property {string}   name        - e.g. "Amul Butter 500g"
 * @property {Category} category
 * @property {UnitType} unitType    - 'unit' → integer qty; 'weight' → decimal kg
 * @property {number}   unitPrice   - paise per unit or per kg (integer)
 * @property {number}   gstRateBps  - GST rate in basis points (e.g. 1200 = 12%)
 * @property {boolean}  active
 */

/**
 * A single line in the raw cart (references only — no embedded prices).
 * @typedef {Object} CartLine
 * @property {string} itemId
 * @property {number} quantity - positive integer for 'unit' items; positive decimal (≤3dp) for 'weight'
 */

/**
 * The raw cart as submitted by the customer.
 * @typedef {Object} Cart
 * @property {CartLine[]} lines
 * @property {string}    [couponCode] - optional Phase 2
 */

/**
 * A resolved cart line — cart joined to catalog, with line subtotal in paise.
 * @typedef {Object} ResolvedLine
 * @property {CatalogItem} item
 * @property {number}      quantity
 * @property {number}      lineSubtotal - paise (integer)
 */

/**
 * The billing context passed to offer and tax engines.
 * @typedef {Object} CartContext
 * @property {ResolvedLine[]}         lines
 * @property {Map<string,number>}     categorySubtotals  - category → paise
 * @property {number}                 subtotal           - paise (sum of lineSubtotals)
 */

/**
 * A discount produced by an offer rule.
 * @typedef {Object} Discount
 * @property {string} offerId
 * @property {string} label        - human name of the offer
 * @property {number} amountPaise  - paise saved (always ≥ 0)
 * @property {string} scope        - 'cart' | 'category:<name>' | 'line:<itemId>'
 */

/**
 * An offer that was evaluated but not applied (threshold not met or suppressed).
 * @typedef {Object} SkippedOffer
 * @property {string} offerId
 * @property {string} name
 * @property {string} reason  - human-readable reason (e.g. "Spend ₹40 more for ₹50 off")
 */

/**
 * One row in the tax breakdown (grouped by rate).
 * @typedef {Object} TaxBreakdownRow
 * @property {number} rateBps       - e.g. 1800 for 18%
 * @property {number} taxableBase   - paise
 * @property {number} taxAmount     - paise (integer, rounded half-up once)
 */

/**
 * The computed bill — the primary output artifact.
 * @typedef {Object} Bill
 * @property {Array<{name:string,unitPrice:number,quantity:number,lineSubtotal:number}>} lineItems
 * @property {number}             subtotal      - paise
 * @property {Discount[]}         discounts     - applied offers
 * @property {SkippedOffer[]}     skippedOffers - near-miss / suppressed offers
 * @property {number}             taxableAmount - paise (subtotal − totalDiscount)
 * @property {TaxBreakdownRow[]}  taxBreakdown
 * @property {number}             totalTax      - paise
 * @property {number}             grandTotal    - paise
 * @property {{ currency: string, computedAt: string }} meta
 */

/**
 * The strategy interface every offer rule must implement.
 * @typedef {Object} OfferRuleInterface
 * @property {string}   id
 * @property {string}   name
 * @property {string}   type       - matches the registry key
 * @property {number}   priority   - lower = applied first
 * @property {boolean}  exclusive  - if true, suppresses other exclusive rules
 * @property {Object}   params     - type-specific configuration (stored as DB JSON)
 * @property {function(CartContext): {eligible:boolean, reason:string}} isEligible
 * @property {function(CartContext): Discount[]} apply
 */

export {};
