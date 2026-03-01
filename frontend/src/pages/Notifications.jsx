import { useEffect, useState } from 'react';
import { notificationAPI } from '../api';
import { useWebSocket } from '../context';
import { Bell, CheckCheck, AlertCircle, Info, Calendar, Users, Shield, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const typeIcons = { schedule_published: Calendar, task_assigned: Clock, readiness_update: Shield, crew_added: Users, general: Info };
const typeLabels = { schedule_published: 'Schedule', task_assigned: 'Task', readiness_update: 'Readiness', crew_added: 'Crew', general: 'General' };

export default function Notifications() {
  const { subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const unsub = subscribe('NOTIFICATION', () => load());
    return unsub;
  }, []);

  const load = async () => {
    try {
      const res = await notificationAPI.getMy();
      setNotifications(res.data.data || []);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    } catch { toast.error('Failed'); }
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.readAt);
      await Promise.all(unread.map((n) => notificationAPI.markRead(n.id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter((n) => !n.readAt) : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const timeAgo = (date) => {
    if (!date) return '';
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">{unreadCount} unread</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"><CheckCheck size={16} /> Mark all read</button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'unread', 'schedule_published', 'task_assigned', 'readiness_update', 'crew_added', 'general'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg capitalize ${filter === f ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Bell size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Notifications</h3>
          <p className="text-gray-500 text-sm">You're all caught up</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <div key={n.id} onClick={() => !n.readAt && markRead(n.id)} className={`card cursor-pointer transition border-l-2 ${n.readAt ? 'border-l-transparent opacity-60' : 'border-l-red-500'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.readAt ? 'bg-gray-700' : 'bg-red-600/20'}`}>
                    <Icon size={16} className={n.readAt ? 'text-gray-500' : 'text-red-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${n.readAt ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                      <span className="text-xs text-gray-600 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5">{n.message}</p>
                    <span className="text-xs text-gray-600 capitalize mt-1 inline-block">{typeLabels[n.type] || n.type}</span>
                  </div>
                  {!n.readAt && <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
