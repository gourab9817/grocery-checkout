import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ChevronRight, CalendarDays } from 'lucide-react';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('ansrmart_orders') ?? '[]');
      setOrders(ids);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="flex justify-center py-32"><Spinner size={32} /></div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="section-eyebrow mb-3">History</p>
      <h1 className="font-serif font-bold text-4xl text-forest mb-10">
        Your <em className="italic font-normal">orders</em>
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No orders yet"
          description="Complete a checkout and your order receipts will appear here."
          action={<Link to="/" className="btn-primary">Start shopping</Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((id) => (
            <Link
              key={id}
              to={`/orders/${id}`}
              className="card p-5 flex items-center justify-between hover:shadow-lift group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-parchment border border-stone flex items-center justify-center">
                  <Receipt size={16} strokeWidth={1.5} className="text-sage" />
                </div>
                <div>
                  <p className="font-semibold text-forest text-sm">Order #{id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-forest/40 flex items-center gap-1 mt-0.5">
                    <CalendarDays size={11} strokeWidth={1.5} />
                    Tap to view receipt
                  </p>
                </div>
              </div>
              <ChevronRight
                size={18}
                strokeWidth={1.5}
                className="text-forest/30 group-hover:text-forest transition-all duration-300 group-hover:translate-x-1"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
