import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './lib/cartContext.jsx';
import { UserProvider } from './lib/userContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { PaperGrain } from './components/PaperGrain.jsx';
import { Navbar } from './components/Navbar.jsx';
import { AuthModal } from './components/AuthModal.jsx';

import { CatalogPage } from './features/catalog/CatalogPage.jsx';
import { CartPage } from './features/cart/CartPage.jsx';
import { OrderReceiptPage } from './features/bill/OrderReceiptPage.jsx';
import { OrdersPage } from './features/bill/OrdersPage.jsx';
import { MyOrdersPage } from './features/bill/MyOrdersPage.jsx';
import { AdminPage } from './features/admin/AdminPage.jsx';
import { AddressBook } from './features/account/AddressBook.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <UserProvider>
          <CartProvider>
            {/* Paper grain texture — the soul of the design */}
            <PaperGrain />
            {/* Auth modal — rendered at root so it overlays everything */}
            <AuthModal />

            {/* App shell */}
            <div className="min-h-screen bg-canvas">
              <Navbar />

              <main className="pb-32">
                <Routes>
                  <Route path="/"           element={<CatalogPage />} />
                  <Route path="/cart"       element={<CartPage />} />
                  <Route path="/orders"     element={<OrdersPage />} />
                  <Route path="/orders/:id" element={<OrderReceiptPage />} />
                  <Route path="/my-orders"  element={<MyOrdersPage />} />
                  <Route path="/admin"      element={<AdminPage />} />
                  <Route path="/addresses"  element={
                    <div className="max-w-2xl mx-auto px-6 py-10">
                      <p className="section-eyebrow mb-3">Account</p>
                      <h1 className="font-serif font-bold text-4xl text-forest mb-8">
                        Delivery <em className="italic font-normal">addresses</em>
                      </h1>
                      <AddressBook />
                    </div>
                  } />
                </Routes>
              </main>
            </div>
          </CartProvider>
        </UserProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
