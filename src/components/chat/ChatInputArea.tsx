import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, Camera, X, Mic, Square, FolderOpen } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { BottomSheet } from '../common/BottomSheet';
import { AndroidSettingsEx } from '../../plugins/AndroidSettingsEx';
import { compressImage } from '../../lib/imageCompression';

interface ChatInputAreaProps {
  isTyping: boolean;
  onSendMessage: (text: string, attachment: { name: string; mimeType: string; dataUrl: string } | null) => void;
  onStopGeneration?: () => void;
  inputAreaRef: React.RefObject<HTMLDivElement>;
  isOffline?: boolean;
}

export const ChatInputArea = React.memo(({ isTyping, onSendMessage, onStopGeneration, inputAreaRef, isOffline = false }: ChatInputAreaProps) => {
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; dataUrl: string } | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const isNativePlatform = () => {
    try {
      return (window as any).Capacitor?.isNativePlatform() || false;
    } catch (e) {
      return false;
    }
  };

  const startListening = async () => {
    let isAlreadyGranted = false;

    if (isNativePlatform()) {
      try {
        const checkRes = await AndroidSettingsEx.checkMicrophonePermission();
        if (!checkRes.granted) {
          const reqRes = await AndroidSettingsEx.requestMicrophonePermission();
          if (!reqRes.granted) {
            setSpeechError('إذن الميكروفون مرفوض! يرجى تفعيل إذن الميكروفون للتطبيق من إعدادات هاتفك للتمكن من التحدث.');
            setTimeout(() => setSpeechError(null), 4000);
            return;
          }
        }
        
        setIsListening(true);
        setSpeechError(null);

        // Remove old listeners to prevent leak/multiple callbacks
        await AndroidSettingsEx.removeAllListeners();

        // Save original text value to append of speechResult
        let baseText = '';
        setInputText((prev) => {
          baseText = prev;
          return prev;
        });

        await AndroidSettingsEx.addListener('speechStatus', (data) => {
          console.log('Native speech status event:', data.status);
          if (data.status === 'stopped') {
            setIsListening(false);
          } else if (data.status === 'listening') {
            setIsListening(true);
          }
        });

        await AndroidSettingsEx.addListener('speechResult', (data) => {
          console.log('Native speech result event:', data.text);
          if (data.text) {
            const spacing = baseText.trim().length > 0 ? ' ' : '';
            setInputText(baseText + spacing + data.text);
          }
        });

        await AndroidSettingsEx.addListener('speechError', (error) => {
          console.error('Native speech error event:', error);
          setIsListening(false);
          if (error.msg === 'no-speech') {
            setSpeechError('لم نلتقط أي كلام بوضوح. يرجى المحاولة والتحدث مجدداً.');
          } else if (error.msg === 'not-allowed') {
            setSpeechError('إذن الميكروفون غير متوفر أو تم رفضه. يرجى تفعيل إذن الميكروفون من إعدادات هاتفك.');
          } else {
            setSpeechError('حدثت مشكلة أثناء محاولة التقاط وتفسير الصوت.');
          }
          setTimeout(() => setSpeechError(null), 4000);
        });

        recognitionRef.current = {
          stop: async () => {
            try {
              await AndroidSettingsEx.stopSpeechRecognition();
              await AndroidSettingsEx.removeAllListeners();
            } catch (e) {
              console.error('Error stopping native speech:', e);
            }
          }
        };

        await AndroidSettingsEx.startSpeechRecognition({ language: 'ar-SY' });
      } catch (err: any) {
        console.error('Core native microphone or recognition setup error:', err);
        setSpeechError('تعذر تفعيل محرك تسجيل الصوت المدمج.');
        setTimeout(() => setSpeechError(null), 4000);
        setIsListening(false);
      }
      return;
    }

    // Web Fallback
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('عذراً، ميزة الإدخال الصوتي بالصوت غير مدعومة بالكامل على متصفحك الحالي.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      if (navigator.permissions && (navigator.permissions as any).query) {
        const status = await navigator.permissions.query({ name: 'microphone' as any });
        if (status && status.state === 'granted') {
          isAlreadyGranted = true;
        }
      }
    } catch (e) {
      console.warn('Could not query microphone permission status:', e);
    }

    if (!isAlreadyGranted) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (err: any) {
        console.error('Microphone pre-flight getUserMedia error:', err);
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setSpeechError('عذراً، لم نتمكن من العثور على ميكروفون نشط في جهازك.');
          setTimeout(() => setSpeechError(null), 4000);
          return;
        }
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ar-SY';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error callback:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('إذن الميكروفون غير متوفر أو تم رفضه. يرجى تفعيل إذن الميكروفون للتطبيق من إعدادات هاتفك.');
        } else if (event.error === 'no-speech') {
          setSpeechError('لم نلتقط أي كلام بوضوح. يرجى المحاولة والتحدث مجدداً.');
        } else {
          setSpeechError('حدثت مشكلة أثناء محاولة التقاط وتفسير الصوت.');
        }
        setTimeout(() => setSpeechError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => {
            const spacing = prev.trim().length > 0 ? ' ' : '';
            return prev + spacing + transcript;
          });
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setSpeechError('عذراً، تعذر تشغيل محرك تحويل الصوت إلى كلام.');
      setTimeout(() => setSpeechError(null), 3500);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleAttachClick = () => {
    setSpeechError('قريبا بالتحدي القادم');
    setTimeout(() => setSpeechError(null), 3000);
  };

  const handleFrontCamera = async () => {
    try {
      if (isNativePlatform()) {
        const permissionStatus = await CapCamera.requestPermissions({ permissions: ['camera'] });
        if (permissionStatus.camera !== 'granted') {
          setSpeechError('إذن الكاميرا مرفوض. يرجى تفعيله من إعدادات جهازك.');
          setTimeout(() => setSpeechError(null), 4000);
          setShowBottomSheet(false);
          return;
        }

        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: CameraDirection.Front,
        });

        if (image && image.dataUrl) {
          const compressed = await compressImage(image.dataUrl);
          setAttachment({
            name: `front-capture-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            dataUrl: compressed,
          });
        }
      } else {
        // Web testing fallback
        fileInputRef.current?.setAttribute('capture', 'user');
        fileInputRef.current?.click();
      }
      setShowBottomSheet(false);
    } catch (err: any) {
      console.error('Front camera error', err);
      if (err.message && err.message.toLowerCase().includes('cancel')) {
        // User cancelled gracefully
      } else {
        setSpeechError('تعذر تشغيل الكاميرا الأمامية أو رفض الإذن.');
        setTimeout(() => setSpeechError(null), 3500);
      }
      setShowBottomSheet(false);
    }
  };

  const handleRearCamera = async () => {
    try {
      if (isNativePlatform()) {
        const permissionStatus = await CapCamera.requestPermissions({ permissions: ['camera'] });
        if (permissionStatus.camera !== 'granted') {
          setSpeechError('إذن الكاميرا مرفوض. يرجى تفعيله من إعدادات جهازك.');
          setTimeout(() => setSpeechError(null), 4000);
          setShowBottomSheet(false);
          return;
        }

        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: CameraDirection.Rear,
        });

        if (image && image.dataUrl) {
          const compressed = await compressImage(image.dataUrl);
          setAttachment({
            name: `rear-capture-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            dataUrl: compressed,
          });
        }
      } else {
        // Web testing fallback
        fileInputRef.current?.setAttribute('capture', 'environment');
        fileInputRef.current?.click();
      }
      setShowBottomSheet(false);
    } catch (err: any) {
      console.error('Rear camera error', err);
      if (err.message && err.message.toLowerCase().includes('cancel')) {
        // User cancelled gracefully
      } else {
        setSpeechError('تعذر تشغيل الكاميرا الخلفية أو رفض الإذن.');
        setTimeout(() => setSpeechError(null), 3500);
      }
      setShowBottomSheet(false);
    }
  };

  const handleSystemFiles = () => {
    fileInputRef.current?.removeAttribute('capture');
    fileInputRef.current?.click();
    setShowBottomSheet(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setSpeechError('يرجى اختيار صورة بصيغة PNG أو JPEG فقط.');
      setTimeout(() => setSpeechError(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(reader.result as string);
        setAttachment({
          name: file.name,
          mimeType: 'image/jpeg',
          dataUrl: compressed,
        });
      } catch (err) {
        console.error('Image compression failed:', err);
        setSpeechError('تعذر معالجة الصورة. يرجى تجربة صورة أخرى.');
        setTimeout(() => setSpeechError(null), 3500);
      }
    };
    reader.readAsDataURL(file);
    setShowBottomSheet(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    onSendMessage(inputText, attachment);
    setInputText('');
    setAttachment(null);
  };

  return (
    <>
      <div ref={inputAreaRef} className="p-3 bg-slate-900/95 border-t border-slate-800/80 shrink-0 z-30">
        
        {attachment && (
          <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl mb-2.5 border border-slate-800 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
                <img src={attachment.dataUrl} alt="Upload thumb preview" className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] text-slate-400 truncate max-w-[200px] font-sans font-medium">{attachment.name}</span>
            </div>
            
            <button 
              type="button"
              onClick={() => setAttachment(null)}
              className="p-1 text-slate-500 hover:text-slate-300 bg-slate-900 rounded-lg active:scale-90"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {speechError && (
          <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl mb-2.5 text-[10px] text-rose-400 select-none animate-fadeIn">
            <span>⚠️ {speechError}</span>
          </div>
        )}

        {isListening && (
          <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-xl mb-2.5 select-none animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-[10px] text-sky-400 font-bold">جاري استلام صوتك... تحدث الآن بالعامية أو الفصحى</span>
            </div>
            <button 
              type="button" 
              onClick={stopListening} 
              className="text-[9px] text-rose-400 font-bold hover:underline"
            >
              إلغاء الاستماع
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col bg-slate-950 border border-slate-800/80 rounded-3xl p-1.5 focus-within:border-sky-500 transition-all">
          {/* Input text Row */}
          <div className="w-full">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              disabled={isTyping || isOffline}
              placeholder={isOffline ? "تم تعطيل الاستشارة الذكية مؤقتاً لعدم توفر إنترنت..." : (isTyping ? "الرجاء المهل ثانية..." : "اكتب هنا للاستشارة الذكية...")}
              rows={1}
              className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 font-medium text-right max-h-40 overflow-y-auto resize-none focus:border-transparent focus:ring-transparent focus:outline-none"
              dir="rtl"
            />
          </div>

          {/* Actions & Utilities Row */}
          <div className="flex items-center justify-between gap-2 px-1 focus-within:border-sky-500 mt-1 pt-1.5 border-t border-slate-900/60">
            {/* Right: Quick actions (Attach, Voice) */}
            <div className="flex items-center gap-1.5" dir="rtl">
              <button
                type="button"
                onClick={handleAttachClick}
                className="p-2 bg-slate-900 border border-slate-800/60 text-slate-500 rounded-xl active:scale-90 transition-colors shrink-0 opacity-50 cursor-not-allowed"
                title="قريبا بالتحدي القادم"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isOffline}
                className={`p-2 border rounded-xl transition-all active:scale-95 shrink-0 relative flex items-center justify-center disabled:opacity-35 disabled:pointer-events-none ${
                  isListening
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-slate-900 border-slate-800/60 text-slate-400 hover:text-rose-400'
                }`}
                title={isListening ? "إيقاف الاستماع" : "استخدم الإدخال الصوتي السريع"}
              >
                {isListening ? (
                  <Square className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>

            {/* Left: Send / Cancel Generation Button */}
            <div>
              {isTyping ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="p-1.5 px-4 bg-rose-500/15 border border-rose-500/35 hover:bg-rose-500/25 text-rose-400 rounded-xl transition-all active:scale-95 shrink-0 shadow-lg shadow-rose-500/5 flex items-center gap-1"
                  title="إلغاء توليد الإجابة"
                >
                  <span className="text-[10px] font-black">إيقاف</span>
                  <Square className="w-2.5 h-2.5 fill-rose-400 text-rose-400 animate-pulse" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachment) || isOffline}
                  className="p-1.5 px-4 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-xl transition-all disabled:opacity-20 disabled:pointer-events-none active:scale-95 shrink-0 shadow-lg shadow-sky-500/10 flex items-center gap-1"
                >
                  <span className="text-[10px] font-black">إرسال</span>
                  <Send className="w-3 h-3 transform rotate-180" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg"
        className="hidden"
      />

      <BottomSheet 
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="إرفاق صورة للوجبة الشامية أو التحاليل"
      >
        <div className="space-y-2.5 text-right flex flex-col" dir="rtl">
          {/* Front Camera Button */}
          <button
            type="button"
            onClick={handleFrontCamera}
            className="w-full flex items-center justify-start gap-4 p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/85 hover:border-sky-500/50 font-sans active:scale-98 transition-all duration-200 text-right"
          >
            <div className="p-2 bg-sky-500/10 rounded-xl shrink-0">
              <Camera className="w-5 h-5 text-sky-400 rotate-180" />
            </div>
            <div className="flex flex-col items-start text-right">
              <span className="text-xs font-black text-slate-200">كاميرا أمامية (سيلفي)</span>
              <span className="text-[10px] text-slate-500 font-medium">التقاط صورة شخصية سريعة</span>
            </div>
          </button>

          {/* Rear Camera Button */}
          <button
            type="button"
            onClick={handleRearCamera}
            className="w-full flex items-center justify-start gap-4 p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/85 hover:border-emerald-500/50 font-sans active:scale-98 transition-all duration-200 text-right"
          >
            <div className="p-2 bg-emerald-500/10 rounded-xl shrink-0">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex flex-col items-start text-right">
              <span className="text-xs font-black text-slate-200">كاميرا خلفية</span>
              <span className="text-[10px] text-slate-500 font-medium">تصوير وجبة الطعام أو قراءة الأجهزة</span>
            </div>
          </button>

          {/* System Files Button */}
          <button
            type="button"
            onClick={handleSystemFiles}
            className="w-full flex items-center justify-start gap-4 p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/85 hover:border-amber-500/50 font-sans active:scale-98 transition-all duration-200 text-right"
          >
            <div className="p-2 bg-amber-500/10 rounded-xl shrink-0">
              <FolderOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col items-start text-right">
              <span className="text-xs font-black text-slate-200">ملفات النظام الداخلية</span>
              <span className="text-[10px] text-slate-500 font-medium">اختيار صورة من معرض الصور أو الذاكرة</span>
            </div>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setShowBottomSheet(false)}
            className="w-full p-4 mt-1.5 text-center text-xs font-extrabold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-2xl active:scale-95 transition-all"
          >
            إلغاء الأمر
          </button>
        </div>
      </BottomSheet>
    </>
  );
});
ChatInputArea.displayName = 'ChatInputArea';
