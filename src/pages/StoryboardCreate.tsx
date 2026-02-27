import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, Users, Film, Play, Loader2, Check, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { db, Character, Storyboard, Scene } from '../lib/db';
import { GeminiService } from '../lib/gemini';
import { cn } from '../lib/utils';

export default function StoryboardCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'chars' | 'script' | 'scenes' | 'frames' | 'preview'>('chars');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [idea, setIdea] = useState('');
  const [script, setScript] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // New Professional Options
  const [style, setStyle] = useState('Cinematic');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const styles = [
    { value: 'Cinematic', label: 'سينمائي' },
    { value: 'Anime', label: 'أنمي' },
    { value: '3D Render', label: 'ثلاثي الأبعاد' },
    { value: 'Watercolor', label: 'ألوان مائية' },
    { value: 'Cyberpunk', label: 'سايبربانك' },
    { value: 'Minimalist', label: 'بسيط (Minimalist)' }
  ];
  const ratios = [
    { id: '16:9', label: 'عرضي (يوتيوب)', icon: '▭' },
    { id: '9:16', label: 'طولي (تيك توك/ريلز)', icon: '▯' }
  ];

  useEffect(() => {
    db.getAllCharacters().then(setCharacters);
  }, []);

  const toggleChar = (id: string) => {
    setSelectedCharIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const generateScript = async () => {
    if (!idea || selectedCharIds.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus('جاري كتابة السيناريو وتقسيم المشاهد...');
    
    try {
      const selectedChars = characters.filter(c => selectedCharIds.includes(c.id));
      
      // Enhance idea with style context
      const enhancedIdea = `${idea}. Visual Style: ${style}. Format: ${aspectRatio}.`;
      
      const result = await GeminiService.generateScriptAndScenes(enhancedIdea, selectedChars);
      
      setScript(result.script);
      setScenes(result.scenes.map(s => ({
        id: uuidv4(),
        description: s.description,
        characterIds: s.characters.map(name => {
            // Try to map back to IDs, fuzzy match or just use the first match
            const found = selectedChars.find(c => c.name.includes(name) || name.includes(c.name));
            return found ? found.id : '';
        }).filter(Boolean),
      })));
      setStep('scenes');
    } catch (error) {
      console.error(error);
      alert('فشل توليد السيناريو');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateFrames = async () => {
    setIsProcessing(true);
    setStep('frames');
    
    const newScenes = [...scenes];
    const selectedChars = characters.filter(c => selectedCharIds.includes(c.id));
    
    // Build character DNA string
    const characterDNA = selectedChars.map(c => 
      `${c.name}: ${c.visualTraits || c.description}`
    ).join('\n');

    // Collect ALL character reference images
    const allCharImages: string[] = [];
    for (const char of selectedChars) {
      const imgs = char.images as Record<string, string | undefined>;
      for (const value of Object.values(imgs)) {
        if (value && typeof value === 'string' && value.length > 100) {
          allCharImages.push(value);
          break; // one per character
        }
      }
    }

    try {
      let previousSceneImage: string | undefined;

      for (let i = 0; i < newScenes.length; i++) {
        setProcessingStatus(`جاري رسم المشهد ${i + 1} من ${newScenes.length}...${i > 0 ? ' (مع مرجع المشهد السابق)' : ' (المشهد المرجعي الأساسي)'}`);
        
        const scene = newScenes[i];
        
        // Get character images specific to this scene
        const sceneChars = selectedChars.filter(c => scene.characterIds.includes(c.id));
        const sceneCharImages = sceneChars.length > 0 ? sceneChars.map(c => {
          const imgs = c.images as Record<string, string | undefined>;
          return Object.values(imgs).find(v => v && typeof v === 'string' && v.length > 100) || '';
        }).filter(Boolean) : allCharImages;

        try {
          const frameImage = await GeminiService.generateStoryboardFrame({
            sceneDescription: scene.description,
            characterImages: sceneCharImages,
            previousSceneImage,
            sceneIndex: i,
            totalScenes: newScenes.length,
            style,
            aspectRatio,
            characterDNA,
          });
          
          newScenes[i].frameImage = frameImage;
          previousSceneImage = frameImage; // Pass to next scene as reference
          setScenes([...newScenes]);
        } catch (sceneError: any) {
          console.error(`Scene ${i + 1} failed:`, sceneError);
          // Mark as failed but continue to next scene
          newScenes[i].frameImage = undefined;
          setScenes([...newScenes]);
          // Don't break - continue generating remaining scenes
        }
      }
      setStep('preview');
    } catch (error) {
      console.error(error);
      alert('فشل توليد المشاهد');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveStoryboard = async () => {
    const storyboard: Storyboard = {
      id: uuidv4(),
      title: idea.slice(0, 30) + (idea.length > 30 ? '...' : ''),
      script,
      characters: selectedCharIds,
      scenes,
      aspectRatio,
      createdAt: Date.now()
    };
    await db.saveStoryboard(storyboard);
    navigate('/storyboards');
  };

  return (
    <div className="p-4 max-w-lg mx-auto min-h-screen bg-background pb-24">
      <div className="flex items-center mb-6 pt-2">
        <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold mr-2 text-foreground">قصة جديدة</h1>
      </div>

      {/* Step 1: Select Characters */}
      {step === 'chars' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">اختر الشخصيات</h2>
            <p className="text-sm text-slate-500 mb-4">حدد الشخصيات التي ستظهر في القصة</p>
            <div className="grid grid-cols-3 gap-3">
              {characters.map(char => (
                <button
                  key={char.id}
                  onClick={() => toggleChar(char.id)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    selectedCharIds.includes(char.id) ? "border-indigo-600 ring-2 ring-indigo-100" : "border-transparent"
                  )}
                >
                  <img src={char.images.front || char.images.normal || Object.values(char.images).find(v => v && typeof v === 'string' && (v as string).length > 100) as string} className="w-full h-full object-cover" />
                  {selectedCharIds.includes(char.id) && (
                    <div className="absolute inset-0 bg-indigo-900/20 flex items-center justify-center">
                      <Check className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] p-1 truncate text-center">
                    {char.name}
                  </div>
                </button>
              ))}
              <button 
                onClick={() => navigate('/characters/new')}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50"
              >
                <Users className="w-6 h-6 mb-1" />
                <span className="text-xs">إضافة</span>
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setStep('script')}
            disabled={selectedCharIds.length === 0}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}

      {/* Step 2: Script Input & Settings */}
      {step === 'script' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">فكرة القصة</label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder="اكتب ملخصاً قصيراً للقصة..."
            />
          </div>

          {/* Style Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">نمط الفيديو</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {styles.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={cn(
                    "whitespace-nowrap py-2 px-3 text-xs font-medium rounded-lg border transition-all",
                    style === s.value 
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">أبعاد الفيديو</label>
            <div className="grid grid-cols-3 gap-2">
              {ratios.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setAspectRatio(r.id as any)}
                  className={cn(
                    "py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                    aspectRatio === r.id 
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200"
                  )}
                >
                  <span className="text-lg">{r.icon}</span>
                  <span className="text-[10px] font-medium">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateScript}
            disabled={!idea || isProcessing}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>{isProcessing ? 'جاري الكتابة...' : 'توليد السيناريو'}</span>
          </button>
        </div>
      )}

      {/* Step 3: Review Scenes */}
      {step === 'scenes' && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl max-h-40 overflow-y-auto">
            <h3 className="font-bold text-sm mb-2">السيناريو:</h3>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{script}</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-sm">المشاهد المقترحة ({scenes.length}):</h3>
            {scenes.map((scene, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-indigo-600">مشهد {idx + 1}</span>
                </div>
                <p className="text-slate-600">{scene.description}</p>
              </div>
            ))}
          </div>

          <button
            onClick={generateFrames}
            disabled={isProcessing}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
            <span>توليد المشاهد (Nano Banana)</span>
          </button>
        </div>
      )}

      {/* Step 4 & 5: Frames & Preview */}
      {(step === 'frames' || step === 'preview') && (
        <div className="space-y-6">
          {isProcessing && (
            <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin" />
              {processingStatus}
            </div>
          )}

          <div className="space-y-6">
            {scenes.map((scene, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">مشهد {idx + 1}</span>
                  {!scene.frameImage && !isProcessing && (
                    <span className="text-xs text-amber-600">في الانتظار...</span>
                  )}
                </div>
                
                <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                  {scene.frameImage ? (
                    <img src={scene.frameImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Film className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">{scene.description}</p>
              </div>
            ))}
          </div>

          {step === 'preview' && !isProcessing && (
            <button
              onClick={saveStoryboard}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>حفظ القصة</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
