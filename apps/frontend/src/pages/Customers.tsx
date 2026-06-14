import React, { useEffect, useState } from 'react';
import { theme } from '../theme';
import { api } from '../api/client';
import { ChurnRingBadge } from '../components/ChurnRingBadge';

export function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'spend' | 'days' | 'orders'>('spend');
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadCustomers = async () => {
    try {
      const data = await api.get<any[]>('/api/customers');
      setCustomers(data);
      setFiltered(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    let result = [...customers];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        c => c.name.toLowerCase().includes(term) || c.city.toLowerCase().includes(term)
      );
    }

    if (riskFilter !== 'all') {
      result = result.filter(c => c.churnRisk === riskFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'spend') {
        return b.totalSpend - a.totalSpend;
      } else if (sortBy === 'days') {
        return b.daysSinceLastOrder - a.daysSinceLastOrder;
      } else {
        return b.totalOrders - a.totalOrders;
      }
    });

    setFiltered(result);
  }, [searchTerm, riskFilter, sortBy, customers]);

  const handleViewHistory = async (customerId: string) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      setSelectedHistory([]);
      return;
    }

    setExpandedId(customerId);
    setLoadingHistory(true);
    try {
      const detail = await api.get<any>(`/api/customers/${customerId}`);
      setSelectedHistory(detail.orders || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xl }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: theme.typography.size2xl, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
          Shopper Directory
        </h1>
        <p style={{ fontSize: theme.typography.sizeBase, color: theme.colors.textSecondary, marginTop: '4px' }}>
          Explore and filter your database of 60 Roastery Co. customers.
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        backgroundColor: theme.colors.bgPrimary,
        border: `0.5px solid ${theme.colors.borderDefault}`,
        borderRadius: theme.radii.md,
        padding: theme.spacing.lg,
        boxShadow: theme.shadows.sm,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme.spacing.md
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search by name or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: theme.spacing.md,
              border: `1px solid ${theme.colors.borderDefault}`,
              borderRadius: theme.radii.sm,
              fontSize: theme.typography.sizeBase,
              outline: 'none',
              fontFamily: theme.typography.fontSans
            }}
          />
        </div>

        {/* Churn Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          <span style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, fontWeight: theme.typography.weightMedium }}>
            Risk:
          </span>
          <select
            value={riskFilter}
            onChange={(e: any) => setRiskFilter(e.target.value)}
            style={{
              padding: theme.spacing.md,
              borderRadius: theme.radii.sm,
              border: `1px solid ${theme.colors.borderDefault}`,
              fontSize: theme.typography.sizeBase,
              outline: 'none',
              fontFamily: theme.typography.fontSans,
              backgroundColor: theme.colors.bgPrimary
            }}
          >
            <option value="all">All Risks</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>

        {/* Sorting Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          <span style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary, fontWeight: theme.typography.weightMedium }}>
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            style={{
              padding: theme.spacing.md,
              borderRadius: theme.radii.sm,
              border: `1px solid ${theme.colors.borderDefault}`,
              fontSize: theme.typography.sizeBase,
              outline: 'none',
              fontFamily: theme.typography.fontSans,
              backgroundColor: theme.colors.bgPrimary
            }}
          >
            <option value="spend">Total Spend</option>
            <option value="orders">Order Count</option>
            <option value="days">Days Since Order</option>
          </select>
        </div>
      </div>

      {/* Shopper Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: theme.spacing.xl
      }}>
        {filtered.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '48px',
            color: theme.colors.textTertiary,
            fontStyle: 'italic',
            backgroundColor: theme.colors.bgPrimary,
            border: `1px dashed ${theme.colors.borderDefault}`,
            borderRadius: theme.radii.lg
          }}>
            No customers match the active filters.
          </div>
        ) : (
          filtered.map((c) => {
            const initials = c.name.split(' ').map((n: string) => n[0]).join('');
            const isExpanded = expandedId === c.id;

            return (
              <div
                key={c.id}
                style={{
                  backgroundColor: theme.colors.bgPrimary,
                  border: `0.5px solid ${theme.colors.borderDefault}`,
                  borderRadius: theme.radii.lg,
                  padding: theme.spacing.xl,
                  boxShadow: theme.shadows.sm,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md,
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Churn Risk Badge (Top Right) */}
                <div style={{ position: 'absolute', top: theme.spacing.lg, right: theme.spacing.lg }}>
                  <ChurnRingBadge risk={c.churnRisk} score={c.churnScore} size={30} />
                </div>

                {/* Top Info */}
                <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: theme.radii.full,
                    backgroundColor: theme.colors.accentLight,
                    color: theme.colors.accentDark,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: theme.typography.weightBold,
                    fontSize: theme.typography.sizeBase
                  }}>
                    {initials}
                  </div>
                  <div>
                    <h3 style={{ fontSize: theme.typography.sizeMd, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
                      {c.name}
                    </h3>
                    <p style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textSecondary }}>
                      📍 {c.city}
                    </p>
                  </div>
                </div>

                {/* Stats list */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: theme.spacing.sm,
                  fontSize: theme.typography.sizeSm,
                  borderTop: `1px solid ${theme.colors.bgTertiary}`,
                  borderBottom: `1px solid ${theme.colors.bgTertiary}`,
                  padding: `${theme.spacing.sm} 0`,
                  color: theme.colors.textSecondary
                }}>
                  <div>
                    <span style={{ fontSize: '11px', color: theme.colors.textTertiary }}>Orders</span>
                    <div style={{ fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>{c.totalOrders} orders</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: theme.colors.textTertiary }}>Total Spend</span>
                    <div style={{ fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>₹{c.totalSpend}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: theme.colors.textTertiary }}>Last Order</span>
                    <div style={{ fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>{c.daysSinceLastOrder}d ago</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: theme.colors.textTertiary }}>Top Drink</span>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: theme.colors.bgSecondary,
                      color: theme.colors.accent,
                      fontSize: '11px',
                      padding: `2px ${theme.spacing.sm}`,
                      borderRadius: theme.radii.sm,
                      fontWeight: theme.typography.weightBold,
                      marginTop: '2px'
                    }}>
                      ☕ {c.topProduct}
                    </div>
                  </div>
                </div>

                {/* View History Button */}
                <button
                  onClick={() => handleViewHistory(c.id)}
                  style={{
                    backgroundColor: 'transparent',
                    border: `1px solid ${theme.colors.borderDefault}`,
                    borderRadius: theme.radii.md,
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    cursor: 'pointer',
                    fontSize: theme.typography.sizeSm,
                    fontWeight: theme.typography.weightMedium,
                    fontFamily: theme.typography.fontSans,
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.borderStrong;
                    e.currentTarget.style.color = theme.colors.textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.borderDefault;
                    e.currentTarget.style.color = theme.colors.textSecondary;
                  }}
                >
                  {isExpanded ? 'Hide history ▲' : 'View history ▼'}
                </button>

                {/* Timeline History Drawer */}
                {isExpanded && (
                  <div style={{
                    marginTop: theme.spacing.sm,
                    backgroundColor: theme.colors.bgSecondary,
                    borderRadius: theme.radii.md,
                    padding: theme.spacing.md,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing.sm
                  }}>
                    <h4 style={{ fontSize: theme.typography.sizeSm, fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
                      Recent orders timeline
                    </h4>
                    {loadingHistory ? (
                      <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textTertiary, fontStyle: 'italic' }}>
                        Loading timeline...
                      </div>
                    ) : selectedHistory.length === 0 ? (
                      <div style={{ fontSize: theme.typography.sizeSm, color: theme.colors.textTertiary, fontStyle: 'italic' }}>
                        No orders recorded.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs, borderLeft: `2px solid ${theme.colors.borderDefault}`, paddingLeft: theme.spacing.md, marginLeft: '4px' }}>
                        {selectedHistory.slice(0, 5).map((o: any) => (
                          <div key={o.id} style={{ position: 'relative', fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}>
                            <div style={{
                              position: 'absolute',
                              left: '-14px',
                              top: '4px',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: theme.colors.accent
                            }} />
                            <div style={{ fontWeight: theme.typography.weightBold, color: theme.colors.textPrimary }}>
                              {o.product_name}
                            </div>
                            <div>
                              ₹{Math.round(o.amount)} — {new Date(o.ordered_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
