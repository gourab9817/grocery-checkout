/**
 * useCart — global cart state backed by localStorage.
 * Provides add/remove/update quantity and live /quote polling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client.js';

function loadCart() {
  try {
    const raw = localStorage.getItem('ansrmart_cart');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(lines) {
  localStorage.setItem('ansrmart_cart', JSON.stringify(lines));
}

export function useCart() {
  const [lines, setLines] = useState(loadCart);
  const [couponCode, setCouponCode] = useState('');
  const [bill, setBill] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const debounceRef = useRef(null);

  // Persist to localStorage
  useEffect(() => {
    saveCart(lines);
  }, [lines]);

  // Live /quote whenever cart or coupon changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (lines.length === 0) {
      setBill(null);
      setQuoteError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await api.billing.quote({ lines, couponCode: couponCode || undefined });
        setBill(res.data);
      } catch (e) {
        setQuoteError(e.message);
      } finally {
        setQuoteLoading(false);
      }
    }, 350);
  }, [lines, couponCode]);

  const addItem = useCallback((item) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.id
            ? { ...l, quantity: item.unitType === 'weight' ? +(l.quantity + 0.5).toFixed(3) : l.quantity + 1 }
            : l
        );
      }
      return [...prev, { itemId: item.id, quantity: item.unitType === 'weight' ? 0.5 : 1, _meta: item }];
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }, []);

  const updateQty = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      setLines((prev) => prev.filter((l) => l.itemId !== itemId));
    } else {
      setLines((prev) =>
        prev.map((l) => (l.itemId === itemId ? { ...l, quantity } : l))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setCouponCode('');
    setBill(null);
  }, []);

  const itemCount = lines.reduce((s, l) => s + (l._meta?.unitType === 'weight' ? 1 : l.quantity), 0);

  return {
    lines,
    couponCode,
    setCouponCode,
    bill,
    quoteLoading,
    quoteError,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    itemCount,
  };
}
