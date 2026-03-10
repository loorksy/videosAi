import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Users, Clapperboard, Film, Settings, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CharacterList from './pages/CharacterList';
import CharacterCreate from './pages/CharacterCreate';
import CharacterSheetCreate from './pages/CharacterSheetCreate';
import SurrealCharacterCreate from './pages/SurrealCharacterCreate';
import FunnyHumanCreate from './pages/FunnyHumanCreate';
import CreatureCharacterCreate from './pages/CreatureCharacterCreate';
import HybridCharacterCreate from './pages/HybridCharacterCreate';
import ViralIdeasGenerator from './pages/ViralIdeasGenerator';
import ThumbnailCreate from './pages/ThumbnailCreate';
import ProductStudio from './pages/ProductStudio';
import WallpapersGenerator from './pages/WallpapersGenerator';
import WhatsAppStickers from './pages/WhatsAppStickers';
import AdCampaignStudio from './pages/AdCampaignStudio';
import StoryboardList from './pages/StoryboardList';
import StoryboardCreate from './pages/StoryboardCreate';
import StoryboardView from './pages/StoryboardView';
import VideoGallery from './pages/VideoGallery';
import SettingsPage from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTenantsPage from './pages/admin/AdminTenantsPage';
import AdminFalSettingsPage from './pages/admin/AdminFalSettingsPage';
import { Home as HomeIcon } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGuard, AdminGuard } from './guards/AuthGuard';

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col md:flex-row items-center justify-center md:justify-start w-full h-full md:h-auto gap-1 md:gap-3 transition-all duration-300 relative group md:px-4 md:py-3 md:rounded-xl",
        isActive
          ? "text-primary md:bg-primary/10 md:shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]"
          : "text-muted-foreground hover:text-foreground md:hover:bg-white/5"
      )}
    >
      {/* Mobile Active Indicator */}
      {isActive && (
        <motion.div
          layoutId="mobile-nav-indicator"
          className="md:hidden absolute -top-px w-12 h-[3px] bg-gradient-to-r from-primary to-accent rounded-b-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
        />
      )}

      {/* Desktop Active Glow */}
      {isActive && (
        <div className="hidden md:block absolute inset-0 border border-primary/20 rounded-xl pointer-events-none" />
      )}

      <Icon
        className={cn(
          "w-5 h-5 transition-transform duration-300",
          isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "group-hover:scale-105"
        )}
        strokeWidth={isActive ? 2.5 : 1.8}
      />
      <span className={cn(
        "text-[10px] md:text-sm leading-tight transition-all duration-300",
        isActive ? "font-bold tracking-wide" : "font-medium"
      )}>
        {label}
      </span>
    </Link>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <AnimatePresence mode="wait">
      {/* @ts-ignore */}
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AuthGuard><PageWrapper><Home /></PageWrapper></AuthGuard>} />
        <Route path="/characters" element={<AuthGuard><PageWrapper><CharacterList /></PageWrapper></AuthGuard>} />
        <Route path="/characters/new" element={<AuthGuard><PageWrapper><CharacterCreate /></PageWrapper></AuthGuard>} />
        <Route path="/character-sheet/new" element={<AuthGuard><PageWrapper><CharacterSheetCreate /></PageWrapper></AuthGuard>} />
        <Route path="/surreal-characters/new" element={<AuthGuard><PageWrapper><SurrealCharacterCreate /></PageWrapper></AuthGuard>} />
        <Route path="/funny-humans/new" element={<AuthGuard><PageWrapper><FunnyHumanCreate /></PageWrapper></AuthGuard>} />
        <Route path="/creature-characters/new" element={<AuthGuard><PageWrapper><CreatureCharacterCreate /></PageWrapper></AuthGuard>} />
        <Route path="/hybrid-characters/new" element={<AuthGuard><PageWrapper><HybridCharacterCreate /></PageWrapper></AuthGuard>} />
        <Route path="/viral-ideas" element={<AuthGuard><PageWrapper><ViralIdeasGenerator /></PageWrapper></AuthGuard>} />
        <Route path="/product-studio" element={<AuthGuard><PageWrapper><ProductStudio /></PageWrapper></AuthGuard>} />
        <Route path="/wallpapers" element={<AuthGuard><PageWrapper><WallpapersGenerator /></PageWrapper></AuthGuard>} />
        <Route path="/whatsapp-stickers" element={<AuthGuard><PageWrapper><WhatsAppStickers /></PageWrapper></AuthGuard>} />
        <Route path="/ad-campaign-studio" element={<AuthGuard><PageWrapper><AdCampaignStudio /></PageWrapper></AuthGuard>} />
        <Route path="/thumbnails/new" element={<AuthGuard><PageWrapper><ThumbnailCreate /></PageWrapper></AuthGuard>} />
        <Route path="/storyboards" element={<AuthGuard><PageWrapper><StoryboardList /></PageWrapper></AuthGuard>} />
        <Route path="/storyboards/new" element={<AuthGuard><PageWrapper><StoryboardCreate /></PageWrapper></AuthGuard>} />
        <Route path="/storyboards/:id" element={<AuthGuard><PageWrapper><StoryboardView /></PageWrapper></AuthGuard>} />
        <Route path="/gallery" element={<AuthGuard><PageWrapper><VideoGallery /></PageWrapper></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><PageWrapper><SettingsPage onLogout={logout} /></PageWrapper></AuthGuard>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminGuard><PageWrapper><AdminDashboard /></PageWrapper></AdminGuard>} />
        <Route path="/admin/tenants" element={<AdminGuard><PageWrapper><AdminTenantsPage /></PageWrapper></AdminGuard>} />
        <Route path="/admin/fal-settings" element={<AdminGuard><PageWrapper><AdminFalSettingsPage /></PageWrapper></AdminGuard>} />

        {/* Public / Auth Routes */}
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans relative">

      {/* Background Deep Space Magic */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      {/* Desktop Sidebar Navigation */}
      {user && (
        <aside className="hidden md:flex flex-col w-64 bg-card/40 backdrop-blur-2xl border-l border-white/5 shadow-2xl z-50">
          <div className="p-6 flex items-center justify-center border-b border-white/5">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary-foreground bg-clip-text text-transparent">StoryWeaver AI</h1>
          </div>
          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            <NavItem to="/" icon={HomeIcon} label="الرئيسية" />
            <NavItem to="/characters" icon={Users} label="الشخصيات" />
            <NavItem to="/storyboards" icon={Clapperboard} label="القصص" />
            <NavItem to="/gallery" icon={Film} label="المعرض" />
            {user?.role === 'admin' && (
              <NavItem to="/admin" icon={ShieldCheck} label="لوحة الإدارة" />
            )}
            <NavItem to="/settings" icon={Settings} label="الإعدادات" />
          </nav>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scroll-smooth">
        <AnimatedRoutes />
      </main>

      {/* Mobile Bottom Navigation - only show if user is logged in */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/60 backdrop-blur-2xl border-t border-white/5 shadow-[0_-2px_24px_rgba(0,0,0,0.2)] z-50">
          <div className={`grid h-full max-w-lg mx-auto ${user?.role === 'admin' ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <NavItem to="/" icon={HomeIcon} label="الرئيسية" />
            <NavItem to="/characters" icon={Users} label="الشخصيات" />
            <NavItem to="/storyboards" icon={Clapperboard} label="القصص" />
            <NavItem to="/gallery" icon={Film} label="المعرض" />
            {user?.role === 'admin' && (
              <NavItem to="/admin" icon={ShieldCheck} label="الإدارة" />
            )}
            <NavItem to="/settings" icon={Settings} label="الإعدادات" />
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
