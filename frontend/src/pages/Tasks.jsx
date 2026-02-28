import { useEffect, useState } from 'react';
import { taskAPI } from '../api';
import { useProject, useAuth } from '../context';
import { ClipboardList, AlertCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const departments = ['direction', 'camera', 'lighting', 'sound', 'art', 'costume', 'makeup', 'production', 'transport', 'catering', 'stunts', 'vfx'];
const statuses = ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'];
const priorityLabels = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
const priorityColors = { 1: 'badge-neutral', 2: 'badge-info', 3: 'badge-warning', 4: 'badge-danger' };

export default function Tasks() {
  const { currentProject } = useProject();
  const { user, hasRole } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (currentProject) loadTasks();
    else setLoading(false);
  }, [currentProject]);

  const loadTasks = async () => {
    try {
      const res = await taskAPI.getByProject(currentProject.id);
      setTasks(res.data.data);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  };

  const updateTaskStatus = async (id, status) => {
    try {
      await taskAPI.update(id, { status });
      toast.success('Task updated');
      loadTasks();
    } catch { toast.error('Update failed'); }
  };

  const filtered = tasks.filter((t) => {
    if (filterDept !== 'all' && t.department !== filterDept) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  // Group by department
  const grouped = {};
  filtered.forEach((t) => {
    if (!grouped[t.department]) grouped[t.department] = [];
    grouped[t.department].push(t);
  });

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
          <h1 className="text-2xl font-bold text-white">Department Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">{tasks.length} total tasks</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input-field w-auto text-sm py-1" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          <select className="input-field w-auto text-sm py-1" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Tasks Found</h3>
          <p className="text-gray-500">Tasks are auto-generated when scenes are added to schedules</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dept, deptTasks]) => (
            <div key={dept}>
              <h2 className="text-lg font-semibold text-white mb-3 capitalize flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                {dept} <span className="text-gray-500 text-sm font-normal">({deptTasks.length})</span>
              </h2>
              <div className="space-y-2">
                {deptTasks.map((task) => (
                  <div key={task.id} className="card py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{task.title}</p>
                      {task.description && <p className="text-gray-500 text-sm mt-1 line-clamp-1">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`badge ${priorityColors[task.priority]}`}>{priorityLabels[task.priority]}</span>
                        <span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'delayed' ? 'badge-danger' : task.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`}>{task.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {task.status !== 'completed' && (
                        <select
                          className="input-field w-auto text-sm py-1 px-2"
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        >
                          {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
