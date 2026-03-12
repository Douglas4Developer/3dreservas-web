import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import PublicLayout from './components/layout/PublicLayout'
import DashboardPage from './pages/admin/DashboardPage'
import LeadsPage from './pages/admin/LeadsPage'
import LoginPage from './pages/admin/LoginPage'
import ReservationsPage from './pages/admin/ReservationsPage'
import ContractsPage from './pages/admin/ContractsPage'
import AvailabilityPage from './pages/public/AvailabilityPage'
import HomePage from './pages/public/HomePage'
import ReservationLookupPage from './pages/public/ReservationLookupPage'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/disponibilidade" element={<AvailabilityPage />} />
          <Route path="/minha-reserva/:token" element={<ReservationLookupPage />} />
        </Route>

        <Route path="/admin/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="reservas" element={<ReservationsPage />} />
            <Route path="contratos" element={<ContractsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
