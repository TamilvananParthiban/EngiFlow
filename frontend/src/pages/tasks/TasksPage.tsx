import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckSquare, Clock, AlertTriangle, ListChecks, KanbanSquare, Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { formatDate, daysUntil } from '../../utils/format';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED';

const COLUMNS: { key: TaskStatus; label: string; color: string; bg: string }[] = [
  { key: 'TODO', label: 'To Do', color: '#64748b', bg: 'var(--border-subtle)' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#3742FA', bg: 'var(--kpi-blue)' },
  { key: 'WAITING', label: 'Waiting', color: '#f59e0b', bg: 'var(--kpi-amber)' },
  { key: 'COMPLETED', label: 'Completed', color: '#10b981', bg: 'var(--kpi-green)' },
];

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3742FA',
  LOW: '#10b981',
};

interface Task {
  id: string;
  taskCode: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  assignedUser?: { id: string; name: string };
  createdBy?: { id: string; name: string };
}

function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const days = daysUntil(task.dueDate);
  const isOverdue = task.dueDate && days < 0 && task.status !== 'COMPLETED';

  return (
    <div className="kanban-card" onClick={() => onEdit(task)}>
      <div className="flex items-start gap-2 mb-2">
        <div
          className="priority-bar flex-shrink-0"
          style={{ background: PRIORITY_COLOR[task.priority] || '#64748b', width: 3, alignSelf: 'stretch', borderRadius: 2 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="font-medium text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
              {task.title}
            </div>
            <button
              type="button"
              className="btn-icon p-1 text-muted hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onDelete(task); }}
              title="Delete Task"
            >
              <Trash2 size={13} />
            </button>
          </div>
          {task.description && (
            <div className="text-xs mt-1 truncate-2" style={{ color: 'var(--text-muted)' }}>
              {task.description}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="font-mono-code text-[10px]">{task.taskCode}</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: `${PRIORITY_COLOR[task.priority]}15`,
            color: PRIORITY_COLOR[task.priority],
          }}
        >
          {task.priority}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2">
        {task.dueDate && (
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: isOverdue ? '#ef4444' : 'var(--text-muted)' }}
          >
            <Clock size={11} />
            {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
          </div>
        )}
        {task.assignedUser && (
          <div
            className="flex items-center justify-center text-white text-[9px] font-bold rounded-full"
            style={{
              width: 22, height: 22,
              background: 'linear-gradient(135deg, #3742FA, #8b5cf6)',
              fontSize: 9,
            }}
            title={task.assignedUser.name}
          >
            {task.assignedUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        )}
      </div>

      {/* Quick status move */}
      <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
        {COLUMNS.filter(c => c.key !== task.status).slice(0, 2).map((col) => (
          <button
            key={col.key}
            className="text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors hover:opacity-80"
            style={{ borderColor: col.color + '40', color: col.color, background: col.bg }}
            onClick={() => onStatusChange(task.id, col.key)}
          >
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onSave }: {
  task?: Task | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'MEDIUM',
    status: task?.status || 'TODO',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    remarks: '',
  });

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {task ? 'Edit Task' : 'Create Task'}
          </h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-4">
            <div>
              <label className="form-label">Task Title *</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {['TODO', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (form.title) onSave(form); }}>
            {task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { data: kanbanData, isLoading } = useQuery({
    queryKey: ['tasks', 'kanban'],
    queryFn: async () => {
      const res = await api.get('/tasks/kanban');
      return res.data.data;
    },
    enabled: view === 'kanban',
  });

  const { data: listData } = useQuery({
    queryKey: ['tasks', 'list'],
    queryFn: async () => {
      const res = await api.get('/tasks?limit=50');
      return res.data.data;
    },
    enabled: view === 'list',
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setModalOpen(false);
      setEditTask(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeletingTask(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/tasks/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    },
  });

  const handleSave = (data: Record<string, unknown>) => {
    if (editTask) {
      updateMutation.mutate({ id: editTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Count tasks
  const totalTasks = kanbanData ? Object.values(kanbanData as Record<string, Task[]>).flat().length : 0;
  const overdueTasks = kanbanData
    ? (Object.values(kanbanData as Record<string, Task[]>).flat() as Task[]).filter(
        (t) => t.dueDate && daysUntil(t.dueDate) < 0 && t.status !== 'COMPLETED',
      ).length
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Management</h1>
          <p className="page-subtitle">
            {totalTasks} tasks total{overdueTasks > 0 ? ` · ${overdueTasks} overdue` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div
            className="flex rounded-lg overflow-hidden border"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: view === 'kanban' ? 'var(--color-primary)' : 'var(--bg-surface)',
                color: view === 'kanban' ? 'white' : 'var(--text-secondary)',
              }}
              onClick={() => setView('kanban')}
            >
              <KanbanSquare size={14} /> Kanban
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: view === 'list' ? 'var(--color-primary)' : 'var(--bg-surface)',
                color: view === 'list' ? 'white' : 'var(--text-secondary)',
              }}
              onClick={() => setView('list')}
            >
              <ListChecks size={14} /> List
            </button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTask(null); setModalOpen(true); }}>
            <Plus size={14} /> Create Task
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const tasks: Task[] = (kanbanData as Record<string, Task[]>)?.[col.key] || [];
            return (
              <div key={col.key} className="kanban-column" style={{ minWidth: 280, flexShrink: 0 }}>
                <div className="kanban-header">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{col.label}</span>
                  </div>
                  <span
                    className="badge"
                    style={{ background: col.bg, color: col.color }}
                  >
                    {tasks.length}
                  </span>
                </div>

                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton h-24 rounded-xl" />
                  ))
                ) : tasks.length === 0 ? (
                  <div
                    className="text-xs text-center py-6 rounded-xl border-2 border-dashed"
                    style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}
                  >
                    No tasks
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                      onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
                      onDelete={(t) => setDeletingTask(t)}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      (listData as Task[] || []).length > 0 &&
                      selectedIds.length === (listData as Task[] || []).length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((listData as Task[] || []).map((t) => t.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th>Code</th>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Assigned To</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(listData as Task[] || []).map((task) => {
                const days = daysUntil(task.dueDate);
                const isOverdue = task.dueDate && days < 0 && task.status !== 'COMPLETED';
                const isSelected = selectedIds.includes(task.id);
                return (
                  <tr key={task.id} className={isSelected ? 'bg-indigo-500/10' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, task.id]);
                          } else {
                            setSelectedIds(selectedIds.filter((id) => id !== task.id));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td><span className="font-mono-code">{task.taskCode}</span></td>
                    <td>
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{task.title}</div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${PRIORITY_COLOR[task.priority]}15`,
                          color: PRIORITY_COLOR[task.priority],
                        }}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${task.status === 'COMPLETED' ? 'badge-green' : task.status === 'IN_PROGRESS' ? 'badge-blue' : task.status === 'WAITING' ? 'badge-amber' : 'badge-gray'}`}>
                        {task.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)', fontSize: 13 }}>
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                        {isOverdue && <span className="ml-1 text-xs">⚠️ {Math.abs(days)}d overdue</span>}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {task.assignedUser?.name || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon" title="Edit Task" onClick={() => { setEditTask(task); setModalOpen(true); }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Delete Task" onClick={() => setDeletingTask(task)}>
                          <Trash2 size={14} />
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

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="text-xs font-semibold text-slate-200">
            <span className="bg-indigo-500 text-white font-mono px-2 py-0.5 rounded-full text-xs mr-2">
              {selectedIds.length}
            </span>
            tasks selected
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

      {modalOpen && (
        <TaskModal
          task={editTask}
          onClose={() => { setModalOpen(false); setEditTask(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTask && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Delete Task</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete task <strong className="text-indigo-400 font-mono">{deletingTask.taskCode}</strong> ("{deletingTask.title}")? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTask(null)}
                className="btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deletingTask.id)}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
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
              <h2 className="text-lg font-bold">Bulk Delete Tasks</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete <strong className="text-red-400 font-mono">{selectedIds.length}</strong> selected tasks? This action cannot be undone.
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
