import { Routes, Route, Navigate } from 'react-router-dom'
import PostHogPageTracker from '@/components/PostHogPageTracker'
import ProtectedRoute from '@/lib/authz'

// Eager load all pages
import LoginPage from '@/pages/auth/LoginPage'
import EnrollPage from '@/pages/enroll/EnrollPage'
import SuccessPage from '@/pages/enroll/SuccessPage'

// Admin pages
import AdminDashboard from '@/pages/admin/DashboardPage'
import AdminCadets from '@/pages/admin/CadetsPage'
import AdminOfficers from '@/pages/admin/OfficersPage'
import AdminScanner from '@/pages/admin/ScannerPage'
import AdminSessions from '@/pages/admin/SessionsPage'
import AdminAttendance from '@/pages/admin/AttendancePage'
import AdminReports from '@/pages/admin/ReportsPage'
import AdminDigitalIDs from '@/pages/admin/DigitalIDsPage'
import AdminAnnouncements from '@/pages/admin/AnnouncementsPage'
import AdminEnrollment from '@/pages/admin/EnrollmentPage'
import AdminSettings from '@/pages/admin/SettingsPage'
import AdminArchives from '@/pages/admin/ArchivesPage'
import AdminAccessCodes from '@/pages/admin/AccessCodesPage'

// Officer pages
import OfficerDashboard from '@/pages/officer/DashboardPage'
import OfficerScanner from '@/pages/officer/ScannerPage'
import OfficerPlatoon from '@/pages/officer/PlatoonPage'
import OfficerAttendance from '@/pages/officer/AttendancePage'
import OfficerCalendar from '@/pages/officer/CalendarPage'
import OfficerPullout from '@/pages/officer/PulloutPage'
import OfficerDigitalID from '@/pages/officer/DigitalIDPage'
import OfficerProfile from '@/pages/officer/ProfilePage'

// Cadet pages
import CadetDashboard from '@/pages/cadet/DashboardPage'
import CadetAttendance from '@/pages/cadet/AttendancePage'
import CadetCalendar from '@/pages/cadet/CalendarPage'
import CadetDigitalID from '@/pages/cadet/DigitalIDPage'
import CadetProfile from '@/pages/cadet/ProfilePage'
import ChangePasswordPage from '@/components/ChangePasswordPage'

export default function App() {
  return (
    <>
      <PostHogPageTracker />
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
          <Route path="access-codes" element={<AdminAccessCodes />} />
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
          <Route path="change-password" element={<ChangePasswordPage />} />
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
          <Route path="change-password" element={<ChangePasswordPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
