import { Plus, Minus, Weight, Package } from 'lucide-react';
import { useCartContext } from '../../lib/cartContext.jsx';

const CATEGORY_COLORS = {
  vegetables: { bg: 'bg-sage/10',  text: 'text-sage',   border: 'border-sage/20' },
  fruits:     { bg: 'bg-terra/10', text: 'text-terra',  border: 'border-terra/20' },
  dairy:      { bg: 'bg-clay/30',  text: 'text-forest', border: 'border-clay/50' },
  staples:    { bg: 'bg-parchment',text: 'text-forest', border: 'border-stone' },
  snacks:     { bg: 'bg-terra/10', text: 'text-terra',  border: 'border-terra/20' },
  beverages:  { bg: 'bg-sage/10',  text: 'text-sage',   border: 'border-sage/20' },
};

const CATEGORY_EMOJI = {
  vegetables: '🥦', fruits: '🍊', dairy: '🥛',
  staples: '🌾', snacks: '🫙', beverages: '🍵',
};

export function CatalogCard({ item, index }) {
  const { addItem, removeItem, updateQty, lines } = useCartContext();
  const line = lines.find((l) => l.itemId === item.id);
  const qty = line?.quantity ?? 0;
  const color = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.staples;
  const isWeight = item.unitType === 'weight';

  const priceRupees = (item.unitPrice / 100).toFixed(2);
  const unitLabel = isWeight ? '/kg' : '/unit';

  const handleAdd = () => addItem(item);
  const handleDec = () => {
    if (isWeight) {
      const next = +(qty - 0.5).toFixed(3);
      next <= 0 ? removeItem(item.id) : updateQty(item.id, next);
    } else {
      qty <= 1 ? removeItem(item.id) : updateQty(item.id, qty - 1);
    }
  };

  const stagger = index % 3 === 1 ? 'md:translate-y-6' : '';

  return (
    <div
      className={`
        card p-6 flex flex-col gap-4 group cursor-default
        transition-all duration-500
        ${stagger}
      `}
    >
      {/* Icon block */}
      <div className={`
        w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
        ${color.bg} border ${color.border}
        transition-transform duration-500 group-hover:scale-110
      `}>
        {CATEGORY_EMOJI[item.category] ?? '🛒'}
      </div>

      {/* Name + badge */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-serif font-semibold text-forest text-lg leading-tight">
            {item.name}
          </h3>
          <span className={`badge text-[10px] mt-0.5 flex-shrink-0 ${color.bg} ${color.text} ${color.border}`}>
            {item.category}
          </span>
        </div>

        {/* Unit type tag */}
        <div className="flex items-center gap-1.5 text-xs text-forest/50">
          {isWeight
            ? <><Weight size={11} strokeWidth={1.5} /> per kg</>
            : <><Package size={11} strokeWidth={1.5} /> per unit</>}
        </div>
      </div>

      {/* Price + GST */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="font-serif font-bold text-2xl text-forest">₹{priceRupees}</span>
          <span className="text-xs text-forest/40 ml-1">{unitLabel}</span>
        </div>
        {item.gstRateBps > 0 && (
          <span className="text-[10px] text-forest/40 font-medium">
            +{item.gstRateBps / 100}% GST
          </span>
        )}
      </div>

      {/* Add / Qty controls */}
      {qty === 0 ? (
        <button
          onClick={handleAdd}
          className="w-full btn-primary justify-center py-2.5 text-xs"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add to Cart
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleDec}
            className="w-10 h-10 rounded-full border border-stone flex items-center justify-center text-forest hover:bg-parchment hover:border-clay transition-all duration-200"
            aria-label="Decrease"
          >
            <Minus size={14} strokeWidth={2} />
          </button>

          <span className="flex-1 text-center font-semibold text-forest text-sm">
            {isWeight ? `${qty} kg` : qty}
          </span>

          <button
            onClick={handleAdd}
            className="w-10 h-10 rounded-full bg-forest flex items-center justify-center text-canvas hover:bg-terra transition-all duration-200"
            aria-label="Increase"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
