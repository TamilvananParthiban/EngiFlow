import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Search, Filter, Edit2, CheckCircle2,
  AlertCircle, Building2, Calendar, DollarSign, ShieldCheck, Clock, Trash2
} from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatINR } from '../../utils/format';

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    vendorId: '',
    service: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    billingPeriod: '',
    subtotal: 0,
    gstPercent: 18,
    dueDate: '',
    approvalStatus: 'DRAFT',
    paymentStatus: 'PENDING',
    remarks: '',
  });

  // Fetch Invoices
  const { data: invoicesRes, isLoading } = useQuery({
    queryKey: ['invoices', vendorFilter, paymentFilter, approvalFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vendorFilter) params.append('vendorId', vendorFilter);
      if (paymentFilter) params.append('paymentStatus', paymentFilter);
      if (approvalFilter) params.append('approvalStatus', approvalFilter);
      params.append('limit', '100');
      const res = await api.get(`/invoices?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Vendors dropdown
  const { data: vendorsRes } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await api.get('/vendors?limit=100')).data,
  });

  const invoices = invoicesRes?.data || [];
  const vendors = vendorsRes?.data || [];

  const filteredInvoices = invoices.filter((i: any) =>
    i.invoiceCode?.toLowerCase().includes(search.toLowerCase()) ||
    i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    i.service?.toLowerCase().includes(search.toLowerCase()) ||
    i.vendor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalAmount = invoices.reduce((sum: number, i: any) => sum + Number(i.totalAmount || 0), 0);
  const pendingApprovals = invoices.filter((i: any) => i.approvalStatus === 'DRAFT' || i.approvalStatus === 'PENDING').length;
  const totalPaid = invoices
    .filter((i: any) => i.paymentStatus === 'PAID')
    .reduce((sum: number, i: any) => sum + Number(i.totalAmount || 0), 0);
  const totalUnpaid = totalAmount - totalPaid;

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingInvoice) return api.put(`/invoices/${editingInvoice.id}`, payload);
      return api.post('/invoices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/invoices/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeletingInvoice(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => api.post('/invoices/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    },
  });

  const resetForm = () => {
    setEditingInvoice(null);
    setFormData({
      invoiceNumber: '',
      vendorId: vendors[0]?.id || '',
      service: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      billingPeriod: '',
      subtotal: 0,
      gstPercent: 18,
      dueDate: '',
      approvalStatus: 'DRAFT',
      paymentStatus: 'PENDING',
      remarks: '',
    });
  };

  const handleEdit = (i: any) => {
    setEditingInvoice(i);
    setFormData({
      invoiceNumber: i.invoiceNumber || '',
      vendorId: i.vendorId || '',
      service: i.service || '',
      invoiceDate: i.invoiceDate ? i.invoiceDate.split('T')[0] : '',
      billingPeriod: i.billingPeriod || '',
      subtotal: Number(i.subtotal || 0),
      gstPercent: Number(i.gstPercent || 18),
      dueDate: i.dueDate ? i.dueDate.split('T')[0] : '',
      approvalStatus: i.approvalStatus || 'DRAFT',
      paymentStatus: i.paymentStatus || 'PENDING',
      remarks: i.remarks || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      subtotal: Number(formData.subtotal),
      gstPercent: Number(formData.gstPercent),
      vendorId: formData.vendorId,
    });
  };

  // Preview total GST & Amount
  const computedGst = (Number(formData.subtotal || 0) * Number(formData.gstPercent || 0)) / 100;
  const computedTotal = Number(formData.subtotal || 0) + computedGst;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FileText className="w-7 h-7 text-indigo-500" /> Vendor Invoice Registry
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Process vendor bills, GST calculations, IT manager approvals & payment readiness
          </p>
        </div>

        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Record New Invoice
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <div className="text-xs text-muted">Total Invoices</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
            <div className="text-xs text-muted">Pending Manager Approval</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatINR(totalAmount)}</div>
            <div className="text-xs text-muted">Total Invoice Value</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatINR(totalPaid)}</div>
            <div className="text-xs text-muted">Total Paid to Date</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search code, invoice no, service, vendor..."
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

          <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="input-field">
            <option value="">All Approvals</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="input-field">
            <option value="">All Payment Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAYMENT_PENDING">Payment Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="card p-3 bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-indigo-200">
            <span className="font-bold text-indigo-400 font-mono text-base">{selectedIds.length}</span> invoice(s) selected
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
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading invoice registry...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No invoice records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(filteredInvoices.map((i: any) => i.id));
                        else setSelectedIds([]);
                      }}
                      className="rounded border-subtle text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th>Code</th>
                  <th>Vendor</th>
                  <th>Invoice No & Service</th>
                  <th>Date & Due</th>
                  <th>Subtotal</th>
                  <th>GST %</th>
                  <th>Total Amount</th>
                  <th>Approval</th>
                  <th>Payment</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((i: any) => (
                  <tr key={i.id} className={selectedIds.includes(i.id) ? 'bg-indigo-500/10' : ''}>
                    <td className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(i.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, i.id]);
                          else setSelectedIds(selectedIds.filter(id => id !== i.id));
                        }}
                        className="rounded border-subtle text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="font-mono text-xs font-bold text-indigo-400">{i.invoiceCode}</td>
                    <td className="font-medium text-xs">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-muted" />
                        {i.vendor?.name || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium text-xs">{i.invoiceNumber}</div>
                      {i.service && <div className="text-[10px] text-muted">{i.service}</div>}
                    </td>
                    <td className="text-xs">
                      <div>{formatDate(i.invoiceDate)}</div>
                      {i.dueDate && <div className="text-muted text-[10px]">Due: {formatDate(i.dueDate)}</div>}
                    </td>
                    <td className="text-xs font-mono">{formatINR(i.subtotal)}</td>
                    <td className="text-xs text-muted font-mono">{i.gstPercent}% ({formatINR(i.gstAmount)})</td>
                    <td className="font-semibold text-sm">{formatINR(i.totalAmount)}</td>
                    <td>
                      <span className={`badge ${i.approvalStatus === 'APPROVED' ? 'badge-green' : i.approvalStatus === 'REJECTED' ? 'badge-red' : 'badge-amber'}`}>
                        {i.approvalStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${i.paymentStatus === 'PAID' ? 'badge-blue' : i.paymentStatus === 'PAYMENT_PENDING' ? 'badge-purple' : 'badge-gray'}`}>
                        {i.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {i.approvalStatus !== 'APPROVED' && (
                          <button
                            onClick={() => approveMutation.mutate(i.id)}
                            disabled={approveMutation.isPending}
                            className="btn-secondary text-[11px] py-1 px-2 text-emerald-400 border-emerald-500/30 flex items-center gap-1"
                            title="Approve Invoice"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        <button onClick={() => handleEdit(i)} className="btn-icon" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingInvoice(i)}
                          className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Invoice Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <h2 className="text-lg font-bold mb-4">{editingInvoice ? 'Edit Vendor Invoice' : 'Record New Invoice'}</h2>

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
                  <label className="label">Vendor Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="INV-2026-9081"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Service / Item Description</label>
                  <input
                    type="text"
                    placeholder="ISP Internet Bill / Server AMC renewal"
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Billing Period</label>
                  <input
                    type="text"
                    placeholder="September 2026"
                    value={formData.billingPeriod}
                    onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Payment Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-surface border border-subtle">
                <div>
                  <label className="label">Subtotal (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
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
                <div>
                  <label className="label text-muted">Computed Total (₹)</label>
                  <div className="text-lg font-bold text-indigo-400 mt-2">{formatINR(computedTotal)}</div>
                  <div className="text-[10px] text-muted">GST Amount: {formatINR(computedGst)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Approval Status</label>
                  <select
                    value={formData.approvalStatus}
                    onChange={(e) => setFormData({ ...formData, approvalStatus: e.target.value })}
                    className="input-field"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="input-field"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PAYMENT_PENDING">Payment Pending</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Notes for finance team or approval comments..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {deletingInvoice && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Delete Invoice</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete invoice <strong className="text-indigo-400 font-mono">{deletingInvoice.invoiceCode}</strong> ({deletingInvoice.invoiceNumber})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingInvoice(null)}
                className="btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deletingInvoice.id)}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Invoices Modal */}
      {isBulkDeleteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Bulk Delete Invoices</h2>
            </div>
            <p className="text-sm mb-4 text-muted">
              Are you sure you want to delete <strong className="text-indigo-400 font-mono">{selectedIds.length}</strong> selected invoices? This action cannot be undone.
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
