import React, { useState, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { UserProfile, Medication } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BasicInfoStep } from './onboarding/BasicInfoStep';
import { ComorbiditiesStep } from './onboarding/ComorbiditiesStep';
import { MedicationsStep } from './onboarding/MedicationsStep';
import { SchedulingStep } from './onboarding/SchedulingStep';
import { SuccessStep } from './onboarding/SuccessStep';
import { ProgressBar } from './onboarding/ProgressBar';

export const Onboarding: React.FC = () => {
  const setUserProfile = useAppStore((state) => state.setUserProfile);
  
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [diabetesType, setDiabetesType] = useState<'type1' | 'type2' | 'gestational' | 'prediabetes'>('type1');

  // Step 2 state
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);

  // Step 3 state
  const [medications, setMedications] = useState<Medication[]>([]);

  // Step 4 state
  const [medicationTimes, setMedicationTimes] = useState({
    Breakfast: '08:00 AM',
    Lunch: '01:00 PM',
    Dinner: '08:00 PM',
    Bedtime: '10:00 PM',
  });

  const toggleComorbidity = useCallback((key: string) => {
    setSelectedComorbidities((prev) => {
      if (key === 'none') {
        return ['none'];
      }
      let updated = prev.filter(c => c !== 'none');
      if (updated.includes(key)) {
        updated = updated.filter(c => c !== key);
      } else {
        updated.push(key);
      }
      return updated;
    });
  }, []);

  const handleAddMedication = useCallback((med: Medication) => {
    setMedications((prev) => [...prev, med]);
  }, []);

  const handleRemoveMedication = useCallback((id: string) => {
    setMedications((prev) => prev.filter(m => m.id !== id));
  }, []);

  const handleFinish = useCallback(() => {
    const profile: UserProfile = {
      name: name.trim() || 'مستشار صحي',
      age: parseInt(age) || 45,
      gender,
      diabetesType,
      comorbidities: selectedComorbidities,
      medications,
      medicationTimes,
      isOnboarded: true,
    };
    setUserProfile(profile);
  }, [name, age, gender, diabetesType, selectedComorbidities, medications, medicationTimes, setUserProfile]);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto selection:bg-emerald-500/20">
      
      {/* Header Profile Title */}
      <div className="text-center mb-5 shrink-0 select-none">
        <h1 className="text-lg font-bold text-slate-100">الملف الشخصي الطبي</h1>
        <p className="text-xs text-slate-400 mt-1">خطوة {step} من 5</p>
      </div>

      <ProgressBar step={step} totalSteps={5} />

      {/* Wizard Form Sections */}
      <div className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto">
        <div className="space-y-6">
          {step === 1 && (
            <BasicInfoStep 
              name={name} setName={setName}
              age={age} setAge={setAge}
              gender={gender} setGender={setGender}
              diabetesType={diabetesType} setDiabetesType={setDiabetesType}
            />
          )}

          {step === 2 && (
            <ComorbiditiesStep 
              selectedComorbidities={selectedComorbidities} 
              toggleComorbidity={toggleComorbidity} 
            />
          )}

          {step === 3 && (
            <MedicationsStep 
              medications={medications}
              onAddMedication={handleAddMedication}
              onRemoveMedication={handleRemoveMedication}
            />
          )}

          {step === 4 && (
            <SchedulingStep 
              medicationTimes={medicationTimes}
              setMedicationTimes={setMedicationTimes}
            />
          )}

          {step === 5 && <SuccessStep />}
        </div>

        {/* Action Button Footer controls */}
        <div className="flex gap-3 pt-8 shrink-0">
          {step > 1 && step < 5 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-300 flex items-center justify-center active:scale-95 transition-transform"
            >
              <ChevronRight className="w-5 h-5 ml-1" />
              <span className="text-xs font-bold">السابق</span>
            </button>
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
            >
              <span className="mr-1">التالي</span>
              <ChevronLeft className="w-5 h-5 mr-1" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full py-4.5 bg-emerald-500 text-slate-950 font-extrabold text-sm rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-xl shadow-emerald-500/15"
            >
              <span>الدخول إلى لوحة التحكم الرئيسية</span>
              <ChevronLeft className="w-5 h-5 mr-1.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
