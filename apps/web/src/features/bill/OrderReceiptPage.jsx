import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle, ArrowLeft, ShoppingBasket, Printer,
  Receipt, Leaf
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Spinner } from '../../components/Spinner.jsx';

export function OrderReceiptPage() {
  const { id } = useParams();
  const location = useLocation();
  const passedBill = location.state?.bill ?? null;
  const [bill] = useState(passedBill);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!passedBill);

  useEffect(() => {
    if (!bill) {
      api.billing.getOrder(id).then((res) => {
        const raw = res.data;
        // Map DB snake_case row → display shape matching the bill format
        setOrder({
          lineItems: (raw.lines ?? []).map((l) => ({
            name: l.item_name,
            unitPrice: l.unit_price,
            unitType: l.unit_type,
            quantity: l.quantity,
            lineSubtotal: l.line_subtotal,
            lineSubtotalFormatted: `₹${(l.line_subtotal / 100).toFixed(2)}`,
          })),
          subtotal: raw.subtotal,
          subtotalFormatted: `₹${(raw.subtotal / 100).toFixed(2)}`,
          totalTax: raw.total_tax,
          totalTaxFormatted: `₹${(raw.total_tax / 100).toFixed(2)}`,
          grandTotal: raw.grand_total,
          grandTotalFormatted: `₹${(raw.grand_total / 100).toFixed(2)}`,
          discounts: (raw.discounts ?? []).map((d) => ({
            ...d,
            amountSavedFormatted: `₹${(d.amountPaise / 100).toFixed(2)}`,
          })),
          taxBreakdown: (raw.tax_breakdown ?? []).map((r) => ({
            ...r,
            ratePercent: r.rateBps / 100,
            taxableBaseFormatted: `₹${(r.taxableBase / 100).toFixed(2)}`,
            taxAmountFormatted: `₹${(r.taxAmount / 100).toFixed(2)}`,
          })),
          meta: { computedAt: raw.computed_at },
        });
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id, bill]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner size={32} />
      </div>
    );
  }

  const data = bill ?? order;
  if (!data) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-forest/60">Order not found.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Back to market</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Back */}
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-forest/60 hover:text-forest transition-colors mb-8">
        <ArrowLeft size={15} strokeWidth={1.5} />
        All orders
      </Link>

      {/* Success header */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={36} strokeWidth={1} className="text-sage" />
        </div>
        <h1 className="font-serif font-bold text-4xl text-forest mb-2">
          Order <em className="italic font-normal">confirmed</em>
        </h1>
        <p className="text-forest/50 text-sm font-mono">#{id?.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* Receipt card */}
      <div className="bg-white rounded-[28px] border border-stone shadow-card overflow-hidden print:shadow-none">
        {/* Header strip */}
        <div className="bg-parchment border-b border-stone px-7 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center">
            <Leaf size={13} strokeWidth={1.5} className="text-canvas" />
          </div>
          <div>
            <p className="font-serif font-bold text-forest text-sm">AnsrMart</p>
            <p className="text-[11px] text-forest/40">
              {bill?.meta?.computedAt
                ? new Date(bill.meta.computedAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Fresh & natural groceries'}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="ml-auto flex items-center gap-1.5 text-xs text-forest/50 hover:text-forest transition-colors duration-200"
          >
            <Printer size={14} strokeWidth={1.5} />
            Print
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          {/* Line items */}
          <div>
            <p className="section-eyebrow mb-3">Items</p>
            <div className="flex flex-col gap-2">
              {(data.lineItems ?? []).map((li, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-stone/50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-forest">{li.name}</p>
                    <p className="text-[11px] text-forest/40">
                      {li.unitType === 'weight'
                        ? `${li.quantity} kg × ₹${(li.unitPrice / 100).toFixed(2)}/kg`
                        : `${li.quantity} × ₹${(li.unitPrice / 100).toFixed(2)}`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-forest">{li.lineSubtotalFormatted}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Discounts */}
          {data.discounts?.length > 0 && (
            <div className="p-4 rounded-2xl bg-sage/5 border border-sage/20">
              <p className="section-eyebrow mb-2">Savings applied 🎉</p>
              {data.discounts.map((d) => (
                <div key={d.offerId} className="flex justify-between text-sm">
                  <span className="text-sage font-medium">{d.offerName}</span>
                  <span className="text-sage font-semibold">-{d.amountSavedFormatted}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tax breakdown */}
          {data.taxBreakdown?.length > 0 && (
            <div>
              <p className="section-eyebrow mb-2">Tax Breakdown</p>
              {data.taxBreakdown.map((r) => (
                <div key={r.rateBps} className="flex justify-between text-xs text-forest/60 py-0.5">
                  <span>GST {r.ratePercent}% on {r.taxableBaseFormatted}</span>
                  <span>{r.taxAmountFormatted}</span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="pt-3 border-t border-stone flex flex-col gap-2">
            <div className="flex justify-between text-sm text-forest/60">
              <span>Subtotal</span>
              <span>{data.subtotalFormatted}</span>
            </div>
            {data.discounts?.length > 0 && (
              <div className="flex justify-between text-sm text-sage font-semibold">
                <span>Total savings</span>
                <span>-{data.discounts.reduce
                  ? data.discounts[0]?.amountSavedFormatted
                  : ''}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-forest/60">
              <span>Tax (GST)</span>
              <span>{data.totalTaxFormatted}</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-stone mt-1">
              <span className="font-serif font-bold text-2xl text-forest">Total Paid</span>
              <span className="font-serif font-bold text-3xl text-forest">{data.grandTotalFormatted}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-parchment border-t border-stone px-7 py-4 text-center text-xs text-forest/40">
          Thank you for shopping fresh · AnsrMart
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-8 justify-center">
        <Link to="/" className="btn-secondary">
          <ShoppingBasket size={16} strokeWidth={1.5} />
          Shop again
        </Link>
        <Link to="/orders" className="btn-ghost">
          <Receipt size={16} strokeWidth={1.5} />
          All orders
        </Link>
      </div>
    </div>
  );
}
