import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { BolisList } from './pages/Bolis/BolisList'
import { DonatePage } from './pages/Donate/DonatePage'
import { DonationsList } from './pages/Donations/DonationsList'
import { HomePage } from './pages/Home/HomePage'
import { LoginPage } from './pages/Login/LoginPage'
import { SantDetails } from './pages/Sant/SantDetails'
import { SantDirectory } from './pages/Sant/SantDirectory'
import { NotificationsPage } from './pages/Notifications/NotificationsPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { ReceiptPage } from './pages/Receipt/ReceiptPage'
import { RegisterPage } from './pages/Register/RegisterPage'
import { TempleDetails } from './pages/Temples/TempleDetails'
import { StaySearchPage } from './pages/Booking/StaySearchPage'
import { RoomBookingPage } from './pages/Booking/RoomBookingPage'
import { BookingTicketPage } from './pages/Booking/BookingTicketPage'
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

/**
 * WhatsApp template URL buttons carry one dynamic suffix, and Meta may
 * percent-encode slashes in it — so the "Download Receipt" button uses
 * `tenantId_donationId` in a single path segment. Expand it to the canonical
 * two-segment receipt URL ('_' never occurs inside a UUID).
 */
function ReceiptComboRedirect() {
  const { combo } = useParams()
  const [tenantId, donationId] = (combo ?? '').split('_')
  if (!tenantId || !donationId) return <Navigate to="/home" replace />
  return <Navigate to={`/receipts/${tenantId}/${donationId}`} replace />
}

function GuestOnly() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  return isLoggedIn ? <Navigate to="/home" replace /> : <Outlet />
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
            <Route path="/stays" element={<StaySearchPage />} />
            <Route path="/temples/:slug/book" element={<RoomBookingPage />} />
            <Route path="/bookings/:slug/:id" element={<BookingTicketPage />} />
            <Route path="/sant" element={<SantDirectory />} />
            <Route path="/sant/:id" element={<SantDetails />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Public receipt deep links (WhatsApp) — no login required; the two
            UUIDs in the URL are the access key and the API masks the PAN. */}
        <Route path="/receipts/:tenantId/:donationId" element={<ReceiptPage />} />
        <Route path="/receipts/:combo" element={<ReceiptComboRedirect />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
