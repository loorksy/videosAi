import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronRight, Loader2, Image as ImageIcon, Sparkles, Palette, Download, Check } from 'lucide-react';
import { AIService } from '../lib/aiService';
import { db, MediaItem } from '../lib/db';
import { CustomSelect } from '../components/CustomSelect';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductStudio() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'product' | 'brand'>('product');

  // Product Shot State
  const [productName, setProductName] = useState('');
  const [background, setBackground] = useState('استوديو بخلفية بيضاء نقية');
  const [lighting, setLighting] = useState('إضاءة استوديو احترافية (Softbox)');
  const [style, setStyle] = useState('واقعي جداً (Photorealistic)');
  const [isGeneratingProduct, setIsGeneratingProduct] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productSaved, setProductSaved] = useState(false);

  // Brand Identity State
  const [brandDescription, setBrandDescription] = useState('');
  const [isGeneratingBrand, setIsGeneratingBrand] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandResult, setBrandResult] = useState<{
    names: string[];
    slogan: string;
    colors: string[];
    typography: string;
    moodboardImage: string;
  } | null>(null);

  const backgrounds = [
    'استوديو بخلفية بيضاء نقية',
    'رخام فاخر مع انعكاسات',
    'طبيعة، أوراق شجر وضوء شمس',
    'ماء متناثر (Splash)',
    'منصة خشبية ريفية',
    'إضاءة نيون سينمائية',
    'خلفية ملونة باستيل (Pastel)',
    'رمال شاطئ وصيف'
  ];

  const lightings = [
    'إضاءة استوديو احترافية (Softbox)',
    'إضاءة شمس طبيعية (Golden Hour)',
    'إضاءة درامية بظلال قوية',
    'إضاءة نيون ملونة',
    'إضاءة ساطعة جداً (High Key)'
  ];

  const styles = [
    'واقعي جداً (Photorealistic)',
    'بسيط وأنيق (Minimalist)',
    'حيوي وملون (Vibrant)',
    'فاخر وكلاسيكي (Luxury)',
    'عصري وشبابي (Modern/Pop)'
  ];

  // --- Category Tree Data ---
  const categoryTree = {
    'إلكترونيات': ['هواتف ذكية', 'حواسيب', 'ساعات ذكية', 'سماعات'],
    'أزياء': ['ملابس رجالية', 'ملابس نسائية', 'أحذية', 'حقائب', 'إكسسوارات'],
    'عطور وتجميل': ['عطور فاخرة', 'عناية بالبشرة', 'مكياج', 'عناية بالشعر'],
    'أثاث وديكور': ['غرف معيشة', 'ديكور مكتبي', 'إضاءات ومصابيح'],
    'أطعمة ومشروبات': ['قهوة مختصة', 'حلويات', 'مخبوزات', 'مشروبات صحية']
  };

  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('إلكترونيات');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('هواتف ذكية');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');

  // --- Visual Identity Logic ---
  const [savedIdentities, setSavedIdentities] = useState<any[]>([]);

  React.useEffect(() => {
    const ids = JSON.parse(localStorage.getItem('product_identities') || '[]');
    setSavedIdentities(ids);
  }, []);

  const saveIdentity = () => {
    const profile = {
      background,
      lighting,
      style,
      mainCategory: selectedMainCategory,
      subCategory: selectedSubCategory
    };
    const profiles = JSON.parse(localStorage.getItem('product_identities') || '[]');
    const name = prompt('أدخل اسماً لحفظ هذه الهوية البصرية (مثال: ستايل العطور):');
    if (!name) return;

    profiles.push({ name, ...profile });
    localStorage.setItem('product_identities', JSON.stringify(profiles));
    setSavedIdentities(profiles);
    alert('تم حفظ الهوية البصرية بنجاح!');
  };

  const loadIdentity = (identity: any) => {
    setBackground(identity.background || backgrounds[0]);
    setLighting(identity.lighting || lightings[0]);
    setStyle(identity.style || styles[0]);
    if (identity.mainCategory) setSelectedMainCategory(identity.mainCategory);
    if (identity.subCategory) setSelectedSubCategory(identity.subCategory);
  };

  const generateProduct = async () => {
    if (!productName.trim() && !isCustomCategory) {
      alert("يرجى كتابة اسم/وصف المنتج.");
      return;
    }
    setIsGeneratingProduct(true);
    try {
      let finalProductDesc = productName;

      if (isCustomCategory || selectedSubCategory === 'تخصيص') {
        finalProductDesc = `التصنيف: ${customCategoryText} - الوصف: ${productName}`;
      } else {
        finalProductDesc = `التصنيف: ${selectedMainCategory} (${selectedSubCategory}) - الوصف: ${productName}`;
      }

      const result = await AIService.generateProductShot({
        product: finalProductDesc,
        background,
        lighting,
        style
      });
      setProductImage(result);

      // Auto-save to media gallery
      const mediaItem: MediaItem = {
        id: `product-${Date.now()}`,
        type: 'image',
        title: `منتج: ${productName || customCategoryText || selectedSubCategory}`,
        description: `${background} - ${lighting} - ${style}`,
        data: result,
        source: 'product',
        createdAt: Date.now(),
      };
      await db.saveMediaItem(mediaItem);
      setProductSaved(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGeneratingProduct(false);
    }
  };

  const generateBrand = async () => {
    if (!brandDescription.trim()) {
      alert("يرجى وصف مشروعك.");
      return;
    }
    setIsGeneratingBrand(true);
    try {
      const result = await AIService.generateBrandIdentity(brandDescription);
      setBrandResult(result);

      // Auto-save moodboard to media gallery
      if (result.moodboardImage) {
        const mediaItem: MediaItem = {
          id: `brand-${Date.now()}`,
          type: 'image',
          title: `هوية بصرية: ${brandDescription.slice(0, 40)}`,
          description: `شعار: ${result.slogan} | أسماء: ${result.names.join('، ')}`,
          data: result.moodboardImage,
          source: 'brand',
          createdAt: Date.now(),
        };
        await db.saveMediaItem(mediaItem);
        setBrandSaved(true);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGeneratingBrand(false);
    }
  };

  const handleDownload = (imgUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto min-h-screen bg-transparent pb-32">
      {/* Header */}
      <div className="flex items-center mb-6 pt-2">
        <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-muted-foreground hover:text-white transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold mr-2 flex items-center gap-2 text-white">
          <Package className="w-5 h-5 text-primary" />
          استوديو المنتجات والهوية
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/20 rounded-xl p-1 border border-white/5 mb-6 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('product')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'product' ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground hover:text-white'
            }`}
        >
          تصوير المنتجات
        </button>
        <button
          onClick={() => setActiveTab('brand')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'brand' ? 'bg-accent/20 text-accent shadow-sm' : 'text-muted-foreground hover:text-white'
            }`}
        >
          بناء الهوية البصرية
        </button>
      </div>

      {/* Tab 1: Product Shot */}
      {activeTab === 'product' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-card/40 backdrop-blur-xl p-5 rounded-3xl shadow-lg border border-white/5 space-y-4">

            {/* Visual Identity Save/Load */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-2">
              <h3 className="font-bold text-white tracking-wide">إعدادات الهوية والتصنيف</h3>
              <div className="flex gap-2">
                {savedIdentities.length > 0 && (
                  <select
                    className="text-xs border border-white/10 rounded-md bg-black/20 text-white/90 px-2 py-1 outline-none focus:border-primary/50"
                    onChange={(e) => {
                      const id = savedIdentities.find(s => s.name === e.target.value);
                      if (id) loadIdentity(id);
                      e.target.value = '';
                    }}
                  >
                    <option value="" className="bg-[#090A0F]">تحميل هوية محفوظة...</option>
                    {savedIdentities.map((id: any, i: number) => (
                      <option key={i} value={id.name} className="bg-[#090A0F]">{id.name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={saveIdentity}
                  className="text-xs bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Palette className="w-3.5 h-3.5" />
                  حفظ الهوية
                </button>
              </div>
            </div>

            {/* Product Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-white/90 mb-1.5">التصنيف الرئيسي</label>
                <select
                  value={selectedMainCategory}
                  onChange={(e) => {
                    setSelectedMainCategory(e.target.value);
                    const subCats = categoryTree[e.target.value as keyof typeof categoryTree] || [];
                    setSelectedSubCategory(subCats[0] || '');
                    setIsCustomCategory(e.target.value === 'أخرى (Custom)');
                  }}
                  className="w-full p-3.5 border border-white/10 rounded-xl text-sm bg-black/20 focus:ring-2 focus:ring-primary/40 outline-none text-white transition-all"
                >
                  {Object.keys(categoryTree).map(cat => (
                    <option key={cat} value={cat} className="bg-[#090A0F]">{cat}</option>
                  ))}
                  <option value="أخرى (Custom)" className="bg-[#090A0F]">أخرى (Custom)</option>
                </select>
              </div>

              {!isCustomCategory ? (
                <div>
                  <label className="block text-sm font-bold text-white/90 mb-1.5">التصنيف الفرعي</label>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="w-full p-3.5 border border-white/10 rounded-xl text-sm bg-black/20 focus:ring-2 focus:ring-primary/40 outline-none text-white transition-all"
                  >
                    {(categoryTree[selectedMainCategory as keyof typeof categoryTree] || []).map((sub: string) => (
                      <option key={sub} value={sub} className="bg-[#090A0F]">{sub}</option>
                    ))}
                    <option value="تخصيص" className="bg-[#090A0F]">تخصيص مانيوال...</option>
                  </select>
                </div>
              ) : null}
            </div>

            {(isCustomCategory || selectedSubCategory === 'تخصيص') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-sm font-bold text-white/90 mb-1.5 mt-2">اكتب التصنيف بوضوح</label>
                <input
                  type="text"
                  value={customCategoryText}
                  onChange={(e) => setCustomCategoryText(e.target.value)}
                  placeholder="مثال: أدوات زراعية، معدات رياضية نادرة..."
                  className="w-full p-3.5 border border-white/10 rounded-xl text-sm bg-black/20 focus:ring-2 focus:ring-primary/40 outline-none text-white placeholder:text-muted-foreground/50 transition-all"
                />
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-bold text-white/90 mb-1.5 mt-2">وصف المنتج الدقيق</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="مثال: زجاجة عطر فاخرة، كوب قهوة سيراميك أسود..."
                className="w-full p-3.5 border border-white/10 rounded-xl text-sm bg-black/20 focus:ring-2 focus:ring-primary/40 outline-none text-white placeholder:text-muted-foreground/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white/90 mb-1.5">الخلفية والبيئة</label>
              <CustomSelect value={background} onChange={setBackground} options={backgrounds} className="p-3.5 rounded-xl border-white/10 bg-black/20 text-white focus:ring-primary/40" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-white/90 mb-1.5">الإضاءة</label>
                <CustomSelect value={lighting} onChange={setLighting} options={lightings} className="p-3.5 rounded-xl border-white/10 bg-black/20 text-white focus:ring-primary/40" />
              </div>

              <div>
                <label className="block text-sm font-bold text-white/90 mb-1.5">الأسلوب (Style)</label>
                <CustomSelect value={style} onChange={setStyle} options={styles} className="p-3.5 rounded-xl border-white/10 bg-black/20 text-white focus:ring-primary/40" />
              </div>
            </div>
          </div>

          <button
            onClick={generateProduct}
            disabled={isGeneratingProduct}
            className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white rounded-2xl font-bold shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isGeneratingProduct ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري تصوير المنتج بسحر الذكاء...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                <span>توليد صورة المنتج</span>
              </>
            )}
          </button>

          {productImage && (
            <div className="bg-card/40 backdrop-blur-xl p-5 rounded-3xl shadow-lg border border-white/5 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> النتيجة النهائية</h2>
                {productSaved && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                    تم الحفظ
                  </span>
                )}
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl mb-5">
                <img src={productImage} alt="Product" className="w-full h-full object-cover" />
              </div>
              <button
                onClick={() => handleDownload(productImage, 'product-shot.png')}
                className="w-full py-3.5 bg-white/10 text-white border border-white/10 rounded-xl font-bold hover:bg-white/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Download className="w-5 h-5" />
                <span>تحميل الصورة عالية الدقة</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Brand Identity */}
      {activeTab === 'brand' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-card/40 backdrop-blur-xl p-5 rounded-3xl shadow-lg border border-white/5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-white/90 mb-2">فكرة المشروع / المنتج</label>
              <textarea
                value={brandDescription}
                onChange={(e) => setBrandDescription(e.target.value)}
                placeholder="مثال: مقهى مختص يقدم قهوة عضوية في أجواء كلاسيكية هادئة..."
                className="w-full h-28 p-4 border border-white/10 rounded-xl text-sm bg-black/20 focus:ring-2 focus:ring-accent/40 outline-none resize-none text-white placeholder:text-muted-foreground/50 transition-all text-right"
              />
            </div>
          </div>

          <button
            onClick={generateBrand}
            disabled={isGeneratingBrand}
            className="w-full py-4 bg-gradient-to-r from-accent to-accent-tertiary text-white rounded-2xl font-bold shadow-[0_0_20px_rgba(236,72,153,0.2)] hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isGeneratingBrand ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>يتم استدعاء سحر الهوية البصرية...</span>
              </>
            ) : (
              <>
                <Palette className="w-5 h-5" />
                <span>ابتكار الهوية البصرية الشاملة</span>
              </>
            )}
          </button>

          {brandResult && (
            <div className="space-y-5 animate-in zoom-in-95">
              {/* Names & Slogan */}
              <div className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/5">
                <h3 className="text-xs font-bold text-accent-tertiary uppercase tracking-wider mb-4">الأسماء المقترحة</h3>
                <div className="flex flex-wrap gap-2.5 mb-6">
                  {brandResult.names.map((name, i) => (
                    <span key={i} className="bg-accent/10 text-accent px-4 py-2 rounded-xl text-sm font-bold border border-accent/20">
                      {name}
                    </span>
                  ))}
                </div>

                <h3 className="text-xs font-bold text-accent-tertiary uppercase tracking-wider mb-3">الشعار اللفظي (Slogan)</h3>
                <p className="text-white font-medium text-xl italic leading-relaxed">"{brandResult.slogan}"</p>
              </div>

              {/* Colors & Typography */}
              <div className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">لوحة الألوان</h3>
                <div className="flex gap-3 mb-6">
                  {brandResult.colors.map((color, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full aspect-square rounded-2xl shadow-lg border border-white/10"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">{color}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">الخطوط المقترحة</h3>
                <p className="text-sm text-white/90 bg-black/20 p-4 rounded-2xl border border-white/5 leading-relaxed">
                  {brandResult.typography}
                </p>
              </div>

              {/* Moodboard */}
              <div className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/5">
                <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  لوحة الإلهام (Moodboard)
                </h3>
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl mb-5">
                  <img src={brandResult.moodboardImage} alt="Moodboard" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => handleDownload(brandResult.moodboardImage, 'brand-moodboard.png')}
                  className="w-full py-3.5 bg-white/10 text-white border border-white/10 rounded-xl font-bold hover:bg-white/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" />
                  <span>تحميل الـ Moodboard الشامل</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
