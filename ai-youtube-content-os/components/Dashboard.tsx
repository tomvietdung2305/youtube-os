import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { VideoProject, ChannelConfig } from '../types';
import { IconTrash, IconFileText, IconDownload } from './Icons';

const Dashboard: React.FC<{ onViewProject: (p: VideoProject) => void }> = ({ onViewProject }) => {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
      setLoading(true);
      const p = await StorageService.getProjects();
      const c = await StorageService.getChannels();
      setProjects(p);
      setChannels(c);
      setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
      if(confirm("Are you sure you want to delete this content?")) {
          await StorageService.deleteProject(id);
          loadData();
      }
  }

  const getChannelName = (id: string) => channels.find(c => c.id === id)?.name || 'Unknown';

  if (loading) {
      return <div className="p-10 text-center text-slate-500">Loading projects...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Recent Content</h2>
      
      <div className="bg-slate-800 rounded-xl shadow border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead className="bg-slate-900 text-xs uppercase font-medium text-slate-400">
              <tr>
                <th className="px-6 py-4">Title / Topic</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {projects.length === 0 ? (
                <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No content generated yet.</td>
                </tr>
              ) : projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white truncate max-w-md">{project.seo.youtube_title || project.topic}</div>
                    <div className="text-xs text-slate-500 mt-1">{project.mode} • {project.language}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                      {getChannelName(project.channelId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => onViewProject(project)}
                        className="text-slate-400 hover:text-white"
                        title="View Content"
                      >
                        <IconFileText className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(project.id)}
                        className="text-slate-400 hover:text-red-400"
                        title="Delete"
                      >
                        <IconTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;