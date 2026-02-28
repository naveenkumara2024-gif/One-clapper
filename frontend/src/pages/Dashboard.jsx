import { useEffect, useState } from 'react';
import { useAuth, useProject } from '../context';
import { projectAPI, scheduleAPI, taskAPI } from '../api';
import { Link } from 'react-router-dom';
import { Film, Calendar, ClipboardList, Users, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [stats, setStats] = useState({ projects: 0, schedules: [], tasks: [], upcomingSchedule: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [currentProject]);

  const loadDashboard = async () => {
    try {
      const projRes = await projectAPI.getAll();
      const projects = projRes.data.data;

      let schedules = [];
      let tasks = [];

      if (currentProject) {
        const [schedRes, taskRes] = await Promise.all([
          scheduleAPI.getByProject(currentProject.id),
          taskAPI.getByProject(currentProject.id),
        ]);
        schedules = schedRes.data.data;
        tasks = taskRes.data.data;
      }

      const upcoming = schedules
        .filter((s) => new Date(s.shootDate) >= new Date())
        .sort((a, b) => new Date(a.shootDate) - new Date(b.shootDate))[0];

      setStats({ projects: projects.length, schedules, tasks, upcomingSchedule: upcoming });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const completedTasks = stats.tasks.filter((t) => t.status === 'completed').length;
  const delayedTasks = stats.tasks.filter((t) => t.status === 'delayed').length;
  const pendingTasks = stats.tasks.filter((t) => t.status === 'pending').length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name}</h1>
        <p className="text-gray-500 mt-1">
          {currentProject ? `Working on: ${currentProject.title}` : 'Select a project to get started'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Film} label="Projects" value={stats.projects} color="red" />
            <StatCard icon={Calendar} label="Shoot Days" value={stats.schedules.length} color="blue" />
            <StatCard icon={ClipboardList} label="Total Tasks" value={stats.tasks.length} color="yellow" />
            <StatCard icon={CheckCircle} label="Completed" value={completedTasks} color="green" />
          </div>

          {/* Quick Actions + Upcoming */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Schedule */}
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Upcoming Shoot Day</h2>
              {stats.upcomingSchedule ? (
                <div>
                  <p className="text-white font-medium">{stats.upcomingSchedule.title}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {new Date(stats.upcomingSchedule.shootDate).toLocaleDateString('en-IN', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                  {stats.upcomingSchedule.callTime && (
                    <p className="text-gray-500 text-sm mt-1">Call Time: {stats.upcomingSchedule.callTime}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`badge ${stats.upcomingSchedule.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                      {stats.upcomingSchedule.status}
                    </span>
                  </div>
                  <Link to={`/schedules`} className="btn-primary inline-block mt-4 text-sm">
                    View Details
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500">No upcoming shoots scheduled</p>
              )}
            </div>

            {/* Task Summary */}
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Task Overview</h2>
              {stats.tasks.length > 0 ? (
                <div className="space-y-3">
                  <ProgressBar label="Completed" value={completedTasks} total={stats.tasks.length} color="bg-green-500" />
                  <ProgressBar label="In Progress" value={stats.tasks.filter((t) => t.status === 'in_progress').length} total={stats.tasks.length} color="bg-blue-500" />
                  <ProgressBar label="Pending" value={pendingTasks} total={stats.tasks.length} color="bg-yellow-500" />
                  {delayedTasks > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-800 rounded-lg">
                      <AlertTriangle size={16} className="text-red-500" />
                      <span className="text-red-400 text-sm">{delayedTasks} tasks delayed</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No tasks yet. Add scenes to a schedule to auto-generate tasks.</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          {!currentProject && (
            <div className="mt-8 card text-center py-12">
              <Film size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Project Selected</h3>
              <p className="text-gray-500 mb-4">Create or select a project to access all features</p>
              <Link to="/projects" className="btn-primary">Go to Projects</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    red: 'bg-red-600/20 text-red-500',
    blue: 'bg-blue-600/20 text-blue-500',
    yellow: 'bg-yellow-600/20 text-yellow-500',
    green: 'bg-green-600/20 text-green-500',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{value}/{total}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
