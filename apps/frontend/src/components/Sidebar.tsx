import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { theme } from '../theme';
import { api } from '../api/client';

export function Sidebar() {
  const [customerCount, setCustomerCount] = useState<number | null>(null);

  useEffect(() => {
    api.get<any[]>('/api/customers')
      .then(data => setCustomerCount(data.length))
      .catch(err => console.error('Failed to load customer count:', err));
  }, []);

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      )
    },
    {
      name: 'Campaigns',
      path: '/campaigns',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      )
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    }
  ];

  return (
    <div style={{
      width: theme.sidebar.width,
      backgroundColor: theme.colors.bgSidebar,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: theme.spacing.xl,
      boxShadow: theme.shadows.md,
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100
    }}>
      <div>
        {/* Brand Wordmark */}
        <div style={{ marginBottom: theme.spacing['2xl'] }}>
          <h1 style={{
            color: theme.colors.accent,
            fontSize: '13px',
            fontWeight: theme.typography.weightBold,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: theme.typography.fontSans
          }}>
            Roastery Co.
          </h1>
          <p style={{
            color: theme.colors.textTertiary,
            fontSize: '10px',
            fontFamily: theme.typography.fontMono,
            marginTop: '2px'
          }}>
            powered by Xeno Mini
          </p>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color: isActive ? theme.colors.textInverse : 'rgba(248,247,244,0.5)',
                textDecoration: 'none',
                fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizeBase,
                fontWeight: theme.typography.weightMedium,
                borderRadius: theme.radii.sm,
                backgroundColor: isActive ? 'rgba(196,98,45,0.12)' : 'transparent',
                borderLeft: isActive ? `3px solid ${theme.colors.accent}` : '3px solid transparent',
                transition: 'all 0.2s ease',
              })}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Database customer count at bottom */}
      <div style={{
        color: theme.colors.textTertiary,
        fontSize: theme.typography.sizeSm,
        fontFamily: theme.typography.fontMono,
        borderTop: `0.5px solid rgba(248,247,244,0.1)`,
        paddingTop: theme.spacing.md
      }}>
        {customerCount !== null ? (
          <div>Database: {customerCount} customers</div>
        ) : (
          <div>Connecting database...</div>
        )}
      </div>
    </div>
  );
}
