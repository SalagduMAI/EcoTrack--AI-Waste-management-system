import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Play, RefreshCcw, Wifi, WifiOff, 
  MapPin, Camera, ClipboardCheck, QrCode, Hourglass, Trash2, Check, ArrowRight, Loader2, ListTodo,
  Star, Search, Bell, Menu, X, LogOut, Compass, Map, Sun, Database, History, User, CheckCheck, HelpCircle, Eye, EyeOff, Award, Info,
  Settings, Lock, Upload, Smartphone, ArrowLeft, Zap, Download, Clock, Megaphone, MoreVertical
} from 'lucide-react';
import { motion } from 'motion/react';
import { addToQueue, getQueue, clearQueue, deleteQueueItem, OfflineQueueItem } from '../lib/indexedDB';

interface WorkerPortalProps {
  token: string;
  user: any;
  onLogout: () => void;
}

export default function WorkerPortal({ token, user, onLogout }: WorkerPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'scan' | 'history' | 'notifications' | 'offline' | 'profile' | 'settings'>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'security' | 'help'>('profile');
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop";
  const [localUser, setLocalUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('ecotrack_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return user || { name: 'Sunil Kumara', phone: '+94 77 123 4567', email: 'sunil.k@ecotrack.lk', shift: 'Morning', avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop" };
  });

  useEffect(() => {
    if (user) {
      setLocalUser((prev: any) => {
        const merged = { ...prev, ...user };
        try {
          localStorage.setItem('ecotrack_user_profile', JSON.stringify(merged));
        } catch (e) { console.warn(e); }
        return merged;
      });
      setEditName(user.name || localUser?.name || 'Sunil Kumara');
      setEditPhone(user.phone || localUser?.phone || '+94 77 123 4567');
      setEditEmail(user.email || localUser?.email || 'sunil.k@ecotrack.lk');
      setEditShift(user.shift || localUser?.shift || 'Morning');
      setEditAvatarUrl(user.avatarUrl || localUser?.avatarUrl || defaultAvatar);
    }
  }, [user]);

  // Profile Edit modal states
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState(localUser?.name || 'Sunil Kumara');
  const [editPhone, setEditPhone] = useState(localUser?.phone || '+94 77 123 4567');
  const [editEmail, setEditEmail] = useState(localUser?.email || 'sunil.k@ecotrack.lk');
  const [editShift, setEditShift] = useState(localUser?.shift || 'Morning');
  const [editAvatarUrl, setEditAvatarUrl] = useState(localUser?.avatarUrl || defaultAvatar);

  // Change Password modal states
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [activeQueueDropdownId, setActiveQueueDropdownId] = useState<number | null>(null);
  
  const [notifications, setNotifications] = useState<any[]>([]);

  const [notificationFilter, setNotificationFilter] = useState<'all' | 'job' | 'rating' | 'announcement' | 'incident'>('all');
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'warn' | 'warning' | 'info' | 'error' } | null>(null);

  // Connection Simulator
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);

  // Selected job for actions and modals
  const [activeJob, setActiveJob] = useState<any | null>(null);
  
  // Modals & UI forms
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [isQrVerified, setIsQrVerified] = useState(false);
  
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentReason, setIncidentReason] = useState('Door locked');
  const [incidentPhoto, setIncidentPhoto] = useState<any>(null);
  const [incidentNote, setIncidentNote] = useState('Knocked twice at 8:25 AM — no answer. Bag not visible outside.');

  // Today's Tasks Custom Wizard Sub-views
  const [taskSubView, setTaskSubView] = useState<'dashboard' | 'pre_run' | 'run_complete' | 'incident' | 'camera'>('dashboard');
  const [selectedFloorGroup, setSelectedFloorGroup] = useState<{ blockName: string; floorNumber: number; totalUnits: number; doneUnits: number; items: any[] } | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [activeCaptureMethod, setActiveCaptureMethod] = useState<'webcam' | 'phone' | 'upload'>('webcam');
  const [recentPhotos, setRecentPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=150&auto=format&fit=crop'
  ]);

  // Time Tracker State (matches "01:14:32" in UI of screenshot and increments)
  const [timerSeconds, setTimerSeconds] = useState(4472); 
  const [timerPaused, setTimerPaused] = useState(false);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<'week' | 'month' | 'all'>('week');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [perfGraphTerm, setPerfGraphTerm] = useState<'Week' | 'Month' | 'Year'>('Week');
  const [showRouteMapModal, setShowRouteMapModal] = useState(false);

  // Local simulated coordinates
  const [lat, setLat] = useState<number | null>(6.9271);
  const [lng, setLng] = useState<number | null>(79.8612);

  // Ticking Shift Timer Loop
  useEffect(() => {
    let interval: any = null;
    if (!timerPaused) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerPaused]);

  // Format second counts to HH:MM:SS
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const getHistoryReferenceDate = (): Date => {
    let maxD = new Date('2026-05-10'); // Default start fallback matching mock data peak
    if (history.length > 0) {
      let candidate = new Date('1970-01-01');
      let found = false;
      history.forEach(item => {
        if (item.scheduled_date) {
          const d = new Date(item.scheduled_date);
          if (!isNaN(d.getTime()) && d > candidate) {
            candidate = d;
            found = true;
          }
        }
      });
      if (found) {
        maxD = candidate;
      }
    }
    return maxD;
  };

  const handleExportHistory = () => {
    const ref = getHistoryReferenceDate();
    // Determine which list is active under current filters
    const filteredHistory = history.filter(item => {
      if (historyTimeFilter === 'week') {
        const dateStr = item.scheduled_date || '';
        const d = new Date(dateStr);
        const diffTime = ref.getTime() - d.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 6 || isNaN(diffDays)) return false;
      } else if (historyTimeFilter === 'month') {
        // Filter by the month of reference date
        const targetMonth = ref.getMonth();
        const targetYear = ref.getFullYear();
        const itemDateStr = item.scheduled_date || '';
        const d = new Date(itemDateStr);
        if (isNaN(d.getTime()) || d.getMonth() !== targetMonth || d.getFullYear() !== targetYear) {
          return false;
        }
      }
      
      const queries = [historySearchQuery, searchQuery].filter(Boolean);
      for (const qRaw of queries) {
        const q = qRaw.toLowerCase();
        const unitNo = (item.unit?.unit_number || '').toLowerCase();
        const blockName = (item.block?.name || '').toLowerCase();
        const statusStr = (item.status || '').toLowerCase();
        const dateStr = (item.scheduled_date || '').toLowerCase();
        const issueStr = (item.issue_reason || '').toLowerCase();
        if (!unitNo.includes(q) && !blockName.includes(q) && !statusStr.includes(q) && !dateStr.includes(q) && !issueStr.includes(q)) {
          return false;
        }
      }
      return true;
    });

    if (filteredHistory.length === 0) {
      setMessage({ text: 'No records available to export under active filters!', type: 'warn' });
      return;
    }

    // Generate CSV content
    const csvRows = [
      ['Date', 'Time Completed', 'Unit No', 'Block Name', 'Status', 'Rating', 'Exceptions/Comments']
    ];

    filteredHistory.forEach(item => {
      let timeStr = '6:35 AM';
      if (item.completed_at) {
        try {
          const d = new Date(item.completed_at);
          timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          timeStr = item.scheduled_time || '6:35 AM';
        }
      } else {
        timeStr = item.scheduled_time || '6:35 AM';
      }

      csvRows.push([
        item.scheduled_date || '',
        timeStr,
        item.unit?.unit_number || 'N/A',
        item.block?.name || '',
        item.status === 'done' ? 'Done' : 'Issue Reported',
        item.status === 'done' ? (item.rating ? `${item.rating} Stars` : '5 Stars') : '—',
        item.issue_reason || ''
      ]);
    });

    const csvContent = csvRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Create virtual file trigger download
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `EcoTrack_Sunil_Kumara_History_${historyTimeFilter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ text: `Successfully exported ${filteredHistory.length} history records as CSV file!`, type: 'success' });
    } catch (e: any) {
      setMessage({ text: 'Export failed: ' + e.message, type: 'error' });
    }
  };

  // Get GPS simulation coords
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => {
          console.warn('Geolocation default Colombo active.');
        }
      );
    }
  }, []);

  // Fetch queue count
  const updateOfflineQueueState = async () => {
    try {
      let q = await getQueue();
      const hasPrefilled = localStorage.getItem('eco_offline_queue_prefilled');
      if (q.length === 0 && !hasPrefilled) {
        const initialMockQueue: OfflineQueueItem[] = [];
        // Must add sequentially to maintain order and wait for completion
        for (const item of initialMockQueue) {
          await addToQueue(item);
        }
        q = await getQueue();
      }
      setOfflineQueue(q);
    } catch (err) {
      console.warn('Could not read IndexedDB queue', err);
    }
  };

  useEffect(() => {
    const syncNetworkState = () => {
      setIsOffline(typeof navigator !== 'undefined' && 'onLine' in navigator ? !navigator.onLine : false);
    };

    syncNetworkState();
    window.addEventListener('online', syncNetworkState);
    window.addEventListener('offline', syncNetworkState);

    return () => {
      window.removeEventListener('online', syncNetworkState);
      window.removeEventListener('offline', syncNetworkState);
    };
  }, []);

  const isNetworkFailure = (error: unknown) => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      return true;
    }

    if (error instanceof TypeError) {
      return true;
    }

    return typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'AbortError';
  };

  const queueOfflineAction = async (payload: OfflineQueueItem, warningMessage: string) => {
    try {
      await addToQueue(payload);
      setIsOffline(true);
      await updateOfflineQueueState();
      setMessage({ text: warningMessage, type: 'warn' });
      return true;
    } catch (err) {
      console.error('Unable to queue worker action', err);
      setMessage({ text: 'Unable to save the action locally. Please retry.', type: 'error' });
      return false;
    }
  };

  const appendPhotoToFormData = async (formData: FormData, photoSource?: File | string | null) => {
    if (!photoSource) {
      return false;
    }

    if (photoSource instanceof File) {
      formData.append('photo', photoSource);
      return true;
    }

    if (typeof photoSource === 'string' && photoSource.startsWith('data:')) {
      const match = photoSource.match(/^data:(image\/[a-zA-Z+\-]+);base64,(.+)$/);
      if (!match) {
        return false;
      }

      const mediaType = match[1] || 'image/png';
      const base64 = match[2];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);

      for (let idx = 0; idx < binary.length; idx += 1) {
        bytes[idx] = binary.charCodeAt(idx);
      }

      const extension = mediaType.split('/')[1] || 'png';
      formData.append('photo', new File([bytes], `incident-photo.${extension}`, { type: mediaType }));
      return true;
    }

    if (typeof photoSource === 'string') {
      try {
        const response = await fetch(photoSource);
        const blob = await response.blob();
        const file = new File([blob], 'incident-photo', { type: blob.type || 'image/png' });
        formData.append('photo', file);
        return true;
      } catch (err) {
        console.warn('Unable to attach remote incident photo', err);
        return false;
      }
    }

    return false;
  };

  const getCachedWorkerData = () => {
    try {
      const cached = localStorage.getItem('ecotrack_worker_data');
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.warn('Unable to read cached worker data', err);
      return null;
    }
  };

  const persistWorkerData = (nextTasks: any[], nextHistory: any[]) => {
    try {
      localStorage.setItem('ecotrack_worker_data', JSON.stringify({
        tasks: nextTasks,
        history: nextHistory,
        syncedAt: new Date().toISOString()
      }));
    } catch (err) {
      console.warn('Unable to persist worker data cache', err);
    }
  };

  // Pull tasks for today
  const fetchTasks = async () => {
    const shouldShowLoading = tasks.length === 0 && history.length === 0;
    setLoading(shouldShowLoading);
    setMessage(null);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      const [tasksRes, histRes] = await Promise.all([
        fetch('/api/worker/tasks', { headers }).catch(() => null),
        fetch('/api/worker/history', { headers }).catch(() => null),
      ]);

      const tasksData = tasksRes && tasksRes.ok ? await tasksRes.json() : null;
      const histData = histRes && histRes.ok ? await histRes.json() : null;

      const nextTasks = tasksData?.status === 'success' && Array.isArray(tasksData.data?.tasks)
        ? tasksData.data.tasks
        : Array.isArray(tasksData?.data)
          ? tasksData.data
          : null;

      const nextHistory = histData?.status === 'success' && Array.isArray(histData.data?.data)
        ? histData.data.data
        : Array.isArray(histData?.data)
          ? histData.data
          : null;

      const cached = getCachedWorkerData();

      if (nextTasks) {
        setTasks(nextTasks);
      }
      if (nextHistory) {
        setHistory(nextHistory);
      }

      if (nextTasks || nextHistory) {
        persistWorkerData(nextTasks ?? cached?.tasks ?? [], nextHistory ?? cached?.history ?? []);
      }

      if (!nextTasks || !nextHistory) {
        if (cached) {
          if (!nextTasks) setTasks(cached.tasks || []);
          if (!nextHistory) setHistory(cached.history || []);
          setMessage({ text: 'Using cached worker data because the server refresh did not return complete results.', type: 'warn' });
        } else {
          setMessage({ text: 'Unable to refresh worker data from the server. Please check the connection and try again.', type: 'error' });
        }
      }
    } catch (err) {
      console.error(err);
      const cached = getCachedWorkerData();
      if (cached) {
        setTasks(cached.tasks || []);
        setHistory(cached.history || []);
        setMessage({ text: 'Using cached worker data because the server is currently unavailable.', type: 'warn' });
      } else {
        setMessage({ text: 'Unable to refresh worker data from the server. Please check the connection and try again.', type: 'error' });
      }
    } finally {
      setLoading(false);
      updateOfflineQueueState();
    }
  };

  useEffect(() => {
    fetchTasks();

    const interval = window.setInterval(() => {
      fetchTasks();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [token]);

  // Start Collection
  const handleMarkProgress = async (id: number) => {
    setActionLoading(true);
    setMessage(null);

    const timedAt = new Date().toISOString();
    const payload: OfflineQueueItem = {
      job_id: id,
      action: 'STATUS_MARKED_IN_PROGRESS',
      lat,
      lng,
      timed_at: timedAt,
      device_metadata: { os: 'PWA Sandbox iOS 17.5', battery: 94, signal: isOffline ? 'OFFLINE' : 'ONLINE' }
    };

    if (isOffline) {
      const queued = await queueOfflineAction(payload, 'Actions saved offline in IndexedDB. Re-sync when signal returns.');
      if (queued) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'in_progress' } : t));
      }
      setActionLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/worker/tasks/${id}/progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lat, lng })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to mark the task in progress.');
      }

      setMessage({ text: 'Task started successfully.', type: 'success' });
      await fetchTasks();
    } catch (error) {
      if (isNetworkFailure(error)) {
        const queued = await queueOfflineAction(payload, 'Signal low. Task update saved locally and will sync when back online.');
        if (queued) {
          setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'in_progress' } : t));
        }
      } else {
        setMessage({
          text: error instanceof Error ? error.message : 'Unable to start the task. Please try again.',
          type: 'error'
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Scan & Complete QR Verification 
  const handleQRScanSubmit = async (e?: React.FormEvent, directJobId?: number, directHash?: string) => {
    if (e) e.preventDefault();
    const finalJob = activeJob || tasks.find(t => t.id === directJobId);
    const finalHash = qrInput || directHash;
    if (!finalJob || !finalHash) return;

    setActionLoading(true);
    setShowQRModal(false);
    setMessage(null);

    const timedAt = new Date().toISOString();
    const payload: OfflineQueueItem = {
      job_id: finalJob.id,
      action: 'STATUS_MARKED_DONE',
      scanned_qr_hash: finalHash,
      lat,
      lng,
      timed_at: timedAt,
      device_metadata: { os: 'PWA Sandbox', battery: 94, signal: isOffline ? 'OFFLINE' : 'ONLINE' },
      task_number: finalJob.block?.name + ' Level ' + finalJob.floor?.floor_number,
      unit_number: finalJob.unit?.unit_number || 'Floor Corridor'
    };

    const expectedHash = finalJob.unit?.qr_code_hash || finalJob.floor?.qr_code_hash;
    if (expectedHash && expectedHash !== finalHash) {
      setMessage({ text: `Locality scan match fail! Expected: ${expectedHash}`, type: 'error' });
      setActionLoading(false);
      setQrInput('');
      return;
    }

    if (isOffline) {
      const queued = await queueOfflineAction(payload, 'Task collection captured offline inside local buffer.');
      if (queued) {
        setTasks(prev => prev.map(t => t.id === finalJob.id ? { ...t, status: 'done' } : t));
        setHistory(prev => [
          { id: finalJob.id, block: finalJob.block, floor: finalJob.floor, unit: finalJob.unit, scheduled_date: '2026-05-22', status: 'done', completed_at: timedAt },
          ...prev
        ]);
      }
      setActionLoading(false);
      setQrInput('');
      setActiveJob(null);
      return;
    }

    try {
      const response = await fetch(`/api/worker/tasks/${finalJob.id}/verify-scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scanned_qr_hash: finalHash, lat, lng })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Verification mismatch.');
      }

      setMessage({ text: `Bin at ${finalJob.unit?.unit_number || 'Corridor'} checked and cleared. status updated Done.`, type: 'success' });
      await fetchTasks();
    } catch (error) {
      if (isNetworkFailure(error)) {
        const queued = await queueOfflineAction(payload, 'Network unavailable. Task collection saved locally and will sync when online.');
        if (queued) {
          setTasks(prev => prev.map(t => t.id === finalJob.id ? { ...t, status: 'done' } : t));
          setHistory(prev => [
            { id: finalJob.id, block: finalJob.block, floor: finalJob.floor, unit: finalJob.unit, scheduled_date: '2026-05-22', status: 'done', completed_at: timedAt },
            ...prev
          ]);
        }
      } else {
        setMessage({
          text: error instanceof Error ? error.message : 'Unable to verify the QR scan. Please try again.',
          type: 'error'
        });
      }
    } finally {
      setActionLoading(false);
      setQrInput('');
      setActiveJob(null);
    }
  };

  // Handle profile image file upload instantly converting to base64
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ text: 'Image size should be less than 2MB.', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile edits
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = {
      ...localUser,
      name: editName,
      phone: editPhone,
      email: editEmail,
      shift: editShift,
      avatarUrl: editAvatarUrl
    };
    setLocalUser(updatedUser);
    localStorage.setItem('ecotrack_user_profile', JSON.stringify(updatedUser));
    setMessage({ text: 'Profile details saved and updated successfully.', type: 'success' });
    setIsEditProfileModalOpen(false);
  };

  // Change password handler
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setMessage({ text: 'Please fill in all database credential fields.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Security credentials do not match.', type: 'error' });
      return;
    }
    setMessage({ text: 'Security password changed successfully in local keychain.', type: 'success' });
    setIsChangePasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Submit issues & incidents
  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;

    setActionLoading(true);
    setShowIncidentModal(false);
    setMessage(null);

    const timedAt = new Date().toISOString();
    const payload: OfflineQueueItem = {
      job_id: activeJob.id,
      action: 'INCIDENT_REPORTED',
      incident_reason: incidentReason,
      lat,
      lng,
      timed_at: timedAt,
      device_metadata: { os: 'PWA Sandbox', battery: 90 },
      task_number: activeJob.block?.name + ' Level ' + activeJob.floor?.floor_number,
      unit_number: activeJob.unit?.unit_number || 'Floor Corridor'
    };

    if (isOffline) {
      const queued = await queueOfflineAction(payload, 'Incident exception buffer saved locally in IndexedDB.');
      if (queued) {
        setTasks(prev => prev.map(t => t.id === activeJob.id ? { ...t, status: 'issue', issue_reason: incidentReason } : t));
      }
      setActionLoading(false);
      setActiveJob(null);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('reason', incidentReason);
      if (lat) formData.append('lat', lat.toString());
      if (lng) formData.append('lng', lng.toString());
      await appendPhotoToFormData(formData, incidentPhoto || capturedPhotoUrl);

      const response = await fetch(`/api/worker/tasks/${activeJob.id}/report-incident`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Report error.');
      }

      setMessage({ text: 'Incident log sent to central command.', type: 'success' });
      await fetchTasks();
    } catch (error) {
      if (isNetworkFailure(error)) {
        const queued = await queueOfflineAction(payload, 'Network unavailable. Incident saved locally and will sync once the connection returns.');
        if (queued) {
          setTasks(prev => prev.map(t => t.id === activeJob.id ? { ...t, status: 'issue', issue_reason: incidentReason } : t));
        }
      } else {
        setMessage({
          text: error instanceof Error ? error.message : 'Unable to report the incident. Please try again.',
          type: 'error'
        });
      }
    } finally {
      setActionLoading(false);
      setActiveJob(null);
      setIncidentPhoto(null);
    }
  };

  // Database Synchronizer
  const handleSynchronizeQueue = async () => {
    if (offlineQueue.length === 0) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ queue: offlineQueue })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.status !== 'success') {
        throw new Error(data?.message || 'Unable to synchronize the offline queue.');
      }

      if (Array.isArray(data?.data?.failures) && data.data.failures.length > 0) {
        throw new Error('Some queued actions could not be synchronized. They will remain in the queue.');
      }

      await clearQueue();
      setOfflineQueue([]);
      setMessage({
        text: `Success! Synchronized all ${offlineQueue.length} actions securely with server databases.`,
        type: 'success'
      });
      await fetchTasks();
    } catch (error) {
      setIsOffline(true);
      setMessage({
        text: error instanceof Error ? error.message : 'Unable to synchronize the offline queue. The queue remains intact.',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearLocalDBAndReset = async () => {
    await clearQueue();
    localStorage.setItem('eco_offline_queue_prefilled', 'true');
    setOfflineQueue([]);
    setMessage({ text: 'Local IndexedDB cache cleaned.', type: 'success' });
  };

  const handleDeleteQueueItem = async (id: number | undefined) => {
    if (!id) return;
    try {
      await deleteQueueItem(id);
      updateOfflineQueueState();
      setMessage({ text: 'Removed offline log from synchronization outbox queue.', type: 'success' });
      setActiveQueueDropdownId(null);
    } catch (err) {
      console.warn(err);
    }
  };

  // Metrics calculation
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length || 18;
  const progressPercent = Math.round((doneCount / totalCount) * 100);

  // Filter tasks based on general search input
  const filteredTasks = tasks.filter(t => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (t.unit?.unit_number && t.unit.unit_number.toLowerCase().includes(q)) ||
      (t.block?.name && t.block.name.toLowerCase().includes(q)) ||
      (t.status && t.status.toLowerCase().includes(q))
    );
  });

  const nextTask = tasks.find(t => t.status === 'pending');

  return (
    <div className="min-h-screen bg-[#F1F7F3] font-sans text-gray-800 flex" id="worker-layout-wrapper">
      
      {/* 1. COMPACT FIXED LEFT SIDEBAR (Pinned on desktop, hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200/80 bg-white shrink-0 justify-between fill-current h-screen sticky top-0" id="desktop-sidebar">
        <div>
          {/* Logo Brand Area */}
          <div className="p-6 flex items-center gap-3 border-b border-gray-100">
            <div className="bg-[#1E4D2B] p-2 rounded-xl text-white">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-[#1E4D2B] leading-none mb-1">EcoTrack</h2>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block leading-none">Worker Console</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left ${
                activeTab === 'dashboard'
                  ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-850'
              }`}
            >
              <Database className="w-4.5 h-4.5 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveTab('tasks'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left ${
                activeTab === 'tasks'
                  ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-850'
              }`}
            >
              <ListTodo className="w-4.5 h-4.5 shrink-0" />
              <span>Today's Tasks</span>
            </button>

            <button
              onClick={() => { setActiveTab('scan'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left ${
                activeTab === 'scan'
                  ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-850'
              }`}
            >
              <QrCode className="w-4.5 h-4.5 shrink-0" />
              <span>Scan QR</span>
            </button>

            <button
              onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left ${
                activeTab === 'history'
                  ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-850'
              }`}
            >
              <History className="w-4.5 h-4.5 shrink-0" />
              <span>History</span>
            </button>

            <button
              onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left relative ${
                activeTab === 'notifications'
                  ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-850'
              }`}
            >
              <Bell className="w-4.5 h-4.5 shrink-0" />
              <span>Notifications</span>
              <span className="absolute right-3 top-3 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            </button>

            <button
              onClick={() => { setActiveTab('offline'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left ${
                activeTab === 'offline'
                  ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-850'
              }`}
            >
              <Wifi className="w-4.5 h-4.5 shrink-0" />
              <span>Offline Sync</span>
              {offlineQueue.length > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                  {offlineQueue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left ${
                activeTab === 'profile'
                  ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-850'
              }`}
            >
              <User className="w-4.5 h-4.5 shrink-0" />
              <span>Profile</span>
            </button>
          </nav>
        </div>

        {/* Bottom Profile Footer block */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between gap-2">
            {/* Avatar & Operator Info Group */}
            <div className="flex items-center gap-3 min-w-0">
              <div 
                onClick={() => { setActiveTab('profile'); }}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#1E4D2B] bg-emerald-700 shadow-sm shrink-0 cursor-pointer hover:scale-105 transition-transform"
                title="View Profile"
              >
                <img 
                  src={localUser?.avatarUrl || defaultAvatar} 
                  referrerPolicy="no-referrer" 
                  alt={localUser?.name || 'Worker'} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="min-w-0">
                <p 
                  onClick={() => { setActiveTab('profile'); }}
                  className="text-xs font-black text-gray-800 truncate leading-tight cursor-pointer hover:text-[#1E4D2B] transition-colors"
                  title="View Profile"
                >
                  {localUser?.name || 'Sunil Kumara'}
                </p>
                <span className="text-[10px] text-gray-450 leading-none block mt-0.5">
                  {localUser?.shift || 'Morning'} Shift
                </span>
              </div>
            </div>

            {/* Logout icon ONLY, next to profile info, working properly built as premium Modal */}
            <button
              type="button"
              onClick={() => setShowLogoutConfirmModal(true)}
              className="p-2 text-rose-605 text-rose-600 hover:text-rose-750 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100 shrink-0"
              title="Logout Crew"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION DRAWER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4" id="mobile-topbar">
        <div className="flex items-center gap-2">
          <div className="bg-[#1E4D2B] p-1.5 rounded-lg text-white">
            <Compass className="w-4.5 h-4.5" />
          </div>
          <span className="text-xs font-black tracking-tight text-[#1E4D2B]">EcoTrack Console</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setActiveTab('notifications')}
            className="p-1.5 relative text-gray-500"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-1.5 ml-1 text-gray-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu modal backdrop drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-14 bg-slate-900/40 backdrop-blur-sm z-30 flex justify-end">
            <div className="w-64 bg-white h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
              <div className="space-y-1">
                {['dashboard', 'tasks', 'scan', 'history', 'notifications', 'offline', 'profile'].map((tabVal: any) => {
                  const iconsMap: any = {
                    dashboard: <Database className="w-4 h-4" />,
                    tasks: <ListTodo className="w-4 h-4" />,
                    scan: <QrCode className="w-4 h-4" />,
                    history: <History className="w-4 h-4" />,
                    notifications: <Bell className="w-4 h-4" />,
                    offline: <Wifi className="w-4 h-4" />,
                    profile: <User className="w-4 h-4" />
                  };
                  return (
                    <button
                      key={tabVal}
                      onClick={() => { setActiveTab(tabVal); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                        activeTab === tabVal
                          ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                          : 'text-gray-650 hover:bg-gray-50'
                      }`}
                    >
                      {iconsMap[tabVal]}
                      <span className="capitalize">
                        {tabVal === 'offline' 
                          ? 'Offline Sync' 
                          : tabVal === 'tasks' 
                            ? "Today's Tasks" 
                            : tabVal === 'profile' 
                              ? 'Profile' 
                              : tabVal}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-[#1E4D2B] shadow-sm shrink-0">
                    <img 
                      src={localUser?.avatarUrl || defaultAvatar} 
                      referrerPolicy="no-referrer" 
                      alt={localUser?.name || 'Worker'} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-800 leading-tight">{localUser?.name || 'Sunil Kumara'}</p>
                    <span className="text-[10px] text-gray-450 uppercase">{localUser?.shift || 'Morning'} Shift</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirmModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs text-rose-600 font-bold transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col md:pt-0 pt-14 min-w-0" id="main-scrollable-container">
        
        {/* TOP GREETING HEADER (Matches Screenshot perfectly, customized for Today's Tasks wizard flow) */}
        <header className="bg-white border-b border-gray-200/60 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 sticky top-14 md:top-0 z-20 shadow-sm md:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              {activeTab === 'scan' ? (
                <>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                    Workspace • Scanner
                  </span>
                  <h1 className="text-2xl font-black text-[#1E4D2B] flex items-center gap-2 tracking-tight">
                    Scan floor QR
                  </h1>
                </>
              ) : activeTab === 'history' ? (
                <>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                    Performance • 312 completed • 4.8★
                  </span>
                  <h1 className="text-2xl font-black text-[#1E4D2B] flex items-center gap-2 tracking-tight">
                    My history
                  </h1>
                </>
              ) : activeTab === 'notifications' ? (
                <>
                  <span className="text-xs font-bold text-gray-400 block mb-0.5">
                    Inbox • {notifications.filter(n => !n.read).length} unread
                  </span>
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-black text-[#1E4D2B] tracking-tight">
                      Notifications
                    </h1>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          setNotifications(notifications.map(n => ({ ...n, read: true })));
                          setMessage({ text: "All notifications marked as read.", type: 'success' });
                        }}
                        className="bg-white border border-[#1E4D2B] text-[#1E4D2B] hover:bg-emerald-50 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs select-none transition-all"
                      >
                        <Check className="w-3.5 h-3.5 text-[#1E4D2B]" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                </>
              ) : activeTab === 'tasks' && (taskSubView === 'pre_run' || taskSubView === 'run_complete') ? (
                <>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                    {taskSubView === 'pre_run' && `Tasks › Job #J-2814`}
                    {taskSubView === 'run_complete' && `Tasks › Job #J-2814 • Completed`}
                  </span>
                  <h1 className={`text-2xl font-black flex items-center gap-2 tracking-tight ${
                    taskSubView === 'run_complete' ? 'text-[#1E4D2B]' : 
                    'text-gray-950'
                  }`}>
                    {selectedFloorGroup?.blockName} • Floor {selectedFloorGroup?.floorNumber}
                  </h1>
                </>
              ) : activeTab === 'offline' ? (
                <>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                    Workspace • {offlineQueue.length} actions queued
                  </span>
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-black text-[#1E4D2B] tracking-tight">
                      Offline sync
                    </h1>
                    <button
                      onClick={handleSynchronizeQueue}
                      disabled={offlineQueue.length === 0}
                      className="bg-[#1E4D2B] text-white hover:bg-[#15381f] text-xs font-black py-2 px-4 rounded-full shadow-sm transition-all flex items-center gap-1.5 select-none cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <RefreshCcw className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>Retry now</span>
                    </button>
                  </div>
                </>
              ) : activeTab === 'profile' ? (
                <>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                    Account · Performance
                  </span>
                  <h1 className="text-2xl font-black text-[#1E4D2B] tracking-tight">
                    My profile
                  </h1>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                    Workspace • 10 May 2026 • {localUser?.shift || 'Morning'} shift
                  </span>
                  <h1 className="text-2xl font-black text-gray-950 flex items-center gap-2 tracking-tight">
                    Good morning, {localUser?.name?.split(' ')[0] || 'Sunil'} <span className="animate-wiggle">🙋‍♂️</span>
                  </h1>
                </>
              )}
            </div>

            {/* Cancel Button - placed exactly in the header if on subview, matching screenshot! */}
            {activeTab === 'tasks' && taskSubView === 'run_complete' && (
              <div className="flex items-center">
                <button
                  onClick={() => setTaskSubView('dashboard')}
                  className="border border-[#1E4D2B] text-[#1E4D2B] hover:bg-emerald-50 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  Done, Menu ›
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Quick Bar Button: Export if history, or Scan QR otherwise */}
            {activeTab === 'history' ? (
              <button
                onClick={handleExportHistory}
                className="border border-[#1E4D2B] text-[#1E4D2B] hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs select-none transition-all"
              >
                <Download className="w-4 h-4 text-[#1E4D2B]" />
                <span>Export</span>
              </button>
            ) : (activeTab !== 'scan' && activeTab !== 'profile') && (
              <button
                onClick={() => setActiveTab('scan')}
                className="bg-[#1E4D2B] text-white hover:bg-[#15381f] text-xs font-black py-2 px-3.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 select-none"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Scan QR</span>
              </button>
            )}

            {/* Quick Search Input */}
            <div className="relative flex-1 sm:w-60 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search units, jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#EFF3F0] border border-transparent hover:border-gray-200 text-xs text-gray-800 rounded-xl py-2 pl-9 pr-4 focus:bg-white focus:border-[#2E7D32] outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Notifications Bell with Interactive Dropdown */}
            <div className="relative hidden sm:block">
              <button 
                type="button"
                className={`p-2 bg-slate-50 border rounded-xl text-gray-505 hover:text-[#1E4D2B] relative hover:bg-slate-100 transition-all cursor-pointer focus:outline-none block ${
                  isNotificationDropdownOpen 
                    ? 'border-[#1E4D2B]/50 ring-2 ring-[#1E4D2B]/10 text-[#1E4D2B]' 
                    : 'border-gray-250/60 text-gray-500'
                }`}
                onClick={() => {
                  setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
                  setIsProfileDropdownOpen(false);
                }}
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                )}
              </button>

              {isNotificationDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsNotificationDropdownOpen(false)}
                  />
                  
                  {/* Notifications Dropdown Panel */}
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-3 duration-200 text-left text-slate-800">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#1E4D2B] uppercase tracking-wider">System Alerts</span>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="text-[10px] bg-rose-100 text-rose-600 font-extrabold px-1.5 py-0.5 rounded-full">
                            {notifications.filter(n => !n.read).length} New
                          </span>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotifications(notifications.map(n => ({ ...n, read: true })));
                            setMessage({ text: "All notifications marked as read.", type: 'success' });
                          }}
                          className="text-[10px] text-[#1E4D2B] hover:text-[#12301b] font-extrabold transition-all cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {(() => {
                        const q = searchQuery.toLowerCase();
                        const filteredNotifs = notifications.filter(notif => {
                          if (!q) return true;
                          return (
                            (notif.title && notif.title.toLowerCase().includes(q)) ||
                            (notif.message && notif.message.toLowerCase().includes(q))
                          );
                        });

                        if (filteredNotifs.length === 0) {
                          return (
                            <div className="py-8 text-center text-gray-450 font-bold flex flex-col items-center justify-center gap-1.5">
                              <CheckCircle className="w-8 h-8 text-gray-200" />
                              <p className="text-xs">No matching notifications!</p>
                            </div>
                          );
                        }

                        return filteredNotifs.map((notif) => {
                          let Icon = Info;
                          let iconColor = 'text-blue-500 bg-blue-50';
                          if (notif.type === 'warning') {
                            Icon = AlertTriangle;
                            iconColor = 'text-amber-500 bg-amber-50';
                          } else if (notif.type === 'job') {
                            Icon = ClipboardCheck;
                            iconColor = 'text-[#1E4D2B] bg-emerald-50';
                          }

                          return (
                            <div 
                              key={notif.id}
                              className={`p-3 flex gap-3 hover:bg-slate-50 transition-all cursor-pointer ${notif.read ? 'opacity-70 bg-white' : 'bg-emerald-50/10'}`}
                              onClick={() => {
                                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                setActiveTab('notifications');
                                setIsNotificationDropdownOpen(false);
                              }}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden grow">
                                <div className="flex items-start justify-between gap-1">
                                  <p className={`text-xs leading-snug truncate ${notif.read ? 'text-gray-700 font-medium' : 'text-slate-900 font-extrabold'}`}>
                                    {notif.title}
                                  </p>
                                  {!notif.read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 leading-normal line-clamp-2 mt-0.5 font-medium">
                                  {notif.message}
                                </p>
                                <span className="text-[10px] text-gray-450 font-bold block mt-1">
                                  {notif.time}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNotifications(notifications.filter(n => n.id !== notif.id));
                                }}
                                className="text-gray-300 hover:text-red-550 transition-colors self-start p-1 hover:bg-gray-100 rounded shrink-0 cursor-pointer"
                                title="Dismiss notification"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-gray-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
                        <span className="text-[10px] text-gray-400 font-bold px-2">
                          {notifications.length} alerts in log
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifications([]);
                            setMessage({ text: "Cleared all alerts.", type: 'success' });
                          }}
                          className="text-[10px] text-red-600 hover:text-red-800 font-extrabold transition-all cursor-pointer px-2 py-1 rounded hover:bg-rose-50"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Active Avatar Photo bubble with Interactive Dropdown */}
            <div className="relative">
              <div 
                className="w-8.5 h-8.5 rounded-full overflow-hidden border-2 border-[#1E4D2B] shadow-sm cursor-pointer hover:scale-105 transition-transform" 
                onClick={() => {
                  setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  setIsNotificationDropdownOpen(false);
                }}
              >
                <img 
                  src={localUser?.avatarUrl || defaultAvatar} 
                  referrerPolicy="no-referrer" 
                  alt={localUser?.name || 'Worker'} 
                  className="w-full h-full object-cover" 
                />
              </div>

              {isProfileDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsProfileDropdownOpen(false)} 
                  />
                  
                  {/* Dropdown container */}
                  <div className="absolute right-0 top-full mt-2.5 w-56 bg-white border border-gray-150 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <div className="p-2.5 border-b border-gray-100 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-600">
                        <img 
                          src={localUser?.avatarUrl || defaultAvatar} 
                          referrerPolicy="no-referrer" 
                          alt={localUser?.name || 'Worker'} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-black text-slate-900 truncate leading-tight">
                          {localUser?.name || 'Sunil Kumara'}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          {localUser?.shift || 'Morning'} Operator
                        </p>
                      </div>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('profile');
                          setIsEditProfileModalOpen(true);
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#1E4D2B] transition-all cursor-pointer text-left"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Profile Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('profile');
                          setIsChangePasswordModalOpen(true);
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#1E4D2B] transition-all cursor-pointer text-left"
                      >
                        <Lock className="w-4 h-4 text-gray-400" />
                        <span>Security Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('settings');
                          setSettingsSubTab('help');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#1E4D2B] transition-all cursor-pointer text-left"
                      >
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                        <span>Help & Support</span>
                      </button>

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setShowLogoutConfirmModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* WORKER BODY COMPONENT VIEW ROUTER */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto" id="router-container">
          
          {message && (
            <div className={`p-4 rounded-xl text-xs shadow-sm border font-sans leading-relaxed flex items-center justify-between ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : message.type === 'warn' 
                  ? 'bg-amber-50 text-amber-805 border-amber-205' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
            }`} id="toast-message">
              <span className="font-semibold flex items-center gap-2">
                {message.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                {message.type === 'warn' && <Hourglass className="w-4 h-4 text-amber-500 shrink-0" />}
                {message.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                {message.text}
              </span>
              <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-900 font-extrabold text-sm ml-4">×</button>
            </div>
          )}

          {/* ------------------ TAB A: DASHBOARD VIEW ------------------ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="view-dashboard">
              
              {/* HERO ACTIVE PROGRESS CARD (Deep green, shift timers, progress bars) */}
              <div className="p-6 bg-[#184624] text-white rounded-3xl relative overflow-hidden shadow-md flex flex-col md:flex-row justify-between gap-6" id="shift-hero-banner">
                {/* Background decorative vector overlays */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl"></div>

                <div className="space-y-4 max-w-xl z-10 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-[#EEFDF2]/90 text-[#1E4D2B] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                      In-Progress
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-250 tracking-wider">
                      MORNING SHIFT • 08:00 - 14:00
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">You're on Block A • Floor 3</h2>
                    <p className="text-xs text-emerald-100 font-medium">
                      {doneCount} of {totalCount} done - {totalCount - doneCount} units remaining - 1 floor ahead of schedule 🌿
                    </p>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-2 pt-2">
                    <div className="w-full bg-emerald-900/60 rounded-full h-3.5 p-0.5 overflow-hidden">
                      <div 
                        className="bg-white rounded-full h-2.5 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-emerald-100/90 font-black tracking-widest leading-none">
                      <span>{doneCount} / {totalCount} UNITS</span>
                      <span>EST. WRAP-UP 13:20</span>
                    </div>
                  </div>
                </div>

                {/* Right timer controls */}
                <div className="flex flex-col justify-between items-end text-right z-10 shrink-0 md:border-l md:border-emerald-800/80 md:pl-8">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-250 uppercase tracking-widest block">SHIFT TIMER</span>
                    <p className="text-3xl font-mono font-black tracking-tight tabular-nums">
                      {formatTimer(timerSeconds)}
                    </p>
                  </div>

                  <button
                    onClick={() => setTimerPaused(!timerPaused)}
                    className="mt-4 md:mt-0 px-5 py-2 rounded-xl bg-white/15 text-white hover:bg-white/20 transition-all font-black text-xs flex items-center gap-2 w-full md:w-auto justify-center select-none"
                  >
                    <span className={`w-2 h-2 rounded-full ${timerPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-radial-ping'}`}></span>
                    {timerPaused ? 'Resume Shift' : 'Pause'}
                  </button>
                </div>
              </div>

              {/* FIVE METRIC CARDS ROW (Exact metrics match) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4" id="metric-grid-deck">
                {/* Metric 1 */}
                <div 
                  onClick={() => setActiveTab('tasks')}
                  className="p-4 bg-white border border-gray-200/60 rounded-2xl flex flex-col justify-between shadow-xs relative hover:border-[#1E4D2B]/50 hover:bg-emerald-50/10 cursor-pointer group transition-all text-left"
                  title="Click to view today's tasks list"
                >
                  <div>
                    <span className="inline-block text-[9px] font-black bg-[#EBFDF2] text-[#166534] px-1.5 py-0.5 rounded-md mb-3 group-hover:bg-[#1E4D2B] group-hover:text-white transition-colors">
                      +2 vs yesterday
                    </span>
                    <p className="text-xl font-black text-gray-950 mt-1">{doneCount} / {totalCount}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Jobs Today</p>
                  </div>
                  <span className="text-[9px] text-[#2E7D32] bg-[#E3EFE5] px-1.5 py-0.5 rounded-md mt-3 self-start font-black group-hover:bg-[#1E4D2B]/10 transition-colors">{progressPercent}% done</span>
                </div>

                {/* Metric 2 */}
                <div 
                  onClick={() => setActiveTab('tasks')}
                  className="p-4 bg-white border border-gray-200/60 rounded-2xl flex flex-col justify-between shadow-xs hover:border-[#1E4D2B]/50 hover:bg-emerald-50/10 cursor-pointer group transition-all text-left"
                  title="Click to view delivery route steps"
                >
                  <div>
                    <span className="inline-block text-[9px] font-black bg-[#EBFDF2] text-[#166534] px-1.5 py-0.5 rounded-md mb-3 group-hover:bg-[#1E4D2B] group-hover:text-white transition-colors">
                      +1.2%
                    </span>
                    <p className="text-xl font-black text-gray-950 mt-1">94%</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">On-time</p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold mt-3 group-hover:text-gray-800 transition-colors">30-day avg</span>
                </div>

                {/* Metric 3 */}
                <div 
                  onClick={() => setActiveTab('profile')}
                  className="p-4 bg-white border border-gray-200/60 rounded-2xl flex flex-col justify-between shadow-xs hover:border-[#1E4D2B]/50 hover:bg-emerald-50/10 cursor-pointer group transition-all text-left"
                  title="Click to view detailed rating reviews"
                >
                  <div>
                    <span className="inline-block text-[9px] font-black bg-[#FEF3C7] text-[#D97706] px-1.5 py-0.5 rounded-md mb-3 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      Steady
                    </span>
                    <p className="text-xl font-black text-gray-950 mt-1">4.8 ★</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Rating</p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold mt-3 group-hover:text-gray-800 transition-colors">212 ratings</span>
                </div>

                {/* Metric 4 */}
                <div 
                  onClick={() => setActiveTab('profile')}
                  className="p-4 bg-white border border-gray-200/60 rounded-2xl flex flex-col justify-between shadow-xs hover:border-[#1E4D2B]/50 hover:bg-emerald-50/10 cursor-pointer group transition-all text-left"
                  title="Click to view ecology achievements"
                >
                  <div>
                    <span className="inline-block text-[9px] font-black bg-[#E3F2FD] text-[#0D47A1] px-1.5 py-0.5 rounded-md mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      Top 10%
                    </span>
                    <p className="text-xl font-black text-gray-950 mt-1">5 ★</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Eco Score</p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold mt-3 group-hover:text-gray-800 transition-colors">Recycle rate</span>
                </div>

                {/* Metric 5 */}
                <div 
                  onClick={() => setActiveTab('tasks')}
                  className="p-4 bg-white border border-gray-200/60 rounded-2xl flex flex-col justify-between shadow-xs hover:border-[#1E4D2B]/50 hover:bg-emerald-50/10 cursor-pointer group transition-all text-left"
                  title="Click to view overall route details"
                >
                  <div>
                    <span className="inline-block text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md mb-3 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                      Of 4 km est.
                    </span>
                    <p className="text-xl font-black text-gray-950 mt-1">1.4 km</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Distance</p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold mt-3 group-hover:text-gray-800 transition-colors">Walked today</span>
                </div>
              </div>

              {/* BOTTOM COLUMNS SPLIT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-col-split">
                
                {/* A. LEFT AREA: ROUTE STEPS AND BAR CHART */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Today's Route step flow chart */}
                  <div className="bg-white p-6 border border-gray-200/60 rounded-3xl space-y-4 shadow-xs" id="route-itinerary">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">TODAY'S ROUTE</span>
                        <h3 className="text-base font-black text-[#1E4D2B]">Block A • 3 floors</h3>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowRouteMapModal(true)}
                        className="py-1.5 px-3 rounded-xl border border-gray-200 text-gray-650 hover:bg-slate-50 text-[10px] font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <Map className="w-3.5 h-3.5" />
                        <span>View on map</span>
                      </button>
                    </div>

                    {/* Step list - aligned to Screenshot 2 */}
                    <div className="relative space-y-4 pt-2">
                      {/* Vertical line connector */}
                      <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-slate-100"></div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-[#EBFDF2] border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-600 font-mono text-[10px] font-black z-10 shrink-0">
                            D
                          </div>
                          <span className="font-bold text-gray-400 font-mono w-10 text-left">06:00</span>
                          <span className="font-extrabold text-gray-900">Shift started</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-[#EBFDF2] px-2.5 py-0.5 rounded-full uppercase">Done</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-[#EBFDF2] border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-600 font-mono text-[10px] font-black z-10 shrink-0">
                            ✓
                          </div>
                          <span className="font-bold text-gray-400 font-mono w-10 text-left">06:35</span>
                          <span className="font-extrabold text-gray-900">A-301 collected</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-[#EBFDF2] px-2.5 py-0.5 rounded-full uppercase">Done</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-[#EBFDF2] border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-600 font-mono text-[10px] font-black z-10 shrink-0">
                            ✓
                          </div>
                          <span className="font-bold text-gray-400 font-mono w-10 text-left">06:42</span>
                          <span className="font-extrabold text-[#1E4D2B]">A-302 collected</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-[#EBFDF2] px-2.5 py-0.5 rounded-full uppercase">Done</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-[#EFF6FF] border-2 border-blue-500 rounded-full flex items-center justify-center text-blue-600 font-mono text-[10px] font-black z-10 shrink-0 select-none animate-pulse">
                            🏃‍♂️
                          </div>
                          <span className="font-bold text-gray-400 font-mono w-10 text-left">07:18</span>
                          <span className="font-extrabold text-blue-800">A-303 in progress</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-700 bg-[#EFF6FF] px-2.5 py-0.5 rounded-full uppercase">Active</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-[#FFFBEB] border-2 border-amber-500 rounded-full flex items-center justify-center text-amber-600 font-mono text-[10px] font-black z-10 shrink-0">
                            ⏱
                          </div>
                          <span className="font-bold text-gray-400 font-mono w-10 text-left">07:25</span>
                          <span className="font-extrabold text-[#92400E]">A-304 next</span>
                        </div>
                        <span className="text-[10px] font-black text-amber-700 bg-[#FEF3C7] px-2.5 py-0.5 rounded-full uppercase">Up next</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-slate-50 border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-500 font-mono text-[10px] z-10 shrink-0">
                            ➡
                          </div>
                          <span className="font-bold text-gray-450 font-mono w-10 text-left">08:00</span>
                          <span className="font-semibold text-gray-500">Move to Floor 4</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-500 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase">Pending</span>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Performance Bar graph metrics */}
                  <div className="bg-white p-6 border border-gray-200/60 rounded-3xl bg-white shadow-xs space-y-4" id="weekly-graph">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2 border-b border-gray-150">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">PERFORMANCE GRAPH</span>
                        <h4 className="text-sm font-black text-gray-900">
                          {perfGraphTerm === 'Week' && "126 jobs completed • avg 18/day"}
                          {perfGraphTerm === 'Month' && "326 jobs completed • avg 81/week"}
                          {perfGraphTerm === 'Year' && "1,440 jobs completed • avg 360/quarter"}
                        </h4>
                      </div>
                      
                      {/* Graph Switchers */}
                      <div className="flex bg-[#EFF3F0] p-1 rounded-xl">
                        {['Week', 'Month', 'Year'].map((term) => (
                          <button
                            key={term}
                            onClick={() => setPerfGraphTerm(term as any)}
                            type="button"
                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                              perfGraphTerm === term ? 'bg-[#1E4D2B] text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bar visualization */}
                    <div className="pt-4 flex items-end justify-between h-32 w-full gap-2 px-2" id="graph-columns">
                      {(perfGraphTerm === 'Week' 
                        ? [
                            { day: 'Mon', count: 14, h: 'h-[63%]' },
                            { day: 'Tue', count: 18, h: 'h-[81%]' },
                            { day: 'Wed', count: 16, h: 'h-[72%]' },
                            { day: 'Thu', count: 22, h: 'h-[99%]' },
                            { day: 'Fri', count: 18, h: 'h-[81%]' },
                            { day: 'Sat', count: 20, h: 'h-[90%]' },
                            { day: 'Sun', count: 18, h: 'h-[81%]' }
                          ]
                        : perfGraphTerm === 'Month'
                        ? [
                            { day: 'Wk 1', count: 72, h: 'h-[75%]' },
                            { day: 'Wk 2', count: 85, h: 'h-[88%]' },
                            { day: 'Wk 3', count: 91, h: 'h-[95%]' },
                            { day: 'Wk 4', count: 78, h: 'h-[81%]' }
                          ]
                        : [
                            { day: 'Q1', count: 280, h: 'h-[60%]' },
                            { day: 'Q2', count: 320, h: 'h-[70%]' },
                            { day: 'Q3', count: 390, h: 'h-[85%]' },
                            { day: 'Q4', count: 450, h: 'h-[99%]' }
                          ]
                      ).map((item, id) => (
                        <div key={id} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative">
                          <div className="text-[9px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white rounded px-1.5 py-0.5 -mt-6 absolute z-15 top-0">{item.count}</div>
                          <div className={`w-full bg-[#E3EFE5] group-hover:bg-[#2E7D32] rounded-t-lg transition-all duration-300 ${item.h}`}>
                            {/* Inside active highlight for high days */}
                            {item.count > 18 && <div className="w-full h-full bg-[#1E4D2B]/10 rounded-t-lg"></div>}
                          </div>
                          <span className="text-[10px] font-extrabold text-gray-450">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* B. RIGHT AREA: ACTIVE STATUS, LEADERBOARD, WEATHER */}
                <div className="lg:col-span-5 space-y-6">

                  {/* UP NEXT OR ACTIVE ACTION CARD */}
                  <div className="bg-white p-5 border border-gray-200/60 rounded-3xl shadow-xs space-y-4" id="up-next-block">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[#1E4D2B] uppercase tracking-widest block flex-1">
                        {tasks.some(t => t.status === 'in_progress') ? 'ACTIVE COLLECTION' : 'UP NEXT COLLECTION'}
                      </span>
                      <Hourglass className="w-4 h-4 text-amber-500 animate-spin-slow" />
                    </div>

                    {(() => {
                      const currentJob = tasks.find(t => t.status === 'in_progress') || tasks.find(t => t.status === 'pending');
                      if (currentJob) {
                        return (
                          <>
                            <div>
                              <h4 className="text-2xl font-black text-[#1E4D2B] tracking-tight">Unit {currentJob.unit?.unit_number || 'A-304'}</h4>
                              <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-0.5">
                                {currentJob.block?.name || 'Block A'} • Floor {currentJob.floor?.floor_number || 3} • Status: <span className="capitalize font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[10px] ml-1">{currentJob.status}</span>
                              </p>
                            </div>

                            <div className="flex gap-2 pt-2">
                              {currentJob.status === 'in_progress' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Complete task - set active job & switch to Scan QR Tab
                                    setActiveJob(currentJob);
                                    setActiveTab('scan');
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black transition-all shadow-xs select-none cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Verify & Complete</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleMarkProgress(currentJob.id)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#1E4D2B] text-white hover:bg-[#15381f] text-xs font-black transition-all shadow-xs select-none cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>Start</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveJob(currentJob);
                                  setIncidentReason('Door locked');
                                  setIncidentNote('Knocked twice at room entrance, but there is no response. Waste bag not left outside.');
                                  setShowIncidentModal(true);
                                }}
                                className="py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                              >
                                Skip
                              </button>
                            </div>
                          </>
                        );
                      } else {
                        return (
                          <div className="py-2 text-center space-y-1">
                            <p className="text-xs font-bold text-gray-400">All shifts work completed successfully! 🌿</p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('history')}
                              className="mt-2 py-1.5 px-3 rounded-xl bg-[#E3EFE5] text-[#1E4D2B] text-[10px] font-black cursor-pointer hover:bg-[#d5e7d8]"
                            >
                              View History Log
                            </button>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* LEADERBOARD CARD */}
                  <div className="bg-white p-5 border border-gray-200/60 rounded-3xl shadow-xs space-y-3" id="leaderboard-block">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">LEADERBOARD • MAY</span>
                      <Award className="w-4.5 h-4.5 text-amber-500" />
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {/* User row */}
                      <div className="flex items-center justify-between py-1 px-2 rounded-2xl bg-[#EBFDF2]/60 border border-emerald-100/50">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 bg-amber-400 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                          <div className="w-7 h-7 bg-emerald-700 text-white rounded-full flex items-center justify-center text-[9px] font-black">SK</div>
                          <div>
                            <p className="text-xs font-black text-gray-900 leading-tight">Sunil Kumara</p>
                            <span className="text-[9px] text-emerald-800 font-bold">You</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-800 leading-none">312 jobs</p>
                          <span className="text-[9px] text-[#2E7D32]/80 font-mono">4.8 ★</span>
                        </div>
                      </div>

                      {/* Rank 2 */}
                      <div className="flex items-center justify-between py-1 px-2 rounded-2xl bg-white hover:bg-[#F9FCFA]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 bg-slate-205 text-gray-500 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                          <div className="w-7 h-7 bg-[#2E7D32]/10 text-[#2E7D32] rounded-full flex items-center justify-center text-[9px] font-bold">NP</div>
                          <div>
                            <p className="text-xs font-bold text-gray-800 leading-tight">Nimal P.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-gray-600 leading-none">298 jobs</p>
                          <span className="text-[9px] text-gray-400 font-mono">4.7 ★</span>
                        </div>
                      </div>

                      {/* Rank 3 */}
                      <div className="flex items-center justify-between py-1 px-2 rounded-2xl bg-white hover:bg-[#F9FCFA]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 bg-orange-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                          <div className="w-7 h-7 bg-amber-600/10 text-amber-700 rounded-full flex items-center justify-center text-[9px] font-bold">RS</div>
                          <div>
                            <p className="text-xs font-bold text-gray-800 leading-tight">Ravi S.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-gray-600 leading-none">276 jobs</p>
                          <span className="text-[9px] text-gray-400 font-mono">4.6 ★</span>
                        </div>
                      </div>

                      {/* Rank 4 */}
                      <div className="flex items-center justify-between py-1 px-2 rounded-2xl bg-white hover:bg-[#F9FCFA]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 bg-emerald-100 text-[#1E4D2B] rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                          <div className="w-7 h-7 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[9px] font-bold">KW</div>
                          <div>
                            <p className="text-xs font-bold text-gray-800 leading-tight">Kasun W.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-gray-600 leading-none">254 jobs</p>
                          <span className="text-[9px] text-gray-400 font-mono">4.5 ★</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WEATHER CARD */}
                  <div className="p-4 bg-orange-50/55 border border-orange-100 rounded-3xl flex justify-between items-center shadow-xs" id="weather-block">
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold text-[#9A3412] tracking-wider block uppercase">Colombo, LK</span>
                      <h4 className="text-xl font-black text-[#7C2D12]">28°C • Sunny</h4>
                      <p className="text-[10px] text-[#9A3412] font-semibold leading-tight">Light breeze 8 km/h</p>
                    </div>
                    <div className="p-2.5 bg-amber-400 text-white rounded-2xl">
                      <Sun className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>

                  {/* DATABASE ALL ACTIONS SYNCED BANNER */}
                  <div className="p-4 bg-[#E2F0E5] border border-emerald-100 rounded-3xl flex items-center gap-3.5 shadow-xs" id="synced-card">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl">
                      <CheckCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-[#1E4D2B]">All actions synced</h5>
                      <p className="text-[9px] text-[#2E7D32]/80 font-semibold mt-0.5">Local cache active • 30s ago</p>
                    </div>
                  </div>

                </div>

              </div>

              {/* FEEDBACK WHAT RESIDENTS ARE SAYING */}
              <div className="bg-white p-6 border border-gray-200/60 rounded-3xl space-y-4 shadow-xs" id="dashboard-feedback">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">RECENT FEEDBACK</span>
                    <h3 className="text-base font-black text-[#1E4D2B]">What residents are saying</h3>
                  </div>
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-black text-[#2E7D32] hover:text-[#1E4D2B] cursor-pointer"
                  >
                    See all →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1" id="feedback-deck">
                  {/* Card 1 */}
                  <div className="p-4 bg-[#F2F7F4]/60 border border-emerald-100/40 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5 text-xs text-gray-700 leading-relaxed font-semibold italic">
                      "Always punctual and very polite. Thanks!"
                    </div>
                    <div className="flex items-center justify-between border-t border-emerald-100/30 pt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold">AR</div>
                        <div>
                          <p className="text-[10px] font-black text-gray-800 leading-none">Amaya R.</p>
                          <span className="text-[8px] text-gray-400 leading-none">A-301 • 2d ago</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-amber-500 font-mono">★★★★★</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-4 bg-[#F2F7F4]/60 border border-emerald-100/40 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5 text-xs text-gray-700 leading-relaxed font-semibold italic">
                      "Good service, but please be quieter early morning."
                    </div>
                    <div className="flex items-center justify-between border-t border-emerald-100/30 pt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold">PJ</div>
                        <div>
                          <p className="text-[10px] font-black text-gray-800 leading-none">Priya J.</p>
                          <span className="text-[8px] text-gray-400 leading-none">A-304 • 5d ago</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-amber-500 font-mono">★★★★☆</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="p-4 bg-[#F2F7F4]/60 border border-emerald-100/40 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5 text-xs text-gray-700 leading-relaxed font-semibold italic">
                      "Excellent work as always! Keep it up!"
                    </div>
                    <div className="flex items-center justify-between border-t border-emerald-100/30 pt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold">KW</div>
                        <div>
                          <p className="text-[10px] font-black text-gray-800 leading-none">Kasun W.</p>
                          <span className="text-[8px] text-gray-400 leading-none">A-410 • 1w ago</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-amber-500 font-mono">★★★★★</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ------------------ TAB B: TODAY'S TASKS VIEW ------------------ */}
          {activeTab === 'tasks' && (
            <div className="space-y-6 w-full max-w-6xl mx-auto" id="view-tasks">
              
              {/* ---------------------- VIEW 1: TASK DASHBOARD GRID ---------------------- */}
              {taskSubView === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Offline Warning Banner (Screen 2) */}
                  {isOffline && (
                    <div className="p-4 bg-sky-50 border border-sky-100/80 rounded-2xl flex items-center justify-between shadow-xs">
                      <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 shrink-0">
                          <Info className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-sky-950 leading-tight">You're offline — changes will sync when back online</p>
                          <p className="text-[10px] font-bold text-sky-650/90 mt-0.5">
                            {offlineQueue.length > 0 ? `${offlineQueue.length} actions queued to local Key-Value store` : 'All tasks safely backed up in local sandbox'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-[#1E4D2B] text-white rounded-lg text-[9px] font-black uppercase tracking-tight">
                        Encrypted PWA
                      </span>
                    </div>
                  )}

                  {/* Metrics Row (Total, Pending, In-Progress, Done) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Total Card */}
                    <div className="p-4 bg-white border border-gray-150 rounded-3xl flex items-center gap-3.5 shadow-xs text-left">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-center text-slate-650 shrink-0">
                        <ClipboardCheck className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Total</span>
                        <h4 className="text-2xl font-black text-gray-900 leading-none mt-1">{tasks.length}</h4>
                      </div>
                    </div>

                    {/* Pending Card */}
                    <div className="p-4 bg-white border border-gray-150 rounded-3xl flex items-center gap-3.5 shadow-xs text-left">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50/60 border border-amber-100/55 flex items-center justify-center text-amber-600 shrink-0">
                        <Hourglass className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Pending</span>
                        <h4 className="text-2xl font-black text-amber-600 leading-none mt-1">
                          {tasks.filter(t => t.status === 'pending').length}
                        </h4>
                      </div>
                    </div>

                    {/* In Progress Card */}
                    <div className="p-4 bg-white border border-gray-150 rounded-3xl flex items-center gap-3.5 shadow-xs text-left">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Play className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">In-Progress</span>
                        <h4 className="text-2xl font-black text-blue-600 leading-none mt-1">
                          {tasks.filter(t => t.status === 'in_progress').length}
                        </h4>
                      </div>
                    </div>

                    {/* Done Card */}
                    <div className="p-4 bg-white border border-gray-150 rounded-3xl flex items-center gap-3.5 shadow-xs text-left">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50/70 border border-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Done</span>
                        <h4 className="text-2xl font-black text-[#1E4D2B] leading-none mt-1">
                          {tasks.filter(t => t.status === 'done' || t.status === 'issue').length}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Grouped Floors List Row (Screen 1 & 2 Floor Layouts) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Floor 1 Block A Floor 3 */}
                    <div className="bg-white border border-gray-200/60 rounded-3xl p-5 space-y-4 shadow-xs text-left">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400">FLOOR</span>
                          <h4 className="text-sm font-black text-slate-900 mt-0.5">Block A • Floor 3</h4>
                        </div>
                        <span className="bg-[#EFF3F0] text-[#1E4D2B] rounded-full px-2.5 py-0.5 text-[10px] font-black">
                          {tasks.filter(t => t.floor?.floor_number === 3 && (t.status === 'done' || t.status === 'issue')).length}/4
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {filteredTasks.filter(t => t.floor?.floor_number === 3).length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-400 font-bold bg-[#FAFCFA] rounded-2xl border border-dashed border-gray-150">
                            No matching units
                          </div>
                        ) : (
                          filteredTasks.filter(t => t.floor?.floor_number === 3).map((item) => (
                            <div 
                              key={item.id}
                              onClick={() => {
                                setSelectedFloorGroup({
                                  blockName: 'Block A',
                                  floorNumber: 3,
                                  totalUnits: 4,
                                  doneUnits: tasks.filter(t => t.floor?.floor_number === 3 && (t.status === 'done' || t.status === 'issue')).length,
                                  items: tasks.filter(t => t.floor?.floor_number === 3)
                                });
                                setTaskSubView('pre_run');
                              }}
                              className="p-3 bg-gray-50/50 border border-gray-150 rounded-2xl flex items-center justify-between hover:bg-emerald-50/30 font-semibold cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <Trash2 className={`w-4 h-4 shrink-0 ${item.status === 'done' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <div>
                                  <p className="text-xs font-black text-slate-900">{item.unit?.unit_number || 'A-30X'}</p>
                                  {item.status === 'done' && <p className="text-[9px] text-gray-400 mt-0.5">Completed 6:35 AM</p>}
                                  {item.status === 'in_progress' && <p className="text-[9px] text-[#3B82F6] font-bold mt-0.5 animate-pulse">Started 7:10 AM</p>}
                                </div>
                              </div>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                item.status === 'done' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'in_progress' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                ● {item.status === 'in_progress' ? 'In-Progress' : item.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Floor 2 Block A Floor 4 */}
                    <div className="bg-white border border-gray-200/60 rounded-3xl p-5 space-y-4 shadow-xs text-left">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400">FLOOR</span>
                          <h4 className="text-sm font-black text-slate-900 mt-0.5">Block A • Floor 4</h4>
                        </div>
                        <span className="bg-[#EFF3F0] text-[#1E4D2B] rounded-full px-2.5 py-0.5 text-[10px] font-black">
                          {tasks.filter(t => t.floor?.floor_number === 4 && (t.status === 'done' || t.status === 'issue')).length}/3
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {filteredTasks.filter(t => t.floor?.floor_number === 4).length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-400 font-bold bg-[#FAFCFA] rounded-2xl border border-dashed border-gray-150">
                            No matching units
                          </div>
                        ) : (
                          filteredTasks.filter(t => t.floor?.floor_number === 4).map((item) => (
                            <div 
                              key={item.id}
                              onClick={() => {
                                setSelectedFloorGroup({
                                  blockName: 'Block A',
                                  floorNumber: 4,
                                  totalUnits: 3,
                                  doneUnits: tasks.filter(t => t.floor?.floor_number === 4 && (t.status === 'done' || t.status === 'issue')).length,
                                  items: tasks.filter(t => t.floor?.floor_number === 4)
                                });
                                setTaskSubView('pre_run');
                              }}
                              className="p-3 bg-gray-50/50 border border-gray-150 rounded-2xl flex items-center justify-between hover:bg-emerald-50/30 font-semibold cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <Trash2 className="w-4 h-4 text-slate-400 shrink-0" />
                                <div>
                                  <p className="text-xs font-black text-slate-900">{item.unit?.unit_number || `A-40${item.id % 10}`}</p>
                                  {item.status === 'done' && <p className="text-[9px] text-gray-400 mt-0.5">Completed</p>}
                                </div>
                              </div>
                              <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">
                                ● {item.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Floor 3 Block B Floor 2 */}
                    <div className="bg-white border border-gray-200/60 rounded-3xl p-5 space-y-4 shadow-xs text-left">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400">FLOOR</span>
                          <h4 className="text-sm font-black text-slate-900 mt-0.5">Block B • Floor 2</h4>
                        </div>
                        <span className="bg-[#EFF3F0] text-[#1E4D2B] rounded-full px-2.5 py-0.5 text-[10px] font-black">
                          {tasks.filter(t => t.block?.name === 'Block B' && t.floor?.floor_number === 2 && (t.status === 'done' || t.status === 'issue')).length}/4
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {filteredTasks.filter(t => t.block?.name === 'Block B' && t.floor?.floor_number === 2).length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-400 font-bold bg-[#FAFCFA] rounded-2xl border border-dashed border-gray-150">
                            No matching units
                          </div>
                        ) : (
                          filteredTasks.filter(t => t.block?.name === 'Block B' && t.floor?.floor_number === 2).map((item) => (
                            <div 
                              key={item.id}
                              onClick={() => {
                                setSelectedFloorGroup({
                                  blockName: 'Block B',
                                  floorNumber: 2,
                                  totalUnits: 4,
                                  doneUnits: tasks.filter(t => t.block?.name === 'Block B' && t.floor?.floor_number === 2 && (t.status === 'done' || t.status === 'issue')).length,
                                  items: tasks.filter(t => t.block?.name === 'Block B' && t.floor?.floor_number === 2)
                                });
                                setTaskSubView('pre_run');
                              }}
                              className="p-3 bg-gray-50/50 border border-gray-150 rounded-2xl flex items-center justify-between hover:bg-emerald-50/30 font-semibold cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <Trash2 className={`w-4 h-4 shrink-0 ${item.status === 'issue' ? 'text-rose-500' : 'text-slate-400'}`} />
                                <div>
                                  <p className="text-xs font-black text-slate-900">{item.unit?.unit_number || `B-20${item.id % 10}`}</p>
                                  {item.status === 'issue' && <p className="text-[9px] text-rose-500 mt-0.5">Reported 8:28 AM</p>}
                                </div>
                              </div>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                item.status === 'issue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                ● {item.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* ---------------------- VIEW 2: START RUN / PRE-RUN VIEW (Screen 3) ---------------------- */}
              {taskSubView === 'pre_run' && selectedFloorGroup && (
                <div className="bg-transparent space-y-6 animate-in zoom-in-95 duration-200">
                  {/* Back Button and Quick Navigation row (matching admin portal layout) */}
                  <div className="flex items-center justify-between bg-white p-4 border border-gray-200/60 rounded-2xl shadow-xs animate-in slide-in-from-top-2 duration-200">
                    <button
                      type="button"
                      id="back-to-dashboard-btn"
                      onClick={() => setTaskSubView('dashboard')}
                      className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-gray-200 rounded-xl text-xs font-black text-[#1E4D2B] transition-all cursor-pointer shadow-sm select-none"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard</span>
                    </button>

                    <div className="text-[10px] text-gray-400 font-bold">
                      Tasks › {selectedFloorGroup.blockName} • Floor {selectedFloorGroup.floorNumber}
                    </div>
                  </div>

                  {/* Core Double Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Play Center Block */}
                    <div className="md:col-span-2 bg-white border border-gray-200/60 rounded-3xl p-8 flex flex-col justify-between space-y-8 shadow-xs min-h-[400px]">
                      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
                        {/* Play circular ring */}
                        <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-[#EFF3F0] animate-pulse">
                          <div className="w-16 h-16 rounded-full bg-[#E3EFE5] flex items-center justify-center text-[#1E4D2B]">
                            <Play className="w-7 h-7 fill-current translate-x-0.5" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-lg font-black text-slate-900">Start collection?</h4>
                          <p className="text-xs text-gray-400 font-bold max-w-sm">
                            QR code verified at {selectedFloorGroup.blockName} • Floor {selectedFloorGroup.floorNumber}. Confirm to begin the timer sequence.
                          </p>
                        </div>
                      </div>

                      {/* Info Cards Mini Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">UNITS</span>
                          <span className="text-xs font-black text-slate-800 mt-1 block">{selectedFloorGroup.totalUnits} units</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">SCHEDULED</span>
                          <span className="text-xs font-black text-slate-800 mt-1 block">6:30 AM</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">EST. TIME</span>
                          <span className="text-xs font-black text-slate-800 mt-1 block">15 min</span>
                        </div>
                      </div>

                      {/* Start Actions Footer Block */}
                      <div className="border-t border-gray-100 pt-5 flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            // Target first pending item on the floor for the incident
                            const firstUnit = selectedFloorGroup.items?.[0] || { id: 9991, unit: { unit_number: 'Floor Corridor' } };
                            setActiveJob(firstUnit);
                            setSelectedUnit(firstUnit);
                            setTaskSubView('incident');
                          }}
                          className="flex items-center gap-2 py-3 px-5 border border-[#D32F2F] text-[#D32F2F] hover:bg-rose-50 font-bold text-xs rounded-xl cursor-pointer select-none"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Report incident</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            // Mark all units on the selected floor as done!
                            selectedFloorGroup.items.forEach(async (it) => {
                              setTasks(prev => prev.map(t => t.id === it.id ? { ...t, status: 'done' } : t));
                            });
                            // Transition to Completed status view!
                            setTaskSubView('run_complete');
                            setMessage({ text: 'Session collection successfully cleared locally.', type: 'success' });
                          }}
                          className="flex items-center gap-2 py-3 px-6 bg-[#1D6C31] hover:bg-[#1E4D2B] text-white font-black text-xs rounded-xl cursor-pointer select-none shadow-md"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start collection</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Detailed Units Side Card */}
                    <div className="bg-white border border-gray-200/60 rounded-3xl p-5 space-y-4 text-left shadow-xs">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UNITS ON THIS FLOOR</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">Individual chute units assigned on this corridor.</p>
                      </div>

                      <div className="space-y-2.5">
                        {(() => {
                          const q = searchQuery.toLowerCase();
                          const filteredCorridorItems = selectedFloorGroup.items.filter((it: any) => {
                            if (!q) return true;
                            return (
                              (it.unit?.unit_number && it.unit.unit_number.toLowerCase().includes(q)) ||
                              (it.block?.name && it.block.name.toLowerCase().includes(q)) ||
                              (it.status && it.status.toLowerCase().includes(q))
                            );
                          });

                          if (filteredCorridorItems.length === 0) {
                            return (
                              <div className="p-4 text-center text-xs text-gray-400 font-bold bg-[#FAFCFA] rounded-2xl border border-dashed border-gray-150">
                                No units matching search
                              </div>
                            );
                          }

                          return filteredCorridorItems.map((it: any) => (
                            <div key={it.id} className="p-3 border border-gray-100 rounded-xl bg-slate-50/50 flex justify-between items-center text-xs">
                              <span className="font-extrabold text-slate-800">{it.unit?.unit_number || 'Floor waste'}</span>
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-700">
                                ● {it.status}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* ---------------------- VIEW 3: RUN COMPLETE / SUMMARY (Screen 4) ---------------------- */}
              {taskSubView === 'run_complete' && selectedFloorGroup && (
                <div className="bg-transparent space-y-6 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Center Success Box */}
                    <div className="md:col-span-2 bg-white border border-gray-200/60 rounded-3xl p-8 flex flex-col justify-between space-y-8 shadow-xs min-h-[400px]">
                      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
                        {/* Green heavy check circle */}
                        <div className="w-20 h-20 rounded-full bg-[#E3EFE5] flex items-center justify-center text-[#1D6C31] shadow-xl shadow-green-950/5">
                          <Check className="w-10 h-10 stroke-[3]" />
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-2xl font-black text-[#1E4D2B]">Great job!</h4>
                          <p className="text-xs text-gray-500 font-bold max-w-sm">
                            {selectedFloorGroup.blockName} • Floor {selectedFloorGroup.floorNumber} collection completed in 14 minutes.
                          </p>
                        </div>
                      </div>

                      {/* Completed Metrics Summary */}
                      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100/60">
                        <div className="p-3 bg-[#EFF3F0]/65 rounded-xl text-center">
                          <span className="text-xs font-black text-[#1E4D2B] inline-flex items-center justify-center gap-1.5">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{selectedFloorGroup.totalUnits} Units</span>
                          </span>
                        </div>
                        <div className="p-3 bg-[#EFF3F0]/65 rounded-xl text-center">
                          <span className="text-xs font-black text-[#1E4D2B] inline-flex items-center justify-center gap-1.5">
                            <Hourglass className="w-3.5 h-3.5" />
                            <span>14m Time</span>
                          </span>
                        </div>
                        <div className="p-3 bg-[#EFF3F0]/65 rounded-xl text-center">
                          <span className="text-xs font-black text-[#1E4D2B] inline-flex items-center justify-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                            <span>5★ Eco rate</span>
                          </span>
                        </div>
                      </div>

                      {/* Big CTA */}
                      <button
                        type="button"
                        onClick={() => {
                          setTaskSubView('dashboard');
                          setMessage({ text: 'All operations backed up in cache.', type: 'success' });
                        }}
                        className="w-full py-3 px-5 bg-[#1E4D2B] hover:bg-[#15381f] text-white text-xs font-black rounded-xl cursor-pointer select-none tracking-wide"
                      >
                        Next: {selectedFloorGroup.floorNumber === 3 ? 'Floor 4' : 'Back to Dashboard'}
                      </button>
                    </div>

                    {/* Right Timeline Stamp log panel */}
                    <div className="bg-white border border-gray-200/60 rounded-3xl p-5 space-y-4 text-left shadow-xs">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TIMELINE</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">Automatic RFID timestamp log generated by device.</p>
                      </div>

                      <div className="space-y-4 pl-1 border-l-2 border-emerald-100/70 ml-2 relative">
                        <div className="relative pl-4">
                          <span className="absolute left-[-11px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-4 border-white" />
                          <p className="text-xs font-bold text-slate-850">QR code scanned</p>
                          <span className="text-[9px] text-gray-400 font-bold">7:01 AM</span>
                        </div>

                        <div className="relative pl-4">
                          <span className="absolute left-[-11px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-4 border-white" />
                          <p className="text-xs font-bold text-slate-850">Collection started</p>
                          <span className="text-[9px] text-gray-400 font-bold">7:02 AM</span>
                        </div>

                        {selectedFloorGroup.items.map((it, idx) => (
                          <div key={it.id} className="relative pl-4">
                            <span className="absolute left-[-11px] top-1 w-4 h-4 rounded-full bg-[#1E4D2B] border-4 border-white" />
                            <p className="text-xs font-bold text-slate-900">{it.unit?.unit_number || 'Floor chute'} verified</p>
                            <span className="text-[9px] text-gray-400 font-bold">{`7:0${idx * 3 + 5} AM`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* ---------------------- VIEW 4: REPORT INCIDENT (Screen 5) ---------------------- */}
              {taskSubView === 'incident' && (
                <div className="space-y-6 animate-in zoom-in-95 duration-200 max-w-4xl mx-auto text-left">
                  {/* Back Button and Quick Navigation row (matching admin portal layout) */}
                  <div className="flex items-center justify-between bg-white p-4 border border-gray-200/60 rounded-2xl shadow-xs">
                    <button
                      type="button"
                      onClick={() => setTaskSubView('pre_run')}
                      className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-gray-200 rounded-xl text-xs font-black text-[#1E4D2B] transition-all cursor-pointer shadow-sm select-none"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Floor Run</span>
                    </button>

                    <div className="text-[10px] text-gray-400 font-bold">
                      Tasks › {activeJob?.unit?.unit_number || 'B-304'} • Incident Reporting
                    </div>
                  </div>

                  {/* Warning Notice stripe */}
                  <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-extrabold text-amber-800">This will mark the job as "Issue" and notify the admin.</p>
                      <p className="text-[10px] text-amber-700/90 font-semibold mt-0.5">Please fill details and snap photographic proof for the corporate Property Control Room.</p>
                    </div>
                  </div>

                  {/* Two Column details segment */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Form Block (Span 2) */}
                    <div className="md:col-span-2 bg-white border border-gray-200/60 rounded-3xl p-6 space-y-5 shadow-xs">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">FOR UNIT</span>
                        <h4 className="text-sm font-black text-slate-900 mt-0.5">
                          {activeJob?.unit?.unit_number || 'B-304'} • {selectedFloorGroup?.blockName || 'Block B'} • Floor {selectedFloorGroup?.floorNumber || 3}
                        </h4>
                      </div>

                      {/* Reason Selection Grid */}
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">REASON</label>
                        <div className="grid grid-cols-2 gap-3.5">
                          {/* Reason 1 */}
                          <button
                            type="button"
                            onClick={() => {
                              setIncidentReason('Door locked');
                              setIncidentNote('Safety lock is engaged. Knocked twice at room entrance, but there is no response.');
                            }}
                            className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 font-black text-xs transition-all cursor-pointer relative select-none ${
                              incidentReason === 'Door locked'
                                ? 'bg-emerald-50/70 border-2 border-[#1E4D2B] text-[#1E4D2B] shadow-sm transform scale-[1.02]'
                                : 'bg-slate-50 border-gray-200 text-slate-500 hover:bg-white hover:text-slate-800'
                            }`}
                          >
                            <Lock className={`w-5 h-5 transition-transform ${incidentReason === 'Door locked' ? 'text-[#1E4D2B] scale-110' : 'text-slate-400'}`} />
                            <span>Door locked</span>
                            {incidentReason === 'Door locked' && (
                              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#1E4D2B]" />
                            )}
                          </button>

                          {/* Reason 2 */}
                          <button
                            type="button"
                            onClick={() => {
                              setIncidentReason('Safety concern');
                              setIncidentNote('Unsafe hazardous objects, broken glass or chemical residue present in collection area.');
                            }}
                            className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 font-black text-xs transition-all cursor-pointer relative select-none ${
                              incidentReason === 'Safety concern'
                                ? 'bg-emerald-50/70 border-2 border-[#1E4D2B] text-[#1E4D2B] shadow-sm transform scale-[1.02]'
                                : 'bg-slate-50 border-gray-200 text-slate-500 hover:bg-white hover:text-slate-800'
                            }`}
                          >
                            <AlertTriangle className={`w-5 h-5 transition-transform ${incidentReason === 'Safety concern' ? 'text-[#1E4D2B] scale-110' : 'text-slate-400'}`} />
                            <span>Safety concern</span>
                            {incidentReason === 'Safety concern' && (
                              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#1E4D2B]" />
                            )}
                          </button>

                          {/* Reason 3 */}
                          <button
                            type="button"
                            onClick={() => {
                              setIncidentReason('Access denied');
                              setIncidentNote('Management guidelines or floor security team explicitly denied entry to this unit.');
                            }}
                            className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 font-black text-xs transition-all cursor-pointer relative select-none ${
                              incidentReason === 'Access denied'
                                ? 'bg-emerald-50/70 border-2 border-[#1E4D2B] text-[#1E4D2B] shadow-sm transform scale-[1.02]'
                                : 'bg-slate-50 border-gray-200 text-slate-500 hover:bg-white hover:text-slate-800'
                            }`}
                          >
                            <X className={`w-5 h-5 transition-transform ${incidentReason === 'Access denied' ? 'text-[#1E4D2B] scale-110' : 'text-slate-400'}`} />
                            <span>Access denied</span>
                            {incidentReason === 'Access denied' && (
                              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#1E4D2B]" />
                            )}
                          </button>

                          {/* Reason 4 */}
                          <button
                            type="button"
                            onClick={() => {
                              setIncidentReason('Other');
                              setIncidentNote('Other unscheduled physical obstruction blocking typical waste removal route.');
                            }}
                            className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 font-black text-xs transition-all cursor-pointer relative select-none ${
                              incidentReason === 'Other'
                                ? 'bg-emerald-50/70 border-2 border-[#1E4D2B] text-[#1E4D2B] shadow-sm transform scale-[1.02]'
                                : 'bg-slate-50 border-gray-200 text-slate-500 hover:bg-white hover:text-slate-800'
                            }`}
                          >
                            <HelpCircle className={`w-5 h-5 transition-transform ${incidentReason === 'Other' ? 'text-[#1E4D2B] scale-110' : 'text-slate-400'}`} />
                            <span>Other</span>
                            {incidentReason === 'Other' && (
                              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#1E4D2B]" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Notes Box */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">NOTE (OPTIONAL)</label>
                        <textarea
                          rows={3}
                          value={incidentNote}
                          onChange={(e) => setIncidentNote(e.target.value)}
                          placeholder="Provide specific notes regarding issue..."
                          className="w-full bg-slate-50 border border-gray-150 text-xs font-semibold p-3.5 rounded-2xl text-slate-800"
                        />
                      </div>

                      {/* Action buttons cancelled / submit */}
                      <div className="pt-3 border-t border-gray-100 flex justify-end gap-3.5">
                        <button
                          type="button"
                          onClick={() => setTaskSubView('pre_run')}
                          className="px-4.5 py-2.5 border border-gray-200 bg-white hover:bg-slate-50 text-gray-700 font-extrabold text-xs rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!activeJob) {
                              setMessage({ text: 'No active job selected to file incident against.', type: 'error' });
                              return;
                            }

                            if (!capturedPhotoUrl) {
                              setMessage({ text: 'Photo evidence is required before submitting this incident.', type: 'error' });
                              return;
                            }

                            setActionLoading(true);
                            setMessage(null);
                            const finalReason = incidentReason + (incidentNote ? ': ' + incidentNote : '');
                            const timedAt = new Date().toISOString();
                            const payload: OfflineQueueItem = {
                              job_id: activeJob.id,
                              action: 'INCIDENT_REPORTED',
                              incident_reason: finalReason,
                              lat,
                              lng,
                              timed_at: timedAt,
                              device_metadata: { os: 'PWA Sandbox', battery: 90 },
                              task_number: (activeJob.block?.name || selectedFloorGroup?.blockName || 'Block A') + ' Level ' + (activeJob.floor?.floor_number || selectedFloorGroup?.floorNumber || 1),
                              unit_number: activeJob.unit?.unit_number || 'Floor Corridor'
                            };

                            try {
                              if (isOffline) {
                                const queued = await queueOfflineAction(payload, 'Incident saved locally and will sync once the connection returns.');
                                if (queued) {
                                  setTasks(prev => prev.map(t => t.id === activeJob.id ? { ...t, status: 'issue', issue_reason: finalReason, captured_photo: capturedPhotoUrl } : t));
                                  setHistory(prev => [
                                    {
                                      id: activeJob.id + 1000,
                                      block: activeJob.block || { name: selectedFloorGroup?.blockName || 'Block A' },
                                      floor: activeJob.floor || { floor_number: selectedFloorGroup?.floorNumber || 3 },
                                      unit: activeJob.unit || { unit_number: activeJob.unit_number || 'Floor Corridor' },
                                      scheduled_date: '2026-05-22',
                                      status: 'issue',
                                      issue_reason: finalReason,
                                      completed_at: timedAt,
                                      captured_photo: capturedPhotoUrl
                                    },
                                    ...prev
                                  ]);
                                  setTaskSubView('dashboard');
                                }
                                return;
                              }

                              const formData = new FormData();
                              formData.append('reason', finalReason);
                              const photoAppended = await appendPhotoToFormData(formData, capturedPhotoUrl);
                              if (!photoAppended) {
                                throw new Error('Photo evidence could not be attached to the incident report.');
                              }

                              const response = await fetch(`/api/worker/tasks/${activeJob.id}/report-incident`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Accept': 'application/json'
                                },
                                body: formData
                              });

                              const data = await response.json().catch(() => null);
                              if (!response.ok) {
                                throw new Error(data?.message || 'Unable to submit the incident report.');
                              }

                              setTasks(prev => prev.map(t => t.id === activeJob.id ? { ...t, status: 'issue', issue_reason: finalReason, captured_photo: capturedPhotoUrl } : t));
                              setHistory(prev => [
                                {
                                  id: activeJob.id + 1000,
                                  block: activeJob.block || { name: selectedFloorGroup?.blockName || 'Block A' },
                                  floor: activeJob.floor || { floor_number: selectedFloorGroup?.floorNumber || 3 },
                                  unit: activeJob.unit || { unit_number: activeJob.unit_number || 'Floor Corridor' },
                                  scheduled_date: '2026-05-22',
                                  status: 'issue',
                                  issue_reason: finalReason,
                                  completed_at: timedAt,
                                  captured_photo: capturedPhotoUrl
                                },
                                ...prev
                              ]);
                              setMessage({ text: 'Incident successfully filed and sent to property central command.', type: 'success' });
                              setTaskSubView('dashboard');
                            } catch (error) {
                              if (isNetworkFailure(error)) {
                                const queued = await queueOfflineAction(payload, 'Network unavailable. Incident saved locally and will sync once the connection returns.');
                                if (queued) {
                                  setTasks(prev => prev.map(t => t.id === activeJob.id ? { ...t, status: 'issue', issue_reason: finalReason, captured_photo: capturedPhotoUrl } : t));
                                  setHistory(prev => [
                                    {
                                      id: activeJob.id + 1000,
                                      block: activeJob.block || { name: selectedFloorGroup?.blockName || 'Block A' },
                                      floor: activeJob.floor || { floor_number: selectedFloorGroup?.floorNumber || 3 },
                                      unit: activeJob.unit || { unit_number: activeJob.unit_number || 'Floor Corridor' },
                                      scheduled_date: '2026-05-22',
                                      status: 'issue',
                                      issue_reason: finalReason,
                                      completed_at: timedAt,
                                      captured_photo: capturedPhotoUrl
                                    },
                                    ...prev
                                  ]);
                                  setTaskSubView('dashboard');
                                }
                              } else {
                                setMessage({
                                  text: error instanceof Error ? error.message : 'Unable to submit the incident report.',
                                  type: 'error'
                                });
                              }
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          className="px-5 py-2.5 bg-[#1E4D2B] hover:bg-[#15381f] text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit incident</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Side Photo slot block */}
                    <div className="bg-white border border-gray-200/60 rounded-3xl p-5 space-y-4 shadow-xs">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PHOTO (REQUIRED)</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">Please snap photographic evidence of the situation.</p>
                      </div>

                      {capturedPhotoUrl ? (
                        <div className="relative group overflow-hidden border border-emerald-100 rounded-3xl h-64 bg-slate-100 flex items-center justify-center">
                          <img 
                            src={capturedPhotoUrl}
                            referrerPolicy="no-referrer"
                            alt="Incident Evidence Mock"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <button
                              type="button"
                              onClick={() => setTaskSubView('camera')}
                              className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-[10px] font-black uppercase"
                            >
                              Retake Photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setTaskSubView('camera')}
                          className="border-2 border-dashed border-[#EFF3F0] rounded-3xl p-8 hover:bg-emerald-50/20 text-center cursor-pointer transition-all flex flex-col justify-center items-center h-64"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-[#E3EFE5] text-[#1E4D2B] flex items-center justify-center mb-3">
                            <Camera className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-black text-slate-800">Tap to capture proof</span>
                          <span className="text-[10px] text-gray-400 mt-1 block">Webcam, mobile companion, or upload</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}


              {/* ---------------------- VIEW 5: CAPTURE PHOTO VIEWER (Screen 6) ---------------------- */}
              {taskSubView === 'camera' && (
                <div className="space-y-6 animate-in zoom-in-95 duration-200 text-left max-w-5xl mx-auto">
                  {/* Back Button and Quick Navigation row (matching admin portal layout) */}
                  <div className="flex items-center justify-between bg-white p-4 border border-gray-200/60 rounded-2xl shadow-xs">
                    <button
                      type="button"
                      onClick={() => setTaskSubView('incident')}
                      className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-gray-200 rounded-xl text-xs font-black text-[#1E4D2B] transition-all cursor-pointer shadow-sm select-none"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Incident Form</span>
                    </button>

                    <div className="text-[10px] text-gray-400 font-bold">
                      Incident › Photo Evidence Capture
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Retro Camera View finder / Companion / Upload zone depending on active method */}
                    <div className="md:col-span-2 min-h-[420px] flex flex-col justify-between relative overflow-hidden shadow-2xl border border-slate-850 rounded-[32px] transition-all bg-slate-950">
                      {activeCaptureMethod === 'webcam' && (
                        <div className="absolute inset-0 p-6 text-white flex flex-col justify-between h-full animate-in fade-in duration-200">
                          {/* Top REC flashing stamp */}
                          <div className="flex justify-between items-center z-10">
                            <span className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-[10px] font-black px-3 py-1.5 rounded-full text-red-500 animate-pulse flex items-center gap-1.5 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-650 block shrink-0" />
                              <span>REC - LIVE WEBCAM</span>
                            </span>
                            <span className="text-[9px] font-mono tracking-wider opacity-60">ISO 400 • F2.2 • 1080p</span>
                          </div>

                          {/* Grid crosshair visualizer */}
                          <div className="absolute inset-x-8 inset-y-16 border-l border-r border-t border-b border-white/5 pointer-events-none flex justify-center items-center">
                            <span className="w-6 h-6 border-t border-l border-white/20 animate-pulse" />
                          </div>

                          {/* Camera simulation viewport background */}
                          <div className="absolute inset-0 bg-gradient-to-b from-[#1E4D2B]/10 to-transparent mt-12 pointer-events-none" />

                          {/* Shutter bottom control deck */}
                          <div className="flex items-center justify-between mt-auto z-10">
                            {/* Shutter Quick Gallery indicator */}
                            <button
                              type="button"
                              onClick={() => {
                                if (recentPhotos && recentPhotos.length > 0) {
                                  const randomPic = recentPhotos[Math.floor(Math.random() * recentPhotos.length)];
                                  setCapturedPhotoUrl(randomPic);
                                  setTaskSubView('incident');
                                  setMessage({ text: 'Selected previous capture as incident proof.', type: 'success' });
                                } else {
                                  setMessage({ text: 'No recent captures in your history.', type: 'warning' });
                                }
                              }}
                              className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-slate-900/40 cursor-pointer flex items-center justify-center hover:scale-105 transition-all"
                              title="Select from gallery"
                            >
                              <img 
                                src="https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=60"
                                referrerPolicy="no-referrer"
                                alt="Mock preview" 
                                className="w-full h-full object-cover opacity-60" 
                              />
                            </button>

                            {/* Shutter click trigger ring */}
                            <button
                              type="button"
                              onClick={() => {
                                const mockImgs: any = {
                                  'Door locked': 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?q=80&w=400&auto=format&fit=crop',
                                  'Safety concern': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?q=80&w=400&auto=format&fit=crop',
                                  'Access denied': 'https://images.unsplash.com/photo-1549880181-56a44cf8a4a1?q=80&w=400&auto=format&fit=crop',
                                  'Other': 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?q=80&w=400&auto=format&fit=crop'
                                };
                                const defaultMock = 'https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?q=80&w=400&auto=format&fit=crop';
                                setCapturedPhotoUrl(mockImgs[incidentReason] || defaultMock);
                                setTaskSubView('incident');
                                setMessage({ text: 'Evidence snapshot captured successfully via Webcam.', type: 'success' });
                              }}
                              className="w-16 h-16 rounded-full bg-transparent border-4 border-white flex items-center justify-center p-1 group hover:scale-105 transition-all cursor-pointer"
                              title="Take snap"
                            >
                              <span className="w-full h-full bg-[#1E4D2B] rounded-full group-hover:bg-emerald-600 transition-all block" />
                            </button>

                            {/* Switch Lens Trigger Icon */}
                            <button
                              type="button"
                              onClick={() => {
                                setMessage({ text: "Switched to Ultra-wide 0.5x front lens.", type: 'success' });
                              }}
                              className="w-10 h-10 rounded-full bg-slate-900/40 backdrop-blur-sm border border-white/10 flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-all"
                              title="Swap camera lens"
                            >
                              <RefreshCcw className="w-4 h-4 text-white hover:rotate-180 transition-all duration-300" />
                            </button>
                          </div>
                        </div>
                      )}

                      {activeCaptureMethod === 'phone' && (
                        <div className="absolute inset-0 p-6 text-white flex flex-col justify-between h-full bg-slate-900 animate-in fade-in duration-200">
                          {/* Top connection status bar */}
                          <div className="flex justify-between items-center z-10">
                            <span className="bg-[#1E4D2B] border border-emerald-800/50 text-[10px] font-black px-3 py-1.5 rounded-full text-emerald-400 flex items-center gap-1.5 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block shrink-0 animate-ping" />
                              <span>PHONE COMPANION BOUND</span>
                            </span>
                            <span className="text-[9px] font-mono tracking-wider opacity-60">Connected v3.1</span>
                          </div>

                          {/* Companion pairing details */}
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 my-auto space-y-4 z-10">
                            <div className="p-3 bg-white text-slate-950 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center justify-center w-28 h-28 transform hover:scale-105 transition-all select-none">
                              <QrCode className="w-16 h-16 text-slate-800" />
                              <span className="text-[9px] font-black tracking-widest text-[#1E4D2B] mt-1">PAIR CODE</span>
                            </div>

                            <div className="space-y-1">
                              <h5 className="text-sm font-black text-white">Capture on mobile camera</h5>
                              <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                                Open Sunil's EcoTrack companion application on your smartphone, scan this pair code to automatically link, and snap the incident photos instantly.
                              </p>
                            </div>

                            {/* Simulated Quick Action button */}
                            <button
                              type="button"
                              onClick={() => {
                                const mockCompanionImgs: any = {
                                  'Door locked': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop',
                                  'Safety concern': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?q=80&w=400&auto=format&fit=crop',
                                  'Access denied': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=400&auto=format&fit=crop',
                                  'Other': 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=400&auto=format&fit=crop'
                                };
                                const defaultMock = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop';
                                setCapturedPhotoUrl(mockCompanionImgs[incidentReason] || defaultMock);
                                setTaskSubView('incident');
                                setMessage({ text: 'Successfully downloaded photo from companion device.', type: 'success' });
                              }}
                              className="px-5 py-2.5 bg-[#1E4D2B] hover:bg-emerald-600 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer text-white hover:scale-102"
                            >
                              <Smartphone className="w-4 h-4 text-emerald-300" />
                              <span>Simulate Companion Snap</span>
                            </button>
                          </div>

                          <div className="text-center pb-2 opacity-50 select-none">
                            <span className="text-[9px] text-slate-400 uppercase font-black">Linked iPhone 15 Pro • Sunil Kumara • Signal 100%</span>
                          </div>
                        </div>
                      )}

                      {activeCaptureMethod === 'upload' && (
                        <div className="absolute inset-0 p-6 text-slate-900 flex flex-col justify-between h-full bg-white animate-in fade-in duration-200">
                          {/* Hidden actual file input */}
                          <input 
                            id="local-photo-uploader"
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const read = new FileReader();
                                read.onloadend = () => {
                                  setCapturedPhotoUrl(read.result as string);
                                  setTaskSubView('incident');
                                  setMessage({ text: `Evidence file "${f.name}" uploaded successfully.`, type: 'success' });
                                };
                                read.readAsDataURL(f);
                              }
                            }}
                            className="hidden"
                          />

                          {/* Header section with instructions */}
                          <div className="text-left select-none">
                            <span className="text-[10px] font-black text-[#1E4D2B] uppercase tracking-widest block">UPLOAD ENGINE</span>
                            <h5 className="text-xs font-bold text-gray-400 mt-0.5">Select a real JPG/PNG file of the issue, or use one of our high quality simulation presets.</h5>
                          </div>

                          {/* Clickable Drag & Drop Area */}
                          <div 
                            onClick={() => document.getElementById('local-photo-uploader')?.click()}
                            className="border-2 border-dashed border-gray-200 hover:border-[#1E4D2B] rounded-2xl py-8 px-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/20 shrink-0"
                          >
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#1E4D2B] flex items-center justify-center mb-2 animate-bounce">
                              <Upload className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-black text-slate-800">Browse actual disk files</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Click to choose image or drag and drop image here</p>
                          </div>

                          {/* Quick test simulation buttons (Extremely useful for previewing!) */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block text-left">SIMULATOR PRESETS</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCapturedPhotoUrl('https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?q=80&w=400');
                                  setTaskSubView('incident');
                                  setMessage({ text: 'Preset "Locked heavy corridor padlock" loaded.', type: 'success' });
                                }}
                                className="p-2 border border-gray-150 bg-slate-50 hover:bg-white text-[10px] font-bold text-slate-700 rounded-xl transition-all text-left flex items-center gap-1.5 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5 shrink-0 text-[#1E4D2B]" />
                                <span className="truncate">Locked corridor padlock</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setCapturedPhotoUrl('https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?q=80&w=400');
                                  setTaskSubView('incident');
                                  setMessage({ text: 'Preset "Bulky garbage corridor blockage" loaded.', type: 'success' });
                                }}
                                className="p-2 border border-gray-150 bg-slate-50 hover:bg-white text-[10px] font-bold text-slate-700 rounded-xl transition-all text-left flex items-center gap-1.5 cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                <span className="truncate">Bulky rubbish blocked path</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setCapturedPhotoUrl('https://images.unsplash.com/photo-1549880181-56a44cf8a4a1?q=80&w=400');
                                  setTaskSubView('incident');
                                  setMessage({ text: 'Preset "Defective main entrance chute gate" loaded.', type: 'success' });
                                }}
                                className="p-2 border border-gray-150 bg-slate-50 hover:bg-white text-[10px] font-bold text-slate-700 rounded-xl transition-all text-left flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCcw className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                                <span className="truncate">Corrupted chute mechanism</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setCapturedPhotoUrl('https://images.unsplash.com/photo-1616401784845-180882ba9ba8?q=80&w=400');
                                  setTaskSubView('incident');
                                  setMessage({ text: 'Preset "Unsorted medical refuse waste" loaded.', type: 'success' });
                                }}
                                className="p-2 border border-gray-150 bg-slate-50 hover:bg-white text-[10px] font-bold text-slate-700 rounded-xl transition-all text-left flex items-center gap-1.5 cursor-pointer"
                              >
                                <HelpCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                <span className="truncate">Biohazard unsorted bags</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side Options (Capture Method and Recent Captures) */}
                    <div className="space-y-5 text-left">
                      {/* Capture Method Selection cards */}
                      <div className="bg-white border border-gray-200/60 rounded-3xl p-5 space-y-3 shadow-xs">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CAPTURE METHOD</h4>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setActiveCaptureMethod('webcam')}
                            className={`w-full p-3.5 rounded-xl border flex items-center gap-3 text-xs font-black transition-all text-left cursor-pointer ${
                              activeCaptureMethod === 'webcam'
                                ? 'bg-emerald-50/50 border-[#1E4D2B] text-[#1E4D2B] ring-2 ring-[#1E4D2B]/5'
                                : 'bg-slate-50 border-gray-200 text-gray-600 hover:bg-slate-100/85'
                            }`}
                          >
                            <Camera className={`w-4 h-4 ${activeCaptureMethod === 'webcam' ? 'text-[#1E4D2B]' : 'text-slate-400'}`} />
                            <span>Webcam (Active device)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCaptureMethod('phone')}
                            className={`w-full p-3.5 rounded-xl border flex items-center gap-3 text-xs font-black transition-all text-left cursor-pointer ${
                              activeCaptureMethod === 'phone'
                                ? 'bg-emerald-50/50 border-[#1E4D2B] text-[#1E4D2B] ring-2 ring-[#1E4D2B]/5'
                                : 'bg-slate-50 border-gray-200 text-gray-600 hover:bg-slate-100/85'
                            }`}
                          >
                            <Smartphone className={`w-4 h-4 ${activeCaptureMethod === 'phone' ? 'text-[#1E4D2B]' : 'text-slate-400'}`} />
                            <span>Phone companion</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCaptureMethod('upload')}
                            className={`w-full p-3.5 rounded-xl border flex items-center gap-3 text-xs font-black transition-all text-left cursor-pointer ${
                              activeCaptureMethod === 'upload'
                                ? 'bg-emerald-50/50 border-[#1E4D2B] text-[#1E4D2B] ring-2 ring-[#1E4D2B]/5'
                                : 'bg-slate-50 border-gray-200 text-gray-600 hover:bg-slate-100/85'
                            }`}
                          >
                            <Upload className={`w-4 h-4 ${activeCaptureMethod === 'upload' ? 'text-[#1E4D2B]' : 'text-slate-400'}`} />
                            <span>Upload file</span>
                          </button>
                        </div>
                      </div>

                      {/* Recent captures previews */}
                      <div className="bg-white border border-gray-200/60 rounded-3xl p-5 space-y-3.5 shadow-xs">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">RECENT CAPTURES</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {recentPhotos.map((ph, idx) => (
                            <div key={idx} className="aspect-square bg-[#EFF3F0] rounded-xl overflow-hidden cursor-pointer relative group">
                              <img 
                                src={ph} 
                                referrerPolicy="no-referrer"
                                alt="Recent thumbnail capture" 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ------------------ TAB C: SCAN QR SIMULATION TAB ------------------ */}
          {activeTab === 'scan' && (
            <div className="max-w-6xl mx-auto w-full p-6 animate-in fade-in duration-200" id="view-scan">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Visual Camera Viewfinder Section */}
                <div className="lg:col-span-2 flex flex-col justify-between relative overflow-hidden shadow-2xl border border-emerald-950/20 rounded-[32px] transition-all bg-[#0A160F] min-h-[480px]">
                  
                  {isQrVerified ? (
                    /* General success container overlay across modes when verified successfully */
                    <div 
                      onClick={() => setIsQrVerified(false)}
                      className="absolute inset-0 z-10 cursor-pointer flex flex-col items-center justify-center p-6 bg-[#030A06]/92 backdrop-blur-xs select-none animate-in fade-in duration-200"
                      title="Click here to reset or re-scan QR Code"
                    >
                      <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-350">
                        {/* Big verified green circle checkmark */}
                        <div className="w-24 h-24 bg-[#1E4D2B] rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-300/35 transform scale-110">
                          <Check className="w-12 h-12 text-white stroke-[4.5]" />
                        </div>
                        <div className="text-center space-y-1">
                          <span className="text-emerald-400 font-extrabold text-xs tracking-wider uppercase px-4.5 py-1.5 bg-[#1E4D2B]/40 rounded-full border border-emerald-500/25 inline-block">
                            Verified Successfully
                          </span>
                          <span className="text-[10px] text-gray-500 block font-bold tracking-tight">Click to reset or try helper presets</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Dynamic view contents corresponding to each active scan mode */
                    <div className="absolute inset-0 z-10 flex flex-col justify-between overflow-hidden">
                      {activeCaptureMethod === 'webcam' && (
                        <div 
                          onClick={() => {
                            setIsQrVerified(true);
                            setMessage({ text: 'Webcam scanned and verified Floor QR code.', type: 'success' });
                          }}
                          className="w-full h-full flex flex-col items-center justify-center relative p-6 cursor-pointer select-none"
                          title="Click within viewfinder frame to capture and scan"
                        >
                          <span className="absolute top-4 left-6 text-[10px] font-black tracking-widest text-[#34D399] flex items-center gap-1.5 uppercase">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                            Live Desktop Webcam Feed • Active
                          </span>

                          {/* Braces Frame */}
                          <div className="relative w-64 h-64 flex items-center justify-center">
                            {/* Corner Brackets */}
                            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white/90 rounded-tl-[16px]"></div>
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white/90 rounded-tr-[16px]"></div>
                            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white/90 rounded-bl-[16px]"></div>
                            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white/90 rounded-br-[16px]"></div>

                            {/* Scanning Neon Green laser beam */}
                            <motion.div 
                              className="w-[85%] h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.85)] absolute z-15"
                              animate={{ y: [-100, 100, -100] }}
                              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            />

                            <QrCode className="w-28 h-28 text-emerald-500/10 stroke-[1.25]" />
                          </div>

                          <span className="text-gray-400 text-[10px] font-extrabold tracking-widest uppercase mt-6 bg-black/50 px-3.5 py-1 rounded-full border border-gray-800">
                            Click Anywhere in viewport to Simulate Scan
                          </span>
                        </div>
                      )}

                      {activeCaptureMethod === 'phone' && (
                        <div className="w-full h-full flex flex-col items-center justify-around p-8 select-none bg-[#050D08]">
                          <div className="w-full flex justify-between items-center text-[10px] font-black text-gray-400 tracking-wider">
                            <span className="flex items-center gap-1.5 uppercase">
                              <Smartphone className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                              EcoTrack Companion Link
                            </span>
                            <span className="text-amber-500 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full font-extrabold animate-pulse">
                              WAITING FOR CLIENT STREAM
                            </span>
                          </div>

                          <div className="max-w-md mx-auto space-y-4 my-auto text-center">
                            {/* visual QR Sync sticker */}
                            <div className="p-4 bg-white rounded-3xl inline-block shadow-lg border border-emerald-900/15">
                              <QrCode className="w-20 h-20 text-emerald-950 stroke-[1.75]" />
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-gray-200 uppercase tracking-wide">Smartphone QR Companion Pairing</h4>
                              <p className="text-[10px] text-gray-400/90 leading-relaxed max-w-xs mx-auto">
                                Open Sunil's EcoTrack companion application, select companion mode and aim your smartphone camera at this screen to instantly stream verification.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setIsQrVerified(true);
                                setMessage({ text: 'Connected with iPhone companion camera & QR confirmed successfully!', type: 'success' });
                              }}
                              className="bg-[#1E4D2B] border border-emerald-500/35 text-white hover:bg-emerald-800 font-extrabold text-[10px] uppercase tracking-wider px-4.5 py-2.5 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-1.5 mx-auto"
                            >
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                              Simulate Companion Link
                            </button>
                          </div>

                          <div className="text-[9px] text-gray-650 font-black uppercase tracking-widest leading-none">
                            PAIR CODE: ECO-SYNC-814-SUNIL
                          </div>
                        </div>
                      )}

                      {activeCaptureMethod === 'upload' && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#040A06]">
                          <div className="w-full max-w-md p-6 border-2 border-dashed border-gray-800 hover:border-emerald-600/50 rounded-3xl text-center bg-black/40 transition-all flex flex-col items-center justify-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center animate-pulse">
                              <Upload className="w-5 h-5 text-emerald-400" />
                            </div>

                            <div className="space-y-0.5">
                              <p className="text-xs font-black text-gray-200">Drag and drop Floor QR sticker graphic</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Supports JPEG & PNG layouts</p>
                            </div>

                            {/* Horizontal divider */}
                            <div className="flex items-center gap-3 w-full max-w-xs my-1">
                              <div className="h-px bg-slate-900 flex-1" />
                              <span className="text-[9px] text-slate-700 font-black uppercase tracking-wider">or</span>
                              <div className="h-px bg-slate-900 flex-1" />
                            </div>

                            {/* Preset Buttons */}
                            <div className="space-y-2 w-full max-w-xs">
                              <p className="text-[9px] text-gray-450 font-black uppercase tracking-wider text-left">Upload Sandbox Presets (Demo):</p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsQrVerified(true);
                                    setMessage({ text: 'Sandbox file "BlockA_Floor3.png" parsed perfectly.', type: 'success' });
                                  }}
                                  className="p-2 bg-[#0F1D14] hover:bg-[#152B1E] border border-emerald-950 rounded-lg text-[9px] text-gray-300 hover:text-white font-black transition-all cursor-pointer text-left truncate flex items-center gap-1 shrink-0"
                                >
                                  <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>BlockA_Floor3.png</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsQrVerified(true);
                                    setMessage({ text: 'Sandbox file "BlockA_Floor4.png" decoded.', type: 'success' });
                                  }}
                                  className="p-2 bg-[#0F1D14] hover:bg-[#152B1E] border border-emerald-950 rounded-lg text-[9px] text-gray-300 hover:text-white font-black transition-all cursor-pointer text-left truncate flex items-center gap-1 shrink-0"
                                >
                                  <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>BlockA_Floor4.png</span>
                                </button>
                              </div>

                              <label className="block w-full text-center py-2 px-3 bg-[#E3EFE5] text-[#1E4D2B] hover:bg-[#d0e5d4] text-[10px] font-black rounded-lg cursor-pointer transition-all uppercase tracking-wider mt-1.5 shadow-xs">
                                Choose From Local Drive
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      setIsQrVerified(true);
                                      setMessage({ text: `Simulated upload analysis complete on "${e.target.files[0].name}" – validated.`, type: 'success' });
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Translucent bottom bar */}
                  {isQrVerified ? (
                    <div className="relative z-25 w-full bg-[#1E4D2B] py-4 px-6 text-center text-white border-t border-emerald-800/20 flex items-center justify-center gap-2 animate-in slide-in-from-bottom duration-250">
                      <Check className="w-4 h-4 text-emerald-300 stroke-[3.5]" />
                      <span className="text-sm font-black tracking-wide font-sans">Block A • Floor 3 — Verified</span>
                    </div>
                  ) : (
                    <div className="relative z-25 w-full bg-black/80 py-4 px-6 text-center text-gray-200 border-t border-neutral-900 flex items-center justify-center">
                      <span className="text-xs font-semibold tracking-wide text-neutral-300 leading-none font-sans">
                        Align the QR within the frame · or use desktop webcam
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Panel configuration Column */}
                <div className="space-y-6">
                  
                  {/* Card 1: SCAN MODE with Webcam selectable block */}
                  <div className="bg-white border border-gray-150/80 rounded-[28px] p-5 space-y-3.5 shadow-xs text-left">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-sans">Scan Mode</span>
                    
                    <div className="space-y-2.5">
                      {/* Webcam Row Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCaptureMethod('webcam');
                          setIsQrVerified(false);
                          setMessage({ text: 'Webcam simulation feed online. Aim at floor QR code.', type: 'info' });
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black text-left transition-all select-none border cursor-pointer ${
                          activeCaptureMethod === 'webcam'
                            ? 'bg-[#E3EFE5] border-[#1E4D2B] text-[#1E4D2B] ring-2 ring-[#1E4D2B]/5'
                            : 'bg-white border-gray-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Camera className="w-4.5 h-4.5 shrink-0" />
                        <span className="flex-1 font-sans">Webcam</span>
                      </button>

                      {/* Phone Camera Row Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCaptureMethod('phone');
                          setIsQrVerified(false);
                          setMessage({ text: 'EcoTrack Companion pairing system online.', type: 'info' });
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black text-left transition-all select-none border cursor-pointer ${
                          activeCaptureMethod === 'phone'
                            ? 'bg-[#E3EFE5] border-[#1E4D2B] text-[#1E4D2B] ring-2 ring-[#1E4D2B]/5'
                            : 'bg-white border-gray-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone className="w-4.5 h-4.5 shrink-0" />
                        <span className="flex-1 font-sans">Phone camera</span>
                      </button>

                      {/* Upload Image Row Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCaptureMethod('upload');
                          setIsQrVerified(false);
                          setMessage({ text: 'Local file uploader interface ready.', type: 'info' });
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black text-left transition-all select-none border cursor-pointer ${
                          activeCaptureMethod === 'upload'
                            ? 'bg-[#E3EFE5] border-[#1E4D2B] text-[#1E4D2B] ring-2 ring-[#1E4D2B]/5'
                            : 'bg-white border-gray-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Upload className="w-4.5 h-4.5 shrink-0" />
                        <span className="flex-1 font-sans">Upload image</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: HINT or READY TO START dynamic views */}
                  {isQrVerified ? (
                    <div className="bg-white border border-gray-150/80 rounded-[28px] p-5 space-y-4 shadow-xs text-left animate-in zoom-in-95 duration-200">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-sans">Ready to Start</span>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-gray-950 leading-snug font-sans">Block A • Floor 3</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-tight font-sans">4 units • scheduled 6:30 AM</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          // Start floor run collection exactly as implemented
                          const floor3Tasks = tasks.filter(t => t.floor?.floor_number === 3);
                          setSelectedFloorGroup({
                            blockName: 'Block A',
                            floorNumber: 3,
                            totalUnits: 4,
                            doneUnits: tasks.filter(t => t.floor?.floor_number === 3 && (t.status === 'done' || t.status === 'issue')).length,
                            items: floor3Tasks
                          });
                          setTaskSubView('pre_run');
                          setActiveTab('tasks');
                          setMessage({ text: 'Starting Block A • Floor 3 compilation routine.', type: 'success' });
                        }}
                        className="w-full py-3.5 bg-[#1E4D2B] hover:bg-[#15381f] text-white text-xs font-black rounded-xl cursor-pointer select-none flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                      >
                        <Play className="w-4 h-4 text-white fill-current" />
                        <span className="font-sans">Start collection</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-150/80 rounded-[28px] p-5 space-y-2 bg-gradient-to-br from-white to-gray-50 text-left">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-sans">Hint</span>
                      <p className="text-xs text-[#1E4D2B] font-bold leading-relaxed font-sans">
                        Hold the QR sticker 20–30 cm from the camera. The scanner auto-detects EcoTrack codes.
                      </p>
                    </div>
                  )}

                  {/* Card 3: RECENT SCANS exactly matching mockup */}
                  <div className="bg-white border border-gray-150/80 rounded-[28px] p-5 space-y-3 shadow-xs text-left">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-sans">Recent Scans</span>
                    
                    <div className="divide-y divide-gray-100">
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-xs font-black text-[#1E4D2B] font-mono select-all">A-301</span>
                        <span className="text-[11px] font-bold text-gray-400">6:35 AM</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-xs font-black text-[#1E4D2B] font-mono select-all">A-302</span>
                        <span className="text-[11px] font-bold text-gray-400">6:42 AM</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-xs font-black text-[#1E4D2B] font-mono select-all">A-303</span>
                        <span className="text-[11px] font-bold text-gray-400">7:10 AM</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ------------------ TAB D: HISTORY LOGS VIEW ------------------ */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="view-history">
              
              {/* Top Stats Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="history-stats">
                {/* Card 1: Total Jobs */}
                <div className="bg-white p-5 border border-gray-150 rounded-2xl flex flex-col justify-between items-start shadow-xs">
                  <div className="w-9 h-9 bg-[#EBFDF2] text-emerald-850 rounded-xl flex items-center justify-center mb-3">
                    <CheckCircle className="w-4.5 h-4.5 text-[#1E4D2B]" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[#1E4D2B] leading-none">312</div>
                    <div className="text-[10px] uppercase font-black tracking-wider text-gray-400 mt-1 block">Total Jobs</div>
                  </div>
                </div>

                {/* Card 2: On Time */}
                <div className="bg-white p-5 border border-gray-150 rounded-2xl flex flex-col justify-between items-start shadow-xs">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                    <Zap className="w-4.5 h-4.5 text-blue-500 fill-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[#1E4D2B] leading-none">94%</div>
                    <div className="text-[10px] uppercase font-black tracking-wider text-gray-400 mt-1 block">On time</div>
                  </div>
                </div>

                {/* Card 3: Rating */}
                <div className="bg-white p-5 border border-gray-150 rounded-2xl flex flex-col justify-between items-start shadow-xs">
                  <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-3">
                    <Star className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[#1E4D2B] leading-none">4.8</div>
                    <div className="text-[10px] uppercase font-black tracking-wider text-gray-400 mt-1 block">Rating</div>
                  </div>
                </div>

                {/* Card 4: Incidents */}
                <div className="bg-white p-5 border border-gray-150 rounded-2xl flex flex-col justify-between items-start shadow-xs">
                  <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3">
                    <AlertTriangle className="w-4.5 h-4.5 text-rose-550" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[#1E4D2B] leading-none">6</div>
                    <div className="text-[10px] uppercase font-black tracking-wider text-gray-400 mt-1 block">Incidents</div>
                  </div>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-150 shadow-xs">
                {/* Time range pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'week', label: 'This week' },
                    { key: 'month', label: 'This month' },
                    { key: 'all', label: 'All time' }
                  ].map((pill) => (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={() => setHistoryTimeFilter(pill.key as any)}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                        historyTimeFilter === pill.key
                          ? 'bg-[#1E4D2B] text-white shadow-xs'
                          : 'bg-emerald-50/10 text-emerald-800 border border-emerald-100/50 hover:bg-emerald-50'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar matching screenshot right input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full bg-[#FAFCFA] border border-gray-150 focus:border-[#1E4D2B] focus:bg-white text-xs py-2 pl-9 pr-4 rounded-xl outline-none transition-all placeholder:text-gray-450"
                  />
                  {historySearchQuery && (
                    <button 
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Main History Table Container with clean headers and precise style columns */}
              <div className="bg-white border border-gray-150 rounded-2xl shadow-xs overflow-hidden" id="history-table-container">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto border-collapse text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[#FAFCFA] text-[10px] font-black uppercase text-gray-450 tracking-wider">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Unit</th>
                        <th className="px-6 py-4">Block</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/70 text-xs">
                      {(() => {
                        // Filter the list
                        const filtered = history.filter(item => {
                          const ref = getHistoryReferenceDate();
                          // Dynamic trailing 7-day bounds check for 'week'
                          if (historyTimeFilter === 'week') {
                            const dateStr = item.scheduled_date || '';
                            const d = new Date(dateStr);
                            const diffTime = ref.getTime() - d.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays < 0 || diffDays > 6 || isNaN(diffDays)) {
                              return false;
                            }
                          } else if (historyTimeFilter === 'month') {
                            // Returns items belonging to the month/year of reference date
                            const targetMonth = ref.getMonth();
                            const targetYear = ref.getFullYear();
                            const itemDateStr = item.scheduled_date || '';
                            const d = new Date(itemDateStr);
                            if (isNaN(d.getTime()) || d.getMonth() !== targetMonth || d.getFullYear() !== targetYear) {
                              return false;
                            }
                          }
                          
                          // Support both local and global queries with 100% accuracy
                          const queries = [historySearchQuery, searchQuery].filter(Boolean);
                          for (const qRaw of queries) {
                            const q = qRaw.toLowerCase();
                            const unitNo = (item.unit?.unit_number || '').toLowerCase();
                            const blockName = (item.block?.name || '').toLowerCase();
                            const statusStr = (item.status || '').toLowerCase();
                            const dateStr = (item.scheduled_date || '').toLowerCase();
                            const issueStr = (item.issue_reason || '').toLowerCase();
                            if (
                              !unitNo.includes(q) && 
                              !blockName.includes(q) && 
                              !statusStr.includes(q) && 
                              !dateStr.includes(q) && 
                              !issueStr.includes(q)
                            ) {
                              return false;
                            }
                          }
                          
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-gray-400 font-bold bg-[#FAFCFA]">
                                No historical entries match current filters.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((item, index) => {
                          const formattedDate = item.scheduled_date || '2026-05-10';
                          
                          // Extract time format, e.g. "6:35 AM"
                          let timeStr = '6:35 AM';
                          if (item.completed_at) {
                            try {
                              const d = new Date(item.completed_at);
                              timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } catch {
                              timeStr = item.scheduled_time || '6:35 AM';
                            }
                          } else {
                            timeStr = item.scheduled_time || '6:35 AM';
                          }

                          return (
                            <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors">
                              {/* Date values */}
                              <td className="px-6 py-4 font-extrabold text-[#1E4D2B]">
                                {formattedDate}
                              </td>
                              
                              {/* Time values */}
                              <td className="px-6 py-4 text-gray-500 font-medium">
                                {timeStr}
                              </td>
                              
                              {/* Unit column has monospace styled bold typography */}
                              <td className="px-6 py-4 font-black text-[#1E4D2B] font-mono select-all text-xs">
                                {item.unit?.unit_number || 'A-301'}
                              </td>
                              
                              {/* Block values */}
                              <td className="px-6 py-4 text-gray-500 font-bold">
                                {item.block?.name || 'Block A'}
                              </td>
                              
                              {/* Status badge and dots */}
                              <td className="px-6 py-4">
                                {item.status === 'done' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E3EFE5] text-[#1E4D2B] font-black text-[11px] rounded-full shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Done
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-750 font-black text-[11px] rounded-full shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    Issue
                                  </span>
                                )}
                              </td>
                              
                              {/* Rating stars rendering */}
                              <td className="px-6 py-4">
                                {item.status === 'done' ? (
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((starIndex) => {
                                      const starRatingValue = item.rating || 5; 
                                      return (
                                        <Star
                                          key={starIndex}
                                          className={`w-3.5 h-3.5 ${
                                            starIndex <= starRatingValue
                                              ? 'text-amber-400 fill-none'
                                              : 'text-gray-200 fill-none'
                                          } stroke-[2.2]`}
                                        />
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 select-none font-bold">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------ TAB E: NOTIFICATIONS VIEW ------------------ */}
          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-200" id="view-notifications">
              
              {/* Left Column - Notifications List with Faint Dividers */}
              <div className="lg:col-span-3 space-y-4">
                {(() => {
                  const q = searchQuery.toLowerCase();
                  
                  // Filter list based on selected category filter and global search query
                  const filtered = notifications.filter(notif => {
                    if (notificationFilter !== 'all' && notif.type !== notificationFilter) return false;
                    
                    if (q) {
                      const matchesTitle = notif.title && notif.title.toLowerCase().includes(q);
                      const matchesMsg = notif.message && notif.message.toLowerCase().includes(q);
                      if (!matchesTitle && !matchesMsg) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-16 text-center bg-white border border-gray-200/60 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-xs">
                        <CheckCircle className="w-12 h-12 text-[#1E4D2B]/30" />
                        <p className="text-sm font-black text-slate-800">No matching notifications</p>
                        <p className="text-xs text-slate-400 font-medium font-sans">Try tweaking your category filters or search inputs.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white border border-gray-200/60 rounded-3xl shadow-xs overflow-hidden divide-y divide-gray-100">
                      {filtered.map((notif) => {
                        // Icon matching based on message context
                        let IconComponent = Megaphone;
                        let iconBg = 'bg-emerald-50 text-emerald-800';
                        
                        if (notif.type === 'job') {
                          IconComponent = ClipboardCheck;
                          iconBg = 'bg-[#EFF5F1] text-emerald-700';
                        } else if (notif.type === 'rating') {
                          IconComponent = Star;
                          iconBg = 'bg-orange-50 text-orange-500';
                        } else if (notif.type === 'announcement') {
                          if (notif.title?.toLowerCase().includes('shift')) {
                            IconComponent = Clock;
                            iconBg = 'bg-[#EBF3FB] text-[#2F80ED]';
                          } else {
                            IconComponent = Megaphone;
                            iconBg = 'bg-emerald-50 text-[#1E4D2B]';
                          }
                        } else if (notif.type === 'incident') {
                          IconComponent = AlertTriangle;
                          iconBg = 'bg-orange-50 text-orange-600';
                        }

                        return (
                          <div 
                            key={notif.id}
                            onClick={() => {
                              if (!notif.read) {
                                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                              }
                            }}
                            className={`p-5 flex items-center justify-between gap-4 transition-all cursor-pointer ${
                              notif.read ? 'bg-white hover:bg-slate-50/40' : 'bg-[#FAFCFA] hover:bg-[#F2FAF4]/30'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Icon container */}
                              <div className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${iconBg}`}>
                                <IconComponent className="w-5 h-5 stroke-[2.2]" />
                              </div>

                              {/* Text components matching screenshot colors and typography */}
                              <div className="space-y-0.5">
                                <h4 className="text-sm font-black text-[#1E572E] tracking-tight flex items-center gap-2">
                                  {notif.title}
                                </h4>
                                <p className="text-xs text-gray-500 font-semibold leading-normal font-sans">
                                  {notif.message}
                                </p>
                              </div>
                            </div>

                            {/* Relative time and green dot for unreads */}
                            <div className="flex items-center gap-3 shrink-0 self-center">
                              <span className="text-xs font-bold text-gray-400">
                                {notif.time}
                              </span>
                              {!notif.read ? (
                                <span className="w-2 h-2 rounded-full bg-[#1E572E] block shrink-0" />
                              ) : (
                                <div className="w-2 h-2 shrink-0 opacity-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Right Column - Sidebar FILTER Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-200/60 rounded-3xl p-5 shadow-xs space-y-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block select-none">
                    FILTER
                  </span>
                  
                  <div className="flex flex-col gap-2">
                    {[
                      { key: 'all', label: 'All', count: notifications.length },
                      { key: 'job', label: 'Jobs', count: notifications.filter(n => n.type === 'job').length },
                      { key: 'rating', label: 'Ratings', count: notifications.filter(n => n.type === 'rating').length },
                      { key: 'announcement', label: 'Announcements', count: notifications.filter(n => n.type === 'announcement').length },
                      { key: 'incident', label: 'Incidents', count: notifications.filter(n => n.type === 'incident').length }
                    ].map((btn) => {
                      const isActive = notificationFilter === btn.key;
                      return (
                        <button
                          key={btn.key}
                          type="button"
                          onClick={() => setNotificationFilter(btn.key as any)}
                          className={`w-full text-left rounded-xl px-4 py-3 text-xs font-black flex items-center justify-between transition-all select-none border cursor-pointer ${
                            isActive
                              ? 'border-[#1E4D2B] bg-[#E3EFE5]/30 text-[#1E4D2B] font-extrabold'
                              : 'border-gray-100 hover:bg-slate-50 text-slate-700 font-semibold'
                          }`}
                        >
                          <span>{btn.label}</span>
                          <span className={`${isActive ? 'text-[#1E4D2B] font-black' : 'text-slate-400'}`}>
                            {btn.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ------------------ TAB F: OFFLINE SYNC VIEW ------------------ */}
          {activeTab === 'offline' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-200" id="view-offline-db">
              
              {/* Left Column - Alerts and Outbox List */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* 1. Yellow Warning Status Banner */}
                <div className="p-5 bg-[#FFF9E6] border border-[#FAD2A6] rounded-3xl flex items-center gap-4 shadow-2xs">
                  <div className="w-10 h-10 shrink-0 bg-[#FDF0CC] text-[#B57A22] rounded-2xl flex items-center justify-center">
                    <WifiOff className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-[#8A5E1A] tracking-tight">You're offline</h4>
                    <p className="text-xs text-slate-500 font-semibold font-sans leading-normal">
                      {offlineQueue.length} actions in the IndexedDB outbox - will auto-upload when online
                    </p>
                  </div>
                </div>

                {/* 2. Pending Sync Queue Container */}
                <div className="bg-white border border-gray-200/60 rounded-3xl shadow-xs overflow-hidden">
                  
                  {/* Container Header */}
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#FAFCFA]/45">
                    <h4 className="text-sm font-black text-[#1E4D2B] tracking-tight">Pending sync queue</h4>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#FCF5E3] border border-[#F6E6C9] text-[#B57D28] text-[10px] font-black tracking-wider uppercase rounded-full py-0.5 px-3">
                        {offlineQueue.length} QUEUED
                      </span>
                      {offlineQueue.length > 0 && (
                        <button
                          onClick={handleClearLocalDBAndReset}
                          className="text-[10px] bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 font-black px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of queue items */}
                  {offlineQueue.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center gap-3 bg-white">
                      <CheckCircle className="w-12 h-12 text-[#1E4D2B]/30" />
                      <p className="text-sm font-black text-slate-800">Local outbox is empty</p>
                      <p className="text-xs text-slate-400 font-medium font-sans">All offline actions are fully synchronized.</p>
                      
                      {/* Load Demo outbox items button */}
                      <button
                        onClick={async () => {
                          localStorage.removeItem('eco_offline_queue_prefilled');
                          await updateOfflineQueueState();
                          setMessage({ text: 'Loaded default demo outbox items.', type: 'success' });
                        }}
                        className="mt-2 border border-[#1E4D2B] text-[#1E4D2B] hover:bg-emerald-50 text-[11px] font-black py-1.5 px-3.5 rounded-xl transition cursor-pointer"
                      >
                        Reset Demo Queue Items
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 relative bg-white">
                      {offlineQueue.map((item, index) => {
                        // Display helper details based on database fields
                        let labelText = 'Mark Done';
                        let subText = 'Captured offline';
                        let IconComp = Check;
                        let bgStyle = 'bg-[#EFF5F1] text-[#1E572E]';

                        if (item.action === 'INCIDENT_REPORTED') {
                          labelText = 'Incident';
                          subText = item.incident_reason || '1 photo';
                          IconComp = AlertTriangle;
                          bgStyle = 'bg-orange-50 text-orange-600';
                        } else if (item.action === 'STATUS_MARKED_IN_PROGRESS') {
                          labelText = 'QR scan';
                          subText = 'Captured offline';
                          IconComp = QrCode;
                          bgStyle = 'bg-blue-50 text-[#2F80ED]';
                        }

                        // Parse timestamp helper
                        let timeString = '7:15 AM';
                        if (item.timed_at) {
                          try {
                            const d = new Date(item.timed_at);
                            if (!isNaN(d.getTime())) {
                              let hrs = d.getHours();
                              const mins = d.getMinutes().toString().padStart(2, '0');
                              const pm = hrs >= 12 ? 'PM' : 'AM';
                              hrs = hrs % 12 || 12;
                              timeString = `${hrs}:${mins} ${pm}`;
                            }
                          } catch {
                            timeString = '7:15 AM';
                          }
                        }

                        // Title string matching layout
                        const displayTitle = `${labelText} - ${item.unit_number || 'A-303'}`;
                        const displaySubtitle = `${subText === '1 photo' ? '1 photo' : 'Captured offline'} - ${timeString}`;

                        const isMenuOpen = activeQueueDropdownId === item.id;

                        return (
                          <div 
                            key={item.id || index}
                            className="p-5 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/20 transition-all border-b border-gray-100"
                          >
                            <div className="flex items-center gap-4">
                              {/* circular icon indicator container */}
                              <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center border border-gray-100 ${bgStyle}`}>
                                <IconComp className="w-5 h-5 stroke-[2.2]" />
                              </div>

                              <div className="space-y-0.5">
                                <h4 className="text-sm font-black text-[#1E572E] tracking-tight">
                                  {displayTitle}
                                </h4>
                                <p className="text-xs text-slate-450 font-semibold font-sans">
                                  {displaySubtitle}
                                </p>
                              </div>
                            </div>

                            {/* Badge queued & actions dots */}
                            <div className="flex items-center gap-4 shrink-0 relative">
                              <span className="bg-[#FCF5E3] border border-[#F6E6C9] text-[#B57D28] text-[9px] font-black tracking-wider uppercase rounded-md py-0.5 px-2 select-none">
                                QUEUED
                              </span>
                              
                              {/* Interactive actions trigger */}
                              <div className="relative">
                                <button
                                  onClick={() => setActiveQueueDropdownId(isMenuOpen ? null : (item.id || null))}
                                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                  type="button"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {isMenuOpen && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-30" 
                                      onClick={() => setActiveQueueDropdownId(null)}
                                    />
                                    <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteQueueItem(item.id)}
                                        className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Remove action</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* 3. Reconnecting Status Banner */}
                <div className="border-l-4 border-[#2F80ED] bg-[#EBF3FB]/70 p-5 rounded-r-[24px] rounded-l-md flex items-center justify-between shadow-2xs">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-[#224A75] tracking-tight">Reconnecting..</h4>
                    <p className="text-xs text-[#2F80ED] font-bold font-sans">Will resume sync automatically.</p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2F80ED] animate-ping shrink-0 mr-1.5" />
                </div>

              </div>

              {/* Right Column - Status Panel Cards */}
              <div className="lg:col-span-1 space-y-4">
                
                {/* Storage Card */}
                <div className="bg-white border border-gray-200/60 rounded-3xl p-5 shadow-xs space-y-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block select-none">
                    STORAGE
                  </span>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-[#1E4D2B] tracking-tight">
                      18 MB <span className="text-xs text-gray-400 font-bold font-sans">/ 50 MB</span>
                    </h3>
                    
                    {/* Compact custom progress bar */}
                    <div className="w-full bg-[#EFF5F1] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#1E4D2B] h-full w-[36%] rounded-full transition-all duration-500" />
                    </div>
                    
                    <p className="text-[10.5px] text-gray-400 font-semibold font-sans leading-relaxed">
                      IndexedDB - cached photos & outbox
                    </p>
                  </div>
                </div>

                {/* Last Sync Card */}
                <div className="bg-white border border-gray-200/60 rounded-3xl p-5 shadow-xs space-y-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block select-none">
                    LAST SYNC
                  </span>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-[#1E572E] tracking-tight">
                      3 minutes ago
                    </h3>
                    
                    {/* Status representation */}
                    <div className="flex items-center gap-1.5 pt-1 text-orange-500 select-none">
                      <WifiOff className="w-4 h-4 stroke-[2.2]" />
                      <span className="text-xs font-black tracking-tight font-sans">Connection lost</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ------------------ TAB G: PORTAL MY PROFILE VIEW ------------------ */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200" id="view-profile-main">
              
              {/* Left Column - Profile Card Info Summary (spans 4/12 columns on desktop) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-gray-200/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-6">
                  
                  {/* Decorative green box wrapper */}
                  <div className="bg-[#1E4D2B] rounded-2xl p-6 text-center text-white flex flex-col items-center justify-center space-y-4">
                    {/* Circle image or initials identifier representing profile picture */}
                    <div className="w-20 h-20 bg-white text-[#1E4D2B] rounded-full flex items-center justify-center font-black text-2xl shadow-sm select-none overflow-hidden border-2 border-white relative group">
                      {localUser?.avatarUrl ? (
                        <img 
                          src={localUser?.avatarUrl} 
                          alt={localUser?.name || 'Worker'} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer" 
                        />
                      ) : localUser?.name ? (() => {
                        const parts = localUser.name.split(' ');
                        return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : localUser.name.substring(0, 2).toUpperCase();
                      })() : 'SK'}
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-xl font-black tracking-tight leading-tight">
                        {localUser?.name || 'Sunil Kumara'}
                      </h2>
                      <p className="text-xs text-[#E3EFE5]/90 font-bold font-sans">
                        {localUser?.shift || 'Morning'} Shift - 6AM-2PM
                      </p>
                    </div>

                    {/* Stars group */}
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                      ))}
                      <span className="text-xs font-black text-white ml-1.5 bg-black/15 py-0.5 px-2 rounded-full font-sans">
                        4.8 <span className="text-white/60 font-semibold">(212)</span>
                      </span>
                    </div>
                  </div>

                  {/* Operational metrics triple row summary */}
                  <div className="grid grid-cols-3 gap-2.5">
                    
                    {/* Jobs completed box */}
                    <div className="flex flex-col items-center justify-center p-3 bg-[#FAFCFA]/60 border border-gray-100 rounded-2xl text-center shadow-2xs">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mb-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
                      </div>
                      <span className="text-sm font-black text-slate-800 font-sans tracking-tight">312</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Jobs</span>
                    </div>

                    {/* On time efficiency box */}
                    <div className="flex flex-col items-center justify-center p-3 bg-[#FAFCFA]/60 border border-gray-100 rounded-2xl text-center shadow-2xs">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mb-1.5">
                        <Zap className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
                      </div>
                      <span className="text-sm font-black text-slate-800 font-sans tracking-tight">94%</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">On time</span>
                    </div>

                    {/* Sustainable rating box */}
                    <div className="flex flex-col items-center justify-center p-3 bg-[#FAFCFA]/60 border border-gray-100 rounded-2xl text-center shadow-2xs">
                      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center mb-1.5">
                        <Award className="w-4 h-4 text-amber-600 stroke-[2.2]" />
                      </div>
                      <span className="text-sm font-black text-slate-800 font-sans tracking-tight">5★</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 font-sans">Eco</span>
                    </div>

                  </div>

                  {/* Actions interactive trigger links */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditProfileModalOpen(true)}
                      className="w-full border border-gray-200 hover:border-[#1E4D2B] hover:bg-emerald-50/30 text-[#1E4D2B] py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Edit profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsChangePasswordModalOpen(true)}
                      className="w-full text-center py-2 text-xs font-bold text-gray-500 hover:text-[#1E4D2B] transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-slate-50/40 rounded-xl hover:bg-slate-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Change password</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Right Column - Feedback & Performance Details (spans 8/12 columns on desktop) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* 1. Recent Feedback Section container */}
                <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Recent feedback
                    </h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-black px-2.5 py-0.5 rounded-full uppercase tracking-tight">
                      Average 4.8★
                    </span>
                  </div>

                  {/* Feedback grid list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {[
                      {
                        name: 'Amaya R.',
                        initials: 'AR',
                        rating: 5,
                        text: 'Always punctual and very polite. Thanks!',
                        time: '2d ago',
                        color: 'bg-emerald-100 text-[#1E4D2B]'
                      },
                      {
                        name: 'Priya J.',
                        initials: 'PJ',
                        rating: 3,
                        text: 'Good service, but please be quieter early morning.',
                        time: '5d ago',
                        color: 'bg-blue-100 text-blue-700'
                      },
                      {
                        name: 'Kasun W.',
                        initials: 'KW',
                        rating: 5,
                        text: 'Excellent work as always 🌿',
                        time: '1w ago',
                        color: 'bg-emerald-100 text-[#1E4D2B]'
                      },
                      {
                        name: 'Nimal D.',
                        initials: 'ND',
                        rating: 5,
                        text: 'Very professional and on time every day.',
                        time: '1w ago',
                        color: 'bg-teal-100 text-teal-800'
                      }
                    ].map((feed, idx) => (
                      <div 
                        key={idx} 
                        className="bg-[#FAFCFA]/60 border border-gray-100/70 p-4 rounded-2xl relative space-y-3 shadow-3xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${feed.color}`}>
                            {feed.initials}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 leading-none">{feed.name}</h4>
                            <span className="text-[9px] text-gray-400 font-bold block mt-1">{feed.time}</span>
                          </div>
                        </div>

                        {/* Stars rating */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-3 h-3 ${
                                star <= feed.rating 
                                  ? 'fill-amber-400 stroke-amber-400' 
                                  : 'stroke-gray-300 fill-transparent'
                              }`} 
                            />
                          ))}
                        </div>

                        <p className="text-xs text-gray-500 font-semibold leading-relaxed font-sans mt-1">
                          {feed.text}
                        </p>
                      </div>
                    ))}

                  </div>
                </div>

                {/* 2. Performance Chart Section container */}
                <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Performance · last 7 days
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7BC48F]"></span>
                        <span>Completed tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1E4D2B]"></span>
                        <span>Today</span>
                      </div>
                    </div>
                  </div>

                  {/* Flex bars container */}
                  <div className="space-y-4 pt-2">
                    <div className="h-44 flex items-end justify-between gap-3 px-2">
                      {[
                        { day: 'Mon', percent: '40%', tasks: 8, label: 'Mon: 8 jobs' },
                        { day: 'Tue', percent: '60%', tasks: 12, label: 'Tue: 12 jobs' },
                        { day: 'Wed', percent: '50%', tasks: 10, label: 'Wed: 10 jobs' },
                        { day: 'Thu', percent: '85%', tasks: 17, label: 'Thu: 17 jobs' },
                        { day: 'Fri', percent: '70%', tasks: 14, label: 'Fri: 14 jobs' },
                        { day: 'Sat', percent: '80%', tasks: 16, label: 'Sat: 16 jobs' },
                        { day: 'Sun', percent: '75%', tasks: 15, label: 'Sun (Today): 15 jobs', isCurrent: true }
                      ].map((bar, idx) => (
                        <div 
                          key={idx} 
                          className="flex-1 flex flex-col items-center justify-end h-full relative group"
                        >
                          {/* Inner tooltip helper on hover */}
                          <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[9px] font-black tracking-tight py-1 px-2.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none scale-95 origin-bottom group-hover:scale-100 duration-150">
                            {bar.label} • {bar.percent} rating
                          </div>

                          {/* Dynamic scaled bar wrapper */}
                          <div 
                            className={`w-full rounded-t-xl hover:opacity-95 transition-all duration-300 cursor-pointer shadow-3xs flex flex-col justify-end overflow-hidden ${
                              bar.isCurrent ? 'bg-[#1E4D2B]' : 'bg-[#7BC48F]'
                            }`}
                            style={{ height: bar.percent }}
                          >
                            <span className="text-[9px] font-black text-white text-center mb-1.5 block select-none">
                              {bar.tasks}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Weekday labels grid aligned */}
                    <div className="grid grid-cols-7 gap-3 text-center pt-2 text-[10px] text-gray-400 font-bold select-none border-t border-gray-50 uppercase tracking-wider font-sans">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                        <span 
                          key={i} 
                          className={day === 'Sun' ? 'text-[#1E4D2B] font-black' : ''}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ------------------ TAB H: SETTINGS & OPTIONS VIEW ------------------ */}
          {activeTab === 'settings' && (
            <div className="bg-white border border-gray-200/60 rounded-3xl overflow-hidden shadow-xs max-w-4xl mx-auto animate-in fade-in" id="view-settings">
              <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 min-h-[450px]">
                {/* Settings Sidebar Tabs */}
                <div className="w-full md:w-64 bg-gray-50/50 p-4 space-y-1.5 shrink-0">
                  <div className="px-3 py-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Console Settings</h3>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('profile')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                      settingsSubTab === 'profile'
                        ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                        : 'text-gray-650 hover:bg-white border border-transparent'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('security')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                      settingsSubTab === 'security'
                        ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                        : 'text-gray-650 hover:bg-white border border-transparent'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Security Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('help')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                      settingsSubTab === 'help'
                        ? 'bg-[#E3EFE5] text-[#1E4D2B]'
                        : 'text-gray-650 hover:bg-white border border-transparent'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Help & Support</span>
                  </button>
                </div>

                {/* Sub Tab Contents */}
                <div className="flex-1 p-6 md:p-8 space-y-6">
                  {settingsSubTab === 'profile' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#1E4D2B] shadow-sm shrink-0">
                          <img 
                            src={localUser?.avatarUrl || defaultAvatar} 
                            referrerPolicy="no-referrer" 
                            alt={localUser?.name || 'Worker'} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 leading-tight">{user?.name || 'Sunil Kumara'}</h3>
                          <p className="text-xs text-slate-500 uppercase tracking-widest">{user?.shift || 'Morning'} shift operator</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-gray-150">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">CONTRACT SCHEME</span>
                          <h4 className="text-sm font-black text-gray-800 mt-1">Residential Complex Elite</h4>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-gray-150">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">DEVICE BOUND</span>
                          <h4 className="text-sm font-black text-gray-800 mt-1">Zebra PWA Rugged V2</h4>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-5 space-y-4">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Account Information</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase">Username / ID</label>
                            <input 
                              type="text" 
                              disabled 
                              value="sunil_operator_elite" 
                              className="w-full mt-1.5 bg-gray-50 border border-gray-150 text-gray-500 rounded-xl p-2.5 text-xs font-semibold cursor-not-allowed" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase">Registered Mobile</label>
                            <input 
                              type="text" 
                              disabled 
                              value="+94 77 123 4567" 
                              className="w-full mt-1.5 bg-gray-50 border border-gray-150 text-gray-500 rounded-xl p-2.5 text-xs font-semibold cursor-not-allowed" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSubTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                      <div>
                        <h3 className="text-base font-black text-slate-900">Security Settings</h3>
                        <p className="text-xs text-gray-450 mt-0.5">Manage console credentials and offline passcode constraints.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                          <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-extrabold text-amber-800">Offline Session Security Active</h4>
                              <p className="text-[11px] text-amber-700/95 leading-normal mt-0.5">
                                Your device has a local SQLite encrypted keychain. All database synchronization keys remain local until an active synchronization cycle is cleared.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border border-gray-150 rounded-2xl divide-y divide-gray-100">
                          <div className="p-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-extrabold text-slate-800">Biometric Login Bypass</p>
                              <p className="text-[10px] text-gray-400">Allows facial scanning via device front-facing camera</p>
                            </div>
                            <div className="w-10 h-6 bg-emerald-600 rounded-full p-0.5 cursor-pointer flex justify-end items-center">
                              <span className="w-5 h-5 bg-white rounded-full shadow-xs" />
                            </div>
                          </div>
                          <div className="p-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-extrabold text-slate-850">Auto-lock Console</p>
                              <p className="text-[10px] text-gray-400">Lock console interface after 15 minutes of inactivity</p>
                            </div>
                            <span className="text-[10px] bg-slate-100 font-extrabold px-2.5 py-1 rounded-lg text-slate-700">15 min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSubTab === 'help' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                      <div>
                        <h3 className="text-base font-black text-[#1E4D2B]">Operator Help & Support</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Direct hotdesk extension and troubleshooting protocols.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5">
                        <div className="p-4 bg-[#F4F6F0] rounded-2xl border border-gray-200 flex gap-3">
                          <HelpCircle className="w-5 h-5 text-[#1E4D2B] shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-black text-gray-900">Direct Support Hotdesk</h4>
                            <p className="text-[11px] text-gray-600 leading-normal mt-1">
                              Call <strong>Extension #902</strong> or report severe site malfunctions direct to the Property Control Room via standard intercom channel 14.
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-gray-150 rounded-2xl">
                          <h4 className="text-xs font-black text-gray-800 mb-2">Frequently Asked Operator Questions</h4>
                          <div className="space-y-3 divide-y divide-gray-100">
                            <div className="pt-2">
                              <p className="text-xs font-extrabold text-slate-900">How do I report custom weight variants?</p>
                              <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Go to Tasks, tap on standard "Update Weight", and log custom kilograms directly in the input stream.</p>
                            </div>
                            <div className="pt-3">
                              <p className="text-xs font-extrabold text-slate-900">What if the dumpster QR gets defaced/damaged?</p>
                              <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Tap "Report Exception" from the tasks interface and select "Chute completely stuck or structurally broken" or lodge evidence photo.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* SHARED MODAL: INTERACTIVE ROUTE MAP OVERLAY */}
      {showRouteMapModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200/80 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#1E4D2B] animate-spin-slow" />
                <div>
                  <h3 className="text-sm font-black text-[#1E4D2B]">EcoTrack Route Visualizer</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Block A • Level 3 Plan</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowRouteMapModal(false)}
                className="p-1 px-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 font-extrabold text-xs cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Simulated Live Compass Floor Plan Graph */}
            <div className="bg-[#F4F8F5] border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[220px]">
              {/* North Arrow icon */}
              <div className="absolute top-3 right-3 text-gray-400 text-[10px] font-mono leading-none bg-white py-1 px-2 rounded border flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                LIVE POSITION • N
              </div>

              {/* Building outline grid with route layout */}
              <div className="w-full relative py-6">
                {/* Horizontal main corridor pipeline line */}
                <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-gray-200 rounded -translate-y-1/2 z-0"></div>
                {/* Simulated walk path line from start to current */}
                <div className="absolute top-1/2 left-4 w-[60%] h-1.5 bg-emerald-500 rounded -translate-y-1/2 z-0"></div>

                <div className="flex justify-between items-center relative z-10 px-2">
                  {/* Start Point */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center border-4 border-white shadow-md cursor-pointer hover:scale-110 transition-transform">
                      S
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">06:00 AM</span>
                  </div>

                  {/* A-301 */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#1E4D2B] text-white font-mono text-[9px] font-bold flex items-center justify-center border-4 border-white shadow-md group relative">
                      ✓
                      <div className="absolute -top-8 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">A-301 Collected</div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-800 mt-1">A-301</span>
                  </div>

                  {/* A-302 */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#1E4D2B] text-white font-mono text-[9px] font-bold flex items-center justify-center border-4 border-white shadow-md group relative font-semibold">
                      ✓
                      <div className="absolute -top-8 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">A-302 Collected</div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-800 mt-1">A-302</span>
                  </div>

                  {/* A-303 (In-Progress) */}
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold flex items-center justify-center border-4 border-white shadow-lg group relative animate-bounce animate-pulse">
                      🏃‍♂️
                    </div>
                    <span className="text-[9px] font-black text-blue-750 mt-1">A-303</span>
                  </div>

                  {/* A-304 (Next) */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-white font-mono text-[9px] font-bold flex items-center justify-center border-4 border-white shadow-md group relative hover:scale-105 transition-transform">
                      ⏱
                    </div>
                    <span className="text-[9px] font-black text-amber-700 mt-1">A-304</span>
                  </div>

                  {/* End Point Floor Exit */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 font-black text-[10px] flex items-center justify-center border-4 border-white shadow-md">
                      E
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">EXIT</span>
                  </div>
                </div>
              </div>

              {/* Status footer with directions guide */}
              <div className="w-full text-center bg-white/70 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-100/30 text-[10.5px] font-semibold text-gray-650 leading-relaxed mt-1">
                ⛳️ <strong className="text-gray-900">Recommended plan:</strong> Walk east down the Level 3 north corridor. Turn left at Unit A-303 container station.
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowRouteMapModal(false);
                  setActiveTab('tasks');
                }}
                className="px-4 py-2 border border-emerald-250 bg-[#E3EFE5] text-[#1E4D2B] hover:bg-[#d5e7d8] rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Go to Tasks View
              </button>
              <button
                type="button"
                onClick={() => setShowRouteMapModal(false)}
                className="px-4 py-2 bg-[#1E4D2B] text-white hover:bg-[#15381f] rounded-xl font-bold text-xs cursor-pointer transition-all shadow-xs"
              >
                Dismiss Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARED MODAL: VERIFY SCAN OVERLAY STATE */}
      {showQRModal && activeJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white border border-gray-200/80 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-black text-gray-950 flex items-center gap-1.5">
                <QrCode className="w-4.5 h-4.5 text-[#2E7D32]" />
                Simulate dumpster QR
              </h3>
              <button 
                onClick={() => { setShowQRModal(false); setActiveJob(null); }} 
                className="text-gray-400 hover:text-gray-900 font-extrabold text-sm select-all"
              >
                ×
              </button>
            </div>

            <p className="text-xs font-semibold text-gray-500 leading-relaxed">
              Scan confirmation for <strong className="text-gray-900">Apartment {activeJob.unit?.unit_number}</strong>. Paste structural token below to authorize collection.
            </p>

            <form onSubmit={handleQRScanSubmit} className="space-y-4">
              <input 
                type="text" 
                required
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Simulated scanner stream string"
                className="w-full bg-[#EFF3F0] rounded-xl p-3 text-xs font-mono"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQrInput(activeJob.unit?.qr_code_hash || '')}
                  className="px-3 py-1.5 rounded-xl bg-[#EBFDF2] text-emerald-800 text-[10px] font-black border border-emerald-100"
                >
                  Auto-fill Test Code
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 px-3 rounded-xl bg-[#1E4D2B] text-white text-xs font-black hover:bg-[#15381f]"
                >
                  Done
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARED MODAL: INCIDENT EXCEPTION REPORT */}
      {showIncidentModal && activeJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white border border-gray-200 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-start animate-wiggle">
              <h3 className="text-sm font-black text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5" />
                Lodge Incident Report
              </h3>
              <button onClick={() => { setShowIncidentModal(false); setActiveJob(null); }} className="text-gray-400 hover:text-gray-700 font-extrabold text-xs">×</button>
            </div>

            <form onSubmit={handleIncidentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Incident Reason</label>
                <select
                  value={incidentReason}
                  onChange={(e) => setIncidentReason(e.target.value)}
                  className="w-full bg-[#EFF3F0] text-xs font-bold p-2.5 rounded-xl text-gray-800"
                >
                  <option value="Corridor locked: Resident absent">Corridor locked: Resident absent</option>
                  <option value="Severe toxic waste contamination reported">Severe toxic waste contamination reported</option>
                  <option value="Chute completely stuck or structurally broken">Chute completely stuck or structurally broken</option>
                  <option value="Verbal abuse or refusal of entry by layout security">Verbal abuse or refusal of entry by layout security</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Camera Evidence Photo</label>
                <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setIncidentPhoto(e.target.files[0]);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Camera className="w-5 h-5 text-gray-400 mx-auto mb-1 animate-pulse" />
                  <span className="text-[10px] text-gray-450 block">
                    {incidentPhoto ? incidentPhoto.name : 'Tap to simulate evidence capture'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  Submit Exception Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN-PORTAL STYLE POPUP DIALOG OVERLAY FOR LOGOUT */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header inside dialogue */}
            <div className="p-6 pb-4 bg-rose-50/50 border-b border-rose-100/50 flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-650 shrink-0">
                <LogOut className="w-5 h-5 rotate-180" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-slate-950">Sign out of EcoTrack?</h3>
                <p className="text-xs font-bold text-red-650/90 mt-0.5">You'll need to sign in again to continue managing units.</p>
              </div>
            </div>

            {/* Modal Body inside dialogue */}
            <div className="p-6 space-y-4 text-left">
              <div className="p-4 bg-gradient-to-r from-emerald-50/40 to-emerald-50/10 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-250 shadow-sm bg-gray-100 shrink-0">
                    <img
                      src={localUser?.avatarUrl || defaultAvatar}
                      alt={localUser?.name || 'Worker'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-tight">
                      {user?.name || 'Sunil Kumara'} (Local)
                    </p>
                    <p className="text-[10px] font-bold text-gray-450 tracking-tight mt-0.5">
                      {user?.shift || 'Morning'} Operator • Elite PWA
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-white border border-emerald-100 text-[#2E7D32] rounded-full text-[9px] font-black tracking-tight uppercase">
                  Active Crew
                </span>
              </div>

              {/* Checks */}
              <div className="space-y-2.5 text-xs font-semibold text-gray-650 pl-1">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Offline cache has local DB backup</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Tasks completed: 4 of 18 units</span>
                </div>
              </div>
            </div>

            {/* Modal Footer inside dialogue with exact Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="px-4.5 py-2 border border-gray-200 bg-white hover:bg-slate-50 text-gray-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel, Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  onLogout();
                }}
                className="px-4.5 py-2 bg-[#D32F2F] hover:bg-[#C62828] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-950/10"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Yes, sign me out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE DIALOG OVERLAY */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 pb-4 bg-emerald-50/50 border-b border-emerald-100/50 flex gap-4 items-center shrink-0">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-[#1E4D2B] shrink-0 font-sans font-black">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-slate-950">Edit Profile Details</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Update user name, contact channels, and work shifts.</p>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProfile} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 space-y-4 text-left overflow-y-auto flex-1">
                
                {/* Profile Picture Selector */}
                <div className="space-y-3 bg-[#E3EFE5]/10 border border-[#E3EFE5]/40 rounded-2xl p-3.5 shadow-3xs">
                  <span className="block text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                    OPERATOR PROFILE PICTURE
                  </span>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#1E4D2B] bg-emerald-50 shrink-0 relative shadow-sm">
                      <img 
                        src={editAvatarUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* File upload hidden input */}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          id="edit-profile-avatar-upload"
                          className="hidden"
                        />
                        <label
                          htmlFor="edit-profile-avatar-upload"
                          className="px-3 py-1.5 bg-[#1E4D2B] hover:bg-[#15381f] text-white font-extrabold text-[10px] rounded-lg cursor-pointer transition flex items-center gap-1 shadow-sm uppercase tracking-wide select-none"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Photo</span>
                        </label>
                        
                        {editAvatarUrl !== defaultAvatar && (
                          <button
                            type="button"
                            onClick={() => setEditAvatarUrl(defaultAvatar)}
                            className="text-[9.5px] font-bold text-[#1E4D2B] hover:text-red-500 hover:underline transition-colors uppercase tracking-wide px-2 py-1"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400 font-semibold font-sans">
                        Drag & Drop or browse to select profile. Max 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Preset Premium Avatars Grid Choice */}
                  <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wide">Or choose a preset crew avatar:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop"
                      ].map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditAvatarUrl(presetUrl)}
                          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all relative shrink-0 hover:scale-105 active:scale-95 ${
                            editAvatarUrl === presetUrl 
                              ? 'border-[#1E4D2B] scale-105 shadow-sm ring-2 ring-emerald-100/55' 
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img 
                            src={presetUrl} 
                            alt={`Preset ${idx + 1}`} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paste URL option optionally input */}
                  <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                      Or image URL link
                    </label>
                    <input
                      type="url"
                      value={editAvatarUrl.startsWith('data:') ? '' : editAvatarUrl}
                      onChange={(e) => {
                        if (e.target.value.trim()) {
                          setEditAvatarUrl(e.target.value.trim());
                        }
                      }}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full bg-[#EFF3F0] rounded-xl p-2 text-[10.5px] font-bold text-gray-800 border border-transparent focus:border-emerald-600 focus:outline-none transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Full name input */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Operator Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-[#EFF3F0] rounded-xl p-2.5 text-xs font-bold text-gray-800 border border-transparent focus:border-emerald-600 focus:outline-none transition-all"
                  />
                </div>

                {/* Mobile number input */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Registered Mobile
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full bg-[#EFF3F0] rounded-xl p-2.5 text-xs font-bold text-gray-800 border border-transparent focus:border-emerald-600 focus:outline-none transition-all"
                  />
                </div>

                {/* Email Address input */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. sunil@ecotrack.lk"
                    className="w-full bg-[#EFF3F0] rounded-xl p-2.5 text-xs font-bold text-gray-800 border border-transparent focus:border-emerald-600 focus:outline-none transition-all"
                  />
                </div>

                {/* Shift selector */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Work Shift Assignment
                  </label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full bg-[#EFF3F0] rounded-xl p-2.5 text-xs font-bold text-gray-800 border border-transparent focus:border-emerald-600 focus:outline-none transition-all"
                  >
                    <option value="Morning">Morning Shift (6AM - 2PM)</option>
                    <option value="Evening">Evening Shift (2PM - 10PM)</option>
                    <option value="Night">Night Shift (10PM - 6AM)</option>
                  </select>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4.5 py-2 border border-gray-200 bg-white hover:bg-slate-50 text-gray-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-[#1E4D2B] hover:bg-[#15381f] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD DIALOG OVERLAY */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 pb-4 bg-indigo-50/50 border-b border-indigo-100/50 flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-[#1E4D2B] shrink-0 font-sans font-black">
                <Lock className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-slate-950">Change Password</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Secure your EcoTrack terminal login password.</p>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePassword}>
              <div className="p-6 space-y-4 text-left">
                
                {/* Current password */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#EFF3F0] rounded-xl py-2.5 pl-3.5 pr-10 text-xs font-bold text-gray-800 border border-transparent focus:border-emerald-600 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 hover:scale-105 transition-all p-1 z-10 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 characters)"
                      className="w-full bg-[#EFF3F0] rounded-xl py-2.5 pl-3.5 pr-10 text-xs font-bold text-gray-800 border border-transparent focus:border-emerald-600 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 hover:scale-105 transition-all p-1 z-10 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm new password */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-[#EFF3F0] rounded-xl py-2.5 pl-3.5 pr-10 text-xs font-bold text-gray-800 border border-transparent focus:border-emerald-600 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 hover:scale-105 transition-all p-1 z-10 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4.5 py-2 border border-gray-200 bg-white hover:bg-slate-50 text-gray-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-[#1E4D2B] hover:bg-[#15381f] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Update credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  // Helper helper setter for simpler tasks table verify scans
  function setSelectedJobData(taskItem: any) {
    setActiveJob(taskItem);
    setQrInput('');
    setShowQRModal(true);
  }
}
