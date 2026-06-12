/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasProfile: boolean;
}

export const Layout: React.FC<LayoutProps> = React.memo(({ children, activeTab, setActiveTab, hasProfile }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-4 text-slate-100 font-sans selection:bg-sky-500/20 antialiased overflow-hidden">
      {/* Smartphone Outer Housing Frame (Desktop Only styling) */}
      <div className="relative w-full max-w-[430px] h-[100dvh] md:h-[880px] bg-slate-900 md:rounded-[48px] md:shadow-2xl overflow-hidden md:border-8 md:border-slate-800 flex flex-col transform-gpu transition-all duration-300">
        
        {/* Dynamic Mobile Camera Notch / Island */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50 pointer-events-none hidden md:flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-slate-900 rounded-full mr-2"></div>
          <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
        </div>

        {/* Main Content Area Container */}
        <div className="flex-1 pb-16 flex flex-col relative bg-slate-950 min-h-0 overflow-hidden">
          {children}
        </div>

        {/* MD3 Native Bottom Navigation Bar */}
        {hasProfile && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/50 flex justify-around items-center px-2 z-40 select-none">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${activeTab === 'home' ? 'text-emerald-400' : 'text-slate-400'}`}
            >
              <div className={`px-5 py-1 rounded-full transition-colors ${activeTab === 'home' ? 'bg-emerald-500/10' : 'bg-transparent'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <span className="text-[10px] mt-1 font-medium">الرئيسية</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${activeTab === 'chat' ? 'text-sky-400' : 'text-slate-400'}`}
            >
              <div className={`px-5 py-1 rounded-full transition-colors ${activeTab === 'chat' ? 'bg-sky-500/10' : 'bg-transparent'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
                </svg>
              </div>
              <span className="text-[10px] mt-1 font-medium">مساعد السكري</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${activeTab === 'settings' ? 'text-amber-400' : 'text-slate-400'}`}
            >
              <div className={`px-5 py-1 rounded-full transition-colors ${activeTab === 'settings' ? 'bg-amber-500/10' : 'bg-transparent'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <span className="text-[10px] mt-1 font-medium">الإعدادات</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

Layout.displayName = 'Layout';
