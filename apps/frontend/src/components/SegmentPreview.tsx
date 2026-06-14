import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { theme } from '../theme';
import { api } from '../api/client';
import { ChurnRingBadge } from './ChurnRingBadge';

interface SegmentPreviewProps {
  previewData: {
    sqlFilter: string;
    description: string;
    customerIds: string[];
    customerCount: number;
    customers: any[];
  };
  nlQuery: string;
  onCampaignCreated: (campaign: any, customers: any[]) => void;
}

export function SegmentPreview({ previewData, nlQuery, onCampaignCreated }: SegmentPreviewProps) {
  const [segmentName, setSegmentName] = useState('Segment: ' + previewData.description.slice(0, 30));
  const [description] = useState(previewData.description);
  const [campaignName, setCampaignName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('Re-engage customers and drive conversions');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'sms' | 'email' | 'rcs'>('whatsapp');
  const [isSqlCollapsed, setIsSqlCollapsed] = useState(true);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSegment, setSavedSegment] = useState<any | null>(null);
  
  const displayedCustomers = showAllCustomers 
    ? previewData.customers 
    : previewData.customers.slice(0, 10);

  const channels: Array<'whatsapp' | 'sms' | 'email' | 'rcs'> = ['whatsapp', 'sms', 'email', 'rcs'];

  const channelColors = {
    whatsapp: { bg: theme.colors.whatsappLight, text: theme.colors.whatsapp },
    sms: { bg: theme.colors.smsLight, text: theme.colors.sms },
    email: { bg: theme.colors.emailLight, text: theme.colors.email },
    rcs: { bg: theme.colors.rcsLight, text: theme.colors.rcs },
  };

  const handleSaveSegment = async () => {
    if (savedSegment) return savedSegment;
    setIsSaving(true);
    try {
      const seg = await api.post<any>('/api/segments', {
        name: segmentName,
        nlQuery,
        sqlFilter: previewData.sqlFilter,
        customerIds: previewData.customerIds,
        description
      });
      setSavedSegment(seg);
      setIsSaving(false);
      return seg;
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      alert('Failed to save segment.');
      return null;
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }
    setIsSaving(true);
    try {
      // 1. Ensure segment is saved first
      const seg = await handleSaveSegment();
      if (!seg) return;

      // 2. Create campaign
      const campaign = await api.post<any>('/api/campaigns', {
        name: campaignName,
        segmentId: seg.id,
        channel: selectedChannel,
        goal: campaignGoal,
      });

      onCampaignCreated(campaign, previewData.customers);
    } catch (err) {
      console.error(err);
      alert('Failed to create campaign.');
    } finally {
      setIsSaving(false);
    }
  };

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
      {/* 1. Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            style={{
              fontSize: theme.typography.sizeLg,
              fontWeight: theme.typography.weightBold,
              color: theme.colors.textPrimary,
              border: 'none',
              borderBottom: `1px dashed ${theme.colors.borderStrong}`,
              outline: 'none',
              padding: `${theme.spacing.xs} 0`,
              width: '80%',
              fontFamily: theme.typography.fontSans
            }}
          />
          <span style={{
            backgroundColor: theme.colors.accentLight,
            color: theme.colors.accentDark,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.radii.full,
            fontSize: theme.typography.sizeSm,
            fontWeight: theme.typography.weightMedium,
            whiteSpace: 'nowrap'
          }}>
            {previewData.customerCount} customers
          </span>
        </div>

        <button
          onClick={handleSaveSegment}
          disabled={isSaving || savedSegment !== null}
          style={{
            backgroundColor: savedSegment ? theme.colors.successLight : 'transparent',
            color: savedSegment ? theme.colors.success : theme.colors.textSecondary,
            border: `1px solid ${savedSegment ? theme.colors.success : theme.colors.borderDefault}`,
            borderRadius: theme.radii.md,
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            cursor: savedSegment ? 'default' : 'pointer',
            fontSize: theme.typography.sizeBase,
            fontWeight: theme.typography.weightMedium,
            fontFamily: theme.typography.fontSans,
            transition: 'all 0.15s ease',
          }}
        >
          {savedSegment ? '✓ Segment Saved' : 'Save segment'}
        </button>
      </div>

      {/* 2. SQL Collapse block */}
      <div style={{ border: `1px solid ${theme.colors.borderDefault}`, borderRadius: theme.radii.md, overflow: 'hidden' }}>
        <button
          onClick={() => setIsSqlCollapsed(!isSqlCollapsed)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            border: 'none',
            background: theme.colors.bgSecondary,
            color: theme.colors.textSecondary,
            cursor: 'pointer',
            fontFamily: theme.typography.fontSans,
            fontSize: theme.typography.sizeBase,
            fontWeight: theme.typography.weightMedium
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={16} />
            <span>{isSqlCollapsed ? 'Show' : 'Hide'} AI-generated SQL query filter</span>
          </span>
          <span>{isSqlCollapsed ? '▼' : '▲'}</span>
        </button>
        {!isSqlCollapsed && (
          <div style={{
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.bgTertiary,
            borderTop: `1px solid ${theme.colors.borderDefault}`
          }}>
            <code style={{
              fontFamily: theme.typography.fontMono,
              fontSize: theme.typography.sizeSm,
              color: theme.colors.accentDark,
              wordBreak: 'break-all',
              display: 'block'
            }}>
              HAVING {previewData.sqlFilter}
            </code>
          </div>
        )}
      </div>

      {/* 3. Customer List Table */}
      <div>
        <h3 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold, marginBottom: theme.spacing.md }}>
          Segment Preview List
        </h3>
        <div style={{ overflowX: 'auto', border: `1px solid ${theme.colors.borderDefault}`, borderRadius: theme.radii.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: theme.typography.fontSans }}>
            <thead>
              <tr style={{ backgroundColor: theme.colors.bgSecondary, borderBottom: `1px solid ${theme.colors.borderDefault}`, color: theme.colors.textSecondary, fontSize: theme.typography.sizeSm }}>
                <th style={{ padding: theme.spacing.md }}>Name</th>
                <th style={{ padding: theme.spacing.md }}>City</th>
                <th style={{ padding: theme.spacing.md }}>Last Order</th>
                <th style={{ padding: theme.spacing.md }}>Days Since</th>
                <th style={{ padding: theme.spacing.md }}>Total Spend</th>
                <th style={{ padding: theme.spacing.md }}>Churn Risk</th>
              </tr>
            </thead>
            <tbody>
              {displayedCustomers.map((c: any) => {
                const days = parseInt(c.days_since_last_order, 10);
                const spend = Math.round(parseFloat(c.total_spend));
                const risk = days <= 7 ? 'low' : (days <= 30 ? 'medium' : 'high');
                const score = days <= 7 ? 15 : (days <= 30 ? 45 : 85);
                
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${theme.colors.borderDefault}`, color: theme.colors.textPrimary }}>
                    <td style={{ padding: theme.spacing.md, fontWeight: theme.typography.weightMedium }}>{c.name}</td>
                    <td style={{ padding: theme.spacing.md }}>{c.city}</td>
                    <td style={{ padding: theme.spacing.md }}>{new Date(c.last_order_date).toLocaleDateString()}</td>
                    <td style={{ padding: theme.spacing.md }}>{days}d ago</td>
                    <td style={{ padding: theme.spacing.md }}>₹{spend}</td>
                    <td style={{ padding: theme.spacing.md }}>
                      <ChurnRingBadge risk={risk} score={score} size={24} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {previewData.customers.length > 10 && (
          <button
            onClick={() => setShowAllCustomers(!showAllCustomers)}
            style={{
              marginTop: theme.spacing.md,
              backgroundColor: 'transparent',
              color: theme.colors.accent,
              border: 'none',
              cursor: 'pointer',
              fontWeight: theme.typography.weightBold,
              fontSize: theme.typography.sizeBase
            }}
          >
            {showAllCustomers ? 'Show less' : `Show all ${previewData.customerCount} customers`}
          </button>
        )}
      </div>

      {/* 4. Action bar for creating campaign */}
      <div style={{
        marginTop: theme.spacing.lg,
        borderTop: `1px solid ${theme.colors.borderDefault}`,
        paddingTop: theme.spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md
      }}>
        <h3 style={{ fontSize: theme.typography.sizeBase, fontWeight: theme.typography.weightBold }}>
          Create Campaign for Segment
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: theme.spacing.md }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
            <label style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, fontWeight: theme.typography.weightMedium }}>
              Campaign Name
            </label>
            <input
              type="text"
              placeholder="e.g. Lapsed Lattes WhatsApp Push"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              style={{
                border: `1px solid ${theme.colors.borderDefault}`,
                borderRadius: theme.radii.sm,
                padding: theme.spacing.md,
                fontSize: theme.typography.sizeBase,
                outline: 'none',
                fontFamily: theme.typography.fontSans
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
            <label style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, fontWeight: theme.typography.weightMedium }}>
              Campaign Goal (Prompt to personalization)
            </label>
            <input
              type="text"
              placeholder="e.g. Offer 15% discount code ROAST15 to purchase"
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              style={{
                border: `1px solid ${theme.colors.borderDefault}`,
                borderRadius: theme.radii.sm,
                padding: theme.spacing.md,
                fontSize: theme.typography.sizeBase,
                outline: 'none',
                fontFamily: theme.typography.fontSans
              }}
            />
          </div>
        </div>

        {/* Channel Selector Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
          <label style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, fontWeight: theme.typography.weightMedium }}>
            Select Channel
          </label>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {channels.map((chan) => {
              const active = selectedChannel === chan;
              const colors = channelColors[chan];
              return (
                <button
                  key={chan}
                  onClick={() => setSelectedChannel(chan)}
                  style={{
                    backgroundColor: active ? colors.bg : theme.colors.bgSecondary,
                    color: colors.text,
                    border: `1.5px solid ${active ? colors.text : theme.colors.borderDefault}`,
                    borderRadius: theme.radii.full,
                    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                    fontSize: theme.typography.sizeSm,
                    fontWeight: theme.typography.weightBold,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 0.1s ease',
                    boxShadow: active ? theme.shadows.sm : 'none'
                  }}
                >
                  {chan}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleCreateCampaign}
          disabled={isSaving}
          style={{
            marginTop: theme.spacing.md,
            backgroundColor: theme.colors.accent,
            color: theme.colors.textInverse,
            border: 'none',
            outline: 'none',
            borderRadius: theme.radii.md,
            padding: `${theme.spacing.md} ${theme.spacing.xl}`,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: theme.typography.sizeMd,
            fontWeight: theme.typography.weightBold,
            width: '100%',
            textAlign: 'center',
            boxShadow: theme.shadows.sm,
            transition: 'all 0.15s ease'
          }}
          onMouseDown={(e) => {
            if (!isSaving) e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isSaving ? 'Processing...' : 'Create campaign →'}
        </button>
      </div>
    </div>
  );
}
