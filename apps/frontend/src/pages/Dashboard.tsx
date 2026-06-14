import React, { useEffect, useState } from 'react';
import { theme } from '../theme';
import { api } from '../api/client';
import { IntentBar } from '../components/IntentBar';
import { SegmentPreview } from '../components/SegmentPreview';
import { MessagePreviewer } from '../components/MessagePreviewer';
import { LiveCampaignTracker } from '../components/LiveCampaignTracker';
import { AiDebriefCard } from '../components/AiDebriefCard';
import { StatCard } from '../components/StatCard';
import { useSearchParams } from 'react-router-dom';

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const followUpQuery = searchParams.get('q');

  const [stats, setStats] = useState({
    totalCustomers: 60,
    activeCampaigns: 0,
    sentThisMonth: 0,
    avgOpenRate: 0
  });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [flowState, setFlowState] = useState<'idle' | 'preview' | 'messages' | 'launching' | 'tracker'>('idle');
  const [nlQuery, setNlQuery] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [createdCampaign, setCreatedCampaign] = useState<any>(null);
  const [debrief, setDebrief] = useState<any>(null);

  const loadDashboardData = async () => {
    try {
      const customers = await api.get<any[]>('/api/customers');
      const campaigns = await api.get<any[]>('/api/campaigns');

      const active = campaigns.filter(c => c.status === 'running').length;
      
      let totalSent = 0;
      let totalOpened = 0;
      campaigns.forEach(c => {
        totalSent += c.sent_count || 0;
        totalOpened += c.opened_count || 0;
      });

      const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

      setStats({
        totalCustomers: customers.length,
        activeCampaigns: active,
        sentThisMonth: totalSent,
        avgOpenRate: openRate
      });

      setRecentCampaigns(campaigns.slice(0, 3));
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (followUpQuery) {
      setNlQuery(followUpQuery);
      setFlowState('idle');
      setPreviewData(null);
      setCreatedCampaign(null);
      setDebrief(null);
    }
  }, [followUpQuery]);

  const handleIntentSuccess = (data: any, query: string) => {
    setNlQuery(query);
    setPreviewData(data);
    setFlowState('preview');
    setSearchParams({}); // Clear query string
  };

  const handleCampaignCreated = (campaign: any, customers: any[]) => {
    setCreatedCampaign(campaign);
    setFlowState('messages');
  };

  const handleLaunchCampaign = async () => {
    if (!createdCampaign) return;
    setFlowState('launching');
    try {
      await api.post(`/api/campaigns/${createdCampaign.id}/launch`, {});
      setFlowState('tracker');
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to launch campaign.');
      setFlowState('messages');
    }
  };

  const handleCampaignCompleted = async () => {
    try {
      const camp = await api.get<any>(`/api/campaigns/${createdCampaign.id}`);
      if (camp.debrief) {
        setDebrief(camp.debrief);
      }
      loadDashboardData();
    } catch (err) {
      console.error('Failed to load final debrief:', err);
    }
  };

  const handleFollowUp = (query: string) => {
    setSearchParams({ q: query });
    setFlowState('idle');
    setNlQuery(query);
    setPreviewData(null);
    setCreatedCampaign(null);
    setDebrief(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
          Marketer Dashboard
        </h1>
        <p style={{ fontSize: theme.typography.sizeBase, color: theme.colors.textSecondary, marginTop: '4px' }}>
          Intelligently reach your customers using AI-powered campaigns.
        </p>
      </div>

      {/* Metric Stat Cards */}
      <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
        <StatCard title="Total Shoppers" value={stats.totalCustomers} trend="4% vs last week" isPositive={true} />
        <StatCard title="Active Campaigns" value={stats.activeCampaigns} />
        <StatCard title="Messages Sent" value={stats.sentThisMonth} trend="12% vs last month" isPositive={true} />
        <StatCard title="Avg. Open Rate" value={`${stats.avgOpenRate}%`} trend="2% vs last month" isPositive={true} />
      </div>

      {/* Intent Input Hero Box */}
      {flowState === 'idle' && (
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
          <h2 style={{ fontSize: theme.typography.sizeLg, fontWeight: theme.typography.weightBold }}>
            Who would you like to target today?
          </h2>
          <IntentBar onSuccess={handleIntentSuccess} prefilledQuery={followUpQuery || nlQuery} />
        </div>
      )}

      {/* Progressing Campaign Flow States */}
      {flowState === 'preview' && previewData && (
        <SegmentPreview previewData={previewData} nlQuery={nlQuery} onCampaignCreated={handleCampaignCreated} />
      )}

      {flowState === 'messages' && createdCampaign && previewData && (
        <MessagePreviewer
          channel={createdCampaign.channel}
          customers={previewData.customers}
          campaignGoal={createdCampaign.goal}
          onLaunch={handleLaunchCampaign}
          isLaunching={false}
        />
      )}

      {flowState === 'launching' && (
        <div style={{
          backgroundColor: theme.colors.bgPrimary,
          border: `0.5px solid ${theme.colors.borderDefault}`,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl,
          textAlign: 'center',
          color: theme.colors.textSecondary
        }}>
          Launching campaign queue. Please wait...
        </div>
      )}

      {flowState === 'tracker' && createdCampaign && previewData && (
        <>
          <LiveCampaignTracker
            campaignId={createdCampaign.id}
            campaignName={createdCampaign.name}
            totalCustomers={previewData.customerCount}
            onCompleted={handleCampaignCompleted}
          />
          {debrief && (
            <AiDebriefCard
              campaignName={createdCampaign.name}
              debrief={debrief}
              onLaunchFollowUp={handleFollowUp}
            />
          )}
        </>
      )}

      {/* Recent Campaigns Section */}
      {recentCampaigns.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
          <h2 style={{ fontSize: theme.typography.sizeLg, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
            Recent Campaigns
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: theme.spacing.md }}>
            {recentCampaigns.map((camp) => (
              <div key={camp.id} style={{
                backgroundColor: theme.colors.bgPrimary,
                border: `0.5px solid ${theme.colors.borderDefault}`,
                borderRadius: theme.radii.lg,
                padding: theme.spacing.xl,
                boxShadow: theme.shadows.sm,
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.sm
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.textTertiary, fontWeight: theme.typography.weightBold }}>
                    {camp.channel}
                  </span>
                  <span style={{
                    backgroundColor: camp.status === 'completed' ? theme.colors.successLight : (camp.status === 'running' ? theme.colors.warningLight : theme.colors.bgTertiary),
                    color: camp.status === 'completed' ? theme.colors.success : (camp.status === 'running' ? theme.colors.warning : theme.colors.textSecondary),
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.radii.sm,
                    fontSize: '11px',
                    fontWeight: theme.typography.weightBold
                  }}>
                    {camp.status}
                  </span>
                </div>
                <h3 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
                  {camp.name}
                </h3>
                <p style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
                  Segment: {camp.segment_name || 'Lapsed Customers'}
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.xs, textAlign: 'center', marginTop: theme.spacing.sm, borderTop: `1px solid ${theme.colors.bgTertiary}`, paddingTop: theme.spacing.sm }}>
                  <div>
                    <div style={{ fontSize: '10px', color: theme.colors.textTertiary }}>Sent</div>
                    <div style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold }}>{camp.sent_count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: theme.colors.textTertiary }}>Converted</div>
                    <div style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold, color: theme.colors.success }}>{camp.converted_count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: theme.colors.textTertiary }}>CVR</div>
                    <div style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold }}>
                      {camp.sent_count > 0 ? Math.round((camp.converted_count / camp.sent_count) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
