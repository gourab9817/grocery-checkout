import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from './AdminCatalogModal.jsx';

export function AdminCouponModal({ onClose, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [discountType, setDiscountType] = useState('percent');
  const [form, setForm] = useState({
    code:             '',
    name:             '',
    percentBps:       '',
    amountPaise:      '',
    maxDiscountPaise: '',
    validUntil:       '',
    maxUses:          '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast('Code and name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name,
        ...(discountType === 'percent'
          ? {
              percentBps: Math.round(parseFloat(form.percentBps) * 100),
              maxDiscountPaise: form.maxDiscountPaise ? Math.round(parseFloat(form.maxDiscountPaise) * 100) : undefined,
            }
          : {
              amountPaise: Math.round(parseFloat(form.amountPaise) * 100),
            }),
        validUntil: form.validUntil || undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      };
      await api.admin.coupons.create(payload);
      toast(`Coupon ${form.code} created`);
      onSaved();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Coupon" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Code</label>
            <input className="input font-mono uppercase" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="SAVE20" />
          </div>
          <div>
            <label className="input-label">Display Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="20% off everything" />
          </div>
        </div>

        {/* Discount type toggle */}
        <div>
          <label className="input-label">Discount Type</label>
          <div className="flex gap-2">
            {['percent', 'flat'].map((t) => (
              <button
                key={t}
                onClick={() => setDiscountType(t)}
                className={`flex-1 py-2 rounded-full text-sm border transition-all duration-200 ${discountType === t ? 'bg-forest text-canvas border-forest' : 'text-forest border-stone hover:bg-parchment'}`}
              >
                {t === 'percent' ? 'Percentage' : 'Flat Amount'}
              </button>
            ))}
          </div>
        </div>

        {discountType === 'percent' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Discount %</label>
              <input className="input" type="number" min="0" max="100" step="0.1" value={form.percentBps} onChange={(e) => set('percentBps', e.target.value)} placeholder="10" />
            </div>
            <div>
              <label className="input-label">Max Discount (₹)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.maxDiscountPaise} onChange={(e) => set('maxDiscountPaise', e.target.value)} placeholder="100" />
            </div>
          </div>
        ) : (
          <div>
            <label className="input-label">Flat Amount (₹)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.amountPaise} onChange={(e) => set('amountPaise', e.target.value)} placeholder="50" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Expires On</label>
            <input className="input" type="datetime-local" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Max Uses</label>
            <input className="input" type="number" min="1" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} placeholder="Unlimited" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={1.5} />}
          {saving ? 'Creating…' : 'Create Coupon'}
        </button>
      </div>
    </Modal>
  );
}
