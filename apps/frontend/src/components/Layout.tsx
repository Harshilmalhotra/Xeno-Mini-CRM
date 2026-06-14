import React from 'react';
import { Sidebar } from './Sidebar';
import { theme } from '../theme';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.bgTertiary }}>
      <Sidebar />
      <main style={{
        marginLeft: theme.sidebar.width,
        flex: 1,
        padding: '32px',
        minHeight: '100vh',
        boxSizing: 'border-box'
      }}>
        {children}
      </main>
    </div>
  );
}
