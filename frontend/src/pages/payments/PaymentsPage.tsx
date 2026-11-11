import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, Search, Filter, Edit2, CheckCircle2,
  AlertCircle, Building2, Calendar, DollarSign, FileText, ArrowRightLeft
} from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatINR } from '../../utils/format';

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    vendorId: '',
    invoiceId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMode: 'NEFT',
    referenceNumber: '',
    remarks: '',
  });

  // Fetch Payments
  const { data: paymentsRes, isLoading } = useQuery({
    queryKey: ['payments', vendorFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vendorFilter) params.append('vendorId', vendorFilter);
      params.append('limit', '100');
      const res = await api.get(`/payments?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Vendors
  const { data: vendorsRes } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await api.get('/vendors?limit=100')).data,
  });

  // Fetch Invoices
  const { data: invoicesRes } = useQuery({
    queryKey: ['invoices-list'],
    queryFn: async () => (await api.get('/invoices?limit=100')).data,
  });

  const payments = paymentsRes?.data || [];
  const vendors = vendorsRes?.data || [];
  const invoices = invoicesRes?.data || [];

  const filteredPayments = payments.filter((p: any) =>
    p.paymentCode?.toLowerCase().includes(search.toLowerCase()) ||
    p.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.paymentMode?.toLowerCase().includes(search.toLowerCase())
  ).filter((p: any) => modeFilter ? p.paymentMode === modeFilter : true);

  // Stats
  const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const neftCount = payments.filter((p: any) => p.paymentMode === 'NEFT' || p.paymentMode === 'RTGS').length;

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      vendorId: vendors[0]?.id || '',
      invoiceId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentMode: 'NEFT',
      referenceNumber: '',
      remarks: '',
    });
  };

  const handleInvoiceSelect = (invId: string) => {
    const inv = invoices.find((i: any) => i.id === invId);
    if (inv) {
      setFormData({
        ...formData,
        invoiceId: inv.id,
        vendorId: inv.vendorId,
        amount: Number(inv.totalAmount || 0),
      });
    } else {
      setFormData({ ...formData, invoiceId: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      amount: Number(formData.amount),
      invoiceId: formData.invoiceId || undefined,
      vendorId: formData.vendorId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CreditCard className="w-7 h-7 text-indigo-500" /> Payment Records & UTR Tracking
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Track banking payments, NEFT/RTGS transaction UTR numbers & linked vendor invoice settlements
          </p>
        </div>

        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{payments.length}</div>
            <div className="text-xs text-muted">Total Payments Recorded</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatINR(totalPaid)}</div>
            <div className="text-xs text-muted">Total Settled Amount</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{neftCount}</div>
            <div className="text-xs text-muted">NEFT / RTGS Online Transfers</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{payments.filter((p: any) => p.invoiceId).length}</div>
            <div className="text-xs text-muted">Linked to Invoice</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search payment code, UTR, vendor, mode..."
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

          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="input-field">
            <option value="">All Payment Modes</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="CHEQUE">Cheque</option>
            <option value="UPI">UPI</option>
            <option value="CREDIT_CARD">Credit Card</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading payment records...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No payment transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Payment Code</th>
                  <th>Vendor</th>
                  <th>Linked Invoice</th>
                  <th>Payment Date</th>
                  <th>Amount Paid</th>
                  <th>Mode</th>
                  <th>UTR / Reference No.</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs font-bold text-indigo-400">{p.paymentCode}</td>
                    <td className="font-medium text-xs">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-muted" />
                        {p.vendor?.name || '—'}
                      </span>
                    </td>
                    <td className="text-xs">
                      {p.invoice ? (
                        <span className="font-mono text-indigo-300 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-muted" />
                          {p.invoice.invoiceCode} ({p.invoice.invoiceNumber})
                        </span>
                      ) : (
                        <span className="text-muted">Direct Payment</span>
                      )}
                    </td>
                    <td className="text-xs">{formatDate(p.paymentDate)}</td>
                    <td className="font-semibold text-sm text-emerald-400">{formatINR(p.amount)}</td>
                    <td><span className="badge badge-purple">{p.paymentMode}</span></td>
                    <td className="font-mono text-xs">{p.referenceNumber || '—'}</td>
                    <td className="text-xs text-muted">{p.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-xl">
            <h2 className="text-lg font-bold mb-4">Record New Payment Transaction</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Select Invoice to Settle (Optional)</label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className="input-field"
                >
                  <option value="">None (Direct Payment without invoice link)</option>
                  {invoices.map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.invoiceCode} - {i.vendor?.name} (Inv #{i.invoiceNumber}) - {formatINR(i.totalAmount)} [{i.paymentStatus}]
                    </option>
                  ))}
                </select>
              </div>

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
                  <label className="label">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="input-field font-semibold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="label">Payment Mode *</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="input-field"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">UTR / Reference / Transaction No.</label>
                <input
                  type="text"
                  placeholder="UTR1234567890"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="label">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Bank payment reference notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
