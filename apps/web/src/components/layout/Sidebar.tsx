import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BarChart2,
  Bell,
  CreditCard,
  Database,
  ExternalLink,
  FileCheck2,
  Gauge,
  RotateCw,
  Search,
  Settings,
  Terminal,
  X,
} from 'lucide-react';
import { useMerchantAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { currentUser, openConfigModal } = useMerchantAuth();
  const { summary, activeTenant, rotatingKey, rotateKekNow, showToast } = useWorkspace();

  const keyVersion = summary?.activeKeyVersion ?? activeTenant?.activeKeyVersion ?? 1;
  const activeKeyCount = summary?.activeApiKeysCount ?? 0;
  const extProtectedCount = summary?.externalProtectedOrdersCount ?? 0;
  const planTier = (summary?.plan?.tier ?? activeTenant?.planTier ?? 'free').toUpperCase();

  const sections: Array<{
    groupTitle: string;
    items: Array<{
      to: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number | string;
    }>;
  }> = [
    {
      groupTitle: 'PROJECT',
      items: [
        { to: '/api-keys', label: 'API Keys', icon: Terminal, badge: activeKeyCount },
        {
          to: '/simulator',
          label: 'SuperShop DB Simulator',
          icon: Database,
          badge: extProtectedCount,
        },
      ],
    },
    {
      groupTitle: 'USAGE & BILLING',
      items: [
        { to: '/dashboard', label: 'Usage & Analytics', icon: BarChart2 },
        { to: '/sentinel', label: 'AI Sentinel Guard', icon: Gauge, badge: '500/min' },
        { to: '/pricing', label: 'Billing & Plans', icon: CreditCard, badge: planTier },
      ],
    },
    {
      groupTitle: 'OBSERVE',
      items: [
        { to: '/audit', label: 'Audit Logs', icon: FileCheck2 },
        { to: '/access', label: 'Role Redaction Rules', icon: Activity },
      ],
    },
  ];

  const railContent = (
    <div className="flex flex-col h-full w-[256px] px-3.5 py-4 text-[#FAFAFA] select-none overflow-y-auto">
      {/* Top Header & Logo matching Google AI Studio style */}
      <div className="flex items-center justify-between px-2 mb-3">
        <Link to="/" onClick={onCloseMobile} className="flex items-center gap-2.5 group">
          <svg
            width="32"
            height="32"
            viewBox="0 0 36 36"
            fill="none"
            aria-hidden="true"
            className="shrink-0 transition-transform group-hover:scale-105"
          >
            <rect width="36" height="36" rx="10" fill="#27272A" />
            <path
              d="M18 6.5L27 10.2V17.4C27 23.1 23.15 27.95 18 29.5C12.85 27.95 9 23.1 9 17.4V10.2L18 6.5Z"
              stroke="#D4F358"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <circle cx="18" cy="16.2" r="2.6" fill="#D4F358" />
            <path d="M18 18.8V23" stroke="#D4F358" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="font-semibold tracking-tight text-white text-[18px]">VaultGuard AI</span>
            <span className="text-[9.5px] uppercase tracking-[0.14em] text-[#A1A1AA] mt-0.5">
              Zero-Storage Console
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-full text-[#A1A1AA] hover:text-white"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Back to Public Website link */}
      <Link
        to="/"
        onClick={onCloseMobile}
        className="mx-1 mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[12px] font-medium text-[#A1A1AA] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Public Storefront
      </Link>

      {/* Categorized Navigation: PROJECT, USAGE & BILLING, OBSERVE */}
      <nav className="flex flex-col gap-4 flex-1">
        {sections.map((section) => (
          <div key={section.groupTitle} className="space-y-0.5">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#71717A]">
              {section.groupTitle}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    [
                      'flex items-center justify-between rounded-xl px-3 py-2 text-[12.5px] transition-all duration-150',
                      isActive
                        ? 'bg-[#27272A] text-white font-medium shadow-xs'
                        : 'text-[#A1A1AA] hover:text-white hover:bg-white/5',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[#D4F358]' : 'text-[#A1A1AA]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span
                          className={`ml-1.5 text-[10px] font-semibold min-w-[20px] h-4.5 px-1.5 rounded-full inline-flex items-center justify-center tabular-nums shrink-0 ${
                            isActive
                              ? 'bg-[#D4F358] text-[#18181B]'
                              : 'bg-white/10 text-[#A1A1AA]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}

        <div className="pt-1">
          <Link
            to="/docs"
            onClick={onCloseMobile}
            className="flex items-center justify-between px-3 py-1.5 text-[12px] text-[#71717A] hover:text-white transition-colors"
          >
            <span>4-Step Integration Guide</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Link>
        </div>
      </nav>

      {/* Bottom Utility Icons + User Profile matching Reference Image */}
      <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
        {/* Quick Utility Icon Row: Bell, Settings, Search, Key Rotation */}
        <div className="flex items-center justify-between px-2 text-[#A1A1AA]">
          <button
            type="button"
            title="Notifications"
            onClick={() =>
              showToast(
                'info',
                'Zero-Storage Status',
                '0 customer records stored on VaultGuard servers. All keys active.',
              )
            }
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Clerk Auth & Store Settings"
            onClick={openConfigModal}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Search Orders by Blind Index"
            onClick={() =>
              showToast(
                'info',
                'Blind-Index Search',
                'Open SuperShop DB Simulator to test sub-millisecond phone lookup.',
              )
            }
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={rotatingKey}
            title={`Rotate KEK (Current: v${keyVersion})`}
            onClick={() => void rotateKekNow()}
            className="p-1.5 rounded-lg hover:text-[#D4F358] hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${rotatingKey ? 'animate-spin text-[#D4F358]' : ''}`} />
          </button>
        </div>

        {/* User Profile Pill matching Google AI Studio reference */}
        <button
          type="button"
          onClick={openConfigModal}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#D4F358] text-[#18181B] font-bold text-[11px] flex items-center justify-center shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-white truncate group-hover:text-[#D4F358] transition-colors">
              {currentUser.email}
            </p>
            <p className="text-[10px] text-[#71717A] truncate">{currentUser.storeName}</p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{railContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 bg-[#18181B] h-full shadow-2xl">{railContent}</aside>
        </div>
      )}
    </>
  );
};
