import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, AdminRoute } from '@/components/shared/AdminRoute';
import { Header, BottomNavBar } from '@/components/layout/Header';
import { LoginView } from '@/pages/LoginPage/LoginView';
import { HomeView } from '@/pages/HomePage/HomeView';
import { TkbView } from '@/pages/TkbPage/TkbView';
import { DrlView } from '@/pages/DrlPage/DrlView';
import { GalleryOwnView, GalleryPublicView } from '@/pages/GalleryPage/GalleryView';
import { RoomView } from '@/pages/RoomPage/RoomView';
import { ProfileView } from '@/pages/ProfilePage/ProfileView';
import { AdminView } from '@/pages/AdminPage/AdminView';
import { ActivityDetailPage } from '@/pages/AdminPage/components/ActivityDetailPage';

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#e7ebf0] dark:bg-[#0e1621]">
      <Header />
      {children}
      <BottomNavBar />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomeView />
          </RequireAuth>
        }
      />
      <Route
        path="/tkb"
        element={
          <RequireAuth>
            <TkbView />
          </RequireAuth>
        }
      />
      <Route
        path="/drl"
        element={
          <RequireAuth>
            <DrlView />
          </RequireAuth>
        }
      />
      {/* Phòng trưng bày — /gallery là của mình (cần đăng nhập), /g/:slug là link riêng công khai */}
      <Route
        path="/gallery"
        element={
          <RequireAuth>
            <GalleryOwnView />
          </RequireAuth>
        }
      />
      <Route path="/g/:slug" element={<GalleryPublicView />} />
      <Route
        path="/rooms"
        element={
          <RequireAuth>
            <RoomView />
          </RequireAuth>
        }
      />
      <Route
        path="/rooms/:semester"
        element={
          <RequireAuth>
            <RoomView />
          </RequireAuth>
        }
      />
      <Route
        path="/rooms/:semester/:roomId"
        element={
          <RequireAuth>
            <RoomView />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <AppShell>
              <ProfileView />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminRoute>
              <AdminView />
            </AdminRoute>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/activity-management"
        element={
          <RequireAuth>
            <AdminRoute>
              <AdminView initialTab="queue" />
            </AdminRoute>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/rooms"
        element={
          <RequireAuth>
            <AdminRoute>
              <AdminView initialTab="rooms" />
            </AdminRoute>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/notifications"
        element={<Navigate to="/admin/rooms" replace />}
      />
      <Route
        path="/admin/activity/:submissionId"
        element={
          <RequireAuth>
            <AdminRoute>
              <ActivityDetailPage />
            </AdminRoute>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/statistics"
        element={
          <RequireAuth>
            <AdminRoute>
              <AdminView initialTab="statistics" />
            </AdminRoute>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/semesters"
        element={
          <RequireAuth>
            <AdminRoute>
              <AdminView initialTab="semesters" />
            </AdminRoute>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/drl-management"
        element={
          <RequireAuth>
            <AdminRoute>
              <AdminView initialTab="drl" />
            </AdminRoute>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
