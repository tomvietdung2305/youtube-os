import React, { useEffect, useState, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { ChannelConfig, UserRole } from '../types';
import { DEFAULT_USER } from '../constants';
import { IconPlus, IconTrash, IconSparkles, IconSettings, IconFileText } from './Icons';

const PromptManager: React.FC = () => {
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'SCRIPT' | 'VISUAL' | 'THUMBNAIL'>('SCRIPT');
  
  // Global System Prompt State
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [globalPromptText, setGlobalPromptText] = useState('');

  // Channel Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scriptPrompt, setScriptPrompt] = useState('');
  const [imageGenPrompt, setImageGenPrompt] = useState('');
  const [thumbnailPrompt, setThumbnailPrompt] = useState('');
  const [thumbnailRefImage, setThumbnailRefImage] = useState<string | undefined>(undefined);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = DEFAULT_USER;

  const loadData = async () => {
      const ch = await StorageService.getChannels();
      setChannels(ch);
      
      // Load global prompt
      const gp = await StorageService.getGlobalSystemPrompt();
      setGlobalPromptText(gp);

      // Default selection logic if nothing selected
      if (!selectedChannelId && !isEditingGlobal) {
          if (ch.length > 0) {
            handleSelectChannel(ch[0]);
          } else {
            handleCreateNewChannel();
          }
      }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectGlobal = async () => {
      setIsEditingGlobal(true);
      setSelectedChannelId(null);
      const gp = await StorageService.getGlobalSystemPrompt();
      setGlobalPromptText(gp);
  };

  const handleSelectChannel = (channel: ChannelConfig) => {
    setIsEditingGlobal(false);
    setSelectedChannelId(channel.id);
    setName(channel.name);
    setDescription(channel.description);
    
    setScriptPrompt(channel.scriptPrompt || '');
    setImageGenPrompt(channel.imageGenPrompt || '');
    setThumbnailPrompt(channel.thumbnailPrompt || '');
    setThumbnailRefImage(channel.thumbnailRefImage);
    
    setActiveTab('SCRIPT');
  };

  const handleCreateNewChannel = () => {
    setIsEditingGlobal(false);
    setSelectedChannelId(null);
    setName('');
    setDescription('');
    
    setScriptPrompt('Role: \nTone: \nStructure: \n');
    setImageGenPrompt('Visual Style: \nScenes: \n');
    setThumbnailPrompt('Style: \nText Overlay: \n');
    setThumbnailRefImage(undefined);
    
    setActiveTab('SCRIPT');
  };

  const handleSaveChannel = async () => {
    if (!name.trim()) {
      alert("Channel Name is required.");
      return;
    }

    const newId = selectedChannelId || `ch_${crypto.randomUUID()}`;
    const newChannel: ChannelConfig = {
      id: newId,
      name,
      description,
      scriptPrompt,
      imageGenPrompt,
      thumbnailPrompt,
      thumbnailRefImage
    };

    await StorageService.saveChannel(newChannel);
    await loadData();
    setSelectedChannelId(newId);
    alert("Channel saved successfully."); 
  };

  const handleSaveGlobalPrompt = async () => {
      await StorageService.saveGlobalSystemPrompt(globalPromptText);
      alert("Global System Prompt updated successfully.");
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannelId) return;
    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      await StorageService.deleteChannel(selectedChannelId);
      const updated = await StorageService.getChannels(); // fetch fresh list
      setChannels(updated);
      
      if (updated.length > 0) {
        handleSelectChannel(updated[0]);
      } else {
        handleCreateNewChannel();
      }
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
      setThumbnailRefImage(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (user.role !== UserRole.OWNER) {
    return <div className="p-10 text-center text-slate-500">Access Denied. Contact Admin to edit prompts.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
            <IconSettings className="w-6 h-6 mr-2 text-purple-400" />
            Channel Library
        </h2>
        <span className="text-xs bg-purple-900/50 text-purple-200 px-3 py-1 rounded-full border border-purple-700">
            Owner Access
        </span>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Sidebar List */}
        <div className="w-64 flex flex-col bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-700 space-y-2">
            {/* Global Item */}
            <button
                onClick={handleSelectGlobal}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isEditingGlobal 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
            >
                <IconSparkles className="w-4 h-4" />
                <span>Global System Prompt</span>
            </button>

            <button 
              onClick={handleCreateNewChannel}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-medium transition-colors text-sm"
            >
              <IconPlus className="w-4 h-4" />
              <span>New Channel</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
             <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Channels</div>
             {channels.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectChannel(c)}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-slate-700 transition-colors ${
                    !isEditingGlobal && selectedChannelId === c.id 
                      ? 'bg-slate-700 text-white border-l-4 border-l-blue-500' 
                      : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-medium truncate">{c.name}</div>
                </button>
             ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
           
           {/* GLOBAL PROMPT EDITOR */}
           {isEditingGlobal && (
               <div className="flex-1 flex flex-col">
                   <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                       <div>
                           <h3 className="text-lg font-bold text-white flex items-center">
                               <IconSparkles className="w-5 h-5 mr-2 text-purple-400" />
                               Global System Prompt
                           </h3>
                           <p className="text-sm text-slate-500">These instructions are injected into every generation request across all channels.</p>
                       </div>
                       <button 
                            onClick={handleSaveGlobalPrompt}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium shadow transition-colors"
                        >
                            Save Global Prompt
                        </button>
                   </div>
                   <div className="flex-1 p-6">
                       <textarea 
                            value={globalPromptText}
                            onChange={(e) => setGlobalPromptText(e.target.value)}
                            className="w-full h-full bg-slate-950 text-slate-300 p-4 rounded border border-slate-700 font-mono text-sm leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                            placeholder="Enter global system instructions..."
                       />
                   </div>
               </div>
           )}

           {/* CHANNEL EDITOR */}
           {!isEditingGlobal && (
             <>
                {/* Channel Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex justify-between items-start gap-6">
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Channel Name</label>
                                <input 
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    placeholder="e.g. Tech Daily"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <input 
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Internal description..."
                                />
                            </div>
                        </div>
                        
                        <div className="flex space-x-2">
                            {selectedChannelId && (
                                <button 
                                    onClick={handleDeleteChannel}
                                    className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
                                    title="Delete Channel"
                                >
                                    <IconTrash className="w-5 h-5" />
                                </button>
                            )}
                            <button 
                                onClick={handleSaveChannel}
                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium shadow transition-colors"
                            >
                                Save Channel
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                        <button 
                            onClick={() => setActiveTab('SCRIPT')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'SCRIPT' ? 'border-blue-500 text-blue-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            1. Script Strategy
                        </button>
                        <button 
                            onClick={() => setActiveTab('VISUAL')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'VISUAL' ? 'border-blue-500 text-blue-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            2. Visual Style
                        </button>
                        <button 
                            onClick={() => setActiveTab('THUMBNAIL')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'THUMBNAIL' ? 'border-blue-500 text-blue-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            3. Thumbnail & Ref
                        </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-6 flex flex-col min-h-0 overflow-y-auto">
                        
                        {activeTab === 'SCRIPT' && (
                            <div className="h-full flex flex-col">
                                <div className="mb-2 flex justify-between text-xs">
                                    <span className="font-bold text-slate-500 uppercase">Script Instructions</span>
                                    <span className="text-slate-500">Define tone, structure, and pacing.</span>
                                </div>
                                <textarea 
                                    value={scriptPrompt}
                                    onChange={(e) => setScriptPrompt(e.target.value)}
                                    className="flex-1 w-full bg-slate-950 text-slate-300 p-4 rounded border border-slate-700 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
                                    placeholder="Role: You are a narrator...&#10;Tone: Exciting...&#10;Structure: Hook, Intro, Body..."
                                />
                            </div>
                        )}

                        {activeTab === 'VISUAL' && (
                            <div className="h-full flex flex-col">
                                <div className="mb-2 flex justify-between text-xs">
                                    <span className="font-bold text-slate-500 uppercase">Visual Generation Prompt</span>
                                    <span className="text-slate-500">Define the art style for scene images.</span>
                                </div>
                                <textarea 
                                    value={imageGenPrompt}
                                    onChange={(e) => setImageGenPrompt(e.target.value)}
                                    className="flex-1 w-full bg-slate-950 text-slate-300 p-4 rounded border border-slate-700 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
                                    placeholder="Visual Style: Cinematic 4k...&#10;Lighting: Neon...&#10;Subjects: Robots, Spaceships..."
                                />
                            </div>
                        )}

                        {activeTab === 'THUMBNAIL' && (
                            <div className="h-full flex flex-col space-y-6">
                                <div className="flex-1 flex flex-col">
                                    <div className="mb-2 flex justify-between text-xs">
                                        <span className="font-bold text-slate-500 uppercase">Thumbnail Prompt Strategy</span>
                                        <span className="text-slate-500">Instructions for text overlay and subject matter.</span>
                                    </div>
                                    <textarea 
                                        value={thumbnailPrompt}
                                        onChange={(e) => setThumbnailPrompt(e.target.value)}
                                        className="flex-1 w-full bg-slate-950 text-slate-300 p-4 rounded border border-slate-700 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
                                        placeholder="Style: High CTR...&#10;Text: Bold, Yellow...&#10;Composition: Close up face..."
                                    />
                                </div>

                                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-bold text-white flex items-center">
                                            <IconSparkles className="w-4 h-4 mr-2 text-yellow-500" />
                                            Reference Image
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            Upload a sample thumbnail style for AI to mimic.
                                        </span>
                                    </div>
                                    
                                    {!thumbnailRefImage ? (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-slate-600 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700 hover:border-slate-500 transition-colors group"
                                        >
                                            <IconPlus className="w-8 h-8 text-slate-500 group-hover:text-white mb-2" />
                                            <span className="text-sm text-slate-400 group-hover:text-white">Click to upload reference image</span>
                                        </div>
                                    ) : (
                                        <div className="relative h-48 w-full bg-black rounded-lg overflow-hidden group">
                                            <img src={thumbnailRefImage} alt="Reference" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                    onClick={removeImage}
                                                    className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-500"
                                                >
                                                    Remove Image
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleImageUpload} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                </div>
                            </div>
                        )}
                </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default PromptManager;