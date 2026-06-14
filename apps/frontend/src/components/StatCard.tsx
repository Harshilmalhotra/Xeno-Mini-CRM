import React from 'react';
import { theme } from '../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
}

export function StatCard({ title, value, trend, isPositive = true }: StatCardProps) {
  return (
    <div style={{
      backgroundColor: theme.colors.bgPrimary,
      border: `0.5px solid ${theme.colors.borderDefault}`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.xl,
      boxShadow: theme.shadows.sm,
      flex: 1,
      minWidth: '200px',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.xs
    }}>
      <span style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, fontWeight: theme.typography.weightMedium }}>
        {title}
      </span>
      <div style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
        {value}
      </div>
      {trend && (
        <span style={{
          fontSize: '11px',
          color: isPositive ? theme.colors.success : theme.colors.danger,
          fontWeight: theme.typography.weightBold
        }}>
          {isPositive ? '▲' : '▼'} {trend}
        </span>
      )}
    </div>
  );
}
