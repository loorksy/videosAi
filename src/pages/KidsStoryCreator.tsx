import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, Users, Film, Loader2, Check, Wand2, Star, Heart, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { db, Character, Storyboard, Scene } from '../lib/db';
import { GeminiService } from '../lib/gemini';
import { cn } from '../lib/utils';
import { useTaskContext } from '../context/TaskContext';

// Kids-friendly cartoon styles only
const kidsStyles = [
  { 
    value: 'Cocomelon 3D Style - Bright colorful 3D animation, round cute characters, vibrant saturated colors, soft lighting, educational kids content style', 
    label: 'كوكوميلون',
    emoji: '🎨',
    color: 'from-pink-400 to-purple-500'
  },
  { 
    value: 'Baby Shark Style - Cute 3D animated characters, ocean theme, bright cheerful colors, simple shapes, child-friendly cartoon', 
    label: 'بيبي شارك',
    emoji: '🦈',
    color: 'from-cyan-400 to-blue-500'
  },
  { 
    value: 'Peppa Pig Style - Simple 2D flat animation, pastel colors, minimalist design, outlined characters, British cartoon style', 
    label: 'بيبا بيج',
    emoji: '🐷',
    color: 'from-pink-300 to-rose-400'
  },
  { 
    value: 'Bluey Style - Warm 2D animation, Australian family style, soft watercolor textures, heartwarming cartoon', 
    label: 'بلوي',
    emoji: '🐕',
    color: 'from-blue-400 to-indigo-500'
  },
  { 
    value: 'Paw Patrol Style - 3D CGI animation, heroic puppies, action cartoon for kids, bright primary colors', 
    label: 'باو باترول',
    emoji: '🐾',
    color: 'from-red-400 to-orange-500'
  },
  { 
    value: 'Pixar 3D Animation - High quality CGI, emotional storytelling, detailed textures, cinematic lighting, Pixar movie quality', 
    label: 'بيكسار',
    emoji: '🎬',
    color: 'from-amber-400 to-yellow-500'
  },
  { 
    value: 'Disney 3D Modern - Modern Disney CGI, expressive characters, detailed hair and fabric, Tangled/Frozen style', 
    label: 'ديزني',
    emoji: '👸',
    color: 'from-purple-400 to-pink-500'
  },
  { 
    value: 'Chibi Kawaii Style - Super deformed cute characters, big eyes, pastel colors, Japanese kawaii aesthetic', 
    label: 'كاواي',
    emoji: '🌸',
    color: 'from-rose-300 to-pink-400'
  },
];

// Story templates for kids
const storyTemplates = [
  { id: 'adventure', label: 'مغامرة', icon: '🗺️', prompt: 'قصة مغامرة مثيرة للأطفال مع تعلم قيمة الشجاعة' },
  { id: 'friendship', label: 'صداقة', icon: '🤝', prompt: 'قصة عن أهمية الصداقة والتعاون' },
  { id: 'education', label: 'تعليمي', icon: '📚', prompt: 'قصة تعليمية ممتعة تعلم الأطفال شيئاً جديداً' },
  { id: 'family', label: 'عائلي', icon: '👨‍👩‍👧‍👦', prompt: 'قصة عائلية دافئة عن الحب والاحترام' },
  { id: 'animals', label: 'حيوانات', icon: '🐻', prompt: 'قصة ممتعة مع حيوانات لطيفة' },
  { id: 'fantasy', label: 'خيالي', icon: '🧚', prompt: 'قصة خيالية سحرية مليئة بالعجائب' },
  { id: 'hero', label: 'بطل صغير', icon: '🦸', prompt: 'قصة عن طفل بطل يساعد الآخرين' },
  { id: 'nature', label: 'طبيعة', icon: '🌳', prompt: 'قصة عن الطبيعة والحفاظ على البيئة' },
];

export default function KidsStoryCreator() {
  const navigate = useNavigate();
  const { addTask } = useTaskContext();
  
  const [step, setStep] = useState<'start' | 'style' | 'story' | 'generating'>('start');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState(kidsStyles[0].value);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customIdea, setCustomIdea] = useState('');
  const [sceneCount, setSceneCount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  useEffect(() => {
    db.getAllCharacters().then(setCharacters);
  }, []);

  const toggleChar = (id: string) => {
    setSelectedCharIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const getStoryPrompt = () => {
    if (customIdea) return customIdea;
    const template = storyTemplates.find(t => t.id === selectedTemplate);
    return template?.prompt || 'قصة ممتعة للأطفال';
  };

  const createStoryInBackground = async () => {
    if (selectedCharIds.length === 0) {
      alert('الرجاء اختيار شخصية واحدة على الأقل');
      return;
    }

    setStep('generating');
    setIsProcessing(true);

    const storyboardId = uuidv4();
    const selectedChars = characters.filter(c => selectedCharIds.includes(c.id));
    const storyPrompt = getStoryPrompt();
    const charNames = selectedChars.map(c => c.name).join(' و ');
    const title = `قصة ${charNames}`.slice(0, 30);

    try {
      // Step 1: Generate script
      setProcessingStep('جاري كتابة القصة...');
      
      const enhancedPrompt = `${storyPrompt}. 
      قصة للأطفال مناسبة لجميع الأعمار.
      عدد المشاهد: ${sceneCount}. 
      Visual Style: ${selectedStyle}. 
      Format: 16:9.
      اجعل القصة تعليمية وممتعة مع نهاية سعيدة.`;

      const result = await GeminiService.generateScriptAndScenes(enhancedPrompt, selectedChars.map(c => ({
        name: c.name,
        description: c.description,
        visualTraits: c.visualTraits,
      })));

      const scenes: Scene[] = result.scenes.map(s => ({
        id: uuidv4(),
        description: s.description,
        characterIds: s.characters.map(name => {
          const found = selectedChars.find(c => c.name.includes(name) || name.includes(c.name));
          return found ? found.id : '';
        }).filter(Boolean),
      }));

      // Save storyboard
      const storyboard: Storyboard = {
        id: storyboardId,
        title,
        script: result.script,
        characters: selectedCharIds,
        scenes,
        aspectRatio: '16:9',
        style: selectedStyle,
        createdAt: Date.now()
      };

      await db.saveStoryboard(storyboard);

      // Step 2: Generate images in background
      addTask('storyboard', `انتاج: ${title}`, async (updateProgress) => {
        let savedStoryboard = await db.getStoryboard(storyboardId);
        if (!savedStoryboard) throw new Error('لم يتم العثور على القصة');

        const characterDNA = selectedChars.map(c => 
          `${c.name}: ${c.visualTraits || c.description}`
        ).join('\n');

        const allCharImages: string[] = [];
        for (const char of selectedChars) {
          const imgs = char.images as Record<string, string | undefined>;
          for (const value of Object.values(imgs)) {
            if (value && typeof value === 'string' && value.length > 100) {
              allCharImages.push(value);
              break;
            }
          }
        }

        let firstSceneImage: string | undefined;
        let previousSceneImage: string | undefined;
        const totalSteps = savedStoryboard.scenes.length * 2; // images + audio
        let completedSteps = 0;

        // Generate images
        for (let i = 0; i < savedStoryboard.scenes.length; i++) {
          updateProgress(
            Math.round((completedSteps / totalSteps) * 100),
            `رسم المشهد ${i + 1} من ${savedStoryboard.scenes.length}...`
          );

          const scene = savedStoryboard.scenes[i];
          const sceneChars = selectedChars.filter(c => scene.characterIds.includes(c.id));
          const sceneCharImages = sceneChars.length > 0 ? sceneChars.map(c => {
            const imgs = c.images as Record<string, string | undefined>;
            return Object.values(imgs).find(v => v && typeof v === 'string' && v.length > 100) || '';
          }).filter(Boolean) : allCharImages;

          try {
            const frameImage = await GeminiService.generateStoryboardFrame({
              sceneDescription: scene.description,
              characterImages: sceneCharImages,
              firstSceneImage,
              previousSceneImage,
              sceneIndex: i,
              totalScenes: savedStoryboard.scenes.length,
              style: selectedStyle,
              aspectRatio: '16:9',
              characterDNA,
            });

            savedStoryboard.scenes[i].frameImage = frameImage;
            if (i === 0) firstSceneImage = frameImage;
            previousSceneImage = frameImage;
            await db.saveStoryboard(savedStoryboard);
          } catch (err) {
            console.error(`Scene ${i + 1} image failed:`, err);
          }
          completedSteps++;
        }

        // Generate audio for dialogues
        const voices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
        for (let i = 0; i < savedStoryboard.scenes.length; i++) {
          const scene = savedStoryboard.scenes[i];
          if (scene.dialogue) {
            updateProgress(
              Math.round((completedSteps / totalSteps) * 100),
              `توليد صوت المشهد ${i + 1}...`
            );
            try {
              const voiceName = voices[i % voices.length];
              const audioUrl = await GeminiService.generateVoiceover(scene.dialogue, voiceName);
              savedStoryboard.scenes[i].audioClip = audioUrl;
              await db.saveStoryboard(savedStoryboard);
            } catch (err) {
              console.error(`Scene ${i + 1} audio failed:`, err);
            }
          }
          completedSteps++;
        }

        return savedStoryboard;
      }, storyboardId);

      // Navigate to storyboards list
      navigate('/storyboards');
    } catch (error: any) {
      console.error(error);
      alert('فشل إنشاء القصة: ' + (error?.message || 'خطأ غير معروف'));
      setStep('story');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render step: Character selection
  const renderStartStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
          <Star className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">اختر أبطال القصة</h2>
        <p className="text-slate-500 mt-2">اختر الشخصيات التي ستظهر في قصتك</p>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">لا توجد شخصيات بعد</p>
          <button
            onClick={() => navigate('/characters/new')}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold"
          >
            إنشاء شخصية جديدة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {characters.map((char) => {
            const isSelected = selectedCharIds.includes(char.id);
            const img = char.images.front || char.images.reference || char.images.closeup;
            return (
              <button
                key={char.id}
                onClick={() => toggleChar(char.id)}
                className={cn(
                  "relative p-3 rounded-2xl border-3 transition-all",
                  isSelected 
                    ? "border-purple-500 bg-purple-50 shadow-lg scale-105" 
                    : "border-slate-200 bg-white hover:border-purple-300"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 mb-2">
                  {img ? (
                    <img src={img} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-800 text-sm truncate">{char.name}</p>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setStep('style')}
        disabled={selectedCharIds.length === 0}
        className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
      >
        <span>التالي: اختر نمط الرسم</span>
        <ChevronRight className="w-5 h-5 rotate-180" />
      </button>
    </div>
  );

  // Render step: Style selection
  const renderStyleStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">اختر نمط الرسم</h2>
        <p className="text-slate-500 mt-2">كيف تريد أن تبدو القصة؟</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {kidsStyles.map((style) => {
          const isSelected = selectedStyle === style.value;
          return (
            <button
              key={style.value}
              onClick={() => setSelectedStyle(style.value)}
              className={cn(
                "relative p-4 rounded-2xl border-3 transition-all text-center",
                isSelected 
                  ? "border-purple-500 bg-purple-50 shadow-lg" 
                  : "border-slate-200 bg-white hover:border-purple-300"
              )}
            >
              <div className={cn(
                "w-14 h-14 mx-auto mb-2 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl",
                style.color
              )}>
                {style.emoji}
              </div>
              <p className="font-bold text-slate-800 text-sm">{style.label}</p>
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('start')}
          className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold"
        >
          رجوع
        </button>
        <button
          onClick={() => setStep('story')}
          className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold shadow-lg"
        >
          التالي
        </button>
      </div>
    </div>
  );

  // Render step: Story idea
  const renderStoryStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">ما هي فكرة القصة؟</h2>
        <p className="text-slate-500 mt-2">اختر قالباً جاهزاً أو اكتب فكرتك</p>
      </div>

      {/* Story Templates */}
      <div>
        <p className="text-sm font-bold text-slate-600 mb-3">قوالب جاهزة</p>
        <div className="grid grid-cols-4 gap-2">
          {storyTemplates.map((template) => {
            const isSelected = selectedTemplate === template.id;
            return (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template.id);
                  setCustomIdea('');
                }}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                  isSelected 
                    ? "border-purple-500 bg-purple-50" 
                    : "border-slate-200 bg-white hover:border-purple-300"
                )}
              >
                <span className="text-xl">{template.icon}</span>
                <span className="text-xs font-medium text-slate-700">{template.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Idea */}
      <div>
        <p className="text-sm font-bold text-slate-600 mb-2">أو اكتب فكرتك الخاصة</p>
        <textarea
          value={customIdea}
          onChange={(e) => {
            setCustomIdea(e.target.value);
            if (e.target.value) setSelectedTemplate(null);
          }}
          placeholder="مثال: قصة عن أرنب صغير يتعلم أهمية مساعدة الآخرين..."
          className="w-full h-24 p-4 border-2 border-slate-200 rounded-xl text-sm resize-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        />
      </div>

      {/* Scene Count */}
      <div>
        <p className="text-sm font-bold text-slate-600 mb-3">عدد المشاهد</p>
        <div className="flex gap-2">
          {[3, 5, 7, 10].map((count) => (
            <button
              key={count}
              onClick={() => setSceneCount(count)}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold transition-all",
                sceneCount === count 
                  ? "bg-purple-500 text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('style')}
          className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold"
        >
          رجوع
        </button>
        <button
          onClick={createStoryInBackground}
          disabled={!selectedTemplate && !customIdea}
          className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          <span>إنشاء القصة</span>
        </button>
      </div>
    </div>
  );

  // Render step: Generating
  const renderGeneratingStep = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center animate-pulse">
        <Wand2 className="w-12 h-12 text-white animate-bounce" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">جاري إنشاء القصة...</h2>
        <p className="text-slate-500">{processingStep}</p>
      </div>
      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-purple-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -mr-2 text-slate-500 hover:text-slate-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">قصص الأطفال</h1>
          </div>
        </div>

        {/* Progress Steps */}
        {step !== 'generating' && (
          <div className="flex gap-2 mt-3">
            {['start', 'style', 'story'].map((s, idx) => (
              <div
                key={s}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all",
                  ['start', 'style', 'story'].indexOf(step) >= idx
                    ? "bg-gradient-to-r from-pink-400 to-purple-500"
                    : "bg-slate-200"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {step === 'start' && renderStartStep()}
        {step === 'style' && renderStyleStep()}
        {step === 'story' && renderStoryStep()}
        {step === 'generating' && renderGeneratingStep()}
      </div>
    </div>
  );
}
