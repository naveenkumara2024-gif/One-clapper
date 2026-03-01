import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, ProjectProvider, WebSocketProvider, useAuth } from './context';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Scripts from './pages/Scripts';
import Scenes from './pages/Scenes';
import Schedules from './pages/Schedules';
import Tasks from './pages/Tasks';
import Crew from './pages/Crew';
import Readiness from './pages/Readiness';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="scripts" element={<Scripts />} />
        <Route path="scenes" element={<Scenes />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="crew" element={<Crew />} />
        <Route path="readiness" element={<Readiness />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <WebSocketProvider>
            <AppRoutes />
            <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' } }} />
          </WebSocketProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
