import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

export const JudgeGuideBar: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();

  if (dismissed) {
    return null;
  }

  const steps = [
    { label: t('guide.step1'), onClick: () => navigate('/api-keys') },
    { label: t('guide.step2'), onClick: () => navigate('/store-sandbox') },
    { label: t('guide.step3'), onClick: () => navigate('/breach') },
    { label: t('guide.step4'), onClick: () => navigate('/access') },
    { label: t('guide.step5'), onClick: () => navigate('/sentinel') },
  ];

  return (
    <div className="bg-white border border-[#E4E4E7] rounded-full px-4 py-2 mb-5 flex items-center justify-between gap-3 overflow-x-auto">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-6 h-6 rounded-full bg-[#D4F358] text-[#18181B] flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <span className="text-[12px] font-semibold text-[#111827] whitespace-nowrap">
          {t('guide.title')}
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <button
              type="button"
              onClick={step.onClick}
              className="px-3 py-1 rounded-full bg-[#ECECEE] hover:bg-[#D4F358] text-[#111827] text-[11.5px] font-medium whitespace-nowrap transition-colors cursor-pointer"
            >
              {step.label}
            </button>
            {index < steps.length - 1 && (
              <ArrowRight className="w-3 h-3 text-[#71717A] shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss guide"
        className="p-1 rounded-full text-[#71717A] hover:text-[#111827] shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
