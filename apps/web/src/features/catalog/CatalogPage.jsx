import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBasket, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { CatalogCard } from './CatalogCard.jsx';
import { CategoryPill } from './CategoryPill.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { useCartContext } from '../../lib/cartContext.jsx';

const CATEGORIES = ['all', 'vegetables', 'fruits', 'dairy', 'staples', 'snacks', 'beverages'];

export function CatalogPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { itemCount, bill } = useCartContext();

  const cat = activeCategory === 'all' ? undefined : activeCategory;
  const { data, isLoading, error } = useQuery({
    queryKey: ['catalog', cat],
    queryFn: () => api.catalog.list(cat).then((r) => r.data),
  });
  const items = data ?? [];

  const filtered = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Hero header */}
      <div className="mb-12">
        <p className="section-eyebrow mb-3">Fresh & Natural</p>
        <h1 className="font-serif font-bold text-5xl md:text-6xl text-forest leading-tight">
          The Market,{' '}
          <em className="italic font-normal">curated</em>
          <br />
          <span className="text-3xl md:text-4xl text-forest/50 font-normal">
            for your kitchen
          </span>
        </h1>
      </div>

      {/* Search + offers banner */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            strokeWidth={1.5}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sage"
          />
          <input
            type="text"
            placeholder="Search vegetables, fruits…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>

        {bill?.discounts?.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-terra/10 border border-terra/20 text-terra text-sm font-medium">
            <Sparkles size={14} strokeWidth={1.5} />
            {bill.discounts.length} offer{bill.discounts.length > 1 ? 's' : ''} applied
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            category={cat}
            active={activeCategory === cat}
            onClick={setActiveCategory}
          />
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-32">
          <Spinner size={32} />
        </div>
      ) : error ? (
        <div className="text-center py-24 text-terra font-medium">{error.message}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Try a different category or clear your search."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-start">
          {filtered.map((item, i) => (
            <CatalogCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

      {/* Sticky cart CTA */}
      {itemCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center">
          <Link
            to="/cart"
            className="flex items-center gap-3 px-7 py-4 rounded-full bg-forest text-canvas font-medium text-sm shadow-bloom border border-forest/20 hover:bg-terra transition-all duration-300 hover:scale-105"
          >
            <ShoppingBasket size={18} strokeWidth={1.5} />
            <span>View Cart</span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-canvas/20 font-semibold text-xs">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
            {bill && (
              <span className="text-canvas/70 font-serif font-semibold text-base ml-1">
                {bill.grandTotalFormatted}
              </span>
            )}
          </Link>
        </div>
      )}
    </div>
  );
}
