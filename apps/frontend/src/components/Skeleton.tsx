import React from 'react';
import { theme } from '../theme';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = '20px', borderRadius = theme.radii.sm, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: theme.colors.bgTertiary,
        backgroundImage: `linear-gradient(90deg, ${theme.colors.bgTertiary} 0px, ${theme.colors.borderDefault} 40px, ${theme.colors.bgTertiary} 80px)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite linear',
        ...style
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      backgroundColor: theme.colors.bgPrimary,
      border: `0.5px solid ${theme.colors.borderDefault}`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.xl,
      boxShadow: theme.shadows.sm,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.md
    }}>
      <Skeleton width="40%" height="24px" />
      <Skeleton width="100%" height="16px" />
      <Skeleton width="80%" height="16px" />
      <div style={{ marginTop: theme.spacing.md, display: 'flex', gap: theme.spacing.md }}>
        <Skeleton width="60px" height="60px" borderRadius={theme.radii.full} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, justifyContent: 'center' }}>
          <Skeleton width="50%" height="16px" />
          <Skeleton width="30%" height="14px" />
        </div>
      </div>
    </div>
  );
}
