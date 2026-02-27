import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clapperboard, Film, Plus, Sparkles, ArrowRight, Ghost, Smile, Youtube, Cat, Lightbulb, PlaySquare, Dna, Package, Megaphone, Video, UserSquare2 } from 'lucide-react';
import { motion } from 'framer-motion';

function ToolCard({ to, icon: Icon, label, description, color }: { to: string; icon: any; label: string; description: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    red: 'bg-red-500/10 text-red-600',
    sky: 'bg-sky-500/10 text-sky-600',
    amber: 'bg-amber-500/10 text-amber-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    orange: 'bg-orange-500/10 text-orange-600',
    pink: 'bg-pink-500/10 text-pink-600',
    rose: 'bg-rose-500/10 text-rose-600',
    indigo: 'bg-primary/10 text-primary',
  };

  return (
    <Link 
      to={to} 
      className="group flex items-center gap-3 bg-card p-3.5 rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.primary} transition-transform duration-200 group-hover:scale-105`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-card-foreground text-sm leading-tight">{label}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-200 flex-shrink-0 rotate-180" />
    </Link>
  );
}

function QuickAction({ to, icon: Icon, label, gradient }: { to: string; icon: any; label: string; gradient: string }) {
  return (
    <Link 
      to={to} 
      className={`${gradient} text-white p-3 rounded-xl font-semibold text-xs flex flex-col items-center justify-center gap-1.5 text-center shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
    >
      <Icon className="w-5 h-5" />
      <span className="leading-tight">{label}</span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="bg-[#0c0e12] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0e12]/40 via-transparent to-[#0c0e12]"></div>
        
        <div className="relative max-w-lg mx-auto p-6 pt-14 pb-20">
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-xs font-medium backdrop-blur-sm text-white/80">
              <Sparkles className="w-3 h-3 text-amber-400" />
              الإصدار الاحترافي
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-balance">
              {'اصنع قصصك'}
              <br/>
              <span className="text-primary">بالذكاء الاصطناعي</span>
            </h1>
            <p className="text-white/50 text-sm max-w-xs leading-relaxed">
              من الفكرة إلى الفيديو الكامل. صمم شخصياتك، اكتب السيناريو، وشاهد قصتك تتحول إلى واقع.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-8 flex gap-3"
          >
            <Link 
              to="/storyboards/new" 
              className="flex-1 bg-primary text-primary-foreground py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>قصة جديدة</span>
            </Link>
            <Link 
              to="/thumbnails/new" 
              className="flex-1 bg-white/10 backdrop-blur-sm border border-white/10 text-white py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/15 transition-all active:scale-[0.98]"
            >
              <Youtube className="w-4 h-4 text-red-400" />
              <span>صورة مصغرة</span>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 -mt-10 relative z-10 space-y-6">
        
        {/* Quick Actions Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-2.5"
        >
          <QuickAction to="/surreal-characters/new" icon={Ghost} label="شخصية خيالية" gradient="bg-emerald-600" />
          <QuickAction to="/funny-humans/new" icon={Smile} label="بشري مضحك" gradient="bg-orange-500" />
          <QuickAction to="/creature-characters/new" icon={Cat} label="مخلوق / حيوان" gradient="bg-teal-600" />
          <QuickAction to="/hybrid-characters/new" icon={Dna} label="شخصية هجينة" gradient="bg-rose-500" />
          <QuickAction to="/viral-ideas" icon={Lightbulb} label="أفكار فيروسية" gradient="bg-amber-500" />
          <QuickAction to="/character-animation" icon={PlaySquare} label="تحريك الشخصيات" gradient="bg-primary" />
        </motion.div>

        {/* Main Tools */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">الأدوات الاحترافية</h2>
          <div className="space-y-2">
            <ToolCard to="/character-sheet/new" icon={UserSquare2} label="منشئ ورقة الشخصية" description="رفع صورة وتوليد 3 زوايا للشخصية" color="indigo" />
            <ToolCard to="/product-studio" icon={Package} label="استوديو المنتجات والهوية" description="تصوير منتجات وبناء هوية بصرية" color="sky" />
            <ToolCard to="/ad-campaign-studio" icon={Megaphone} label="استوديو الإعلانات" description="تصميم بوستات إعلانية احترافية" color="primary" />
            <ToolCard to="/kling-motion" icon={Video} label="Motion Control (Kling AI)" description="انقل حركة فيديو حقيقي الى شخصيتك" color="pink" />
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">الاستكشاف</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Link to="/characters" className="bg-card p-4 rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-2.5 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-card-foreground text-sm">مكتبة الشخصيات</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">إدارة وتصميم أبطال قصتك</p>
            </Link>

            <Link to="/storyboards" className="bg-card p-4 rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="w-9 h-9 bg-sky-500/10 rounded-lg flex items-center justify-center text-sky-600 mb-2.5 group-hover:scale-105 transition-transform">
                <Clapperboard className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-card-foreground text-sm">القصص والمشاهد</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">كتابة السيناريو وتوليد اللقطات</p>
            </Link>
          </div>

          <Link to="/gallery" className="bg-card p-4 rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all group flex items-center gap-4">
            <div className="w-11 h-11 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-card-foreground text-sm">معرض الفيديو (Veo3)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">شاهد وحمل أعمالك النهائية بجودة عالية</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:-translate-x-1 transition-all rotate-180 flex-shrink-0" />
          </Link>
        </div>

        {/* Pro Tips */}
        <div className="bg-[#0c0e12] rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 p-4 opacity-5">
            <Sparkles className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-sm mb-1.5 text-white/90">نصيحة احترافية</h3>
            <p className="text-sm text-white/40 leading-relaxed mb-3">
              للحصول على أفضل اتساق في الشخصيات، قم بتوليد "ورقة تصميم" كاملة واستخدمها كمرجع في كل المشاهد.
            </p>
            <Link to="/settings" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition-colors text-white/70 hover:text-white">
              <span>ضبط إعدادات الجودة</span>
              <ArrowRight className="w-3 h-3 rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
