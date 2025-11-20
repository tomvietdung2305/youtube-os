import React, { useState, useEffect } from 'react';
import { IconHome, IconPlus, IconSettings, IconSparkles } from './Icons';
import { db } from '../services/firebase';
import { StorageService } from '../services/storageService';
import { AI_MODELS } from '../constants';

type View = 'DASHBOARD' | 'CREATE' | 'PROMPTS';

interface LayoutProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  // Check if Firebase is active based on the exported db object
  const isCloudStorage = !!db;
  const [currentModel, setCurrentModel] = useState(AI_MODELS.FLASH.id);

  useEffect(() => {
      // Load initial preference
      setCurrentModel(StorageService.getPreferredModel());
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newModel = e.target.value;
      setCurrentModel(newModel);
      StorageService.savePreferredModel(newModel);
      // Reload to ensure services pick up new preference (optional but good for safety)
      window.location.reload();
  };

  const NavItem = ({ view, icon, label }: { view: View, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => onNavigate(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-blue-900/20 shadow-lg' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-blue-500">
             <IconSparkles className="w-6 h-6" />
             <span className="text-xl font-bold text-white tracking-tight">Content OS</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Internal Studio v0.1.0</div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="DASHBOARD" icon={<IconHome className="w-5 h-5" />} label="Dashboard" />
          <NavItem view="CREATE" icon={<IconPlus className="w-5 h-5" />} label="New Generator" />
          <div className="pt-4 pb-2">
            <div className="h-px bg-slate-800 mx-2"></div>
          </div>
          <NavItem view="PROMPTS" icon={<IconSettings className="w-5 h-5" />} label="Channel Library" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <div>
              <div className="text-sm font-medium text-white">Admin User</div>
              <div className="text-xs text-slate-500">Owner Access</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-8 backdrop-blur-sm">
           <div className="text-sm text-slate-400 flex items-center space-x-4 flex-1">
              <div className="flex items-center">
                  <span className="mr-2">AI Model:</span>
                  <select 
                    value={currentModel}
                    onChange={handleModelChange}
                    className="bg-slate-800 border border-slate-700 text-white text-xs rounded py-1 px-2 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                      {Object.values(AI_MODELS).map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                  </select>
              </div>

              <span className="h-4 w-px bg-slate-700"></span>
              
              <span className="flex items-center">
                 Storage: 
                 <span className={`ml-2 flex items-center font-medium ${isCloudStorage ? 'text-blue-400' : 'text-slate-400'}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${isCloudStorage ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-500'}`}></span>
                    {isCloudStorage ? 'Cloud Sync (Firebase)' : 'Local Storage'}
                 </span>
              </span>
           </div>
           {!process.env.API_KEY && (
             <div className="text-xs bg-red-500/10 text-red-400 border border-red-900/50 px-3 py-1 rounded">
               Warning: API_KEY not found in env
             </div>
           )}
        </header>
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;