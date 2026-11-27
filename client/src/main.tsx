import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store';
import { AuthProvider } from './auth';
import { Layout } from './components/Layout';
import { TodayPage } from './pages/Today';
import { DashboardPage } from './pages/Dashboard';
import { RoadmapPage } from './pages/Roadmap';
import { DsaPage } from './pages/Dsa';
import { MachineCodingPage } from './pages/MachineCoding';
import { SystemDesignPage } from './pages/SystemDesign';
import { JsPage } from './pages/JsOutput';
import { TheoryPage } from './pages/Theory';
import { MocksPage } from './pages/Mocks';
import { RevisionPage } from './pages/Revision';
import { ScorecardPage } from './pages/Scorecard';
import { CompaniesPage } from './pages/Companies';
import { SettingsPage } from './pages/Settings';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
      <StoreProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="day/:day" element={<TodayPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="roadmap" element={<RoadmapPage />} />
            <Route path="dsa" element={<DsaPage />} />
            <Route path="machine-coding" element={<MachineCodingPage />} />
            <Route path="system-design" element={<SystemDesignPage />} />
            <Route path="js" element={<JsPage />} />
            <Route path="theory" element={<Navigate to="/theory/react" replace />} />
            <Route path="theory/:bank" element={<TheoryPage />} />
            <Route path="mocks" element={<MocksPage />} />
            <Route path="revision" element={<RevisionPage />} />
            <Route path="scorecard" element={<ScorecardPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
        </Routes>
      </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
