import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, useProject, useWebSocket } from '../context';
import { useEffect, useState } from 'react';
import { notificationAPI } from '../api';
import {
  LayoutDashboard, Film, FileText, Calendar, ClipboardList,
  Users, CheckCircle, Bell, BarChart3, MapPin, LogOut, Menu, X, Clapperboard
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: Film },
  { to: '/scripts', label: 'Scripts', icon: FileText },
  { to: '/scenes', label: 'Scenes', icon: Clapperboard },
  { to: '/schedules', label: 'Schedules', icon: Calendar },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/crew', label: 'Crew', icon: Users },
  { to: '/readiness', label: 'Readiness', icon: CheckCircle },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { currentProject } = useProject();
  const { connect, isConnected, subscribe } = useWebSocket();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) connect(token);
  }, []);

  useEffect(() => {
    notificationAPI.getMy()
      .then((res) => setUnreadCount(res.data.data.unreadCount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = subscribe('NOTIFICATION', () => {
      setUnreadCount((c) => c + 1);
    });
    return unsub;
  }, [subscribe]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111] border-r border-gray-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Clapperboard size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">One Clapper</span>
        </div>

        {currentProject && (
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Current Project</p>
            <p className="text-sm text-white font-medium truncate">{currentProject.title}</p>
          </div>
        )}

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-[#111] border-b border-gray-800 flex items-center justify-between px-4 lg:px-6">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2">
            {isConnected && <span className="w-2 h-2 bg-green-500 rounded-full" title="Real-time connected"></span>}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/notifications')}
              className="relative text-gray-400 hover:text-white transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
