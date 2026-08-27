import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/auth/PublicOnlyRoute'
import { AppShell } from '@/components/layout/AppShell'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import LoginPage from '@/features/auth/LoginPage'
import VerifyTwoFactorPage from '@/features/auth/VerifyTwoFactorPage'
import AccountSettingsPage from '@/features/cabinet/AccountSettingsPage'
import CabinetLayout from '@/features/cabinet/CabinetLayout'
import ProfilePage from '@/features/cabinet/ProfilePage'
import SecurityPage from '@/features/cabinet/SecurityPage'
import ClassDetailPage from '@/features/classes/ClassDetailPage'
import ClassesListPage from '@/features/classes/ClassesListPage'
import ConstraintsPage from '@/features/constraints/ConstraintsPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import NotFoundPage from '@/features/NotFoundPage'
import GeneratePage from '@/features/schedule/GeneratePage'
import TimetablePage from '@/features/schedule/TimetablePage'
import SchoolPage from '@/features/school/SchoolPage'
import SubjectsListPage from '@/features/subjects/SubjectsListPage'
import TeacherDetailPage from '@/features/teachers/TeacherDetailPage'
import TeachersListPage from '@/features/teachers/TeachersListPage'
import WorkloadPage from '@/features/workload/WorkloadPage'
import { RootLayout } from './RootLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'verify-2fa', element: <VerifyTwoFactorPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'school', element: <SchoolPage /> },
              { path: 'teachers', element: <TeachersListPage /> },
              { path: 'teachers/:id', element: <TeacherDetailPage /> },
              { path: 'classes', element: <ClassesListPage /> },
              { path: 'classes/:id', element: <ClassDetailPage /> },
              { path: 'subjects', element: <SubjectsListPage /> },
              { path: 'workload', element: <WorkloadPage /> },
              { path: 'schedule', element: <TimetablePage /> },
              { path: 'constraints', element: <ConstraintsPage /> },
              { path: 'schedule/generate', element: <GeneratePage /> },
              {
                path: 'cabinet',
                element: <CabinetLayout />,
                children: [
                  { index: true, element: <ProfilePage /> },
                  { path: 'security', element: <SecurityPage /> },
                  { path: 'settings', element: <AccountSettingsPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
