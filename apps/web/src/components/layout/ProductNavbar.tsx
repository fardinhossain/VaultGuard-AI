import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { MerchantAuthButtons } from '../../context/AuthContext';

export const ProductNavbar: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#18181B]/95 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <svg
            width="32"
            height="32"
            viewBox="0 0 36 36"
            fill="none"
            aria-hidden="true"
            className="shrink-0 transition-transform group-hover:scale-105"
          >
            <rect width="36" height="36" rx="11" fill="#27272A" />
            <path
              d="M18 6.5L27 10.2V17.4C27 23.1 23.15 27.95 18 29.5C12.85 27.95 9 23.1 9 17.4V10.2L18 6.5Z"
              stroke="#D4F358"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <circle cx="18" cy="16.2" r="2.6" fill="#D4F358" />
            <path d="M18 18.8V23" stroke="#D4F358" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span className="font-semibold tracking-tight text-white text-[19px]">vaultguard</span>
        </Link>

        {/* Clean 5-Link Commercial Product Navbar */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main Product Navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white/15 text-[#D4F358] font-semibold'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
              }`
            }
          >
            {t('nav.home')}
          </NavLink>
          <Link
            to="/#features"
            className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            {t('nav.features')}
          </Link>
          <Link
            to="/#how-it-works"
            className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            {t('nav.howItWorks')}
          </Link>
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white/15 text-[#D4F358] font-semibold'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
              }`
            }
          >
            {t('nav.pricing')}
          </NavLink>
          <NavLink
            to="/docs"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white/15 text-[#D4F358] font-semibold'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
              }`
            }
          >
            {t('nav.docs')}
          </NavLink>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Clerk Store Auth */}
          <MerchantAuthButtons className="hidden sm:flex" />

          {/* EN / বাংলা Toggle */}
          <div className="inline-flex items-center bg-[#27272A] rounded-full p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold cursor-pointer ${
                lang === 'en' ? 'bg-[#D4F358] text-[#18181B]' : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('bn')}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold cursor-pointer ${
                lang === 'bn' ? 'bg-[#D4F358] text-[#18181B]' : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              বাংলা
            </button>
          </div>

          <Link
            to="/dashboard"
            className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-full bg-[#27272A] hover:bg-[#3F3F46] text-white text-[12.5px] font-semibold transition-colors whitespace-nowrap"
          >
            {t('nav.portal')}
          </Link>

          <Link
            to="/api-keys"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#D4F358] hover:bg-[#c5e642] text-[#18181B] text-[12.5px] font-bold transition-colors whitespace-nowrap"
          >
            {t('nav.getApiKey')}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-full bg-[#27272A] text-white"
            aria-label="Toggle product menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#18181B] px-4 py-4 space-y-1.5">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2.5 rounded-full text-[13.5px] font-medium text-white"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/#features"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2.5 rounded-full text-[13.5px] font-medium text-[#A1A1AA]"
          >
            {t('nav.features')}
          </Link>
          <Link
            to="/#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2.5 rounded-full text-[13.5px] font-medium text-[#A1A1AA]"
          >
            {t('nav.howItWorks')}
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2.5 rounded-full text-[13.5px] font-medium text-[#A1A1AA]"
          >
            {t('nav.pricing')}
          </Link>
          <Link
            to="/docs"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2.5 rounded-full text-[13.5px] font-medium text-[#A1A1AA]"
          >
            {t('nav.docs')}
          </Link>
          <div className="pt-2 flex flex-col gap-2">
            <MerchantAuthButtons className="w-full justify-between" />
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="text-center px-4 py-2.5 rounded-full bg-[#27272A] text-white text-[13px] font-semibold"
              >
                {t('nav.portal')}
              </Link>
              <Link
                to="/api-keys"
                onClick={() => setMobileOpen(false)}
                className="text-center px-4 py-2.5 rounded-full bg-[#D4F358] text-[#18181B] text-[13px] font-bold"
              >
                {t('nav.getApiKey')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
