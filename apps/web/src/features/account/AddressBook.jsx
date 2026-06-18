import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, Check, Pencil, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { Spinner } from '../../components/Spinner.jsx';
import { useUser } from '../../lib/userContext.jsx';

function AddressForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    label: initial.label ?? '',
    line1: initial.line1 ?? '',
    line2: initial.line2 ?? '',
    city: initial.city ?? '',
    state: initial.state ?? '',
    pincode: initial.pincode ?? '',
    phone: initial.phone ?? '',
    isDefault: initial.isDefault ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, required = false, type = 'text') => (
    <div>
      <label className="block text-xs text-forest/50 mb-1">{label}{required && ' *'}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        required={required}
        className="input"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {field('label', 'Label (e.g. Home, Office)')}
      {field('line1', 'Address Line 1', true)}
      {field('line2', 'Address Line 2')}
      <div className="grid grid-cols-2 gap-3">
        {field('city', 'City', true)}
        {field('state', 'State', true)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field('pincode', 'Pincode', true)}
        {field('phone', 'Phone', true, 'tel')}
      </div>
      <label className="flex items-center gap-2 text-sm text-forest/70 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
          className="w-4 h-4 rounded"
        />
        Set as default address
      </label>
      {error && <p className="text-xs text-terra">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-4">
          {saving ? <Spinner size={14} /> : <Check size={14} strokeWidth={1.5} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm py-2 px-4">
          <X size={14} strokeWidth={1.5} />
          Cancel
        </button>
      </div>
    </form>
  );
}

export function AddressBook({ onSelect, selectedId }) {
  const { user } = useUser();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.addresses.list().then((r) => r.data),
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['addresses'] });

  const createMut = useMutation({
    mutationFn: (data) => api.addresses.create(data),
    onSuccess: () => { invalidate(); setAdding(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.addresses.update(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.addresses.remove(id),
    onSuccess: invalidate,
  });

  if (!user) return null;
  if (isLoading) return <div className="flex justify-center py-6"><Spinner size={24} /></div>;

  return (
    <div className="flex flex-col gap-3">
      {addresses.map((addr) => (
        <div
          key={addr.id}
          className={`card p-4 transition-all duration-200 cursor-pointer ${
            selectedId === addr.id ? 'border-forest ring-1 ring-forest/20' : 'hover:shadow-lift'
          }`}
          onClick={() => onSelect?.(addr)}
        >
          {editingId === addr.id ? (
            <AddressForm
              initial={addr}
              onSave={(data) => updateMut.mutateAsync({ id: addr.id, data })}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-parchment border border-stone flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={14} strokeWidth={1.5} className="text-sage" />
                </div>
                <div className="min-w-0">
                  {addr.label && (
                    <p className="text-xs font-semibold text-forest/50 uppercase tracking-wide mb-0.5">{addr.label}</p>
                  )}
                  <p className="text-sm font-medium text-forest truncate">{addr.line1}</p>
                  {addr.line2 && <p className="text-xs text-forest/50">{addr.line2}</p>}
                  <p className="text-xs text-forest/50">{addr.city}, {addr.state} — {addr.pincode}</p>
                  <p className="text-xs text-forest/40 mt-0.5">{addr.phone}</p>
                  {addr.isDefault && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-sage/10 text-sage text-[10px] font-semibold">Default</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(addr.id); }}
                  className="p-1.5 rounded-lg hover:bg-stone text-forest/40 hover:text-forest transition-colors"
                >
                  <Pencil size={13} strokeWidth={1.5} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMut.mutate(addr.id); }}
                  className="p-1.5 rounded-lg hover:bg-terra/10 text-forest/40 hover:text-terra transition-colors"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="card p-4">
          <AddressForm
            onSave={(data) => createMut.mutateAsync(data)}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-forest/50 hover:text-forest py-2 px-3 rounded-xl border border-dashed border-stone hover:border-forest/30 transition-all duration-200"
        >
          <Plus size={14} strokeWidth={1.5} />
          Add new address
        </button>
      )}
    </div>
  );
}
