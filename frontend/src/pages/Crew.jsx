import { useEffect, useState } from 'react';
import { crewAPI } from '../api';
import { useProject } from '../context';
import { Users, AlertCircle, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

const departments = ['direction', 'camera', 'lighting', 'sound', 'art', 'costume', 'makeup', 'production', 'transport', 'catering', 'stunts', 'vfx'];

export default function Crew() {
  const { currentProject } = useProject();
  const [crew, setCrew] = useState({ all: [], permanent: [], temporary: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('all');
  const [showType, setShowType] = useState('all');

  useEffect(() => {
    if (currentProject) loadCrew();
    else setLoading(false);
  }, [currentProject]);

  const loadCrew = async () => {
    try {
      const res = await crewAPI.getByProject(currentProject.id);
      setCrew(res.data.data);
    } catch { toast.error('Failed to load crew'); }
    finally { setLoading(false); }
  };

  const list = showType === 'permanent' ? crew.permanent : showType === 'temporary' ? crew.temporary : crew.all;
  const filtered = filterDept === 'all' ? list : list.filter((m) => m.department === filterDept);

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
          <h1 className="text-2xl font-bold text-white">Crew Management</h1>
          <p className="text-gray-500 text-sm mt-1">{crew.total} crew members</p>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'permanent', 'temporary'].map((t) => (
            <button key={t} onClick={() => setShowType(t)} className={`text-sm py-1 px-3 rounded-lg capitalize ${showType === t ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {t}
            </button>
          ))}
          <select className="input-field w-auto text-sm py-1" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-3">
          <Users size={24} className="text-blue-500" />
          <div>
            <p className="text-xl font-bold text-white">{crew.total}</p>
            <p className="text-sm text-gray-500">Total Crew</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <UserCheck size={24} className="text-green-500" />
          <div>
            <p className="text-xl font-bold text-white">{crew.permanent?.length || 0}</p>
            <p className="text-sm text-gray-500">Permanent</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <UserX size={24} className="text-yellow-500" />
          <div>
            <p className="text-xl font-bold text-white">{crew.temporary?.length || 0}</p>
            <p className="text-sm text-gray-500">Temporary</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Crew Members</h3>
          <p className="text-gray-500">Add members to your project</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((member) => (
            <div key={member.userId || member.memberId} className="card py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                  {member.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{member.name}</p>
                  <p className="text-gray-500 text-sm truncate">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="badge badge-info capitalize">{member.role?.replace('_', ' ')}</span>
                {member.department && <span className="badge badge-neutral capitalize">{member.department}</span>}
                {member.isTemporary && <span className="badge badge-warning">Temp</span>}
                <span className={`badge ${member.isActive ? 'badge-success' : 'badge-danger'}`}>{member.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              {member.phone && <p className="text-gray-500 text-xs mt-2">{member.phone}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
