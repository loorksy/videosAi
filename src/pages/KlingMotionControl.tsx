import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Loader2, Download, Users, Wand2, Film, Play, Check,
  AlertCircle, Settings as SettingsIcon, Video, Link2, DollarSign,
  Sparkles, Ban, Image as ImageIcon, Upload, X, ToggleLeft, ToggleRight
} from 'lucide-react';
import { db, Character, MediaItem } from '../lib/db';
import { KlingService } from '../lib/kling';
import { GeminiService } from '../lib/gemini';
import { motion, AnimatePresence } from 'framer-motion';

const MODES = [
  { id: 'standard' as const, label: 'Standard', sub: '$0.07/ث' },
  { id: 'pro' as const, label: 'Professional', sub: '$0.112/ث' },
];

const DURATIONS = [
  { value: '5' as const, label: '5 ثواني' },
  { value: '10' as const, label: '10 ثواني' },
];

const ORIENTATIONS = [
  { value: 'video' as const, label: 'اداء كامل الجسم', sub: 'حتى 30 ث', desc: 'رقص، مشي، حركة كاملة' },
  { value: 'image' as const, label: 'بورتريه / وجه', sub: 'حتى 10 ث', desc: 'تعبيرات وجه، حركة كاميرا' },
];

const RATIOS = [
  { value: '9:16' as const, label: '9:16' },
  { value: '16:9' as const, label: '16:9' },
  { value: '1:1' as const, label: '1:1' },
];

function getCharImage(char: Character): string | null {
  return char.images?.front || char.images?.threeQuarter || char.images?.right || char.images?.left || null;
}

// Drop zone component for both image and video
function DropZone({
  accept,
  label,
  hint,
  file,
  url,
  inputMode,
  preview,
  onFile,
  onUrl,
  onClear,
  color = 'violet',
}: {
  accept: string;
  label: string;
  hint: string;
  file: File | null;
  url: string;
  inputMode: 'upload' | 'url';
  preview?: string | null;
  onFile: (f: File) => void;
  onUrl: (u: string) => void;
  onClear: () => void;
  color?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const isVideo = accept.includes('video');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  const hasContent = inputMode === 'upload' ? !!file : url.startsWith('http');

  return (
    <div className="space-y-2">
      {/* Toggle between upload / URL */}
      {inputMode === 'upload' ? (
        // Upload zone
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden
            ${dragging ? `border-${color}-400 bg-${color}-50/50` : file ? 'border-emerald-400 bg-emerald-50/30 cursor-default' : `border-border hover:border-${color}-300 hover:bg-${color}-50/20`}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />

          {file ? (
            // Preview
            <div className="relative">
              {isVideo ? (
                preview ? (
                  <video src={preview} controls className="w-full max-h-52 object-contain bg-black" />
                ) : (
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Film className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground truncate max-w-[220px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                )
              ) : preview ? (
                <img src={preview} alt="preview" className="w-full max-h-52 object-contain bg-secondary/30" />
              ) : null}
              {/* Clear button */}
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="absolute top-2 left-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
              {/* Checkmark */}
              <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          ) : (
            // Empty state
            <div className="p-6 flex flex-col items-center justify-center gap-2 text-center">
              <div className={`w-12 h-12 bg-${color}-100 rounded-2xl flex items-center justify-center`}>
                <Upload className={`w-5 h-5 text-${color}-600`} />
              </div>
              <p className="text-sm font-bold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
              <p className="text-[10px] text-muted-foreground/60">اسحب وافلت او انقر للاختيار</p>
            </div>
          )}
        </div>
      ) : (
        // URL input
        <div>
          <div className="relative">
            <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="url"
              value={url}
              onChange={(e) => onUrl(e.target.value)}
              placeholder={isVideo ? 'https://example.com/dance.mp4' : 'https://i.ibb.co/xxx/character.png'}
              className={`w-full p-3 pr-10 border border-border rounded-xl focus:ring-2 focus:ring-${color}-500/30 focus:border-${color}-500 outline-none bg-secondary/50 text-sm transition-all`}
              dir="ltr"
            />
          </div>
          {hasContent && (
            <div className="mt-2 rounded-xl overflow-hidden bg-black/5 border border-border/40">
              {isVideo ? (
                <video src={url} controls className="w-full max-h-48 object-contain bg-black" />
              ) : (
                <img src={url} alt="preview" className="w-full max-h-48 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KlingMotionControl() {
  const navigate = useNavigate();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  // Image input
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  // Video input
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'url'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  // Settings
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [mode, setMode] = useState<'standard' | 'pro'>('standard');
  const [duration, setDuration] = useState<'5' | '10'>('5');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16');
  const [characterOrientation, setCharacterOrientation] = useState<'video' | 'image'>('video');

  // Generation state
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => { db.getAllCharacters().then(setCharacters); }, []);

  const hasKlingKey = !!localStorage.getItem('KLING_API_KEY');
  const cost = KlingService.estimateCost(Number(duration), mode);

  // Compute the actual image/video input to send
  const imageInput = imageInputMode === 'upload' ? imageFile : imageUrl;
  const videoInput = videoInputMode === 'upload' ? videoFile : videoUrl;
  const hasImage = imageInputMode === 'upload' ? !!imageFile : imageUrl.startsWith('http');
  const hasVideo = videoInputMode === 'upload' ? !!videoFile : videoUrl.startsWith('http');

  const canGenerate = hasImage && hasVideo && prompt.trim() && hasKlingKey;

  // When a character is selected, auto-use its image
  const handleSelectCharacter = (char: Character) => {
    const already = selectedCharacter?.id === char.id;
    setSelectedCharacter(already ? null : char);
    if (!already) {
      const img = getCharImage(char);
      if (img) {
        // Convert base64 to File for upload
        try {
          const byteString = atob(img.split(',')[1]);
          const mimeString = img.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const file = new File([ab], `${char.name}.png`, { type: mimeString });
          setImageFile(file);
          setImagePreview(img);
          setImageInputMode('upload');
        } catch {
          setImageUrl(img);
          setImageInputMode('url');
        }
      }
    }
  };

  const handleImageFile = (f: File) => {
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(f);
    setSelectedCharacter(null);
  };

  const handleVideoFile = (f: File) => {
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
  };

  const generatePromptIdea = async () => {
    if (!selectedCharacter) return;
    setIsGeneratingIdea(true);
    try {
      const idea = await GeminiService.generateVideoIdeaFromCharacters({
        characters: [{
          name: selectedCharacter.name,
          description: selectedCharacter.description || selectedCharacter.name,
          visualTraits: selectedCharacter.visualTraits || selectedCharacter.description || '',
        }],
        videoType: 'action',
        dialogueLanguage: 'English',
      });
      setPrompt(idea.prompt.slice(0, 2500));
    } catch (err: any) {
      alert(`فشل توليد الفكرة: ${err.message}`);
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate || !imageInput || !videoInput) return;
    setIsGenerating(true);
    setError(null);
    setResultVideoUrl(null);
    setIsSaved(false);

    try {
      const videoUrl = await KlingService.generateMotionVideo(
        {
          prompt,
          image_input: imageInput,
          video_input: videoInput,
          mode,
          duration,
          aspect_ratio: aspectRatio,
          negative_prompt: negativePrompt || undefined,
          character_orientation: characterOrientation,
        },
        (status) => setGenerationStatus(status)
      );

      setResultVideoUrl(videoUrl);

      const mediaItem: MediaItem = {
        id: `kling-${Date.now()}`,
        type: 'video',
        title: `Motion Control: ${selectedCharacter?.name || 'شخصية مخصصة'}`,
        description: prompt.slice(0, 200),
        data: videoUrl,
        source: 'animation',
        characterName: selectedCharacter?.name,
        createdAt: Date.now(),
      };
      await db.saveMediaItem(mediaItem);
      setIsSaved(true);
    } catch (err: any) {
      setError(err.message || 'حدث خطا غير متوقع');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto min-h-screen bg-background pb-32">

      {/* Header */}
      <div className="flex items-center mb-5 pt-2">
        <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mr-2">
          <h1 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Video className="w-5 h-5 text-violet-500" />
            Motion Control
          </h1>
          <p className="text-[11px] text-muted-foreground">Kling 2.6 عبر fal.ai</p>
        </div>
      </div>

      {/* No API Key */}
      {!hasKlingKey && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-900">مفتاح fal.ai مطلوب</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              سجل في <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer" className="underline font-bold">fal.ai/dashboard/keys</a> واضف المفتاح في الاعدادات.
            </p>
            <button onClick={() => navigate('/settings')}
              className="mt-2 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-1.5">
              <SettingsIcon className="w-3.5 h-3.5" />
              الاعدادات
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">

        {/* Step 1: Character Image */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-card-foreground flex items-center gap-2 text-sm">
              <ImageIcon className="w-4 h-4 text-violet-500" />
              1. صورة الشخصية
            </h2>
            {/* Toggle upload/url */}
            <div className="flex items-center gap-1.5 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setImageInputMode('upload')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${imageInputMode === 'upload' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <Upload className="w-3 h-3 inline ml-1" />
                رفع
              </button>
              <button
                onClick={() => setImageInputMode('url')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${imageInputMode === 'url' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <Link2 className="w-3 h-3 inline ml-1" />
                رابط
              </button>
            </div>
          </div>

          {/* Quick select from library */}
          {characters.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">اختر من مكتبتك (للاستخدام التلقائي):</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {characters.map(char => {
                  const img = getCharImage(char);
                  const isSelected = selectedCharacter?.id === char.id;
                  return (
                    <button key={char.id} onClick={() => handleSelectCharacter(char)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all w-12 h-12 flex-shrink-0 ${isSelected ? 'border-violet-500 shadow-md' : 'border-border/60 hover:border-violet-300'}`}
                    >
                      {img ? <img src={img} alt={char.name} className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-violet-700 drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DropZone
            accept="image/png,image/jpeg,image/webp"
            label="ارفع صورة الشخصية"
            hint="PNG، JPG، WebP — اوضح وجه ثابت"
            file={imageFile}
            url={imageUrl}
            inputMode={imageInputMode}
            preview={imagePreview}
            onFile={handleImageFile}
            onUrl={setImageUrl}
            onClear={() => { setImageFile(null); setImagePreview(null); setSelectedCharacter(null); }}
            color="violet"
          />
        </div>

        {/* Step 2: Driving Video */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-card-foreground flex items-center gap-2 text-sm">
              <Play className="w-4 h-4 text-violet-500" />
              2. فيديو القيادة (Driving Video)
            </h2>
            <div className="flex items-center gap-1.5 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setVideoInputMode('upload')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${videoInputMode === 'upload' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <Upload className="w-3 h-3 inline ml-1" />
                رفع
              </button>
              <button
                onClick={() => setVideoInputMode('url')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${videoInputMode === 'url' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <Link2 className="w-3 h-3 inline ml-1" />
                رابط
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            فيديو يحتوي على الحركة المراد نقلها: رقص، مشي، تعابير وجه. يجب ان يظهر شخص كامل بوضوح.
          </p>
          <DropZone
            accept="video/mp4,video/mov,video/avi,video/*"
            label="ارفع فيديو القيادة"
            hint="MP4، MOV — حتى 30 ثانية، جسم واضح"
            file={videoFile}
            url={videoUrl}
            inputMode={videoInputMode}
            preview={videoPreview}
            onFile={handleVideoFile}
            onUrl={setVideoUrl}
            onClear={() => { setVideoFile(null); setVideoPreview(null); }}
            color="violet"
          />
        </div>

        {/* Step 3: Orientation */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <h2 className="font-bold text-card-foreground mb-3 flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-violet-500" />
            3. نوع الحركة
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {ORIENTATIONS.map(o => (
              <button key={o.value} onClick={() => setCharacterOrientation(o.value)}
                className={`py-3 px-3 rounded-xl border-2 text-right transition-all ${
                  characterOrientation === o.value
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-border bg-card hover:bg-secondary/50'
                }`}
              >
                <p className={`text-sm font-bold ${characterOrientation === o.value ? 'text-violet-700' : 'text-foreground'}`}>
                  {o.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{o.desc}</p>
                <p className={`text-[10px] mt-1 font-bold ${characterOrientation === o.value ? 'text-violet-500' : 'text-muted-foreground/50'}`}>
                  {o.sub}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Prompt */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <h2 className="font-bold text-card-foreground mb-2 flex items-center gap-2 text-sm">
            <Wand2 className="w-4 h-4 text-violet-500" />
            4. وصف البيئة والسياق
          </h2>
          <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
            الحركة تاتي من الفيديو تلقائيا. صف فقط البيئة والاضاءة والاجواء بالانجليزية.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none bg-secondary/50 text-sm transition-all resize-none"
            rows={4}
            placeholder="A dancer on a neon-lit rooftop at night, cinematic lighting, volumetric fog, 4K quality..."
            dir="ltr"
            maxLength={2500}
          />
          <div className="flex items-center justify-between mt-1.5">
            <button onClick={() => setShowNegative(!showNegative)}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Ban className="w-3 h-3" />
              Negative Prompt
            </button>
            <span className="text-[10px] text-muted-foreground">{prompt.length}/2500</span>
          </div>
          {showNegative && (
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full mt-2 p-2.5 border border-border rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none bg-secondary/50 text-xs transition-all resize-none"
              rows={2}
              placeholder="blurry, distorted, watermark, low quality..."
              dir="ltr"
            />
          )}
          {selectedCharacter && (
            <button onClick={generatePromptIdea} disabled={isGeneratingIdea}
              className="mt-3 w-full py-2.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-violet-100 transition-all disabled:opacity-50">
              {isGeneratingIdea
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري التوليد...</>
                : <><Sparkles className="w-3.5 h-3.5" /> توليد Prompt بالذكاء الاصطناعي</>}
            </button>
          )}
        </div>

        {/* Step 5: Video Settings */}
        <div className="bg-card p-4 rounded-2xl border border-border/60">
          <h2 className="font-bold text-card-foreground mb-3 flex items-center gap-2 text-sm">
            <Film className="w-4 h-4 text-violet-500" />
            5. اعدادات الفيديو
          </h2>

          <p className="text-xs text-muted-foreground mb-2">الجودة</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`py-2.5 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-0.5 transition-all ${
                  mode === m.id ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
                }`}>
                <span>{m.label}</span>
                <span className="text-[10px] font-normal opacity-70">{m.sub}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-2">المدة</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {DURATIONS.map(d => (
              <button key={d.value} onClick={() => setDuration(d.value)}
                className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  duration === d.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
                }`}>
                {d.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-2">الابعاد</p>
          <div className="grid grid-cols-3 gap-2">
            {RATIOS.map(r => (
              <button key={r.value} onClick={() => setAspectRatio(r.value)}
                className={`py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                  aspectRatio === r.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
                }`}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Cost estimate */}
          <div className="mt-4 bg-secondary/50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
              التكلفة التقديرية
            </div>
            <span className="text-sm font-bold text-foreground">{cost.label} USD</span>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">فشل التوليد</p>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generation Status */}
        {isGenerating && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 text-violet-600 animate-spin flex-shrink-0" />
              <p className="text-sm font-bold text-violet-800">جاري توليد الفيديو...</p>
            </div>
            <p className="text-xs text-violet-600 leading-relaxed mr-8">{generationStatus}</p>
            <div className="mt-3 bg-violet-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {resultVideoUrl && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <video src={resultVideoUrl} controls autoPlay loop className="w-full bg-black" />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">الفيديو جاهز</p>
                  {isSaved && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <Check className="w-3 h-3" />
                      تم الحفظ
                    </span>
                  )}
                </div>
                <a href={resultVideoUrl} download="kling-motion.mp4" target="_blank" rel="noreferrer"
                  className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-violet-700 transition-colors active:scale-[0.98]">
                  <Download className="w-4 h-4" />
                  تحميل الفيديو
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Generate Button - Fixed bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/60 p-4 z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="w-full py-3.5 bg-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {generationStatus || 'جاري التوليد...'}</>
            ) : (
              <><Sparkles className="w-5 h-5" /> توليد Motion Control ({cost.label})</>
            )}
          </button>
          {!hasKlingKey && (
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              يجب اضافة مفتاح fal.ai في الاعدادات اولا
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
