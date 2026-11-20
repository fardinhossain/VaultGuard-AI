import React, { useState } from 'react';
import { CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AddCustomerModal } from './AddCustomerModal';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export const ObsidianFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toast, dismissToast } = useWorkspace();

  return (
    <div className="min-h-screen bg-[#18181B] p-2 sm:p-3 flex">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <main className="flex-1 min-w-0 bg-[#ECECEE] rounded-[28px] p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
        <TopHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        {children}
      </main>

      <AddCustomerModal />

      {/* Live Toast Feedback */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#18181B] text-white rounded-[20px] p-4 shadow-2xl border border-white/10 flex items-start gap-3">
          {toast.tone === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#D4F358] shrink-0 mt-0.5" />
          ) : toast.tone === 'danger' ? (
            <ShieldAlert className="w-5 h-5 text-[#F43F5E] shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-[#B4ACF9] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold leading-snug">{toast.title}</p>
            {toast.detail && (
              <p className="text-[12px] text-[#A1A1AA] mt-1 leading-snug">{toast.detail}</p>
            )}
          </div>
          <button
            type="button"
            onClick={dismissToast}
            className="text-[#A1A1AA] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
