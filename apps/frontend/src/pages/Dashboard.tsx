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
import { Target, Crown, Trophy } from 'lucide-react';

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const followUpQuery = searchParams.get('q');

  const [stats, setStats] = useState({
    totalCustomers: 60,
    activeCampaigns: 0,
    sentThisMonth: 0,
    totalRevenue: 0
  });

  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [revenueLeaderboard, setRevenueLeaderboard] = useState<any[]>([]);
  const [loyaltyCounts, setLoyaltyCounts] = useState({ Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 });
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);

  // Flow states: idle | planning | plan_preview | preview | messages | launching | tracker
  const [flowState, setFlowState] = useState<'idle' | 'planning' | 'plan_preview' | 'preview' | 'messages' | 'launching' | 'tracker'>('idle');
  const [nlQuery, setNlQuery] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [createdCampaign, setCreatedCampaign] = useState<any>(null);
  const [debrief, setDebrief] = useState<any>(null);

  // Planner States
  const [plannerGoal, setPlannerGoal] = useState('');
  const [plannedCampaign, setPlannedCampaign] = useState<any>(null);
  const [timelineStep, setTimelineStep] = useState(0);
  const [enableAbTest, setEnableAbTest] = useState(false);
  const [variantAOffer, setVariantAOffer] = useState('');
  const [variantBOffer, setVariantBOffer] = useState('');
  const [customChannel, setCustomChannel] = useState<'whatsapp' | 'sms' | 'email' | 'rcs'>('whatsapp');
  const [customOffer, setCustomOffer] = useState('');
  const [customSendTime, setCustomSendTime] = useState('');
  const [customCampaignName, setCustomCampaignName] = useState('');

  const timelineSteps = [
    'Analyzing customer behavior & segments...',
    'Evaluating optimal promotion offers...',
    'Selecting highest response channel...',
    'Projecting conversions & expected revenue...',
    'Finalizing segment SQL filters...'
  ];

  const loadDashboardData = async () => {
    try {
      const customers = await api.get<any[]>('/api/customers');
      const campaigns = await api.get<any[]>('/api/campaigns');

      const active = campaigns.filter(c => c.status === 'running').length;
      
      let totalSent = 0;
      let totalRev = 0;
      campaigns.forEach(c => {
        totalSent += c.sent_count || 0;
        totalRev += parseFloat(c.attributed_revenue || '0');
      });

      setStats({
        totalCustomers: customers.length,
        activeCampaigns: active,
        sentThisMonth: totalSent,
        totalRevenue: Math.round(totalRev)
      });

      // Calculate loyalty distribution
      let bronze = 0, silver = 0, gold = 0, platinum = 0;
      customers.forEach(c => {
        const spend = c.totalSpend || 0;
        if (spend > 10000) platinum++;
        else if (spend > 5000) gold++;
        else if (spend > 2000) silver++;
        else bronze++;
      });
      setLoyaltyCounts({ Bronze: bronze, Silver: silver, Gold: gold, Platinum: platinum });

      // Recent campaigns
      setRecentCampaigns(campaigns.slice(0, 3));

      // Revenue Leaderboard (sorted by revenue desc)
      const sortedByRev = [...campaigns]
        .filter(c => parseFloat(c.attributed_revenue || '0') > 0)
        .sort((a, b) => parseFloat(b.attributed_revenue) - parseFloat(a.attributed_revenue));
      setRevenueLeaderboard(sortedByRev.slice(0, 4));

    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (followUpQuery) {
      setPlannerGoal(followUpQuery);
      setFlowState('idle');
      setPreviewData(null);
      setCreatedCampaign(null);
      setDebrief(null);
    }
  }, [followUpQuery]);

  const handleFindOpportunities = async () => {
    setLoadingOpportunities(true);
    try {
      const opps = await api.get<any[]>('/api/campaigns/opportunities');
      setOpportunities(opps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const handleLaunchOpportunity = (suggestedGoal: string) => {
    setPlannerGoal(suggestedGoal);
    handlePlanCampaign(suggestedGoal);
  };

  const handlePlanCampaign = async (goal: string) => {
    if (!goal.trim()) return;
    setFlowState('planning');
    setTimelineStep(0);

    // Animate timeline steps
    const interval = setInterval(() => {
      setTimelineStep(prev => {
        if (prev >= timelineSteps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 900);

    try {
      const plan = await api.post<any>('/api/campaigns/plan', { goal });
      setPlannedCampaign(plan);
      setCustomChannel(plan.recommendedChannel);
      setCustomOffer(plan.recommendedOffer);
      setCustomSendTime(plan.recommendedSendTime);
      setCustomCampaignName(plan.recommendedSegment);
      setVariantAOffer(plan.recommendedOffer);
      setVariantBOffer('Free Coffee Upgrade'); // Default secondary variant
      setTimeout(() => {
        setFlowState('plan_preview');
        clearInterval(interval);
      }, 4500);
    } catch (err) {
      console.error(err);
      alert('AI failed to generate a campaign plan. Please try again.');
      setFlowState('idle');
      clearInterval(interval);
    }
  };

  const handleIntentSuccess = (data: any, query: string) => {
    setNlQuery(query);
    setPreviewData(data);
    setFlowState('preview');
    setSearchParams({}); // Clear query string
  };

  const handleApprovePlan = async () => {
    if (!plannedCampaign) return;
    setFlowState('launching');
    try {
      // 1. Save AI-generated segment
      const segment = await api.post<any>('/api/segments', {
        name: customCampaignName || plannedCampaign.recommendedSegment,
        nlQuery: plannedCampaign.goal,
        sqlFilter: plannedCampaign.generatedSegmentQuery,
        description: plannedCampaign.audienceReasoning,
        customerIds: [] // DB automatically resolves via filter
      });

      // 2. Create campaign draft
      const campaign = await api.post<any>('/api/campaigns', {
        name: (customCampaignName || plannedCampaign.recommendedSegment) + ' Autopilot',
        segmentId: segment.id,
        channel: customChannel,
        goal: customOffer || plannedCampaign.recommendedOffer,
        isAbTest: enableAbTest,
        variantAOffer: enableAbTest ? variantAOffer : null,
        variantBOffer: enableAbTest ? variantBOffer : null
      });

      // 3. Launch campaign asynchronously
      await api.post(`/api/campaigns/${campaign.id}/launch`, {});
      setCreatedCampaign(campaign);
      
      // Fetch segment details to load customers for tracking preview
      const segmentDetail = await api.get<any>(`/api/segments`);
      const createdSeg = segmentDetail.find((s: any) => s.id === segment.id);
      
      setPreviewData({
        customerCount: plannedCampaign.expectedReach,
        customers: Array.from({ length: plannedCampaign.expectedReach }) // Placeholder size
      });
      
      setFlowState('tracker');
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to launch autonomous campaign.');
      setFlowState('plan_preview');
    }
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
    setPlannerGoal(query);
    setPreviewData(null);
    setCreatedCampaign(null);
    setDebrief(null);
    setPlannedCampaign(null);
  };

  const loyaltyColors = [theme.colors.churnLow, theme.colors.info, theme.colors.warning, '#7F77DD'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
          Xeno Autopilot
        </h1>
        <p style={{ fontSize: theme.typography.sizeBase, color: theme.colors.textSecondary, marginTop: '4px' }}>
          Tell us the business outcome you want. The AI figures out the campaign.
        </p>
      </div>

      {/* Metric Stat Cards */}
      <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
        <StatCard title="Total Shoppers" value={stats.totalCustomers} trend="Dynamic CRM scale" isPositive={true} />
        <StatCard title="Active Campaigns" value={stats.activeCampaigns} />
        <StatCard title="Messages Sent" value={stats.sentThisMonth} />
        <StatCard title="Autopilot Revenue" value={`₹${stats.totalRevenue}`} trend="Attributed Conversions" isPositive={true} />
      </div>

      {/* 1. Goal-Based Autonomous Agent Flow (TIMELINE PLANNING STATE) */}
      {flowState === 'planning' && (
        <div style={{
          backgroundColor: theme.colors.bgPrimary,
          border: `0.5px solid ${theme.colors.borderDefault}`,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: theme.spacing.lg,
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: theme.typography.sizeLg, fontWeight: theme.typography.weightBold }}>
            Autopilot Planning Campaign
          </h2>
          <p style={{ fontSize: theme.typography.sizeBase, color: theme.colors.textSecondary }}>
            Goal: "{plannerGoal}"
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, width: '100%', maxWidth: '400px', textAlign: 'left', marginTop: theme.spacing.md }}>
            {timelineSteps.map((step, idx) => {
              const isDone = timelineStep > idx;
              const isActive = timelineStep === idx;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  opacity: isDone || isActive ? 1 : 0.4,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isDone ? theme.colors.success : (isActive ? theme.colors.accent : theme.colors.bgTertiary),
                    color: theme.colors.textInverse,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {isDone ? '✓' : ''}
                  </div>
                  <span style={{
                    fontSize: theme.typography.sizeBase,
                    fontWeight: isActive ? theme.typography.weightBold : theme.typography.weightNormal,
                    color: isActive ? theme.colors.accentDark : theme.colors.textPrimary
                  }}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: theme.spacing.lg,
            height: '4px',
            width: '100%',
            maxWidth: '400px',
            backgroundColor: theme.colors.bgTertiary,
            borderRadius: theme.radii.full,
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              height: '100%',
              width: `${(timelineStep / (timelineSteps.length - 1)) * 100}%`,
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radii.full,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      )}

      {/* 2. Campaign Planner Card (PLAN PREVIEW STATE) */}
      {flowState === 'plan_preview' && plannedCampaign && (
        <div style={{
          backgroundColor: theme.colors.bgPrimary,
          border: `0.5px solid ${theme.colors.borderDefault}`,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.lg
        }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.accent, fontWeight: 'bold' }}>
              Autopilot Campaign Plan
            </span>
            <div style={{ marginTop: theme.spacing.sm }}>
              <label style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Campaign Name
              </label>
              <input
                type="text"
                value={customCampaignName}
                onChange={(e) => setCustomCampaignName(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: theme.typography.sizeBase,
                  fontWeight: theme.typography.weightBold,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radii.sm,
                  border: `1px solid ${theme.colors.borderDefault}`,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.bgPrimary
                }}
              />
            </div>
          </div>

          {/* Forecast Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: theme.spacing.md,
            backgroundColor: theme.colors.bgSecondary,
            padding: theme.spacing.lg,
            borderRadius: theme.radii.md,
            border: `0.5px solid ${theme.colors.borderDefault}`,
            textAlign: 'center'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: theme.colors.textSecondary }}>Target Audience</span>
              <div style={{ fontSize: theme.typography.sizeLg, fontWeight: 'bold', color: theme.colors.textPrimary }}>
                {plannedCampaign.expectedReach} shoppers
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: theme.colors.textSecondary }}>Expected Conversions</span>
              <div style={{ fontSize: theme.typography.sizeLg, fontWeight: 'bold', color: theme.colors.success }}>
                {plannedCampaign.expectedConversions} conversions
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: theme.colors.textSecondary }}>Projected Revenue</span>
              <div style={{ fontSize: theme.typography.sizeLg, fontWeight: 'bold', color: theme.colors.accent }}>
                ₹{plannedCampaign.expectedRevenue}
              </div>
            </div>
          </div>

          {/* Plan Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: theme.spacing.lg }}>
            <div>
              <label style={{ fontSize: theme.typography.sizeBase, fontWeight: 'bold', color: theme.colors.textPrimary, display: 'block', marginBottom: '4px' }}>
                🎁 Campaign Offer Text
              </label>
              <textarea
                value={customOffer}
                onChange={(e) => {
                  setCustomOffer(e.target.value);
                  if (!enableAbTest) {
                    setVariantAOffer(e.target.value);
                  }
                }}
                rows={2}
                style={{
                  width: '100%',
                  fontSize: theme.typography.sizeSm,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radii.sm,
                  border: `1px solid ${theme.colors.borderDefault}`,
                  color: theme.colors.textSecondary,
                  resize: 'vertical',
                  backgroundColor: theme.colors.bgPrimary
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: theme.typography.sizeBase, fontWeight: 'bold', color: theme.colors.textPrimary, display: 'block', marginBottom: '4px' }}>
                ⏰ Send Time Scheduling
              </label>
              <input
                type="text"
                value={customSendTime}
                onChange={(e) => setCustomSendTime(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: theme.typography.sizeSm,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radii.sm,
                  border: `1px solid ${theme.colors.borderDefault}`,
                  color: theme.colors.textSecondary,
                  backgroundColor: theme.colors.bgPrimary
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: theme.typography.sizeBase, fontWeight: 'bold', color: theme.colors.textPrimary, display: 'block', marginBottom: '4px' }}>
                📡 Delivery Channel
              </label>
              <select
                value={customChannel}
                onChange={(e) => setCustomChannel(e.target.value as any)}
                style={{
                  width: '100%',
                  fontSize: theme.typography.sizeSm,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radii.sm,
                  border: `1px solid ${theme.colors.borderDefault}`,
                  color: theme.colors.textSecondary,
                  backgroundColor: theme.colors.bgPrimary
                }}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="rcs">RCS</option>
              </select>
            </div>
          </div>

          {/* Explainable AI block */}
          <div style={{
            borderLeft: `3px solid ${theme.colors.info}`,
            paddingLeft: theme.spacing.md,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xs
          }}>
            <h4 style={{ fontSize: theme.typography.sizeSm, fontWeight: 'bold', color: theme.colors.info }}>
              💡 Explainable AI Reasoning
            </h4>
            <p style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
              <strong>Audience reasoning:</strong> {plannedCampaign.audienceReasoning}
            </p>
            <p style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
              <strong>Why this campaign:</strong> {plannedCampaign.whyCampaignExplanation}
            </p>
            <p style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
              <strong>Why {plannedCampaign.recommendedChannel}:</strong> {plannedCampaign.whyChannelExplanation}
            </p>
            <details style={{ marginTop: theme.spacing.xs, fontSize: theme.typography.sizeSm }}>
              <summary style={{ cursor: 'pointer', color: theme.colors.textSecondary, fontWeight: 'bold' }}>
                👁 Show AI-generated SQL query filter
              </summary>
              <pre style={{
                backgroundColor: theme.colors.bgSecondary,
                padding: theme.spacing.sm,
                borderRadius: theme.radii.sm,
                border: `0.5px solid ${theme.colors.borderDefault}`,
                fontFamily: theme.typography.fontMono,
                fontSize: '11px',
                overflowX: 'auto',
                marginTop: theme.spacing.xs
              }}>{plannedCampaign.generatedSegmentQuery}</pre>
            </details>
          </div>

          {/* A/B Experiment Toggle */}
          <div style={{
            borderTop: `1px solid ${theme.colors.borderDefault}`,
            paddingTop: theme.spacing.md,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.sm
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, fontWeight: 'bold', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableAbTest}
                onChange={(e) => setEnableAbTest(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              📊 Enable AI Experiment (A/B testing split)
            </label>
            {enableAbTest && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: theme.spacing.md,
                backgroundColor: theme.colors.bgSecondary,
                padding: theme.spacing.md,
                borderRadius: theme.radii.md
              }}>
                <div>
                  <label style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, display: 'block', marginBottom: '2px' }}>
                    Version A Offer text
                  </label>
                  <input
                    type="text"
                    value={variantAOffer}
                    onChange={(e) => setVariantAOffer(e.target.value)}
                    style={{
                      width: '100%',
                      padding: theme.spacing.sm,
                      borderRadius: theme.radii.sm,
                      border: `1px solid ${theme.colors.borderDefault}`
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, display: 'block', marginBottom: '2px' }}>
                    Version B Offer text
                  </label>
                  <input
                    type="text"
                    value={variantBOffer}
                    onChange={(e) => setVariantBOffer(e.target.value)}
                    style={{
                      width: '100%',
                      padding: theme.spacing.sm,
                      borderRadius: theme.radii.sm,
                      border: `1px solid ${theme.colors.borderDefault}`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Launch / Cancel buttons */}
          <div style={{ display: 'flex', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
            <button
              onClick={handleApprovePlan}
              style={{
                backgroundColor: theme.colors.accent,
                color: theme.colors.textInverse,
                border: 'none',
                outline: 'none',
                borderRadius: theme.radii.md,
                padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                cursor: 'pointer',
                fontSize: theme.typography.sizeBase,
                fontWeight: theme.typography.weightBold,
                boxShadow: theme.shadows.sm,
                transition: 'all 0.15s ease'
              }}
            >
              Launch Autopilot campaign →
            </button>
            <button
              onClick={() => setFlowState('idle')}
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${theme.colors.borderDefault}`,
                borderRadius: theme.radii.md,
                padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                cursor: 'pointer',
                fontSize: theme.typography.sizeBase,
                fontWeight: theme.typography.weightMedium,
                color: theme.colors.textSecondary
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. Autopilot Business Goal Input */}
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
            What is your business outcome goal?
          </h2>
          <form onSubmit={(e) => { e.preventDefault(); handlePlanCampaign(plannerGoal); }} style={{
            display: 'flex',
            alignItems: 'center',
            background: theme.colors.bgPrimary,
            border: `1px solid ${theme.colors.borderDefault}`,
            borderRadius: theme.radii.lg,
            padding: theme.spacing.sm,
            boxShadow: theme.shadows.sm,
            width: '100%'
          }}>
            <div style={{ padding: `0 ${theme.spacing.sm}`, color: theme.colors.accent, display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <input
              type="text"
              value={plannerGoal}
              onChange={(e) => setPlannerGoal(e.target.value)}
              placeholder="Describe outcome — e.g. 'Win back churned subscription customers' or 'Promote Seasonal Blend'"
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
            <button
              type="submit"
              disabled={!plannerGoal.trim()}
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
                cursor: 'pointer',
                opacity: !plannerGoal.trim() ? 0.6 : 1
              }}
            >
              Plan with AI →
            </button>
          </form>
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

      {/* Grid: 4. AI Opportunities Widget & Loyalty distribution */}
      {flowState === 'idle' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: theme.spacing.xl }}>
          {/* AI Opportunity Discovery */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{
                fontSize: theme.typography.sizeBase,
                fontWeight: theme.typography.weightBold,
                display: 'inline-flex',
                alignItems: 'center',
                gap: theme.spacing.sm
              }}>
                <Target size={18} style={{ color: theme.colors.accent }} />
                <span>AI Opportunity Discovery</span>
              </h3>
              <button
                onClick={handleFindOpportunities}
                style={{
                  backgroundColor: theme.colors.accentLight,
                  color: theme.colors.accentDark,
                  border: 'none',
                  outline: 'none',
                  borderRadius: theme.radii.sm,
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Find Opportunities
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              {loadingOpportunities ? (
                <div style={{ textAlign: 'center', color: theme.colors.textTertiary, fontStyle: 'italic', padding: theme.spacing.xl }}>
                  Scanning purchase behaviors and churn risks...
                </div>
              ) : opportunities.length === 0 ? (
                <div style={{ textAlign: 'center', color: theme.colors.textTertiary, fontStyle: 'italic', padding: theme.spacing.md, fontSize: theme.typography.sizeSm }}>
                  Click "Find Opportunities" to scan customer purchase frequencies.
                </div>
              ) : (
                opportunities.map((opp, idx) => (
                  <div key={idx} style={{
                    border: `1px solid ${theme.colors.borderDefault}`,
                    borderRadius: theme.radii.md,
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.bgSecondary,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing.xs
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: theme.typography.sizeSm, fontWeight: 'bold' }}>{opp.title}</h4>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.colors.success }}>
                        +₹{opp.expectedRevenue} (reach: {opp.reach})
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: theme.colors.textSecondary }}>{opp.reasoning}</p>
                    <button
                      onClick={() => handleLaunchOpportunity(opp.suggestedGoal)}
                      style={{
                        backgroundColor: theme.colors.accent,
                        color: theme.colors.textInverse,
                        border: 'none',
                        outline: 'none',
                        borderRadius: theme.radii.sm,
                        padding: '4px 10px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        alignSelf: 'flex-end',
                        marginTop: '4px'
                      }}
                    >
                      Autopilot Launch →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Loyalty distribution stats */}
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
            <h3 style={{
              fontSize: theme.typography.sizeBase,
              fontWeight: theme.typography.weightBold,
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.sm
            }}>
              <Crown size={18} style={{ color: theme.colors.accent }} />
              <span>Loyalty Tier Distribution</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
              {Object.entries(loyaltyCounts).map(([tier, count], idx) => {
                const total = stats.totalCustomers || 1;
                const percent = Math.round((count / total) * 100);
                const color = loyaltyColors[idx];
                return (
                  <div key={tier}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.typography.sizeSm, color: theme.colors.textPrimary, fontWeight: 'medium' }}>
                      <span>{tier} Members</span>
                      <span>{count} customers ({percent}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: theme.colors.bgTertiary, borderRadius: theme.radii.full, overflow: 'hidden', marginTop: '4px' }}>
                      <div style={{ width: `${percent}%`, height: '100%', backgroundColor: color, borderRadius: theme.radii.full }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid: Row 3 (Recent Campaigns & Top Revenue Campaigns Leaderboard) */}
      {flowState === 'idle' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: theme.spacing.xl }}>
          {/* Top Revenue Leaderboard */}
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
            <h3 style={{
              fontSize: theme.typography.sizeBase,
              fontWeight: theme.typography.weightBold,
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.sm
            }}>
              <Trophy size={18} style={{ color: theme.colors.accent }} />
              <span>Top Revenue Campaigns</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              {revenueLeaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', color: theme.colors.textTertiary, fontStyle: 'italic', padding: theme.spacing.xl }}>
                  No conversions recorded yet. Launch a campaign to see revenue!
                </div>
              ) : (
                revenueLeaderboard.map((camp, idx) => {
                  const roi = camp.sent_count > 0 ? (parseFloat(camp.attributed_revenue) / camp.sent_count).toFixed(0) : '0';
                  return (
                    <div key={camp.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: theme.spacing.md,
                      borderRadius: theme.radii.md,
                      border: `1px solid ${theme.colors.borderDefault}`,
                      backgroundColor: theme.colors.bgSecondary
                    }}>
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
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }}>{idx + 1}</span>
                        <div>
                          <h4 style={{ fontSize: theme.typography.sizeSm, fontWeight: 'bold' }}>{camp.name}</h4>
                          <span style={{ fontSize: '10px', color: theme.colors.textTertiary, textTransform: 'uppercase' }}>
                            {camp.channel}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold', color: theme.colors.accent }}>
                          ₹{Math.round(camp.attributed_revenue)}
                        </span>
                        <div style={{ fontSize: '10px', color: theme.colors.textTertiary }}>
                          ROI: ₹{roi}/msg
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Campaigns Section */}
          {recentCampaigns.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <h2 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
                Recent Autopilot Launches
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                {recentCampaigns.map((camp) => (
                  <div key={camp.id} style={{
                    backgroundColor: theme.colors.bgPrimary,
                    border: `0.5px solid ${theme.colors.borderDefault}`,
                    borderRadius: theme.radii.lg,
                    padding: theme.spacing.md,
                    boxShadow: theme.shadows.sm,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing.xs
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: theme.colors.textTertiary, fontWeight: theme.typography.weightBold }}>
                        {camp.channel} {camp.is_ab_test ? '• A/B Experiment' : ''}
                      </span>
                      <span style={{
                        backgroundColor: camp.status === 'completed' ? theme.colors.successLight : (camp.status === 'running' ? theme.colors.warningLight : theme.colors.bgTertiary),
                        color: camp.status === 'completed' ? theme.colors.success : (camp.status === 'running' ? theme.colors.warning : theme.colors.textSecondary),
                        padding: '2px 6px',
                        borderRadius: theme.radii.sm,
                        fontSize: '10px',
                        fontWeight: theme.typography.weightBold
                      }}>
                        {camp.status}
                      </span>
                    </div>
                    <h3 style={{ fontSize: theme.typography.sizeSm, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
                      {camp.name}
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.xs, textAlign: 'center', marginTop: '4px', borderTop: `1px solid ${theme.colors.bgTertiary}`, paddingTop: '4px' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: theme.colors.textTertiary }}>Sent</div>
                        <div style={{ fontSize: theme.typography.sizeSm, fontWeight: 'bold' }}>{camp.sent_count}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: theme.colors.textTertiary }}>Revenue</div>
                        <div style={{ fontSize: theme.typography.sizeSm, fontWeight: 'bold', color: theme.colors.accent }}>₹{Math.round(camp.attributed_revenue || 0)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: theme.colors.textTertiary }}>CVR</div>
                        <div style={{ fontSize: theme.typography.sizeSm, fontWeight: 'bold', color: theme.colors.success }}>
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
      )}
    </div>
  );
}
