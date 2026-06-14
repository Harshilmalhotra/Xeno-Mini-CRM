import React, { useState } from 'react';
import { theme } from '../theme';

interface ChurnRingBadgeProps {
  risk: 'low' | 'medium' | 'high';
  score: number;
  size?: number;
}

export function ChurnRingBadge({ risk, score, size = 36 }: ChurnRingBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const colorMap = {
    low: theme.colors.churnLow,
    medium: theme.colors.churnMedium,
    high: theme.colors.churnHigh
  };

  const color = colorMap[risk] || theme.colors.churnLow;

  const strokeWidth = size * 0.12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'help'
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={theme.colors.bgTertiary}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.35s ease' }}
        />
      </svg>
      {/* Inner score label */}
      <span style={{
        position: 'absolute',
        fontSize: `${size * 0.3}px`,
        fontWeight: theme.typography.weightBold,
        fontFamily: theme.typography.fontMono,
        color: theme.colors.textPrimary
      }}>
        {score}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: '125%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: theme.colors.bgSidebar,
          color: theme.colors.textInverse,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderRadius: theme.radii.sm,
          fontSize: '11px',
          fontFamily: theme.typography.fontSans,
          whiteSpace: 'nowrap',
          boxShadow: theme.shadows.md,
          zIndex: 10
        }}>
          Risk: <span style={{ textTransform: 'capitalize', fontWeight: theme.typography.weightBold, color }}>{risk}</span> ({score}%)
        </div>
      )}
    </div>
  );
}
