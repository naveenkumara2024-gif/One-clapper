import { useEffect, useState } from 'react';
import { scriptAPI } from '../api';
import { useProject, useAuth } from '../context';
import { Upload, FileText, Trash2, Eye, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Scripts() {
  const { currentProject } = useProject();
  const { hasRole } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'original', version: 1, rawContent: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewScript, setViewScript] = useState(null);

  useEffect(() => {
    if (currentProject) loadScripts();
    else setLoading(false);
  }, [currentProject]);

  const loadScripts = async () => {
    try {
      const res = await scriptAPI.getByProject(currentProject.id);
      setScripts(res.data.data);
    } catch { toast.error('Failed to load scripts'); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('projectId', currentProject.id);
      formData.append('title', form.title);
      formData.append('type', form.type);
      formData.append('version', form.version);
      if (file) {
        formData.append('script', file);
      } else if (form.rawContent) {
        formData.append('rawContent', form.rawContent);
      }
      const res = await scriptAPI.upload(formData);
      toast.success(res.data.message);
      setShowUpload(false);
      setForm({ title: '', type: 'original', version: 1, rawContent: '' });
      setFile(null);
      loadScripts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this script and all its scenes?')) return;
    try {
      await scriptAPI.delete(id);
      toast.success('Script deleted');
      loadScripts();
    } catch { toast.error('Delete failed'); }
  };

  const viewDetails = async (id) => {
    try {
      const res = await scriptAPI.getById(id);
      setViewScript(res.data.data);
    } catch { toast.error('Failed to load script'); }
  };

  if (!currentProject) {
    return (
      <div className="card text-center py-16">
        <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-white">No Project Selected</h3>
        <p className="text-gray-500">Select a project from the Projects page first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Scripts</h1>
          <p className="text-gray-500 text-sm mt-1">Upload and manage screenplays</p>
        </div>
        {hasRole('director', 'assistant_director') && (
          <button onClick={() => setShowUpload(!showUpload)} className="btn-primary flex items-center gap-2">
            <Upload size={18} /> Upload Script
          </button>
        )}
      </div>

      {showUpload && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upload Screenplay</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Title</label>
                <input className="input-field" placeholder="Script title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
                  <option value="original">Original Script</option>
                  <option value="shooting">Shooting Script</option>
                  <option value="revised">Revised Draft</option>
                </select>
              </div>
              <div>
                <label className="label">Version</label>
                <input type="number" className="input-field" min={1} value={form.version} onChange={(e) => setForm({...form, version: parseInt(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="label">Upload File (.txt, .fountain)</label>
              <input type="file" accept=".txt,.fountain" className="input-field" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <div>
              <label className="label">Or paste script content</label>
              <textarea className="input-field font-mono text-sm" rows={10} placeholder={`INT. LIVING ROOM - DAY\n\nJOHN enters the room slowly.\n\nJOHN\nHello? Is anyone here?\n\nEXT. GARDEN - NIGHT\n\n...`} value={form.rawContent} onChange={(e) => setForm({...form, rawContent: e.target.value})} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={uploading}>
                {uploading ? 'Processing...' : 'Upload & Parse'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Script with scenes modal */}
      {viewScript && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewScript(null)}>
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{viewScript.title}</h3>
              <button onClick={() => setViewScript(null)} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <p className="text-gray-400 mb-4">{viewScript.scenes?.length || 0} scenes extracted</p>
            <div className="space-y-3">
              {viewScript.scenes?.map((scene) => (
                <div key={scene.id} className="bg-[#222] border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-info">Scene {scene.sceneNumber}</span>
                    <span className="badge badge-neutral">{scene.timeOfDay || 'day'}</span>
                    <span className="badge badge-neutral">{scene.locationType}</span>
                  </div>
                  <p className="text-white font-medium font-mono text-sm">{scene.heading}</p>
                  {scene.characters?.length > 0 && (
                    <p className="text-gray-400 text-sm mt-2">Characters: {scene.characters.join(', ')}</p>
                  )}
                  {scene.synopsis && <p className="text-gray-500 text-sm mt-1">{scene.synopsis}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : scripts.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Scripts Yet</h3>
          <p className="text-gray-500">Upload your first screenplay to extract scenes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => (
            <div key={script.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{script.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-neutral">{script.type}</span>
                    <span className="text-gray-500 text-sm">v{script.version}</span>
                    <span className={`badge ${script.status === 'processed' ? 'badge-success' : script.status === 'error' ? 'badge-danger' : 'badge-warning'}`}>
                      {script.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => viewDetails(script.id)} className="btn-outline text-sm py-1 px-3 flex items-center gap-1">
                  <Eye size={14} /> View
                </button>
                {hasRole('director', 'assistant_director') && (
                  <button onClick={() => handleDelete(script.id)} className="text-red-500 hover:text-red-400 p-2">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
