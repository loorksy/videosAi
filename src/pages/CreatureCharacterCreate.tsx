import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, Loader2, Download, Wand2, Cat, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from '../lib/gemini';
import { db, Character } from '../lib/db';
import { CustomSelect } from '../components/CustomSelect';

export default function CreatureCharacterCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'generating' | 'review'>('input');
  
  // Form State
  const [baseCreature, setBaseCreature] = useState('قط (Cat)');
  const [hybridCreature, setHybridCreature] = useState('');
  const [bodyType, setBodyType] = useState('جسم إنسان (Humanoid)');
  const [outfit, setOutfit] = useState('بدلة رسمية (Formal Suit)');
  const [accessories, setAccessories] = useState('نظارات طبية (Glasses)');
  const [expression, setExpression] = useState('نظرة جادة (Serious)');
  const [style, setStyle] = useState('3D Pixar/Disney Style');
  const [background, setBackground] = useState('خلفية بيضاء نقية (Pure White)');
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Options
  const creatures = ['قط (Cat)', 'كلب (Dog)', 'ديناصور (Dinosaur)', 'تنين (Dragon)', 'أسد (Lion)', 'نمر (Tiger)', 'دب (Bear)', 'ذئب (Wolf)', 'ثعلب (Fox)', 'أرنب (Rabbit)', 'قرد (Monkey)', 'فيل (Elephant)', 'زرافة (Giraffe)', 'غزال (Deer)', 'حصان (Horse)', 'بقرة (Cow)', 'خنزير (Pig)', 'خروف (Sheep)', 'ماعز (Goat)', 'دجاجة (Chicken)', 'بطة (Duck)', 'حمامة (Pigeon)', 'بومة (Owl)', 'صقر (Falcon)', 'نسر (Eagle)', 'غراب (Crow)', 'ببغاء (Parrot)', 'طاووس (Peacock)', 'نعامة (Ostrich)', 'بطريق (Penguin)', 'تمساح (Crocodile)', 'سلحفاة (Turtle)', 'ثعبان (Snake)', 'سحلية (Lizard)', 'ضفدع (Frog)', 'سمكة القرش (Shark)', 'دلفين (Dolphin)', 'حوت (Whale)', 'أخطبوط (Octopus)', 'حبار (Squid)', 'سلطعون (Crab)', 'عنكبوت (Spider)', 'عقرب (Scorpion)', 'نحلة (Bee)', 'نملة (Ant)', 'فراشة (Butterfly)', 'خنفساء (Beetle)', 'حلزون (Snail)', 'دودة (Worm)', 'كائن فضائي (Alien)', 'وحش (Monster)', 'عفريت (Goblin)', 'قزم (Elf)', 'حورية بحر (Mermaid)', 'وحيد القرن (Unicorn)', 'بيغاسوس (Pegasus)', 'غريفين (Griffin)', 'مينوتور (Minotaur)', 'قنطور (Centaur)', 'مستذئب (Werewolf)', 'مصاص دماء (Vampire)', 'زومبي (Zombie)', 'شبح (Ghost)', 'هيكل عظمي (Skeleton)', 'مومياء (Mummy)', 'روبوت (Robot)', 'سايبورغ (Cyborg)', 'شجرة حية (Ent)', 'صخرة حية (Golem)', 'نار حية (Fire Elemental)', 'ماء حي (Water Elemental)', 'هواء حي (Air Elemental)', 'أرض حية (Earth Elemental)', 'ظل (Shadow)', 'نور (Light)'];
  const bodyTypes = ['جسم إنسان (Humanoid)', 'جسم حيوان طبيعي (Feral)', 'جسم رياضي معضل (Muscular Humanoid)', 'جسم نحيل (Skinny Humanoid)', 'جسم ممتلئ (Chubby Humanoid)', 'جسم طفل/تشيبي (Chibi/Cute)', 'جسم روبوت (Robotic)', 'جسم عملاق (Giant)'];
  const outfits = ['بدون ملابس (Naked)', 'بدلة رسمية (Formal Suit)', 'ملابس شارع (Streetwear)', 'درع فارس (Knight Armor)', 'ملابس فضاء (Spacesuit)', 'ملابس نينجا (Ninja)', 'ملابس ساحر (Wizard Robes)', 'ملابس رياضية (Sportswear)', 'ملابس طبيب (Doctor Coat)', 'ملابس شرطي (Police Uniform)', 'ملابس ملكية (Royal Attire)', 'ملابس سايبربانك (Cyberpunk)', 'ملابس شتوية (Winter Coat)'];
  const accessoriesList = ['بدون إضافات', 'نظارات طبية (Glasses)', 'نظارات شمسية (Sunglasses)', 'قبعة سحرية (Magic Hat)', 'تاج ملكي (Crown)', 'سيف (Sword)', 'عصا سحرية (Magic Wand)', 'حقيبة ظهر (Backpack)', 'سماعات رأس (Headphones)', 'ساعة يد (Watch)', 'قلادة ذهبية (Gold Chain)', 'سيجارة/غليون (Pipe)', 'وشاح (Scarf)'];
  const expressions = ['نظرة جادة (Serious)', 'ابتسامة لطيفة (Cute Smile)', 'ضحك بصوت عالٍ (Laughing)', 'غضب شديد (Angry)', 'حزن وبكاء (Crying)', 'صدمة (Shocked)', 'غمزة (Winking)', 'نظرة شريرة (Evil Smirk)', 'نظرة بريئة (Innocent)', 'تفكير عميق (Thinking)'];
  const styles = ['3D Pixar/Disney Style', 'واقعي جداً (Hyperrealistic)', 'أنمي ياباني (Anime)', 'رسم يدوي (Hand-drawn)', 'سايبربانك (Cyberpunk)', 'ستيم بانك (Steampunk)', 'فن البوب (Pop Art)', 'ألوان مائية (Watercolor)', 'فيكتوري (Victorian)', 'أبيض وأسود (Black & White)'];
  const backgrounds = ['خلفية بيضاء نقية (Pure White)', 'خلفية سوداء (Solid Black)', 'شاشة خضراء (Green Screen)', 'مدينة مستقبلية (Futuristic City)', 'غابة سحرية (Magic Forest)', 'مكتب فخم (Luxury Office)', 'شارع ممطر (Rainy Street)', 'فضاء خارجي (Outer Space)', 'مقهى دافئ (Cozy Cafe)'];

  const startGeneration = async () => {
    if (!baseCreature) return;
    setIsProcessing(true);
    setStep('generating');
    
    try {
      const image = await GeminiService.generateCreatureCharacter({
        baseCreature,
        hybridCreature,
        bodyType,
        outfit,
        accessories,
        expression,
        style,
        background
      });
      
      setGeneratedImage(image);
      setStep('review');
    } catch (error: any) {
      console.error(error);
      alert(`فشل التوليد: ${error.message}`);
      setStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveCharacter = async () => {
    if (!generatedImage) return;
    
    const charName = hybridCreature 
      ? `${baseCreature.split(' ')[0]} مدمج مع ${hybridCreature.split(' ')[0]}`
      : `${baseCreature.split(' ')[0]} ${outfit.split(' ')[0]}`;

    const newChar: Character = {
      id: uuidv4(),
      name: charName,
      description: `شخصية مخلوق: ${baseCreature} ${hybridCreature ? `مدمج مع ${hybridCreature}` : ''}`,
      visualTraits: `Body: ${bodyType}, Outfit: ${outfit}, Accessories: ${accessories}, Expression: ${expression}, Style: ${style}, Background: ${background}`,
      createdAt: Date.now(),
      images: {
        front: generatedImage
      }
    };

    await db.saveCharacter(newChar);
    navigate('/characters');
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `creature-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 max-w-lg mx-auto min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="flex items-center mb-6 pt-2">
        <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold mr-2 flex items-center gap-2 text-foreground">
          <Cat className="w-5 h-5 text-emerald-600" />
          شخصية مخلوق / حيوان
        </h1>
      </div>

      {step === 'input' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm leading-relaxed border border-emerald-100">
            اصنع شخصيات خيالية من الحيوانات والمخلوقات! يمكنك جعلها ترتدي ملابس، تقف كالبشر، أو حتى دمج حيوانين معاً.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">المخلوق الأساسي</label>
              <CustomSelect value={baseCreature} onChange={setBaseCreature} options={creatures} className="p-3 rounded-xl focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">دمج مع مخلوق آخر (اختياري)</label>
              <CustomSelect value={hybridCreature} onChange={setHybridCreature} options={['', ...creatures]} placeholder="بدون دمج" className="p-3 rounded-xl focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">شكل الجسم</label>
              <CustomSelect value={bodyType} onChange={setBodyType} options={bodyTypes} className="p-3 rounded-xl focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">الملابس / الزي</label>
              <CustomSelect value={outfit} onChange={setOutfit} options={outfits} className="p-3 rounded-xl focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">الإكسسوارات</label>
              <CustomSelect value={accessories} onChange={setAccessories} options={accessoriesList} className="p-3 rounded-xl focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">تعابير الوجه</label>
              <CustomSelect value={expression} onChange={setExpression} options={expressions} className="p-3 rounded-xl focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">الأسلوب الفني</label>
              <CustomSelect value={style} onChange={setStyle} options={styles} className="p-3 rounded-xl focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">الخلفية</label>
              <CustomSelect value={background} onChange={setBackground} options={backgrounds} className="p-3 rounded-xl focus:ring-emerald-500" />
            </div>
          </div>

          <button
            onClick={startGeneration}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2 mt-8"
          >
            <Wand2 className="w-5 h-5" />
            <span>توليد الشخصية</span>
          </button>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
            <Loader2 className="w-16 h-16 text-emerald-600 animate-spin relative z-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">جاري تخليق المخلوق...</h3>
            <p className="text-slate-500 mt-2">نجمع الجينات ونخيط الملابس السحرية 🧬✨</p>
          </div>
        </div>
      )}

      {step === 'review' && generatedImage && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          <div className="aspect-square rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-100 relative group">
            <img src={generatedImage} className="w-full h-full object-cover" alt="Generated Creature" />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl">
            <h4 className="font-medium text-sm mb-2 text-slate-900">تفاصيل المخلوق:</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              الأساس: {baseCreature}<br/>
              {hybridCreature && <>مدمج مع: {hybridCreature}<br/></>}
              الزي: {outfit}<br/>
              الأسلوب: {style}
            </p>
          </div>

          <div className="flex flex-col gap-3 pb-8">
            <button
              onClick={saveCharacter}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>حفظ الشخصية في المكتبة</span>
            </button>
            <button
              onClick={downloadImage}
              className="w-full py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>تنزيل الصورة</span>
            </button>
            <button
              onClick={() => {
                setGeneratedImage(null);
                setStep('input');
              }}
              className="w-full py-3 text-slate-500 font-medium text-sm hover:text-slate-700"
            >
              تعديل المواصفات وإعادة التوليد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
