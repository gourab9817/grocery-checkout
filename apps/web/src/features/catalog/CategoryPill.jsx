const EMOJI = {
  all:        '🌿',
  vegetables: '🥦',
  fruits:     '🍊',
  dairy:      '🥛',
  staples:    '🌾',
  snacks:     '🫙',
  beverages:  '🍵',
};

export function CategoryPill({ category, active, onClick }) {
  const label = category === 'all' ? 'All Items' : category.charAt(0).toUpperCase() + category.slice(1);
  return (
    <button
      onClick={() => onClick(category)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
        border transition-all duration-300
        ${active
          ? 'bg-forest text-canvas border-forest shadow-soft'
          : 'bg-white text-forest/70 border-stone hover:border-sage hover:text-forest hover:bg-parchment'}
      `}
    >
      <span>{EMOJI[category] ?? '🛒'}</span>
      {label}
    </button>
  );
}
