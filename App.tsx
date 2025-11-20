import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Generator from './components/Generator';
import PromptManager from './components/PromptManager';
import OutputViewer from './components/OutputViewer';
import { VideoProject } from './types';

type View = 'DASHBOARD' | 'CREATE' | 'PROMPTS' | 'VIEW_PROJECT';

function App() {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [viewProject, setViewProject] = useState<VideoProject | null>(null);

  const handleViewProject = (project: VideoProject) => {
    setViewProject(project);
    setCurrentView('VIEW_PROJECT');
  };

  const handleNav = (view: string) => {
      setCurrentView(view as View);
      if (view !== 'VIEW_PROJECT') setViewProject(null);
  }

  return (
    <Layout currentView={currentView as any} onNavigate={handleNav}>
      {currentView === 'DASHBOARD' && <Dashboard onViewProject={handleViewProject} />}
      {currentView === 'CREATE' && <Generator />}
      {currentView === 'PROMPTS' && <PromptManager />}
      {currentView === 'VIEW_PROJECT' && viewProject && (
        <div className="max-w-6xl mx-auto p-6">
          <button 
            onClick={() => setCurrentView('DASHBOARD')}
            className="mb-4 text-slate-400 hover:text-white text-sm flex items-center"
          >
            ← Back to Dashboard
          </button>
          <OutputViewer project={viewProject} />
        </div>
      )}
    </Layout>
  );
}

export default App;