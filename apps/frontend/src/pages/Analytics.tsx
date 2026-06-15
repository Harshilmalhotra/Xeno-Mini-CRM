import React, { useEffect, useState } from 'react';
import { theme } from '../theme';
import { api } from '../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { SkeletonCard } from '../components/Skeleton';

export function Analytics() {
  const [camps, setCamps] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [segmentData, setSegmentData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const custs = await api.get<any[]>('/api/customers');
      const campaigns = await api.get<any[]>('/api/campaigns');
      
      setCamps(campaigns);

      const channels = ['whatsapp', 'sms', 'email', 'rcs'];
      const statsByChannel = channels.map(chan => {
        const matching = campaigns.filter(c => c.channel.toLowerCase() === chan);
        let sent = 0;
        let delivered = 0;
        let opened = 0;
        let clicked = 0;
        
        matching.forEach(c => {
          sent += c.sent_count || 0;
          delivered += c.delivered_count || 0;
          opened += c.opened_count || 0;
          clicked += c.clicked_count || 0;
        });

        return {
          name: chan.toUpperCase(),
          'Delivered %': sent > 0 ? Math.round((delivered / sent) * 100) : 0,
          'Opened %': sent > 0 ? Math.round((opened / sent) * 100) : 0,
          'Clicked %': sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        };
      });
      setChannelData(statsByChannel);

      let active = 0;
      let atRisk = 0;
      let lapsing = 0;
      let churned = 0;

      custs.forEach(c => {
        const days = c.daysSinceLastOrder;
        if (days <= 7) active++;
        else if (days <= 30) atRisk++;
        else if (days <= 60) lapsing++;
        else churned++;
      });

      setFunnelData([
        { value: active, name: 'Active (0-7d)', fill: theme.colors.churnLow },
        { value: atRisk, name: 'At-Risk (8-30d)', fill: theme.colors.churnMedium },
        { value: lapsing, name: 'Lapsing (31-60d)', fill: theme.colors.churnLapsing },
        { value: churned, name: 'Churned (60d+)', fill: theme.colors.churnHigh },
      ]);

      const segMap = new Map<string, { name: string; clicked: number; sent: number }>();
      campaigns.forEach(c => {
        const key = c.segment_id || 'default';
        const name = c.segment_name || 'Lapsed Customers';
        if (!segMap.has(key)) {
          segMap.set(key, { name, clicked: 0, sent: 0 });
        }
        const curr = segMap.get(key)!;
        curr.clicked += c.clicked_count || 0;
        curr.sent += c.sent_count || 0;
      });

      const list: any[] = [];
      segMap.forEach((val) => {
        list.push({
          name: val.name,
          clickRate: val.sent > 0 ? Math.round((val.clicked / val.sent) * 100) : 0,
          volume: val.sent
        });
      });
      list.sort((a, b) => b.clickRate - a.clickRate);
      setSegmentData(list.slice(0, 5));

    } catch (err) {
      console.error('Failed to load analytics charts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
          Analytics & Performance
        </h1>
        <p style={{ fontSize: theme.typography.sizeBase, color: theme.colors.textSecondary, marginTop: '4px' }}>
          Real-time metrics aggregating channel responsiveness, campaign performance, and user retention.
        </p>
      </div>

      {/* Grid: Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: theme.spacing.xl }}>
        {/* Channel Engagement bar chart */}
        {isLoading ? (
          <SkeletonCard />
        ) : (
          <div style={{
            backgroundColor: theme.colors.bgPrimary,
            border: `0.5px solid ${theme.colors.borderDefault}`,
            borderRadius: theme.radii.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.sm
          }}>
            <h3 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold, marginBottom: theme.spacing.lg }}>
              Channel Engagement Rates
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke={theme.colors.textSecondary} />
                  <YAxis unit="%" stroke={theme.colors.textSecondary} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Delivered %" fill={theme.colors.info} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Opened %" fill={theme.colors.warning} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Clicked %" fill={theme.colors.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Funnel chart */}
        {isLoading ? (
          <SkeletonCard />
        ) : (
          <div style={{
            backgroundColor: theme.colors.bgPrimary,
            border: `0.5px solid ${theme.colors.borderDefault}`,
            borderRadius: theme.radii.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.sm
          }}>
            <h3 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold, marginBottom: theme.spacing.lg }}>
              Retention Lifecycle Funnel
            </h3>
            <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer>
                <FunnelChart>
                  <Tooltip />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill={theme.colors.textPrimary} dataKey="name" stroke="none" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: theme.spacing.xl }}>
        {/* Campaign timeline history */}
        {isLoading ? (
          <SkeletonCard />
        ) : (
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
            <h3 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold }}>
              Campaign Execution Timeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, maxHeight: '280px', overflowY: 'auto' }}>
              {camps.length === 0 ? (
                <div style={{ textAlign: 'center', color: theme.colors.textTertiary, fontStyle: 'italic', padding: theme.spacing.xl }}>
                  No campaign history.
                </div>
              ) : (
                camps.map((c, index) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: theme.spacing.md,
                      borderRadius: theme.radii.md,
                      border: `1px solid ${theme.colors.borderDefault}`,
                      backgroundColor: theme.colors.bgSecondary
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '10px', color: theme.colors.textTertiary, fontFamily: theme.typography.fontMono }}>
                        #{camps.length - index} — {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      <h4 style={{ fontSize: theme.typography.sizeSm, fontWeight: theme.typography.weightBold }}>
                        {c.name}
                      </h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: theme.typography.sizeSm, fontWeight: theme.typography.weightBold, color: theme.colors.accent }}>
                        {c.sent_count} sent
                      </span>
                      <div style={{ fontSize: '10px', color: theme.colors.textTertiary }}>
                        {c.sent_count > 0 ? Math.round((c.converted_count / c.sent_count) * 100) : 0}% converted
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}        {/* Top performing segments ranked by click rate */}
        {isLoading ? (
          <SkeletonCard />
        ) : (
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
            <h3 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold }}>
              Top Performing Segments
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              {segmentData.length === 0 ? (
                <div style={{ textAlign: 'center', color: theme.colors.textTertiary, fontStyle: 'italic', padding: theme.spacing.xl }}>
                  No segment data available.
                </div>
              ) : (
                segmentData.map((seg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: theme.spacing.md,
                      borderRadius: theme.radii.md,
                      border: `1px solid ${theme.colors.borderDefault}`,
                      backgroundColor: theme.colors.bgSecondary
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                      <span style={{
                        backgroundColor: theme.colors.accentLight,
                        color: theme.colors.accentDark,
                        width: '24px',
                        height: '24px',
                        borderRadius: theme.radii.full,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: theme.typography.weightBold,
                        fontSize: theme.typography.sizeSm
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: theme.typography.weightMedium, color: theme.colors.textPrimary }}>
                        {seg.name}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: theme.typography.weightBold, color: theme.colors.success }}>
                        {seg.clickRate}% CTR
                      </span>
                      <div style={{ fontSize: '10px', color: theme.colors.textTertiary }}>
                        Volume: {seg.volume}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
