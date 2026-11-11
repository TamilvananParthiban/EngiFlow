import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Search, Filter, Edit2, Trash2, Eye, Phone, Mail,
  FileText, ShieldCheck, Ticket, CreditCard, X, CheckCircle2, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatINR } from '../../utils/format';

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'HARDWARE_SUPPLIER',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    panNumber: '',
    bankName: '',
    bankAccount: '',
    bankIfsc: '',
    services: '',
    contractStart: '',
    contractEnd: '',
    sla: '',
    status: 'ACTIVE',
    remarks: '',
  });

  // Fetch Vendors
  const { data: vendorsRes, isLoading } = useQuery({
    queryKey: ['vendors', typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '100');
      const res = await api.get(`/vendors?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch Vendor 360 Profile details
  const { data: profileRes, isLoading: isProfileLoading } = useQuery({
    queryKey: ['vendor-profile', selectedVendorId],
    queryFn: async () => {
      if (!selectedVendorId) return null;
      const res = await api.get(`/vendors/${selectedVendorId}/profile`);
      return res.data?.data;
    },
    enabled: !!selectedVendorId,
  });

  const vendors = vendorsRes?.data || [];

  const filteredVendors = vendors.filter((v: any) =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.vendorCode?.toLowerCase().includes(search.toLowerCase()) ||
    v.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
    v.services?.toLowerCase().includes(search.toLowerCase())
  );

  const activeVendors = vendors.filter((v: any) => v.status === 'ACTIVE').length;

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingVendor) return api.put(`/vendors/${editingVendor.id}`, payload);
      return api.post('/vendors', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/vendors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendors'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => api.post('/vendors/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    },
  });

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      type: 'HARDWARE_SUPPLIER',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: '',
      panNumber: '',
      bankName: '',
      bankAccount: '',
      bankIfsc: '',
      services: '',
      contractStart: '',
      contractEnd: '',
      sla: '',
      status: 'ACTIVE',
      remarks: '',
    });
  };

  const handleEdit = (v: any) => {
    setEditingVendor(v);
    setFormData({
      name: v.name || '',
      type: v.type || 'HARDWARE_SUPPLIER',
      contactPerson: v.contactPerson || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      gstNumber: v.gstNumber || '',
      panNumber: v.panNumber || '',
      bankName: v.bankName || '',
      bankAccount: v.bankAccount || '',
      bankIfsc: v.bankIfsc || '',
      services: v.services || '',
      contractStart: v.contractStart ? v.contractStart.split('T')[0] : '',
      contractEnd: v.contractEnd ? v.contractEnd.split('T')[0] : '',
      sla: v.sla || '',
      status: v.status || 'ACTIVE',
      remarks: v.remarks || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Building2 className="w-7 h-7 text-indigo-500" /> Vendor Management & 360° Directory
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage IT suppliers, service providers, ISP, AMC vendors and contract SLAs
          </p>
        </div>

        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{vendors.length}</div>
            <div className="text-xs text-muted">Total Vendors</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{activeVendors}</div>
            <div className="text-xs text-muted">Active Suppliers</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {vendors.reduce((acc: number, v: any) => acc + (v._count?.amcContracts || 0), 0)}
            </div>
            <div className="text-xs text-muted">Active AMCs / Contracts</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {vendors.reduce((acc: number, v: any) => acc + (v._count?.invoices || 0), 0)}
            </div>
            <div className="text-xs text-muted">Invoices Processed</div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search vendor code, name, contact, services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field">
            <option value="">All Vendor Types</option>
            <option value="HARDWARE_SUPPLIER">Hardware Supplier</option>
            <option value="SOFTWARE_VENDOR">Software Vendor</option>
            <option value="ISP">Internet / ISP</option>
            <option value="AMC_PROVIDER">AMC Service Provider</option>
            <option value="RENTAL_PROVIDER">Laptop Rental Provider</option>
            <option value="CCTV_VENDOR">CCTV Vendor</option>
            <option value="OTHER">Other</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading vendor directory...</div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No vendor records found.
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
                        filteredVendors.length > 0 &&
                        selectedIds.length === filteredVendors.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredVendors.map((v: any) => v.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th>Vendor Code</th>
                  <th>Company Name</th>
                  <th>Type</th>
                  <th>Primary Contact</th>
                  <th>Phone & Email</th>
                  <th>GST No.</th>
                  <th>Linked Records</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v: any) => {
                  const isSelected = selectedIds.includes(v.id);
                  return (
                    <tr key={v.id} className={isSelected ? 'bg-indigo-500/10' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, v.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== v.id));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="font-mono text-xs font-bold text-indigo-400">{v.vendorCode}</td>
                      <td className="font-medium text-sm">
                        {v.name}
                        {v.services && <div className="text-[11px] text-muted">{v.services}</div>}
                      </td>
                      <td><span className="badge badge-gray text-[10px]">{v.type?.replace(/_/g, ' ')}</span></td>
                      <td className="text-xs font-medium">{v.contactPerson || '—'}</td>
                      <td className="text-xs">
                        {v.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted" />{v.phone}</div>}
                        {v.email && <div className="flex items-center gap-1 text-muted"><Mail className="w-3 h-3 text-muted" />{v.email}</div>}
                      </td>
                      <td className="font-mono text-xs">{v.gstNumber || '—'}</td>
                      <td className="text-xs">
                        <div className="flex gap-2 text-muted">
                          <span title="Invoices"><FileText className="w-3.5 h-3.5 inline mr-0.5" />{v._count?.invoices || 0}</span>
                          <span title="Tickets"><Ticket className="w-3.5 h-3.5 inline mr-0.5" />{v._count?.tickets || 0}</span>
                          <span title="AMCs"><ShieldCheck className="w-3.5 h-3.5 inline mr-0.5" />{v._count?.amcContracts || 0}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${v.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedVendorId(v.id)}
                            className="btn-icon text-indigo-400"
                            title="View 360° Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(v)} className="btn-icon" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete vendor?')) deleteMutation.mutate(v.id); }}
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

      {/* Add / Edit Vendor Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <h2 className="text-lg font-bold mb-4">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dell India Pvt Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Vendor Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="HARDWARE_SUPPLIER">Hardware Supplier</option>
                    <option value="SOFTWARE_VENDOR">Software Vendor</option>
                    <option value="ISP">Internet / ISP</option>
                    <option value="AMC_PROVIDER">AMC Service Provider</option>
                    <option value="RENTAL_PROVIDER">Laptop Rental Provider</option>
                    <option value="CCTV_VENDOR">CCTV Vendor</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Suresh Kumar"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    placeholder="support@vendor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">GST Number</label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">PAN Number</label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="BLACKLISTED">Blacklisted</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Bank Name</label>
                  <input
                    type="text"
                    placeholder="HDFC Bank"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Account No.</label>
                  <input
                    type="text"
                    placeholder="50200012345678"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="HDFC0001234"
                    value={formData.bankIfsc}
                    onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">Services Offered</label>
                <input
                  type="text"
                  placeholder="Laptops, Servers, Switches, Annual Maintenance"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor 360° Profile Modal */}
      {selectedVendorId && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-subtle pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{profileRes?.name || 'Vendor 360° Profile'}</h2>
                  <div className="text-xs font-mono text-indigo-400">{profileRes?.vendorCode}</div>
                </div>
              </div>
              <button onClick={() => setSelectedVendorId(null)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isProfileLoading ? (
              <div className="p-12 text-center text-muted">Loading vendor 360° profile...</div>
            ) : profileRes ? (
              <div className="space-y-6">
                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-surface border border-subtle">
                  <div>
                    <div className="text-[10px] text-muted uppercase font-bold">Contact Person</div>
                    <div className="text-sm font-medium">{profileRes.contactPerson || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase font-bold">Phone</div>
                    <div className="text-sm font-medium">{profileRes.phone || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase font-bold">Email</div>
                    <div className="text-sm font-medium">{profileRes.email || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase font-bold">GST Number</div>
                    <div className="text-sm font-mono">{profileRes.gstNumber || '—'}</div>
                  </div>
                </div>

                {/* Invoices */}
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-indigo-400" /> Recent Invoices ({profileRes.invoices?.length || 0})
                  </h3>
                  <div className="border border-subtle rounded-lg overflow-hidden">
                    <table className="data-table w-full text-xs">
                      <thead>
                        <tr>
                          <th>Invoice Code</th>
                          <th>Invoice No.</th>
                          <th>Date</th>
                          <th>Total Amount</th>
                          <th>Approval</th>
                          <th>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(profileRes.invoices || []).map((inv: any) => (
                          <tr key={inv.id}>
                            <td className="font-mono text-indigo-400">{inv.invoiceCode}</td>
                            <td>{inv.invoiceNumber}</td>
                            <td>{formatDate(inv.invoiceDate)}</td>
                            <td className="font-semibold">{formatINR(inv.totalAmount)}</td>
                            <td><span className="badge badge-gray">{inv.approvalStatus}</span></td>
                            <td><span className={`badge ${inv.paymentStatus === 'PAID' ? 'badge-green' : 'badge-amber'}`}>{inv.paymentStatus}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AMC Contracts */}
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Linked AMC Contracts ({profileRes.amcContracts?.length || 0})
                  </h3>
                  <div className="border border-subtle rounded-lg overflow-hidden">
                    <table className="data-table w-full text-xs">
                      <thead>
                        <tr>
                          <th>AMC Code</th>
                          <th>Title</th>
                          <th>End Date</th>
                          <th>Annual Cost</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(profileRes.amcContracts || []).map((amc: any) => (
                          <tr key={amc.id}>
                            <td className="font-mono text-emerald-400">{amc.contractCode}</td>
                            <td>{amc.title}</td>
                            <td>{formatDate(amc.endDate)}</td>
                            <td className="font-semibold">{formatINR(amc.cost)}</td>
                            <td><span className="badge badge-green">{amc.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-subtle">
                  <button onClick={() => setSelectedVendorId(null)} className="btn-secondary text-xs">Close Profile</button>
                </div>
              </div>
            ) : null}
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
            vendors selected
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
              <h2 className="text-lg font-bold">Bulk Delete Vendors</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete <strong className="text-red-400 font-mono">{selectedIds.length}</strong> selected vendors? This action cannot be undone.
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
