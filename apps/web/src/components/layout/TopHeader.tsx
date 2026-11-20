import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, KeyRound, Menu, Plus, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ActorRole, vaultApi } from '../../lib/api';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const { lang, setLang, t } = useI18n();
  const {
    tenants,
    tenantId,
    activeTenant,
    actorRole,
    summary,
    setTenantId,
    setActorRole,
    triggerRefresh,
    showToast,
  } = useWorkspace();

  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const [newStoreOpen, setNewStoreOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreEmail, setNewStoreEmail] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const navigate = useNavigate();

  const planTier = (summary?.plan?.tier ?? activeTenant?.planTier ?? 'basic').toUpperCase();

  const handleRegisterStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newStoreEmail.trim()) return;
    setCreatingStore(true);
    try {
      const created = await vaultApi.createTenant({
        name: newStoreName.trim(),
        industry: 'E-Commerce & Retail',
        contactEmail: newStoreEmail.trim(),
        planTier: 'free',
      });
      setNewStoreName('');
      setNewStoreEmail('');
      setNewStoreOpen(false);
      setTenantMenuOpen(false);
      triggerRefresh();
      setTenantId(created.tenantId);
      showToast(
        'success',
        `Store '${created.name}' Registered`,
        `Tenant ${created.tenantId} initialized on FREE plan with isolated KEK v1.`,
      );
    } catch (err) {
      showToast('danger', 'Registration Failed', err instanceof Error ? err.message : undefined);
    } finally {
      setCreatingStore(false);
    }
  };

  const alertCount = summary?.sentinel.hasActiveBlock
    ? summary.sentinel.activeBlockedSessions.length
    : summary?.sentinel.blockedCount ?? 0;

  const tenantInitials = activeTenant
    ? activeTenant.name
        .split(' ')
        .slice(0, 2)
        .map((s) => s[0])
        .join('')
        .toUpperCase()
    : 'VG';

  const roles: Array<{ id: ActorRole; label: string }> = [
    { id: 'admin', label: t('role.short.admin') },
    { id: 'delivery', label: t('role.short.delivery') },
    { id: 'marketing', label: t('role.short.marketing') },
  ];

  return (
    <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 mb-6">
      {/* Left Cluster: Mobile Menu + Tenant Switcher + Role Pills + EN/BN Toggle */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden w-10 h-10 rounded-full bg-white border border-[#E4E4E7] flex items-center justify-center text-[#111827]"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tenant Dropdown Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTenantMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 bg-white border border-[#E4E4E7] rounded-full pl-1.5 pr-3.5 py-1.5 hover:border-[#18181B]/30 transition-colors cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-[#18181B] text-[#D4F358] text-xs font-bold flex items-center justify-center shrink-0">
              {tenantInitials}
            </span>
            <div className="text-left leading-tight">
              <div className="text-[13px] font-semibold text-[#111827]">
                {activeTenant?.name ?? 'SuperShop BD'}
              </div>
              <div className="text-[11px] text-[#71717A] hidden sm:block">
                {activeTenant?.contactEmail ?? 'admin@supershop.bd'} · KEK v
                {summary?.activeKeyVersion ?? activeTenant?.activeKeyVersion ?? 1}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#71717A] ml-0.5" />
          </button>

          {tenantMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setTenantMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute left-0 mt-2 w-80 bg-white rounded-[20px] border border-[#E4E4E7] shadow-lg p-2.5 z-30">
                <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Isolated Merchant Tenants
                </p>
                {tenants.map((tenant) => {
                  const selected = tenant.tenantId === tenantId;
                  return (
                    <button
                      key={tenant.tenantId}
                      type="button"
                      onClick={() => {
                        setTenantId(tenant.tenantId);
                        setTenantMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-[14px] flex items-center justify-between transition-colors cursor-pointer ${
                        selected ? 'bg-[#ECECEE] font-semibold' : 'hover:bg-[#ECECEE]/60'
                      }`}
                    >
                      <div>
                        <div className="text-[13px] text-[#111827]">{tenant.name}</div>
                        <div className="text-[11px] text-[#71717A]">{tenant.industry}</div>
                      </div>
                      <span className="text-[11px] font-mono-crypto bg-[#18181B] text-[#D4F358] px-2 py-0.5 rounded-full">
                        v{tenant.activeKeyVersion}
                      </span>
                    </button>
                  );
                })}

                <div className="mt-2 pt-2 border-t border-[#E4E4E7]">
                  {!newStoreOpen ? (
                    <button
                      type="button"
                      onClick={() => setNewStoreOpen(true)}
                      className="w-full px-3 py-2 rounded-[12px] bg-[#ECECEE] hover:bg-[#D4F358] text-[#111827] text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Register External Store
                    </button>
                  ) : (
                    <form onSubmit={handleRegisterStore} className="space-y-2 p-1">
                      <input
                        required
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        placeholder="Store Name (e.g. MyShop BD)"
                        className="w-full rounded-[10px] border border-[#E4E4E7] px-2.5 py-1.5 text-[12px]"
                      />
                      <input
                        required
                        type="email"
                        value={newStoreEmail}
                        onChange={(e) => setNewStoreEmail(e.target.value)}
                        placeholder="owner@myshop.bd"
                        className="w-full rounded-[10px] border border-[#E4E4E7] px-2.5 py-1.5 text-[12px]"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="submit"
                          disabled={creatingStore}
                          className="flex-1 py-1.5 rounded-full bg-[#18181B] text-[#D4F358] text-[11.5px] font-bold cursor-pointer"
                        >
                          {creatingStore ? 'Creating...' : 'Create Store'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewStoreOpen(false)}
                          className="px-3 py-1.5 rounded-full bg-[#ECECEE] text-[11.5px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Active Plan Quick Pill */}
        <Link
          to="/pricing"
          className="px-3 py-1.5 rounded-full bg-[#D4F358] hover:bg-[#c5e642] text-[#18181B] text-[11.5px] font-bold tracking-wide transition-colors"
        >
          {planTier} · Plan
        </Link>

        {/* Instant Role Switcher Pills */}
        <div
          className="inline-flex items-center bg-white border border-[#E4E4E7] rounded-full p-1 gap-0.5"
          role="group"
          aria-label="Active Role Switcher"
        >
          {roles.map((r) => {
            const active = actorRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActorRole(r.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#18181B] text-white'
                    : 'text-[#71717A] hover:text-[#111827]'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* EN / বাংলা Segmented Toggle */}
        <div
          className="inline-flex items-center bg-white border border-[#E4E4E7] rounded-full p-1"
          role="group"
          aria-label="Language Switcher"
        >
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
              lang === 'en' ? 'bg-[#D4F358] text-[#18181B]' : 'text-[#71717A] hover:text-[#111827]'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('bn')}
            className={`px-2.5 py-1 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
              lang === 'bn' ? 'bg-[#D4F358] text-[#18181B]' : 'text-[#71717A] hover:text-[#111827]'
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>

      {/* Right Cluster: Get API Key Pill + Security Alert Bell */}
      <div className="flex items-center gap-2.5">
        <Link
          to="/api-keys"
          className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13px] font-bold transition-colors whitespace-nowrap"
        >
          <KeyRound className="w-4 h-4" />
          {t('nav.getApiKey')}
        </Link>

        <button
          type="button"
          onClick={() => navigate('/sentinel')}
          title="AI Threat Monitor & Alerts"
          className="relative w-11 h-11 rounded-full bg-white border border-[#E4E4E7] flex items-center justify-center hover:border-[#18181B]/30 transition-colors shrink-0 cursor-pointer"
        >
          {summary?.sentinel.hasActiveBlock ? (
            <ShieldAlert className="w-5 h-5 text-[#F43F5E]" />
          ) : (
            <Bell className="w-5 h-5 text-[#111827]" />
          )}
          <span
            className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${
              summary?.sentinel.hasActiveBlock
                ? 'bg-[#F43F5E] text-white'
                : 'bg-[#D4F358] text-[#18181B]'
            }`}
          >
            {alertCount}
          </span>
        </button>
      </div>
    </header>
  );
};
