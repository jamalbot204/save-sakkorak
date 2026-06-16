import React, { useState, useCallback } from 'react';
import { BriefcaseMedical, Plus, Trash2 } from 'lucide-react';
import { Medication } from '../../types';
import { generateUUID } from '../../lib/uuid';
import { localTimestamp } from '../../lib/datetime';

interface MedicationsStepProps {
  medications: Medication[];
  onAddMedication: (medication: Medication) => void;
  onRemoveMedication: (id: string) => void;
}

export const MedicationsStep = React.memo(({ medications, onAddMedication, onRemoveMedication }: MedicationsStepProps) => {
  const [currentMedName, setCurrentMedName] = useState<string>('');
  const [currentMedDosage, setCurrentMedDosage] = useState<string>('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['Breakfast']);

  const toggleSlotSelection = useCallback((slot: string) => {
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

  const arabicFreqLabels: Record<number, string> = {
    1: 'مرة يومياً',
    2: 'مرتين يومياً',
    3: 'ثلاث مرات يومياً',
    4: 'أربع مرات يومياً',
  };
  const frequencyPreview = arabicFreqLabels[selectedSlots.length] || `${selectedSlots.length} مرات يومياً`;

  const handleAdd = useCallback(() => {
    if (!currentMedName.trim()) return;
    const computedFrequency = arabicFreqLabels[selectedSlots.length] || `${selectedSlots.length} مرات يومياً`;
    const newMed: Medication = {
      id: generateUUID(),
      name: currentMedName,
      dosage: currentMedDosage || 'طبيعي',
      frequency: computedFrequency,
      timeSlots: selectedSlots,
      updatedAt: localTimestamp(),
    };
    onAddMedication(newMed);
    setCurrentMedName('');
    setCurrentMedDosage('');
  }, [currentMedName, currentMedDosage, selectedSlots, onAddMedication]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2 mb-1 select-none">
        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
          <BriefcaseMedical className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-200">الأدوية والجرعات الحالية</h2>
      </div>
      
      {/* Form Input Container */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">اسم الدواء</label>
          <input 
            type="text"
            value={currentMedName}
            onChange={(e) => setCurrentMedName(e.target.value)}
            placeholder="مثال: مميع، أنسولين لانتوس، ميتفورمين"
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 font-medium"
          />
        </div>
        
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5">الجرعة (عيار)</label>
          <input 
            type="text"
            value={currentMedDosage}
            onChange={(e) => setCurrentMedDosage(e.target.value)}
            placeholder="مثال: 500 ملغ، 15 وحدة"
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 font-medium"
          />
        </div>

        {/* Timing slots selectors for medication */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1.5">مواعيد أخذ الجرعة</label>
          <div className="flex flex-wrap gap-2">
            {['Breakfast', 'Lunch', 'Dinner', 'Bedtime'].map((slot) => {
              const translateMap: Record<string, string> = {
                Breakfast: 'الفطور',
                Lunch: 'الغداء',
                Dinner: 'العشاء',
                Bedtime: 'قبل النوم',
              };
              const isSelected = selectedSlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleSlotSelection(slot)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all active:scale-95 ${
                    isSelected 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800/80'
                  }`}
                >
                  {translateMap[slot]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live frequency preview */}
        <div className="px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
          <span className="text-[10px] font-bold text-slate-500">معدل أخذ الدواء الحالي:</span>
          <span className="text-xs font-extrabold text-emerald-400 mr-2">{frequencyPreview}</span>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة الدواء للملف</span>
        </button>
      </div>

      {/* Added Medications Scroll list */}
      {medications.length > 0 && (
        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase px-1">الأدوية المضافة ({medications.length})</div>
          {medications.map((med) => (
            <div key={med.id} className="flex justify-between items-center bg-slate-900/20 border border-slate-800/60 px-3 py-2.5 rounded-2xl">
              <div>
                <div className="text-xs font-bold text-slate-200">{med.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">الجرعة: {med.dosage} • {med.frequency}</div>
              </div>
              <button 
                onClick={() => onRemoveMedication(med.id)}
                className="p-1 px-2 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors active:scale-90"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
MedicationsStep.displayName = 'MedicationsStep';
