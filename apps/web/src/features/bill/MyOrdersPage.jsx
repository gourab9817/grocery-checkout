import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, ChevronRight, CalendarDays, Package, LogIn } from 'lucide-react';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { useUser } from '../../lib/userContext.jsx';
import { api } from '../../api/client.js';

export function MyOrdersPage() {
  const { user, setShowAuthModal } = useUser();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.users.myOrders()
      .then((res) => setOrders(res.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-32"><Spinner size={32} /></div>;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <EmptyState
          icon={LogIn}
          title="Sign in to see your orders"
          description="Create an account or sign in to track your order history."
          action={
            <button className="btn-primary" onClick={() => setShowAuthModal(true)}>
              Sign in
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="section-eyebrow mb-3">Account</p>
      <h1 className="font-serif font-bold text-4xl text-forest mb-2">
        My <em className="italic font-normal">orders</em>
      </h1>
      <p className="text-forest/50 text-sm mb-10">{user.email}</p>

      {error && (
        <div className="p-4 rounded-2xl bg-terra/10 border border-terra/20 text-terra text-sm mb-6">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Place your first order and it'll show up here."
          action={<Link to="/" className="btn-primary">Start shopping</Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const total = ((order.grand_total ?? 0) / 100).toFixed(2);
            const date = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            const itemCount = order.lines?.length ?? 0;

            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="card p-5 flex items-center justify-between hover:shadow-lift group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-parchment border border-stone flex items-center justify-center flex-shrink-0">
                    <Receipt size={16} strokeWidth={1.5} className="text-sage" />
                  </div>
                  <div>
                    <p className="font-semibold text-forest text-sm">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-forest/40 flex items-center gap-2 mt-0.5">
                      <CalendarDays size={11} strokeWidth={1.5} />
                      {date}
                      {itemCount > 0 && (
                        <span>· {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-serif font-bold text-forest">₹{total}</p>
                  <ChevronRight
                    size={18}
                    strokeWidth={1.5}
                    className="text-forest/30 group-hover:text-forest transition-all duration-300 group-hover:translate-x-1"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
