import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video, HardDrive, Plus, Search, Filter, Edit2, Trash2,
  Upload, Download, ShieldCheck, AlertCircle, Cpu, Wifi, CheckCircle2, XCircle,
  Play, Square, RefreshCw, Activity
} from 'lucide-react';
import api from '../../services/api';

export default function CCTVPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'cameras' | 'nvrs'>('cameras');
  const [search, setSearch] = useState('');
  const [nvrFilter, setNvrFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Auto Ping & Timer state (60s interval)
  const [autoPing, setAutoPing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  // Modals state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [deletingCamera, setDeletingCamera] = useState<any>(null);
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [isNvrModalOpen, setIsNvrModalOpen] = useState(false);
  const [editingNvr, setEditingNvr] = useState<any>(null);
  const [deletingNvr, setDeletingNvr] = useState<any>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Form states
  const [cameraForm, setCameraForm] = useState({
    cameraCode: '',
    name: '',
    ipAddress: '',
    brand: 'HIKVISION',
    model: 'HD IP Camera',
    nvrId: '',
    channel: 1,
    status: 'ONLINE',
    remarks: '',
  });

  const [nvrForm, setNvrForm] = useState({
    name: '',
    brand: 'HIKVISION',
    model: 'DS-7732NXI-K4',
    ipAddress: '',
    totalChannels: 32,
    status: 'ONLINE',
    remarks: '',
  });

  // Fetch CCTV Summary & Stats
  const { data: summaryRes } = useQuery({
    queryKey: ['cctv-summary'],
    queryFn: async () => (await api.get('/cctv/summary')).data,
  });

  // Fetch Cameras
  const { data: camerasRes, isLoading: camerasLoading } = useQuery({
    queryKey: ['cctv-cameras', search, nvrFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (nvrFilter) params.append('nvrId', nvrFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '200');
      const res = await api.get(`/cctv/cameras?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch NVR Devices
  const { data: nvrsRes, isLoading: nvrsLoading } = useQuery({
    queryKey: ['cctv-nvrs'],
    queryFn: async () => (await api.get('/cctv/nvrs')).data,
  });

  const summary = summaryRes?.data || {
    totalNvrs: 0,
    totalCameras: 0,
    onlineCameras: 0,
    offlineCameras: 0,
    faultCameras: 0,
    totalChannelsCapacity: 0,
    totalChannelsUsed: 0,
  };

  const cameras = camerasRes?.data || [];
  const nvrs = nvrsRes?.data || [];

  // Mutations
  const cameraSaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingCamera) return api.put(`/cctv/cameras/${editingCamera.id}`, payload);
      return api.post('/cctv/cameras', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
      setIsCameraModalOpen(false);
      setEditingCamera(null);
    },
  });

  const cameraDeleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/cctv/cameras/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
      setDeletingCamera(null);
    },
  });

  const cameraBulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => api.post('/cctv/cameras/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
      setSelectedCameraIds([]);
      setIsBulkDeleteModalOpen(false);
    },
  });

  const nvrSaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingNvr) return api.put(`/cctv/nvrs/${editingNvr.id}`, payload);
      return api.post('/cctv/nvrs', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-nvrs'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
      setIsNvrModalOpen(false);
      setEditingNvr(null);
    },
  });

  const nvrDeleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/cctv/nvrs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-nvrs'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
      setDeletingNvr(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/cctv/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-nvrs'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
      setIsUploadModalOpen(false);
      setUploadFile(null);
    },
  });

  const pingAllMutation = useMutation({
    mutationFn: async () => api.post('/cctv/ping-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-nvrs'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
    },
  });

  const pingCameraMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/cctv/cameras/${id}/ping`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
    },
  });

  const pingNvrMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/cctv/nvrs/${id}/ping`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-nvrs'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
    },
  });

  const pingStopMutation = useMutation({
    mutationFn: async () => api.post('/cctv/ping-stop'),
    onSuccess: () => {
      setAutoPing(false);
      setCountdown(60);
      queryClient.invalidateQueries({ queryKey: ['cctv-cameras'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-nvrs'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-summary'] });
    },
  });

  const handleStopPing = () => {
    setAutoPing(false);
    setCountdown(60);
    pingStopMutation.mutate();
  };

  // Auto ping interval every 60 seconds (1 minute)
  useEffect(() => {
    let timer: any = null;
    if (autoPing) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            pingAllMutation.mutate();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(60);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoPing]);

  const toggleAutoPing = () => {
    if (!autoPing) {
      setAutoPing(true);
      setCountdown(60);
      pingAllMutation.mutate();
    } else {
      handleStopPing();
    }
  };

  const handleEditCamera = (cam: any) => {
    setEditingCamera(cam);
    setCameraForm({
      cameraCode: cam.cameraCode || '',
      name: cam.name || '',
      ipAddress: cam.ipAddress || '',
      brand: cam.brand || 'HIKVISION',
      model: cam.model || '',
      nvrId: cam.nvrId || '',
      channel: cam.channel || 1,
      status: cam.status || 'ONLINE',
      remarks: cam.remarks || '',
    });
    setIsCameraModalOpen(true);
  };

  const handleEditNvr = (nvr: any) => {
    setEditingNvr(nvr);
    setNvrForm({
      name: nvr.name || '',
      brand: nvr.brand || 'HIKVISION',
      model: nvr.model || '',
      ipAddress: nvr.ipAddress || '',
      totalChannels: nvr.totalChannels || 32,
      status: nvr.status || 'ONLINE',
      remarks: nvr.remarks || '',
    });
    setIsNvrModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Video className="w-7 h-7 text-indigo-500" /> CCTV & NVR Surveillance Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Monitor NVR channels, IP camera locations, retention periods, and physical security zones
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Manual Ping All Now Button */}
          <button
            onClick={() => pingAllMutation.mutate()}
            disabled={pingAllMutation.isPending}
            className="btn-secondary flex items-center gap-2 text-indigo-400 hover:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10"
            title="Perform manual real-time IP ping test across all cameras and NVRs"
          >
            <Wifi className={`w-4 h-4 ${pingAllMutation.isPending ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
            {pingAllMutation.isPending ? 'Pinging Devices...' : 'Ping All Now'}
          </button>

          {/* Auto-Ping 60s Interval Button */}
          <button
            onClick={toggleAutoPing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              autoPing
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
            title={autoPing ? 'Auto-pinging active every 60s' : 'Click to start automatic IP pinging every 60s'}
          >
            {autoPing ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                Auto-Ping Active ({countdown}s)
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Auto-Ping Every 60s
              </>
            )}
          </button>

          {/* Dedicated Stop Ping Button */}
          {(pingAllMutation.isPending || autoPing) && (
            <button
              onClick={handleStopPing}
              disabled={pingStopMutation.isPending}
              className="btn-primary bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 text-xs font-bold animate-pulse shadow-lg shadow-red-900/30"
              title="Stop active ping operation and cancel auto-ping interval"
            >
              <Square className="w-3.5 h-3.5 fill-current text-white" />
              {pingStopMutation.isPending ? 'Stopping...' : 'Stop Ping'}
            </button>
          )}

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-emerald-400" /> Import Excel List
          </button>

          <button
            onClick={() => {
              setEditingCamera(null);
              setCameraForm({
                cameraCode: '',
                name: '',
                ipAddress: '',
                brand: 'HIKVISION',
                model: 'HD IP Camera',
                nvrId: nvrs[0]?.id || '',
                channel: 1,
                status: 'ONLINE',
                remarks: '',
              });
              setIsCameraModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Camera
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{summary.totalCameras}</div>
            <div className="text-xs text-muted">Total Active Cameras</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{summary.onlineCameras}</div>
            <div className="text-xs text-muted">Online Cameras ({summary.totalCameras > 0 ? Math.round((summary.onlineCameras / summary.totalCameras) * 100) : 100}%)</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{summary.totalNvrs} NVRs</div>
            <div className="text-xs text-muted">Total NVR Capacity ({summary.totalChannelsUsed}/{summary.totalChannelsCapacity} CH)</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{summary.faultCameras + summary.offlineCameras}</div>
            <div className="text-xs text-muted">Offline / Maintenance</div>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs & Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex rounded-lg overflow-hidden border border-subtle">
          <button
            onClick={() => setActiveTab('cameras')}
            className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'cameras' ? 'bg-indigo-600 text-white' : 'hover:bg-surface text-secondary'
            }`}
          >
            <Video className="w-4 h-4" /> Cameras Inventory ({cameras.length})
          </button>
          <button
            onClick={() => setActiveTab('nvrs')}
            className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'nvrs' ? 'bg-indigo-600 text-white' : 'hover:bg-surface text-secondary'
            }`}
          >
            <HardDrive className="w-4 h-4" /> NVR Devices ({nvrs.length})
          </button>
        </div>

        {activeTab === 'cameras' && (
          <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search camera code, name, IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 w-full"
              />
            </div>

            <select
              value={nvrFilter}
              onChange={(e) => setNvrFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All NVRs</option>
              {nvrs.map((n: any) => (
                <option key={n.id} value={n.id}>{n.nvrCode} - {n.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Statuses</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="FAULT">Fault</option>
            </select>
          </div>
        )}

        {activeTab === 'nvrs' && (
          <button
            onClick={() => {
              setEditingNvr(null);
              setNvrForm({
                name: '',
                brand: 'HIKVISION',
                model: 'DS-7732NXI-K4',
                ipAddress: '',
                totalChannels: 32,
                status: 'ONLINE',
                remarks: '',
              });
              setIsNvrModalOpen(true);
            }}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add New NVR
          </button>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      {selectedCameraIds.length > 0 && (
        <div className="card p-3 bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-indigo-200">
            <span className="font-bold text-indigo-400 font-mono text-base">{selectedCameraIds.length}</span> camera(s) selected
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedCameraIds([])} className="btn-secondary text-xs">
              Clear Selection
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="btn-primary bg-red-600 hover:bg-red-700 text-white text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedCameraIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Cameras View Table */}
      {activeTab === 'cameras' && (
        <div className="card overflow-hidden">
          {camerasLoading ? (
            <div className="p-8 text-center text-muted">Loading camera inventory...</div>
          ) : cameras.length === 0 ? (
            <div className="p-12 text-center text-muted">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              No CCTV cameras recorded. Click "Import Excel List" to load camera list from 3.CCTV LIST P5.xlsx.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={cameras.length > 0 && selectedCameraIds.length === cameras.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCameraIds(cameras.map((c: any) => c.id));
                          else setSelectedCameraIds([]);
                        }}
                        className="rounded border-subtle text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th>Camera Code</th>
                    <th>Camera Location & Name</th>
                    <th>IP Address</th>
                    <th>NVR Device</th>
                    <th>CH #</th>
                    <th>Status</th>
                    <th>Remarks / Zone / Retention</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cameras.map((c: any) => (
                    <tr key={c.id} className={selectedCameraIds.includes(c.id) ? 'bg-indigo-500/10' : ''}>
                      <td className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedCameraIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCameraIds([...selectedCameraIds, c.id]);
                            else setSelectedCameraIds(selectedCameraIds.filter(id => id !== c.id));
                          }}
                          className="rounded border-subtle text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="font-mono text-xs font-bold text-indigo-400">{c.cameraCode}</td>
                      <td>
                        <div className="font-medium text-xs text-primary">{c.name}</div>
                        <div className="text-[10px] text-muted">{c.brand || 'Generic'} {c.model ? `· ${c.model}` : ''}</div>
                      </td>
                      <td className="font-mono text-xs text-indigo-300">{c.ipAddress || '—'}</td>
                      <td>
                        <div className="font-mono text-xs font-semibold">{c.nvr?.nvrCode || '—'}</div>
                        <div className="text-[10px] text-muted">{c.nvr?.ipAddress}</div>
                      </td>
                      <td className="font-mono text-xs font-bold text-center">{c.channel || '—'}</td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className={`badge inline-flex items-center gap-1.5 ${c.status === 'ONLINE' ? 'badge-green' : c.status === 'OFFLINE' ? 'badge-red' : 'badge-amber'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            {c.status}
                          </span>
                          {c.latencyMs !== undefined && c.latencyMs !== null && (
                            <span className="text-[10px] font-mono text-slate-400 pl-3">
                              ⚡ {c.latencyMs}ms
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-xs text-muted max-w-xs truncate" title={c.remarks || ''}>
                        {c.remarks || '—'}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => pingCameraMutation.mutate(c.id)}
                            disabled={pingCameraMutation.isPending && pingCameraMutation.variables === c.id}
                            className="btn-icon text-indigo-400 hover:bg-indigo-500/10"
                            title="Ping IP Status Now"
                          >
                            <Wifi className={`w-3.5 h-3.5 ${pingCameraMutation.isPending && pingCameraMutation.variables === c.id ? 'animate-spin text-amber-400' : ''}`} />
                          </button>
                          <button onClick={() => handleEditCamera(c)} className="btn-icon" title="Edit Camera">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCamera(c)}
                            className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete Camera"
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
      )}

      {/* NVR Devices Grid / Cards View */}
      {activeTab === 'nvrs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nvrsLoading ? (
            <div className="p-8 text-center text-muted col-span-2">Loading NVR devices...</div>
          ) : (
            nvrs.map((nvr: any) => (
              <div key={nvr.id} className="card p-5 relative space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-primary flex items-center gap-2">
                        {nvr.nvrCode} <span className="text-xs font-normal text-muted">({nvr.brand} {nvr.model})</span>
                      </h3>
                      <div className="text-xs font-mono text-indigo-400 mt-0.5">IP: {nvr.ipAddress || '—'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => pingNvrMutation.mutate(nvr.id)}
                      disabled={pingNvrMutation.isPending && pingNvrMutation.variables === nvr.id}
                      className="btn-icon text-indigo-400 hover:bg-indigo-500/10"
                      title="Ping NVR IP Status"
                    >
                      <Wifi className={`w-4 h-4 ${pingNvrMutation.isPending && pingNvrMutation.variables === nvr.id ? 'animate-spin text-amber-400' : ''}`} />
                    </button>
                    <button onClick={() => handleEditNvr(nvr)} className="btn-icon" title="Edit NVR">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeletingNvr(nvr)} className="btn-icon text-red-400 hover:bg-red-500/10" title="Delete NVR">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-subtle flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted">Channel Usage</div>
                    <div className="text-sm font-bold text-primary mt-0.5">
                      {nvr._count?.cameras || 0} / {nvr.totalChannels || 16} Channels
                    </div>
                  </div>
                  <div className="w-32 bg-gray-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.round(((nvr._count?.cameras || 0) / (nvr.totalChannels || 16)) * 100))}%` }}
                    />
                  </div>
                </div>

                {nvr.remarks && (
                  <div className="text-xs text-muted bg-surface/50 p-2.5 rounded-lg border border-subtle leading-relaxed">
                    {nvr.remarks}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add / Edit Camera Modal */}
      {isCameraModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-lg">
            <h2 className="text-lg font-bold mb-4">{editingCamera ? 'Edit CCTV Camera' : 'Add New CCTV Camera'}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                cameraSaveMutation.mutate(cameraForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Camera Name / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="P5-S1: MAIN GATE TRANSFORMER"
                  value={cameraForm.name}
                  onChange={(e) => setCameraForm({ ...cameraForm, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.65.31"
                    value={cameraForm.ipAddress}
                    onChange={(e) => setCameraForm({ ...cameraForm, ipAddress: e.target.value })}
                    className="input-field font-mono"
                  />
                </div>
                <div>
                  <label className="label">NVR Device</label>
                  <select
                    value={cameraForm.nvrId}
                    onChange={(e) => setCameraForm({ ...cameraForm, nvrId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select NVR</option>
                    {nvrs.map((n: any) => (
                      <option key={n.id} value={n.id}>{n.nvrCode} - {n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Channel No</label>
                  <input
                    type="number"
                    value={cameraForm.channel}
                    onChange={(e) => setCameraForm({ ...cameraForm, channel: parseInt(e.target.value) || 1 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Brand</label>
                  <input
                    type="text"
                    value={cameraForm.brand}
                    onChange={(e) => setCameraForm({ ...cameraForm, brand: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={cameraForm.status}
                    onChange={(e) => setCameraForm({ ...cameraForm, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                    <option value="FAULT">Fault</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Remarks / Zone / Credentials</label>
                <textarea
                  rows={2}
                  placeholder="SECURITY ZONE | Retention: 45 Days | Pass: Admin@123"
                  value={cameraForm.remarks}
                  onChange={(e) => setCameraForm({ ...cameraForm, remarks: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button type="button" onClick={() => setIsCameraModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={cameraSaveMutation.isPending} className="btn-primary">
                  {cameraSaveMutation.isPending ? 'Saving...' : editingCamera ? 'Update Camera' : 'Create Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Camera Confirmation Modal */}
      {deletingCamera && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Delete CCTV Camera</h2>
            </div>
            <p className="text-sm mb-4 text-muted">
              Are you sure you want to delete camera <strong className="text-indigo-400 font-mono">{deletingCamera.cameraCode}</strong> ("{deletingCamera.name}")? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCamera(null)}
                className="btn-secondary"
                disabled={cameraDeleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => cameraDeleteMutation.mutate(deletingCamera.id)}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white"
                disabled={cameraDeleteMutation.isPending}
              >
                {cameraDeleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete NVR Confirmation Modal */}
      {deletingNvr && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Delete NVR Device</h2>
            </div>
            <p className="text-sm mb-4 text-muted">
              Are you sure you want to delete NVR <strong className="text-indigo-400 font-mono">{deletingNvr.nvrCode}</strong> ("{deletingNvr.name}")? Associated cameras will be unlinked. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingNvr(null)}
                className="btn-secondary"
                disabled={nvrDeleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => nvrDeleteMutation.mutate(deletingNvr.id)}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white"
                disabled={nvrDeleteMutation.isPending}
              >
                {nvrDeleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Excel Modal */}
      {isUploadModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <h2 className="text-lg font-bold mb-2">Import CCTV Camera List</h2>
            <p className="text-xs text-muted mb-4">
              Select your CCTV Excel file (e.g., <span className="font-mono text-indigo-400">3.CCTV LIST P5.xlsx</span>) to auto-import NVR devices, camera codes, IP addresses, zones & credentials.
            </p>

            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="input-field mb-4 text-xs"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
              <button type="button" onClick={() => setIsUploadModalOpen(false)} className="btn-secondary">Cancel</button>
              <button
                type="button"
                disabled={!uploadFile || uploadMutation.isPending}
                onClick={() => uploadFile && uploadMutation.mutate(uploadFile)}
                className="btn-primary"
              >
                {uploadMutation.isPending ? 'Importing...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Cameras Modal */}
      {isBulkDeleteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Bulk Delete CCTV Cameras</h2>
            </div>
            <p className="text-sm mb-4 text-muted">
              Are you sure you want to delete <strong className="text-indigo-400 font-mono">{selectedCameraIds.length}</strong> selected CCTV cameras? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="btn-secondary"
                disabled={cameraBulkDeleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => cameraBulkDeleteMutation.mutate(selectedCameraIds)}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white"
                disabled={cameraBulkDeleteMutation.isPending}
              >
                {cameraBulkDeleteMutation.isPending ? 'Deleting...' : `Confirm Delete (${selectedCameraIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
