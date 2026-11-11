import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wifi, Plus, Search, Filter, RefreshCw, Activity, DollarSign,
  AlertCircle, CheckCircle2, ShieldAlert, Phone, Globe, Server,
  Building2, Edit2, Trash2, Calendar, FileText, ExternalLink, Zap
} from 'lucide-react';
import api from '../../services/api';
import { formatINR } from '../../utils/format';

interface ISPConnection {
  id: string;
  connectionCode: string;
  ispName: string;
  connectionId?: string;
  bandwidth?: string;
  connectionType: 'LEASED_LINE' | 'BROADBAND' | 'FIBER' | 'CELLULAR_4G_5G' | 'SAT';
  monthlyCost: number;
  gstPercent: number;
  billingDate?: number;
  dueDate?: number;
  publicIp?: string;
  sla?: string;
  supportNumber?: string;
  accountNumber?: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNDER_MAINTENANCE';
  isActive: boolean;
  remarks?: string;
  locationId?: string;
  vendorId?: string;
  location?: { id: string; name: string };
  vendor?: { id: string; name: string };
}

export default function ISPPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIsp, setEditingIsp] = useState<ISPConnection | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, { latencyMs: number; status: string }>>({});
  const [isPingingAll, setIsPingingAll] = useState(false);

  const [formData, setFormData] = useState({
    ispName: '',
    connectionId: '',
    bandwidth: '',
    connectionType: 'LEASED_LINE',
    monthlyCost: 0,
    gstPercent: 18,
    billingDate: 1,
    dueDate: 15,
    publicIp: '',
    sla: '99.9% SLA',
    supportNumber: '',
    accountNumber: '',
    status: 'ONLINE',
    locationId: '',
    vendorId: '',
    remarks: '',
  });

  // Fetch ISP Connections
  const { data: ispsRes, isLoading, refetch } = useQuery({
    queryKey: ['isp-connections'],
    queryFn: async () => {
      const res = await api.get('/isp');
      return res.data;
    },
  });

  // Fetch Locations
  const { data: locationsRes } = useQuery({
    queryKey: ['locations-list'],
    queryFn: async () => (await api.get('/locations')).data,
  });

  // Fetch Vendors
  const { data: vendorsRes } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await api.get('/vendors?limit=100')).data,
  });

  const isps: ISPConnection[] = ispsRes?.data || [];
  const locations = locationsRes?.data || [];
  const vendors = vendorsRes?.data || [];

  const resetForm = () => {
    setEditingIsp(null);
    setFormData({
      ispName: '',
      connectionId: '',
      bandwidth: '',
      connectionType: 'LEASED_LINE',
      monthlyCost: 0,
      gstPercent: 18,
      billingDate: 1,
      dueDate: 15,
      publicIp: '',
      sla: '99.9% SLA',
      supportNumber: '',
      accountNumber: '',
      status: 'ONLINE',
      locationId: '',
      vendorId: '',
      remarks: '',
    });
  };

  const handleEdit = (isp: ISPConnection) => {
    setEditingIsp(isp);
    setFormData({
      ispName: isp.ispName || '',
      connectionId: isp.connectionId || '',
      bandwidth: isp.bandwidth || '',
      connectionType: isp.connectionType || 'LEASED_LINE',
      monthlyCost: Number(isp.monthlyCost) || 0,
      gstPercent: Number(isp.gstPercent) || 18,
      billingDate: isp.billingDate || 1,
      dueDate: isp.dueDate || 15,
      publicIp: isp.publicIp || '',
      sla: isp.sla || '',
      supportNumber: isp.supportNumber || '',
      accountNumber: isp.accountNumber || '',
      status: isp.status || 'ONLINE',
      locationId: isp.locationId || '',
      vendorId: isp.vendorId || '',
      remarks: isp.remarks || '',
    });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingIsp) return api.put(`/isp/${editingIsp.id}`, payload);
      return api.post('/isp', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isp-connections'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/isp/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isp-connections'] });
    },
  });

  const pingMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/isp/${id}/ping`)).data,
    onSuccess: (data, id) => {
      setPingResults((prev) => ({
        ...prev,
        [id]: { latencyMs: data.data.latencyMs, status: data.data.status },
      }));
      queryClient.invalidateQueries({ queryKey: ['isp-connections'] });
    },
  });

  const handlePingAll = async () => {
    setIsPingingAll(true);
    try {
      for (const isp of isps) {
        await pingMutation.mutateAsync(isp.id);
      }
    } finally {
      setIsPingingAll(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      monthlyCost: Number(formData.monthlyCost),
      gstPercent: Number(formData.gstPercent),
      billingDate: Number(formData.billingDate),
      dueDate: Number(formData.dueDate),
      locationId: formData.locationId || undefined,
      vendorId: formData.vendorId || undefined,
    });
  };

  const filteredIsps = isps.filter((isp) => {
    const matchesSearch =
      isp.ispName.toLowerCase().includes(search.toLowerCase()) ||
      (isp.connectionCode && isp.connectionCode.toLowerCase().includes(search.toLowerCase())) ||
      (isp.connectionId && isp.connectionId.toLowerCase().includes(search.toLowerCase())) ||
      (isp.publicIp && isp.publicIp.toLowerCase().includes(search.toLowerCase())) ||
      (isp.accountNumber && isp.accountNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesType = !typeFilter || isp.connectionType === typeFilter;
    const matchesStatus = !statusFilter || isp.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate KPIs
  const totalMonthlySpend = isps.reduce((acc, i) => acc + (Number(i.monthlyCost) * (1 + Number(i.gstPercent || 18) / 100)), 0);
  const onlineCount = isps.filter((i) => i.status === 'ONLINE').length;
  const offlineCount = isps.filter((i) => i.status === 'OFFLINE' || i.status === 'DEGRADED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Wifi className="w-7 h-7 text-indigo-500" /> ISP & Internet Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Monitor Internet Leased Lines (ILL), Broadband links, Public IPs, SLA uptime, and monthly billing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePingAll}
            disabled={isPingingAll || isps.length === 0}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2"
            title="Ping all ISP Public Gateway IPs"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-500 ${isPingingAll ? 'animate-spin' : ''}`} />
            {isPingingAll ? 'Pinging Links...' : 'Ping All Gateway IPs'}
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-1.5 text-xs py-2"
          >
            <Plus className="w-4 h-4" /> Add ISP Connection
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{isps.length}</div>
            <div className="text-xs text-muted">Total ISP Connections</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{onlineCount}</div>
            <div className="text-xs text-muted">Active Online Links</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{offlineCount}</div>
            <div className="text-xs text-muted">Offline / Degraded Links</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono">{formatINR(totalMonthlySpend)}</div>
            <div className="text-xs text-muted">Est. Monthly Internet Bill (incl. GST)</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search ISP name, circuit ID, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field">
            <option value="">All Connection Types</option>
            <option value="LEASED_LINE">Leased Line (ILL)</option>
            <option value="BROADBAND">Broadband</option>
            <option value="FIBER">Fiber</option>
            <option value="CELLULAR_4G_5G">4G / 5G Failover</option>
            <option value="SAT">Satellite</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
            <option value="">All Statuses</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="DEGRADED">Degraded</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading ISP connections...</div>
        ) : filteredIsps.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No ISP connections found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>ISP & Circuit Info</th>
                  <th>Type</th>
                  <th>Bandwidth</th>
                  <th>Public IP / Gateway</th>
                  <th>SLA & Support</th>
                  <th>Monthly Cost</th>
                  <th>Status & Latency</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIsps.map((isp) => {
                  const ping = pingResults[isp.id];
                  const totalCostWithGst = Number(isp.monthlyCost) * (1 + Number(isp.gstPercent || 18) / 100);

                  return (
                    <tr key={isp.id}>
                      <td className="font-mono text-xs font-bold text-indigo-400">{isp.connectionCode}</td>
                      <td>
                        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {isp.ispName}
                        </div>
                        {isp.connectionId && (
                          <div className="text-xs font-mono text-muted flex items-center gap-1 mt-0.5">
                            <Zap size={11} className="text-amber-400" /> Circuit ID: {isp.connectionId}
                          </div>
                        )}
                        {isp.accountNumber && (
                          <div className="text-[10px] text-muted">Acc No: {isp.accountNumber}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-blue">{isp.connectionType.replace('_', ' ')}</span>
                      </td>
                      <td className="font-semibold text-xs text-indigo-300">{isp.bandwidth || 'N/A'}</td>
                      <td>
                        {isp.publicIp ? (
                          <div className="font-mono text-xs text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                            {isp.publicIp}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">Dynamic / None</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {isp.sla && <div className="text-xs font-semibold text-indigo-200">{isp.sla}</div>}
                        {isp.supportNumber && (
                          <div className="text-muted flex items-center gap-1 text-[11px] mt-0.5">
                            <Phone size={10} className="text-indigo-400" /> {isp.supportNumber}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                          {formatINR(isp.monthlyCost)}
                        </div>
                        <div className="text-[10px] text-muted">+ {isp.gstPercent}% GST ({formatINR(totalCostWithGst)})</div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <span
                            className={`badge ${
                              isp.status === 'ONLINE'
                                ? 'badge-green'
                                : isp.status === 'OFFLINE'
                                ? 'badge-red'
                                : 'badge-amber'
                            }`}
                          >
                            {isp.status}
                          </span>
                          {ping && (
                            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <Activity size={10} /> {ping.latencyMs}ms latency
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => pingMutation.mutate(isp.id)}
                            disabled={pingMutation.isPending}
                            className="btn-icon text-emerald-400"
                            title="Ping Gateway IP"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(isp)} className="btn-icon text-indigo-400" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ISP connection ${isp.ispName}?`)) deleteMutation.mutate(isp.id);
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <h2 className="text-lg font-bold mb-4">{editingIsp ? 'Edit ISP Connection' : 'Add New ISP Connection'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ISP / Provider Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Airtel Enterprise, Tata Tele..."
                    value={formData.ispName}
                    onChange={(e) => setFormData({ ...formData, ispName: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Circuit ID / Account No.</label>
                  <input
                    type="text"
                    placeholder="CIR-AIR-9912"
                    value={formData.connectionId}
                    onChange={(e) => setFormData({ ...formData, connectionId: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Connection Type *</label>
                  <select
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="LEASED_LINE">Leased Line (ILL)</option>
                    <option value="BROADBAND">Broadband</option>
                    <option value="FIBER">Fiber</option>
                    <option value="CELLULAR_4G_5G">4G / 5G Failover</option>
                    <option value="SAT">Satellite</option>
                  </select>
                </div>

                <div>
                  <label className="label">Bandwidth (Capacity)</label>
                  <input
                    type="text"
                    placeholder="200 Mbps (1:1)"
                    value={formData.bandwidth}
                    onChange={(e) => setFormData({ ...formData, bandwidth: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Public IP / Gateway</label>
                  <input
                    type="text"
                    placeholder="122.176.45.10"
                    value={formData.publicIp}
                    onChange={(e) => setFormData({ ...formData, publicIp: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="label">Monthly Cost (₹)</label>
                  <input
                    type="number"
                    value={formData.monthlyCost}
                    onChange={(e) => setFormData({ ...formData, monthlyCost: parseFloat(e.target.value) || 0 })}
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
                  <label className="label">Billing Date (Day)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formData.billingDate}
                    onChange={(e) => setFormData({ ...formData, billingDate: parseInt(e.target.value) || 1 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Due Days</label>
                  <input
                    type="number"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: parseInt(e.target.value) || 15 })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">SLA Guarantee</label>
                  <input
                    type="text"
                    placeholder="99.9% SLA (4-Hr MTTR)"
                    value={formData.sla}
                    onChange={(e) => setFormData({ ...formData, sla: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Support Helpline</label>
                  <input
                    type="text"
                    placeholder="1800-103-4444"
                    value={formData.supportNumber}
                    onChange={(e) => setFormData({ ...formData, supportNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Account Number</label>
                  <input
                    type="text"
                    placeholder="ACC-88771"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Location / Plant</label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select Location</option>
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Vendor Contract</label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Link Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                    <option value="DEGRADED">Degraded</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Remarks / Routing Notes</label>
                <textarea
                  rows={2}
                  placeholder="Primary WAN gateway routing notes or SLA escalation manager details..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="input-field"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editingIsp ? 'Update ISP Link' : 'Create ISP Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
