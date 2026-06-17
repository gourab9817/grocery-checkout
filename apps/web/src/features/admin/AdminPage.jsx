import { useState, useEffect } from 'react';
import { Package, Tag, Ticket, Plus, Pencil, ToggleLeft, ToggleRight, LogIn, LogOut, AlertCircle, BadgePercent, BadgeDollarSign } from 'lucide-react';
import { api, getAuthToken, setAuthToken } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { AdminCatalogModal } from './AdminCatalogModal.jsx';
import { AdminOfferModal } from './AdminOfferModal.jsx';
import { AdminCouponModal } from './AdminCouponModal.jsx';

const TABS = [
  { id: 'catalog', label: 'Catalog',  icon: Package },
  { id: 'offers',  label: 'Offers',   icon: Tag },
  { id: 'coupons', label: 'Coupons',  icon: Ticket },
];

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.login({ email, password });
      setAuthToken(res.data.token);
      onLogin(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 px-6">
      <div className="text-center mb-10">
        <p className="section-eyebrow mb-2">Dashboard</p>
        <h1 className="font-serif font-bold text-4xl text-forest">
          Admin <em className="italic font-normal">login</em>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[24px] border border-stone shadow-soft p-8 flex flex-col gap-5">
        {error && (
          <div className="p-3 rounded-xl bg-terra/10 border border-terra/20 text-terra text-sm flex items-center gap-2">
            <AlertCircle size={15} strokeWidth={1.5} />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-forest/60 uppercase tracking-wider">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="input-field"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-forest/60 uppercase tracking-wider">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-field"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? <Spinner size={16} /> : <LogIn size={16} strokeWidth={2} />}
          Sign in
        </button>
      </form>
    </div>
  );
}

// ─── Main admin panel ─────────────────────────────────────────────────────────
export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(!!getAuthToken());
  const [tab, setTab] = useState('catalog');
  const [items, setItems] = useState([]);
  const [offers, setOffers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  function handleLogin() {
    setAuthenticated(true);
  }

  function handleLogout() {
    setAuthToken(null);
    setAuthenticated(false);
    setItems([]);
    setOffers([]);
  }

  async function loadData(t = tab) {
    setLoading(true);
    setError(null);
    try {
      if (t === 'catalog') {
        const res = await api.admin.catalog.list();
        setItems(res.data);
      } else if (t === 'offers') {
        const res = await api.admin.offers.list();
        setOffers(res.data);
      } else if (t === 'coupons') {
        const res = await api.admin.coupons.list();
        setCoupons(res.data);
      }
    } catch (e) {
      if (e.status === 401) {
        setAuthToken(null);
        setAuthenticated(false);
        return;
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) loadData(tab);
  }, [tab, authenticated]);

  if (!authenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="section-eyebrow mb-2">Dashboard</p>
          <h1 className="font-serif font-bold text-4xl text-forest">
            Admin <em className="italic font-normal">panel</em>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setModal({ type: tab })} className="btn-primary">
            <Plus size={16} strokeWidth={2.5} />
            Add {tab === 'catalog' ? 'Item' : tab === 'offers' ? 'Offer' : 'Coupon'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-stone text-forest/60 hover:text-forest hover:bg-parchment transition-all duration-200"
          >
            <LogOut size={15} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {TABS.map(({ id, label, icon: _TabIcon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border
              transition-all duration-300
              ${tab === id
                ? 'bg-forest text-canvas border-forest shadow-soft'
                : 'bg-white text-forest/70 border-stone hover:bg-parchment hover:text-forest'}
            `}
          >
            <_TabIcon size={15} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-terra/10 border border-terra/20 text-terra text-sm flex items-center gap-2">
          <AlertCircle size={16} strokeWidth={1.5} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24"><Spinner size={32} /></div>
      ) : tab === 'catalog' ? (
        <CatalogTable items={items} onToggle={handleToggle} onEdit={(i) => setModal({ type: 'catalog', data: i })} />
      ) : tab === 'offers' ? (
        <OffersTable offers={offers} onToggle={handleToggleOffer} onEdit={(o) => setModal({ type: 'offers', data: o })} />
      ) : (
        <CouponsTable coupons={coupons} onToggle={handleToggleCoupon} onCreate={() => setModal({ type: 'coupons' })} />
      )}

      {modal?.type === 'catalog' && (
        <AdminCatalogModal
          data={modal.data}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData('catalog'); }}
        />
      )}
      {modal?.type === 'offers' && (
        <AdminOfferModal
          data={modal.data}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData('offers'); }}
        />
      )}
      {modal?.type === 'coupons' && (
        <AdminCouponModal
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}
    </div>
  );

  async function handleToggle(item) {
    try {
      await api.admin.catalog.update(item.id, { active: !item.active });
      await loadData('catalog');
      toast(`${item.name} ${!item.active ? 'activated' : 'deactivated'}`);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleToggleOffer(offer) {
    try {
      await api.admin.offers.update(offer.id, { active: !offer.active });
      await loadData('offers');
      toast(`${offer.name} ${!offer.active ? 'activated' : 'deactivated'}`);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleToggleCoupon(coupon) {
    try {
      await api.admin.coupons.update(coupon.id, { active: !coupon.active });
      await loadData('coupons');
      toast(`${coupon.code} ${!coupon.active ? 'activated' : 'deactivated'}`);
    } catch (e) {
      toast(e.message, 'error');
    }
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CatalogTable({ items, onToggle, onEdit }) {
  return (
    <div className="bg-white rounded-[24px] border border-stone overflow-hidden shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone bg-parchment">
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Unit</Th>
            <Th>Price (₹)</Th>
            <Th>GST</Th>
            <Th>Status</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-stone/50 last:border-0 hover:bg-parchment/50 transition-colors duration-200">
              <Td><span className="font-medium text-forest">{item.name}</span></Td>
              <Td><span className="badge badge-clay capitalize">{item.category}</span></Td>
              <Td className="text-forest/60">{item.unitType}</Td>
              <Td className="font-serif font-semibold text-forest">₹{(item.unitPrice / 100).toFixed(2)}</Td>
              <Td className="text-forest/60">{item.gstRateBps / 100}%</Td>
              <Td>
                <button
                  onClick={() => onToggle(item)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${item.active ? 'text-sage' : 'text-forest/40'}`}
                >
                  {item.active ? <ToggleRight size={18} strokeWidth={1.5} /> : <ToggleLeft size={18} strokeWidth={1.5} />}
                  {item.active ? 'Active' : 'Inactive'}
                </button>
              </Td>
              <Td>
                <button onClick={() => onEdit(item)} className="text-forest/40 hover:text-forest transition-colors duration-200 p-1">
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OffersTable({ offers, onToggle, onEdit }) {
  return (
    <div className="bg-white rounded-[24px] border border-stone overflow-hidden shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone bg-parchment">
            <Th>Name</Th>
            <Th>Type</Th>
            <Th>Priority</Th>
            <Th>Exclusive</Th>
            <Th>Status</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id} className="border-b border-stone/50 last:border-0 hover:bg-parchment/50 transition-colors duration-200">
              <Td><span className="font-medium text-forest">{offer.name}</span></Td>
              <Td><span className="badge badge-sage font-mono text-[10px]">{offer.type}</span></Td>
              <Td className="text-forest/60">{offer.priority}</Td>
              <Td>{offer.exclusive ? <span className="badge badge-terra">Yes</span> : <span className="text-forest/30 text-xs">—</span>}</Td>
              <Td>
                <button
                  onClick={() => onToggle(offer)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${offer.active ? 'text-sage' : 'text-forest/40'}`}
                >
                  {offer.active ? <ToggleRight size={18} strokeWidth={1.5} /> : <ToggleLeft size={18} strokeWidth={1.5} />}
                  {offer.active ? 'Active' : 'Inactive'}
                </button>
              </Td>
              <Td>
                <button onClick={() => onEdit(offer)} className="text-forest/40 hover:text-forest transition-colors duration-200 p-1">
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CouponsTable({ coupons, onToggle }) {
  if (coupons.length === 0) {
    return (
      <div className="text-center py-20 text-forest/50">
        <Ticket size={40} strokeWidth={1} className="mx-auto mb-4 text-clay" />
        <p className="font-serif text-xl text-forest mb-2">No coupons yet</p>
        <p className="text-sm">Use the "Add Coupon" button to create your first code.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-[24px] border border-stone overflow-hidden shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone bg-parchment">
            <Th>Code</Th>
            <Th>Name</Th>
            <Th>Discount</Th>
            <Th>Max Discount</Th>
            <Th>Uses</Th>
            <Th>Expires</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => {
            const discountLabel = c.percentBps
              ? `${c.percentBps / 100}% off`
              : `₹${(c.amountPaise / 100).toFixed(0)} off`;
            const maxLabel = c.maxDiscountPaise
              ? `up to ₹${(c.maxDiscountPaise / 100).toFixed(0)}`
              : '—';
            const expiresLabel = c.validUntil
              ? new Date(c.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'No expiry';
            const usageLabel = c.maxUses ? `${c.usesCount} / ${c.maxUses}` : `${c.usesCount} used`;
            return (
              <tr key={c.id} className="border-b border-stone/50 last:border-0 hover:bg-parchment/50 transition-colors">
                <Td>
                  <span className="font-mono font-bold text-forest tracking-wider bg-parchment border border-stone px-2 py-0.5 rounded-lg text-xs">
                    {c.code}
                  </span>
                </Td>
                <Td><span className="font-medium text-forest">{c.name}</span></Td>
                <Td>
                  <span className={`flex items-center gap-1 font-semibold ${c.percentBps ? 'text-sage' : 'text-terra'}`}>
                    {c.percentBps ? <BadgePercent size={13} strokeWidth={1.5} /> : <BadgeDollarSign size={13} strokeWidth={1.5} />}
                    {discountLabel}
                  </span>
                </Td>
                <Td className="text-forest/60 text-xs">{maxLabel}</Td>
                <Td className="text-forest/60 text-xs">{usageLabel}</Td>
                <Td className="text-forest/60 text-xs">{expiresLabel}</Td>
                <Td>
                  <button
                    onClick={() => onToggle(c)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${c.active ? 'text-sage' : 'text-forest/40'}`}
                  >
                    {c.active ? <ToggleRight size={18} strokeWidth={1.5} /> : <ToggleLeft size={18} strokeWidth={1.5} />}
                    {c.active ? 'Active' : 'Inactive'}
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-wider uppercase text-forest/50">
      {children}
    </th>
  );
}

function Td({ children, className = '' }) {
  return <td className={`px-5 py-3.5 ${className}`}>{children}</td>;
}
