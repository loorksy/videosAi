import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Loader2, Download, Film, Mic, Video, Wand2, RefreshCw, AlertCircle, FolderDown, Image, FileVideo, FileAudio, Package, Zap } from 'lucide-react';
import { db, Storyboard, Scene } from '../lib/db';
import { GeminiService } from '../lib/gemini';
import { useTaskContext } from '../context/TaskContext';

// Scene status type
type SceneStatus = 'pending' | 'generating' | 'success' | 'failed' | 'rate_limited';

export default function StoryboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addTask, tasks } = useTaskContext();
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isAutoPilotRunning, setIsAutoPilotRunning] = useState(false);
  const [autoPilotStatus, setAutoPilotStatus] = useState('');
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState(-1);
  const [cameraMotion, setCameraMotion] = useState('Static');
  const [sceneStatuses, setSceneStatuses] = useState<Record<number, SceneStatus>>({});
  const [sceneErrors, setSceneErrors] = useState<Record<number, string>>({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [videoError, setVideoError] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Reload storyboard when background task completes
  useEffect(() => {
    const relatedTask = tasks.find(t => t.relatedId === id && t.status === 'completed');
    if (relatedTask && relatedTask.result) {
      setStoryboard(relatedTask.result);
    }
  }, [tasks, id]);

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
      // Store error for display in UI
      setVideoError(msg);
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
      // Fetch character images and build DNA
      const referenceImages: string[] = [];
      const characterDNAParts: string[] = [];
      
      for (const charId of scene.characterIds) {
        const char = await db.getCharacter(charId);
        if (char) {
          // Add to DNA
          characterDNAParts.push(`${char.name}: ${char.visualTraits || char.description}`);
          
          // Collect ALL available images for better reference
          const imgs = char.images as Record<string, string | undefined>;
          for (const value of Object.values(imgs)) {
            if (value && typeof value === 'string' && value.length > 100) {
              referenceImages.push(value);
              break; // One image per character is enough
            }
          }
        }
      }

      // Get first scene image (establishing shot) and previous scene
      const firstSceneImage = storyboard.scenes[0]?.frameImage;
      const previousSceneImage = sceneIndex > 0 ? storyboard.scenes[sceneIndex - 1]?.frameImage : undefined;

      const imageUrl = await GeminiService.generateStoryboardFrame({
        sceneDescription: scene.description,
        characterImages: referenceImages,
        firstSceneImage,
        previousSceneImage,
        sceneIndex,
        totalScenes: storyboard.scenes.length,
        style: storyboard.style || 'cinematic realistic',
        aspectRatio: storyboard.aspectRatio || '16:9',
        characterDNA: characterDNAParts.join('\n'),
      });
      
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

  // Generate video for a single scene
  const generateVideoForScene = async (sceneIndex: number) => {
    if (!storyboard || sceneIndex >= storyboard.scenes.length - 1) return;
    
    setIsGenerating(true);
    setCurrentGeneratingIndex(sceneIndex);
    setVideoError(null);
    
    try {
      const startFrame = storyboard.scenes[sceneIndex].frameImage;
      const endFrame = storyboard.scenes[sceneIndex + 1].frameImage;
      
      if (!startFrame || !endFrame) {
        throw new Error("يجب توليد صور المشهد الحالي والمشهد التالي أولاً");
      }
      
      const motionPrompt = cameraMotion !== 'Static' ? cameraMotion : undefined;
      const videoUrl = await GeminiService.generateVideoClip(
        startFrame, 
        endFrame, 
        storyboard.aspectRatio || '16:9', 
        motionPrompt
      );
      
      const newScenes = [...storyboard.scenes];
      newScenes[sceneIndex].videoClip = videoUrl;
      
      const updatedStoryboard = { ...storyboard, scenes: newScenes };
      setStoryboard(updatedStoryboard);
      await db.saveStoryboard(updatedStoryboard);
    } catch (error: any) {
      console.error(error);
      setVideoError(error.message || 'فشل توليد الفيديو');
    } finally {
      setIsGenerating(false);
      setCurrentGeneratingIndex(-1);
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
          const characterDNAParts: string[] = [];
          
          for (const charId of scene.characterIds) {
            const char = await db.getCharacter(charId);
            if (char) {
              characterDNAParts.push(`${char.name}: ${char.visualTraits || char.description}`);
              const imgs = char.images as Record<string, string | undefined>;
              for (const value of Object.values(imgs)) {
                if (value && typeof value === 'string' && value.length > 100) {
                  referenceImages.push(value);
                  break;
                }
              }
            }
          }

          // Get first scene and previous scene for consistency
          const firstSceneImage = currentStoryboard.scenes[0]?.frameImage;
          const previousSceneImage = i > 0 ? currentStoryboard.scenes[i - 1]?.frameImage : undefined;

          const imageUrl = await generateWithRetry(
            () => GeminiService.generateStoryboardFrame({
              sceneDescription: scene.description,
              characterImages: referenceImages,
              firstSceneImage,
              previousSceneImage,
              sceneIndex: i,
              totalScenes: currentStoryboard.scenes.length,
              style: currentStoryboard.style || 'cinematic realistic',
              aspectRatio: currentStoryboard.aspectRatio || '16:9',
              characterDNA: characterDNAParts.join('\n'),
            }),
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

      // 3. Generate Video (with better error handling for child content)
      let videoGenerationFailed = false;
      let videoErrorMessage = '';
      
      for (let i = 0; i < currentStoryboard.scenes.length - 1; i++) {
        if (!currentStoryboard.scenes[i].videoClip) {
          setAutoPilotStatus(`توليد فيديو المشهد ${i + 1}...`);
          setCurrentGeneratingIndex(i);
          
          const startFrame = currentStoryboard.scenes[i].frameImage;
          const endFrame = currentStoryboard.scenes[i+1].frameImage;

          if (startFrame && endFrame) {
            const motionPrompt = cameraMotion !== 'Static' ? cameraMotion : undefined;
            try {
              const videoUrl = await generateWithRetry(
                () => GeminiService.generateVideoClip(startFrame, endFrame, currentStoryboard.aspectRatio || '16:9', motionPrompt),
                i + 2000
              );

              if (videoUrl) {
                currentStoryboard.scenes[i].videoClip = videoUrl;
                await db.saveStoryboard(currentStoryboard);
                setStoryboard({ ...currentStoryboard });
              }
            } catch (videoError: any) {
              videoGenerationFailed = true;
              videoErrorMessage = videoError.message || 'فشل توليد الفيديو';
              // Don't stop the entire process, just skip this scene's video
              console.error(`Video generation failed for scene ${i + 1}:`, videoError);
            }
          }
        }
      }

      // Show video error if any
      if (videoGenerationFailed && videoErrorMessage) {
        setVideoError(videoErrorMessage);
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

  // Run AutoPilot in Background
  const runAutoPilotInBackground = () => {
    if (!storyboard) return;
    
    const storyboardId = storyboard.id;
    const storyboardTitle = storyboard.title;
    const currentCameraMotion = cameraMotion;
    
    addTask('storyboard', `إنتاج: ${storyboardTitle}`, async (updateProgress) => {
      let currentStoryboard = await db.getStoryboard(storyboardId);
      if (!currentStoryboard) throw new Error('لم يتم العثور على القصة');
      
      const totalSteps = currentStoryboard.scenes.length * 3; // images + audio + videos
      let completedSteps = 0;
      
      const updateTaskProgress = (step: string) => {
        completedSteps++;
        const progress = Math.round((completedSteps / totalSteps) * 100);
        updateProgress(progress, step);
      };
      
      // 1. Generate Images
      for (let i = 0; i < currentStoryboard.scenes.length; i++) {
        if (!currentStoryboard.scenes[i].frameImage) {
          updateProgress(Math.round((completedSteps / totalSteps) * 100), `توليد صورة المشهد ${i + 1}...`);
          
          const scene = currentStoryboard.scenes[i];
          const referenceImages: string[] = [];
          const characterDNAParts: string[] = [];
          
          for (const charId of scene.characterIds) {
            const char = await db.getCharacter(charId);
            if (char) {
              characterDNAParts.push(`${char.name}: ${char.visualTraits || char.description}`);
              const imgs = char.images as Record<string, string | undefined>;
              for (const value of Object.values(imgs)) {
                if (value && typeof value === 'string' && value.length > 100) {
                  referenceImages.push(value);
                  break;
                }
              }
            }
          }

          const firstSceneImage = currentStoryboard.scenes[0]?.frameImage;
          const previousSceneImage = i > 0 ? currentStoryboard.scenes[i - 1]?.frameImage : undefined;

          try {
            const imageUrl = await GeminiService.generateStoryboardFrame({
              sceneDescription: scene.description,
              characterImages: referenceImages,
              firstSceneImage,
              previousSceneImage,
              sceneIndex: i,
              totalScenes: currentStoryboard.scenes.length,
              style: currentStoryboard.style || 'cinematic realistic',
              aspectRatio: currentStoryboard.aspectRatio || '16:9',
              characterDNA: characterDNAParts.join('\n'),
            });

            currentStoryboard.scenes[i].frameImage = imageUrl;
            await db.saveStoryboard(currentStoryboard);
          } catch (error) {
            console.error(`Image generation failed for scene ${i + 1}:`, error);
          }
        }
        updateTaskProgress(`صورة ${i + 1}`);
      }

      // Reload storyboard
      currentStoryboard = (await db.getStoryboard(storyboardId))!;

      // 2. Generate Audio
      const voices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
      for (let i = 0; i < currentStoryboard.scenes.length; i++) {
        const scene = currentStoryboard.scenes[i];
        if (scene.dialogue && !scene.audioClip) {
          updateProgress(Math.round((completedSteps / totalSteps) * 100), `توليد صوت المشهد ${i + 1}...`);
          
          try {
            const voiceName = voices[i % voices.length];
            const audioUrl = await GeminiService.generateVoiceover(scene.dialogue, voiceName);
            currentStoryboard.scenes[i].audioClip = audioUrl;
            await db.saveStoryboard(currentStoryboard);
          } catch (error) {
            console.error(`Audio generation failed for scene ${i + 1}:`, error);
          }
        }
        updateTaskProgress(`صوت ${i + 1}`);
      }

      // Reload storyboard
      currentStoryboard = (await db.getStoryboard(storyboardId))!;

      // 3. Generate Videos
      for (let i = 0; i < currentStoryboard.scenes.length - 1; i++) {
        if (!currentStoryboard.scenes[i].videoClip) {
          updateProgress(Math.round((completedSteps / totalSteps) * 100), `توليد فيديو المشهد ${i + 1}...`);
          
          const startFrame = currentStoryboard.scenes[i].frameImage;
          const endFrame = currentStoryboard.scenes[i + 1].frameImage;

          if (startFrame && endFrame) {
            try {
              const motionPrompt = currentCameraMotion !== 'Static' ? currentCameraMotion : undefined;
              const videoUrl = await GeminiService.generateVideoClip(
                startFrame, 
                endFrame, 
                currentStoryboard.aspectRatio || '16:9', 
                motionPrompt
              );
              currentStoryboard.scenes[i].videoClip = videoUrl;
              await db.saveStoryboard(currentStoryboard);
            } catch (error) {
              console.error(`Video generation failed for scene ${i + 1}:`, error);
            }
          }
        }
        updateTaskProgress(`فيديو ${i + 1}`);
      }

      // Update local state if still on same page
      const finalStoryboard = await db.getStoryboard(storyboardId);
      return finalStoryboard;
    }, storyboard.id);
    
    // Navigate away or show confirmation
    navigate('/storyboards');
  };

  // === EXPORT FUNCTIONS ===
  
  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllImages = async () => {
    if (!storyboard) return;
    setIsExporting(true);
    setExportProgress('جاري تصدير الصور...');
    
    try {
      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scene = storyboard.scenes[i];
        if (scene.frameImage) {
          setExportProgress(`تصدير صورة المشهد ${i + 1}...`);
          downloadFile(scene.frameImage, `${storyboard.title}_scene_${i + 1}.png`);
          await new Promise(r => setTimeout(r, 500)); // Small delay between downloads
        }
      }
      setExportProgress('تم تصدير جميع الصور!');
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('حدث خطأ أثناء التصدير');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
      }, 2000);
    }
  };

  const exportAllVideos = async () => {
    if (!storyboard) return;
    setIsExporting(true);
    setExportProgress('جاري تصدير الفيديوهات...');
    
    try {
      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scene = storyboard.scenes[i];
        if (scene.videoClip) {
          setExportProgress(`تصدير فيديو المشهد ${i + 1}...`);
          downloadFile(scene.videoClip, `${storyboard.title}_video_${i + 1}.mp4`);
          await new Promise(r => setTimeout(r, 500));
        }
      }
      setExportProgress('تم تصدير جميع الفيديوهات!');
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('حدث خطأ أثناء التصدير');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
      }, 2000);
    }
  };

  const exportAllAudio = async () => {
    if (!storyboard) return;
    setIsExporting(true);
    setExportProgress('جاري تصدير الصوتيات...');
    
    try {
      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scene = storyboard.scenes[i];
        if (scene.audioClip) {
          setExportProgress(`تصدير صوت المشهد ${i + 1}...`);
          downloadFile(scene.audioClip, `${storyboard.title}_audio_${i + 1}.wav`);
          await new Promise(r => setTimeout(r, 500));
        }
      }
      setExportProgress('تم تصدير جميع الصوتيات!');
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('حدث خطأ أثناء التصدير');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
      }, 2000);
    }
  };

  const exportProjectData = () => {
    if (!storyboard) return;
    setIsExporting(true);
    setExportProgress('جاري تصدير بيانات المشروع...');
    
    try {
      const projectData = {
        ...storyboard,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      downloadFile(url, `${storyboard.title}_project.json`);
      URL.revokeObjectURL(url);
      
      setExportProgress('تم تصدير بيانات المشروع!');
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('حدث خطأ أثناء التصدير');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
      }, 2000);
    }
  };

  const exportEverything = async () => {
    if (!storyboard) return;
    setIsExporting(true);
    setShowExportMenu(false);
    
    try {
      // Export images
      setExportProgress('تصدير الصور...');
      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scene = storyboard.scenes[i];
        if (scene.frameImage) {
          downloadFile(scene.frameImage, `${storyboard.title}_scene_${i + 1}.png`);
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      // Export videos
      setExportProgress('تصدير الفيديوهات...');
      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scene = storyboard.scenes[i];
        if (scene.videoClip) {
          downloadFile(scene.videoClip, `${storyboard.title}_video_${i + 1}.mp4`);
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      // Export audio
      setExportProgress('تصدير الصوتيات...');
      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scene = storyboard.scenes[i];
        if (scene.audioClip) {
          downloadFile(scene.audioClip, `${storyboard.title}_audio_${i + 1}.wav`);
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      // Export project data
      setExportProgress('تصدير بيانات المشروع...');
      const projectData = {
        ...storyboard,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      downloadFile(url, `${storyboard.title}_project.json`);
      URL.revokeObjectURL(url);
      
      setExportProgress('تم تصدير كل شيء بنجاح!');
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('حدث خطأ أثناء التصدير');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
      }, 3000);
    }
  };

  // Calculate export stats
  const exportStats = storyboard ? {
    images: storyboard.scenes.filter(s => s.frameImage).length,
    videos: storyboard.scenes.filter(s => s.videoClip).length,
    audio: storyboard.scenes.filter(s => s.audioClip).length,
  } : { images: 0, videos: 0, audio: 0 };

  if (!storyboard) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="p-4 max-w-lg mx-auto min-h-screen bg-background pb-32">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center">
          <button onClick={() => navigate('/storyboards')} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold mr-2 truncate text-foreground">{storyboard.title}</h1>
        </div>
        
        {/* Export Button */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderDown className="w-4 h-4" />
            )}
            <span>تصدير</span>
          </button>
          
          {/* Export Menu Dropdown */}
          {showExportMenu && !isExporting && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-500">محتوى متاح للتصدير</p>
                <div className="flex gap-3 mt-1 text-xs text-slate-600">
                  <span>{exportStats.images} صورة</span>
                  <span>{exportStats.videos} فيديو</span>
                  <span>{exportStats.audio} صوت</span>
                </div>
              </div>
              
              <button
                onClick={() => { exportAllImages(); setShowExportMenu(false); }}
                disabled={exportStats.images === 0}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Image className="w-4 h-4 text-blue-500" />
                <span>تصدير جميع الصور</span>
                <span className="mr-auto text-xs text-slate-400">({exportStats.images})</span>
              </button>
              
              <button
                onClick={() => { exportAllVideos(); setShowExportMenu(false); }}
                disabled={exportStats.videos === 0}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileVideo className="w-4 h-4 text-purple-500" />
                <span>تصدير جميع الفيديوهات</span>
                <span className="mr-auto text-xs text-slate-400">({exportStats.videos})</span>
              </button>
              
              <button
                onClick={() => { exportAllAudio(); setShowExportMenu(false); }}
                disabled={exportStats.audio === 0}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileAudio className="w-4 h-4 text-green-500" />
                <span>تصدير جميع الصوتيات</span>
                <span className="mr-auto text-xs text-slate-400">({exportStats.audio})</span>
              </button>
              
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => { exportProjectData(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>تصدير بيانات المشروع (JSON)</span>
                </button>
                
                <button
                  onClick={exportEverything}
                  disabled={exportStats.images === 0 && exportStats.videos === 0 && exportStats.audio === 0}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Package className="w-4 h-4" />
                  <span>تصدير كل شيء</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Export Progress Indicator */}
      {isExporting && exportProgress && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span className="text-sm text-emerald-700">{exportProgress}</span>
        </div>
      )}

      {/* Video Generation Error Alert */}
      {videoError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm text-red-800 mb-2">فشل توليد الفيديو</h4>
              <div className="text-xs text-red-700 whitespace-pre-line leading-relaxed">
                {videoError}
              </div>
              <button
                onClick={() => setVideoError(null)}
                className="mt-3 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

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
              
              {/* Single Scene Video Generation Button */}
              {idx < storyboard.scenes.length - 1 && scene.frameImage && storyboard.scenes[idx + 1].frameImage && !scene.videoClip && (
                <button
                  onClick={() => generateVideoForScene(idx)}
                  disabled={isGenerating || isAutoPilotRunning}
                  className="w-full mb-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isGenerating && currentGeneratingIndex === idx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري توليد الفيديو...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>توليد فيديو هذا المشهد</span>
                    </>
                  )}
                </button>
              )}

              {/* Dialogue & Audio */}
              {scene.dialogue && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs font-medium text-slate-700 mb-2">الحوار: "{scene.dialogue}"</p>
                  
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

          {/* Two-button layout for AutoPilot */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={runAutoPilot}
              disabled={isGenerating || isAutoPilotRunning}
              className="py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:from-amber-500 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {isAutoPilotRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm truncate">{autoPilotStatus}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span className="text-sm">إنتاج (انتظار)</span>
                </>
              )}
            </button>
            
            <button
              onClick={runAutoPilotInBackground}
              disabled={isAutoPilotRunning}
              className="py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span className="text-sm">إنتاج (خلفية)</span>
            </button>
          </div>

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
