import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Loader2, Download, Film, Mic, Video, Wand2 } from 'lucide-react';
import { db, Storyboard, Scene } from '../lib/db';
import { GeminiService } from '../lib/gemini';

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

  const generateFullVideo = async () => {
    if (!storyboard) return;
    setIsGenerating(true);

    const newScenes = [...storyboard.scenes];
    
    try {
      for (let i = 0; i < newScenes.length - 1; i++) {
        if (newScenes[i].videoClip) continue; // Skip if already generated

        setCurrentGeneratingIndex(i);
        const startFrame = newScenes[i].frameImage;
        const endFrame = newScenes[i+1].frameImage;

        if (startFrame && endFrame) {
            const aspectRatio = storyboard.aspectRatio || '16:9';
            const motionPrompt = cameraMotion !== 'Static' ? cameraMotion : undefined;
            const videoUrl = await GeminiService.generateVideoClip(startFrame, endFrame, aspectRatio, motionPrompt);
            newScenes[i].videoClip = videoUrl;
            
            // Save progress
            const updatedStoryboard = { ...storyboard, scenes: newScenes };
            setStoryboard(updatedStoryboard);
            await db.saveStoryboard(updatedStoryboard);
        }
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'حدث خطأ غير معروف';
      alert(`فشل توليد الفيديو: ${msg}`);
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
    try {
      // Fetch character images to use as references
      const referenceImages: string[] = [];
      for (const charId of scene.characterIds) {
        const char = await db.getCharacter(charId);
        if (char && char.images.front) {
          referenceImages.push(char.images.front);
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
    } catch (error: any) {
      console.error(error);
      alert(`فشل توليد الصورة: ${error.message}`);
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
            if (char && char.images.front) referenceImages.push(char.images.front);
          }

          const imageUrl = await GeminiService.generateStoryboardFrame(
            scene.description,
            referenceImages,
            currentStoryboard.aspectRatio || '16:9'
          );
          
          currentStoryboard.scenes[i].frameImage = imageUrl;
          await db.saveStoryboard(currentStoryboard);
          setStoryboard({ ...currentStoryboard });
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
          
          const audioUrl = await GeminiService.generateVoiceover(scene.dialogue, voiceName);
          currentStoryboard.scenes[i].audioClip = audioUrl;
          await db.saveStoryboard(currentStoryboard);
          setStoryboard({ ...currentStoryboard });
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
            const videoUrl = await GeminiService.generateVideoClip(startFrame, endFrame, currentStoryboard.aspectRatio || '16:9', motionPrompt);
            currentStoryboard.scenes[i].videoClip = videoUrl;
            await db.saveStoryboard(currentStoryboard);
            setStoryboard({ ...currentStoryboard });
          }
        }
      }

      setAutoPilotStatus('تم الانتهاء بنجاح! 🎉');
      setTimeout(() => setAutoPilotStatus(''), 4000);

    } catch (error: any) {
      console.error(error);
      alert(`توقف الإنتاج التلقائي: ${error.message}`);
      setAutoPilotStatus('');
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
                  <img src={scene.frameImage} className="w-full h-full object-cover opacity-90" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <button
                      onClick={() => generateImageForScene(idx)}
                      disabled={isGenerating || isAutoPilotRunning}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {(isGenerating || isAutoPilotRunning) && currentGeneratingIndex === idx ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Film className="w-4 h-4" />
                      )}
                      توليد صورة المشهد
                    </button>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">{scene.description}</p>
              
              {/* Dialogue & Audio */}
              {scene.dialogue && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs font-medium text-slate-700 mb-2">💬 الحوار: "{scene.dialogue}"</p>
                  
                  {scene.audioClip ? (
                    <audio src={scene.audioClip} controls className="w-full h-8" />
                  ) : (
                    <button 
                      onClick={() => generateAudioForScene(idx)}
                      disabled={isGeneratingAudio || isAutoPilotRunning}
                      className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                    >
                      <Mic className="w-3 h-3" />
                      توليد تعليق صوتي (TTS)
                    </button>
                  )}
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

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/60 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto space-y-2.5">
          
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Video className="w-4 h-4" /> حركة الكاميرا:
            </span>
            <select 
              value={cameraMotion}
              onChange={(e) => setCameraMotion(e.target.value)}
              disabled={isGenerating || isAutoPilotRunning}
              className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-500 disabled:opacity-50"
            >
              {cameraMotions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

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

          <button
            onClick={generateFullVideo}
            disabled={isGenerating || isAutoPilotRunning}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isGenerating && !isAutoPilotRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري توليد المشهد {currentGeneratingIndex + 1}...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>توليد الفيديو الكامل (Veo3)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
