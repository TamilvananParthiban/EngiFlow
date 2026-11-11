import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Network, Wifi, Radio, Shield, Server, Tv, PhoneCall, Video,
  Plus, Search, RefreshCw, Activity, CheckCircle2, XCircle, AlertTriangle,
  Clock, Trash2, Edit3, Globe, HardDrive, Cpu, Terminal, Zap, Power
} from 'lucide-react';
import api from '../../services/api';
import { formatDateTime } from '../../utils/format';

interface Location {
  id: string;
  name: string;
}

interface ISPConnection {
  id: string;
  ispName: string;
}

export type NetworkDeviceType =
  | 'ROUTER'
  | 'SWITCH'
  | 'POE_SWITCH'
  | 'FIREWALL'
  | 'ACCESS_POINT'
  | 'INTERCOM'
  | 'SMART_TV'
  | 'VC_DEVICE'
  | 'MODEM'
  | 'SERVER'
  | 'UPS'
  | 'OTHER';

interface NetworkDevice {
  id: string;
  deviceCode: string;
  name: string;
  deviceType: NetworkDeviceType;
  ipAddress?: string;
  macAddress?: string;
  brand?: string;
  model?: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
  isMonitored: boolean;
  remarks?: string;
  createdAt: string;
  locationId?: string;
  location?: Location;
  ispId?: string;
  isp?: ISPConnection;
}

interface PingResult {
  deviceId: string;
  ipAddress?: string;
  macAddress?: string;
  status: string;
  latencyMs: number;
  packetLossPercent: number;
  lastPingAt: string;
}

const DEVICE_TYPE_CONFIG: Record<NetworkDeviceType, { label: string; icon: React.ElementType; color: string; badge: string }> = {
  ROUTER: { label: 'Router', icon: Network, color: '#3742FA', badge: 'badge-blue' },
  SWITCH: { label: 'Network Switch', icon: Cpu, color: '#10b981', badge: 'badge-green' },
  POE_SWITCH: { label: 'PoE Switch', icon: Zap, color: '#06b6d4', badge: 'badge-teal' },
  FIREWALL: { label: 'Firewall', icon: Shield, color: '#ef4444', badge: 'badge-red' },
  ACCESS_POINT: { label: 'Wi-Fi AP', icon: Wifi, color: '#8b5cf6', badge: 'badge-purple' },
  INTERCOM: { label: 'EPBX / Intercom System', icon: PhoneCall, color: '#d97706', badge: 'badge-amber' },
  SMART_TV: { label: 'Smart TV / Display', icon: Tv, color: '#ec4899', badge: 'badge-pink' },
  VC_DEVICE: { label: 'VC System (Video Conf)', icon: Video, color: '#6366f1', badge: 'badge-blue' },
  MODEM: { label: 'Modem', icon: Radio, color: '#64748b', badge: 'badge-gray' },
  SERVER: { label: 'Server', icon: Server, color: '#14b8a6', badge: 'badge-teal' },
  UPS: { label: 'UPS Power', icon: Power, color: '#d97706', badge: 'badge-amber' },
  OTHER: { label: 'Other Device', icon: HardDrive, color: '#94a3b8', badge: 'badge-gray' },
};

export default function NetworkPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'devices' | 'scanner' | 'downtime' | 'isp'>('devices');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<NetworkDevice | null>(null);
  const [pingingDeviceId, setPingingDeviceId] = useState<string | null>(null);
  const [activePingResult, setActivePingResult] = useState<PingResult | null>(null);
  const [isPingModalOpen, setIsPingModalOpen] = useState(false);

  // Device Form state
  const [formData, setFormData] = useState({
    name: '',
    deviceType: 'SWITCH' as NetworkDeviceType,
    ipAddress: '',
    macAddress: '',
    brand: '',
    model: '',
    locationId: '',
    status: 'ONLINE' as NetworkDevice['status'],
    isMonitored: true,
    remarks: '',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery<NetworkDevice[]>({
    queryKey: ['network', 'devices'],
    queryFn: async () => {
      const res = await api.get('/network/devices');
      return res.data.data;
    },
    refetchInterval: 30000, // Auto-refresh ping states every 30s
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await api.get('/locations');
      return res.data.data;
    },
  });

  const { data: uptimeData } = useQuery({
    queryKey: ['network', 'uptime'],
    queryFn: async () => {
      const res = await api.get('/network/uptime');
      return res.data.data;
    },
  });

  // Mutations
  const saveDeviceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingDevice) {
        return api.put(`/network/devices/${editingDevice.id}`, data);
      } else {
        return api.post('/network/devices', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'devices'] });
      setIsDeviceModalOpen(false);
      showToast(editingDevice ? 'Device specs updated' : 'Network device registered for monitoring');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to save network device', 'error');
    },
  });

  const pingDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      setPingingDeviceId(deviceId);
      const res = await api.post(`/network/devices/${deviceId}/ping`);
      return res.data.data;
    },
    onSuccess: (data: PingResult) => {
      setPingingDeviceId(null);
      setActivePingResult(data);
      setIsPingModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ['network', 'devices'] });
    },
    onError: () => {
      setPingingDeviceId(null);
      showToast('Ping test failed to respond', 'error');
    },
  });

  const batchPingMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/network/devices/ping-all');
      return res.data.data;
    },
    onSuccess: (data: any[]) => {
      queryClient.invalidateQueries({ queryKey: ['network', 'devices'] });
      showToast(`Batch scan completed across ${data.length} network IP addresses`);
    },
    onError: () => {
      showToast('Batch scan encountered connection timeouts', 'error');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/network/devices/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'devices'] });
      showToast('Device status updated');
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/network/devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'devices'] });
      showToast('Device removed from network monitoring');
    },
  });

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      deviceType: 'SWITCH',
      ipAddress: '192.168.1.1',
      macAddress: '00:1A:2B:3C:4D:5E',
      brand: '',
      model: '',
      locationId: '',
      status: 'ONLINE',
      isMonitored: true,
      remarks: '',
    });
    setIsDeviceModalOpen(true);
  };

  const handleOpenEditModal = (d: NetworkDevice) => {
    setEditingDevice(d);
    setFormData({
      name: d.name,
      deviceType: d.deviceType,
      ipAddress: d.ipAddress || '',
      macAddress: d.macAddress || '',
      brand: d.brand || '',
      model: d.model || '',
      locationId: d.locationId || '',
      status: d.status,
      isMonitored: d.isMonitored,
      remarks: d.remarks || '',
    });
    setIsDeviceModalOpen(true);
  };

  // Filtered devices list
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.deviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.ipAddress && d.ipAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.macAddress && d.macAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.brand && d.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.model && d.model.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedTypeFilter ? d.deviceType === selectedTypeFilter : true;
    const matchesStatus = selectedStatusFilter ? d.status === selectedStatusFilter : true;

    return matchesSearch && matchesType && matchesStatus;
  });

  // KPI Calculations
  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;
  const offlineCount = devices.filter((d) => d.status === 'OFFLINE').length;
  const degradedCount = devices.filter((d) => d.status === 'DEGRADED' || d.status === 'MAINTENANCE').length;
  const switchesCount = devices.filter((d) => d.deviceType === 'SWITCH' || d.deviceType === 'POE_SWITCH').length;
  const wifiPoECount = devices.filter((d) => d.deviceType === 'ACCESS_POINT' || d.deviceType === 'POE_SWITCH').length;
  const mediaVcCount = devices.filter((d) => d.deviceType === 'INTERCOM' || d.deviceType === 'SMART_TV' || d.deviceType === 'VC_DEVICE').length;

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
          <h1 className="page-title">Network Infrastructure & Monitoring</h1>
          <p className="page-subtitle">
            Real-time IP & MAC-based monitoring for Switches, Routers, Firewalls, Wi-Fi APs, Intercoms, Smart TVs & VC Systems
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn btn-secondary"
            onClick={() => batchPingMutation.mutate()}
            disabled={batchPingMutation.isPending}
          >
            <Activity size={14} className={batchPingMutation.isPending ? 'animate-spin' : ''} />
            {batchPingMutation.isPending ? 'Scanning Network...' : 'Ping All IP Addresses'}
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={15} />
            Add Network Device
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="kpi-grid">
        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-blue)' }}>
              <Network size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <span className="badge badge-blue">Total</span>
          </div>
          <div>
            <div className="kpi-value">{devices.length}</div>
            <div className="kpi-label">Monitored Network Devices</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-green)' }}>
              <CheckCircle2 size={20} style={{ color: '#10b981' }} />
            </div>
            <span className="badge badge-green">{devices.length > 0 ? `${Math.round((onlineCount / devices.length) * 100)}%` : '100%'}</span>
          </div>
          <div>
            <div className="kpi-value">{onlineCount}</div>
            <div className="kpi-label">Online & Pingable</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: offlineCount > 0 ? 'var(--kpi-red)' : 'var(--kpi-teal)' }}>
              <XCircle size={20} style={{ color: offlineCount > 0 ? '#ef4444' : '#0D9488' }} />
            </div>
            <span className={offlineCount > 0 ? 'badge badge-red' : 'badge badge-teal'}>Alert</span>
          </div>
          <div>
            <div className="kpi-value">{offlineCount}</div>
            <div className="kpi-label">Offline / No Response</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-purple)' }}>
              <Cpu size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <span className="badge badge-purple">Switches</span>
          </div>
          <div>
            <div className="kpi-value">{switchesCount}</div>
            <div className="kpi-label">L2/L3 & PoE Switches</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-amber)' }}>
              <PhoneCall size={20} style={{ color: '#f59e0b' }} />
            </div>
            <span className="badge badge-amber">AV / Media</span>
          </div>
          <div>
            <div className="kpi-value">{mediaVcCount}</div>
            <div className="kpi-label">Intercoms, TVs & VC Bars</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'devices'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('devices')}
        >
          <Network size={16} />
          Devices Monitor ({devices.length})
        </button>

        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'scanner'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('scanner')}
        >
          <Terminal size={16} />
          Ping Diagnostic Console
        </button>

        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'downtime'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('downtime')}
        >
          <Clock size={16} />
          Downtime Logs
        </button>
      </div>

      {/* TAB 1: NETWORK DEVICES MONITOR */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedTypeFilter('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedTypeFilter === ''
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              All Devices ({devices.length})
            </button>
            {(Object.keys(DEVICE_TYPE_CONFIG) as NetworkDeviceType[]).map((typeKey) => {
              const count = devices.filter((d) => d.deviceType === typeKey).length;
              if (count === 0 && selectedTypeFilter !== typeKey) return null;
              const cfg = DEVICE_TYPE_CONFIG[typeKey];
              return (
                <button
                  key={typeKey}
                  onClick={() => setSelectedTypeFilter(typeKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedTypeFilter === typeKey
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <cfg.icon size={13} />
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search & Status Filters */}
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="search-bar flex-1 min-w-[240px]">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by IP Address, MAC Address, Device Name, Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                className="form-select text-xs min-w-[130px]"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ONLINE">ONLINE</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="DEGRADED">DEGRADED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
          </div>

          {/* Devices Grid Table */}
          <div className="card overflow-hidden min-w-0">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Device Details</th>
                    <th>Category Type</th>
                    <th>IP Address & MAC</th>
                    <th>Location</th>
                    <th>Realtime Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devicesLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                          <RefreshCw size={16} className="animate-spin" />
                          Scanning network devices...
                        </div>
                      </td>
                    </tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No network devices found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((d) => {
                      const cfg = DEVICE_TYPE_CONFIG[d.deviceType] || DEVICE_TYPE_CONFIG.OTHER;
                      const IconComponent = cfg.icon;

                      return (
                        <tr key={d.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs"
                                style={{ background: `${cfg.color}20`, color: cfg.color }}
                              >
                                <IconComponent size={18} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-sm truncate flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                  {d.name}
                                  <span className="badge badge-purple font-mono font-bold text-[11px]">
                                    {d.deviceCode}
                                  </span>
                                </div>
                                <div className="text-xs font-medium truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                  {d.brand && d.model ? `${d.brand} ${d.model}` : d.remarks || 'Monitored Node'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className={`badge ${cfg.badge}`}>
                              <IconComponent size={11} />
                              {cfg.label}
                            </span>
                          </td>

                          <td>
                            <div className="space-y-0.5">
                              <div className="font-mono text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                                {d.ipAddress || 'DHCP Dynamic'}
                              </div>
                              <div className="font-mono text-[11px] font-medium tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {d.macAddress || 'No MAC recorded'}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {d.location?.name || 'Main Server Room'}
                            </div>
                          </td>

                          <td>
                            <div className="flex items-center gap-2">
                              <span className={`status-dot ${d.status === 'ONLINE' ? 'online' : d.status === 'OFFLINE' ? 'offline' : 'warning'}`} />
                              <select
                                value={d.status}
                                onChange={(e) => updateStatusMutation.mutate({ id: d.id, status: e.target.value })}
                                className="form-select text-xs font-semibold py-1 px-2.5 rounded-lg border cursor-pointer"
                                style={{
                                  background: d.status === 'ONLINE' ? 'var(--kpi-green)' : d.status === 'OFFLINE' ? 'var(--kpi-red)' : 'var(--kpi-amber)',
                                  color: d.status === 'ONLINE' ? '#065f46' : d.status === 'OFFLINE' ? '#991b1b' : '#92400e',
                                  borderColor: 'var(--border-color)',
                                }}
                              >
                                <option value="ONLINE">ONLINE</option>
                                <option value="OFFLINE">OFFLINE</option>
                                <option value="DEGRADED">DEGRADED</option>
                                <option value="MAINTENANCE">MAINTENANCE</option>
                              </select>
                            </div>
                          </td>

                          <td>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Trigger Live Ping Button */}
                              <button
                                onClick={() => pingDeviceMutation.mutate(d.id)}
                                disabled={pingingDeviceId === d.id}
                                className="btn btn-secondary btn-sm"
                                title="Run live ping diagnostic"
                              >
                                <Activity size={13} className={pingingDeviceId === d.id ? 'animate-spin text-indigo-600' : 'text-indigo-600'} />
                                {pingingDeviceId === d.id ? 'Pinging...' : 'Ping'}
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditModal(d)}
                                className="btn-icon"
                                title="Edit specs"
                              >
                                <Edit3 size={14} className="text-slate-600 dark:text-slate-300" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => {
                                  if (window.confirm(`Remove "${d.name}" from network monitoring?`)) {
                                    deleteDeviceMutation.mutate(d.id);
                                  }
                                }}
                                className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                                title="Delete device"
                              >
                                <Trash2 size={14} />
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
        </div>
      )}

      {/* TAB 2: PING DIAGNOSTIC CONSOLE */}
      {activeTab === 'scanner' && (
        <div className="space-y-4">
          <div className="card p-5 bg-slate-900 text-slate-100 rounded-2xl font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-emerald-400" />
                <span className="font-bold text-sm text-emerald-400">Network Diagnostic Console — Ping Scan Engine</span>
              </div>
              <button
                onClick={() => batchPingMutation.mutate()}
                disabled={batchPingMutation.isPending}
                className="btn bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-bold btn-sm border-none cursor-pointer"
              >
                <Activity size={14} className={batchPingMutation.isPending ? 'animate-spin' : ''} />
                {batchPingMutation.isPending ? 'Pinging All Nodes...' : 'Run Full Network Sweep'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((d) => {
                const cfg = DEVICE_TYPE_CONFIG[d.deviceType] || DEVICE_TYPE_CONFIG.OTHER;
                return (
                  <div key={d.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${d.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                        {d.name}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono mt-0.5">{d.ipAddress || '0.0.0.0'}</div>
                      <div className="text-[10px] text-slate-500 truncate">{d.macAddress || 'No MAC'}</div>
                    </div>

                    <button
                      onClick={() => pingDeviceMutation.mutate(d.id)}
                      disabled={pingingDeviceId === d.id}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer flex-shrink-0"
                    >
                      {pingingDeviceId === d.id ? 'Pinging...' : 'Ping IP'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DOWNTIME LOGS */}
      {activeTab === 'downtime' && (
        <div className="card p-6 text-center text-slate-500">
          <Clock size={36} className="mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-sm">Monthly Uptime: {uptimeData?.uptimePercent ?? 100}%</p>
          <p className="text-xs mt-1">Recorded Downtime Hours: {uptimeData?.downtimeHours ?? 0} hrs</p>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DEVICE */}
      {isDeviceModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-lg">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Network size={18} className="text-indigo-600" />
                {editingDevice ? 'Edit Network Device Specs' : 'Register Network Device'}
              </h2>
              <button className="btn-icon" onClick={() => setIsDeviceModalOpen(false)}>
                <XCircle size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveDeviceMutation.mutate(formData);
              }}
            >
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Device Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Core Switch Floor-1"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Device Category *</label>
                    <select
                      className="form-select"
                      value={formData.deviceType}
                      onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as NetworkDeviceType })}
                    >
                      {(Object.keys(DEVICE_TYPE_CONFIG) as NetworkDeviceType[]).map((t) => (
                        <option key={t} value={t}>{DEVICE_TYPE_CONFIG[t].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">IP Address *</label>
                    <input
                      type="text"
                      required
                      className="form-input font-mono"
                      placeholder="192.168.1.1"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">MAC Address *</label>
                    <input
                      type="text"
                      className="form-input font-mono"
                      placeholder="00:1A:2B:3C:4D:5E"
                      value={formData.macAddress}
                      onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Brand / Vendor</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Cisco, Fortinet, Ubiquiti, Polycom..."
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Model Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Catalyst 3850 / FortiGate 60F"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Location / Rack</label>
                    <select
                      className="form-select"
                      value={formData.locationId}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    >
                      <option value="">Select Location</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Initial Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="ONLINE">ONLINE</option>
                      <option value="OFFLINE">OFFLINE</option>
                      <option value="DEGRADED">DEGRADED</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Port Count / VLAN / Remarks</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="24-Port Gigabit PoE+, VLAN 10 (Voice), VLAN 20 (Data)..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDeviceModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={saveDeviceMutation.isPending} className="btn btn-primary">
                  {saveDeviceMutation.isPending ? 'Saving...' : editingDevice ? 'Update Device' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIVE PING DIAGNOSTIC RESULT */}
      {isPingModalOpen && activePingResult && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity size={18} className="text-indigo-600 animate-pulse" />
                Live Ping Diagnostic Result
              </h2>
              <button className="btn-icon" onClick={() => setIsPingModalOpen(false)}>
                <XCircle size={16} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs space-y-2 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target IP:</span>
                  <span className="text-emerald-400 font-bold">{activePingResult.ipAddress || '127.0.0.1'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">MAC Address:</span>
                  <span className="text-slate-200">{activePingResult.macAddress || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ICMP Latency:</span>
                  <span className="text-indigo-400 font-bold">{activePingResult.latencyMs} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Packet Loss:</span>
                  <span className={activePingResult.packetLossPercent > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {activePingResult.packetLossPercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Node Status:</span>
                  <span className={`badge ${activePingResult.status === 'ONLINE' ? 'badge-green' : 'badge-red'}`}>
                    {activePingResult.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setIsPingModalOpen(false)}>
                Close Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
