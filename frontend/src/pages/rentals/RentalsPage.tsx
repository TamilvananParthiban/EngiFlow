import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Laptop, Plus, Search, Filter, Edit2, Trash2, CheckCircle2,
  AlertCircle, Building2, Calendar, DollarSign, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatINR } from '../../utils/format';

export default function RentalsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<any>(null);

  const [formData, setFormData] = useState({
    vendorId: '',
    laptopModel: '',
    serialNumber: '',
    specifications: '',
    rentalStart: new Date().toISOString().split('T')[0],
    rentalEnd: '',
    monthlyRental: 0,
    gstPercent: 18,
    assignedUserName: '',
    assignedUserDepartment: '',
    paymentStatus: 'PENDING',
    returnStatus: 'NOT_RETURNED',
    returnDate: '',
    remarks: '',
  });

  // Fetch Laptop Rentals
  const { data: rentalsRes, isLoading } = useQuery({
    queryKey: ['rentals', vendorFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vendorFilter) params.append('vendorId', vendorFilter);
      if (statusFilter) params.append('paymentStatus', statusFilter);
      params.append('limit', '100');
      const res = await api.get(`/rentals?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Vendors list for dropdown
  const { data: vendorsRes } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await api.get('/vendors?limit=100')).data,
  });

  const rentals = rentalsRes?.data || [];
  const vendors = vendorsRes?.data || [];

  const filteredRentals = rentals.filter((r: any) =>
    r.rentalCode?.toLowerCase().includes(search.toLowerCase()) ||
    r.laptopModel?.toLowerCase().includes(search.toLowerCase()) ||
    r.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
    r.assignedUserName?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const activeCount = rentals.filter((r: any) => r.returnStatus !== 'RETURNED').length;
  const totalMonthlyCost = rentals
    .filter((r: any) => r.returnStatus !== 'RETURNED')
    .reduce((sum: number, r: any) => sum + Number(r.totalMonthly || 0), 0);
  const returnedCount = rentals.filter((r: any) => r.returnStatus === 'RETURNED').length;

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingRental) return api.put(`/rentals/${editingRental.id}`, payload);
      return api.post('/rentals', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/rentals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rentals'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => api.post('/rentals/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    },
  });

  const resetForm = () => {
    setEditingRental(null);
    setFormData({
      vendorId: vendors[0]?.id || '',
      laptopModel: '',
      serialNumber: '',
      specifications: '',
      rentalStart: new Date().toISOString().split('T')[0],
      rentalEnd: '',
      monthlyRental: 0,
      gstPercent: 18,
      assignedUserName: '',
      assignedUserDepartment: '',
      paymentStatus: 'PENDING',
      returnStatus: 'NOT_RETURNED',
      returnDate: '',
      remarks: '',
    });
  };

  const handleEdit = (r: any) => {
    setEditingRental(r);
    setFormData({
      vendorId: r.vendorId || '',
      laptopModel: r.laptopModel || '',
      serialNumber: r.serialNumber || '',
      specifications: r.specifications || '',
      rentalStart: r.rentalStart ? r.rentalStart.split('T')[0] : '',
      rentalEnd: r.rentalEnd ? r.rentalEnd.split('T')[0] : '',
      monthlyRental: Number(r.monthlyRental || 0),
      gstPercent: Number(r.gstPercent || 18),
      assignedUserName: r.assignedUserName || '',
      assignedUserDepartment: r.assignedUserDepartment || '',
      paymentStatus: r.paymentStatus || 'PENDING',
      returnStatus: r.returnStatus || 'NOT_RETURNED',
      returnDate: r.returnDate ? r.returnDate.split('T')[0] : '',
      remarks: r.remarks || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      monthlyRental: Number(formData.monthlyRental),
      gstPercent: Number(formData.gstPercent),
      vendorId: formData.vendorId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Laptop className="w-7 h-7 text-indigo-500" /> Laptop Rental Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Track vendor rental agreements, monthly expenses, assigned users & returns
          </p>
        </div>

        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Rental Agreement
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{rentals.length}</div>
            <div className="text-xs text-muted">Total Agreements</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{activeCount}</div>
            <div className="text-xs text-muted">Active Rentals</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatINR(totalMonthlyCost)}</div>
            <div className="text-xs text-muted">Monthly Rental Outflow</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{returnedCount}</div>
            <div className="text-xs text-muted">Returned Laptops</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search code, model, serial, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted" />
          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="input-field">
            <option value="">All Vendors</option>
            {vendors.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading rental agreements...</div>
        ) : filteredRentals.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No rental records found matching criteria.
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
                        filteredRentals.length > 0 &&
                        selectedIds.length === filteredRentals.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredRentals.map((r: any) => r.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th>Rental Code</th>
                  <th>Model & Specs</th>
                  <th>Serial Number</th>
                  <th>Vendor</th>
                  <th>Assigned User</th>
                  <th>Monthly Rent (incl. GST)</th>
                  <th>Rental Period</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRentals.map((r: any) => {
                  const isSelected = selectedIds.includes(r.id);
                  return (
                    <tr key={r.id} className={isSelected ? 'bg-indigo-500/10' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, r.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== r.id));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="font-mono text-xs font-bold text-indigo-400">{r.rentalCode}</td>
                      <td className="font-medium">
                        {r.laptopModel}
                        {r.specifications && <div className="text-[10px] text-muted">{r.specifications}</div>}
                      </td>
                      <td className="font-mono text-xs">{r.serialNumber || '—'}</td>
                      <td className="text-xs">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-muted" />
                          {r.vendor?.name || '—'}
                        </span>
                      </td>
                      <td className="text-xs">
                        {r.assignedUserName ? (
                          <div>
                            <div className="font-medium">{r.assignedUserName}</div>
                            <div className="text-[10px] text-muted">{r.assignedUserDepartment}</div>
                          </div>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td className="font-semibold text-sm">
                        {formatINR(r.totalMonthly)}
                        <div className="text-[10px] text-muted font-normal">Base: {formatINR(r.monthlyRental)} + {r.gstPercent}% GST</div>
                      </td>
                      <td className="text-xs">
                        <div>Start: {formatDate(r.rentalStart)}</div>
                        {r.rentalEnd && <div className="text-muted">End: {formatDate(r.rentalEnd)}</div>}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className={`badge ${r.returnStatus === 'RETURNED' ? 'badge-gray' : 'badge-green'}`}>
                            {r.returnStatus === 'RETURNED' ? 'Returned' : 'Active'}
                          </span>
                          <span className={`badge ${r.paymentStatus === 'PAID' ? 'badge-blue' : 'badge-amber'}`}>
                            {r.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(r)} className="btn-icon" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete rental agreement?')) deleteMutation.mutate(r.id); }}
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <h2 className="text-lg font-bold mb-4">{editingRental ? 'Edit Rental Agreement' : 'New Rental Agreement'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Vendor *</label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Laptop Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="Lenovo ThinkPad T14"
                    value={formData.laptopModel}
                    onChange={(e) => setFormData({ ...formData, laptopModel: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Serial Number</label>
                  <input
                    type="text"
                    placeholder="PF2X9876"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Specifications</label>
                  <input
                    type="text"
                    placeholder="Core i7 / 16GB RAM / 512GB SSD"
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Rental Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.rentalStart}
                    onChange={(e) => setFormData({ ...formData, rentalStart: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Rental End Date</label>
                  <input
                    type="date"
                    value={formData.rentalEnd}
                    onChange={(e) => setFormData({ ...formData, rentalEnd: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Return Date</label>
                  <input
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Monthly Rental (Base ₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.monthlyRental}
                    onChange={(e) => setFormData({ ...formData, monthlyRental: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">GST %</label>
                  <input
                    type="number"
                    value={formData.gstPercent}
                    onChange={(e) => setFormData({ ...formData, gstPercent: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Assigned User Name</label>
                  <input
                    type="text"
                    placeholder="Rahul Sharma"
                    value={formData.assignedUserName}
                    onChange={(e) => setFormData({ ...formData, assignedUserName: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Assigned Department</label>
                  <input
                    type="text"
                    placeholder="Development"
                    value={formData.assignedUserDepartment}
                    onChange={(e) => setFormData({ ...formData, assignedUserDepartment: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="input-field"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="label">Return Status</label>
                  <select
                    value={formData.returnStatus}
                    onChange={(e) => setFormData({ ...formData, returnStatus: e.target.value })}
                    className="input-field"
                  >
                    <option value="NOT_RETURNED">Active (Not Returned)</option>
                    <option value="RETURNED">Returned to Vendor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes or contract terms..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editingRental ? 'Update Rental' : 'Create Rental'}
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
            rentals selected
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
              <h2 className="text-lg font-bold">Bulk Delete Rentals</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete <strong className="text-red-400 font-mono">{selectedIds.length}</strong> selected rental records? This action cannot be undone.
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
