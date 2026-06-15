import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { api } from './api/client';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Campaigns } from './pages/Campaigns';
import { Customers } from './pages/Customers';
import { Analytics } from './pages/Analytics';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';

export default function App() {
  useEffect(() => {
    // Preload data for all pages so it instantly shows up
    api.get('/api/customers').catch(() => {});
    api.get('/api/campaigns').catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Layout>
      <VercelAnalytics />
    </BrowserRouter>
  );
}
