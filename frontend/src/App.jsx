import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { DashboardLayout } from './components/layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Leads from './pages/Leads'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/public/Landing'
import Pricing from './pages/public/Pricing'
import DemoBooking from './pages/public/DemoBooking'
import DemoProperties from './pages/public/DemoProperties'
import DemoClinic from './pages/public/DemoClinic'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      
      {/* Demo routes (public, no auth) */}
      <Route path="/demo/estetica/:demoId" element={<DemoBooking />} />
      <Route path="/demo/inmobiliaria/:demoId" element={<DemoProperties />} />
      <Route path="/demo/clinica/:demoId" element={<DemoClinic />} />
      
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
        <Route path="campanias" element={<Campaigns />} />
        <Route path="leads" element={<Leads />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
