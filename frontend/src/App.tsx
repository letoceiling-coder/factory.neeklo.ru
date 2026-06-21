import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AvatarsPage } from '@/pages/AvatarsPage';
import { VoicesPage } from '@/pages/VoicesPage';
import { VideosPage } from '@/pages/VideosPage';
import { VideoDetailPage } from '@/pages/VideoDetailPage';
import { NodeBuilderPage } from '@/pages/NodeBuilderPage';
import { AgentPage } from '@/pages/AgentPage';
import { JobsPage } from '@/pages/JobsPage';
import { IntegrationsPage } from '@/pages/IntegrationsPage';
import { MediaLibraryPage } from '@/pages/MediaLibraryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsersPage } from '@/pages/UsersPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/videos/:id" element={<VideoDetailPage />} />
        <Route path="/avatars" element={<AvatarsPage />} />
        <Route path="/voices" element={<VoicesPage />} />
        <Route path="/builder" element={<NodeBuilderPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/media" element={<MediaLibraryPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
