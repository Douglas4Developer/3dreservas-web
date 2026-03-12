import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import PublicLayout from './components/layout/PublicLayout'
import CalendarPage from './pages/admin/CalendarPage'
import ContractsPage from './pages/admin/ContractsPage'
import DashboardPage from './pages/admin/DashboardPage'
import LeadsPage from './pages/admin/LeadsPage'
import LoginPage from './pages/admin/LoginPage'
import MediaPage from './pages/admin/MediaPage'
import ReservationsPage from './pages/admin/ReservationsPage'
import AvailabilityPage from './pages/public/AvailabilityPage'
import ContractPage from './pages/public/ContractPage'
import GalleryPage from './pages/public/GalleryPage'
import HomePage from './pages/public/HomePage'
import HowItWorksPage from './pages/public/HowItWorksPage'
import ProposalPage from './pages/public/ProposalPage'
import ReservationLookupPage from './pages/public/ReservationLookupPage'
import SpacePage from './pages/public/SpacePage'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/espaco" element={<SpacePage />} />
          <Route path="/galeria" element={<GalleryPage />} />
          <Route path="/como-funciona" element={<HowItWorksPage />} />
          <Route path="/disponibilidade" element={<AvailabilityPage />} />
          <Route path="/minha-reserva/:token" element={<ReservationLookupPage />} />
          <Route path="/proposta/:token" element={<ProposalPage />} />
          <Route path="/contrato/:token" element={<ContractPage />} />
        </Route>

        <Route path="/admin/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="reservas" element={<ReservationsPage />} />
            <Route path="contratos" element={<ContractsPage />} />
            <Route path="midia" element={<MediaPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
