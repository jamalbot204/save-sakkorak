import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Activity } from 'lucide-react';

interface GlucoseLogModalProps {
  onClose: () => void;
  onSave: (value: number, relation: 'fasting' | 'post-meal' | 'before-meal' | 'bedtime' | 'random', notes?: string) => void;
}

export const GlucoseLogModal = React.memo(({ onClose, onSave }: GlucoseLogModalProps) => {
  const [newValue, setNewValue] = useState<string>('');
  const [newRelation, setNewRelation] = useState<'fasting' | 'post-meal' | 'before-meal' | 'bedtime' | 'random'>('fasting');
  const [newNotes, setNewNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(newValue);
    if (isNaN(val) || val <= 0) return;
    onSave(val, newRelation, newNotes.trim() || undefined);
    setNewValue('');
    setNewNotes('');
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="تسجيل قراءة للسكري"
      icon={<Activity className="w-5 h-5" />}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="مستوى السكر (ملغ / ديسيلتر)"
          type="number"
          required
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="مثال: 120"
          className="text-center font-mono font-bold"
        />

        <div>
          <label className="block text-[10px] text-slate-400 mb-1.5 font-bold uppercase select-none px-1">
            الصلة بالوجبة
          </label>
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              { key: 'fasting', label: 'فحص صائم' },
              { key: 'before-meal', label: 'قبل الطعام' },
              { key: 'post-meal', label: 'بعد الطعام' },
              { key: 'bedtime', label: 'قبل النوم' },
              { key: 'random', label: 'عشوائي' },
            ].map((rel) => (
              <Button
                key={rel.key}
                type="button"
                onClick={() => setNewRelation(rel.key as any)}
                variant={newRelation === rel.key ? 'sky' : 'slate'}
                size="sm"
                className="py-2.5 px-1 rounded-xl font-bold"
              >
                {rel.label}
              </Button>
            ))}
          </div>
        </div>

        <Input
          label="ملاحظات إضافية (اختياري)"
          type="text"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder="مثال: حاسس بدوار خفيف..."
        />

        <div className="flex gap-3 pt-3 border-t border-slate-800/60 mt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            className="flex-1 py-3 text-xs"
          >
            إلغاء الأمر
          </Button>
          <Button
            type="submit"
            variant="sky"
            className="flex-1 py-3 text-xs"
          >
            حفظ القراءة
          </Button>
        </div>
      </form>
    </Modal>
  );
});
GlucoseLogModal.displayName = 'GlucoseLogModal';
