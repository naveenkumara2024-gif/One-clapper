import { useEffect, useState } from 'react';
import { reportAPI } from '../api';
import { useProject } from '../context';
import { BarChart3, AlertCircle, Plus, X, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reports() {
  const { currentProject } = useProject();
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [form, setForm] = useState({ scheduleId: '', scenesCompleted: 0, scenesPartial: 0, scenesNotStarted: 0, delayMinutes: 0, delayReason: '', weatherConditions: '', notes: '' });

  useEffect(() => {
    if (currentProject) load();
    else setLoading(false);
  }, [currentProject]);

  const load = async () => {
    try {
      const [r, s] = await Promise.all([reportAPI.getByProject(currentProject.id), reportAPI.summary(currentProject.id)]);
      setReports(r.data.data || []);
      setSummary(s.data.data || null);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await reportAPI.create({ ...form, projectId: currentProject.id, scenesCompleted: +form.scenesCompleted, scenesPartial: +form.scenesPartial, scenesNotStarted: +form.scenesNotStarted, delayMinutes: +form.delayMinutes });
      toast.success('Report saved');
      setShowForm(false);
      setForm({ scheduleId: '', scenesCompleted: 0, scenesPartial: 0, scenesNotStarted: 0, delayMinutes: 0, delayReason: '', weatherConditions: '', notes: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Track daily shoot progress and delays</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Report</button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="card flex items-center gap-3">
            <BarChart3 size={24} className="text-blue-500" />
            <div><p className="text-xl font-bold text-white">{summary.totalReports || 0}</p><p className="text-sm text-gray-500">Total Reports</p></div>
          </div>
          <div className="card flex items-center gap-3">
            <Clock size={24} className="text-green-500" />
            <div><p className="text-xl font-bold text-white">{summary.totalScenesCompleted || 0}</p><p className="text-sm text-gray-500">Scenes Done</p></div>
          </div>
          <div className="card flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-500" />
            <div><p className="text-xl font-bold text-white">{summary.totalDelayMinutes || 0}m</p><p className="text-sm text-gray-500">Total Delay</p></div>
          </div>
          <div className="card flex items-center gap-3">
            <BarChart3 size={24} className="text-yellow-500" />
            <div><p className="text-xl font-bold text-white">{summary.avgScenesPerDay?.toFixed(1) || 0}</p><p className="text-sm text-gray-500">Avg Scenes/Day</p></div>
          </div>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">New Daily Report</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Schedule ID</label>
                <input className="input-field" value={form.scheduleId} onChange={(e) => setForm({ ...form, scheduleId: e.target.value })} required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Completed</label>
                  <input type="number" min="0" className="input-field" value={form.scenesCompleted} onChange={(e) => setForm({ ...form, scenesCompleted: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Partial</label>
                  <input type="number" min="0" className="input-field" value={form.scenesPartial} onChange={(e) => setForm({ ...form, scenesPartial: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Not Started</label>
                  <input type="number" min="0" className="input-field" value={form.scenesNotStarted} onChange={(e) => setForm({ ...form, scenesNotStarted: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Delay (min)</label>
                  <input type="number" min="0" className="input-field" value={form.delayMinutes} onChange={(e) => setForm({ ...form, delayMinutes: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Delay Reason</label>
                  <input className="input-field" value={form.delayReason} onChange={(e) => setForm({ ...form, delayReason: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Weather</label>
                <input className="input-field" value={form.weatherConditions} onChange={(e) => setForm({ ...form, weatherConditions: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <textarea className="input-field" rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary w-full">Save Report</button>
            </form>
          </div>
        </div>
      )}

      {/* Report list */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-12">
          <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Reports Yet</h3>
          <p className="text-gray-500 text-sm">Create your first daily shoot report</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card cursor-pointer hover:border-gray-600 transition" onClick={() => setViewReport(viewReport?.id === r.id ? null : r)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{r.reportDate?.slice(0, 10) || 'Unknown date'}</p>
                  <p className="text-gray-500 text-sm">Scenes: {r.scenesCompleted} done, {r.scenesPartial} partial, {r.scenesNotStarted} pending</p>
                </div>
                <div className="text-right">
                  {r.delayMinutes > 0 && <p className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle size={14} /> {r.delayMinutes}m delay</p>}
                </div>
              </div>
              {viewReport?.id === r.id && (
                <div className="mt-3 pt-3 border-t border-gray-700 text-sm space-y-1">
                  {r.delayReason && <p><span className="text-gray-500">Delay reason:</span> <span className="text-gray-300">{r.delayReason}</span></p>}
                  {r.weatherConditions && <p><span className="text-gray-500">Weather:</span> <span className="text-gray-300">{r.weatherConditions}</span></p>}
                  {r.notes && <p><span className="text-gray-500">Notes:</span> <span className="text-gray-300">{r.notes}</span></p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
