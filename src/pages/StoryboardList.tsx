import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clapperboard } from 'lucide-react';
import { db, Storyboard } from '../lib/db';

export default function StoryboardList() {
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);

  useEffect(() => {
    loadStoryboards();
  }, []);

  async function loadStoryboards() {
    const items = await db.getAllStoryboards();
    setStoryboards(items.sort((a, b) => b.createdAt - a.createdAt));
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-24">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-foreground">القصص</h1>
        <Link 
          to="/storyboards/new" 
          className="w-9 h-9 bg-primary text-primary-foreground rounded-full shadow-md shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </header>

      <div className="space-y-3">
        {storyboards.map((story) => (
          <Link key={story.id} to={`/storyboards/${story.id}`} className="bg-card p-4 rounded-2xl border border-border/60 flex gap-4 block hover:border-primary/30 hover:shadow-md transition-all group">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary/30 flex-shrink-0 group-hover:bg-primary/15 transition-colors">
              <Clapperboard className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-card-foreground truncate text-sm">{story.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{story.script}</p>
              <div className="mt-2">
                <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                  {story.scenes.length} مشاهد
                </span>
              </div>
            </div>
          </Link>
        ))}
        
        {storyboards.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Clapperboard className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium text-sm">لا توجد قصص بعد</p>
            <p className="text-xs text-muted-foreground/60 mt-1">اضغط على + لإنشاء قصة جديدة</p>
          </div>
        )}
      </div>
    </div>
  );
}
