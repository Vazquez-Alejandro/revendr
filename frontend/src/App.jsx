import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import GuidedChat from './components/GuidedChat'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Leads from './pages/Leads'
import Settings from './pages/Settings'
import Products from './pages/Products'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import Landing from './pages/public/Landing'
import Pricing from './pages/public/Pricing'
import PrivacyPolicy from './pages/public/PrivacyPolicy'
import TermsOfService from './pages/public/TermsOfService'
import Help from './pages/public/Help'
import UserGuide from './pages/public/UserGuide'
import Support from './pages/public/Support'
import StatusPage from './pages/public/StatusPage'
import Onboarding from './pages/Onboarding'
import DemoBooking from './pages/public/DemoBooking'
import DemoProperties from './pages/public/DemoProperties'
import DemoClinic from './pages/public/DemoClinic'
import DemoWhatsApp from './pages/public/DemoWhatsApp'
import DemoProductLanding from './pages/public/DemoProductLanding'
import CRM from './pages/CRM'
import OwnerPortal from './pages/OwnerPortal'
import ContentGenerator from './pages/ContentGenerator'
import AdminPanel from './pages/AdminPanel'
import Subscription from './pages/Subscription'
import ClientDashboard from './pages/ClientDashboard'
import TeamManagement from './pages/TeamManagement'
import AcceptInvite from './pages/public/AcceptInvite'

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
        <Route path="/guide" element={<UserGuide />} />
        <Route path="/support" element={<Support />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* Demo routes (public, no auth) */}
        <Route path="/demo/estetica/:demoId" element={<DemoBooking />} />
        <Route path="/demo/inmobiliaria/:demoId" element={<DemoProperties />} />
        <Route path="/demo/clinica/:demoId" element={<DemoClinic />} />
        <Route path="/demo/whatsapp/:demoId" element={<DemoWhatsApp />} />
        <Route path="/demo/producto/:productId" element={<DemoProductLanding />} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/team/accept" element={<AcceptInvite />} />

        {/* Protected admin routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ClientDashboard />} />
          <Route path="productos" element={<Products />} />
          <Route path="campanias" element={<Campaigns />} />
          <Route path="leads" element={<Leads />} />
          <Route path="crm" element={<CRM />} />
          <Route path="portal" element={<OwnerPortal />} />
          <Route path="contenido" element={<ContentGenerator />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="team" element={<TeamManagement />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="settings" element={<Settings />} />
          <Route path="legacy" element={<Dashboard />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GuidedChat />
    </ErrorBoundary>
  )
}

export default App
