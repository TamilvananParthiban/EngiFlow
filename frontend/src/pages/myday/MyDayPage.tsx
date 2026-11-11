import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, CheckCircle2, AlertCircle, Users, Timer, Plus, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatTime } from '../../utils/format';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10b981',
  IN_PROGRESS: '#3742FA',
  PENDING: '#f59e0b',
  PLANNED: '#64748b',
  WAITING_FOR_VENDOR: '#f97316',
  WAITING_FOR_APPROVAL: '#8b5cf6',
  CANCELLED: '#94a3b8',
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: 'var(--kpi-green)',
  IN_PROGRESS: 'var(--kpi-blue)',
  PENDING: 'var(--kpi-amber)',
  PLANNED: 'var(--border-subtle)',
  WAITING_FOR_VENDOR: 'var(--kpi-orange)',
  WAITING_FOR_APPROVAL: 'var(--kpi-purple)',
  CANCELLED: 'var(--border-subtle)',
};

export default function MyDayPage() {
  const [eodOpen, setEodOpen] = useState(false);
  const [eodForm, setEodForm] = useState({
    majorActivities: '',
    issuesEncountered: '',
    pendingItems: '',
    vendorFollowups: '',
    tomorrowPlan: '',
    totalWorkingHours: '',
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const { data: todayData, isLoading } = useQuery({
    queryKey: ['activities', 'today'],
    queryFn: async () => {
      const res = await api.get('/activities/today');
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  const { data: followupsData } = useQuery({
    queryKey: ['followups', 'today'],
    queryFn: async () => {
      const res = await api.get('/followups/today');
      return res.data.data;
    },
  });

  const activities = todayData?.activities || [];
  const summary = todayData?.summary || {};
  const followups = followupsData || [];

  const saveEOD = async () => {
    try {
      await api.post('/activities/eod', {
        ...eodForm,
        totalWorkingHours: parseFloat(eodForm.totalWorkingHours) || null,
      });
      setEodOpen(false);
      alert('EOD summary saved!');
    } catch {
      alert('Failed to save EOD summary');
    }
  };

  const SummaryCard = ({ label, value, icon: Icon, color }: {
    label: string; value: number | string; icon: React.ElementType; color: string;
  }) => (
    <div
      className="card p-4 flex items-center gap-3"
      style={{ flex: '1 1 0' }}
    >
      <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Day</h1>
          <p className="page-subtitle">{today}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = '/activities'}>
            <Plus size={14} /> Add Activity
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEodOpen(true)}>
            <Edit2 size={14} /> EOD Summary
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <SummaryCard label="Total" value={summary.total || 0} icon={CalendarDays} color="#3742FA" />
        <SummaryCard label="Completed" value={summary.completed || 0} icon={CheckCircle2} color="#10b981" />
        <SummaryCard label="Pending" value={summary.pending || 0} icon={Clock} color="#f59e0b" />
        <SummaryCard label="In Progress" value={summary.inProgress || 0} icon={Timer} color="#8b5cf6" />
        <SummaryCard label="Vendor Follow-ups" value={followups.length} icon={Users} color="#f97316" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Timeline */}
        <div>
          <div className="card p-5">
            <h2 className="chart-title mb-5">Today's Activity Timeline</h2>

            {isLoading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="skeleton h-4 w-12" />
                    <div className="flex-1 skeleton h-16 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="empty-state">
                <CalendarDays className="empty-state-icon" />
                <div className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No activities today</div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Start recording your IT activities</p>
                <a href="/activities" className="btn btn-primary btn-sm mt-2">
                  <Plus size={14} /> Add First Activity
                </a>
              </div>
            ) : (
              <div className="timeline">
                {activities.map((a: Record<string, string>, i: number) => (
                  <div key={a.id} className="timeline-item">
                    <div
                      className="timeline-dot"
                      style={{ background: STATUS_COLORS[a.status] || '#64748b' }}
                    />
                    <div className="flex items-start gap-3">
                      {/* Time */}
                      <div
                        className="text-xs font-bold flex-shrink-0 text-right"
                        style={{ width: 42, paddingTop: 2, color: 'var(--text-muted)', fontFamily: 'monospace' }}
                      >
                        {a.startTime || '—'}
                      </div>

                      {/* Card */}
                      <div
                        className="flex-1 rounded-xl p-3 border"
                        style={{
                          background: STATUS_BG[a.status] || 'var(--bg-body)',
                          borderColor: 'var(--border-color)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                              {a.title}
                            </div>
                            {a.description && (
                              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {a.description}
                              </div>
                            )}
                            {a.actionTaken && (
                              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                ✅ {a.actionTaken}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: STATUS_COLORS[a.status] + '20',
                                color: STATUS_COLORS[a.status],
                              }}
                            >
                              {a.status?.replace(/_/g, ' ')}
                            </span>
                            <span className="badge badge-gray text-[10px]">
                              {a.category?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>

                        {a.followupRequired === 'true' && (
                          <div
                            className="mt-2 text-xs px-2 py-1 rounded-lg inline-flex items-center gap-1"
                            style={{ background: '#fef3c7', color: '#92400e' }}
                          >
                            📅 Follow-up: {a.followupDate ? formatDate(a.followupDate) : 'Scheduled'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Today's Follow-ups */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
              📋 Today's Follow-ups ({followups.length})
            </h3>
            {followups.length === 0 ? (
              <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No follow-ups due today
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {followups.map((f: Record<string, string>) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl border text-sm"
                    style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{f.subject}</div>
                    {f.vendor && (
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        🏢 {(f.vendor as unknown as Record<string, string>)?.name}
                      </div>
                    )}
                    <span className={`badge badge-amber mt-1`}>{f.communicationType}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Work stats */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
              📊 Today's Stats
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Total Activities', value: summary.total || 0 },
                { label: 'Completed', value: summary.completed || 0 },
                { label: 'Pending', value: summary.pending || 0 },
                { label: 'Vendor Follow-ups', value: followups.length },
              ].map((s) => (
                <div key={s.label} className="stat-row">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                </div>
              ))}
              <div className="stat-row">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Completion Rate</span>
                <span className="font-bold text-sm" style={{ color: '#10b981' }}>
                  {summary.total ? Math.round((summary.completed / summary.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick status update tip */}
          <div
            className="p-4 rounded-xl text-sm"
            style={{ background: 'var(--color-primary-subtle)', border: '1px solid #3742FA30' }}
          >
            <div className="font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>💡 End of Day</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Remember to click "EOD Summary" before leaving to record your day's work,
              pending items, and tomorrow's plan.
            </div>
          </div>
        </div>
      </div>

      {/* EOD Modal */}
      {eodOpen && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                📝 End of Day Summary
              </h2>
              <button className="btn-icon" onClick={() => setEodOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="form-label">Major Activities Completed</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="List the major tasks completed today..."
                    value={eodForm.majorActivities}
                    onChange={(e) => setEodForm({ ...eodForm, majorActivities: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Issues Encountered</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Any problems or issues faced today..."
                    value={eodForm.issuesEncountered}
                    onChange={(e) => setEodForm({ ...eodForm, issuesEncountered: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Pending Items</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Tasks still pending completion..."
                    value={eodForm.pendingItems}
                    onChange={(e) => setEodForm({ ...eodForm, pendingItems: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Vendor Follow-ups</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Vendor communications and follow-ups..."
                    value={eodForm.vendorFollowups}
                    onChange={(e) => setEodForm({ ...eodForm, vendorFollowups: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Tomorrow's Plan</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="What you plan to work on tomorrow..."
                    value={eodForm.tomorrowPlan}
                    onChange={(e) => setEodForm({ ...eodForm, tomorrowPlan: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Total Working Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    className="form-input"
                    placeholder="e.g. 8.5"
                    value={eodForm.totalWorkingHours}
                    onChange={(e) => setEodForm({ ...eodForm, totalWorkingHours: e.target.value })}
                    style={{ maxWidth: 160 }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEodOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEOD}>
                Save EOD Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
