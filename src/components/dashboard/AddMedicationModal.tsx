import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Pill, Plus, X } from 'lucide-react';
import { Medication } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { generateUUID } from '../../lib/uuid';
import { localTimestamp } from '../../lib/datetime';

const ScrollPicker = ({ items, value, onChange, width = 'w-14' }: { items: string[], value: string, onChange: (val: string) => void, width?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    if (isScrolling.current) return;
    const index = items.indexOf(value);
    if (index !== -1 && containerRef.current) {
      containerRef.current.scrollTo({ top: index * 40, behavior: 'auto' });
    }
  }, [value, items]);

  const handleScroll = () => {
    isScrolling.current = true;
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / 40);
    const validIndex = Math.max(0, Math.min(items.length - 1, index));
    if (items[validIndex] !== value) {
      onChange(items[validIndex]);
    }
    
    const div = containerRef.current;
    clearTimeout((div as any).scrollTimeout);
    (div as any).scrollTimeout = setTimeout(() => {
      isScrolling.current = false;
    }, 150);
  };

  return (
    <div className={`relative h-[120px] ${width} overflow-hidden border border-slate-700/50 rounded-xl bg-slate-900 group`}>
      <div className="absolute top-1/2 left-0 right-0 h-[40px] -translate-y-1/2 bg-emerald-500/10 pointer-events-none border-y border-emerald-500/20" />
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory select-none no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="h-[40px]" />
        {items.map((item) => (
           <div 
             key={item}
             className={`h-[40px] flex items-center justify-center snap-center text-sm font-bold transition-all ${item === value ? 'text-emerald-400 scale-110' : 'text-slate-500 opacity-50'}`}
           >
             {item}
           </div>
        ))}
        <div className="h-[40px]" />
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

interface AddMedicationModalProps {
  onClose: () => void;
  onSave: (medication: Medication) => void;
}

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({ onClose, onSave }) => {
  const [currentMedName, setCurrentMedName] = useState<string>('');
  const [currentMedDosage, setCurrentMedDosage] = useState<string>('');
  const [currentMedFreq, setCurrentMedFreq] = useState<string>('مرة يومياً');
  const [method, setMethod] = useState<'preset' | 'custom'>('preset');
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['Breakfast']);
  const [customTimes, setCustomTimes] = useState<{hour: string, minute: string, period: 'AM'|'PM'}[]>([
    { hour: '08', minute: '00', period: 'AM' }
  ]);

  useEffect(() => {
    let count = 1;
    if (currentMedFreq.includes('مرتين')) count = 2;
    else if (currentMedFreq.includes('ثلاث')) count = 3;
    
    setCustomTimes(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        const newTimes = [...prev];
        while (newTimes.length < count) {
          newTimes.push({ hour: '08', minute: '00', period: 'AM' });
        }
        return newTimes;
      } else {
        return prev.slice(0, count);
      }
    });
  }, [currentMedFreq]);

  const toggleSlotSelection = useCallback((slot: string) => {
    setMethod('preset');
    setSelectedSlots(prev => {
      if (prev.includes(slot)) {
        if (prev.length > 1) {
          return prev.filter(s => s !== slot);
        }
        return prev;
      } else {
        return [...prev, slot];
      }
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!currentMedName.trim()) return;
    
    let finalSlots: string[] = [];
    if (method === 'preset') {
      if (selectedSlots.length === 0) return;
      finalSlots = selectedSlots;
    } else {
      finalSlots = customTimes.map(ct => `${ct.hour}:${ct.minute} ${ct.period}`);
    }

    const newMed: Medication = {
      id: generateUUID(),
      name: currentMedName.trim(),
      dosage: currentMedDosage.trim() || 'طبيعي',
      frequency: currentMedFreq,
      timeSlots: finalSlots,
      updatedAt: localTimestamp(),
    };
    onSave(newMed);
  }, [currentMedName, currentMedDosage, currentMedFreq, method, selectedSlots, customTimes, onSave]);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer animate-none"
        style={{ willChange: 'opacity' }}
      />

      <motion.div
        initial={{ scale: 0.96, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 12, opacity: 0 }}
        transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
        style={{ willChange: 'transform, opacity' }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative flex flex-col max-h-[90vh] z-10"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-slate-800/80 text-slate-400 hover:text-slate-200 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4 shrink-0">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Pill className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">إضافة دواء جديد</h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 no-scrollbar">
          <Input
            label="اسم الدواء"
            type="text"
            value={currentMedName}
            onChange={(e) => setCurrentMedName(e.target.value)}
            placeholder="مثال: مميع، أنسولين لانتوس، ميتفورمين"
          />
          
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الجرعة (عيار)"
              type="text"
              value={currentMedDosage}
              onChange={(e) => setCurrentMedDosage(e.target.value)}
              placeholder="مثال: 500 ملغ"
            />
            <Input
              label="التكرار"
              as="select"
              value={currentMedFreq}
              onChange={(e: any) => setCurrentMedFreq(e.target.value)}
            >
              <option value="مرة يومياً">مرة يومياً</option>
              <option value="مرتين يومياً">مرتين يومياً</option>
              <option value="ثلاث مرات">ثلاث مرات يومياً</option>
              <option value="عند اللزوم">عند اللزوم</option>
            </Input>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">مواعيد أخذ الجرعة (اختر طريقة واحدة)</label>
            
            {/* Preset Method */}
            <div 
              className={`p-3 rounded-xl border transition-all mb-3 ${method === 'preset' ? 'bg-slate-900 border-emerald-500/50' : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-100 cursor-pointer'}`}
              onClick={() => { if (method !== 'preset') setMethod('preset'); }}
            >
              <div className="text-[10px] text-slate-400 mb-2 flex justify-between items-center">
                <span>1. أوقات الوجبات</span>
                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${method === 'preset' ? 'border-emerald-500' : 'border-slate-600'}`}>
                  {method === 'preset' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Breakfast', 'Lunch', 'Dinner', 'Bedtime'].map((slot) => {
                  const translateMap: Record<string, string> = {
                    Breakfast: 'الفطور',
                    Lunch: 'الغداء',
                    Dinner: 'العشاء',
                    Bedtime: 'قبل النوم',
                  };
                  const isSelected = method === 'preset' && selectedSlots.includes(slot);
                  return (
                    <Button
                      key={slot}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSlotSelection(slot);
                      }}
                      variant={isSelected ? 'emerald' : 'slate'}
                      size="sm"
                      className="flex-1 text-center py-2.5 rounded-xl text-xs"
                    >
                      {translateMap[slot]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Custom Time Method */}
            <div 
              className={`p-3 rounded-xl border transition-all ${method === 'custom' ? 'bg-slate-900 border-emerald-500/50' : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-100 cursor-pointer'}`}
              onClick={() => { if (method !== 'custom') setMethod('custom'); }}
            >
              <div className="text-[10px] text-slate-400 mb-2 flex justify-between items-center">
                <span>2. تحديد وقت دقيق</span>
                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${method === 'custom' ? 'border-emerald-500' : 'border-slate-600'}`}>
                  {method === 'custom' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                </div>
              </div>
              
              <div className="space-y-3 mt-2">
                {customTimes.map((ct, idx) => (
                  <div key={idx} className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-bold text-emerald-400">
                        {idx === 0 ? 'الجرعة الأولى' : idx === 1 ? 'الجرعة الثانية' : 'الجرعة الثالثة'}
                      </span>
                    </div>
                    <div dir="ltr" className="flex items-center justify-center gap-2 p-1 bg-slate-900/40 rounded-xl border border-slate-800/40">
                      <ScrollPicker
                        items={Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))}
                        value={ct.hour}
                        onChange={(val) => {
                          setMethod('custom');
                          const cloned = [...customTimes];
                          cloned[idx].hour = val;
                          setCustomTimes(cloned);
                        }}
                      />
                      <span className="text-slate-400 font-bold mb-1">:</span>
                      <ScrollPicker
                        items={Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))}
                        value={ct.minute}
                        onChange={(val) => {
                          setMethod('custom');
                          const cloned = [...customTimes];
                          cloned[idx].minute = val;
                          setCustomTimes(cloned);
                        }}
                      />
                      <div className="w-2" />
                      <ScrollPicker
                        items={['AM', 'PM']}
                        value={ct.period}
                        width="w-16"
                        onChange={(val) => {
                          setMethod('custom');
                          const cloned = [...customTimes];
                          cloned[idx].period = val as 'AM' | 'PM';
                          setCustomTimes(cloned);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 shrink-0 border-t border-slate-800/60 mt-auto">
          <Button
            onClick={handleSave}
            disabled={!currentMedName.trim() || (method === 'preset' && selectedSlots.length === 0)}
            fullWidth
            leftIcon={<Plus className="w-4 h-4 text-slate-505" />}
          >
            حفظ الدواء بالملف
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
