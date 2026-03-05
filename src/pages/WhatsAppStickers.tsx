import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sticker, ChevronRight, Loader2, Sparkles, Download, Check, ImagePlus, X, Briefcase, User } from 'lucide-react';
import { AIService } from '../lib/aiService';
import { db, MediaItem } from '../lib/db';
import { CustomSelect } from '../components/CustomSelect';
import { ColorPicker } from '../components/ColorPicker';

export default function WhatsAppStickers() {
    const navigate = useNavigate();

    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState('كارتون مسطح (Flat Cartoon)');
    const [emotion, setEmotion] = useState('مضحك / ساخر');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSticker, setGeneratedSticker] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [purpose, setPurpose] = useState('شخصي / ترفيهي');
    const [brandName, setBrandName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#10b981');
    const [secondaryColor, setSecondaryColor] = useState('#ffffff');
    const [industry, setIndustry] = useState('');
    const [referenceImage, setReferenceImage] = useState<string | null>(null);

    const purposes = [
        'شخصي / ترفيهي',
        'شركات / بزنس'
    ];

    const styles = [
        'كارتون مسطح (Flat Cartoon)',
        'ثلاثي الأبعاد (3D Emoji)',
        'أنمي مصغر (Chibi Anime)',
        'فن بيكسل (Pixel Art)',
        'رسم يدوي (Hand-drawn)',
        'واقعي ساخر (Meme/Realistic)'
    ];

    const emotions = [
        'مضحك / ساخر',
        'غاضب جداً',
        'سعيد ومبهج',
        'مصدوم / متفاجئ',
        'حزين ودراماتيكي',
        'تفكير عميق / محتار'
    ];

    const generateSticker = async () => {
        if (!topic.trim()) {
            alert("يرجى كتابة فكرة أو عبارة للملصق.");
            return;
        }
        setIsGenerating(true);
        setSaved(false);
        try {
            const result = await AIService.generateSticker({
                topic,
                style,
                emotion,
                purpose,
                brandName: purpose === 'شركات / بزنس' ? brandName : undefined,
                primaryColor: purpose === 'شركات / بزنس' ? primaryColor : undefined,
                secondaryColor: purpose === 'شركات / بزنس' ? secondaryColor : undefined,
                industry: purpose === 'شركات / بزنس' ? industry : undefined,
                referenceImage
            });

            setGeneratedSticker(result);

            // Auto-save to gallery (Wrap in try-catch to avoid crashing if DB is down)
            try {
                const mediaItem: MediaItem = {
                    id: `sticker-${Date.now()}`,
                    type: 'image',
                    title: `ملصق: ${topic.slice(0, 30)}`,
                    description: `${style} - ${emotion}`,
                    data: result,
                    source: 'sticker',
                    createdAt: Date.now(),
                };
                await db.saveMediaItem(mediaItem);
                setSaved(true);
            } catch (saveError) {
                console.warn("Failed to save to gallery (DB might be offline):", saveError);
                setSaved(false); // Do not show "Saved" checkmark, but let the user see the result
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedSticker) return;
        const a = document.createElement('a');
        a.href = generatedSticker;
        a.download = `sticker-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReferenceImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="p-4 max-w-lg mx-auto min-h-screen bg-background pb-32">
            <div className="flex items-center mb-6 pt-2">
                <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold mr-2 flex items-center gap-2 text-foreground">
                    <Sticker className="w-5 h-5 text-emerald-500" />
                    صانع ملصقات الواتساب
                </h1>
            </div>

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-emerald-50 p-4 rounded-xl text-sm text-emerald-800 leading-relaxed border border-emerald-100 flex items-start gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg mt-0.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p>
                        اصنع ملصقات (Stickers) لتطبيقات المحادثة مثل WhatsApp. النظام سيقوم بتوليد صورة بخلفية بيضاء نقية جاهزة للتحويل إلى ملصق.
                    </p>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">فكرة الملصق أو العبارة</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="مثال: قطة تشرب قهوة ومصدومة، كلمة 'الراتب طار'..."
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1">الهدف من الملصق</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setPurpose('شخصي / ترفيهي')}
                                    className={`py-3 px-4 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${purpose === 'شخصي / ترفيهي' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-emerald-200'
                                        }`}
                                >
                                    <User className="w-5 h-5" />
                                    شخصي / ترفيهي
                                </button>
                                <button
                                    onClick={() => setPurpose('شركات / بزنس')}
                                    className={`py-3 px-4 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${purpose === 'شركات / بزنس' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-primary/30'
                                        }`}
                                >
                                    <Briefcase className="w-5 h-5" />
                                    شركات / بزنس
                                </button>
                            </div>
                        </div>

                        {purpose === 'شركات / بزنس' && (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم الشركة / العلامة</label>
                                    <input
                                        type="text"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        placeholder="مثال: متجر الأمل..."
                                        className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">اللون الأساسي للعلامة</label>
                                    <ColorPicker color={primaryColor} onChange={setPrimaryColor} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">اللون الثانوي</label>
                                    <ColorPicker color={secondaryColor} onChange={setSecondaryColor} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">المجال / الصناعة</label>
                                    <input
                                        type="text"
                                        value={industry}
                                        onChange={(e) => setIndustry(e.target.value)}
                                        placeholder="مثال: مطعم، عيادة أسنان، عقارات..."
                                        className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-primary outline-none"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">سيساعد ذلك الذكاء الاصطناعي في توجيه الهوية البصرية للملصق لتناسب مجالك.</p>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الأسلوب الفني</label>
                            <CustomSelect value={style} onChange={setStyle} options={styles} className="p-3 rounded-xl focus:ring-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">المزاج (Emotion)</label>
                            <CustomSelect value={emotion} onChange={setEmotion} options={emotions} className="p-3 rounded-xl focus:ring-emerald-500" />
                        </div>

                        <div className="md:col-span-2 mt-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">صورة مرجعية (اختياري)</label>
                            {referenceImage ? (
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-200 group">
                                    <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => setReferenceImage(null)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="w-full py-4 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer flex items-center justify-center gap-2 transition-all group">
                                    <ImagePlus className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                    <span className="text-sm font-medium group-hover:text-emerald-600 transition-colors">رفع صورة كمرجع للتصميم</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            )}
                            <p className="text-xs text-slate-400 mt-2">يمكنك رفع صورة شعارك أو شخصية لتصميم الملصق بناءً عليها.</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={generateSticker}
                    disabled={isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>جاري الإبداع...</span>
                        </>
                    ) : (
                        <>
                            <Sticker className="w-5 h-5" />
                            <span>توليد الملصق</span>
                        </>
                    )}
                </button>

                {generatedSticker && (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-slate-800">الملصق الجاهز</h2>
                            {saved && (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    <Check className="w-3 h-3" />
                                    تم الحفظ في المعرض
                                </span>
                            )}
                        </div>

                        {/* Checkerboard background to show it's meant to be a sticker */}
                        <div className="aspect-square rounded-xl overflow-hidden shadow-inner mb-4 relative" style={{
                            backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0), linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 10px 10px'
                        }}>
                            <img src={generatedSticker} alt="Sticker" className="w-full h-full object-contain p-4" />
                        </div>

                        <button
                            onClick={handleDownload}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-all"
                        >
                            <Download className="w-5 h-5" />
                            <span>تحميل الصورة (PNG)</span>
                        </button>
                        <p className="text-xs text-center text-slate-500 mt-2">ملاحظة: يمكنك استخدام تطبيقات مثل Sticker Maker لتحويلها لملصق واتساب حقيقي.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
