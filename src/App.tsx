import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Clapperboard, Film, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from './lib/utils';
import Login from './pages/Login';
import Home from './pages/Home';
import CharacterList from './pages/CharacterList';
import CharacterCreate from './pages/CharacterCreate';
import SurrealCharacterCreate from './pages/SurrealCharacterCreate';
import FunnyHumanCreate from './pages/FunnyHumanCreate';
import CreatureCharacterCreate from './pages/CreatureCharacterCreate';
import HybridCharacterCreate from './pages/HybridCharacterCreate';
import ViralIdeasGenerator from './pages/ViralIdeasGenerator';
import ThumbnailCreate from './pages/ThumbnailCreate';
import CharacterAnimation from './pages/CharacterAnimation';
import ProductStudio from './pages/ProductStudio';
import AdCampaignStudio from './pages/AdCampaignStudio';
import KlingMotionControl from './pages/KlingMotionControl';
import StoryboardList from './pages/StoryboardList';
import StoryboardCreate from './pages/StoryboardCreate';
import StoryboardView from './pages/StoryboardView';
import VideoGallery from './pages/VideoGallery';
import SettingsPage from './pages/Settings';
import { Home as HomeIcon } from 'lucide-react';

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all duration-200 relative",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -top-px w-10 h-[3px] bg-primary rounded-b-full"
        />
      )}
      <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 1.8} />
      <span className={cn("text-[10px] leading-tight", isActive ? "font-bold" : "font-medium")}>{label}</span>
    </Link>
  );
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  return (
    <Router>
      <div className="flex flex-col h-screen overflow-hidden bg-background font-sans">
        <main className="flex-1 overflow-y-auto pb-20 scroll-smooth">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/characters" element={<CharacterList />} />
            <Route path="/characters/new" element={<CharacterCreate />} />
            <Route path="/surreal-characters/new" element={<SurrealCharacterCreate />} />
            <Route path="/funny-humans/new" element={<FunnyHumanCreate />} />
            <Route path="/creature-characters/new" element={<CreatureCharacterCreate />} />
            <Route path="/hybrid-characters/new" element={<HybridCharacterCreate />} />
            <Route path="/viral-ideas" element={<ViralIdeasGenerator />} />
            <Route path="/character-animation" element={<CharacterAnimation />} />
            <Route path="/product-studio" element={<ProductStudio />} />
            <Route path="/ad-campaign-studio" element={<AdCampaignStudio />} />
            <Route path="/kling-motion" element={<KlingMotionControl />} />
            <Route path="/thumbnails/new" element={<ThumbnailCreate />} />
            <Route path="/storyboards" element={<StoryboardList />} />
            <Route path="/storyboards/new" element={<StoryboardCreate />} />
            <Route path="/storyboards/:id" element={<StoryboardView />} />
            <Route path="/gallery" element={<VideoGallery />} />
            <Route path="/settings" element={<SettingsPage onLogout={onLogout} />} />
          </Routes>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-xl border-t border-border/60 shadow-[0_-2px_24px_rgba(0,0,0,0.06)] z-50">
          <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
            <NavItem to="/" icon={HomeIcon} label="الرئيسية" />
            <NavItem to="/characters" icon={Users} label="الشخصيات" />
            <NavItem to="/storyboards" icon={Clapperboard} label="القصص" />
            <NavItem to="/gallery" icon={Film} label="المعرض" />
            <NavItem to="/settings" icon={Settings} label="الإعدادات" />
          </div>
        </nav>
      </div>
    </Router>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(auth === 'true');
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <AuthenticatedApp onLogout={handleLogout} />;
}
