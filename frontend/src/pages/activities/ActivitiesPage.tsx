import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, Download, Search, Edit2, Trash2, Eye, Clock } from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/format';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'badge-green',
  IN_PROGRESS: 'badge-blue',
  PENDING: 'badge-amber',
  PLANNED: 'badge-gray',
  WAITING_FOR_VENDOR: 'badge-orange',
  WAITING_FOR_APPROVAL: 'badge-purple',
  CANCELLED: 'badge-gray',
};

const CATEGORY_OPTIONS = [
  'SYSTEM_ADMINISTRATION', 'NETWORK', 'SERVER', 'BACKUP', 'SECURITY',
  'HARDWARE', 'SOFTWARE', 'CCTV', 'INTERNET', 'VENDOR', 'PURCHASE',
  'AMC', 'USER_SUPPORT', 'DOCUMENTATION', 'MEETING', 'MONITORING', 'PREVENTIVE_MAINTENANCE',
];

interface ActivityFormData {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  actionTaken: string;
  status: string;
  followupRequired: boolean;
  followupDate: string;
  remarks: string;
  
}

function ActivityModal({ activity, onClose, onSave }: {
  activity?: Record<string, string> | null;
  onClose: () => void;
  onSave: (data: ActivityFormData) => void;
}) {
  const [form, setForm] = useState<ActivityFormData>({
    date: activity?.date ? new Date(activity.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    startTime: activity?.startTime || '',
    endTime: activity?.endTime || '',
    title: activity?.title || '',
    category: activity?.category || 'SYSTEM_ADMINISTRATION',
    priority: activity?.priority || 'MEDIUM',
    description: activity?.description || '',
    actionTaken: activity?.actionTaken || '',
    status: activity?.status || 'COMPLETED',
    followupRequired: activity?.followupRequired === 'true' || false,
    followupDate: activity?.followupDate || '',
    remarks: activity?.remarks || '',
  });

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {activity ? 'Edit Activity' : 'Add Activity'}
          </h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Activity Title *</label>
              <input
                className="form-input"
                placeholder="e.g. Server health check, User laptop issue"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Category *</label>
              <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Start Time</label>
              <input type="time" className="form-input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="form-label">End Time</label>
              <input type="time" className="form-input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PENDING', 'WAITING_FOR_VENDOR', 'WAITING_FOR_APPROVAL', 'CANCELLED'].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Describe the activity..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Action Taken</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="What action was taken..."
                value={form.actionTaken}
                onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.followupRequired}
                  onChange={(e) => setForm({ ...form, followupRequired: e.target.checked })}
                />
                <span className="form-label mb-0">Follow-up Required</span>
              </label>
            </div>
            {form.followupRequired && (
              <div>
                <label className="form-label">Follow-up Date</label>
                <input type="date" className="form-input" value={form.followupDate} onChange={(e) => setForm({ ...form, followupDate: e.target.value })} />
              </div>
            )}
            <div className="col-span-2">
              <label className="form-label">Remarks</label>
              <input className="form-input" placeholder="Any additional notes..." value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => { if (form.title && form.date) onSave(form); }}
          >
            {activity ? 'Update Activity' : 'Add Activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Record<string, string> | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Record<string, string> | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['activities', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/activities?${params}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ActivityFormData) => api.post('/activities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setModalOpen(false);
      setEditActivity(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActivityFormData }) => api.put(`/activities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setModalOpen(false);
      setEditActivity(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/activities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setDeletingActivity(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/activities/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    },
  });

  const activities = data?.data || [];
  const meta = data?.meta;

  const handleSave = (formData: ActivityFormData) => {
    if (editActivity) {
      updateMutation.mutate({ id: editActivity.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Activities</h1>
          <p className="page-subtitle">Record and track all your IT activities</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm">
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditActivity(null); setModalOpen(true); }}>
            <Plus size={14} /> Add Activity
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="search-bar" style={{ maxWidth: 300 }}>
          <Search size={16} />
          <input
            placeholder="Search activities..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-select" style={{ width: 160 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {['COMPLETED', 'IN_PROGRESS', 'PENDING', 'PLANNED', 'WAITING_FOR_VENDOR', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="card p-3 mb-4 bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-indigo-200">
            <span className="font-bold text-indigo-400 font-mono text-base">{selectedIds.length}</span> activity record(s) selected
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds([])} className="btn-secondary text-xs">
              Clear Selection
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="btn-primary bg-red-600 hover:bg-red-700 text-white text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={activities.length > 0 && selectedIds.length === activities.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(activities.map((a: any) => a.id));
                    else setSelectedIds([]);
                  }}
                  className="rounded border-subtle text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th>Code</th>
              <th>Date & Time</th>
              <th>Activity</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <Clock className="empty-state-icon" />
                    <div className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No activities found</div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Start by adding your first activity</p>
                    <button className="btn btn-primary btn-sm mt-2" onClick={() => setModalOpen(true)}>
                      <Plus size={14} /> Add Activity
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              activities.map((a: Record<string, string>) => (
                <tr key={a.id} className={selectedIds.includes(a.id) ? 'bg-indigo-500/10' : ''}>
                  <td className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, a.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== a.id));
                      }}
                      className="rounded border-subtle text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td><span className="font-mono-code">{a.activityCode}</span></td>
                  <td>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(a.date)}</div>
                    {a.startTime && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.startTime}{a.endTime ? ` — ${a.endTime}` : ''}</div>}
                  </td>
                  <td>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)', maxWidth: 260 }}>
                      {a.title}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-gray">{a.category?.replace(/_/g, ' ')}</span>
                  </td>
                  <td>
                    <span className={`badge ${a.priority === 'CRITICAL' ? 'badge-red' : a.priority === 'HIGH' ? 'badge-amber' : a.priority === 'MEDIUM' ? 'badge-blue' : 'badge-green'}`}>
                      {a.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[a.status] || 'badge-gray'}`}>
                      {a.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {Boolean(a.followupRequired) ? (
                      <span className="badge badge-amber">📅 {a.followupDate ? formatDate(a.followupDate) : 'Yes'}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => { setEditActivity(a); setModalOpen(true); }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Delete Activity"
                        onClick={() => setDeletingActivity(a)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, meta.total)} of {meta.total}
            </span>
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span className="text-sm font-medium">{page} / {meta.pages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page === meta.pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <ActivityModal
          activity={editActivity}
          onClose={() => { setModalOpen(false); setEditActivity(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingActivity && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Delete Activity</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete activity <strong className="text-indigo-400 font-mono">{deletingActivity.activityCode}</strong> ("{deletingActivity.title}")? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingActivity(null)}
                className="btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deletingActivity.id)}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Bulk Delete Activities</h2>
            </div>
            <p className="text-sm mb-4 text-muted">
              Are you sure you want to delete <strong className="text-indigo-400 font-mono">{selectedIds.length}</strong> selected activities? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="btn-secondary"
                disabled={bulkDeleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white"
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? 'Deleting...' : `Confirm Delete (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
