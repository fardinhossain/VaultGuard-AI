import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppAuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ObsidianFrame } from './components/layout/ObsidianFrame';
import { ProductLayout } from './components/layout/ProductLayout';
import { AccessControlPage } from './pages/AccessControlPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocsPage } from './pages/DocsPage';
import { LandingPage } from './pages/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { SentinelPage } from './pages/SentinelPage';
import { StoreSandboxPage } from './pages/StoreSandboxPage';

export function App() {
  return (
    <AppAuthProvider>
      <I18nProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Commercial SaaS Website */}
              <Route
                path="/"
                element={
                  <ProductLayout>
                    <LandingPage />
                  </ProductLayout>
                }
              />
              <Route
                path="/pricing"
                element={
                  <ProductLayout>
                    <PricingPage />
                  </ProductLayout>
                }
              />
              <Route
                path="/docs"
                element={
                  <ProductLayout>
                    <DocsPage />
                  </ProductLayout>
                }
              />

              {/* Merchant Security Portal (Zero-Storage Console) */}
              <Route
                path="/dashboard"
                element={
                  <ObsidianFrame>
                    <DashboardPage />
                  </ObsidianFrame>
                }
              />
              <Route
                path="/api-keys"
                element={
                  <ObsidianFrame>
                    <ApiKeysPage />
                  </ObsidianFrame>
                }
              />
              <Route
                path="/simulator"
                element={
                  <ObsidianFrame>
                    <StoreSandboxPage />
                  </ObsidianFrame>
                }
              />
              <Route
                path="/playground"
                element={
                  <ObsidianFrame>
                    <StoreSandboxPage />
                  </ObsidianFrame>
                }
              />
              <Route
                path="/store-sandbox"
                element={
                  <ObsidianFrame>
                    <StoreSandboxPage />
                  </ObsidianFrame>
                }
              />
              <Route
                path="/sentinel"
                element={
                  <ObsidianFrame>
                    <SentinelPage />
                  </ObsidianFrame>
                }
              />
              <Route
                path="/access"
                element={
                  <ObsidianFrame>
                    <AccessControlPage />
                  </ObsidianFrame>
                }
              />
              <Route
                path="/audit"
                element={
                  <ObsidianFrame>
                    <AuditLogsPage />
                  </ObsidianFrame>
                }
              />

              {/* Redirect legacy routes to the SuperShop Database Simulator */}
              <Route path="/vault" element={<Navigate to="/simulator" replace />} />
              <Route path="/breach" element={<Navigate to="/simulator" replace />} />
              <Route path="/architecture" element={<Navigate to="/docs" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </WorkspaceProvider>
      </I18nProvider>
    </AppAuthProvider>
  );
}

export default App;
