/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Lightbulb, Search, Bell } from 'lucide-react';
import tipsData from '../data/tips.json';
import { TipCard as TipCardType } from '../types';
import { TipsNotificationService } from '../services/TipsNotificationService';

const allTips: TipCardType[] = tipsData as TipCardType[];

const categoryColors: Record<string, string> = {
  'تغذية': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'نمط حياة': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'صحة نفسية': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'عناية بالقدمين': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'عناية يومية': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'معلومات طبية': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'أدوية وإنسولين': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'فكاهة': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

export const Tips: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(allTips.map((t) => t.category));
    return Array.from(cats);
  }, []);

  const filteredTips = useMemo(() => {
    let tips = allTips;
    if (activeCategory) {
      tips = tips.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      tips = tips.filter(
        (t) => t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q)
      );
    }
    return tips;
  }, [activeCategory, search]);

  const handleTestNotification = async () => {
    setTestLoading(true);
    setTestFeedback(null);
    try {
      await TipsNotificationService.scheduleTestTip(1);
      setTestFeedback('تم جدولة إشعار تجريبي خلال دقيقة واحدة ✅');
    } catch {
      setTestFeedback('فشل جدولة الإشعار التجريبي ❌');
    } finally {
      setTestLoading(false);
      setTimeout(() => setTestFeedback(null), 4000);
    }
  };

  return (
    <div className="flex-1 p-5 pb-8 space-y-5 flex flex-col justify-start overflow-hidden min-h-0">
      {/* Header */}
      <div className="text-right border-b border-slate-800 pb-3 shrink-0 select-none">
        <h1 className="text-base font-bold text-slate-100 font-sans">نصائح وتوعية</h1>
        <p className="text-[11px] text-slate-500 mt-0.5">معلومات ونصائح مفيدة لرحلتك مع السكري</p>
      </div>

      {/* Search */}
      <div className="relative shrink-0">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن نصيحة..."
          className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl py-2.5 pr-10 pl-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/40 transition-colors"
          dir="rtl"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 select-none no-scrollbar">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold border whitespace-nowrap transition-all active:scale-95 ${
            activeCategory === null
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-900/60 text-slate-400 border-slate-800'
          }`}
        >
          الكل
        </button>
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const colorClass = categoryColors[cat] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
          const [bg, text, border] = colorClass.split(' ');
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border whitespace-nowrap transition-all active:scale-95 ${
                isActive ? colorClass : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-0.5">
        {filteredTips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3 select-none">
            <Lightbulb className="w-10 h-10 text-slate-600" />
            <span className="text-xs font-bold">لا توجد نتائج مطابقة</span>
          </div>
        ) : (
          filteredTips.map((tip) => {
            const colorClass = categoryColors[tip.category] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            return (
              <div
                key={tip.id}
                className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 space-y-2.5 hover:border-slate-700/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${colorClass}`}>
                    {tip.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 leading-snug">{tip.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{tip.body}</p>
              </div>
            );
          })
        )}

        {/* Test notification button */}
        <div className="pt-2 pb-1">
          <button
            onClick={handleTestNotification}
            disabled={testLoading}
            className="w-full py-2.5 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Bell className={`w-3.5 h-3.5 ${testLoading ? 'animate-pulse' : ''}`} />
            <span>{testLoading ? 'جاري الجدولة...' : 'اختبار إشعار (دقيقة واحدة)'}</span>
          </button>
          {testFeedback && (
            <p className="text-center text-[10px] font-bold text-emerald-400 mt-2 animate-[fadeIn_0.2s_ease-out]">
              {testFeedback}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tips;
