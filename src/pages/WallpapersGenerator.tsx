import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, ChevronRight, Loader2, Sparkles, Palette, Download, Check } from 'lucide-react';
import { AIService } from '../lib/aiService';
import { CustomSelect } from '../components/CustomSelect';
import { ColorPicker } from '../components/ColorPicker';
import { X, Upload, Wand2, Type as TypeIcon } from 'lucide-react';
import { db, MediaItem } from '../lib/db';
import { wallpaperStyles, wallpaperColors, wallpaperFonts } from '../lib/wallpaperConstants';

export default function WallpapersGenerator() {
    const navigate = useNavigate();

    // Settings State
    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState('سينمائي');
    const [colorPalette, setColorPalette] = useState('ألوان نيون');
    const [aspectRatio, setAspectRatio] = useState('9:16');

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [referenceImages, setReferenceImages] = useState<{ id: string, dataUrl: string }[]>([]);

    // Advanced Options State
    const [includePeople, setIncludePeople] = useState(true);
    const [overlayText, setOverlayText] = useState('');
    const [overlayFont, setOverlayFont] = useState(wallpaperFonts[0]);
    const [overlayColor, setOverlayColor] = useState('#ffffff');
    const [overlayPosition, setOverlayPosition] = useState<'top' | 'center' | 'bottom'>('center');
    const [logoImage, setLogoImage] = useState<string | null>(null);

    // Identity State
    const [savedIdentities, setSavedIdentities] = useState<any[]>([]);

    React.useEffect(() => {
        const ids = JSON.parse(localStorage.getItem('wallpaper_identities') || '[]');
        setSavedIdentities(ids);
    }, []);

    const styles = wallpaperStyles;
    const colors = wallpaperColors;
    const fonts = wallpaperFonts;

    const aspectRatios = [
        { value: '9:16', label: 'موبايل (9:16)' },
        { value: '16:9', label: 'كمبيوتر (16:9)' },
        { value: '1:1', label: 'مربع (1:1)' },
        { value: '3:4', label: 'تابلت (3:4)' }
    ];

    const saveIdentity = () => {
        const profile = {
            style,
            colorPalette,
            aspectRatio
        };
        const profiles = JSON.parse(localStorage.getItem('wallpaper_identities') || '[]');
        const name = prompt('أدخل اسماً لحفظ أسلوب الخلفيات:');
        if (!name) return;

        profiles.push({ name, ...profile });
        localStorage.setItem('wallpaper_identities', JSON.stringify(profiles));
        setSavedIdentities(profiles);
        alert('تم الحفظ بنجاح!');
    };

    const loadIdentity = (identity: any) => {
        setStyle(identity.style || styles[0]);
        setColorPalette(identity.colorPalette || colors[0]);
        if (identity.aspectRatio) setAspectRatio(identity.aspectRatio);
    };

    const generateWallpaper = async () => {
        if (!topic.trim()) {
            alert("يرجى وصف الخلفية المطلوبة.");
            return;
        }
        setIsGenerating(true);
        setSaved(false);
        try {
            let finalRefs = [...referenceImages.map(img => img.dataUrl)];
            let textInstruction = "";

            if (overlayText || logoImage) {
                const canvas = document.createElement('canvas');
                let w = 1024, h = 1024;
                if (aspectRatio === '9:16') { w = 720; h = 1280; }
                else if (aspectRatio === '16:9') { w = 1280; h = 720; }
                else if (aspectRatio === '3:4') { w = 768; h = 1024; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    if (logoImage) {
                        try {
                            const logo = new Image();
                            logo.crossOrigin = "anonymous";
                            const loaded = await new Promise((resolve) => {
                                logo.onload = () => resolve(true);
                                logo.onerror = () => resolve(false);
                                logo.src = logoImage;
                            });
                            if (loaded) {
                                const logoWidth = w * 0.15;
                                const aspect = logo.height / logo.width;
                                const logoHeight = logoWidth * aspect;
                                ctx.drawImage(logo, w - logoWidth - (w * 0.05), w * 0.05, logoWidth, logoHeight);
                                textInstruction += " Also seamlessly integrate the provided logo exactly as shown in the reference image. ";
                            }
                        } catch (e) { }
                    }
                    if (overlayText) {
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = overlayColor;
                        const fontSize = Math.floor(w * 0.08);
                        ctx.font = `bold ${fontSize}px "${overlayFont}", sans-serif`;

                        const lines = overlayText.split('\n');
                        const lineHeight = fontSize * 1.2;
                        let startY = h / 2;
                        if (overlayPosition === 'top') startY = h * 0.15;
                        if (overlayPosition === 'bottom') startY = h * 0.85;
                        startY -= ((lines.length - 1) * lineHeight) / 2;

                        lines.forEach((line, i) => {
                            ctx.fillText(line, w / 2, startY + (i * lineHeight));
                        });
                        textInstruction += ` IMPORTANT: NATIVELY GENERATE AND INTEGRATE THE EXACT TEXT "${overlayText}" AS PART OF THE SCENERY OR DESIGN naturally! It should be written in ${overlayColor} color. `;
                    }
                    finalRefs.push(canvas.toDataURL('image/png'));
                }
            }

            const finalTopic = (includePeople ? topic : `${topic}. (CRITICAL: Do not include ANY people, humans, characters, or faces in this image. It must be completely unpopulated.)`) + textInstruction;

            const result = await AIService.generateWallpaper({
                topic: finalTopic,
                style,
                colorPalette,
                aspectRatio,
                referenceImages: finalRefs
            });

            setGeneratedImage(result);

            // Auto-save to gallery
            const mediaItem: MediaItem = {
                id: `wallpaper-${Date.now()}`,
                type: 'image',
                title: `خلفية: ${topic.slice(0, 30)}`,
                description: `${style} - ${colorPalette} - ${aspectRatio}`,
                data: result,
                source: 'wallpaper',
                createdAt: Date.now(),
            };
            try {
                await db.saveMediaItem(mediaItem);
                setSaved(true);
            } catch (err) {
                console.warn("Could not save to DB (might be offline):", err);
                setSaved(false);
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnhanceIdea = async () => {
        if (!topic.trim()) {
            alert('اكتب فكرة مبدئية أولاً ليتم تحسينها!');
            return;
        }
        setIsEnhancingIdea(true);
        try {
            const result = await AIService.generateWallpaperIdea(topic);
            setTopic(result);
        } catch (e: any) {
            console.error(e);
            alert("فشل تحسين الفكرة.");
        } finally {
            setIsEnhancingIdea(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const a = document.createElement('a');
        a.href = generatedImage;
        a.download = `wallpaper-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        files.forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newImage = {
                    id: Date.now().toString() + Math.random().toString(),
                    dataUrl: reader.result as string,
                };
                setReferenceImages(prev => [...prev, newImage]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        e.target.value = '';
    };

    const removeReferenceImage = (id: string) => {
        setReferenceImages(prev => prev.filter(img => img.id !== id));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setLogoImage(reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <div className="p-4 max-w-lg mx-auto min-h-screen bg-background pb-32">
            {/* Header */}
            <div className="flex items-center mb-6 pt-2">
                <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold mr-2 flex items-center gap-2 text-foreground">
                    <ImageIcon className="w-5 h-5 text-fuchsia-500" />
                    صانع الخلفيات الذكي
                </h1>
            </div>

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {/* Settings Form */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">

                    {/* Identity Controls */}
                    <div className="flex justify-between items-center border-b pb-3 mb-2">
                        <h3 className="font-bold text-slate-800">أسلوب التصميم والهوية</h3>
                        <div className="flex gap-2">
                            {savedIdentities.length > 0 && (
                                <select
                                    className="text-xs border-slate-200 rounded-md bg-white text-slate-700 px-2 py-1 outline-none focus:border-fuchsia-500"
                                    onChange={(e) => {
                                        const id = savedIdentities.find(s => s.name === e.target.value);
                                        if (id) loadIdentity(id);
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">تحميل أسلوب...</option>
                                    {savedIdentities.map((id: any, i: number) => (
                                        <option key={i} value={id.name}>{id.name}</option>
                                    ))}
                                </select>
                            )}
                            <button
                                onClick={saveIdentity}
                                className="text-xs bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 px-3 py-1 rounded-md font-medium flex items-center gap-1 transition-colors"
                            >
                                <Palette className="w-3 h-3" />
                                حفظ الأسلوب
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-700">الفكرة</label>
                            <button
                                onClick={handleEnhanceIdea}
                                disabled={isEnhancingIdea}
                                className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:shadow-md disabled:opacity-50 transition-all"
                            >
                                {isEnhancingIdea ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                تحسين الفكرة بالذكاء الاصطناعي
                            </button>
                        </div>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="اكتب فكرتك للخلفية هنا..."
                            className="w-full h-24 p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:ring-2 focus:ring-fuchsia-500 outline-none resize-none"
                        />

                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includePeople}
                                onChange={(e) => setIncludePeople(e.target.checked)}
                                className="w-4 h-4 text-fuchsia-600 rounded border-gray-300 focus:ring-fuchsia-500"
                            />
                            <span className="text-xs text-slate-700 font-medium">إظهار أشخاص في الخلفية</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">أسلوب الرسم</label>
                            <CustomSelect value={style} onChange={setStyle} options={styles} className="p-2 text-xs rounded-xl focus:ring-fuchsia-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">لوحة الألوان المِسَيطِرة</label>
                            <CustomSelect value={colorPalette} onChange={setColorPalette} options={colors} className="p-2 text-xs rounded-xl focus:ring-fuchsia-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">أبعاد الخلفية</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {aspectRatios.map(ar => (
                                <button
                                    key={ar.value}
                                    onClick={() => setAspectRatio(ar.value)}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${aspectRatio === ar.value
                                        ? 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-700 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {ar.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700">صور مرجعية للاستنساخ</label>
                                <p className="text-xs text-slate-500 mt-1">ارفع صورة لاستنساخ الأسلوب أو الألوان.</p>
                            </div>
                            <label className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm hover:bg-slate-50 flex items-center gap-1.5 text-slate-600 cursor-pointer transition-colors font-medium">
                                <Upload className="w-3.5 h-3.5" />
                                رفع صور
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </div>

                        {referenceImages.length > 0 && (
                            <div className="flex gap-2 flex-wrap mb-2">
                                {referenceImages.map(img => (
                                    <div key={img.id} className="relative w-16 h-16 rounded-xl border-2 border-slate-200 overflow-hidden group">
                                        <img src={img.dataUrl} alt="Reference" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => removeReferenceImage(img.id)}
                                                className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Text & Logo Overlay Options */}
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-fuchsia-500" />
                            النصوص والشعارات
                        </h3>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">نص مضاف للصورة</label>
                            <textarea
                                value={overlayText}
                                onChange={(e) => setOverlayText(e.target.value)}
                                placeholder="النص..."
                                className="w-full h-16 p-2 border border-slate-200 rounded-md text-xs bg-slate-50 outline-none resize-none"
                            />
                        </div>

                        {overlayText && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع الخط</label>
                                    <CustomSelect value={overlayFont} onChange={setOverlayFont} options={fonts} className="p-2 text-xs rounded-md" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700">لون النص</label>
                                    <div className="scale-90 origin-top-right">
                                        <ColorPicker color={overlayColor} onChange={setOverlayColor} />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">موضع النص</label>
                                    <CustomSelect
                                        value={overlayPosition}
                                        onChange={setOverlayPosition as any}
                                        options={['top', 'center', 'bottom']}
                                        className="p-2 text-xs rounded-md"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-700">شعار (Logo)</label>
                                {logoImage && (
                                    <button onClick={() => setLogoImage(null)} className="text-[10px] text-red-500 hover:underline">
                                        إزالة الشعار
                                    </button>
                                )}
                            </div>
                            {logoImage ? (
                                <div className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-1">
                                    <img src={logoImage} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                            ) : (
                                <label className="text-xs bg-white border border-slate-200 border-dashed w-full py-4 rounded-xl hover:bg-slate-50 flex flex-col items-center gap-2 text-slate-500 cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4" />
                                    رفع شعار
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={generateWallpaper}
                    disabled={isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:from-fuchsia-600 hover:to-pink-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>جاري التوليد بدقة عالية...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            <span>توليد الخلفية</span>
                        </>
                    )}
                </button>

                {/* Result */}
                {generatedImage && (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-slate-800">النتيجة النهائية</h2>
                            {saved && (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    <Check className="w-3 h-3" />
                                    تم الحفظ في المعرض
                                </span>
                            )}
                        </div>

                        <div className={`relative rounded-xl overflow-hidden shadow-inner mb-4 flex items-center justify-center bg-slate-900 ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '3:4' ? 'aspect-[3/4]' : 'aspect-square'}`}>
                            <img src={generatedImage} alt="Wallpaper" className="w-full h-full object-cover" />
                        </div>

                        <button
                            onClick={handleDownload}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-all"
                        >
                            <Download className="w-5 h-5" />
                            <span>تحميل كخلفية نهائية</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
