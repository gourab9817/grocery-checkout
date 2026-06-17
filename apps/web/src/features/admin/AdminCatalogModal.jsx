import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useToast } from '../../components/Toast.jsx';

const CATEGORIES = ['vegetables', 'fruits', 'dairy', 'staples', 'snacks', 'beverages'];
const GST_RATES  = [0, 500, 1200, 1800];

export function AdminCatalogModal({ data, onClose, onSaved }) {
  const isEdit = !!data;
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name:        data?.name        ?? '',
    category:    data?.category    ?? 'vegetables',
    unitType:    data?.unitType    ?? 'unit',
    unitPrice:   data ? String(data.unitPrice / 100) : '',
    gstRateBps:  data?.gstRateBps  ?? 0,
    active:      data?.active      ?? true,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.unitPrice) {
      toast('Name and price are required', 'error');
      return;
    }
    const paise = Math.round(parseFloat(form.unitPrice) * 100);
    if (isNaN(paise) || paise <= 0) {
      toast('Enter a valid price', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        unitType: form.unitType,
        unitPrice: paise,
        gstRateBps: Number(form.gstRateBps),
        active: form.active,
      };
      if (isEdit) {
        await api.admin.catalog.update(data.id, payload);
      } else {
        await api.admin.catalog.create(payload);
      }
      toast(`${form.name} ${isEdit ? 'updated' : 'created'}`);
      onSaved();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Item' : 'New Catalog Item'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Organic Tomatoes" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Unit Type">
            <select className="input" value={form.unitType} onChange={(e) => set('unitType', e.target.value)}>
              <option value="unit">Unit</option>
              <option value="weight">Weight (kg)</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (₹)">
            <input className="input" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} placeholder="e.g. 45.00" />
          </Field>
          <Field label="GST Rate">
            <select className="input" value={form.gstRateBps} onChange={(e) => set('gstRateBps', e.target.value)}>
              {GST_RATES.map((r) => <option key={r} value={r}>{r / 100}% ({r} bps)</option>)}
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)}
            className="w-4 h-4 rounded accent-sage" />
          <span className="text-sm font-medium text-forest">Active (visible in catalog)</span>
        </label>
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

function Field({ label, children }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-forest/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[28px] border border-stone shadow-bloom w-full max-w-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif font-bold text-xl text-forest">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-parchment flex items-center justify-center transition-colors duration-200">
            <X size={16} strokeWidth={1.5} className="text-forest/60" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
