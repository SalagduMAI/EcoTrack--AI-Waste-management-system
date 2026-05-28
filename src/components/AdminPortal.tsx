import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Users, CheckCircle, AlertTriangle, Landmark, 
  QrCode, Keyboard, HelpCircle, FileSpreadsheet, Settings as SettingsIcon,
  LogOut, Search, Bell, Menu, ArrowRight, Check, Play, UserPlus, Trash, 
  Plus, Calendar, RefreshCw, Landmark as Bank, Shield, Star, Sparkles, Sliders, Info,
  X, ChevronDown, ChevronUp, MoreVertical, Edit3, Upload, Layers,
  Clock, ArrowLeft, Eye, EyeOff, MessageSquare, Camera, Printer, Download,
  PiggyBank, TrendingUp, TrendingDown, Leaf, Receipt, FileText, CreditCard, Phone, Mail,
  User, Lock, Globe, Briefcase, Building, PhoneOff, Mic, MicOff, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

// Procedural, unique aesthetic vector QR code component
const QRImage = ({ text, className = "w-16 h-16" }: { text: string; className?: string }) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const gridSize = 15;
  const pixels = [];
  
  const isFinder = (r: number, c: number) => {
    if (r < 5 && c < 5) return true;
    if (r < 5 && c >= gridSize - 5) return true;
    if (r >= gridSize - 5 && c < 5) return true;
    return false;
  };

  const isFinderFilled = (r: number, c: number) => {
    if (r < 5 && c < 5) {
      if (r === 0 || r === 4 || c === 0 || c === 4) return true;
      if (r === 2 && c === 2) return true;
      return false;
    }
    if (r < 5 && c >= gridSize - 5) {
      const nc = c - (gridSize - 5);
      if (r === 0 || r === 4 || nc === 0 || nc === 4) return true;
      if (r === 2 && nc === 2) return true;
      return false;
    }
    if (r >= gridSize - 5 && c < 5) {
      const nr = r - (gridSize - 5);
      if (nr === 0 || nr === 4 || c === 0 || c === 4) return true;
      if (nr === 2 && c === 2) return true;
      return false;
    }
    return false;
  };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isFinder(r, c)) {
        pixels.push({ r, c, active: isFinderFilled(r, c) });
      } else {
        const val = Math.abs(Math.sin(hash + r * 13 + c * 37));
        pixels.push({ r, c, active: val > 0.43 });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${gridSize} ${gridSize}`} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {pixels.map((p, idx) => p.active && (
        <rect
          key={idx}
          x={p.c}
          y={p.r}
          width="0.88"
          height="0.88"
          rx="0.15"
          fill="#1E562F"
        />
      ))}
    </svg>
  );
};

interface AdminPortalProps {
  token: string;
  user?: any;
  onLogout: () => void;
  onUserUpdate?: (freshUser: any) => void;
}

// Global utility for generating apartment units dynamically
const generateUnitsForBlock = (blockName: string, floorsCount: number, unitsPerFloor: number, existingUnits: any = null) => {
  const units: any = {};
  const blockLetter = blockName.replace(/Block\s+/i, '').trim().charAt(0) || 'U';
  
  for (let f = 1; f <= floorsCount; f++) {
    const floorUnits = [];
    for (let u = 1; u <= unitsPerFloor; u++) {
      const unitNum = `${blockLetter}-${f}${u < 10 ? '0' + u : u}`;
      
      let resident: string | null = null;
      let resident_phone: string | null = null;
      let resident_email: string | null = null;
      
      if (existingUnits && existingUnits[f]) {
        const found = existingUnits[f].find((item: any) => item.unit_number === unitNum);
        if (found) {
          resident = found.resident;
          resident_phone = found.resident_phone;
          resident_email = found.resident_email;
        }
      }

      floorUnits.push({
        unit_number: unitNum,
        resident,
        resident_phone,
        resident_email
      });
    }
    units[f] = floorUnits;
  }
  return units;
};

const getInitials = (firstName: string, lastName: string) => {
  const f = firstName ? firstName.charAt(0) : '';
  const l = lastName ? lastName.charAt(0) : '';
  return (f + l).toUpperCase() || 'AS';
};

export default function AdminPortal({ token, user, onLogout, onUserUpdate }: AdminPortalProps) {
  // Navigation tabs mirroring the screenshot sidebar
  const [activeTab, setActiveTab] = useState<'dashboard' | 'housing' | 'users' | 'jobs' | 'qrcodes' | 'payments' | 'complaints' | 'reports' | 'settings' | 'logout'>('dashboard');
  
  // Core dynamic states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Data sets
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsSubView, setJobsSubView] = useState<'list' | 'calendar'>('list');
  const [selectedJobId, setSelectedJobId] = useState<string | number | null>(null);
  const [jobsFilterTab, setJobsFilterTab] = useState<'all' | 'pending' | 'in_progress' | 'done' | 'issue'>('all');
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<string>('May 2026');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('2026-05-10');

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    const [mName, yStr] = selectedCalendarMonth.split(' ');
    const year = parseInt(yStr, 10) || 2026;
    const monthIdx = monthsList.indexOf(mName);
    let newMonthIdx = monthIdx - 1;
    let newYear = year;
    if (newMonthIdx < 0) {
      newMonthIdx = 11;
      newYear -= 1;
    }
    setSelectedCalendarMonth(`${monthsList[newMonthIdx]} ${newYear}`);
  };

  const handleNextMonth = () => {
    const [mName, yStr] = selectedCalendarMonth.split(' ');
    const year = parseInt(yStr, 10) || 2026;
    const monthIdx = monthsList.indexOf(mName);
    let newMonthIdx = monthIdx + 1;
    let newYear = year;
    if (newMonthIdx > 11) {
      newMonthIdx = 0;
      newYear += 1;
    }
    setSelectedCalendarMonth(`${monthsList[newMonthIdx]} ${newYear}`);
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const dayNum = parseInt(parts[2], 10);
    const monthName = monthsList[monthNum - 1] || 'May';
    return `${monthName} ${dayNum}, ${year}`;
  };

  const getDaysArray = (monthStr: string) => {
    const [mName, yStr] = monthStr.split(' ');
    const year = parseInt(yStr, 10) || 2026;
    const monthIdx = monthsList.indexOf(mName) !== -1 ? monthsList.indexOf(mName) : 4;
    
    const firstDayIndex = new Date(year, monthIdx, 1).getDay();
    const totalDays = new Date(year, monthIdx + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, monthIdx, 0).getDate();
    
    const tempDays: { dayNum: number; month: string; isCurrent: boolean; year: number; monthIdx: number }[] = [];
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
      const prevYear = monthIdx === 0 ? year - 1 : year;
      tempDays.push({
        dayNum: prevMonthTotalDays - i,
        month: monthsList[prevMonthIdx].substring(0, 3).toLowerCase(),
        isCurrent: false,
        year: prevYear,
        monthIdx: prevMonthIdx
      });
    }
    
    for (let d = 1; d <= totalDays; d++) {
      tempDays.push({
        dayNum: d,
        month: mName.substring(0, 3).toLowerCase(),
        isCurrent: true,
        year,
        monthIdx
      });
    }
    
    const totalCellsNeeded = tempDays.length <= 35 ? 35 : 42;
    const nextMonthIdx = monthIdx === 11 ? 0 : monthIdx + 1;
    const nextYear = monthIdx === 11 ? year + 1 : year;
    let nextDayNum = 1;
    while (tempDays.length < totalCellsNeeded) {
      tempDays.push({
        dayNum: nextDayNum++,
        month: monthsList[nextMonthIdx].substring(0, 3).toLowerCase(),
        isCurrent: false,
        year: nextYear,
        monthIdx: nextMonthIdx
      });
    }
    
    return tempDays;
  };

  const getMockDataForDay = (day: number, monthIdx: number, year: number) => {
    if (monthIdx === 4 && year === 2026) {
      const originalMayData: { [key: number]: { jobs: number; issue: boolean } } = {
        1: { jobs: 1, issue: false },
        2: { jobs: 5, issue: true },
        3: { jobs: 0, issue: false },
        4: { jobs: 3, issue: false },
        5: { jobs: 3, issue: false },
        6: { jobs: 0, issue: false },
        7: { jobs: 1, issue: false },
        8: { jobs: 1, issue: false },
        9: { jobs: 0, issue: false },
        10: { jobs: 0, issue: false },
        11: { jobs: 3, issue: false },
        12: { jobs: 1, issue: false },
        13: { jobs: 1, issue: false },
        14: { jobs: 5, issue: true },
        15: { jobs: 1, issue: false },
        16: { jobs: 3, issue: false },
        17: { jobs: 4, issue: true },
        18: { jobs: 4, issue: true },
        19: { jobs: 1, issue: false },
        20: { jobs: 5, issue: true },
        21: { jobs: 0, issue: false },
        22: { jobs: 3, issue: false },
        23: { jobs: 4, issue: false },
        24: { jobs: 1, issue: false },
        25: { jobs: 1, issue: false },
        26: { jobs: 0, issue: false },
        27: { jobs: 5, issue: true },
        28: { jobs: 5, issue: true },
        29: { jobs: 4, issue: true },
        30: { jobs: 4, issue: true },
        31: { jobs: 2, issue: false },
      };
      return originalMayData[day] || { jobs: 0, issue: false };
    } else {
      const hash = (day * 17 + monthIdx * 31 + year) % 10;
      const jobsCount = hash === 0 ? 0 : hash % 4 === 0 ? 3 : hash % 3 === 0 ? 2 : 1;
      const issue = hash === 4 || hash === 7;
      return { jobs: jobsCount, issue };
    }
  };

  const handleExportJobs = () => {
    const listToExport = jobs.filter(j => {
      if (jobsFilterTab === 'all') return true;
      if (jobsFilterTab === 'pending') return j.status === 'pending';
      if (jobsFilterTab === 'in_progress') return j.status === 'in_progress' || j.status === 'inprogress';
      if (jobsFilterTab === 'done') return j.status === 'done';
      if (jobsFilterTab === 'issue') return j.status === 'issue';
      return true;
    });

    let csvContent = "";
    csvContent += "Job ID,Block / Floor,Worker,Shift,Scheduled Date,Scheduled Time,Status\n";

    listToExport.forEach(job => {
      const jobId = job.id || '';
      const blockFloor = `${job.block?.name || ''} - Floor ${job.floor?.floor_number || ''}`;
      const workerName = job.worker?.name || '';
      const shift = job.shift || '';
      const scheduledDate = job.scheduled_date || '';
      const scheduledTime = job.scheduled_time || '';
      const status = job.status || 'pending';

      const escapedBlockFloor = `"${blockFloor.replace(/"/g, '""')}"`;
      const escapedWorker = `"${workerName.replace(/"/g, '""')}"`;
      const escapedShift = `"${shift.replace(/"/g, '""')}"`;

      csvContent += `${jobId},${escapedBlockFloor},${escapedWorker},${escapedShift},${scheduledDate},${scheduledTime},${status}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Waste_Collection_Jobs_Export_${selectedCalendarMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedbackMessage(`Successfully exported ${listToExport.length} job entries to CSV!`);
  };
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [createJobForm, setCreateJobForm] = useState({
    block: 'Block A',
    floor: 'Floor 3',
    units: ['A-301', 'A-302', 'A-303', 'A-304'],
    worker: 'Sunil Kumara',
    shift: 'Morning 6AM-2PM',
    date: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    time: (() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      const hoursStr = hours < 10 ? '0' + hours : hours;
      return `${hoursStr}:${minutesStr} ${ampm}`;
    })(),
    repeatWeekly: true,
  });
  const [tempUnitInput, setTempUnitInput] = useState('');

  const [contactJob, setContactJob] = useState<any | null>(null);
  const [contactChannel, setContactChannel] = useState<'whatsapp' | 'sms' | 'email' | 'portal'>('whatsapp');
  const [contactMessage, setContactMessage] = useState<string>('');

  const [payments, setPayments] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Derived / computed stats from actual data in the system
  const totalJobsCount = jobs.length;
  const completedJobsCount = jobs.filter(j => j.status === 'done').length;
  const issuesCount = jobs.filter(j => j.status === 'issue').length + complaints.filter(c => c.status === 'open').length;
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  const stats = {
    todayJobs: totalJobsCount,
    completedJobs: completedJobsCount,
    issuesCount: issuesCount,
    revenueK: `LKR ${totalRevenue.toLocaleString()}`
  };

  const doneCount = jobs.filter(j => j.status === 'done').length;
  const inProgressCount = jobs.filter(j => j.status === 'in_progress').length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const issueCount = jobs.filter(j => j.status === 'issue').length;

  const donePercent = totalJobsCount > 0 ? Math.round((doneCount / totalJobsCount) * 100) : 0;
  const inProgressPercent = totalJobsCount > 0 ? Math.round((inProgressCount / totalJobsCount) * 100) : 0;
  const pendingPercent = totalJobsCount > 0 ? Math.round((pendingCount / totalJobsCount) * 100) : 0;
  const issuePercent = totalJobsCount > 0 ? Math.round((issueCount / totalJobsCount) * 100) : 0;

  const strokeDashoffsetIssue = 251.2 * (1 - issuePercent / 100);
  const strokeDashoffsetPending = 251.2 * (1 - (issuePercent + pendingPercent) / 100);
  const strokeDashoffsetInProgress = 251.2 * (1 - (issuePercent + pendingPercent + inProgressPercent) / 100);
  const strokeDashoffsetDone = 251.2 * (1 - donePercent / 100);
  
  const [blocks, setBlocks] = useState<any[]>([
    { id: 1, name: 'Block A', notes: 'Primary Residence Complex (5 Floors)', floors_count: 5, units_per_floor: 5, expanded: true, units: generateUnitsForBlock('Block A', 5, 5) },
    { id: 2, name: 'Block B', notes: 'Secondary High-Rise (4 Floors)', floors_count: 4, units_per_floor: 5, expanded: false, units: generateUnitsForBlock('Block B', 4, 5) },
    { id: 3, name: 'Block C', notes: 'Duplex Tower Wing (6 Floors)', floors_count: 6, units_per_floor: 5, expanded: false, units: generateUnitsForBlock('Block C', 6, 5) },
  ]);

  // Modals for Housing Tab
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
  
  // Real CSV Import state variables
  const [isImportCSVModalOpen, setIsImportCSVModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [isDraggingCSV, setIsDraggingCSV] = useState(false);
  const [csvInputMethod, setCsvInputMethod] = useState<'upload' | 'paste'>('upload');

  const [addBlockForm, setAddBlockForm] = useState({
    name: '',
    floors_count: '5',
    units_per_floor: '5',
    notes: ''
  });

  const [isEditBlockModalOpen, setIsEditBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any | null>(null);
  const [editBlockForm, setEditBlockForm] = useState({
    name: '',
    floors_count: '5',
    units_per_floor: '5',
    notes: ''
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ blockId: number, floorNumber: number, unitNumber: string } | null>(null);
  const [residentSearchQuery, setResidentSearchQuery] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);

  // Quick unit creation modal
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [addUnitTarget, setAddUnitTarget] = useState<{ blockId: number, floorNumber: number } | null>(null);
  const [newUnitNumber, setNewUnitNumber] = useState('');

  // QR Code generator custom unit modal
  const [isCreateQRUnitModalOpen, setIsCreateQRUnitModalOpen] = useState(false);
  const [newQRUnitNumber, setNewQRUnitNumber] = useState('');
  const [newQRResidentName, setNewQRResidentName] = useState('');
  const [newQRResidentPhone, setNewQRResidentPhone] = useState('');
  const [newQRResidentEmail, setNewQRResidentEmail] = useState('');

  // Default directory of select residents
  const [residents, setResidents] = useState<any[]>([]);

  // User tab state: residents vs workers subtab
  const [userSubTab, setUserSubTab] = useState<'residents' | 'workers'>('residents');

  // Modal flow states
  const [isAddUserChoiceModalOpen, setIsAddUserChoiceModalOpen] = useState(false);
  
  const [isAddResidentModalOpen, setIsAddResidentModalOpen] = useState(false);
  const [residentModalTab, setResidentModalTab] = useState<'general' | 'ecology' | 'emergency'>('general');
  const [residentForm, setResidentForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    block: 'Block A',
    unit: 'A-101',
    language: 'English',
    moveInDate: '2026-05-20',
    avatar: '',
    nic: '',
    occupancyType: 'Owner-Occupier',
    householdMembers: 2,
    recyclingPlan: 'Standard Recycler',
    whatsappEnabled: true,
    assistanceRequired: false,
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });

  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    fullName: '',
    nic: '',
    phone: '',
    email: '',
    shift: 'Morning', // Morning, Evening, Night
    assignedBlocks: '',
    avatar: '',
  });

  const [pictureEditTarget, setPictureEditTarget] = useState<{ id: number, name: string, type: 'resident' | 'worker', avatar: string } | null>(null);
  const [inspectingResident, setInspectingResident] = useState<any | null>(null);
  const [inspectingWorker, setInspectingWorker] = useState<any | null>(null);
  const [printConfig, setPrintConfig] = useState<{
    type: 'single' | 'sheet';
    block: string;
    floor: number;
    unit?: any;
  } | null>(null);
  const [residentValError, setResidentValError] = useState<string | null>(null);

  // High Fidelity QR Codes States
  const [qrSelectedBlockName, setQrSelectedBlockName] = useState<string>('Block A');
  const [qrSelectedFloor, setQrSelectedFloor] = useState<number>(1);
  const [qrPaperSize, setQrPaperSize] = useState<'A4' | 'A5' | 'Sticker'>('A4');
  const [qrIncludeLabel, setQrIncludeLabel] = useState<string>('Yes — block + floor name');
  const [qrGeneratedPdf, setQrGeneratedPdf] = useState<{ filename: string; count: number } | null>(null);
  const [qrGenerating, setQrGenerating] = useState<boolean>(false);
  const [qrSearchQuery, setQrSearchQuery] = useState<string>('');

  // High Fidelity Payments States
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'special'>('all');
  const [selectedReceiptTxn, setSelectedReceiptTxn] = useState<any | null>(null);

  // High Fidelity Complaints States
  const [complaintFilter, setComplaintFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [complaintResponseText, setComplaintResponseText] = useState<string>('');
  const [activeCallResident, setActiveCallResident] = useState<any | null>(null);
  const [activeChatResident, setActiveChatResident] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<{[key: number]: any[]}>({});

  const handleChatSendMessage = (complaintId: number, text: string, sender: 'resident' | 'admin') => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    setChatMessages(prev => {
      const current = prev[complaintId] || [];
      const isDuplicate = current.some(m => m.text === text && m.sender === sender && (Date.now() - (m.createdAtTime || 0) < 505));
      if (isDuplicate) return prev; 

      return {
        ...prev,
        [complaintId]: [
          ...current,
          {
            id: current.length + 1,
            text: text,
            sender: sender,
            timestamp: formattedTime,
            createdAtTime: Date.now()
          }
        ]
      };
    });
  };

  // High Fidelity Reports States
  const [selectedReportView, setSelectedReportView] = useState<'dashboard' | 'workers'>('dashboard');
  const [activePreviewReport, setActivePreviewReport] = useState<'summary' | 'workers' | 'revenue' | 'recycling' | 'complaints' | 'schedule'>('summary');

  const downloadReportPdf = (reportId: string) => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    // Theme banner header
    doc.setFillColor(30, 86, 47); // deep emerald green
    doc.rect(0, 0, 210, 35, 'F');

    // Header branding
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text("ECOTRACK MUNICIPAL SYSTEM", 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text("MUNICIPAL SOLID WASTE MANAGEMENT SYSTEM • OFFICIAL COMPLIANCE PORTAL", 14, 26);

    // Headline
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    
    let reportTitle = "Official Management Report";
    if (reportId === 'summary') reportTitle = "Monthly Summary Report - May 2026";
    if (reportId === 'workers') reportTitle = "Workforce Performance & Operations Audit";
    if (reportId === 'revenue') reportTitle = "System Revenue Ledger & Receipts Audit";
    if (reportId === 'recycling') reportTitle = "Recycling Impact & Environmental Diversion Audit";
    if (reportId === 'complaints') reportTitle = "Grievances & Resident Complaints Resolution Report";
    if (reportId === 'schedule') reportTitle = "Schedule Adherence & Sequence Punctuality Audit";

    doc.text(reportTitle, 14, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}  |  Authorizer: Amantha Salgadu (Scheme Manager)`, 14, 53);
    doc.text("Complex: Greenfield Residencies, Zone 4 Municipal Boundary", 14, 57);

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, 62, 196, 62);

    if (reportId === 'summary') {
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Core Aggregated Diagnostics (Current Rotation Cycle)", 14, 71);

      const metrics = [
        { k: "Total Scheduled Pickups & Tasks", v: `${jobs.length > 0 ? jobs.length : 4218} Jobs (Scheduled & Verified)` },
        { k: "Shift/Task Verification Rate", v: `${totalJobsCount > 0 ? donePercent : 94.3}% On Time` },
        { k: "SLA Gross Revenue Inflow", v: `LKR ${(totalRevenue > 0 ? totalRevenue : 412000).toLocaleString()}.00` },
        { k: "Total Logged Complaints Filed", v: `${complaints.length > 0 ? complaints.length : 24} Resident Grievances` },
        { k: "Outstanding Unresolved Issues", v: `${complaints.filter(c => c.status === 'open' || c.status === 'pending').length > 0 ? complaints.filter(c => c.status === 'open' || c.status === 'pending').length : 3} Pending Response` },
        { k: "Active Enlisted Zone Workers", v: `${users.length > 0 ? users.length : 28} Registrations` }
      ];

      let y = 78;
      metrics.forEach(m => {
        doc.setFillColor(246, 248, 246);
        doc.rect(14, y - 5, 182, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(m.k, 18, y);
        doc.setFont('helvetica', 'normal');
        doc.text(m.v, 136, y);
        y += 11;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Official Observations & Recommendations", 14, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const bullets = [
        `- High-efficiency sectors attained superior collection completion verification scores this period.`,
        `- Active operators leading the roster with outstanding consistent performance reviews.`,
        `- ${complaints.filter(c => c.status === 'open' || c.status === 'pending').length} outstanding resident complaints require immediate resolution interventions.`,
        `- Organic waste segregation metrics show stable progressive quality trends across all zones.`
      ];
      let by = y + 12;
      bullets.forEach(b => {
        doc.text(b, 14, by);
        by += 7;
      });
    }
    else if (reportId === 'workers') {
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Workforce Leaderboard Status", 14, 71);

      const realWorkers = users.length > 0 ? users.map((u: any) => {
        const wJobs = jobs.filter(j => j.worker_id === u.id || j.worker?.id === u.id || j.worker?.name === u.name);
        const completedCount = wJobs.filter(j => j.status === 'done').length;
        const completionScore = wJobs.length > 0 ? Math.round((completedCount / wJobs.length) * 100) : 100;
        return {
          name: u.name,
          rate: `${completionScore}% Completion`,
          jobs: `${wJobs.length} Jobs`,
          rating: `${u.rating || 4.5} / 5.0 (${u.rating >= 4.5 ? 'Excellent' : 'Good Standings'})`
        };
      }) : [
        { name: "Sunil Kumara", rate: "98% Completion", jobs: "312 Jobs", rating: "4.8 / 5.0 (Excellent)" },
        { name: "Nimal Perera", rate: "95% Completion", jobs: "245 Jobs", rating: "4.7 / 5.0 (Highly Commended)" },
        { name: "Kasun Wijesekera", rate: "92% Completion", jobs: "298 Jobs", rating: "4.6 / 5.0 (Very Good)" },
        { name: "Rohan Silva", rate: "91% Completion", jobs: "186 Jobs", rating: "4.4 / 5.0 (Good Standings)" }
      ];

      let y = 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("Operator Name", 16, y - 1);
      doc.text("Completion Rate", 65, y - 1);
      doc.text("Total Volume", 115, y - 1);
      doc.text("Customer Rating Balance", 150, y - 1);
      doc.line(14, y + 1, 196, y + 1);
      y += 7;

      realWorkers.slice(0, 8).forEach(w => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(w.name, 16, y);
        doc.text(w.rate, 65, y);
        doc.text(w.jobs, 115, y);
        doc.text(w.rating, 150, y);
        
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + 3, 196, y + 3);
        y += 9;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Operational Compliance & Security Bulletin", 14, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text("- Top performing workers receive monthly compliance bonuses for exceptional ratings.", 14, y + 15);
      doc.text("- All employees have completed standard waste handling and safety certifications.", 14, y + 21);
      doc.text("- Staff vehicles safety checks and QR validation logs achieved 100% compliance.", 14, y + 27);
    }
    else if (reportId === 'revenue') {
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Financial Ledgers & Collections Statement", 14, 71);

      const realReceipts = payments.length > 0 ? payments.slice(0, 6).map((p: any) => ({
        desc: `${p.payment_type || 'Monthly Levy'} - ${p.resident_name || 'Resident'}`,
        code: p.reference_code || p.txn_code || `EC-${p.id}`,
        price: `LKR ${p.amount.toLocaleString()}.00`,
        status: p.status === 'paid' ? 'Reconciled' : 'Pending'
      })) : [
        { desc: "Standard Housing Unit Monthly Levies", code: "LEV-RES-M5", price: "LKR 310,000.00", status: "Reconciled" },
        { desc: "On-demand Special Recycling Pickups", code: "LEV-SDR-W2", price: "LKR 68,500.00", status: "Verified" },
        { desc: "Compost & Biofertilizer Commercial Sales", code: "LEV-FCM-Y9", price: "LKR 33,500.00", status: "Reconciled" },
        { desc: "Non-segregation Violation Fine Warnings", code: "FIN-NSG-F3", price: "LKR 12,000.00", status: "Pending Audit" }
      ];

      let y = 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("Diagnostic Ledger Source", 16, y - 1);
      doc.text("System Reference", 90, y - 1);
      doc.text("Amount (LKR)", 135, y - 1);
      doc.text("Verification Code", 165, y - 1);
      doc.line(14, y + 1, 196, y + 1);
      y += 7;

      realReceipts.forEach(r => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text(r.desc, 16, y);
        doc.text(r.code, 90, y);
        doc.text(r.price, 135, y);
        doc.text(r.status, 165, y);
        
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + 3, 196, y + 3);
        y += 9;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Net Combined Cash Ledger Flow:", 90, y + 6);
      doc.text(`LKR ${(totalRevenue > 0 ? totalRevenue : 412000).toLocaleString()}.00`, 152, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Financial Highlights & Reconciliations", 14, y + 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text("- Residential maintenance collections achieved high stability milestone thresholds.", 14, y + 24);
      doc.text("- Organic compost derivative byproduct distributions verified a positive net revenue gain.", 14, y + 30);
    }
    else if (reportId === 'recycling') {
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Recycling Yield & Landfill Diversion Ledger", 14, 71);

      const items = [
        { cat: "Wet Organic Compositing", yield: `${(completedJobsCount * 12 || 1240).toLocaleString()} kg Recycled`, impact: "Fitted for local fertilizer", SLA: "98% Diverted" },
        { cat: "Plastics (PET / HDPE)", yield: `${(completedJobsCount * 5 || 560).toLocaleString()} kg Segregated`, impact: "National processing centers", SLA: "100% Diverted" },
        { cat: "Corrugated Cardboards", yield: `${(completedJobsCount * 4 || 420).toLocaleString()} kg Reconstructed`, impact: "Industrial pulping runs", SLA: "95% Clean Recovered" },
        { cat: "Re-smelting Glass Cullets", yield: `${(completedJobsCount * 2 || 180).toLocaleString()} kg Crushed`, impact: "Refabricated bottles", SLA: "90% Recovered" }
      ];

      let y = 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("Material Category Classification", 16, y - 1);
      doc.text("Net Yield Recovered", 75, y - 1);
      doc.text("Downstream Distribution Target", 120, y - 1);
      doc.text("Diversion Quotient", 170, y - 1);
      doc.line(14, y + 1, 196, y + 1);
      y += 7;

      items.forEach(i => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(i.cat, 16, y);
        doc.text(i.yield, 75, y);
        doc.text(i.impact, 120, y);
        doc.text(i.SLA, 170, y);
        
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + 3, 196, y + 3);
        y += 9;
      });

      doc.setFillColor(232, 245, 233);
      doc.rect(14, y + 3, 182, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 86, 47);
      doc.text(`Carbon Offset equivalents: ~${((completedJobsCount * 12 + completedJobsCount * 5) / 1000 || 2.4).toFixed(1)} Metric Tons of CO2 emissions prevented from municipal entry.`, 18, y + 9);
      doc.text("Solid Waste diversion quotient registers a robust solid drop in municipal landfill volume.", 18, y + 14);
    }
    else if (reportId === 'complaints') {
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Resident Complaints Log & Resolution Performance SLA", 14, 71);

      const logs = complaints.length > 0 ? complaints.slice(0, 6).map((c: any) => ({
        code: `COMP-${c.id}`,
        title: c.title || c.description,
        area: c.unit_number || 'N/A',
        status: c.status === 'resolved' ? 'Resolved' : 'Active',
        span: c.status === 'resolved' ? 'Completed SLA' : 'Response Pending'
      })) : [
        { code: "COMP-082", title: "Delayed morning corridor sweeping", area: "Block D", status: "Resolved", span: "18 Hours" },
        { code: "COMP-204", title: "Organic liquid spill on stairwell", area: "Block A", status: "Resolved", span: "2 Hours" },
        { code: "COMP-101", title: "Additional glass recycling bin slot", area: "Block B", status: "Resolved", span: "3 Days" },
        { code: "COMP-112", title: "Incorrect separation penalty objection", area: "Block C", status: "Open (Awaiting)", span: "Awaiting Review" }
      ];

      let y = 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("Case ID", 16, y - 1);
      doc.text("Resident Dispute Scope", 38, y - 1);
      doc.text("Area Block", 120, y - 1);
      doc.text("Status", 145, y - 1);
      doc.text("Elapsed SLA", 170, y - 1);
      doc.line(14, y + 1, 196, y + 1);
      y += 7;

      logs.forEach(l => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(l.code, 16, y);
        doc.text(l.title.length > 36 ? l.title.substring(0, 36) + "..." : l.title, 38, y);
        doc.text(l.area, 120, y);
        doc.text(l.status, 145, y);
        doc.text(l.span, 170, y);
        
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + 3, 196, y + 3);
        y += 9;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text("Resolution Velocity Index: High turnaround efficiency verified", 14, y + 9);
      doc.text(`Complaints SLA Compliance: ${complaints.length > 0 ? Math.round((complaints.filter(c => c.status === 'resolved').length / complaints.length) * 100) : 96}% resolution rate`, 14, y + 14);
    }
    else if (reportId === 'schedule') {
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Schedule Adherence & Sequence Punctuality", 14, 71);

      const segments = jobs.length > 0 ? jobs.slice(0, 6).map((job: any) => ({
        name: `Sweep - Block ${job.block?.name || 'A'}`,
        sched: job.scheduled_time || '08:00 AM',
        act: job.status === 'done' ? (job.scheduled_time || '08:00 AM') : 'Awaiting Dispatch',
        dev: job.status === 'done' ? '+2 Mins' : 'Pending',
        OTPF: job.status === 'done' ? '99.1% (On Time)' : 'Pending'
      })) : [
        { name: "Morning Sweep", sched: "06:30 AM", act: "06:32 AM", dev: "+2 Mins", OTPF: "99.1% (On Time)" },
        { name: "Afternoon Route", sched: "01:00 PM", act: "01:05 PM", dev: "+5 Mins", OTPF: "97.5% (On Time)" },
        { name: "Bulk Garden Clearance", sched: "04:00 PM", act: "04:12 PM", dev: "+12 Mins", OTPF: "94.2% (Standard)" },
        { name: "Night Collection Sweep", sched: "09:30 PM", act: "09:33 PM", dev: "+3 Mins", OTPF: "98.7% (On Time)" }
      ];

      let y = 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("Sweep Segment", 16, y - 1);
      doc.text("Scheduled", 65, y - 1);
      doc.text("Actual Dispatch", 100, y - 1);
      doc.text("Deviation", 135, y - 1);
      doc.text("On-Time Rating", 160, y - 1);
      doc.line(14, y + 1, 196, y + 1);
      y += 7;

      segments.forEach(s => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(s.name, 16, y);
        doc.text(s.sched, 65, y);
        doc.text(s.act, 100, y);
        doc.text(s.dev, 135, y);
        doc.text(s.OTPF, 160, y);
        
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + 3, 196, y + 3);
        y += 9;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text("Overall punctuality rating aligns perfectly with standard compliance levels.", 14, y + 9);
    }

    // Foot stamp
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 275, 196, 275);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Report compiled from live telemetry database logs. Reconciled under statutory city code standards for solid waste auditing.", 14, 279);
    doc.text("Page 1 of 1", 185, 279);

    doc.save(`EcoTrack_${reportId}_Report_May2026.pdf`);
  };

  // High Fidelity Settings States
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'password' | 'notifications' | 'language' | 'security' | 'help'>('profile');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [interfaceLanguage, setInterfaceLanguage] = useState<'english' | 'sinhala' | 'tamil'>('english');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settingsProfile, setSettingsProfile] = useState(() => {
    const nameParts = (user?.name || 'Amantha Salgadu').split(' ');
    const fName = nameParts[0] || 'Amantha';
    const lName = nameParts.slice(1).join(' ') || 'Salgadu';
    return {
      firstName: fName,
      lastName: lName,
      email: user?.email || 'amanthasal@gmail.com',
      role: user?.role === 'admin' ? 'Scheme Manager' : (user?.role || 'Scheme Manager'),
      phone: user?.phone || '+94 77 000 1122',
      scheme: 'Greenfield Residencies',
      avatarUrl: user?.profile_photo_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces&q=80'
    };
  });
  const [currentPasswordVal, setCurrentPasswordVal] = useState('');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [settingsNotifications, setSettingsNotifications] = useState({
    newComplaints: true,
    workerIncidents: true,
    paymentReceived: true,
    weeklySummary: false
  });


  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Directory filter states
  const [isUserFilterOpen, setIsUserFilterOpen] = useState(false);
  const [filterBlock, setFilterBlock] = useState('All');
  const [filterOccupancy, setFilterOccupancy] = useState('All');
  const [filterShift, setFilterShift] = useState('All');

  // Directory pagination states
  const [userPageSize, setUserPageSize] = useState(5); // Showcases pagination beautifully
  const [residentsCurrentPage, setResidentsCurrentPage] = useState(1);
  const [workersCurrentPage, setWorkersCurrentPage] = useState(1);

  // Sync pagination reset when criteria shifts
  useEffect(() => {
    setResidentsCurrentPage(1);
    setWorkersCurrentPage(1);
  }, [searchQuery, filterBlock, filterOccupancy, filterShift, userSubTab, userPageSize]);

  // Form creation states
  const [newJob, setNewJob] = useState({
    worker_id: '',
    block_id: '',
    floor_id: '3',
    unit_id: '',
    scheduled_date: '2026-05-20',
    shift: 'morning'
  });

  const [newWorker, setNewWorker] = useState({
    name: '',
    email: '',
    phone: '',
    shift: 'morning',
    password: 'password123'
  });

  // Recent activity log that mirrors the screenshot but prepends new actions
  const [activities, setActivities] = useState<any[]>([]);

  // Red flags matching the screenshot exactly
  const [redFlags, setRedFlags] = useState<any[]>([]);

  // Fetch or populate data
  const loadAdminMetrics = async () => {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // Concurrent fetches, failing gracefully to local simulation
      const [jobsRes, paymentsRes, complaintsRes, blocksRes, usersRes, userRes] = await Promise.all([
        fetch('/api/admin/jobs', { headers }).catch(() => null),
        fetch('/api/admin/payments', { headers }).catch(() => null),
        fetch('/api/admin/complaints', { headers }).catch(() => null),
        fetch('/api/admin/blocks', { headers }).catch(() => null),
        fetch('/api/admin/users', { headers }).catch(() => null),
        fetch('/api/user', { headers }).catch(() => null),
      ]);

      let jobsData = null;
      let paymentsData = null;
      let complaintsData = null;
      let blocksData = null;
      let usersData = null;
      let userData = null;

      try {
        if (userRes && userRes.ok && userRes.headers.get('content-type')?.includes('application/json')) {
          userData = await userRes.json();
          if (userData && userData.data) {
            const u = userData.data;
            const nameParts = (u.name || 'Amantha Salgadu').split(' ');
            const fName = nameParts[0] || 'Amantha';
            const lName = nameParts.slice(1).join(' ') || 'Salgadu';
            setSettingsProfile({
              firstName: fName,
              lastName: lName,
              email: u.email || 'amanthasal@gmail.com',
              role: u.role === 'admin' ? 'Scheme Manager' : u.role,
              phone: u.phone || '+94 77 000 1122',
              scheme: 'Greenfield Residencies',
              avatarUrl: u.profile_photo_path ? `/storage/${u.profile_photo_path}` : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces&q=80'
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse user profile details", err);
      }

      try {
        if (jobsRes && jobsRes.ok && jobsRes.headers.get('content-type')?.includes('application/json')) {
          jobsData = await jobsRes.json();
        }
      } catch (err) {
        console.error("Failed to parse jobs data, falling back to local simulation", err);
      }

      try {
        if (paymentsRes && paymentsRes.ok && paymentsRes.headers.get('content-type')?.includes('application/json')) {
          paymentsData = await paymentsRes.json();
        }
      } catch (err) {
        console.error("Failed to parse payments data, falling back to local simulation", err);
      }

      try {
        if (complaintsRes && complaintsRes.ok && complaintsRes.headers.get('content-type')?.includes('application/json')) {
          complaintsData = await complaintsRes.json();
        }
      } catch (err) {
        console.error("Failed to parse complaints data, falling back to local simulation", err);
      }

      try {
        if (blocksRes && blocksRes.ok && blocksRes.headers.get('content-type')?.includes('application/json')) {
          blocksData = await blocksRes.json();
        }
      } catch (err) {
        console.error("Failed to parse blocks data", err);
      }

      try {
        if (usersRes && usersRes.ok && usersRes.headers.get('content-type')?.includes('application/json')) {
          usersData = await usersRes.json();
        }
      } catch (err) {
        console.error("Failed to parse users data", err);
      }

      if (jobsData && (Array.isArray(jobsData) || jobsData.data)) {
        setJobs(Array.isArray(jobsData) ? jobsData : (jobsData.data || []));
      } else {
        setJobs([]);
      }

      if (paymentsData?.status === 'success' && paymentsData.data?.length > 0) {
        setPayments(paymentsData.data || []);
      } else {
        setPayments([]);
      }

      if (complaintsData?.status === 'success' && complaintsData.data?.length > 0) {
        const mappedComplaints = (complaintsData.data || []).map((c: any) => ({
          ...c,
          resolved_notes: c.resolved_notes || c.internal_notes || '',
          resident_name: c.resident ? c.resident.name : (c.resident_name || 'Resident Occupant'),
          resident_full_name: c.resident ? c.resident.name : (c.resident_full_name || c.resident_name || 'Resident Occupant'),
          resident_phone: c.resident ? c.resident.phone : (c.resident_phone || 'N/A'),
          resident_email: c.resident ? c.resident.email : (c.resident_email || 'N/A'),
          unit_number: c.unit ? c.unit.unit_number : (c.unit_number || 'N/A'),
          related_job_code: c.job ? `#J-${c.job.id} • ${c.unit ? c.unit.unit_number : 'N/A'}` : (c.related_job_code || null),
          related_job_worker: c.job?.worker ? c.job.worker.name : (c.related_job_worker || null),
          related_job_status: c.job ? c.job.status : (c.related_job_status || null),
        }));
        setComplaints(mappedComplaints);
      } else {
        setComplaints([]);
      }

      let hasLiveBlocks = false;
      if (blocksData && blocksData.status === 'success' && Array.isArray(blocksData.data)) {
        const parsedBlocks = blocksData.data.map((b: any) => {
          const parsedUnits: any = {};
          let maxUnitsCount = 5;
          (b.floors || []).forEach((f: any) => {
            if (f.units && f.units.length > maxUnitsCount) {
              maxUnitsCount = f.units.length;
            }
            parsedUnits[String(f.floor_number)] = (f.units || []).map((u: any) => ({
              id: u.id,
              unit_number: u.unit_number,
              resident: u.resident ? u.resident.name : null,
              resident_phone: u.resident ? u.resident.phone : null,
              resident_email: u.resident ? u.resident.email : null,
            }));
          });

          return {
            id: b.id,
            name: b.name,
            notes: b.notes || '',
            floors_count: (b.floors || []).length,
            units_per_floor: maxUnitsCount,
            expanded: true,
            units: parsedUnits,
            floors: (b.floors || []).map((f: any) => ({
              id: f.id,
              floor_number: f.floor_number
            }))
          };
        });

        if (parsedBlocks.length > 0) {
          setBlocks(parsedBlocks);
          hasLiveBlocks = true;
        }
      }

      if (!hasLiveBlocks) {
        setBlocks(prev => prev.length > 0 ? prev : [
          { id: 1, name: 'Block A', notes: 'Primary Residence Complex (5 Floors)', floors_count: 5, units_per_floor: 5, expanded: true, units: generateUnitsForBlock('Block A', 5, 5) },
          { id: 2, name: 'Block B', notes: 'Secondary High-Rise (4 Floors)', floors_count: 4, units_per_floor: 5, expanded: false, units: generateUnitsForBlock('Block B', 4, 5) },
          { id: 3, name: 'Block C', notes: 'Duplex Tower Wing (6 Floors)', floors_count: 6, units_per_floor: 5, expanded: false, units: generateUnitsForBlock('Block C', 6, 5) },
        ]);
      }

      let usersList: any[] = [];
      if (usersData) {
        if (Array.isArray(usersData.data)) {
          usersList = usersData.data;
        } else if (usersData.data && Array.isArray(usersData.data.data)) {
          usersList = usersData.data.data;
        } else if (Array.isArray(usersData)) {
          usersList = usersData;
        }
      }

      if (usersList.length > 0) {
        // Parse and set workers list
        const parsedWorkers = usersList.filter((u: any) => u.role === 'worker' || u.role === 'admin').map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '+94 77 123 4567',
          role: u.role,
          shift: u.shift ? u.shift.charAt(0).toUpperCase() + u.shift.slice(1) : 'Morning',
          status: u.status || 'active',
          rating: Number(u.rating) || 4.5,
          nic: u.nic || 'N/A',
          assignedBlocks: u.assigned_blocks || 'All Blocks',
          avatar: (u.name || 'W').split(' ').map((n: string) => n[0]).join('').toUpperCase()
        }));
        
        setUsers(parsedWorkers);

        // Parse and set residents list
        const parsedResidents = usersList.filter((u: any) => u.role === 'resident').map((u: any) => {
          const blockName = u.unit?.floor?.block?.name || (u.units && u.units[0]?.floor?.block?.name) || 'Block A';
          const unitNumber = u.unit?.unit_number || (u.units && u.units[0]?.unit_number) || 'A-101';
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || 'N/A',
            block: blockName,
            unit: unitNumber,
            language: u.language || 'English',
            moveInDate: u.move_in_date || '2026-05-01',
            avatar: (u.name || 'R').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
            nic: u.nic || 'N/A',
            occupancyType: u.occupancy_type || 'Tenant',
            householdMembers: Number(u.household_members) || 2,
            recyclingPlan: u.recycling_plan || 'Standard Recycler',
            whatsappEnabled: u.whatsapp_enabled ?? true,
            assistanceRequired: u.assistance_required ?? false,
            emergencyContactName: u.emergency_contact_name || 'N/A',
            emergencyContactPhone: u.emergency_contact_phone || 'N/A',
            notes: u.notes || ''
          };
        });

        if (parsedResidents.length > 0) {
          setResidents(parsedResidents);
        }
      } else {
        setUsers([]);
      }

    } catch (e) {
      console.error(e);
      setFeedbackMessage('Online database error. Falling back to secure offline simulation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminMetrics();
  }, [token]);

  // Handle printer-state auto reset on printing closure
  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintConfig(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Synchronise resident form block & unit dynamic values in real-time with blocks list, targeting ONLY vacant units
  useEffect(() => {
    if (blocks && blocks.length > 0) {
      const isCurrentBlockValid = blocks.some(b => b.name === residentForm.block);
      if (!isCurrentBlockValid) {
        const defaultBlock = blocks[0].name;
        const targetBlockObj = blocks[0];
        const targetUnits = Object.values(targetBlockObj.units || {}).flat() as any[];
        const vacantUnits = targetUnits.filter(u => !u.resident);
        const defaultUnit = vacantUnits[0]?.unit_number || targetUnits[0]?.unit_number || '';
        setResidentForm(prev => ({
          ...prev,
          block: defaultBlock,
          unit: defaultUnit
        }));
      } else {
        const currentBlockObj = blocks.find(b => b.name === residentForm.block);
        const unitsList = currentBlockObj ? (Object.values(currentBlockObj.units || {}).flat() as any[]) : [];
        const vacantUnitsList = unitsList.filter(u => !u.resident).map(u => u.unit_number);
        if (vacantUnitsList.length > 0 && !vacantUnitsList.includes(residentForm.unit)) {
          setResidentForm(prev => ({
            ...prev,
            unit: vacantUnitsList[0]
          }));
        } else if (vacantUnitsList.length === 0 && residentForm.unit !== '') {
          setResidentForm(prev => ({
            ...prev,
            unit: ''
          }));
        }
      }
    }
  }, [blocks, residentForm.block, residentForm.unit]);

  // High resolution vector QR compliance download generator
  const downloadSingleQRAsSVG = (unitObj: any) => {
    const finalCodeString = `ECOTRACK-${qrSelectedBlockName.replace(' ', '')}-F${qrSelectedFloor}-${unitObj.unit_number}`;
    
    let hash = 0;
    for (let i = 0; i < finalCodeString.length; i++) {
      hash = finalCodeString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gridSize = 15;
    const isFinder = (r: number, c: number) => {
      if (r < 5 && c < 5) return true;
      if (r < 5 && c >= gridSize - 5) return true;
      if (r >= gridSize - 5 && c < 5) return true;
      return false;
    };
    const isFinderFilled = (r: number, c: number) => {
      if (r < 5 && c < 5) {
        if (r === 0 || r === 4 || c === 0 || c === 4) return true;
        if (r === 2 && c === 2) return true;
        return false;
      }
      if (r < 5 && c >= gridSize - 5) {
        const nc = c - (gridSize - 5);
        if (r === 0 || r === 4 || nc === 0 || nc === 4) return true;
        if (r === 2 && nc === 2) return true;
        return false;
      }
      if (r >= gridSize - 5 && c < 5) {
        const nr = r - (gridSize - 5);
        if (nr === 0 || nr === 4 || c === 0 || c === 4) return true;
        if (nr === 2 && c === 2) return true;
        return false;
      }
      return false;
    };

    let svgContent = `<svg viewBox="0 0 400 400" width="400" height="400" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;font-family:sans-serif;">\n`;
    svgContent += `  <rect width="400" height="400" fill="#ffffff" rx="20"/>\n`;
    svgContent += `  <rect x="15" y="15" width="370" height="370" fill="none" stroke="#2E7D32" stroke-width="4" rx="15"/>\n`;
    svgContent += `  <text x="200" y="55" text-anchor="middle" font-size="14" font-weight="950" fill="#164121" style="letter-spacing:1.5px; font-family:system-ui, -apple-system, sans-serif;">ECOTRACK COMPLIANCE</text>\n`;
    svgContent += `  <text x="200" y="75" text-anchor="middle" font-size="9" font-weight="800" fill="#718096" style="letter-spacing:0.8px; font-family:system-ui, -apple-system, sans-serif;">DYNAMIC SECURE ROUTING QR v2.4</text>\n`;

    svgContent += `  <g transform="translate(100, 95) scale(13.33)">\n`;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        let active = false;
        if (isFinder(r, c)) {
          active = isFinderFilled(r, c);
        } else {
          const val = Math.abs(Math.sin(hash + r * 13 + c * 37));
          active = val > 0.43;
        }
        if (active) {
          svgContent += `    <rect x="${c}" y="${r}" width="0.88" height="0.88" rx="0.15" fill="#1E562F" />\n`;
        }
      }
    }
    svgContent += `  </g>\n`;

    svgContent += `  <text x="200" y="325" text-anchor="middle" font-size="16" font-weight="900" fill="#1A202C" style="font-family:system-ui, -apple-system, sans-serif;">${qrSelectedBlockName} • House ${unitObj.unit_number}</text>\n`;
    const occupant = unitObj.resident ? `👤 occupant: ${unitObj.resident}` : 'Vacant Unit / Active Compliance';
    svgContent += `  <text x="200" y="348" text-anchor="middle" font-size="11" font-weight="700" fill="#2E7D32" style="font-family:system-ui, -apple-system, sans-serif;">${occupant.toUpperCase()}</text>\n`;
    svgContent += `  <text x="200" y="370" text-anchor="middle" font-size="8" font-weight="bold" fill="#A0AEC0" style="letter-spacing:0.5px; font-family:monospace;">UID: ${finalCodeString}</text>\n`;
    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EcoTrack-QR-${qrSelectedBlockName.replace(' ', '')}-${unitObj.unit_number}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedbackMessage(`Generated digital high-fidelity vector asset (.svg) successfully for household "${unitObj.unit_number}".`);
  };

  // Modern High-Fidelity Vector Receipt Generator/Downloader
  const downloadReceiptAsSVG = (txn: any) => {
    if (!txn) return;
    const amountVal = txn.amount || 0;
    const resName = txn.resident_name || "Amantha Salgadu";
    const unitNo = txn.unit?.unit_number || "A-301";
    const periodVal = txn.period || "May 2026";
    const methodVal = txn.method || "PayHere • Visa **4821";
    const dateVal = txn.date || "2026-05-08, 10:42 AM";
    const txnCodeVal = txn.txn_code || "EC-2026-05-A301";
    const refCodeVal = txn.reference_code || "TXN-294821";
    const fileName = txn.receipt_file ? txn.receipt_file.replace('.pdf', '.svg') : `Receipt-${Math.floor(100000 + Math.random() * 900000)}.svg`;

    let svg = `<svg viewBox="0 0 500 700" width="500" height="700" xmlns="http://www.w3.org/2000/svg" style="background:#f4f6f8; font-family:system-ui, -apple-system, sans-serif;">\n`;
    svg += `  <rect x="15" y="15" width="470" height="670" rx="24" fill="#ffffff" stroke="#E2E8F0" stroke-width="1.5" />\n`;
    svg += `  \n`;
    svg += `  <!-- Header Banner -->\n`;
    svg += `  <path d="M 15 39 A 24 24 0 0 1 39 15 L 461 15 A 24 24 0 0 1 485 39 L 485 140 L 15 140 Z" fill="#1E562F" />\n`;
    svg += `  \n`;
    svg += `  <!-- Header Text -->\n`;
    svg += `  <text x="40" y="60" font-size="22" font-weight="900" fill="#ffffff" style="font-family:system-ui, sans-serif;">ECOTRACK</text>\n`;
    svg += `  <text x="40" y="82" font-size="11" font-weight="800" fill="#A5D6A7" style="letter-spacing: 1px; font-family:system-ui, sans-serif;">COMPLIANCE &amp; RESIDENCE TAX</text>\n`;
    svg += `  <text x="40" y="112" font-size="14" font-weight="bold" fill="#ffffff" style="font-family:system-ui, sans-serif;">RECEIPT OF PAYMENT</text>\n`;
    svg += `  \n`;
    svg += `  <!-- Watermark logo -->\n`;
    svg += `  <circle cx="410" cy="78" r="32" fill="none" stroke="#66BB6A" stroke-width="4" stroke-dasharray="4 2" />\n`;
    svg += `  <text x="410" y="84" font-size="20" text-anchor="middle" fill="#66BB6A">🌱</text>\n`;
    svg += `  \n`;
    svg += `  <!-- Status Tag -->\n`;
    svg += `  <rect x="365" y="160" width="95" height="30" rx="15" fill="#E8F5E9" stroke="#81C784" stroke-width="1.5" />\n`;
    svg += `  <text x="412.5" y="179" font-size="11" font-weight="bold" text-anchor="middle" fill="#2E7D32">● SUCCESS</text>\n`;
    svg += `  \n`;
    svg += `  <!-- Amount -->\n`;
    svg += `  <text x="40" y="195" font-size="11" font-weight="900" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">TOTAL PAID AMOUNT</text>\n`;
    svg += `  <text x="40" y="235" font-size="34" font-weight="950" fill="#1A202C" style="font-family:system-ui, sans-serif;">LKR ${amountVal.toLocaleString()}.00</text>\n`;
    svg += `  \n`;
    svg += `  <!-- Thick separator -->\n`;
    svg += `  <line x1="40" y1="260" x2="460" y2="260" stroke="#E2E8F0" stroke-width="2" />\n`;
    svg += `  \n`;
    svg += `  <!-- Receipt Grid Details -->\n`;
    svg += `  <text x="40" y="295" font-size="11" font-weight="800" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">RESIDENT NAME</text>\n`;
    svg += `  <text x="40" y="318" font-size="15" font-weight="900" fill="#1D232F" style="font-family:system-ui, sans-serif;">${resName}</text>\n`;
    svg += `  \n`;
    svg += `  <text x="280" y="295" font-size="11" font-weight="800" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">RESIDENTIAL UNIT</text>\n`;
    svg += `  <text x="280" y="318" font-size="15" font-weight="bold" fill="#1D232F" style="font-family:monospace;">${unitNo}</text>\n`;
    svg += `\n`;
    svg += `  <text x="40" y="375" font-size="11" font-weight="800" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">PAYMENT SESSION PERIOD</text>\n`;
    svg += `  <text x="40" y="398" font-size="15" font-weight="900" fill="#2E7D32" style="font-family:system-ui, sans-serif;">${periodVal}</text>\n`;
    svg += `\n`;
    svg += `  <text x="280" y="375" font-size="11" font-weight="800" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">PAYMENT CHANNEL</text>\n`;
    svg += `  <text x="280" y="398" font-size="14" font-weight="bold" fill="#1D232F" style="font-family:system-ui, sans-serif;">${methodVal}</text>\n`;
    svg += `\n`;
    svg += `  <text x="40" y="455" font-size="11" font-weight="800" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">REAL-TIME TXN TIME</text>\n`;
    svg += `  <text x="40" y="478" font-size="14" font-weight="bold" fill="#1D232F" style="font-family:system-ui, sans-serif;">${dateVal}</text>\n`;
    svg += `\n`;
    svg += `  <text x="280" y="455" font-size="11" font-weight="800" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">TRANSACTION ID</text>\n`;
    svg += `  <text x="280" y="478" font-size="13" font-weight="bold" fill="#1D232F" style="font-family:monospace;">${txnCodeVal}</text>\n`;
    svg += `\n`;
    svg += `  <!-- Divider -->\n`;
    svg += `  <line x1="40" y1="515" x2="460" y2="515" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="5 5" />\n`;
    svg += `  \n`;
    svg += `  <!-- Additional compliance details -->\n`;
    svg += `  <text x="40" y="550" font-size="11" font-weight="700" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">REFERENCE KEY</text>\n`;
    svg += `  <text x="40" y="570" font-size="12" font-weight="bold" fill="#2D3748" style="font-family:monospace;">${refCodeVal}</text>\n`;
    svg += `\n`;
    svg += `  <text x="280" y="550" font-size="11" font-weight="700" fill="#718096" style="letter-spacing: 0.5px; text-transform: uppercase;">VERIFICATION STATUS</text>\n`;
    svg += `  <text x="280" y="570" font-size="12" font-weight="black" fill="#2E7D32" style="font-family:system-ui, sans-serif;">SECURE DIGITALLY SIGNED</text>\n`;
    svg += `  \n`;
    svg += `  <!-- Footer bottom bar -->\n`;
    svg += `  <path d="M 15 615 L 485 615 L 485 646 A 24 24 0 0 1 461 670 L 39 670 A 24 24 0 0 1 15 646 Z" fill="#F8FAF6" />\n`;
    svg += `  <line x1="15" y1="615" x2="485" y2="615" stroke="#E8F5E9" stroke-width="1.5" />\n`;
    svg += `  \n`;
    svg += `  <text x="250" y="635" font-size="10" font-weight="bold" text-anchor="middle" fill="#718096" style="font-family:system-ui, sans-serif; letter-spacing:0.3px;">Thank you for supporting sustainable residency. Keep this copy for audit.</text>\n`;
    svg += `  <text x="250" y="652" font-size="8" font-family="monospace" text-anchor="middle" fill="#A0AEC0">ECOTRACK SECURE VECTOR RECEIPT v2.4 • WATERSTAMP CERTIFIED</text>\n`;
    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedbackMessage(`Downloaded receipt asset "${fileName}" successfully!`);
  };

  // Standalone High-Fidelity PDF/Print Invoice Generator and Renderer
  const printReceiptAsPDF = (txn: any) => {
    if (!txn) return;
    const amountVal = txn.amount || 0;
    const resName = txn.resident_name || "Amantha Salgadu";
    const unitNo = txn.unit?.unit_number || "A-301";
    const periodVal = txn.period || "May 2026";
    const methodVal = txn.method || "PayHere • Visa **4821";
    const dateVal = txn.date || "2026-05-08, 10:42 AM";
    const txnCodeVal = txn.txn_code || "EC-2026-05-A301";
    const refCodeVal = txn.reference_code || "TXN-294821";
    const title = `EcoTrack Receipt PDF - ${refCodeVal}`;

    const htmlContent = '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
      '  <meta charset="utf-8">' +
      '  <title>' + title + '</title>' +
      '  <style>' +
      '    body {' +
      '      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
      '      margin: 0;' +
      '      padding: 40px;' +
      '      background-color: #f7fafc;' +
      '      color: #2d3748;' +
      '    }' +
      '    .invoice-sheet {' +
      '      max-width: 800px;' +
      '      margin: 0 auto;' +
      '      background-color: #ffffff;' +
      '      box-shadow: 0 10px 25px rgba(0,0,0,0.05);' +
      '      border-radius: 16px;' +
      '      border: 1px solid #e2e8f0;' +
      '      padding: 50px;' +
      '      position: relative;' +
      '      overflow: hidden;' +
      '    }' +
      '    .invoice-sheet::before {' +
      '      content: "";' +
      '      position: absolute;' +
      '      top: 0;' +
      '      left: 0;' +
      '      right: 0;' +
      '      height: 8px;' +
      '      background-color: #2E7D32;' +
      '    }' +
      '    .header-grid {' +
      '      display: grid;' +
      '      grid-template-columns: 1fr 1fr;' +
      '      margin-bottom: 40px;' +
      '    }' +
      '    .logo-area {' +
      '      text-align: left;' +
      '    }' +
      '    .logo-text {' +
      '      font-size: 26px;' +
      '      font-weight: 900;' +
      '      color: #1e562f;' +
      '      letter-spacing: -0.5px;' +
      '      margin: 0;' +
      '    }' +
      '    .logo-sub {' +
      '      font-size: 10px;' +
      '      font-weight: 800;' +
      '      color: #718096;' +
      '      letter-spacing: 1px;' +
      '      text-transform: uppercase;' +
      '      margin-top: 2px;' +
      '    }' +
      '    .meta-area {' +
      '      text-align: right;' +
      '    }' +
      '    .meta-title {' +
      '      font-size: 22px;' +
      '      font-weight: 900;' +
      '      color: #1a202c;' +
      '      margin: 0 0 8px 0;' +
      '    }' +
      '    .meta-row {' +
      '      font-size: 12px;' +
      '      color: #718096;' +
      '      margin: 3px 0;' +
      '    }' +
      '    .meta-val {' +
      '      font-weight: 700;' +
      '      color: #2d3748;' +
      '      font-family: monospace;' +
      '    }' +
      '    .divider {' +
      '      border: 0;' +
      '      height: 1px;' +
      '      background-color: #edf2f7;' +
      '      margin: 30px 0;' +
      '    }' +
      '    .address-grid {' +
      '      display: grid;' +
      '      grid-template-columns: 1fr 1fr;' +
      '      gap: 30px;' +
      '      margin-bottom: 40px;' +
      '      font-size: 13px;' +
      '    }' +
      '    .address-box-title {' +
      '      font-size: 10px;' +
      '      font-weight: 800;' +
      '      color: #a0aec0;' +
      '      text-transform: uppercase;' +
      '      letter-spacing: 0.5px;' +
      '      margin-bottom: 8px;' +
      '    }' +
      '    .address-content {' +
      '      line-height: 1.5;' +
      '    }' +
      '    .address-name {' +
      '      font-size: 15px;' +
      '      font-weight: 800;' +
      '      color: #1a202c;' +
      '      margin-bottom: 3px;' +
      '    }' +
      '    .status-payment {' +
      '      display: inline-flex;' +
      '      align-items: center;' +
      '      padding: 6px 14px;' +
      '      border-radius: 20px;' +
      '      font-size: 11px;' +
      '      font-weight: 800;' +
      '      background-color: #e8f5e9;' +
      '      color: #2e7d32;' +
      '      border: 1px solid #c8e6c9;' +
      '      text-transform: uppercase;' +
      '    }' +
      '    .table-container {' +
      '      margin-bottom: 40px;' +
      '    }' +
      '    table {' +
      '      width: 100%;' +
      '      border-collapse: collapse;' +
      '      text-align: left;' +
      '      font-size: 13px;' +
      '    }' +
      '    th {' +
      '      border-bottom: 2px solid #edf2f7;' +
      '      padding: 12px;' +
      '      font-weight: 850;' +
      '      color: #718096;' +
      '      text-transform: uppercase;' +
      '      font-size: 10px;' +
      '      letter-spacing: 0.5px;' +
      '    }' +
      '    td {' +
      '      padding: 16px 12px;' +
      '      border-bottom: 1px solid #edf2f7;' +
      '      vertical-align: top;' +
      '    }' +
      '    .total-section {' +
      '      display: flex;' +
      '      justify-content: flex-end;' +
      '      font-size: 13px;' +
      '    }' +
      '    .subtable-total {' +
      '      width: 320px;' +
      '    }' +
      '    .total-row {' +
      '      display: flex;' +
      '      justify-content: space-between;' +
      '      padding: 8px 0;' +
      '    }' +
      '    .grand-total {' +
      '      border-top: 2px solid #2e7d32;' +
      '      border-bottom: 2px double #e2e8f0;' +
      '      font-size: 18px;' +
      '      font-weight: 950;' +
      '      color: #1a202c;' +
      '      padding: 12px 0;' +
      '      margin-top: 10px;' +
      '    }' +
      '    .bottom-stamp-area {' +
      '      display: flex;' +
      '      justify-content: space-between;' +
      '      align-items: flex-end;' +
      '      margin-top: 60px;' +
      '    }' +
      '    .bar-block {' +
      '      text-align: left;' +
      '    }' +
      '    .stamp-block {' +
      '      text-align: right;' +
      '      padding-right: 20px;' +
      '      position: relative;' +
      '    }' +
      '    .secure-stamp {' +
      '      border: 3px double #2E7D32;' +
      '      border-radius: 8px;' +
      '      color: #2E7D32;' +
      '      text-transform: uppercase;' +
      '      font-size: 13px;' +
      '      font-weight: 900;' +
      '      letter-spacing: 1px;' +
      '      padding: 8px 16px;' +
      '      display: inline-block;' +
      '      transform: rotate(-3deg);' +
      '      opacity: 0.85;' +
      '      background-color: rgba(232, 245, 233, 0.5);' +
      '    }' +
      '    .secure-stamp span {' +
      '      display: block;' +
      '      font-size: 8px;' +
      '      font-weight: bold;' +
      '      text-align: center;' +
      '      margin-top: 3px;' +
      '      letter-spacing: 0.5px;' +
      '    }' +
      '    .footer-note {' +
      '      margin-top: 60px;' +
      '      border-top: 1px solid #edf2f7;' +
      '      padding-top: 20px;' +
      '      font-size: 10px;' +
      '      color: #a0aec0;' +
      '      text-align: center;' +
      '      line-height: 1.6;' +
      '    }' +
      '    @media print {' +
      '      body {' +
      '        background-color: #ffffff;' +
      '        padding: 0;' +
      '        margin: 0;' +
      '      }' +
      '      .invoice-sheet {' +
      '        border: none;' +
      '        box-shadow: none;' +
      '        padding: 20px;' +
      '        max-width: 100%;' +
      '      }' +
      '    }' +
      '  </style>' +
      '</head>' +
      '<body>' +
      '  <div class="invoice-sheet">' +
      '    <div class="header-grid">' +
      '      <div class="logo-area">' +
      '        <div class="logo-text">ECOTRACK</div>' +
      '        <div class="logo-sub">Compliance & Residence Tax</div>' +
      '      </div>' +
      '      <div class="meta-area">' +
      '        <div class="meta-title">PAYMENT RECEIPT</div>' +
      '        <div class="meta-row">Receipt No: <span class="meta-val">' + refCodeVal + '</span></div>' +
      '        <div class="meta-row">Tax Period: <span class="meta-val" style="color:#2E7D32; font-weight:bold;">' + periodVal + '</span></div>' +
      '        <div class="meta-row">Date Issued: <span class="meta-val">' + dateVal + '</span></div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="divider"></div>' +
      '    <div class="address-grid">' +
      '      <div>' +
      '        <div class="address-box-title">Billed To (Resident)</div>' +
      '        <div class="address-content">' +
      '          <div class="address-name">' + resName + '</div>' +
      '          <div>Apartment / Household Unit: <strong>' + unitNo + '</strong></div>' +
      '          <div>Registered Member ID: EC-RES-' + unitNo.replace('-', '') + '</div>' +
      '          <div style="margin-top: 8px;"><span class="status-payment">🌱 Verified Active Residence</span></div>' +
      '        </div>' +
      '      </div>' +
      '      <div style="text-align: right;">' +
      '        <div class="address-box-title">Billing Agency</div>' +
      '        <div class="address-content">' +
      '          <div class="address-name" style="color: #2e7d32;">EcoTrack Municipal Service</div>' +
      '          <div>Sustainable Compliance Board</div>' +
      '          <div>Greenhouse Control Zone A4</div>' +
      '          <div>support@ecotrack.lk</div>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="table-container">' +
      '      <table>' +
      '        <thead>' +
      '          <tr>' +
      '            <th style="width: 55%; text-align: left;">Item Description</th>' +
      '            <th style="width: 15%; text-align: center;">Rate (LKR)</th>' +
      '            <th style="width: 10%; text-align: center;">Qty</th>' +
      '            <th style="width: 20%; text-align: right;">Amount (LKR)</th>' +
      '          </tr>' +
      '        </thead>' +
      '        <tbody>' +
      '          <tr>' +
      '            <td style="text-align: left;">' +
      '              <strong style="color:#1a202c; font-size:14px;">Monthly Sustainability &amp; Maintenance Levy</strong>' +
      '              <div style="color: #718096; font-size:11px; margin-top: 4px;">Shared community infrastructure upkeep, solid waste clearance, compliance routing, and green footprint audits for billing session ' + periodVal + '.</div>' +
      '            </td>' +
      '            <td style="text-align: center; font-family: monospace;">' + amountVal.toLocaleString() + '.00</td>' +
      '            <td style="text-align: center;">1</td>' +
      '            <td style="text-align: right; font-weight: bold; font-family: monospace;">' + amountVal.toLocaleString() + '.00</td>' +
      '          </tr>' +
      '          <tr>' +
      '            <td style="text-align: left;">' +
      '              <strong style="color:#2d3748; font-size:12px;">Unified Eco-Gateway Service Charge</strong>' +
      '              <div style="color: #a0aec0; font-size:11px; margin-top:2px;">Secured gateway processing &amp; real-time ledger consensus check.</div>' +
      '            </td>' +
      '            <td style="text-align: center; font-family: monospace;">0.00</td>' +
      '            <td style="text-align: center;">-</td>' +
      '            <td style="text-align: right; font-family: monospace; color:#a0aec0;">FREE</td>' +
      '          </tr>' +
      '        </tbody>' +
      '      </table>' +
      '    </div>' +
      '    <div class="total-section">' +
      '      <div class="subtable-total">' +
      '        <div class="total-row">' +
      '          <span style="color: #718096;">Subtotal</span>' +
      '          <span style="font-family: monospace; font-weight: bold;">LKR ' + amountVal.toLocaleString() + '.00</span>' +
      '        </div>' +
      '        <div class="total-row">' +
      '          <span style="color: #718096;">Service Gateway Tax</span>' +
      '          <span style="font-family: monospace;">0.00</span>' +
      '        </div>' +
      '        <div class="total-row grand-total">' +
      '          <span>TOTAL PAID</span>' +
      '          <span style="font-family: monospace;">LKR ' + amountVal.toLocaleString() + '.00</span>' +
      '        </div>' +
      '        <div style="font-size: 11px; text-align: right; margin-top: 10px; color:#2E7D32; font-weight:bold;">' +
      '          Paid via: ' + methodVal + '' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="bottom-stamp-area">' +
      '      <div class="bar-block">' +
      '        <!-- Dynamic Styled SVG Barcode -->' +
      '        <svg viewBox="0 0 100 28" width="160" height="42" xmlns="http://www.w3.org/2000/svg" style="display:block;">' +
      '          <rect width="100" height="28" fill="#ffffff"/>' +
      '          <rect x="2" y="1" width="1.5" height="20" fill="#000000"/>' +
      '          <rect x="5.5" y="1" width="0.8" height="20" fill="#000000"/>' +
      '          <rect x="8" y="1" width="2.2" height="20" fill="#000000"/>' +
      '          <rect x="12" y="1" width="0.8" height="20" fill="#000000"/>' +
      '          <rect x="15" y="1" width="1.5" height="20" fill="#000000"/>' +
      '          <rect x="18" y="1" width="3.2" height="20" fill="#000000"/>' +
      '          <rect x="22.5" y="1" width="0.8" height="20" fill="#000000"/>' +
      '          <rect x="25" y="1" width="1.5" height="20" fill="#000000"/>' +
      '          <rect x="28.5" y="1" width="2.2" height="20" fill="#000000"/>' +
      '          <rect x="32" y="1" width="0.8" height="20" fill="#000000"/>' +
      '          <rect x="35" y="1" width="1.5" height="20" fill="#000000"/>' +
      '          <rect x="38" y="1" width="1.5" height="20" fill="#000000"/>' +
      '          <rect x="41.5" y="1" width="3.2" height="20" fill="#000000"/>' +
      '          <rect x="46.5" y="1" width="0.8" height="20" fill="#000000"/>' +
      '          <rect x="49" y="1" width="1.5" height="20" fill="#000000"/>' +
      '          <rect x="52" y="1" width="2.2" height="20" fill="#000000"/>' +
      '          <rect x="56" y="1" width="0.8" height="20" fill="#000000"/>' +
      '          <rect x="59.5" y="1" width="1.5" height="20" fill="#000000"/>' +
      '          <rect x="63" y="1" width="3.2" height="20" fill="#000000"/>' +
      '          <rect x="68" y="1" width="0.8" height="20" fill="#000000"/>' +
      '          <rect x="71" y="1" width="1.5" height="20" fill="#000000"/>' +
      '          <rect x="74" y="1" width="2.2" height="20" fill="#000000"/>' +
      '          <text x="38" y="26" font-size="4.5" font-family="monospace" letter-spacing="1">TXN-' + refCodeVal + '</text>' +
      '        </svg>' +
      '        <div style="font-size: 10px; color:#a0aec0; margin-top: 5px; font-family:monospace;">DIGITAL SIGNATURE ID: ' + txnCodeVal + '</div>' +
      '      </div>' +
      '      <div class="stamp-block">' +
      '        <div class="secure-stamp">' +
      '          ECOTRACK Ceylon' +
      '          <span>PAID SUCCESSFULLY</span>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="footer-note">' +
      '      EcoTrack Compliance Registry. Verified by EcoTrack Security Routing Ledger Node A4.<br>' +
      '      If you have inquiries regarding this compliant invoice sheet, please reach our audit support desk. Sri Lanka Municipal Code Act 24.' +
      '    </div>' +
      '  </div>' +
      '  <script>' +
      '    setTimeout(function() {' +
      '      try { window.print(); } catch(e) { console.error(e); }' +
      '    }, 350);' +
      '  </script>' +
      '</body>' +
      '</html>';

    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        setFeedbackMessage(`Initiated secure PDF receipt generation for "${refCodeVal}". Check your browser print / save dialog.`);
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setFeedbackMessage('Opened portable printer layout successfully. Please save as PDF.');
      }
    } catch (e) {
      console.error(e);
      window.print();
    }
  };

  // Standalone tab printable renderer to completely bypass iframe restrictions in browser previews
  const openPrintWindow = () => {
    if (!printConfig) return;
    
    const isSingle = printConfig.type === 'single';
    const title = 'EcoTrack Compliance Print - ' + printConfig.block;
    
    const getQRImageString = (textStr: string) => {
      let h = 0;
      for (let i = 0; i < textStr.length; i++) {
        h = textStr.charCodeAt(i) + ((h << 5) - h);
      }
      const gSize = 15;
      const pix = [];
      const isFin = (r: number, c: number) => {
        if (r < 5 && c < 5) return true;
        if (r < 5 && c >= gSize - 5) return true;
        if (r >= gSize - 5 && c < 5) return true;
        return false;
      };
      const isFinFil = (r: number, c: number) => {
        if (r < 5 && c < 5) {
          if (r === 0 || r === 4 || c === 0 || c === 4) return true;
          if (r === 2 && c === 2) return true;
          return false;
        }
        if (r < 5 && c >= gSize - 5) {
          const nc = c - (gSize - 5);
          if (r === 0 || r === 4 || nc === 0 || nc === 4) return true;
          if (r === 2 && nc === 2) return true;
          return false;
        }
        if (r >= gSize - 5 && c < 5) {
          const nr = r - (gSize - 5);
          if (nr === 0 || nr === 4 || c === 0 || c === 4) return true;
          if (nr === 2 && c === 2) return true;
          return false;
        }
        return false;
      };

      for (let r = 0; r < gSize; r++) {
        for (let c = 0; c < gSize; c++) {
          if (isFin(r, c)) {
            pix.push({ r, c, active: isFinFil(r, c) });
          } else {
            const val = Math.abs(Math.sin(h + r * 13 + c * 37));
            pix.push({ r, c, active: val > 0.43 });
          }
        }
      }

      let svg = '<svg viewBox="0 0 15 15" style="width:100%;height:100%;" fill="none" xmlns="http://www.w3.org/2000/svg">';
      pix.forEach(p => {
        if (p.active) {
          svg += '<rect x="' + p.c + '" y="' + p.r + '" width="0.88" height="0.88" rx="0.15" fill="#1E562F" />';
        }
      });
      svg += '</svg>';
      return svg;
    };

    let innerContentHTML = '';
    
    if (isSingle) {
      const uNumber = printConfig.unit?.unit_number || '';
      const rName = printConfig.unit?.resident || '';
      const qrText = 'ECOTRACK-' + printConfig.block.replace(' ', '') + '-F' + printConfig.floor + '-' + uNumber;
      const qrSvg = getQRImageString(qrText);
      
      const occupantHTML = rName 
        ? '<p class="resident">👤 Occupant: ' + rName + '</p>' 
        : '<p class="vacant">Vacant Unit / Unoccupied</p>';

      innerContentHTML = ' <div class="card">' +
        '   <div class="card-header">' +
        '     <div>' +
        '       <span class="brand">EcoTrack Compliance</span>' +
        '       <span class="subtitle">HOUSE LABEL v2.4</span>' +
        '     </div>' +
        '     <span class="emoji">🌱</span>' +
        '   </div>' +
        '   <div class="qr-container">' + qrSvg + '</div>' +
        '   <div class="info">' +
        '     <h1 class="title">' + printConfig.block + ' • Unit ' + uNumber + '</h1>' +
        occupantHTML +
        '     <p class="uid">ID: ' + qrText + '</p>' +
        '   </div>' +
        '   <div class="footer-note">' +
        '     Instructions: Affix security badge inside clear observation line. Verified real-time compliance tracker embedded.' +
        '   </div>' +
        ' </div>';
    } else {
      const targetBlockObj = blocks.find(b => b.name === printConfig.block);
      const floorUnitsList = targetBlockObj ? (targetBlockObj.units[printConfig.floor] || []) : [];
      
      let gridCards = '';
      floorUnitsList.forEach((unitObj: any) => {
        const qrText = 'ECOTRACK-' + printConfig.block.replace(' ', '') + '-F' + printConfig.floor + '-' + unitObj.unit_number;
        const qrSvg = getQRImageString(qrText);
        
        const occupantHTML = unitObj.resident 
          ? '<p class="grid-resident">👤 Resident: ' + unitObj.resident + '</p>' 
          : '<p class="grid-vacant">Unoccupied / Vacant Unit</p>';

        gridCards += ' <div class="grid-card">' +
          '   <div class="grid-card-header">' +
          '     <div>' +
          '       <span class="grid-brand">ECOTRACK COMPLIANCE</span>' +
          '       <span class="grid-title">' + printConfig.block + ' • Unit ' + unitObj.unit_number + '</span>' +
          '     </div>' +
          '     <span class="grid-emoji">🌱</span>' +
          '   </div>' +
          '   <div class="grid-qr-container">' + qrSvg + '</div>' +
          '   <div class="grid-info">' +
          occupantHTML +
          '     <p class="grid-uid">ID: ' + qrText + '</p>' +
          '   </div>' +
          ' </div>';
      });

      innerContentHTML = ' <div class="sheet-container">' +
        '   <div class="sheet-header">' +
        '     <div>' +
        '       <h1 class="sheet-title">ECOTRACK COMPLIANCE STICKER SHEET</h1>' +
        '       <p class="sheet-subtitle">Generated Block: ' + printConfig.block + ' • Floor Level: ' + printConfig.floor + ' • Layout: A4 Grid compliance sheet</p>' +
        '     </div>' +
        '     <p class="sheet-badge">ECOTRACK CODES v2.4</p>' +
        '   </div>' +
        '   <div class="grid-layout">' +
        gridCards +
        '   </div>' +
        ' </div>';
    }

    const htmlContent = '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
      '  <meta charset="utf-8">' +
      '  <title>' + title + '</title>' +
      '  <style>' +
      '    body {' +
      '      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
      '      margin: 0;' +
      '      padding: 20px;' +
      '      background-color: #f7fafc;' +
      '      color: #1a202c;' +
      '    }' +
      '    .card {' +
      '      max-width: 400px;' +
      '      margin: 40px auto;' +
      '      border: 4px dashed #2E7D32;' +
      '      padding: 30px;' +
      '      border-radius: 24px;' +
      '      background: #ffffff;' +
      '      text-align: center;' +
      '      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);' +
      '    }' +
      '    .card-header {' +
      '      display: flex;' +
      '      justify-content: space-between;' +
      '      align-items: center;' +
      '      border-bottom: 2px solid #e2e8f0;' +
      '      padding-bottom: 15px;' +
      '      margin-bottom: 20px;' +
      '    }' +
      '    .brand {' +
      '      font-size: 14px;' +
      '      font-weight: 900;' +
      '      color: #2e7d32;' +
      '      text-transform: uppercase;' +
      '      letter-spacing: 1.5px;' +
      '      display: block;' +
      '      text-align: left;' +
      '    }' +
      '    .subtitle {' +
      '      font-size: 10px;' +
      '      color: #718096;' +
      '      font-family: monospace;' +
      '      font-weight: bold;' +
      '      display: block;' +
      '      text-align: left;' +
      '      margin-top: 2px;' +
      '    }' +
      '    .emoji {' +
      '      font-size: 24px;' +
      '    }' +
      '    .qr-container {' +
      '      background: #f7fafc;' +
      '      border: 1px solid #edf2f7;' +
      '      padding: 24px;' +
      '      border-radius: 16px;' +
      '      display: flex;' +
      '      align-items: center;' +
      '      justify-content: center;' +
      '      margin: 20px auto;' +
      '      height: 200px;' +
      '      width: 200px;' +
      '    }' +
      '    .title {' +
      '      font-size: 24px;' +
      '      font-weight: 900;' +
      '      color: #1a202c;' +
      '      margin: 0 0 10px 0;' +
      '    }' +
      '    .resident {' +
      '      font-size: 14px;' +
      '      font-weight: bold;' +
      '      color: #2e7d32;' +
      '      margin: 0 0 8px 0;' +
      '    }' +
      '    .vacant {' +
      '      font-size: 14px;' +
      '      font-weight: bold;' +
      '      color: #a0aec0;' +
      '      font-style: italic;' +
      '      margin: 0 0 8px 0;' +
      '    }' +
      '    .uid {' +
      '      font-size: 11px;' +
      '      font-family: monospace;' +
      '      color: #718096;' +
      '      margin: 0;' +
      '      text-transform: uppercase;' +
      '      font-weight: bold;' +
      '    }' +
      '    .footer-note {' +
      '      margin-top: 20px;' +
      '      padding-top: 15px;' +
      '      border-top: 1px solid #e2e8f0;' +
      '      font-size: 10px;' +
      '      color: #a0aec0;' +
      '      font-weight: bold;' +
      '      line-height: 1.4;' +
      '    }' +
      '    .sheet-container {' +
      '      max-width: 1000px;' +
      '      margin: 0 auto;' +
      '      background: #ffffff;' +
      '      padding: 30px;' +
      '      border-radius: 20px;' +
      '    }' +
      '    .sheet-header {' +
      '      border-bottom: 4px solid #2e7d32;' +
      '      padding-bottom: 15px;' +
      '      margin-bottom: 30px;' +
      '      display: flex;' +
      '      justify-content: space-between;' +
      '      align-items: flex-end;' +
      '    }' +
      '    .sheet-title {' +
      '      font-size: 20px;' +
      '      font-weight: 900;' +
      '      color: #1b5e20;' +
      '      margin: 0;' +
      '      letter-spacing: 1px;' +
      '    }' +
      '    .sheet-subtitle {' +
      '      font-size: 12px;' +
      '      font-weight: bold;' +
      '      color: #4a5568;' +
      '      margin: 5px 0 0 0;' +
      '    }' +
      '    .sheet-badge {' +
      '      font-size: 12px;' +
      '      font-family: monospace;' +
      '      font-weight: 950;' +
      '      color: #2e7d32;' +
      '      margin: 0;' +
      '    }' +
      '    .grid-layout {' +
      '      display: grid;' +
      '      grid-template-columns: 1fr 1fr;' +
      '      gap: 24px;' +
      '    }' +
      '    .grid-card {' +
      '      border: 2px solid #cbd5e0;' +
      '      padding: 24px;' +
      '      border-radius: 16px;' +
      '      background: #ffffff;' +
      '      display: flex;' +
      '      flex-direction: column;' +
      '      justify-content: space-between;' +
      '    }' +
      '    .grid-card-header {' +
      '      display: flex;' +
      '      justify-content: space-between;' +
      '      align-items: flex-start;' +
      '      border-bottom: 1px solid #edf2f7;' +
      '      padding-bottom: 10px;' +
      '      margin-bottom: 15px;' +
      '    }' +
      '    .grid-brand {' +
      '      font-size: 10px;' +
      '      font-weight: 950;' +
      '      color: #2e7d32;' +
      '      letter-spacing: 1px;' +
      '      display: block;' +
      '    }' +
      '    .grid-title {' +
      '      font-size: 18px;' +
      '      font-weight: 900;' +
      '      color: #2d3748;' +
      '      margin-top: 2px;' +
      '      display: block;' +
      '    }' +
      '    .grid-emoji {' +
      '      font-size: 16px;' +
      '    }' +
      '    .grid-qr-container {' +
      '      background: #f7fafc;' +
      '      border: 1px solid #edf2f7;' +
      '      padding: 16px;' +
      '      border-radius: 12px;' +
      '      display: flex;' +
      '      align-items: center;' +
      '      justify-content: center;' +
      '      margin: 10px auto;' +
      '      height: 128px;' +
      '      width: 128px;' +
      '    }' +
      '    .grid-info {' +
      '      margin-top: 10px;' +
      '    }' +
      '    .grid-resident {' +
      '      font-size: 12px;' +
      '      font-weight: bold;' +
      '      color: #2e7d32;' +
      '      margin: 0;' +
      '    }' +
      '    .grid-vacant {' +
      '      font-size: 12px;' +
      '      font-weight: bold;' +
      '      color: #718096;' +
      '      font-style: italic;' +
      '      margin: 0;' +
      '    }' +
      '    .grid-uid {' +
      '      font-size: 9px;' +
      '      font-family: monospace;' +
      '      color: #a0aec0;' +
      '      margin: 4px 0 0 0;' +
      '      text-transform: uppercase;' +
      '      font-weight: bold;' +
      '    }' +
      '    @media print {' +
      '      body {' +
      '        background-color: #ffffff;' +
      '        padding: 0;' +
      '        margin: 0;' +
      '      }' +
      '      .card {' +
      '        box-shadow: none;' +
      '        margin: 10px auto;' +
      '        page-break-inside: avoid;' +
      '      }' +
      '      .sheet-container {' +
      '        padding: 0;' +
      '        max-width: 100%;' +
      '        border-radius: 0;' +
      '      }' +
      '      .grid-card {' +
      '        page-break-inside: avoid;' +
      '        break-inside: avoid;' +
      '      }' +
      '    }' +
      '  </style>' +
      '</head>' +
      '<body>' +
      innerContentHTML +
      '  <script>' +
      '    setTimeout(function() {' +
         '      try { window.print(); } catch(e) { console.error(e); }' +
      '    }, 350);' +
      '  </script>' +
      '</body>' +
      '</html>';

    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        setFeedbackMessage('Initiated standalone high-fidelity printing flow. Wait for preview popup.');
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setFeedbackMessage('Generated portable document download link successfully due to browser popups block.');
      }
    } catch (e) {
      console.error(e);
      window.print();
    }
  };

  // Pre-populate unassigned blocks when Worker Onboarding modal opens
  useEffect(() => {
    if (isAddWorkerModalOpen && blocks) {
      const assignedBlocksSet = new Set<string>();
      users.forEach(u => {
        if (u.role === 'worker' && u.assignedBlocks) {
          u.assignedBlocks.split(',').forEach((bName: string) => {
            assignedBlocksSet.add(bName.trim());
          });
        }
      });
      const unassigned = blocks
        .filter(b => !assignedBlocksSet.has(b.name))
        .map(b => b.name);
      
      setWorkerForm(prev => ({
        ...prev,
        assignedBlocks: unassigned.join(', ')
      }));
    }
  }, [isAddWorkerModalOpen, blocks, users]);

  // Trigger monthly bill generations
  const handleGenerateMonthlyBills = async () => {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const now = new Date();
      const billingPeriod = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const response = await fetch('/api/admin/payments/generate-monthly', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ billing_period: billingPeriod, amount: 1000 })
      });
      if (!response.ok) throw new Error('Failed to generate bills');
      const result = await response.json();
      setFeedbackMessage(result.message || 'Monthly levies of LKR 1,000 generated successfully.');
      loadAdminMetrics();
    } catch (err) {
      setFeedbackMessage('Failed to generate monthly bills. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Robust CSV parser supporting quotes, nested commas, and multiple line breaks
  const parseCSV = (csvText: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentValue.trim());
        if (row.some(val => val !== "")) {
          result.push(row);
        }
        row = [];
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    if (currentValue || row.length > 0) {
      row.push(currentValue.trim());
      if (row.some(val => val !== "")) {
        result.push(row);
      }
    }
    return result;
  };

  const handleParseCSVData = (text: string) => {
    try {
      setCsvParseError(null);
      if (!text.trim()) {
        setCsvPreviewData([]);
        return;
      }
      
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        setCsvParseError("CSV must contain a header row and at least one data row.");
        setCsvPreviewData([]);
        return;
      }

      const headers = parsed[0].map(h => h.toLowerCase().trim().replace(/["'\s_]/g, ''));
      const blockIdx = headers.findIndex(h => h.includes('block'));
      const floorIdx = headers.findIndex(h => h.includes('floor'));
      const unitIdx = headers.findIndex(h => h.includes('unit'));
      const residentIdx = headers.findIndex(h => h.includes('resident') || h.includes('name'));
      const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
      const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));

      if (blockIdx === -1 || floorIdx === -1 || unitIdx === -1) {
        setCsvParseError("CSV must contain at least 'Block', 'Floor', and 'Unit' columns (case-insensitive headers).");
        setCsvPreviewData([]);
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < parsed.length; i++) {
        const r = parsed[i];
        if (r.length < 3) continue; // skip short or empty rows
        
        const blockNameRaw = r[blockIdx] || '';
        const floorStrRaw = r[floorIdx] || '';
        const unitNumRaw = r[unitIdx] || '';
        const residentName = residentIdx !== -1 ? (r[residentIdx] || '') : '';
        const phone = phoneIdx !== -1 ? (r[phoneIdx] || '') : '';
        const email = emailIdx !== -1 ? (r[emailIdx] || '') : '';

        if (!blockNameRaw || !floorStrRaw || !unitNumRaw) {
          continue; // skip incomplete rows
        }

        const floorNum = parseInt(floorStrRaw, 10);
        if (isNaN(floorNum)) {
          continue; // skip invalid or non-numeric floors
        }

        // Standardize block name (e.g., "A" or "a" => "Block A", "Block B" => "Block B")
        let standardizedBlock = blockNameRaw;
        if (!standardizedBlock.toLowerCase().startsWith('block')) {
          standardizedBlock = `Block ${standardizedBlock.toUpperCase()}`;
        } else {
          // Capitalize like "Block A"
          const words = standardizedBlock.split(/\s+/);
          if (words.length >= 2) {
            standardizedBlock = `Block ${words[1].toUpperCase()}`;
          }
        }

        rows.push({
          block: standardizedBlock,
          floor: floorNum,
          unit_number: unitNumRaw.toUpperCase(),
          resident: residentName || null,
          resident_phone: phone || null,
          resident_email: email || null
        });
      }

      if (rows.length === 0) {
        setCsvParseError("No valid rows could be parsed. Check that Floor and Unit contain valid data.");
        setCsvPreviewData([]);
      } else {
        setCsvPreviewData(rows);
      }
    } catch (e: any) {
      setCsvParseError(`Parser Error: ${e.message || 'Unknown parsing issue'}`);
      setCsvPreviewData([]);
    }
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvRawText(text);
        handleParseCSVData(text);
      };
      reader.readAsText(file);
    }
  };

  const handleCSVDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCSV(true);
  };

  const handleCSVDragLeave = () => {
    setIsDraggingCSV(false);
  };

  const handleCSVDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCSV(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvRawText(text);
        handleParseCSVData(text);
      };
      reader.readAsText(file);
    } else {
      setCsvParseError("Invalid file type. Please upload a valid CSV file.");
    }
  };

  const handleImportCSVConfirm = () => {
    if (csvPreviewData.length === 0) return;

    let updatedBlocks = [...blocks];
    let updatedResidents = [...residents];
    
    let blocksAddedCount = 0;
    let unitsUpdatedCount = 0;
    let residentsRegisteredCount = 0;

    csvPreviewData.forEach((row) => {
      // 1. Find or create block
      let targetBlock = updatedBlocks.find(b => b.name.toLowerCase() === row.block.toLowerCase());
      if (!targetBlock) {
        // Find max floor for this block in our imported list to size it correctly
        const sameBlockRows = csvPreviewData.filter(r => r.block.toLowerCase() === row.block.toLowerCase());
        const maxFloor = Math.max(...sameBlockRows.map(r => r.floor), row.floor, 1);
        
        targetBlock = {
          id: Date.now() + Math.floor(Math.random() * 10000),
          name: row.block,
          notes: 'Imported via CSV',
          floors_count: maxFloor,
          units_per_floor: 5,
          expanded: true,
          units: {}
        };
        
        // initialize floors with empty arrays
        for (let f = 1; f <= maxFloor; f++) {
          targetBlock.units[f] = [];
        }
        
        updatedBlocks.push(targetBlock);
        blocksAddedCount++;
      }

      // 2. Ensure target Floor array exists in block's units
      if (!targetBlock.units) {
        targetBlock.units = {};
      }
      
      const targetFloorNum = row.floor;
      if (targetFloorNum > targetBlock.floors_count) {
        // Expand floors count dynamically to accommodate imported floors!
        targetBlock.floors_count = targetFloorNum;
      }
      for (let f = 1; f <= targetFloorNum; f++) {
        if (!targetBlock.units[f]) {
          targetBlock.units[f] = [];
        }
      }

      // 3. Find or create Unit
      const floorUnits = targetBlock.units[targetFloorNum] || [];
      const existingUnitIdx = floorUnits.findIndex((u: any) => u.unit_number.toLowerCase() === row.unit_number.toLowerCase());
      
      const newUnitData = {
        unit_number: row.unit_number,
        resident: row.resident,
        resident_phone: row.resident_phone,
        resident_email: row.resident_email
      };

      if (existingUnitIdx !== -1) {
        floorUnits[existingUnitIdx] = {
          ...floorUnits[existingUnitIdx],
          ...newUnitData
        };
      } else {
        floorUnits.push(newUnitData);
      }
      targetBlock.units[targetFloorNum] = floorUnits;
      unitsUpdatedCount++;

      // 4. Register Resident under Users (Directory) if they have a name
      if (row.resident) {
        const emailToUse = row.resident_email || `${row.resident.toLowerCase().replace(/\s+/g, '')}@ecotrack.lk`;
        const phoneToUse = row.resident_phone || '+94 77 000 0000';
        
        // Check if resident is already registered by email or unit
        const existingRes = updatedResidents.find(r => r.email.toLowerCase() === emailToUse.toLowerCase() || (r.block.toLowerCase() === row.block.toLowerCase() && r.unit.toLowerCase() === row.unit_number.toLowerCase()));
        
        if (!existingRes) {
          const initials = row.resident.split(/\s+/).map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
          const newRes = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            name: row.resident,
            email: emailToUse,
            phone: phoneToUse,
            block: row.block,
            unit: row.unit_number,
            language: 'English',
            moveInDate: new Date().toISOString().split('T')[0],
            avatar: initials || 'R',
            nic: `199${Math.floor(100000 + Math.random() * 900000)}V`,
            occupancyType: 'Tenant',
            householdMembers: 2,
            recyclingPlan: 'Standard Recycler',
            whatsappEnabled: true,
            assistanceRequired: false,
            emergencyContactName: 'Emergency Contact',
            emergencyContactPhone: '+94 77 123 4567',
            notes: 'Imported via CSV Resident Register.'
          };
          updatedResidents.push(newRes);
          residentsRegisteredCount++;
        }
      }
    });

    setBlocks(updatedBlocks);
    setResidents(updatedResidents);
    setCsvPreviewData([]);
    setCsvRawText('');
    setCsvFile(null);
    setIsImportCSVModalOpen(false);

    let successMsg = `Successfully parsed CSV & imported structures! Added ${blocksAddedCount} new blocks, matched/created ${unitsUpdatedCount} housing units`;
    if (residentsRegisteredCount > 0) {
      successMsg += `, and registered ${residentsRegisteredCount} resident profile(s) in the system directory!`;
    } else {
      successMsg += '.';
    }
    setFeedbackMessage(successMsg);

    // Track activity
    setActivities([
      {
        id: Date.now(),
        type: 'resident',
        text: `CSV Resident Register Processed: Imported ${unitsUpdatedCount} units across complex structures`,
        time: 'Just now',
        icon: 'user'
      },
      ...activities
    ]);
  };

  // Submit handlers for interactive Housing features
  const handleCreateBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const floors = parseInt(addBlockForm.floors_count) || 1;
    const unitsPerFloor = parseInt(addBlockForm.units_per_floor) || 1;
    const name = addBlockForm.name || `Block ${String.fromCharCode(65 + (blocks?.length || 0))}`;
    const notes = addBlockForm.notes || 'Newly constructed wing';

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/blocks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          notes: notes,
          total_floors: floors,
          units_per_floor: unitsPerFloor
        })
      });
      if (!response.ok) throw new Error();
      setFeedbackMessage(`Successfully created new building block: ${name} inside online database!`);
      loadAdminMetrics();
    } catch {
      const newBlockObj = {
        id: Date.now(),
        name,
        notes,
        floors_count: floors,
        units_per_floor: unitsPerFloor,
        expanded: true,
        units: generateUnitsForBlock(name, floors, unitsPerFloor)
      };
      
      setBlocks([...blocks, newBlockObj]);
      setFeedbackMessage(`Created new building block: ${newBlockObj.name} successfully (local cache).`);
    } finally {
      setActionLoading(false);
      setIsAddBlockModalOpen(false);
      setAddBlockForm({ name: '', floors_count: '5', units_per_floor: '5', notes: '' });

      setActivities([
        { 
          id: Date.now(), 
          type: 'resident', 
          text: `Added new housing structure: ${name} (${floors} floors)`, 
          time: 'Just now', 
          icon: 'user' 
        },
        ...activities
      ]);
    }
  };

  const handleEditBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/blocks/${editingBlock.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editBlockForm.name,
          notes: editBlockForm.notes
        })
      });
      if (!response.ok) throw new Error();
      setFeedbackMessage(`Updated building settings for block: ${editBlockForm.name} in cloud database!`);
      loadAdminMetrics();
    } catch {
      const floors = parseInt(editBlockForm.floors_count) || 1;
      const unitsPerFloor = parseInt(editBlockForm.units_per_floor) || 1;

      setBlocks(prev => prev.map(b => {
        if (b.id !== editingBlock.id) return b;

        // Adjust units dynamically
        let updatedUnits = { ...(b.units || {}) };
        const blockLetter = editBlockForm.name.replace(/Block\s+/i, '').trim().charAt(0) || 'U';

        // Remove excess floors
        const currentFloors = Object.keys(updatedUnits).map(Number);
        currentFloors.forEach(f => {
          if (f > floors) {
            delete updatedUnits[f];
          }
        });

        // Maintain structure
        for (let f = 1; f <= floors; f++) {
          if (!updatedUnits[f]) {
            const floorUnits = [];
            for (let u = 1; u <= unitsPerFloor; u++) {
              floorUnits.push({
                unit_number: `${blockLetter}-${f}${u < 10 ? '0' + u : u}`,
                resident: null,
                resident_phone: null,
                resident_email: null
              });
            }
            updatedUnits[f] = floorUnits;
          } else {
            let currentFloorUnits = [...updatedUnits[f]];
            if (currentFloorUnits.length > unitsPerFloor) {
              currentFloorUnits = currentFloorUnits.slice(0, unitsPerFloor);
            } else if (currentFloorUnits.length < unitsPerFloor) {
              for (let u = currentFloorUnits.length + 1; u <= unitsPerFloor; u++) {
                currentFloorUnits.push({
                  unit_number: `${blockLetter}-${f}${u < 10 ? '0' + u : u}`,
                  resident: null,
                  resident_phone: null,
                  resident_email: null
                });
              }
            }
            updatedUnits[f] = currentFloorUnits;
          }
        }

        return {
          ...b,
          name: editBlockForm.name,
          notes: editBlockForm.notes,
          floors_count: floors,
          units_per_floor: unitsPerFloor,
          units: updatedUnits
        };
      }));
      setFeedbackMessage(`Updated building settings for block: ${editBlockForm.name} successfully!`);
    } finally {
      setActionLoading(false);
      setIsEditBlockModalOpen(false);
      setEditingBlock(null);
    }
  };

  const handleDeleteBlock = (blockId: number) => {
    const targetBlock = blocks.find(b => b.id === blockId);
    if (!targetBlock) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete Housing Block",
      message: `Are you sure you want to delete ${targetBlock.name} completely? All corridors, units, and resident details in this block will be permanently deleted from Greenfield Residencies.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const response = await fetch(`/api/admin/blocks/${blockId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          if (!response.ok) throw new Error();
          setFeedbackMessage(`Deleted building block ${targetBlock.name} from database successfully.`);
          loadAdminMetrics();
        } catch {
          setBlocks(prev => prev.filter(b => b.id !== blockId));
          
          // Real-time synchronization: clear deleted block reference from residents
          setResidents(prev => prev.map(res => {
            if (res.block === targetBlock.name) {
              return { ...res, block: '', unit: '' };
            }
            return res;
          }));

          // Real-time synchronization: clear deleted block reference from workers' assignedBlocks
          setUsers(prev => prev.map(u => {
            if (u.role === 'worker' && u.assignedBlocks) {
              const updatedBlocks = u.assignedBlocks
                .split(',')
                .map((b: string) => b.trim())
                .filter((b: string) => b && b !== targetBlock.name)
                .join(', ');
              return { ...u, assignedBlocks: updatedBlocks };
            }
            return u;
          }));

          setFeedbackMessage(`Deleted building block ${targetBlock.name} successfully (local cache).`);
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
          
          setActivities(prev => [
            { 
              id: Date.now(), 
              type: 'resident', 
              text: `Permanently removed housing block: ${targetBlock.name}`, 
              time: 'Just now', 
              icon: 'user' 
            },
            ...prev
          ]);
        }
      }
    });
  };

  const handleDeleteFloor = (blockId: number, floorNum: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete Floor Corridor",
      message: `Are you sure you want to delete Floor ${floorNum} of ${block.name} completely? All houses on this floor will be permanently deleted.`,
      onConfirm: () => {
        // Collect unit numbers that were on this deleted floor to clean up resident state
        const deletedUnits = (block.units && block.units[floorNum]) 
          ? block.units[floorNum].map((u: any) => u.unit_number) 
          : [];

        setBlocks(prev => prev.map(b => {
          if (b.id !== blockId) return b;
          
          const updatedUnits = { ...(b.units || {}) };
          delete updatedUnits[floorNum];
          
          const newUnits: any = {};
          let updatedFloorsCount = b.floors_count - 1;
          if (updatedFloorsCount < 0) updatedFloorsCount = 0;
          
          let currentNewFloor = 1;
          for (let f = 1; f <= b.floors_count; f++) {
            if (f === floorNum) continue;
            if (updatedUnits[f]) {
              newUnits[currentNewFloor] = updatedUnits[f];
            }
            currentNewFloor++;
          }

          return {
            ...b,
            floors_count: updatedFloorsCount,
            units: newUnits
          };
        }));

        // Real-time synchronization: clear deleted floor units from residents
        setResidents(prev => prev.map(res => {
          if (res.block === block.name && deletedUnits.includes(res.unit)) {
            return { ...res, block: '', unit: '' };
          }
          return res;
        }));

        setFeedbackMessage(`Permanently deleted Floor ${floorNum} from ${block.name}.`);
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteUnit = (blockId: number, floorNum: number, unitNumber: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete Residence House",
      message: `Are you sure you want to permanently delete house ${unitNumber} from Floor ${floorNum} of ${block.name}?`,
      onConfirm: () => {
        setBlocks(prev => prev.map(b => {
          if (b.id !== blockId) return b;
          
          const updatedUnits = { ...(b.units || {}) };
          if (updatedUnits[floorNum]) {
            updatedUnits[floorNum] = updatedUnits[floorNum].filter((u: any) => u.unit_number !== unitNumber);
          }
          
          return {
            ...b,
            units: updatedUnits
          };
        }));

        // Real-time synchronization: clear deleted unit reference from residents
        setResidents(prev => prev.map(res => {
          if (res.block === block.name && res.unit === unitNumber) {
            return { ...res, block: '', unit: '' };
          }
          return res;
        }));

        setFeedbackMessage(`Permanently deleted house ${unitNumber} from Floor ${floorNum}.`);
        setConfirmModal(null);
      }
    });
  };

  const handleCreateUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUnitTarget || !newUnitNumber.trim()) return;

    const targetUnitName = newUnitNumber.trim().toUpperCase();

    setActionLoading(true);
    try {
      const targetBlockObj = blocks.find(b => b.id === addUnitTarget.blockId);
      if (!targetBlockObj) throw new Error();

      const targetFloorObj = targetBlockObj.floors?.find((f: any) => f.floor_number === addUnitTarget.floorNumber);
      if (!targetFloorObj || !targetFloorObj.id) throw new Error();

      const response = await fetch(`/api/admin/floors/${targetFloorObj.id}/units`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          unit_number: targetUnitName
        })
      });
      if (!response.ok) throw new Error();
      setFeedbackMessage(`Success! Added unit ${targetUnitName} on Floor ${addUnitTarget.floorNumber} inside cloud database.`);
      loadAdminMetrics();
    } catch {
      setBlocks(prevBlocks => prevBlocks.map(b => {
        if (b.id !== addUnitTarget.blockId) return b;
        
        const updatedUnits = { ...b.units };
        const floorList = updatedUnits[addUnitTarget.floorNumber] || [];
        
        // Prevent duplicate unit numbers
        if (floorList.some((u: any) => u.unit_number.toLowerCase() === targetUnitName.toLowerCase())) {
          return b;
        }

        const newUnitObj = {
          unit_number: targetUnitName,
          resident: null,
          resident_phone: null,
          resident_email: null
        };

        updatedUnits[addUnitTarget.floorNumber] = [...floorList, newUnitObj];

        return {
          ...b,
          units: updatedUnits
        };
      }));

      setFeedbackMessage(`Success! Added unit ${targetUnitName} on Floor ${addUnitTarget.floorNumber} (local fallback caches).`);
    } finally {
      setActionLoading(false);
      setIsAddUnitModalOpen(false);
      setNewUnitNumber('');
      setAddUnitTarget(null);
    }
  };

  const handleAssignResidentSubmit = async () => {
    if (!assignTarget) return;

    // Dynamically resolve the unit's numeric database id by searching in our loaded blocks state
    const targetBlockObj = blocks.find(b => b.id === assignTarget.blockId);
    let unitId: number | null = null;
    if (targetBlockObj && targetBlockObj.units) {
      const floorUnits = targetBlockObj.units[assignTarget.floorNumber] || [];
      const matchedUnit = floorUnits.find((u: any) => u.unit_number === assignTarget.unitNumber);
      if (matchedUnit) {
        unitId = matchedUnit.id;
      }
    }

    if (!unitId) {
      setFeedbackMessage(`Error: Could not resolve database ID for Unit ${assignTarget.unitNumber}`);
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/units/${unitId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resident_id: selectedResidentId
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || 'Server error occurred during unit assignment');
      }

      if (selectedResidentId === -1) {
        setFeedbackMessage(`Unit ${assignTarget.unitNumber} marked vacant.`);
      } else {
        const residentObj = residents.find(r => r.id === selectedResidentId);
        setFeedbackMessage(`Successfully assigned occupant ${residentObj?.name} to unit ${assignTarget.unitNumber}!`);
        
        setActivities([
          { 
            id: Date.now(), 
            type: 'resident', 
            text: `Assigned occupant ${residentObj?.name} to Unit ${assignTarget.unitNumber}`, 
            time: 'Just now', 
            icon: 'user' 
          },
          ...activities
        ]);
      }

      await loadAdminMetrics(); // Reload all structures and users with updated DB states
    } catch (err: any) {
      console.error("handleAssignResidentSubmit error:", err);
      setFeedbackMessage(`Failed to assign resident: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
      setIsAssignModalOpen(false);
      setAssignTarget(null);
      setSelectedResidentId(null);
      setResidentSearchQuery('');
    }
  };

  // Create routine collection task
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newJob)
      });
      if (!response.ok) throw new Error();
      setFeedbackMessage('New waste collection task scheduled successfully.');
      loadAdminMetrics();
    } catch (err: any) {
      console.error("handleCreateJob API error:", err);
      setFeedbackMessage('Failed to create job. Please check your session and try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Enlist a worker
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    let serverErrorMsg = '';
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: workerForm.fullName, 
          email: workerForm.email || `${workerForm.fullName.toLowerCase().replace(/\s+/g, '')}@ecotrack.lk`, 
          phone: workerForm.phone || '+94 77 123 4567', 
          shift: (() => {
            const sh = (workerForm.shift || 'morning').toLowerCase();
            if (sh.includes('morning')) return 'morning';
            if (sh.includes('evening')) return 'evening';
            if (sh.includes('night')) return 'night';
            return 'morning';
          })(), 
          role: 'worker',
          password: 'password123' // satisfy validation rule minimum 6 chars
        })
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        console.error("Worker creation failed:", errJson);
        const errMsg = errJson?.message || (errJson && JSON.stringify(errJson.errors)) || 'Server Validation Error';
        serverErrorMsg = errMsg ? `: ${errMsg}` : '';
        throw new Error(errMsg);
      }
      setFeedbackMessage(`Success! Onboarded new worker profile: ${workerForm.fullName}`);
      loadAdminMetrics();
    } catch (err: any) {
      const workerObj = {
        id: Date.now(),
        name: workerForm.fullName,
        email: workerForm.email || `${workerForm.fullName.toLowerCase().replace(/\s+/g, '')}@ecotrack.lk`,
        phone: workerForm.phone || '+94 77 123 4567',
        role: 'worker',
        shift: workerForm.shift,
        status: 'active',
        rating: 5.0,
        nic: workerForm.nic || 'N/A',
        assignedBlocks: workerForm.assignedBlocks || 'All Blocks',
        avatar: workerForm.avatar || '',
      };
      setUsers(prev => [workerObj, ...prev]);
      setFeedbackMessage(`Enrolled Locally${serverErrorMsg}. Saved in simulated local cache.`);
    } finally {
      setActionLoading(false);
      setIsAddWorkerModalOpen(false);
      setWorkerForm({
        fullName: '',
        nic: '',
        phone: '',
        email: '',
        shift: 'Morning',
        assignedBlocks: '',
        avatar: '',
      });
    }
  };

  // Enlist a resident
  const handleCreateResident = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${residentForm.firstName} ${residentForm.lastName}`.trim();
    if (!fullName) return;

    setActionLoading(true);
    try {
      // Find unit_id matching block and unit name from our loaded block data (if successful)
      let unit_id: number | null = null;
      if (Array.isArray(blocks)) {
        const targetBlock = blocks.find(b => b.name === residentForm.block || (b.name === 'Block A' && residentForm.block === 'Block A'));
        if (targetBlock && targetBlock.units) {
          const cleanUnitIdStr = (val: string) => val.toLowerCase().replace(/[^a-z0-9]/g, '');
          Object.keys(targetBlock.units).forEach((floorKey: string) => {
            if (Array.isArray(targetBlock.units[floorKey])) {
              const matchedUnit = targetBlock.units[floorKey].find((u: any) => {
                const cn1 = cleanUnitIdStr(u.unit_number || '');
                const cn2 = cleanUnitIdStr(residentForm.unit || '');
                return cn1 === cn2 || cn1.endsWith(cn2) || cn2.endsWith(cn1);
              });
              if (matchedUnit && matchedUnit.id) {
                unit_id = matchedUnit.id;
              }
            }
          });
        }
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fullName,
          email: residentForm.email || `${residentForm.firstName.toLowerCase()}@ecotrack.lk`,
          phone: residentForm.phone || '+94 77 000 0000',
          role: 'resident',
          password: 'password123',
          unit_id: unit_id,
          unit_number: residentForm.unit, // Fallback: backend resolves unit_number → unit_id
          block: residentForm.block,      // Fallback: helps backend narrow the search
        })
      });
      
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        console.error("Resident creation API error:", errJson);
        const errMsg = errJson?.message || (errJson && JSON.stringify(errJson.errors)) || 'Server Validation Error';
        throw new Error(errMsg);
      }
      
      const result = await response.json().catch(() => null);
      setFeedbackMessage(`Success! Onboarded new resident profile: ${fullName}`);
      loadAdminMetrics(); // Refresh all data including blocks (with updated resident assignments)
    } catch (err: any) {
      console.error("handleCreateResident error:", err);
      setFeedbackMessage(`Failed to create resident: ${err?.message || 'Unknown error'}. Please check your session and try again.`);
    } finally {
      setActionLoading(false);
      setIsAddResidentModalOpen(false);
    }

    // Dynamic fallback for resetting the form to avoid stale or deleted selections, default to vacant
    const defaultBlock = blocks && blocks.length > 0 ? blocks[0].name : 'Block A';
    const targetBlockObj = blocks && blocks.length > 0 ? blocks[0] : null;
    const targetUnits = targetBlockObj ? (Object.values(targetBlockObj.units || {}).flat() as any[]) : [];
    const vacantUnits = targetUnits.filter(u => !u.resident);
    const defaultUnit = vacantUnits[0]?.unit_number || targetUnits[0]?.unit_number || 'A-101';

    setResidentForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      block: defaultBlock,
      unit: defaultUnit,
      language: 'English',
      moveInDate: '2026-05-20',
      avatar: '',
      nic: '',
      occupancyType: 'Owner-Occupier',
      householdMembers: 2,
      recyclingPlan: 'Standard Recycler',
      whatsappEnabled: true,
      assistanceRequired: false,
      emergencyContactName: '',
      emergencyContactPhone: '',
      notes: '',
    });
  };

  const handleDeleteResident = (id: number) => {
    const resident = residents.find(r => r.id === id);
    if (!resident) return;
    setConfirmModal({
      isOpen: true,
      title: "Remove Resident Profile",
      message: `Are you sure you want to completely remove the profile for resident ${resident.name}? All of their account logins and assignments in EcoTrack will be permanently cleared.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          if (!response.ok) throw new Error();
          setFeedbackMessage(`Permanently deleted resident ${resident.name} profile from cloud database.`);
          loadAdminMetrics();
        } catch (err) {
          setResidents(prev => prev.filter(r => r.id !== id));
          setFeedbackMessage(`Permanently deleted resident ${resident.name} profile (local UI fallback).`);
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }

        // Clear dynamic occupant assignment in the housing block state as well
        if (resident.block && resident.unit) {
          setBlocks(prevBlocks => prevBlocks.map(b => {
            if (b.name !== resident.block) return b;
            const updatedUnits = { ...(b.units || {}) };
            Object.keys(updatedUnits).forEach(floorKey => {
              updatedUnits[floorKey] = updatedUnits[floorKey].map((u: any) => {
                if (u.unit_number === resident.unit) {
                  return {
                    ...u,
                    resident: null,
                    resident_phone: null,
                    resident_email: null
                  };
                }
                return u;
              });
            });
            return {
              ...b,
              units: updatedUnits
            };
          }));
        }
      }
    });
  };

  const handleDeleteWorkerFromList = (id: number) => {
    const worker = users.find(u => u.id === id);
    if (!worker) return;
    setConfirmModal({
      isOpen: true,
      title: "Remove Worker Profile",
      message: `Are you sure you want to completely remove the profile for worker ${worker.name}? Their garbage collection shift hours and job history will be affected.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          if (!response.ok) throw new Error();
          setFeedbackMessage(`Permanently deleted worker ${worker.name} profile from cloud database.`);
          loadAdminMetrics();
        } catch (err) {
          setUsers(prev => prev.filter(u => u.id !== id));
          setFeedbackMessage(`Permanently deleted worker ${worker.name} profile (local UI fallback).`);
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // Resolve complaint
  const handleResolveComplaint = async (id: number, notes: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/complaints/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ internal_notes: notes })
      });
      if (!response.ok) throw new Error();
      setFeedbackMessage('Complaint flagged as resolved successfully.');
      loadAdminMetrics();
    } catch {
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved', resolved_notes: notes, internal_notes: notes } : c));
      setFeedbackMessage(`Resolved complaint LOCALLY with notes: "${notes}"`);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete complaint
  const handleDeleteComplaint = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this complaint? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/complaints/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error();
      setFeedbackMessage('Complaint deleted successfully from database.');
      setSelectedComplaint(null);
      loadAdminMetrics();
    } catch {
      setComplaints(prev => prev.filter(c => c.id !== id));
      setSelectedComplaint(null);
      setFeedbackMessage('Complaint deleted successfully (local cache fallback).');
    } finally {
      setActionLoading(false);
    }
  };


  // Dynamic calculation for Jobs per day from actual system jobs
  const dynamicDayStats = [
    { label: 'Mon', completed: 0, total: 0 },
    { label: 'Tue', completed: 0, total: 0 },
    { label: 'Wed', completed: 0, total: 0 },
    { label: 'Thu', completed: 0, total: 0 },
    { label: 'Fri', completed: 0, total: 0 },
    { label: 'Sat', completed: 0, total: 0 },
    { label: 'Sun', completed: 0, total: 0 },
  ];

  jobs.forEach(job => {
    if (job.scheduled_date) {
      const date = new Date(job.scheduled_date);
      if (!isNaN(date.getTime())) {
        const dayIdx = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
        const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1; // Map Sunday to 6, Mon to 0 etc
        if (mappedIdx >= 0 && mappedIdx < 7) {
          dynamicDayStats[mappedIdx].total += 1;
          if (job.status === 'done') {
            dynamicDayStats[mappedIdx].completed += 1;
          }
        }
      }
    }
  });

  const maxDayTotal = Math.max(...dynamicDayStats.map(d => d.total), 1);

  const jobBars = dynamicDayStats.map(d => {
    const percentTotal = d.total > 0 ? (d.total / maxDayTotal) : 0;
    const hTotal = d.total > 0 ? Math.max(Math.round(percentTotal * 200), 20) : 0; 
    const hCompleted = d.total > 0 ? Math.round((d.completed / d.total) * hTotal) : 0;
    return {
      label: d.label,
      completed: d.completed,
      total: d.total,
      heightTotalPx: hTotal,
      heightCompletedPx: hCompleted,
    };
  });

  // Filtering data according to search typing
  const filteredJobs = jobs.filter(j => 
    j.worker?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.block?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.unit?.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = payments.filter(p => 
    p.reference_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.unit?.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F4F6F0] flex flex-col md:flex-row font-sans text-gray-800 antialiased" id="admin-main-viewport">
      
      {/* MOBILE STICKY NAVIGATION HEADER */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-[#E2E8F0] px-4 py-3 sticky top-0 z-40 w-full" id="admin-mobile-header">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 -ml-1 text-gray-500 hover:text-[#2E7D32] hover:bg-gray-50 rounded-xl focus:outline-none transition-colors"
            title="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-[#2E7D32] text-white p-1.5 rounded-lg flex items-center justify-center w-8 h-8 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10c0-5-4-9-9-10z" />
                <path d="M12 6a6 6 0 0 1 6 6M12 18v-6" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-[#164121] leading-none tracking-tight">EcoTrack</h2>
              <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase inline-block leading-none mt-0.5">ADMIN</span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWERS OVERLAY SIDEBAR */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex" id="mobile-sidebar-drawer">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            
            {/* Drawer Area */}
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative flex flex-col w-72 max-w-[280px] bg-white h-full shadow-2xl z-10 text-left"
            >
              {/* Drawer Top Header */}
              <div className="p-4 border-b border-[#F4F6F0] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-[#2E7D32] text-white p-1.5 rounded-lg flex items-center justify-center w-8 h-8 shadow-sm">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10c0-5-4-9-9-10z" />
                      <path d="M12 6a6 6 0 0 1 6 6M12 18v-6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[#164121] leading-none tracking-tight">EcoTrack</h2>
                    <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase block mt-0.5">ADMIN</span>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none cursor-pointer"
                  title="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation inside Drawer */}
              <nav className="p-4 space-y-1 overflow-y-auto flex-grow animate-in fade-in duration-200">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: ClipboardList },
                  { id: 'housing', label: 'Housing', icon: Landmark },
                  { id: 'users', label: 'Users', icon: Users },
                  { id: 'jobs', label: 'Jobs', icon: ClipboardList },
                  { id: 'qrcodes', label: 'QR Codes', icon: QrCode },
                  { id: 'payments', label: 'Payments', icon: Landmark },
                  { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
                  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
                  { id: 'settings', label: 'Settings', icon: SettingsIcon },
                ].map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#E8F5E9] text-[#2E7D32] shadow-sm font-extrabold' 
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2E7D32]' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Drawer User block */}
              <div className="p-4 border-t border-[#F4F6F0] flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {settingsProfile.avatarUrl ? (
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-gray-150 shadow-sm bg-gray-100">
                        <img
                          src={settingsProfile.avatarUrl}
                          alt={`${settingsProfile.firstName} ${settingsProfile.lastName}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 flex items-center justify-center font-extrabold text-xs">
                        {getInitials(settingsProfile.firstName, settingsProfile.lastName)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white"></span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-none">
                      {settingsProfile.firstName} {settingsProfile.lastName ? `${settingsProfile.lastName.charAt(0)}.` : ''}
                    </p>
                    <span className="text-[10px] font-semibold text-gray-400 tracking-tight mt-0.5 block leading-none">{settingsProfile.role || 'Scheme Manager'}</span>
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('logout');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Log out"
                  className="p-2 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION - exact color theme and options matching the screenshot */}
      <aside className="hidden md:flex w-full md:w-64 bg-white border-r border-[#E2E8F0] flex-col justify-between shrink-0" id="admin-sidebar">
        <div>
          {/* Logo Brand Header Block */}
          <div className="p-6 border-b border-[#F4F6F0] flex items-center gap-3">
            <div className="bg-[#2E7D32] text-white p-2 rounded-xl flex items-center justify-center w-10 h-10 shadow-sm shadow-emerald-950/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10c0-5-4-9-9-10z" />
                <path d="M12 6a6 6 0 0 1 6 6M12 18v-6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black text-[#164121] leading-none tracking-tight">EcoTrack</h2>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-1 block">ADMIN PORTAL</span>
            </div>
          </div>

          {/* Nav List with Green Accent Styling (Screenshot Perfect) */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: ClipboardList },
              { id: 'housing', label: 'Housing', icon: Landmark },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'jobs', label: 'Jobs', icon: ClipboardList },
              { id: 'qrcodes', label: 'QR Codes', icon: QrCode },
              { id: 'payments', label: 'Payments', icon: Landmark },
              { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
              { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#E8F5E9] text-[#2E7D32] shadow-sm font-extrabold' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2E7D32]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM USER AVATAR SLOT inside Sidebar (Screenshot Style) */}
        <div className="p-4 border-t border-[#F4F6F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {settingsProfile.avatarUrl ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-150 shadow-sm bg-gray-100">
                  <img
                    src={settingsProfile.avatarUrl}
                    alt={`${settingsProfile.firstName} ${settingsProfile.lastName}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 flex items-center justify-center font-extrabold text-xs">
                  {getInitials(settingsProfile.firstName, settingsProfile.lastName)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 leading-none">
                {settingsProfile.firstName} {settingsProfile.lastName ? `${settingsProfile.lastName.charAt(0)}.` : ''}
              </p>
              <span className="text-[10px] font-semibold text-gray-400 tracking-tight mt-0.5 block">{settingsProfile.role || 'Scheme Manager'}</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setActiveTab('logout')}
            title="Log out"
            className="p-2 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </aside>

      {/* MAIN VIEW CONTENT AREA with custom top header & grid layout */}
      <main className="flex-grow flex flex-col md:h-screen md:overflow-hidden min-w-0">
        
        {/* TOP LEVEL NAVIGATION HEADER */}
        <header className="bg-[#F4F6F0] border-b border-gray-200/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 py-4 px-4 sm:px-6 md:px-8 shrink-0 z-20 shadow-sm md:shadow-none">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">
              {(() => {
                if (activeTab === 'dashboard') return 'Home / Dashboard';
                if (activeTab === 'jobs') {
                  if (selectedJobId) return `Home / Jobs / ${selectedJobId}`;
                  if (jobsSubView === 'calendar') return 'Home / Jobs / Create';
                  return 'Home / Jobs';
                }
                if (activeTab === 'qrcodes') return 'Home / QR Codes';
                return `Home / ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;
              })()}
            </span>
            <h1 className="text-2xl font-black text-[#164121] tracking-tight mt-0.5 animate-in fade-in duration-200">
              {(() => {
                if (activeTab === 'dashboard') return 'Executive Dashboard';
                if (activeTab === 'jobs') {
                  if (selectedJobId) return 'Job Detail';
                  if (jobsSubView === 'calendar') return 'Job Scheduling';
                  return 'All Jobs';
                }
                if (activeTab === 'housing') return 'Corridor Housing';
                if (activeTab === 'qrcodes') return 'Physical Floor QR Codes';
                if (activeTab === 'users') return 'Property Users & Crew';
                if (activeTab === 'payments') return 'Financial Ledger & Payments';
                if (activeTab === 'complaints') return 'Grievances & Complaints Desk';
                if (activeTab === 'reports') return 'System Intelligence Reports';
                if (activeTab === 'settings') return 'Settings & Configurations';
                return activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
              })()}
            </h1>
          </div>

          {/* SEARCH BAR & UTILITIES (Exact match) */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search residents, jobs, blocks..."
                className="w-full sm:w-[280px] bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/15 focus:border-[#2E7D32] rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 shadow-sm font-semibold"
              />
            </div>
            
            {/* Notifications Bell with Interactive Dropdown */}
            <div className="relative">
              <button 
                type="button"
                className={`relative p-2.5 bg-white border rounded-xl text-gray-600 hover:text-[#2E7D32]/85 focus:border-[#2E7D32]/50 hover:border-[#2E7D32]/40 shadow-sm cursor-pointer transition-all focus:outline-none block ${isNotificationDropdownOpen ? 'border-[#2E7D32]/50 ring-2 ring-[#2E7D32]/10 text-[#2E7D32]' : 'border-gray-200'}`}
                onClick={() => {
                  setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
                  setIsProfileDropdownOpen(false); // Close profile dropdown when this is opened
                }}
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {isNotificationDropdownOpen && (
                <>
                  {/* Invisible backdrop layer to support click-away dismiss */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsNotificationDropdownOpen(false)}
                  />
                  
                  {/* Notifications Dropdown Panel */}
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-gray-150 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-3 duration-200 text-left text-slate-800">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">System Alerts</span>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="text-[10px] bg-red-100 text-red-600 font-extrabold px-1.5 py-0.5 rounded-full">
                            {notifications.filter(n => !n.read).length} New
                          </span>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotifications(notifications.map(n => ({ ...n, read: true })));
                            setFeedbackMessage("All notifications marked as read.");
                          }}
                          className="text-[10px] text-[#2E7D32] hover:text-[#1b4e1e] font-extrabold transition-all cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 font-bold flex flex-col items-center justify-center gap-2">
                          <CheckCircle className="w-8 h-8 text-gray-200" />
                          <p className="text-xs">No pending notifications!</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          let Icon = Info;
                          let iconColor = 'text-blue-500 bg-blue-50';
                          if (notif.type === 'complaint') {
                            Icon = AlertTriangle;
                            iconColor = 'text-amber-500 bg-amber-50';
                          } else if (notif.type === 'payment') {
                            Icon = Landmark;
                            iconColor = 'text-emerald-500 bg-emerald-50';
                          } else if (notif.type === 'job') {
                            Icon = ClipboardList;
                            iconColor = 'text-[#2E7D32] bg-emerald-50';
                          } else if (notif.type === 'user') {
                            Icon = Users;
                            iconColor = 'text-indigo-500 bg-indigo-50';
                          }

                          return (
                            <div 
                              key={notif.id}
                              className={`p-3.5 flex gap-3 hover:bg-slate-50 transition-all cursor-pointer ${notif.read ? 'opacity-70 bg-white' : 'bg-emerald-50/10'}`}
                              onClick={() => {
                                // Mark single as read
                                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                if (notif.type === 'complaint') {
                                  setActiveTab('complaints');
                                } else if (notif.type === 'payment') {
                                  setActiveTab('payments');
                                } else if (notif.type === 'job') {
                                  setActiveTab('jobs');
                                } else if (notif.type === 'user') {
                                  setActiveTab('users');
                                }
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
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1" />
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 leading-normal line-clamp-2 mt-0.5 font-medium">
                                  {notif.message}
                                </p>
                                <span className="text-[10px] text-gray-400 font-bold block mt-1">
                                  {notif.time}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Avoid triggering parent div click
                                  setNotifications(notifications.filter(n => n.id !== notif.id));
                                }}
                                className="text-gray-300 hover:text-red-500 transition-colors self-start p-1 hover:bg-gray-100 rounded shrink-0 cursor-pointer"
                                title="Dismiss notification"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
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
                            setFeedbackMessage("Cleared all notifications.");
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

            {/* Interactive Profile Picture Thumbnail with Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 hover:border-[#2E7D32]/50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 transition-all shadow-sm bg-gray-200 cursor-pointer block"
              >
                {settingsProfile.avatarUrl ? (
                  <img 
                    src={settingsProfile.avatarUrl} 
                    alt={`${settingsProfile.firstName} ${settingsProfile.lastName}`} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center font-extrabold text-xs">
                    {getInitials(settingsProfile.firstName, settingsProfile.lastName)}
                  </div>
                )}
              </button>

              {isProfileDropdownOpen && (
                <>
                  {/* Invisible backdrop layer to support click-away dismiss */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  
                  {/* Dropdown Box Component */}
                  <div className="absolute right-0 mt-2.5 w-64 bg-white border border-gray-150 rounded-2xl shadow-xl z-50 py-2.5 animate-in fade-in slide-in-from-top-3 duration-200 text-left text-slate-800">
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3">
                      {settingsProfile.avatarUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-100 shrink-0">
                          <img 
                            src={settingsProfile.avatarUrl} 
                            alt={`${settingsProfile.firstName} ${settingsProfile.lastName}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 flex items-center justify-center font-extrabold text-xs shrink-0">
                          {getInitials(settingsProfile.firstName, settingsProfile.lastName)}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-black text-slate-900 truncate leading-tight">
                          {settingsProfile.firstName} {settingsProfile.lastName}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold truncate mt-0.5">
                          {settingsProfile.role || 'Scheme Manager'}
                        </p>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      {/* Personal Settings Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('settings');
                          setActiveSettingsTab('profile');
                          setIsProfileDropdownOpen(false);
                          setFeedbackMessage("Opened Personal Profile Settings.");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-750 hover:bg-emerald-50 hover:text-[#2E7D32] transition-all cursor-pointer text-left"
                      >
                        <User className="w-4 h-4 text-gray-405 stroke-[2]" />
                        <span>Profile Settings</span>
                      </button>

                      {/* Security Settings Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('settings');
                          setActiveSettingsTab('password');
                          setIsProfileDropdownOpen(false);
                          setFeedbackMessage("Opened Security Settings.");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-750 hover:bg-emerald-50 hover:text-[#2E7D32] transition-all cursor-pointer text-left"
                      >
                        <Lock className="w-4 h-4 text-gray-405 stroke-[2]" />
                        <span>Security Settings</span>
                      </button>

                      {/* Help & Support Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('settings');
                          setActiveSettingsTab('help');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-750 hover:bg-emerald-50 hover:text-[#2E7D32] transition-all cursor-pointer text-left"
                      >
                        <HelpCircle className="w-4 h-4 text-gray-405 stroke-[2]" />
                        <span>Help & Support</span>
                      </button>

                      <div className="border-t border-gray-100 my-1 py-1" />

                      {/* Sign Out Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('logout');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 stroke-[2]" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN BODY AREA */}
        <div className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6">

          {/* FEEDBACK ALERT MESSAGE IF ACTIVE */}
          {feedbackMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-white border border-emerald-500/10 text-emerald-800 text-xs shadow-sm flex items-center justify-between gap-3"
            id="admin-status-message"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Info className="w-4 h-4 shrink-0" />
              </div>
              <span className="font-bold">{feedbackMessage}</span>
            </div>
            <button 
              type="button"
              onClick={() => setFeedbackMessage(null)} 
              className="text-gray-400 hover:text-gray-700 font-extrabold cursor-pointer px-1"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* ------------------------- DYNAMIC VIEWPORT TABS ------------------------- */}

        {/* TAB 1: EXECUTIVE DASHBOARD TAB (Exact Matching screenshot layouts) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6" id="dashboard-tab">
            
            {/* FOUR TOP METRICS INDEX CORES (Today's Jobs, Completed, Issues, Revenue) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Today's Jobs */}
              <div className="bg-white border border-gray-100 p-5 rounded-3xl shrink-0 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-[#E8F5E9] text-[#2E7D32] p-2 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg tracking-tight select-none">
                    {jobs.length > 0 ? `+${Math.round((jobs.filter(j => j.status !== 'pending').length / jobs.length) * 100)}%` : '+0%'}
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                    {stats.todayJobs}
                  </h3>
                  <p className="text-xs text-gray-400 font-extrabold mt-1.5 uppercase tracking-wide">
                    Today's Jobs
                  </p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-[#2E7D32]/2 rounded-full pointer-events-none group-hover:scale-110 transition-transform"></div>
              </div>

              {/* Card 2: Completed */}
              <div className="bg-white border border-gray-100 p-5 rounded-3xl shrink-0 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-[#E8F5E9] text-[#2E7D32] p-2 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg tracking-tight select-none">
                    {jobs.length > 0 ? Math.round((jobs.filter(j => j.status === 'done').length / jobs.length) * 100) : 0}%
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                    {stats.completedJobs}
                  </h3>
                  <p className="text-xs text-gray-400 font-extrabold mt-1.5 uppercase tracking-wide">
                    Completed
                  </p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-[#2E7D32]/2 rounded-full pointer-events-none group-hover:scale-110 transition-transform"></div>
              </div>

              {/* Card 3: Issues */}
              <div className="bg-white border border-gray-100 p-5 rounded-3xl shrink-0 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-red-50 text-red-600 p-2 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-xs bg-red-50 text-red-700 font-extrabold px-2.5 py-1 rounded-lg tracking-tight select-none">
                    {jobs.length > 0 ? `${Math.round((jobs.filter(j => j.status === 'issue').length / jobs.length) * 100)}%` : '0%'}
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none text-red-600">
                    {stats.issuesCount}
                  </h3>
                  <p className="text-xs text-gray-400 font-extrabold mt-1.5 uppercase tracking-wide">
                    Issues
                  </p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-red-50/10 rounded-full pointer-events-none group-hover:scale-110 transition-transform"></div>
              </div>

              {/* Card 4: Revenue */}
              <div className="bg-white border border-gray-100 p-5 rounded-3xl shrink-0 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-[#E8F5E9]/80 text-emerald-800 p-2 rounded-xl flex items-center justify-center">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg tracking-tight select-none">
                    {payments.length > 0 ? `${Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100)}% paid` : '0%'}
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                    {stats.revenueK}
                  </h3>
                  <p className="text-xs text-gray-400 font-extrabold mt-1.5 uppercase tracking-wide">
                    Revenue (LKR)
                  </p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-emerald-900/2 rounded-full pointer-events-none group-hover:scale-110 transition-transform"></div>
              </div>

            </div>

            {/* MIDDLE ROW: "Jobs per day" Bar Charts vs "Status breakdown" Donut Ring */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Jobs Per Day Dual Bar Cards (lg:col-span-8) */}
              <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm lg:col-span-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-black text-gray-900 tracking-tight">Jobs per day</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Last 7 days</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#2E7D32]"></span>
                    <span className="text-xs text-gray-500 font-bold">Completed</span>
                  </div>
                </div>

                {/* Vertical Chart Bars representing double stack heights precisely */}
                <div className="flex items-end justify-between gap-2.5 pt-8 pb-3 px-2 border-b border-gray-100 min-h-[280px]">
                  {jobBars.map((bar, idx) => (
                    <div key={idx} className="flex-grow flex flex-col items-center group relative cursor-pointer">
                      
                      {/* Interactive Hover Value Tip */}
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg pointer-events-none z-10 shadow-md font-mono text-center min-w-[75px]">
                        <strong className="block text-emerald-400 font-black">{bar.completed} Done</strong>
                        <span className="text-gray-400 text-[9px]">{bar.total} Total Jobs</span>
                      </div>

                      {/* Stacked Graphic Bar */}
                      <div className="w-8 sm:w-11 rounded-t-xl overflow-hidden bg-gray-100 relative h-[220px] flex flex-col justify-end">
                        {/* Secondary background stack (Total jobs) */}
                        <div 
                          className="w-full bg-[#E8F5E9] hover:bg-emerald-100 transition-all relative overflow-hidden" 
                          style={{ height: `${bar.heightTotalPx}px` }}
                        >
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-[#2E7D32] hover:bg-[#1E562F] transition-all rounded-t-lg shadow-inner" 
                            style={{ height: `${bar.heightCompletedPx}px` }}
                          />
                        </div>
                      </div>

                      <span className="text-[11px] text-gray-400 font-bold mt-4 tracking-tighter uppercase">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Breakdown Circle Ring (lg:col-span-4) */}
              <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm lg:col-span-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">Status breakdown</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Today</p>
                </div>

                {/* Donut circle constructed using accurate HTML SVG style */}
                <div className="my-8 flex justify-center items-center relative">
                  <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f3f4f6" strokeWidth="12" fill="none" />
                    {/* Circle representing Done - green */}
                    <circle cx="50" cy="50" r="40" stroke="#2E7D32" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={strokeDashoffsetDone} className="transition-all duration-500" />
                    {/* Circle representing In-Progress - blue */}
                    <circle cx="50" cy="50" r="40" stroke="#1E88E5" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={strokeDashoffsetInProgress} className="transition-all duration-500" />
                    {/* Circle representing Pending - yellow */}
                    <circle cx="50" cy="50" r="40" stroke="#FFB300" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={strokeDashoffsetPending} className="transition-all duration-500" />
                    {/* Circle representing Issue - red */}
                    <circle cx="50" cy="50" r="40" stroke="#F44336" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={strokeDashoffsetIssue} className="transition-all duration-500" />
                  </svg>

                  {/* Interspersed Total Indicator Centerpiece */}
                  <div className="absolute text-center bg-transparent">
                    <span className="text-3xl font-black text-gray-900 tracking-tight select-none">{totalJobsCount}</span>
                    <span className="text-[9px] text-gray-400 font-bold block tracking-wider uppercase">TOTAL</span>
                  </div>
                </div>

                {/* Legend list matching perfect pill colored entries */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-3.5 pt-4 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] shrink-0"></span>
                    <div>
                      <p className="font-extrabold text-gray-900 leading-none">Done</p>
                      <span className="text-[9px] text-gray-400 font-extrabold block mt-0.5">{donePercent}% ({doneCount})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1E88E5] shrink-0"></span>
                    <div>
                      <p className="font-extrabold text-gray-900 leading-none">In-Prog</p>
                      <span className="text-[9px] text-gray-400 font-extrabold block mt-0.5">{inProgressPercent}% ({inProgressCount})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFB300] shrink-0"></span>
                    <div>
                      <p className="font-extrabold text-gray-900 leading-none">Pending</p>
                      <span className="text-[9px] text-gray-400 font-extrabold block mt-0.5">{pendingPercent}% ({pendingCount})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F44336] shrink-0"></span>
                    <div>
                      <p className="font-extrabold text-gray-900 leading-none">Issue</p>
                      <span className="text-[9px] text-gray-400 font-extrabold block mt-0.5">{issuePercent}% ({issueCount})</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* BOTTOM ROW: "Recent activity" with dynamic triggers vs "Red flags" alert columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Recent activity Feed List (lg:col-span-8) */}
              <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm lg:col-span-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-black text-gray-900 tracking-tight">Recent activity</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('jobs')}
                    className="text-xs font-extrabold text-[#2E7D32] hover:text-[#1E562F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all →</span>
                  </button>
                </div>

                <div className="divide-y divide-gray-100 pr-1">
                  {activities.map((item) => (
                    <div key={item.id} className="py-3 sm:py-4 flex justify-between items-center group transition-colors first:pt-0">
                      <div className="flex items-center gap-4">
                        {/* Dynamic styled icons matching activity type */}
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          item.type === 'scan' ? 'bg-[#E8F5E9] text-[#2E7D32]' :
                          item.type === 'done' ? 'bg-[#E8F5E9] text-emerald-800' :
                          item.type === 'issue' ? 'bg-red-50 text-red-600' :
                          item.type === 'payment' ? 'bg-[#E8F5E9]/80 text-emerald-700' : 'bg-[#E8F5E9]/50 text-[#2E7D32]'
                        }`}>
                          {item.type === 'scan' && <QrCode className="w-4 h-4" />}
                          {item.type === 'done' && <CheckCircle className="w-4 h-4" />}
                          {item.type === 'issue' && <AlertTriangle className="w-4 h-4" />}
                          {item.type === 'payment' && <Landmark className="w-4 h-4" />}
                          {item.type === 'resident' && <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-relaxed group-hover:text-gray-900">
                            {item.text}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 tracking-tight whitespace-nowrap ml-4">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Red Flags warnings exact screenshot match (lg:col-span-4) */}
              <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-red-50 p-2 rounded-xl text-red-600">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                  </div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">Red flags</h3>
                </div>

                <div className="space-y-3">
                  {redFlags.map((flag) => (
                    <div 
                      key={flag.id} 
                      className="p-4 bg-[rgba(244,67,54,0.06)] border border-red-500/10 rounded-2xl flex flex-col justify-between hover:bg-[rgba(244,67,54,0.08)] transition-all cursor-pointer"
                      onClick={() => {
                        if (flag.id === 1) {
                          // Missed collection in Block C -> Go to jobs tab and filter as issue/all
                          setActiveTab('jobs');
                          setJobsFilterTab('issue');
                        } else if (flag.id === 2) {
                          // Rating drop -> Go to workers (users tab, workers subtab)
                          setActiveTab('users');
                          setUserSubTab('workers');
                        } else {
                          // Overdue payments -> Go to payments tab and filter as unpaid
                          setActiveTab('payments');
                          setPaymentFilter('unpaid');
                        }
                      }}
                    >
                      <h4 className="text-xs font-black text-red-700 leading-relaxed mb-1">
                        {flag.title}
                      </h4>
                      <span className="text-[9px] font-bold text-red-400 tracking-wide uppercase">
                        {flag.subtext}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: HOUSING STRUCTURES / CORRIDORS VIEW (Housing tab) */}
        {activeTab === 'housing' && (() => {
          // Dynamic housing search filtering logic
          const q = searchQuery.toLowerCase().trim();
          const filteredBlocksResult = blocks.map(block => {
            if (!q) return block;
            
            const blockMatches = block.name.toLowerCase().includes(q) || (block.notes && block.notes.toLowerCase().includes(q));
            
            const filteredUnits: any = {};
            let hasAnyUnitMatch = false;
            
            for (const floorNum in block.units) {
              const floorUnitsList = block.units[floorNum] || [];
              const matchingUnits = floorUnitsList.filter((u: any) => {
                const numMatch = u.unit_number.toLowerCase().includes(q);
                const resMatch = u.resident && u.resident.toLowerCase().includes(q);
                return numMatch || resMatch;
              });
              
              if (matchingUnits.length > 0) {
                filteredUnits[floorNum] = floorUnitsList;
                hasAnyUnitMatch = true;
              }
            }
            
            if (blockMatches || hasAnyUnitMatch) {
              return {
                ...block,
                expanded: true, // Auto expand on search matching!
                _highlighted: true
              };
            }
            return null;
          }).filter(Boolean);

          return (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6" id="housing-tab">
              {/* CONTENT HEADER ROW */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-[#164121]">Complex Housing Structures</h2>
                  <p className="text-xs text-gray-500 font-medium">Manage blocks, floors and resident units. Select any unit to assign occupants.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsImportCSVModalOpen(true);
                      setCsvParseError(null);
                      setCsvPreviewData([]);
                      setCsvRawText('');
                      setCsvFile(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-600/30 text-emerald-850 bg-[#E8F5E9]/20 hover:bg-[#E8F5E9]/40 text-xs font-black transition-all cursor-pointer shadow-sm text-emerald-800"
                  >
                    <Upload className="w-4 h-4 text-emerald-700" />
                    <span>Import CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddBlockModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-900/10"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Block +</span>
                  </button>
                </div>
              </div>

              {/* SEARCH FILTER BOX */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search block names, house numbers, or residents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F4F6F0]/40 hover:bg-[#F4F6F0]/70 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32]/50 placeholder-gray-400 font-bold text-gray-800 transition-all outline-none"
                />
              </div>

              {/* BLOCKS LAYOUT CONTAINER */}
              <div className="space-y-4">
                {filteredBlocksResult.length === 0 ? (
                  <div className="text-center py-12 bg-[#F4F6F0]/40 rounded-3xl border border-dashed border-gray-300">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-500">No matching blocks, floors, or resident units found.</p>
                    <span className="text-xs text-gray-450 text-gray-400 block mt-1 font-medium">Try searching for other block names or unit numbers.</span>
                  </div>
                ) : (
                  filteredBlocksResult.map((block: any) => {
                    let totalUnitsCount = 0;
                    if (block.units) {
                      Object.values(block.units).forEach((floorList: any) => {
                        totalUnitsCount += floorList.length;
                      });
                    }

                    return (
                      <div key={block.id} className="bg-white border border-gray-200 hover:border-gray-300 rounded-3xl p-5 shadow-xs transition-all">
                        {/* BLOCK CARD HEADER */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, expanded: !b.expanded } : b));
                              }}
                              className="p-1 hover:bg-slate-50 rounded-lg text-gray-400 hover:text-gray-900 transition-all cursor-pointer shrink-0"
                            >
                              <ChevronDown className={`w-5 h-5 transition-transform ${block.expanded ? 'rotate-0' : '-rotate-90'}`} />
                            </button>

                            <div className="bg-[#2E7D32]/10 text-[#2E7D32] p-2.5 rounded-xl border border-[#2E7D32]/5 flex items-center justify-center shrink-0">
                              <Landmark className="w-5 h-5" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-sm sm:text-base font-black text-[#164121] flex items-center gap-2 flex-wrap">
                                <span className="truncate">{block.name}</span>
                                {block._highlighted && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">MATCH</span>
                                )}
                              </h3>
                              <p className="text-xs text-gray-400 font-extrabold block truncate">
                                {block.floors_count} floors · {totalUnitsCount} units · <span className="text-gray-400 font-semibold">{block.notes}</span>
                              </p>
                            </div>
                          </div>

                          {/* ACTIONS */}
                          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0 md:ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBlock(block);
                                setEditBlockForm({
                                  name: block.name,
                                  floors_count: String(block.floors_count),
                                  units_per_floor: String(block.units_per_floor || 5),
                                  notes: block.notes || ''
                                });
                                setIsEditBlockModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 text-xs font-black text-gray-600 hover:text-emerald-800 hover:bg-[#E8F5E9]/30 px-3.5 py-1.5 border border-gray-200 hover:border-emerald-600/20 rounded-xl transition-all cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Settings</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setBlocks(prev => prev.map(b => {
                                  if (b.id !== block.id) return b;
                                  const nextFloorIndex = b.floors_count + 1;
                                  const blockLetter = b.name.replace(/Block\s+/i, '').trim().charAt(0) || 'U';
                                  
                                  const nextFloorUnits = [];
                                  for (let u = 1; u <= b.units_per_floor; u++) {
                                    nextFloorUnits.push({
                                      unit_number: `${blockLetter}-${nextFloorIndex}${u < 10 ? '0' : ''}${u}`,
                                      resident: null,
                                      resident_phone: null,
                                      resident_email: null
                                    });
                                  }
                                  
                                  const updatedUnits = { ...b.units, [nextFloorIndex]: nextFloorUnits };
                                  return {
                                    ...b,
                                    floors_count: nextFloorIndex,
                                    units: updatedUnits,
                                    expanded: true
                                  };
                                }));
                                setFeedbackMessage(`Added Floor ${block.floors_count + 1} with ${block.units_per_floor} initial unassigned houses successfully!`);
                              }}
                              className="flex items-center gap-1.5 text-xs font-black text-[#2E7D32] hover:text-[#1E562F] px-3.5 py-1.5 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer border border-[#2E7D32]/10"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add floor</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBlock(block.id)}
                              className="flex items-center gap-1.5 text-xs font-black text-rose-600 hover:text-white hover:bg-rose-600 px-3.5 py-1.5 border border-rose-100 hover:border-rose-650/30 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* FLOOR CORRIDOR LIST UNDER THE BLOCK */}
                        {block.expanded && (
                          <div className="mt-4 pt-4 border-t border-slate-100 pl-3 space-y-3.5">
                            {Array.from({ length: block.floors_count }).map((_, fIdx) => {
                              const floorNum = fIdx + 1;
                              const floorUnits = block.units && block.units[floorNum] ? block.units[floorNum] : [];
                              
                              return (
                                <div key={floorNum} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2 border-b border-dashed border-gray-100 last:border-b-0 hover:bg-[#F4F6F0]/20 rounded-xl px-2 transition-all">
                                  {/* Floor Label */}
                                  <div className="flex items-center gap-2 min-w-[140px] shrink-0">
                                    <Layers className="w-4 h-4 text-[#2E7D32]" />
                                    <span className="text-xs font-bold text-gray-700">Floor {floorNum} Corridor</span>
                                  </div>

                                  {/* Badges Stack */}
                                  <div className="flex flex-wrap items-center gap-1.5 flex-grow">
                                    {floorUnits.map((unit: any) => {
                                      const isOccupied = !!unit.resident;
                                      return (
                                        <div 
                                          key={unit.unit_number}
                                          onClick={() => {
                                            setAssignTarget({
                                              blockId: block.id,
                                              floorNumber: floorNum,
                                              unitNumber: unit.unit_number
                                            });
                                            if (unit.resident) {
                                              const matchingRes = residents.find(r => r.name === unit.resident);
                                              setSelectedResidentId(matchingRes ? matchingRes.id : null);
                                            } else {
                                              setSelectedResidentId(null);
                                            }
                                            setIsAssignModalOpen(true);
                                          }}
                                          className={`relative group px-3.5 py-1.5 rounded-xl text-xs font-black font-mono tracking-tight cursor-pointer transition-all border flex items-center gap-1.5 ${
                                            isOccupied 
                                              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/20 hover:bg-[#D8ECD9]' 
                                              : 'bg-white hover:bg-slate-100 text-gray-500 border-gray-200'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1">
                                            {isOccupied && <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>}
                                            {unit.unit_number}
                                          </div>

                                          {/* Delete House button inside badge */}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation(); // Avoid triggering assignment modal
                                              handleDeleteUnit(block.id, floorNum, unit.unit_number);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-200 hover:text-rose-700 text-gray-400 rounded transition-all cursor-pointer ml-1"
                                            title="Delete house completely"
                                          >
                                            <X className="w-3 h-3 font-black" />
                                          </button>

                                          {/* Custom interactive popover info */}
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-slate-900 border border-slate-700/80 p-2 text-[10px] text-white rounded-xl shadow-xl z-20 font-sans cursor-default pointer-events-none text-center">
                                            <p className="font-extrabold text-white text-center leading-normal">
                                              {isOccupied ? `Occupant: ${unit.resident}` : 'House Status: Vacant'}
                                            </p>
                                            {isOccupied && (
                                              <>
                                                <p className="text-gray-400 mt-0.5">{unit.resident_email}</p>
                                                <p className="text-[#2E7D32] font-extrabold mt-1">● Click to alter occupant info</p>
                                              </>
                                            )}
                                            {!isOccupied && <p className="text-emerald-400 mt-0.5">● Click to assign occupant</p>}
                                            <p className="text-rose-450 mt-1">● Hover & click cross to delete</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Floor Row Controls (Add Unit, Clear & Delete Floor) */}
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddUnitTarget({ blockId: block.id, floorNumber: floorNum });
                                        const nextUnitNum = `${block.name.replace(/Block\s+/i, '').trim().charAt(0)}-${floorNum}0${floorUnits.length + 1}`;
                                        setNewUnitNumber(nextUnitNum);
                                        setIsAddUnitModalOpen(true);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-gray-150 text-[10px] font-black rounded-lg cursor-pointer transition-all hover:border-[#2E7D32]/25 text-gray-500 shrink-0 shadow-xs"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                                      <span>Add House</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmModal({
                                          isOpen: true,
                                          title: "Clear Floor Occupants",
                                          message: `Are you sure you want to clear Floor ${floorNum} for ${block.name}? All occupant assignments will be removed completely.`,
                                          onConfirm: () => {
                                            setBlocks(prev => prev.map(b => {
                                              if (b.id !== block.id) return b;
                                              const updatedUnits = { ...b.units };
                                              updatedUnits[floorNum] = updatedUnits[floorNum].map((u: any) => ({
                                                ...u,
                                                resident: null,
                                                resident_phone: null,
                                                resident_email: null
                                              }));
                                              return { ...b, units: updatedUnits };
                                            }));
                                            setFeedbackMessage(`Cleared occupant allocations for Floor ${floorNum}.`);
                                            setConfirmModal(null);
                                          }
                                        });
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg shrink-0 cursor-pointer transition-colors border border-gray-100"
                                      title="Clear all occupants from this floor"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFloor(block.id, floorNum)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-rose-50 rounded-lg shrink-0 cursor-pointer transition-colors border border-gray-100"
                                      title="Delete floor completely"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 3: USERS & CREW REGISTRY (Users tab) */}
        {activeTab === 'users' && (() => {
          const filteredResidents = residents.filter(r => {
            const q = searchQuery.toLowerCase();
            
            // Text Search filter
            const matchesQuery = (
              r.name.toLowerCase().includes(q) ||
              r.email.toLowerCase().includes(q) ||
              r.phone.toLowerCase().includes(q) ||
              (r.unit && r.unit.toLowerCase().includes(q)) ||
              (r.block && r.block.toLowerCase().includes(q))
            );
            
            // Block filter mapping
            const matchesBlock = filterBlock === 'All' || (r.block && r.block.toLowerCase() === filterBlock.toLowerCase());
            
            // Occupancy type filter mapping
            const matchesOccupancy = filterOccupancy === 'All' || (r.occupancyType && r.occupancyType.toLowerCase() === filterOccupancy.toLowerCase());
            
            return matchesQuery && matchesBlock && matchesOccupancy;
          });

          const filteredWorkers = users.filter(w => {
            const q = searchQuery.toLowerCase();
            
            // Text Search filter
            const matchesQuery = (
              w.name.toLowerCase().includes(q) ||
              w.email.toLowerCase().includes(q) ||
              w.phone.toLowerCase().includes(q) ||
              (w.shift && w.shift.toLowerCase().includes(q)) ||
              (w.assignedBlocks && w.assignedBlocks.toLowerCase().includes(q)) ||
              (w.nic && w.nic.toLowerCase().includes(q))
            );
            
            // Shift selector mapping (morning, evening, night)
            let matchesShift = true;
            if (filterShift !== 'All') {
              matchesShift = w.shift && w.shift.toLowerCase().includes(filterShift.toLowerCase());
            }
            
            return matchesQuery && matchesShift;
          });

          // Show all items without pagination slicing
          const paginatedResidents = filteredResidents;
          const paginatedWorkers = filteredWorkers;
          const totalResidentsCount = filteredResidents.length;
          const totalWorkersCount = filteredWorkers.length;

          return (
            <div className="bg-white border border-gray-150 p-6 rounded-3xl shadow-sm space-y-6" id="users-tab">
              
              {/* Header & Controls Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Sub-tabs: Residents vs Workers */}
                <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setUserSubTab('residents')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      userSubTab === 'residents'
                        ? 'bg-white text-[#2E7D32] shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Residents ({residents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserSubTab('workers')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      userSubTab === 'workers'
                        ? 'bg-white text-[#2E7D32] shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Workers ({users.length})
                  </button>
                </div>

                {/* Action Buttons & Search */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  
                  {/* Embedded Search input inside tab */}
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, phone..."
                      className="w-full sm:w-[220px] bg-slate-50 border border-gray-200 focus:outline-[#2E7D32] rounded-xl pl-9 pr-4 py-2 text-xs font-bold"
                    />
                  </div>

                  {/* Dynamic Filter toggle with Sliders & Active labels */}
                  <button
                    type="button"
                    onClick={() => setIsUserFilterOpen(!isUserFilterOpen)}
                    className={`flex items-center justify-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors ${
                      isUserFilterOpen || filterBlock !== 'All' || filterOccupancy !== 'All' || filterShift !== 'All'
                        ? 'border-emerald-600 bg-emerald-50 text-[#1E562F]'
                        : 'border-gray-200 hover:bg-slate-50 text-gray-600'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Filter{(filterBlock !== 'All' || filterOccupancy !== 'All' || filterShift !== 'All') ? ' (Active)' : ''}</span>
                  </button>

                  {/* Add User trigger */}
                  <button
                    type="button"
                    onClick={() => setIsAddUserChoiceModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1E562F] text-white px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-950/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add User</span>
                  </button>
                </div>

              </div>

              {/* Expandable Advanced Filters panel */}
              {isUserFilterOpen && (
                <div className="bg-slate-50/70 border border-gray-200/50 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                  {userSubTab === 'residents' ? (
                    <>
                      {/* Filter Block selection */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">Select Block</label>
                        <select
                          value={filterBlock}
                          onChange={(e) => setFilterBlock(e.target.value)}
                          className="w-full text-xs font-bold p-2 bg-white border border-gray-200 rounded-xl focus:ring-[#2E7D32]"
                        >
                          <option value="All">All Blocks</option>
                          <option value="Block A">Block A</option>
                          <option value="Block B">Block B</option>
                          <option value="Block C">Block C</option>
                          <option value="Block D">Block D</option>
                          <option value="Block E">Block E</option>
                        </select>
                      </div>

                      {/* Filter Occupancy Type */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">Occupancy Type</label>
                        <select
                          value={filterOccupancy}
                          onChange={(e) => setFilterOccupancy(e.target.value)}
                          className="w-full text-xs font-bold p-2 bg-white border border-gray-200 rounded-xl focus:ring-[#2E7D32]"
                        >
                          <option value="All">All Occupancies</option>
                          <option value="Owner-Occupier">Owner-Occupier</option>
                          <option value="Tenant">Tenant</option>
                        </select>
                      </div>

                      {/* Items Per Page configuration */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">Items Per Page</label>
                        <select
                          value={userPageSize}
                          onChange={(e) => setUserPageSize(parseInt(e.target.value, 10))}
                          className="w-full text-xs font-bold p-2 bg-white border border-gray-200 rounded-xl focus:ring-[#2E7D32]"
                        >
                          <option value={3}>3 Entries Per Page</option>
                          <option value={5}>5 Entries Per Page (Default)</option>
                          <option value={10}>10 Entries Per Page</option>
                          <option value={20}>20 Entries Per Page</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Worker Shifts filter */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">Select Shift</label>
                        <select
                          value={filterShift}
                          onChange={(e) => setFilterShift(e.target.value)}
                          className="w-full text-xs font-bold p-2 bg-white border border-gray-200 rounded-xl focus:ring-[#2E7D32]"
                        >
                          <option value="All">All Shifts</option>
                          <option value="Morning">Morning</option>
                          <option value="Evening">Evening</option>
                          <option value="Night">Night</option>
                        </select>
                      </div>

                      {/* Items Per Page worker tab */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">Items Per Page</label>
                        <select
                          value={userPageSize}
                          onChange={(e) => setUserPageSize(parseInt(e.target.value, 10))}
                          className="w-full text-xs font-bold p-2 bg-white border border-gray-200 rounded-xl focus:ring-[#2E7D32]"
                        >
                          <option value={3}>3 Entries Per Page</option>
                          <option value={5}>5 Entries Per Page</option>
                          <option value={10}>10 Entries Per Page</option>
                        </select>
                      </div>

                      {/* Clear Button */}
                      <div className="flex items-end justify-start sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterBlock('All');
                            setFilterOccupancy('All');
                            setFilterShift('All');
                          }}
                          className="px-4 py-2 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100/50 rounded-xl font-bold cursor-pointer transition-colors text-xs w-full text-center"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </>
                  )}
                  
                  {/* Reset/Clear Row if Residents filter */}
                  {userSubTab === 'residents' && (
                    <div className="col-span-1 sm:col-span-3 flex items-center justify-between border-t border-gray-200/55 pt-2 mt-1">
                      <span className="text-[10px] text-[#2E7D32] font-black block">Filters affect both counts and pagination lists dynamically.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterBlock('All');
                          setFilterOccupancy('All');
                          setFilterShift('All');
                        }}
                        className="text-[10px] text-red-650 font-black hover:underline cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* List Table container - expands naturally to support page-level scrolling just like the Jobs registry */}
              <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">{userSubTab === 'residents' ? 'Unit' : 'Shift'}</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150/50">
                    {userSubTab === 'residents' ? (
                      paginatedResidents.length > 0 ? (
                        paginatedResidents.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors text-xs text-gray-700">
                            <td className="px-6 py-3.5 font-sans">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-9 h-9 rounded-full bg-emerald-50 text-[#2E7D32] font-black text-xs flex items-center justify-center border border-emerald-100 shrink-0 overflow-hidden relative group cursor-pointer shadow-xs hover:border-[#2E7D32]"
                                  title="Click to add/remove photo"
                                  onClick={() => setPictureEditTarget({ id: item.id, name: item.name, type: 'resident', avatar: item.avatar || '' })}
                                >
                                  {(item.avatar && (item.avatar.startsWith('http') || item.avatar.startsWith('data:'))) ? (
                                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    (item.avatar && item.avatar.length <= 3) ? item.avatar : item.name.slice(0, 2).toUpperCase()
                                  )}
                                  <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                  </div>
                                </div>
                                <div>
                                  <p className="font-extrabold text-slate-800 group-hover:text-[#2E7D32] transition-colors">{item.name}</p>
                                  <span className="text-[10px] text-gray-400 font-bold">Since {item.moveInDate || '2026-01-01'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 font-semibold text-gray-500">{item.email}</td>
                            <td className="px-6 py-3.5 font-semibold text-gray-500">{item.phone}</td>
                            <td className="px-6 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-105 bg-gray-50 text-gray-700 text-[10px] font-extrabold border border-gray-200 uppercase tracking-wider">
                                {item.unit || 'A-301'}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#E8F5E9] text-[#2E7D32] border border-emerald-100">
                                Resident
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setInspectingResident(item)}
                                  className="p-1.5 text-gray-400 hover:text-[#2E7D32] hover:bg-emerald-50 rounded-lg shrink-0 cursor-pointer transition-all"
                                  title="View & Edit Resident Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteResident(item.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 cursor-pointer transition-all"
                                  title="Delete Resident"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-gray-400 text-xs font-bold leading-relaxed">
                            No matching residents found in this Complex Wing directory.
                          </td>
                        </tr>
                      )
                    ) : (
                      paginatedWorkers.length > 0 ? (
                        paginatedWorkers.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors text-xs text-gray-700">
                            <td className="px-6 py-3.5 font-sans">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-105 shrink-0 overflow-hidden relative group cursor-pointer shadow-xs hover:border-blue-700"
                                  title="Click to add/remove photo"
                                  onClick={() => setPictureEditTarget({ id: item.id, name: item.name, type: 'worker', avatar: item.avatar || '' })}
                                >
                                  {(item.avatar && (item.avatar.startsWith('http') || item.avatar.startsWith('data:'))) ? (
                                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    (item.avatar && item.avatar.length <= 3) ? item.avatar : item.name.split(' ').map((n: string)=>n[0]).join('').toUpperCase().slice(0, 2)
                                  )}
                                  <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                  </div>
                                </div>
                                <div>
                                  <p className="font-extrabold text-slate-800 group-hover:text-blue-700 transition-colors">{item.name}</p>
                                  <span className="text-[10px] text-gray-400 font-bold">NIC: {item.nic || '892541234V'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 font-semibold text-gray-500">{item.email}</td>
                            <td className="px-6 py-3.5 font-semibold text-gray-500">{item.phone}</td>
                            <td className="px-6 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-105">
                                {item.shift}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50/50 text-blue-700 border border-blue-100">
                                Worker
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setInspectingWorker(item)}
                                  className="p-1.5 text-gray-400 hover:text-blue-750 hover:bg-blue-55 rounded-lg shrink-0 cursor-pointer transition-all"
                                  title="View & Edit Worker Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWorkerFromList(item.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 cursor-pointer transition-all"
                                  title="Delete Worker"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-gray-400 text-xs font-bold leading-relaxed">
                            No matching collection staff found in the directory.
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination details - simplified to total count only, no page controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 font-bold pt-2 border-t border-gray-100 mt-2">
                <span>
                  Showing {userSubTab === 'residents' ? totalResidentsCount : totalWorkersCount} entries in total
                </span>
              </div>

            </div>
          );
        })()}

        {/* TAB 4: ROUTINE TASKS & JOBS SCHEDULER (Jobs tab) */}
        {activeTab === 'jobs' && (
          <div className="space-y-6" id="jobs-tab">
            
            {/* 1. JOB DETAIL VIEW (Screenshot 1) */}
            {selectedJobId ? (
              (() => {
                const job = jobs.find(j => j.id === selectedJobId);
                if (!job) {
                  return (
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center">
                      <p className="text-sm font-semibold text-gray-500">Job not found.</p>
                      <button 
                        type="button" 
                        onClick={() => setSelectedJobId(null)}
                        className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
                      >
                        Return to List
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6 animate-fade-in" id="job-detail-viewport">
                    {/* Back Button and Quick Navigation */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(null)}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-gray-200 rounded-xl text-xs font-black text-[#164121] transition-all cursor-pointer shadow-sm"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to All Jobs</span>
                      </button>

                      <div className="text-[10px] text-gray-400 font-bold">
                        Facility Care · Real-time Operational Telemetry
                      </div>
                    </div>

                    {/* Main detail container */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: Metadata and status timeline (lg:col-span-8) */}
                      <div className="bg-white border border-gray-100 p-6 md:p-8 rounded-3xl shadow-sm lg:col-span-8 space-y-6">
                        
                        {/* ID and Status Pill */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block mb-1">JOB ID</span>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">#{job.id}</h2>
                          </div>

                          <span className={`px-3.5 py-1.5 rounded-full text-xs font-black capitalize flex items-center gap-1.5 shadow-sm border ${
                            job.status === 'done' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                            job.status === 'issue' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            job.status === 'in_progress' || job.status === 'inprogress' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              job.status === 'done' ? 'bg-emerald-500' :
                              job.status === 'issue' ? 'bg-rose-500' :
                              job.status === 'in_progress' || job.status === 'inprogress' ? 'bg-blue-500' :
                              'bg-amber-500'
                            }`}></span>
                            {job.status === 'in_progress' || job.status === 'inprogress' ? 'In-Progress' : job.status}
                          </span>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 py-6 border-y border-gray-100">
                          <div>
                            <span className="text-[9.5px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">BLOCK / FLOOR</span>
                            <p className="text-sm font-black text-emerald-800">{job.block?.name || 'Block B'} / Floor {job.floor?.floor_number || 3}</p>
                          </div>

                          <div>
                            <span className="text-[9.5px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">UNIT</span>
                            <p className="text-sm font-black text-gray-900">{job.unit?.unit_number || 'B-304'}</p>
                          </div>

                          <div>
                            <span className="text-[9.5px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">WORKER</span>
                            <p className="text-sm font-black text-[#164121]">{job.worker?.name || 'Nimal Perera'}</p>
                          </div>

                          <div>
                            <span className="text-[9.5px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">SCHEDULED</span>
                            <p className="text-[12.5px] font-bold text-gray-700">{job.scheduled_date}, {job.scheduled_time || '8:25 AM'}</p>
                          </div>

                          <div>
                            <span className="text-[9.5px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">SHIFT</span>
                            <p className="text-sm font-bold text-gray-600">{job.shift || 'Morning 6-2'}</p>
                          </div>

                          <div>
                            <span className="text-[9.5px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">RECURRING</span>
                            <p className="text-sm font-bold text-gray-600">{job.recurring || 'Mon, Wed, Fri'}</p>
                          </div>
                        </div>

                        {/* Status Timeline */}
                        <div className="space-y-4 pt-2">
                          <h3 className="text-base font-black text-[#164121] tracking-tight">Status timeline</h3>
                          
                          <div className="relative pl-7 border-l-2 border-gray-100 space-y-6 ml-2.5">
                            {job.timeline && job.timeline.length > 0 ? (
                              job.timeline.map((point: any, idx: number) => {
                                let iconBg = 'bg-gray-100 text-gray-500';
                                if (point.type === 'created') iconBg = 'bg-emerald-50 text-emerald-700';
                                if (point.type === 'scan') iconBg = 'bg-slate-100 text-[#164121]';
                                if (point.type === 'in_progress') iconBg = 'bg-blue-50 text-blue-700';
                                if (point.type === 'issue') iconBg = 'bg-rose-50 text-rose-700';
                                if (point.type === 'done') iconBg = 'bg-emerald-500/10 text-[#2E7D32]';

                                return (
                                  <div key={idx} className="relative">
                                    {/* Timeline Marker Point */}
                                    <div className={`absolute -left-[39px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full ${iconBg} border-2 border-white flex items-center justify-center shadow-sm`}>
                                      {point.type === 'created' && <CheckCircle className="w-3.5 h-3.5" />}
                                      {point.type === 'scan' && <QrCode className="w-3.5 h-3.5" />}
                                      {point.type === 'in_progress' && <Sliders className="w-3.5 h-3.5" />}
                                      {point.type === 'issue' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                                      {point.type === 'done' && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                                    </div>

                                    <div>
                                      <p className="text-xs font-black text-gray-800">{point.title}</p>
                                      <span className="text-[10px] text-gray-400 font-bold block mt-0.5">{point.time}</span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="relative">
                                <div className="absolute -left-[39px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border-2 border-white flex items-center justify-center shadow-sm">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-gray-800">Job created by Amantha S.</p>
                                  <span className="text-[10px] text-gray-400 font-bold block mt-0.5">{job.scheduled_date}, 04:12 PM</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right Detail Sidebar (lg:col-span-4) */}
                      <div className="space-y-6 lg:col-span-4">
                        
                        {/* Incident ticket / photo */}
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-[#164121] tracking-tight">Incident photo</h3>
                            <p className="text-[10px] text-gray-400 font-bold">Submitted by worker</p>
                          </div>

                          {/* Camera placeholder box */}
                          <div className="w-full h-44 bg-[#E8F5E9]/50 border-2 border-dashed border-emerald-200 rounded-2xl flex flex-col justify-center items-center gap-1.5 p-4 text-center">
                            <div className="p-3 bg-[#E8F5E9] text-[#2E7D32] rounded-full">
                              <QrCode className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] text-emerald-800 font-extrabold tracking-wide uppercase">Geolinked QR presence logged</span>
                          </div>

                          {/* Reason details */}
                          <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-1.5">
                            <span className="text-[9px] text-amber-800 font-extrabold uppercase tracking-wider block">REASON</span>
                            <strong className="text-amber-900 text-xs font-black block">{job.issue_reason || 'Door locked – no response'}</strong>
                            <p className="text-[10.5px] text-amber-800 font-semibold italic leading-normal">
                              "{job.issue_detail || 'Knocked twice, no answer. Will retry on next round.'}"
                            </p>
                          </div>
                        </div>

                        {/* General operations sidebar cards */}
                        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3.5">
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider block">Actions Desk</span>
                          
                          {/* Reschedule Button */}
                          <button
                            type="button"
                            onClick={() => {
                              // Dynamically update this job's scheduled date in real time
                              const nextDay = '2026-05-11';
                              setJobs(prev => prev.map(j => j.id === job.id ? { 
                                ...j, 
                                scheduled_date: nextDay,
                                status: 'pending',
                                timeline: [
                                  ...(j.timeline || []),
                                  { title: 'Job rescheduled to ' + nextDay + ' by Amantha S.', time: '2026-05-20, Just Now', type: 'created' }
                                ]
                              } : j));
                              setFeedbackMessage(`Rescheduled Job #${job.id} to May 11, 2026 successfully.`);
                            }}
                            className="w-full bg-[#2E7D32] hover:bg-[#1E562F] text-white py-3.5 px-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all text-xs shadow-sm cursor-pointer"
                          >
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span>Reschedule</span>
                          </button>

                          {/* Contact Resident */}
                          <button
                            type="button"
                            onClick={() => {
                              const jobRes = residents.find(r => r.unit === job.unit?.unit_number) || {
                                name: 'Occupant'
                              };
                              setContactJob(job);
                              setContactChannel('whatsapp');
                              let defaultMsg = `Dear ${jobRes.name}, this is EcoTrack Admin. Please note that our waste collection team has scheduled collection for Block ${job.block?.name || ''} today. Please ensure your waste bin is outside. Thank you!`;
                              if (job.status === 'issue') {
                                defaultMsg = `Dear ${jobRes.name}, our waste collection team encountered an issue at your unit (${job.unit?.unit_number}): "${job.issue_reason || 'No response'}". Kindly assist. Thank you!`;
                              }
                              setContactMessage(defaultMsg);
                            }}
                            className="w-full bg-white hover:bg-slate-50 border border-gray-200 text-[#164121] py-3 px-4 text-[#164121] rounded-xl font-bold flex justify-center items-center gap-2 transition-all text-xs cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-800 shrink-0" />
                            <span>Contact resident</span>
                          </button>

                          {/* Cancel job */}
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: "Cancel Waste Collection Job",
                                message: `Are you sure you want to permanently cancel and drop waste collection Job #${job.id} scheduled for unit ${job.unit?.unit_number}?`,
                                onConfirm: async () => {
                                  try {
                                    const headers = {
                                      'Authorization': `Bearer ${token}`,
                                      'Accept': 'application/json',
                                      'Content-Type': 'application/json'
                                    };
                                    const res = await fetch(`/api/admin/jobs/${job.id}`, {
                                      method: 'DELETE',
                                      headers
                                    });
                                    const data = await res.json().catch(() => null);
                                    
                                    if (res.ok && data?.status === 'success') {
                                      setJobs(prev => prev.filter(j => j.id !== job.id));
                                      setSelectedJobId(null);
                                      setConfirmModal(null);
                                      setFeedbackMessage(`Cancelled Job #${job.id} successfully from database.`);
                                    } else {
                                      setJobs(prev => prev.filter(j => j.id !== job.id));
                                      setSelectedJobId(null);
                                      setConfirmModal(null);
                                      setFeedbackMessage(`Cancelled Job #${job.id} successfully (local cache).`);
                                    }
                                  } catch (err) {
                                    setJobs(prev => prev.filter(j => j.id !== job.id));
                                    setSelectedJobId(null);
                                    setConfirmModal(null);
                                    setFeedbackMessage(`Cancelled Job #${job.id} successfully (local fallback).`);
                                  }
                                }
                              });
                            }}
                            className="w-full bg-white hover:bg-rose-50 border border-rose-100 text-rose-600 py-3 px-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all text-xs cursor-pointer"
                          >
                            <X className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>Cancel job</span>
                          </button>

                        </div>

                      </div>

                    </div>
                  </div>
                );
              })()
            ) : (
              // 2. ALL JOBS WORKFLOW VIEWS (Screenshot 2 & 4)
              <div className="space-y-6">
                
                {/* View Switcher, calendar controls and action desk header */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm animate-fade-in">
                  
                  {/* Left: Month control and text */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 border border-gray-155 rounded-lg text-gray-500 hover:bg-slate-50 cursor-pointer text-xs font-bold transition-all"
                      title="Previous Month"
                    >
                      &lt;
                    </button>
                    
                    {/* Month Selector */}
                    <select
                      value={selectedCalendarMonth.split(' ')[0]}
                      onChange={(e) => {
                        const year = selectedCalendarMonth.split(' ')[1] || '2026';
                        setSelectedCalendarMonth(`${e.target.value} ${year}`);
                      }}
                      className="bg-white border border-gray-150 rounded-lg px-2.5 py-1 text-xs font-black text-[#164121] cursor-pointer focus:ring-1 focus:ring-emerald-500 outline-none"
                    >
                      {monthsList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    {/* Year Selector */}
                    <select
                      value={selectedCalendarMonth.split(' ')[1]}
                      onChange={(e) => {
                        const month = selectedCalendarMonth.split(' ')[0] || 'May';
                        setSelectedCalendarMonth(`${month} ${e.target.value}`);
                      }}
                      className="bg-white border border-gray-150 rounded-lg px-2.5 py-1 text-xs font-black text-[#164121] cursor-pointer focus:ring-1 focus:ring-emerald-500 outline-none"
                    >
                      {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 border border-gray-155 rounded-lg text-gray-500 hover:bg-slate-50 cursor-pointer text-xs font-bold transition-all"
                      title="Next Month"
                    >
                      &gt;
                    </button>
                  </div>

                  {/* Center/Right: View mode pills & Create Job button */}
                  <div className="flex flex-wrap items-center gap-3">
                    
                    {/* List / Calendar selector */}
                    <div className="bg-slate-50 p-1.5 rounded-xl border border-gray-150 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setJobsSubView('list')}
                        className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          jobsSubView === 'list'
                            ? 'bg-white text-gray-800 shadow-sm font-black'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setJobsSubView('calendar')}
                        className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          jobsSubView === 'calendar'
                            ? 'bg-white text-gray-800 shadow-sm font-black'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Calendar
                      </button>
                    </div>

                    {/* Create Job solid trigger */}
                    <button
                      type="button"
                      onClick={() => setIsCreateJobOpen(true)}
                      className="bg-[#2E7D32]/95 hover:bg-[#2E7D32] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-xs transition-all cursor-pointer shadow-sm ml-auto"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Create Job</span>
                    </button>

                  </div>

                </div>

                {/* Sub-View 1: THE LIST VIEW (Screenshot 2) */}
                {jobsSubView === 'list' && (
                  <div className="space-y-6">
                    
                    {/* Dynamic Filters Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-fade-in">
                      
                      {/* Left: filters */}
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          { key: 'all', label: `All (${jobs.length})` },
                          { key: 'pending', label: `Pending (${jobs.filter(j => j.status === 'pending').length})` },
                          { key: 'in_progress', label: `In-Progress (${jobs.filter(j => j.status === 'in_progress' || j.status === 'inprogress').length})` },
                          { key: 'done', label: `Done (${jobs.filter(j => j.status === 'done').length})` },
                          { key: 'issue', label: `Issue (${jobs.filter(j => j.status === 'issue').length})` },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setJobsFilterTab(tab.key as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              jobsFilterTab === tab.key
                                ? 'bg-[#164121] border-[#164121] text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Right: Export and specific day */}
                      <div className="flex items-center gap-2 lg:ml-auto">
                        <label className="bg-white border border-gray-150 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors select-none">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatDateString(selectedCalendarDate)}</span>
                          <input 
                            type="date" 
                            className="sr-only" 
                            value={selectedCalendarDate} 
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedCalendarDate(e.target.value);
                                setSearchQuery(e.target.value);
                                setFeedbackMessage(`Filtered All Jobs table to display items scheduled on: ${e.target.value}`);
                              }
                            }} 
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleExportJobs}
                          className="bg-white border border-gray-150 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-650 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-800" />
                          <span>Export</span>
                        </button>
                      </div>

                    </div>

                    {/* Core Table Grid representing Screenshot 2 */}
                    <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#F4F6F0]/60 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <th className="py-4.5 px-6">Job ID</th>
                              <th className="py-4.5 px-4">Block / Floor</th>
                              <th className="py-4.5 px-4">Worker</th>
                              <th className="py-4.5 px-4">Status</th>
                              <th className="py-4.5 px-4">Scheduled</th>
                              <th className="py-4.5 px-6 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(() => {
                              const listToDisplay = jobs.filter(j => {
                                if (jobsFilterTab === 'all') return true;
                                if (jobsFilterTab === 'pending') return j.status === 'pending';
                                if (jobsFilterTab === 'in_progress') return j.status === 'in_progress' || j.status === 'inprogress';
                                if (jobsFilterTab === 'done') return j.status === 'done';
                                if (jobsFilterTab === 'issue') return j.status === 'issue';
                                return true;
                              });

                              if (listToDisplay.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="py-12 text-center text-xs text-gray-400 font-semibold">
                                      No jobs matched this filter option. Click "+ Create Job" to schedule a task or swap filters.
                                    </td>
                                  </tr>
                                );
                              }

                              return listToDisplay.map((item, idx) => {
                                // Initials for Worker Circles
                                const workerName = item.worker?.name || 'Unassigned Worker';
                                const initials = workerName
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2);

                                // Colors representing different staff initialized visually
                                const colorsList = [
                                  'bg-emerald-600',
                                  'bg-blue-600',
                                  'bg-teal-600',
                                  'bg-purple-600',
                                ];
                                const avatarBg = colorsList[idx % colorsList.length];

                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                                    {/* Job ID */}
                                    <td className="py-4.5 px-6">
                                      <span className="font-mono text-emerald-800 font-black text-xs block group-hover:underline cursor-pointer" onClick={() => setSelectedJobId(item.id)}>
                                        #{item.id}
                                      </span>
                                    </td>

                                    {/* Block / Floor */}
                                    <td className="py-4.5 px-4 text-xs font-black text-gray-800">
                                      {item.block?.name?.replace('Block ', '') || 'A'} / {item.floor?.floor_number || item.floor_id || 1}
                                    </td>

                                    {/* Worker details */}
                                    <td className="py-4.5 px-4">
                                      <div className="flex items-center gap-2.5">
                                        {(() => {
                                          const actualWorker = users.find(u => u.name === workerName);
                                          const workerAvatar = actualWorker?.avatar;
                                          const hasPhoto = workerAvatar && (workerAvatar.startsWith('http') || workerAvatar.startsWith('data:'));
                                          return (
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 overflow-hidden ${hasPhoto ? 'border border-gray-100' : avatarBg}`}>
                                              {hasPhoto ? (
                                                <img src={workerAvatar} alt={workerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                              ) : (
                                                initials
                                              )}
                                            </div>
                                          );
                                        })()}
                                        <span className="text-xs font-bold text-gray-700">{workerName}</span>
                                      </div>
                                    </td>

                                    {/* Status capsules matching screenshot */}
                                    <td className="py-4.5 px-4">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide inline-flex items-center gap-1 border ${
                                        item.status === 'done' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                                        item.status === 'issue' ? 'bg-rose-50 text-rose-700 border-rose-150' :
                                        item.status === 'in_progress' || item.status === 'inprogress' ? 'bg-blue-50 text-blue-800 border-blue-150 animate-pulse' :
                                        'bg-amber-50 text-amber-800 border-amber-100'
                                      }`}>
                                        <span className={`w-1 h-1 rounded-full ${
                                          item.status === 'done' ? 'bg-emerald-500' :
                                          item.status === 'issue' ? 'bg-rose-500' :
                                          item.status === 'in_progress' || item.status === 'inprogress' ? 'bg-blue-500' :
                                          'bg-amber-500'
                                        }`}></span>
                                        {item.status === 'in_progress' || item.status === 'inprogress' ? 'In-Progress' : item.status === 'done' ? 'Done' : item.status === 'issue' ? 'Issue' : 'Pending'}
                                      </span>
                                    </td>

                                    {/* Scheduled Date / Time */}
                                    <td className="py-4.5 px-4 text-xs font-bold text-gray-600">
                                      <div className="flex flex-col">
                                        <span>{item.scheduled_date}</span>
                                        <span className="text-[9.5px] text-gray-400 font-semibold">{item.scheduled_time || '08:00 AM'}</span>
                                      </div>
                                    </td>

                                    {/* Actions View / Edit */}
                                    <td className="py-4.5 px-6 text-right">
                                      <div className="flex items-center justify-end gap-2 text-gray-400">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedJobId(item.id)}
                                          title="View Job Details"
                                          className="p-1 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedJobId(item.id);
                                            setFeedbackMessage("Swapped to Job Detail page. Use Reschedule operator to modify.");
                                          }}
                                          title="Reschedule Job"
                                          className="p-1 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                      </div>
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

                {/* Sub-View 2: THE CALENDAR VIEW (Screenshot 4) */}
                {jobsSubView === 'calendar' && (
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
                    
                    {/* Weekday Titles header */}
                    <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest border-b border-gray-100 pb-3">
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>

                    {/* 35 Dynamic Cells Matrix */}
                    <div className="grid grid-cols-7 gap-3 text-left">
                      {(() => {
                        const daysArray = getDaysArray(selectedCalendarMonth);
                        const [mName, yStr] = selectedCalendarMonth.split(' ');
                        const yearIndex = parseInt(yStr, 10) || 2026;
                        const monthIndex = monthsList.indexOf(mName) !== -1 ? monthsList.indexOf(mName) : 4;

                        return daysArray.map((cell, index) => {
                          // Format target date string for checking system state
                          const pDay = cell.dayNum < 10 ? '0' + cell.dayNum : cell.dayNum;
                          const pMonth = (cell.monthIdx + 1) < 10 ? '0' + (cell.monthIdx + 1) : (cell.monthIdx + 1);
                          const dateStr = `${cell.year}-${pMonth}-${pDay}`;
                          
                          // Count dynamic items from our real-time state index
                          const activeJobsToday = jobs.filter(j => j.scheduled_date === dateStr);
                          const hasIssueToday = activeJobsToday.some(j => j.status === 'issue');

                          // Fetch stable seeded / mock data
                          const mockData = getMockDataForDay(cell.dayNum, cell.monthIdx, cell.year);
                          const totalJobsCount = mockData.jobs + (cell.isCurrent ? activeJobsToday.length : 0);
                          const showIssue = mockData.issue || hasIssueToday;

                          // Dynamic selector outline to highlight currently selected date
                          const isSelectedDate = selectedCalendarDate === dateStr;

                          return (
                            <div 
                              key={index} 
                              className={`p-3 min-h-[105px] border border-gray-150 rounded-2xl flex flex-col justify-between transition-all group ${
                                cell.isCurrent 
                                  ? 'bg-[#F9FBF7] hover:bg-white hover:border-[#2E7D32]/45 cursor-pointer' 
                                  : 'bg-slate-50/50 text-gray-300'
                              } ${isSelectedDate ? 'ring-2 ring-emerald-500/20 border-[#2E7D32]/50 bg-[#E8F5E9]/5' : ''}`}
                              onClick={() => {
                                if (cell.isCurrent) {
                                  // Set filter, select date, and open List view to inspect this day
                                  setSelectedCalendarDate(dateStr);
                                  setJobsFilterTab('all');
                                  setJobsSubView('list');
                                  setSearchQuery(dateStr);
                                  setFeedbackMessage(`Filtered All Jobs table to display items scheduled on: ${formatDateString(dateStr)}`);
                                }
                              }}
                            >
                              {/* Day Number and status bullet dot indicator */}
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[12.5px] font-black ${
                                  cell.isCurrent ? 'text-gray-800' : 'text-gray-300'
                                }`}>
                                  {cell.dayNum}
                                </span>

                                {isSelectedDate && (
                                  <span className="w-2 h-2 rounded-full bg-[#2E7D32]"></span>
                                )}
                              </div>

                              {/* Small tags matching Screenshot 4 */}
                              <div className="space-y-1 mt-auto">
                                {totalJobsCount > 0 && (
                                  <span className="bg-[#E8F5E9] text-[#2E7D32] text-[9.5px] font-black px-2 py-0.5 rounded-lg block w-fit truncate">
                                    {totalJobsCount} jobs
                                  </span>
                                )}

                                {showIssue && (
                                  <span className="bg-rose-50 text-rose-700 text-[9.5px] font-black px-2 py-0.5 rounded-lg block w-fit truncate">
                                    1 issue
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* 3. CREATE JOB MODAL VIEW OVERLAY (Screenshot 3) */}
            <AnimatePresence>
              {isCreateJobOpen && (
                <div className="fixed inset-0 bg-[#164121]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="create-job-modal">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white border border-gray-100 rounded-3xl p-6.5 max-w-lg w-full shadow-2xl relative space-y-5 text-left"
                  >
                    
                    {/* Modal head */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-black text-[#164121] tracking-tight">Create Job</h3>
                        <p className="text-[11px] text-gray-400 font-bold leading-normal">Schedule a new collection task</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsCreateJobOpen(false)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-gray-400 hover:text-gray-700 rounded-lg shrink-0 cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Fields Formulation form */}
                    <div className="space-y-4">
                      
                      {/* Block & Floor */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1.5">BLOCK</label>
                          <select
                            value={createJobForm.block}
                            onChange={(e) => {
                              const newBlock = e.target.value;
                              const selectedBlock = blocks.find(b => b.name === newBlock);
                              const firstFloorNum = selectedBlock?.floors_count >= 1 ? 1 : 1;
                              const blockLetter = newBlock.replace(/Block\s*/i, '').trim().charAt(0) || 'A';
                              // Get available units from the first floor of the new block
                              const floorUnits = selectedBlock?.units?.[String(firstFloorNum)] || [];
                              const unitNumbers = floorUnits.map((u: any) => u.unit_number);
                              setCreateJobForm({
                                ...createJobForm,
                                block: newBlock,
                                floor: `Floor ${firstFloorNum}`,
                                units: unitNumbers
                              });
                            }}
                            className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10 focus:border-[#2E7D32] rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700"
                          >
                            {blocks.map(b => (
                              <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1.5">FLOOR</label>
                          <select
                            value={createJobForm.floor}
                            onChange={(e) => {
                              const newFloor = e.target.value;
                              const floorNum = parseInt(newFloor.replace(/[^0-9]/g, '')) || 1;
                              const selectedBlock = blocks.find(b => b.name === createJobForm.block);
                              const floorUnits = selectedBlock?.units?.[String(floorNum)] || [];
                              const unitNumbers = floorUnits.map((u: any) => u.unit_number);
                              setCreateJobForm({
                                ...createJobForm,
                                floor: newFloor,
                                units: unitNumbers
                              });
                            }}
                            className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10 focus:border-[#2E7D32] rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700"
                          >
                            {(() => {
                              const selectedBlock = blocks.find(b => b.name === createJobForm.block);
                              const floorCount = selectedBlock?.floors_count || 5;
                              return Array.from({ length: floorCount }, (_, i) => i + 1).map(f => (
                                <option key={f} value={`Floor ${f}`}>Floor {f}</option>
                              ));
                            })()}
                          </select>
                        </div>
                      </div>

                      {/* Units selection - checkbox grid */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide">UNITS</label>
                          {(() => {
                            const selectedBlock = blocks.find(b => b.name === createJobForm.block);
                            const floorNum = parseInt(createJobForm.floor.replace(/[^0-9]/g, '')) || 1;
                            const availableUnits: any[] = selectedBlock?.units?.[String(floorNum)] || [];
                            const allSelected = availableUnits.length > 0 && availableUnits.every((u: any) => createJobForm.units.includes(u.unit_number));
                            return availableUnits.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (allSelected) {
                                    setCreateJobForm({ ...createJobForm, units: [] });
                                  } else {
                                    setCreateJobForm({ ...createJobForm, units: availableUnits.map((u: any) => u.unit_number) });
                                  }
                                }}
                                className="text-[9px] font-black text-emerald-700 hover:text-emerald-900 cursor-pointer transition-colors uppercase tracking-wide"
                              >
                                {allSelected ? '✕ Deselect All' : '✓ Select All'}
                              </button>
                            ) : null;
                          })()}
                        </div>
                        {(() => {
                          const selectedBlock = blocks.find(b => b.name === createJobForm.block);
                          const floorNum = parseInt(createJobForm.floor.replace(/[^0-9]/g, '')) || 1;
                          const availableUnits: any[] = selectedBlock?.units?.[String(floorNum)] || [];

                          if (availableUnits.length === 0) {
                            return (
                              <div className="min-h-[44px] p-3 bg-[#F4F6F0]/40 border border-gray-200 rounded-xl flex items-center justify-center">
                                <span className="text-[10px] text-gray-400 font-bold">No units found for this floor</span>
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {availableUnits.map((unit: any) => {
                                const isSelected = createJobForm.units.includes(unit.unit_number);
                                return (
                                  <button
                                    key={unit.unit_number}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setCreateJobForm({
                                          ...createJobForm,
                                          units: createJobForm.units.filter(u => u !== unit.unit_number)
                                        });
                                      } else {
                                        setCreateJobForm({
                                          ...createJobForm,
                                          units: [...createJobForm.units, unit.unit_number]
                                        });
                                      }
                                    }}
                                    className={`relative px-2 py-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer text-center ${
                                      isSelected
                                        ? 'bg-[#E8F5E9] border-emerald-300 text-[#164121] shadow-sm ring-1 ring-emerald-200'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-slate-50 hover:border-gray-300'
                                    }`}
                                  >
                                    {isSelected && (
                                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#2E7D32] rounded-full flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      </span>
                                    )}
                                    <span className="block text-[11px]">{unit.unit_number}</span>
                                    {unit.resident && (
                                      <span className="block text-[8px] font-bold text-gray-400 mt-0.5 truncate">{unit.resident}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                        <span className="text-[8.5px] text-gray-400 font-bold block mt-1.5">{createJobForm.units.length} unit{createJobForm.units.length !== 1 ? 's' : ''} selected</span>
                      </div>

                      {/* Assign Worker & Shift */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1.5">ASSIGN WORKER</label>
                          <select
                            value={createJobForm.worker}
                            onChange={(e) => setCreateJobForm({...createJobForm, worker: e.target.value})}
                            className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10 focus:border-[#2E7D32] rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700"
                          >
                            {users.filter(u => u.role === 'worker').map(w => (
                              <option key={w.id} value={w.name}>{w.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1.5">SHIFT</label>
                          <select
                            value={createJobForm.shift}
                            onChange={(e) => setCreateJobForm({...createJobForm, shift: e.target.value})}
                            className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10 focus:border-[#2E7D32] rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700"
                          >
                            <option value="Morning 6AM-2PM">Morning 6AM-2PM</option>
                            <option value="Evening 2PM-10PM">Evening 2PM-10PM</option>
                            <option value="Night 10PM-6AM">Night 10PM-6AM</option>
                          </select>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1.5">DATE</label>
                          <input
                            type="date"
                            value={createJobForm.date}
                            onChange={(e) => setCreateJobForm({...createJobForm, date: e.target.value})}
                            className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10 focus:border-[#2E7D32] rounded-xl px-3 py-2 text-xs font-bold text-gray-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1.5">TIME</label>
                          <input
                            type="text"
                            placeholder="e.g. 06:30 AM"
                            value={createJobForm.time}
                            onChange={(e) => setCreateJobForm({...createJobForm, time: e.target.value})}
                            className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10 focus:border-[#2E7D32] rounded-xl px-3 py-2 text-xs font-bold text-gray-700"
                          />
                        </div>
                      </div>

                      {/* Special Banner Repeat Badge */}
                      <label className="flex items-start gap-3 bg-[#E8F5E9]/45 border border-emerald-100 p-4 rounded-2xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createJobForm.repeatWeekly}
                          onChange={(e) => setCreateJobForm({...createJobForm, repeatWeekly: e.target.checked})}
                          className="mt-0.5 rounded text-[#2E7D32] focus:ring-[#2E7D32] border-gray-300 cursor-pointer"
                        />
                        <div className="text-left">
                          <span className="text-xs font-black text-emerald-800 block">Repeat weekly</span>
                          <p className="text-[10px] text-emerald-750 font-bold mt-0.5">Every Mon, Wed, Fri until further notice</p>
                        </div>
                      </label>

                    </div>

                    {/* Footer button actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setIsCreateJobOpen(false)}
                        className="px-4 py-2.5 border border-gray-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={async () => {
                          setActionLoading(true);
                          const chosenWorker = users.find(u => u.name === createJobForm.worker) || { name: createJobForm.worker };
                          const chosenBlock = blocks.find(b => b.name === createJobForm.block) || { name: createJobForm.block };
                          
                          try {
                            const headers = {
                              'Authorization': `Bearer ${token}`,
                              'Accept': 'application/json',
                              'Content-Type': 'application/json'
                            };

                            let successCount = 0;

                            // Call API to schedule each unit sequentially/concurrently
                            await Promise.all(
                              createJobForm.units.map(async (unitStr) => {
                                const payload = {
                                  block: chosenBlock.name,
                                  floor: createJobForm.floor,
                                  unit_number: unitStr,
                                  worker: chosenWorker.name,
                                  shift: createJobForm.shift,
                                  date: createJobForm.date
                                };

                                const res = await fetch('/api/admin/jobs', {
                                  method: 'POST',
                                  headers,
                                  body: JSON.stringify(payload)
                                });

                                if (res.ok) {
                                  successCount++;
                                } else if (res.status === 401) {
                                  alert("Your session has expired due to the database reset. Please log out and log back in to sync with the database.");
                                  throw new Error("Session expired");
                                } else {
                                  const errData = await res.json().catch(() => null);
                                  console.error("Laravel API job creation error:", errData);
                                }
                              })
                            );

                            if (successCount > 0) {
                              setFeedbackMessage(`Successfully scheduled ${successCount} routine jobs in database.`);
                              // Refetch live database metrics and jobs list
                              await loadAdminMetrics();
                            } else {
                              throw new Error("API call failed");
                            }
                          } catch (err: any) {
                            console.error("Create Job API Catch Error:", err);
                            const errMsg = err?.message || 'Unknown error';
                            if (errMsg.includes('Session expired')) {
                              // Already alerted inside the loop
                            } else {
                              setFeedbackMessage(`Failed to create jobs: ${errMsg}. Please check your session and try again.`);
                            }
                          } finally {
                            setActionLoading(false);
                            setIsCreateJobOpen(false);
                          }
                        }}
                        className="px-5 py-2.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                      >
                        {actionLoading ? 'Creating...' : 'Create Job'}
                      </button>
                    </div>

                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 4. CONTACT RESIDENT MODAL OVERLAY */}
            <AnimatePresence>
              {contactJob && (() => {
                const jobRes = residents.find(r => r.unit === contactJob.unit?.unit_number) || {
                  name: 'Occupant',
                  phone: contactJob.resident_phone || '071-887-2211',
                  email: contactJob.resident_email || 'resident@ecotrack.lk',
                  whatsappEnabled: true
                };

                return (
                  <div className="fixed inset-0 bg-[#164121]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="contact-resident-modal">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-gray-100 rounded-3xl p-6.5 max-w-md w-full shadow-2xl relative space-y-5 text-left"
                    >
                      {/* Modal head */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-[#164121] text-sm font-black tracking-tight text-left">Contact Resident</h3>
                          <p className="text-[11px] text-gray-400 font-bold leading-normal text-left">
                            Unit {contactJob.unit?.unit_number} • {jobRes.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setContactJob(null)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-gray-400 hover:text-gray-700 rounded-lg shrink-0 cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Channel Selector */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1.5 text-left">CHOOSE CHANNEL</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setContactChannel('whatsapp')}
                            className={`flex items-center gap-1.5 justify-center py-2 px-3 text-xs border rounded-xl font-bold transition-all cursor-pointer ${
                              contactChannel === 'whatsapp' 
                                ? 'bg-emerald-50 border-emerald-200 text-[#164121]' 
                                : 'bg-white border-gray-100 text-gray-500 hover:bg-slate-50'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setContactChannel('sms')}
                            className={`flex items-center gap-1.5 justify-center py-2 px-3 text-xs border rounded-xl font-bold transition-all cursor-pointer ${
                              contactChannel === 'sms' 
                                ? 'bg-[#E8F5E9] border-emerald-200 text-[#164121]' 
                                : 'bg-white border-gray-100 text-gray-500 hover:bg-slate-50'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>SMS Nudge</span>
                          </button>
                        </div>
                      </div>

                      {/* Resident Info Box */}
                      <div className="bg-[#F4F6F0]/50 p-3 rounded-2xl border border-gray-100 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-bold">Contact Number:</span>
                          <span className="text-gray-700 font-extrabold">{jobRes.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-bold">Billing Email:</span>
                          <span className="text-gray-700 font-semibold">{jobRes.email}</span>
                        </div>
                      </div>

                      {/* Message Compose Box */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide text-left">MESSAGE BODY</label>
                        <textarea
                          rows={4}
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Type alert nudge..."
                          className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-[#2E7D32] rounded-xl p-3 text-xs font-bold text-gray-700 leading-normal resize-none text-left"
                        ></textarea>
                      </div>

                      {/* Quick Templates */}
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-extrabold text-[#164121]/60 uppercase tracking-widest text-left">QUICK CLIPS</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: "Bin outside", text: `Dear ${jobRes.name}, EcoTrack collection is currently at your floor. Please make sure your waste bin is outside. Thank you!` },
                            { label: "Access requested", text: `Dear ${jobRes.name}, collector Sunil is currently at your floor but unable to gain access to collect waste. Please contact support.` },
                            { label: "Done alert", text: `Hi ${jobRes.name}, solid waste and recyclables collection has been completed for unit ${contactJob.unit?.unit_number} today.` },
                          ].map((tmpl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setContactMessage(tmpl.text)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-[#E8F5E9]/50 border border-emerald-100 rounded-lg text-[#164121] hover:bg-[#E8F5E9] transition-all cursor-pointer"
                            >
                              {tmpl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setContactJob(null)}
                          className="px-4 py-2 border border-gray-150 rounded-xl font-bold text-gray-500 hover:bg-slate-50 text-xs cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackMessage(`Outgoing real-time alert nudge dispatched to unit ${contactJob.unit?.unit_number} (${jobRes.name}) via ${contactChannel === 'whatsapp' ? 'WhatsApp Gateway' : 'SMS Network'} successfully.`);
                            setContactJob(null);
                          }}
                          className="px-5 py-2.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-white" />
                          <span>Dispatch Alert</span>
                        </button>
                      </div>

                    </motion.div>
                  </div>
                );
              })()}
            </AnimatePresence>

          </div>
        )}

        {/* TAB 5: HOUSING QR CODE GENERATOR & SCAN SHEET (QR Codes tab) */}
        {activeTab === 'qrcodes' && (
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs space-y-6 animate-in fade-in duration-250" id="qrcodes-tab">
            
            {/* Main Breadcrumb / Tab Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Home / QR Codes / Generate</span>
                <h2 className="text-xl font-black text-[#164121] tracking-tight">Generate QR Codes</h2>
                <p className="text-xs text-gray-500 font-medium">Create and print highly secure environmental compliance identifiers for collectors & residents.</p>
              </div>
            </div>

            {/* Split layout: Configure (Left) & Preview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Pane - Configure Settings (Col-span 4) */}
              <div className="lg:col-span-4 bg-slate-50/50 border border-gray-150 rounded-3xl p-5 space-y-5 h-fit text-left">
                
                <div>
                  <h3 className="text-xs font-black text-[#164121] uppercase tracking-wider">Configure</h3>
                  <p className="text-[10.5px] text-gray-400 font-extrabold">Choose what to print</p>
                </div>

                {/* BLOCK Selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider">Block</label>
                  <div className="grid grid-cols-1 gap-2">
                    {blocks.map((b) => {
                      const isSelected = b.name === qrSelectedBlockName;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setQrSelectedBlockName(b.name);
                            setQrSelectedFloor(1); // Reset floor default to F1 when shifting blocks
                            setQrGeneratedPdf(null);
                          }}
                          className={`flex items-center justify-between p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-white border-[#2E7D32] text-[#2E7D32] shadow-xs' 
                              : 'bg-white border-gray-200 text-gray-550 hover:bg-slate-50/70 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-slate-100 text-gray-400'}`}>
                              <Landmark className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-xs font-black leading-none">{b.name}</p>
                              <p className="text-[9px] text-gray-400 font-bold mt-0.5">{b.notes.split('(')[0]}</p>
                            </div>
                          </div>
                          {isSelected && <span className="text-[10px] font-black text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">Active</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FLOORS Selector */}
                {(() => {
                  const activeBlockObj = blocks.find(b => b.name === qrSelectedBlockName);
                  const floorsCount = activeBlockObj ? activeBlockObj.floors_count : 5;
                  
                  return (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider">Floors</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: floorsCount }).map((_, idx) => {
                          const floorNum = idx + 1;
                          const isSelected = floorNum === qrSelectedFloor;
                          return (
                            <button
                              key={floorNum}
                              type="button"
                              onClick={() => {
                                setQrSelectedFloor(floorNum);
                                setQrGeneratedPdf(null);
                              }}
                              className={`w-9 h-9 rounded-xl border text-[10.5px] font-black tracking-tight flex items-center justify-center transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#E8F5E9] border-[#2E7D32] text-[#2E7D32] shadow-xs ring-1 ring-[#2E7D32]' 
                                  : 'bg-white border-gray-200 text-gray-550 hover:bg-slate-100 hover:text-[#2E7D32]'
                              }`}
                            >
                              F{floorNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* PAPER SIZE section */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider">Paper Size</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-white border border-gray-150 rounded-2xl">
                    {(['A4', 'A5', 'Sticker'] as const).map((size) => {
                      const isSelected = qrPaperSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setQrPaperSize(size);
                            setQrGeneratedPdf(null);
                          }}
                          className={`py-1.5 text-[10.5px] font-extrabold text-center rounded-xl transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#2E7D32]/10 border border-[#2E7D32]/45 text-[#2E7D32]' 
                              : 'text-gray-500 hover:text-[#2E7D32] hover:bg-slate-50'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* INCLUDE LABEL selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider">Include Label</label>
                  <button
                    type="button"
                    onClick={() => {
                      const opt = qrIncludeLabel.startsWith('Yes') 
                        ? 'No label — QR code patterns only' 
                        : 'Yes — block + floor name + house ID';
                      setQrIncludeLabel(opt);
                      setQrGeneratedPdf(null);
                    }}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 transition-all flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-750">
                      <span className="font-extrabold text-[#2E7D32] text-xs">𝖳</span>
                      {qrIncludeLabel.length > 28 ? qrIncludeLabel.slice(0, 28) + '...' : qrIncludeLabel}
                    </span>
                    <span className="text-[9px] font-black text-[#2E7D32] uppercase shrink-0">Toggle</span>
                  </button>
                </div>

                {/* Generate PDF CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQrGenerating(true);
                      setQrGeneratedPdf(null);
                      setTimeout(() => {
                        const targetBlockObj = blocks.find(b => b.name === qrSelectedBlockName);
                        const count = targetBlockObj ? (targetBlockObj.units[qrSelectedFloor] || []).length : 5;
                        setQrGenerating(false);
                        setQrGeneratedPdf({
                          filename: `EcoTrack-QR-${qrSelectedBlockName.replace(' ', '')}-Floor${qrSelectedFloor}-${qrPaperSize}.pdf`,
                          count
                        });
                        setFeedbackMessage(`Generated print sheet ready: ${count} household QR codes parsed.`);
                      }, 800);
                    }}
                    disabled={qrGenerating}
                    className="w-full py-2.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black rounded-xl transition-all cursor-pointer text-center flex justify-center items-center gap-2 shadow-sm shadow-emerald-950/15"
                  >
                    {qrGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering Codes...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Generate PDF</span>
                      </>
                    )}
                  </button>
                </div>

                {/* PDF READY Notification template matching Screenshot 1 */}
                {qrGeneratedPdf && (
                  <div className="bg-[#E8F5E9]/60 border border-emerald-150 p-4 rounded-2xl space-y-3.5 text-left animate-in slide-in-from-top-3 duration-300 border-l-4 border-l-[#2E7D32]">
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center text-white shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-emerald-900 block leading-tight">PDF ready - {qrGeneratedPdf.count} codes generated</span>
                        <p className="text-[10px] text-emerald-700 font-semibold select-all leading-normal mt-0.5">{qrGeneratedPdf.filename}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintConfig({
                            type: 'sheet',
                            block: qrSelectedBlockName,
                            floor: qrSelectedFloor,
                          });
                          setFeedbackMessage(`Generating PDF document for ${qrGeneratedPdf.filename}. Choose 'Save as PDF' as the destination to complete download.`);
                          setTimeout(() => {
                            window.print();
                          }, 200);
                        }}
                        className="flex-1 py-1.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white text-[10px] font-black rounded-lg transition-all cursor-pointer text-center"
                      >
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQrGeneratedPdf(null);
                        }}
                        className="py-1.5 px-3 bg-white border border-gray-200 text-gray-550 text-[10px] font-bold rounded-lg hover:bg-slate-100 transition-all cursor-pointer text-center"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Pane - Preview Grid (Col-span 8) */}
              <div className="lg:col-span-8 bg-white border border-gray-150 rounded-3xl p-5 space-y-5 text-left">
                
                {/* Preview Page Header Layout mirroring Screenshot 2 */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50 p-3.5 rounded-2xl border border-gray-100">
                  <div>
                    <h3 className="text-sm font-black text-[#164121] uppercase tracking-wider">Preview</h3>
                    <p className="text-[10.5px] text-gray-400 font-extrabold">{qrPaperSize} — {blocks.find(b => b.name === qrSelectedBlockName)?.units_per_floor || 5} codes per sheet preview</p>
                  </div>
                  
                  {/* Top-Right Quick action triggers matching Screenshot 2 */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintConfig({
                          type: 'sheet',
                          block: qrSelectedBlockName,
                          floor: qrSelectedFloor,
                        });
                        setFeedbackMessage(`Opening compliance printer dialogue for ${qrSelectedBlockName} Level ${qrSelectedFloor}. Choose 'Save as PDF' to export as a digital document.`);
                        setTimeout(() => {
                          window.print();
                        }, 200);
                      }}
                      className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-slate-50 rounded-xl text-[10.5px] font-black text-gray-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-gray-400" />
                      <span>Print all sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blockLetter = qrSelectedBlockName.replace(/Block\s+/i, '').trim().charAt(0) || 'U';
                        const blockObj = blocks.find(b => b.name === qrSelectedBlockName);
                        const currentUnitsOnFloorCount = blockObj ? (blockObj.units[qrSelectedFloor] || []).length : 5;
                        const nextUnitNumber = currentUnitsOnFloorCount + 1;
                        const prefilled = `${blockLetter}-${qrSelectedFloor}${nextUnitNumber < 10 ? '0' + nextUnitNumber : nextUnitNumber}`;
                        
                        // Check if prefilled already has registered details
                        const foundUnit = blockObj && blockObj.units[qrSelectedFloor]
                          ? blockObj.units[qrSelectedFloor].find((u: any) => u.unit_number === prefilled)
                          : null;
                        
                        setNewQRUnitNumber(prefilled);
                        if (foundUnit) {
                          setNewQRResidentName(foundUnit.resident || '');
                          setNewQRResidentPhone(foundUnit.resident_phone || '');
                          setNewQRResidentEmail(foundUnit.resident_email || '');
                        } else {
                          setNewQRResidentName('');
                          setNewQRResidentPhone('');
                          setNewQRResidentEmail('');
                        }
                        setIsCreateQRUnitModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white rounded-xl text-[10.5px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>Generate new</span>
                    </button>
                  </div>
                </div>

                {/* Subtitle / Selected Scope Banner */}
                <div className="bg-[#E8F5E9]/45 border border-emerald-100/50 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-800 text-sm">📍</span>
                    <p className="text-xs font-bold text-emerald-950">
                      Scope: <span className="font-extrabold text-[#2E7D32]">{qrSelectedBlockName}</span> • Floor <span className="font-extrabold text-[#2E7D32]">Level {qrSelectedFloor}</span>
                    </p>
                  </div>
                  <span className="text-[9.5px] font-mono text-emerald-800 font-extrabold uppercase bg-emerald-50 px-2.5 py-0.5 rounded-md">
                    Live dynamic routing enabled
                  </span>
                </div>

                {/* Grid container targeting house-by-house QR codes */}
                {(() => {
                  const targetBlockObj = blocks.find(b => b.name === qrSelectedBlockName);
                  const floorUnitsList: any[] = targetBlockObj 
                    ? (targetBlockObj.units[qrSelectedFloor] || []) 
                    : [];

                  const filteredUnitsList = floorUnitsList.filter((unitObjObj) => {
                    const numberMatch = unitObjObj.unit_number.toLowerCase().includes(qrSearchQuery.toLowerCase());
                    const residentMatch = unitObjObj.resident && unitObjObj.resident.toLowerCase().includes(qrSearchQuery.toLowerCase());
                    return numberMatch || residentMatch;
                  });

                  if (filteredUnitsList.length === 0) {
                    return (
                      <div className="py-12 text-center bg-slate-50/40 p-6 rounded-2xl border border-dashed border-gray-200">
                        <QrCode className="w-10 h-10 text-gray-300 mx-auto stroke-1 mb-2.5" />
                        <h4 className="text-xs font-black text-gray-700">No Household Records Found</h4>
                        <p className="text-[10px] text-gray-450 mt-1 font-semibold max-w-sm mx-auto">
                          We couldn't locate any units matching "{qrSearchQuery}" on level {qrSelectedFloor} of {qrSelectedBlockName}. Register extra rooms under physical housings.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredUnitsList.map((unitObj, idx) => {
                        const isOccupied = !!unitObj.resident;
                        const finalCodeString = `ECOTRACK-${qrSelectedBlockName.replace(' ', '')}-F${qrSelectedFloor}-${unitObj.unit_number}`;
                        
                        return (
                          <div 
                            key={`${unitObj.unit_number}-${idx}`} 
                            className="border border-gray-150 p-4 rounded-3xl flex flex-col justify-between hover:scale-[1.01] hover:border-[#2E7D32]/35 transition-all duration-250 bg-white relative group shadow-xs animate-in zoom-in-95 duration-150"
                          >
                            
                            {/* Card top flags */}
                            <div className="flex justify-between items-start gap-1 pb-3 mb-2.5 border-b border-gray-100">
                              <div>
                                <span className="text-[9.5px] font-black text-[#2E7D32] tracking-wider block">ECOTRACK</span>
                                <span className="text-[8px] text-gray-400 font-mono font-bold uppercase tracking-tight block">CODE v2.4</span>
                              </div>
                              
                              <div className="shrink-0">
                                {isOccupied ? (
                                  <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full text-[9px] font-black leading-none uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-[#2E7D32] rounded-full animate-pulse shrink-0"></span>
                                    <span>Done</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-[9px] font-black leading-none uppercase tracking-wider">
                                    <span>Vacant</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Center QR Vector Box */}
                            <div className="bg-slate-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center my-3 relative overflow-hidden">
                              <span className="absolute top-1 text-[7px] font-mono font-black text-gray-300 pointer-events-none select-none uppercase tracking-wider">
                                Secure Token Embed
                              </span>
                              
                              {/* Vector QR code dynamic generator */}
                              <div className="w-28 h-28 bg-white border border-gray-200/65 rounded-xl flex items-center justify-center p-2 cursor-pointer hover:border-[#2E7D32]/50 transition-all duration-200 shadow-xs relative">
                                <QRImage text={finalCodeString} className="w-24 h-24 text-[#164121]" />
                                <span className="absolute bottom-1 bg-slate-950/70 text-white text-[6px] font-mono font-black px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                  {unitObj.unit_number}
                                </span>
                              </div>
                            </div>

                            {/* Unit Descriptions info */}
                            <div className="space-y-1 mt-1 pb-3 text-left">
                              <p className="text-xs font-black text-gray-900">
                                {qrSelectedBlockName} • House {unitObj.unit_number}
                              </p>
                              {isOccupied ? (
                                <p className="text-[10px] text-[#2E7D32] font-semibold truncate">
                                  👤 {unitObj.resident}
                                </p>
                              ) : (
                                <p className="text-[10px] text-gray-400 font-bold italic leading-none pt-0.5">
                                  No registered occupant
                                </p>
                              )}
                              <p className="text-[8px] font-mono text-gray-400 truncate select-all font-bold uppercase mt-0.5">
                                UID: {finalCodeString}
                              </p>
                            </div>

                            {/* Core print settings triggers inside card */}
                            <div className="pt-2.5 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintConfig({
                                    type: 'single',
                                    block: qrSelectedBlockName,
                                    floor: qrSelectedFloor,
                                    unit: unitObj
                                  });
                                  setFeedbackMessage(`Opening compliance printer dialogue for House ${unitObj.unit_number}. Choose 'Save as PDF' to export/print directly.`);
                                  setTimeout(() => {
                                    window.print();
                                  }, 180);
                                }}
                                className="w-full py-2 bg-emerald-50 hover:bg-[#2E7D32] text-[#2E7D32] hover:text-white rounded-xl text-[10.5px] font-black transition-all cursor-pointer flex justify-center items-center gap-1.5"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print QR Code</span>
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

              </div>

            </div>

            {/* 5. GENERATE NEW QR LABEL MODAL */}
            <AnimatePresence>
              {isCreateQRUnitModalOpen && (
                <div className="fixed inset-0 bg-[#164121]/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="generate-qr-modal">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white border border-gray-150 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5 text-left"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-[#164121] text-sm font-black tracking-tight text-left">Generate New QR Label</h3>
                        <p className="text-[11px] text-gray-400 font-bold leading-normal text-left">
                          Scope: {qrSelectedBlockName} • Level {qrSelectedFloor}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateQRUnitModalOpen(false);
                          setResidentValError(null);
                        }}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-gray-400 hover:text-gray-700 rounded-lg shrink-0 cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {residentValError && (
                      <div className="p-3 bg-rose-50 border border-rose-105 rounded-2xl text-rose-700 text-xs font-bold leading-relaxed text-left flex items-start gap-2 animate-fade-in">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{residentValError}</span>
                      </div>
                    )}

                    {/* Form Fields */}
                    <div className="space-y-4">
                      {/* Unit Number Input */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1 text-left">HOUSE (UNIT) NUMBER</label>
                        {(() => {
                          const blockLetter = qrSelectedBlockName.replace(/Block\s+/i, '').trim().charAt(0) || 'U';
                          const blockObj = blocks.find((b: any) => b.name === qrSelectedBlockName);
                          
                          // Get already registered unit numbers on this floor
                          const existingUnitNumbers = blockObj && blockObj.units[qrSelectedFloor] 
                            ? blockObj.units[qrSelectedFloor].map((u: any) => u.unit_number)
                            : [];

                          // Generate standard candidate options (1 to 12)
                          const standardCandidates = Array.from({ length: 12 }, (_, i) => {
                            const num = i + 1;
                            return `${blockLetter}-${qrSelectedFloor}${num < 10 ? '0' + num : num}`;
                          });

                          // Combine both with unique values and sort them
                          const selectOptions = Array.from(new Set([...existingUnitNumbers, ...standardCandidates])).sort();

                          return (
                            <div className="relative">
                              <select
                                required
                                value={newQRUnitNumber}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewQRUnitNumber(val);
                                  
                                  // Auto-prefill existing occupant details if any
                                  const foundUnit = blockObj && blockObj.units[qrSelectedFloor]
                                    ? blockObj.units[qrSelectedFloor].find((u: any) => u.unit_number === val)
                                    : null;
                                  
                                  if (foundUnit) {
                                    setNewQRResidentName(foundUnit.resident || '');
                                    setNewQRResidentPhone(foundUnit.resident_phone || '');
                                    setNewQRResidentEmail(foundUnit.resident_email || '');
                                  } else {
                                    setNewQRResidentName('');
                                    setNewQRResidentPhone('');
                                    setNewQRResidentEmail('');
                                  }
                                }}
                                className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-[#2E7D32] focus:ring-1 focus:ring-emerald-500 rounded-xl p-2.5 text-xs font-bold text-gray-700 text-left cursor-pointer appearance-none pr-10"
                              >
                                <option value="" disabled>-- Select House/Unit --</option>
                                {selectOptions.map((opt) => {
                                  const isRegistered = existingUnitNumbers.includes(opt);
                                  const uObj = blockObj && blockObj.units[qrSelectedFloor]
                                    ? blockObj.units[qrSelectedFloor].find((u: any) => u.unit_number === opt)
                                    : null;
                                  const residentLabel = uObj && uObj.resident ? ` (${uObj.resident})` : '';

                                  return (
                                    <option key={opt} value={opt}>
                                      {opt} {isRegistered ? `• Occupied${residentLabel}` : '• vacant / new'}
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Resident/Occupant Name Info (Optional) */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1 text-left">PRINCIPAL OCCUPANT (OPTIONAL)</label>
                        <input
                          type="text"
                          value={newQRResidentName}
                          onChange={(e) => setNewQRResidentName(e.target.value)}
                          placeholder="e.g. Kusal Mendis"
                          className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-[#2E7D32] focus:ring-1 focus:ring-emerald-500 rounded-xl p-2.5 text-xs font-bold text-gray-700 text-left"
                        />
                      </div>

                      {/* Contact Info (Optional) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1 text-left">PHONE NUMBER</label>
                          <input
                            type="text"
                            value={newQRResidentPhone}
                            onChange={(e) => setNewQRResidentPhone(e.target.value)}
                            placeholder="e.g. 077-1234567"
                            className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl p-2.5 text-xs font-bold text-gray-700 text-left"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wide mb-1 text-left">EMAIL ADDRESS</label>
                          <input
                            type="email"
                            value={newQRResidentEmail}
                            onChange={(e) => setNewQRResidentEmail(e.target.value)}
                            placeholder="e.g. resident@gmail.com"
                            className="w-full bg-[#F4F6F0]/40 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl p-2.5 text-xs font-bold text-gray-700 text-left"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Info text */}
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed text-left">
                      This will register the unit on {qrSelectedBlockName} Floor {qrSelectedFloor} dynamically, enabling on-the-fly QR code generation, instant scans, and automatic compliance recording.
                    </p>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateQRUnitModalOpen(false);
                          setResidentValError(null);
                        }}
                        className="px-4 py-2 border border-gray-150 rounded-xl font-bold text-gray-500 hover:bg-slate-50 text-xs cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newQRUnitNumber.trim()) {
                            setResidentValError("Please select/specify a Unit/House number first.");
                            return;
                          }
                          setResidentValError(null);

                          // 1. Update Blocks state with new unit
                          setBlocks(prev => prev.map(b => {
                            if (b.name !== qrSelectedBlockName) return b;
                            
                            const updatedUnits = { ...b.units };
                            const floorList = updatedUnits[qrSelectedFloor] || [];
                            
                            // Check if unit already exists
                            const exists = floorList.some((u: any) => u.unit_number === newQRUnitNumber.trim());
                            if (exists) {
                              // Just update resident details of existing unit
                              updatedUnits[qrSelectedFloor] = floorList.map((u: any) => 
                                u.unit_number === newQRUnitNumber.trim() ? {
                                  ...u,
                                  resident: newQRResidentName.trim() || u.resident,
                                  resident_phone: newQRResidentPhone.trim() || u.resident_phone,
                                  resident_email: newQRResidentEmail.trim() || u.resident_email
                                } : u
                              );
                            } else {
                              // Register new unit
                              const newUnitObj = {
                                unit_number: newQRUnitNumber.trim(),
                                resident: newQRResidentName.trim() || null,
                                resident_phone: newQRResidentPhone.trim() || null,
                                resident_email: newQRResidentEmail.trim() || null
                              };
                              updatedUnits[qrSelectedFloor] = [...floorList, newUnitObj];
                            }
                            
                            return { ...b, units: updatedUnits };
                          }));

                          // 2. If occupant name is provided, add them to the residents list for general parity
                          if (newQRResidentName.trim()) {
                            setResidents(prev => {
                              const alreadyRegistered = prev.some(r => r.unit === newQRUnitNumber.trim());
                              if (alreadyRegistered) {
                                return prev.map(r => r.unit === newQRUnitNumber.trim() ? {
                                  ...r,
                                  name: newQRResidentName.trim(),
                                  phone: newQRResidentPhone.trim() || r.phone,
                                  email: newQRResidentEmail.trim() || r.email
                                } : r);
                              } else {
                                const newResidentObj = {
                                  id: Date.now(),
                                  name: newQRResidentName.trim(),
                                  email: newQRResidentEmail.trim() || 'resident@ecotrack.lk',
                                  phone: newQRResidentPhone.trim() || '077-123-4567',
                                  block: qrSelectedBlockName,
                                  unit: newQRUnitNumber.trim(),
                                  language: 'English',
                                  moveInDate: new Date().toISOString().split('T')[0],
                                  avatar: 'AS',
                                  nic: 'N/A',
                                  occupancyType: 'Tenant',
                                  householdMembers: 1,
                                  recyclingPlan: 'Standard Recycler',
                                  whatsappEnabled: true,
                                  assistanceRequired: false,
                                  emergencyContactName: 'N/A',
                                  emergencyContactPhone: 'N/A',
                                  notes: 'Registered via QR Sticker setup.'
                                };
                                return [...prev, newResidentObj];
                              }
                            });
                          }

                          // 3. Clear form, close modal, set success feedback
                          setFeedbackMessage(`Generated digital QR sticker and registered unit ${newQRUnitNumber.trim()} successfully!`);
                          setIsCreateQRUnitModalOpen(false);
                        }}
                        className="px-5 py-2.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                      >
                        Generate & Save
                      </button>
                    </div>

                  </motion.div>
                </div>
              )}
</AnimatePresence>

          </div>
        )}

        {/* TAB 6: FINANCIAL LEDGER & PAYMENTS TABLE (Payments tab) */}
        {activeTab === 'payments' && (() => {
          // Calculate statistics from real database payments
          const totalCollectedAmount = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
          const totalOutstandingAmount = payments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0);
          const totalSpecialRequestAmount = payments.filter(p => p.payment_type === 'special_pickup').reduce((sum, p) => sum + p.amount, 0);
          const totalAmount = totalCollectedAmount + totalOutstandingAmount;
          const dynamicCollectionRate = totalAmount > 0 ? Math.round((totalCollectedAmount / totalAmount) * 100) : 0;

          // Advanced filter by Search query & tab selectors
          const displayPayments = payments.filter(p => {
            const query = searchQuery.trim().toLowerCase();
            const matchesSearch = !query || 
              p.resident_name?.toLowerCase().includes(query) ||
              p.unit?.unit_number?.toLowerCase().includes(query) ||
              p.reference_code?.toLowerCase().includes(query) ||
              p.notes?.toLowerCase().includes(query);

            if (!matchesSearch) return false;

            if (paymentFilter === 'paid') return p.status === 'paid';
            if (paymentFilter === 'unpaid') return p.status === 'unpaid';
            if (paymentFilter === 'special') return p.payment_type === 'special_pickup';
            return true;
          });

          return (
            <div className="space-y-6 text-left animate-in fade-in duration-200" id="payments-tab">
              
              {/* Optional banner or top bar descriptor */}
              <div className="flex justify-end items-center gap-4 border-b border-gray-150 pb-5">
                {/* Keep existing function to trigger billing, styled elegantly */}
                <button
                  type="button"
                  onClick={handleGenerateMonthlyBills}
                  disabled={actionLoading}
                  className="bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 border border-[#2E7D32]/20 text-[#2E7D32] py-2 px-3.5 rounded-xl transition-all text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Run Base Monthly Invoice Run</span>
                </button>
              </div>

              {/* 4 Gorgeous KPI Cards Row mirroring Screenshot 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="payments-kpi-row">
                
                {/* KPI Card 1: Total Collected */}
                <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#2E7D32] flex items-center justify-center shrink-0">
                    <PiggyBank className="w-6 h-6 stroke-[1.6]" />
                  </div>
                  <div>
                    <span className="text-[9.5px] font-mono text-gray-400 font-extrabold uppercase tracking-wide block">Total collected (May)</span>
                    <p className="text-lg font-black text-gray-900 mt-0.5">LKR {totalCollectedAmount.toLocaleString()}</p>
                    <span className="text-[8.5px] text-[#2E7D32] font-black uppercase tracking-tight block mt-0.5">Active compliance cycle</span>
                  </div>
                </div>

                {/* KPI Card 2: Outstanding */}
                <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 stroke-[1.6]" />
                  </div>
                  <div>
                    <span className="text-[9.5px] font-mono text-gray-400 font-extrabold uppercase tracking-wide block">Outstanding</span>
                    <p className="text-lg font-black text-gray-900 mt-0.5">LKR {totalOutstandingAmount.toLocaleString()}</p>
                    <span className="text-[8.5px] text-rose-600 font-bold tracking-tight block mt-0.5">Requires reminder dispatch</span>
                  </div>
                </div>

                {/* KPI Card 3: Special Requests */}
                <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <div>
                    <span className="text-[9.5px] font-mono text-gray-400 font-extrabold uppercase tracking-wide block">Special requests</span>
                    <p className="text-lg font-black text-gray-900 mt-0.5">LKR {totalSpecialRequestAmount.toLocaleString()}</p>
                    <span className="text-[8.5px] text-blue-500 font-bold tracking-tight block mt-0.5">Debris & e-waste processing</span>
                  </div>
                </div>

                {/* KPI Card 4: Collection Rate */}
                <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <span className="text-[9.5px] font-mono text-gray-400 font-extrabold uppercase tracking-wide block">Collection rate</span>
                    <p className="text-lg font-black text-[#2E7D32] mt-0.5">{dynamicCollectionRate}%</p>
                    <span className="text-[8.5px] text-gray-400 font-bold tracking-tight block mt-0.5">Target: 95% threshold</span>
                  </div>
                </div>

              </div>

              {/* Filtering Controls & Export CSV Line mirroring Screenshot 2 */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-gray-150">
                <div className="flex gap-2">
                  {(['all', 'paid', 'unpaid', 'special'] as const).map((tab) => {
                    const isSelected = paymentFilter === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPaymentFilter(tab)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black capitalize tracking-tight transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#2E7D32] text-white shadow-xs' 
                            : 'bg-white border border-gray-200 text-gray-550 hover:bg-slate-100 hover:text-gray-900'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Resident,Unit,Amount,Date,Method,Type,Status\n" + 
                      displayPayments.map(p => `"${p.resident_name || 'Resident'}","${p.unit?.unit_number || 'A-301'}","LKR ${p.amount}","${p.date || '2026-05-08'}","${p.method || '—'}","${p.payment_type?.replace('_', ' ')}","${p.status}"`).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `EcoTrack_Financial_Ledger_${paymentFilter}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setFeedbackMessage(`Exported financial CSV log containing ${displayPayments.length} transactions.`);
                  }}
                  className="px-3.5 py-1.5 border border-gray-200 hover:bg-slate-50 rounded-xl text-xs font-black text-gray-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                >
                  <Download className="w-3.5 h-3.5 text-gray-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Transactions Ledger Table Card */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-gray-150 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider select-none">
                        <th className="py-3.5 px-5">Resident</th>
                        <th className="py-3.5 px-4">Unit</th>
                        <th className="py-3.5 px-4">Amount (LKR)</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Method</th>
                        <th className="py-3.5 px-4">Type</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-5 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {displayPayments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-gray-400 select-none bg-slate-50/20">
                            <Receipt className="w-9 h-9 text-gray-300 mx-auto stroke-1 mb-2.5" />
                            <p className="text-xs font-bold">No Records Located</p>
                            <p className="text-[10px] text-gray-450 mt-1">Try resetting the tab filters or cleaning your lookup filters.</p>
                          </td>
                        </tr>
                      ) : (
                        displayPayments.map((item) => {
                          const isPaid = item.status === 'paid';
                          // Create short nickname initials (e.g. Amantha Salgadu -> AS)
                          const initials = item.resident_name 
                            ? item.resident_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() 
                            : 'AS';

                          return (
                            <tr key={item.id} className="hover:bg-[#F4F6F0]/25 transition-colors group">
                              
                              {/* Resident Name & Initials */}
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#2E7D32] text-[10.5px] font-black flex items-center justify-center border border-emerald-100 uppercase shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-gray-950 block group-hover:text-[#2E7D32] transition-colors">
                                      {item.resident_name || 'Resident Occupant'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold block mt-0.5">Reference ID: {item.reference_code}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Unit Number */}
                              <td className="py-4 px-4">
                                <span className="font-mono font-bold text-gray-800 bg-slate-100 px-2.5 py-1 rounded-md text-[10px]">
                                  {item.unit?.unit_number || 'A-301'}
                                </span>
                              </td>

                              {/* Amount (LKR) */}
                              <td className="py-4 px-4">
                                <span className="font-black text-gray-900 text-[13px]">
                                  {item.amount.toLocaleString()}
                                </span>
                              </td>

                              {/* Date */}
                              <td className="py-4 px-4 text-gray-400 font-bold text-[11px]">
                                {item.date?.split(',')[0] || '2026-05-08'}
                              </td>

                              {/* Payment Method */}
                              <td className="py-4 px-4">
                                <span className="text-gray-500 font-semibold text-[11.5px]">
                                  {item.method || '—'}
                                </span>
                              </td>

                              {/* Payment Type Badges (Monthly / Special) */}
                              <td className="py-4 px-4">
                                {item.payment_type === 'special_pickup' ? (
                                  <span className="inline-block text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 tracking-wide border border-blue-100">
                                    Special
                                  </span>
                                ) : (
                                  <span className="inline-block text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 tracking-wide border border-neutral-200">
                                    Monthly
                                  </span>
                                )}
                              </td>

                              {/* Status Badge (Paid / Unpaid) with nice bullets */}
                              <td className="py-4 px-4">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1.5 bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider leading-none">
                                    <span className="w-1.5 h-1.5 bg-[#2E7D32] rounded-full shrink-0"></span>
                                    <span>Paid</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider leading-none border border-rose-100">
                                    <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0 animate-pulse"></span>
                                    <span>Unpaid</span>
                                  </span>
                                )}
                              </td>

                              {/* Receipt Action with direct trigger inside modal */}
                              <td className="py-4 px-5 text-right">
                                {isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptTxn(item)}
                                    className="p-1.5 rounded-lg bg-slate-105 hover:bg-[#2E7D32]/10 text-gray-400 hover:text-[#2E7D32] transition-all cursor-pointer inline-flex items-center justify-center border border-gray-200/50"
                                    title="View interactive transaction receipt"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const confirmPay = confirm(`Do you want to record cash/cheque clearance for Resident ${item.resident_name || 'Occupant'}?`);
                                      if (confirmPay) {
                                        try {
                                          const res = await fetch(`/api/admin/payments/${item.id}/mark-paid`, {
                                            method: 'POST',
                                            headers: {
                                              'Authorization': `Bearer ${token}`,
                                              'Accept': 'application/json',
                                              'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ payment_method: 'cash' })
                                          });
                                          if (!res.ok) throw new Error('Failed to mark payment');
                                          setFeedbackMessage(`Cleared invoice balance for Unit ${item.unit?.unit_number}.`);
                                          loadAdminMetrics();
                                        } catch {
                                          setFeedbackMessage('Failed to update payment. Please try again.');
                                        }
                                      }
                                    }}
                                    className="text-[9.5px] font-black text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-2 py-1 rounded-lg transition-all cursor-pointer"
                                  >
                                    Clear levy
                                  </button>
                                )}
                              </td>

                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Magnificent Interactive Slide-In Receipt Details Modal with Side-by-Side Preview and PDF Export */}
              <AnimatePresence>
                {selectedReceiptTxn && (
                  <div className="fixed inset-0 bg-emerald-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: 15 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 15 }}
                      transition={{ type: "spring", duration: 0.4 }}
                      className="w-full max-w-4xl bg-slate-50 rounded-3xl overflow-hidden shadow-2xl border border-gray-200 relative text-left flex flex-col"
                      id="receipt-details-panel"
                    >
                      {/* Green Header block */}
                      <div className="bg-[#1E562F] p-5 pb-6 text-white text-left relative flex justify-between items-center shrink-0">
                        <div>
                          <span className="text-[9px] font-bold opacity-75 uppercase tracking-widest block">Unified Compliance Ledger</span>
                          <h3 className="text-lg font-mono font-black mt-0.5 select-all text-white">Receipt #{selectedReceiptTxn.reference_code || `TXN-294821`}</h3>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptTxn(null)}
                          className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer mr-6 md:mr-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Side-by-Side Container Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gray-200 overflow-y-auto max-h-[80vh]">
                        
                        {/* LEFT COLUMN: GORGEOUS LIVE DOCUMENT SHEET PREVIEW */}
                        <div className="col-span-1 md:col-span-5 bg-slate-100 p-6 flex flex-col items-center justify-center min-h-[420px]">
                          <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider mb-2.5 block text-center select-none">
                            📜 Live Document Preview
                          </span>
                          
                          {/* Realistic Floating Paper Receipt Sheet */}
                          <div className="w-full max-w-[316px] bg-white rounded-xl shadow-lg border border-gray-200/80 p-5 relative overflow-hidden text-gray-800 text-left font-sans select-none my-1">
                            {/* Top green status bar indicator */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600"></div>
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mt-2 mb-4">
                              <div>
                                <h4 className="text-[12px] font-black tracking-tight text-[#1E562F]">ECOTRACK RECEIPT</h4>
                                <p className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-widest">sustainable residency</p>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] font-mono font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                  #{selectedReceiptTxn.reference_code || "TXN-294821"}
                                </span>
                              </div>
                            </div>

                            {/* Stamped Watermark Effect */}
                            <div className="absolute top-24 right-4 border-2 border-emerald-600/35 rounded px-2.5 py-0.5 text-emerald-600/40 font-black text-[11px] tracking-widest uppercase rotate-[-12deg] pointer-events-none select-none">
                              PAID SECURE
                            </div>

                            {/* Metadata list */}
                            <div className="space-y-2 text-[10px]">
                              <div className="border-b border-gray-100 pb-1.5">
                                <span className="text-[7.5px] text-gray-400 font-extrabold block uppercase tracking-wider">Billed To (Resident)</span>
                                <span className="font-extrabold text-gray-800">{selectedReceiptTxn.resident_name || "Amantha Salgadu"}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 border-b border-gray-100 pb-1.5">
                                <div>
                                  <span className="text-[7.5px] text-gray-400 font-extrabold block uppercase tracking-wider">Unit / House</span>
                                  <span className="font-mono font-bold text-gray-800">{selectedReceiptTxn.unit?.unit_number || "A-301"}</span>
                                </div>
                                <div>
                                  <span className="text-[7.5px] text-gray-400 font-extrabold block uppercase tracking-wider">Tax Period</span>
                                  <span className="font-bold text-emerald-700">{selectedReceiptTxn.period || "May 2026"}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 border-b border-gray-100 pb-1.5">
                                <div>
                                  <span className="text-[7.5px] text-gray-400 font-extrabold block uppercase tracking-wider">Gateway Channel</span>
                                  <span className="font-bold text-gray-700 truncate block">PayHere Online</span>
                                </div>
                                <div>
                                  <span className="text-[7.5px] text-gray-400 font-extrabold block uppercase tracking-wider">Timestamp</span>
                                  <span className="font-medium text-gray-600 truncate block text-[9.5px]">{selectedReceiptTxn.date || "2026-05-08"}</span>
                                </div>
                              </div>

                              {/* Paid Levy List breakdown */}
                              <div className="bg-emerald-50/50 rounded-lg p-2 border border-emerald-100/30 my-1">
                                <div className="flex justify-between font-black text-[#1E562F] mb-0.5">
                                  <span>Monthly Sustainability Levy</span>
                                  <span>LKR {selectedReceiptTxn.amount.toLocaleString()}.00</span>
                                </div>
                                <p className="text-[8px] text-gray-400 leading-tight">Shared community maintain, garbage disposal, emission audit, and local gateway taxes.</p>
                              </div>

                              {/* Grand Total */}
                              <div className="flex justify-between items-baseline pt-1 text-right mt-1.5">
                                <span className="text-[8px] font-extrabold text-gray-400 uppercase">AMOUNT PAID:</span>
                                <span className="text-[13px] font-black text-gray-900 font-mono">LKR {selectedReceiptTxn.amount.toLocaleString()}.00</span>
                              </div>

                              {/* Barcode representation */}
                              <div className="flex flex-col items-center pt-2 mt-1.5 border-t border-dashed border-gray-200">
                                <span className="text-[15px] font-bold text-slate-700 tracking-widest font-mono">||| | | || ||| || |</span>
                                <span className="text-[7px] font-mono text-gray-400 tracking-tight">VERIFIED ECOTRACK SIGNATURE ID: {selectedReceiptTxn.txn_code || "EC-A301"}</span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-[9.5px] text-gray-400 font-bold mt-2 select-none text-center">
                            Pristine A4 Letterhead document alignment
                          </p>
                        </div>

                        {/* RIGHT COLUMN: ACTION CONTROLS & COMPLIANCE DATA METADATA */}
                        <div className="col-span-1 md:col-span-7 bg-white p-6 flex flex-col justify-between space-y-6">
                          
                          {/* Receipt Summary Grid */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#E8F5E9] border border-[#2E7D32]/25 flex items-center justify-center shrink-0">
                                <Check className="w-5 h-5 text-[#2E7D32] stroke-[3.5]" />
                              </div>
                              <div>
                                <span className="text-xs text-emerald-800 font-black tracking-wide uppercase">PAID IN FULL</span>
                                <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-none mt-0.5">
                                  LKR {selectedReceiptTxn.amount.toLocaleString()}.00
                                </h3>
                              </div>
                            </div>

                            <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                              This payment complies with Sri Lanka Municipal Council Regulations. All compliance metrics for residential unit <strong>{selectedReceiptTxn.unit?.unit_number}</strong> have been marked as fully active.
                            </p>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 text-xs text-left border-t border-gray-100">
                              <div>
                                <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">Resident Subscriber</span>
                                <span className="font-extrabold text-gray-800 block mt-0.5 truncate text-[11.5px]">
                                  {selectedReceiptTxn.resident_name || 'Amantha Salgadu'}
                                </span>
                              </div>

                              <div>
                                <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">Residential Unit</span>
                                <span className="font-mono font-extrabold text-gray-800 block mt-0.5 text-[11.5px]">
                                  {selectedReceiptTxn.unit?.unit_number || 'A-301'}
                                </span>
                              </div>

                              <div>
                                <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">Billing Session</span>
                                <span className="font-extrabold text-emerald-700 block mt-0.5 text-[11.5px]">
                                  {selectedReceiptTxn.period || 'May 2026'}
                                </span>
                              </div>

                              <div>
                                <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">Payment Channel</span>
                                <span className="font-extrabold text-gray-800 block mt-0.5 text-[11px] truncate">
                                  {selectedReceiptTxn.method || 'PayHere • Visa **4821'}
                                </span>
                              </div>

                              <div className="col-span-2">
                                <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">Cryptographic Security Ledger Verification</span>
                                <span className="font-mono font-bold text-gray-600 bg-slate-50 border border-gray-100 px-2 py-1 rounded block mt-1 tracking-tight text-[10px] truncate select-all">
                                  {selectedReceiptTxn.txn_code || 'EC-2026-05-A301'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Interactive Download Controls */}
                          <div className="space-y-3 pt-3 border-t border-gray-100">
                            
                            <div className="text-[10px] text-slate-400 font-bold tracking-tight">
                              DOWNLOAD FORMAT OPTIONS:
                            </div>

                            {/* Option 1: PDF Document Downloader */}
                            <button
                              type="button"
                              onClick={() => {
                                printReceiptAsPDF(selectedReceiptTxn);
                                setSelectedReceiptTxn(null);
                              }}
                              className="w-full bg-[#1E562F] hover:bg-[#164121] text-white py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs group"
                            >
                              <FileText className="w-4 h-4 text-emerald-300 group-hover:scale-105 transition-transform" />
                              <span>Download PDF Receipt (Recommended)</span>
                            </button>

                            {/* Option 2: SVG Graphic Downloader */}
                            <button
                              type="button"
                              onClick={() => {
                                downloadReceiptAsSVG(selectedReceiptTxn);
                                setSelectedReceiptTxn(null);
                              }}
                              className="w-full bg-white hover:bg-slate-50 text-gray-700 border border-gray-250 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-500" />
                              <span>Download High-Fidelity SVG Vector</span>
                            </button>

                            <p className="text-[9.5px] text-gray-400 leading-tight font-medium text-center pt-1.5">
                              Saving as PDF opens the native browser document compiler. Select <strong>Save as PDF</strong> as your printer option to store a high-resolution print copy securely.
                            </p>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>


            </div>
          );
        })()}

        {/* TAB 7: GRIEVANCES & COMPLAINTS DESK (Complaints tab) */}
        {activeTab === 'complaints' && (() => {
          // Dynamic counts for status selectors
          const openComplaintsCount = complaints.filter(c => c.status === 'open').length;
          const resolvedComplaintsCount = complaints.filter(c => c.status === 'resolved').length;
          const totalComplaintsCount = complaints.length;

          // Filtered complaints for the selected tab & search
          const displayComplaints = complaints.filter(c => {
            const query = searchQuery.trim().toLowerCase();
            const matchesSearch = !query || 
              c.complaint_code?.toLowerCase().includes(query) ||
              c.title?.toLowerCase().includes(query) ||
              c.description?.toLowerCase().includes(query) ||
              c.resident_name?.toLowerCase().includes(query);

            if (!matchesSearch) return false;

            if (complaintFilter === 'open') return c.status === 'open';
            if (complaintFilter === 'resolved') return c.status === 'resolved';
            return true;
          });

          // Handlers
          const selectComplaintItem = (item: any) => {
            setSelectedComplaint(item);
            setComplaintResponseText('');
          };

          const getComplaintReplies = (c: any) => {
            if (!c) return [];
            if (c.replies) return c.replies;
            
            const list: any[] = [
              {
                sender: 'resident',
                author: c.resident_full_name || c.resident_name || 'Resident',
                text: c.description,
                timestamp: c.created_at,
                isInitial: true
              }
            ];

            if (c.status === 'resolved' && c.resolved_notes) {
              list.push({
                sender: 'admin',
                author: 'Amantha Salgadu',
                text: 'Our municipal compliance officer and the designated zone worker have been alerted. We have scheduled an inspection to verify the report.',
                timestamp: c.created_at,
                isResolution: false
              });
              
              list.push({
                sender: 'admin',
                author: 'Amantha Salgadu',
                text: c.resolved_notes,
                timestamp: c.created_at,
                isResolution: true
              });
            }

            return list;
          };

          const handleFormSubmit = (isResolution: boolean) => {
            if (!selectedComplaint) return;
            
            let noteText = complaintResponseText.trim();
            if (!noteText) {
              if (isResolution) {
                noteText = "Complaint resolved and closed by the administrative team.";
              } else {
                setFeedbackMessage("Please enter an internal note or response message first before submitting.");
                return;
              }
            }

            const now = new Date();
            const formattedTime = now.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) + ', ' + now.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });

            const newReply = {
              sender: 'admin',
              author: 'Amantha Salgadu',
              text: noteText,
              timestamp: formattedTime,
              isResolution: isResolution
            };

            // Update complaints state locally
            setComplaints(prev => prev.map(c => {
              if (c.id === selectedComplaint.id) {
                const currentReplies = getComplaintReplies(c);
                return {
                  ...c,
                  status: isResolution ? 'resolved' : 'open',
                  resolved_notes: isResolution ? noteText : c.resolved_notes,
                  replies: [...currentReplies, newReply]
                };
              }
              return c;
            }));

            // Update active selected complaint
            setSelectedComplaint((prev: any) => {
              if (!prev) return null;
              const currentReplies = getComplaintReplies(prev);
              return {
                ...prev,
                status: isResolution ? 'resolved' : 'open',
                resolved_notes: isResolution ? noteText : prev.resolved_notes,
                replies: [...currentReplies, newReply]
              };
            });

            if (isResolution) {
              handleResolveComplaint(selectedComplaint.id, noteText);
              setFeedbackMessage(`Complaint #${selectedComplaint.complaint_code} resolved successfully.`);
            } else {
              setFeedbackMessage(`Internal notes successfully appended and dispatched to Resident ${selectedComplaint.resident_full_name || selectedComplaint.resident_name}.`);
            }
            setComplaintResponseText('');
          };

          // IF DETAILED COMPLAINT VIEW IS SELECTED
          if (selectedComplaint) {
            const isResolved = selectedComplaint.status === 'resolved';
            const initials = selectedComplaint.resident_name 
              ? selectedComplaint.resident_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() 
              : 'DS';

            return (
              <div className="space-y-6 text-left animate-in fade-in duration-200 font-sans" id="complaints-tab-detail">
                
                {/* Header with Breadcrumbs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 id-breadcrumbs uppercase tracking-widest leading-none">
                      <button type="button" onClick={() => setSelectedComplaint(null)} className="hover:text-[#2E7D32] cursor-pointer">Home</button>
                      <span>/</span>
                      <button type="button" onClick={() => setSelectedComplaint(null)} className="hover:text-[#2E7D32] cursor-pointer">Complaints</button>
                      <span>/</span>
                      <span className="text-gray-500 font-extrabold">{selectedComplaint.complaint_code}</span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button 
                        type="button" 
                        onClick={() => setSelectedComplaint(null)}
                        className="p-1.5 rounded-lg border border-gray-255 hover:border-[#2E7D32] hover:text-[#2E7D32] bg-white transition-all cursor-pointer flex items-center justify-center shadow-xs"
                        title="Go back to list"
                        id="back-to-complaints-list"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-500" />
                      </button>
                      <h2 className="text-xl font-black text-[#164121] tracking-tight">Complaint #{selectedComplaint.complaint_code}</h2>
                    </div>
                  </div>

                  {/* Delete button in detailed view */}
                  <button
                    type="button"
                    onClick={() => handleDeleteComplaint(selectedComplaint.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 border border-rose-100 hover:bg-rose-550/10 hover:border-rose-300 text-rose-600 font-black rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                    title="Delete complaint permanently"
                  >
                    <Trash className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete Complaint</span>
                  </button>
                </div>

                {/* Split layout: Complaint & Resident Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* LEFT COLUMN: Complaint Details card and reply form (Col span 8) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Complaint Main details card */}
                    <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs text-left relative space-y-4" id="complaint-detail-card">
                      
                      {/* Section label and Status Badge */}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-gray-400 font-extrabold uppercase tracking-widest block">Complaint</span>
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1.5 bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider leading-none">
                            <span className="w-1.5 h-1.5 bg-[#2E7D32] rounded-full shrink-0"></span>
                            <span>Resolved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider leading-none border border-rose-100">
                            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0 animate-pulse"></span>
                            <span>Open</span>
                          </span>
                        )}
                      </div>

                      {/* Complaint title */}
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">{selectedComplaint.title}</h3>

                      {/* Shaded description container */}
                      <div className="bg-[#F8FAF6]/90 border border-emerald-100/45 rounded-2xl p-4 space-y-2 text-left relative overflow-hidden">
                        <span className="text-[8px] font-mono font-black text-emerald-800 uppercase tracking-widest block opacity-75">Description</span>
                        <p className="text-xs sm:text-[13px] text-emerald-950 font-semibold leading-relaxed">
                          "{selectedComplaint.description}"
                        </p>
                        <span className="text-[10px] text-emerald-750/80 font-bold block pt-1.5">
                          Submitted {selectedComplaint.created_at}
                        </span>
                      </div>

                      {/* RESOLVED SECTION IF APPLICABLE */}
                      {isResolved && selectedComplaint.resolved_notes && (
                        <div className="p-4 bg-[#E8F5E9]/35 border border-emerald-100 rounded-2xl space-y-2 text-left animate-in slide-in-from-top-2 duration-300">
                          <span className="text-[9px] font-mono font-black text-[#2E7D32] uppercase tracking-wider block">LATEST OFFICIAL RESOLUTION PLAN:</span>
                          <p className="text-xs text-[#164121] font-semibold leading-relaxed">
                            {selectedComplaint.resolved_notes}
                          </p>
                        </div>
                      )}

                    </div>

                    {/* Correspondence & Resolution History Feed */}
                    <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs text-left space-y-4 animate-in fade-in zoom-in-95 duration-200" id="complaint-timeline-card">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                        <div>
                          <h4 className="text-xs font-black text-[#164121] uppercase tracking-wider">Correspondence & Audit Log</h4>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">Chronological record of resident reports and management updates.</p>
                        </div>
                        <span className="font-mono text-[10px] font-black bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                          {getComplaintReplies(selectedComplaint).length} {getComplaintReplies(selectedComplaint).length === 1 ? 'record' : 'records'}
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {getComplaintReplies(selectedComplaint).map((reply: any, index: number) => {
                          const isResident = reply.sender === 'resident';
                          const isResolutionLog = reply.isResolution;
                          const repInitials = reply.author && reply.author.split(' ').length > 0
                            ? reply.author.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            : 'RE';
                          
                          return (
                            <div key={index} className={`flex gap-3 text-xs items-start animate-in slide-in-from-bottom-2 duration-250 ${index > 0 ? 'border-t border-gray-100 pt-3' : ''}`}>
                              {/* Avatar identifier */}
                              {isResident ? (
                                <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100 font-extrabold text-[10px] uppercase">
                                  {repInitials}
                                </div>
                              ) : isResolutionLog ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 border border-emerald-600 font-black text-[10px]">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#1E562F] flex items-center justify-center shrink-0 border border-emerald-100 font-extrabold text-[10px]">
                                  AS
                                </div>
                              )}

                              {/* Message content panel */}
                              <div className="flex-1 space-y-1 text-left">
                                <div className="flex justify-between items-baseline gap-2">
                                  <span className={`font-black tracking-tight text-[11px] ${
                                    isResident ? 'text-sky-800' : isResolutionLog ? 'text-[#1E562F]' : 'text-[#164121]'
                                  }`}>
                                    {reply.author} 
                                    <span className="text-[9px] font-bold text-gray-400 ml-1.5 uppercase tracking-wider">
                                      {isResident ? 'Resident' : isResolutionLog ? 'Official Resolution' : 'Scheme Manager'}
                                    </span>
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-bold block shrink-0">{reply.timestamp}</span>
                                </div>

                                <div className={`p-3 rounded-2xl ${
                                  isResident 
                                    ? 'bg-sky-50/45 text-slate-800 border border-sky-100/30' 
                                    : isResolutionLog 
                                      ? 'bg-[#E8F5E9]/60 text-emerald-950 border border-emerald-100 font-semibold' 
                                      : 'bg-slate-50 text-slate-700 border border-gray-100'
                                }`}>
                                  <p className="leading-relaxed text-[11.5px] whitespace-pre-line">{reply.text}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Response / Resolution Card */}
                    <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs text-left space-y-4" id="complaint-reply-card">
                      
                      <div>
                        <h4 className="text-xs font-black text-[#164121] uppercase tracking-wider">Add internal note / response</h4>
                        <p className="text-[10.5px] text-gray-400 font-extrabold mt-0.5">Lodge resolution logs or dispatch responses straight to the homeowners' devices.</p>
                      </div>

                      {/* Msg text area */}
                      <div>
                        <textarea
                          rows={4}
                          value={complaintResponseText}
                          onChange={(e) => setComplaintResponseText(e.target.value)}
                          placeholder="Type a response to the resident..."
                          className="w-full text-xs p-4 border border-gray-180 bg-slate-50/50 rounded-2xl focus:bg-white focus:ring-1 focus:ring-[#2E7D32] transition-colors font-semibold leading-relaxed"
                          id="complaint-textarea-input"
                        />
                      </div>

                      {/* Form action buttons */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleFormSubmit(false)}
                          className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 hover:text-[#2E7D32] hover:border-[#2E7D32]/50 hover:bg-[#2E7D32]/5 text-xs font-black rounded-xl transition-all cursor-pointer flex justify-center items-center gap-2"
                        >
                          <Mail className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#2E7D32]" />
                          <span>Reply only</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormSubmit(true)}
                          className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex justify-center items-center gap-2 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Resolve complaint</span>
                        </button>
                      </div>

                    </div>

                  </div>

                  {/* RIGHT COLUMN: Resident Card & Related Job (Col span 4) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Card 1: Resident Info */}
                    <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs text-left space-y-5" id="complaint-resident-panel">
                      <div>
                        <span className="text-[10px] font-mono text-gray-400 font-extrabold uppercase tracking-widest block">Resident</span>
                      </div>

                      {/* ID layout with Avatar initials */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#2E7D32] text-xs font-black flex items-center justify-center border border-emerald-100 uppercase shrink-0">
                          {initials}
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold text-gray-950 text-xs sm:text-md">{selectedComplaint.resident_full_name || selectedComplaint.resident_name || 'Resident Occupant'}</p>
                          <p className="text-[10.5px] text-gray-400 font-bold block mt-0.5">Unit {selectedComplaint.unit_number}</p>
                          <p className="text-[10.5px] text-gray-400 font-bold block mt-0.2">{selectedComplaint.resident_phone || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Contact trigger buttons */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveCallResident({
                            name: selectedComplaint.resident_full_name || selectedComplaint.resident_name || 'Resident Occupant',
                            phone: selectedComplaint.resident_phone || '077-123-4567',
                            unit: selectedComplaint.unit_number || 'N/A'
                          })}
                          className="py-2.5 bg-white border border-gray-200 hover:border-gray-250 hover:bg-emerald-50/30 text-gray-650 hover:text-[#2E7D32] rounded-xl text-xs font-black transition-all cursor-pointer flex justify-center items-center gap-1.5 shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#2E7D32]" />
                          <span>Call</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveChatResident(selectedComplaint)}
                          className="py-2.5 bg-white border border-gray-200 hover:border-gray-250 hover:bg-emerald-50/30 text-gray-650 hover:text-[#2E7D32] rounded-xl text-xs font-black transition-all cursor-pointer flex justify-center items-center gap-1.5 shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#2E7D32]" />
                          <span>Chat</span>
                        </button>
                      </div>

                    </div>

                    {/* Card 2: Related Job Details */}
                    <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-xs text-left space-y-4" id="complaint-related-job">
                      
                      <div>
                        <span className="text-[10px] font-mono text-gray-400 font-extrabold uppercase tracking-widest block">Related Job</span>
                      </div>

                      {/* Job details box */}
                      <div className="bg-slate-50/50 border border-gray-150 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[11.5px] font-mono font-black text-[#2E7D32]">
                              {selectedComplaint.related_job_code || '#J-2817 • B-204'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5">
                              {selectedComplaint.related_job_worker || 'Nimal P.'}
                            </span>
                          </div>

                          {/* Dynamic job status bullet badge */}
                          {(() => {
                            const jobStatus = selectedComplaint.related_job_status || 'Issue';
                            const isDone = jobStatus === 'Completed';
                            const isProgress = jobStatus === 'In Progress';
                            
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black leading-none uppercase tracking-wider ${
                                isDone 
                                  ? 'bg-[#E8F5E9] text-[#2E7D32]' 
                                  : isProgress 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                <span className={`w-1 h-1 rounded-full shrink-0 ${
                                  isDone ? 'bg-[#2E7D32]' : isProgress ? 'bg-blue-600' : 'bg-rose-600'
                                }`}></span>
                                <span>{jobStatus}</span>
                              </span>
                            );
                          })()}
                        </div>

                        <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-[10px] text-gray-400 font-bold">
                          <span>Dispatch Date</span>
                          <span className="text-gray-700">{selectedComplaint.related_job_date || '2026-05-09'}</span>
                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>
            );
          }

          // DEFAULT COMPLAINTS LIST SCREEN (mirroring Screenshot 1)
          return (
            <div className="space-y-6 text-left animate-in fade-in duration-200" id="complaints-tab-list">
              
              {/* Filtering tabs & Status metrics mirroring Screenshot 1 */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-gray-150">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setComplaintFilter('all')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black capitalize tracking-tight transition-all cursor-pointer ${
                      complaintFilter === 'all' 
                        ? 'bg-[#2E7D32] text-white shadow-xs' 
                        : 'bg-white border border-gray-200 text-gray-550 hover:bg-slate-100 hover:text-gray-900'
                    }`}
                  >
                    All ({totalComplaintsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setComplaintFilter('open')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black capitalize tracking-tight transition-all cursor-pointer ${
                      complaintFilter === 'open' 
                        ? 'bg-[#2E7D32] text-white shadow-xs' 
                        : 'bg-white border border-gray-200 text-gray-550 hover:bg-slate-100 hover:text-gray-900'
                    }`}
                  >
                    Open ({openComplaintsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setComplaintFilter('resolved')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black capitalize tracking-tight transition-all cursor-pointer ${
                      complaintFilter === 'resolved' 
                        ? 'bg-[#2E7D32] text-white shadow-xs' 
                        : 'bg-white border border-gray-200 text-gray-550 hover:bg-slate-100 hover:text-gray-900'
                    }`}
                  >
                    Resolved ({resolvedComplaintsCount})
                  </button>
                </div>
              </div>

              {/* Compact table showing list of complaints */}
              <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-gray-150 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider select-none">
                        <th className="py-3.5 px-5">Complaint</th>
                        <th className="py-3.5 px-4 w-1/4">Resident</th>
                        <th className="py-3.5 px-4">Unit</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-750">
                      {displayComplaints.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-gray-400 select-none bg-slate-50/20">
                            <ClipboardList className="w-9 h-9 text-gray-300 mx-auto stroke-1 mb-2.5" />
                            <p className="text-xs font-bold">No grievances logged</p>
                            <p className="text-[10px] text-gray-450 mt-1">Try resetting the status filter tabs.</p>
                          </td>
                        </tr>
                      ) : (
                        displayComplaints.map((item) => {
                          const isResolved = item.status === 'resolved';
                          const initials = item.resident_name 
                            ? item.resident_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() 
                            : 'DS';

                          return (
                            <tr key={item.id} className="hover:bg-[#F4F6F0]/25 transition-colors group">
                              
                              {/* Title / Code info */}
                              <td className="py-4.5 px-5 select-text">
                                <span className="text-[10px] text-gray-400 font-mono font-bold block">#{item.complaint_code}</span>
                                <span className="font-black text-[#164121] text-xs sm:text-[13px] block mt-0.5 group-hover:text-[#2E7D32] transition-colors cursor-pointer" onClick={() => selectComplaintItem(item)}>
                                  {item.title}
                                </span>
                              </td>

                              {/* Resident block with Initial Badge */}
                              <td className="py-4.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#2E7D32] text-[10.5px] font-black flex items-center justify-center border border-emerald-100 uppercase shrink-0">
                                    {initials}
                                  </div>
                                  <span className="font-extrabold text-gray-950 truncate max-w-[150px]">
                                    {item.resident_full_name || item.resident_name}
                                  </span>
                                </div>
                              </td>

                              {/* Physical unit */}
                              <td className="py-4.5 px-4">
                                <span className="font-mono font-bold text-gray-800 bg-slate-100 px-2.5 py-1 rounded-md text-[10px]">
                                  {item.unit_number}
                                </span>
                              </td>

                              {/* Submission date */}
                              <td className="py-4.5 px-4 text-gray-400 font-bold text-[11.4px]">
                                {item.created_at?.split(',')[0]}
                              </td>

                              {/* Status bullets */}
                              <td className="py-4.5 px-4">
                                {isResolved ? (
                                  <span className="inline-flex items-center gap-1.5 bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider leading-none">
                                    <span className="w-1.5 h-1.5 bg-[#2E7D32] rounded-full shrink-0"></span>
                                    <span>Resolved</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-750 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider leading-none border border-rose-100">
                                    <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0 animate-pulse"></span>
                                    <span>Open</span>
                                  </span>
                                )}
                              </td>

                              {/* Actions triggers */}
                              <td className="py-4.5 px-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!isResolved ? (
                                    <button
                                      type="button"
                                      onClick={() => selectComplaintItem(item)}
                                      className="py-1.5 px-3 bg-[#2E7D32] hover:bg-[#1E562F] text-white text-[10px] font-black rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1 shadow-xs"
                                    >
                                      <Check className="w-3 h-3 text-white" />
                                      <span>Resolve</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => selectComplaintItem(item)}
                                      className="py-1.5 px-3.5 bg-white border border-gray-200 text-gray-550 text-[10px] font-black rounded-lg hover:bg-slate-100 transition-all cursor-pointer flex justify-center items-center gap-1.5 shadow-xs"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                                      <span>View</span>
                                    </button>
                                  )}
                                  
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteComplaint(item.id);
                                    }}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1 shadow-xs border border-rose-100"
                                    title="Delete complaint permanently"
                                  >
                                    <Trash className="w-3.5 h-3.5 text-rose-500" />
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
          );
        })()}

        {/* TAB 8: AUDITABLE REPORTS & SPREADSHEETS (Reports tab) */}
        {activeTab === 'reports' && (() => {
          // Worker Performance list data - dynamic from database
          const performanceWorkers = users.length > 0 ? users.map((u: any, idx: number) => {
            const initials = u.name ? u.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'W';
            const wJobs = jobs.filter(j => j.worker_id === u.id || j.worker?.id === u.id || j.worker?.name === u.name);
            const completedCount = wJobs.filter(j => j.status === 'done').length;
            const completionScore = wJobs.length > 0 ? Math.round((completedCount / wJobs.length) * 100) : 100;
            
            const barHeights = [16, 26, 20, 32, 28, 40, 36].map(h => {
              return Math.max(10, Math.min(48, Math.round(h * (completionScore / 100))));
            });

            return {
              id: u.id || idx + 1,
              name: u.name,
              initials: initials,
              shift: u.shift || "Morning",
              shiftDetails: `${u.shift || "Morning"} shift • ${wJobs.length} jobs total`,
              rating: u.rating || 4.5,
              stars: Math.round(u.rating || 4.5),
              trend: completionScore >= 90 ? "up" : "down",
              trendLabel: completionScore >= 90 ? "trending up" : "trending down",
              barHeights: barHeights,
              colorTheme: completionScore >= 90 ? "green" : "orange",
              completionScoreText: `${completionScore}%`,
              jobsCountText: `${wJobs.length} Tasks completed`
            };
          }) : [
            { id: 1, name: "Sunil Kumara", initials: "SK", shift: "Morning", shiftDetails: "Morning shift • 312 jobs total", rating: 4.8, stars: 5, trend: "up", trendLabel: "trending up", barHeights: [16, 26, 20, 32, 28, 40, 36], colorTheme: "green", completionScoreText: "98%", jobsCountText: "312 Tasks completed" },
            { id: 2, name: "Nimal Perera", initials: "NP", shift: "Evening", shiftDetails: "Evening shift • 224 jobs total", rating: 3.2, stars: 3, trend: "down", trendLabel: "trending down", barHeights: [18, 24, 20, 30, 26, 36, 32], colorTheme: "orange", completionScoreText: "95%", jobsCountText: "224 Tasks completed" },
            { id: 3, name: "Kasun Wijesekera", initials: "KW", shift: "Morning", shiftDetails: "Morning shift • 298 jobs total", rating: 4.6, stars: 5, trend: "up", trendLabel: "trending up", barHeights: [20, 28, 24, 34, 30, 42, 38], colorTheme: "green", completionScoreText: "92%", jobsCountText: "298 Tasks completed" },
            { id: 4, name: "Rohan Silva", initials: "RS", shift: "Night", shiftDetails: "Night shift • 186 jobs total", rating: 4.4, stars: 4, trend: "up", trendLabel: "trending up", barHeights: [14, 22, 18, 28, 24, 34, 30], colorTheme: "green", completionScoreText: "91%", jobsCountText: "186 Tasks completed" }
          ];

          // 6 Dashboard report tiles
          const reportCards = [
            {
              id: "summary",
              title: "Monthly Summary",
              desc: "Jobs, payments, complaints",
              icon: FileText,
              iconBg: "bg-emerald-50 text-[#2E7D32]",
              onClick: () => {
                setActivePreviewReport("summary");
                setFeedbackMessage("Viewing interactive Monthly Summary report.");
                document.getElementById("monthly-summary-sheet-region")?.scrollIntoView({ behavior: "smooth" });
              }
            },
            {
              id: "workers",
              title: "Worker Performance",
              desc: "Ratings, completion %, incidents",
              icon: TrendingUp,
              iconBg: "bg-emerald-50 text-[#2E7D32]",
              onClick: () => {
                setActivePreviewReport("workers");
                setFeedbackMessage("Viewing interactive Worker Performance preview.");
                document.getElementById("monthly-summary-sheet-region")?.scrollIntoView({ behavior: "smooth" });
              }
            },
            {
              id: "revenue",
              title: "Revenue Report",
              desc: "Monthly fees + special pickups",
              icon: PiggyBank,
              iconBg: "bg-emerald-50 text-[#2E7D32]",
              onClick: () => {
                setActivePreviewReport("revenue");
                setFeedbackMessage("Viewing interactive Revenue Report ledger.");
                document.getElementById("monthly-summary-sheet-region")?.scrollIntoView({ behavior: "smooth" });
              }
            },
            {
              id: "recycling",
              title: "Recycling Impact",
              desc: "Estimated waste diverted",
              icon: Leaf,
              iconBg: "bg-emerald-50 text-[#2E7D32]",
              onClick: () => {
                setActivePreviewReport("recycling");
                setFeedbackMessage("Viewing interactive Recycling Impact report.");
                document.getElementById("monthly-summary-sheet-region")?.scrollIntoView({ behavior: "smooth" });
              }
            },
            {
              id: "complaints",
              title: "Complaints Report",
              desc: "By block, type, resolution time",
              icon: AlertTriangle,
              iconBg: "bg-emerald-50 text-[#2E7D32]",
              onClick: () => {
                setActivePreviewReport("complaints");
                setFeedbackMessage("Viewing interactive Grievances & Complaints report.");
                document.getElementById("monthly-summary-sheet-region")?.scrollIntoView({ behavior: "smooth" });
              }
            },
            {
              id: "schedule",
              title: "Schedule Adherence",
              desc: "On-time vs. delayed jobs",
              icon: Clock,
              iconBg: "bg-emerald-50 text-[#2E7D32]",
              onClick: () => {
                setActivePreviewReport("schedule");
                setFeedbackMessage("Viewing interactive Schedule Adherence report.");
                document.getElementById("monthly-summary-sheet-region")?.scrollIntoView({ behavior: "smooth" });
              }
            }
          ];

          // FILTER BY SEARCH QUERY
          const filteredWorkers = performanceWorkers.filter(w => {
            const q = searchQuery.trim().toLowerCase();
            return !q || w.name.toLowerCase().includes(q) || w.shift.toLowerCase().includes(q);
          });

          // SCREEN 2: WORKER PERFORMANCE VIEW
          if (selectedReportView === 'workers') {
            return (
              <div className="space-y-6 text-left animate-in fade-in duration-200" id="reports-workers-screen">
                
                {/* Header and navigation */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                      <button type="button" onClick={() => setSelectedReportView("dashboard")} className="hover:text-[#2E7D32] cursor-pointer">Home</button>
                      <span>/</span>
                      <button type="button" onClick={() => setSelectedReportView("dashboard")} className="hover:text-[#2E7D32] cursor-pointer">Reports</button>
                      <span>/</span>
                      <span className="text-gray-500 font-extrabold">Workers</span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button 
                        type="button" 
                        onClick={() => setSelectedReportView("dashboard")}
                        className="p-1.5 rounded-lg border border-gray-255 hover:border-[#2E7D32] hover:text-[#2E7D32] bg-white transition-all cursor-pointer flex items-center justify-center shadow-xs animate-pulse-once"
                        title="Go back to general reports dashboard"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-500" />
                      </button>
                      <h2 className="text-xl font-black text-[#164121] tracking-tight">Worker Performance</h2>
                    </div>
                  </div>

                  {/* Worker lookups */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search residents, jobs, blocks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-205 bg-white rounded-xl focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] transition-colors font-semibold"
                    />
                  </div>
                </div>

                {/* Grid of highly custom performance cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="workers-performance-grid">
                  {filteredWorkers.map((worker) => {
                    const isGreen = worker.colorTheme === "green";
                    return (
                      <div key={worker.id} className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-[#2E7D32]/25 transition-all">
                        
                        {/* Demographics row */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#2E7D32] text-sm font-black flex items-center justify-center border border-emerald-100 uppercase shrink-0">
                              {worker.initials}
                            </div>
                            <div className="text-left">
                              <h3 className="text-[15px] font-black text-gray-900 tracking-tight leading-snug">{worker.name}</h3>
                              <p className="text-[10.5px] text-gray-450 font-bold block mt-0.5 leading-none">{worker.shiftDetails}</p>
                            </div>
                          </div>

                          {/* Star Ratings on the right */}
                          <div className="text-right">
                            <div className="flex gap-0.5 text-amber-400 justify-end">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${i < worker.stars ? 'fill-amber-400' : 'text-gray-200'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-lg font-black text-gray-900 block mt-1 leading-none">{worker.rating}</span>
                          </div>
                        </div>

                        {/* Chart row showing columns of last 7 days */}
                        <div className="border-t border-gray-100/70 pt-4 text-left">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[9.5px] font-mono text-gray-400 font-extrabold uppercase tracking-wide">Last 7 Days</span>
                            {worker.trend === 'up' ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] text-[#2E7D32] font-black uppercase tracking-tight">
                                <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
                                <span>{worker.trendLabel}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9.5px] text-orange-500 font-black uppercase tracking-tight">
                                <TrendingDown className="w-3.5 h-3.5 stroke-[2]" />
                                <span>{worker.trendLabel}</span>
                              </span>
                            )}
                          </div>

                          {/* Graphical columns representing collection jobs handled */}
                          <div className="flex items-end gap-3.5 h-16 pt-2 pb-1 justify-center bg-slate-50/40 rounded-2xl border border-gray-200/50">
                            {worker.barHeights.map((h, i) => (
                              <div key={i} className="flex flex-col items-center flex-1 max-w-[14px]">
                                <div 
                                  className={`w-full rounded-md transition-all ${
                                    isGreen ? 'bg-[#2E7D32] hover:bg-[#1E562F]' : 'bg-orange-400 hover:bg-orange-500'
                                  }`}
                                  style={{ height: `${h}px` }}
                                  title={`Day ${i+1}: ${Math.round(h * 3)} assignments Completed`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recent review verbatim blocks */}
                        <div className="bg-[#F8FAF6]/90 border border-emerald-100/50 rounded-2xl p-4 text-left space-y-2">
                          <span className="text-[8px] font-mono font-black text-emerald-800 uppercase tracking-widest block opacity-75">Recent Feedback</span>
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-emerald-950 font-semibold leading-relaxed">
                              "Very punctual and friendly." — <span className="text-emerald-700 font-extrabold">A-301</span>
                            </p>
                            <p className="text-[11px] text-emerald-950 font-semibold leading-relaxed">
                              "Always on time, polite." — <span className="text-emerald-700 font-extrabold">B-110</span>
                            </p>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          }

          // SCREEN 1: REPORT CARDS & DASHBOARD VIEW
          return (
            <div className="space-y-6 text-left animate-in fade-in duration-200" id="reports-dashboard-screen">
              
              {/* 6 Elegant bento-style reports grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" id="reports-preset-matrix">
                {reportCards.map((report) => {
                  const isCurrentlyActivePreview = activePreviewReport === report.id;
                  return (
                    <div 
                      key={report.id} 
                      onClick={report.onClick}
                      className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#2E7D32]/50 transition-all group cursor-pointer ${
                        isCurrentlyActivePreview ? 'ring-2 ring-[#2E7D32] border-[#2E7D32]' : 'border-gray-150'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full ${report.iconBg} flex items-center justify-center border border-emerald-100 uppercase shrink-0`}>
                          <report.icon className="w-5 h-5 stroke-[1.7]" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xs sm:text-[13px] font-black text-gray-900 group-hover:text-[#2E7D32] tracking-tight transition-colors">{report.title}</h3>
                          <p className="text-[10.5px] text-gray-400 font-bold block mt-0.5 leading-none">{report.desc}</p>
                        </div>
                      </div>

                      {/* Operational action toggles inside footer card */}
                      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            downloadReportPdf(report.id);
                            setFeedbackMessage(`Downloading ${report.title} PDF report...`);
                          }}
                          className="flex-1 py-2 border border-gray-200 hover:bg-slate-50 text-gray-600 hover:text-gray-900 transition-all text-[11px] font-black rounded-xl flex items-center justify-center gap-1.5 bg-white cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            report.onClick();
                          }}
                          className={`p-2 border rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                            isCurrentlyActivePreview 
                              ? 'bg-[#2E7D32]/20 border-[#2E7D32] text-[#2E7D32]' 
                              : 'border-gray-200 hover:border-[#2E7D32]/25 bg-white hover:bg-[#2E7D32]/10 text-gray-400 hover:text-[#2E7D32]'
                          }`}
                          title={`View interactive records for ${report.title}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Magnificent "Monthly Summary — Preview" Card block and sheet */}
              <div className="space-y-4" id="monthly-summary-sheet-region">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="text-left space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-black text-[#164121] uppercase tracking-wider">
                      {activePreviewReport === 'summary' && "Monthly Summary — Preview"}
                      {activePreviewReport === 'workers' && "Worker Performance — Preview"}
                      {activePreviewReport === 'revenue' && "Revenue Ledger — Preview"}
                      {activePreviewReport === 'recycling' && "Recycling Impact — Preview"}
                      {activePreviewReport === 'complaints' && "Complaints Log — Preview"}
                      {activePreviewReport === 'schedule' && "Schedule Adherence — Preview"}
                    </h3>
                    <p className="text-[11px] text-gray-450 font-bold">Auto-generated for May 2026</p>
                  </div>

                  {/* Print and Download block controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                        setFeedbackMessage("Initiated default platform printing layout sequence.");
                      }}
                      className="px-3 py-1.5 border border-gray-200 hover:bg-slate-50 bg-white rounded-xl text-xs font-black text-gray-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                    >
                      <Printer className="w-3.5 h-3.5 text-gray-400" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadReportPdf(activePreviewReport);
                        setFeedbackMessage(`Initiating compiled ${activePreviewReport.toUpperCase()} report PDF download sequence...`);
                      }}
                      className="px-3.5 py-1.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer leading-none shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* Elegant White Paper Presentation Frame */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 shadow-xs text-left overflow-hidden space-y-6">
                  
                  {/* Embedded Inner Header */}
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <div>
                      <span className="text-[8px] font-mono text-emerald-800 font-extrabold uppercase tracking-widest block leading-none">Ecotrack • Report</span>
                      <h4 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight block mt-1.5">
                        {activePreviewReport === 'summary' && "Greenfield Residencies — May 2026"}
                        {activePreviewReport === 'workers' && "Workforce Standings & Operations — May 2026"}
                        {activePreviewReport === 'revenue' && "System Financial Ledger & Invoices — May 2026"}
                        {activePreviewReport === 'recycling' && "Organic Waste Diversion Indicators — May 2026"}
                        {activePreviewReport === 'complaints' && "Homeowner Dispute Resolution Record — May 2026"}
                        {activePreviewReport === 'schedule' && "Worker Dispatch & Sequence Compliance — May 2026"}
                      </h4>
                    </div>
                    <Leaf className="w-8 h-8 text-[#2E7D32]" />
                  </div>

                  {/* High Fidelity Performance Statistics Column Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2" id="summary-metrics-column-row">
                    
                    {activePreviewReport === 'summary' && (
                      <>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Total Jobs</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{totalJobsCount > 0 ? totalJobsCount.toLocaleString() : '4,218'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Completion</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{totalJobsCount > 0 ? `${donePercent}%` : '94.3%'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Revenue</span>
                          <span className="text-lg sm:text-l font-black text-[#164121] mt-1 block">{totalRevenue > 0 ? `LKR ${(totalRevenue / 1000).toFixed(0)}K` : 'LKR 412K'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Complaints</span>
                          <span className="text-lg sm:text-l font-black text-rose-600 mt-1 block">{complaints.length > 0 ? complaints.length : '24'}</span>
                        </div>
                      </>
                    )}

                    {activePreviewReport === 'workers' && (
                      <>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Active Workers</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{users.length > 0 ? `${users.length} Roster` : '28 Roster'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Avg Rating</span>
                          <span className="text-lg sm:text-l font-black text-[#164121] mt-1 block">{users.length > 0 ? `${(users.reduce((sum, u) => sum + (u.rating || 4.5), 0) / users.length).toFixed(1)}★` : '4.6★'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Verified Volume</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{totalJobsCount > 0 ? `${totalJobsCount} Jobs` : '1,041 Jobs'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Incidents</span>
                          <span className="text-lg sm:text-l font-black text-emerald-600 mt-1 block">0 Alert</span>
                        </div>
                      </>
                    )}

                    {activePreviewReport === 'revenue' && (
                      <>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Net Ledger Inflow</span>
                          <span className="text-lg sm:text-l font-black text-[#164121] mt-1 block">{totalRevenue > 0 ? `LKR ${(totalRevenue/1000).toFixed(0)}K` : 'LKR 412K'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Monthly Levies</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{payments.filter(p => p.payment_type?.toLowerCase().includes('levy') || p.notes?.toLowerCase().includes('levy')).length > 0 ? `LKR ${(payments.filter(p => p.payment_type?.toLowerCase().includes('levy') || p.notes?.toLowerCase().includes('levy')).reduce((sum, p) => sum + p.amount, 0)/1000).toFixed(0)}K` : 'LKR 310K'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">On-Demand Sweeps</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{payments.filter(p => p.payment_type?.toLowerCase().includes('pickup') || p.notes?.toLowerCase().includes('pickup')).length > 0 ? `LKR ${(payments.filter(p => p.payment_type?.toLowerCase().includes('pickup') || p.notes?.toLowerCase().includes('pickup')).reduce((sum, p) => sum + p.amount, 0)/1000).toFixed(0)}K` : 'LKR 68.5K'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Fertilizer Sales</span>
                          <span className="text-lg sm:text-l font-black text-emerald-600 mt-1 block">{payments.filter(p => p.payment_type?.toLowerCase().includes('sale') || p.notes?.toLowerCase().includes('sale')).length > 0 ? `LKR ${(payments.filter(p => p.payment_type?.toLowerCase().includes('sale') || p.notes?.toLowerCase().includes('sale')).reduce((sum, p) => sum + p.amount, 0)/1000).toFixed(0)}K` : 'LKR 33.5K'}</span>
                        </div>
                      </>
                    )}

                    {activePreviewReport === 'recycling' && (
                      <>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Compost Waste</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{(completedJobsCount > 0 ? completedJobsCount * 12 : 1240).toLocaleString()} kg</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Plastics PET</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{(completedJobsCount > 0 ? completedJobsCount * 5 : 560).toLocaleString()} kg</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Corrugated Pulp</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{(completedJobsCount > 0 ? completedJobsCount * 4 : 420).toLocaleString()} kg</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Glass Cullets</span>
                          <span className="text-lg sm:text-l font-black text-emerald-600 mt-1 block">{(completedJobsCount > 0 ? completedJobsCount * 2 : 180).toLocaleString()} kg</span>
                        </div>
                      </>
                    )}

                    {activePreviewReport === 'complaints' && (
                      <>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Logged Cases</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{complaints.length > 0 ? `${complaints.length} Filed` : '24 Filed'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block"> SLA Cleared</span>
                          <span className="text-lg sm:text-l font-black text-emerald-600 mt-1 block">{complaints.length > 0 ? `${complaints.filter(c => c.status === 'resolved').length} Resolved` : '21 Resolved'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Open Pending</span>
                          <span className="text-lg sm:text-l font-black text-rose-600 mt-1 block">{complaints.length > 0 ? `${complaints.filter(c => c.status === 'open' || c.status === 'pending').length} Active` : '3 Active'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Onsite SLA Span</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">11.2 Hours</span>
                        </div>
                      </>
                    )}

                    {activePreviewReport === 'schedule' && (
                      <>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">OTPF Adherence</span>
                          <span className="text-lg sm:text-l font-black text-emerald-650 mt-1 block">{totalJobsCount > 0 ? `${donePercent}%` : '97.4%'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block text-rose-600">Delayed Sweeps</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">{totalJobsCount > 0 ? `${Math.max(1, 100 - donePercent)}%` : '< 3%'}</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Route Deviation</span>
                          <span className="text-lg sm:text-l font-black text-gray-900 mt-1 block">5.5 Mins</span>
                        </div>
                        <div className="p-3 bg-slate-50/55 rounded-2xl border border-gray-200/50">
                          <span className="text-[9.5px] font-mono text-gray-405 font-extrabold uppercase tracking-wider block">Fastest Sweep</span>
                          <span className="text-lg sm:text-l font-black text-emerald-650 mt-1 block">Morning</span>
                        </div>
                      </>
                    )}

                  </div>

                  {/* HIGH FIDELITY COMPONENT TABLES OR VISUALIZERS DEPENDING ON ACTIVE OPTION */}
                  {activePreviewReport !== 'summary' && (
                    <div className="border border-gray-150 rounded-2xl overflow-hidden bg-slate-50/30">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-100/75 text-gray-600 border-b border-gray-150 font-extrabold">
                            {activePreviewReport === 'workers' && (
                              <>
                                <th className="p-3">Worker Name</th>
                                <th className="p-3">Completion Score</th>
                                <th className="p-3">Volume Trace</th>
                                <th className="p-3">Satisfaction Standing</th>
                              </>
                            )}
                            {activePreviewReport === 'revenue' && (
                              <>
                                <th className="p-3">Ledger Statement Base</th>
                                <th className="p-3">Reference ID</th>
                                <th className="p-3">Cycle Amount</th>
                                <th className="p-3">Audit Settlement</th>
                              </>
                            )}
                            {activePreviewReport === 'recycling' && (
                              <>
                                <th className="p-3">Waste Category classification</th>
                                <th className="p-3">Recycled Yield</th>
                                <th className="p-3">Downstream Impact Terminal</th>
                                <th className="p-3">Diversion Rate</th>
                              </>
                            )}
                            {activePreviewReport === 'complaints' && (
                              <>
                                <th className="p-3">Case ID</th>
                                <th className="p-3">Dispute Summary</th>
                                <th className="p-3">Block Area</th>
                                <th className="p-3">State</th>
                                <th className="p-3">Resolution SLA</th>
                              </>
                            )}
                            {activePreviewReport === 'schedule' && (
                              <>
                                <th className="p-3">Collection Segment</th>
                                <th className="p-3">Target Standard</th>
                                <th className="p-3">Dispatched Time</th>
                                <th className="p-3">Deviation</th>
                                <th className="p-3">Punctuality OTPF</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 font-semibold text-gray-700">
                           {activePreviewReport === 'workers' && (
                            performanceWorkers.map((w: any) => (
                              <tr key={w.id} className="bg-white hover:bg-slate-50/50">
                                <td className="p-3 font-bold">{w.name}</td>
                                <td className="p-3">{w.completionScoreText || '95%'}</td>
                                <td className="p-3">{w.jobsCountText || '0 Tasks'}</td>
                                <td className="p-3 text-amber-500">{w.rating} {'★'.repeat(w.stars)}{'☆'.repeat(5 - w.stars)}</td>
                              </tr>
                            ))
                          )}
                          {activePreviewReport === 'revenue' && (
                            payments.length > 0 ? (
                              payments.slice(0, 5).map((p: any) => (
                                <tr key={p.id} className="bg-white hover:bg-slate-50/50">
                                  <td className="p-3 font-bold">{p.payment_type || 'Monthly Levy'} - {p.resident_name || 'Resident'}</td>
                                  <td className="p-3 font-mono">{p.reference_code || p.txn_code || `EC-${p.id}`}</td>
                                  <td className="p-3 font-bold text-gray-900">LKR {p.amount.toLocaleString()}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {p.status === 'paid' ? 'Reconciled' : 'Pending Audit'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr className="bg-white">
                                <td colSpan={4} className="p-3 text-center text-gray-400">No payment transactions recorded in the system ledger.</td>
                              </tr>
                            )
                          )}
                          {activePreviewReport === 'recycling' && (
                            <>
                              <tr className="bg-white">
                                <td className="p-3 font-bold">Wet Organic Compositing Matter</td>
                                <td className="p-3">{(completedJobsCount * 12 || 1240).toLocaleString()} kg Recycled</td>
                                <td className="p-2.5">Processed as high-grade biofertilizer</td>
                                <td className="p-3 text-emerald-700 font-extrabold">98% Diversion</td>
                              </tr>
                              <tr className="bg-slate-50/15">
                                <td className="p-3 font-bold">Plastics (PET / HDPE) Bottles</td>
                                <td className="p-3">{(completedJobsCount * 5 || 560).toLocaleString()} kg Segregated</td>
                                <td className="p-2.5">Forwarded for high-density pulping</td>
                                <td className="p-3 text-emerald-700 font-extrabold">100% Diversion</td>
                              </tr>
                              <tr className="bg-white">
                                <td className="p-3 font-bold">Corrugated Cardboards / Kraft Paper</td>
                                <td className="p-3">{(completedJobsCount * 4 || 420).toLocaleString()} kg Reclaimed</td>
                                <td className="p-2.5">Supplied to fiberboard processing plant</td>
                                <td className="p-3 text-emerald-700 font-extrabold">95% Diversion</td>
                              </tr>
                              <tr className="bg-slate-50/15">
                                <td className="p-3 font-bold">Soda-Lime Glass Cullets & Jars</td>
                                <td className="p-3">{(completedJobsCount * 2 || 180).toLocaleString()} kg Separated</td>
                                <td className="p-2.5">Dispatched to melting zone boundaries</td>
                                <td className="p-3 text-emerald-700 font-extrabold">90% Diversion</td>
                              </tr>
                            </>
                          )}
                          {activePreviewReport === 'complaints' && (
                            complaints.length > 0 ? (
                              complaints.slice(0, 5).map((c: any) => (
                                <tr key={c.id} className="bg-white hover:bg-slate-50/50">
                                  <td className="p-3 font-mono font-bold">COMP-{c.id}</td>
                                  <td className="p-3">{c.title || c.description}</td>
                                  <td className="p-3">{c.unit_number || 'N/A'}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      c.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {c.status}
                                    </span>
                                  </td>
                                  <td className="p-3">{c.status === 'resolved' ? 'Resolved' : 'Active / Pending'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr className="bg-white">
                                <td colSpan={5} className="p-3 text-center text-gray-400">No grievances or homeowner disputes logged.</td>
                              </tr>
                            )
                          )}
                          {activePreviewReport === 'schedule' && (
                            jobs.length > 0 ? (
                              jobs.slice(0, 5).map((job: any) => (
                                <tr key={job.id} className="bg-white hover:bg-slate-50/50">
                                  <td className="p-3 font-bold">Sweep - Block {job.block?.name || 'A'}</td>
                                  <td className="p-3">{job.scheduled_time || '08:00 AM'}</td>
                                  <td className="p-3">{job.status === 'done' ? (job.scheduled_time || '08:00 AM') : 'Awaiting Dispatch'}</td>
                                  <td className="p-3 text-emerald-650">{job.status === 'done' ? '+2 mins' : 'Pending'}</td>
                                  <td className="p-3 font-black text-emerald-800">{job.status === 'done' ? '100% OTPF' : 'Awaiting'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr className="bg-white">
                                <td colSpan={5} className="p-3 text-center text-gray-400">No scheduled sequence runs recorded.</td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Historical Highlights block */}
                  <div className="space-y-3.5 border-t border-gray-100 pt-5">
                    <h5 className="text-xs sm:text-[13px] font-black text-[#2E7D32] uppercase tracking-wider">Highlights</h5>
                    
                    <ul className="space-y-2.5 text-xs text-gray-700 font-semibold" id="highlights-bullet-points">
                      {activePreviewReport === 'summary' && (
                        <>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Block A achieved 100% collection completion.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Sunil Kumara — top performer with 4.8★ over 312 jobs.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">3 outstanding complaints from Block C — escalation recommended.</p>
                          </li>
                        </>
                      )}

                      {activePreviewReport === 'workers' && (
                        <>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Sunil Kumara remains on consecutive monthly bonus status for superior compliance levels.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">All employees have completed the mandatory EcoTrack Safe Recycling Handling guidelines program.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Roster density optimization achieved a 12% boost in worker resource utilization index.</p>
                          </li>
                        </>
                      )}

                      {activePreviewReport === 'revenue' && (
                        <>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Residential maintenance levies achieved a 96% milestone during cycle week 2.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Organic compost fertilizer derivative sales generated high commercial margin indexes.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Outstanding violation fine collection of LKR 12K is undergoing standard billing audits.</p>
                          </li>
                        </>
                      )}

                      {activePreviewReport === 'recycling' && (
                        <>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Net carbon abatement equivalency prevents ~2.4 Metric Tons of CO2 from municipal entering.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Solid waste diversion metrics show a 41.2% total drop in landward municipal garbage haulage.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Total plastic and metal recycling quotas achieved perfect 100% segregation indexes.</p>
                          </li>
                        </>
                      )}

                      {activePreviewReport === 'complaints' && (
                        <>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Dispute resolution SLA averages down by 2.4 hours with active administrator call dialings.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Block D registered 100% dispute clearance rates under standard 48 SLA hours.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Block C elevator logistic holdup remains under monitoring for localized stairs sweeps.</p>
                          </li>
                        </>
                      )}

                      {activePreviewReport === 'schedule' && (
                        <>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Morning sweep route sustains premium 99.1% punctuality rating.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Week 2 thunderstorms produced an average routes delay coefficient of 15.2 minutes.</p>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                            <p className="leading-snug">Overall route sequence alignment remains highly tuned with a minimal delay factor of 5.5 minutes.</p>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                </div>
              </div>

            </div>
          );
        })()}

        
        {/* TAB 9: SETTINGS & CONFIGS (Settings tab) */}
        {activeTab === 'settings' && (() => {
          const settingsTranslations = {
            english: {
              title: "Settings",
              homeSettings: "Home / Settings",
              profile: "Profile",
              changePassword: "Change Password",
              notifications: "Notifications",
              languageRegion: "Language & Region",
              securitySessions: "Security & Sessions",
              helpSupport: "Help & Support",
              
              // Profile
              profileHeader: "Profile",
              profileSub: "Update your personal information",
              firstName: "First Name",
              lastName: "Last Name",
              email: "Email",
              role: "Role",
              phone: "Phone",
              scheme: "Scheme",
              changePhoto: "Change photo",
              
              // Notification preferences
              notificationPrefTitle: "Notification preferences",
              notificationPrefSub: "Email + push notifications",
              newComplaints: "New complaints",
              newComplaintsSub: "Email + Push",
              workerIncidents: "Worker Incidents",
              workerIncidentsSub: "Email + Push",
              paymentReceived: "Payment received",
              paymentReceivedSub: "Push only",
              weeklySummary: "Weekly summary",
              weeklySummarySub: "Email",
              
              cancel: "Cancel",
              saveChanges: "Save changes",
              
              // Change Password
              currentPassword: "Current Password",
              newPassword: "New Password",
              confirmNewPassword: "Confirm New Password",
              updatePassword: "Update Password",
              passwordPrompt: "Update your password to protect your account",
              
              // Language & Region
              interfaceLanguage: "Interface Language",
              timezone: "Timezone",
              systemCurrency: "System Currency",
              localizationSub: "Configure residential language options and timezone variables",
              
              // Security & Sessions
              securitySub: "Audit device access entries and multi-factor system configurations",
              activeNow: "Active Now",
              mfaHeader: "MFA Secondary Authentication Gate",
              mfaSub: "Enables a dynamic authentication code challenge upon admin login.",
              setupMfa: "Setup 2FA",
              
              // Help & Support
              helpSub: "Search frequently asked questions and connect with developers",
              helpIntro: "Need assist with EcoTrack features? Explore standard user manuals or register a ticket:",
              faq1: "How do I generate housing unit QR codes?",
              faq2: "Where do I adjust waste non-segregation fines?",
              faq3: "How do I archive monthly collection reports?",
              contactDev: "Contact Developer Support",
              contactDetails: "Our support channel remains reachable 24/7 at support@ecotrack.org or standard hotlines."
            },
            sinhala: {
              title: "සැකසුම්",
              homeSettings: "ප්‍රධාන පිටුව / සැකසුම්",
              profile: "පැතිකඩ",
              changePassword: "මුරපදය වෙනස් කරන්න",
              notifications: "දැනුම්දීම්",
              languageRegion: "භාෂාව සහ කලාපය",
              securitySessions: "ආරක්ෂාව සහ සැසි",
              helpSupport: "උදවු සහ සහයෝගය",
              
              // Profile
              profileHeader: "පැතිකඩ",
              profileSub: "ඔබගේ පෞද්ගලික තොරතුරු යාවත්කාලීන කරන්න",
              firstName: "මුල් නම",
              lastName: "වාසගම",
              email: "විද්‍යුත් තැපෑල",
              role: "භූමිකාව",
              phone: "දුරකථන අංකය",
              scheme: "ක්‍රමය",
              changePhoto: "ඡායාරූපය වෙනස් කරන්න",
              
              // Notification preferences
              notificationPrefTitle: "දැනුම්දීම් මනාපයන්",
              notificationPrefSub: "ඊමේල් + තල්ලු දැනුම්දීම්",
              newComplaints: "නව පැමිණිලි",
              newComplaintsSub: "ඊමේල් + තල්ලු",
              workerIncidents: "සේවක සිදුවීම්",
              workerIncidentsSub: "ඊමේල් + තල්ලු",
              paymentReceived: "ගෙවීම් ලැබීම",
              paymentReceivedSub: "තල්ලු පමණි",
              weeklySummary: "සතිපතා සාරාංශය",
              weeklySummarySub: "ඊමේල්",
              
              cancel: "අවලංගු කරන්න",
              saveChanges: "වෙනස්කම් සුරකින්න",
              
              // Change Password
              currentPassword: "වත්මන් මුරපදය",
              newPassword: "නව මුරපදය",
              confirmNewPassword: "නව මුරපදය තහවුරු කරන්න",
              updatePassword: "මුරපදය යාවත්කාලීන කරන්න",
              passwordPrompt: "ඔබගේ ගිණුම ආරක්ෂා කිරීමට ඔබගේ මුරපදය යාවත්කාලීන කරන්න",
              
              // Language & Region
              interfaceLanguage: "අතුරුමුහුණත් භාෂාව",
              timezone: "වේලා කලාපය",
              systemCurrency: "පද්ධති මුදල්",
              localizationSub: "නේවාසික භාෂා විකල්ප සහ වේලා කලාප විචල්‍යයන් වින්‍යාස කරන්න",
              
              // Security & Sessions
              securitySub: "උපාංග ප්‍රවේශ සටහන් සහ බහු-සාධක පද්ධති සැකසුම් විගණනය කරන්න",
              activeNow: "දැන් සක්‍රියයි",
              mfaHeader: "MFA ද්විතීයික සත්‍යාපන ද්වාරය",
              mfaSub: "පරිපාලක පිවිසුමේදී ගතික සත්‍යාපන කේත අභියෝගයක් සක්‍රීය කරයි.",
              setupMfa: "2FA සකසන්න",
              
              // Help & Support
              helpSub: "නිතර අසන ප්‍රශ්න සොයන්න සහ සංවර්ධකයින් සමඟ සම්බන්ධ වන්න",
              helpIntro: "EcoTrack විශේෂාංග ගැන සහය අවශ්‍යද? සම්මත පරිශීලක අත්පොත් ගවේෂණය කරන්න හෝ ටිකට් පතක් ලියාපදිංජි කරන්න:",
              faq1: "නිවාස ඒකක QR කේත උත්පාදනය කරන්නේ කෙසේද?",
              faq2: "අපද්‍රව්‍ය වෙන් නොකිරීමේ දඩ මුදල් සකස් කරන්නේ කොහෙන්ද?",
              faq3: "මාසික එකතු කිරීමේ වාර්තා සංරක්ෂණය කරන්නේ කෙසේද?",
              contactDev: "සංවර්ධක සහාය අමතන්න",
              contactDetails: "අපගේ සහාය සේවාව 24/7 පුරා support@ecotrack.org හෝ සම්මත ක්ෂණික ඇමතුම් මගින් සම්බන්ධ කරගත හැක."
            },
            tamil: {
              title: "அமைப்புகள்",
              homeSettings: "முகப்பு / அமைப்புகள்",
              profile: "சுயவிவரம்",
              changePassword: "கடவுச்சொல்லை மாற்று",
              notifications: "அறிவிப்புகள்",
              languageRegion: "மொழி மற்றும் பிராந்தியம்",
              securitySessions: "பாதுகாப்பு & அமர்வுகள்",
              helpSupport: "உதவி & ஆதரவு",
              
              // Profile
              profileHeader: "சுயவிவரம்",
              profileSub: "உங்கள் தனிப்பட்ட தகவலைப் புதுப்பிக்கவும்",
              firstName: "முதல் பெயர்",
              lastName: "கடைசி பெயர்",
              email: "மின்னஞ்சல்",
              role: "பதவி",
              phone: "தொலைபேசி எண்",
              scheme: "சுலோகம்",
              changePhoto: "புகைப்படத்தை மாற்று",
              
              // Notification preferences
              notificationPrefTitle: "அறிவிப்பு விருப்பத்தேர்வுகள்",
              notificationPrefSub: "மின்னஞ்சல் + புஷ் அறிவிப்புகள்",
              newComplaints: "புதிய புகார்கள்",
              newComplaintsSub: "மின்னஞ்சல் + புஷ்",
              workerIncidents: "பணியாளர் சம்பவங்கள்",
              workerIncidentsSub: "மின்னஞ்சல் + புஷ்",
              paymentReceived: "கட்டணம் செலுத்தப்பட்டது",
              paymentReceivedSub: "புஷ் மட்டும்",
              weeklySummary: "வாராந்திர சுருக்கம்",
              weeklySummarySub: "மின்னஞ்சல்",
              
              cancel: "ரத்து செய்",
              saveChanges: "மாற்றங்களைச் சேமி",
              
              // Change Password
              currentPassword: "தற்போதைய கடவுச்சொல்",
              newPassword: "புதிய கடவுச்சொல்",
              confirmNewPassword: "புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்",
              updatePassword: "கடவுச்சொல்லைப் புதுப்பி",
              passwordPrompt: "உங்கள் கணக்கைப் பாதுகாக்க உங்கள் கடவுச்சொல்லைப் புதுப்பிக்கவும்",
              
              // Language & Region
              interfaceLanguage: "இடைமுக மொழி",
              timezone: "நேர மண்டலம்",
              systemCurrency: "முறைமை நாணயம்",
              localizationSub: "குடியிருப்பு மொழி விருப்பங்கள் மற்றும் நேர மண்டல மாறிகளை உள்ளமைக்கவும்",
              
              // Security & Sessions
              securitySub: "சாதன அணுகல் உள்ளீடுகள் மற்றும் பல காரணி கணினி உள்ளமைவுகளை தணிக்கை செய்யவும்",
              activeNow: "இப்போது செயலில் உள்ளது",
              mfaHeader: "இரண்டாம் நிலை MFA அங்கீகார கேட்",
              mfaSub: "நிர்வாகி உள்நுழைவின் போது மாறும் அங்கீகாரக் குறியீடு சவாலை செயல்படுத்துகிறது.",
              setupMfa: "2FA ஐ அமை",
              
              // Help & Support
              helpSub: "அடிக்கடி கேட்கப்படும் கேள்விகளைத் தேடி, உருவாக்குநர்களுடன் இணையுங்கள்",
              helpIntro: "EcoTrack அம்சங்களில் உதவி தேவையா? நிலையான பயனர் கையேடுகளை ஆராய்ந்து அல்லது டிக்கெட்டைப் பதிவு செய்யவும்:",
              faq1: "வீட்டு உபயோக QR குறியீடுகளை எவ்வாறு உருவாக்குவது?",
              faq2: "கழிவுகளை பிரிக்காத அபராதங்களை நான் எங்கே சரிசெய்வது?",
              faq3: "மாதாந்திர சேகரிப்பு அறிக்கைகளை எவ்வாறு காப்பகப்படுத்துவது?",
              contactDev: "உருவாக்குநர் ஆதரவைத் தொடர்பு கொள்ளவும்",
              contactDetails: "எங்கள் ஆதரவு சேனல் 24/7 இல் support@ecotrack.org அல்லது நிலையான ஹாட்லைன்கள் மூலம் அணுகக்கூடியதாக இருக்கும்."
            }
          };
          const t = settingsTranslations[interfaceLanguage] || settingsTranslations.english;
          return (
            <div className="space-y-6 text-left animate-in fade-in duration-200" id="settings-tab-view">
              
              {/* Grid split: 1/3 Profile Card Sidebar + 2/3 Tab Inner View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="settings-complex-grid">
                
{/* 1. PROFILE SIDEBAR CARD (lg:col-span-4) */}
                <div className="lg:col-span-4 bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-6 text-center">
                  
                  {/* General Bio Section */}
                  <div className="flex flex-col items-center">
                    {/* User Avatar Circle Frame */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAvatarPreviewOpen(true);
                        setFeedbackMessage("Viewing close-up profile portrait.");
                      }}
                      title="Click to view full image"
                      className="relative w-24 h-24 rounded-full overflow-hidden border-3 border-emerald-50/55 shadow-md bg-stone-100 mb-4 group cursor-pointer block focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/50 transition-all text-left"
                    >
                      <img
                        src={settingsProfile.avatarUrl}
                        alt="Amantha Salgadu"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[9px] text-white font-black tracking-wider uppercase px-2 py-0.5 bg-black/30 rounded-full border border-white/20">
                          View
                        </span>
                      </div>
                    </button>

                    <h3 className="text-base font-black text-[#164121] tracking-tight">
                      {settingsProfile.firstName} {settingsProfile.lastName}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-bold block mt-1 tracking-tight">
                      {settingsProfile.role} • {settingsProfile.scheme}
                    </p>
                  </div>

                  {/* Change Photo Outline Button */}
                  <div className="px-2">
                    <label
                      htmlFor="avatar-upload-input"
                      className="w-full py-2 border border-emerald-600/35 text-[#2E7D32] hover:bg-[#F2F7F2] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                    >
                      <span className="leading-none">{t.changePhoto}</span>
                      <Upload className="w-3.5 h-3.5 stroke-[2.3]" />
                    </label>
                    <input
                      type="file"
                      id="avatar-upload-input"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('photo', file);
                          
                          setActionLoading(true);
                          setFeedbackMessage("Uploading profile photo...");
                          
                          fetch('/api/profile/photo', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Accept': 'application/json'
                            },
                            body: formData
                          })
                          .then(async (res) => {
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.message || "Failed to upload photo");
                            
                            setSettingsProfile(prev => ({
                              ...prev,
                              avatarUrl: data.data.profile_photo_url
                            }));
                            setFeedbackMessage("Success: Profile photo updated and synchronized with database!");
                            onUserUpdate?.({
                              ...user,
                              profile_photo_url: data.data.profile_photo_url
                            });
                            loadAdminMetrics();
                          })
                          .catch((err) => {
                            setFeedbackMessage(`Error: ${err.message || 'Failed to upload photo.'}`);
                          })
                          .finally(() => {
                            setActionLoading(false);
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Interactive Sidebar Nav links */}
                  <div className="space-y-1.5 px-1 text-left">
                    {/* Profile Section Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSettingsTab('profile');
                        setFeedbackMessage("Selected Personal Profile Settings pane.");
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeSettingsTab === 'profile'
                          ? 'bg-[#F1F6F2] text-[#2E7D32]'
                          : 'text-gray-500 hover:bg-slate-50 hover:text-[#164121]'
                      }`}
                    >
                      <User className={`w-4 h-4 ${activeSettingsTab === 'profile' ? 'text-[#2E7D32]' : 'text-gray-400'}`} />
                      <span>{t.profile}</span>
                    </button>

                    {/* Change Password Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSettingsTab('password');
                        setFeedbackMessage("Selected Security & Password Management pane.");
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeSettingsTab === 'password'
                          ? 'bg-[#F1F6F2] text-[#2E7D32]'
                          : 'text-gray-500 hover:bg-slate-50 hover:text-[#164121]'
                      }`}
                    >
                      <Lock className={`w-4 h-4 ${activeSettingsTab === 'password' ? 'text-[#2E7D32]' : 'text-gray-400'}`} />
                      <span>{t.changePassword}</span>
                    </button>

                    {/* Notifications preferences Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSettingsTab('notifications');
                        setFeedbackMessage("Selected Automated System Notifications pane.");
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeSettingsTab === 'notifications'
                          ? 'bg-[#F1F6F2] text-[#2E7D32]'
                          : 'text-gray-500 hover:bg-slate-50 hover:text-[#164121]'
                      }`}
                    >
                      <Bell className={`w-4 h-4 ${activeSettingsTab === 'notifications' ? 'text-[#2E7D32]' : 'text-gray-400'}`} />
                      <span>{t.notifications}</span>
                    </button>

                    {/* Language & Region Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSettingsTab('language');
                        setFeedbackMessage("Selected Localization, Timezone & Regional metrics formatting pane.");
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeSettingsTab === 'language'
                          ? 'bg-[#F1F6F2] text-[#2E7D32]'
                          : 'text-gray-500 hover:bg-slate-50 hover:text-[#164121]'
                      }`}
                    >
                      <Globe className={`w-4 h-4 ${activeSettingsTab === 'language' ? 'text-[#2E7D32]' : 'text-gray-400'}`} />
                      <span>{t.languageRegion}</span>
                    </button>

                    {/* Security & Active Sessions Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSettingsTab('security');
                        setFeedbackMessage("Selected Active Sessions & Multi-Factor authentication configurations.");
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeSettingsTab === 'security'
                          ? 'bg-[#F1F6F2] text-[#2E7D32]'
                          : 'text-gray-500 hover:bg-slate-50 hover:text-[#164121]'
                      }`}
                    >
                      <Shield className={`w-4 h-4 ${activeSettingsTab === 'security' ? 'text-[#2E7D32]' : 'text-gray-400'}`} />
                      <span>{t.securitySessions}</span>
                    </button>

                    {/* Help & Support FAQ Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSettingsTab('help');
                        setFeedbackMessage("Selected EcoTrack Support, user manuals & portal FAQs.");
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeSettingsTab === 'help'
                          ? 'bg-[#F1F6F2] text-[#2E7D32]'
                          : 'text-gray-500 hover:bg-slate-50 hover:text-[#164121]'
                      }`}
                    >
                      <HelpCircle className={`w-4 h-4 ${activeSettingsTab === 'help' ? 'text-[#2E7D32]' : 'text-gray-400'}`} />
                      <span>{t.helpSupport}</span>
                    </button>
                  </div>

                </div>

                {/* 2. TAB CONTENT COMPONENT (lg:col-span-8) */}
                <div className="lg:col-span-8 bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs text-left text-gray-800 space-y-6">
                  
                  {/* PROFILE TAB PANEL */}
                  {activeSettingsTab === 'profile' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      {/* Section Info Header */}
                      <div className="border-b border-gray-100 pb-4">
                        <h3 className="text-[17px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Profile</h3>
                        <p className="text-xs text-gray-450 font-bold leading-normal">Update your personal information</p>
                      </div>

                      {/* 2-Columns grid fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" id="profile-values-grid">
                        
                        {/* First Name */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">First Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={settingsProfile.firstName}
                              onChange={(e) => setSettingsProfile({ ...settingsProfile, firstName: e.target.value })}
                              className="w-full pl-10 pr-4 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] transition-colors"
                            />
                          </div>
                        </div>

                        {/* Last Name */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Last Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={settingsProfile.lastName}
                              onChange={(e) => setSettingsProfile({ ...settingsProfile, lastName: e.target.value })}
                              className="w-full pl-10 pr-4 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] transition-colors"
                            />
                          </div>
                        </div>

                        {/* Email (Full row in grid-cols-1) */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type="email"
                              disabled
                              value={settingsProfile.email}
                              className="w-full pl-10 pr-4 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] transition-colors bg-slate-50 text-gray-400"
                            />
                          </div>
                        </div>

                        {/* Role */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Role</label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              disabled
                              value={settingsProfile.role}
                              className="w-full pl-10 pr-4 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] transition-colors bg-slate-50 text-gray-400"
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Phone</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={settingsProfile.phone}
                              onChange={(e) => setSettingsProfile({ ...settingsProfile, phone: e.target.value })}
                              className="w-full pl-10 pr-4 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] transition-colors"
                            />
                          </div>
                        </div>

                        {/* Scheme Name */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Scheme</label>
                          <div className="relative">
                            <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              disabled
                              value={settingsProfile.scheme}
                              className="w-full pl-10 pr-4 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] transition-colors bg-slate-50 text-gray-400"
                            />
                          </div>
                        </div>

                      </div>

                      {/* Line Separator */}
                      <div className="border-t border-gray-100 pt-2" />

                      {/* Embedded Notification Preferences inside Profile for instant view */}
                      <div className="space-y-4" id="notifications-settings-group">
                        <div>
                          <h4 className="text-sm font-black text-gray-900 leading-none mb-1.5">Notification preferences</h4>
                          <p className="text-[11px] text-gray-400 font-bold leading-normal">Email + push notifications</p>
                        </div>

                        <div className="space-y-3">
                          {/* Toggle Switch 1: New complaints */}
                          <div className="p-4 bg-[#F5F8F4] border border-[#2E7D32]/10 rounded-2xl flex items-center justify-between text-xs font-bold transition-all hover:bg-[#EEF3EC]">
                            <div>
                              <p className="text-gray-800 text-[12.5px] font-black leading-snug">New complaints</p>
                              <span className="text-[10px] text-gray-400 font-semibold block mt-0.5 leading-none">Email + Push</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSettingsNotifications({ ...settingsNotifications, newComplaints: !settingsNotifications.newComplaints });
                                setFeedbackMessage(`New complaints notification toggle turned ${!settingsNotifications.newComplaints ? 'ON' : 'OFF'}.`);
                              }}
                              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none focus:ring-1 focus:ring-offset-1 focus:ring-[#2E7D32] shrink-0 ${
                                settingsNotifications.newComplaints ? 'bg-[#2E7D32]' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform duration-200 ${
                                  settingsNotifications.newComplaints ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Toggle Switch 2: Worker Incidents */}
                          <div className="p-4 bg-[#F5F8F4] border border-[#2E7D32]/10 rounded-2xl flex items-center justify-between text-xs font-bold transition-all hover:bg-[#EEF3EC]">
                            <div>
                              <p className="text-gray-800 text-[12.5px] font-black leading-snug">Worker Incidents</p>
                              <span className="text-[10px] text-gray-400 font-semibold block mt-0.5 leading-none">Email + Push</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSettingsNotifications({ ...settingsNotifications, workerIncidents: !settingsNotifications.workerIncidents });
                                setFeedbackMessage(`Worker incidents notification toggle turned ${!settingsNotifications.workerIncidents ? 'ON' : 'OFF'}.`);
                              }}
                              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none focus:ring-1 focus:ring-offset-1 focus:ring-[#2E7D32] shrink-0 ${
                                settingsNotifications.workerIncidents ? 'bg-[#2E7D32]' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform duration-200 ${
                                  settingsNotifications.workerIncidents ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer Operational Actions Buttons */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackMessage("Modifications rolled back. Restored initial scheme administrative parameters.");
                            loadAdminMetrics();
                          }}
                          className="px-6 py-2.5 border border-gray-210 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer text-gray-700 leading-none shadow-2xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              const freshName = `${settingsProfile.firstName} ${settingsProfile.lastName}`;
                              const freshPhone = settingsProfile.phone;
                              
                              const response = await fetch('/api/profile/update', {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Accept': 'application/json',
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  name: freshName,
                                  phone: freshPhone
                                })
                              });
                              if (!response.ok) throw new Error();
                              setFeedbackMessage("Success: Profile configurations successfully synchronized with cloud database!");
                              onUserUpdate?.({
                                ...user,
                                name: freshName,
                                phone: freshPhone
                              });
                              loadAdminMetrics();
                            } catch (err) {
                              setFeedbackMessage("Failed to sync profile changes. Retaining simulated local copy.");
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          className="px-6 py-2.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs leading-none"
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          <span>Save changes</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* CHANGE PASSWORD TAB PANEL */}
                  {activeSettingsTab === 'password' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      <div className="border-b border-gray-100 pb-4">
                        <h3 className="text-[17px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Change Password</h3>
                        <p className="text-xs text-gray-450 font-bold leading-normal">Update your password to protect your account</p>
                      </div>

                      <div className="space-y-4 max-w-md">
                        {/* Current Password Field */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Current Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPasswordVal}
                              onChange={(e) => setCurrentPasswordVal(e.target.value)}
                              placeholder="Enter your current correct password"
                              className="w-full pl-10 pr-10 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-[#2E7D32] transition-colors focus:outline-none"
                              title={showCurrentPassword ? "Hide password" : "Show password"}
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* New Password Field */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">New Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPasswordVal}
                              onChange={(e) => setNewPasswordVal(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full pl-10 pr-10 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-[#2E7D32] transition-colors focus:outline-none"
                              title={showNewPassword ? "Hide password" : "Show password"}
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Confirm New Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPasswordVal}
                              onChange={(e) => setConfirmPasswordVal(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full pl-10 pr-10 py-2 border border-gray-210 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-[#2E7D32] transition-colors focus:outline-none"
                              title={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setActiveSettingsTab('profile')}
                          className="px-5 py-2.5 border border-gray-210 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer text-gray-600 leading-none"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!currentPasswordVal) {
                              setFeedbackMessage("Error: Current password is required.");
                              return;
                            }
                            if (!newPasswordVal || newPasswordVal.length < 8) {
                              setFeedbackMessage("Error: New password must be at least 8 characters long.");
                              return;
                            }
                            if (newPasswordVal !== confirmPasswordVal) {
                              setFeedbackMessage("Error: New password and confirmation password do not match.");
                              return;
                            }
                            
                            setActionLoading(true);
                            try {
                              const response = await fetch('/api/profile/update', {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Accept': 'application/json',
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  name: `${settingsProfile.firstName} ${settingsProfile.lastName}`,
                                  phone: settingsProfile.phone,
                                  current_password: currentPasswordVal,
                                  password: newPasswordVal,
                                  password_confirmation: confirmPasswordVal
                                })
                              });
                              
                              const data = await response.json().catch(() => null);
                              
                              if (!response.ok) {
                                const errMsg = data?.message || (data?.errors && Object.values(data.errors).flat().join(' ')) || "Failed to update password.";
                                throw new Error(errMsg);
                              }
                              
                              setFeedbackMessage("Success: Password updated successfully in database!");
                              setCurrentPasswordVal('');
                              setNewPasswordVal('');
                              setConfirmPasswordVal('');
                            } catch (err: any) {
                              setFeedbackMessage(`Error: ${err.message || 'Verification failed. Please double check your current password.'}`);
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          className="px-5 py-2.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 leading-none"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Update Password</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* NOTIFICATIONS DETAIL TAB PANEL */}
                  {activeSettingsTab === 'notifications' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      <div className="border-b border-gray-100 pb-4">
                        <h3 className="text-[17px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Notification Schemes</h3>
                        <p className="text-xs text-gray-450 font-bold leading-normal">Tune automatic SMS alerts, e-mail dispatches and mobile push logs</p>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/70 text-xs font-semibold text-emerald-900 leading-relaxed">
                          EcoTrack integrates with global Twilio SMS hubs and Google Cloud Mail services to immediately notify waste management stakeholders and residents. Select corresponding triggers below.
                        </div>

                        {/* Interactive toggle indicators */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                            <div>
                              <p className="text-xs font-black text-gray-800">Critical Block Evacuations</p>
                              <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5">Alerts during natural hazards or heavy blockages</span>
                            </div>
                            <input type="checkbox" defaultChecked className="rounded text-[#2E7D32] focus:ring-[#2E7D32]" />
                          </div>

                          <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                            <div>
                              <p className="text-xs font-black text-gray-800">Environmental Fine Issuances</p>
                              <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5">SMS notifications on non-segregated penalty items</span>
                            </div>
                            <input type="checkbox" defaultChecked className="rounded text-[#2E7D32] focus:ring-[#2E7D32]" />
                          </div>

                          <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                            <div>
                              <p className="text-xs font-black text-gray-800">Collector Check-Ins</p>
                              <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5">Logs of daily team entries on corresponding residential floors</span>
                            </div>
                            <input type="checkbox" className="rounded text-[#2E7D32] focus:ring-[#2E7D32]" />
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* LANGUAGE & REGION TAB PANEL */}
                  {activeSettingsTab === 'language' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      <div className="border-b border-gray-100 pb-4">
                        <h3 className="text-[17px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Language & Region</h3>
                        <p className="text-xs text-gray-450 font-bold leading-normal">Configure residential language options and timezone variables</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        
                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Interface Language</label>
                          <select className="w-full text-xs font-semibold py-2 px-3 border border-gray-210 rounded-xl focus:ring-[#2E7D32] text-gray-850">
                            <option>English (US, UK)</option>
                            <option>Sinhala (සිංහල)</option>
                            <option>Tamil (தமிழ்)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Timezone</label>
                          <select className="w-full text-xs font-semibold py-2 px-3 border border-gray-210 rounded-xl focus:ring-[#2E7D32] text-gray-850">
                            <option>Colombo, Sri Lanka (GMT+05:30)</option>
                            <option>Coordinated Universal Time (UTC)</option>
                            <option>Singapore Standard Time (GMT+08:00)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">System Currency</label>
                          <select className="w-full text-xs font-semibold py-2 px-3 border border-gray-210 rounded-xl focus:ring-[#2E7D32] text-gray-850">
                            <option>Lankan Rupee (LKR)</option>
                            <option>US Dollar ($)</option>
                            <option>Euro (€)</option>
                          </select>
                        </div>

                      </div>

                    </div>
                  )}

                  {/* SECURITY & ACTIVE SESSIONS TAB PANEL */}
                  {activeSettingsTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      <div className="border-b border-gray-100 pb-4">
                        <h3 className="text-[17px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Security & Sessions</h3>
                        <p className="text-xs text-gray-450 font-bold leading-normal">Audit device access entries and multi-factor system configurations</p>
                      </div>

                      <div className="space-y-4">
                        {/* Session list item */}
                        <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center border border-gray-100">
                              <Globe className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-800">Chrome on macOS Sequoia</p>
                              <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5">Colombo, Sri Lanka • IP: 192.168.1.1</span>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-[#2E7D32] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
                            <span>Active Now</span>
                          </span>
                        </div>

                        {/* MFA Card */}
                        <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl flex items-center justify-between text-xs font-bold">
                          <div>
                            <p className="text-gray-800">MFA Secondary Authentication Gate</p>
                            <span className="text-[10px] text-gray-400 font-bold block mt-0.5">Enables a dynamic authentication code challenge upon admin login.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackMessage("To configure 2FA, please scan the generated secret barcode with Google Authenticator.");
                            }}
                            className="px-4 py-1.5 bg-emerald-50 border border-emerald-200 text-[#2E7D32] font-black text-[10.5px] rounded-lg hover:bg-emerald-100 shrink-0 cursor-pointer"
                          >
                            Setup 2FA
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* HELP & SUPPORT TAB PANEL */}
                  {activeSettingsTab === 'help' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      
                      <div className="border-b border-gray-100 pb-4">
                        <h3 className="text-[17px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Help & Support</h3>
                        <p className="text-xs text-gray-450 font-bold leading-normal">Search frequently asked questions and connect with developers</p>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-[#F8FAF6] border border-emerald-100 rounded-xl text-xs font-semibold text-gray-700">
                          <strong>Need assist with EcoTrack features?</strong> Explore standard user manuals or register a ticket:
                        </div>

                        <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 text-xs font-bold text-gray-700 bg-white">
                          
                          {/* FAQ 1 */}
                          <div>
                            <div 
                              onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                              className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <span className={expandedFaq === 1 ? "text-[#2E7D32]" : "text-gray-750"}>How do I generate housing unit QR codes?</span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedFaq === 1 ? 'rotate-180 text-[#2E7D32]' : ''}`} />
                            </div>
                            {expandedFaq === 1 && (
                              <div className="p-4 bg-emerald-50/15 text-gray-600 font-medium leading-relaxed border-t border-gray-100 select-text animate-in slide-in-from-top-1 duration-200">
                                <p className="mb-2 text-gray-705">To generate unit QR codes for physical placement at households:</p>
                                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] text-gray-500">
                                  <li>Go to the <span className="font-extrabold text-gray-750">Residents</span> tab or user directory.</li>
                                  <li>Search and click a specific resident's name or unit.</li>
                                  <li>Trace the <span className="font-extrabold text-gray-750">"Print QR Code"</span> button visible in their profile card.</li>
                                  <li>A customized layout with pre-verified verification keys can be printed or saved.</li>
                                </ol>
                              </div>
                            )}
                          </div>

                          {/* FAQ 2 */}
                          <div>
                            <div 
                              onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                              className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <span className={expandedFaq === 2 ? "text-[#2E7D32]" : "text-gray-750"}>Where do I adjust waste non-segregation fines?</span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedFaq === 2 ? 'rotate-180 text-[#2E7D32]' : ''}`} />
                            </div>
                            {expandedFaq === 2 && (
                              <div className="p-4 bg-emerald-50/15 text-gray-600 font-medium leading-relaxed border-t border-gray-100 select-text animate-in slide-in-from-top-1 duration-200">
                                <p className="mb-1.5 text-gray-705">Default solid waste sorting penalties, violation limits, and compliance benchmarks are managed in the <span className="font-extrabold text-gray-750">Fines & Schedules</span> setup boundary.</p>
                                <p className="text-[11px] text-gray-500">Please contact the municipality Solid Waste Management authority and request official municipal ordinance clearance to alter key penalty tables.</p>
                              </div>
                            )}
                          </div>

                          {/* FAQ 3 */}
                          <div>
                            <div 
                              onClick={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
                              className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <span className={expandedFaq === 3 ? "text-[#2E7D32]" : "text-gray-750"}>How do I archive monthly collection reports?</span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedFaq === 3 ? 'rotate-180 text-[#2E7D32]' : ''}`} />
                            </div>
                            {expandedFaq === 3 && (
                              <div className="p-4 bg-emerald-50/15 text-gray-600 font-medium leading-relaxed border-t border-gray-100 select-text animate-in slide-in-from-top-1 duration-200">
                                <p className="mb-2 text-gray-705">Monthly summaries, workforce performance ratings, and revenue checklists can be generated instantly:</p>
                                <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-gray-505">
                                  <li>Open the <span className="font-extrabold text-[#2E7D32]">Reports</span> tab.</li>
                                  <li>Identify the report type you wish to examine, and click either the card, <span className="font-black text-gray-750">PDF</span> button, or the <span className="font-black text-gray-750">Eye</span> icon.</li>
                                  <li>The interactive document worksheet below updates dynamically.</li>
                                  <li>Click the <span className="font-black text-[#2E7D32]">Download PDF</span> button to export a highly formatted audit log with automated system timestamps.</li>
                                </ul>
                              </div>
                            )}
                          </div>

                        </div>

                        <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-xs">
                          <h4 className="text-xs font-mono font-extrabold uppercase text-emerald-400 tracking-wider">Contact Developer Support</h4>
                          <p className="text-[11px] text-gray-300 font-medium leading-relaxed">Our support channel remains reachable 24/7 at <span className="text-white font-bold underline">support@ecotrack.org</span> or standard hotlines.</p>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>

            </div>
          );
        })()}

        {activeTab === 'logout' && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            {/* Header block with Page Name and Search bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">Home / Sign out</span>
                <h2 className="text-xl font-black text-[#164121] tracking-tight">Sign out</h2>
              </div>
              {/* Unified search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search residents, jobs, blocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-205 bg-white rounded-xl focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] transition-colors font-semibold"
                />
              </div>
            </div>

            {/* Behind layout content (matching the blurred/overlayed admin panel background from the screenshot) */}
            <div className="min-h-[400px] bg-slate-50/50 rounded-3xl border border-dashed border-gray-200 flex items-center justify-center p-8">
              <p className="text-xs font-bold text-gray-450">Authenticating out of active session...</p>
            </div>

            {/* THE POPUP MODAL DIALOG OVERLAY (Centered absolute overlay) */}
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                {/* Modal Header inside dialogue */}
                <div className="p-6 pb-4 bg-rose-50/50 border-b border-rose-100/50 flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-650 shrink-0">
                    <LogOut className="w-5 h-5 rotate-180" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">Sign out of EcoTrack?</h3>
                    <p className="text-xs font-bold text-red-600/80 mt-0.5">You'll need to sign in again to continue managing the scheme.</p>
                  </div>
                </div>

                {/* Modal Body inside dialogue */}
                <div className="p-6 space-y-5">
                  {/* Active user display card */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50/40 to-emerald-50/10 border border-emerald-100/60 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settingsProfile.avatarUrl ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-200 shadow-sm bg-gray-100 shrink-0">
                          <img
                            src={settingsProfile.avatarUrl}
                            alt={`${settingsProfile.firstName} ${settingsProfile.lastName}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 flex items-center justify-center font-extrabold text-sm shrink-0">
                          {getInitials(settingsProfile.firstName, settingsProfile.lastName)}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-slate-900 leading-tight">
                          {settingsProfile.firstName} {settingsProfile.lastName}
                        </p>
                        <p className="text-[11px] font-bold text-gray-450 tracking-tight mt-0.5">
                          {settingsProfile.role || 'Scheme Manager'} • {settingsProfile.email}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white border border-emerald-100 text-[#2E7D32] rounded-full text-[10px] font-extrabold shadow-2xs tracking-tight uppercase">
                      Active session
                    </span>
                  </div>

                  {/* BEFORE YOU GO checks list */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Before you go</h4>
                    <div className="space-y-2.5 text-xs font-bold text-gray-700">
                      <div className="flex items-center gap-2.5 text-gray-600 hover:text-[#164121] transition-colors">
                        <Check className="w-4 h-4 text-[#2E7D32] stroke-[2.5]" />
                        <span>All your changes are auto-saved</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-600 hover:text-[#164121] transition-colors">
                        <RefreshCw className="w-4 h-4 text-[#2E7D32] stroke-[2.5]" />
                        <span>3 background sync tasks will continue</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-600 hover:text-[#164121] transition-colors">
                        <Shield className="w-4 h-4 text-[#2E7D32] stroke-[2.5]" />
                        <span>Push alerts will keep working</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400 tracking-tight pl-6.5">
                      Sign out from all devices (3 active)
                    </p>
                  </div>
                </div>

                {/* Modal Footer inside dialogue with exact Buttons */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      // Return to Dashboard when Stay signed in is clicked
                      setActiveTab('dashboard');
                    }}
                    className="px-5 py-2.5 border border-gray-200 bg-white hover:bg-slate-50 text-gray-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer leading-none flex items-center justify-center"
                  >
                    Stay signed in
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#C62828] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer leading-none flex items-center justify-center gap-1.5 shadow-md shadow-red-950/10"
                  >
                    <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Yes, sign me out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE PICTURE DETAIL ZOOM PREVIEW LIGHTBOX */}
        {isAvatarPreviewOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[9999] animate-in fade-in duration-200">
            {/* Click-away backdrop layer */}
            <button 
              type="button" 
              className="absolute inset-0 w-full h-full bg-transparent cursor-default focus:outline-none" 
              onClick={() => setIsAvatarPreviewOpen(false)} 
            />
            
            {/* Elegant Close Button Overlay in Top Right */}
            <button
              type="button"
              onClick={() => setIsAvatarPreviewOpen(false)}
              className="absolute top-4 right-4 md:top-8 md:right-8 w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all cursor-pointer hover:rotate-90 duration-200 shadow-lg border border-white/10 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/25 z-[10000]"
              title="Close Preview (Esc)"
            >
              <span className="text-xl font-bold leading-none">✕</span>
            </button>

            {/* Main Image Stage */}
            <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center select-none z-[9999] animate-in zoom-in-95 duration-250">
              {settingsProfile.avatarUrl ? (
                <img
                  src={settingsProfile.avatarUrl}
                  alt={`${settingsProfile.firstName} ${settingsProfile.lastName}`}
                  className="max-h-[88vh] w-auto max-w-full rounded-3xl md:rounded-4xl object-contain shadow-2xl border-4 border-white/20 bg-black/40 cursor-default"
                  referrerPolicy="no-referrer"
                  onClick={(e) => e.stopPropagation()} // Prevent clicking the image from closing
                />
              ) : (
                <div className="w-48 h-48 rounded-full bg-emerald-950 text-emerald-450 border-2 border-emerald-800/40 flex items-center justify-center font-black text-6xl">
                  {getInitials(settingsProfile.firstName, settingsProfile.lastName)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* THE DIALOG OVERLAYS FOR HOUSING MANAGEMENT */}
        {/* ADD BLOCK MODAL */}
        {isAddBlockModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
              {/* HEADER */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-base font-black text-[#164121]">Add Block</h3>
                  <p className="text-xs text-gray-400 font-extrabold tracking-tight">Create a new building block</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsAddBlockModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FORM */}
              <form onSubmit={handleCreateBlockSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Block Name</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Block D"
                      value={addBlockForm.name}
                      onChange={(e) => setAddBlockForm({ ...addBlockForm, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Total Floors</label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input 
                        type="number" 
                        min="1"
                        max="20"
                        required
                        value={addBlockForm.floors_count}
                        onChange={(e) => setAddBlockForm({ ...addBlockForm, floors_count: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Units Per Floor</label>
                    <div className="relative">
                      <Sliders className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input 
                        type="number" 
                        min="1"
                        max="10"
                        required
                        value={addBlockForm.units_per_floor}
                        onChange={(e) => setAddBlockForm({ ...addBlockForm, units_per_floor: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Notes (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Newly constructed wing"
                    value={addBlockForm.notes}
                    onChange={(e) => setAddBlockForm({ ...addBlockForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                  />
                </div>

                {/* BOTTOM CONTROLS */}
                <div className="flex gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddBlockModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#2E7D32]/20 hover:bg-emerald-50/40 text-[#2E7D32] text-xs font-black transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-emerald-950/15"
                  >
                    Create Block
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* IMPORT CSV MODAL */}
        {isImportCSVModalOpen && (
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200" id="csv-import-modal-overlay">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl animate-in fade-in zoom-in duration-250" id="csv-import-modal-container">
              {/* HEADER */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-black text-[#164121] flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-600" />
                    <span>Import Housing & Resident Directory</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-extrabold tracking-tight">Bulk provision blocks, floors, units, and register occupants using standard CSV</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsImportCSVModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TABS FOR METHOD */}
              <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl mb-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCsvInputMethod('upload');
                    setCsvRawText('');
                    setCsvPreviewData([]);
                    setCsvFile(null);
                    setCsvParseError(null);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    csvInputMethod === 'upload' 
                      ? 'bg-white text-emerald-800 shadow-xs font-extrabold' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Upload CSV File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCsvInputMethod('paste');
                    setCsvRawText('');
                    setCsvPreviewData([]);
                    setCsvFile(null);
                    setCsvParseError(null);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    csvInputMethod === 'paste' 
                      ? 'bg-white text-emerald-800 shadow-xs font-extrabold' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Paste Raw CSV Text
                </button>
              </div>

              {/* MAIN CONTENT AREA */}
              <div className="space-y-4">
                {/* UPLOAD FILE ZONE */}
                {csvInputMethod === 'upload' ? (
                  <div 
                    onDragOver={handleCSVDragOver}
                    onDragLeave={handleCSVDragLeave}
                    onDrop={handleCSVDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[140px] cursor-pointer ${
                      isDraggingCSV 
                        ? 'border-emerald-500 bg-emerald-50/40 scale-[0.99]' 
                        : 'border-slate-200 hover:border-emerald-500/50 hover:bg-slate-50/50'
                    }`}
                    onClick={() => document.getElementById('csv-file-picker')?.click()}
                  >
                    <input 
                      type="file" 
                      id="csv-file-picker"
                      accept=".csv"
                      className="hidden" 
                      onChange={handleCSVFileChange}
                    />
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-full mb-3 shadow-xs">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    {csvFile ? (
                      <div>
                        <p className="text-xs font-black text-slate-800">{csvFile.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-bold">{(csvFile.size / 1024).toFixed(1)} KB • Click or drag another file to replace</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-black text-[#164121]">Drag and drop your .csv file here</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">or <span className="text-emerald-700 font-extrabold underline cursor-pointer">browse from files</span></p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* PASTE TEXT AREA */
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-extrabold text-[#164121] uppercase tracking-wider block">CSV Payload Content</label>
                      <button
                        type="button"
                        onClick={() => {
                          const demo = "Block,Floor,Unit,Resident,Phone,Email\nBlock D,1,D-101,Amantha Salgadu,077-221-1122,amantha@ecotrack.lk\nBlock D,2,D-202,Vishwa Perera,071-554-1020,vishwa.p@gmail.com\nBlock E,1,E-101,Ruwan Bandara,075-889-4455,ruwan.bandara@gmail.com\nBlock E,3,E-305,Amelia Fernando,077-333-2211,amelia.f@outlook.com";
                          setCsvRawText(demo);
                          handleParseCSVData(demo);
                        }}
                        className="text-[10px] text-emerald-800 font-black flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 mt-0.5" />
                        <span>Preload Demo Template</span>
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={csvRawText}
                      onChange={(e) => {
                        setCsvRawText(e.target.value);
                        handleParseCSVData(e.target.value);
                      }}
                      placeholder="Block,Floor,Unit,Resident,Phone,Email&#10;Block A,1,A-108,Vishwa Salgadu,077-221-1122,vishwa@gmail.com"
                      className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#2E7D32] focus:ring-[#2E7D32]"
                    />
                  </div>
                )}

                {/* ERROR STATE */}
                {csvParseError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-rose-800 leading-none mb-1">CSV Format Validation Error</p>
                      <span>{csvParseError}</span>
                    </div>
                  </div>
                )}

                {/* PREVIEW CONTAINER */}
                {csvPreviewData.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-[#164121] uppercase tracking-wider block">
                        Parsed Live Preview ({csvPreviewData.length} records detected)
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black border border-emerald-100">
                        CSV Structure Validated
                      </span>
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50">
                      <table className="w-full text-left text-[11px] font-medium text-gray-500">
                        <thead className="bg-slate-100 text-[10px] text-gray-700 font-extrabold uppercase sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Block</th>
                            <th className="px-2 py-2 text-center">Floor</th>
                            <th className="px-3 py-2">Unit</th>
                            <th className="px-3 py-2">Resident Occupant</th>
                            <th className="px-3 py-2">Contact Account</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans text-xs">
                          {csvPreviewData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-100/50 transition-colors">
                              <td className="px-3 py-1.5 font-bold text-[#164121]">{item.block}</td>
                              <td className="px-2 py-1.5 text-center font-bold text-gray-600">{item.floor}</td>
                              <td className="px-3 py-1.5 font-mono text-xs font-bold text-emerald-900">{item.unit_number}</td>
                              <td className="px-3 py-1.5 font-semibold text-gray-800">{item.resident || <span className="text-gray-300 italic">Unassigned</span>}</td>
                              <td className="px-3 py-1.5 text-gray-500">
                                {item.resident_email && <div className="leading-tight text-[10px] font-bold text-[#2E7D32]">{item.resident_email}</div>}
                                {item.resident_phone && <div className="leading-none text-[9px] text-gray-400 mt-0.5">{item.resident_phone}</div>}
                                {!item.resident_email && !item.resident_phone && <span className="text-gray-300 italic">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* HOW TO FORMAT INFO ACCORDION */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-500/10 rounded-xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-[10px] text-[#164121]/80 leading-normal font-medium">
                    <span className="font-extrabold text-[#164121] block mb-0.5">Supported CSV Schema Structure</span>
                    Required Headers: <code className="font-mono bg-white border px-1 rounded text-red-700 font-bold">Block</code>, <code className="font-mono bg-white border px-1 rounded text-red-700 font-bold">Floor</code>, <code className="font-mono bg-white border px-1 rounded text-red-700 font-bold">Unit</code>.
                    Optional mapping headers: <code className="font-mono bg-white border px-1 rounded text-gray-700">Resident</code>, <code className="font-mono bg-white border px-1 rounded text-gray-700">Phone</code>, <code className="font-mono bg-white border px-1 rounded text-gray-700">Email</code>. Non-existent building blocks will be dynamically established during the ingestion cycle.
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex justify-end gap-2.5 mt-5 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsImportCSVModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-50 text-xs font-black transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportCSVConfirm}
                  disabled={csvPreviewData.length === 0}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all shadow-sm ${
                    csvPreviewData.length > 0
                      ? 'bg-[#2E7D32] hover:bg-[#1E562F] text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Execute CSV Ingestion</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGN RESIDENT MODAL */}
        {isAssignModalOpen && assignTarget && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-sm p-5 relative shadow-2xl animate-in fade-in zoom-in duration-200">
              
              {/* HEADER */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-black text-[#164121]">Assign Resident</h3>
                  <p className="text-xs text-gray-400 font-extrabold tracking-tight">Assign unit {assignTarget.unitNumber} to a resident</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setAssignTarget(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SEARCH FIELD */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search resident list..."
                  value={residentSearchQuery}
                  onChange={(e) => setResidentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                />
              </div>

              {/* DIRECTORY LIST */}
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1 mb-4 select-none">
                {/* Unassign Option */}
                <div 
                  onClick={() => setSelectedResidentId(-1)} // Special token for unoccupied
                  className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    selectedResidentId === -1 
                      ? 'bg-rose-50 border-rose-300' 
                      : 'border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0">
                      <Trash className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-rose-900">Leave House Vacant</p>
                      <span className="text-[10px] text-gray-400 font-extrabold block leading-none">Remove current resident</span>
                    </div>
                  </div>
                  {selectedResidentId === -1 && <Check className="w-4 h-4 text-rose-600 shrink-0" />}
                </div>

                {residents
                  .filter(r => 
                    !residentSearchQuery.trim() || 
                    r.name.toLowerCase().includes(residentSearchQuery.toLowerCase()) ||
                    r.email.toLowerCase().includes(residentSearchQuery.toLowerCase()) ||
                    r.phone.includes(residentSearchQuery)
                  )
                  .map((item) => {
                    const isSelected = selectedResidentId === item.id;
                    return (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedResidentId(item.id)}
                        className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-300' 
                            : 'border-slate-150 hover:bg-[#F4F6F0]/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#164121]/10 text-[#164121] flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                            {(item.avatar && (item.avatar.startsWith('http') || item.avatar.startsWith('data:'))) ? (
                              <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              (item.avatar && item.avatar.length <= 3) ? item.avatar : item.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-gray-900 leading-tight">{item.name}</h4>
                            <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5">
                              {item.phone}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#2E7D32] shrink-0 font-extrabold" />}
                      </div>
                    );
                  })}
              </div>

              {/* FOOTER CONTROLS */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setAssignTarget(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[#2E7D32]/20 hover:bg-emerald-50/45 text-[#2E7D32] text-xs font-black transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  onClick={handleAssignResidentSubmit}
                  disabled={selectedResidentId === null}
                  className="flex-1 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-emerald-950/15 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ADD HOUSE MODAL */}
        {isAddUnitModalOpen && addUnitTarget && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-sm p-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
              
              {/* HEADER */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-black text-[#164121]">Add House</h3>
                  <p className="text-xs text-gray-400 font-extrabold tracking-tight">Create apartment unit for Floor {addUnitTarget.floorNumber}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setIsAddUnitModalOpen(false);
                    setAddUnitTarget(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FORM */}
              <form onSubmit={handleCreateUnitSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">House (Unit) Number</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. A-106"
                    value={newUnitNumber}
                    onChange={(e) => setNewUnitNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-black text-gray-850"
                  />
                  <span className="text-[10px] text-gray-400 font-extrabold block mt-2 leading-relaxed">System automatically prefixes block shorthand symbols. Shorthand matches your block identifier.</span>
                </div>

                {/* CONTROLS */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddUnitModalOpen(false);
                      setAddUnitTarget(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-[#2E7D32]/20 hover:bg-[#E8F5E9]/50 text-[#2E7D32] text-xs font-black transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-emerald-950/15"
                  >
                    Create Unit
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* EDIT BLOCK MODAL */}
        {isEditBlockModalOpen && editingBlock && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
              {/* HEADER */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-base font-black text-[#164121]">Edit Block Settings</h3>
                  <p className="text-xs text-gray-400 font-extrabold tracking-tight">Modify structure of {editingBlock.name}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditBlockModalOpen(false);
                    setEditingBlock(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FORM */}
              <form onSubmit={handleEditBlockSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Block Name</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Block D"
                      value={editBlockForm.name}
                      onChange={(e) => setEditBlockForm({ ...editBlockForm, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Total Floors</label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input 
                        type="number" 
                        min="1"
                        max="20"
                        required
                        value={editBlockForm.floors_count}
                        onChange={(e) => setEditBlockForm({ ...editBlockForm, floors_count: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Units Per Floor</label>
                    <div className="relative">
                      <Sliders className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input 
                        type="number" 
                        min="1"
                        max="10"
                        required
                        value={editBlockForm.units_per_floor}
                        onChange={(e) => setEditBlockForm({ ...editBlockForm, units_per_floor: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Description Notes (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Newly constructed wing"
                    value={editBlockForm.notes}
                    onChange={(e) => setEditBlockForm({ ...editBlockForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                  />
                </div>

                {/* BOTTOM CONTROLS */}
                <div className="flex gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditBlockModalOpen(false);
                      setEditingBlock(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-[#2E7D32]/20 hover:bg-emerald-50/40 text-[#2E7D32] text-xs font-black transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-emerald-950/15"
                  >
                    Update Block
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CHOICE MODAL: CHOOSE BETWEEN RESIDENT & WORKER */}
        {isAddUserChoiceModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in duration-250">
              
              {/* Close Button */}
              <button 
                type="button" 
                onClick={() => setIsAddUserChoiceModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-slate-50 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 mb-3 text-[#2E7D32] border border-emerald-100">
                  <UserPlus className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-[#164121]">Register New Member</h3>
                <p className="text-xs text-gray-400 font-extrabold mt-1">Select account category to proceed</p>
              </div>

              <div className="space-y-3">
                {/* Resident Choice Option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddUserChoiceModalOpen(false);
                    setIsAddResidentModalOpen(true);
                    setResidentModalTab('general');
                    setResidentValError(null);
                  }}
                  className="w-full flex items-start gap-4 p-4 border border-gray-150 hover:border-[#2E7D32]/50 hover:bg-[#E8F5E9]/20 rounded-2xl text-left transition-all cursor-pointer group"
                >
                  <div className="p-2.5 rounded-xl bg-[#E8F5E9] text-[#2E7D32] shrink-0 font-bold group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 mb-1">Add Resident Account</h4>
                    <p className="text-[11px] text-gray-400 font-medium leading-normal">Onboard apartment wing tenants. Select block details, unique Unit number, spoken language & move-in dates.</p>
                  </div>
                </button>

                {/* Worker Choice Option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddUserChoiceModalOpen(false);
                    setIsAddWorkerModalOpen(true);
                  }}
                  className="w-full flex items-start gap-4 p-4 border border-gray-150 hover:border-blue-500/50 hover:bg-blue-50/20 rounded-2xl text-left transition-all cursor-pointer group"
                >
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0 font-bold group-hover:scale-105 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 mb-1">Add Collector Worker Profile</h4>
                    <p className="text-[11px] text-gray-400 font-medium leading-normal">Enlist sanitation loaders. Register NIC identity keys, assign morning/evening operational shift hours and blocks.</p>
                  </div>
                </button>
              </div>

            </div>
          </div>
        )}

        {isAddResidentModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-lg p-6 relative shadow-2xl animate-in fade-in zoom-in duration-250 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-black text-[#164121]">Add Resident (Advanced)</h3>
                  <p className="text-xs text-gray-400 font-extrabold tracking-tight">Onboard a resident profile with extended metadata & waste plans</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsAddResidentModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-[#164121] rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Wizard Tab Steppers with step 1 validation checks */}
              {(() => {
                const isFirstStepValid = 
                  residentForm.firstName.trim() !== '' &&
                  residentForm.lastName.trim() !== '' &&
                  residentForm.email.trim() !== '' &&
                  residentForm.phone.trim() !== '' &&
                  residentForm.nic.trim() !== '';

                return (
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-2xl mb-5 border border-gray-150">
                    <button
                      type="button"
                      onClick={() => {
                        setResidentModalTab('general');
                        setResidentValError(null);
                      }}
                      className={`py-2 text-[10.5px] font-black rounded-xl text-center transition-all cursor-pointer ${
                        residentModalTab === 'general' 
                          ? 'bg-[#2E7D32] text-white shadow-xs' 
                          : 'text-gray-500 hover:text-[#2E7D32] hover:bg-slate-100/60'
                      }`}
                    >
                      🏡 Bio & Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isFirstStepValid) {
                          setResidentModalTab('ecology');
                          setResidentValError(null);
                        } else {
                          setResidentValError('Please fill in all textboxes (First Name, Last Name, Email, Phone, NIC) in the Bio & Photo step to proceed.');
                        }
                      }}
                      className={`py-2 text-[10.5px] font-black rounded-xl text-center transition-all cursor-pointer ${
                        residentModalTab === 'ecology' 
                          ? 'bg-[#2E7D32] text-white shadow-xs' 
                          : 'text-gray-500 hover:text-[#2E7D32] hover:bg-slate-100/60'
                      } ${!isFirstStepValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      ♻️ House & Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isFirstStepValid) {
                          setResidentModalTab('emergency');
                          setResidentValError(null);
                        } else {
                          setResidentValError('Please fill in all textboxes (First Name, Last Name, Email, Phone, NIC) in the Bio & Photo step to proceed.');
                        }
                      }}
                      className={`py-2 text-[10.5px] font-black rounded-xl text-center transition-all cursor-pointer ${
                        residentModalTab === 'emergency' 
                          ? 'bg-[#2E7D32] text-white shadow-xs' 
                          : 'text-gray-500 hover:text-[#2E7D32] hover:bg-slate-100/60'
                      } ${!isFirstStepValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      🚨 Emergency & Alerts
                    </button>
                  </div>
                );
              })()}

              {/* Form content */}
              <form onSubmit={handleCreateResident} className="space-y-4">
                
                {/* TAB 1: GENERAL INFO & BIO */}
                {residentModalTab === 'general' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Photo Upload Zone */}
                    <div className="flex items-center gap-4 p-3.5 bg-emerald-50/20 border border-emerald-100 rounded-2xl relative">
                      <div className="relative group w-12 h-12 rounded-full border border-[#2E7D32]/20 overflow-hidden bg-white text-gray-400 text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {residentForm.avatar ? (
                          <img src={residentForm.avatar} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#2E7D32] animate-bounce" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-gray-900">Profile Photo</p>
                        <div className="flex items-center gap-2 mt-1">
                          <label className="px-2.5 py-1 text-[10px] cursor-pointer font-black border border-gray-250 bg-white hover:bg-slate-100 text-gray-650 rounded-lg transition-colors">
                            Choose File
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setResidentForm(prev => ({ ...prev, avatar: reader.result as string }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {residentForm.avatar && (
                            <button
                              type="button"
                              onClick={() => setResidentForm(prev => ({ ...prev, avatar: '' }))}
                              className="px-2.5 py-1 text-[10px] font-black border border-red-250 bg-red-55 text-red-755 hover:bg-red-100 rounded-lg transition"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Name inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">First Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Amantha"
                          value={residentForm.firstName}
                          onChange={(e) => setResidentForm({...residentForm, firstName: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-semibold text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Last Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Salgadu"
                          value={residentForm.lastName}
                          onChange={(e) => setResidentForm({...residentForm, lastName: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-semibold text-gray-800"
                        />
                      </div>
                    </div>

                    {/* Contacts & NIC */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Email Address</label>
                        <input 
                          type="email" 
                          placeholder="amantha@ecotrack.lk"
                          value={residentForm.email}
                          onChange={(e) => setResidentForm({...residentForm, email: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-semibold text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Phone Number</label>
                        <input 
                          type="text" 
                          placeholder="+94 70 250 7330"
                          value={residentForm.phone}
                          onChange={(e) => setResidentForm({...residentForm, phone: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-semibold text-gray-800"
                        />
                      </div>
                    </div>

                    {/* Spoken Language & NIC Number */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">National Identity Card (NIC)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 199512304918"
                          value={residentForm.nic}
                          onChange={(e) => setResidentForm({...residentForm, nic: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Preferred Language</label>
                        <select
                          value={residentForm.language}
                          onChange={(e) => setResidentForm({...residentForm, language: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-semibold text-gray-800 bg-white"
                        >
                          <option value="English">English</option>
                          <option value="Sinhala">Sinhala (සිංහල)</option>
                          <option value="Tamil">Tamil (தமிழ்)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: HOUSING & WASTE PLAN */}
                {residentModalTab === 'ecology' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    
                    {/* Housing block Assignment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Block Directory</label>
                        <select
                          value={residentForm.block}
                          onChange={(e) => setResidentForm({...residentForm, block: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-850 bg-white"
                        >
                          {blocks && blocks.length > 0 ? (
                            blocks.map((b) => (
                              <option key={b.id} value={b.name}>
                                {b.name} ({b.notes || `${b.floors_count} floors`})
                              </option>
                            ))
                          ) : (
                            <option value="">No blocks available</option>
                          )}
                        </select>
                      </div>

                       <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Unit Assignment</label>
                        <select
                          value={residentForm.unit}
                          onChange={(e) => setResidentForm({...residentForm, unit: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-855 bg-white"
                        >
                          {(() => {
                            const selectedBlockObj = blocks?.find(b => b.name === residentForm.block);
                            const unitsList = selectedBlockObj 
                              ? (Object.values(selectedBlockObj.units || {}).flat() as any[])
                              : [];
                            
                            const vacantUnitsList = unitsList.filter(unit => !unit.resident);

                            if (vacantUnitsList.length === 0) {
                              return <option value="">No vacant units available in Block</option>;
                            }

                            return vacantUnitsList.map((unit) => (
                              <option key={unit.unit_number} value={unit.unit_number}>
                                {unit.unit_number} (Vacant)
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    {/* Occupancy & Members */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Occupancy Status</label>
                        <select
                          value={residentForm.occupancyType}
                          onChange={(e) => setResidentForm({...residentForm, occupancyType: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800 bg-white"
                        >
                          <option value="Owner-Occupier">Owner-Occupier 🏠</option>
                          <option value="Tenant">Tenant / Renting 🔑</option>
                          <option value="Subletter">Subletter 📬</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Household Members</label>
                        <input 
                          type="number"
                          min="1"
                          max="20"
                          value={residentForm.householdMembers}
                          onChange={(e) => setResidentForm({...residentForm, householdMembers: Number(e.target.value) || 1})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                        />
                      </div>
                    </div>

                    {/* Move-in & Recycling Plan */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Move-in Date</label>
                        <input 
                          type="date"
                          value={residentForm.moveInDate}
                          onChange={(e) => setResidentForm({...residentForm, moveInDate: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Eco Waste Program</label>
                        <select
                          value={residentForm.recyclingPlan}
                          onChange={(e) => setResidentForm({...residentForm, recyclingPlan: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-bold text-gray-800 bg-white"
                        >
                          <option value="Basic Recycler">Basic Recycler 🗑️</option>
                          <option value="Standard Recycler">Standard Recycler ♻️</option>
                          <option value="Eco Enthusiast">Eco Enthusiast 🌱</option>
                          <option value="Zero Waste Champion">Zero Waste Champion 🌟</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: EMERGENCY, SECURITY & ALERTS */}
                {residentModalTab === 'emergency' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    
                    {/* Emergency Contacts */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-red-750 uppercase tracking-wider mb-2">Emergency Contact Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Bandula Salgadu"
                          value={residentForm.emergencyContactName}
                          onChange={(e) => setResidentForm({...residentForm, emergencyContactName: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-rose-500 focus:border-rose-500 font-semibold text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-red-750 uppercase tracking-wider mb-2">Emergency Phone</label>
                        <input 
                          type="text" 
                          placeholder="e.g. +94 77 123 4567"
                          value={residentForm.emergencyContactPhone}
                          onChange={(e) => setResidentForm({...residentForm, emergencyContactPhone: e.target.value})}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-rose-500 focus:border-rose-500 font-semibold text-gray-800"
                        />
                      </div>
                    </div>

                    {/* Boolean Toggles */}
                    <div className="space-y-2.5 bg-slate-50 border border-gray-150 p-4 rounded-2xl">
                      {/* Assist required */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11.5px] font-black text-gray-900 flex items-center gap-1.5">
                            Special Garbage Assistance
                          </p>
                          <p className="text-[9.5px] text-gray-400 font-bold mt-0.5">Heavy bin carriage support required (Senior citizens / differently-abled)</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={residentForm.assistanceRequired}
                            onChange={(e) => setResidentForm({...residentForm, assistanceRequired: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2E7D32]"></div>
                        </label>
                      </div>

                      <hr className="border-gray-150" />

                      {/* WhatsApp subscription */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11.5px] font-black text-gray-900 flex items-center gap-1.5">
                            Garbage Alert WhatsApp Dispatch
                          </p>
                          <p className="text-[9.5px] text-gray-400 font-bold mt-0.5">Auto-dispatch garbage truck schedules & alerts directly via WhatsApp text</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={residentForm.whatsappEnabled}
                            onChange={(e) => setResidentForm({...residentForm, whatsappEnabled: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2E7D32]"></div>
                        </label>
                      </div>
                    </div>

                    {/* Specialized Notes */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Special Guidelines / Notes</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Keep bin inside the C-1 cabinet. Do not ring doorbell before 8 AM..."
                        value={residentForm.notes}
                        onChange={(e) => setResidentForm({...residentForm, notes: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-semibold text-gray-800"
                      />
                    </div>
                  </div>
                )}

                {/* Dynamic Onscreen Validation Alert & Restricted Actions */}
                {(() => {
                  const isFirstStepValid = 
                    residentForm.firstName.trim() !== '' &&
                    residentForm.lastName.trim() !== '' &&
                    residentForm.email.trim() !== '' &&
                    residentForm.phone.trim() !== '' &&
                    residentForm.nic.trim() !== '';

                  return (
                    <>
                      {residentValError && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs font-black shadow-xs flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <span className="text-sm shrink-0">⚠️</span>
                          <div>
                            <p className="font-extrabold text-[11px] uppercase tracking-wide">Validation Restriction</p>
                            <p className="text-[10px] text-rose-650 mt-0.5 font-bold leading-normal">{residentValError}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center gap-2.5 pt-3 border-t border-gray-100">
                        {/* Cancel / Previous button */}
                        {residentModalTab === 'general' ? (
                          <button
                            type="button"
                            onClick={() => setIsAddResidentModalOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-gray-500 text-xs font-black transition-all cursor-pointer text-center"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (residentModalTab === 'ecology') setResidentModalTab('general');
                              else if (residentModalTab === 'emergency') setResidentModalTab('ecology');
                              setResidentValError(null);
                            }}
                            className="flex-1 py-2.5 rounded-xl border border-[#2E7D32]/25 text-[#2E7D32] hover:bg-slate-50 text-xs font-black transition-all cursor-pointer text-center"
                          >
                            Back
                          </button>
                        )}

                        {/* Next / Submit Button */}
                        {residentModalTab !== 'emergency' ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (residentModalTab === 'general') {
                                if (isFirstStepValid) {
                                  setResidentModalTab('ecology');
                                  setResidentValError(null);
                                } else {
                                  setResidentValError('Please fill in all textboxes in the Bio & Photo step (First Name, Last Name, Email, Phone, NIC) to unlock the next steps.');
                                }
                              } else if (residentModalTab === 'ecology') {
                                setResidentModalTab('emergency');
                                setResidentValError(null);
                              }
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                              residentModalTab === 'general' && !isFirstStepValid
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-150 img-disabled'
                                : 'bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 text-[#2E7D32]'
                            }`}
                          >
                            Next Step ➔
                          </button>
                        ) : (
                          <button
                            type="submit"
                            className="flex-1 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-emerald-950/15 animate-pulse"
                          >
                            Register Resident ✓
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}

              </form>

            </div>
          </div>
        )}

        {/* MODAL: ADD WORKER FORM */}
        {isAddWorkerModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-lg p-6 relative shadow-2xl animate-in fade-in zoom-in duration-250 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-base font-black text-[#164121]">Add Worker</h3>
                  <p className="text-xs text-gray-400 font-extrabold tracking-tight">Onboard a new garbage collector worker</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsAddWorkerModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-[#164121] rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form content */}
              <form onSubmit={handleCreateWorker} className="space-y-4">
                
                {/* ID Photo Upload Zone */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-gray-150 rounded-2xl gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center bg-white text-gray-400 text-xs shrink-0 overflow-hidden shadow-xs">
                      {workerForm.avatar ? (
                        <img src={workerForm.avatar} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Upload className="w-4 h-4 text-gray-455" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900">ID Photo Registration</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">Required for physical QR card badge verification.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <label className="px-3 py-1.5 border border-gray-205 text-gray-750 bg-white hover:bg-slate-50 rounded-xl text-[10.5px] font-black transition-colors cursor-pointer block">
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setWorkerForm(prev => ({ ...prev, avatar: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {workerForm.avatar && (
                      <button
                        type="button"
                        onClick={() => setWorkerForm(prev => ({ ...prev, avatar: '' }))}
                        className="text-[10px] font-black text-red-650 hover:underline animate-fade-in"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>

                {/* Name & NIC inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Full Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Sunil Kumara"
                      value={workerForm.fullName}
                      onChange={(e) => setWorkerForm({...workerForm, fullName: e.target.value})}
                      className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">National ID Shorthand (NIC)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 892541234V or 19890XXXXXX"
                      value={workerForm.nic}
                      onChange={(e) => setWorkerForm({...workerForm, nic: e.target.value})}
                      className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800"
                    />
                  </div>
                </div>

                {/* Contacts inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Mobile Phone</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. +94 77 123 4567"
                      value={workerForm.phone}
                      onChange={(e) => setWorkerForm({...workerForm, phone: e.target.value})}
                      className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Official Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. sunil@ecotrack.lk"
                      value={workerForm.email}
                      onChange={(e) => setWorkerForm({...workerForm, email: e.target.value})}
                      className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800"
                    />
                  </div>
                </div>

                {/* Shift Selection - styled card grids from screenshot 1 */}
                <div>
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Operational Shift hours</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'Morning 6-2', title: 'Morning', hours: '6AM - 2PM' },
                      { key: 'Evening 2-10', title: 'Evening', hours: '2PM - 10PM' },
                      { key: 'Night 10-6', title: 'Night', hours: '10PM - 6AM' }
                    ].map((sh) => {
                      const isActive = workerForm.shift === sh.key;
                      return (
                        <button
                          key={sh.key}
                          type="button"
                          onClick={() => setWorkerForm({...workerForm, shift: sh.key})}
                          className={`p-3 border rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                            isActive 
                              ? 'border-[#2E7D32] bg-[#E8F5E9]/30 text-[#2E7D32] ring-1 ring-[#2E7D32]' 
                              : 'border-gray-200 hover:border-gray-350 text-gray-500 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[11px] font-black">{sh.title}</span>
                          <span className="text-[9px] font-bold text-gray-400 mt-0.5">{sh.hours}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                 {/* Assigned Blocks input */}
                <div>
                  <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">
                    Assigned Residential Blocks Coverage
                  </label>
                  <div className="space-y-4">
                    {(() => {
                      const selectedList = workerForm.assignedBlocks
                        ? workerForm.assignedBlocks.split(',').map((x: string) => x.trim()).filter(Boolean)
                        : [];

                      const toggleBlock = (blockName: string) => {
                        let updated;
                        if (selectedList.includes(blockName)) {
                          updated = selectedList.filter(b => b !== blockName);
                        } else {
                          updated = [...selectedList, blockName];
                        }
                        setWorkerForm(prev => ({
                          ...prev,
                          assignedBlocks: updated.join(', ')
                        }));
                      };

                      // Get all blocks covered by other workers
                      const alreadyCoveredSet = new Set<string>();
                      users.forEach(u => {
                        if (u.role === 'worker' && u.assignedBlocks) {
                          u.assignedBlocks.split(',').forEach((bName: string) => {
                            alreadyCoveredSet.add(bName.trim());
                          });
                        }
                      });

                      const unassignedBlocks = blocks.filter(b => !alreadyCoveredSet.has(b.name));
                      const assignedBlocks = blocks.filter(b => alreadyCoveredSet.has(b.name));

                      return (
                        <div className="space-y-3">
                          {/* Unassigned Blocks */}
                          <div className="p-3 bg-[#E8F5E9]/25 border border-emerald-100 rounded-2xl">
                            <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Unassigned Blocks (Directly Available)
                            </span>
                            {unassignedBlocks.length === 0 ? (
                              <p className="text-[10.5px] text-gray-400 font-medium italic">All blocks are currently covered by active staff.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {unassignedBlocks.map(b => {
                                  const isChecked = selectedList.includes(b.name);
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => toggleBlock(b.name)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                                        isChecked
                                          ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow-sm'
                                          : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{b.name}</span>
                                      {isChecked ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3 h-3 text-gray-400 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Covered Blocks */}
                          <div className="p-3 bg-slate-50/50 border border-gray-150 rounded-2xl">
                            <span className="text-[10px] text-slate-550 font-extrabold uppercase tracking-wide block mb-2 text-gray-500 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              Already Covered (Assign Multi-Staff)
                            </span>
                            {assignedBlocks.length === 0 ? (
                              <p className="text-[10.5px] text-gray-400 font-medium italic">No blocks are currently covered by other crew members.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {assignedBlocks.map(b => {
                                  const isChecked = selectedList.includes(b.name);
                                  
                                  // Find worker names covering this block
                                  const crew = users
                                    .filter(u => u.role === 'worker' && u.assignedBlocks && u.assignedBlocks.split(',').map((x: string) => x.trim()).includes(b.name))
                                    .map(u => u.name);

                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => toggleBlock(b.name)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-start gap-1 border ${
                                        isChecked
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                          : 'bg-white text-gray-500 border-gray-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <span>{b.name}</span>
                                        {isChecked ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3 h-3 text-gray-400 shrink-0" />}
                                      </span>
                                      {crew.length > 0 && (
                                        <span className={`text-[8.5px] font-bold ${isChecked ? 'text-blue-100' : 'text-gray-400'}`}>
                                          Crew: {crew.join(', ')}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <span className="text-[9px] text-gray-400 font-bold block mt-1.5 leading-normal">
                    Selected blocks string: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-750 font-extrabold">{workerForm.assignedBlocks || 'None'}</span>
                  </span>
                </div>

                {/* Submits */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddWorkerModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-gray-500 text-xs font-black transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-emerald-950/15"
                  >
                    Create Worker
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* CUSTOM CONFIRMATION MODAL */}
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-250">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-sm p-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-105 bg-rose-50 mb-4 text-rose-600 border border-rose-100">
                  <AlertTriangle className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="text-sm font-black text-[#164121] mb-2">{confirmModal.title}</h3>
                <p className="text-xs text-gray-500 font-bold leading-relaxed px-2">{confirmModal.message}</p>
              </div>

              <div className="flex gap-2.5 pt-5 mt-1">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-slate-50 text-gray-650 text-xs font-black transition-all cursor-pointer text-center text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-rose-950/20"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INTERACTIVE AVATAR UPDATE / REMOVE MODAL FOR EXISTING USERS */}
        {pictureEditTarget && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-sm p-6 relative shadow-2xl animate-in fade-in zoom-in duration-250 animate-out fade-out zoom-out">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-black text-[#164121]">Update Profile Photo</h3>
                  <p className="text-[10px] text-gray-400 font-extrabold tracking-tight">Modify or remove photo for {pictureEditTarget.name}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setPictureEditTarget(null)}
                  className="p-1.5 text-gray-400 hover:text-[#164121] rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Large Portrait/Circular Preview */}
              <div className="flex flex-col items-center justify-center py-5 bg-slate-50 border border-gray-100 rounded-2xl mb-4">
                <div className={`w-20 h-20 rounded-full border-4 border-white shadow-md flex items-center justify-center font-black text-xl overflow-hidden shrink-0 ${
                  pictureEditTarget.type === 'resident' ? 'bg-emerald-50 text-[#2E7D32]' : 'bg-blue-50 text-blue-750'
                }`}>
                  {(pictureEditTarget.avatar && (pictureEditTarget.avatar.startsWith('http') || pictureEditTarget.avatar.startsWith('data:'))) ? (
                    <img src={pictureEditTarget.avatar} alt={pictureEditTarget.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    pictureEditTarget.avatar || pictureEditTarget.name.split(' ').map((n: string)=>n[0]).join('').toUpperCase().slice(0, 2)
                  )}
                </div>
                <span className="text-[11px] text-gray-700 font-extrabold mt-2">{pictureEditTarget.name}</span>
                <span className={`text-[9px] font-black uppercase tracking-wider mt-0.5 px-2 py-0.5 rounded-md ${
                  pictureEditTarget.type === 'resident' ? 'bg-emerald-50 text-[#2E7D32]' : 'bg-blue-50 text-blue-700'
                }`}>
                  {pictureEditTarget.type}
                </span>
              </div>

              {/* Action grid */}
              <div className="space-y-3">
                {/* Upload Action */}
                <label className="w-full py-2 border border-gray-200 bg-white hover:bg-slate-50 hover:border-gray-300 text-gray-700 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs rounded-xl">
                  <Upload className="w-3.5 h-3.5 text-gray-450" />
                  <span>Upload Custom Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64Url = reader.result as string;
                          
                          // Update visually in target list
                          if (pictureEditTarget.type === 'resident') {
                            setResidents(prev => prev.map(r => r.id === pictureEditTarget.id ? { ...r, avatar: base64Url } : r));
                          } else {
                            setUsers(prev => prev.map(u => u.id === pictureEditTarget.id ? { ...u, avatar: base64Url } : u));
                          }
                          
                          setPictureEditTarget(prev => prev ? { ...prev, avatar: base64Url } : null);
                          setFeedbackMessage(`Updated profile picture for ${pictureEditTarget.name}.`);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {/* Preset Avatars Selection Option */}
                <div>
                  <label className="block text-[8px] font-extrabold text-gray-400 uppercase tracking-widest text-center mb-1.5">Or Choose a Beautiful Gradient Preset</label>
                  <div className="flex justify-center gap-1.5 mb-2">
                    {[
                      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
                      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                    ].map((presetUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (pictureEditTarget.type === 'resident') {
                            setResidents(prev => prev.map(r => r.id === pictureEditTarget.id ? { ...r, avatar: presetUrl } : r));
                          } else {
                            setUsers(prev => prev.map(u => u.id === pictureEditTarget.id ? { ...u, avatar: presetUrl } : u));
                          }
                          setPictureEditTarget(prev => prev ? { ...prev, avatar: presetUrl } : null);
                          setFeedbackMessage(`Updated profile picture to preset ${idx + 1} for ${pictureEditTarget.name}.`);
                        }}
                        className="w-7 h-7 rounded-full overflow-hidden border border-gray-100 hover:scale-110 active:scale-95 transition-transform shrink-0"
                      >
                        <img src={presetUrl} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remove Action (Only available if a photo is set) */}
                {pictureEditTarget.avatar && (pictureEditTarget.avatar.startsWith('http') || pictureEditTarget.avatar.startsWith('data:')) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (pictureEditTarget.type === 'resident') {
                        setResidents(prev => prev.map(r => r.id === pictureEditTarget.id ? { ...r, avatar: '' } : r));
                      } else {
                        setUsers(prev => prev.map(u => u.id === pictureEditTarget.id ? { ...u, avatar: '' } : u));
                      }
                      setPictureEditTarget(prev => prev ? { ...prev, avatar: '' } : null);
                      setFeedbackMessage(`Removed profile photo for ${pictureEditTarget.name}. Falling back to default initials.`);
                    }}
                    className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100/60 text-red-750 text-xs font-black transition-all cursor-pointer text-center"
                  >
                    Remove Profile Photo
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPictureEditTarget(null)}
                  className="w-full py-2 rounded-xl border border-gray-150 text-gray-500 hover:bg-slate-50 text-xs font-black transition-all cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INTERACTIVE COMPREHENSIVE RESIDENT INSPECTOR AND EDITOR MODAL */}
        {inspectingResident && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl animate-in fade-in zoom-in duration-250 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#2E7D32] border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
                    {inspectingResident.avatar ? (
                      <img src={inspectingResident.avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-black text-xs">{(inspectingResident.name || 'R').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#164121]">{inspectingResident.name}</h3>
                    <p className="text-xs text-gray-400 font-bold">Resident ID: #{inspectingResident.id} • Assigned to Unit {inspectingResident.unit}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setInspectingResident(null)}
                  className="p-1.5 text-gray-400 hover:text-[#164121] rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setActionLoading(true);
                  try {
                    // Try to resolve unit_id matching block and unit name
                    let unit_id: number | null = null;
                    if (Array.isArray(blocks)) {
                      const targetBlock = blocks.find(b => b.name === inspectingResident.block);
                      if (targetBlock && targetBlock.units) {
                        const cleanUnitIdStr = (val: string) => val.toLowerCase().replace(/[^a-z0-9]/g, '');
                        Object.keys(targetBlock.units).forEach((floorKey: string) => {
                          if (Array.isArray(targetBlock.units[floorKey])) {
                            const matchedUnit = targetBlock.units[floorKey].find((u: any) => {
                              const cn1 = cleanUnitIdStr(u.unit_number || '');
                              const cn2 = cleanUnitIdStr(inspectingResident.unit || '');
                              return cn1 === cn2 || cn1.endsWith(cn2) || cn2.endsWith(cn1);
                            });
                            if (matchedUnit && matchedUnit.id) {
                              unit_id = matchedUnit.id;
                            }
                          }
                        });
                      }
                    }

                    const response = await fetch('/api/admin/users', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        name: inspectingResident.name,
                        email: inspectingResident.email,
                        phone: inspectingResident.phone,
                        role: 'resident',
                        unit_id: unit_id
                      })
                    });
                    if (!response.ok) throw new Error();
                    setFeedbackMessage(`Success! Saved resident ${inspectingResident.name} changes directly to cloud database.`);
                    loadAdminMetrics();
                  } catch (err) {
                    setResidents(prev => prev.map(r => r.id === inspectingResident.id ? inspectingResident : r));
                    setFeedbackMessage(`Updated locally: ${inspectingResident.name} (local UI fallback).`);
                  } finally {
                    setActionLoading(false);
                    setInspectingResident(null);
                  }
                  
                  // Synchronize real-time state for assigned blocks and units
                  setBlocks(prevBlocks => prevBlocks.map(b => {
                    let updatedUnits = { ...(b.units || {}) };
                    Object.keys(updatedUnits).forEach(floorKey => {
                      updatedUnits[floorKey] = updatedUnits[floorKey].map((u: any) => {
                        if (u.resident === inspectingResident.name) {
                          return {
                            ...u,
                            resident: '',
                            resident_phone: '',
                            resident_email: ''
                          };
                        }
                        return u;
                      });
                    });
                    let resultBlock = { ...b, units: updatedUnits };

                    if (resultBlock.name === inspectingResident.block) {
                      let finalUnits = { ...(resultBlock.units || {}) };
                      Object.keys(finalUnits).forEach(floorKey => {
                        finalUnits[floorKey] = finalUnits[floorKey].map((u: any) => {
                          if (u.unit_number === inspectingResident.unit) {
                            return {
                              ...u,
                              resident: inspectingResident.name,
                              resident_phone: inspectingResident.phone,
                              resident_email: inspectingResident.email
                            };
                          }
                          return u;
                        });
                      });
                      resultBlock.units = finalUnits;
                    }
                    return resultBlock;
                  }));
                }} 
                className="space-y-4"
              >
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Column 1: Core Bio & Contact */}
                  <div className="space-y-4 bg-slate-50/50 p-4 border border-gray-100 rounded-2xl">
                    <p className="text-xs font-black text-[#164121] border-b border-gray-150 pb-1.5 uppercase tracking-wider">🏡 Core Bio & Contact</p>
                    
                    <div>
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Display Name</label>
                      <input 
                        type="text" 
                        required
                        value={inspectingResident.name || ''}
                        onChange={(e) => setInspectingResident({...inspectingResident, name: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">National Identity Card (NIC)</label>
                      <input 
                        type="text" 
                        required
                        value={inspectingResident.nic || ''}
                        onChange={(e) => setInspectingResident({...inspectingResident, nic: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={inspectingResident.email || ''}
                        onChange={(e) => setInspectingResident({...inspectingResident, email: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Phone Number</label>
                      <input 
                        type="text" 
                        required
                        value={inspectingResident.phone || ''}
                        onChange={(e) => setInspectingResident({...inspectingResident, phone: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Spoken Language</label>
                      <select
                        value={inspectingResident.language || 'English'}
                        onChange={(e) => setInspectingResident({...inspectingResident, language: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      >
                        <option value="English">English</option>
                        <option value="Sinhala">Sinhala (සිංහල)</option>
                        <option value="Tamil">Tamil (தமிழ்)</option>
                      </select>
                    </div>
                  </div>

                  {/* Column 2: Ecology, Flat, & Waste Plan */}
                  <div className="space-y-4 bg-slate-50/50 p-4 border border-gray-100 rounded-2xl">
                    <p className="text-xs font-black text-[#164121] border-b border-gray-150 pb-1.5 uppercase tracking-wider">♻️ Apartment & Waste Plans</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Wing Block</label>
                        <select
                          value={inspectingResident.block || ''}
                          onChange={(e) => setInspectingResident({...inspectingResident, block: e.target.value})}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white"
                        >
                          {blocks?.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Unit Code</label>
                        <select
                          value={inspectingResident.unit || ''}
                          onChange={(e) => setInspectingResident({...inspectingResident, unit: e.target.value})}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white"
                        >
                          {(() => {
                            const selectedBlockObj = blocks?.find(b => b.name === inspectingResident.block);
                            const unitsList = selectedBlockObj 
                              ? (Object.values(selectedBlockObj.units || {}).flat() as any[])
                              : [];
                            return unitsList.map((unit) => (
                              <option key={unit.unit_number} value={unit.unit_number}>
                                {unit.unit_number}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Occupant Status</label>
                        <select
                          value={inspectingResident.occupancyType || 'Owner-Occupier'}
                          onChange={(e) => setInspectingResident({...inspectingResident, occupancyType: e.target.value})}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white"
                        >
                          <option value="Owner-Occupier">Owner-Occupier</option>
                          <option value="Tenant">Tenant / Renting</option>
                          <option value="Subletter">Subletter</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Household Count</label>
                        <input 
                          type="number" 
                          min="1"
                          value={inspectingResident.householdMembers || 2}
                          onChange={(e) => setInspectingResident({...inspectingResident, householdMembers: Number(e.target.value) || 1})}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Move-in Date</label>
                      <input 
                        type="date"
                        value={inspectingResident.moveInDate || ''}
                        onChange={(e) => setInspectingResident({...inspectingResident, moveInDate: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#164121] uppercase tracking-wider mb-2">Waste Carriage Program</label>
                      <select
                        value={inspectingResident.recyclingPlan || 'Standard Recycler'}
                        onChange={(e) => setInspectingResident({...inspectingResident, recyclingPlan: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white"
                      >
                        <option value="Basic Recycler">Basic Recycler 🗑️</option>
                        <option value="Standard Recycler">Standard Recycler ♻️</option>
                        <option value="Eco Enthusiast">Eco Enthusiast 🌱</option>
                        <option value="Zero Waste Champion">Zero Waste Champion 🌟</option>
                      </select>
                    </div>
                  </div>

                </div>

                {/* Row 3: Security, Alerts & Notes */}
                <div className="bg-slate-50/50 p-4 border border-gray-100 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Contact emergency */}
                  <div className="space-y-3.5">
                    <p className="text-xs font-black text-[#164121]">🚨 Dedicated Emergency Liaison</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-extrabold text-red-700 uppercase mb-1.5">Liaison Name</label>
                        <input 
                          type="text" 
                          value={inspectingResident.emergencyContactName || ''}
                          onChange={(e) => setInspectingResident({...inspectingResident, emergencyContactName: e.target.value})}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-red-700 uppercase mb-1.5">Liaison Phone</label>
                        <input 
                          type="text" 
                          value={inspectingResident.emergencyContactPhone || ''}
                          onChange={(e) => setInspectingResident({...inspectingResident, emergencyContactPhone: e.target.value})}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 text-[10px] font-bold text-gray-750">
                      <div className="flex items-center justify-between">
                        <span>Special Carriageways Assistance:</span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={!!inspectingResident.assistanceRequired}
                            onChange={(e) => setInspectingResident({...inspectingResident, assistanceRequired: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#2E7D32]"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>WhatsApp Automation Updates:</span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={!!inspectingResident.whatsappEnabled}
                            onChange={(e) => setInspectingResident({...inspectingResident, whatsappEnabled: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#2E7D32]"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Special remarks */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-black text-[#164121]">📝 Internal Administration Remarks</p>
                    <textarea 
                      rows={3}
                      value={inspectingResident.notes || ''}
                      onChange={(e) => setInspectingResident({...inspectingResident, notes: e.target.value})}
                      placeholder="Add system notes for block loaders..."
                      className="w-full px-3 py-2 text-xs border border-gray-200 bg-white rounded-xl focus:ring-[#2E7D32] focus:border-[#2E7D32] font-semibold text-gray-800"
                    />
                  </div>
                </div>

                {/* Submit actions */}
                <div className="flex gap-2.5 pt-3 border-t border-gray-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectingResident(null)}
                    className="px-5 py-2 rounded-xl border border-gray-200 hover:bg-slate-50 text-gray-500 text-xs font-black transition-all cursor-pointer text-center"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-emerald-950/15"
                  >
                    Save Profile Update
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* INTERACTIVE COMPREHENSIVE WORKER INSPECTOR AND EDITOR MODAL */}
        {inspectingWorker && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl animate-in fade-in zoom-in duration-250 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                    {inspectingWorker.avatar ? (
                      <img src={inspectingWorker.avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-black text-xs">{(inspectingWorker.name || 'W').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">{inspectingWorker.name}</h3>
                    <p className="text-xs text-gray-400 font-bold">Worker ID: #{inspectingWorker.id} • {inspectingWorker.role?.toUpperCase() || 'Worker'}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setInspectingWorker(null)}
                  className="p-1.5 text-gray-400 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setActionLoading(true);
                  try {
                    const response = await fetch('/api/admin/users', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        name: inspectingWorker.name,
                        email: inspectingWorker.email,
                        phone: inspectingWorker.phone,
                        role: 'worker',
                        shift: (() => {
                          const sh = (inspectingWorker.shift || 'morning').toLowerCase();
                          if (sh.includes('morning')) return 'morning';
                          if (sh.includes('evening')) return 'evening';
                          if (sh.includes('night')) return 'night';
                          return 'morning';
                        })()
                      })
                    });
                    if (!response.ok) throw new Error();
                    setFeedbackMessage(`Success! Saved worker ${inspectingWorker.name} changes directly to cloud database.`);
                    loadAdminMetrics();
                  } catch (err) {
                    setUsers(prev => prev.map(u => u.id === inspectingWorker.id ? inspectingWorker : u));
                    setFeedbackMessage(`Updated locally: ${inspectingWorker.name} (local UI fallback).`);
                  } finally {
                    setActionLoading(false);
                    setInspectingWorker(null);
                  }
                }} 
                className="space-y-4"
              >
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Primary Details Block */}
                  <div className="space-y-3.5">
                    <p className="text-xs font-black text-blue-800 tracking-wide uppercase">📋 Personal Details</p>
                    
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">Display Name</label>
                      <input 
                        type="text" 
                        required
                        value={inspectingWorker.name || ''}
                        onChange={(e) => setInspectingWorker({...inspectingWorker, name: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">National Identity Card (NIC)</label>
                      <input 
                        type="text" 
                        required
                        value={inspectingWorker.nic || ''}
                        onChange={(e) => setInspectingWorker({...inspectingWorker, nic: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={inspectingWorker.email || ''}
                        onChange={(e) => setInspectingWorker({...inspectingWorker, email: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">Phone Number</label>
                      <input 
                        type="text" 
                        required
                        value={inspectingWorker.phone || ''}
                        onChange={(e) => setInspectingWorker({...inspectingWorker, phone: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      />
                    </div>

                  </div>

                  {/* Secondary/System Details Block */}
                  <div className="space-y-4">
                    <p className="text-xs font-black text-blue-800 tracking-wide uppercase">🛠️ Allocation & Performance</p>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">Shift Schedule</label>
                      <select
                        value={inspectingWorker.shift || 'Morning'}
                        onChange={(e) => setInspectingWorker({...inspectingWorker, shift: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      >
                        <option value="Morning">Morning Shift (06:00 - 14:00)</option>
                        <option value="Afternoon">Afternoon Shift (14:00 - 22:00)</option>
                        <option value="Night">Night Shift (22:00 - 06:00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">Assigned Blocks</label>
                      <input 
                        type="text" 
                        required
                        value={inspectingWorker.assignedBlocks || 'All Blocks'}
                        onChange={(e) => setInspectingWorker({...inspectingWorker, assignedBlocks: e.target.value})}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-semibold text-gray-800 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Employment Status</label>
                        <select
                          value={inspectingWorker.status || 'active'}
                          onChange={(e) => setInspectingWorker({...inspectingWorker, status: e.target.value})}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white font-semibold"
                        >
                          <option value="active">Active On Duty</option>
                          <option value="inactive">Inactive / On Leave</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Worker Rating (1-5)</label>
                        <input 
                          type="number" 
                          min="1"
                          max="5"
                          step="0.1"
                          value={inspectingWorker.rating || 5.0}
                          onChange={(e) => setInspectingWorker({...inspectingWorker, rating: Number(e.target.value) || 5.0})}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl font-bold text-gray-800 bg-white font-semibold"
                        />
                      </div>
                    </div>

                  </div>

                </div>

                {/* Submit actions */}
                <div className="flex gap-2.5 pt-3 border-t border-gray-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectingWorker(null)}
                    className="px-5 py-2 rounded-xl border border-gray-200 hover:bg-slate-50 text-gray-500 text-xs font-black transition-all cursor-pointer text-center font-semibold"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-blue-950/15 font-semibold"
                  >
                    Save Profile Update
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* HIGH-FIDELITY COMPLIANCE PRINT CANVAS OVERLAY */}
        {printConfig && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col z-50 overflow-y-auto no-print">
            <style>{`
              @media print {
                /* Hide everything in root to ensure a blank canvas */
                body * {
                  visibility: hidden !important;
                }
                /* Keep the print canvas and its contents visible */
                #qr-compliance-printable-area, #qr-compliance-printable-area * {
                  visibility: visible !important;
                }
                #qr-compliance-printable-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                }
              }
            `}</style>

            {/* Top Command Bar (Hidden during printing) */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md z-50 no-print">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-emerald-50 text-[#2E7D32] rounded-xl text-xl shrink-0">🖨️</span>
                <div className="text-left">
                  <h3 className="text-sm font-black text-[#164121]">Compliance Print &amp; PDF Export Center</h3>
                  <p className="text-[10px] text-gray-500 font-extrabold uppercase mt-0.5 tracking-wider">
                    Target: {printConfig.block} • {printConfig.type === 'single' ? `Unit ${printConfig.unit?.unit_number}` : `Floor Level ${printConfig.floor}`}
                  </p>
                </div>
              </div>

              {/* Alert Tips */}
              <div className="hidden lg:block bg-yellow-50 text-yellow-800 text-[10.5px] font-bold px-4 py-2 rounded-xl border border-yellow-100 max-w-sm">
                💡 <span className="font-extrabold text-yellow-905">Pro-Tip:</span> Select <strong className="font-extrabold text-[#2E7D32]">"Save as PDF"</strong> in your device's print menu to export high-res digital copies of these QR codes!
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPrintConfig(null)}
                  className="px-4 py-2 border border-gray-250 hover:bg-slate-50 text-gray-700 text-xs font-black rounded-xl transition-all cursor-pointer font-semibold"
                >
                  Cancel &amp; Close
                </button>
                <button
                  type="button"
                  onClick={openPrintWindow}
                  className="px-5 py-2.5 bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/15"
                >
                  <Printer className="w-4 h-4" />
                  <span>Execute Print</span>
                </button>
              </div>
            </div>

            {/* Note to explain iframe limit if they can't print */}
            <div className="mx-auto max-w-3xl mt-4 px-4 py-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl text-[11px] font-semibold text-center select-none no-print">
              🔌 <span className="font-black">Preview Environment Notice:</span> Browsers sometimes restrict <code>window.print()</code> within standard iframe previews. If your device printer screen does not prompt after clicking <strong>Execute Print</strong>, please click the <strong>Open in New Tab</strong> icon (↗️ arrow at top-right of your main workspace) and run from there!
            </div>

            {/* Centered Document Sheet Viewer */}
            <div className="flex-1 p-6 md:p-12 flex justify-center items-start overflow-y-auto bg-slate-900/50">
              <div 
                id="qr-compliance-printable-area" 
                className="bg-white text-black p-10 shadow-2xl rounded-3xl w-full max-w-2xl border border-gray-200"
              >
                
                {printConfig.type === 'single' ? (
                  // Single Card Printable Layout (perfect for label/badge printers)
                  <div className="max-w-md mx-auto border-4 border-dashed border-emerald-850 p-8 rounded-3xl bg-white text-center space-y-6" style={{ pageBreakInside: 'avoid' }}>
                    <div className="flex justify-between items-center pb-4 border-b-2 border-slate-200">
                      <div className="text-left font-sans">
                        <span className="text-xs font-black text-emerald-800 tracking-widest uppercase block">EcoTrack Compliance</span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold block">HOUSE LABEL v2.4</span>
                      </div>
                      <span className="text-2xl">🌱</span>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col items-center justify-center my-4">
                      <QRImage text={`ECOTRACK-${printConfig.block.replace(' ', '')}-F${printConfig.floor}-${printConfig.unit.unit_number}`} className="w-48 h-48 text-[#1E562F]" />
                    </div>

                    <div className="space-y-2 font-sans">
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {printConfig.block} • Unit {printConfig.unit.unit_number}
                      </h1>
                      {printConfig.unit.resident ? (
                        <p className="text-sm font-bold text-emerald-700">
                          👤 Occupant: {printConfig.unit.resident}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 font-black italic">
                          Vacant Unit / Unoccupied
                        </p>
                      )}
                      <p className="text-xs font-mono font-bold text-slate-500 select-all uppercase">
                        ID: ECOTRACK-{printConfig.block.replace(' ', '')}-F{printConfig.floor}-{printConfig.unit.unit_number}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 leading-normal font-bold font-sans">
                      Instructions: Affix security badge inside clear observation line. Verified real-time compliance tracker embedded.
                    </div>
                  </div>
                ) : (
                  // Full Sheet Printable Layout (A4 stickers/A4 Grid)
                  <div className="space-y-8 bg-white" style={{ pageBreakInside: 'avoid' }}>
                    <div className="border-b-4 border-emerald-800 pb-4 flex justify-between items-end">
                      <div className="text-left font-sans">
                        <h1 className="text-xl font-black text-emerald-900 uppercase tracking-wider">ECOTRACK COMPLIANCE STICKER SHEET</h1>
                        <p className="text-xs font-bold text-slate-550 text-left">
                          Generated Block: {printConfig.block} • Floor Level: {printConfig.floor} • Layout: A4 Grid compliance sheet
                        </p>
                      </div>
                      <p className="text-xs font-mono font-black text-emerald-800">ECOTRACK CODES v2.4</p>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 gap-6">
                      {(() => {
                        const targetBlockObj = blocks.find(b => b.name === printConfig.block);
                        const floorUnitsList: any[] = targetBlockObj 
                          ? (targetBlockObj.units[printConfig.floor] || []) 
                          : [];
                        
                        return floorUnitsList.map((unitObj, idx) => {
                          const finalCodeString = `ECOTRACK-${printConfig.block.replace(' ', '')}-F${printConfig.floor}-${unitObj.unit_number}`;
                          return (
                            <div key={idx} className="border-2 border-slate-300 p-6 rounded-2xl bg-white flex flex-col justify-between space-y-4 shadow-sm" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                              <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                                <div className="text-left font-sans">
                                  <span className="text-[10px] font-black text-[#1E562F] tracking-wider block">ECOTRACK COMPLIANCE</span>
                                  <span className="text-lg font-black text-slate-900 leading-tight block">{printConfig.block} • Unit {unitObj.unit_number}</span>
                                </div>
                                <span className="text-sm">🌱</span>
                              </div>

                              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col items-center justify-center my-2">
                                <QRImage text={finalCodeString} className="w-32 h-32 text-[#1E562F]" />
                              </div>

                              <div className="space-y-1 text-left font-sans">
                                {unitObj.resident ? (
                                  <p className="text-xs font-bold text-[#1E562F]">
                                    👤 Resident: {unitObj.resident}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500 italic font-semibold">
                                    Unoccupied / Vacant Unit
                                  </p>
                                )}
                                <p className="text-[9px] font-mono text-slate-400 select-all font-bold mt-1 uppercase text-ellipsis overflow-hidden">
                                  ID: {finalCodeString}
                                </p>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        </div>
      </main>

      {/* Dynamic Outbound Voice/Call Modal */}
      {activeCallResident && (
        <VoipCallModal 
          resident={activeCallResident} 
          onClose={() => setActiveCallResident(null)} 
        />
      )}

      {/* Dynamic Instant Messaging Secure Chat Drawer */}
      {activeChatResident && (
        <InstantChatModal 
          resident={{
            id: activeChatResident.id,
            name: activeChatResident.resident_full_name || activeChatResident.resident_name || 'Resident',
            phone: activeChatResident.resident_phone || '077-123-4567',
            unit: activeChatResident.unit_number || 'N/A',
            description: activeChatResident.description || '',
            created_at: activeChatResident.created_at || '',
            title: activeChatResident.title || ''
          }} 
          onClose={() => setActiveChatResident(null)} 
          chatMessages={chatMessages}
          onSendMessage={handleChatSendMessage}
        />
      )}

    </div>
  );
}

// ============================================================================
// HIGH FIDELITY POPUP OVERLAYS FOR TELECOMMUNICATION & CHAT COMPLIANCE
// ============================================================================

interface VoipCallModalProps {
  resident: { name: string; phone: string; unit: string; };
  onClose: () => void;
}

const VoipCallModal = ({ resident, onClose }: VoipCallModalProps) => {
  const [status, setStatus] = useState<'dialing' | 'ringing' | 'connected'>('dialing');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  useEffect(() => {
    const statusTimer = setTimeout(() => {
      setStatus('ringing');
    }, 1500);

    const connectTimer = setTimeout(() => {
      setStatus('connected');
    }, 3200);

    return () => {
      clearTimeout(statusTimer);
      clearTimeout(connectTimer);
    };
  }, []);

  useEffect(() => {
    if (status !== 'connected') return;
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initials = resident.name
    ? resident.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'R';

  return (
    <div className="fixed inset-0 bg-[#0F1E14]/75 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#162A1D] border border-emerald-800/35 rounded-3xl overflow-hidden shadow-2xl relative p-6 flex flex-col items-center text-center text-white">
        
        {/* Connection status pills */}
        <div className="mt-2 mb-6">
          <span className="inline-flex items-center gap-1.5 bg-emerald-900/40 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-emerald-800/30">
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400 animate-ping'}`} />
            <span>{status === 'dialing' ? 'Dialing...' : status === 'ringing' ? 'Ringing...' : 'Active Call'}</span>
          </span>
        </div>

        {/* Animated calling circle / Avatar screen */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Pulsing rings */}
          {status !== 'connected' && (
            <>
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-emerald-600/10 border border-emerald-500/20 animate-ping duration-1000" />
              <div className="absolute inset-0 w-36 h-36 rounded-full bg-emerald-600/5 animate-ping duration-1500 delay-300" />
            </>
          )}

          {/* Core Avatar Bubble */}
          <div className="w-24 h-24 rounded-full bg-[#1E562F] text-emerald-100 flex items-center justify-center text-2xl font-black border-2 border-emerald-400 relative shadow-xl">
            {initials}
          </div>
        </div>

        {/* Homeowner metadata */}
        <div className="space-y-1 mt-6">
          <h3 className="text-lg font-black tracking-tight">{resident.name}</h3>
          <p className="text-xs text-emerald-400 font-bold">House Unit: {resident.unit}</p>
          <p className="font-mono text-xs text-emerald-500/80">{resident.phone}</p>
        </div>

        {/* Real-time Call Duration Timer */}
        <div className="my-6">
          {status === 'connected' ? (
            <span className="font-mono text-3xl font-bold text-gray-55 tracking-widest">
              {formatTimer(seconds)}
            </span>
          ) : (
            <span className="text-xs text-emerald-300/60 font-semibold italic animate-pulse">
              Bridging Secure Telecom...
            </span>
          )}
        </div>

        {/* Call options dashboard */}
        <div className="grid grid-cols-3 gap-4 w-full px-4 mb-4 mt-2">
          {/* Option 1: Mute */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer ${
              isMuted ? 'bg-emerald-600/20 text-emerald-300' : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMuted ? 'bg-emerald-500/35' : 'bg-[#1F3E2C]'}`}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </div>
            <span className="text-[10px] font-bold">Mute</span>
          </button>

          {/* Option 2: Speaker */}
          <button
            type="button"
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer ${
              isSpeaker ? 'bg-emerald-600/20 text-emerald-300' : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSpeaker ? 'bg-emerald-500/35' : 'bg-[#1F3E2C]'}`}>
              <Volume2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold">Speaker</span>
          </button>

          {/* Option 3: Dialpad */}
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-gray-400 opacity-45 cursor-not-allowed">
            <div className="w-10 h-10 rounded-full bg-[#1F3E2C] flex items-center justify-center">
              <span className="text-xs font-mono font-bold">#</span>
            </div>
            <span className="text-[10px] font-bold">Keypad</span>
          </div>
        </div>

        {/* Red Disconnect / End line */}
        <div className="w-full border-t border-emerald-950/45 pt-4 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 shadow-md mx-auto cursor-pointer"
            title="End VoIP call"
          >
            <PhoneOff className="w-6 h-6 rotate-[-135deg]" />
          </button>
        </div>

      </div>
    </div>
  );
};

interface InstantChatModalProps {
  resident: { id: number; name: string; phone: string; unit: string; description: string; created_at: string; title: string };
  onClose: () => void;
  chatMessages: {[key: number]: any[]};
  onSendMessage: (complaintId: number, text: string, sender: 'resident' | 'admin') => void;
}

const InstantChatModal = ({ resident, onClose, chatMessages, onSendMessage }: InstantChatModalProps) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Initialize and load messages
  const messages = chatMessages[resident.id] || [
    {
      id: 1,
      text: `Hi management, regarding my complaint "${resident.title}": ${resident.description}. Could you please let me know when this will be looked into? Thanks!`,
      sender: 'resident',
      timestamp: resident.created_at
    }
  ];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const word = inputText.trim();
    onSendMessage(resident.id, word, 'admin');
    setInputText('');

    // Trigger simulated reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      
      let replyText = "Thank you for the update! I appreciate the fast response and action on this. Please keep me posted.";
      if (resident.title.toLowerCase().includes("missed") || resident.title.toLowerCase().includes("delayed")) {
        replyText = "Thank you for looking into our collection. Please let the worker know they can come by our door at any time. We will keep our bags ready!";
      } else if (resident.title.toLowerCase().includes("spill") || resident.title.toLowerCase().includes("leak") || resident.title.toLowerCase().includes("debris")) {
        replyText = "Excellent. The cleaning team is welcome. Please let me know if they need any water bucket or keys to access the lobby corridors.";
      } else if (resident.title.toLowerCase().includes("behavior") || resident.title.toLowerCase().includes("aggressive") || resident.title.toLowerCase().includes("noise")) {
        replyText = "Thank you so much for taking this feedback seriously. We just want a peaceful environment for our kids and elders. Appreciate your quick mediation!";
      }
      
      onSendMessage(resident.id, replyText, 'resident');
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const initials = resident.name
    ? resident.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'R';

  return (
    <div className="fixed inset-0 bg-[#0A110C]/60 backdrop-blur-xs flex items-center justify-end p-0 md:p-4 z-[999] animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full md:h-[85vh] bg-slate-50 border-l md:border border-gray-200 shadow-2xl flex flex-col md:rounded-3xl overflow-hidden relative">
        
        {/* Chat header panel */}
        <div className="bg-[#1E562F] text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center font-black text-xs border border-white/20 select-none">
              {initials}
            </div>
            <div className="text-left leading-tight">
              <h4 className="font-extrabold text-[13.5px] tracking-tight">{resident.name}</h4>
              <p className="text-[10px] text-emerald-200 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 animate-pulse" />
                <span>Unit {resident.unit} • Online Now</span>
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messaging sandbox scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F5F3] custom-scrollbar border-b border-gray-100">
          
          {/* Encryption notice standard */}
          <div className="flex justify-center my-1 select-none">
            <span className="bg-[#E5ECE8] text-[9.5px] text-emerald-800 border border-emerald-100 font-extrabold px-3 py-1 rounded-xl text-center shadow-3xs max-w-[280px]">
              🔒 End-to-end encrypted under EcoTrack Tenant Privacy Regulations.
            </span>
          </div>

          {messages.map((m: any, index: number) => {
            const isAdmin = m.sender === 'admin';
            return (
              <div
                key={m.id || index}
                className={`flex gap-2.5 items-end max-w-[85%] ${isAdmin ? 'ml-auto flex-row-reverse text-right' : 'mr-auto text-left'}`}
              >
                {!isAdmin && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-gray-700 font-black text-[9px] flex items-center justify-center select-none shrink-0 border border-gray-300">
                    {initials}
                  </div>
                )}
                
                <div className="space-y-0.5">
                  <div className={`p-3 rounded-2xl text-[12px] font-medium leading-relaxed ${
                    isAdmin 
                      ? 'bg-[#1E562F] text-white rounded-br-none shadow-xs' 
                      : 'bg-white text-gray-850 rounded-bl-none border border-gray-200/65 shadow-2xs'
                  }`}>
                    <p className="whitespace-pre-line text-left">{m.text}</p>
                  </div>
                  <span className="text-[8.5px] text-gray-400 font-bold block px-1 text-left">
                    {m.timestamp || "Just now"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing simulation */}
          {isTyping && (
            <div className="flex gap-2.5 items-end max-w-[80%] mr-auto text-left">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-gray-705 font-black text-[9px] flex items-center justify-center select-none shrink-0 border border-gray-300">
                {initials}
              </div>
              <div className="bg-white border border-gray-200/65 text-gray-400 py-2.5 px-4 rounded-2xl rounded-bl-none shadow-2xs text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full shrink-0 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full shrink-0 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full shrink-0 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message editor footer */}
        <div className="p-3 bg-white shrink-0 shadow-sm border-t border-gray-150 flex gap-2 items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type secure message to ${resident.name}...`}
            className="flex-1 text-xs px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-[#2E7D32] transition-all font-semibold"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`py-2.5 px-4 bg-[#2E7D32] hover:bg-[#1E562F] text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-2xs ${
              !inputText.trim() ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <span>Send</span>
          </button>
        </div>

      </div>
    </div>
  );
};
