import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, ShieldAlert, ShieldCheck, Clock, Search, Filter, RefreshCw,
  Plus, Edit3, AlertTriangle, CheckCircle2, Calendar, FileText, Building2,
  Monitor, Laptop, Server, Printer, HardDrive, Eye, ExternalLink, Download
} from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatDateTime, daysUntil } from '../../utils/format';

interface AssetWarranty {
  id: string;
  assetCode: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  status: string;
  condition: string;
  vendorId?: string;
  vendor?: { id: string; name: string };
  assignedUser?: { id: string; name: string };
  department?: { id: string; name: string };
  location?: { id: string; name: string };
}

export default function WarrantyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWarranty | null>(null);
  const [warrantyForm, setWarrantyForm] = useState({
    warrantyStart: '',
    warrantyEnd: '',
    vendorId: '',
    remarks: '',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: assetsRes, isLoading, refetch } = useQuery({
    queryKey: ['warranty-assets'],
    queryFn: async () => {
      const res = await api.get('/assets?limit=200');
      return res.data;
    },
  });

  const { data: vendorsRes } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await api.get('/vendors?limit=100')).data,
  });

  const updateWarrantyMutation = useMutation({
    mutationFn: async ({ assetId, data }: { assetId: string; data: typeof warrantyForm }) => {
      return api.put(`/assets/${assetId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsUpdateModalOpen(false);
      showToast('Asset warranty details updated successfully');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update warranty', 'error');
    },
  });

  const assets: AssetWarranty[] = assetsRes?.data || [];
  const vendors = vendorsRes?.data || [];

  const now = new Date();

  // Helper to calculate warranty status & remaining days
  const getWarrantyInfo = (asset: AssetWarranty) => {
    if (!asset.warrantyEnd) {
      return { status: 'NO_WARRANTY', label: 'No Data', daysLeft: 0, badge: 'badge-gray' };
    }
    const endDate = new Date(asset.warrantyEnd);
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { status: 'EXPIRED', label: 'Expired', daysLeft: diffDays, badge: 'badge-red' };
    } else if (diffDays <= 30) {
      return { status: 'EXPIRING_CRITICAL', label: `Expiring (${diffDays}d)`, daysLeft: diffDays, badge: 'badge-red' };
    } else if (diffDays <= 90) {
      return { status: 'EXPIRING_SOON', label: `Expiring (${diffDays}d)`, daysLeft: diffDays, badge: 'badge-amber' };
    } else {
      return { status: 'ACTIVE', label: `Active (${diffDays}d)`, daysLeft: diffDays, badge: 'badge-green' };
    }
  };

  // Filter Assets
  const filteredAssets = assets.filter((a) => {
    const info = getWarrantyInfo(a);

    const matchesSearch =
      a.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      (a.brand && a.brand.toLowerCase().includes(search.toLowerCase())) ||
      (a.model && a.model.toLowerCase().includes(search.toLowerCase())) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === '' ? true :
      statusFilter === 'ACTIVE' ? info.status === 'ACTIVE' :
      statusFilter === 'EXPIRING_SOON' ? (info.status === 'EXPIRING_SOON' || info.status === 'EXPIRING_CRITICAL') :
      statusFilter === 'EXPIRED' ? info.status === 'EXPIRED' :
      statusFilter === 'NO_WARRANTY' ? info.status === 'NO_WARRANTY' : true;

    const matchesType = typeFilter ? a.type === typeFilter : true;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Summary KPIs
  const totalAssets = assets.length;
  const activeWarranties = assets.filter((a) => getWarrantyInfo(a).status === 'ACTIVE').length;
  const expiringSoonCount = assets.filter((a) => {
    const st = getWarrantyInfo(a).status;
    return st === 'EXPIRING_SOON' || st === 'EXPIRING_CRITICAL';
  }).length;
  const expiredCount = assets.filter((a) => getWarrantyInfo(a).status === 'EXPIRED').length;

  const handleOpenUpdateModal = (a: AssetWarranty) => {
    setSelectedAsset(a);
    setWarrantyForm({
      warrantyStart: a.warrantyStart ? new Date(a.warrantyStart).toISOString().split('T')[0] : '',
      warrantyEnd: a.warrantyEnd ? new Date(a.warrantyEnd).toISOString().split('T')[0] : '',
      vendorId: a.vendorId || '',
      remarks: '',
    });
    setIsUpdateModalOpen(true);
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container">
          <div className={`toast ${toastMessage.type === 'error' ? 'error' : 'success'}`}>
            {toastMessage.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hardware Warranty & Support Tracking</h1>
          <p className="page-subtitle">
            Monitor asset warranty expiry dates, vendor support contracts, and claim status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-secondary" onClick={() => refetch()}>
            <RefreshCw size={14} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-blue)' }}>
              <Shield size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <span className="badge badge-blue">Total</span>
          </div>
          <div>
            <div className="kpi-value">{totalAssets}</div>
            <div className="kpi-label">Registered Assets</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-green)' }}>
              <ShieldCheck size={20} style={{ color: '#10b981' }} />
            </div>
            <span className="badge badge-green">Covered</span>
          </div>
          <div>
            <div className="kpi-value">{activeWarranties}</div>
            <div className="kpi-label">Active Warranty Coverage</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-amber)' }}>
              <Clock size={20} style={{ color: '#f59e0b' }} />
            </div>
            <span className="badge badge-amber">Action Needed</span>
          </div>
          <div>
            <div className="kpi-value">{expiringSoonCount}</div>
            <div className="kpi-label">Expiring in 90 Days</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: expiredCount > 0 ? 'var(--kpi-red)' : 'var(--kpi-teal)' }}>
              <ShieldAlert size={20} style={{ color: expiredCount > 0 ? '#ef4444' : '#0D9488' }} />
            </div>
            <span className={expiredCount > 0 ? 'badge badge-red' : 'badge badge-teal'}>Status</span>
          </div>
          <div>
            <div className="kpi-value">{expiredCount}</div>
            <div className="kpi-label">Expired Warranties</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="search-bar flex-1 min-w-[240px]">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by Asset Code, Brand, Model, Serial Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            className="form-select text-xs min-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Warranty Statuses</option>
            <option value="ACTIVE">Active Coverage</option>
            <option value="EXPIRING_SOON">Expiring Soon (Within 90 Days)</option>
            <option value="EXPIRED">Expired Warranty</option>
            <option value="NO_WARRANTY">No Warranty Data</option>
          </select>

          <select
            className="form-select text-xs min-w-[130px]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Asset Types</option>
            <option value="LAPTOP">Laptop</option>
            <option value="DESKTOP">Desktop</option>
            <option value="SERVER">Server</option>
            <option value="PRINTER">Printer</option>
            <option value="SWITCH">Switch</option>
            <option value="FIREWALL">Firewall</option>
            <option value="ROUTER">Router</option>
          </select>
        </div>
      </div>

      {/* Warranty Data Table */}
      <div className="card overflow-hidden min-w-0">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset Details</th>
                <th>Serial Number</th>
                <th>Vendor / Supplier</th>
                <th>Warranty Start</th>
                <th>Warranty Expiry</th>
                <th>Coverage Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <RefreshCw size={16} className="animate-spin" />
                      Loading asset warranty details...
                    </div>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No asset warranty records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((a) => {
                  const info = getWarrantyInfo(a);
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
                          >
                            <Monitor size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                              {a.brand} {a.model}
                              <span className="badge badge-purple font-mono font-bold text-[11px]">{a.assetCode}</span>
                            </div>
                            <div className="text-xs font-medium truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {a.type} {a.department?.name ? `• ${a.department.name}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="font-mono-code text-xs font-semibold">
                          {a.serialNumber || 'N/A'}
                        </span>
                      </td>

                      <td>
                        <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {a.vendor?.name || 'OEM / Direct Purchase'}
                        </div>
                      </td>

                      <td>
                        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {a.warrantyStart ? formatDate(a.warrantyStart) : 'Not Recorded'}
                        </div>
                      </td>

                      <td>
                        <div className="text-xs font-bold" style={{ color: info.status === 'EXPIRED' ? '#ef4444' : 'var(--text-primary)' }}>
                          {a.warrantyEnd ? formatDate(a.warrantyEnd) : 'Not Recorded'}
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${info.badge}`}>
                          <Shield size={11} />
                          {info.label}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenUpdateModal(a)}
                            className="btn btn-secondary btn-sm"
                            title="Update warranty dates & vendor"
                          >
                            <Edit3 size={13} className="text-indigo-600" />
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPDATE WARRANTY MODAL */}
      {isUpdateModalOpen && selectedAsset && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield size={18} className="text-indigo-600" />
                Update Asset Warranty Coverage
              </h2>
              <button className="btn-icon" onClick={() => setIsUpdateModalOpen(false)}>
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateWarrantyMutation.mutate({ assetId: selectedAsset.id, data: warrantyForm });
              }}
            >
              <div className="modal-body space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl">
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {selectedAsset.brand} {selectedAsset.model} ({selectedAsset.assetCode})
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Serial: {selectedAsset.serialNumber || 'N/A'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Warranty Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={warrantyForm.warrantyStart}
                      onChange={(e) => setWarrantyForm({ ...warrantyForm, warrantyStart: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Warranty End Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={warrantyForm.warrantyEnd}
                      onChange={(e) => setWarrantyForm({ ...warrantyForm, warrantyEnd: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Warranty Vendor / OEM Provider</label>
                  <select
                    className="form-select"
                    value={warrantyForm.vendorId}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, vendorId: e.target.value })}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsUpdateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={updateWarrantyMutation.isPending} className="btn btn-primary">
                  {updateWarrantyMutation.isPending ? 'Saving...' : 'Save Warranty Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
