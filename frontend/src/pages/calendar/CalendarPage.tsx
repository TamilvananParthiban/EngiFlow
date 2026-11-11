import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter,
  Clock, Tag, User, Building2, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import api from '../../services/api';
import { formatDate } from '../../utils/format';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 16)); // September 2026
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['activity', 'task', 'followup']);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Month bounds calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const startIso = new Date(year, month, 1).toISOString();
  const endIso = new Date(year, month + 1, 0).toISOString();

  // Fetch calendar events from API
  const { data: eventsRes, isLoading } = useQuery({
    queryKey: ['calendar-events', year, month, selectedTypes.join(',')],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: startIso,
        end: endIso,
        types: selectedTypes.join(','),
      });
      const res = await api.get(`/calendar?${params.toString()}`);
      return res.data;
    },
  });

  const events = eventsRes?.data || [];

  const toggleType = (t: string) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate: Record<string, any[]> = {};
  events.forEach((evt: any) => {
    const dStr = evt.date;
    if (!eventsByDate[dStr]) eventsByDate[dStr] = [];
    eventsByDate[dStr].push(evt);
  });

  // Calendar grid matrix
  const gridCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toISOString().split('T')[0];
    gridCells.push({
      day,
      dateStr,
      isToday: new Date().toISOString().split('T')[0] === dateStr,
      events: eventsByDate[dateStr] || [],
    });
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'activity': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'task': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'followup': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CalendarIcon className="w-7 h-7 text-indigo-500" /> IT Operations Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Unified schedule view of activities, task due dates & scheduled follow-ups
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl p-1 border border-subtle bg-card">
            {(['month', 'week', 'day', 'agenda'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                  viewMode === m ? 'bg-indigo-600 text-white shadow' : 'text-muted hover:text-primary'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls & Event Type Filters */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={handlePrevMonth} className="btn-icon" title="Previous Month">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={handleToday} className="btn-secondary text-xs font-medium">
            Today
          </button>
          <button onClick={handleNextMonth} className="btn-icon" title="Next Month">
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold min-w-44 text-center">
            {monthNames[month]} {year}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Filter className="w-4 h-4 text-muted" />
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.includes('activity')}
              onChange={() => toggleType('activity')}
              className="accent-blue-500 rounded"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Activities
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.includes('task')}
              onChange={() => toggleType('task')}
              className="accent-indigo-500 rounded"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Tasks
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.includes('followup')}
              onChange={() => toggleType('followup')}
              className="accent-amber-500 rounded"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Follow-ups
          </label>
        </div>
      </div>

      {/* Calendar Grid / Agenda View */}
      {viewMode === 'agenda' ? (
        <div className="card p-4 space-y-4">
          <h3 className="font-bold text-base border-b border-subtle pb-2">Agenda List</h3>
          {isLoading ? (
            <div className="p-8 text-center text-muted">Loading agenda...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted">No scheduled events for this period.</div>
          ) : (
            <div className="divide-y divide-subtle">
              {events.map((evt: any) => (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className="py-3 flex items-center justify-between hover:bg-white/5 p-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs border font-mono font-medium ${getTypeBadgeClass(evt.type)}`}>
                      {evt.type.toUpperCase()}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{evt.title}</div>
                      <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" /> {evt.date} at {evt.time}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${evt.status === 'COMPLETED' ? 'badge-green' : 'badge-amber'}`}>
                    {evt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-3 overflow-x-auto">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs py-2 text-muted border-b border-subtle">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-1 mt-1 min-h-[500px]">
            {gridCells.map((cell, idx) => (
              <div
                key={idx}
                className={`min-h-[100px] p-1.5 rounded-lg border border-subtle flex flex-col justify-between transition-colors ${
                  !cell ? 'opacity-20 bg-transparent' : cell.isToday ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-card/50'
                }`}
              >
                {cell && (
                  <>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                        cell.isToday ? 'bg-indigo-600 text-white font-bold' : 'text-muted'
                      }`}>
                        {cell.day}
                      </span>
                      {cell.events.length > 0 && (
                        <span className="text-[10px] font-mono text-muted">{cell.events.length}</span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                      {cell.events.slice(0, 3).map((evt: any) => (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`p-1 rounded text-[10px] font-medium border truncate cursor-pointer transition-all hover:scale-[1.02] ${getTypeBadgeClass(evt.type)}`}
                          title={evt.title}
                        >
                          {evt.code || evt.type[0].toUpperCase()}: {evt.title}
                        </div>
                      ))}
                      {cell.events.length > 3 && (
                        <div className="text-[9px] text-muted text-center pt-0.5">
                          +{cell.events.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="flex items-center justify-between pb-3 border-b border-subtle">
              <span className={`px-2.5 py-1 rounded text-xs border font-mono font-bold ${getTypeBadgeClass(selectedEvent.type)}`}>
                {selectedEvent.type.toUpperCase()}
              </span>
              <button onClick={() => setSelectedEvent(null)} className="btn-icon">✕</button>
            </div>

            <div className="py-4 space-y-3">
              <h3 className="font-bold text-lg">{selectedEvent.title}</h3>

              <div className="text-sm space-y-2 text-muted">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Date: <strong>{formatDate(selectedEvent.date)}</strong> ({selectedEvent.time})</span>
                </div>

                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>Status: <span className="badge badge-amber">{selectedEvent.status}</span></span>
                </div>

                {selectedEvent.priority && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span>Priority: <strong>{selectedEvent.priority}</strong></span>
                  </div>
                )}

                {selectedEvent.assignedTo && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span>Assigned to: {selectedEvent.assignedTo}</span>
                  </div>
                )}

                {selectedEvent.vendor && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>Vendor: {selectedEvent.vendor}</span>
                  </div>
                )}
              </div>

              {selectedEvent.details && (
                <div className="p-3 rounded-lg bg-body text-xs border border-subtle mt-2">
                  <div className="font-semibold mb-1 text-primary">Details:</div>
                  <p className="whitespace-pre-wrap text-muted">{selectedEvent.details}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-subtle">
              <button onClick={() => setSelectedEvent(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
