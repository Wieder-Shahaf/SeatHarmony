import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import VenueSelection from './pages/VenueSelection';
import Recommendations from './pages/Recommendations';
import PlannerAI from './pages/PlannerAI';
import Confirmation from './pages/Confirmation';
import ExportDashboard from './pages/ExportDashboard';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/venues" element={<VenueSelection />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/planner" element={<PlannerAI />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/export" element={<ExportDashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;


