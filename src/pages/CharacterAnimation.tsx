import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlaySquare, ChevronRight, Loader2, Download, Users, Wand2, Film, Check, Lightbulb, Sparkles, Camera, X, ChevronDown, ChevronUp, Languages, Clapperboard, PenLine } from 'lucide-react';
import { db, Character, MediaItem } from '../lib/db';
import { GeminiService } from '../lib/gemini';

const VIDEO_TYPES = [
  { id: 'funny', label: 'مضحك', icon: '😂' },
  { id: 'sad', label: 'حزين', icon: '😢' },
  { id: 'action', label: 'اكشن', icon: '💥' },
  { id: 'romantic', label: 'رومانسي', icon: '💕' },
  { id: 'mystery', label: 'غموض/إثارة', icon: '🔍' },
  { id: 'educational', label: 'تعليمي', icon: '📚' },
  { id: 'dramatic', label: 'درامي', icon: '🎭' },
  { id: 'inspirational', label: 'ملهم', icon: '✨' },
];

const LANGUAGES = [
  { id: 'arabic', label: 'العربية' },
  { id: 'english', label: 'English' },
  { id: 'french', label: 'Fran\u00e7ais' },
  { id: 'spanish', label: 'Espa\u00f1ol' },
  { id: 'no-dialogue', label: 'بدون حوار' },
];

export default function CharacterAnimation() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [videoType, setVideoType] = useState('funny');
  const [dialogueLanguage, setDialogueLanguage] = useState('arabic');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState<any>(null);
  const [showScenes, setShowScenes] = useState(false);
  const [ideaMode, setIdeaMode] = useState<'auto' | 'manual'>('auto');

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    const chars = await db.getAllCharacters();
    setCharacters(chars);
  };

  const toggleCharacter = (char: Character) => {
    setSelectedCharacters(prev => {
      const exists = prev.find(c => c.id === char.id);
      if (exists) return prev.filter(c => c.id !== char.id);
      return [...prev, char];
    });
  };

  const removeCharacter = (id: string) => {
    setSelectedCharacters(prev => prev.filter(c => c.id !== id));
  };

  const getCharImage = (char: Character) => {
    return char.images.front || char.images.threeQuarter || Object.values(char.images).find(img => img) || '';
  };

  const generateIdea = async () => {
    if (selectedCharacters.length === 0) {
      alert("يرجى اختيار شخصية واحدة على الاقل.");
      return;
    }

    setIsGeneratingIdea(true);
    setGeneratedIdea(null);

    try {
      const charsData = selectedCharacters.map(c => {
        // Build comprehensive visual description for the character bible
        let visual = c.visualTraits || '';
        if (c.description && c.description !== c.visualTraits) {
          visual = visual ? `${visual}. ${c.description}` : c.description;
        }
        return {
          name: c.name,
          description: c.description || c.name,
          visualTraits: visual || c.name,
        };
      });

      const idea = await GeminiService.generateVideoIdeaFromCharacters({
        characters: charsData,
        videoType,
        dialogueLanguage: LANGUAGES.find(l => l.id === dialogueLanguage)?.label || dialogueLanguage,
        manualIdea: ideaMode === 'manual' ? prompt : undefined,
      });

      setGeneratedIdea(idea);
      setPrompt(idea.prompt);
    } catch (error: any) {
      alert(`فشل توليد الفكرة: ${error.message}`);
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  const startAnimation = async () => {
    if (selectedCharacters.length === 0) {
      alert("يرجى اختيار شخصية واحدة على الاقل.");
      return;
    }
    if (!prompt.trim()) {
      alert("يرجى كتابة وصف للحركة او توليد فكرة اولا.");
      return;
    }

    setIsGenerating(true);
    setGeneratedVideo(null);
    setIsSaved(false);

    try {
      // Build character data with ALL images for maximum consistency
      const charsForVeo = selectedCharacters.map(c => ({
        name: c.name,
        visualTraits: c.visualTraits || c.description || c.name,
        images: c.images,
      }));

      const videoUrl = await GeminiService.generateCharacterAnimation({
        characters: charsForVeo,
        prompt,
        aspectRatio,
        resolution,
      });
      setGeneratedVideo(videoUrl);

      // Auto-save to media gallery
      const charNames = selectedCharacters.map(c => c.name).join(' و ');
      const mediaItem: MediaItem = {
        id: `anim-${Date.now()}`,
        type: 'video',
        title: `تحريك: ${charNames}`,
        description: prompt.slice(0, 200),
        data: videoUrl,
        source: 'animation',
        characterName: charNames,
        aspectRatio,
        createdAt: Date.now(),
      };
      await db.saveMediaItem(mediaItem);
      setIsSaved(true);
    } catch (error: any) {
      console.error(error);
      alert(`فشل التحريك: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideo) return;
    const a = document.createElement('a');
    a.href = generatedVideo;
    a.download = `animation-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 max-w-lg mx-auto min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="flex items-center mb-5 pt-2">
        <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold mr-2 flex items-center gap-2 text-foreground">
          <PlaySquare className="w-5 h-5 text-primary" />
          استوديو تحريك الشخصيات
        </h1>
      </div>

      <div className="space-y-4">
        {/* Step 1: Multi-Character Selection */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <h2 className="font-bold text-card-foreground mb-1 flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary" />
            1. اختر الشخصيات
          </h2>
          <p className="text-xs text-muted-foreground mb-3">يمكنك اختيار اكثر من شخصية - صورهم ستستخدم كمرجع بصري</p>

          {characters.length === 0 ? (
            <div className="text-center py-6 bg-secondary/50 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground mb-3">لا توجد شخصيات.</p>
              <button
                onClick={() => navigate('/characters/new')}
                className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg hover:bg-primary/15 transition-colors"
              >
                انشاء شخصية جديدة
              </button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
              {characters.map(char => {
                const isSelected = selectedCharacters.some(c => c.id === char.id);
                return (
                  <button
                    key={char.id}
                    onClick={() => toggleCharacter(char)}
                    className={`flex-shrink-0 w-[76px] flex flex-col items-center gap-1.5 snap-start transition-all ${isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                  >
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all ${isSelected ? 'border-primary shadow-md shadow-primary/20 scale-105' : 'border-transparent'}`}>
                      <img src={getCharImage(char)} alt={char.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-medium text-foreground truncate w-full text-center leading-tight">{char.name}</span>
                    {isSelected && (
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center -mt-1">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedCharacters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
              {selectedCharacters.map(char => (
                <span key={char.id} className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg">
                  <img src={getCharImage(char)} alt="" className="w-4 h-4 rounded-full object-cover" />
                  {char.name}
                  <button onClick={() => removeCharacter(char.id)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground self-center">
                {selectedCharacters.length > 1 ? `${selectedCharacters.length} شخصيات - ستستخدم جميع صورهم كمرجع` : 'شخصية واحدة'}
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Video Type */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <h2 className="font-bold text-card-foreground mb-1 flex items-center gap-2 text-sm">
            <Clapperboard className="w-4 h-4 text-primary" />
            2. نوع الفيديو
          </h2>
          <p className="text-xs text-muted-foreground mb-3">اختر نوع وطابع الفيديو</p>
          <div className="grid grid-cols-4 gap-2">
            {VIDEO_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setVideoType(type.id)}
                className={`py-2.5 px-1 rounded-xl text-center transition-all text-xs font-medium border ${
                  videoType === type.id
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <div className="text-base mb-0.5">{type.icon}</div>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Dialogue Language */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <h2 className="font-bold text-card-foreground mb-1 flex items-center gap-2 text-sm">
            <Languages className="w-4 h-4 text-primary" />
            3. لغة الحوار
          </h2>
          <p className="text-xs text-muted-foreground mb-3">اختر لغة الحوار في الفيديو</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => setDialogueLanguage(lang.id)}
                className={`py-2 px-4 rounded-xl text-xs font-medium border transition-all ${
                  dialogueLanguage === lang.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Idea Generation */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <h2 className="font-bold text-card-foreground mb-1 flex items-center gap-2 text-sm">
            <Wand2 className="w-4 h-4 text-primary" />
            4. فكرة الفيديو
          </h2>
          <p className="text-xs text-muted-foreground mb-3">ولد فكرة تلقائيا او اكتب فكرتك وسيحسنها الذكاء الاصطناعي</p>

          {/* Mode Toggle */}
          <div className="flex bg-secondary/70 rounded-xl p-1 mb-3">
            <button
              onClick={() => setIdeaMode('auto')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                ideaMode === 'auto' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              فكرة تلقائية
            </button>
            <button
              onClick={() => setIdeaMode('manual')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                ideaMode === 'manual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              كتابة يدوية + تحسين
            </button>
          </div>

          {/* Manual Idea Input */}
          {ideaMode === 'manual' && (
            <div className="mb-3 animate-in fade-in slide-in-from-top-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="اكتب فكرتك هنا... مثال: الشخصية تدخل مطعم وتطلب طبق غريب والنادل يتفاجا..."
                className="w-full h-24 p-3 border border-border rounded-xl text-sm bg-secondary/50 outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary resize-none transition-all"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                اكتب فكرتك بالعربي او الانجليزي - الذكاء الاصطناعي سيحسنها ويحولها الى prompt سينمائي مفصل
              </p>
            </div>
          )}

          {/* Generate Idea Button */}
          <button
            onClick={generateIdea}
            disabled={isGeneratingIdea || selectedCharacters.length === 0 || (ideaMode === 'manual' && !prompt.trim())}
            className="w-full py-3 bg-gradient-to-l from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98] shadow-sm"
          >
            {isGeneratingIdea ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{ideaMode === 'manual' ? 'جاري تحسين فكرتك...' : 'جاري توليد فكرة ابداعية...'}</span>
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4" />
                <span>{ideaMode === 'manual' ? 'تحسين الفكرة بالذكاء الاصطناعي' : 'توليد فكرة فيديو تلقائيا'}</span>
              </>
            )}
          </button>

          {/* Generated Idea Card */}
          {generatedIdea && (
            <div className="bg-foreground rounded-xl p-4 mt-3 text-background animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-amber-400">{generatedIdea.title}</h3>
              </div>

              <p className="text-xs text-background/70 mb-2 leading-relaxed">
                <span className="font-bold text-background">الاجواء:</span> {generatedIdea.mood}
              </p>

              {/* Dialogue Suggestion */}
              {generatedIdea.dialogueSuggestion && (
                <div className="bg-background/10 rounded-lg p-2.5 mb-2">
                  <p className="text-[10px] font-bold text-amber-400 mb-1">اقتراح حوار:</p>
                  <p className="text-xs text-background/80 leading-relaxed whitespace-pre-line">{generatedIdea.dialogueSuggestion}</p>
                </div>
              )}

              {/* Camera Movements */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {generatedIdea.cameraMovements?.map((move: string, i: number) => (
                  <span key={i} className="text-[10px] bg-background/10 text-background/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Camera className="w-2.5 h-2.5" />
                    {move}
                  </span>
                ))}
              </div>

              {/* Scenes Accordion */}
              <button
                onClick={() => setShowScenes(!showScenes)}
                className="flex items-center gap-1 text-xs text-amber-300 font-medium hover:text-amber-200 transition-colors"
              >
                {showScenes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showScenes ? 'اخفاء المشاهد' : `عرض المشاهد (${generatedIdea.scenes?.length || 0})`}
              </button>

              {showScenes && (
                <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                  {generatedIdea.scenes?.map((scene: string, i: number) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-amber-400 font-bold flex-shrink-0">{i + 1}.</span>
                      <span className="text-background/70 leading-relaxed">{scene}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-background/10 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">تم تعبئة Prompt الحركة تلقائيا - يمكنك تعديله ادناه</span>
              </div>
            </div>
          )}

          {/* Editable Prompt (always visible) */}
          <div className="mt-3">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Motion Prompt (يمكنك التعديل)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={ideaMode === 'auto' ? "اضغط الزر اعلاه لتوليد فكرة تلقائيا، او اكتب prompt مباشرة..." : "الـ prompt المحسن سيظهر هنا بعد الضغط على زر التحسين..."}
              className="w-full h-28 p-3 border border-border rounded-xl text-sm bg-secondary/50 outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary resize-none transition-all font-mono text-xs leading-relaxed"
              dir="ltr"
            />
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-2.5 mt-2">
              <p className="text-[10px] text-primary font-medium leading-relaxed">
                سيتم ارسال حتى 3 صور مرجعية (Reference Images) من زوايا مختلفة للشخصيات المحددة ({selectedCharacters.length}) عبر تقنية "Ingredients to Video" في Veo 3.1 لضمان اقصى ثبات بصري. الـ prompt يتضمن "Character Bible" تلقائيا يصف المظهر بدقة.
              </p>
            </div>
          </div>
        </div>

        {/* Step 5: Aspect Ratio & Resolution */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <h2 className="font-bold text-card-foreground mb-3 flex items-center gap-2 text-sm">
            <Film className="w-4 h-4 text-primary" />
            5. ابعاد الفيديو والجودة
          </h2>

          {/* Aspect Ratio */}
          <p className="text-xs text-muted-foreground mb-2">الابعاد</p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <button
              onClick={() => setAspectRatio("9:16")}
              className={`py-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-1 transition-all ${aspectRatio === "9:16" ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'}`}
            >
              <div className="w-4 h-6 border-2 border-current rounded-sm" />
              طولي (Shorts)
            </button>
            <button
              onClick={() => setAspectRatio("16:9")}
              className={`py-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-1 transition-all ${aspectRatio === "16:9" ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'}`}
            >
              <div className="w-6 h-4 border-2 border-current rounded-sm" />
              عرضي (YouTube)
            </button>
          </div>
          {selectedCharacters.length > 0 && (
            <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg mb-4">
              ✓ سيتم استخدام الصور المرجعية للحفاظ على ملامح الشخصية.
            </p>
          )}

          {/* Resolution */}
          <p className="text-xs text-muted-foreground mb-2">الجودة (الدقة الاعلى تحسن ثبات الشخصية)</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setResolution("1080p")}
              className={`py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${resolution === "1080p" ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'}`}
            >
              1080p HD
            </button>
            <button
              onClick={() => setResolution("720p")}
              className={`py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${resolution === "720p" ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'}`}
            >
              720p (اسرع)
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={startAnimation}
          disabled={isGenerating || selectedCharacters.length === 0 || !prompt.trim()}
          className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري التحريك (قد يستغرق دقائق)...</span>
            </>
          ) : (
            <>
              <PlaySquare className="w-5 h-5" />
              <span>توليد فيديو الحركة (Veo3)</span>
            </>
          )}
        </button>

        {/* Result */}
        {generatedVideo && (
          <div className="bg-card p-4 rounded-2xl border border-border/60 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-card-foreground text-sm">النتيجة</h2>
              {isSaved && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" />
                  تم الحفظ في المعرض
                </span>
              )}
            </div>
            <div className={`bg-black rounded-xl overflow-hidden shadow-inner mb-4 mx-auto ${aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[250px]' : 'aspect-video w-full'}`}>
              <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-contain" />
            </div>
            <button
              onClick={handleDownload}
              className="w-full py-3 bg-foreground text-background rounded-xl font-bold shadow-md hover:opacity-90 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              <span>تحميل الفيديو</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
