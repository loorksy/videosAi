import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, Loader2, Download, Save, Youtube, Image as ImageIcon, RefreshCw, Upload, X, Wand2, Type as TypeIcon, ChevronDown, ChevronUp, Check, BookOpen, Copy, Hash } from 'lucide-react';
import { AIService } from '../lib/aiService';
import { ApiKeyMissing } from '../components/ApiKeyMissing';
import { db, Character, MediaItem, Storyboard } from '../lib/db';
import { CustomSelect } from '../components/CustomSelect';
import { ColorPicker } from '../components/ColorPicker';
import { MissingApiKeyError } from '../lib/aiProvider';
import { cn } from '../lib/utils';
import {
  facialExpressions,
  eyeExpressions,
  headShapes,
  bodyShapes,
  eyeColors,
  emotions,
  bodyPoses,
  channelNiches,
  videoTypes,
  brandColors,
  styles as allStyles,
  aspectRatios
} from '../lib/thumbnailOptions';

interface UploadedImage {
  id: string;
  dataUrl: string;
  name: string;
  type: 'character' | 'element';
}

interface ThumbnailAnalysis {
  critique: string;
  suggestedElements: string;
  suggestedText: string;
  suggestedStyle: string;
}

export default function ThumbnailCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'generating' | 'review'>('input');
  const [mode, setMode] = useState<'create' | 'enhance' | 'from_story'>('create');

  // Form State
  const [title, setTitle] = useState('');
  const [elements, setElements] = useState('');
  const [style, setStyle] = useState(allStyles[0]);
  const [background, setBackground] = useState('');
  const [imageText, setImageText] = useState('');
  const [baseThumbnail, setBaseThumbnail] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [thumbnailAnalysis, setThumbnailAnalysis] = useState<ThumbnailAnalysis | null>(null);

  // New state variables for advanced options
  const [facialExpression, setFacialExpression] = useState('');
  const [eyeExpression, setEyeExpression] = useState('');
  const [headShape, setHeadShape] = useState('');
  const [bodyShape, setBodyShape] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [emotion, setEmotion] = useState('');
  const [bodyPose, setBodyPose] = useState('');
  const [channelNiche, setChannelNiche] = useState(channelNiches[0]);
  const [videoType, setVideoType] = useState(videoTypes[0]);
  const [brandColor, setBrandColor] = useState(brandColors[0]);
  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0]);

  // Accordion state
  const [openSection, setOpenSection] = useState<'video' | 'character' | 'design'>('video');

  // Multi-select state
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [thumbnailSaved, setThumbnailSaved] = useState(false);

  // Story mode state
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [storyMetadata, setStoryMetadata] = useState<{
    videoTitle: string;
    videoDescription: string;
    hashtags: string;
  } | null>(null);
  const [isAnalyzingStory, setIsAnalyzingStory] = useState(false);
  const [missingKeyError, setMissingKeyError] = useState<MissingApiKeyError | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseThumbInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'character' | 'element'>('character');

  const saveIdentity = () => {
    const profile = {
      style,
      background,
      facialExpression,
      eyeExpression,
      headShape,
      bodyShape,
      eyeColor,
      emotion,
      bodyPose,
      channelNiche,
      videoType,
      brandColor,
      aspectRatio,
    };
    const profiles = JSON.parse(localStorage.getItem('thumbnail_identities') || '[]');
    const name = prompt('أدخل اسماً لحفظ هذه ההوية البصرية (مثال: ستايل القيمنق):');
    if (!name) return;

    profiles.push({ name, ...profile });
    localStorage.setItem('thumbnail_identities', JSON.stringify(profiles));
    setSavedIdentities(profiles);
    alert('تم حفظ الهوية البصرية بنجاح!');
  };

  const [savedIdentities, setSavedIdentities] = useState<any[]>([]);

  useEffect(() => {
    loadCharacters();
    loadStoryboards();
    const identities = JSON.parse(localStorage.getItem('thumbnail_identities') || '[]');
    setSavedIdentities(identities);
  }, []);

  const loadIdentity = (identity: any) => {
    setStyle(identity.style || allStyles[0]);
    setBackground(identity.background || '');
    setFacialExpression(identity.facialExpression || '');
    setEyeExpression(identity.eyeExpression || '');
    setHeadShape(identity.headShape || '');
    setBodyShape(identity.bodyShape || '');
    setEyeColor(identity.eyeColor || '');
    setEmotion(identity.emotion || '');
    setBodyPose(identity.bodyPose || '');
    setChannelNiche(identity.channelNiche || channelNiches[0]);
    setVideoType(identity.videoType || videoTypes[0]);
    setBrandColor(identity.brandColor || brandColors[0]);
    setAspectRatio(identity.aspectRatio || aspectRatios[0]);
  };

  async function loadCharacters() {
    const chars = await db.getAllCharacters();
    setCharacters(chars.sort((a, b) => b.createdAt - a.createdAt));
  }

  async function loadStoryboards() {
    const sbs = await db.getAllStoryboards();
    setStoryboards(sbs.sort((a, b) => b.createdAt - a.createdAt));
  }

  const selectStory = async (storyId: string) => {
    setSelectedStoryId(storyId);
    const story = storyboards.find(s => s.id === storyId);
    if (!story) return;

    setIsAnalyzingStory(true);
    try {
      // Auto-select characters used in this story
      const charIds = [...new Set(story.scenes.flatMap(s => s.characterIds || []))];
      if (charIds.length > 0) {
        setSelectedCharIds(charIds);
      } else if (story.characters?.length) {
        setSelectedCharIds(story.characters);
      }

      // Use AI to analyze story and generate metadata
      const metadata = await AIService.generateStoryMetadata(story);
      setStoryMetadata(metadata);
      setTitle(metadata.videoTitle);
      setImageText(metadata.videoTitle);
    } catch (e: any) {
      if (e instanceof MissingApiKeyError) { setMissingKeyError(e); }
      else { console.error('Failed to analyze story:', e); }
    } finally {
      setIsAnalyzingStory(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleCharacterSelection = (id: string) => {
    setSelectedCharIds(prev =>
      prev.includes(id) ? prev.filter(charId => charId !== id) : [...prev, id]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newImage: UploadedImage = {
        id: Date.now().toString(),
        dataUrl: reader.result as string,
        name: file.name.split('.')[0],
        type: uploadType
      };
      setUploadedImages(prev => [...prev, newImage]);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeUploadedImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const triggerUpload = (type: 'character' | 'element') => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const handleBaseThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setBaseThumbnail(base64);

      // Trigger analysis
      setAnalysisLoading(true);
      setThumbnailAnalysis(null);
      try {
        const analysis = await AIService.analyzeThumbnail(base64);
        setThumbnailAnalysis(analysis);
      } catch (err) {
        console.error(err);
      } finally {
        setAnalysisLoading(false);
      }
    };
    reader.readAsDataURL(file);

    if (baseThumbInputRef.current) {
      baseThumbInputRef.current.value = '';
    }
  };

  const startGeneration = async () => {
    if (mode === 'enhance' && !baseThumbnail) {
      alert('الرجاء رفع صورة الأساس أولاً للتحسين.');
      return;
    }
    if (mode === 'from_story' && !selectedStoryId) {
      alert('الرجاء اختيار قصة أولاً.');
      return;
    }

    setIsProcessing(true);
    setStep('generating');

    try {
      // Helper to convert URL to base64
      const toBase64 = async (img: string): Promise<string> => {
        if (!img) return '';
        if (img.length > 200) return img;
        try {
          const resp = await fetch(img.startsWith('/') ? `${window.location.origin}${img}` : img);
          const blob = await resp.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch { return ''; }
      };

      // Gather all reference images
      const referenceImages: { name: string; dataUrl: string }[] = [];

      // 1. Add selected DB characters (convert URLs to base64)
      for (const id of selectedCharIds) {
        const char = characters.find(c => c.id === id);
        if (char && char.images.front) {
          const b64 = await toBase64(char.images.front);
          if (b64) referenceImages.push({ name: char.name, dataUrl: b64 });
        }
      }

      // 2. Add uploaded character images
      uploadedImages.filter(img => img.type === 'character').forEach(img => {
        referenceImages.push({ name: img.name, dataUrl: img.dataUrl });
      });

      // Gather element images
      const elementImages = uploadedImages
        .filter(img => img.type === 'element')
        .map(img => ({ name: img.name, dataUrl: img.dataUrl }));

      // Append uploaded element names to the elements text prompt
      const uploadedElementNames = uploadedImages
        .filter(img => img.type === 'element')
        .map(img => img.name)
        .join('، ');

      const finalElementsText = [elements, uploadedElementNames].filter(Boolean).join('، ');

      // For from_story mode, use story context as the prompt
      let thumbTitle = title;
      let thumbStyle = style;
      let thumbElements = finalElementsText;
      let thumbBackground = background;
      if (mode === 'from_story' && storyMetadata) {
        thumbTitle = storyMetadata.videoTitle;
        thumbStyle = 'أطفال يوتيوب (Kids YouTube)';
        const story = storyboards.find(s => s.id === selectedStoryId);
        thumbElements = story?.script?.slice(0, 200) || '';
        thumbBackground = 'خلفية مشرقة بألوان باستيل دافئة مناسبة للأطفال';
      }

      const image = await AIService.generateThumbnail({
        title: thumbTitle,
        style: thumbStyle,
        elements: thumbElements,
        background: thumbBackground,
        referenceImages,
        elementImages,
        baseThumbnail: mode === 'enhance' ? baseThumbnail || undefined : undefined,
        imageText: imageText || undefined,
        facialExpression,
        eyeExpression,
        headShape,
        bodyShape,
        eyeColor,
        emotion,
        bodyPose,
        channelNiche,
        videoType,
        brandColors: brandColor,
        aspectRatio
      });

      setGeneratedImage(image);
      setStep('review');

      // Auto-save to media gallery
      const mediaItem: MediaItem = {
        id: `thumb-${Date.now()}`,
        type: 'thumbnail',
        title: mode === 'from_story' && storyMetadata
          ? `صورة مصغرة: ${storyMetadata.videoTitle}`
          : title ? `صورة مصغرة: ${title}` : `صورة مصغرة - ${style.split(' (')[0]}`,
        description: mode === 'from_story' && storyMetadata
          ? `${storyMetadata.videoDescription}\n\n${storyMetadata.hashtags}`
          : `${style} | ${elements || 'بدون عناصر إضافية'}`,
        data: image,
        source: 'thumbnail',
        aspectRatio,
        createdAt: Date.now(),
      };
      await db.saveMediaItem(mediaItem);
      setThumbnailSaved(true);
    } catch (error: any) {
      if (error instanceof MissingApiKeyError) { setMissingKeyError(error); }
      else { console.error(error); alert(`فشل التوليد: ${error.message}`); }
      setStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `thumbnail-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto min-h-screen bg-transparent pb-32">
      {missingKeyError && <ApiKeyMissing error={missingKeyError} onDismiss={() => setMissingKeyError(null)} />}
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={baseThumbInputRef}
        onChange={handleBaseThumbUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center mb-6 pt-2">
        <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold mr-2 flex items-center gap-2 text-foreground">
          <Youtube className="w-5 h-5 text-accent" />
          صورة مصغرة (Thumbnail)
        </h1>
      </div>

      {step === 'input' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">

          {/* Mode Toggle */}
          <div className="flex bg-black/40 border border-white/10 backdrop-blur-md p-1.5 rounded-xl">
            <button
              onClick={() => setMode('create')}
              className={cn(
                "flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                mode === 'create' ? "bg-black/20 shadow-sm text-accent" : "text-muted-foreground hover:text-white/90"
              )}
            >
              <Sparkles className="w-3 h-3" />
              من الصفر
            </button>
            <button
              onClick={() => setMode('from_story' as any)}
              className={cn(
                "flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                mode === 'from_story' ? "bg-black/20 shadow-sm text-accent" : "text-muted-foreground hover:text-white/90"
              )}
            >
              <BookOpen className="w-3 h-3" />
              من القصة
            </button>
            <button
              onClick={() => setMode('enhance')}
              className={cn(
                "flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                mode === 'enhance' ? "bg-black/20 shadow-sm text-accent" : "text-muted-foreground hover:text-white/90"
              )}
            >
              <Wand2 className="w-3 h-3" />
              تحسين
            </button>
          </div>

          <div className="bg-accent/10 border border-accent/20 p-4 rounded-xl text-sm text-white leading-relaxed">
            {mode === 'create'
              ? "صمم صورة مصغرة جذابة (Clickbait) لفيديو اليوتيوب الخاص بك."
              : mode === 'from_story'
                ? "اختر قصة وسيقوم الذكاء الاصطناعي بتحليلها وإنشاء صورة مصغرة + عنوان + وصف + هاشتاقات تلقائياً."
                : "ارفع صورة مصغرة جاهزة وسيقوم الذكاء الاصطناعي بتحسينها."}
          </div>

          <div className="space-y-6">
            {/* Story Selection (From Story Mode) */}
            {mode === 'from_story' && (
              <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 space-y-3">
                <label className="block text-sm font-bold text-primary flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  اختر القصة
                </label>
                {storyboards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">لا توجد قصص محفوظة. أنشئ قصة أولاً.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {storyboards.map(sb => (
                      <button
                        key={sb.id}
                        onClick={() => selectStory(sb.id)}
                        className={cn(
                          "w-full text-right p-3 rounded-lg border transition-all text-sm",
                          selectedStoryId === sb.id
                            ? "border-primary bg-primary/20 text-primary font-bold"
                            : "border-white/10 bg-black/20 hover:border-primary/30 text-white/90"
                        )}
                      >
                        <div className="font-medium">{sb.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{sb.scenes.length} مشهد</div>
                      </button>
                    ))}
                  </div>
                )}

                {isAnalyzingStory && (
                  <div className="flex items-center gap-2 text-xs text-primary/90 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري تحليل القصة وتوليد البيانات...
                  </div>
                )}

                {/* Story Metadata Output */}
                {storyMetadata && (
                  <div className="space-y-3 bg-black/20 p-4 rounded-lg border border-primary/20">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-white/90">عنوان الفيديو (Hook)</label>
                        <button onClick={() => copyText(storyMetadata.videoTitle)} className="text-xs text-primary/90 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> نسخ
                        </button>
                      </div>
                      <p className="text-sm text-white bg-yellow-50 p-2 rounded border border-yellow-100 font-medium">{storyMetadata.videoTitle}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-white/90">وصف الفيديو</label>
                        <button onClick={() => copyText(storyMetadata.videoDescription)} className="text-xs text-primary/90 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> نسخ
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground/80 bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 p-2 rounded border border-white/5 whitespace-pre-wrap leading-relaxed">{storyMetadata.videoDescription}</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-white/90 flex items-center gap-1"><Hash className="w-3 h-3" /> هاشتاقات</label>
                        <button onClick={() => copyText(storyMetadata.hashtags)} className="text-xs text-primary/90 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> نسخ
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">{storyMetadata.hashtags}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Base Thumbnail Upload (Enhance Mode Only) */}
            {mode === 'enhance' && (
              <div className="bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                <label className="block text-sm font-bold text-white/90 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  صورة الأساس (مطلوب)
                </label>
                {baseThumbnail ? (
                  <div className="space-y-4">
                    <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-primary shadow-md group">
                      <img src={baseThumbnail} alt="Base Thumbnail" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => baseThumbInputRef.current?.click()}
                          className="bg-black/20 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-card/40 backdrop-blur-xl shadow-lg border border-white/5"
                        >
                          تغيير الصورة
                        </button>
                      </div>
                    </div>

                    {/* Analysis Section */}
                    <div className="bg-black/20 p-4 rounded-lg border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                      <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-primary" />
                        تحليل الذكاء الاصطناعي
                      </h4>
                      {analysisLoading ? (
                        <div className="flex items-center gap-3 text-muted-foreground text-xs p-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          جاري تحليل الصورة واقتراح تحسينات...
                        </div>
                      ) : thumbnailAnalysis ? (
                        <div className="space-y-3">
                          <div className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap p-3 bg-primary/10/50 rounded-md border border-indigo-50">
                            <span className="font-bold block mb-1 text-white">التقييم:</span>
                            {thumbnailAnalysis.critique}
                          </div>

                          <div className="text-xs text-muted-foreground/80 space-y-2 p-2 bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 rounded-md border border-white/5">
                            <p><span className="font-bold text-white">عناصر مقترحة:</span> {thumbnailAnalysis.suggestedElements}</p>
                            <p><span className="font-bold text-white">نص مقترح:</span> {thumbnailAnalysis.suggestedText}</p>
                            <p><span className="font-bold text-white">أسلوب مقترح:</span> {thumbnailAnalysis.suggestedStyle}</p>
                          </div>

                          <button
                            onClick={() => {
                              setElements(thumbnailAnalysis.suggestedElements);
                              setImageText(thumbnailAnalysis.suggestedText);
                              setStyle(thumbnailAnalysis.suggestedStyle);
                            }}
                            className="w-full py-2.5 bg-primary/20 text-primary/80 rounded-lg font-bold text-xs hover:bg-primary/30 transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Wand2 className="w-4 h-4" />
                            تطبيق التحسينات المقترحة
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => baseThumbInputRef.current?.click()}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-white/20 bg-black/20 hover:bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary/90"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="font-medium">اضغط لرفع الصورة المصغرة</span>
                    <span className="text-xs text-slate-400">سيتم تحسينها وتعديلها بناءً على خياراتك</span>
                  </button>
                )}
              </div>
            )}

            {/* Character Selection */}
            <div className="bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-white/90 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  الشخصيات (يمكنك اختيار أكثر من واحدة)
                </label>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-3 snap-x scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent items-start">
                {/* Upload Button */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0 w-20 snap-center">
                  <button
                    onClick={() => triggerUpload('character')}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-white/20 bg-black/20 hover:bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary/90 group"
                  >
                    <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                    <span className="text-[10px] font-medium">رفع صورة</span>
                  </button>
                </div>

                {/* Uploaded Characters */}
                {uploadedImages.filter(img => img.type === 'character').map(img => (
                  <div key={img.id} className="flex flex-col items-center gap-2 flex-shrink-0 w-20 snap-center">
                    <div className="relative w-20 h-20 rounded-xl border-2 border-primary shadow-md group">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover rounded-lg" />
                      <button
                        onClick={() => removeUploadedImage(img.id)}
                        className="absolute -top-2 -right-2 bg-accent/100 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute -top-2 -left-2 bg-primary/100 text-white rounded-full p-1 shadow-sm z-10">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={img.name}
                      onChange={(e) => {
                        setUploadedImages(prev => prev.map(p => p.id === img.id ? { ...p, name: e.target.value } : p));
                      }}
                      className="text-[10px] text-center border border-white/10 rounded px-1 py-1 w-full focus:ring-1 focus:ring-primary/50 outline-none"
                      placeholder="اسم الشخصية"
                    />
                  </div>
                ))}

                {/* DB Characters */}
                {characters.map(char => {
                  const isSelected = selectedCharIds.includes(char.id);
                  return (
                    <div key={char.id} className="flex flex-col items-center gap-2 flex-shrink-0 w-20 snap-center">
                      <button
                        onClick={() => toggleCharacterSelection(char.id)}
                        className={cn(
                          "w-20 h-20 rounded-xl border-2 overflow-hidden transition-all relative group",
                          isSelected
                            ? "border-primary shadow-md ring-2 ring-primary/50/20 ring-offset-1"
                            : "border-white/10 hover:border-primary/30 hover:shadow-sm opacity-80 hover:opacity-100"
                        )}
                      >
                        <img src={char.images.front} alt={char.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <>
                            <div className="absolute inset-0 bg-primary/100/10 transition-colors"></div>
                            <div className="absolute -top-2 -left-2 bg-primary/100 text-white rounded-full p-1 shadow-sm">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </>
                        )}
                      </button>
                      <span className="text-[10px] text-muted-foreground/80 truncate w-full text-center font-medium px-1" title={char.name}>
                        {char.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Text in Image */}
            <div className="bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 p-4 rounded-xl border border-white/5">
              <label className="block text-sm font-bold text-white/90 mb-1 flex items-center gap-2">
                <TypeIcon className="w-4 h-4 text-primary" />
                النص المكتوب في الصورة (اختياري)
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                {mode === 'enhance' ? 'سيتم استبدال النص القديم في الصورة بهذا النص.' : 'سيتم كتابة هذا النص بخط يوتيوب عريض ومجسم.'}
              </p>
              <input
                type="text"
                value={imageText}
                onChange={(e) => setImageText(e.target.value)}
                className="w-full p-3 border border-white/10 rounded-xl text-sm bg-black/20 outline-none focus:ring-2 focus:ring-red-500"
                placeholder="مثال: لن تصدق ما حدث! 😱"
              />
            </div>

            {mode === 'create' && (
              <div>
                <label className="block text-sm font-bold text-white/90 mb-1">فكرة الفيديو / العنوان</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border border-white/10 rounded-xl text-sm bg-black/20 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="مثال: كيف ربحت مليون دولار في يومين..."
                />
              </div>
            )}

            <div className="bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-white/90">عناصر إضافية في الصورة</label>
                <button
                  onClick={() => triggerUpload('element')}
                  className="text-xs bg-black/20 border border-white/10 px-2 py-1 rounded-md shadow-sm hover:bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 flex items-center gap-1 text-muted-foreground/80"
                >
                  <Upload className="w-3 h-3" /> رفع عنصر
                </button>
              </div>

              {/* Uploaded Elements */}
              {uploadedImages.filter(img => img.type === 'element').length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {uploadedImages.filter(img => img.type === 'element').map(img => (
                    <div key={img.id} className="relative flex items-center gap-2 bg-black/20 border border-white/10 rounded-lg p-1 pr-2 shadow-sm">
                      <img src={img.dataUrl} alt={img.name} className="w-8 h-8 object-cover rounded-md" />
                      <input
                        type="text"
                        value={img.name}
                        onChange={(e) => {
                          setUploadedImages(prev => prev.map(p => p.id === img.id ? { ...p, name: e.target.value } : p));
                        }}
                        className="text-xs outline-none w-20 bg-transparent"
                        placeholder="اسم العنصر"
                      />
                      <button onClick={() => removeUploadedImage(img.id)} className="text-slate-400 hover:text-accent">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={elements}
                onChange={(e) => setElements(e.target.value)}
                className="w-full p-3 border border-white/10 rounded-xl text-sm bg-black/20 outline-none focus:ring-2 focus:ring-red-500"
                placeholder="مثال: حقائب أموال تتطاير، سهم أحمر صاعد..."
              />
            </div>

            {mode !== 'from_story' && (
              <div>
                <label className="block text-sm font-bold text-white/90 mb-1">أسلوب التصميم (ستايل القناة)</label>
                <CustomSelect
                  value={style}
                  onChange={setStyle}
                  options={allStyles}
                  className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            {mode === 'create' && (
              <div>
                <label className="block text-sm font-bold text-white/90 mb-1">الخلفية</label>
                <input
                  type="text"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-full p-3 border border-white/10 rounded-xl text-sm bg-black/20 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="مثال: غرفة مظلمة مع إضاءة نيون ��رقاء..."
                />
              </div>
            )}

            {mode !== 'from_story' && (
              <div className="space-y-3 mt-6">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-white">إعدادات متقدمة والهوية البصرية</h3>
                  <div className="flex gap-2">
                    {savedIdentities.length > 0 && (
                      <select
                        className="text-xs border-white/10 rounded-md bg-black/20 text-white/90 px-2 py-1 outline-none focus:border-red-500"
                        onChange={(e) => {
                          const id = savedIdentities.find(s => s.name === e.target.value);
                          if (id) loadIdentity(id);
                          e.target.value = '';
                        }}
                      >
                        <option value="" className="bg-[#090A0F] text-white">تحميل هوية محفوظة...</option>
                        {savedIdentities.map((id: any, i: number) => (
                          <option key={i} value={id.name} className="bg-[#090A0F] text-white">{id.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={saveIdentity}
                      className="text-xs bg-primary/10 text-primary/80 hover:bg-primary/20 px-3 py-1 rounded-md font-medium flex items-center gap-1 transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      حفظ الهوية
                    </button>
                  </div>
                </div>

                {/* Video & Channel Settings */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenSection(openSection === 'video' ? '' as any : 'video')}
                    className="w-full flex items-center justify-between p-3 bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 hover:bg-black/40 border border-white/10 backdrop-blur-md transition-colors"
                  >
                    <span className="font-bold text-sm text-white/90">إعدادات القناة والفيديو</span>
                    {openSection === 'video' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openSection === 'video' && (
                    <div className="p-4 bg-black/20 space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">نيش القناة (Niche)</label>
                        <CustomSelect value={channelNiche} onChange={setChannelNiche} options={channelNiches} className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">نوع الفيديو</label>
                        <CustomSelect value={videoType} onChange={setVideoType} options={videoTypes} className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-2">ألوان الهوية البصرية (Brand Colors)</label>
                        <ColorPicker color={brandColor} onChange={setBrandColor} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">أبعاد الصورة</label>
                        <CustomSelect value={aspectRatio} onChange={setAspectRatio} options={aspectRatios} className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Character Settings */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenSection(openSection === 'character' ? '' as any : 'character')}
                    className="w-full flex items-center justify-between p-3 bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 hover:bg-black/40 border border-white/10 backdrop-blur-md transition-colors"
                  >
                    <span className="font-bold text-sm text-white/90">إعدادات الشخصية (إذا وجدت)</span>
                    {openSection === 'character' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openSection === 'character' && (
                    <div className="p-4 bg-black/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">تعابير الوجه</label>
                        <CustomSelect value={facialExpression} onChange={setFacialExpression} options={['', ...facialExpressions]} placeholder="اختر أو اترك فارغاً" className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">المشاعر</label>
                        <CustomSelect value={emotion} onChange={setEmotion} options={['', ...emotions]} placeholder="اختر أو اترك فارغاً" className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">تعابير العيون</label>
                        <CustomSelect value={eyeExpression} onChange={setEyeExpression} options={['', ...eyeExpressions]} placeholder="اختر أو اترك فارغاً" className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">لون العيون</label>
                        <CustomSelect value={eyeColor} onChange={setEyeColor} options={['', ...eyeColors]} placeholder="اختر أو اترك فارغاً" className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">شكل الرأس</label>
                        <CustomSelect value={headShape} onChange={setHeadShape} options={['', ...headShapes]} placeholder="اختر أو اترك فارغاً" className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white/90 mb-1">شكل الجسم</label>
                        <CustomSelect value={bodyShape} onChange={setBodyShape} options={['', ...bodyShapes]} placeholder="اختر أو اترك فارغاً" className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-white/90 mb-1">وضع الجسم (Pose)</label>
                        <CustomSelect value={bodyPose} onChange={setBodyPose} options={['', ...bodyPoses]} placeholder="اختر أو اترك فارغاً" className="p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={startGeneration}
            disabled={mode === 'from_story' && (!selectedStoryId || isAnalyzingStory || !storyMetadata)}
            className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-8 group relative overflow-hidden"
          >
            {mode === 'enhance' ? <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
            <span>{mode === 'from_story' ? 'توليد السحر: صورة مصغرة للقصة' : mode === 'enhance' ? 'تفعيل سحر التحسين' : 'إطلاق سحر التصميم'}</span>
          </button>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/100 blur-xl opacity-20 animate-pulse rounded-full"></div>
            <Loader2 className="w-16 h-16 text-accent animate-spin relative z-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">جاري تصميم الـ Thumbnail...</h3>
            <p className="text-muted-foreground mt-2">نطبق أساليب القنوات المشهورة لجذب المشاهدات</p>
          </div>
        </div>
      )}

      {step === 'review' && generatedImage && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          {thumbnailSaved && (
            <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
              <Check className="w-4 h-4" />
              تم حفظ الصورة تلقائيا في المعرض
            </div>
          )}
          <div className="aspect-video rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-black/40 border border-white/10 backdrop-blur-md">
            <img src={generatedImage} className="w-full h-full object-cover" alt="Generated Thumbnail" />
          </div>

          {/* Show metadata for from_story mode */}
          {mode === 'from_story' && storyMetadata && (
            <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-primary/20 shadow-sm">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-white/90">عنوان الفيديو (Hook)</label>
                  <button onClick={() => copyText(storyMetadata.videoTitle)} className="text-xs text-primary/90 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> نسخ
                  </button>
                </div>
                <p className="text-sm text-white bg-yellow-50 p-2 rounded border border-yellow-100 font-medium">{storyMetadata.videoTitle}</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-white/90">وصف الفيديو</label>
                  <button onClick={() => copyText(storyMetadata.videoDescription)} className="text-xs text-primary/90 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> نسخ
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/80 bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 p-2 rounded border border-white/5 whitespace-pre-wrap leading-relaxed">{storyMetadata.videoDescription}</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-white/90 flex items-center gap-1"><Hash className="w-3 h-3" /> هاشتاقات</label>
                  <button onClick={() => copyText(storyMetadata.hashtags)} className="text-xs text-primary/90 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> نسخ
                  </button>
                </div>
                <p className="text-xs text-secondary-foreground bg-secondary/50 p-3 rounded-xl border border-white/5">{storyMetadata.hashtags}</p>
              </div>
            </div>
          )}

          <div className="bg-card/40 backdrop-blur-xl shadow-lg border border-white/5 p-4 rounded-xl">
            <h4 className="font-medium text-sm mb-2 text-white">تفاصيل التصميم:</h4>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              الأسلوب: {style.split(' (')[0]}<br />
              العناصر: {elements || 'بدون'}<br />
              الخلفية: {background}
            </p>
          </div>

          <div className="flex flex-col gap-3 pb-8">
            <button
              onClick={downloadImage}
              className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all active:scale-[0.98] group relative overflow-hidden"
            >
              <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
              <span>تنزيل الصورة المختارة (16:9)</span>
            </button>
            <button
              onClick={startGeneration}
              disabled={isProcessing}
              className="w-full py-3 bg-accent/10 text-red-700 rounded-xl font-bold shadow-sm hover:bg-accent/20 flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span>إعادة توليد بنتيجة مختلفة</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
