import React, { useState, useEffect } from 'react';
import { theme } from '../theme';
import { api } from '../api/client';

interface IntentBarProps {
  onSuccess: (data: any, query: string) => void;
  prefilledQuery?: string;
}

export function IntentBar({ onSuccess, prefilledQuery = '' }: IntentBarProps) {
  const [nlQuery, setNlQuery] = useState(prefilledQuery);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (prefilledQuery) {
      setNlQuery(prefilledQuery);
    }
  }, [prefilledQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;

    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await api.post<any>('/api/segments/preview', { nlQuery });
      setStatus('idle');
      onSuccess(data, nlQuery);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'AI was unable to generate the segment filter. Please try a different query.');
    }
  };

  return (
    <div style={{ width: '100%', marginBottom: theme.spacing.xl }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        alignItems: 'center',
        background: theme.colors.bgPrimary,
        border: `1px solid ${isFocused ? theme.colors.accent : (isHovered ? theme.colors.borderStrong : theme.colors.borderDefault)}`,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.sm,
        boxShadow: theme.shadows.sm,
        transition: 'all 0.2s ease',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Left Side Sparkle/AI Icon */}
        <div style={{ padding: `0 ${theme.spacing.sm}`, color: theme.colors.accent, display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.32 11.32l.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
          </svg>
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={nlQuery}
          onChange={(e) => setNlQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={status === 'loading'}
          placeholder="Describe who you want to reach — e.g. 'Customers who haven't ordered in 60 days'"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: theme.typography.sizeMd,
            fontFamily: theme.typography.fontSans,
            color: theme.colors.textPrimary,
            backgroundColor: 'transparent',
            padding: theme.spacing.sm
          }}
        />

        {/* Action Button */}
        <button
          type="submit"
          disabled={status === 'loading' || !nlQuery.trim()}
          style={{
            backgroundColor: theme.colors.accent,
            color: theme.colors.textInverse,
            border: 'none',
            outline: 'none',
            borderRadius: theme.radii.md,
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            fontFamily: theme.typography.fontSans,
            fontSize: theme.typography.sizeBase,
            fontWeight: theme.typography.weightMedium,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: status === 'loading' || !nlQuery.trim() ? 0.6 : 1,
            transition: 'all 0.1s ease',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs
          }}
          onMouseDown={(e) => {
            if (status !== 'loading' && nlQuery.trim()) {
              e.currentTarget.style.transform = 'scale(0.98)';
            }
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {status === 'loading' ? 'Generating…' : 'Generate segment →'}
        </button>
      </form>

      {/* Loading animation state */}
      {status === 'loading' && (
        <div style={{
          marginTop: theme.spacing.md,
          height: '4px',
          width: '100%',
          backgroundColor: theme.colors.bgTertiary,
          borderRadius: theme.radii.full,
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            height: '100%',
            width: '40%',
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radii.full,
            animation: 'pulse 1.5s infinite ease-in-out'
          }} />
          <style>{`
            @keyframes pulse {
              0% { left: -40%; }
              50% { left: 40%; width: 60%; }
              100% { left: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.dangerLight,
          borderLeft: `4px solid ${theme.colors.danger}`,
          borderRadius: theme.radii.sm,
          color: theme.colors.danger,
          fontFamily: theme.typography.fontSans,
          fontSize: theme.typography.sizeBase
        }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}
