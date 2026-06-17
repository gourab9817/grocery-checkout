import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, Plus, Minus, Tag, AlertCircle,
  Receipt, ChevronRight, Loader2
} from 'lucide-react';
import { useCartContext } from '../../lib/cartContext.jsx';
import { api } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ShoppingBasket } from 'lucide-react';

export function CartPage() {
  const {
    lines, couponCode, setCouponCode,
    bill, quoteLoading, quoteError,
    removeItem, updateQty, clearCart,
    addItem,
  } = useCartContext();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [couponInput, setCouponInput] = useState(couponCode);
  const navigate = useNavigate();
  const toast = useToast();

  const handleApplyCoupon = () => setCouponCode(couponInput.toUpperCase().trim());

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await api.billing.checkout({
        lines: lines.map(({ itemId, quantity }) => ({ itemId, quantity })),
        couponCode: couponCode || undefined,
      });
      // Persist order ID to localStorage for the orders list
      const prev = JSON.parse(localStorage.getItem('ansrmart_orders') ?? '[]');
      localStorage.setItem('ansrmart_orders', JSON.stringify([res.data.orderId, ...prev].slice(0, 50)));
      clearCart();
      navigate(`/orders/${res.data.orderId}`, { state: { bill: res.data.bill } });
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <EmptyState
          icon={ShoppingBasket}
          title="Your cart is empty"
          description="Add some fresh groceries from the market and they'll show up here."
          action={<Link to="/" className="btn-primary">Browse the market</Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-forest/60 hover:text-forest transition-colors duration-200 mb-8">
        <ArrowLeft size={15} strokeWidth={1.5} />
        Back to market
      </Link>

      <h1 className="font-serif font-bold text-4xl text-forest mb-10">
        Your <em className="italic font-normal">basket</em>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* ── Line items ── */}
        <div className="flex flex-col gap-3">
          {lines.map((line) => {
            const item = line._meta ?? {};
            const isWeight = item.unitType === 'weight';
            const price = ((item.unitPrice ?? 0) / 100).toFixed(2);
            const total = ((item.unitPrice ?? 0) * line.quantity / 100).toFixed(2);

            return (
              <div key={line.itemId} className="card p-5 flex items-center gap-5">
                {/* Emoji icon */}
                <div className="w-14 h-14 rounded-2xl bg-parchment border border-stone flex items-center justify-center text-2xl flex-shrink-0">
                  {{ vegetables: '🥦', fruits: '🍊', dairy: '🥛', staples: '🌾', snacks: '🫙', beverages: '🍵' }[item.category] ?? '🛒'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-serif font-semibold text-forest truncate">{item.name}</p>
                  <p className="text-xs text-forest/50 mt-0.5">
                    ₹{price} {isWeight ? '/ kg' : '/ unit'}
                  </p>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (isWeight) {
                        const next = +(line.quantity - 0.5).toFixed(3);
                        next <= 0 ? removeItem(line.itemId) : updateQty(line.itemId, next);
                      } else {
                        line.quantity <= 1 ? removeItem(line.itemId) : updateQty(line.itemId, line.quantity - 1);
                      }
                    }}
                    className="w-8 h-8 rounded-full border border-stone flex items-center justify-center hover:bg-parchment transition-colors duration-200"
                  >
                    <Minus size={12} strokeWidth={2} />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold text-forest">
                    {isWeight ? `${line.quantity}kg` : line.quantity}
                  </span>
                  <button
                    onClick={() => addItem(item)}
                    className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-canvas hover:bg-terra transition-colors duration-200"
                  >
                    <Plus size={12} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Line total */}
                <div className="text-right flex-shrink-0 min-w-[70px]">
                  <p className="font-serif font-bold text-forest text-lg">₹{total}</p>
                </div>

                <button
                  onClick={() => removeItem(line.itemId)}
                  className="text-forest/30 hover:text-terra transition-colors duration-200"
                  aria-label="Remove item"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Bill summary ── */}
        <div className="card-parchment p-6 flex flex-col gap-5 sticky top-24">
          <h2 className="font-serif font-bold text-xl text-forest">Order Summary</h2>

          {/* Coupon input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
              <input
                type="text"
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                className="input pl-9 text-sm py-2.5"
              />
            </div>
            <button
              onClick={handleApplyCoupon}
              className="btn-secondary py-2 px-4 text-xs"
            >
              Apply
            </button>
          </div>

          {couponCode && (
            <div className="flex items-center justify-between text-xs">
              <span className="badge badge-sage">{couponCode} applied</span>
              <button onClick={() => { setCouponCode(''); setCouponInput(''); }} className="text-forest/40 hover:text-terra text-xs">
                Remove
              </button>
            </div>
          )}

          {quoteError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-terra/10 border border-terra/20 text-terra text-xs">
              <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
              {quoteError}
            </div>
          )}

          {/* Bill breakdown */}
          {bill && !quoteLoading && (
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="divider my-0" />

              <Row label="Subtotal" value={bill.subtotalFormatted} />

              {bill.discounts?.map((d) => (
                <Row key={d.offerId} label={`🎉 ${d.offerName}`} value={`-${d.amountSavedFormatted}`} color="text-sage" />
              ))}

              {bill.taxBreakdown?.map((r) => (
                <Row
                  key={r.rateBps}
                  label={`GST ${r.ratePercent}%`}
                  value={r.taxAmountFormatted}
                  small
                />
              ))}

              <div className="divider my-0" />

              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-lg text-forest">Total</span>
                <span className="font-serif font-bold text-2xl text-forest">{bill.grandTotalFormatted}</span>
              </div>

              {/* Skipped offers callout */}
              {bill.skippedOffers?.length > 0 && (
                <div className="mt-2 p-3 rounded-2xl bg-clay/20 border border-clay/30">
                  <p className="text-xs font-semibold text-forest mb-1.5">
                    Unlock more savings 💡
                  </p>
                  {bill.skippedOffers.slice(0, 2).map((s) => (
                    <p key={s.offerId} className="text-[11px] text-forest/60 leading-relaxed">
                      {s.offerName}: {s.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {quoteLoading && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-sage" strokeWidth={1.5} />
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading || quoteLoading}
            className="btn-primary justify-center py-4 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {checkoutLoading ? (
              <Loader2 size={16} className="animate-spin" strokeWidth={1.5} />
            ) : (
              <Receipt size={16} strokeWidth={1.5} />
            )}
            {checkoutLoading ? 'Placing order…' : 'Place Order'}
            {bill && !checkoutLoading && (
              <ChevronRight size={14} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color = 'text-forest', small = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${small ? 'text-xs' : 'text-sm'} text-forest/60`}>{label}</span>
      <span className={`${small ? 'text-xs' : 'text-sm'} font-semibold ${color}`}>{value}</span>
    </div>
  );
}
