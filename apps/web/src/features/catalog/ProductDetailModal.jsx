import { X, Weight, Package, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useEffect } from 'react';
import { useCartContext } from '../../lib/cartContext.jsx';

const CATEGORY_COLORS = {
  vegetables: { bg: 'bg-sage/10',  text: 'text-sage',   border: 'border-sage/20' },
  fruits:     { bg: 'bg-terra/10', text: 'text-terra',  border: 'border-terra/20' },
  dairy:      { bg: 'bg-clay/30',  text: 'text-forest', border: 'border-clay/50' },
  staples:    { bg: 'bg-parchment',text: 'text-forest', border: 'border-stone' },
  snacks:     { bg: 'bg-terra/10', text: 'text-terra',  border: 'border-terra/20' },
  beverages:  { bg: 'bg-sage/10',  text: 'text-sage',   border: 'border-sage/20' },
};

export function ProductDetailModal({ item, onClose }) {
  const { addItem, removeItem, updateQty, lines } = useCartContext();
  const line = lines.find((l) => l.itemId === item.id);
  const qty = line?.quantity ?? 0;
  const isWeight = item.unitType === 'weight';
  const color = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.staples;

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

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const imgSrc = item.imageSlug ? `/images/${item.imageSlug}.jpg` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 bg-canvas rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden
                   animate-[fadeInUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-forest/60 hover:text-forest hover:bg-white transition-all duration-200 shadow-sm"
        >
          <X size={16} strokeWidth={2} />
        </button>

        {/* Image */}
        <div className={`relative w-full h-64 flex items-center justify-center ${color.bg}`}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={item.name}
              className="h-full w-full object-contain p-6"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div
            className={`text-7xl w-full h-full items-center justify-center ${imgSrc ? 'hidden' : 'flex'}`}
          >
            {item.category === 'fruits' ? '🍊' : item.category === 'vegetables' ? '🥦' : item.category === 'dairy' ? '🥛' : '🛒'}
          </div>
        </div>

        {/* Content */}
        <div className="p-7">
          {/* Category badge + name */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`badge text-[10px] ${color.bg} ${color.text} ${color.border} capitalize`}>
              {item.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-forest/40">
              {isWeight ? <><Weight size={11} strokeWidth={1.5} /> per kg</> : <><Package size={11} strokeWidth={1.5} /> per unit</>}
            </span>
          </div>

          <h2 className="font-serif font-bold text-2xl text-forest leading-tight mb-3">
            {item.name}
          </h2>

          {item.description && (
            <p className="text-sm text-forest/70 leading-relaxed mb-5">
              {item.description}
            </p>
          )}

          {/* Price row */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="font-serif font-bold text-3xl text-forest">
                ₹{(item.unitPrice / 100).toFixed(2)}
              </span>
              <span className="text-sm text-forest/40 ml-1">
                {isWeight ? '/kg' : '/unit'}
              </span>
            </div>
            {item.gstRateBps > 0 && (
              <span className="text-xs text-forest/40 font-medium">
                +{item.gstRateBps / 100}% GST
              </span>
            )}
          </div>

          {/* Cart controls */}
          {qty === 0 ? (
            <button onClick={handleAdd} className="w-full btn-primary justify-center py-3">
              <ShoppingCart size={16} strokeWidth={2} />
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={handleDec}
                className="w-11 h-11 rounded-full border border-stone flex items-center justify-center text-forest hover:bg-parchment transition-all duration-200"
              >
                <Minus size={16} strokeWidth={2} />
              </button>
              <span className="flex-1 text-center font-semibold text-forest text-lg">
                {isWeight ? `${qty} kg` : qty}
              </span>
              <button
                onClick={handleAdd}
                className="w-11 h-11 rounded-full bg-forest flex items-center justify-center text-canvas hover:bg-terra transition-all duration-200"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
