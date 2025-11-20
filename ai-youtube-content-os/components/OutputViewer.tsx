import React, { useState, useEffect } from 'react';
import { VideoProject, RepurposingPackage } from '../types';
import { IconCopy, IconDownload, IconSparkles, IconFileText } from './Icons';
import { generateImage, generateSectionContent, generateRepurposedContent } from '../services/geminiService';
import { StorageService } from '../services/storageService';

interface OutputViewerProps {
  project: VideoProject;
}

const OutputViewer: React.FC<OutputViewerProps> = ({ project: initialProject }) => {
  const [project, setProject] = useState<VideoProject>(initialProject);
  const [activeTab, setActiveTab] = useState<'SCRIPT' | 'SEO' | 'REPURPOSE'>('SCRIPT');
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [generatingTextId, setGeneratingTextId] = useState<number | null>(null);
  const [repurposingLoading, setRepurposingLoading] = useState(false);
  
  // Bulk Generation State
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject.id]);

  // --- Actions ---
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  const handleDownloadDocx = () => {
      let content = `TITLE: ${project.seo.youtube_title}\n\nHOOK: ${project.selectedHook}\n\n`;
      project.script.forEach((s, i) => {
          content += `\n[SECTION ${i+1}: ${s.section_title}]\n`;
          content += `VISUAL: ${s.visual_prompt}\n`;
          content += `AUDIO: ${s.voiceover_text}\n`;
          content += `-----------------------------------\n`;
      });
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.topic.substring(0, 15)}_script.txt`;
      a.click();
  };

  const handleDownloadImage = (base64Data: string, filename: string) => {
      const a = document.createElement('a');
      a.href = base64Data;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleGenerateImage = async (index: number, promptText: string) => {
     setGeneratingImageId(`script-${index}`);
     try {
        const base64Image = await generateImage(promptText);
        const updatedProject = { ...project };
        updatedProject.script[index].imageUrl = base64Image;
        setProject(updatedProject);
        await StorageService.saveProject(updatedProject);
     } catch (e) { alert("Image gen failed"); } 
     finally { setGeneratingImageId(null); }
  };

  const handleGenerateSectionContent = async (index: number) => {
      setGeneratingTextId(index);
      try {
          const channels = await StorageService.getChannels();
          const channel = channels.find(c => c.id === project.channelId) || channels[0];
          const content = await generateSectionContent(
              channel, project.topic, project.script[index].section_title,
              project.script[index].visual_prompt, project.language
          );
          const updatedProject = { ...project };
          updatedProject.script[index].voiceover_text = content;
          setProject(updatedProject);
          await StorageService.saveProject(updatedProject);
      } catch (e) { alert("Text gen failed"); } 
      finally { setGeneratingTextId(null); }
  };

  const handleBulkGenerate = async () => {
      const emptyIndices = project.script
        .map((s, i) => (!s.voiceover_text || s.voiceover_text.length < 50) ? i : -1)
        .filter(i => i !== -1);

      if (emptyIndices.length === 0) return;

      setIsBulkGenerating(true);
      setBulkProgress({ current: 0, total: emptyIndices.length });

      try {
          const channels = await StorageService.getChannels();
          const channel = channels.find(c => c.id === project.channelId) || channels[0];
          
          // Copy project to avoid mutation
          let currentProjectState = { ...project };
          
          // Batch size (concurrency limit)
          const BATCH_SIZE = 3;
          
          for (let i = 0; i < emptyIndices.length; i += BATCH_SIZE) {
              const batch = emptyIndices.slice(i, i + BATCH_SIZE);
              
              // Process batch in parallel
              const results = await Promise.all(
                  batch.map(async (idx) => {
                      const content = await generateSectionContent(
                          channel, 
                          currentProjectState.topic, 
                          currentProjectState.script[idx].section_title,
                          currentProjectState.script[idx].visual_prompt, 
                          currentProjectState.language
                      );
                      return { idx, content };
                  })
              );

              // Update state with results from this batch
              results.forEach(({ idx, content }) => {
                  currentProjectState.script[idx].voiceover_text = content;
              });
              
              setProject({ ...currentProjectState });
              await StorageService.saveProject(currentProjectState);
              setBulkProgress(prev => ({ ...prev, current: prev.current + results.length }));
          }

      } catch (e) {
          alert("Bulk generation stopped due to error: " + (e instanceof Error ? e.message : "Unknown"));
      } finally {
          setIsBulkGenerating(false);
      }
  };

  const handleGenerateRepurposing = async () => {
      setRepurposingLoading(true);
      try {
          const result = await generateRepurposedContent(project);
          const updatedProject = { ...project, repurposing: result.data };
          setProject(updatedProject);
          await StorageService.saveProject(updatedProject);
      } catch (e) { alert("Repurposing failed"); }
      finally { setRepurposingLoading(false); }
  };

  const nextEmptyIndex = project.script.findIndex(s => !s.voiceover_text || s.voiceover_text.length < 50);

  // --- Render ---
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden flex flex-col h-[calc(100vh-100px)]">
      {/* Header with Cost & Tabs */}
      <div className="bg-slate-900 border-b border-slate-700">
          <div className="p-4 flex justify-between items-center">
            <div>
                <h2 className="font-bold text-white text-lg">{project.seo.youtube_title || project.topic}</h2>
                <div className="flex items-center space-x-4 mt-1">
                    <div className="text-xs text-slate-500">Target: <span className="text-slate-300">{project.targetAudience}</span></div>
                    {project.tokenUsage && (
                        <div className="text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-400">
                            Usage: ${project.tokenUsage.estimatedCost.toFixed(4)} ({((project.tokenUsage.inputTokens + project.tokenUsage.outputTokens)/1000).toFixed(1)}k tok)
                        </div>
                    )}
                </div>
            </div>
            <div className="flex space-x-2">
                 {nextEmptyIndex !== -1 && !isBulkGenerating && (
                     <>
                        <button 
                            onClick={() => handleGenerateSectionContent(nextEmptyIndex)} 
                            disabled={generatingTextId !== null} 
                            className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded-full border border-slate-600"
                        >
                            {generatingTextId !== null ? 'Writing Single...' : 'Write Next Section'}
                        </button>
                        <button 
                            onClick={handleBulkGenerate} 
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-full animate-pulse shadow-lg shadow-blue-900/50 flex items-center"
                        >
                            <IconSparkles className="w-3 h-3 mr-2" />
                            Generate Remaining ({project.script.filter(s => !s.voiceover_text).length})
                        </button>
                     </>
                 )}
                 {isBulkGenerating && (
                     <div className="flex items-center bg-blue-900/50 text-blue-200 text-xs px-4 py-2 rounded-full border border-blue-800">
                         <IconSparkles className="w-3 h-3 mr-2 animate-spin" />
                         Generating Batch: {bulkProgress.current} / {bulkProgress.total}
                     </div>
                 )}
                 <button onClick={handleDownloadDocx} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded" title="Export DOCX"><IconFileText className="w-4 h-4"/></button>
            </div>
          </div>

          <div className="flex px-4 space-x-6">
            {['SCRIPT', 'SEO', 'REPURPOSE'].map(tab => (
                <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    {tab === 'SCRIPT' ? 'Visual Script' : tab === 'SEO' ? 'SEO & Metadata' : 'Repurposing'}
                </button>
            ))}
          </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto bg-slate-900">
          
          {/* VISUAL SCRIPT VIEW (2-COLUMN) */}
          {activeTab === 'SCRIPT' && (
              <div className="max-w-5xl mx-auto p-6 space-y-8">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-6 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">
                      <div className="col-span-4">Visual / B-Roll Direction</div>
                      <div className="col-span-8">Audio / Voiceover</div>
                  </div>

                  {project.script.map((section, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-6 group">
                          {/* Left: Visual */}
                          <div className="col-span-4 space-y-3">
                              <div className="text-xs font-mono text-blue-500">Part {idx + 1}: {section.section_title}</div>
                              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-sm text-slate-300 italic leading-relaxed">
                                  {section.visual_prompt}
                              </div>
                              
                              {/* Image Gen */}
                              <div className="relative aspect-video bg-black rounded border border-slate-800 overflow-hidden group/img">
                                  {section.imageUrl ? (
                                      <>
                                        <img src={section.imageUrl} className="w-full h-full object-cover" alt="scene" />
                                        {/* Image Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                            <button 
                                                onClick={() => handleDownloadImage(section.imageUrl!, `scene_${idx + 1}.jpg`)}
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-full transform translate-y-2 group-hover/img:translate-y-0 transition-all"
                                                title="Download Image"
                                            >
                                                <IconDownload className="w-5 h-5" />
                                            </button>
                                        </div>
                                      </>
                                  ) : (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                          <button 
                                            onClick={() => handleGenerateImage(idx, section.visual_prompt)}
                                            disabled={generatingImageId === `script-${idx}`}
                                            className="text-xs bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white px-3 py-1 rounded border border-slate-700"
                                          >
                                              {generatingImageId === `script-${idx}` ? 'Generating...' : 'Generate Preview'}
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Right: Audio */}
                          <div className="col-span-8 flex flex-col">
                              {section.voiceover_text ? (
                                  <>
                                    <div className="bg-slate-800/50 p-5 rounded border border-slate-700/50 text-slate-200 leading-7 whitespace-pre-wrap font-sans text-[15px] flex-1">
                                        {section.voiceover_text}
                                    </div>
                                    {/* Character Count */}
                                    <div className="mt-1 flex justify-end">
                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                            {section.voiceover_text.length.toLocaleString()} characters
                                        </span>
                                    </div>
                                  </>
                              ) : (
                                  <div className="h-full border-2 border-dashed border-slate-800 rounded flex items-center justify-center bg-slate-900/50 min-h-[150px]">
                                      {generatingTextId === idx ? (
                                          <span className="text-blue-400 animate-pulse text-sm">Writing deep content...</span>
                                      ) : (
                                        <button onClick={() => handleGenerateSectionContent(idx)} className="text-slate-600 hover:text-blue-500 text-sm font-medium">
                                            Write this section
                                        </button>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* REPURPOSING TAB */}
          {activeTab === 'REPURPOSE' && (
              <div className="max-w-4xl mx-auto p-6">
                  {!project.repurposing ? (
                      <div className="text-center py-20">
                          <IconSparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-white mb-2">Multiply Your Content</h3>
                          <p className="text-slate-400 mb-6">Generate Shorts ideas and social posts from this script.</p>
                          <button 
                            onClick={handleGenerateRepurposing}
                            disabled={repurposingLoading}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-full shadow-lg"
                          >
                              {repurposingLoading ? 'Analyzing Script...' : 'Generate Social Package'}
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-8">
                          {/* Shorts */}
                          <div className="space-y-4">
                              <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">YouTube Shorts Ideas</h3>
                              <div className="grid grid-cols-3 gap-4">
                                  {project.repurposing.shorts_ideas.map((idea, i) => (
                                      <div key={i} className="bg-slate-950 p-4 rounded border border-slate-800">
                                          <div className="text-purple-400 font-bold text-sm mb-2">Idea #{i+1}</div>
                                          <div className="text-white font-medium mb-2">{idea.title}</div>
                                          <div className="text-slate-500 text-xs italic">{idea.visual_concept}</div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* Community Post */}
                          <div>
                              <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2 mb-4">Community Post</h3>
                              <div className="bg-slate-800 p-4 rounded border border-slate-700 text-slate-300 whitespace-pre-wrap">
                                  {project.repurposing.community_post}
                              </div>
                          </div>

                          {/* Social Blurb */}
                          <div>
                              <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2 mb-4">Social Media Blurb (Twitter/X)</h3>
                              <div className="bg-slate-800 p-4 rounded border border-slate-700 text-slate-300">
                                  {project.repurposing.social_blurb}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* SEO TAB (Existing) */}
          {activeTab === 'SEO' && (
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                  <div className="bg-slate-950 p-6 rounded border border-slate-800">
                      <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                      <div className="text-xl font-bold text-white mt-1">{project.seo.youtube_title}</div>
                  </div>
                  <div className="bg-slate-950 p-6 rounded border border-slate-800">
                      <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                      <div className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{project.seo.youtube_description}</div>
                  </div>
                  <div className="bg-slate-950 p-6 rounded border border-slate-800">
                      <label className="text-xs font-bold text-slate-500 uppercase">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                          {project.seo.tags.map(t => <span key={t} className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-xs">#{t}</span>)}
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default OutputViewer;