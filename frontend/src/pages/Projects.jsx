import { useEffect, useState } from 'react';
import { projectAPI } from '../api';
import { useAuth, useProject } from '../context';
import { Plus, Check, Film, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Projects() {
  const { hasRole } = useAuth();
  const { currentProject, selectProject } = useProject();
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const res = await projectAPI.getAll();
      setProjects(res.data.data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.startDate) delete payload.startDate;
      if (!payload.endDate) delete payload.endDate;
      if (!payload.description) delete payload.description;
      await projectAPI.create(payload);
      toast.success('Project created!');
      setShowForm(false);
      setForm({ title: '', description: '', startDate: '', endDate: '' });
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your film productions</p>
        </div>
        {hasRole('director', 'assistant_director') && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Project</h3>
          <form onSubmit={createProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Title</label>
              <input className="input-field" placeholder="Film title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea className="input-field" rows={2} placeholder="Brief description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input-field" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input-field" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Create Project</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <Film size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Projects Yet</h3>
          <p className="text-gray-500">Create your first film production project</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className={`card cursor-pointer transition-all hover:border-gray-600 ${currentProject?.id === project.id ? 'border-red-600 ring-1 ring-red-600' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <Film size={20} className="text-red-500" />
                </div>
                {currentProject?.id === project.id && (
                  <span className="badge badge-success"><Check size={12} className="mr-1" /> Active</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{project.title}</h3>
              {project.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{project.description}</p>}
              <div className="flex items-center justify-between mt-4">
                <span className={`badge ${project.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{project.status}</span>
                <button onClick={() => { selectProject(project); toast.success(`Switched to ${project.title}`); }} className="text-sm text-red-500 hover:text-red-400 font-medium">
                  {currentProject?.id === project.id ? 'Selected' : 'Select'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
