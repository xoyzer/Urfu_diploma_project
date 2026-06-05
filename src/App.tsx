import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { CatalogPage } from './pages/CatalogPage';
import { CalculatorPage, CalculatorResult } from './pages/CalculatorPage';
import { ContactsPage } from './pages/ContactsPage';
import { OrderFormPage } from './pages/OrderFormPage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

const PAGE_STORAGE_KEY = 'paving_current_page';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<string>(() => {
    return localStorage.getItem(PAGE_STORAGE_KEY) || 'home';
  });
  const [orderData, setOrderData] = useState<CalculatorResult | undefined>();
  const { user, loading } = useAuth();

  useEffect(() => {
    localStorage.setItem(PAGE_STORAGE_KEY, currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === 'order-form' && !orderData) {
      setCurrentPage('calculator');
    }
  }, [currentPage, orderData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const handleNavigate = (page: string, clearOrder = false) => {
    if (clearOrder) {
      setOrderData(undefined);
    }
    setCurrentPage(page);
  };

  const handleCalculatorResult = (data: CalculatorResult) => {
    setOrderData(data);
    setCurrentPage('order-form');
  };

  const isAdminPage = currentPage === 'admin' || currentPage === 'login';

  return (
    <div className="min-h-screen bg-white">
      {!isAdminPage && <Header onNavigate={handleNavigate} />}

      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'about' && <AboutPage />}
      {currentPage === 'catalog' && <CatalogPage onNavigate={handleNavigate} />}
      {currentPage === 'calculator' && <CalculatorPage onNavigate={handleCalculatorResult} />}
      {currentPage === 'contacts' && <ContactsPage />}
      {currentPage === 'order-form' && <OrderFormPage orderData={orderData} onNavigate={handleNavigate} />}
      {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
      {currentPage === 'admin' && user ? <AdminDashboard onNavigate={handleNavigate} /> : null}

      {currentPage === 'admin' && !user && <LoginPage onNavigate={handleNavigate} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
