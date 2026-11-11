// Format currency in INR
export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '₹0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Format date as DD/MM/YYYY
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format date as DD MMM YYYY (e.g. 16 Sep 2026)
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format datetime
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Format time-only
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Days until expiry
export function daysUntil(date: string | Date | null | undefined): number {
  if (!date) return 0;
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Format duration in minutes to HH:MM
export function formatDurationMins(minutes: number | null | undefined): string {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Format number with commas
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-IN');
}

// Get relative time (e.g. "2 hours ago")
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.round((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}

// Get today's date as YYYY-MM-DD string for input[type=date]
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Get current month name
export function currentMonthName(): string {
  return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
}

// Map AssetType to display label
export function assetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    LAPTOP: 'Laptop',
    DESKTOP: 'Desktop',
    SERVER: 'Server',
    PRINTER: 'Printer',
    NETWORK_SWITCH: 'Network Switch',
    ROUTER: 'Router',
    FIREWALL: 'Firewall',
    ACCESS_POINT: 'Access Point',
    CCTV_CAMERA: 'CCTV Camera',
    NVR: 'NVR',
    UPS: 'UPS',
    STORAGE: 'Storage',
    MONITOR: 'Monitor',
    SCANNER: 'Scanner',
    OTHER: 'Other',
  };
  return map[type] || type;
}

// Truncate string
export function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '';
  return str.length <= max ? str : `${str.slice(0, max)}...`;
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
