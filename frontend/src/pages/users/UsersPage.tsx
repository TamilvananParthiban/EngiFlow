import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserPlus, Search, Shield, Key, Lock, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, MoreVertical, Edit3, Trash2, Check, X,
  Building2, Phone, Mail, UserCheck, ShieldAlert, ShieldCheck, Eye, EyeOff
} from 'lucide-react';
import api from '../../services/api';
import { formatDateTime, getInitials } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';

interface Department {
  id: string;
  name: string;
  code?: string;
}

interface UserItem {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'IT_MANAGER' | 'SYSTEM_ADMIN' | 'IT_ENGINEER' | 'IT_SUPPORT' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  phone?: string;
  designation?: string;
  avatar?: string;
  lastLoginAt?: string;
  createdAt?: string;
  departmentId?: string;
  department?: Department;
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', badge: 'badge-purple', desc: 'Full system control and user permissions management' },
  { value: 'IT_MANAGER', label: 'IT Manager', badge: 'badge-blue', desc: 'Manage assets, vendors, invoices, team activities & reports' },
  { value: 'SYSTEM_ADMIN', label: 'System Admin', badge: 'badge-teal', desc: 'Infrastructure, servers, network, CCTV & backups' },
  { value: 'IT_ENGINEER', label: 'IT Engineer', badge: 'badge-green', desc: 'Handle tickets, tasks, asset maintenance & PM' },
  { value: 'IT_SUPPORT', label: 'IT Support', badge: 'badge-amber', desc: 'Helpdesk tickets, daily activities & basic user support' },
  { value: 'VIEWER', label: 'Viewer (Read-Only)', badge: 'badge-gray', desc: 'View dashboards, reports and asset inventories only' },
];

const PERMISSIONS_MATRIX = [
  { module: 'Dashboard & Analytics', superAdmin: true, itManager: true, sysAdmin: true, itEngineer: true, itSupport: true, viewer: true },
  { module: 'User Management & Rights', superAdmin: true, itManager: true, sysAdmin: false, itEngineer: false, itSupport: false, viewer: false },
  { module: 'Reset User Passwords', superAdmin: true, itManager: true, sysAdmin: false, itEngineer: false, itSupport: false, viewer: false },
  { module: 'Assets Inventory (Create/Edit)', superAdmin: true, itManager: true, sysAdmin: true, itEngineer: true, itSupport: false, viewer: false },
  { module: 'Tickets & Helpdesk (Resolve/Close)', superAdmin: true, itManager: true, sysAdmin: true, itEngineer: true, itSupport: true, viewer: false },
  { module: 'Vendors, Invoices & Payments', superAdmin: true, itManager: true, sysAdmin: false, itEngineer: false, itSupport: false, viewer: false },
  { module: 'Infrastructure & CCTV Control', superAdmin: true, itManager: true, sysAdmin: true, itEngineer: true, itSupport: false, viewer: false },
  { module: 'AMC, Warranty & Software Licenses', superAdmin: true, itManager: true, sysAdmin: true, itEngineer: false, itSupport: false, viewer: false },
  { module: 'Audit Trail Logs', superAdmin: true, itManager: true, sysAdmin: true, itEngineer: false, itSupport: false, viewer: false },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'directory' | 'rights'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserItem | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState<UserItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'IT_SUPPORT',
    status: 'ACTIVE',
    employeeId: '',
    phone: '',
    designation: '',
    departmentId: '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('IT_SUPPORT');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: users = [], isLoading, refetch } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data;
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data.data;
    },
  });

  // Mutations
  const saveUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingUser) {
        return api.put(`/users/${editingUser.id}`, data);
      } else {
        return api.post('/users', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsUserModalOpen(false);
      showToast(editingUser ? 'User details updated successfully' : 'New user created successfully');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to save user', 'error');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, pass }: { userId: string; pass: string }) => {
      return api.patch(`/users/${userId}/password`, { password: pass });
    },
    onSuccess: () => {
      setIsPasswordModalOpen(false);
      setNewPassword('');
      showToast('Password reset successfully. The user will be required to log in again.');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to reset password', 'error');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return api.patch(`/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsRoleModalOpen(false);
      showToast('User role and permissions updated');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update user role', 'error');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return api.patch(`/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('User status updated');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update user status', 'error');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('User deleted from system');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to delete user', 'error');
    },
  });

  // Open modal handlers
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: 'Admin@1234',
      role: 'IT_SUPPORT',
      status: 'ACTIVE',
      employeeId: '',
      phone: '',
      designation: '',
      departmentId: '',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditModal = (u: UserItem) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      status: u.status,
      employeeId: u.employeeId || '',
      phone: u.phone || '',
      designation: u.designation || '',
      departmentId: u.departmentId || '',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenPasswordModal = (u: UserItem) => {
    setPasswordTargetUser(u);
    setNewPassword('');
    setShowPassword(false);
    setIsPasswordModalOpen(true);
  };

  const handleOpenRoleModal = (u: UserItem) => {
    setRoleTargetUser(u);
    setSelectedRole(u.role);
    setIsRoleModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.designation && u.designation.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? u.status === statusFilter : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeUsersCount = users.filter((u) => u.status === 'ACTIVE').length;
  const adminsCount = users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'IT_MANAGER').length;
  const disabledCount = users.filter((u) => u.status !== 'ACTIVE').length;

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
          <h1 className="page-title">User & Access Management</h1>
          <p className="page-subtitle">
            Manage IT team members, role-based access control rights, and security passwords
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-secondary" onClick={() => refetch()}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <UserPlus size={15} />
            Add New User
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-blue)' }}>
              <Users size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <span className="badge badge-blue">Total</span>
          </div>
          <div>
            <div className="kpi-value">{users.length}</div>
            <div className="kpi-label">Registered Accounts</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-green)' }}>
              <UserCheck size={20} style={{ color: '#10b981' }} />
            </div>
            <span className="badge badge-green">Active</span>
          </div>
          <div>
            <div className="kpi-value">{activeUsersCount}</div>
            <div className="kpi-label">Active Team Members</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--kpi-purple)' }}>
              <ShieldCheck size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <span className="badge badge-purple">Admins</span>
          </div>
          <div>
            <div className="kpi-value">{adminsCount}</div>
            <div className="kpi-label">Managers & Super Admins</div>
          </div>
        </div>

        <div className="kpi-card min-w-0">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: disabledCount > 0 ? 'var(--kpi-amber)' : 'var(--kpi-teal)' }}>
              <ShieldAlert size={20} style={{ color: disabledCount > 0 ? '#f59e0b' : '#0D9488' }} />
            </div>
            <span className={disabledCount > 0 ? 'badge badge-amber' : 'badge badge-teal'}>Status</span>
          </div>
          <div>
            <div className="kpi-value">{disabledCount}</div>
            <div className="kpi-label">Disabled / Suspended</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'directory'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('directory')}
        >
          <Users size={16} />
          User Directory ({users.length})
        </button>

        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'rights'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('rights')}
        >
          <Shield size={16} />
          Role Rights & Permissions Matrix
        </button>
      </div>

      {/* TAB 1: USER DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="search-bar flex-1 min-w-[240px]">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search user by name, email, employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                className="form-select text-xs min-w-[140px]"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              <select
                className="form-select text-xs min-w-[130px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="card overflow-hidden min-w-0">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Role & Rights</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th className="text-right">Manage Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                          <RefreshCw size={16} className="animate-spin" />
                          Loading users...
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No users found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const roleConfig = ROLES.find((r) => r.value === u.role);
                      return (
                        <tr key={u.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #3742FA, #8b5cf6)' }}
                              >
                                {getInitials(u.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                                  {u.name}
                                  {u.id === currentUser?.id && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-950 dark:text-indigo-300">You</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 truncate flex items-center gap-2">
                                  <span>{u.email}</span>
                                  {u.employeeId && <span className="font-mono-code">{u.employeeId}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <button
                              onClick={() => handleOpenRoleModal(u)}
                              className={`badge ${roleConfig?.badge || 'badge-gray'} hover:opacity-80 transition-opacity cursor-pointer`}
                              title="Click to manage user rights & role"
                            >
                              <Shield size={11} />
                              {roleConfig?.label || u.role}
                            </button>
                          </td>

                          <td>
                            <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Building2 size={13} className="text-slate-400" />
                              {u.department?.name || 'Unassigned'}
                            </div>
                          </td>

                          <td>
                            <select
                              value={u.status}
                              onChange={(e) => toggleStatusMutation.mutate({ userId: u.id, status: e.target.value })}
                              className={`text-xs px-2 py-1 rounded-lg border font-semibold cursor-pointer ${
                                u.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                  : u.status === 'SUSPENDED'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                              }`}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="INACTIVE">INACTIVE</option>
                              <option value="SUSPENDED">SUSPENDED</option>
                            </select>
                          </td>

                          <td>
                            <div className="text-xs text-slate-500">
                              {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never logged in'}
                            </div>
                          </td>

                          <td>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Reset Password Button */}
                              <button
                                onClick={() => handleOpenPasswordModal(u)}
                                className="btn-icon"
                                title="Manage & Reset Password"
                              >
                                <Key size={14} className="text-amber-500" />
                              </button>

                              {/* Edit Details Button */}
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="btn-icon"
                                title="Edit User Profile"
                              >
                                <Edit3 size={14} className="text-indigo-500" />
                              </button>

                              {/* Delete User Button */}
                              {u.id !== currentUser?.id && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to remove user "${u.name}"?`)) {
                                      deleteUserMutation.mutate(u.id);
                                    }
                                  }}
                                  className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                                  title="Delete User Account"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
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

      {/* TAB 2: ROLE RIGHTS & PERMISSIONS MATRIX */}
      {activeTab === 'rights' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Role Access & Permission Matrix
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Overview of module capabilities configured across system user roles. Super Admins and IT Managers can assign these roles to team members.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {ROLES.map((r) => (
                <div key={r.value} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${r.badge}`}>{r.label}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{r.desc}</p>
                </div>
              ))}
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Module / Action Scope</th>
                    <th className="text-center">Super Admin</th>
                    <th className="text-center">IT Manager</th>
                    <th className="text-center">Sys Admin</th>
                    <th className="text-center">IT Engineer</th>
                    <th className="text-center">IT Support</th>
                    <th className="text-center">Viewer</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS_MATRIX.map((pm) => (
                    <tr key={pm.module}>
                      <td className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {pm.module}
                      </td>
                      <td className="text-center">
                        {pm.superAdmin ? <Check className="inline text-emerald-500 stroke-[3]" size={16} /> : <X className="inline text-slate-300" size={16} />}
                      </td>
                      <td className="text-center">
                        {pm.itManager ? <Check className="inline text-emerald-500 stroke-[3]" size={16} /> : <X className="inline text-slate-300" size={16} />}
                      </td>
                      <td className="text-center">
                        {pm.sysAdmin ? <Check className="inline text-emerald-500 stroke-[3]" size={16} /> : <X className="inline text-slate-300" size={16} />}
                      </td>
                      <td className="text-center">
                        {pm.itEngineer ? <Check className="inline text-emerald-500 stroke-[3]" size={16} /> : <X className="inline text-slate-300" size={16} />}
                      </td>
                      <td className="text-center">
                        {pm.itSupport ? <Check className="inline text-emerald-500 stroke-[3]" size={16} /> : <X className="inline text-slate-300" size={16} />}
                      </td>
                      <td className="text-center">
                        {pm.viewer ? <Check className="inline text-emerald-500 stroke-[3]" size={16} /> : <X className="inline text-slate-300" size={16} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT USER */}
      {isUserModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-lg">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                {editingUser ? 'Edit User Details' : 'Add New User Account'}
              </h2>
              <button className="btn-icon" onClick={() => setIsUserModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveUserMutation.mutate(formData);
              }}
            >
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="john.doe@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {!editingUser && (
                  <div>
                    <label className="form-label">Initial Password *</label>
                    <input
                      type="password"
                      required
                      className="form-input"
                      placeholder="e.g. Admin@1234"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Employee ID</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="EMP-1002"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Designation / Role Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Network Engineer"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Department</label>
                    <select
                      className="form-select"
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">System Role / Rights *</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Account Status *</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsUserModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveUserMutation.isPending}
                  className="btn btn-primary"
                >
                  {saveUserMutation.isPending ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET PASSWORD */}
      {isPasswordModalOpen && passwordTargetUser && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Key size={18} className="text-amber-500" />
                Password Management
              </h2>
              <button className="btn-icon" onClick={() => setIsPasswordModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newPassword.length < 6) {
                  showToast('Password must be at least 6 characters', 'error');
                  return;
                }
                resetPasswordMutation.mutate({ userId: passwordTargetUser.id, pass: newPassword });
              }}
            >
              <div className="modal-body space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  Resetting password for <strong>{passwordTargetUser.name}</strong> ({passwordTargetUser.email}).
                  Existing active login sessions will be invalidated.
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label mb-0">New Password *</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                    >
                      Generate Secure Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="form-input pr-10"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="btn btn-primary bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGE ROLE & RIGHTS */}
      {isRoleModalOpen && roleTargetUser && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield size={18} className="text-indigo-600" />
                Manage Role Rights
              </h2>
              <button className="btn-icon" onClick={() => setIsRoleModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Update user role for <strong>{roleTargetUser.name}</strong> to adjust access rights across all modules.
              </div>

              <div className="space-y-2">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedRole === r.value
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRoleChoice"
                      value={r.value}
                      checked={selectedRole === r.value}
                      onChange={() => setSelectedRole(r.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {r.label}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsRoleModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateRoleMutation.isPending}
                className="btn btn-primary"
                onClick={() => updateRoleMutation.mutate({ userId: roleTargetUser.id, role: selectedRole })}
              >
                {updateRoleMutation.isPending ? 'Updating...' : 'Save Role Rights'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
