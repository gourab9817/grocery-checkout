import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './lib/cartContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { PaperGrain } from './components/PaperGrain.jsx';
import { Navbar } from './components/Navbar.jsx';

import { CatalogPage } from './features/catalog/CatalogPage.jsx';
import { CartPage } from './features/cart/CartPage.jsx';
import { OrderReceiptPage } from './features/bill/OrderReceiptPage.jsx';
import { OrdersPage } from './features/bill/OrdersPage.jsx';
import { AdminPage } from './features/admin/AdminPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          {/* Paper grain texture — the soul of the design */}
          <PaperGrain />

          {/* App shell */}
          <div className="min-h-screen bg-canvas">
            <Navbar />

            <main className="pb-32">
              <Routes>
                <Route path="/"           element={<CatalogPage />} />
                <Route path="/cart"       element={<CartPage />} />
                <Route path="/orders"     element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderReceiptPage />} />
                <Route path="/admin"      element={<AdminPage />} />
              </Routes>
            </main>
          </div>
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
