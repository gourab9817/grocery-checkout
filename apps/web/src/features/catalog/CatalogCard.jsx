import { useState } from 'react';
import { Plus, Minus, Weight, Package } from 'lucide-react';
import { useCartContext } from '../../lib/cartContext.jsx';
import { ProductDetailModal } from './ProductDetailModal.jsx';

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
  const [showDetail, setShowDetail] = useState(false);

  const line = lines.find((l) => l.itemId === item.id);
  const qty = line?.quantity ?? 0;
  const color = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.staples;
  const isWeight = item.unitType === 'weight';

  const priceRupees = (item.unitPrice / 100).toFixed(2);
  const unitLabel = isWeight ? '/kg' : '/unit';
  const imgSrc = item.imageSlug ? `/images/${item.imageSlug}.jpg` : null;

  const handleAdd = (e) => { e.stopPropagation(); addItem(item); };
  const handleDec = (e) => {
    e.stopPropagation();
    if (isWeight) {
      const next = +(qty - 0.5).toFixed(3);
      next <= 0 ? removeItem(item.id) : updateQty(item.id, next);
    } else {
      qty <= 1 ? removeItem(item.id) : updateQty(item.id, qty - 1);
    }
  };

  const stagger = index % 3 === 1 ? 'md:translate-y-6' : '';

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className={`
          card p-5 flex flex-col gap-3 group cursor-pointer
          transition-all duration-500 hover:shadow-lg hover:-translate-y-1
          ${stagger}
        `}
      >
        {/* Product image */}
        <div className={`
          relative w-full h-36 rounded-2xl overflow-hidden flex items-center justify-center
          ${color.bg} border ${color.border}
        `}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={item.name}
              className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`absolute inset-0 text-4xl items-center justify-center ${imgSrc ? 'hidden' : 'flex'}`}
          >
            {CATEGORY_EMOJI[item.category] ?? '🛒'}
          </div>

          {/* Category badge overlay */}
          <span className={`absolute top-2 left-2 badge text-[9px] ${color.bg} ${color.text} ${color.border} backdrop-blur-sm`}>
            {item.category}
          </span>
        </div>

        {/* Name */}
        <div className="flex-1">
          <h3 className="font-serif font-semibold text-forest text-base leading-tight line-clamp-2">
            {item.name}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-xs text-forest/40">
            {isWeight
              ? <><Weight size={10} strokeWidth={1.5} /> per kg</>
              : <><Package size={10} strokeWidth={1.5} /> per unit</>}
          </div>
          {item.description && (
            <p className="text-xs text-forest/50 mt-1.5 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="font-serif font-bold text-xl text-forest">₹{priceRupees}</span>
            <span className="text-xs text-forest/40 ml-1">{unitLabel}</span>
          </div>
          {item.gstRateBps > 0 && (
            <span className="text-[10px] text-forest/40 font-medium">+{item.gstRateBps / 100}% GST</span>
          )}
        </div>

        {/* Cart controls */}
        {qty === 0 ? (
          <button
            onClick={handleAdd}
            className="w-full btn-primary justify-center py-2 text-xs"
          >
            <Plus size={13} strokeWidth={2.5} />
            Add to Cart
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleDec}
              className="w-9 h-9 rounded-full border border-stone flex items-center justify-center text-forest hover:bg-parchment hover:border-clay transition-all duration-200"
              aria-label="Decrease"
            >
              <Minus size={13} strokeWidth={2} />
            </button>
            <span className="flex-1 text-center font-semibold text-forest text-sm">
              {isWeight ? `${qty} kg` : qty}
            </span>
            <button
              onClick={handleAdd}
              className="w-9 h-9 rounded-full bg-forest flex items-center justify-center text-canvas hover:bg-terra transition-all duration-200"
              aria-label="Increase"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {showDetail && (
        <ProductDetailModal item={item} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}
