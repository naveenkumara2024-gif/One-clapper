import { useEffect, useState } from 'react';
import { sceneAPI } from '../api';
import { useProject } from '../context';
import { Clapperboard, AlertCircle, MapPin, Clock, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Scenes() {
  const { currentProject } = useProject();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedScene, setSelectedScene] = useState(null);

  useEffect(() => {
    if (currentProject) loadScenes();
    else setLoading(false);
  }, [currentProject]);

  const loadScenes = async () => {
    try {
      const res = await sceneAPI.getByProject(currentProject.id);
      setScenes(res.data.data);
    } catch { toast.error('Failed to load scenes'); }
    finally { setLoading(false); }
  };

  const viewScene = async (id) => {
    try {
      const res = await sceneAPI.getById(id);
      setSelectedScene(res.data.data);
    } catch { toast.error('Failed to load scene details'); }
  };

  const filtered = filter === 'all' ? scenes :
    filter === 'day' ? scenes.filter((s) => s.timeOfDay === 'day') :
    filter === 'night' ? scenes.filter((s) => s.timeOfDay === 'night') :
    filter === 'interior' ? scenes.filter((s) => s.locationType === 'interior') :
    scenes.filter((s) => s.locationType === 'exterior');

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
          <h1 className="text-2xl font-bold text-white">Scenes</h1>
          <p className="text-gray-500 text-sm mt-1">{scenes.length} scenes extracted</p>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'day', 'night', 'interior', 'exterior'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`text-sm py-1 px-3 rounded-lg capitalize ${filter === f ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Scene detail modal */}
      {selectedScene && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedScene(null)}>
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Scene {selectedScene.sceneNumber}</h3>
              <button onClick={() => setSelectedScene(null)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>
            <p className="text-white font-mono text-sm bg-gray-800 p-3 rounded-lg mb-4">{selectedScene.heading}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><span className="text-gray-500 text-sm">Location Type</span><p className="text-white capitalize">{selectedScene.locationType}</p></div>
              <div><span className="text-gray-500 text-sm">Time</span><p className="text-white capitalize">{selectedScene.timeOfDay}</p></div>
              <div><span className="text-gray-500 text-sm">Location</span><p className="text-white">{selectedScene.locationName || '-'}</p></div>
              <div><span className="text-gray-500 text-sm">Page Count</span><p className="text-white">{selectedScene.pageCount || '-'}</p></div>
            </div>

            {selectedScene.characters?.length > 0 && (
              <div className="mb-4">
                <span className="text-gray-500 text-sm">Characters</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedScene.characters.map((c, i) => <span key={i} className="badge badge-info">{c}</span>)}
                </div>
              </div>
            )}

            {selectedScene.props?.length > 0 && (
              <div className="mb-4">
                <span className="text-gray-500 text-sm">Props</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedScene.props.map((p, i) => <span key={i} className="badge badge-warning">{p}</span>)}
                </div>
              </div>
            )}

            {selectedScene.actionLines && (
              <div className="mb-4">
                <span className="text-gray-500 text-sm">Action</span>
                <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{selectedScene.actionLines}</p>
              </div>
            )}

            {selectedScene.dialogues?.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm">Dialogues ({selectedScene.dialogues.length})</span>
                <div className="space-y-2 mt-2">
                  {selectedScene.dialogues.map((d, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3">
                      <p className="text-red-400 font-semibold text-sm">{d.characterName}</p>
                      {d.parenthetical && <p className="text-gray-500 text-xs italic">({d.parenthetical})</p>}
                      <p className="text-gray-300 text-sm">{d.dialogue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Clapperboard size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Scenes Found</h3>
          <p className="text-gray-500">Upload a script to extract scenes automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((scene) => (
            <div key={scene.id} className="card hover:border-gray-600 cursor-pointer transition-all" onClick={() => viewScene(scene.id)}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-bold text-red-500">#{scene.sceneNumber}</span>
                <span className={`badge ${scene.timeOfDay === 'night' ? 'badge-info' : 'badge-warning'}`}>{scene.timeOfDay || 'day'}</span>
                <span className="badge badge-neutral">{scene.locationType}</span>
              </div>
              <p className="text-white font-mono text-sm mb-3 line-clamp-1">{scene.heading}</p>

              <div className="space-y-1.5">
                {scene.locationName && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <MapPin size={14} /> <span className="truncate">{scene.locationName}</span>
                  </div>
                )}
                {scene.characters?.length > 0 && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <UsersIcon size={14} /> <span>{scene.characters.length} characters</span>
                  </div>
                )}
                {scene.estimatedDuration && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Clock size={14} /> <span>{scene.estimatedDuration} min</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
