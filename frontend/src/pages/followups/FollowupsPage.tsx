import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Plus, Search, Filter, CheckCircle2, Clock, Calendar,
  Building2, Ticket, FileText, CheckSquare, Trash2, Edit2, AlertCircle, PhoneCall
} from 'lucide-react';
import api from '../../services/api';
import { formatDate } from '../../utils/format';

export default function FollowupsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState<any>(null);

  const [formData, setFormData] = useState({
    subject: '',
    followupDate: new Date().toISOString().split('T')[0],
    communicationType: 'CALL',
    notes: '',
    status: 'PENDING',
    vendorId: '',
  });

  // Fetch followups
  const { data: followupsRes, isLoading } = useQuery({
    queryKey: ['followups', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/followups?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Vendors for dropdown
  const { data: vendorsRes } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const res = await api.get('/vendors?limit=100');
      return res.data;
    },
  });

  const followups = followupsRes?.data || [];
  const vendors = vendorsRes?.data || [];

  // Filtered list
  const filteredFollowups = followups.filter((f: any) =>
    f.subject?.toLowerCase().includes(search.toLowerCase()) ||
    f.followupCode?.toLowerCase().includes(search.toLowerCase()) ||
    f.vendor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Quick stats
  const pendingCount = followups.filter((f: any) => f.status === 'PENDING').length;
  const completedCount = followups.filter((f: any) => f.status === 'COMPLETED').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = followups.filter((f: any) => f.followupDate?.startsWith(todayStr)).length;

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingFollowup) {
        return api.put(`/followups/${editingFollowup.id}`, payload);
      }
      return api.post('/followups', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/followups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => api.post('/followups/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    },
  });

  // Mark status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.put(`/followups/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  const resetForm = () => {
    setEditingFollowup(null);
    setFormData({
      subject: '',
      followupDate: new Date().toISOString().split('T')[0],
      communicationType: 'CALL',
      notes: '',
      status: 'PENDING',
      vendorId: '',
    });
  };

  const handleEdit = (f: any) => {
    setEditingFollowup(f);
    setFormData({
      subject: f.subject || '',
      followupDate: f.followupDate ? f.followupDate.split('T')[0] : '',
      communicationType: f.communicationType || 'CALL',
      notes: f.notes || '',
      status: f.status || 'PENDING',
      vendorId: f.vendorId || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      vendorId: formData.vendorId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Bell className="w-7 h-7 text-indigo-500" /> Follow-up Tracker
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Monitor vendor calls, ticket updates, invoice payments & scheduled follow-ups
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Follow-up
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{followups.length}</div>
            <div className="text-xs text-muted">Total Follow-ups</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <div className="text-xs text-muted">Pending Action</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{todayCount}</div>
            <div className="text-xs text-muted">Scheduled Today</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs text-muted">Completed</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search follow-ups or vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading follow-ups...</div>
        ) : filteredFollowups.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No follow-up records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredFollowups.length > 0 &&
                        selectedIds.length === filteredFollowups.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredFollowups.map((f: any) => f.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th>Code</th>
                  <th>Subject</th>
                  <th>Vendor / Linked Entity</th>
                  <th>Communication</th>
                  <th>Follow-up Date</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.map((f: any) => {
                  const isSelected = selectedIds.includes(f.id);
                  return (
                    <tr key={f.id} className={isSelected ? 'bg-indigo-500/10' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, f.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== f.id));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="font-mono text-xs font-semibold">{f.followupCode}</td>
                      <td className="font-medium">{f.subject}</td>
                      <td>
                        {f.vendor ? (
                          <span className="flex items-center gap-1 text-xs">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" /> {f.vendor.name}
                          </span>
                        ) : f.ticket ? (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <Ticket className="w-3.5 h-3.5" /> {f.ticket.ticketNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-gray flex items-center gap-1 w-fit">
                          <PhoneCall className="w-3 h-3 text-indigo-400" /> {f.communicationType || 'CALL'}
                        </span>
                      </td>
                      <td className="text-xs font-mono">{formatDate(f.followupDate)}</td>
                      <td>
                        <span className={`badge ${f.status === 'COMPLETED' ? 'badge-green' : 'badge-amber'}`}>
                          {f.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {f.status !== 'COMPLETED' && (
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: f.id, status: 'COMPLETED' })}
                              className="btn-icon text-emerald-400 hover:bg-emerald-500/10"
                              title="Mark Completed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(f)}
                            className="btn-icon"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete follow-up record?')) deleteMutation.mutate(f.id);
                            }}
                            className="btn-icon text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-lg">
            <h2 className="text-lg font-bold mb-4">
              {editingFollowup ? 'Edit Follow-up' : 'Add New Follow-up'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Subject / Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call vendor for RAM replacement update"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Follow-up Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.followupDate}
                    onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Communication Mode</label>
                  <select
                    value={formData.communicationType}
                    onChange={(e) => setFormData({ ...formData, communicationType: e.target.value })}
                    className="input-field"
                  >
                    <option value="CALL">Phone Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="VISIT">Vendor Visit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Associated Vendor</label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Vendor (Optional)</option>
                  {vendors.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <label className="label">Notes / History</label>
                <textarea
                  rows={3}
                  placeholder="Details of conversation or action items..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="btn-primary"
                >
                  {saveMutation.isPending ? 'Saving...' : editingFollowup ? 'Update Follow-up' : 'Create Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="text-xs font-semibold text-slate-200">
            <span className="bg-indigo-500 text-white font-mono px-2 py-0.5 rounded-full text-xs mr-2">
              {selectedIds.length}
            </span>
            follow-ups selected
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-all hover:scale-105 shadow-md shadow-red-900/20"
          >
            <Trash2 size={13} /> Delete Selected
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Bulk Delete Follow-ups</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete <strong className="text-red-400 font-mono">{selectedIds.length}</strong> selected follow-up records? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
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
                {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
