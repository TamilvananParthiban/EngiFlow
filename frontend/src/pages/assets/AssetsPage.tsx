import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Monitor, Plus, Search, Filter, QrCode, Edit2, Trash2, Shield,
  Laptop, HardDrive, Wifi, Printer, Video, CheckCircle2, AlertCircle, Clock,
  Download, UploadCloud, FileSpreadsheet, X
} from 'lucide-react';
import api from '../../services/api';
import { formatDate, formatINR } from '../../utils/format';

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [qrModalAsset, setQrModalAsset] = useState<any>(null);

  // Bulk Select & Delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Bulk Upload State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkParsedAssets, setBulkParsedAssets] = useState<any[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'LAPTOP',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 0,
    warrantyStart: '',
    warrantyEnd: '',
    status: 'ACTIVE',
    condition: 'GOOD',
    hostname: '',
    ipAddress: '',
    macAddress: '',
    operatingSystem: '',
    assignedUserId: '',
    departmentId: '',
    locationId: '',
    vendorId: '',
    remarks: '',
  });

  const resetForm = () => {
    setEditingAsset(null);
    setFormData({
      type: 'LAPTOP',
      brand: '',
      model: '',
      serialNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: 0,
      warrantyStart: '',
      warrantyEnd: '',
      status: 'ACTIVE',
      condition: 'GOOD',
      hostname: '',
      ipAddress: '',
      macAddress: '',
      operatingSystem: '',
      assignedUserId: '',
      departmentId: '',
      locationId: '',
      vendorId: '',
      remarks: '',
    });
  };

  const handleEdit = (a: any) => {
    setEditingAsset(a);
    setFormData({
      type: a.type || 'LAPTOP',
      brand: a.brand || '',
      model: a.model || '',
      serialNumber: a.serialNumber || '',
      purchaseDate: a.purchaseDate ? a.purchaseDate.split('T')[0] : '',
      purchaseCost: a.purchaseCost ? Number(a.purchaseCost) : 0,
      warrantyStart: a.warrantyStart ? a.warrantyStart.split('T')[0] : '',
      warrantyEnd: a.warrantyEnd ? a.warrantyEnd.split('T')[0] : '',
      status: a.status || 'ACTIVE',
      condition: a.condition || 'GOOD',
      hostname: a.hostname || '',
      ipAddress: a.ipAddress || '',
      macAddress: a.macAddress || '',
      operatingSystem: a.operatingSystem || '',
      assignedUserId: a.assignedUserId || '',
      departmentId: a.departmentId || '',
      locationId: a.locationId || '',
      vendorId: a.vendorId || '',
      remarks: a.remarks || '',
    });
    setIsModalOpen(true);
  };

  // Fetch Assets
  const { data: assetsRes, isLoading } = useQuery({
    queryKey: ['assets', typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '100');
      const res = await api.get(`/assets?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch metadata dropdowns
  const { data: usersRes } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => (await api.get('/users?limit=100')).data,
  });

  const { data: deptsRes } = useQuery({
    queryKey: ['depts-list'],
    queryFn: async () => (await api.get('/departments')).data,
  });

  const { data: locsRes } = useQuery({
    queryKey: ['locs-list'],
    queryFn: async () => (await api.get('/locations')).data,
  });

  const { data: vendorsRes } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await api.get('/vendors?limit=100')).data,
  });

  const assets = assetsRes?.data || [];
  const users = usersRes?.data || [];
  const depts = deptsRes?.data || [];
  const locations = locsRes?.data || [];
  const vendors = vendorsRes?.data || [];

  const filteredAssets = assets.filter((a: any) =>
    a.assetCode?.toLowerCase().includes(search.toLowerCase()) ||
    a.brand?.toLowerCase().includes(search.toLowerCase()) ||
    a.model?.toLowerCase().includes(search.toLowerCase()) ||
    a.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
    a.hostname?.toLowerCase().includes(search.toLowerCase())
  );

  // Quick stats
  const activeCount = assets.filter((a: any) => a.status === 'ACTIVE').length;
  const maintenanceCount = assets.filter((a: any) => a.status === 'UNDER_MAINTENANCE' || a.status === 'REPAIR').length;

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingAsset) return api.put(`/assets/${editingAsset.id}`, payload);
      return api.post('/assets', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedIds(prev => prev.filter(i => i !== editingAsset?.id));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => api.post('/assets/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    },
  });

  // Bulk Import Mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (payload: any[]) => {
      const res = await api.post('/assets/bulk', { assets: payload });
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setBulkSuccessMsg(res.message || `Successfully imported ${bulkParsedAssets.length} assets!`);
      setTimeout(() => {
        setIsBulkModalOpen(false);
        setBulkParsedAssets([]);
        setBulkFileName('');
        setBulkSuccessMsg(null);
        setBulkError(null);
      }, 1800);
    },
    onError: (err: any) => {
      setBulkError(err.response?.data?.message || 'Failed to bulk import assets');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      purchaseCost: Number(formData.purchaseCost),
      assignedUserId: formData.assignedUserId || undefined,
      departmentId: formData.departmentId || undefined,
      locationId: formData.locationId || undefined,
      vendorId: formData.vendorId || undefined,
    });
  };

  // Download CSV Bulk Upload Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/assets/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asset_bulk_upload_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // Fallback CSV download client-side
      const csv = "Type,Brand,Model,SerialNumber,PurchaseDate,PurchaseCost,Status,Condition,Hostname,IpAddress,MacAddress,OperatingSystem,Remarks\nLAPTOP,Dell,Latitude 5430,DL5430SN001,2025-01-15,75000,ACTIVE,EXCELLENT,DESKTOP-IT-001,192.168.1.101,00:1B:44:11:3A:B7,Windows 11 Pro,Assigned to IT Support\nNETWORK_SWITCH,Cisco,Catalyst 2960,CS2960SN002,2024-11-20,45000,ACTIVE,GOOD,SWITCH-CORE-01,192.168.1.2,00:1B:44:22:4B:C8,Cisco IOS,Server Room Rack 1\n";
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asset_bulk_upload_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // CSV & Excel File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setBulkFileName(file.name);
    setBulkError(null);
    setBulkSuccessMsg(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      setBulkParsedAssets([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setBulkError('CSV file must contain a header row and at least 1 data row.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const parsed: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 2) continue;

          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });

          parsed.push({
            type: row['type'] || row['category'] || row['segment'] || 'LAPTOP',
            brand: row['brand'] || row['make'] || 'Generic',
            model: row['model'] || row['description'] || row['material'] || 'Model 1',
            serialNumber: row['serialnumber'] || row['serial_number'] || row['s/n'] || '',
            purchaseDate: row['purchasedate'] || row['purchase_date'] || '',
            purchaseCost: parseFloat(row['purchasecost'] || row['purchase_cost'] || row['rate'] || row['cost'] || row['unit rate'] || '0') || 0,
            status: row['status'] || 'ACTIVE',
            condition: row['condition'] || 'GOOD',
            hostname: row['hostname'] || '',
            ipAddress: row['ipaddress'] || row['ip_address'] || '',
            macAddress: row['macaddress'] || row['mac_address'] || '',
            operatingSystem: row['operatingsystem'] || row['operating_system'] || '',
            remarks: row['remarks'] || row['notes'] || '',
          });
        }

        setBulkParsedAssets(parsed);
      } catch (err: any) {
        setBulkError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (!selectedFile && bulkParsedAssets.length === 0) {
      setBulkError('Please select a valid Excel (.xlsx / .xls) or CSV file.');
      return;
    }

    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      try {
        setBulkError(null);
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await api.post('/assets/upload-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        queryClient.invalidateQueries({ queryKey: ['assets'] });
        setBulkSuccessMsg(res.data.message || `Excel import successful! Imported ${res.data.data?.count || 0} assets.`);
        setTimeout(() => {
          setIsBulkModalOpen(false);
          setBulkParsedAssets([]);
          setBulkFileName('');
          setSelectedFile(null);
          setBulkSuccessMsg(null);
        }, 1800);
      } catch (err: any) {
        setBulkError(err.response?.data?.message || 'Failed to import Excel file.');
      }
    } else {
      bulkImportMutation.mutate(bulkParsedAssets);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Monitor className="w-7 h-7 text-indigo-500" /> Asset Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Centralized IT hardware, server & network asset inventory tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2"
            title="Download Bulk Upload CSV Template"
          >
            <Download className="w-4 h-4 text-emerald-500" /> Template
          </button>

          <button
            onClick={() => {
              setBulkParsedAssets([]);
              setBulkFileName('');
              setBulkError(null);
              setBulkSuccessMsg(null);
              setIsBulkModalOpen(true);
            }}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2"
            title="Bulk Upload Assets from CSV"
          >
            <UploadCloud className="w-4 h-4 text-indigo-500" /> Bulk Upload
          </button>

          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary flex items-center gap-1.5 text-xs py-2">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{assets.length}</div>
            <div className="text-xs text-muted">Total Assets</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{activeCount}</div>
            <div className="text-xs text-muted">Active In Use</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{maintenanceCount}</div>
            <div className="text-xs text-muted">In Maintenance/Repair</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{assets.filter((a: any) => a.qrCode).length}</div>
            <div className="text-xs text-muted">QR Tagged</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search code, brand, serial, hostname..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field">
            <option value="">All Asset Types</option>
            <option value="LAPTOP">Laptop</option>
            <option value="DESKTOP">Desktop</option>
            <option value="SERVER">Server</option>
            <option value="PRINTER">Printer</option>
            <option value="NETWORK_SWITCH">Network Switch</option>
            <option value="ROUTER">Router</option>
            <option value="CCTV_CAMERA">CCTV Camera</option>
            <option value="UPS">UPS</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="REPAIR">Repair</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="card p-3 bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 text-sm text-indigo-200">
            <span className="font-bold text-indigo-400 font-mono text-base">{selectedIds.length}</span> item(s) selected from current list
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
          <div className="p-8 text-center text-muted">Loading assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No asset records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredAssets.length > 0 && selectedIds.length === filteredAssets.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(filteredAssets.map((a: any) => a.id));
                        else setSelectedIds([]);
                      }}
                      className="rounded border-subtle text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th>Asset Code</th>
                  <th>Brand & Model</th>
                  <th>Type</th>
                  <th>Serial No.</th>
                  <th>Assigned User / Dept</th>
                  <th>Warranty Expiry</th>
                  <th>Status</th>
                  <th>Condition</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((a: any) => {
                  const hasWarranty = Boolean(a.warrantyEnd);
                  const isExpired = hasWarranty && new Date(a.warrantyEnd) < new Date();
                  const isExpiringSoon = hasWarranty && !isExpired && (new Date(a.warrantyEnd).getTime() - new Date().getTime()) < 90 * 86400000;

                  return (
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
                      <td className="font-mono text-xs font-bold text-indigo-400">{a.assetCode}</td>
                      <td className="font-medium">
                        {a.brand} {a.model}
                        {a.hostname && <div className="text-[10px] font-mono text-muted">{a.hostname}</div>}
                      </td>
                      <td><span className="badge badge-gray">{a.type}</span></td>
                      <td className="font-mono text-xs">{a.serialNumber || '—'}</td>
                      <td className="text-xs">
                        {a.assignedUser?.name || a.department?.name || <span className="text-muted">Unassigned</span>}
                      </td>
                      <td>
                        {hasWarranty ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold" style={{ color: isExpired ? '#ef4444' : 'var(--text-primary)' }}>
                              {formatDate(a.warrantyEnd)}
                            </div>
                            <span className={`badge ${isExpired ? 'badge-red' : isExpiringSoon ? 'badge-amber' : 'badge-green'}`}>
                              <Shield size={10} />
                              {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring' : 'Covered'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">No Warranty</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${a.status === 'ACTIVE' ? 'badge-green' : a.status === 'REPAIR' ? 'badge-red' : 'badge-amber'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td><span className="badge badge-blue">{a.condition}</span></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setQrModalAsset(a)}
                          className="btn-icon text-indigo-400"
                          title="View QR Tag"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(a)} className="btn-icon" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete asset?')) deleteMutation.mutate(a.id); }}
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
            <h2 className="text-lg font-bold mb-4">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Asset Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="DESKTOP">Desktop</option>
                    <option value="SERVER">Server</option>
                    <option value="PRINTER">Printer</option>
                    <option value="NETWORK_SWITCH">Network Switch</option>
                    <option value="ROUTER">Router</option>
                    <option value="FIREWALL">Firewall</option>
                    <option value="CCTV_CAMERA">CCTV Camera</option>
                    <option value="NVR">NVR</option>
                    <option value="UPS">UPS</option>
                    <option value="MONITOR">Monitor</option>
                  </select>
                </div>
                <div>
                  <label className="label">Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dell, HP, Cisco..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="Latitude 5420..."
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="label">Serial Number</label>
                  <input
                    type="text"
                    placeholder="SN12345678"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Cost (₹)</label>
                  <input
                    type="number"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Warranty Expiry</label>
                  <input
                    type="date"
                    value={formData.warrantyEnd}
                    onChange={(e) => setFormData({ ...formData, warrantyEnd: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_STOCK">In Stock</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="REPAIR">Repair</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="label">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="input-field"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="label">Assigned User</label>
                  <select
                    value={formData.assignedUserId}
                    onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Hostname</label>
                  <input
                    type="text"
                    placeholder="DESKTOP-IT-01"
                    value={formData.hostname}
                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.1.100"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select Dept</option>
                    {depts.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Saving...' : editingAsset ? 'Update Asset' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-3xl">
            <div className="flex items-center justify-between border-b border-subtle pb-3 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-500" /> Bulk Asset Upload
              </h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>

            {bulkSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {bulkSuccessMsg}
              </div>
            )}

            {bulkError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {bulkError}
              </div>
            )}

            <div className="space-y-4">
              {/* File Select & Instructions */}
              <div className="p-4 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 text-center">
                <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                <div className="text-sm font-semibold">Select Excel (.xlsx / .xls) or CSV File to Upload</div>
                <div className="text-xs text-muted mb-3">
                  Upload your asset inventory Excel sheet or custom quote requirements spreadsheet. Auto-detects columns (Category, Brand, Description, Qty, Rate, Serial Number).
                </div>

                <div className="flex flex-wrap justify-center items-center gap-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    id="excel-file-input"
                    className="hidden"
                  />
                  <label htmlFor="excel-file-input" className="btn-primary cursor-pointer text-xs flex items-center gap-2">
                    <UploadCloud className="w-4 h-4" /> Choose Excel / CSV File
                  </label>
                  <button onClick={handleDownloadTemplate} type="button" className="btn-secondary text-xs flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-500" /> Download Sample CSV Template
                  </button>
                </div>
                {bulkFileName && (
                  <div className="mt-2 text-xs font-mono text-indigo-400 font-bold">
                    Selected File: {bulkFileName} {bulkParsedAssets.length > 0 ? `(${bulkParsedAssets.length} CSV rows detected)` : '(Excel sheet ready for import)'}
                  </div>
                )}
              </div>

              {/* Preview Table */}
              {bulkParsedAssets.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-muted mb-2">
                    Parsed Asset Preview ({bulkParsedAssets.length} records ready for import)
                  </h3>
                  <div className="max-h-60 overflow-y-auto border border-subtle rounded-lg">
                    <table className="data-table w-full text-xs">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Type</th>
                          <th>Brand & Model</th>
                          <th>Serial No.</th>
                          <th>Cost (₹)</th>
                          <th>Status</th>
                          <th>Hostname</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkParsedAssets.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="font-mono text-muted">{index + 1}</td>
                            <td><span className="badge badge-gray">{item.type}</span></td>
                            <td className="font-medium">{item.brand} {item.model}</td>
                            <td className="font-mono">{item.serialNumber || '—'}</td>
                            <td className="font-semibold">{formatINR(item.purchaseCost)}</td>
                            <td><span className="badge badge-green">{item.status}</span></td>
                            <td className="font-mono">{item.hostname || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-subtle">
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={!selectedFile && bulkParsedAssets.length === 0}
                  className="btn-primary"
                >
                  {bulkImportMutation.isPending ? 'Importing Assets...' : 'Import Assets from File'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Tag Modal */}
      {qrModalAsset && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm text-center">
            <h3 className="font-bold text-lg mb-2">Asset QR Tag</h3>
            <div className="font-mono text-sm font-bold text-indigo-400 mb-3">{qrModalAsset.assetCode}</div>

            {qrModalAsset.qrCode ? (
              <img src={qrModalAsset.qrCode} alt="Asset QR Code" className="w-48 h-48 mx-auto rounded-lg border border-subtle p-2 bg-white" />
            ) : (
              <div className="p-8 text-xs text-muted">Generating QR code...</div>
            )}

            <div className="text-xs text-muted mt-3">
              {qrModalAsset.brand} {qrModalAsset.model} ({qrModalAsset.serialNumber || 'No S/N'})
            </div>

            <div className="flex justify-center gap-2 mt-4 pt-3 border-t border-subtle">
              <button onClick={() => window.print()} className="btn-primary text-xs">Print Tag</button>
              <button onClick={() => setQrModalAsset(null)} className="btn-secondary text-xs">Close</button>
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
              <h2 className="text-lg font-bold">Bulk Delete Assets</h2>
            </div>
            <p className="text-sm mb-4 text-muted">
              Are you sure you want to delete <strong className="text-indigo-400 font-mono">{selectedIds.length}</strong> selected assets? This action cannot be undone.
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
