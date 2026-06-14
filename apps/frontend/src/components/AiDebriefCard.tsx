import React from 'react';
import { theme } from '../theme';
import { Clock } from 'lucide-react';

interface AiDebriefCardProps {
  campaignName: string;
  debrief: {
    summary: string;
    bestChannel: string | null;
    recommendation: string;
    bestSendTime: string | null;
    clickNoBuyCount?: number;
  };
  onLaunchFollowUp: (query: string) => void;
}

export function AiDebriefCard({ campaignName, debrief, onLaunchFollowUp }: AiDebriefCardProps) {
  const channelColors: Record<string, { bg: string, text: string }> = {
    whatsapp: { bg: theme.colors.whatsappLight, text: theme.colors.whatsapp },
    sms: { bg: theme.colors.smsLight, text: theme.colors.sms },
    email: { bg: theme.colors.emailLight, text: theme.colors.email },
    rcs: { bg: theme.colors.rcsLight, text: theme.colors.rcs },
  };

  const channelColor = debrief.bestChannel && channelColors[debrief.bestChannel.toLowerCase()] 
    ? channelColors[debrief.bestChannel.toLowerCase()] 
    : { bg: theme.colors.accentLight, text: theme.colors.accent };

  const handleFollowUp = () => {
    const query = `Customers who clicked but didn't order in the ${campaignName} campaign`;
    onLaunchFollowUp(query);
  };

  return (
    <div style={{
      backgroundColor: theme.colors.bgPrimary,
      border: `0.5px solid ${theme.colors.borderDefault}`,
      borderLeft: `3px solid ${theme.colors.accent}`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.xl,
      boxShadow: theme.shadows.md,
      marginBottom: theme.spacing.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.md
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
          Campaign Debrief
        </span>
      </div>

      {/* Summary */}
      <p style={{
        fontSize: theme.typography.sizeBase,
        lineHeight: theme.typography.lineHeightBase,
        color: theme.colors.textPrimary
      }}>
        {debrief.summary}
      </p>

      {/* Stats Row */}
      <div style={{
        display: 'flex',
        gap: theme.spacing.xl,
        margin: `${theme.spacing.sm} 0`,
        flexWrap: 'wrap'
      }}>
        {debrief.bestChannel && (
          <div>
            <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}>Best Channel</div>
            <span style={{
              backgroundColor: channelColor.bg,
              color: channelColor.text,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.radii.full,
              fontSize: '11px',
              fontWeight: theme.typography.weightBold,
              textTransform: 'uppercase'
            }}>
              {debrief.bestChannel}
            </span>
          </div>
        )}

        {debrief.bestSendTime && (
          <div>
            <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}>Best Send Time</div>
            <span style={{
              fontFamily: theme.typography.fontMono,
              fontSize: theme.typography.sizeSm,
              color: theme.colors.textPrimary,
              fontWeight: theme.typography.weightMedium
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} style={{ color: theme.colors.textSecondary }} />
                <span>{debrief.bestSendTime}</span>
              </span>
            </span>
          </div>
        )}

        {debrief.clickNoBuyCount !== undefined && (
          <div>
            <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}>Clicked (No purchase)</div>
            <span style={{
              fontFamily: theme.typography.fontMono,
              fontSize: theme.typography.sizeSm,
              color: theme.colors.danger,
              fontWeight: theme.typography.weightBold
            }}>
              ⚠️ {debrief.clickNoBuyCount} customers
            </span>
          </div>
        )}
      </div>

      {/* Recommendation Block */}
      <div style={{
        backgroundColor: theme.colors.accentLight,
        borderRadius: theme.radii.md,
        padding: theme.spacing.md,
        border: `0.5px solid ${theme.colors.borderAccent}`
      }}>
        <h4 style={{ fontSize: theme.typography.sizeSm, fontWeight: theme.typography.weightBold, color: theme.colors.accentDark, marginBottom: '2px' }}>
          AI Recommendation:
        </h4>
        <p style={{ fontSize: theme.typography.sizeBase, color: theme.colors.textPrimary }}>
          {debrief.recommendation}
        </p>
      </div>

      {/* Call to Action */}
      <button
        onClick={handleFollowUp}
        style={{
          backgroundColor: theme.colors.accent,
          color: theme.colors.textInverse,
          border: 'none',
          outline: 'none',
          borderRadius: theme.radii.md,
          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
          cursor: 'pointer',
          fontSize: theme.typography.sizeBase,
          fontWeight: theme.typography.weightBold,
          boxShadow: theme.shadows.sm,
          transition: 'all 0.15s ease',
          alignSelf: 'flex-start',
          marginTop: theme.spacing.sm
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Launch follow-up campaign →
      </button>
    </div>
  );
}
