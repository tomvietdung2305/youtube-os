import React, { useState, useEffect } from 'react';
import { ChannelConfig, VideoProject, HookVariant, TokenUsage } from '../types';
import { generateHooks, generateVideoPackage } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import OutputViewer from './OutputViewer';
import { IconSparkles, IconPlus } from './Icons';
import { DEFAULT_USER } from '../constants';

const Generator: React.FC = () => {
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [currentProject, setCurrentProject] = useState<VideoProject | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wizard State
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [mode, setMode] = useState<'ORIGINAL' | 'REWRITE'>('ORIGINAL');
  const [language, setLanguage] = useState<'EN' | 'VI' | 'EN_VI'>('EN');

  // Hook State
  const [generatedHooks, setGeneratedHooks] = useState<HookVariant[]>([]);
  const [selectedHookId, setSelectedHookId] = useState<string | null>(null);
  const [accumulatedUsage, setAccumulatedUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, estimatedCost: 0 });

  useEffect(() => {
    const loadChannels = async () => {
        const loadedChannels = await StorageService.getChannels();
        setChannels(loadedChannels);
        if (loadedChannels.length > 0) setSelectedChannelId(loadedChannels[0].id);
    };
    loadChannels();
  }, []);

  const addUsage = (newUsage: TokenUsage) => {
      setAccumulatedUsage(prev => ({
          inputTokens: prev.inputTokens + newUsage.inputTokens,
          outputTokens: prev.outputTokens + newUsage.outputTokens,
          estimatedCost: prev.estimatedCost + newUsage.estimatedCost
      }));
  };

  const handleGenerateHooks = async () => {
      const channel = channels.find(c => c.id === selectedChannelId);
      if (!channel || !topic || !targetAudience) {
          setError("Please fill in all fields (Channel, Topic, Audience).");
          return;
      }
      if (!process.env.API_KEY) { setError("Missing API Key."); return; }

      setLoading(true);
      setError(null);

      try {
          const result = await generateHooks(topic, targetAudience, language, channel);
          setGeneratedHooks(result.hooks);
          addUsage(result.usage);
          setStep(2);
      } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to generate hooks");
      } finally {
          setLoading(false);
      }
  };

  const handleGenerateBlueprint = async () => {
    const channel = channels.find(c => c.id === selectedChannelId);
    const selectedHook = generatedHooks.find(h => h.id === selectedHookId);

    if (!channel || !selectedHook) {
        setError("Please select a hook.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateVideoPackage(
          topic, mode, language, channel, targetAudience, selectedHook.content
      );
      
      addUsage(result.usage);

      const newProject: VideoProject = {
        id: crypto.randomUUID(),
        channelId: channel.id,
        topic,
        mode,
        language,
        targetAudience,
        createdAt: new Date().toISOString(),
        createdBy: DEFAULT_USER.name,
        status: 'GENERATED',
        hookVariants: generatedHooks,
        selectedHook: selectedHook.content,
        script: result.data.script_sections,
        seo: result.data.seo,
        thumbnail: result.data.thumbnail,
        tokenUsage: {
            inputTokens: accumulatedUsage.inputTokens + result.usage.inputTokens,
            outputTokens: accumulatedUsage.outputTokens + result.usage.outputTokens,
            estimatedCost: accumulatedUsage.estimatedCost + result.usage.estimatedCost
        }
      };

      await StorageService.saveProject(newProject);
      setCurrentProject(newProject);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (currentProject) {
      return <OutputViewer project={currentProject} />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Studio Generator</h2>
            <p className="text-slate-400">Create optimized content packages in 2 steps.</p>
        </div>

        {/* Step 1: Briefing & Hooks */}
        {step === 1 && (
            <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Channel Profile</label>
                        <select 
                            value={selectedChannelId}
                            onChange={(e) => setSelectedChannelId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-blue-500 focus:outline-none"
                        >
                            {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Language</label>
                        <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-blue-500 focus:outline-none"
                        >
                            <option value="EN">English</option>
                            <option value="VI">Vietnamese</option>
                            <option value="EN_VI">Bilingual (EN/VI)</option>
                        </select>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Target Audience (Persona)</label>
                    <input 
                        type="text" 
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g. Tech enthusiasts aged 25-40, Busy Moms, Beginners in Crypto..."
                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                </div>

                <div className="mb-6">
                     <div className="flex justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-400">Video Topic</label>
                        <div className="flex space-x-2">
                            <button onClick={() => setMode('ORIGINAL')} className={`text-xs px-2 py-0.5 rounded ${mode === 'ORIGINAL' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Original</button>
                            <button onClick={() => setMode('REWRITE')} className={`text-xs px-2 py-0.5 rounded ${mode === 'REWRITE' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Rewrite URL</button>
                        </div>
                     </div>
                     <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        rows={3}
                        placeholder="What is this video about?"
                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none resize-none"
                      />
                </div>

                <button
                    onClick={handleGenerateHooks}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center"
                >
                    {loading ? <span className="animate-pulse">Generating Ideas...</span> : <>Generate Killer Hooks <IconSparkles className="ml-2 w-5 h-5" /></>}
                </button>
                
                {error && <div className="mt-4 text-center text-red-400 bg-red-900/20 p-2 rounded">{error}</div>}
            </div>
        )}

        {/* Step 2: Select Hook */}
        {step === 2 && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Select a Hook to Start</h3>
                    <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white text-sm">Back</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedHooks.map((hook) => (
                        <div 
                            key={hook.id}
                            onClick={() => setSelectedHookId(hook.id)}
                            className={`p-5 rounded-xl border cursor-pointer transition-all relative ${
                                selectedHookId === hook.id 
                                ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' 
                                : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <div className="text-xs font-bold text-blue-400 uppercase mb-2 tracking-wider">{hook.type}</div>
                            <p className="text-slate-200 text-lg font-medium leading-relaxed">"{hook.content}"</p>
                            {selectedHookId === hook.id && (
                                <div className="absolute top-3 right-3 w-4 h-4 bg-blue-500 rounded-full"></div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleGenerateBlueprint}
                    disabled={loading || !selectedHookId}
                    className={`w-full py-4 rounded-lg font-bold text-white text-lg shadow-lg transition-all ${
                        loading || !selectedHookId 
                        ? 'bg-slate-700 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-500'
                    }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <IconSparkles className="animate-spin mr-2" /> Building Blueprint...
                        </span>
                    ) : (
                        "Confirm Hook & Generate Full Script"
                    )}
                </button>
            </div>
        )}
    </div>
  );
};

export default Generator;