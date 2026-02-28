import { useEffect, useState } from 'react';
import { readinessAPI, scheduleAPI } from '../api';
import { useProject, useWebSocket } from '../context';
import { Shield, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const departments = ['direction', 'camera', 'lighting', 'sound', 'art', 'costume', 'makeup', 'production', 'transport', 'catering', 'stunts', 'vfx'];
const statusColors = { ready: 'bg-green-500', in_progress: 'bg-yellow-500', not_started: 'bg-gray-500', blocked: 'bg-red-500' };
const statusIcons = { ready: CheckCircle, in_progress: Clock, not_started: XCircle, blocked: AlertCircle };

export default function Readiness() {
  const { currentProject } = useProject();
  const { subscribe } = useWebSocket();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProject) loadSchedules();
    else setLoading(false);
  }, [currentProject]);

  useEffect(() => {
    const unsub = subscribe('READINESS_UPDATE', () => {
      if (selectedSchedule) loadDashboard(selectedSchedule);
    });
    return unsub;
  }, [selectedSchedule]);

  const loadSchedules = async () => {
    try {
      const res = await scheduleAPI.getByProject(currentProject.id);
      setSchedules(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedSchedule(res.data.data[0].id);
        await loadDashboard(res.data.data[0].id);
      }
    } catch { toast.error('Failed to load schedules'); }
    finally { setLoading(false); }
  };

  const loadDashboard = async (scheduleId) => {
    try {
      const res = await readinessAPI.getDashboard(scheduleId);
      setDashboard(res.data.data);
    } catch { toast.error('Failed to load readiness data'); }
  };

  const updateStatus = async (id, status, notes) => {
    try {
      await readinessAPI.update(id, { status, notes });
      toast.success('Readiness updated');
      loadDashboard(selectedSchedule);
    } catch { toast.error('Update failed'); }
  };

  if (!currentProject) {
    return (
      <div className="card text-center py-16">
        <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-white">No Project Selected</h3>
        <p className="text-gray-500">Select a project first</p>
      </div>
    );
  }

  const overallPct = dashboard?.overallPercentage ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Readiness Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time department readiness tracking</p>
        </div>
        {schedules.length > 0 && (
          <select className="input-field w-auto" value={selectedSchedule || ''} onChange={(e) => { setSelectedSchedule(e.target.value); loadDashboard(e.target.value); }}>
            {schedules.map((s) => <option key={s.id} value={s.id}>{s.shootDate?.slice(0, 10)} – {s.title || 'Untitled'}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : !dashboard ? (
        <div className="card text-center py-12">
          <Shield size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Readiness Data</h3>
          <p className="text-gray-500 text-sm">Publish a schedule to generate readiness entries</p>
        </div>
      ) : (
        <>
          {/* Overall readiness bar */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">Overall Readiness</span>
              <span className={`text-lg font-bold ${overallPct >= 80 ? 'text-green-400' : overallPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{overallPct}%</span>
            </div>
            <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${overallPct >= 80 ? 'bg-green-500' : overallPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          {/* Department cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(dashboard.departments || []).map((dept) => {
              const Icon = statusIcons[dept.status] || Clock;
              return (
                <div key={dept.id || dept.department} className="card relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${statusColors[dept.status] || 'bg-gray-500'}`} />
                  <div className="pl-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold capitalize">{dept.department}</h3>
                      <Icon size={18} className={dept.status === 'ready' ? 'text-green-400' : dept.status === 'blocked' ? 'text-red-400' : 'text-yellow-400'} />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[dept.status]} text-white capitalize`}>{dept.status?.replace('_', ' ')}</span>
                      <span className="text-gray-500 text-xs">{dept.percentage ?? 0}%</span>
                    </div>
                    {dept.notes && <p className="text-gray-400 text-xs mb-3">{dept.notes}</p>}
                    <div className="flex items-center gap-1">
                      {['not_started', 'in_progress', 'ready', 'blocked'].map((s) => (
                        <button key={s} onClick={() => updateStatus(dept.id, s, dept.notes)} className={`text-xs px-2 py-1 rounded capitalize transition-colors ${dept.status === s ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500 hover:text-white'}`}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="card mt-6 flex flex-wrap items-center gap-4">
            {Object.entries(statusColors).map(([s, c]) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${c}`} />
                <span className="text-gray-400 text-xs capitalize">{s.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
