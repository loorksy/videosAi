import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Loader2, Download, Film, Mic, Video, Wand2, RefreshCw, AlertCircle } from 'lucide-react';
import { db, Storyboard, Scene } from '../lib/db';
import { GeminiService } from '../lib/gemini';
import { KieService } from '../lib/kie';

// Scene status type
type SceneStatus = 'pending' | 'generating' | 'success' | 'failed' | 'rate_limited';

export default function StoryboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isAutoPilotRunning, setIsAutoPilotRunning] = useState(false);
  const [autoPilotStatus, setAutoPilotStatus] = useState('');
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState(-1);
  const [cameraMotion, setCameraMotion] = useState('Static');
  const [sceneStatuses, setSceneStatuses] = useState<Record<number, SceneStatus>>({});
  const [sceneErrors, setSceneErrors] = useState<Record<number, string>>({});

  const cameraMotions = [
    { value: 'Static', label: 'ثابت' },
    { value: 'Pan Left', label: 'تحريك لليسار' },
    { value: 'Pan Right', label: 'تحريك لليمين' },
    { value: 'Zoom In', label: 'تقريب (Zoom In)' },
    { value: 'Zoom Out', label: 'تبعيد (Zoom Out)' },
    { value: 'Tilt Up', label: 'إمالة لأعلى' },
    { value: 'Tilt Down', label: 'إمالة لأسفل' }
  ];

  useEffect(() => {
    if (id) {
      db.getStoryboard(id).then(setStoryboard);
    }
  }, [id]);

  const [videoStatuses, setVideoStatuses] = useState<Record<number, string>>({});
  const [isMerging, setIsMerging] = useState(false);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string>('');

  const exportFinalVideo = async () => {
    if (!storyboard) return;
    const videoUrls = storyboard.scenes
      .filter(s => s.videoClip)
      .map(s => s.videoClip!);
    
    if (videoUrls.length === 0) {
      alert('لا توجد فيديوهات لدمجها');
      return;
    }

    setIsMerging(true);
    try {
      const resp = await fetch(`${window.location.origin}/api/merge-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_urls: videoUrls }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.detail || 'فشل الدمج');
      setMergedVideoUrl(result.url);
    } catch (e: any) {
      alert(`فشل تصدير الفيديو: ${e.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  const generateFullVideo = async () => {
    if (!storyboard) return;
    setIsGenerating(true);

    const newScenes = [...storyboard.scenes];
    const tasks: { idx: number; taskId: string }[] = [];
    
    try {
      // Step 1: Submit all video generation tasks
      for (let i = 0; i < newScenes.length - 1; i++) {
        if (newScenes[i].videoClip) continue;

        const startFrame = newScenes[i].frameImage;
        if (!startFrame) continue;

        setCurrentGeneratingIndex(i);
        setVideoStatuses(prev => ({ ...prev, [i]: 'جاري الرفع...' }));

        let prompt = newScenes[i].description;
        if (newScenes[i].dialogue) {
          prompt += `. الشخصية تتحدث بوضوح مع تحريك الشفاه طوال المشهد: "${newScenes[i].dialogue}"`;
        }
        prompt += `. انتقال سلس إلى المشهد التالي.`;

        try {
          const result = await KieService.generateImageToVideo(
            startFrame,
            prompt,
            'veo3_fast',
            storyboard.aspectRatio || '16:9'
          );
          tasks.push({ idx: i, taskId: result.taskId });
          setVideoStatuses(prev => ({ ...prev, [i]: 'جاري التوليد...' }));
        } catch (e: any) {
          setVideoStatuses(prev => ({ ...prev, [i]: `فشل: ${e.message}` }));
        }
      }

      // Save task IDs to database so they persist even if browser is closed
      if (tasks.length > 0) {
        const videoTasks = tasks.map(t => ({ taskId: t.taskId, sceneIndex: t.idx }));
        await fetch(`${window.location.origin}/api/storyboards/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...storyboard, videoTasks }),
        });
      }

      // Step 2: Poll all tasks
      const pending = new Set(tasks.map(t => t.idx));
      let pollCount = 0;
      while (pending.size > 0 && pollCount < 120) {
        await new Promise(r => setTimeout(r, 5000));
        pollCount++;

        for (const task of tasks) {
          if (!pending.has(task.idx)) continue;
          try {
            const resp = await fetch(`${window.location.origin}/api/kie/task-status/${task.taskId}`);
            const result = await resp.json();

            if (result.status === 'completed' && result.videoUrl) {
              newScenes[task.idx].videoClip = result.videoUrl;
              pending.delete(task.idx);
              setVideoStatuses(prev => ({ ...prev, [task.idx]: 'مكتمل' }));
              const updated = { ...storyboard, scenes: newScenes };
              setStoryboard(updated);
              await db.saveStoryboard(updated);
            } else if (result.status === 'failed') {
              pending.delete(task.idx);
              setVideoStatuses(prev => ({ ...prev, [task.idx]: 'فشل التوليد' }));
            } else {
              setVideoStatuses(prev => ({ ...prev, [task.idx]: `جاري التوليد... (${pollCount})` }));
            }
          } catch { /* continue */ }
        }
      }
    } catch (error: any) {
      console.error(error);
      alert(`فشل توليد الفيديو: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setCurrentGeneratingIndex(-1);
    }
  };

  const generateImageForScene = async (sceneIndex: number) => {
    if (!storyboard) return;
    const scene = storyboard.scenes[sceneIndex];
    
    setIsGenerating(true);
    setCurrentGeneratingIndex(sceneIndex);
    setSceneStatuses(prev => ({ ...prev, [sceneIndex]: 'generating' }));
    setSceneErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[sceneIndex];
      return newErrors;
    });

    try {
      // Fetch character images to use as references
      const referenceImages: string[] = [];
      for (const charId of scene.characterIds) {
        const char = await db.getCharacter(charId);
        if (char) {
          // Support all image types from character sheet
          if (char.images.front) referenceImages.push(char.images.front);
          else if (char.images.closeup) referenceImages.push(char.images.closeup);
          else if (char.images.reference) referenceImages.push(char.images.reference);
        }
      }

      const imageUrl = await GeminiService.generateStoryboardFrame(
        scene.description,
        referenceImages,
        storyboard.aspectRatio || '16:9'
      );
      
      const newScenes = [...storyboard.scenes];
      newScenes[sceneIndex].frameImage = imageUrl;
      
      const updatedStoryboard = { ...storyboard, scenes: newScenes };
      setStoryboard(updatedStoryboard);
      await db.saveStoryboard(updatedStoryboard);
      setSceneStatuses(prev => ({ ...prev, [sceneIndex]: 'success' }));
    } catch (error: any) {
      console.error(error);
      setSceneStatuses(prev => ({ ...prev, [sceneIndex]: 'failed' }));
      setSceneErrors(prev => ({ ...prev, [sceneIndex]: error.message || 'فشل التوليد' }));
    } finally {
      setIsGenerating(false);
      setCurrentGeneratingIndex(-1);
    }
  };

  const generateAudioForScene = async (sceneIndex: number) => {
    if (!storyboard) return;
    const scene = storyboard.scenes[sceneIndex];
    if (!scene.dialogue) return;

    setIsGeneratingAudio(true);
    try {
      // Alternate voices based on index for variety, or let user choose.
      const voices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
      const voiceName = voices[sceneIndex % voices.length];
      
      const audioUrl = await GeminiService.generateVoiceover(scene.dialogue, voiceName);
      
      const newScenes = [...storyboard.scenes];
      newScenes[sceneIndex].audioClip = audioUrl;
      
      const updatedStoryboard = { ...storyboard, scenes: newScenes };
      setStoryboard(updatedStoryboard);
      await db.saveStoryboard(updatedStoryboard);
    } catch (error: any) {
      console.error(error);
      alert(`فشل توليد الصوت: ${error.message}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const runAutoPilot = async () => {
    if (!storyboard) return;
    
    // Check API Key for Pro models
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }

    setIsAutoPilotRunning(true);
    setAutoPilotStatus('بدء الإنتاج الشامل...');
    setSceneStatuses({});
    setSceneErrors({});

    // Helper function to wait with exponential backoff
    const waitForRateLimit = async (attempt: number = 1): Promise<void> => {
      const waitTime = Math.min(30000, 5000 * Math.pow(2, attempt - 1)); // 5s, 10s, 20s, max 30s
      setAutoPilotStatus(`تجاوز حد الاستخدام... انتظار ${Math.round(waitTime / 1000)} ثانية...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    };

    // Helper function to generate with retry
    const generateWithRetry = async <T,>(
      fn: () => Promise<T>,
      sceneIndex: number,
      maxRetries: number = 3
    ): Promise<T | null> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          setSceneStatuses(prev => ({ ...prev, [sceneIndex]: 'generating' }));
          const result = await fn();
          setSceneStatuses(prev => ({ ...prev, [sceneIndex]: 'success' }));
          return result;
        } catch (error: any) {
          console.error(`Attempt ${attempt} failed for scene ${sceneIndex}:`, error);
          
          // Check if rate limited
          if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('rate')) {
            setSceneStatuses(prev => ({ ...prev, [sceneIndex]: 'rate_limited' }));
            await waitForRateLimit(attempt);
            // Continue to retry
          } else if (attempt === maxRetries) {
            // Final attempt failed with non-rate-limit error
            setSceneStatuses(prev => ({ ...prev, [sceneIndex]: 'failed' }));
            setSceneErrors(prev => ({ ...prev, [sceneIndex]: error.message || 'خطأ غير معروف' }));
            return null;
          }
        }
      }
      setSceneStatuses(prev => ({ ...prev, [sceneIndex]: 'failed' }));
      return null;
    };

    try {
      let currentStoryboard = { ...storyboard };

      // 1. Generate Images
      for (let i = 0; i < currentStoryboard.scenes.length; i++) {
        if (!currentStoryboard.scenes[i].frameImage) {
          setAutoPilotStatus(`توليد صورة المشهد ${i + 1}...`);
          setCurrentGeneratingIndex(i);
          
          const scene = currentStoryboard.scenes[i];
          const referenceImages: string[] = [];
          for (const charId of scene.characterIds) {
            const char = await db.getCharacter(charId);
            if (char) {
              // Support all image types
              if (char.images.front) referenceImages.push(char.images.front);
              else if (char.images.closeup) referenceImages.push(char.images.closeup);
              else if (char.images.reference) referenceImages.push(char.images.reference);
            }
          }

          const imageUrl = await generateWithRetry(
            () => GeminiService.generateStoryboardFrame(
              scene.description,
              referenceImages,
              currentStoryboard.aspectRatio || '16:9'
            ),
            i
          );

          if (imageUrl) {
            currentStoryboard.scenes[i].frameImage = imageUrl;
            await db.saveStoryboard(currentStoryboard);
            setStoryboard({ ...currentStoryboard });
          }
          // Continue to next scene even if failed
        }
      }

      // 2. Generate Audio
      for (let i = 0; i < currentStoryboard.scenes.length; i++) {
        const scene = currentStoryboard.scenes[i];
        if (scene.dialogue && !scene.audioClip) {
          setAutoPilotStatus(`توليد صوت المشهد ${i + 1}...`);
          setCurrentGeneratingIndex(i);
          
          const voices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
          const voiceName = voices[i % voices.length];
          
          const audioUrl = await generateWithRetry(
            () => GeminiService.generateVoiceover(scene.dialogue!, voiceName),
            i + 1000 // Use different index range for audio
          );

          if (audioUrl) {
            currentStoryboard.scenes[i].audioClip = audioUrl;
            await db.saveStoryboard(currentStoryboard);
            setStoryboard({ ...currentStoryboard });
          }
        }
      }

      // 3. Generate Video
      for (let i = 0; i < currentStoryboard.scenes.length - 1; i++) {
        if (!currentStoryboard.scenes[i].videoClip) {
          setAutoPilotStatus(`توليد فيديو المشهد ${i + 1}...`);
          setCurrentGeneratingIndex(i);
          
          const startFrame = currentStoryboard.scenes[i].frameImage;
          const endFrame = currentStoryboard.scenes[i+1].frameImage;

          if (startFrame && endFrame) {
            const motionPrompt = cameraMotion !== 'Static' ? cameraMotion : undefined;
            const videoUrl = await generateWithRetry(
              () => GeminiService.generateVideoClip(startFrame, endFrame, currentStoryboard.aspectRatio || '16:9', motionPrompt),
              i + 2000 // Use different index range for video
            );

            if (videoUrl) {
              currentStoryboard.scenes[i].videoClip = videoUrl;
              await db.saveStoryboard(currentStoryboard);
              setStoryboard({ ...currentStoryboard });
            }
          }
        }
      }

      // Check if any scenes failed
      const failedScenes = Object.entries(sceneStatuses).filter(([_, status]) => status === 'failed');
      if (failedScenes.length > 0) {
        setAutoPilotStatus(`تم مع ${failedScenes.length} أخطاء - استخدم زر إعادة التوليد`);
      } else {
        setAutoPilotStatus('تم الانتهاء بنجاح! 🎉');
      }
      setTimeout(() => setAutoPilotStatus(''), 5000);

    } catch (error: any) {
      console.error(error);
      setAutoPilotStatus(`خطأ: ${error.message}`);
    } finally {
      setIsAutoPilotRunning(false);
      setCurrentGeneratingIndex(-1);
    }
  };

  if (!storyboard) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="p-4 max-w-lg mx-auto min-h-screen bg-background pb-32">
      <div className="flex items-center mb-6 pt-2">
        <button onClick={() => navigate('/storyboards')} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold mr-2 truncate text-foreground">{storyboard.title}</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-indigo-50 p-4 rounded-xl">
          <h3 className="font-bold text-sm mb-2 text-indigo-900">السيناريو</h3>
          <p className="text-xs text-indigo-800 leading-relaxed">{storyboard.script}</p>
        </div>

        <div className="space-y-8">
          {storyboard.scenes.map((scene, idx) => (
            <div key={scene.id} className="relative bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">مشهد {idx + 1}</span>
                <div className="flex gap-2">
                  {scene.audioClip && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full">صوت ✅</span>}
                  {idx < storyboard.scenes.length - 1 && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          {scene.videoClip ? 'فيديو ✅' : 'بانتظار الفيديو'}
                      </span>
                  )}
                </div>
              </div>

              {/* Video Clip or Image */}
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner relative mb-3">
                {scene.videoClip ? (
                  <video src={scene.videoClip} controls className="w-full h-full" />
                ) : scene.frameImage ? (
                  <div className="relative w-full h-full">
                    <img src={scene.frameImage} className="w-full h-full object-cover opacity-90" />
                    {/* Regenerate button for existing image */}
                    <button
                      onClick={() => generateImageForScene(idx)}
                      disabled={isGenerating || isAutoPilotRunning}
                      className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors disabled:opacity-50"
                      title="إعادة توليد"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {/* Video generation status overlay */}
                    {videoStatuses[idx] && !scene.videoClip && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-2">
                        {videoStatuses[idx].includes('فشل') ? (
                          <span className="text-red-400">{videoStatuses[idx]}</span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {videoStatuses[idx]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 gap-3">
                    {sceneStatuses[idx] === 'failed' && (
                      <div className="text-red-400 text-xs text-center px-4 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {sceneErrors[idx] || 'فشل التوليد'}
                      </div>
                    )}
                    {sceneStatuses[idx] === 'rate_limited' && (
                      <div className="text-amber-400 text-xs text-center px-4 flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        انتظار... تجاوز حد الاستخدام
                      </div>
                    )}
                    <button
                      onClick={() => generateImageForScene(idx)}
                      disabled={isGenerating || isAutoPilotRunning}
                      className={`${sceneStatuses[idx] === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2`}
                    >
                      {(isGenerating || isAutoPilotRunning) && currentGeneratingIndex === idx ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : sceneStatuses[idx] === 'failed' ? (
                        <RefreshCw className="w-4 h-4" />
                      ) : (
                        <Film className="w-4 h-4" />
                      )}
                      {sceneStatuses[idx] === 'failed' ? 'إعادة التوليد' : 'توليد صورة المشهد'}
                    </button>
                  </div>
                )}
                
                {/* Status indicator */}
                {sceneStatuses[idx] === 'generating' && currentGeneratingIndex === idx && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <span className="text-sm">جاري التوليد...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">{scene.description}</p>
              
              {/* Dialogue */}
              {scene.dialogue && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs font-medium text-slate-700">الحوار: "{scene.dialogue}"</p>
                </div>
              )}

              {/* Connector Line */}
              {idx < storyboard.scenes.length - 1 && (
                <div className="absolute -bottom-8 left-1/2 w-0.5 h-8 bg-slate-200 -z-10"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Merged Video Modal */}
      {mergedVideoUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setMergedVideoUrl('')}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center">الفيديو النهائي</h3>
            <video src={mergedVideoUrl} controls className="w-full rounded-xl" autoPlay />
            <a
              href={mergedVideoUrl}
              download="final_video.mp4"
              className="block w-full py-3 bg-green-600 text-white rounded-xl font-bold text-center hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 inline ml-2" />
              تحميل الفيديو
            </a>
            <button
              onClick={() => setMergedVideoUrl('')}
              className="block w-full py-2 text-slate-500 text-sm"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      {(() => {
        const hasAllVideos = storyboard.scenes.slice(0, -1).every(s => s.videoClip);
        const hasAnyVideos = storyboard.scenes.some(s => s.videoClip);
        const hasAnyImages = storyboard.scenes.some(s => s.frameImage);
        const hasMissingImages = storyboard.scenes.some(s => !s.frameImage);
        
        return (
          <div className="fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/60 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <div className="max-w-lg mx-auto space-y-2.5">

              {/* Auto-pilot button - when images are missing */}
              {hasMissingImages && (
                <button
                  onClick={runAutoPilot}
                  disabled={isGenerating || isAutoPilotRunning}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:from-amber-500 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isAutoPilotRunning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{autoPilotStatus}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      <span>الإنتاج الشامل السحري (Auto-Pilot)</span>
                    </>
                  )}
                </button>
              )}

              {/* Generate videos button - when images exist but videos don't */}
              {hasAnyImages && !hasAllVideos && (
                <button
                  onClick={generateFullVideo}
                  disabled={isGenerating || isAutoPilotRunning}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isGenerating && !isAutoPilotRunning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري التوليد... {videoStatuses[currentGeneratingIndex] || ''}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>توليد الفيديوهات (Veo3)</span>
                    </>
                  )}
                </button>
              )}

              {/* Export final video button - when videos exist */}
              {hasAnyVideos && (
                <button
                  onClick={exportFinalVideo}
                  disabled={isMerging}
                  className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  data-testid="export-final-video-btn"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري دمج الفيديوهات...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>تصدير الفيديو النهائي</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
