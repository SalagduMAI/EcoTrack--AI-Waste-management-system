import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, SendHorizontal, ThumbsUp, ThumbsDown, CreditCard, Calendar, BarChart3, 
  HelpCircle, AlertTriangle, Star, Check, Sparkles, ChevronRight, Loader2, Info, 
  Banknote, ShieldAlert, Home, History as HistoryIcon, Trash2, RefreshCw, Leaf, Zap, Heart, 
  Clock, Package, Flag, Bell, User, Search, Eye, LogOut, CheckCircle, CheckCircle2, Download, 
  ArrowRight, Play, X, Compass, Award, Building, Mail, Phone, MapPin, MessageSquare,
  Armchair, Tv, Wrench, Grid, Printer, FileDown, Lock, TrendingDown, CalendarRange,
  Truck, Megaphone, Globe, Pencil, Camera
} from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';

interface ResidentPortalProps {
  token: string;
  user?: any;
  onLogout: () => void;
  onUserUpdate?: (freshUser: any) => void;
}

interface ChatMessage {
  id: number | string;
  sender: 'user' | 'bot';
  text: string;
  logId?: number;
  selectedFeedback?: 'helpful' | 'not_helpful';
  confidence?: number;
  isUnsure?: boolean;
}

export default function ResidentPortal({ token, user, onLogout, onUserUpdate }: ResidentPortalProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'bulk' | 'billing' | 'chatbot' | 'complaints' | 'notifications' | 'profile'>('home');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isReminderSet, setIsReminderSet] = useState(true);
  const [showLiveTracker, setShowLiveTracker] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [showReceipt, setShowReceipt] = useState<any | null>(null);
  const [isNotifPopupOpen, setIsNotifPopupOpen] = useState(false);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [viewingHistoryDetail, setViewingHistoryDetail] = useState<any | null>(null);
  const [notifFilter, setNotifFilter] = useState<'all' | 'collection' | 'payment' | 'announcement' | 'rating'>('all');
  const [selectedNotifDetail, setSelectedNotifDetail] = useState<any | null>(null);
  const [notifRatingStars, setNotifRatingStars] = useState<number>(5);
  const [notifRated, setNotifRated] = useState<boolean>(false);
  
  // Dynamic User Profile States - Initialized with screenshot defaults or logged-in user details
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profile_photo_url || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileLanguage, setProfileLanguage] = useState('English');
  const [profileNotifPref, setProfileNotifPref] = useState('Push + Email');
  const [profileSavedCard, setProfileSavedCard] = useState(user?.email === 'amanthasal@gmail.com' ? 'Visa **4821' : 'No Card Linked');
  const [profileUnit, setProfileUnit] = useState('Not Assigned');
  const [profileBlock, setProfileBlock] = useState('None');
  const [profileFloor, setProfileFloor] = useState<number | string>('None');
  const [profilePassword, setProfilePassword] = useState('password123'); // raw value for internal use
  const [showPasswordRaw, setShowPasswordRaw] = useState(false);

  // States for Profile Overlay modals
  const [activeProfileModal, setActiveProfileModal] = useState<'edit' | 'language' | 'notifications' | 'cards' | 'password' | 'help' | 'about' | null>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  // Dynamic profile calculation helpers
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'AR';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getShortName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'Amaya R.';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Optimistic local preview update
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfileImage(reader.result);
        }
      };
      reader.readAsDataURL(file);

      setActionLoading(true);
      setMessage(null);
      try {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch('/api/profile/photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          body: formData
        });

        const data = await response.json();
        if (response.ok && data.status === 'success') {
          const finalUrl = data.data.profile_photo_path 
            ? `/storage/${data.data.profile_photo_path}` 
            : (data.data.profile_photo_url.startsWith('http') 
                ? new URL(data.data.profile_photo_url).pathname 
                : data.data.profile_photo_url);

          setProfileImage(finalUrl);

          if (user && onUserUpdate) {
            onUserUpdate({
              ...user,
              profile_photo_url: finalUrl
            });
          }
          setMessage("Profile picture changed and saved successfully! 🌿");
        } else {
          console.error("Failed to upload profile photo:", data);
          // Revert optimistic preview on failure
          setProfileImage(user?.profile_photo_url || '');
          
          let errorMsg = data.message || 'Validation error';
          if (data.errors) {
            const errorDetails = Object.values(data.errors).flat().join(' ');
            if (errorDetails) {
              errorMsg = `${errorMsg}: ${errorDetails}`;
            }
          }
          setMessage(`Upload failed: ${errorMsg}`);
        }
      } catch (err) {
        console.error("Error uploading profile photo:", err);
        setMessage("Connection error. Profile picture could not be saved to server.");
      } finally {
        setActionLoading(false);
      }
    }
  };
  
  // Interactive Custom Special Pickup states representing the 5-step user experience
  const [specialStep, setSpecialStep] = useState<'form' | 'estimate' | 'checkout' | 'success' | 'failed' | 'receipt'>('form');
  const [specialCategory, setSpecialCategory] = useState<'Furniture' | 'E-Waste' | 'Construction' | 'Other'>('Furniture');
  const [specialDescription, setSpecialDescription] = useState('Old sofa, 3-seater');
  const [specialWeight, setSpecialWeight] = useState('45');
  const [specialDate, setSpecialDate] = useState('2026-05-13');
  const [specialPhotoName, setSpecialPhotoName] = useState<string | null>(null);
  const [specialCardNumber, setSpecialCardNumber] = useState('4321 4567 8910 4821');
  const [specialCardExpiry, setSpecialCardExpiry] = useState('12 / 28');
  const [specialCardCvv, setSpecialCardCvv] = useState('333');
  const [specialCardName, setSpecialCardName] = useState('A. Rajapaksa');
  
  // Home tab Scenario Simulation state
  const [homeSimulationMode, setHomeSimulationMode] = useState<'active_tracker' | 'normal_caught_up' | 'offline_pending'>('active_tracker');

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Top solid branding accent bar
    doc.setFillColor(30, 77, 43); // #1E4D2B
    doc.rect(0, 0, 210, 8, 'F');

    // Title / Brand Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(30, 77, 43);
    doc.text('EcoTrack', 20, 25);

    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text('Payment Receipt', 20, 32);

    // Line separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    // Meta details grid (2 columns)
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('RECEIPT NO:', 20, 48);
    doc.setTextColor(30, 30, 30);
    doc.setFont('Helvetica', 'bold');
    doc.text('R-294821', 55, 48);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('RESIDENT:', 20, 54);
    doc.setTextColor(30, 30, 30);
    doc.setFont('Helvetica', 'bold');
    doc.text(profileName, 55, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('UNIT:', 20, 60);
    doc.setTextColor(30, 30, 30);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${profileUnit}, Greenfield`, 55, 60);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('DATE:', 120, 48);
    doc.setTextColor(30, 30, 30);
    doc.setFont('Helvetica', 'bold');
    doc.text(specialDate || '2026-05-13', 150, 48);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('METHOD:', 120, 54);
    doc.setTextColor(30, 30, 30);
    doc.setFont('Helvetica', 'bold');
    doc.text(`PayHere (Visa ****${specialCardNumber ? specialCardNumber.slice(-4) : '4821'})`, 150, 54);

    // Line separator
    doc.line(20, 68, 190, 68);

    // Table header
    doc.setFillColor(244, 248, 245);
    doc.rect(20, 74, 170, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 77, 43);
    doc.text('ITEM DESCRIPTION', 23, 79);
    doc.text('AMOUNT (LKR)', 155, 79);

    const baseFees = { Furniture: 1500, 'E-Waste': 1200, Construction: 2500, Other: 1000 };
    const currentBaseFee = baseFees[specialCategory] || 1500;
    const weightVal = parseFloat(specialWeight) || 0;
    const surchargeFee = Math.round(weightVal * 25);
    const priorityFee = 200;
    const ecoDiscount = 25;
    const subTotal = currentBaseFee + surchargeFee;
    const grandTotal = subTotal + priorityFee - ecoDiscount;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    // Row 1: Special Pickup
    doc.text(`Special Pickup - ${specialCategory} (${specialDescription})`, 23, 91);
    doc.text(`LKR ${subTotal.toLocaleString()}`, 155, 91);

    // Row 2: Priority Fee
    doc.text('Same-week Priority pickup fee', 23, 98);
    doc.text(`LKR ${priorityFee.toLocaleString()}`, 155, 98);

    // Row 3: Eco Recycling discount
    doc.setTextColor(30, 120, 50);
    doc.text('Eco-recycle sorting discount', 23, 105);
    doc.text(`-LKR ${ecoDiscount.toLocaleString()}`, 155, 105);

    // Line divider
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 112, 190, 112);

    // Total Paid Row
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 77, 43);
    doc.text('TOTAL PAID', 23, 121);
    doc.text(`LKR ${grandTotal.toLocaleString()}.00`, 155, 121);

    // Bottom Eco Seal Note
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Computer-generated receipt • Thank you for using EcoTrack Greenfield', 105, 138, { align: 'center' });

    // Save the PDF
    doc.save(`EcoTrack-Receipt-R-294821.pdf`);
    setMessage("Success: Downloaded printable payment reference PDF invoice!");
  };

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'print-style-override';
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        #printable-receipt-card, #printable-receipt-card * {
          visibility: visible;
        }
        #printable-receipt-card {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          border: none !important;
          box-shadow: none !important;
          padding: 20px !important;
          margin: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    window.print();
    
    setTimeout(() => {
      const override = document.getElementById('print-style-override');
      if (override) {
        override.remove();
      }
    }, 1000);
  };

  // Interactive Custom History Table & Worker Rating state-pair models
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'All' | 'Regular' | 'Special' | 'Unrated'>('All');
  const [historySubView, setHistorySubView] = useState<'list' | 'rate' | 'success'>('list');
  const [historyTargetItem, setHistoryTargetItem] = useState<any | null>(null);
  const [historyRatingStars, setHistoryRatingStars] = useState(4); // 4 stars default shown in second screenshot
  const [historyRatingTags, setHistoryRatingTags] = useState<string[]>(['On time', 'Polite', 'Clean']); // tags highlighted in green in second screenshot
  const [historyRatingText, setHistoryRatingText] = useState('Very punctual and friendly. Thanks!');

  const handleExportCSV = () => {
    try {
      const headers = ['Log ID', 'Date', 'Time', 'Worker', 'Collection Category', 'Status', 'Rating Stars', 'Comment Feedback'];
      const csvRows = [
        headers.join(','),
        ...historyItems.map(item => {
          const logId = `LOG-BA-U301-${item.id}`;
          const date = `"${item.date.replace(/"/g, '""')}"`;
          const time = `"${item.time.replace(/"/g, '""')}"`;
          const worker = `"${item.worker.replace(/"/g, '""')}"`;
          const classType = `"${item.class.replace(/"/g, '""')}"`;
          const status = `"${item.type.replace(/"/g, '""')}"`;
          const rating = item.is_rated ? (item.rating !== null ? item.rating : 'N/A') : 'Unrated';
          const feedback = `"${(item.feedback || '').replace(/"/g, '""')}"`;
          return [logId, date, time, worker, classType, status, rating, feedback].join(',');
        })
      ];
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `collection_history_A301_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage("Success: Combined collection logs exported to CSV spreadsheet downloaded successfully!");
    } catch (e) {
      console.error(e);
      setMessage("Error: Unable to generate CSV file download representation.");
    }
  };

  const handleExportPaymentsCSV = () => {
    try {
      const headers = ['Transaction Date', 'Description', 'Billing Type', 'Amount (LKR)', 'Payment Status', 'Reference Code', 'Payment Method'];
      const csvRows = [
        headers.join(','),
        ...payments.map(item => {
          const dateStr = item.date || item.created_at?.slice(0, 10) || '2026-05-13';
          const descriptionVal = `"${(item.notes || item.description || 'Routine Waste Levy').replace(/"/g, '""')}"`;
          const billingTypeVal = `"${(item.payment_type === 'special_pickup' ? 'Special' : 'Monthly').replace(/"/g, '""')}"`;
          const amountVal = item.amount;
          const statusVal = `"${(item.status || 'paid').toUpperCase()}"`;
          const refCodeVal = `"${(item.reference_code || '').replace(/"/g, '""')}"`;
          const methodVal = `"${(item.payment_method || 'payhere').toUpperCase()}"`;
          return [dateStr, descriptionVal, billingTypeVal, amountVal, statusVal, refCodeVal, methodVal].join(',');
        })
      ];
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `payments_history_A301_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage("Success: Payments and ledger history transaction records exported to CSV spreadsheet downloaded successfully!");
    } catch (e) {
      console.error(e);
      setMessage("Error: Unable to generate payments CSV spreadsheet.");
    }
  };

  const handleDownloadReceiptItemPDF = (paymentItem: any) => {
    if (!paymentItem) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Top solid branding accent bar
      doc.setFillColor(30, 77, 43); // #1E4D2B
      doc.rect(0, 0, 210, 8, 'F');

      // Title / Brand Header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(30, 77, 43);
      doc.text('EcoTrack', 20, 25);

      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text('Payment Receipt', 20, 32);

      // Line separator
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(20, 38, 190, 38);

      // Meta details grid (2 columns)
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('RECEIPT NO:', 20, 48);
      doc.setTextColor(30, 30, 30);
      doc.setFont('Helvetica', 'bold');
      doc.text(paymentItem.reference_code || `R-${paymentItem.id}04821`, 55, 48);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('RESIDENT:', 20, 54);
      doc.setTextColor(30, 30, 30);
      doc.setFont('Helvetica', 'bold');
      doc.text(profileName, 55, 54);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('UNIT:', 20, 60);
      doc.setTextColor(30, 30, 30);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${profileUnit}, Greenfield`, 55, 60);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('DATE:', 120, 48);
      doc.setTextColor(30, 30, 30);
      doc.setFont('Helvetica', 'bold');
      doc.text(paymentItem.date || paymentItem.created_at?.slice(0, 10) || '2026-05-13', 150, 48);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('METHOD:', 120, 54);
      doc.setTextColor(30, 30, 30);
      doc.setFont('Helvetica', 'bold');
      doc.text(paymentItem.payment_method ? paymentItem.payment_method.toUpperCase() : 'PayHere (Visa ****4821)', 150, 54);

      // Line separator
      doc.line(20, 68, 190, 68);

      // Table header
      doc.setFillColor(244, 248, 245);
      doc.rect(20, 74, 170, 8, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 77, 43);
      doc.text('ITEM DESCRIPTION', 23, 79);
      doc.text('AMOUNT (LKR)', 155, 79);

      const subTotal = paymentItem.amount;
      const priorityFee = paymentItem.payment_type === 'special_pickup' ? 200 : 0;
      const ecoDiscount = paymentItem.payment_type === 'special_pickup' ? 25 : 0;
      const grandTotal = subTotal + priorityFee - ecoDiscount;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);

      // Row 1: Description
      doc.text(paymentItem.notes || paymentItem.description || 'EcoTrack Greenfield Maintenance Fee', 23, 91);
      doc.text(`LKR ${subTotal.toLocaleString()}`, 155, 91);

      // Optional Row 2 Priority charge
      if (priorityFee > 0) {
        doc.text('Same-week Priority pickup surcharge', 23, 98);
        doc.text(`LKR ${priorityFee.toLocaleString()}`, 155, 98);
      }
      // Optional Row 3 Eco discount
      if (ecoDiscount > 0) {
        doc.setTextColor(30, 120, 50);
        doc.text('Eco-recycle sorting discount', 23, 105);
        doc.text(`-LKR ${ecoDiscount.toLocaleString()}`, 155, 105);
      }

      // Line divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 112, 190, 112);

      // Total Paid Row
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 77, 43);
      doc.text('TOTAL PAID', 23, 121);
      doc.text(`LKR ${grandTotal.toLocaleString()}.00`, 155, 121);

      // Bottom Eco Seal Note
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Computer-generated receipt • Thank you for using EcoTrack Greenfield', 105, 138, { align: 'center' });

      // Save the PDF
      doc.save(`EcoTrack-Receipt-${paymentItem.reference_code}.pdf`);
      setMessage(`Success: Downloaded printable invoice ${paymentItem.reference_code || ''} PDF!`);
    } catch (e) {
      console.error(e);
      setMessage("Error: Failed to generate PDF document layout.");
    }
  };

  const handlePrintReceiptItem = (paymentItem: any) => {
    setSelectedReceiptPayment(paymentItem);
    setTimeout(() => {
      const style = document.createElement('style');
      style.id = 'print-style-override-dynamic';
      style.innerHTML = `
        @media print {
          body * {
            visibility: hidden;
          }
          #dynamic-printable-receipt-card, #dynamic-printable-receipt-card * {
            visibility: visible;
          }
          #dynamic-printable-receipt-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 20px !important;
            margin: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      window.print();
      
      setTimeout(() => {
        const override = document.getElementById('print-style-override-dynamic');
        if (override) {
          override.remove();
        }
      }, 1000);
    }, 200);
  };

  const greenTips = [
    "Rinse plastic containers before recycling — it prevents contamination of the whole batch.",
    "Place cardboard boxes flat! It decompresses container bin utility corridors by over 70%.",
    "Keep wet organic waste separate from recyclables to block offensive odors and pests.",
    "Always wrap broken glass in thick newspaper before disposal to prevent safety hazards for collectors.",
    "Unplug battery chargers when not in use! They bleed secondary standby power constantly."
  ];

  const [notifications, setNotifications] = useState<any[]>([]);

  // Profile status
  const [unitProfile, setUnitProfile] = useState<any>({
    has_unit: false,
    unit_number: 'Not Assigned',
    qr_code_hash: 'NONE',
    unpaid_balance_lkr: 0,
    pending_bills_count: 0,
    next_pickup: null,
    recent_pickups: []
  });

  // Chatbot states
  const [ecoBotView, setEcoBotView] = useState<'welcome' | 'active' | 'error'>('active');
  const [recentConversations, setRecentConversations] = useState<{
    id: string;
    title: string;
    active: boolean;
    time: string;
    messages: ChatMessage[];
  }[]>([
    {
      id: 'default-session',
      title: 'Eco-Bot Chat',
      active: true,
      time: 'Now',
      messages: [
        {
          id: 'bot-init',
          sender: 'bot' as const,
          text: "Hi " + (user?.name ? user.name.split(' ')[0] : 'Resident') + "! 🌿 I'm Eco-Bot, your Greenfield Residencies system advisor. Ask me anything about waste sorting schedules, payments, or complaints.",
          confidence: 100
        }
      ]
    }
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [botInput, setBotInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [botTyping, setBotTyping] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Billing states
  const [payments, setPayments] = useState<any[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState<any | null>(null);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
  const [billingFilter, setBillingFilter] = useState<'all' | 'monthly' | 'special' | 'refunds'>('all');
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<any | null>(null);

  // Bulk request booking states
  const [bulkBooking, setBulkBooking] = useState({
    category: 'Electronic Waste',
    description: '',
    pickup_date: '2026-05-21',
    shift: 'morning'
  });

  // Complaint states
  const [complaintForm, setComplaintForm] = useState({
    category: 'missed_collection',
    description: '',
    job_id: ''
  });
  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [complaintDate, setComplaintDate] = useState('2026-05-09');
  const [complaintTime, setComplaintTime] = useState('06:30');
  const [complaintWhatHappened, setComplaintWhatHappened] = useState<'not_collected' | 'too_late' | 'wrong_sorting' | 'other'>('not_collected');
  const [complaintDescription, setComplaintDescription] = useState('Bag was kept out at 6:25 AM. No collection happened. This is the second time this month.');
  const [complaintStatusView, setComplaintStatusView] = useState<'form' | 'success'>('form');
  const [lastSubmittedComplaint, setLastSubmittedComplaint] = useState<any | null>(null);
  const [selectedTrackedComplaint, setSelectedTrackedComplaint] = useState<any | null>(null);

  // Rating stars feedback states
  const [pendingRatings, setPendingRatings] = useState<any[]>([]);
  const [activeRatingJob, setActiveRatingJob] = useState<any | null>(null);
  const [stars, setStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // Fetch initial profile indices
  const fetchResidentProfile = async () => {
    setLoading(true);
    try {
      const headers = { 
        'Authorization': `Bearer ${token}`, 
        'Accept': 'application/json',
        'Content-Type': 'application/json' 
      };

      const [dashRes, payRes, compRes, rateRes, timelineRes] = await Promise.all([
        fetch('/api/resident/dashboard', { headers }).catch(() => null),
        fetch('/api/resident/payments', { headers }).catch(() => null),
        fetch('/api/resident/complaints', { headers }).catch(() => null),
        fetch('/api/resident/worker-to-rate', { headers }).catch(() => null),
        fetch('/api/resident/timeline', { headers }).catch(() => null),
      ]);

      const dashData = dashRes && dashRes.ok ? await dashRes.json() : null;
      const payData = payRes && payRes.ok ? await payRes.json() : null;
      const compData = compRes && compRes.ok ? await compRes.json() : null;
      const rateData = rateRes && rateRes.ok ? await rateRes.json() : null;
      const timelineData = timelineRes && timelineRes.ok ? await timelineRes.json() : null;

      if (dashData?.status === 'success') {
        setUnitProfile(dashData.data);
        if (dashData.data && dashData.data.unit_number) {
          setProfileUnit(dashData.data.unit_number);
          setProfileBlock(dashData.data.block_name || 'Block A');
          setProfileFloor(dashData.data.floor_number || 'None');
        }
      }
      
      const DEFAULT_PAYMENTS_MOCK: any[] = [];

      if (payData?.status === 'success') {
        const live = payData.data || [];
        const merged = [...live];
        DEFAULT_PAYMENTS_MOCK.forEach(m => {
          if (!merged.some(l => l.reference_code === m.reference_code || l.id === m.id)) {
            merged.push(m);
          }
        });
        setPayments(merged);
      } else {
        setPayments(DEFAULT_PAYMENTS_MOCK);
      }

      const DEFAULT_COMPLAINTS_MOCK: any[] = [];

      if (compData?.status === 'success') {
        const live = (compData.data || []).map((c: any) => {
          let friendlyCategory = c.category;
          if (c.category === 'missed_collection') friendlyCategory = 'Missed pickup';
          else if (c.category === 'wrong_time') friendlyCategory = 'Late collection';
          else if (c.category === 'other') friendlyCategory = 'Other mishap';
          else if (c.category) {
            friendlyCategory = c.category.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }
          return {
            ...c,
            category: friendlyCategory
          };
        });
        const merged = [...live];
        DEFAULT_COMPLAINTS_MOCK.forEach(m => {
          if (!merged.some(l => l.complaint_code === m.complaint_code || m.id === l.id)) {
            merged.push(m);
          }
        });
        setMyComplaints(merged);
      } else {
        setMyComplaints(DEFAULT_COMPLAINTS_MOCK);
      }

      if (rateData?.status === 'success') {
        setPendingRatings(rateData.data || []);
      } else {
        setPendingRatings([]);
      }

      if (timelineData?.status === 'success') {
        const liveJobs = timelineData.data || [];
        const mappedJobs = liveJobs.map((job: any) => {
          return {
            id: job.id.toString(),
            date: job.scheduled_date ? job.scheduled_date.slice(0, 10) : '',
            time: job.completed_at ? new Date(job.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (job.shift === 'evening' ? 'Evening' : 'Morning'),
            worker: job.worker ? job.worker.name : 'Unassigned',
            code: job.worker ? job.worker.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'UA',
            class: job.shift === 'evening' ? 'Special' : 'Regular',
            type: job.status === 'done' ? 'Done' : (job.status === 'in-progress' ? 'In-Progress' : (job.status === 'missed' ? 'Missed' : 'Pending')),
            rating: job.rating ? job.rating.stars : null,
            feedback: job.rating ? job.rating.comment : '',
            is_rated: job.rating !== null
          };
        });
        setHistoryItems(mappedJobs);
      } else {
        setHistoryItems([]);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidentProfile();
    // Auto-refresh resident timeline and worker status every 30 seconds to update worker details
    const interval = setInterval(() => {
      fetchResidentProfile();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (user) {
      if (user.name) setProfileName(user.name);
      if (user.email) {
        setProfileEmail(user.email);
        setProfileSavedCard(user.email === 'amanthasal@gmail.com' ? 'Visa **4821' : 'No Card Linked');
      }
      if (user.phone) setProfilePhone(user.phone);
      if (user.profile_photo_url) setProfileImage(user.profile_photo_url);
    }
  }, [user]);

  // Scroll chatbot to bottom helper
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Dynamic Calculations for World-Class Premium Experience
  const completedJobs = historyItems.filter(item => item.type === 'Done');
  const totalWasteKg = completedJobs.length > 0 ? completedJobs.length * 7 : 0;
  const recycledKg = completedJobs.length > 0 ? Math.round(completedJobs.length * 2.5 * 10) / 10 : 0;
  const recycleRatePercent = totalWasteKg > 0 ? Math.round((recycledKg / totalWasteKg) * 100) : 0;
  const onTimePercent = completedJobs.length > 0 ? 94 : 0; // standard mock collection rate if jobs exist, else 0

  const paidPayments = payments.filter(p => p.status === 'paid');
  const ytdTotal = paidPayments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  const currentMonthTotal = paidPayments.filter(p => {
    const payDateStr = p.paid_at || p.created_at;
    if (!payDateStr) return false;
    const date = new Date(payDateStr);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  const specialPickupsCountVal = payments.filter(p => 
    p.payment_type === 'special_pickup' || 
    (p.request_type && p.request_type.toLowerCase().includes('special'))
  ).length;

  const yoyTrendPercent = paidPayments.length > 0 ? "8%" : "0%";

  const getFormattedNextPickupDate = () => {
    if (!unitProfile || !unitProfile.next_pickup || !unitProfile.next_pickup.scheduled_date) {
      return 'No Scheduled Pickups';
    }
    const dateStr = unitProfile.next_pickup.scheduled_date;
    if (dateStr.includes('No scheduled')) {
      return 'No Scheduled Pickups';
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getFormattedNextPickupTime = () => {
    if (!unitProfile || !unitProfile.next_pickup || !unitProfile.next_pickup.scheduled_date) {
      return 'None scheduled';
    }
    const shift = unitProfile.next_pickup.shift;
    if (!shift || shift === 'None') return 'None scheduled';
    return shift === 'Morning' ? '6:30 AM' : '2:30 PM';
  };

  // Sync current active recent conversation's messages
  useEffect(() => {
    if (ecoBotView === 'active') {
      const activeConv = recentConversations.find(c => c.active);
      if (activeConv) {
        setChatMessages(activeConv.messages);
      }
    } else if (ecoBotView === 'error') {
      setChatMessages([
        { id: 'err-1', sender: 'user', text: "How do I dispose of batteries?" },
        { id: 'err-2', sender: 'bot', text: "Confidence below 60%. Want me to escalate this to your scheme manager?", isUnsure: true }
      ]);
    }
  }, [ecoBotView, recentConversations]);

  const selectRecentConversation = (id: string) => {
    setRecentConversations(prev => prev.map(c => ({ ...c, active: c.id === id })));
    setEcoBotView('active');
  };

  // Eco-bot conversational send ask
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botInput.trim()) return;

    const userText = botInput;
    const userMsgId = Date.now();
    setBotInput('');
    setBotTyping(true);

    // If currently no active conversation, create one
    let currentActiveId = '';
    const activeConv = recentConversations.find(c => c.active);

    if (!activeConv) {
      const newId = 'conv-' + Date.now();
      currentActiveId = newId;
      const newConvTitle = userText.length > 28 ? userText.substring(0, 25) + '...' : userText;
      const newConv = {
        id: newId,
        title: newConvTitle,
        active: true,
        time: 'Now',
        messages: [
          { id: 'bot-init', sender: 'bot' as const, text: "Hi " + (profileName ? profileName.split(' ')[0] : 'Resident') + "! 🌿 I'm Eco-Bot. Ask me anything about waste sorting, schedules or special pickups.", confidence: 98 },
          { id: userMsgId, sender: 'user' as const, text: userText }
        ]
      };
      setRecentConversations(prev => [newConv, ...prev.map(c => ({ ...c, active: false }))]);
      setEcoBotView('active');
    } else {
      currentActiveId = activeConv.id;
      setRecentConversations(prev => prev.map(c => {
        if (c.id === currentActiveId) {
          return {
            ...c,
            messages: [...c.messages, { id: userMsgId, sender: 'user' as const, text: userText }]
          };
        }
        return c;
      }));
    }

    try {
      const response = await fetch('/api/resident/chatbot/ask', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userText })
      });

      const data = await response.json();
      setBotTyping(false);

      let botReplyText = '';
      let logId: number | undefined = undefined;
      let isUnsure = false;
      let confidence = Math.floor(Math.random() * 8) + 91; // Realistic 91-98%

      if (response.ok && data.status === 'success') {
        const payloadData = data.data || data;
        botReplyText = payloadData.reply || "I'm sorry, I couldn't process that.";
        logId = payloadData.log_id;
        isUnsure = !!payloadData.is_unsure;
        confidence = payloadData.confidence || confidence;

        // If a ticket was created by the backend automatically
        if (payloadData.ticket_created && payloadData.ticket_details) {
          const tDetails = payloadData.ticket_details;
          setMyComplaints(prev => [tDetails, ...prev]);
          setNotifications(prev => [
            {
              id: 'notif-esc-' + Date.now(),
              title: payloadData.is_unsure ? 'Escalation Sent ✓' : 'Ticket Created ✓',
              message: `Eco-Bot logged ticket ${payloadData.ticket_code}: ${tDetails.description.substring(0, 80)}...`,
              time: 'Just now',
              read: false
            },
            ...prev
          ]);
          setMessage(`Eco-Bot logged ticket ${payloadData.ticket_code} directly in the database!`);
        }
      } else {
        // Fallback for offline / connection errors
        const lowerText = userText.toLowerCase();
        if (lowerText.includes('battery') || lowerText.includes('batteries') || lowerText.includes('hazardous')) {
          botReplyText = "Confidence below 60%. Want me to escalate this to your scheme manager?";
          isUnsure = true;
          confidence = 54;
        } else {
          botReplyText = "Organic foods scraps go into composting bins. Recycle clean plastics separately under Greenfield instructions!";
        }
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot' as const,
        text: botReplyText,
        logId,
        confidence,
        isUnsure
      };

      setRecentConversations(prev => prev.map(c => {
        if (c.id === currentActiveId || (c.active && !currentActiveId)) {
          return {
            ...c,
            messages: [...c.messages, botMsg]
          };
        }
        return c;
      }));

    } catch (err) {
      console.error(err);
      setBotTyping(false);

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot' as const,
        text: 'Apologies, our advisory nodes are currently re-indexing guidelines. Basic tip: Clean PET bottles before staging at disposal areas to support local collectors!',
        confidence: 88
      };

      setRecentConversations(prev => prev.map(c => {
        if (c.id === currentActiveId || (c.active && !currentActiveId)) {
          return {
            ...c,
            messages: [...c.messages, botMsg]
          };
        }
        return c;
      }));
    }
  };

  // Submit AI rate helpfulness feedback
  const handleRateBotLog = async (msgIndex: number, logId: number, isHelpful: boolean) => {
    try {
      const response = await fetch(`/api/resident/chatbot/rate-log/${logId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_helpful: isHelpful })
      });

      if (response.ok) {
        setChatMessages(prev => 
          prev.map((msg, i) => i === msgIndex ? { ...msg, selectedFeedback: isHelpful ? 'helpful' : 'not_helpful' } : msg)
        );
      }
    } catch {
      // Offline visual update anyway
      setChatMessages(prev => 
        prev.map((msg, i) => i === msgIndex ? { ...msg, selectedFeedback: isHelpful ? 'helpful' : 'not_helpful' } : msg)
      );
    }
  };

  // Bulk pickups schedule
  const handleBulkBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/resident/special-pickups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bulkBooking)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Server booking reject.');

      setMessage(`Special Pickup scheduled successfully! Invoice Reference: ${data.data.reference_code}. LKR 1500 billed to account.`);
      setBulkBooking({ category: 'Electronic Waste', description: '', pickup_date: '2026-05-21', shift: 'morning' });
      fetchResidentProfile();
      setActiveTab('billing');
    } catch {
      // Mock book
      const mockRef = 'SP-' + Math.floor(Math.random() * 100000);
      setPayments([
        { id: Date.now(), reference_code: mockRef, amount: 1500, status: 'unpaid', payment_type: 'special_pickup', notes: `Special removal: ${bulkBooking.category} (${bulkBooking.description})` },
        ...payments
      ]);
      setUnitProfile((prev: any) => ({ ...prev, unpaid_balance_lkr: prev.unpaid_balance_lkr + 1500, pending_bills_count: prev.pending_bills_count + 1 }));
      setMessage(`Special Pickup logged successfully in sandbox mode. Invoice Reference: ${mockRef}. LKR 1,500 billed.`);
      setBulkBooking({ category: 'Electronic Waste', description: '', pickup_date: '2026-05-21', shift: 'morning' });
      setActiveTab('billing');
    } finally {
      setActionLoading(false);
    }
  };

  // Open sandbox checkout modal
  const handleInitiateSettle = async (paymentItem: any) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/resident/payments/${paymentItem.id}/checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setShowCheckoutModal({ item: paymentItem, session_id: data.data.session_id });
      } else {
        throw new Error();
      }
    } catch {
      // Simulate
      setShowCheckoutModal({ item: paymentItem, session_id: 'MOCK-SESSION-SANDBOX-' + Math.floor(Math.random() * 10000) });
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm payment Gateway transaction
  const handleConfirmSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckoutModal) return;

    setActionLoading(true);
    const paymentId = showCheckoutModal.item.id;
    const gatewayTransactionId = 'SANDBOX-TRX-' + Math.floor(Math.random() * 10000000);

    try {
      const response = await fetch(`/api/resident/payments/${paymentId}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_method: 'payhere',
          gateway_transaction_id: gatewayTransactionId
        })
      });

      if (!response.ok) throw new Error();
      
      setMessage('Payment settled successfully! Digital invoice updated.');
      setShowCheckoutModal(null);
      fetchResidentProfile();
    } catch {
      // Local filter update
      setPayments(prev => 
        prev.map(p => p.id === paymentId ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p)
      );
      setUnitProfile((prev: any) => ({
        ...prev,
        unpaid_balance_lkr: Math.max(0, prev.unpaid_balance_lkr - showCheckoutModal.item.amount),
        pending_bills_count: Math.max(0, prev.pending_bills_count - 1)
      }));
      setMessage('LKR ' + showCheckoutModal.item.amount.toLocaleString() + ' garbage levies paid in sandbox mode.');
      setShowCheckoutModal(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Rate Worker Feedback
  const handleSubmitWorkerRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRatingJob) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/resident/rate-worker', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_id: activeRatingJob.id,
          worker_id: activeRatingJob.worker?.id || 1, // fallback
          rating: stars,
          feedback: ratingFeedback
        })
      });

      if (!response.ok) throw new Error();

      setMessage('Five star review and comments dispatched securely to worker files.');
      setActiveRatingJob(null);
      setRatingFeedback('');
      setStars(5);
      fetchResidentProfile();
    } catch {
      setPendingRatings(prev => prev.filter(r => r.id !== activeRatingJob.id));
      setMessage(`Submitted ${stars}-star feedback for ${activeRatingJob.worker?.name || 'Staff'} (Simulation)`);
      setActiveRatingJob(null);
      setRatingFeedback('');
      setStars(5);
    } finally {
      setActionLoading(false);
    }
  };

  const getCategoryLabel = (val: string) => {
    switch (val) {
      case 'not_collected': return 'Missed pickup';
      case 'too_late': return 'Late collection';
      case 'wrong_sorting': return 'Wrong sorting';
      default: return 'Other mishap';
    }
  };

  // Report Missed Pickup grievance
  const handleReportMissedCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const targetCategory = getCategoryLabel(complaintWhatHappened);
      let apiCategory = 'other';
      if (complaintWhatHappened === 'not_collected') apiCategory = 'missed_collection';
      else if (complaintWhatHappened === 'too_late') apiCategory = 'wrong_time';
      else if (complaintWhatHappened === 'wrong_sorting') apiCategory = 'other';

      const payload = {
        category: apiCategory,
        description: complaintDescription,
        date: complaintDate,
        expected_time: complaintTime
      };

      const response = await fetch('/api/resident/report-missed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error();

      const createdObj = {
        id: data.data?.id || Date.now(),
        complaint_code: data.data?.complaint_code || ('C-' + Math.floor(Math.random() * 90 + 110)),
        category: targetCategory,
        description: complaintDescription,
        status: 'open',
        created_at: new Date().toISOString(),
        date_label: 'Today',
        date: complaintDate,
        expected_time: complaintTime
      };

      setMyComplaints([createdObj, ...myComplaints]);
      setLastSubmittedComplaint(createdObj);
      setComplaintStatusView('success');
      setMessage(`Complaint lodged correctly! Reference: ${createdObj.complaint_code}. Logistics checks are active.`);
      fetchResidentProfile();
    } catch {
      const mockC = {
        id: Date.now(),
        complaint_code: 'C-' + Math.floor(Math.random() * 90 + 110),
        category: getCategoryLabel(complaintWhatHappened),
        description: complaintDescription,
        status: 'open',
        created_at: new Date().toISOString(),
        date_label: 'Today',
        date: complaintDate,
        expected_time: complaintTime
      };
      setMyComplaints([mockC, ...myComplaints]);
      setLastSubmittedComplaint(mockC);
      setComplaintStatusView('success');
      setMessage(`Grievance filed correctly. Reference: ${mockC.complaint_code}. (Simulation)`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F5] font-sans text-gray-800 flex flex-col md:flex-row pb-16 md:pb-0 relative" id="resident-pwa-container">
      
      {/* 1. DESKTOP SIDEBAR (light theme matching screenshot) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200/80 bg-white justify-between shrink-0 h-screen sticky top-0 font-sans shadow-sm" id="resident-desktop-sidebar">
        <div>
          {/* Logo brand area */}
          <div className="p-6 flex items-center gap-3 border-b border-gray-100">
            <div className="bg-[#1E4D2B] p-2 rounded-xl text-white shadow-sm flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-[#1E4D2B] leading-none mb-1">EcoTrack</h2>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block leading-none">RESIDENT PORTAL</span>
            </div>
          </div>
 
          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'history', label: 'History', icon: HistoryIcon },
              { id: 'bulk', label: 'Special Pickup', icon: Package },
              { id: 'billing', label: 'Payments', icon: CreditCard },
              { id: 'chatbot', label: 'Eco-Bot', icon: Bot },
              { id: 'complaints', label: 'Complaints', icon: Flag },
              { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter(n => !n.read).length },
              { id: 'profile', label: 'Profile', icon: User }
            ].map((rail) => {
              const Icon = rail.icon;
              return (
                <button
                  key={rail.id}
                  onClick={() => setActiveTab(rail.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer ${
                    activeTab === rail.id || (rail.id === 'billing' && activeTab === 'billing') || (rail.id === 'bulk' && activeTab === 'bulk')
                      ? 'bg-[#EBFDF2] text-[#1E4D2B] border border-emerald-100'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${activeTab === rail.id ? 'text-[#1E4D2B]' : 'text-gray-400'}`} />
                    <span>{rail.label}</span>
                  </div>
                  {rail.badge ? (
                    <span className="bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                      {rail.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
 
        {/* BOTTOM USER AVATAR SLOT inside Sidebar (Screenshot Style) */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#D0E7D2] shadow-xs bg-gray-100 flex items-center justify-center select-none">
                <img 
                  src={profileImage} 
                  alt={profileName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 leading-none">
                {getShortName(profileName)}
              </p>
              <span className="text-[10px] font-semibold text-gray-400 tracking-tight mt-1.5 block">Resident • {profileUnit}</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title="Log out"
            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer rounded-base shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
 
      {/* 2. MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-1.5 px-2 flex justify-around items-center z-45 md:hidden shadow-lg">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'history', label: 'History', icon: HistoryIcon },
          { id: 'bulk', label: 'Pickup', icon: Package },
          { id: 'billing', label: 'Bills', icon: CreditCard },
          { id: 'chatbot', label: 'Bot', icon: Bot },
          { id: 'complaints', label: 'Complaints', icon: Flag }
        ].map((rail) => {
          const Icon = rail.icon;
          const isSelected = activeTab === rail.id;
          return (
            <button
              key={rail.id}
              onClick={() => setActiveTab(rail.id as any)}
              className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                isSelected ? 'text-[#1E4D2B] font-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="text-[8.5px] uppercase font-bold tracking-tight">{rail.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
            activeTab === 'profile' ? 'text-[#1E4D2B] font-black' : 'text-gray-400'
          }`}
        >
          <User className="w-4.5 h-4.5 shrink-0" />
          <span className="text-[8.5px] uppercase font-bold tracking-tight">Profile</span>
        </button>
      </nav>
 
      {/* 3. MAIN WORKPLACE INTERFACE */}
      <main className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        
        {/* UPPER CONVOLUTED HEADER STRAP - STICKY FIXED */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-150 py-4 px-4 md:px-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0 shadow-sm sticky top-0 z-40">
          <div>
            {activeTab === 'history' ? (
              <div>
                <span className="text-[10px] font-black text-gray-400 block tracking-wider font-sans uppercase">
                  {historySubView === 'rate' ? 'History › Rate collection' : historySubView === 'success' ? 'Rating submitted' : `${profileUnit || 'Not Assigned'} • ${historyItems.length} collections`}
                </span>
                <h1 className="text-xl md:text-2xl font-black text-[#1E4D2B] tracking-tight mt-0.5">
                  {historySubView === 'rate' ? 'Rate worker' : historySubView === 'success' ? 'Feedback 🌿' : 'Collection history'}
                </h1>
              </div>
            ) : activeTab === 'bulk' ? (
              <div>
                <span className="text-[10px] font-black text-gray-400 block tracking-wider font-sans uppercase">
                  {specialStep === 'form' && 'Special Pickup › New request'}
                  {specialStep === 'estimate' && 'Special Pickup › Estimate'}
                  {specialStep === 'checkout' && 'Special Pickup › Secure checkout'}
                  {specialStep === 'success' && 'Transaction #TXN-294821'}
                  {specialStep === 'failed' && 'Card declined'}
                  {specialStep === 'receipt' && 'Payments › Receipt'}
                </span>
                <h1 className="text-xl md:text-2xl font-black text-[#1E4D2B] tracking-tight mt-0.5">
                  {specialStep === 'form' && 'Request special pickup'}
                  {specialStep === 'estimate' && 'Cost estimate'}
                  {specialStep === 'checkout' && 'Payment'}
                  {specialStep === 'success' && 'Payment successful'}
                  {specialStep === 'failed' && 'Payment failed'}
                  {specialStep === 'receipt' && 'Receipt #R-294821'}
                </h1>
              </div>
            ) : activeTab === 'billing' ? (
              <div>
                <span className="text-[10px] font-black text-gray-400 block tracking-wider font-sans uppercase">
                  {profileUnit || 'Not Assigned'} · {payments.length} transactions
                </span>
                <h1 className="text-xl md:text-2xl font-black text-[#1E4D2B] tracking-tight mt-0.5">
                  Payment history
                </h1>
              </div>
            ) : activeTab === 'chatbot' ? (
              <div>
                <span className="text-[10px] font-black text-gray-400 block tracking-wider font-sans uppercase">
                  {ecoBotView === 'error' 
                    ? 'Connection error' 
                    : 'AI assistant · Powered by Gemini'}
                </span>
                <h1 className="text-xl md:text-2xl font-black text-[#1E4D2B] tracking-tight mt-0.5">
                  Eco-Bot
                </h1>
              </div>
            ) : activeTab === 'complaints' ? (
              <div>
                <span className="text-[10px] font-black text-gray-400 block tracking-wider font-sans uppercase">
                  {complaintStatusView === 'form' 
                    ? 'Complaints › New' 
                    : `Complaints › #${lastSubmittedComplaint?.complaint_code || 'C-118'}`}
                </span>
                <h1 className="text-xl md:text-2xl font-black text-[#1E4D2B] tracking-tight mt-0.5">
                  {complaintStatusView === 'form' ? 'Report missed collection' : 'Complaint received'}
                </h1>
              </div>
            ) : activeTab === 'notifications' ? (
              <div>
                <span className="text-[10px] font-black text-gray-400 block tracking-wider font-sans uppercase" id="notifications-caption">
                  Inbox • {notifications.filter(n => !n.read).length} unread
                </span>
                <h1 className="text-xl md:text-2xl font-black text-[#1E4D2B] tracking-tight mt-0.5" id="notifications-title">
                  Notifications
                </h1>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-bold text-[#1E4D2B] uppercase tracking-widest block font-mono">
                  {homeSimulationMode === 'normal_caught_up' 
                    ? 'No collection scheduled today' 
                    : homeSimulationMode === 'offline_pending' 
                    ? "Today's collection" 
                    : 'Greenfield Residencies - Block A'}
                </span>
                <h1 className="text-xl md:text-2xl font-black text-[#1E4D2B] tracking-tight flex items-center gap-1.5 mt-0.5">
                  <span>{profileUnit} • {profileName.split(' ')[0]}</span>
                  <span className="text-emerald-600">🌿</span>
                </h1>
              </div>
            )}
          </div>
 
          {/* SEARCH & ALERTS PANEL DECK */}
          <div className="flex items-center gap-3">
            {activeTab === 'history' && historySubView === 'list' && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl border border-emerald-500 hover:border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50 active:scale-95 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none shrink-0"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
            {activeTab === 'billing' && (
              <button
                type="button"
                onClick={handleExportPaymentsCSV}
                className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl border border-gray-200 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 active:scale-95 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none shrink-0"
                id="billing-export-btn"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
                <span>Export</span>
              </button>
            )}
            {activeTab === 'notifications' && (
              <button
                type="button"
                onClick={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  setMessage("All notifications marked as read.");
                }}
                className="py-1.5 sm:py-2 px-4 rounded-full border border-[#1E4D2B] text-[#1E4D2B] bg-white hover:bg-[#F4F8F5] active:scale-95 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none shrink-0"
                id="notif-mark-all-read-btn"
              >
                <Check className="w-3.5 h-3.5 text-[#1E4D2B]" />
                <span>Mark all read</span>
              </button>
            )}
            {/* Real Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search history, payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F8F5] border border-gray-200/80 text-xs text-gray-700 rounded-full pl-9 pr-4 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4D2B]/20 transition-all font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>
 
            {/* Bell notification indicator with interactive popup dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifPopupOpen(!isNotifPopupOpen);
                  setIsProfilePopupOpen(false);
                }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center relative transition-all cursor-pointer ${
                  isNotifPopupOpen 
                    ? 'bg-emerald-50 border-emerald-300 text-[#1E4D2B] ring-2 ring-emerald-100/50 scale-105' 
                    : 'bg-[#F4F8F5] border-gray-200/80 text-[#1E4D2B] hover:bg-emerald-50/40 hover:border-emerald-600/40'
                }`}
                title="View notification alerts"
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                )}
              </button>

              {isNotifPopupOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsNotifPopupOpen(false)} 
                  />
                       {/* Notifications Dropdown Panel mimicking the admin layout */}
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-[420px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 pt-1.5 pb-2 animate-in fade-in slide-in-from-top-3 duration-200 text-left text-slate-850">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-black text-gray-905 uppercase tracking-wide">SYSTEM ALERTS</span>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="text-[10px] bg-rose-100 text-rose-600 font-extrabold px-2 py-0.5 rounded-full select-none">
                            {notifications.filter(n => !n.read).length} New
                          </span>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifications(notifications.map(n => ({ ...n, read: true })));
                            setMessage("All notifications marked as read.");
                          }}
                          className="text-[11px] text-emerald-700 hover:text-[#12301b] font-black transition-all cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-gray-400 font-bold flex flex-col items-center justify-center gap-2">
                          <CheckCircle className="w-10 h-10 text-gray-200" />
                          <p className="text-xs">No notifications yet!</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const isUnread = !notif.read;
                          // Determine dynamic icon & theme
                          const textLower = (notif.title + ' ' + notif.message).toLowerCase();
                          let meta = {
                            icon: Bell,
                            bg: 'bg-emerald-50 text-emerald-600',
                          };
                          
                          if (textLower.includes('complaint') || textLower.includes('missed') || textLower.includes('report')) {
                            meta = {
                              icon: AlertTriangle,
                              bg: 'bg-amber-50 text-amber-500',
                            };
                          } else if (textLower.includes('lkr') || textLower.includes('invoice') || textLower.includes('billed') || textLower.includes('payment')) {
                            meta = {
                              icon: CreditCard,
                              bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
                            };
                          } else if (textLower.includes('sunil') || textLower.includes('collector') || textLower.includes('assigned')) {
                            meta = {
                              icon: CheckCircle,
                              bg: 'bg-blue-50 text-blue-500',
                            };
                          }

                          const NotifIcon = meta.icon;

                          return (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                // Mark single as read
                                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                setActiveTab('notifications');
                                setIsNotifPopupOpen(false);
                              }}
                              className={`p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left flex items-start gap-3.5 relative ${
                                isUnread ? 'bg-slate-50/20' : ''
                              }`}
                            >
                              {/* Left Styled Icon */}
                              <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                                <NotifIcon className="w-5 h-5" />
                              </div>

                              {/* Center Content Texts */}
                              <div className="flex-1 min-w-0 pr-10">
                                <p className={`text-[12.5px] leading-snug tracking-tight ${isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed font-semibold">
                                  {notif.message}
                                </p>
                                <span className="text-[9.5px] text-gray-400 font-bold block mt-1.5 font-mono">
                                  {notif.time}
                                </span>
                              </div>

                              {/* Right Controls Actions */}
                              <div className="absolute right-4 top-4 flex items-center gap-2">
                                {isUnread && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="New alert mark" />
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotifications(notifications.filter(n => n.id !== notif.id));
                                  }}
                                  className="text-gray-300 hover:text-gray-500 p-1 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                  title="Dismiss notification"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="px-4 py-2 mt-1 border-t border-gray-100 flex items-center justify-between bg-slate-50/80 rounded-b-2xl">
                      <span className="text-[10px] text-gray-450 font-bold">
                        {notifications.length} alerts in log
                      </span>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifications([]);
                            setMessage("All notifications removed from dossier logs.");
                          }}
                          className="text-[10px] text-red-600 hover:text-red-800 font-black cursor-pointer font-sans"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
 
            {/* Avatar block with interactive profile workspace-style popup */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfilePopupOpen(!isProfilePopupOpen);
                  setIsNotifPopupOpen(false);
                }}
                className={`w-9 h-9 rounded-full border overflow-hidden transition-all cursor-pointer shadow-xs ${
                  isProfilePopupOpen 
                    ? 'ring-2 ring-emerald-500 border-transparent scale-105' 
                    : 'border-gray-200 hover:ring-2 hover:ring-emerald-100'
                }`}
                title="Account Settings & Quick Tasks"
              >
                <img 
                  src={profileImage} 
                  alt={profileName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>

              {isProfilePopupOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsProfilePopupOpen(false)} 
                  />
                  
                  {/* Dropdown container */}
                  <div className="absolute right-0 mt-2.5 w-60 bg-white border border-gray-150 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <div className="p-2.5 border-b border-gray-100 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-emerald-600">
                        <img 
                          src={profileImage} 
                          alt={profileName} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[11.5px] font-black text-slate-900 truncate leading-tight">
                          {getShortName(profileName)}
                        </p>
                        <p className="text-[9.5px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5">
                          {profileUnit} • {profileBlock}
                        </p>
                      </div>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('profile');
                          setIsProfilePopupOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#1E4D2B] transition-all cursor-pointer text-left"
                      >
                        <User className="w-4 h-4 text-gray-450" />
                        <span>My Profile details</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('billing');
                          setIsProfilePopupOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#1E4D2B] transition-all cursor-pointer text-left"
                      >
                        <CreditCard className="w-4 h-4 text-gray-450" />
                        <span>Bills & Payments</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('chatbot');
                          setIsProfilePopupOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#1E4D2B] transition-all cursor-pointer text-left"
                      >
                        <Bot className="w-4 h-4 text-gray-450" />
                        <span>ECO-Bot Advisor</span>
                      </button>

                      <div className="my-1 border-t border-gray-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfilePopupOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-left border border-transparent"
                      >
                        <LogOut className="w-4 h-4 text-rose-450" />
                        <span>Sign out Portal</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
 
        {/* PRIMARY CONTAINER SPACE */}
        <div className="p-4 md:p-8 space-y-6">
          
          {/* Notification Messages Banner */}
          {message && (
            <motion.div 
              className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl text-emerald-800 text-xs flex items-center justify-between shadow-xs" 
              id="resident-notice"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1E4D2B]" />
                <span className="font-semibold">{message}</span>
              </div>
              <button onClick={() => setMessage(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer ml-3 font-extrabold text-xs">✕</button>
            </motion.div>
          )}
 
          {/* CLIENT-SIDE SEARCH QUERY DROPDOWN RESULTS PANEL */}
          {searchQuery && (
            <div className="bg-white p-5 border border-gray-200/60 rounded-3xl shadow-sm space-y-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block text-left">SEARCH RESULTS FOR "{searchQuery.toUpperCase()}"</span>
              {(() => {
                const results: any[] = [];
                // Search payments
                payments.forEach(p => {
                  if (p.notes?.toLowerCase().includes(searchQuery.toLowerCase()) || p.reference_code?.toLowerCase().includes(searchQuery.toLowerCase())) {
                    results.push({ type: 'payment', title: p.notes, subtitle: `REF: ${p.reference_code} • LKR ${p.amount}`, tab: 'billing' });
                  }
                });
                // Search complaints
                myComplaints.forEach(c => {
                  if (c.description?.toLowerCase().includes(searchQuery.toLowerCase()) || c.complaint_code?.toLowerCase().includes(searchQuery.toLowerCase())) {
                    results.push({ type: 'complaint', title: `Complaint ${c.complaint_code}`, subtitle: c.description, tab: 'complaints' });
                  }
                });
                // Search tips
                greenTips.forEach((t, i) => {
                  if (t.toLowerCase().includes(searchQuery.toLowerCase())) {
                    results.push({ type: 'tip', title: `Eco Tip #${i+1}`, subtitle: t, tab: 'home' });
                  }
                });
 
                if (results.length === 0) {
                  return <p className="text-xs text-gray-400 text-left">No matching log traces or invoices found in Greenfield base queries.</p>;
                }
 
                return (
                  <div className="divide-y divide-gray-100 text-left">
                    {results.map((r, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setActiveTab(r.tab);
                          setSearchQuery('');
                        }}
                        className="py-2.5 flex justify-between items-center hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-xs font-black text-gray-900">{r.title}</p>
                          <p className="text-[10.5px] text-gray-400 font-semibold">{r.subtitle}</p>
                        </div>
                        <span className="text-[9px] font-extrabold text-[#1E4D2B] bg-[#EBFDF2] px-2 py-0.5 rounded-full uppercase">{r.type}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="home-dashboard">
              
              {/* Scenario Interactive Simulator Controller Pill Bar */}
              <div className="bg-[#F4F8F5] border border-gray-150 p-4 rounded-3xl text-left space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-xs font-black text-[#1E4D2B] uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>Interactive Live Demo Controller</span>
                    </h3>
                    <p className="text-[10.5px] text-gray-550 font-bold leading-normal mt-0.5">
                      Click the options below to switch between different physical conditions of the system and see how the UI updates:
                    </p>
                  </div>
                  {token === 'MOCK_JWT_TOKEN_PLAYGROUND' ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono self-start sm:self-auto select-none">
                      Sandbox Active
                    </span>
                  ) : (
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono self-start sm:self-auto select-none">
                      Database Connected
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => {
                      setHomeSimulationMode('active_tracker');
                      setMessage("Demo Switched: Real-time collection active with live tracking GPS!");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      homeSimulationMode === 'active_tracker'
                        ? 'bg-[#1E4D2B] text-white border-transparent shadow-xs'
                        : 'bg-white hover:bg-gray-50 text-gray-650 border-gray-200/80 hover:border-gray-350'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></span>
                    <span>Sunil actively cleaning (Live GPS Tracker)</span>
                  </button>

                  <button
                    onClick={() => {
                      setHomeSimulationMode('normal_caught_up');
                      setMessage("Demo Switched: Standard Routine Mode (Caught Up Layout).");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      homeSimulationMode === 'normal_caught_up'
                        ? 'bg-[#1E4D2B] text-white border-transparent shadow-xs'
                        : 'bg-white hover:bg-gray-50 text-gray-650 border-gray-200/80 hover:border-gray-350'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>All Caught Up • No Collection Scheduled today</span>
                  </button>

                  <button
                    onClick={() => {
                      setHomeSimulationMode('offline_pending');
                      setMessage("Demo Switched: Offline state showing cached data alerts.");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      homeSimulationMode === 'offline_pending'
                        ? 'bg-[#1E4D2B] text-white border-transparent shadow-xs'
                        : 'bg-white hover:bg-gray-50 text-gray-650 border-gray-200/80 hover:border-gray-350'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    <span>Offline warning • Stale stale cache notices</span>
                  </button>
                </div>
              </div>

              {/* OFFLINE WARNING ALERT BAR */}
              {homeSimulationMode === 'offline_pending' && (
                <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-left gap-3.5 shadow-xs animate-in slide-in-from-top-4 duration-200" id="offline-network-warning">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-2xl text-amber-805 mt-0.5 shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-800" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">You're offline — showing cached data</h4>
                      <p className="text-[11px] text-amber-700 font-semibold leading-normal mt-0.5">
                        Your connection was lost. Real-time updates are paused, but cached files remain active.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setHomeSimulationMode('active_tracker');
                      setMessage("Success! Reestablished connection, synchronized backend stream!");
                    }}
                    className="px-4 py-2 bg-amber-505 hover:bg-amber-600 hover:text-white bg-amber-100 text-amber-800 font-extrabold text-xs rounded-xl cursor-pointer shadow-xs transition-all shrink-0 font-sans border border-amber-200/60 hover:border-transparent active:scale-95"
                  >
                    Reconnect
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left/Central Column (8 columns span) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Dynamic Shift Tracker / Dynamic State centerpiece depending on simulation mode */}
                  {homeSimulationMode === 'active_tracker' && (
                    <div className="bg-[#1E4D2B] p-6 rounded-3xl text-white shadow-xs flex items-center justify-between gap-4 relative overflow-hidden animate-in fade-in duration-200" id="live-driver-banner">
                      {/* Background decorations */}
                      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 shrink-0 pointer-events-none"></div>
                      
                      <div className="flex items-center gap-4 relative z-10 text-left">
                        {/* Truck circle icon */}
                        <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                          <Trash2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          {/* Status Pill */}
                          <span className="bg-white/10 text-white border border-white/20 select-none px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse"></span>
                            In-Progress
                          </span>
                          <h2 className="text-lg md:text-xl font-black mt-1.5 tracking-tight">{unitProfile?.next_pickup?.worker?.name?.split(' ')[0] || 'Staff'} is on Floor {profileFloor}</h2>
                          <p className="text-xs text-emerald-100 font-medium">Estimated arrival in 8 min • 7:14 AM</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowLiveTracker(true)}
                        className="py-2.5 px-4 rounded-full bg-[#2a683b] hover:bg-[#348048] active:scale-98 text-white border border-emerald-600/30 hover:border-emerald-500 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer relative z-10 shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Track live</span>
                      </button>
                    </div>
                  )}

                  {homeSimulationMode === 'normal_caught_up' && (
                    <div className="bg-[#F4F8F5] border border-dashed border-emerald-250 p-6 rounded-3xl text-left shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden animate-in fade-in duration-200" id="caught-up-banner">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-14 h-14 rounded-full bg-[#EBFDF2] border border-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="w-7 h-7 text-emerald-700 stroke-[3]" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-xl font-black text-[#1E4D2B] tracking-tight font-sans">You're all caught up!</h2>
                          <p className="text-xs text-gray-500 font-bold leading-relaxed mt-1">
                            No collection scheduled for today. Your next pickup is Wednesday at 6:30 AM.
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setActiveTab('bulk');
                          setMessage("Set up specialized bulk removal schedule below!");
                        }}
                        className="py-2.5 px-4 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white font-black text-xs transition-all shadow-xs shrink-0 cursor-pointer text-center"
                      >
                        Request a special pickup
                      </button>
                    </div>
                  )}

                  {homeSimulationMode === 'offline_pending' && (
                    <div className="bg-white border border-gray-150 p-6 rounded-3xl text-left shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden animate-in fade-in duration-200" id="offline-pending-banner">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 animate-pulse">
                          <Clock className="w-7 h-7 text-amber-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight font-sans">Today's collection</h2>
                            <span className="bg-amber-100 text-amber-800 text-[9.5px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                              Pending
                            </span>
                          </div>
                          <p className="text-xs text-amber-700 font-bold leading-normal mt-1 flex items-center gap-1">
                            <span>Showing last known status •</span>
                            <span className="font-mono text-gray-400">1 hour stale</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-[10.5px] text-gray-400 max-w-xs font-bold leading-relaxed">
                        Standard scheduled corridor tier-clearing is currently pending worker terminal authentication.
                      </div>
                    </div>
                  )}
 
                  {/* Dynamic Quick Actions Shortcuts */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="home-shortcuts-rail">
                    
                    {/* Card 1: Special Pickup */}
                    <button
                      onClick={() => setActiveTab('bulk')}
                      className="p-4 bg-white border border-gray-200/60 rounded-2xl hover:border-[#1E4D2B]/40 hover:shadow-sm active:scale-95 transition-all text-left flex flex-col justify-between items-start h-28 cursor-pointer group"
                    >
                      <div className="p-2.5 bg-emerald-100 rounded-xl text-[#1E4D2B] group-hover:bg-[#1E4D2B] group-hover:text-white transition-colors">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 leading-none">Special Pickup</h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">Bulky items</p>
                      </div>
                    </button>
 
                    {/* Card 2: Rate Worker */}
                    <button
                      onClick={() => {
                        if (pendingRatings.length > 0) {
                          setActiveRatingJob(pendingRatings[0]);
                        } else {
                          setMessage('Last collection check: Sunil Kumara rated successfully today!');
                        }
                      }}
                      className="p-4 bg-white border border-gray-200/60 rounded-2xl hover:border-[#1E4D2B]/40 hover:shadow-sm active:scale-95 transition-all text-left flex flex-col justify-between items-start h-28 cursor-pointer group"
                    >
                      <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Star className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 leading-none">Rate Worker</h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 font-semibold text-amber-600">Give stars</p>
                      </div>
                    </button>
 
                    {/* Card 3: Eco-Bot */}
                    <button
                      onClick={() => setActiveTab('chatbot')}
                      className="p-4 bg-white border border-gray-200/60 rounded-2xl hover:border-[#1E4D2B]/40 hover:shadow-sm active:scale-95 transition-all text-left flex flex-col justify-between items-start h-28 cursor-pointer group"
                    >
                      <div className="p-2.5 bg-blue-100 rounded-xl text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 leading-none">Eco-Bot</h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 font-semibold text-blue-600">Ask sorting</p>
                      </div>
                    </button>
 
                    {/* Card 4: Complaint */}
                    <button
                      onClick={() => setActiveTab('complaints')}
                      className="p-4 bg-white border border-gray-200/60 rounded-2xl hover:border-[#1E4D2B]/40 hover:shadow-sm active:scale-95 transition-all text-left flex flex-col justify-between items-start h-28 cursor-pointer group"
                    >
                      <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <Flag className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 leading-none">Complaint</h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 font-semibold text-rose-500 font-semibold text-rose-500">Report missed</p>
                      </div>
                    </button>
 
                  </div>
 
                  {/* This Month's Impact Board container */}
                  <div className="bg-white p-6 border border-gray-200/60 rounded-3xl shadow-xs space-y-4" id="monthly-metrics-and-graph">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 text-left">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block font-mono">May 2026</span>
                        <h3 className="text-base font-black text-[#1E4D2B]">This month's impact</h3>
                      </div>
                    </div>

                    {/* GRID OF FOUR GRAPH STATS PILES */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-left">
                      {/* Stat 1: Total waste */}
                      <div className="p-4 bg-[#F4F8F5] border border-emerald-100/30 rounded-2xl flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                          <Trash2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Total waste</span>
                        </div>
                        <p className="text-xl font-black text-gray-900">{totalWasteKg} kg</p>
                      </div>

                      {/* Stat 2: Recycled */}
                      <div className="p-4 bg-[#F4F8F5] border border-emerald-100/30 rounded-2xl flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Recycled</span>
                        </div>
                        <p className="text-xl font-black text-gray-900">{recycledKg} kg</p>
                      </div>

                      {/* Stat 3: Recycle rate */}
                      <div className="p-4 bg-[#FBFDFB] border border-emerald-100/30 rounded-2xl flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                          <Leaf className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Recycle rate</span>
                        </div>
                        <p className="text-xl font-black text-[#1E4D2B]">{recycleRatePercent}%</p>
                      </div>

                      {/* Stat 4: On-time pickups */}
                      <div className="p-4 bg-[#FEFDFB] border border-amber-100/40 rounded-2xl flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                          <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">On-time</span>
                        </div>
                        <p className="text-xl font-black text-amber-700">{onTimePercent}%</p>
                      </div>
                    </div>
 
                    {/* Visual Recycled Daily Bar Chart graph */}
                    <div className="pt-4 text-left">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">DAILY SEPARATION ANALYSIS</p>
                      <div className="flex items-end justify-between h-32 w-full gap-2 px-2" id="impact-graph">
                        {[
                          { day: 'Mon', kg: completedJobs.length > 0 ? 4.2 : 0, h: completedJobs.length > 0 ? 'h-[30%]' : 'h-0', highlight: false },
                          { day: 'Tue', kg: completedJobs.length > 0 ? 5.8 : 0, h: completedJobs.length > 0 ? 'h-[75%]' : 'h-0', highlight: false },
                          { day: 'Wed', kg: completedJobs.length > 0 ? 3.5 : 0, h: completedJobs.length > 0 ? 'h-[50%]' : 'h-0', highlight: false },
                          { day: 'Thu', kg: completedJobs.length > 0 ? 4.9 : 0, h: completedJobs.length > 0 ? 'h-[65%]' : 'h-0', highlight: false },
                          { day: 'Fri', kg: completedJobs.length > 0 ? 6.2 : 0, h: completedJobs.length > 0 ? 'h-[90%]' : 'h-0', highlight: false },
                          { day: 'Sat', kg: completedJobs.length > 0 ? 4.0 : 0, h: completedJobs.length > 0 ? 'h-[55%]' : 'h-0', highlight: false },
                          { day: 'Sun', kg: completedJobs.length > 0 ? 6.5 : 0, h: completedJobs.length > 0 ? 'h-[95%]' : 'h-0', highlight: true }
                        ].map((item, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative">
                            {/* Hover z-index tooltip */}
                            <div className="text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-[#1E4D2B] rounded px-1.5 py-0.5 -mt-6 absolute z-25 top-0 whitespace-nowrap">
                              {item.kg} kg recycling
                            </div>
                            <div className={`w-full rounded-t-lg transition-all duration-300 ${
                              item.highlight 
                                ? 'bg-[#1E4D2B] group-hover:bg-[#163a21] shadow-xs' 
                                : 'bg-[#E3EFE5] group-hover:bg-[#A9D1B3]'
                            } ${item.h}`}>
                              {item.highlight && <div className="w-full h-full bg-white/10 rounded-t-lg animate-pulse" title="Peak Recycle Day"></div>}
                            </div>
                            <span className={`text-[10px] font-extrabold ${item.highlight ? 'text-[#1E4D2B]' : 'text-gray-450'}`}>{item.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
 
                  </div>
 
                </div>
 
                {/* Right Area Column (4 columns span) */}
                <div className="lg:col-span-4 space-y-6 text-left">
                  
                  {/* SERVICE WORKER OFFLINE CACHE EXPLANATOR BOX */}
                  {homeSimulationMode === 'offline_pending' && (
                    <div className="p-5 bg-sky-50 border border-sky-200 rounded-3xl text-left space-y-2 relative overflow-hidden animate-in fade-in duration-200 shadow-sm animate-bounce-short" id="service-worker-stale-notice">
                      <div className="flex items-center gap-1.5 text-sky-800">
                        <Building className="w-4 h-4 text-sky-700 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider font-mono text-sky-800">Database Offline Cache</span>
                      </div>
                      <p className="text-[11.5px] font-black text-sky-950 leading-snug">
                        You're viewing cached data.
                      </p>
                      <p className="text-[10.5px] text-sky-600 leading-relaxed font-bold">
                        Service worker is serving stable offline files. Network requests will retry automatically.
                      </p>
                    </div>
                  )}
                  
                  {/* NEXT COLLECTION INFORMATION AREA */}
                  <div className="bg-white p-5 border border-gray-200/60 rounded-3xl shadow-xs space-y-4" id="next-collection-card">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">NEXT ROUTINE COLLECTION</span>
                    
                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-[#1E4D2B] tracking-tight">{getFormattedNextPickupDate()}</h4>
                      <p className="text-lg font-bold text-gray-800">{getFormattedNextPickupTime()}</p>
                    </div>

                    {/* Reminder toggle button capsule */}
                    {unitProfile && unitProfile.next_pickup && unitProfile.next_pickup.scheduled_date && !unitProfile.next_pickup.scheduled_date.includes('No scheduled') && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsReminderSet(!isReminderSet);
                          const nextDateStr = getFormattedNextPickupDate();
                          const nextTimeStr = getFormattedNextPickupTime();
                          setMessage(isReminderSet ? 'Reminders muted for next schedule.' : `Web Push reminder configured for ${nextDateStr}, ${nextTimeStr}!`);
                        }}
                        className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isReminderSet 
                            ? 'bg-[#EBFDF2] text-[#1E4D2B] border border-emerald-100' 
                            : 'bg-gray-100 text-gray-500 border border-transparent'
                        }`}
                      >
                        <Clock className={`w-4 h-4 ${isReminderSet ? 'text-[#1E4D2B]' : 'text-gray-400'}`} />
                        <span>{isReminderSet ? '2 days • reminder set' : 'Toggle reminder'}</span>
                      </button>
                    )}
                  </div>
                  <div className="bg-white p-5 border border-gray-200/60 rounded-3xl shadow-xs space-y-4" id="recent-activity">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">RECENT ACTIVITY</span>
                    
                    <div className="space-y-3.5">
                      {completedJobs.length === 0 && paidPayments.length === 0 && (
                        <div className="py-4 text-center text-gray-400 font-bold text-xs">
                          No recent activity logged.
                        </div>
                      )}
                      
                      {/* Dynamic Collection Done Log */}
                      {completedJobs.slice(0, 1).map(job => (
                        <div 
                          key={job.id}
                          onClick={() => setActiveTab('history')}
                          className="flex items-start gap-3 cursor-pointer group text-left"
                          title="Click to view full collection history log"
                        >
                          <div className="p-1 rounded-full bg-emerald-100 text-[#2E7D32] mt-0.5 animate-pulse">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900 group-hover:text-[#1E4D2B] transition-colors">Collection done</p>
                            <p className="text-[10.5px] text-gray-400 font-semibold mt-0.5">
                              {job.date} • {job.time}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Dynamic Payment Received Log */}
                      {paidPayments.slice(0, 1).map(pay => (
                        <div 
                          key={pay.id}
                          onClick={() => setShowReceipt({
                            title: pay.notes || pay.request_type,
                            ref: pay.reference_code || `R-${pay.id}`,
                            amount: pay.amount,
                            date: pay.paid_at ? pay.paid_at.slice(0, 10) : 'Today',
                            gateway: 'PayHere Secure Gateway'
                          })}
                          className="flex items-start gap-3 cursor-pointer group text-left"
                          title="Click to view digital invoice receipt"
                        >
                          <div className="p-1 rounded-full bg-emerald-100 text-[#2E7D32] mt-0.5">
                            <Banknote className="w-4 h-4 text-emerald-850" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#1E4D2B] group-hover:text-[#1E4D2B] transition-colors">Payment received</p>
                            <p className="text-[10.5px] text-gray-400 font-semibold mt-0.5">
                              LKR {parseFloat(pay.amount).toLocaleString()} • {pay.request_type ? pay.request_type.split('-').pop()?.trim() : 'Levy'}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Dynamic Rating Submitted Log */}
                      {completedJobs.filter(job => job.is_rated).slice(0, 1).map(job => (
                        <div 
                          key={job.id}
                          onClick={() => setActiveTab('history')}
                          className="flex items-start gap-3 cursor-pointer group text-left"
                          title="Click to view rated worker profiles"
                        >
                          <div className="p-1 rounded-full bg-amber-100 text-amber-600 mt-0.5">
                            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900 group-hover:text-[#1E4D2B] transition-colors">You rated {job.worker}</p>
                            <p className="text-[10.5px] text-gray-400 font-semibold mt-0.5">
                              {job.rating} stars • {job.date}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
 
                  {/* GREEN TIP OF THE DAY CARD */}
                  <div className="p-5 bg-[#EBFDF2]/60 border border-dashed border-[#1E4D2B]/30 rounded-3xl space-y-3 relative overflow-hidden" id="green-tip-card">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-[#1E4D2B]">
                        <Leaf className="w-4.5 h-4.5 animate-bounce text-[#1E4D2B]" />
                        <span className="text-[10.5px] font-black uppercase tracking-wider font-mono">Green tip of the day</span>
                      </div>
                      <button 
                        onClick={() => setTipIndex((tipIndex + 1) % greenTips.length)}
                        className="p-1 rounded-lg bg-white/80 hover:bg-white text-gray-400 hover:text-gray-900 text-[10px] cursor-pointer shadow-xs transition-colors"
                        title="Show another environmental guideline"
                      >
                        Next ↻
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed font-semibold">
                      "{greenTips[tipIndex]}"
                    </p>
                  </div>
 
                  {/* PENDING PERFORMANCE REVIEW CALLOUT DRAWER */}
                  {pendingRatings.length > 0 && (
                    <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-3xl space-y-3">
                      <h4 className="text-[10.5px] font-black text-amber-800 uppercase tracking-wide">PENDING SERVICE EVALUATIONS</h4>
                      {pendingRatings.map((job) => (
                        <div key={job.id} className="p-3 bg-white border border-gray-155 rounded-xl flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block font-black text-gray-900 text-[11px] truncate">Staff: {job.worker?.name || 'Sunil Kumara'}</span>
                            <span className="text-[9px] text-gray-400 font-bold block mt-0.5">Cleared Unit Level on {job.scheduled_date}</span>
                          </div>
                          <button
                            onClick={() => setActiveRatingJob(job)}
                            className="px-3 py-1.5 text-[10.5px] bg-amber-400 hover:bg-amber-500 text-gray-900 font-black rounded-lg transition-all cursor-pointer whitespace-nowrap animate-pulse"
                          >
                            Rate ✓
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
 
                </div>
 
              </div>
 
            </div>
          )}
 
          {/* TAB 2: HISTORY SECTION PANEL */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="resident-history-port">
              
              {/* SUBVIEW 1: HISTORY LOGS LIST TABLE */}
              {historySubView === 'list' && (
                <div className="bg-[#FAFDFB] border border-gray-200 rounded-3xl shadow-xs p-6 space-y-5 text-left">
                  
                  {/* Category Pill Filters Bar */}
                  <div className="flex flex-wrap gap-2 pb-1 border-b border-gray-100">
                    {(['All', 'Regular', 'Special', 'Unrated'] as const).map((filterOpt) => (
                      <button
                        key={filterOpt}
                        onClick={() => {
                          setHistoryFilter(filterOpt);
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border ${
                          historyFilter === filterOpt
                            ? 'bg-[#1E4D2B] text-white border-transparent shadow-xs'
                            : 'bg-emerald-50/40 hover:bg-[#EBFDF2]/60 text-emerald-800 border-emerald-100/40 hover:border-emerald-200'
                        }`}
                      >
                        {filterOpt}
                      </button>
                    ))}
                  </div>

                  {/* Responsive Scrollable Table Container */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-extrabold tracking-widest uppercase text-left font-mono">
                          <th className="py-3 px-4">DATE</th>
                          <th className="py-3 px-4">TIME</th>
                          <th className="py-3 px-4">WORKER</th>
                          <th className="py-3 px-4">TYPE</th>
                          <th className="py-3 px-4">RATING</th>
                          <th className="py-3 px-4 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-sans font-semibold text-xs text-gray-700">
                        {(() => {
                          const filtered = historyItems.filter((item) => {
                            // Filter logic
                            if (historyFilter === 'Regular' && item.class !== 'Regular') return false;
                            if (historyFilter === 'Special' && item.class !== 'Special') return false;
                            if (historyFilter === 'Unrated' && item.is_rated) return false;
                            
                            // Search query match helper
                            if (searchQuery) {
                              const query = searchQuery.toLowerCase();
                              return (
                                item.date.includes(query) ||
                                item.worker.toLowerCase().includes(query) ||
                                item.class.toLowerCase().includes(query) ||
                                item.feedback.toLowerCase().includes(query)
                              );
                            }
                            return true;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-400 font-bold">
                                  No collection logs found matching filters.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((item) => (
                            <tr key={item.id} className="hover:bg-emerald-50/15 transition-colors group">
                              <td className="py-4.5 px-4 font-bold text-emerald-800 font-mono text-[12.5px]">
                                {item.date}
                              </td>
                              <td className="py-4.5 px-4 text-gray-500 font-medium">
                                {item.time}
                              </td>
                              <td className="py-4.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6.5 h-6.5 rounded-full bg-emerald-100/90 text-[10.5px] font-black text-emerald-800 flex items-center justify-center tracking-tight select-none">
                                    {item.code}
                                  </div>
                                  <span className="text-gray-900 font-bold">{item.worker}</span>
                                </div>
                              </td>
                              <td className="py-4.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                  item.type === 'Done'
                                    ? 'bg-[#EBFDF2] text-emerald-800'
                                    : 'bg-blue-50 text-blue-700 animate-pulse'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    item.type === 'Done' ? 'bg-emerald-500' : 'bg-blue-500'
                                  }`}></span>
                                  <span>{item.type}</span>
                                </span>
                              </td>
                              <td className="py-4.5 px-4 font-bold text-gray-400">
                                {item.is_rated ? (
                                  <div className="flex items-center gap-0.5" title={item.feedback}>
                                    {[1, 2, 3, 4, 5].map((starIdx) => (
                                      <Star
                                        key={starIdx}
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          starIdx <= (item.rating || 5)
                                            ? 'text-amber-500 fill-amber-500'
                                            : 'text-gray-200 fill-transparent'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 font-bold text-[11px]">Not rated</span>
                                )}
                              </td>
                              <td className="py-4.5 px-4 text-right">
                                {item.is_rated ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingHistoryDetail(item);
                                      setMessage(`Viewing collection feedback details for ${item.worker}`);
                                    }}
                                    className="inline-flex items-center gap-1.5 text-gray-500 hover:text-emerald-800 text-xs font-black transition-colors cursor-pointer group-hover:scale-105"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span>View</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHistoryTargetItem(item);
                                      setHistoryRatingStars(4); // preset
                                      setHistoryRatingTags(['On time', 'Polite', 'Clean']);
                                      setHistoryRatingText('Very punctual and friendly. Thanks!');
                                      setHistorySubView('rate');
                                    }}
                                    className="py-1.5 px-3.5 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white text-xs font-black transition-all cursor-pointer shadow-xs hover:shadow-sm inline-flex items-center gap-1 hover:scale-105 active:scale-95"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-white" />
                                    <span>Rate</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* SUBVIEW 2: CHOSEN WORKER EVALUATION SCREEN */}
              {historySubView === 'rate' && historyTargetItem && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Main feedback Card (8 Column span) */}
                  <div className="lg:col-span-8 bg-white border border-gray-150 p-6 md:p-8 rounded-3xl shadow-sm text-left space-y-6">
                    
                    {/* Worker Profile Meta Header block */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-full bg-[#EBFDF2] border border-emerald-100 flex items-center justify-center font-black text-emerald-850 text-base select-none">
                          {historyTargetItem.code || 'SK'}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-gray-900 leading-tight">
                            {historyTargetItem.worker === 'Sunil K.' ? 'Sunil Kumara' : historyTargetItem.worker}
                          </h3>
                          <p className="text-xs text-gray-400 font-bold mt-0.5">
                            Collection • {historyTargetItem.date}, {historyTargetItem.time}
                          </p>
                        </div>
                      </div>

                      <span className="self-start sm:self-auto bg-emerald-50 text-emerald-800 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-emerald-100 select-none">
                        4.8 ★ avg
                      </span>
                    </div>

                    {/* How was your collection questionnaire element */}
                    <div className="py-2 text-center space-y-4">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest block">
                        How was your collection?
                      </p>

                      <div className="flex justify-center gap-3 py-1.5">
                        {[1, 2, 3, 4, 5].map((starIdx) => (
                          <button
                            key={starIdx}
                            type="button"
                            onClick={() => setHistoryRatingStars(starIdx)}
                            className="transition-transform duration-100 hover:scale-115 active:scale-95 focus:outline-none cursor-pointer"
                          >
                            <Star
                              className={`w-9 h-9 stroke-[1.5] ${
                                starIdx <= historyRatingStars
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-gray-300 fill-transparent'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      {/* Display Verbal rating slogan */}
                      <p className="text-[#1E4D2B] font-black text-sm italic">
                        {historyRatingStars === 5 && 'Amazing service! 😍'}
                        {historyRatingStars === 4 && 'Great service! 😊'}
                        {historyRatingStars === 3 && 'Good service • Average 🙂'}
                        {historyRatingStars === 2 && 'Fair • Room to improve 😐'}
                        {historyRatingStars === 1 && 'Poor • Disappointed 😞'}
                      </p>
                    </div>

                    {/* What went well multi badges check selector */}
                    <div className="space-y-3">
                      <label className="block text-[10px] uppercase font-black text-gray-400 tracking-wider">
                        WHAT WENT WELL? (OPTIONAL)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['On time', 'Polite', 'Clean', 'Fast', 'Friendly', 'Eco-friendly'].map((tag) => {
                          const isSelected = historyRatingTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setHistoryRatingTags(historyRatingTags.filter(t => t !== tag));
                                } else {
                                  setHistoryRatingTags([...historyRatingTags, tag]);
                                }
                              }}
                              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#EBFDF2] border-emerald-500 text-emerald-800'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comment Area */}
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-black text-gray-400 tracking-wider">
                        ADD A COMMENT (OPTIONAL)
                      </label>
                      <textarea
                        value={historyRatingText}
                        onChange={(e) => setHistoryRatingText(e.target.value)}
                        placeholder="Write dynamic feedback here..."
                        className="w-full bg-[#F4F8F5] border border-gray-200 text-gray-700 p-3 h-24 text-xs font-semibold rounded-xl focus:outline-none focus:bg-white"
                      />
                    </div>

                    {/* Bottom Control Bar elements */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setHistorySubView('list');
                          setHistoryTargetItem(null);
                        }}
                        className="px-5 py-2.5 rounded-xl border-2 border-emerald-500/80 text-emerald-800 hover:bg-emerald-50 text-xs font-black transition-all cursor-pointer active:scale-95 text-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Update items state inline simulation
                          setHistoryItems(prev =>
                            prev.map(item =>
                              item.id === historyTargetItem.id
                                ? { ...item, is_rated: true, rating: historyRatingStars, feedback: historyRatingText || 'Completed evaluation' }
                                : item
                            )
                          );
                          // Progress Subview
                          setHistorySubView('success');
                        }}
                        className="px-6 py-3 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-95 text-center flex items-center justify-center gap-2"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Submit rating</span>
                      </button>
                    </div>

                  </div>

                  {/* Right Worker Sidebar details Card (4 Column Span) */}
                  <div className="lg:col-span-4 space-y-6 text-left">
                    <div className="bg-white border border-gray-150 p-5 rounded-3xl shadow-xs space-y-5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                        WORKER PROFILE
                      </span>

                      {/* Profiler Center Card */}
                      <div className="flex flex-col items-center text-center py-2 space-y-3">
                        <div className="w-14 h-14 rounded-full bg-[#1E4D2B] hover:bg-[#1E4D2B]/90 font-black text-white text-[19px] flex items-center justify-center tracking-tight shadow-md select-none">
                          {historyTargetItem.code || 'SK'}
                        </div>
                        <div>
                          <h4 className="text-[13.5px] font-black text-gray-900 leading-tight">
                            {historyTargetItem.worker === 'Sunil K.' ? 'Sunil Kumara' : historyTargetItem.worker}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1 block">
                            Morning Shift
                          </span>
                        </div>
                      </div>

                      {/* Stat micro rows layout */}
                      <div className="grid grid-cols-3 gap-2.5 pt-2">
                        <div className="p-3 bg-[#F4F8F5] border border-emerald-100/40 rounded-xl flex flex-col items-center justify-center text-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 mb-1 shrink-0" />
                          <span className="text-gray-900 font-black text-[12.5px] leading-tight">312</span>
                          <span className="text-[9.5px] text-gray-400 font-bold block mt-0.5 leading-none">Jobs</span>
                        </div>
                        <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl flex flex-col items-center justify-center text-center">
                          <Zap className="w-4 h-4 text-amber-600 mb-1 shrink-0 animate-pulse" />
                          <span className="text-gray-900 font-black text-[12.5px] leading-tight">94%</span>
                          <span className="text-[9.5px] text-gray-400 font-bold block mt-0.5 leading-none">Punct</span>
                        </div>
                        <div className="p-3 bg-[#F4F8F5] border border-emerald-100/40 rounded-xl flex flex-col items-center justify-center text-center">
                          <Leaf className="w-4 h-4 text-emerald-700 mb-1 shrink-0" />
                          <span className="text-gray-900 font-black text-[12.5px] leading-tight">5★</span>
                          <span className="text-[9.5px] text-gray-400 font-bold block mt-0.5 leading-none">Eco</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* SUBVIEW 3: REVIEW SUCCESS CONFIRMATION PANEL */}
              {historySubView === 'success' && historyTargetItem && (
                <div className="max-w-xl mx-auto bg-white border border-gray-150 rounded-3xl shadow-sm p-8 text-center space-y-6 animate-in zoom-in duration-150">
                  
                  {/* Huge Circular Success tick badge icon */}
                  <div className="mx-auto w-16 h-16 rounded-full bg-[#1E4D2B] flex items-center justify-center text-white shrink-0 shadow-lg select-none">
                    <Check className="w-9 h-9 text-white stroke-[3.5]" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-gray-900 font-sans tracking-tight">
                      Thanks for your feedback!
                    </h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed font-bold">
                      Your rating helps us improve service quality and reward great workers.
                    </p>
                  </div>

                  {/* Summary row panel info representing rating details */}
                  <div className="bg-[#FAFDFB] border border-emerald-100 p-4.5 rounded-2xl flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9.5 h-9.5 rounded-full bg-emerald-100/90 text-xs font-black text-emerald-850 flex items-center justify-center tracking-tight select-none">
                        {historyTargetItem.code || 'SK'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900">
                          {historyTargetItem.worker === 'Sunil K.' ? 'Sunil Kumara' : historyTargetItem.worker}
                        </h4>
                        
                        {/* Rating row stars */}
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((starIdx) => (
                            <Star
                              key={starIdx}
                              className={`w-3.5 h-3.5 shrink-0 ${
                                starIdx <= historyRatingStars
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-gray-200 fill-transparent'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Red heart sign on right */}
                    <div className="text-[#1E4D2B] shrink-0">
                      <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
                    </div>
                  </div>

                  {/* Redirect layout actions */}
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setHistorySubView('list');
                        setHistoryTargetItem(null);
                        setHistoryRatingTags(['On time', 'Polite', 'Clean']);
                        setHistoryRatingText('Very punctual and friendly. Thanks!');
                      }}
                      className="py-3 px-4 bg-white hover:bg-emerald-50 rounded-xl border-2 border-emerald-500/80 text-emerald-800 text-xs font-black cursor-pointer transition-all active:scale-95 text-center"
                    >
                      View history
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('home');
                        setHistorySubView('list');
                        setHistoryTargetItem(null);
                      }}
                      className="py-3 px-4 bg-[#1E4D2B] hover:bg-[#15341D] text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-95 text-center flex items-center justify-center gap-1"
                    >
                      <span>Back to home</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}
 
          {/* TAB 3: BULK SERVICE BOOKING (Special Pickup) */}
          {activeTab === 'bulk' && (
            <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200" id="special-pickup-root-deck">
              
              {/* STEP 1: FORM VIEW */}
              {specialStep === 'form' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
                  
                  {/* Left Column Form (8 Column Span) */}
                  <div className="lg:col-span-8 space-y-5">
                    
                    {/* Top Banner Alert */}
                    <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-xs font-semibold text-emerald-800">
                      <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Bulky / e-waste / construction debris pickups incur a fee.</span>
                    </div>

                    {/* Main Form Fields Container */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-5 shadow-xs">
                      
                      {/* Categories Selector */}
                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-black text-gray-400 tracking-wider">
                          CATEGORY
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { name: 'Furniture', label: 'Furniture', icon: Armchair, prefillDesc: 'Old sofa, 3-seater', prefillWeight: '45' },
                            { name: 'E-Waste', label: 'E-Waste', icon: Tv, prefillDesc: 'Dead CRT television and battery pack', prefillWeight: '20' },
                            { name: 'Construction', label: 'Construction', icon: Wrench, prefillDesc: 'Wooden planks & tile remnants', prefillWeight: '60' },
                            { name: 'Other', label: 'Other', icon: Grid, prefillDesc: 'Bulk garden waste piles', prefillWeight: '15' }
                          ].map((cat) => {
                            const IconComp = cat.icon;
                            const isSelected = specialCategory === cat.name;
                            return (
                              <button
                                key={cat.name}
                                type="button"
                                onClick={() => {
                                  setSpecialCategory(cat.name as any);
                                  setSpecialDescription(cat.prefillDesc);
                                  setSpecialWeight(cat.prefillWeight);
                                }}
                                className={`p-4 rounded-2xl border transition-all duration-150 text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50/20 border-emerald-600 text-emerald-800 font-extrabold shadow-xs'
                                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-500 font-semibold'
                                }`}
                              >
                                <IconComp className={`w-6 h-6 ${isSelected ? 'text-emerald-700' : 'text-gray-400'}`} />
                                <span className="text-xs">{cat.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Item Description Input */}
                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-black text-[#1E4D2B] tracking-wider">
                          ITEM DESCRIPTION
                        </label>
                        <div className="relative">
                          <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={specialDescription}
                            onChange={(e) => setSpecialDescription(e.target.value)}
                            placeholder="Describe bulky pieces e.g. Old broken TV set, Coffee study drawer..."
                            className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Est Weight and Preferred Date Grid Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] uppercase font-black text-gray-400 tracking-wider">
                            EST. WEIGHT (KG)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-black text-gray-400">⌛</span>
                            <input
                              type="number"
                              value={specialWeight}
                              onChange={(e) => setSpecialWeight(e.target.value)}
                              placeholder="Weight in kg"
                              className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] uppercase font-black text-gray-400 tracking-wider">
                            PREFERRED DATE
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="date"
                              value={specialDate}
                              className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
                              onChange={(e) => setSpecialDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Bottom control buttons under form */}
                    <div className="flex items-center justify-end gap-3.5 pt-1 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setMessage("Special pickup request saved successfully as a draft.");
                        }}
                        className="px-6 py-3 rounded-xl border border-emerald-500 text-emerald-800 bg-white hover:bg-emerald-50/20 text-xs font-black transition-all cursor-pointer select-none active:scale-95"
                      >
                        Save draft
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialStep('estimate');
                        }}
                        className="px-6 py-3 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <span>Continue to estimate</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>

                  </div>

                  {/* Right Column Sidebar Upload (4 Column Span) */}
                  <div className="lg:col-span-4 space-y-5 font-sans">
                    
                    {/* Add Photo Drag and Drop area */}
                    <div className="bg-white border border-gray-150 p-6 rounded-3xl shadow-xs text-left space-y-4">
                      <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block font-sans">
                        ADD PHOTO (OPTIONAL)
                      </span>
                      
                      {/* File upload hidden field */}
                      <input 
                        type="file" 
                        id="special-photo-uploader" 
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSpecialPhotoName(e.target.files[0].name);
                          }
                        }}
                      />

                      {/* Dotted Upload zone */}
                      <div 
                        onClick={() => document.getElementById('special-photo-uploader')?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setSpecialPhotoName(e.dataTransfer.files[0].name);
                          }
                        }}
                        className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#FAFAFA] hover:bg-emerald-50/10 min-h-[180px] text-gray-450"
                      >
                        <span className="text-2xl mb-2">📸</span>
                        {specialPhotoName ? (
                          <div className="space-y-1">
                            <p className="text-xs font-black text-emerald-800 line-clamp-1">
                              ✓ {specialPhotoName}
                            </p>
                            <span className="text-[10px] text-gray-400">Click to change photo</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs font-black text-gray-700">
                              Drag photo or click to upload
                            </p>
                            <p className="text-[10px] text-gray-400">
                              JPG, PNG up to 5MB
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Micro Tip container */}
                      <div className="bg-[#FAFDFB] border border-emerald-100 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-850 bg-emerald-50/40">
                        <span className="text-[9.5px] uppercase font-extrabold text-[#1E4D2B] tracking-wider block font-sans">
                          TIP
                        </span>
                        <p className="text-[11px] leading-relaxed text-gray-600 font-semibold font-sans">
                          A clear photo helps our team prepare the right vehicle and crew.
                        </p>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* STEP 2: COST ESTIMATE VIEW */}
              {specialStep === 'estimate' && (() => {
                // Dynamic Fee Math Block
                const baseFees = { Furniture: 1500, 'E-Waste': 1200, Construction: 2500, Other: 1000 };
                const currentBaseFee = baseFees[specialCategory] || 1500;
                const weightVal = parseFloat(specialWeight) || 0;
                const surchargeFee = Math.round(weightVal * 25);
                const priorityFee = 200;
                const ecoDiscount = 25;
                const grandTotal = currentBaseFee + surchargeFee + priorityFee - ecoDiscount;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left font-sans">
                    
                    {/* Left Column Breakdown Card (8 Column Span) */}
                    <div className="lg:col-span-8 bg-white border border-gray-150 p-6 md:p-8 rounded-3xl shadow-xs space-y-6">
                      
                      <div className="border-b border-gray-100 pb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                          SPECIAL PICKUP
                        </span>
                        <h2 className="text-2xl font-black text-gray-900 mt-1">
                          {specialDescription} • {specialWeight} kg
                        </h2>
                        <p className="text-xs text-gray-400 font-bold mt-1.5">
                          Pickup scheduled: {specialDate}, 9:00 AM
                        </p>
                      </div>

                      {/* Nested Bill Spreadsheet line items */}
                      <div className="bg-[#F8FBF8] border border-emerald-100/40 p-5 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-semibold font-sans">Base fee ({specialCategory})</span>
                          <span className="font-mono font-black text-gray-900">LKR {currentBaseFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-semibold font-sans">Weight surcharge ({specialWeight} kg x 25)</span>
                          <span className="font-mono font-black text-gray-900">LKR {surchargeFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-semibold font-sans">Same-week priority</span>
                          <span className="font-mono font-black text-gray-900">LKR {priorityFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-emerald-800">
                          <span className="font-semibold font-sans">Eco-recycle discount</span>
                          <span className="font-mono font-black">LKR -{ecoDiscount.toLocaleString()}</span>
                        </div>

                        <div className="border-t border-emerald-100/60 pt-4 flex justify-between items-center">
                          <span className="text-sm font-black text-gray-900 font-sans">Total</span>
                          <span className="text-xl font-black text-[#1E4D2B] font-mono">LKR {grandTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Action buttons footer */}
                      <div className="flex items-center justify-end gap-3.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setSpecialStep('form')}
                          className="px-5 py-2.5 rounded-xl border-2 border-emerald-500/80 text-emerald-800 hover:bg-emerald-50 text-xs font-black cursor-pointer transition-all active:scale-95 text-center font-sans"
                        >
                          Edit request
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpecialStep('checkout')}
                          className="px-6 py-3 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white text-xs font-black cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-95 text-center flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4 text-white" />
                          <span>Pay LKR {grandTotal.toLocaleString()}</span>
                        </button>
                      </div>

                    </div>

                    {/* Right side Location / Eco savings Widgets sidebar (4 Column Span) */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Pickup details address element */}
                      <div className="bg-white border border-gray-150 p-5 rounded-3xl shadow-xs space-y-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                          Pickup details
                        </span>

                        <div className="space-y-3.5 text-xs text-gray-750">
                          <div className="flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-[#1E4D2B] shrink-0 mt-0.5" />
                            <div>
                              <p className="font-black text-gray-900">{profileUnit || 'Not Assigned'}, {profileBlock || 'None'}</p>
                              <span className="text-[10.5px] text-gray-400 font-semibold block">Greenfield Residencies</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <Calendar className="w-4 h-4 text-[#1E4D2B] shrink-0 mt-0.5" />
                            <div>
                              <p className="font-black text-gray-900">
                                {(() => {
                                  try {
                                    const d = new Date(specialDate);
                                    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                                  } catch (e) {
                                    return 'Wed, 13 May';
                                  }
                                })()}
                              </p>
                              <span className="text-[10.5px] text-gray-400 font-semibold block">9:00 AM</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Eco Savings notice card of LKR 25 */}
                      <div className="bg-[#FAFDFB] border-2 border-dashed border-emerald-200 p-5 rounded-3xl text-left space-y-2">
                        <div className="flex items-center gap-2">
                          <Leaf className="w-4.5 h-4.5 text-emerald-600 fill-emerald-100" />
                          <h4 className="text-xs font-black text-[#1E4D2B] uppercase tracking-wide">
                            You saved LKR 25
                          </h4>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed font-semibold">
                          For sorting recyclables before pickup. Keep it up 🌿
                        </p>
                      </div>

                    </div>

                  </div>
                );
              })()}

              {/* STEP 3: PAYHERE SANDBOX CHECKOUT PAYMENT VIEW */}
              {specialStep === 'checkout' && (() => {
                const baseFees = { Furniture: 1500, 'E-Waste': 1200, Construction: 2500, Other: 1000 };
                const currentBaseFee = baseFees[specialCategory] || 1500;
                const weightVal = parseFloat(specialWeight) || 0;
                const surchargeFee = Math.round(weightVal * 25);
                const priorityFee = 200;
                const ecoDiscount = 25;
                const subTotal = currentBaseFee + surchargeFee;
                const grandTotal = subTotal + priorityFee - ecoDiscount;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
                    
                    {/* Left Main Card Payment Terminal Form (8 Column Span) */}
                    <div className="lg:col-span-8 bg-white border border-gray-150 rounded-3xl shadow-sm relative overflow-hidden">
                      {/* Top Header Banner Green Lock */}
                      <div className="bg-[#EBFDF2] text-emerald-800 py-3 px-6 flex items-center justify-between border-b border-emerald-100">
                        <div className="flex items-center gap-2 text-[11px] font-black tracking-wide font-sans md:uppercase">
                          <Lock className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                          <span>payhere.lk/secure-checkout • 256-bit SSL secured</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold font-mono">ID: PH-E51A4</span>
                      </div>

                      {/* Fields area */}
                      <div className="p-6 md:p-8 space-y-6">
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">PayHere</h3>
                            <p className="text-[10.5px] text-gray-400 font-bold uppercase block tracking-wider mt-0.5">
                              Sandbox checkout
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold font-mono text-[#1E4D2B]">
                              LKR {grandTotal.toLocaleString()}.00
                            </span>
                          </div>
                        </div>

                        {/* Input Deck */}
                        <div className="space-y-4">
                          
                          {/* Card Number */}
                          <div className="space-y-1.5">
                            <label className="block text-[9.5px] uppercase font-black text-gray-400 tracking-wider">
                              CARD NUMBER
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">💳</span>
                              <input
                                type="text"
                                value={specialCardNumber}
                                onChange={(e) => setSpecialCardNumber(e.target.value)}
                                placeholder="4321 4567 8910 4821"
                                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Expiry / CVV Grid row */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-[9.5px] uppercase font-black text-gray-400 tracking-wider">
                                EXPIRY
                              </label>
                              <input
                                type="text"
                                value={specialCardExpiry}
                                onChange={(e) => setSpecialCardExpiry(e.target.value)}
                                placeholder="12 / 28"
                                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[9.5px] uppercase font-black text-gray-400 tracking-wider">
                                CVV
                              </label>
                              <input
                                type="password"
                                value={specialCardCvv}
                                onChange={(e) => setSpecialCardCvv(e.target.value)}
                                placeholder="***"
                                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Cardholder Name */}
                          <div className="space-y-1.5">
                            <label className="block text-[9.5px] uppercase font-black text-gray-400 tracking-wider">
                              CARDHOLDER NAME
                            </label>
                            <input
                              type="text"
                              value={specialCardName}
                              onChange={(e) => setSpecialCardName(e.target.value)}
                              placeholder="A. Rajapaksa"
                              className="w-full bg-white border border-gray-200 text-gray-850 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:border-emerald-600 focus:outline-none"
                            />
                          </div>

                        </div>

                        {/* Card Brands line logos */}
                        <div className="flex gap-2.5 items-center pt-1 font-sans">
                          <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block font-sans mr-1">
                            Accepted:
                          </span>
                          <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[10.5px] font-black text-blue-800 font-mono italic flex items-center justify-center">
                            VISA
                          </span>
                          <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[10.5px] font-black text-orange-700 font-mono italic flex items-center justify-center">
                            Mastercard
                          </span>
                        </div>

                        {/* Interactive Payment Switcher Buttons to test Decline simulation */}
                        <div className="p-3.5 bg-yellow-50/50 border border-yellow-105 rounded-2xl flex flex-wrap justify-between items-center gap-2.5 font-sans">
                          <span className="text-[10px] text-amber-900 font-bold leading-tight flex items-center gap-1 font-sans">
                            <span>⚠️</span>
                            <span>Dev Sandbox: test pass/fail results</span>
                          </span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActionLoading(true);
                                setTimeout(() => {
                                  setActionLoading(false);
                                  setSpecialStep('success');
                                  setMessage("Dev Sandbox Payment Approved successfully!");
                                }, 1200);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              Simulate Pass
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionLoading(true);
                                setTimeout(() => {
                                  setActionLoading(false);
                                  setSpecialStep('failed');
                                  setMessage("Dev Sandbox Payment Declined: Bank rejected credit card parameters.");
                                }, 1000);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              Simulate Decline
                            </button>
                          </div>
                        </div>

                        {/* Main Payment approval actions */}
                        <div className="space-y-4 font-sans">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => {
                              setActionLoading(true);
                              setTimeout(() => {
                                setActionLoading(false);
                                setSpecialStep('success');
                                setMessage("Sandbox secure checkout transfer completed successfully!");
                              }, 1500);
                            }}
                            className="w-full py-3.5 bg-[#1E4D2B] hover:bg-[#15341D] disabled:opacity-50 text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-md active:scale-95 text-center flex items-center justify-center gap-2"
                          >
                            {actionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <>
                                <Lock className="w-4 h-4 text-white" />
                                <span>Pay LKR {grandTotal.toLocaleString()}</span>
                              </>
                            )}
                          </button>

                          <p className="text-[10.5px] text-gray-400 font-semibold text-center select-none font-sans mt-1">
                            Powered by PayHere • No card details stored by EcoTrack
                          </p>
                        </div>

                      </div>

                    </div>

                    {/* Right side Order Summary panel (4 Column Span) */}
                    <div className="lg:col-span-4 space-y-6 font-sans">
                      
                      {/* Detailed Order Summary Card */}
                      <div className="bg-white border border-gray-150 p-6 rounded-3xl shadow-xs space-y-4 text-left">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-mono">
                          ORDER SUMMARY
                        </span>
                        
                        <div className="border-b border-gray-100 pb-2.5">
                          <h4 className="text-xs font-black text-gray-900 font-sans tracking-tight leading-tight">
                            EcoTrack • Greenfield
                          </h4>
                          <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block font-mono font-sans">
                            Unit {profileUnit || 'Not Assigned'} Collection
                          </span>
                        </div>

                        {/* List math details */}
                        <div className="space-y-2 text-xs font-semibold text-gray-600">
                          <div className="flex justify-between items-center">
                            <span className="font-sans">Subtotal</span>
                            <span className="font-mono text-gray-950 font-bold">LKR {subTotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-sans">Priority Surcharge</span>
                            <span className="font-mono text-gray-950 font-bold">LKR {priorityFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-800 font-bold font-sans">
                            <span>Eco discount</span>
                            <span className="font-mono">-LKR {ecoDiscount.toLocaleString()}</span>
                          </div>

                          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                            <span className="font-extrabold text-[#1E4D2B] text-xs font-sans">Total</span>
                            <span className="font-mono font-black text-emerald-850 text-sm">LKR {grandTotal.toLocaleString()}</span>
                          </div>
                        </div>

                      </div>

                      {/* Green secure PCI badge sign */}
                      <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl flex items-center justify-center gap-2 text-[10.5px] font-bold">
                        <span className="text-emerald-700">🔒</span>
                        <span>Encrypted & PCI-DSS compliant</span>
                      </div>

                    </div>

                  </div>
                );
              })()}

              {/* STEP 4: PAYMENT SUCCESSFUL VIEW */}
              {specialStep === 'success' && (
                <div className="max-w-xl mx-auto bg-white border border-gray-150 rounded-3xl shadow-sm p-8 text-center space-y-6 animate-in zoom-in duration-150 text-left font-sans">
                  
                  {/* Huge success circle green badge */}
                  <div className="mx-auto w-16 h-16 rounded-full bg-[#1E4D2B] flex items-center justify-center text-white shrink-0 shadow-lg select-none">
                    <Check className="w-9 h-9 text-white stroke-[3.5]" />
                  </div>

                  <div className="space-y-1 text-center">
                    <h3 className="text-xl font-black text-gray-900 font-sans tracking-tight">
                      Payment successful
                    </h3>
                    <p className="text-xs text-gray-400 font-extrabold pb-1">
                      Your special pickup is confirmed.
                    </p>
                  </div>

                  {/* Summary Nested Matrix Block */}
                  <div className="bg-[#FAFDFB] border border-gray-150 p-5 rounded-2xl space-y-3.5 text-xs text-gray-700 font-semibold font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 uppercase font-black text-[9px] tracking-wider font-sans">Amount</span>
                      <span className="font-mono font-black text-gray-950">LKR 2,800.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 uppercase font-black text-[9px] tracking-wider font-sans">Transaction</span>
                      <span className="font-mono font-black text-emerald-850 font-sans">#TXN-294821</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 uppercase font-black text-[9px] tracking-wider font-sans">Date</span>
                      <span className="font-mono font-black text-gray-950">2026-05-10, 10:42 AM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 uppercase font-black text-[9px] tracking-wider font-sans">Pickup</span>
                      <span className="font-mono font-black text-gray-950">13 May, 9:00 AM</span>
                    </div>
                  </div>

                  {/* Redirect Actions Grid */}
                  <div className="grid grid-cols-2 gap-3.5 pt-3">
                    <button
                      type="button"
                      onClick={() => setSpecialStep('receipt')}
                      className="py-3 px-4 bg-white hover:bg-emerald-50 rounded-xl border-2 border-[#1E4D2B] text-[#1E4D2B] text-xs font-black cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <FileDown className="w-4 h-4 text-[#1E4D2B]" />
                      <span>Download receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Reset everything back to form
                        setSpecialStep('form');
                        setActiveTab('home');
                      }}
                      className="py-3 px-4 bg-[#1E4D2B] hover:bg-[#15341D] text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-95 text-center flex items-center justify-center gap-1"
                    >
                      <span>Back to home</span>
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 5: PAYMENT FAILED VIEW */}
              {specialStep === 'failed' && (
                <div className="max-w-xl mx-auto bg-white border border-gray-150 rounded-3xl shadow-sm p-8 text-center space-y-6 animate-in zoom-in duration-150 text-left font-sans">
                  
                  {/* Huge Circular Red Cross Danger Badge */}
                  <div className="mx-auto w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-lg select-none">
                    <X className="w-9 h-9 text-white stroke-[3.5]" />
                  </div>

                  <div className="space-y-1 text-center">
                    <h3 className="text-xl font-black text-gray-900 font-sans tracking-tight">
                      Payment failed
                    </h3>
                    <p className="text-xs text-gray-400 font-extrabold max-w-sm mx-auto leading-relaxed">
                      Your card was declined by the bank. No money was deducted.
                    </p>
                  </div>

                  {/* Warning red callout code error box */}
                  <div className="bg-rose-50/55 border border-rose-150 p-4 rounded-xl flex items-start gap-2 text-xs font-bold text-rose-800 leading-relaxed font-sans">
                    <span className="text-sm">⚠️</span>
                    <span>
                      <strong>Error: ERR_CARD_DECLINED</strong> • Try a different card or contact your bank.
                    </span>
                  </div>

                  {/* Buttons controls */}
                  <div className="grid grid-cols-2 gap-3.5 pt-3">
                    <button
                      type="button"
                      onClick={() => setSpecialStep('estimate')}
                      className="py-3 px-4 bg-white hover:bg-slate-50 rounded-xl border border-gray-200 text-gray-500 text-xs font-black cursor-pointer transition-all active:scale-95 text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecialStep('checkout')}
                      className="py-3 px-4 bg-[#1E4D2B] hover:bg-[#15341D] text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-95 text-center flex items-center justify-center gap-1"
                    >
                      <span>Try again</span>
                    </button>
                  </div>

                  {/* Bottom link support */}
                  <div className="text-center pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('chatbot');
                        setMessage("Redirected to Eco-Bot. Describe the card decline error so our assistant can help you.");
                      }}
                      className="text-xs font-black text-[#1E4D2B] hover:underline cursor-pointer"
                    >
                      ☎ Contact support
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 6: RECEIPT INVOICE VIEW */}
              {specialStep === 'receipt' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
                  
                  {/* Left Receipt sheet area (8 Column Span) */}
                  <div className="lg:col-span-8 space-y-5">
                    
                    {/* Upper Buttons print row bar */}
                    <div className="flex gap-2 justify-end pb-1 font-sans">
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="py-2 px-4 rounded-xl border border-gray-200 text-gray-650 bg-white hover:bg-gray-50 font-black text-xs cursor-pointer transition-all active:scale-95 inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5 text-gray-400" />
                        <span>Print</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="py-2 px-4 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white text-xs font-black cursor-pointer transition-all shadow-xs active:scale-95 inline-flex items-center gap-1.5"
                      >
                        <FileDown className="w-3.5 h-3.5 text-white" />
                        <span>Download PDF</span>
                      </button>
                    </div>

                    {/* Actual Physical Bill Layout frame */}
                    <div id="printable-receipt-card" className="bg-white border border-gray-200/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm relative overflow-hidden font-sans">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1E4D2B]"></div>

                      <div className="flex justify-between items-start pt-1 pb-4 border-b border-gray-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-widest font-mono">
                            ECOTRACK
                          </span>
                          <h3 className="text-lg font-black text-[#1E4D2B] leading-none mt-1 font-sans">
                            Payment Receipt
                          </h3>
                        </div>
                        <Leaf className="w-7 h-7 text-emerald-600" />
                      </div>

                      {/* Receipt Meta Rows */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 text-xs font-semibold text-gray-600 font-sans">
                        <div>
                          <span className="block text-[9px] uppercase font-black text-gray-400 tracking-wider">Receipt no.</span>
                          <span className="font-mono font-black text-gray-900 block mt-0.5">R-294821</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-black text-gray-400 tracking-wider">Resident</span>
                          <span className="font-sans font-black text-gray-900 block mt-0.5">{profileName}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-black text-gray-400 tracking-wider">Unit</span>
                          <span className="font-sans font-black text-gray-900 block mt-0.5">{profileUnit}, {profileBlock}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-black text-gray-400 tracking-wider">Date</span>
                          <span className="font-mono font-black text-gray-900 block mt-0.5">{specialDate || '2026-05-13'}, 10:42 AM</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-black text-gray-400 tracking-wider">Method</span>
                          <span className="font-mono font-black text-gray-900 block mt-0.5">PayHere • Visa ****{specialCardNumber ? specialCardNumber.slice(-4) : '4821'}</span>
                        </div>
                      </div>

                      {/* Items Math block table detail listings */}
                      {(() => {
                        const baseFees = { Furniture: 1500, 'E-Waste': 1200, Construction: 2500, Other: 1000 };
                        const currentBaseFee = baseFees[specialCategory] || 1500;
                        const weightVal = parseFloat(specialWeight) || 0;
                        const surchargeFee = Math.round(weightVal * 25);
                        const priorityFee = 200;
                        const ecoDiscount = 25;
                        const subTotal = currentBaseFee + surchargeFee;
                        const grandTotal = subTotal + priorityFee - ecoDiscount;

                        return (
                          <>
                            <div className="border-t border-b border-gray-100 py-4.5 space-y-3.5 text-xs text-gray-700 font-semibold font-sans">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-sans">Special pickup — {specialCategory} ({specialDescription}), {specialWeight}kg</span>
                                <span className="font-mono font-black text-gray-900">LKR {subTotal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-700">
                                <span className="text-gray-500 font-sans">Priority fee</span>
                                <span className="font-mono font-black text-gray-900">LKR {priorityFee.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-emerald-800">
                                <span className="font-sans">Eco discount</span>
                                <span className="font-mono font-black">-LKR {ecoDiscount.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Grand Total row */}
                            <div className="flex justify-between items-center font-sans">
                              <span className="text-sm font-black text-gray-900">TOTAL PAID</span>
                              <span className="text-xl font-black text-[#1E4D2B] font-mono">LKR {grandTotal.toLocaleString()}.00</span>
                            </div>
                          </>
                        );
                      })()}

                      {/* Bottom disclaimer micro note */}
                      <p className="text-[10px] text-gray-400 font-semibold text-center italic mt-4 font-sans">
                        Computer-generated receipt • Thank you for using EcoTrack 🌿
                      </p>

                    </div>

                  </div>

                  {/* Right Column Share panel (4 Column Span) */}
                  <div className="lg:col-span-4 space-y-5 font-sans">
                    
                    {/* Share / Send interactive utilities */}
                    <div className="bg-white border border-gray-150 p-6 rounded-3xl shadow-xs space-y-4 text-left">
                      <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block font-sans">
                        SHARE / SEND
                      </span>

                      {/* Buttons Deck */}
                      <div className="space-y-2.5">
                        <button
                          type="button"
                          onClick={() => setMessage("Receipt copy link emailed to donovinishansalgadu@gmail.com successfully!")}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-[#F4F8F5]/30 font-black text-xs cursor-pointer text-left transition-all flex items-center justify-between"
                        >
                          <span>📧 Email receipt</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMessage("SMS link confirmation sent successfully to +94 (77) 123-4567!")}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-[#F4F8F5]/30 font-black text-xs cursor-pointer text-left transition-all flex items-center justify-between"
                        >
                          <span>💬 Send SMS</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText("https://ecotrack.lk/payments/receipt/R-294821");
                              setMessage("Success: Receipt link copied to clipboard!");
                            } catch (err) {
                              setMessage("Success: Custom link: https://ecotrack.lk/payments/receipt/R-294821");
                            }
                          }}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-[#F4F8F5]/30 font-black text-xs cursor-pointer text-left transition-all flex items-center justify-between"
                        >
                          <span>🔗 Copy link</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSpecialStep('form');
                            setActiveTab('history');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl border border-emerald-500 hover:border-emerald-600 bg-emerald-50/20 text-emerald-800 hover:bg-emerald-50/40 font-black text-xs cursor-pointer text-left transition-all flex items-center justify-between"
                        >
                          <span>♻ View in history</span>
                          <ChevronRight className="w-4 h-4 text-emerald-700" />
                        </button>
                      </div>

                    </div>

                  </div>

                </div>
              )}

            </div>
          )}
 
          {/* TAB 4: BILLING & LEDGER DETAILS (Payments tab) */}
          {activeTab === 'billing' && (
            <div className="space-y-6 max-w-6xl mx-auto w-full text-left" id="billing-ledger">
              
              {/* Top Summary Row of 4 Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="billing-summary-cards">
                {/* Year to date card */}
                <div className="bg-white p-5 rounded-3xl border border-gray-200/60 shadow-xs flex flex-col justify-between" id="summary-card-ytd">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-850 w-11 h-11 flex items-center justify-center">
                    <Banknote className="w-5.5 h-5.5 text-emerald-700" />
                  </div>
                  <div className="mt-5">
                    <h4 className="text-2xl font-black text-[#1E4D2B] tracking-tight">LKR {ytdTotal.toLocaleString()}</h4>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide mt-1">Year to date</p>
                  </div>
                </div>

                {/* This month card */}
                <div className="bg-white p-5 rounded-3xl border border-gray-200/60 shadow-xs flex flex-col justify-between" id="summary-card-thismonth">
                  <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-805 w-11 h-11 flex items-center justify-center">
                    <CalendarRange className="w-5.5 h-5.5 text-blue-700" />
                  </div>
                  <div className="mt-5">
                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">LKR {currentMonthTotal.toLocaleString()}</h4>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide mt-1">This month</p>
                  </div>
                </div>

                {/* Special pickups count card */}
                <div className="bg-white p-5 rounded-3xl border border-gray-200/60 shadow-xs flex flex-col justify-between" id="summary-card-special">
                  <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-900 w-11 h-11 flex items-center justify-center">
                    <Package className="w-5.5 h-5.5 text-orange-700" />
                  </div>
                  <div className="mt-5">
                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">{specialPickupsCountVal}</h4>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide mt-1">Special pickups</p>
                  </div>
                </div>

                {/* Year over Year trend card */}
                <div className="bg-white p-5 rounded-3xl border border-gray-200/60 shadow-xs flex flex-col justify-between" id="summary-card-trend">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 text-[#1E4D2B] w-11 h-11 flex items-center justify-center">
                    <TrendingDown className="w-5.5 h-5.5 text-emerald-850" />
                  </div>
                  <div className="mt-5">
                    <h4 className="text-2xl font-black text-[#1E4D2B] tracking-tight">{yoyTrendPercent}</h4>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide mt-1">vs last year</p>
                  </div>
                </div>
              </div>

              {/* Outstanding Alert in case there is some unpaid items from the database! */}
              {payments.some(p => p.status === 'unpaid') && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-[#FFF2F2] border border-red-100 rounded-2xl gap-4 animate-in fade-in duration-200" id="outstanding-alert">
                  <div>
                    <span className="text-[10px] text-red-650 font-extrabold uppercase tracking-wider block font-sans">Outstanding Account balance</span>
                    <p className="text-xl font-black text-red-600 mt-1">
                      LKR {payments.filter(p => p.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}.00
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 max-w-sm font-semibold leading-relaxed font-sans">
                    You have unpaid recycling maintenance levies. Settle outstanding invoices directly from the list below to retain clean compliance.
                  </p>
                </div>
              )}

              {/* Filter Tabs & History Table Panel Card */}
              <div className="bg-white border border-gray-200/60 rounded-3xl shadow-xs overflow-hidden" id="billing-history-panel">
                
                {/* Filters Row */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-2 lg:gap-3 bg-white" id="billing-filters-box">
                  {(['all', 'monthly', 'special', 'refunds'] as const).map((tab) => {
                    const isSelected = billingFilter === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setBillingFilter(tab)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#1E4D2B] text-white shadow-xs' 
                            : 'bg-[#F4F8F5] text-[#1E4D2B] hover:bg-emerald-50'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="billing-table">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[#F4F8F5]/40 text-[10px] uppercase tracking-wider text-gray-400 font-extrabold select-none">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80 text-xs">
                      {(() => {
                        const filteredPayments = payments.filter((p) => {
                          // Search query filter
                          if (searchQuery) {
                            const q = searchQuery.toLowerCase();
                            const dateStr = p.date || p.created_at?.slice(0, 10) || '';
                            const descStr = (p.notes || p.description || '').toLowerCase();
                            const refStr = (p.reference_code || '').toLowerCase();
                            if (!dateStr.includes(q) && !descStr.includes(q) && !refStr.includes(q)) {
                              return false;
                            }
                          }

                          // Filter tab category
                          if (billingFilter === 'monthly') {
                            return p.payment_type === 'monthly_fee' || p.notes?.toLowerCase().includes('monthly');
                          }
                          if (billingFilter === 'special') {
                            return p.payment_type === 'special_pickup' || p.notes?.toLowerCase().includes('special');
                          }
                          if (billingFilter === 'refunds') {
                            return p.payment_type === 'refund' || p.notes?.toLowerCase().includes('refund');
                          }
                          
                          return true;
                        });

                        if (filteredPayments.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-extrabold">
                                No billing transactions matching "{billingFilter}" or search keyword found.
                              </td>
                            </tr>
                          );
                        }

                        return filteredPayments.map((p) => {
                          const isMonthly = p.payment_type === 'monthly_fee' || p.notes?.toLowerCase().includes('monthly');
                          return (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                              {/* Date column */}
                              <td className="px-6 py-4 font-black text-[#1E4D2B] whitespace-nowrap">
                                {p.date || p.created_at?.slice(0, 10) || '2026-05-13'}
                              </td>

                              {/* Description with circular icon */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isMonthly ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                                  }`}>
                                    {isMonthly ? (
                                      <Calendar className="w-4.5 h-4.5 text-emerald-700" />
                                    ) : (
                                      <Package className="w-4.5 h-4.5 text-blue-700" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-gray-800">
                                      {p.notes || p.description || 'Monthly Waste & Levies'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Type Column */}
                              <td className="px-6 py-4 font-semibold text-gray-400 capitalize">
                                {isMonthly ? 'Monthly' : 'Special'}
                              </td>

                              {/* Amount Column */}
                              <td className="px-6 py-4 font-black text-gray-850 whitespace-nowrap">
                                LKR {p.amount.toLocaleString()}
                              </td>

                              {/* Status Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide inline-flex items-center gap-1.5 ${
                                  p.status === 'paid' 
                                    ? 'bg-[#EBFDF2] text-emerald-850' 
                                    : 'bg-red-50 text-red-800'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'paid' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                  {p.status}
                                </span>
                              </td>

                              {/* Receipt Column button */}
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                {p.status === 'paid' ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptPayment(p)}
                                    className="px-3 py-1.5 border border-gray-200 hover:border-emerald-300 hover:bg-[#F4F8F5] text-gray-500 hover:text-[#1E4D2B] bg-white font-extrabold rounded-lg tracking-tight select-none cursor-pointer text-xs transition-all inline-flex items-center gap-1.5 shrink-0"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-gray-400" />
                                    <span>PDF</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateSettle(p)}
                                    className="px-3 py-1.5 bg-[#1E4D2B] hover:bg-[#15341D] text-white font-extrabold rounded-lg select-none cursor-pointer text-xs transition-colors shadow-xs shrink-0"
                                  >
                                    Settle Bill
                                  </button>
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
               {/* TAB 5: CHATBOT ECO-BOT FEED */}
          {activeTab === 'chatbot' && (() => {
            // Search filtering of conversations
            const filteredConversations = recentConversations.filter(c => 
              c.title.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
              c.messages.some(m => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
            );

            // Premium helper to format bot responses including markdown bold, custom bullets and code blocks
            const renderFormattedText = (text: string) => {
              if (!text) return null;
              
              const codeBlockRegex = /```([\s\S]*?)```/g;
              const parts: { type: 'text' | 'code'; content: string }[] = [];
              let lastIndex = 0;
              let match;
              
              while ((match = codeBlockRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                  parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
                }
                parts.push({ type: 'code', content: match[1].trim() });
                lastIndex = codeBlockRegex.lastIndex;
              }
              
              if (lastIndex < text.length) {
                parts.push({ type: 'text', content: text.substring(lastIndex) });
              }
              
              if (parts.length === 0) {
                parts.push({ type: 'text', content: text });
              }

              return parts.map((part, pIdx) => {
                if (part.type === 'code') {
                  return (
                    <div key={pIdx} className="my-3 font-mono text-[11px] bg-slate-900 text-emerald-400 p-3 rounded-xl border border-slate-800 shadow-inner relative group select-text">
                      <pre className="overflow-x-auto whitespace-pre-wrap">{part.content}</pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(part.content);
                          setMessage("Code copied to clipboard! 📋");
                        }}
                        className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors text-[9px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  );
                }
                
                const lines = part.content.split('\n');
                return lines.map((line, idx) => {
                  let cleanLine = line.trim();
                  if (!cleanLine) return null;
                  
                  const isBullet = cleanLine.startsWith('-') || cleanLine.startsWith('*') || (cleanLine.match(/^\d+\./) !== null);
                  if (isBullet) {
                    cleanLine = cleanLine.replace(/^[-*\d.]+\s*/, '');
                  }
                  
                  const textParts = cleanLine.split(/\*\*([^*]+)\*\*/g);
                  const parsedLine = textParts.map((subpart, spIdx) => {
                    return spIdx % 2 === 1 ? (
                      <strong key={spIdx} className="font-extrabold text-emerald-950 bg-emerald-50/70 px-1 rounded border border-emerald-100/50">
                        {subpart}
                      </strong>
                    ) : subpart;
                  });
                  
                  if (isBullet) {
                    return (
                      <div key={`${pIdx}-${idx}`} className="flex items-start gap-2.5 ml-2.5 my-2 animate-in slide-in-from-left-1 duration-150">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
                          <Leaf className="w-3 h-3 text-emerald-600" />
                        </span>
                        <p className="leading-relaxed text-gray-700 text-[11.5px] font-semibold flex-1 pt-0.5 text-left">{parsedLine}</p>
                      </div>
                    );
                  }
                  
                  return (
                    <p key={`${pIdx}-${idx}`} className="leading-relaxed my-2 text-gray-700 text-[11.5px] font-semibold text-left">
                      {parsedLine}
                    </p>
                  );
                });
              });
            };

            return (
              <div className="max-w-6xl mx-auto w-full" id="chatbot-tab-outer">
                
                                {/* SINGLE UNIFIED SCROLLABLE CARD CONTAINER */}
                <div className="bg-[#FAFDFB] border border-gray-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[600px] w-full text-left font-sans animate-in fade-in duration-200" id="chatbot-tab-view">
                  
                  {/* RIGHT CHAT AREA (Body viewport) */}
                  <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    
                    {/* PREMIUM CHAT AREA HEADER */}
                    <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/50 shadow-3xs">
                          <Bot className="w-5 h-5 text-[#1E4D2B]" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h3 className="text-xs font-black text-gray-900 font-sans tracking-tight">Eco-Bot Assistant</h3>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-250/50 text-[8px] font-black text-emerald-700 uppercase tracking-wider shrink-0">SECURE LINK</span>
                          </div>
                          <p className="text-[9.5px] text-gray-400 font-bold hidden sm:block mt-0.5 text-left">Answers only waste sorting, schedules, payments & complaints queries.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const newId = 'conv-' + Date.now();
                            const newConv = {
                              id: newId,
                              title: 'Reset Chat Session',
                              active: true,
                              time: 'Now',
                              messages: [
                                {
                                  id: 'bot-init-' + Date.now(),
                                  sender: 'bot' as const,
                                  text: "Hi " + (profileName ? profileName.split(' ')[0] : 'Resident') + "! 🌿 I'm Eco-Bot, your Greenfield Residencies system advisor. Ask me anything about waste sorting schedules, payments, or complaints.",
                                  confidence: 100
                                }
                              ]
                            };
                            setRecentConversations(prev => [newConv, ...prev.map(c => ({ ...c, active: false }))]);
                            setEcoBotView('active');
                            setMessage('Chat session restarted. Type your query directly. 🌿');
                          }}
                          className="px-2 sm:px-3 py-1.5 border border-slate-200 hover:border-emerald-300 hover:bg-[#F4F8F5] text-gray-500 hover:text-[#1E4D2B] bg-white font-extrabold rounded-lg tracking-tight select-none cursor-pointer text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-3xs active:scale-95"
                          title="Restart Chat Session"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                          <span className="hidden sm:inline">New Session</span>
                        </button>
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-emerald-50 border border-emerald-200/30 px-2 sm:px-2.5 py-1 rounded-full shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[8px] sm:text-[8.5px] text-emerald-700 font-black uppercase tracking-wide sm:tracking-widest">Active</span>
                        </div>
                      </div>
                    </div>

                    {/* CONNECTION ERROR RED ALIGN TOP BANNER */}
                    {ecoBotView === 'error' && (
                      <div className="bg-[#FFF2F2] border-l-4 border-rose-500 py-3 px-5 flex items-start gap-3 animate-fade-in text-xs shrink-0" id="bot-connection-error-banner">
                        <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-extrabold text-[#991B1B] text-xs">Can't reach Eco-Bot servers</p>
                          <p className="text-[10px] text-rose-500 font-bold mt-0.5">We'll retry automatically.</p>
                        </div>
                      </div>
                    )}

                                        {/* ACTIVE CHATFEED VIEWPORT AREA */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 font-sans text-xs flex flex-col bg-[#FDFEFC] bg-[radial-gradient(#e5ece8_1px,transparent_1px)] [background-size:16px_16px]">
                      
                      {/* Timestamp Pill Center */}
                      <div className="mx-auto my-0.5">
                        <span className="px-3 py-0.5 bg-slate-50 border border-slate-200 rounded-full font-bold text-[8.5px] uppercase text-gray-400 tracking-wider inline-block shadow-3xs">
                          Advisory Session Context
                        </span>
                      </div>

                      {chatMessages.map((msg, idx) => (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end animate-in fade-in slide-in-from-right-3' : 'mr-auto items-start animate-in fade-in slide-in-from-left-3'}`}
                        >
                          <div className="flex items-start gap-2 max-w-full">
                            {msg.sender === 'bot' && (
                              <div className="w-6.5 h-6.5 rounded-lg bg-white text-[#1E4D2B] flex items-center justify-center shadow-3xs border border-gray-155 shrink-0 mt-0.5">
                                <Bot className="w-3.5 h-3.5 text-[#1E4D2B]" />
                              </div>
                            )}
                            
                            {/* Speech bubble */}
                            <div className="flex flex-col">
                              {msg.isUnsure ? (
                                /* Low confidence card */
                                <div className="p-4 bg-orange-50 border border-orange-200/80 rounded-2xl rounded-tl-none font-semibold shadow-3xs space-y-3 text-gray-855 text-xs md:max-w-md text-left">
                                  <div className="flex items-center gap-1.5 text-amber-905 font-black">
                                    <Info className="w-4 h-4 text-amber-700" />
                                    <span>Query Escalation Option</span>
                                  </div>
                                  <p className="leading-relaxed text-[11px] font-bold">
                                    I'm not fully sure how to respond to this. Do you want me to dispatch this query directly to Greenfield's supervisor?
                                  </p>
                                  <div className="flex gap-2 font-sans">
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setBotInput("How do I dispose of batteries?");
                                        setMessage("Copied battery question. Type or hit Send to try querying again.");
                                      }}
                                      className="py-1 px-2.5 bg-white hover:bg-orange-100/40 border border-orange-200 text-orange-900 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-3xs"
                                    >
                                      Try again
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={async () => {
                                        const prevUserMsg = chatMessages[idx - 1]?.text || "Disposal Query";
                                        setActionLoading(true);
                                        try {
                                          const response = await fetch('/api/resident/report-missed', {
                                            method: 'POST',
                                            headers: {
                                              'Authorization': `Bearer ${token}`,
                                              'Accept': 'application/json',
                                              'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                              category: 'other',
                                              description: 'Escalated Query from Eco-bot: ' + prevUserMsg
                                            })
                                          });

                                          const data = await response.json();
                                          setActionLoading(false);

                                          if (response.ok && data.status === 'success') {
                                            const realTicket = data.data || data;
                                            setMyComplaints(prev => [realTicket, ...prev]);
                                            setNotifications(prev => [
                                              {
                                                id: 'notif-esc-' + Date.now(),
                                                title: 'Escalation Sent ✓',
                                                message: 'Your query was officially dispatched to Greenfield complex supervisor for review. Status tracking code: ' + realTicket.complaint_code,
                                                time: 'Just now',
                                                read: false
                                              },
                                              ...prev
                                            ]);
                                            setMessage('Dispatched ticket ' + realTicket.complaint_code + ' directly to supervisor. Check complaints tab!');
                                          } else {
                                            setMessage('Failed to escalate query. Try again shortly.');
                                          }
                                        } catch (err) {
                                          setActionLoading(false);
                                          console.error(err);
                                          setMessage('Error connecting to support servers.');
                                        }
                                      }}
                                      className="py-1 px-2.5 bg-[#1E4D2B] hover:bg-[#15341D] text-white rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                                    >
                                      <Mail className="w-3 h-3 text-white" />
                                      <span>Ask admin</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Clean normal speech bubble with RAG formatter helper */
                                <div className={`p-3.5 leading-relaxed rounded-2xl shadow-3xs hover:shadow-2xs transition-shadow text-left ${
                                  msg.sender === 'user' 
                                    ? 'bg-gradient-to-tr from-[#1E4D2B] to-[#2B7A3E] text-white rounded-tr-none text-[11px] font-semibold border border-emerald-800/10' 
                                    : 'bg-white text-gray-800 border border-slate-100 rounded-tl-none font-sans text-[11px] font-semibold'
                                }`}>
                                  {msg.sender === 'bot' ? renderFormattedText(msg.text) : msg.text}
                                </div>
                              )}

                              {/* Confidence & Feedback Rating Row */}
                              {msg.sender === 'bot' && !msg.isUnsure && (
                                <div className="flex items-center justify-between mt-1 px-1">
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-800/80 bg-emerald-50/50 border border-emerald-100/35 px-1.5 py-0.5 rounded-full">
                                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3.5]" />
                                    <span>{msg.confidence || (idx === 0 ? 98 : 92)}% confident</span>
                                  </div>

                                  {/* Thumbs up / down feedback logs */}
                                  {msg.logId && (
                                    <div className="flex items-center gap-1.5 select-none bg-white border border-slate-100 rounded-full px-1.5 py-0.5 shadow-3xs">
                                      <button
                                        type="button"
                                        onClick={() => handleRateBotLog(idx, msg.logId!, true)}
                                        className={`p-0.5 rounded-full transition-all cursor-pointer hover:bg-slate-50 ${
                                          msg.selectedFeedback === 'helpful' ? 'text-emerald-700 bg-emerald-50/75' : 'text-gray-400 hover:text-gray-650'
                                        }`}
                                        title="Helpful response"
                                      >
                                        <ThumbsUp className="w-2.5 h-2.5 stroke-[2.5]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRateBotLog(idx, msg.logId!, false)}
                                        className={`p-0.5 rounded-full transition-all cursor-pointer hover:bg-slate-50 ${
                                          msg.selectedFeedback === 'not_helpful' ? 'text-rose-600 bg-rose-50/75' : 'text-gray-400 hover:text-gray-650'
                                        }`}
                                        title="Unhelpful response"
                                      >
                                        <ThumbsDown className="w-2.5 h-2.5 stroke-[2.5]" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Bot is currently typing bubble */}
                      {botTyping && (
                        <div className="flex items-start gap-2 mr-auto max-w-[85%] animate-pulse">
                          <div className="w-6.5 h-6.5 rounded-lg bg-white text-[#1E4D2B] flex items-center justify-center shadow-3xs border border-gray-155 shrink-0 mt-0.5">
                            <Bot className="w-3.5 h-3.5 text-[#1E4D2B]" />
                          </div>
                          <div className="py-2 px-3.5 bg-white text-gray-400 border border-gray-150 rounded-2xl rounded-tl-none font-bold flex gap-1 items-center font-mono shadow-3xs">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-200"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-300"></span>
                          </div>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>

                    {/* MESSAGE INPUT CONTAINER ROW */}
                    <div className="p-4 border-t border-slate-100 bg-[#FAFDFB]/60 shrink-0">
                      <form onSubmit={handleChatSend} className="flex items-center gap-2 max-w-5xl mx-auto bg-white border border-slate-205 rounded-xl p-1.5 shadow-3xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                        <button
                          type="button"
                          onClick={() => {
                            const newId = 'conv-' + Date.now();
                            const newConv = {
                              id: newId,
                              title: 'Reset Chat Session',
                              active: true,
                              time: 'Now',
                              messages: [
                                {
                                  id: 'bot-init-' + Date.now(),
                                  sender: 'bot' as const,
                                  text: "Hi " + (profileName ? profileName.split(' ')[0] : 'Resident') + "! 🌿 I'm Eco-Bot, your Greenfield Residencies system advisor. Ask me anything about waste sorting schedules, payments, or complaints.",
                                  confidence: 100
                                }
                              ]
                            };
                            setRecentConversations(prev => [newConv, ...prev.map(c => ({ ...c, active: false }))]);
                            setEcoBotView('active');
                            setMessage('Chat session restarted. Type your query directly. 🌿');
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-200 hidden sm:flex items-center justify-center text-gray-400 hover:text-[#1E4D2B] hover:border-emerald-355 bg-white transition-all cursor-pointer shrink-0 active:scale-90 shadow-3xs hover:rotate-90"
                          title="Restart Chat Session"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-gray-400 hover:text-emerald-700 transition-colors" />
                        </button>

                        <input
                          type="text"
                          value={botInput}
                          onChange={(e) => setBotInput(e.target.value)}
                          placeholder="Ask about sorting rules, schedules, payments..."
                          className="flex-1 bg-transparent text-gray-800 text-xs focus:outline-none font-semibold px-2 py-1"
                        />
                        
                        <button 
                          type="button"
                          className="w-7 h-7 rounded-lg hidden sm:flex items-center justify-center text-gray-400 hover:text-[#1E4D2B] transition-colors cursor-pointer select-none text-xs"
                          title="Scope: Greenfield System only"
                        >
                          🔒
                        </button>

                        <button 
                          type="submit"
                          className="bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-md active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5 text-white" />
                        </button>
                      </form>
                    </div>

                  </div>

                </div>

              </div>
            );
          })()}


          {/* TAB 6: COMPLAINTS & GRIEVANCE DECK */}
          {activeTab === 'complaints' && (
            <div id="complaints-grievance">
              {complaintStatusView === 'form' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                  
                  {/* Col 1 & 2: Form or Tracker Detail */}
                  <div className="lg:col-span-2 space-y-4">
                    
                    {selectedTrackedComplaint ? (
                      /* DETAILED TIMELINE TRACKER PANEL */
                      <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-6">
                        {/* Back button and title */}
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                          <div>
                            <button 
                              type="button"
                              onClick={() => setSelectedTrackedComplaint(null)}
                              className="text-xs text-[#1E4D2B] font-extrabold hover:underline inline-flex items-center gap-1 cursor-pointer mb-1 bg-none border-none p-0 outline-none"
                            >
                              ← Lodge a new complaint
                            </button>
                            <h2 className="text-lg font-black text-gray-900 tracking-tight" id="tracker-complaint-ref">
                              Tracking Case #{selectedTrackedComplaint.complaint_code}
                            </h2>
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block mt-1">
                              Grievance category: {selectedTrackedComplaint.category}
                            </span>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              selectedTrackedComplaint.status === 'resolved' 
                                ? 'bg-[#EBFDF2] text-emerald-800' 
                                : 'bg-orange-55 text-amber-700 font-bold'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full block ${
                                selectedTrackedComplaint.status === 'resolved' ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                              }`}></span>
                              <span>{selectedTrackedComplaint.status === 'resolved' ? 'Resolved' : 'In Review'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Timeline PROGRESS GRAPH */}
                        <div className="space-y-6 relative before:absolute before:bottom-2 before:top-2 before:left-3 before:w-0.5 before:bg-gray-100 pl-1">
                          
                          {/* Step 1 */}
                          <div className="flex gap-4 relative">
                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold z-10 shrink-0 shadow-sm border-2 border-white">
                              ✓
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-[#1E4D2B]">1. Complaint lodged correctly</h4>
                              <p className="text-[11px] text-gray-400 font-semibold mt-0.5 leading-relaxed">
                                Reference logged in Central Housing Systems. Logistics exception alerts are triggered.
                              </p>
                            </div>
                          </div>

                          {/* Step 2 */}
                          <div className="flex gap-4 relative">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shrink-0 shadow-sm border-2 border-white ${
                              selectedTrackedComplaint.status === 'resolved' 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-amber-500 text-white animate-pulse'
                            }`}>
                              {selectedTrackedComplaint.status === 'resolved' ? '✓' : '•'}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-gray-800">2. Autonomous sensor & log matching checks</h4>
                              <p className="text-[11px] text-gray-400 font-semibold mt-0.5 leading-relaxed">
                                Auditing corridor camera feeds, chute disposal weight stamps, and RFID worker scan files.
                              </p>
                            </div>
                          </div>

                          {/* Step 3 */}
                          <div className="flex gap-4 relative">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shrink-0 shadow-sm border-2 border-white ${
                              selectedTrackedComplaint.status === 'resolved' 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-gray-200 text-gray-400'
                            }`}>
                              {selectedTrackedComplaint.status === 'resolved' ? '✓' : '•'}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-gray-800">3. Supervisor dispatch sync</h4>
                              <p className="text-[11px] text-gray-400 font-semibold mt-0.5 leading-relaxed">
                                Verifying truck tracking maps and validating driver reasons for any delays.
                              </p>
                            </div>
                          </div>

                          {/* Step 4 */}
                          <div className="flex gap-4 relative">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shrink-0 shadow-sm border-2 border-white ${
                              selectedTrackedComplaint.status === 'resolved' 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-gray-200 text-gray-400'
                            }`}>
                              {selectedTrackedComplaint.status === 'resolved' ? '✓' : '•'}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-gray-800">4. Resolution outcome set</h4>
                              <p className="text-[11px] text-gray-400 font-semibold mt-0.5 leading-relaxed">
                                {selectedTrackedComplaint.status === 'resolved' 
                                  ? 'Issue successfully closed. Dispatch crew updated & late run completed.' 
                                  : 'Awaiting final validation action from Estate management block.'}
                              </p>
                            </div>
                          </div>

                        </div>

                        {/* Recorded facts card */}
                        <div className="bg-[#FAFCFB] border border-gray-150 rounded-xl p-4.5 space-y-3.5">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">RECORDED INCIDENT FACTS</h4>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-400 block font-bold text-[9.5px]">INCIDENT DATE</span>
                              <span className="font-extrabold text-gray-700">{selectedTrackedComplaint.date || '2026-05-09'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block font-bold text-[9.5px]">INCIDENT TIME</span>
                              <span className="font-extrabold text-gray-700">{selectedTrackedComplaint.expected_time || '06:30 AM'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-bold text-[9.5px] mb-1">COMPLAINANT STATEMENT</span>
                            <p className="text-[11.5px] font-semibold text-gray-650 bg-white border border-gray-100 p-3 rounded-xl italic">
                              "{selectedTrackedComplaint.description}"
                            </p>
                          </div>
                        </div>

                        {/* File new report link footer */}
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedTrackedComplaint(null)}
                            className="bg-[#1E4D2B] hover:bg-[#15341D] text-white font-black py-2.5 px-6 rounded-full text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            Lodge another custom report
                          </button>
                        </div>

                      </div>
                    ) : (
                      /* REPORT COMPLAINT INPUT FORM */
                      <>
                        {/* Warning Alert banner */}
                        <div className="bg-[#FEF6EE] border border-[#FCD34D]/45 rounded-2xl p-4 flex items-center gap-3 text-xs text-[#B45309] font-semibold">
                          <span className="text-amber-600 font-black text-sm shrink-0">ⓘ</span>
                          <span>Admin will review within 24 hours.</span>
                        </div>

                        {/* Main Form Fields Container */}
                        <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-5">
                          <form onSubmit={handleReportMissedCollection} className="space-y-5">
                            
                            {/* Row: Date and Time expected */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">DATE OF MISSED COLLECTION</label>
                                <div className="relative">
                                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                  <input 
                                    type="date" 
                                    value={complaintDate}
                                    onChange={(e) => setComplaintDate(e.target.value)}
                                    className="w-full bg-[#FAFCFB] border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1E4D2B]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">EXPECTED TIME</label>
                                <div className="relative">
                                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                  <input 
                                    type="time" 
                                    value={complaintTime}
                                    onChange={(e) => setComplaintTime(e.target.value)}
                                    className="w-full bg-[#FAFCFB] border border-gray-200 text-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1E4D2B]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* WHAT HAPPENED? Custom Checkboxes */}
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2.5">WHAT HAPPENED?</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                  { id: 'not_collected', label: 'Not collected', icon: X },
                                  { id: 'too_late', label: 'Came too late', icon: Clock },
                                  { id: 'wrong_sorting', label: 'Wrong sorting', icon: RefreshCw },
                                  { id: 'other', label: 'Other', icon: HelpCircle },
                                ].map((item) => {
                                  const Icon = item.icon;
                                  const isActive = complaintWhatHappened === item.id;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setComplaintWhatHappened(item.id as any);
                                        if (item.id === 'not_collected') {
                                          setComplaintDescription('Bag was kept out at 6:25 AM. No collection happened. This is the second time this month.');
                                        } else if (item.id === 'too_late') {
                                          setComplaintDescription('The collection truck arrived extremely late. Trash was still uncollected at 11:45 AM, causing corridor odors.');
                                        } else if (item.id === 'wrong_sorting') {
                                          setComplaintDescription('My bin was flagged for incorrect sorting, but I separated all organic and dry waste properly. Please verify.');
                                        } else if (item.id === 'other') {
                                          setComplaintDescription('Spillage left behind in the level 3 corridor after collection. This has attracted flies.');
                                        }
                                      }}
                                      className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer select-none ${
                                        isActive 
                                          ? 'border-[#1E4D2B] bg-[#F4F8F5] text-[#1E4D2B]' 
                                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                      }`}
                                    >
                                      <Icon className={`w-5 h-5 mb-2 ${isActive ? 'text-[#1E4D2B]' : 'text-gray-400'}`} />
                                      <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* DESCRIPTION */}
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">DESCRIPTION</label>
                              <textarea
                                required
                                value={complaintDescription}
                                onChange={(e) => setComplaintDescription(e.target.value)}
                                placeholder="Write additional specifications here..."
                                className="w-full bg-[#FAFCFB] border border-gray-200 text-gray-805 rounded-xl p-3.5 text-xs h-28 focus:outline-none focus:ring-1 focus:ring-[#1E4D2B] font-semibold"
                              />
                            </div>

                            {/* Buttons row */}
                            <div className="flex justify-end gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setComplaintDate('2026-05-09');
                                  setComplaintTime('06:30');
                                  setComplaintWhatHappened('not_collected');
                                  setComplaintDescription('Bag was kept out at 6:25 AM. No collection happened. This is the second time this month.');
                                }}
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-extrabold py-2 px-5 rounded-full text-xs transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={actionLoading}
                                className="bg-[#1E4D2B] hover:bg-[#15341D] text-white font-extrabold py-2 px-5 rounded-full text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading ? (
                                  <span>Submitting...</span>
                                ) : (
                                  <>
                                    <SendHorizontal className="w-3.5 h-3.5 text-white" />
                                    <span>Submit complaint</span>
                                  </>
                                )}
                              </button>
                            </div>

                          </form>
                        </div>
                      </>
                    )}

                  </div>

                  {/* Col 3: YOUR COMPLAINTS list */}
                  <div className="space-y-4 font-sans text-left">
                    <span className="block text-[10.5px] font-black text-gray-400 uppercase tracking-wider">YOUR COMPLAINTS</span>
                    <div className="space-y-3">
                      {myComplaints.map((comp) => {
                        const isSelected = selectedTrackedComplaint?.id === comp.id;
                        return (
                          <div 
                            key={comp.id} 
                            onClick={() => {
                              setSelectedTrackedComplaint(comp);
                              setComplaintStatusView('form');
                            }}
                            className={`p-4 rounded-2xl flex flex-col justify-between gap-1 shadow-xs border transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'bg-[#E1EFE6] border-[#1E4D2B] ring-1 ring-[#1E4D2B]/50'
                                : 'bg-[#F4F8F5]/85 border-transparent hover:border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[11px] font-sans text-gray-500 font-bold">#{comp.complaint_code || 'C-118'}</span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                comp.status === 'resolved' ? 'bg-[#EBFDF2]/80 text-emerald-800' : 'bg-orange-50 text-amber-700 animate-pulse'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full block ${comp.status === 'resolved' ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
                                <span>{comp.status === 'resolved' ? 'Resolved' : 'Open'}</span>
                              </span>
                            </div>
                            
                            {/* Title matches the mock list: 'Late collection · 5 May' */}
                            <p className="text-xs font-black text-gray-805 mt-1.5 text-left">
                              {comp.category} · {comp.date_label || 'Today'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ) : (
                /* Success Received view matching Screenshot 2 */
                <div className="flex justify-center items-center py-6 w-full" id="complaint-success-wrapper">
                  <div className="bg-white border border-gray-200/60 rounded-3xl p-8 max-w-xl w-full text-center space-y-6 shadow-xs">
                    
                    {/* Circle with checkmark */}
                    <div className="w-20 h-20 bg-[#1E4D2B] rounded-full flex items-center justify-center mx-auto text-white shadow-md">
                      <Check className="w-10 h-10 text-white stroke-[4px]" />
                    </div>

                    {/* Message */}
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-[#1E4D2B]" id="success-received-title">Complaint received</h2>
                      <p className="text-xs text-gray-400 font-bold">We'll get back to you within 24 hours.</p>
                    </div>

                    {/* Receipt/Details info */}
                    <div className="bg-[#F4F8F5]/50 border border-[#EBFDF2] rounded-2xl p-5 space-y-4 text-xs text-left">
                      <div className="flex justify-between items-center border-b border-gray-100/50 pb-2.5">
                        <span className="text-gray-400 font-bold">Complaint ID</span>
                        <span className="font-extrabold text-[#1E4D2B]">#{lastSubmittedComplaint?.complaint_code || 'C-118'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100/50 pb-2.5">
                        <span className="text-gray-400 font-bold">Status</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black bg-orange-50 text-amber-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span>
                          <span>Open</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-bold">Submitted</span>
                        <span className="font-extrabold text-gray-700 border-none">
                          {lastSubmittedComplaint?.created_at 
                            ? new Date(lastSubmittedComplaint.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }).replace(/\//g, '-')
                            : '2026-05-10, 11:05 AM'}
                        </span>
                      </div>
                    </div>

                    {/* Two buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrackedComplaint(lastSubmittedComplaint || myComplaints[0]);
                          setComplaintStatusView('form');
                        }}
                        className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-[#1E4D2B] font-extrabold py-3 px-5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4 text-[#1E4D2B]" />
                        <span>Track complaint</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrackedComplaint(null);
                          setComplaintStatusView('form');
                          setActiveTab('home');
                        }}
                        className="flex-1 bg-[#1E4D2B] hover:bg-[#15341D] text-white font-extrabold py-3 px-5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Home className="w-4 h-4 text-white" />
                        <span>Back to home</span>
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
 
          {/* TAB 7: NOTIFICATIONS INDEX LIST */}
          {activeTab === 'notifications' && (() => {
            const filteredNotifs = notifications.filter(n => {
              const matchesSearch = searchQuery ? (
                n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                n.message.toLowerCase().includes(searchQuery.toLowerCase())
              ) : true;
              
              if (notifFilter === 'all') return matchesSearch;
              return n.category === notifFilter && matchesSearch;
            });
            
            return (
              <div className="max-w-6xl mx-auto w-full tracking-tight font-sans text-left" id="notifications-index-tab">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Column 1 & 2: Notifications List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-gray-150 rounded-2xl shadow-xs overflow-hidden">
                      <div className="divide-y divide-gray-100">
                        {filteredNotifs.length === 0 ? (
                          <div className="p-14 text-center text-gray-400 font-bold flex flex-col items-center justify-center gap-3">
                            <CheckCircle2 className="w-12 h-12 text-gray-200" />
                            <p className="text-xs">No notifications found in this category.</p>
                          </div>
                        ) : (
                          filteredNotifs.map((n) => {
                            const isUnread = !n.read;
                            
                            // Category-specific icons and colors matching screenshot
                            let IconComp = Bell;
                            let iconBgClass = "bg-emerald-55 text-emerald-800";
                            
                            if (n.category === 'collection') {
                              IconComp = Truck;
                              iconBgClass = "bg-[#E0EBF7] text-[#0A66C2]"; // Soft blue
                            } else if (n.category === 'payment') {
                              IconComp = Banknote;
                              iconBgClass = "bg-[#E8F5EC] text-[#1E4D2B]"; // Soft green
                            } else if (n.category === 'announcement') {
                              IconComp = Megaphone;
                              iconBgClass = "bg-[#FEF1E6] text-[#D97706]"; // Soft orange
                            } else if (n.category === 'rating') {
                              IconComp = Star;
                              iconBgClass = "bg-[#FFF9E6] text-[#EEA956]"; // Soft orange/yellow
                            }

                            return (
                              <div 
                                key={n.id} 
                                onClick={() => {
                                  if (isUnread) {
                                    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                                  }
                                  setSelectedNotifDetail(n);
                                  setNotifRatingStars(5);
                                  setNotifRated(false);
                                }}
                                className={`p-5 flex gap-4 items-start hover:bg-[#F9FCFA] transition-all cursor-pointer select-none border-b border-gray-50 last:border-b-0 ${
                                  isUnread ? 'bg-[#FCFDFD]' : 'bg-white'
                                }`}
                              >
                                {/* Rounded-xl Icon wrapper */}
                                <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${iconBgClass}`}>
                                  <IconComp className="w-5 h-5 stroke-[2.5]" />
                                </div>

                                {/* Content block */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs md:text-sm font-extrabold text-[#1E4D2B] leading-tight">
                                    {n.title}
                                  </p>
                                  <p className="text-[11px] md:text-xs text-gray-500 mt-1 font-semibold leading-relaxed">
                                    {n.message}
                                  </p>
                                </div>

                                {/* Right sidebar items */}
                                <div className="flex flex-col items-end gap-2.5 shrink-0 self-start pt-0.5">
                                  <span className="text-[10px] text-gray-400 font-extrabold font-mono tracking-tight">{n.time}</span>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-600 block shadow-xs animate-pulse"></span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Category Filters Sidebar */}
                  <div className="space-y-4">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">FILTER</span>
                    <div className="bg-white border border-gray-150 rounded-2xl p-5 space-y-3 shadow-xs">
                      
                      {[
                        { id: 'all', label: 'All', count: notifications.length },
                        { id: 'collection', label: 'Collections', count: notifications.filter(n => n.category === 'collection').length },
                        { id: 'payment', label: 'Payments', count: notifications.filter(n => n.category === 'payment').length },
                        { id: 'announcement', label: 'Announcements', count: notifications.filter(n => n.category === 'announcement').length },
                        { id: 'rating', label: 'Ratings', count: notifications.filter(n => n.category === 'rating').length }
                      ].map((opt) => {
                        const isActive = notifFilter === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setNotifFilter(opt.id as any)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                              isActive 
                                ? 'bg-[#F4F8F5] border-[#1E4D2B] text-[#1E4D2B] ring-1 ring-[#1E4D2B]/30' 
                                : 'bg-white border-gray-200/80 text-gray-650 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className={isActive ? 'font-black' : 'text-gray-700 font-bold'}>{opt.label}</span>
                            <span className={`text-[11px] font-black font-mono ${isActive ? 'text-[#1E4D2B]' : 'text-gray-400'}`}>
                              {opt.count}
                            </span>
                          </button>
                        );
                      })}

                    </div>
                  </div>

                </div>

                {/* Modal for viewing notification details */}
                {selectedNotifDetail && (() => {
                  const n = selectedNotifDetail;
                  let IconComp = Bell;
                  let iconBgClass = "bg-[#FAFCFB] text-[#1E4D2B] border-emerald-100";
                  let colorTheme = "emerald";
                  
                  if (n.category === 'collection') {
                    IconComp = Truck;
                    iconBgClass = "bg-[#E0EBF7] text-[#0A66C2] border-blue-100";
                    colorTheme = "blue";
                  } else if (n.category === 'payment') {
                    IconComp = Banknote;
                    iconBgClass = "bg-[#E8F5EC] text-[#1E4D2B] border-emerald-100";
                    colorTheme = "emerald";
                  } else if (n.category === 'announcement') {
                    IconComp = Megaphone;
                    iconBgClass = "bg-[#FEF1E6] text-[#D97706] border-amber-100";
                    colorTheme = "amber";
                  } else if (n.category === 'rating') {
                    IconComp = Star;
                    iconBgClass = "bg-[#FFF9E6] text-[#EEA956] border-yellow-100";
                    colorTheme = "yellow";
                  }

                  return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left">
                      <div className="bg-white border border-gray-150 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative font-sans">
                        
                        {/* Top styling band matching category color */}
                        <div className={`h-2.5 w-full ${
                          colorTheme === 'blue' ? 'bg-[#0A66C2]' : 
                          colorTheme === 'amber' ? 'bg-[#D97706]' : 
                          colorTheme === 'yellow' ? 'bg-[#EEA956]' : 'bg-[#1E4D2B]'
                        }`} />

                        {/* Close Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedNotifDetail(null)}
                          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>

                        {/* Modal Content */}
                        <div className="p-6 md:p-8 space-y-6">
                          
                          {/* Header section with Icon badge & Tag info */}
                          <div className="flex items-center gap-3.5">
                            <div className={`p-3 rounded-2xl border shrink-0 flex items-center justify-center ${iconBgClass}`}>
                              <IconComp className="w-6 h-6 stroke-[2.5]" />
                            </div>
                            <div>
                              <span className={`inline-block text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                colorTheme === 'blue' ? 'bg-[#E0EBF7] text-[#0A66C2]' : 
                                colorTheme === 'amber' ? 'bg-[#FEF1E6] text-[#D97706]' : 
                                colorTheme === 'yellow' ? 'bg-[#FFF9E6] text-[#EEA956]' : 'bg-[#E8F5EC] text-[#1E4D2B]'
                              }`}>
                                {n.category} update
                              </span>
                              <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5 font-mono">
                                DATE RECV: {n.time === '2m' || n.time === '12m' || n.time === '1h' || n.time === '1d' || n.time === '2d' ? 'Today' : n.time} • INSTANCE #{n.id + 7210}
                              </span>
                            </div>
                          </div>

                          {/* Title & Detailed Msg */}
                          <div className="space-y-2">
                            <h3 className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-snug">
                              {n.title}
                            </h3>
                            <p className="text-xs md:text-sm text-gray-650 font-medium leading-relaxed bg-[#FAFCFB] border border-gray-100 p-4 rounded-2xl italic">
                              "{n.message}"
                            </p>
                          </div>

                          {/* Category-Specific Visual Meta cards */}
                          {n.category === 'collection' && (
                            <div className="bg-[#E0EBF7]/25 border border-[#0A66C2]/10 rounded-2xl p-4 space-y-3">
                              <h4 className="text-[10px] font-black text-[#0A66C2] uppercase tracking-wider">Logistics Dispatch Log</h4>
                              <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-600">
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">ASSIGNED WORKER</span>
                                  <span className="font-extrabold text-[#0A66C2]">{unitProfile?.next_pickup?.worker?.name || 'Staff'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">RESIDENT ZONE</span>
                                  <span className="font-extrabold text-[#0A66C2]">{profileBlock}, Floor {profileFloor}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">TASK TARGET</span>
                                  <span className="font-extrabold text-[#0A66C2]">Organic & Dry recyclables</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">LIVE DISPATCH STATS</span>
                                  <span className="font-extrabold text-emerald-700 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 block animate-pulse"></span>
                                    Operational
                                  </span>
                                </div>
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedNotifDetail(null);
                                    setActiveTab('home');
                                    setShowLiveTracker(true);
                                    setHomeSimulationMode('active_tracker');
                                    setMessage("Navigated to real-time driver tracking window!");
                                  }}
                                  className="w-full bg-[#0A66C2] hover:bg-[#084e96] text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                                >
                                  <Compass className="w-3.5 h-3.5" />
                                  <span>Open Live Collection Map Tracker</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {n.category === 'payment' && (
                            <div className="bg-[#E8F5EC]/25 border border-[#1E4D2B]/10 rounded-2xl p-4 space-y-3">
                              <h4 className="text-[10px] font-black text-[#1E4D2B] uppercase tracking-wider">Assessed Transaction Record</h4>
                              <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-600">
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">PAID AMOUNT</span>
                                  <span className="font-extrabold text-slate-800">LKR 2,800.00</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">TRANSACTION TYPE</span>
                                  <span className="font-extrabold text-slate-800">Special pickup levy</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">PAYMENT METHOD</span>
                                  <span className="font-extrabold text-slate-800">Linked Visa Card •••• 4821</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">TRANSACTION ID</span>
                                  <span className="font-extrabold font-mono text-xs text-[#1E4D2B]">TXN-81924102</span>
                                </div>
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedNotifDetail(null);
                                    setActiveTab('billing');
                                    setMessage("Looking up receipts on Billing & Payments window.");
                                  }}
                                  className="w-full bg-[#1E4D2B] hover:bg-[#15341D] text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>View All Invoices & Billing</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {n.category === 'announcement' && (
                            <div className="bg-[#FEF1E6]/25 border border-[#D97706]/10 rounded-2xl p-4 space-y-3">
                              <h4 className="text-[10px] font-black text-[#D97706] uppercase tracking-wider">Authority Broadcaster</h4>
                              <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-600">
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">ISSUING BODY</span>
                                  <span className="font-extrabold text-slate-800">Greenfield Estate Admin</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">RECIPIENT SCOPE</span>
                                  <span className="font-extrabold text-slate-800">Block A & B Occupants</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">PRIORITY CLASSIFICATION</span>
                                  <span className="font-extrabold text-amber-700 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block animate-pulse"></span>
                                    High Priority
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-bold text-[9px]">ACTION REQUIRED</span>
                                  <span className="font-extrabold text-slate-800">Notice only</span>
                                </div>
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedNotifDetail(null);
                                    setMessage("Announcement acknowledged.");
                                  }}
                                  className="w-full bg-[#D97706] hover:bg-[#b45309] text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Mark Announcement as Acknowledged</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {n.category === 'rating' && (
                            <div className="bg-[#FFF9E6]/40 border border-[#EEA956]/20 rounded-2xl p-4 space-y-3.5">
                              <h4 className="text-[10px] font-black text-[#EEA956] uppercase tracking-wider">Corridor Collector Feedback Rating</h4>
                              
                              {!notifRated ? (
                                <div className="space-y-3 text-center py-1">
                                  <p className="text-[11.5px] text-gray-500 font-bold">Select stars to rate Sunil Kumara's behavior & hygiene:</p>
                                  <div className="flex justify-center items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setNotifRatingStars(star)}
                                        className="p-1 hover:scale-125 transition-transform"
                                      >
                                        <Star className={`w-7 h-7 ${
                                          star <= notifRatingStars ? 'text-[#EEA956] fill-[#EEA956]' : 'text-gray-300'
                                        }`} />
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNotifRated(true);
                                      setMessage(`Successfully submitted ${notifRatingStars}-star rating for Sunil Kumara. Feedback logged!`);
                                    }}
                                    className="w-full bg-[#1E4D2B] hover:bg-[#15341D] text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 mt-2"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Confirm {notifRatingStars}-Star Resident Rating</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center p-3.5 bg-emerald-50/50 rounded-xl space-y-1.5">
                                  <CheckCircle className="w-7 h-7 text-[#1E4D2B] mx-auto animate-bounce" />
                                  <p className="text-xs font-black text-[#1E4D2B]">Feedback registered successfully!</p>
                                  <p className="text-[10.5px] font-medium text-gray-400">
                                    We passed your {notifRatingStars}-star appreciation directly to the Greenfield operations team. Thank you!
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick Info Box */}
                          <div className="bg-gray-50/70 border border-gray-150 p-3.5 rounded-2xl flex items-start gap-2.5">
                            <span className="text-[#1E4D2B] font-black text-xs shrink-0 mt-0.5">ⓘ</span>
                            <p className="text-[10px] md:text-[10.5px] leading-relaxed text-gray-400 font-semibold">
                              This notice is secured through EcoTrack Resident Sandbox systems and verified according to green logistics principles.
                            </p>
                          </div>

                          {/* Footer close button */}
                          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => setSelectedNotifDetail(null)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-2.5 px-6 rounded-full text-xs transition-all cursor-pointer"
                            >
                              Dismiss Window
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            );
          })()}
 
          {/* TAB 8: OCCUPANT/RESIDENT PROFILE COMPONENT */}
          {activeTab === 'profile' && (
            <div className="max-w-6xl mx-auto w-full tracking-tight font-sans text-left space-y-6" id="resident-profile">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUMN 1: LEFT AVATAR CARD (4 cols) */}
                <div className="lg:col-span-4 bg-white border border-gray-150 rounded-3xl shadow-xs overflow-hidden flex flex-col justify-between">
                  {/* Top Header section with solid green background and Avatar Image */}
                  <div className="bg-gradient-to-b from-[#1E4D2B] to-[#256037] p-8 text-center flex flex-col items-center justify-center relative select-none">
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 rounded-full bg-white overflow-hidden shadow-lg border-4 border-[#D0E7D2] flex items-center justify-center relative">
                        <img 
                          src={profileImage} 
                          alt={profileName} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                          referrerPolicy="no-referrer"
                        />
                        {/* Hover Overlay */}
                        <button 
                          type="button"
                          onClick={() => profilePicInputRef.current?.click()}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                          title="Change Profile Picture"
                        >
                          <Camera className="w-6 h-6 text-white" />
                        </button>
                      </div>
                      {/* Small floating button */}
                      <button 
                        type="button"
                        onClick={() => profilePicInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-[#1E4D2B] text-white p-1.5 rounded-full border border-emerald-50 shadow-md hover:bg-[#256037] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                        title="Upload New Photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <input 
                      type="file" 
                      ref={profilePicInputRef} 
                      onChange={handleProfilePicChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <h3 className="text-xl font-extrabold text-white mt-4 tracking-tight leading-none">
                      {profileName}
                    </h3>
                    <p className="text-xs text-emerald-100 font-bold tracking-tight mt-2.5">
                      {profileUnit} • {profileBlock}
                    </p>
                    <p className="text-[11px] text-emerald-200/80 font-semibold uppercase mt-0.5 tracking-wider font-sans">
                      Greenfield Residencies
                    </p>
                  </div>

                  {/* Body interactive buttons section */}
                  <div className="p-6 bg-white space-y-4">
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('edit')}
                      className="w-full border border-gray-200 hover:border-emerald-600 hover:bg-emerald-50/10 text-[#1E4D2B] rounded-xl py-2.5 px-4 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs select-none active:scale-98"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#1E4D2B]" />
                      <span>Edit profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('password')}
                      className="w-full text-gray-500 hover:text-gray-800 rounded-xl py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
                    >
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Change password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full bg-[#AF2323] hover:bg-[#961C1C] text-white rounded-xl py-2.5 px-4 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 select-none"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>

                {/* COLUMN 2: RIGHT MENU ROWS LIST CARD (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-white border border-gray-150 rounded-3xl shadow-xs overflow-hidden divide-y divide-gray-100">
                    
                    {/* Row Item 1: Edit Profile */}
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('edit')}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#E8F5EC] text-[#1E4D2B] flex items-center justify-center shrink-0">
                          <Pencil className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 tracking-tight group-hover:text-[#1E4D2B] transition-colors">
                            Edit profile
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            Name, phone, email
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4D2B] group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Row Item 2: Language */}
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('language')}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#EAF5F8] text-[#1F7A8C] flex items-center justify-center shrink-0">
                          <Globe className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 tracking-tight group-hover:text-[#1F7A8C] transition-colors">
                            Language
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            {profileLanguage}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4D2B] group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Row Item 3: Notifications */}
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('notifications')}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#EDF2FC] text-[#3F72AF] flex items-center justify-center shrink-0">
                          <Bell className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 tracking-tight group-hover:text-[#3F72AF] transition-colors">
                            Notifications
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            {profileNotifPref}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4D2B] group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Row Item 4: Saved Cards */}
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('cards')}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#FDF6EC] text-[#E6A23C] flex items-center justify-center shrink-0">
                          <CreditCard className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 tracking-tight group-hover:text-[#E6A23C] transition-colors">
                            Saved cards
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            1 card · {profileSavedCard}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4D2B] group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Row Item 5: Change Password Link */}
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('password')}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#F2EDF8] text-[#8E44AD] flex items-center justify-center shrink-0">
                          <Lock className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 tracking-tight group-hover:text-[#8E44AD] transition-colors">
                            Change password
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            Manage login lock and keys
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4D2B] group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Row Item 6: Help & Support */}
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('help')}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#F0F2F0] text-gray-600 flex items-center justify-center shrink-0">
                          <HelpCircle className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 tracking-tight group-hover:text-gray-900 transition-colors">
                            Help & support
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            Eco-Bot chat & helpline
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4D2B] group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Row Item 7: About EcoTrack */}
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal('about')}
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#EEF5EE] text-[#1E4D2B] flex items-center justify-center shrink-0">
                          <Info className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 tracking-tight group-hover:text-[#1E4D2B] transition-colors">
                            About EcoTrack
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            v2.4.1
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4D2B] group-hover:translate-x-1 transition-all" />
                    </button>

                  </div>

                  {/* BOTTOM REPLICATING SIGNATURE LABELS */}
                  <div className="text-right pr-4">
                    <p className="text-[10px] text-gray-400 font-extrabold font-mono inline-flex items-center gap-1.5 select-none">
                      <span>EcoTrack PWA • v2.4.1</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline-block fill-emerald-100" />
                    </p>
                  </div>
                </div>

              </div>

              {/* -------------------- DYNAMIC MODALS OVERLAY DECK -------------------- */}

              {/* 1. EDIT PROFILE MODAL */}
              {activeProfileModal === 'edit' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left animate-fade-in animate-fade-in-fast">
                  <div className="bg-white border border-gray-150 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
                    <div className="h-2 w-full bg-[#1E4D2B]" />
                    
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 md:p-8 space-y-6">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Edit Profile</h3>
                        <p className="text-xs text-gray-400 font-semibold uppercase font-mono mt-0.5">Update personal sandbox metrics</p>
                      </div>

                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const data = new FormData(e.currentTarget);
                          const newName = data.get('fullname') as string;
                          const newPhone = data.get('phone') as string;
                          const newEmail = data.get('email') as string;
                          const newUnit = data.get('unit') as string;
                          const newBlock = data.get('block') as string;
                          const newFloor = data.get('floor') as string;

                          setActionLoading(true);
                          setMessage(null);
                          try {
                            const response = await fetch('/api/profile/update', {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                name: newName,
                                phone: newPhone
                              })
                            });

                            const resData = await response.json();
                            if (response.ok && resData.status === 'success') {
                              if (newName) setProfileName(newName);
                              if (newPhone) setProfilePhone(newPhone);
                              if (newEmail) setProfileEmail(newEmail);
                              if (newUnit) setProfileUnit(newUnit);
                              if (newBlock) setProfileBlock(newBlock);
                              if (newFloor) setProfileFloor(newFloor);

                              if (user && onUserUpdate) {
                                onUserUpdate({
                                  ...user,
                                  name: newName,
                                  phone: newPhone,
                                  email: newEmail
                                });
                              }
                              setActiveProfileModal(null);
                              setMessage("Profile details saved and synchronized successfully! 🌿");
                            } else {
                              console.error("Failed to save profile bio details:", resData);
                              setMessage(`Error: ${resData.message || 'Could not save profile details.'}`);
                            }
                          } catch (err) {
                            console.error("Error saving profile details:", err);
                            setMessage("Connection error. Profile details could not be saved to server.");
                          } finally {
                            setActionLoading(false);
                          }
                        }} 
                        className="space-y-4 text-xs font-semibold text-gray-700"
                      >
                        {/* Interactive Avatar Changer inside modal */}
                        <div className="flex items-center gap-4 bg-emerald-50/50 p-3.5 rounded-2xl border border-[#D0E7D2]">
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-emerald-300 shadow-xs relative shrink-0">
                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Profile Photo</label>
                            <input 
                              type="file" 
                              onChange={handleProfilePicChange} 
                              accept="image/*"
                              className="block w-full text-[11px] text-gray-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#1E4D2B] file:text-white hover:file:bg-[#256037] cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Full Name</label>
                          <input 
                            name="fullname"
                            type="text" 
                            defaultValue={profileName}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20 outline-none text-gray-900"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Mobile Contact</label>
                          <input 
                            name="phone"
                            type="text" 
                            defaultValue={profilePhone}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20 outline-none text-gray-900 font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Email Address</label>
                          <input 
                            name="email"
                            type="email" 
                            defaultValue={profileEmail}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20 outline-none text-gray-900 font-mono"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Unit Number</label>
                            <input 
                              name="unit"
                              type="text" 
                              defaultValue={profileUnit}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20 outline-none text-gray-900"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Block Name</label>
                            <input 
                              name="block"
                              type="text" 
                              defaultValue={profileBlock}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20 outline-none text-gray-900"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Floor Level</label>
                            <input 
                              name="floor"
                              type="text" 
                              defaultValue={profileFloor}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#1E4D2B] focus:ring-1 focus:ring-[#1E4D2B]/20 outline-none text-gray-900"
                              required
                            />
                          </div>
                        </div>

                        <div className="pt-3 flex gap-3.5">
                          <button
                            type="button"
                            onClick={() => setActiveProfileModal(null)}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-full text-xs font-bold transition-all text-center"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-[#1E4D2B] hover:bg-[#15341D] text-white py-2.5 px-4 rounded-full text-xs font-black transition-all text-center"
                          >
                            Save specifications
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. LANGUAGE SELECTION MODAL */}
              {activeProfileModal === 'language' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left animate-fade-in animate-fade-in-fast">
                  <div className="bg-white border border-gray-150 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative">
                    <div className="h-2 w-full bg-[#1F7A8C]" />
                    
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 md:p-8 space-y-6">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Select Language</h3>
                        <p className="text-xs text-gray-400 font-semibold uppercase font-mono mt-0.5">Choose preferred regional interface</p>
                      </div>

                      <div className="space-y-2.5 text-xs font-bold">
                        {[
                          { id: 'English', native: 'English (US & LK)' },
                          { id: 'Sinhala', native: 'සිංහල (Sinhalese)' },
                          { id: 'Tamil', native: 'தமிழ் (Tamil)' }
                        ].map((lang) => {
                          const isSel = profileLanguage === lang.id;
                          return (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => {
                                setProfileLanguage(lang.id);
                                setTimeout(() => {
                                  setActiveProfileModal(null);
                                  setMessage(`System interface language switched to ${lang.id}!`);
                                }, 300);
                              }}
                              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                isSel 
                                  ? 'bg-[#EBF7F9] border-[#1F7A8C] text-[#1F7A8C] ring-1 ring-[#1F7A8C]/20' 
                                  : 'bg-white border-gray-150 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div>
                                <span className="block font-black text-gray-800">{lang.id}</span>
                                <span className={`text-[10px] block font-medium ${isSel ? 'text-[#1F7A8C]' : 'text-gray-400'}`}>{lang.native}</span>
                              </div>
                              {isSel && <Check className="w-4 h-4 text-[#1F7A8C] stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-gray-50 p-3.5 rounded-2xl flex items-start gap-2 text-[10px] text-gray-400 leading-relaxed font-semibold border border-gray-100">
                        <span>ⓘ</span>
                        <p>Changes will be automatically mapped onto chatbot queries and receipt generation translations too.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. NOTIFICATIONS PREFERENCES MODAL */}
              {activeProfileModal === 'notifications' && (() => {
                // Initialize temporary switcher state
                const isPushEnabled = profileNotifPref.includes('Push');
                const isEmailEnabled = profileNotifPref.includes('Email');

                return (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left animate-fade-in animate-fade-in-fast">
                    <div className="bg-white border border-gray-150 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
                      <div className="h-2 w-full bg-[#3F72AF]" />
                      
                      <button
                        type="button"
                        onClick={() => setActiveProfileModal(null)}
                        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="p-6 md:p-8 space-y-6">
                        <div>
                          <h3 className="text-lg font-black text-gray-900 tracking-tight">Notification Settings</h3>
                          <p className="text-xs text-gray-400 font-semibold uppercase font-mono mt-0.5">Control Push & digest preferences</p>
                        </div>

                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const push = (form.elements.namedItem('push_notif') as HTMLInputElement).checked;
                            const email = (form.elements.namedItem('email_notif') as HTMLInputElement).checked;

                            let nextPref = 'None';
                            if (push && email) nextPref = 'Push + Email';
                            else if (push) nextPref = 'Push ONLY';
                            else if (email) nextPref = 'Email ONLY';

                            setProfileNotifPref(nextPref);
                            setActiveProfileModal(null);
                            setMessage(`Successfully saved notifications configuration: ${nextPref}`);
                          }}
                          className="space-y-5 text-xs font-semibold text-gray-700"
                        >
                          {/* Push Row */}
                          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100/60 transition-colors">
                            <div className="space-y-0.5 max-w-[80%]">
                              <span className="block font-black text-gray-800 text-xs">Push Notifications</span>
                              <span className="block text-[10px] text-gray-400 font-medium leading-normal">
                                Receive instant floor triggers, worker arrivals, and live GPS map dispatch reports.
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                name="push_notif"
                                type="checkbox" 
                                defaultChecked={isPushEnabled}
                                className="sr-only peer" 
                              />
                              <div className="w-9 h-5 bg-gray-200 hover:bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3F72AF]"></div>
                            </label>
                          </div>

                          {/* Email Row */}
                          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100/60 transition-colors">
                            <div className="space-y-0.5 max-w-[80%]">
                              <span className="block font-black text-gray-800 text-xs">Email Digests</span>
                              <span className="block text-[10px] text-gray-400 font-medium leading-normal">
                                Get monthly collection receipts, carbon offset summaries, and invoice details.
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                name="email_notif"
                                type="checkbox" 
                                defaultChecked={isEmailEnabled}
                                className="sr-only peer" 
                              />
                              <div className="w-9 h-5 bg-gray-200 hover:bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3F72AF]"></div>
                            </label>
                          </div>

                          <div className="pt-2 flex gap-3 text-xs font-bold font-sans">
                            <button
                              type="button"
                              onClick={() => setActiveProfileModal(null)}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-full text-center"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 bg-[#3F72AF] hover:bg-[#2c5282] text-white py-2.5 px-4 rounded-full text-center font-black"
                            >
                              Save preferences
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 4. SAVED CARDS MANAGEMENT MODAL */}
              {activeProfileModal === 'cards' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left animate-fade-in animate-fade-in-fast">
                  <div className="bg-white border border-gray-150 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
                    <div className="h-2 w-full bg-[#E6A23C]" />
                    
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 md:p-8 space-y-6">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Saved Payment Card</h3>
                        <p className="text-xs text-gray-400 font-semibold uppercase font-mono mt-0.5">Manage linked plastic instrument</p>
                      </div>

                      {/* Display active card as a credit card layout element */}
                      <div className="bg-gradient-to-tr from-[#E6A23C] to-[#F39C12] text-white rounded-2xl p-5 shadow-md relative overflow-hidden flex flex-col justify-between aspect-video select-none">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="block text-[8.5px] uppercase font-bold tracking-widest text-[#FFF2CC]/80 font-mono">ECO-DEBIT VERIFIED</span>
                            <span className="text-sm font-black mt-0.5 block">{profileSavedCard.split(' ')[0]} Golden Core</span>
                          </div>
                          <span className="font-sans font-black tracking-tight text-white/50 text-lg italic">PayHere</span>
                        </div>

                        {/* Card Number block */}
                        <div className="text-lg font-bold font-mono tracking-widest text-center my-2 text-white/95">
                          ••••  ••••  ••••  {profileSavedCard.includes('**') ? profileSavedCard.split('**')[1] : '4821'}
                        </div>

                        <div className="flex justify-between items-end text-[10px] font-mono">
                          <div>
                            <span className="text-emerald-100/60 block text-[7.5px] uppercase">Cardholder</span>
                            <span className="font-extrabold text-white uppercase">{profileName}</span>
                          </div>
                          <div>
                            <span className="text-emerald-100/60 block text-[7.5px] uppercase">Expires</span>
                            <span className="font-extrabold text-white">12 / 28</span>
                          </div>
                        </div>
                      </div>

                      {/* Form to edit Card Number details */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const brand = (form.elements.namedItem('card_brand') as HTMLSelectElement).value;
                          const rawNum = (form.elements.namedItem('card_number') as HTMLInputElement).value;
                          const lastFour = rawNum.replace(/\s+/g, '').slice(-4);

                          const updatedLabel = `${brand} **${lastFour || '2910'}`;
                          setProfileSavedCard(updatedLabel);
                          
                          // Also keep special checkout cards synced
                          setSpecialCardNumber(rawNum);
                          setSpecialCardName(profileName);

                          setActiveProfileModal(null);
                          setMessage(`Credit card details updated successfully to ${updatedLabel}!`);
                        }}
                        className="space-y-4 text-xs font-semibold text-gray-700"
                      >
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Card Provider</label>
                          <select 
                            name="card_brand"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E6A23C] focus:ring-1 focus:ring-[#E6A23C]/25 outline-none bg-white text-gray-900"
                          >
                            <option value="Visa">Visa Premium</option>
                            <option value="Mastercard">Mastercard Gold</option>
                            <option value="Amex">American Express</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">New Card Number</label>
                          <input 
                            name="card_number"
                            type="text" 
                            placeholder="4321 4567 8910 4821"
                            maxLength={19}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E6A23C] focus:ring-1 focus:ring-[#E6A23C]/25 outline-none text-gray-900 font-mono"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Expiry Date</label>
                            <input 
                              name="card_expiry"
                              type="text" 
                              placeholder="MM / YY"
                              maxLength={7}
                              defaultValue="12 / 28"
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E6A23C] focus:ring-1 focus:ring-[#E6A23C]/25 outline-none text-gray-900 font-mono text-center"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">CVV Code</label>
                            <input 
                              name="card_cvv"
                              type="password" 
                              placeholder="333"
                              maxLength={3}
                              defaultValue="333"
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#E6A23C] focus:ring-1 focus:ring-[#E6A23C]/25 outline-none text-gray-900 font-mono text-center"
                              required
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex gap-3 text-xs font-bold font-sans">
                          <button
                            type="button"
                            onClick={() => setActiveProfileModal(null)}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-full text-center"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-[#E6A23C] hover:bg-[#c2842a] text-white py-2.5 px-4 rounded-full text-center font-black"
                          >
                            Save linked card
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. CHANGE PASSWORD MODAL */}
              {activeProfileModal === 'password' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left animate-fade-in animate-fade-in-fast">
                  <div className="bg-white border border-gray-150 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
                    <div className="h-2 w-full bg-[#8E44AD]" />
                    
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 md:p-8 space-y-6">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Security Credentials</h3>
                        <p className="text-xs text-gray-400 font-semibold uppercase font-mono mt-0.5">Encrypt your portal entry keys</p>
                      </div>

                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const current = (form.elements.namedItem('curr_pass') as HTMLInputElement).value;
                          const newPass = (form.elements.namedItem('new_pass') as HTMLInputElement).value;
                          const confirmPass = (form.elements.namedItem('confirm_pass') as HTMLInputElement).value;

                          if (newPass !== confirmPass) {
                            alert("New passwords do not match!");
                            return;
                          }

                          setProfilePassword(newPass);
                          setActiveProfileModal(null);
                          setMessage("Password changed successfully and encrypted inside database logs! 🛡️");
                        }}
                        className="space-y-4 text-xs font-semibold text-gray-700"
                      >
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Current Password</label>
                          <input 
                            name="curr_pass"
                            type="password" 
                            placeholder="Enter current password"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#8E44AD] focus:ring-1 focus:ring-[#8E44AD]/25 outline-none text-gray-900 font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1.5 relative">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">New Password</label>
                          <div className="relative">
                            <input 
                              name="new_pass"
                              type={showPasswordRaw ? "text" : "password"} 
                              placeholder="Enter new complex password"
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#8E44AD] focus:ring-1 focus:ring-[#8E44AD]/25 outline-none text-gray-900 pr-10 font-mono"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswordRaw(!showPasswordRaw)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">Confirm New Password</label>
                          <input 
                            name="confirm_pass"
                            type={showPasswordRaw ? "text" : "password"} 
                            placeholder="Retype password validation"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#8E44AD] focus:ring-1 focus:ring-[#8E44AD]/25 outline-none text-gray-900 font-mono"
                            required
                          />
                        </div>

                        <div className="pt-2 flex gap-3 text-xs font-bold font-sans">
                          <button
                            type="button"
                            onClick={() => setActiveProfileModal(null)}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-full text-center"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-[#8E44AD] hover:bg-[#732d91] text-white py-2.5 px-4 rounded-full text-center font-black"
                          >
                            Update entry key
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. HELP & SUPPORT MODAL */}
              {activeProfileModal === 'help' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left animate-fade-in animate-fade-in-fast">
                  <div className="bg-white border border-gray-150 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
                    <div className="h-2 w-full bg-gray-600" />
                    
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 md:p-8 space-y-6">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Help & Resident Support</h3>
                        <p className="text-xs text-gray-400 font-semibold uppercase font-mono mt-0.5">Greenfield EcoTrack logistics care</p>
                      </div>

                      {/* Hot numbers inside clean block rows */}
                      <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl overflow-hidden text-xs">
                        <div className="p-4 bg-gray-50 flex items-center gap-3">
                          <Phone className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-gray-400 font-bold block text-[9px] font-mono">STANDBY TOLL-FREE HELPLINE</span>
                            <span className="font-extrabold text-[#1E4D2B] font-mono text-sm">+94 11 234 5678</span>
                          </div>
                        </div>
                        <div className="p-4 bg-white flex items-center gap-3">
                          <Mail className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-gray-400 font-bold block text-[9px] font-mono">SUPPORT INTEGRATION EMAIL</span>
                            <span className="font-extrabold text-gray-700 font-mono text-sm">support@ecotrack.lk</span>
                          </div>
                        </div>
                      </div>

                      {/* Instant Action: Bot chat */}
                      <div className="space-y-3.5 bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 text-xs">
                        <h4 className="text-[10px] font-black text-[#1E4D2B] uppercase tracking-wider flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-[#1E4D2B]" />
                          <span>Interactive Live AI Assistance</span>
                        </h4>
                        <p className="text-gray-500 font-medium leading-relaxed">
                          Do you need help with waste separation guidelines, local collection delays, chemical recycling protocols, or late chutes issues? Ask Eco-Bot directly.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveProfileModal(null);
                            setActiveTab('chatbot');
                            setMessage("Booted active chat lobby with Eco-Bot! 🤖");
                          }}
                          className="w-full bg-[#1E4D2B] hover:bg-[#15341D] text-white rounded-xl py-2.5 px-4 font-black text-center flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Bot className="w-4 h-4 text-white" />
                          <span>Launch Live Eco-Bot Assistant</span>
                        </button>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveProfileModal(null)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-2.5 px-6 rounded-full text-xs transition-colors cursor-pointer"
                        >
                          Close help panel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. ABOUT ECOTRACK MODAL */}
              {activeProfileModal === 'about' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left animate-fade-in animate-fade-in-fast">
                  <div className="bg-white border border-gray-150 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
                    <div className="h-2 w-full bg-[#1E4D2B]" />
                    
                    <button
                      type="button"
                      onClick={() => setActiveProfileModal(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 md:p-8 space-y-6">
                      <div className="text-center space-y-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#1E4D2B] to-[#2E6F40] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                          <Leaf className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-[#1E4D2B] tracking-tight">EcoTrack App</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">Sustainable Municipal Chute Logistics</p>
                        </div>
                      </div>

                      {/* Technical specifications logs to make it feel super realistic and premium */}
                      <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl space-y-2.5 text-[11px] font-semibold text-gray-600">
                        <div className="flex justify-between">
                          <span className="text-gray-400">BUILD VERSION</span>
                          <span className="font-extrabold text-slate-800 font-mono">v2.4.1 (Stable Release)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">SANDBOX LICENSE</span>
                          <span className="font-extrabold text-slate-800 font-mono">MIT Greenfield Dev Lic</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">ECO SCORE STATUS</span>
                          <span className="font-extrabold text-emerald-700 font-mono">98.5% Carbon Savings</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">SECURE SYSTEM SIGNATURE</span>
                          <span className="font-extrabold text-teal-700 font-mono">SHA-256 / SSL ENCRYPTED</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-450 leading-relaxed font-sans font-medium text-center italic">
                        "Built with environmental awareness in Greenfield Residencies to encourage, track, and incentivize systematic refuse, recycle, and organic compost sorting."
                      </p>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveProfileModal(null)}
                          className="w-full bg-[#1E4D2B] hover:bg-[#15341D] text-white font-black py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center"
                        >
                          Acknowledge & Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
 
        </div>
      </main>
 
      {/* 4. CHRONO MAP DRAWER MODAL */}
      {showLiveTracker && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-fade-in-fast" id="livetracker-modal">
          <div className="bg-white border border-gray-100 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl relative overflow-hidden text-left font-semibold">
            
            {/* Modal header */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 text-left">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#1E4D2B] animate-spin-slow" />
                <div>
                  <h3 className="text-sm font-black text-[#1E4D2B]">EcoTrack LIVE GPS Map</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sunil Kumara is actively cleaning</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowLiveTracker(false)}
                className="p-1 px-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 font-extrabold text-xs cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>
 
            {/* Map Canvas representation */}
            <div className="bg-[#F4F8F5] border border-gray-150 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[220px]">
              
              <div className="absolute top-3 right-3 text-gray-400 text-[10px] font-mono leading-none bg-white py-1 px-2 rounded border flex items-center gap-1 font-bold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                ACTIVE BROADCAST
              </div>
 
              <div className="w-full relative py-6">
                {/* Connecting floor hallway pipeline indicator */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-200 rounded -translate-y-1/2 z-0"></div>
                {/* Traversed route progress line */}
                <div className="absolute top-1/2 left-4 w-1/2 h-1 bg-emerald-500 rounded -translate-y-1/2 z-0"></div>
 
                <div className="flex justify-between items-center relative z-10 px-2">
                  {/* Start of shift */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] flex items-center justify-center border-2 border-white shadow-md">
                      01
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Unit {profileUnit !== 'Not Assigned' ? (profileUnit.includes('-') ? profileUnit.split('-')[0] + '-' + (parseInt(profileUnit.split('-')[1]) - 1) : parseInt(profileUnit) - 1) : '101'}</span>
                  </div>
 
                  {/* Unit 2 Done */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] flex items-center justify-center border-2 border-white shadow-md">
                      02
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Unit {profileUnit !== 'Not Assigned' ? (profileUnit.includes('-') ? profileUnit.split('-')[0] + '-' + (parseInt(profileUnit.split('-')[1]) - 2) : parseInt(profileUnit) - 2) : '100'}</span>
                  </div>
 
                  {/* Active Sunil's Position */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#1E4D2B] text-white flex items-center justify-center border-4 border-white shadow-lg animate-bounce relative z-15">
                      <Trash2 className="w-4.5 h-4.5 text-white" />
                    </div>
                    <span className="text-[9px] font-black text-emerald-800 mt-1 font-mono">Floor {profileFloor}</span>
                  </div>
 
                  {/* Amantha Unit */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-white font-extrabold text-[9px] flex items-center justify-center border-2 border-white shadow-md">
                      ⏱
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase text-[#1E4D2B]">{profileUnit} (Me)</span>
                  </div>
 
                  {/* Exit */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-650 font-extrabold text-[9px] flex items-center justify-center border-2 border-white shadow-md">
                      E
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">EXIT</span>
                  </div>
                </div>
              </div>
 
              <div className="w-full text-center bg-white/70 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-100/30 text-[11px] font-semibold text-gray-600 leading-normal mt-2 shadow-xs">
                🌿 <strong className="text-gray-900">Recommended Staging:</strong> {unitProfile?.next_pickup?.worker?.name || 'Staff'} has cleared corridor levels {typeof profileFloor === 'number' || !isNaN(Number(profileFloor)) ? (Number(profileFloor) > 1 ? Number(profileFloor) - 1 : 1) : 2}. Please keep trash bags outside your doorway now.
              </div>
            </div>
 
            {/* Modal actions */}
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowLiveTracker(false);
                  setActiveTab('chatbot');
                }}
                className="px-4 py-2 border border-[#1E4D2B]/20 bg-[#EBFDF2] text-[#1E4D2B] hover:bg-emerald-100 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Consult Eco-Bot
              </button>
              <button
                type="button"
                onClick={() => setShowLiveTracker(false)}
                className="px-4 py-2 bg-[#1E4D2B] text-white hover:bg-[#15341D] rounded-xl font-bold text-xs cursor-pointer transition-all shadow-xs"
              >
                Dismiss GPS
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* 5. INTERACTIVE DIGITIZED RECEIPT POPUP DRAWER */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="receipt-modal">
          <div className="bg-white border border-gray-150 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative overflow-hidden text-left font-semibold">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#1E4D2B]"></div>
            
            <div className="flex justify-between items-start pt-2">
              <div className="flex items-center gap-1.5 text-[#1E4D2B] font-black text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#1E4D2B]" />
                <span className="uppercase tracking-wide">Digital Safe Receipt</span>
              </div>
              <button onClick={() => setShowReceipt(null)} className="text-gray-400 hover:text-gray-900 font-extrabold text-xs cursor-pointer">✕</button>
            </div>
 
            <div className="space-y-3 pt-1">
              <h4 className="text-sm font-black text-gray-900">{showReceipt.title}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">Invoiced on {showReceipt.date}</p>
            </div>
 
              <ul className="divide-y divide-gray-100 border-t border-b border-gray-100 py-2.5 text-[11px] font-semibold text-gray-450 space-y-1.5">
                <li className="flex justify-between items-center py-1">
                  <span>Ledger transaction code</span>
                  <span className="font-mono text-gray-900 font-bold">{showReceipt.ref}</span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span>Merchant processor gateway</span>
                  <span className="text-[#1E4D2B] font-black">{showReceipt.gateway}</span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span>Settlement Status</span>
                  <span className="text-emerald-800 font-black bg-[#EBFDF2] px-2 py-0.5 rounded-full text-[9px] uppercase">captured</span>
                </li>
                <li className="flex justify-between items-center py-1 bg-gray-50 p-1.5 rounded">
                  <span className="text-gray-900 font-bold">Total amount cleared</span>
                  <span className="text-xs font-black text-[#1E4D2B]">LKR {showReceipt.amount.toLocaleString()}.00</span>
                </li>
              </ul>
 
              <div className="text-center py-1.5">
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                  Thank you for settling public recycling maintenance levies promptly. Keep Greenfield green! 🌳
                </p>
                <button
                  onClick={() => setShowReceipt(null)}
                  className="mt-3.5 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer transition-colors animate-fade-in"
                >
                  Close Receipt
                </button>
              </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL OVERLAY FOR HISTORY / BILLING RECORDS */}
      {selectedReceiptPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-fade-in-fast" id="receipt-modal">
          <motion.div 
            className="bg-white border border-gray-150 p-6 rounded-3xl max-w-lg w-full space-y-5 font-sans text-xs text-left shadow-2xl relative font-semibold"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {/* Real printable container card */}
            <div id="dynamic-printable-receipt-card" className="p-1 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-[#1E4D2B] font-black">
                  <Leaf className="w-5 h-5 text-[#1E4D2B]" />
                  <span className="text-sm font-black tracking-tight text-[#1E4D2B]">EcoTrack Greenfield</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider leading-none">Receipt Reference</span>
                  <span className="text-xs font-black text-slate-800 tracking-tight leading-none mt-1 inline-block">{selectedReceiptPayment.reference_code}</span>
                </div>
              </div>

              {/* Status & Amount */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#F4F8F5] border border-emerald-100/30 rounded-2xl gap-3">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block tracking-wide">Paid Amount</span>
                  <p className="text-xl font-black text-[#1E4D2B] mt-0.5">LKR {selectedReceiptPayment.amount.toLocaleString()}.00</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block tracking-wide mb-1">Status</span>
                  <span className="px-2.5 py-1 bg-[#EBFDF2] text-emerald-850 rounded-full font-black text-[9px] uppercase tracking-wide inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Paid
                  </span>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 text-xs border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Resident Profile</span>
                  <p className="font-extrabold text-[#1E4D2B] mt-0.5">{profileName}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Apartment Unit</span>
                  <p className="font-extrabold text-[#1E4D2B] mt-0.5 font-sans">Unit {profileUnit} · {profileBlock}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Settled On</span>
                  <p className="font-extrabold text-gray-800 mt-0.5">{selectedReceiptPayment.date || selectedReceiptPayment.created_at?.slice(0, 10) || '2026-05-13'}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Gateway Channel</span>
                  <p className="font-extrabold text-gray-800 mt-0.5 uppercase">{selectedReceiptPayment.payment_method || 'payhere (visa_direct)'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 pt-1.5">
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Line Item Summary</span>
                <div className="border border-gray-150 rounded-xl overflow-hidden font-sans">
                  <div className="bg-gray-50/80 px-4 py-2 flex justify-between text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="px-4 py-3.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-gray-800">{selectedReceiptPayment.notes || selectedReceiptPayment.description || 'Monthly Facility Waste Levy'}</p>
                      <p className="text-[9.5px] text-gray-400 font-semibold mt-0.5 font-mono select-all">REF: {selectedReceiptPayment.reference_code}</p>
                    </div>
                    <span className="font-black text-gray-905 shrink-0">LKR {selectedReceiptPayment.amount.toLocaleString()}.00</span>
                  </div>
                  
                  {selectedReceiptPayment.payment_type === 'special_pickup' && (
                    <>
                      <div className="px-4 py-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <span>Same-week Priority pickup surcharge</span>
                        <span>LKR 200.00</span>
                      </div>
                      <div className="px-4 py-2 border-t border-gray-100 flex justify-between items-center text-xs text-emerald-600 font-semibold">
                        <span>Eco-recycle sorting discount</span>
                        <span>-LKR 25.00</span>
                      </div>
                    </>
                  )}
                  
                  <div className="px-4 py-3 bg-[#F4F8F5] border-t border-gray-150 flex justify-between text-xs font-black">
                    <span className="text-gray-700 font-extrabold">Total Adjusted Amount</span>
                    <span className="text-[#1E4D2B]">
                      LKR {
                        (selectedReceiptPayment.payment_type === 'special_pickup' 
                          ? selectedReceiptPayment.amount + 200 - 25 
                          : selectedReceiptPayment.amount
                        ).toLocaleString()
                      }.00
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[9.5px] font-medium text-gray-400 text-center pt-2 italic leading-relaxed">
                Thank you for utilizing EcoTrack Resident Ledger portals.
              </p>
            </div>

            {/* Buttons Row */}
            <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  handlePrintReceiptItem(selectedReceiptPayment);
                }}
                className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 font-black text-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                id="receipt-direct-print-btn"
              >
                <Printer className="w-3.5 h-3.5 text-gray-400" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownloadReceiptItemPDF(selectedReceiptPayment);
                }}
                className="py-2.5 px-4 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white text-xs font-black cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                id="receipt-direct-download-btn"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceiptPayment(null)}
                className="py-2.5 px-4 rounded-xl border border-gray-205 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold cursor-pointer transition-all"
                id="receipt-direct-close-btn"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 6. MODAL 1: CHECKOUT SANDBOX POPUP SIMULATION */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="checkout-gateway">
          <motion.div 
            className="bg-white border border-gray-150 p-6 rounded-3xl max-w-sm w-full space-y-4 font-sans text-xs text-left shadow-2xl relative font-semibold"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-1.5 text-[#1E4D2B] font-black">
                <Banknote className="w-4.5 h-4.5 text-[#1E4D2B]" />
                <span className="uppercase tracking-wider">Simulated Checkout Gateway</span>
              </div>
              <button onClick={() => setShowCheckoutModal(null)} className="text-gray-400 hover:text-gray-900 font-extrabold text-xs cursor-pointer">✕</button>
            </div>
 
            <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
              Settle payment code <strong className="text-gray-950">{showCheckoutModal.item.reference_code}</strong> under PayHere / Stripe sandbox clearance rules.
            </p>
 
            <div className="bg-[#F4F8F5] p-3.5 rounded-xl border border-emerald-100/30 flex justify-between items-center text-xs">
              <span className="text-gray-500 font-bold">Outstanding Levy Value</span>
              <span className="text-sm font-black text-[#1E4D2B]">LKR {showCheckoutModal.item.amount.toLocaleString()}.00</span>
            </div>
 
            <form onSubmit={handleConfirmSettlePayment} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">Simulated Card Digits</label>
                <input 
                  type="text" 
                  required
                  placeholder="4000 1234 5678 9010"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                  className="w-full bg-[#F4F8F5] border border-gray-200 text-gray-705 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>
 
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">Expiry Date</label>
                  <input 
                    type="text" 
                    required
                    placeholder="MM/YY"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                    className="w-full bg-[#F4F8F5] border border-gray-200 text-gray-705 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1">CVV Code</label>
                  <input 
                    type="password" 
                    required
                    placeholder="•••"
                    value={cardDetails.cvc}
                    onChange={(e) => setCardDetails({...cardDetails, cvc: e.target.value})}
                    className="w-full bg-[#F4F8F5] border border-gray-200 text-gray-705 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
 
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Clear Dues LKR ${showCheckoutModal.item.amount.toLocaleString()}`}
              </button>
            </form>
          </motion.div>
        </div>
      )}
 
      {/* 7. MODAL 2: STARS RATING FOR WORKERS */}
      {showCheckoutModal === null && activeRatingJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="rating-modal">
          <motion.div 
            className="bg-white border border-gray-150 p-6 rounded-3xl max-w-sm w-full space-y-4 font-sans text-xs text-left shadow-2xl relative font-semibold"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex justify-between items-start text-left">
              <h3 className="text-sm font-black text-[#1E4D2B] flex items-center gap-1.5">
                <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500 text-left" />
                <span>Rate {activeRatingJob.worker?.name || 'Staff'}</span>
              </h3>
              <button onClick={() => setActiveRatingJob(null)} className="text-gray-400 hover:text-gray-900 font-extrabold text-xs cursor-pointer">✕</button>
            </div>
 
            <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
              Evaluate collection quality on Level <strong className="text-gray-900">{profileFloor}</strong> by staff <strong className="text-gray-900">{activeRatingJob.worker?.name || 'Staff'}</strong> today.
            </p>
 
            <form onSubmit={handleSubmitWorkerRating} className="space-y-4">
              <div className="flex justify-center gap-3 py-1 bg-gray-50 rounded-2xl border border-gray-100">
                {[1, 2, 3, 4, 5].map((starIdx) => (
                  <button
                    key={starIdx}
                    type="button"
                    onClick={() => setStars(starIdx)}
                    className="text-2xl hover:scale-110 focus:outline-none transition-all cursor-pointer select-none"
                  >
                    <span className={starIdx <= stars ? 'text-amber-500 font-black' : 'text-gray-300'}>★</span>
                  </button>
                ))}
              </div>
 
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-gray-400 mb-1">Feedback comments</label>
                <textarea
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="Describe your review e.g. Left corridor pristine, extremely polite!"
                  className="w-full bg-[#F4F8F5] border border-gray-200 text-gray-700 rounded-xl p-2.5 h-20 text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>
 
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1E4D2B] hover:bg-[#15341D] text-white font-black text-xs transition-all cursor-pointer shadow-md"
              >
                Submit Performance Star Review
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 8. LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="logout-confirm-modal">
          <motion.div 
            className="bg-white border border-gray-150 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative overflow-hidden text-left font-sans font-semibold"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-rose-600"></div>
            
            <div className="flex justify-between items-start pt-2">
              <div className="flex items-center gap-1.5 text-rose-600 font-extrabold text-xs font-sans">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-600 animate-pulse" />
                <span className="uppercase tracking-wide font-black">Confirm Sign Out</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowLogoutConfirm(false)} 
                className="text-gray-450 hover:text-gray-900 font-black text-xs cursor-pointer inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <h4 className="text-sm font-black text-gray-900">Are you sure you want to log out?</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-bold">
                You are currently signed into Unit {profileUnit || 'Not Assigned'}. Logging out will clear your authorization context and return you to the login screen.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-650 cursor-pointer rounded-xl text-xs font-black transition-all border border-gray-200/80 hover:border-gray-350 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer rounded-xl text-xs font-black transition-all shadow-xs text-center flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Log out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 9. VIEW RATING DETAILS MODAL */}
      {viewingHistoryDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="history-detail-modal">
          <motion.div 
            className="bg-white border border-gray-150 p-6 md:p-8 rounded-3xl max-w-sm w-full space-y-5 shadow-2xl relative overflow-hidden text-left font-sans font-semibold"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#1E4D2B]"></div>
            
            <div className="flex justify-between items-start pt-1">
              <div className="flex items-center gap-1.5 text-[#1E4D2B] font-extrabold text-[10.5px] uppercase tracking-wider font-sans">
                <Leaf className="w-4 h-4 text-[#1E4D2B]" />
                <span>Collection Feedback</span>
              </div>
              <button 
                type="button"
                onClick={() => setViewingHistoryDetail(null)} 
                className="text-gray-400 hover:text-gray-900 font-extrabold text-xs cursor-pointer inline-flex items-center justify-center w-5 h-5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Profile Row */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-[#EBFDF2] border border-emerald-100 flex items-center justify-center font-black text-[#1E4D2B] text-sm select-none shrink-0">
                {viewingHistoryDetail.code || 'SK'}
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-900 leading-tight">
                  {viewingHistoryDetail.worker === 'Sunil K.' ? 'Sunil Kumara' : viewingHistoryDetail.worker === 'Nimal P.' ? 'Nimal Perera' : viewingHistoryDetail.worker}
                </h4>
                <p className="text-[10px] text-gray-450 font-bold mt-0.5">
                  Scheduled disposal: {viewingHistoryDetail.date} • {viewingHistoryDetail.time}
                </p>
              </div>
            </div>

            {/* Star Rating Selection */}
            <div className="space-y-3 pt-0.5">
              <div>
                <span className="block text-[9px] uppercase font-black text-gray-400 tracking-wider">
                  Given Star Rating
                </span>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((starIdx) => (
                    <Star
                      key={starIdx}
                      className={`w-5 h-5 stroke-[1.5] ${
                        starIdx <= (viewingHistoryDetail.rating || 5)
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-gray-200 fill-transparent'
                      }`}
                    />
                  ))}
                  <span className="text-[11px] font-black text-[#1E4D2B] ml-2 font-mono">
                    ({viewingHistoryDetail.rating || 5}/5)
                  </span>
                </div>
              </div>

              {/* Service Highlights */}
              <div className="space-y-1.5">
                <span className="block text-[9px] uppercase font-black text-gray-400 tracking-wider">
                  Highlights
                </span>
                <div className="flex flex-wrap gap-1">
                  {viewingHistoryDetail.worker === 'Nimal P.' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 text-[9.5px] font-bold rounded-lg border border-blue-100">
                      ⚡ Average speed
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EBFDF2] text-emerald-800 text-[9.5px] font-bold rounded-lg border border-emerald-100/50">
                        ✓ On time
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EBFDF2] text-emerald-800 text-[9.5px] font-bold rounded-lg border border-emerald-100/50">
                        ✓ Clean Corridors
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EBFDF2] text-emerald-800 text-[9.5px] font-bold rounded-lg border border-emerald-100/50">
                        ✓ Very Polite
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Comment Block */}
              <div className="space-y-1.5">
                <span className="block text-[9px] uppercase font-black text-gray-400 tracking-wider">
                  Your Comment Feedback
                </span>
                <div className="bg-[#F4F8F5] border border-gray-150 p-3 rounded-xl text-xs font-semibold text-gray-700 italic leading-relaxed">
                  "{viewingHistoryDetail.feedback || 'Excellent work'}"
                </div>
              </div>
            </div>

            {/* Divider action button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewingHistoryDetail(null)}
                className="w-full py-2.5 bg-[#1E4D2B] hover:bg-[#15341D] text-white cursor-pointer rounded-xl text-xs font-black transition-all shadow-xs text-center flex items-center justify-center gap-1"
              >
                <span>Okay, Close</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

