import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Info, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { GlucoseReading } from '../../types';

interface ExtendedGlucoseModalProps {
  onClose: () => void;
}

type PeriodFilter = '24h' | '7d' | '30d' | 'all';
type StatusFilter = 'all' | 'low' | 'normal' | 'high';
type RelationFilter = 'all' | 'fasting' | 'before-meal' | 'post-meal' | 'bedtime' | 'random';

export const ExtendedGlucoseModal: React.FC<ExtendedGlucoseModalProps> = ({ onClose }) => {
  const glucoseReadings = useAppStore((state) => state.healthData.glucoseReadings);
  const deleteGlucoseReading = useAppStore((state) => state.deleteGlucoseReading);

  // Filter States
  const [period, setPeriod] = useState<PeriodFilter>('7d');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [relation, setRelation] = useState<RelationFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  // Track if deletion requires confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper Translate Function for rendering
  const translateRelation = (rel: string) => {
    const mappings: Record<string, string> = {
      fasting: 'صائم',
      'before-meal': 'قبل الوجبة',
      'post-meal': 'بعد الوجبة',
      bedtime: 'قبل النوم',
      random: 'قراءة عشوائية',
    };
    return mappings[rel] || rel;
  };

  // Helper Translate status
  const translateStatus = (stat: string) => {
    const mappings: Record<string, string> = {
      low: 'منخفض ⚠️',
      normal: 'طبيعي ✓',
      high: 'مرتفع ⚠️',
    };
    return mappings[stat] || stat;
  };

  // 1. First Pass Filter: Match Period (Time Scoping)
  const scopedReadings = useMemo(() => {
    const now = new Date();
    return glucoseReadings.filter((reading) => {
      const loggedDate = new Date(reading.loggedAt);
      const diffMs = now.getTime() - loggedDate.getTime();
      
      if (period === '24h') {
        return diffMs <= 24 * 60 * 60 * 1000;
      } else if (period === '7d') {
        return diffMs <= 7 * 24 * 60 * 60 * 1000;
      } else if (period === '30d') {
        return diffMs <= 30 * 24 * 60 * 60 * 1000;
      }
      return true; // 'all'
    });
  }, [glucoseReadings, period]);

  // 2. Second Pass Filter: Match Table Specific Filters (Status, Relation, Search query)
  const filteredReadings = useMemo(() => {
    return scopedReadings.filter((reading) => {
      // Filter by Status
      if (status !== 'all' && reading.status !== status) return false;
      
      // Filter by Relation
      if (relation !== 'all' && reading.mealRelation !== relation) return false;
      
      // Filter by Search Query (Notes or value)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const valueMatch = reading.value.toString().includes(query);
        const noteMatch = reading.notes?.toLowerCase().includes(query);
        const relationMatch = translateRelation(reading.mealRelation).toLowerCase().includes(query);
        if (!valueMatch && !noteMatch && !relationMatch) return false;
      }
      
      return true;
    });
  }, [scopedReadings, status, relation, searchQuery]);

  // 3. Compute Stats purely of the currently scoped period (Isolated Metrics)
  const stats = useMemo(() => {
    if (scopedReadings.length === 0) {
      return { avg: 0, min: 0, max: 0, lowCount: 0, normalCount: 0, highCount: 0 };
    }
    const values = scopedReadings.map((r) => r.value);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = Math.round(sum / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    let lowCount = 0;
    let normalCount = 0;
    let highCount = 0;
    scopedReadings.forEach((r) => {
      if (r.status === 'low') lowCount++;
      else if (r.status === 'high') highCount++;
      else normalCount++;
    });

    return { avg, min, max, lowCount, normalCount, highCount };
  }, [scopedReadings]);

  // 4. Downsampled Chart Data (Zero-Overhead processing)
  // If we have let's say 100 readings, we slice them into max 12 groups to keep the SVG smooth
  const downsampledChartData = useMemo(() => {
    if (scopedReadings.length === 0) return [];
    
    // We want data chronologically sorted (oldest first for line graph representation)
    const chronological = [...scopedReadings].sort((a, b) => {
      return new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime();
    });

    const maxChartPoints = 12;
    if (chronological.length <= maxChartPoints) {
      return chronological.map((r) => ({
        val: r.value,
        status: r.status,
        label: new Date(r.loggedAt).toLocaleDateString('ar-SY', { month: 'numeric', day: 'numeric' }) + 
               ' ' + new Date(r.loggedAt).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
      }));
    }

    // Downsampling logic: bucket actual data into 12 chunks
    const result: Array<{ val: number; status: string; label: string }> = [];
    const chunkSize = chronological.length / maxChartPoints;

    for (let i = 0; i < maxChartPoints; i++) {
      const startIndex = Math.floor(i * chunkSize);
      const endIndex = Math.floor((i + 1) * chunkSize);
      const chunk = chronological.slice(startIndex, endIndex);

      if (chunk.length === 0) continue;

      // Calculate localized average
      const chunkSum = chunk.reduce((acc, c) => acc + c.value, 0);
      const chunkAvg = Math.round(chunkSum / chunk.length);

      // Choose middle point to represent the date/label
      const rep = chunk[Math.floor(chunk.length / 2)];
      result.push({
        val: chunkAvg,
        status: rep.status,
        label: new Date(rep.loggedAt).toLocaleDateString('ar-SY', { month: 'numeric', day: 'numeric' }) + 
               ' ' + new Date(rep.loggedAt).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
      });
    }

    return result;
  }, [scopedReadings]);

  // Math dimensions for the SVG Line Graph (Scale Adaptable coordinates)
  const chartWidth = 520;
  const chartHeight = 160;
  const paddingX = 45;
  const paddingY = 25;

  const svgCoords = useMemo(() => {
    if (downsampledChartData.length === 0) return [];

    const vals = downsampledChartData.map((d) => d.val);
    const minVal = Math.max(Math.min(...vals, 60) - 10, 40);
    const maxVal = Math.max(...vals, 180) + 12;
    const diffVal = maxVal - minVal || 40;

    return downsampledChartData.map((d, index) => {
      // Even division space
      const x = paddingX + (index / (downsampledChartData.length - 1 || 1)) * (chartWidth - paddingX * 2);
      
      // Inverse projection ratio
      const ratio = (d.val - minVal) / diffVal;
      const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);

      return { x, y, val: d.val, label: d.label, status: d.status };
    });
  }, [downsampledChartData]);

  // SVG spline paths creator
  const splinePath = useMemo(() => {
    if (svgCoords.length === 0) return '';
    let pathD = `M ${svgCoords[0].x} ${svgCoords[0].y}`;
    for (let i = 1; i < svgCoords.length; i++) {
      const p0 = svgCoords[i - 1];
      const p1 = svgCoords[i];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return pathD;
  }, [svgCoords]);

  // Table Pagination indexes
  const totalPages = Math.ceil(filteredReadings.length / itemsPerPage) || 1;
  const paginatedReadings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReadings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReadings, currentPage]);

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    } else if (direction === 'prev' && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleDelete = useCallback((id: string) => {
    deleteGlucoseReading(id);
    setDeleteConfirmId(null);
    // Reset page index if current page is empty after deletions
    if ((filteredReadings.length - 1) <= (currentPage - 1) * itemsPerPage && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [deleteGlucoseReading, filteredReadings, currentPage]);

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4" dir="rtl">
      <motion.div 
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.8 }}
        transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
        style={{ willChange: 'transform, opacity' }}
        className="w-full max-w-2xl mx-auto bg-slate-900 border-t sm:border border-slate-800 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
      >
        {/* Header toolbar */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>المخطط الإحصائي وسجل السكر المفصل</span>
                <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-slate-400">تحليل فائق السرعة وخوارزمية عزل الأداء لبياناتك</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-950/50 hover:bg-slate-950 flex items-center justify-center border border-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Core */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-0 text-right select-none">
          
          {/* Quick period switches */}
          <div className="flex items-center gap-1.5 justify-start bg-slate-950/50 p-1 rounded-2xl border border-slate-800/80 w-fit shrink-0">
            {(['24h', '7d', '30d', 'all'] as PeriodFilter[]).map((p) => {
              const labelMap = { '24h': 'آخر ٢٤ ساعة', '7d': 'آخر ٧ أيام', '30d': 'آخر ٣٠ يوم', 'all': 'كل السجل' };
              const isActive = period === p;
              return (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                    isActive 
                      ? 'bg-sky-500/15 border border-sky-500/30 text-sky-400' 
                      : 'text-slate-400 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  {labelMap[p]}
                </button>
              );
            })}
          </div>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-950/30 rounded-2xl border border-slate-800/60 flex flex-col justify-center items-center text-center">
              <span className="text-[9px] text-slate-400 font-bold mb-1">المعدل العام لقراءاتك</span>
              <span className="text-xl font-sans font-black text-sky-400">{stats.avg ? `${stats.avg}` : '--'}</span>
              <span className="text-[8px] text-slate-500">ملغ/ديسيلتر</span>
            </div>
            <div className="p-3 bg-slate-950/30 rounded-2xl border border-slate-800/60 flex flex-col justify-center items-center text-center">
              <span className="text-[9px] text-slate-400 font-bold mb-1">القراءة الأعلى</span>
              <span className="text-xl font-sans font-black text-rose-400">{stats.max ? `${stats.max}` : '--'}</span>
              <span className="text-[8px] text-slate-500 font-sans text-rose-500/80">
                {stats.highCount > 0 ? `تجاوز مرتفع ${stats.highCount}س` : 'مستقر'}
              </span>
            </div>
            <div className="p-3 bg-slate-950/30 rounded-2xl border border-slate-800/60 flex flex-col justify-center items-center text-center">
              <span className="text-[9px] text-slate-400 font-bold mb-1">القراءة الأدنى</span>
              <span className="text-xl font-sans font-black text-emerald-400">{stats.min ? `${stats.min}` : '--'}</span>
              <span className="text-[8px] text-slate-500 font-sans text-emerald-500/80">
                {stats.lowCount > 0 ? `هبوط مكرر ${stats.lowCount}س` : 'طبيعي'}
              </span>
            </div>
          </div>

          {/* Render Vector Graph Section with scale control and downsampling indicator */}
          <div className="bg-slate-950/60 rounded-[28px] p-4 border border-slate-800/80 relative flex flex-col space-y-1 overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-slate-900/60 text-[10px] select-none">
              <div className="flex items-center gap-1 text-slate-400 font-semibold">
                <Info className="w-3 h-3 text-sky-400 shrink-0" />
                <span>مخطط تقلبات سكر الدم</span>
              </div>
              {glucoseReadings.length > 12 && (
                <span className="text-[9px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ⚡ خوارزمية تخفيض العينات نشطة
                </span>
              )}
            </div>

            {svgCoords.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center text-center text-slate-500">
                <Calendar className="w-8 h-8 text-slate-600 mb-2 animate-bounce" />
                <span className="text-[10px] font-bold">لا تتوفر قراءات كافية في هذه الفترة لرسم المخطط</span>
              </div>
            ) : (
              <div className="relative w-full overflow-x-auto overflow-hidden">
                <svg className="w-full min-w-[500px] h-40 overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="extChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="extLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline target brackets (70, 130) */}
                  <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                  <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.03)" />
                  <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.03)" />

                  {/* Path underlay */}
                  <path 
                    d={`${splinePath} L ${svgCoords[svgCoords.length - 1].x} ${chartHeight - paddingY} L ${svgCoords[0].x} ${chartHeight - paddingY} Z`}
                    fill="url(#extChartGradient)"
                  />

                  {/* Curve spline */}
                  <path 
                    d={splinePath}
                    fill="none"
                    stroke="url(#extLineGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Data Point elements */}
                  {svgCoords.map((pt, index) => {
                    const isHigh = pt.val > 140;
                    const isLow = pt.val < 70;
                    const ringColor = isHigh ? '#f43f5e' : isLow ? '#f59e0b' : '#10b981';

                    return (
                      <g key={index} className="group cursor-pointer">
                        <circle 
                          cx={pt.x} 
                          cy={pt.y} 
                          r="5.5" 
                          fill="#0f172a" 
                          stroke={ringColor} 
                          strokeWidth="2.5" 
                          className="transition-transform group-hover:scale-125"
                        />
                        {/* Interactive mini card hover overlay or absolute labels */}
                        <text
                          x={pt.x}
                          y={pt.y - 12}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="800"
                          className="font-mono bg-slate-950/80 px-1 py-0.5 rounded pointer-events-none drop-shadow-md text-shadow"
                        >
                          {pt.val}
                        </text>
                        {/* Dynamic timeline label at bottom axes */}
                        {index % 2 === 0 && (
                          <text
                            x={pt.x}
                            y={chartHeight - 4}
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="8"
                            fontWeight="600"
                            className="font-sans pointer-events-none"
                          >
                            {pt.label.split(' ')[0]}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Interactive Logs Filtering Section */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
              <span className="text-[11px] font-black text-slate-300">سجل القراءات وتصفية النتائج</span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44 select-none">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="بحث في القراءات..."
                    className="w-full pl-2 pr-8 py-1.5 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-200 text-xs focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                {/* Status Dropdowns Filter */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                    <Filter className="w-2.5 h-2.5" />
                    الترتيب:
                  </span>
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as StatusFilter); setCurrentPage(1); }}
                    className="bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 font-black rounded-xl p-1.5 focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="normal">طبيعي</option>
                    <option value="high">مرتفع</option>
                    <option value="low">منخفض</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logs Table Layout with local isolation */}
            <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col min-h-[300px]">
              {paginatedReadings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center select-none">
                  <Calendar className="w-10 h-10 text-slate-700 mb-2 stroke-[1.5]" />
                  <span className="text-xs font-bold text-slate-400">لا توجد قراءات مطابقة لبحثك في هذه المدة</span>
                  <p className="text-[9px] text-slate-500 max-w-xs mt-1">تأكد من ضبط محركات البحث أو تصفية الحالات للحصول على القراءات المطلوبة.</p>
                </div>
              ) : (
                <div className="flex-1 divide-y divide-slate-900/60 flex flex-col pl-1">
                  {paginatedReadings.map((reading) => {
                    const isDeleting = deleteConfirmId === reading.id;
                    const isLow = reading.status === 'low';
                    const isHigh = reading.status === 'high';
                    
                    return (
                      <div 
                        key={reading.id} 
                        className={`p-3.5 flex items-center justify-between transition-colors ${
                          isLow ? 'hover:bg-rose-500/[0.01]' : isHigh ? 'hover:bg-amber-500/[0.01]' : 'hover:bg-slate-800/25'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Value Tag Badge circle with visual status */}
                          <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-sans shrink-0 border ${
                            isLow 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : isHigh 
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            <span className="text-sm font-black leading-none">{reading.value}</span>
                            <span className="text-[7.5px] font-medium leading-none mt-0.5">mg/dL</span>
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Headline: Meal info and timestamp */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black text-slate-200">
                                {translateRelation(reading.mealRelation)}
                              </span>
                              <span className="text-[8px] font-medium text-slate-500 font-mono">
                                {new Date(reading.loggedAt).toLocaleDateString('ar-SY', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                {' '}
                                {new Date(reading.loggedAt).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Note if vorhanden */}
                            {reading.notes ? (
                              <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5 border-r-2 border-slate-800 pr-1.5 max-w-[280px]">
                                {reading.notes}
                              </p>
                            ) : (
                              <span className="text-[8px] text-slate-600 font-medium block mt-0.5">بدون ملاحظات إضافية</span>
                            )}
                          </div>
                        </div>

                        {/* Badges and Delete button panel with confirmation states */}
                        <div className="flex items-center gap-2 pr-1.5 shrink-0">
                          {/* Status Badge */}
                          <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-xl border select-none ${
                            isLow 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : isHigh 
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {translateStatus(reading.status)}
                          </span>

                          {/* Delete operation controls */}
                          {isDeleting ? (
                            <div className="flex items-center gap-1 overflow-hidden transition-all">
                              <button
                                onClick={() => handleDelete(reading.id)}
                                className="px-2 py-1 bg-rose-500 text-white rounded-lg text-[8.5px] font-black active:scale-95"
                              >
                                نعم
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg text-[8.5px] font-black"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(reading.id)}
                              className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 hover:text-rose-400 hover:border-rose-500/25 text-slate-500 transition-all flex items-center justify-center active:scale-90"
                              title="حذف هذه القراءة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table pagination navigation actions */}
              {totalPages > 1 && (
                <div className="p-2.5 bg-slate-950/60 border-t border-slate-900 flex justify-between items-center select-none text-[10px]">
                  <button
                    onClick={() => handlePageChange('next')}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-400 font-bold transition-all hover:bg-slate-900/60 disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>السابق</span>
                  </button>

                  <span className="text-slate-500 font-mono font-medium">
                    الصفحة <strong className="text-slate-300">{currentPage}</strong> من <strong className="text-slate-300">{totalPages}</strong>
                  </span>

                  <button
                    onClick={() => handlePageChange('prev')}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-400 font-bold transition-all hover:bg-slate-900/60 disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="pt-2.5 border-t border-slate-800/80 shrink-0 text-center select-none text-[10px] text-slate-500">
          دائماً حافظ على معدل تتبع دوري متطابق. لمشاركتها مع طبيبك، يمكنك أخذ لقطة شاشة للصفحة.
        </div>
      </motion.div>
    </div>
  );
};
