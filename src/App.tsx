import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { BolisList } from './pages/Bolis/BolisList'
import { DonatePage } from './pages/Donate/DonatePage'
import { DonationsList } from './pages/Donations/DonationsList'
import { HomePage } from './pages/Home/HomePage'
import { LoginPage } from './pages/Login/LoginPage'
import { MaharajDetails } from './pages/Maharaj/MaharajDetails'
import { MaharajDirectory } from './pages/Maharaj/MaharajDirectory'
import { NotificationsPage } from './pages/Notifications/NotificationsPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { ReceiptPage } from './pages/Receipt/ReceiptPage'
import { RegisterPage } from './pages/Register/RegisterPage'
import { TempleDetails } from './pages/Temples/TempleDetails'
import { TempleDirectory } from './pages/Temples/TempleDirectory'
import { useAuthStore } from './store/authStore'

function RequireAuth() {
  const { isLoggedIn, user } = useAuthStore()
  const location = useLocation()
  // Carry the URL the user actually wanted (e.g. a WhatsApp receipt deep link)
  // through login/registration, so LoginPage can send them back afterwards.
  const from = location.pathname + location.search
  if (!isLoggedIn) return <Navigate to="/login" state={{ from }} replace />
  // New user with no name — send to registration
  if (!user?.name) return <Navigate to="/register" state={{ from }} replace />
  return <Outlet />
}

function GuestOnly() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  return isLoggedIn ? <Navigate to="/home" replace /> : <Outlet />
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 text-sm">Loading JainERP™...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest only */}
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Registration — logged in but profile incomplete */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated — with bottom nav */}
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/donations" element={<DonationsList />} />
            <Route path="/bolis" element={<BolisList />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/temples" element={<TempleDirectory />} />
            <Route path="/temples/:slug" element={<TempleDetails />} />
            <Route path="/maharaj" element={<MaharajDirectory />} />
            <Route path="/maharaj/:id" element={<MaharajDetails />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/receipts/:tenantId/:donationId" element={<ReceiptPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
