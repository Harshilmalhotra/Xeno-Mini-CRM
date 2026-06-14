import React, { useEffect, useState } from 'react';
import { theme } from '../theme';

interface MessagePreviewerProps {
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  customers: any[];
  campaignGoal: string;
  onLaunch: () => void;
  isLaunching: boolean;
}

export function MessagePreviewer({ channel, customers, campaignGoal, onLaunch, isLaunching }: MessagePreviewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [samples, setSamples] = useState<any[]>([]);

  const channelColors = {
    whatsapp: { bg: theme.colors.whatsappLight, text: theme.colors.whatsapp },
    sms: { bg: theme.colors.smsLight, text: theme.colors.sms },
    email: { bg: theme.colors.emailLight, text: theme.colors.email },
    rcs: { bg: theme.colors.rcsLight, text: theme.colors.rcs },
  };

  const colors = channelColors[channel] || channelColors.whatsapp;

  useEffect(() => {
    setIsLoading(true);
    // Take 5 random customers for preview
    const shuffled = [...customers].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    const timer = setTimeout(() => {
      const parsedSamples = selected.map(c => {
        const product = c.top_product || c.topProduct || 'Seasonal Blend Bag';
        const name = c.name.split(' ')[0];
        
        let text = '';
        if (channel === 'email') {
          text = `Subject: We miss you at Roastery Co., ${name}! ☕\n\nHi ${name},\n\nWe noticed it's been ${c.days_since_last_order} days since your last order of ${product}. We'd love to invite you back to try our new seasonal single-origin roasts. Enjoy 15% off with code ROAST15.\n\nWarmly,\nThe Roastery Co. Team`;
        } else if (channel === 'whatsapp' || channel === 'rcs') {
          text = `Hey ${name}! ☕ It's been a while since you enjoyed a fresh ${product} with us. We'd love to welcome you back! Use code ROAST15 for 15% off your next brew. Hope to see you soon!`;
        } else {
          text = `Roastery Co: Hi ${name}, we miss you! Grab 15% off your next order (including ${product}) with code ROAST15 at checkout. https://roastery.co`;
        }

        return {
          id: c.id,
          name: c.name,
          initials: c.name.split(' ').map((n: string) => n[0]).join(''),
          message: text,
          topProduct: product
        };
      });
      setSamples(parsedSamples);
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [customers, channel, campaignGoal]);

  return (
    <div style={{
      backgroundColor: theme.colors.bgPrimary,
      border: `0.5px solid ${theme.colors.borderDefault}`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.xl,
      boxShadow: theme.shadows.sm,
      marginBottom: theme.spacing.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.lg
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md }}>
        <div>
          <h3 style={{ fontSize: theme.typography.sizeLg, fontWeight: theme.typography.weightBold }}>
            AI-Personalized Message Previews
          </h3>
          <p style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, marginTop: '2px' }}>
            Previewing 5 random customer copies before sending.
          </p>
        </div>

        {/* Selected Channel Pill */}
        <span style={{
          backgroundColor: colors.bg,
          color: colors.text,
          padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
          borderRadius: theme.radii.full,
          fontSize: theme.typography.sizeSm,
          fontWeight: theme.typography.weightBold,
          textTransform: 'uppercase',
          border: `1px solid ${colors.text}`
        }}>
          {channel}
        </span>
      </div>

      {/* Grid of 5 Sample Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: theme.spacing.md
      }}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} style={{
              border: `1.5px dashed ${theme.colors.borderDefault}`,
              borderRadius: theme.radii.md,
              padding: theme.spacing.md,
              height: '180px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              animation: 'shimmer 1.5s infinite linear',
              background: `linear-gradient(90deg, ${theme.colors.bgSecondary} 25%, ${theme.colors.bgTertiary} 50%, ${theme.colors.bgSecondary} 75%)`,
              backgroundSize: '200% 100%'
            }}>
              <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: theme.radii.full, backgroundColor: theme.colors.bgTertiary }} />
                <div style={{ width: '60px', height: '12px', backgroundColor: theme.colors.bgTertiary, borderRadius: theme.radii.sm }} />
              </div>
              <div style={{ height: '70px', backgroundColor: theme.colors.bgTertiary, borderRadius: theme.radii.sm }} />
              <div style={{ width: '80px', height: '14px', backgroundColor: theme.colors.bgTertiary, borderRadius: theme.radii.sm }} />
            </div>
          ))
        ) : (
          samples.map((s) => (
            <div key={s.id} style={{
              border: `1px solid ${theme.colors.borderDefault}`,
              borderRadius: theme.radii.md,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.bgSecondary,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
              minHeight: '200px'
            }}>
              {/* User Header */}
              <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: theme.radii.full,
                  backgroundColor: theme.colors.accentLight,
                  color: theme.colors.accentDark,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: theme.typography.weightBold,
                  fontSize: theme.typography.sizeSm
                }}>
                  {s.initials}
                </div>
                <div style={{ fontWeight: theme.typography.weightBold, fontSize: theme.typography.sizeBase, color: theme.colors.textPrimary }}>
                  {s.name}
                </div>
              </div>

              {/* Speech Bubble Box */}
              <div style={{
                flex: 1,
                backgroundColor: theme.colors.bgPrimary,
                borderRadius: theme.radii.md,
                padding: theme.spacing.sm,
                fontSize: '13px',
                lineHeight: '1.4',
                color: theme.colors.textSecondary,
                border: `0.5px solid ${theme.colors.borderDefault}`,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                whiteSpace: 'pre-line'
              }}>
                {s.message}
              </div>

              {/* Top Product Tag */}
              <div>
                <span style={{
                  backgroundColor: theme.colors.bgTertiary,
                  color: theme.colors.textSecondary,
                  fontSize: '11px',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.radii.sm,
                  fontWeight: theme.typography.weightMedium
                }}>
                  🏷 {s.topProduct}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Launch Action */}
      <button
        onClick={onLaunch}
        disabled={isLaunching || isLoading}
        style={{
          marginTop: theme.spacing.md,
          backgroundColor: theme.colors.accent,
          color: theme.colors.textInverse,
          border: 'none',
          outline: 'none',
          borderRadius: theme.radii.md,
          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
          cursor: isLaunching || isLoading ? 'not-allowed' : 'pointer',
          fontSize: theme.typography.sizeMd,
          fontWeight: theme.typography.weightBold,
          width: '100%',
          textAlign: 'center',
          boxShadow: theme.shadows.sm,
          transition: 'all 0.15s ease'
        }}
        onMouseDown={(e) => {
          if (!isLaunching && !isLoading) e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isLaunching ? 'Launching campaign...' : `Launch campaign to ${customers.length} customers →`}
      </button>
    </div>
  );
}
