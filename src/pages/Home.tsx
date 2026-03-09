import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clapperboard, Film, Plus, Sparkles, ArrowRight, Ghost, Smile, Youtube, Cat, Lightbulb, Dna, Package, Megaphone, Video, UserSquare2, Sticker, Image as ImageIcon, ShieldAlert } from 'lucide-react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';

// --- Design Spells: Magnetic Button ---
function MagneticButton({ children, className, to }: { children: React.ReactNode, className: string, to: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hx = (e.clientX - rect.left - rect.width / 2) * 0.35; // Strength of pull
    const hy = (e.clientY - rect.top - rect.height / 2) * 0.35;
    x.set(hx);
    y.set(hy);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      <Link
        to={to}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </Link>
    </motion.div>
  );
}

function ToolCard({ to, icon: Icon, label, description, color }: { to: string; icon: any; label: string; description: string; color: string }) {
  // Mapping standard colors to the new cinematic palette
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/20 text-primary-foreground shadow-[0_0_15px_rgba(139,92,246,0.3)]',
    red: 'bg-rose-500/20 text-rose-400',
    sky: 'bg-accent-tertiary/20 text-accent-tertiary',
    amber: 'bg-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    orange: 'bg-orange-500/20 text-orange-400',
    pink: 'bg-accent/20 text-accent',
    rose: 'bg-rose-500/20 text-rose-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
  };

  return (
    <Link
      to={to}
      className="group relative flex items-center gap-4 bg-card/60 backdrop-blur-xl p-4 rounded-3xl border border-white/5 hover:border-primary/40 transition-all duration-300 overflow-hidden"
    >
      {/* Hover Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.primary} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1 z-10">
        <h3 className="font-bold text-card-foreground text-sm leading-tight tracking-tight">{label}</h3>
        <p className="text-xs text-muted-foreground mt-1 truncate">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300 z-10 flex-shrink-0 rotate-180" />
    </Link>
  );
}

function QuickAction({ to, icon: Icon, label, gradient }: { to: string; icon: any; label: string; gradient: string }) {
  return (
    <Link
      to={to}
      className={`${gradient} text-white p-4 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-2 text-center shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95`}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="leading-tight tracking-tight">{label}</span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-transparent md:p-8 pb-24 md:pb-8 relative">

      {/* Cursor Follower Glow (Subtle) can be implemented at layout root, but giving hero a deep space feel here */}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-0 mt-4 md:mt-8 relative z-10 space-y-12 md:space-y-16">

        {/* Quick Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
        >
          <QuickAction to="/surreal-characters/new" icon={Ghost} label="كائنات سيريالية" gradient="bg-gradient-to-br from-emerald-500 to-teal-700" />
          <QuickAction to="/funny-humans/new" icon={Smile} label="شخصيات كرتونية" gradient="bg-gradient-to-br from-orange-400 to-rose-600" />
          <QuickAction to="/creature-characters/new" icon={Cat} label="مخلوقات سحرية" gradient="bg-gradient-to-br from-teal-400 to-indigo-600" />
          <QuickAction to="/hybrid-characters/new" icon={Dna} label="هندسة جينية" gradient="bg-gradient-to-br from-rose-400 to-primary" />
          <QuickAction to="/viral-ideas" icon={Lightbulb} label="إلهام فيروسي" gradient="bg-gradient-to-br from-amber-400 to-orange-600" />
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          {/* Main Tools (Left Column on Desktop) */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest px-1">أدوات الاستوديو</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToolCard to="/character-sheet/new" icon={UserSquare2} label="ورقة تصميم الشخصية" description="توليد 3 مساقط بصرية متناسقة" color="indigo" />
              <ToolCard to="/product-studio" icon={Package} label="استوديو المنتجات" description="خلفيات وإضاءة سينمائية لمنتجك" color="sky" />
              <ToolCard to="/ad-campaign-studio" icon={Megaphone} label="منصة الحملات الإعلانية" description="تصميم بصري تسويقي متكامل" color="primary" />
              <ToolCard to="/thumbnails/new" icon={Youtube} label="استوديو الصور المصغرة" description="تصميم صور مصغرة يوتيوب جذابة" color="red" />
              <ToolCard to="/whatsapp-stickers" icon={Sticker} label="معمل ملصقات الواتساب" description="قص وتفريغ آلي بتصميم مرح" color="emerald" />
              <ToolCard to="/wallpapers" icon={ImageIcon} label="صانع خلفيات 8K Meca" description="عوالم سينمائية لشاشتك" color="amber" />
            </div>
          </div>

          {/* Sidebar / Right Column on Desktop */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest px-1">العمليات والإدارة</h2>

            <div className="flex flex-col gap-4">
              <Link to="/characters" className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 hover:border-primary/40 hover:bg-card/60 transition-all duration-300 group flex items-center gap-5">
                <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-card-foreground text-lg tracking-tight">طاقم الممثلين</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">إدارة أبطال قصصك</p>
                </div>
              </Link>

              <Link to="/storyboards" className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 hover:border-accent-tertiary/40 hover:bg-card/60 transition-all duration-300 group flex items-center gap-5">
                <div className="w-14 h-14 bg-accent-tertiary/20 rounded-2xl flex items-center justify-center text-accent-tertiary flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Clapperboard className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-card-foreground text-lg tracking-tight">السيناريوهات والمشاهد</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">لوحات القصة المكتوبة</p>
                </div>
              </Link>

              <Link to="/gallery" className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 hover:border-accent/40 hover:bg-card/60 transition-all duration-300 group flex items-center gap-5">
                <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center text-accent flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                  <Film className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-card-foreground text-lg tracking-tight">صالة العرض</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">الفيديوهات النهائية</p>
                </div>
              </Link>

              {/* Shimmering Pro Tip Card */}
              <div className="relative mt-4 rounded-[2rem] overflow-hidden p-[1px] group">
                {/* Background animated gradient using before element for strict control */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-accent-tertiary opacity-30 group-hover:opacity-100 transition-opacity duration-1000 rotate-180 mix-blend-screen" style={{ animation: 'spin 10s linear infinite' }}></div>

                <div className="relative bg-card/80 backdrop-blur-3xl rounded-[2rem] p-8 text-white h-full border border-white/10">
                  <div className="absolute top-0 right-0 p-6 opacity-5 blur-sm pointer-events-none">
                    <Sparkles className="w-40 h-40 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-3 text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent" />
                      نصيحة سينمائية
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-medium">
                      للحصول على أفضل استقرار في المشاهد المعقدة، زود الذكاء الاصطناعي بوصف دقيق للكاميرا والإضاءة بجانب وصف الحركة.
                    </p>
                    <Link to="/settings" className="inline-flex w-full justify-center md:w-auto items-center gap-2 text-sm font-bold bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-all text-white border border-white/5 shadow-inner">
                      <span>إدارة المفاتيح الخاصة بك (BYOK)</span>
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for some specific animations used above */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
