import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from '@/lib/authz'
import PageLoader from '@/components/ui/PageLoader'

// Lazy load all pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const EnrollPage = lazy(() => import('@/pages/enroll/EnrollPage'))
const SuccessPage = lazy(() => import('@/pages/enroll/SuccessPage'))

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminCadets = lazy(() => import('@/pages/admin/AdminCadets'))
const AdminOfficers = lazy(() => import('@/pages/admin/AdminOfficers'))
const AdminScanner = lazy(() => import('@/pages/admin/AdminScanner'))
const AdminSessions = lazy(() => import('@/pages/admin/AdminSessions'))
const AdminAttendance = lazy(() => import('@/pages/admin/AdminAttendance'))
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'))
const AdminDigitalIDs = lazy(() => import('@/pages/admin/AdminDigitalIDs'))
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'))
const AdminEnrollment = lazy(() => import('@/pages/admin/AdminEnrollment'))
const AdminBulkEnroll = lazy(() => import('@/pages/admin/AdminBulkEnroll'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminArchives = lazy(() => import('@/pages/admin/AdminArchives'))

// Officer pages
const OfficerDashboard = lazy(() => import('@/pages/officer/DashboardPage'))
const OfficerScanner = lazy(() => import('@/pages/officer/OfficerScanner'))
const OfficerPlatoon = lazy(() => import('@/pages/officer/OfficerPlatoon'))
const OfficerAttendance = lazy(() => import('@/pages/officer/OfficerAttendance'))
const OfficerCalendar = lazy(() => import('@/pages/officer/OfficerCalendar'))
const OfficerPullout = lazy(() => import('@/pages/officer/OfficerPullout'))
const OfficerDigitalID = lazy(() => import('@/pages/officer/OfficerDigitalID'))
const OfficerProfile = lazy(() => import('@/pages/officer/OfficerProfile'))

// Cadet pages
const CadetDashboard = lazy(() => import('@/pages/cadet/DashboardPage'))
const CadetAttendance = lazy(() => import('@/pages/cadet/CadetAttendance'))
const CadetCalendar = lazy(() => import('@/pages/cadet/CadetCalendar'))
const CadetDigitalID = lazy(() => import('@/pages/cadet/CadetDigitalID'))
const CadetProfile = lazy(() => import('@/pages/cadet/CadetProfile'))

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/enroll/:role" element={<EnrollPage />} />
        <Route path="/enroll/success" element={<SuccessPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']} />
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="cadets" element={<AdminCadets />} />
          <Route path="officers" element={<AdminOfficers />} />
          <Route path="scanner" element={<AdminScanner />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="digital-ids" element={<AdminDigitalIDs />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="enrollment" element={<AdminEnrollment />} />
          <Route path="bulk-enroll" element={<AdminBulkEnroll />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="archives" element={<AdminArchives />} />
        </Route>

        {/* Officer routes */}
        <Route path="/officer" element={
          <ProtectedRoute allowedRoles={['officer']} />
        }>
          <Route index element={<Navigate to="/officer/dashboard" replace />} />
          <Route path="dashboard" element={<OfficerDashboard />} />
          <Route path="scanner" element={<OfficerScanner />} />
          <Route path="platoon" element={<OfficerPlatoon />} />
          <Route path="attendance" element={<OfficerAttendance />} />
          <Route path="calendar" element={<OfficerCalendar />} />
          <Route path="pullout" element={<OfficerPullout />} />
          <Route path="digital-id" element={<OfficerDigitalID />} />
          <Route path="profile" element={<OfficerProfile />} />
        </Route>

        {/* Cadet routes */}
        <Route path="/cadet" element={
          <ProtectedRoute allowedRoles={['cadet']} />
        }>
          <Route index element={<Navigate to="/cadet/dashboard" replace />} />
          <Route path="dashboard" element={<CadetDashboard />} />
          <Route path="attendance" element={<CadetAttendance />} />
          <Route path="calendar" element={<CadetCalendar />} />
          <Route path="digital-id" element={<CadetDigitalID />} />
          <Route path="profile" element={<CadetProfile />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
