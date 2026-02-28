import { useEffect, useState } from 'react';
import { scheduleAPI, sceneAPI } from '../api';
import { useProject, useAuth } from '../context';
import { Calendar, Plus, Send, RefreshCw, Eye, AlertCircle, Clock, Clapperboard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Schedules() {
  const { currentProject } = useProject();
  const { hasRole } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', shootDate: '', callTime: '', wrapTime: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [viewDetail, setViewDetail] = useState(null);
  const [showAddScene, setShowAddScene] = useState(null); // scheduleId
  const [addSceneForm, setAddSceneForm] = useState({ sceneId: '', sequenceOrder: 0, estimatedStartTime: '', estimatedEndTime: '' });

  useEffect(() => {
    if (currentProject) {
      loadSchedules();
      sceneAPI.getByProject(currentProject.id).then((r) => setScenes(r.data.data)).catch(() => {});
    } else setLoading(false);
  }, [currentProject]);

  const loadSchedules = async () => {
    try {
      const res = await scheduleAPI.getByProject(currentProject.id);
      setSchedules(res.data.data);
    } catch { toast.error('Failed to load schedules'); }
    finally { setLoading(false); }
  };

  const createSchedule = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, projectId: currentProject.id };
      if (!payload.callTime) delete payload.callTime;
      if (!payload.wrapTime) delete payload.wrapTime;
      if (!payload.notes) delete payload.notes;
      await scheduleAPI.create(payload);
      toast.success('Schedule created');
      setShowForm(false);
      setForm({ title: '', shootDate: '', callTime: '', wrapTime: '', notes: '' });
      loadSchedules();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const publishSchedule = async (id) => {
    try {
      await scheduleAPI.publish(id);
      toast.success('Schedule published & crew notified!');
      loadSchedules();
    } catch { toast.error('Failed to publish'); }
  };

  const viewSchedule = async (id) => {
    try {
      const res = await scheduleAPI.getById(id);
      setViewDetail(res.data.data);
    } catch { toast.error('Failed to load details'); }
  };

  const addSceneToSchedule = async (scheduleId) => {
    try {
      const payload = { ...addSceneForm, sequenceOrder: parseInt(addSceneForm.sequenceOrder) || 0 };
      if (!payload.estimatedStartTime) delete payload.estimatedStartTime;
      if (!payload.estimatedEndTime) delete payload.estimatedEndTime;
      await scheduleAPI.addScene(scheduleId, payload);
      toast.success('Scene added with auto-generated department tasks!');
      setShowAddScene(null);
      setAddSceneForm({ sceneId: '', sequenceOrder: 0, estimatedStartTime: '', estimatedEndTime: '' });
      if (viewDetail?.id === scheduleId) viewSchedule(scheduleId);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Shooting Schedules</h1>
          <p className="text-gray-500 text-sm mt-1">Plan and manage shoot days</p>
        </div>
        {hasRole('director', 'assistant_director') && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Schedule
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Shoot Day</h3>
          <form onSubmit={createSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Title</label>
              <input className="input-field" placeholder="Day 1 - Forest Location" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="label">Shoot Date</label>
              <input type="date" className="input-field" value={form.shootDate} onChange={(e) => setForm({ ...form, shootDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Call Time</label>
              <input type="time" className="input-field" value={form.callTime} onChange={(e) => setForm({ ...form, callTime: e.target.value })} />
            </div>
            <div>
              <label className="label">Wrap Time</label>
              <input type="time" className="input-field" value={form.wrapTime} onChange={(e) => setForm({ ...form, wrapTime: e.target.value })} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input-field" placeholder="Additional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Create Schedule</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* View Detail Modal */}
      {viewDetail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewDetail(null)}>
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{viewDetail.title}</h3>
                <p className="text-gray-500 text-sm">{new Date(viewDetail.shootDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={() => setViewDetail(null)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className={`badge ${viewDetail.status === 'published' ? 'badge-success' : viewDetail.status === 'revised' ? 'badge-warning' : 'badge-neutral'}`}>{viewDetail.status}</span>
              {viewDetail.callTime && <span className="text-gray-400 text-sm flex items-center gap-1"><Clock size={14} /> Call: {viewDetail.callTime}</span>}
              {viewDetail.wrapTime && <span className="text-gray-400 text-sm">Wrap: {viewDetail.wrapTime}</span>}
              <span className="text-gray-400 text-sm">Rev: {viewDetail.revision}</span>
            </div>

            {/* One-Liner Schedule */}
            {viewDetail.oneLiner?.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">One-Liner Schedule</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-400">Scene</th>
                        <th className="text-left py-2 px-3 text-gray-400">Description</th>
                        <th className="text-left py-2 px-3 text-gray-400">Cast</th>
                        <th className="text-left py-2 px-3 text-gray-400">Location</th>
                        <th className="text-left py-2 px-3 text-gray-400">Time</th>
                        <th className="text-left py-2 px-3 text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewDetail.oneLiner.map((item, i) => (
                        <tr key={i} className="border-b border-gray-800">
                          <td className="py-2 px-3 text-white font-medium">{item.scene}</td>
                          <td className="py-2 px-3 text-gray-300 max-w-[200px] truncate">{item.heading}</td>
                          <td className="py-2 px-3 text-gray-400">{item.cast?.join(', ') || '-'}</td>
                          <td className="py-2 px-3 text-gray-400">{item.location || '-'}</td>
                          <td className="py-2 px-3 text-gray-400 capitalize">{item.timeOfDay}</td>
                          <td className="py-2 px-3"><span className={`badge ${item.status === 'completed' ? 'badge-success' : item.status === 'delayed' ? 'badge-danger' : 'badge-neutral'}`}>{item.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tasks */}
            {viewDetail.tasks?.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Department Tasks ({viewDetail.tasks.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {viewDetail.tasks.map((task) => (
                    <div key={task.id} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">{task.title}</p>
                        <span className="badge badge-info text-xs capitalize">{task.department}</span>
                      </div>
                      <span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'delayed' ? 'badge-danger' : 'badge-neutral'}`}>{task.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Scene Modal */}
      {showAddScene && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowAddScene(null)}>
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Add Scene to Schedule</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Scene</label>
                <select className="input-field" value={addSceneForm.sceneId} onChange={(e) => setAddSceneForm({ ...addSceneForm, sceneId: e.target.value })}>
                  <option value="">Select scene</option>
                  {scenes.map((s) => <option key={s.id} value={s.id}>Scene {s.sceneNumber} - {s.heading.substring(0, 50)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Sequence Order</label>
                <input type="number" className="input-field" value={addSceneForm.sequenceOrder} onChange={(e) => setAddSceneForm({ ...addSceneForm, sequenceOrder: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Est. Start</label>
                  <input type="time" className="input-field" value={addSceneForm.estimatedStartTime} onChange={(e) => setAddSceneForm({ ...addSceneForm, estimatedStartTime: e.target.value })} />
                </div>
                <div>
                  <label className="label">Est. End</label>
                  <input type="time" className="input-field" value={addSceneForm.estimatedEndTime} onChange={(e) => setAddSceneForm({ ...addSceneForm, estimatedEndTime: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => addSceneToSchedule(showAddScene)} className="btn-primary" disabled={!addSceneForm.sceneId}>Add Scene</button>
                <button onClick={() => setShowAddScene(null)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Schedules Yet</h3>
          <p className="text-gray-500">Create your first shoot day schedule</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-xs text-blue-400">{new Date(schedule.shootDate).toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-lg font-bold text-blue-300">{new Date(schedule.shootDate).getDate()}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{schedule.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${schedule.status === 'published' ? 'badge-success' : schedule.status === 'revised' ? 'badge-warning' : 'badge-neutral'}`}>{schedule.status}</span>
                      {schedule.callTime && <span className="text-gray-500 text-sm">Call: {schedule.callTime}</span>}
                      {schedule.revision > 0 && <span className="text-gray-500 text-sm">Rev {schedule.revision}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasRole('director', 'assistant_director') && (
                    <>
                      <button onClick={() => setShowAddScene(schedule.id)} className="btn-outline text-sm py-1 px-3 flex items-center gap-1">
                        <Clapperboard size={14} /> Add Scene
                      </button>
                      {schedule.status === 'draft' && (
                        <button onClick={() => publishSchedule(schedule.id)} className="btn-primary text-sm py-1 px-3 flex items-center gap-1">
                          <Send size={14} /> Publish
                        </button>
                      )}
                    </>
                  )}
                  <button onClick={() => viewSchedule(schedule.id)} className="btn-secondary text-sm py-1 px-3 flex items-center gap-1">
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
