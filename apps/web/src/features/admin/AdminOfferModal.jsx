import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from './AdminCatalogModal.jsx';

const OFFER_TYPES = [
  'percentage_category',
  'flat_cart_threshold',
  'buy_x_get_y',
];

export function AdminOfferModal({ data, onClose, onSaved }) {
  const isEdit = !!data;
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name:      data?.name      ?? '',
    type:      data?.type      ?? 'flat_cart_threshold',
    priority:  data?.priority  ?? 10,
    exclusive: data?.exclusive ?? false,
    active:    data?.active    ?? true,
    params:    JSON.stringify(data?.params ?? {}, null, 2),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    let parsedParams;
    try {
      parsedParams = JSON.parse(form.params);
    } catch {
      toast('Params must be valid JSON', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        priority: Number(form.priority),
        exclusive: form.exclusive,
        active: form.active,
        params: parsedParams,
      };
      if (isEdit) {
        await api.admin.offers.update(data.id, payload);
      } else {
        await api.admin.offers.create(payload);
      }
      toast(`Offer ${isEdit ? 'updated' : 'created'}`);
      onSaved();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Offer' : 'New Offer'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="input-label">Name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 10% off Vegetables" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Type</label>
            <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {OFFER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Priority</label>
            <input className="input" type="number" min="0" value={form.priority} onChange={(e) => set('priority', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="input-label">Params (JSON)</label>
          <textarea
            className="input font-mono text-xs h-32 resize-none"
            value={form.params}
            onChange={(e) => set('params', e.target.value)}
          />
          <p className="text-[11px] text-forest/40 mt-1">
            e.g. {'{"amountPaise": 5000, "minCartTotal": 100000}'} for flat ₹50 off
          </p>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.exclusive} onChange={(e) => set('exclusive', e.target.checked)} className="w-4 h-4 rounded accent-sage" />
            <span className="text-sm text-forest">Exclusive</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="w-4 h-4 rounded accent-sage" />
            <span className="text-sm text-forest">Active</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={1.5} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
