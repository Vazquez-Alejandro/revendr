import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Leads from './pages/Leads'
import Settings from './pages/Settings'
import Products from './pages/Products'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import Landing from './pages/public/Landing'
import Pricing from './pages/public/Pricing'
import PrivacyPolicy from './pages/public/PrivacyPolicy'
import TermsOfService from './pages/public/TermsOfService'
import Help from './pages/public/Help'
import Onboarding from './pages/public/Onboarding'
import DemoBooking from './pages/public/DemoBooking'
import DemoProperties from './pages/public/DemoProperties'
import DemoClinic from './pages/public/DemoClinic'
import DemoWhatsApp from './pages/public/DemoWhatsApp'
import DemoProductLanding from './pages/public/DemoProductLanding'
import CRM from './pages/CRM'
import OwnerPortal from './pages/OwnerPortal'
import ContentGenerator from './pages/ContentGenerator'

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/help" element={<Help />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Demo routes (public, no auth) */}
        <Route path="/demo/estetica/:demoId" element={<DemoBooking />} />
        <Route path="/demo/inmobiliaria/:demoId" element={<DemoProperties />} />
        <Route path="/demo/clinica/:demoId" element={<DemoClinic />} />
        <Route path="/demo/whatsapp/:demoId" element={<DemoWhatsApp />} />
        <Route path="/demo/producto/:productId" element={<DemoProductLanding />} />
        
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected admin routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<Products />} />
          <Route path="campanias" element={<Campaigns />} />
          <Route path="leads" element={<Leads />} />
          <Route path="crm" element={<CRM />} />
          <Route path="portal" element={<OwnerPortal />} />
          <Route path="contenido" element={<ContentGenerator />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
