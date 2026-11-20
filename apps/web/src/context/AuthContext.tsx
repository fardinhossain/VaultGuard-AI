import React, { createContext, useContext, useState } from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
  useClerk,
} from '@clerk/clerk-react';
import { Check, Copy, ExternalLink, KeyRound, Sparkles, User, X } from 'lucide-react';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const isRealClerkConfigured = Boolean(
  CLERK_PUBLISHABLE_KEY &&
    CLERK_PUBLISHABLE_KEY.startsWith('pk_') &&
    !CLERK_PUBLISHABLE_KEY.includes('your_actual_publishable_key') &&
    !CLERK_PUBLISHABLE_KEY.includes('your_clerk_publishable_key')
);

export interface MerchantUser {
  id: string;
  email: string;
  fullName: string;
  storeName: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  isConfigured: boolean;
  isDemoMode: boolean;
  currentUser: MerchantUser;
  openConfigModal: () => void;
  closeConfigModal: () => void;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  isConfigModalOpen: boolean;
  isRegisterModalOpen: boolean;
}

const DEFAULT_DEMO_USER: MerchantUser = {
  id: 'usr_merchant_demo',
  email: 'nidraferen@gmail.com',
  fullName: 'Nidra Feren',
  storeName: 'Shwapno SuperShop (Gulshan-2)',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useMerchantAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useMerchantAuth must be used within AppAuthProvider');
  }
  return ctx;
};

// Internal inner provider for Clerk-connected sessions
const ClerkBridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const [isConfigModalOpen, setConfigModalOpen] = useState(false);
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);

  const currentUser: MerchantUser = {
    id: user?.id ?? DEFAULT_DEMO_USER.id,
    email: user?.primaryEmailAddress?.emailAddress ?? DEFAULT_DEMO_USER.email,
    fullName: user?.fullName ?? user?.firstName ?? DEFAULT_DEMO_USER.fullName,
    storeName: (user?.publicMetadata?.storeName as string) ?? DEFAULT_DEMO_USER.storeName,
    avatarUrl: user?.imageUrl ?? DEFAULT_DEMO_USER.avatarUrl,
  };

  return (
    <AuthContext.Provider
      value={{
        isConfigured: true,
        isDemoMode: false,
        currentUser,
        openConfigModal: () => setConfigModalOpen(true),
        closeConfigModal: () => setConfigModalOpen(false),
        openRegisterModal: () => setRegisterModalOpen(true),
        closeRegisterModal: () => setRegisterModalOpen(false),
        isConfigModalOpen,
        isRegisterModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AppAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConfigModalOpen, setConfigModalOpen] = useState(false);
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (isRealClerkConfigured && CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ClerkBridgeProvider>{children}</ClerkBridgeProvider>
      </ClerkProvider>
    );
  }

  // Fallback turnkey mode (No Clerk Key configured yet)
  const copyEnvSnippet = () => {
    navigator.clipboard.writeText('VITE_CLERK_PUBLISHABLE_KEY=pk_test_...\nCLERK_SECRET_KEY=sk_test_...');
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  return (
    <AuthContext.Provider
      value={{
        isConfigured: false,
        isDemoMode: true,
        currentUser: DEFAULT_DEMO_USER,
        openConfigModal: () => setConfigModalOpen(true),
        closeConfigModal: () => setConfigModalOpen(false),
        openRegisterModal: () => setRegisterModalOpen(true),
        closeRegisterModal: () => setRegisterModalOpen(false),
        isConfigModalOpen,
        isRegisterModalOpen,
      }}
    >
      {children}

      {/* Clerk Manual Setup Helper Modal */}
      {(isConfigModalOpen || isRegisterModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#18181B] text-white border border-white/10 rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                setConfigModalOpen(false);
                setRegisterModalOpen(false);
              }}
              className="absolute top-5 right-5 text-[#A1A1AA] hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D4F358] text-[#18181B] flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold">SuperShop Merchant Authentication (Clerk)</h3>
                <p className="text-[12px] text-[#A1A1AA]">
                  {isRealClerkConfigured ? 'Clerk Live Connected' : 'Running in Turnkey Demo Mode'}
                </p>
              </div>
            </div>

            <div className="space-y-4 my-5 text-[13px] text-[#D4D4D8]">
              <div className="bg-[#27272A] p-4 rounded-[20px] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Active Store Profile:</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#D4F358] text-[#18181B] font-bold">
                    Demo Active
                  </span>
                </div>
                <div className="text-[12px] text-[#A1A1AA] space-y-1">
                  <div><strong>Merchant:</strong> {DEFAULT_DEMO_USER.fullName} ({DEFAULT_DEMO_USER.email})</div>
                  <div><strong>Store:</strong> {DEFAULT_DEMO_USER.storeName}</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-white text-[13.5px]">To connect your real Clerk instance:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-[12.5px] text-[#A1A1AA]">
                  <li>Create a free app at <a href="https://clerk.com" target="_blank" rel="noreferrer" className="text-[#D4F358] underline inline-flex items-center gap-0.5">clerk.com <ExternalLink className="w-3 h-3 inline" /></a></li>
                  <li>Copy your <strong>Publishable Key</strong> from Clerk Dashboard &gt; API Keys</li>
                  <li>Paste it into <code className="text-[#D4F358] bg-black/40 px-1 py-0.5 rounded">apps/web/.env</code>:</li>
                </ol>
              </div>

              <div className="bg-[#09090B] border border-white/10 rounded-[16px] p-3 font-mono text-[11.5px] relative">
                <p className="text-[#A1A1AA]"># apps/web/.env</p>
                <p className="text-[#D4F358]">VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</p>
                <button
                  type="button"
                  onClick={copyEnvSnippet}
                  className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedEnv ? <Check className="w-3.5 h-3.5 text-[#D4F358]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedEnv ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11.5px] text-[#A1A1AA]">
                Full API key generation & encryption work out of the box.
              </span>
              <button
                type="button"
                onClick={() => {
                  setConfigModalOpen(false);
                  setRegisterModalOpen(false);
                }}
                className="px-4 py-2 rounded-full bg-[#D4F358] text-[#18181B] text-[12.5px] font-bold hover:bg-[#c5e642] cursor-pointer"
              >
                Continue in Demo Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

// Clean UI Drop-in for Navbar / Headers
export const MerchantAuthButtons: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isConfigured, openConfigModal, openRegisterModal, currentUser } = useMerchantAuth();

  if (isConfigured) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <SignedIn>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-8 h-8 rounded-full border border-white/20',
              },
            }}
          />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="px-4 py-1.5 rounded-full bg-[#D4F358] text-[#18181B] text-[12.5px] font-bold hover:bg-[#c5e642] transition-colors cursor-pointer"
            >
              Register Shop
            </button>
          </SignUpButton>
        </SignedOut>
      </div>
    );
  }

  // Turnkey demo mode buttons
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={openConfigModal}
        className="px-3 py-1.5 rounded-full text-[12px] font-medium text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
        title="Clerk Auth Configuration"
      >
        <User className="w-3.5 h-3.5 text-[#D4F358]" />
        Sign In
      </button>
      <button
        type="button"
        onClick={openRegisterModal}
        className="px-3.5 py-1.5 rounded-full bg-[#D4F358] text-[#18181B] text-[12px] font-bold hover:bg-[#c5e642] transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Register Shop
      </button>
    </div>
  );
};
