import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pill, Plus, X, Calendar, Clock, CheckCircle2, ChevronRight, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Medication, MedicationLog } from '../../types';
import { AddMedicationModal } from './AddMedicationModal';
import { Button } from '../common/Button';

interface MedicationManagerModalProps {
  onClose: () => void;
  onSaveMedication: (medication: Medication) => Promise<void>;
  onDeleteMedication?: (medication: Medication) => Promise<void>;
}

// Arabic weekday translation helpers
const arabicWeekdays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Time parsing helper
function parseTime(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr) return null;
  const cleanStr = timeStr.trim().toUpperCase();
  const match = cleanStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) {
    const parts = cleanStr.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        return { hour: h % 24, minute: m % 60 };
      }
    }
    return null;
  }

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm) {
    if (ampm === 'PM' && hour < 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
  }

  return { hour, minute };
}


// Sub-component for performance-isolated live countdown
const CountdownTicker = React.memo<{ targetHour: number; targetMinute: number }>(
  ({ targetHour, targetMinute }) => {
    const [countdownText, setCountdownText] = useState<string>('');

    useEffect(() => {
      const calculateCountdown = () => {
        const target = new Date();
        target.setHours(targetHour, targetMinute, 0, 0);
        const diffMs = target.getTime() - Date.now();

        if (diffMs <= 0) {
          setCountdownText('حان الموعد الآن');
          return;
        }

        const totalSecs = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        if (hours > 0) {
          setCountdownText(`متبقي ${hours} ساعة و ${mins} دقيقة`);
        } else if (mins > 0) {
          setCountdownText(`متبقي ${mins} دقيقة و ${secs} ثانية`);
        } else {
          setCountdownText(`متبقي ${secs} ثانية فقط`);
        }
      };

      calculateCountdown();
      const interval = setInterval(calculateCountdown, 1000);
      return () => clearInterval(interval);
    }, [targetHour, targetMinute]);

    return (
      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl select-none">
        {countdownText}
      </span>
    );
  }
);
CountdownTicker.displayName = 'CountdownTicker';

// Sub-component for performance-isolated relative status badge
const MedicationStatusBadge = React.memo<{
  targetHour: number;
  targetMinute: number;
  selectedDate: string;
  isLogged: boolean;
}>(({ targetHour, targetMinute, selectedDate, isLogged }) => {
  const [statusElement, setStatusElement] = useState<React.ReactNode>(null);

  useEffect(() => {
    if (isLogged) {
      setStatusElement(
        <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl">
          تمت الجرعة
        </span>
      );
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (selectedDate !== todayStr) {
      setStatusElement(
        <span className="text-[9px] font-extrabold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
          مجدول
        </span>
      );
      return;
    }

    const updateStatus = () => {
      const now = new Date();
      const schedDate = new Date();
      schedDate.setHours(targetHour, targetMinute, 0, 0);
      const relativeMs = schedDate.getTime() - now.getTime();

      if (relativeMs < 0) {
        setStatusElement(
          <span className="text-[9px] font-extrabold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-xl flex items-center gap-1 select-none">
            <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
            <span>مضى وقتها</span>
          </span>
        );
      } else {
        const totalMinutes = Math.floor(relativeMs / 60000);
        const offsetHrs = Math.floor(totalMinutes / 60);
        const offsetMins = totalMinutes % 60;
        setStatusElement(
          <span className="text-[9px] font-extrabold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
            {offsetHrs > 0 ? `بعد ${offsetHrs}س و ${offsetMins}د` : `بعد ${offsetMins} دقيقة`}
          </span>
        );
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, [targetHour, targetMinute, selectedDate, isLogged]);

  return statusElement;
});
MedicationStatusBadge.displayName = 'MedicationStatusBadge';

export const MedicationManagerModal: React.FC<MedicationManagerModalProps> = ({ onClose, onSaveMedication, onDeleteMedication }) => {
  const userProfile = useAppStore((state) => state.userProfile);
  const healthData = useAppStore((state) => state.healthData);
  const toggleMedicationLog = useAppStore((state) => state.toggleMedicationLog);

  const [showAddInModal, setShowAddInModal] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toLocaleDateString('en-CA'));
  const [confirmDeleteData, setConfirmDeleteData] = useState<Medication | null>(null);
  const [confirmUntickData, setConfirmUntickData] = useState<{
    medId: string;
    medName: string;
    dosage: string;
    slot: string;
  } | null>(null);


  // Generate 7 days of the current week surrounding today (3 days ago, today, 3 days ahead)
  const surroundingDays = useMemo(() => {
    const list = [];
    const todayObj = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(todayObj.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      list.push({
        dateStr,
        dayNum: d.getDate(),
        weekdayLabel: arabicWeekdays[d.getDay()],
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  const slotTranslation: Record<string, string> = {
    Breakfast: 'الفطور',
    Lunch: 'الغداء',
    Dinner: 'العشاء',
    Bedtime: 'قبل النوم',
  };

  const getSlotTimeStr = useCallback((slot: string) => {
    if (userProfile?.medicationTimes && (userProfile.medicationTimes as any)[slot]) {
      return (userProfile.medicationTimes as any)[slot];
    }
    return slot; // fallback if exact hour AM/PM is directly inside slot
  }, [userProfile]);

  // Construct structured day schedules for medications
  const medicationsList = useMemo(() => {
    const meds = healthData.medications || [];
    const result: Array<{
      id: string;
      medication: Medication;
      slot: string;
      displaySlot: string;
      timeStr: string;
      parsedTime: { hour: number; minute: number } | null;
      isLogged: boolean;
      loggedAt?: string;
    }> = [];

    meds.forEach((med) => {
      const slots = med.timeSlots || [];
      slots.forEach((slot) => {
        const isLogged = healthData.medicationLogs.some(
          (log) =>
            log.medicationId === med.id &&
            log.timeSlot === slot &&
            log.loggedAt.startsWith(selectedDate)
        );
        
        const matchingLog = healthData.medicationLogs.find(
          (log) =>
            log.medicationId === med.id &&
            log.timeSlot === slot &&
            log.loggedAt.startsWith(selectedDate)
        );

        const timeStr = getSlotTimeStr(slot);

        result.push({
          id: `${med.id}_${slot}`,
          medication: med,
          slot,
          displaySlot: slotTranslation[slot] || slot,
          timeStr,
          parsedTime: parseTime(timeStr),
          isLogged,
          loggedAt: matchingLog?.loggedAt,
        });
      });
    });

    // Sort medicines chronologically for the selected day
    return result.sort((a, b) => {
      const tA = a.parsedTime ? a.parsedTime.hour * 60 + a.parsedTime.minute : 9999;
      const tB = b.parsedTime ? b.parsedTime.hour * 60 + b.parsedTime.minute : 9999;
      return tA - tB;
    });
  }, [healthData, selectedDate, getSlotTimeStr]);

  // Find closer/next medication relative to the current render period
  const nearestMedication = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (selectedDate !== todayStr) return null;

    let closest = null;
    let minDiffMs = Infinity;
    const renderNow = new Date();

    medicationsList.forEach((item) => {
      if (item.isLogged || !item.parsedTime) return;

      const scheduleDate = new Date(renderNow);
      scheduleDate.setHours(item.parsedTime.hour, item.parsedTime.minute, 0, 0);

      const diffMs = scheduleDate.getTime() - renderNow.getTime();
      
      // Look for the upcoming medication with the shortest future interval
      if (diffMs > 0 && diffMs < minDiffMs) {
        minDiffMs = diffMs;
        closest = item;
      }
    });

    return closest;
  }, [medicationsList, selectedDate]);

  const handleToggleMed = useCallback(async (medId: string, medName: string, dosage: string, slot: string) => {
    toggleMedicationLog(medId, medName, dosage, slot, selectedDate);

    // Call triggers to schedule or clear corresponding native notifications
    try {
      const { NotificationService } = await import('../../services/NotificationService');
      await NotificationService.scheduleMedicationReminders();
    } catch (e) {
      console.error('[MedicationManager] Notification rescheduled warning:', e);
    }
  }, [toggleMedicationLog, selectedDate]);

  const handleConfirmUntick = useCallback(async () => {
    if (!confirmUntickData) return;
    toggleMedicationLog(confirmUntickData.medId, confirmUntickData.medName, confirmUntickData.dosage, confirmUntickData.slot, selectedDate);
    setConfirmUntickData(null);
    try {
      const { NotificationService } = await import('../../services/NotificationService');
      await NotificationService.scheduleMedicationReminders();
    } catch (e) {
      console.error('[MedicationManager] Notification rescheduled warning:', e);
    }
  }, [confirmUntickData, toggleMedicationLog, selectedDate]);

  const handleSaveMed = useCallback(async (newMed: Medication) => {
    await onSaveMedication(newMed);
    setShowAddInModal(false);
  }, [onSaveMedication]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteData || !onDeleteMedication) return;
    await onDeleteMedication(confirmDeleteData);
    setConfirmDeleteData(null);
  }, [confirmDeleteData, onDeleteMedication]);

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-5" dir="rtl">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
        style={{ willChange: 'transform' }}
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Pill className="w-5.5 h-5.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100">متابعة وجدولة الأدوية</h2>
              <span className="text-[10px] text-slate-500 font-bold block mt-0.5">جدول ومواعيد الأدوية اليومية</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-full transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Horizontal Weekday Bar */}
        <div className="py-3 bg-slate-950/30 border-b border-slate-800/40 px-1 shrink-0">
          <div className="flex justify-between items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            {surroundingDays.map((day) => {
              const isSelected = selectedDate === day.dateStr;
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`flex-1 min-w-[54px] py-2 px-1.5 rounded-2xl flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-900 hover:border-slate-800'
                  }`}
                >
                  <span className={`text-[9px] font-bold ${isSelected ? 'text-slate-950 opacity-90' : 'text-slate-500 font-medium'}`}>
                    {day.weekdayLabel}
                  </span>
                  <span className="text-xs font-extrabold">{day.dayNum}</span>
                  {day.isToday && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-slate-950' : 'bg-emerald-400 animate-pulse'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Main Content Frame */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
          {/* Nearest/Next alarm highlighted card - Live calculations */}
          {nearestMedication && (
            <div className="relative overflow-hidden bg-gradient-to-tr from-emerald-950/20 to-teal-900/10 border border-emerald-500/20 rounded-3xl p-4 flex gap-3.5 shadow-md shadow-emerald-950/20">
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-emerald-400/10 rounded-full border border-emerald-500/10 text-[8px] font-bold text-emerald-400 animate-pulse">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                <span>الجرعة التالية</span>
              </div>
              
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 self-center">
                <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-xs font-extrabold text-emerald-400 truncate leading-relaxed">
                  {(nearestMedication as any).medication.name}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block leading-relaxed mt-0.5">
                  {(nearestMedication as any).medication.dosage} • {(nearestMedication as any).displaySlot}
                </span>
                <span className="text-[9px] font-bold text-slate-500 mt-1 block">
                  وقت المنبه: {(nearestMedication as any).timeStr}
                </span>
              </div>

              <div className="flex flex-col justify-center items-end shrink-0 pl-1 select-none">
                {(nearestMedication as any).parsedTime && (
                  <CountdownTicker 
                    targetHour={(nearestMedication as any).parsedTime.hour} 
                    targetMinute={(nearestMedication as any).parsedTime.minute} 
                  />
                )}
              </div>
            </div>
          )}

          {/* Medication List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1 px-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>أدوية وجرعات اليوم المحدد</span>
            </h3>

            {medicationsList.length > 0 ? (
              <div className="space-y-2.5">
                {medicationsList.map((item) => {
                  return (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        item.isLogged
                           ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400/90'
                           : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => {
                            if (item.isLogged && item.loggedAt) {
                              const logTime = new Date(item.loggedAt).getTime();
                              const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
                              if (logTime < tenMinutesAgo) {
                                setConfirmUntickData({
                                  medId: item.medication.id,
                                  medName: item.medication.name,
                                  dosage: item.medication.dosage,
                                  slot: item.slot,
                                });
                                return;
                              }
                            }
                            handleToggleMed(item.medication.id, item.medication.name, item.medication.dosage, item.slot);
                          }}
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform active:scale-[0.95] ${
                            item.isLogged
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <CheckCircle2 className={`w-5 h-5 ${item.isLogged ? 'fill-emerald-400 text-slate-950' : 'text-slate-700'}`} />
                        </button>

                        <div className="truncate flex-1 min-w-0">
                          <span className={`text-xs font-bold block truncate ${item.isLogged ? 'line-through opacity-75 text-slate-500' : 'text-slate-200'}`}>
                            {item.medication.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-lg">
                              {item.medication.dosage}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-lg">
                              {item.displaySlot} • {item.timeStr}
                            </span>
                            {item.isLogged && item.loggedAt && (
                              <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-lg">
                                أُخذت {new Date(item.loggedAt).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {onDeleteMedication && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteData(item.medication);
                          }}
                          className="w-8 h-8 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 flex items-center justify-center shrink-0 transition-all active:scale-90"
                          title="حذف الدواء"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="flex flex-col items-end pl-1 shrink-0 select-none font-sans">
                        {item.parsedTime ? (
                          <MedicationStatusBadge
                            targetHour={item.parsedTime.hour}
                            targetMinute={item.parsedTime.minute}
                            selectedDate={selectedDate}
                            isLogged={item.isLogged}
                          />
                        ) : (
                          <span className="text-[9px] font-extrabold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
                            مجدول
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 bg-slate-950/20 border border-slate-800/40 rounded-3xl select-none">
                <Pill className="w-9 h-9 text-slate-700 mx-auto opacity-50 mb-2" />
                <span className="text-xs font-extrabold text-slate-400 block pb-1">لا توجد أدوية مضافة بالملف حالياً</span>
                <span className="text-[9px] text-slate-600 font-bold block">انقر على الزر بالأسفل لإدخال دوائك الأول</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions bar */}
        <div className="pt-3 border-t border-slate-800/80 mt-auto shrink-0 flex gap-3">
          <Button
            onClick={() => setShowAddInModal(true)}
            fullWidth
            leftIcon={<Plus className="w-4 h-4 text-slate-950" />}
          >
            إضافة دواء جديد
          </Button>
        </div>
      </motion.div>

      {/* Embedded inline Add Medication form inside container to prevent focus overlaps */}
      <AnimatePresence>
        {showAddInModal && (
          <AddMedicationModal 
            onClose={() => setShowAddInModal(false)}
            onSave={handleSaveMed}
          />
        )}
      </AnimatePresence>

      {/* Custom confirmation modal for unticking historical medication logs */}
      <AnimatePresence>
        {confirmUntickData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
              style={{ willChange: 'transform, opacity' }}
              className="w-full max-w-xs bg-slate-900 border border-slate-800/90 rounded-3xl p-5 shadow-2xl space-y-4 text-right"
              dir="rtl"
            >
              <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-amber-400">تنبيه تعديل السجل</h3>
                  <p className="text-[9px] text-slate-500 font-semibold">WARNING</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                تنبيه: لقد قمت بتسجيل أخذ هذا الدواء منذ فترة (أكثر من 10 دقائق). هل أنت متأكد أنك تريد إلغاء هذا التسجيل؟ يرجى التأكد لضمان دقة جدولك الطبي.
              </p>

              <div className="flex gap-2 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => setConfirmUntickData(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-[10px] rounded-lg border border-slate-700/40 transition-colors active:scale-95"
                >
                  تراجع وإلغاء
                </button>

                <button
                  type="button"
                  onClick={handleConfirmUntick}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10px] rounded-lg transition-colors active:scale-95 shadow-md shadow-amber-600/10 flex items-center justify-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>نعم، إلغاء التسجيل</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom confirmation modal for deleting a medication */}
      <AnimatePresence>
        {confirmDeleteData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
              style={{ willChange: 'transform, opacity' }}
              className="w-full max-w-xs bg-slate-900 border border-slate-800/90 rounded-3xl p-5 shadow-2xl space-y-4 text-right"
              dir="rtl"
            >
              <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-rose-400">تأكيد حذف الدواء</h3>
                  <p className="text-[9px] text-slate-500 font-semibold">DANGER ZONE</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                هل أنت متأكد من حذف دواء <strong className="text-slate-100">{confirmDeleteData.name}</strong> ({confirmDeleteData.dosage})؟ سيتم حذف جميع تنبيهاته المجدولة من نظام المنبهات ولا يمكن التراجع عن هذا الإجراء.
              </p>

              <div className="flex gap-2 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteData(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-[10px] rounded-lg border border-slate-700/40 transition-colors active:scale-95"
                >
                  تراجع وإلغاء
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10px] rounded-lg transition-colors active:scale-95 shadow-md shadow-rose-600/10 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>نعم، احذف الدواء</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
