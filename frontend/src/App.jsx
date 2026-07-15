import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import GuidedChat from './components/GuidedChat'
import { Loader2 } from 'lucide-react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Leads = lazy(() => import('./pages/Leads'))
const Settings = lazy(() => import('./pages/Settings'))
const Products = lazy(() => import('./pages/Products'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Landing = lazy(() => import('./pages/public/Landing'))
const Pricing = lazy(() => import('./pages/public/Pricing'))
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/public/TermsOfService'))
const Help = lazy(() => import('./pages/public/Help'))
const UserGuide = lazy(() => import('./pages/public/UserGuide'))
const Support = lazy(() => import('./pages/public/Support'))
const StatusPage = lazy(() => import('./pages/public/StatusPage'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const DemoBooking = lazy(() => import('./pages/public/DemoBooking'))
const DemoProperties = lazy(() => import('./pages/public/DemoProperties'))
const DemoClinic = lazy(() => import('./pages/public/DemoClinic'))
const DemoWhatsApp = lazy(() => import('./pages/public/DemoWhatsApp'))
const DemoProductLanding = lazy(() => import('./pages/public/DemoProductLanding'))
const CRM = lazy(() => import('./pages/CRM'))
const OwnerPortal = lazy(() => import('./pages/OwnerPortal'))
const ContentGenerator = lazy(() => import('./pages/ContentGenerator'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Subscription = lazy(() => import('./pages/Subscription'))
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'))
const TeamManagement = lazy(() => import('./pages/TeamManagement'))
const AcceptInvite = lazy(() => import('./pages/public/AcceptInvite'))
const WhatsAppInbox = lazy(() => import('./pages/WhatsAppInbox'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/demo/:rubro/:demoId" element={<DemoProductLanding />} />

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
            <Route path="whatsapp" element={<WhatsAppInbox />} />
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
      </Suspense>
      <GuidedChat />
    </ErrorBoundary>
  )
}

export default App
