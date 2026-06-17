import { createContext, useContext } from 'react';
import { useCart } from '../hooks/useCart.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const cart = useCart();
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext must be used inside <CartProvider>');
  return ctx;
}
