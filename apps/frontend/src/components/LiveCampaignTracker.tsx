import React, { useEffect, useState } from 'react';
import { theme } from '../theme';
import { useCampaignSocket } from '../hooks/useCampaignSocket';

interface LiveCampaignTrackerProps {
  campaignId: string;
  campaignName: string;
  initialStats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    failed: number;
  };
  totalCustomers: number;
  onCompleted?: () => void;
}

interface EventFeedItem {
  id: string;
  customerName: string;
  initials: string;
  event: string;
  timestamp: Date;
}

export function LiveCampaignTracker({
  campaignId,
  campaignName,
  initialStats,
  totalCustomers,
  onCompleted
}: LiveCampaignTrackerProps) {
  const [stats, setStats] = useState({
    sent: initialStats?.sent || totalCustomers,
    delivered: initialStats?.delivered || 0,
    opened: initialStats?.opened || 0,
    clicked: initialStats?.clicked || 0,
    converted: initialStats?.converted || 0,
    failed: initialStats?.failed || 0,
  });

  const [feed, setFeed] = useState<EventFeedItem[]>([]);
  const [increments, setIncrements] = useState<Record<string, boolean>>({});
  
  useCampaignSocket((data) => {
    if (data.type === 'message_update' && data.campaignId === campaignId) {
      const { customerName, event, stats: newStats } = data;
      
      setStats((prev) => {
        const changed: Record<string, boolean> = {};
        if (newStats.delivered > prev.delivered) changed.delivered = true;
        if (newStats.opened > prev.opened) changed.opened = true;
        if (newStats.clicked > prev.clicked) changed.clicked = true;
        if (newStats.converted > prev.converted) changed.converted = true;
        if (newStats.failed > prev.failed) changed.failed = true;
        
        setIncrements(changed);
        setTimeout(() => {
          setIncrements((curr) => {
            const next = { ...curr };
            Object.keys(changed).forEach((k) => delete next[k]);
            return next;
          });
        }, 1000);

        return {
          sent: newStats.sent,
          delivered: newStats.delivered,
          opened: newStats.opened,
          clicked: newStats.clicked,
          converted: newStats.converted,
          failed: newStats.failed,
        };
      });

      setFeed((prevFeed) => {
        const item: EventFeedItem = {
          id: Math.random().toString(),
          customerName,
          initials: customerName.split(' ').map((n: string) => n[0]).join(''),
          event,
          timestamp: new Date()
        };
        return [item, ...prevFeed].slice(0, 8);
      });
    }

    if (data.type === 'campaign_completed' && data.campaignId === campaignId) {
      if (onCompleted) {
        onCompleted();
      }
    }
  });

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    return `${seconds}s ago`;
  };

  const [, setTicker] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const totalCompleted = stats.delivered + stats.failed;
  const progressPercent = stats.sent > 0 
    ? Math.min(100, Math.round((totalCompleted / stats.sent) * 100)) 
    : 0;

  const eventBadgeColors: Record<string, { bg: string, text: string }> = {
    sent: { bg: theme.colors.bgTertiary, text: theme.colors.textSecondary },
    delivered: { bg: theme.colors.infoLight, text: theme.colors.info },
    opened: { bg: theme.colors.warningLight, text: theme.colors.warning },
    clicked: { bg: theme.colors.emailLight, text: theme.colors.email },
    converted: { bg: theme.colors.successLight, text: theme.colors.success },
    failed: { bg: theme.colors.dangerLight, text: theme.colors.danger },
  };

  return (
    <div style={{
      backgroundColor: theme.colors.bgPrimary,
      border: `0.5px solid ${theme.colors.borderDefault}`,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.xl,
      boxShadow: theme.shadows.sm,
      marginBottom: theme.spacing.xl,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Progress Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '4px',
        width: `${progressPercent}%`,
        backgroundColor: theme.colors.accent,
        transition: 'width 0.4s ease'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xl }}>
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.textTertiary, fontWeight: theme.typography.weightBold }}>
            Live Campaign Tracker
          </span>
          <h2 style={{ fontSize: theme.typography.sizeLg, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
            {campaignName}
          </h2>
        </div>
        <div style={{ fontFamily: theme.typography.fontMono, fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
          Progress: {progressPercent}%
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
        borderBottom: `1px solid ${theme.colors.borderDefault}`,
        textAlign: 'center'
      }}>
        {/* Sent */}
        <div>
          <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>Sent</div>
          <div style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary, margin: `${theme.spacing.xs} 0` }}>
            {stats.sent}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textTertiary }}>100%</div>
        </div>

        {/* Delivered */}
        <div>
          <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
            Delivered {increments.delivered && <span style={{ color: theme.colors.success, fontWeight: 'bold' }}>↑</span>}
          </div>
          <div style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.info, margin: `${theme.spacing.xs} 0` }}>
            {stats.delivered}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textTertiary }}>
            {stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0}%
          </div>
        </div>

        {/* Opened */}
        <div>
          <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
            Opened {increments.opened && <span style={{ color: theme.colors.success, fontWeight: 'bold' }}>↑</span>}
          </div>
          <div style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.warning, margin: `${theme.spacing.xs} 0` }}>
            {stats.opened}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textTertiary }}>
            {stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0}%
          </div>
        </div>

        {/* Clicked */}
        <div>
          <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
            Clicked {increments.clicked && <span style={{ color: theme.colors.success, fontWeight: 'bold' }}>↑</span>}
          </div>
          <div style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.email, margin: `${theme.spacing.xs} 0` }}>
            {stats.clicked}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textTertiary }}>
            {stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0}%
          </div>
        </div>

        {/* Converted */}
        <div>
          <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
            Converted {increments.converted && <span style={{ color: theme.colors.success, fontWeight: 'bold' }}>↑</span>}
          </div>
          <div style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.success, margin: `${theme.spacing.xs} 0` }}>
            {stats.converted}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textTertiary }}>
            {stats.sent > 0 ? Math.round((stats.converted / stats.sent) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div style={{ marginTop: theme.spacing.lg }}>
        <h3 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold, marginBottom: theme.spacing.md, color: theme.colors.textPrimary }}>
          Live Delivery Stream
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.sm,
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {feed.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing.xl,
              color: theme.colors.textTertiary,
              fontSize: theme.typography.sizeSm,
              fontStyle: 'italic',
              border: `1px dashed ${theme.colors.borderDefault}`,
              borderRadius: theme.radii.md
            }}>
              Waiting for delivery event stream callbacks...
            </div>
          ) : (
            feed.map((item) => {
              const badge = eventBadgeColors[item.event] || eventBadgeColors.sent;
              const isFailed = item.event === 'failed';
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    border: `0.5px solid ${theme.colors.borderDefault}`,
                    backgroundColor: isFailed ? theme.colors.dangerLight : theme.colors.bgSecondary,
                    animation: 'slideIn 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: theme.radii.full,
                      backgroundColor: theme.colors.accentLight,
                      color: theme.colors.accentDark,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: theme.typography.weightBold,
                      fontSize: '11px'
                    }}>
                      {item.initials}
                    </div>
                    <span style={{ fontWeight: theme.typography.weightMedium, color: theme.colors.textPrimary }}>
                      {item.customerName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                    <span style={{
                      backgroundColor: badge.bg,
                      color: badge.text,
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: theme.radii.sm,
                      fontSize: '11px',
                      fontWeight: theme.typography.weightBold,
                      textTransform: 'uppercase'
                    }}>
                      {item.event}
                    </span>
                    <span style={{ color: theme.colors.textTertiary, fontSize: theme.typography.sizeSm, fontFamily: theme.typography.fontMono }}>
                      {getRelativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
