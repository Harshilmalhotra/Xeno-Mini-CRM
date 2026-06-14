import React, { useEffect, useState } from 'react';
import { theme } from '../theme';
import { api } from '../api/client';
import { LiveCampaignTracker } from '../components/LiveCampaignTracker';
import { AiDebriefCard } from '../components/AiDebriefCard';
import { useNavigate } from 'react-router-dom';

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadCampaigns = async () => {
    try {
      const data = await api.get<any[]>('/api/campaigns');
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleRowClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'running':
        return { bg: theme.colors.warningLight, text: theme.colors.warning };
      case 'completed':
        return { bg: theme.colors.successLight, text: theme.colors.success };
      case 'failed':
        return { bg: theme.colors.dangerLight, text: theme.colors.danger };
      default:
        return { bg: theme.colors.bgTertiary, text: theme.colors.textSecondary };
    }
  };

  const handleFollowUp = (query: string) => {
    navigate(`/dashboard?q=${encodeURIComponent(query)}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
          Campaigns Database
        </h1>
        <p style={{ fontSize: theme.typography.sizeBase, color: theme.colors.textSecondary, marginTop: '4px' }}>
          Monitor history, delivery statistics, and AI recommendations of all campaigns.
        </p>
      </div>

      {/* Campaigns list card */}
      <div style={{
        backgroundColor: theme.colors.bgPrimary,
        border: `0.5px solid ${theme.colors.borderDefault}`,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.xl,
        boxShadow: theme.shadows.sm
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: theme.typography.fontSans }}>
            <thead>
              <tr style={{
                backgroundColor: theme.colors.bgSecondary,
                borderBottom: `1px solid ${theme.colors.borderDefault}`,
                color: theme.colors.textSecondary,
                fontSize: theme.typography.sizeSm
              }}>
                <th style={{ padding: theme.spacing.md }}>Name</th>
                <th style={{ padding: theme.spacing.md }}>Channel</th>
                <th style={{ padding: theme.spacing.md }}>Segment</th>
                <th style={{ padding: theme.spacing.md }}>Sent</th>
                <th style={{ padding: theme.spacing.md }}>Delivered</th>
                <th style={{ padding: theme.spacing.md }}>Opened</th>
                <th style={{ padding: theme.spacing.md }}>Clicked</th>
                <th style={{ padding: theme.spacing.md }}>Status</th>
                <th style={{ padding: theme.spacing.md }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.textTertiary, fontStyle: 'italic' }}>
                    No campaigns created yet. Start one on the dashboard!
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const statusColors = getStatusStyle(c.status);
                  const isExpanded = expandedId === c.id;

                  const delPercent = c.sent_count > 0 ? Math.round((c.delivered_count / c.sent_count) * 100) : 0;
                  const openPercent = c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0;
                  const clickPercent = c.sent_count > 0 ? Math.round((c.clicked_count / c.sent_count) * 100) : 0;

                  return (
                    <React.Fragment key={c.id}>
                      {/* Main Row */}
                      <tr
                        onClick={() => handleRowClick(c.id)}
                        style={{
                          borderBottom: `1px solid ${theme.colors.borderDefault}`,
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? theme.colors.bgSecondary : 'transparent',
                          transition: 'background-color 0.1s ease',
                          color: theme.colors.textPrimary
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(26,26,25,0.02)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: theme.spacing.md, fontWeight: theme.typography.weightBold }}>{c.name}</td>
                        <td style={{ padding: theme.spacing.md, textTransform: 'uppercase', fontSize: theme.typography.sizeSm }}>{c.channel}</td>
                        <td style={{ padding: theme.spacing.md }}>{c.segment_name || 'Lapsed Customers'}</td>
                        <td style={{ padding: theme.spacing.md, fontFamily: theme.typography.fontMono }}>{c.sent_count}</td>
                        <td style={{ padding: theme.spacing.md, fontFamily: theme.typography.fontMono }}>{delPercent}%</td>
                        <td style={{ padding: theme.spacing.md, fontFamily: theme.typography.fontMono }}>{openPercent}%</td>
                        <td style={{ padding: theme.spacing.md, fontFamily: theme.typography.fontMono }}>{clickPercent}%</td>
                        <td style={{ padding: theme.spacing.md }}>
                          <span style={{
                            backgroundColor: statusColors.bg,
                            color: statusColors.text,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            borderRadius: theme.radii.sm,
                            fontSize: '11px',
                            fontWeight: theme.typography.weightBold,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {c.status === 'running' && (
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: theme.colors.warning,
                                display: 'inline-block',
                                animation: 'pulse 1.2s infinite'
                              }} />
                            )}
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: theme.spacing.md, color: theme.colors.textTertiary, fontSize: theme.typography.sizeSm }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                      </tr>

                      {/* Expanded Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: theme.spacing.xl, backgroundColor: theme.colors.bgSecondary }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
                              <LiveCampaignTracker
                                campaignId={c.id}
                                campaignName={c.name}
                                initialStats={{
                                  sent: c.sent_count,
                                  delivered: c.delivered_count,
                                  opened: c.opened_count,
                                  clicked: c.clicked_count,
                                  converted: c.converted_count,
                                  failed: c.failed_count
                                }}
                                totalCustomers={c.sent_count}
                              />
                              
                              {c.debrief && (
                                <AiDebriefCard
                                  campaignName={c.name}
                                  debrief={c.debrief}
                                  onLaunchFollowUp={handleFollowUp}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
