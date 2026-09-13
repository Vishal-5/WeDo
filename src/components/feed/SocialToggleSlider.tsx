"use client";
import { useState, ReactNode } from 'react';
import { Camera } from 'lucide-react';
import SmartLensModal from '@/components/modals/SmartLensModal';

interface SocialToggleSliderProps {
  connectContent: ReactNode;
  groupContent: ReactNode;
  officialContent: ReactNode;
  communityContent: ReactNode;
  onTabChange?: (tab: string) => void;
}

export default function SocialToggleSlider({ 
  connectContent, 
  groupContent,
  officialContent,
  communityContent,
  onTabChange
}: SocialToggleSliderProps) {

  const [activeTab, setActiveTab] = useState<'connect' | 'group' | 'official' | 'community'>('connect');
  const [isSmartLensOpen, setIsSmartLensOpen] = useState(false);

  const handleTabChange = (tab: 'connect' | 'group' | 'official' | 'community') => {
    setActiveTab(tab);
    onTabChange && onTabChange(tab);
  };

  return (
    <div className="w-full">
      <div className="flex justify-center items-center mb-8 gap-4">
        
        {/* Smart Lens Button */}
        <button
          onClick={() => setIsSmartLensOpen(true)}
          className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg text-white flex-shrink-0"
          title="Open Smart Lens"
        >
          <Camera className="h-5 w-5" />
        </button>

        {/* Tab Navigation */}
        <div className="relative flex w-full max-w-[600px] bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
          
          <div className="absolute inset-y-1.5 left-1.5 right-1.5 flex pointer-events-none">
            <div 
              className={`w-1/4 bg-emerald-500 rounded-lg shadow-sm transition-transform duration-300 ease-out ${
                activeTab === 'connect' ? 'translate-x-0' : 
                activeTab === 'group' ? 'translate-x-full' : 
                activeTab === 'official' ? 'translate-x-[200%]' :
                'translate-x-[300%]'
              }`}
            />
          </div>
          
          {/* CONNECT */}
          <button 
            onClick={() => handleTabChange('connect')}
            className={`relative flex-1 text-center py-2.5 px-2 text-xs sm:text-sm font-medium rounded-lg transition-colors z-10 ${
              activeTab === 'connect' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Connect
          </button>
          
          {/* CITIZEN HUBS */}
          <button 
            onClick={() => handleTabChange('group')}
            className={`relative flex-1 text-center py-2.5 px-2 text-xs sm:text-sm font-medium rounded-lg transition-colors z-10 ${
              activeTab === 'group' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Citizen Hubs
          </button>

          {/* OFFICIAL */}
          <button 
            onClick={() => handleTabChange('official')}
            className={`relative flex-1 text-center py-2.5 px-2 text-xs sm:text-sm font-medium rounded-lg transition-colors z-10 ${
              activeTab === 'official' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Official
          </button>

          {/* COMMUNITY */}
          <button 
            onClick={() => handleTabChange('community')}
            className={`relative flex-1 text-center py-2.5 px-2 text-xs sm:text-sm font-medium rounded-lg transition-colors z-10 ${
              activeTab === 'community' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Community
          </button>
          
        </div>
      </div>

      <div className="mt-0">
        {activeTab === 'connect' && connectContent}
        {activeTab === 'group' && groupContent}
        {activeTab === 'official' && officialContent}
        {activeTab === 'community' && communityContent}
      </div>

      {/* Smart Lens Modal */}
      <SmartLensModal isOpen={isSmartLensOpen} onClose={() => setIsSmartLensOpen(false)} />
    </div>
  );
}