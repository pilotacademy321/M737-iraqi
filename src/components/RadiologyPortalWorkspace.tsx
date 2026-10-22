import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  RadiologyProfile, 
  RadiologyService, 
  RadiologyBooking, 
  RadiologyReport,
  RadiologyModality,
  RadiologyBookingStatus
} from '../types';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  Scan, 
  Calendar, 
  Clock, 
  FileText, 
  Settings, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Phone, 
  DollarSign, 
  RefreshCw, 
  Edit3, 
  ShieldCheck, 
  Save, 
  Trash2, 
  Activity, 
  Check, 
  Upload, 
  FileDown, 
  MessageSquare, 
  Cpu, 
  Eye, 
  Send,
  Layers,
  ChevronRight,
  ChevronLeft,
  Users,
  Search,
  Printer,
  X,
  ExternalLink,
  Image as ImageIcon,
  AlertTriangle,
  QrCode,
  FileCheck2,
  CalendarDays
} from 'lucide-react';

interface RadiologyPortalWorkspaceProps {
  onBackToHome: () => void;
}

export const RadiologyPortalWorkspace: React.FC<RadiologyPortalWorkspaceProps> = ({ onBackToHome }) => {
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const { language, isRTL } = useLanguage();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'patients' | 'services' | 'reports' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Center Profile State
  const [centerProfile, setCenterProfile] = useState<RadiologyProfile | null>(null);

  // Bookings State
  const [bookings, setBookings] = useState<RadiologyBooking[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'cancelled' | 'rescheduled'>('all');
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);

  // New Booking Form
  const [newBookingData, setNewBookingData] = useState({
    patientName: '',
    patientPhone: '',
    serviceName: 'سونار البطن والحوض الشامل',
    modality: 'ultrasound' as RadiologyModality,
    date: new Date().toISOString().split('T')[0],
    timeSlot: '11:00 AM',
    notes: '',
  });

  // Reschedule Modal State
  const [reschedulingBooking, setReschedulingBooking] = useState<RadiologyBooking | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', reason: '' });

  // Cancel Modal State
  const [cancellingBooking, setCancellingBooking] = useState<RadiologyBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Services State
  const [services, setServices] = useState<RadiologyService[]>([]);
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [newServiceData, setNewServiceData] = useState({
    name: '',
    modality: 'ultrasound' as RadiologyModality,
    price: 30000,
    preparationInstructions: 'صيام 6 ساعات عن الطعام وشرب كمية ماء كافية.',
    estimatedReportHours: 2,
    isAvailable: true,
  });

  // Reports State
  const [reports, setReports] = useState<RadiologyReport[]>([]);
  const [reportFilter, setReportFilter] = useState<string>('all');
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [selectedBookingForReport, setSelectedBookingForReport] = useState<RadiologyBooking | null>(null);
  const [viewingReportModal, setViewingReportModal] = useState<RadiologyReport | null>(null);

  // Report creation form
  const [newReportData, setNewReportData] = useState({
    patientName: '',
    serviceName: 'سونار البطن والحوض',
    modality: 'ultrasound' as RadiologyModality,
    clinicalIndication: '',
    technique: 'Gray scale 2D & Color Doppler ultrasound',
    findings: '',
    impression: '',
    recommendations: '',
    radiologistName: 'د. استشاري الأشعة والسونار',
    radiologistLicense: 'RAD-IQ-8821',
    fileUrl: '',
    scanImages: [] as string[],
    status: 'published' as 'draft' | 'published',
  });

  // Patient Search & Selected Patient Filter
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Center Settings Form State
  const [editProfileForm, setEditProfileForm] = useState({
    centerName: '',
    logoUrl: '',
    licenseNumber: '',
    address: '',
    governorate: 'بغداد (Baghdad)',
    phone: '',
    whatsapp: '',
    workingHours: '9:00 AM - 9:00 PM',
    equipmentInput: 'MRI 1.5 Tesla, CT Scan 128 Slices, 4D Color Doppler Ultrasound, Digital X-Ray',
    mapsUrl: '',
    bio: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOperable = userProfile?.status === 'approved' || isAdmin;

  const governoratesList = [
    'بغداد (Baghdad)',
    'البصرة (Basra)',
    'أربيل (Erbil)',
    'النجف الأشرف (Najaf)',
    'كربلاء المقدسة (Karbala)',
    'نينوى / الموصل (Nineveh)',
    'السليمانية (Sulaymaniyah)',
    'بابل / الحلة (Babylon)',
    'الأنبار (Anbar)',
    'ديالى (Diyala)',
    'كركوك (Kirkuk)',
    'ذي قار / الناصرية (Dhi Qar)',
    'ميسان / العمارة (Maysan)',
    'المثنى / السماوة (Muthanna)',
    'القادسية / الديوانية (Qadisiyyah)',
    'واسط / الكوت (Wasit)',
    'صلاح الدين (Saladin)',
    'دهوك (Duhok)'
  ];

  const modalitiesList: { id: RadiologyModality; labelAr: string; labelEn: string }[] = [
    { id: 'ultrasound', labelAr: 'سونار وتلفزيون', labelEn: 'Ultrasound' },
    { id: 'xray', labelAr: 'أشعة سينية رقمية', labelEn: 'Digital X-Ray' },
    { id: 'ct', labelAr: 'مفراس حلزوني (CT)', labelEn: 'CT Scan' },
    { id: 'mri', labelAr: 'رنين مغناطيسي (MRI)', labelEn: 'MRI' },
    { id: 'doppler', labelAr: 'دوبلر ملون للأوعية', labelEn: 'Color Doppler' },
    { id: 'mammogram', labelAr: 'ماموغرام الثدي', labelEn: 'Mammography' },
  ];

  // Load All Radiology Center Data from Firestore
  const loadRadiologyData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Radiology Profile
      const profRef = doc(db, 'radiology_profiles', user.uid);
      const profSnap = await getDoc(profRef);

      if (profSnap.exists()) {
        const data = profSnap.data() as RadiologyProfile;
        setCenterProfile(data);
        setEditProfileForm({
          centerName: data.centerName || userProfile?.facilityName || 'مركز الأشعة التخصصي',
          logoUrl: data.logoUrl || '',
          licenseNumber: data.licenseNumber || userProfile?.licenseNumber || '',
          address: data.address || userProfile?.facilityName || '',
          governorate: data.governorate || userProfile?.governorate || 'بغداد (Baghdad)',
          phone: data.phone || userProfile?.phone || '',
          whatsapp: data.whatsapp || userProfile?.phone || '',
          workingHours: data.workingHours || '9:00 AM - 9:00 PM',
          equipmentInput: (data.equipmentList || []).join(', ') || 'MRI 1.5 Tesla, CT Scan, 4D Ultrasound',
          mapsUrl: data.mapsUrl || '',
          bio: data.bio || '',
        });
      } else {
        // Initialize default profile
        const initialProfile: RadiologyProfile = {
          centerId: user.uid,
          centerName: userProfile?.facilityName || userProfile?.displayName || 'مركز الأشعة والسونار المعتمد',
          logoUrl: '',
          licenseNumber: userProfile?.licenseNumber || 'RAD-IQ-2026',
          address: userProfile?.facilityName || 'بغداد، ساحة الواثق، مجمع الأطباء التخصصي',
          governorate: userProfile?.governorate || 'بغداد (Baghdad)',
          phone: userProfile?.phone || '07885663748',
          whatsapp: userProfile?.phone || '07885663748',
          workingHours: '9:00 AM - 9:00 PM',
          equipmentList: ['MRI 1.5 Tesla', 'CT Scan 128 Slices', '4D Color Doppler Ultrasound', 'Digital Panoramic X-Ray'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(profRef, initialProfile);
        setCenterProfile(initialProfile);
      }

      // 2. Fetch Center Bookings
      const bookQuery = query(
        collection(db, 'radiology_bookings'),
        where('centerId', '==', user.uid)
      );
      const bookSnap = await getDocs(bookQuery);
      const bookList = bookSnap.docs.map(d => ({ id: d.id, ...d.data() } as RadiologyBooking));
      bookList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(bookList);

      // 3. Fetch Center Services
      const servQuery = query(
        collection(db, 'radiology_services'),
        where('centerId', '==', user.uid)
      );
      const servSnap = await getDocs(servQuery);
      let servList = servSnap.docs.map(d => ({ id: d.id, ...d.data() } as RadiologyService));

      // If no services yet, seed standard Iraqi radiology services
      if (servList.length === 0) {
        const defaultServices: Omit<RadiologyService, 'id'>[] = [
          {
            centerId: user.uid,
            name: 'سونار البطن والحوض الشامل (Abdomen & Pelvis Ultrasound)',
            modality: 'ultrasound',
            price: 35000,
            preparationInstructions: 'صيام 6 ساعات مع شرب كمية كافية من الماء لامتلاء المثانة.',
            estimatedReportHours: 1,
            isAvailable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            centerId: user.uid,
            name: 'أشعة الصدر الرقمية (Digital Chest X-Ray PA)',
            modality: 'xray',
            price: 25000,
            preparationInstructions: 'إزالة السلاسل والمعادن من منطقة الصدر قبل الفحص.',
            estimatedReportHours: 1,
            isAvailable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            centerId: user.uid,
            name: 'رنين مغناطيسي للدماغ (Brain MRI with Protocol)',
            modality: 'mri',
            price: 125000,
            preparationInstructions: 'إزالة أي أجهزة أو معادن ممغنطة، التواجد قبل 20 دقيقة.',
            estimatedReportHours: 4,
            isAvailable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            centerId: user.uid,
            name: 'دوبلر ملون لأوردة وشرايين الساقين (Lower Limbs Doppler)',
            modality: 'doppler',
            price: 55000,
            preparationInstructions: 'لا يتطلب صيام مسبق.',
            estimatedReportHours: 2,
            isAvailable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ];

        for (const s of defaultServices) {
          const sId = `serv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await setDoc(doc(db, 'radiology_services', sId), { id: sId, ...s });
        }
        const refreshedServSnap = await getDocs(servQuery);
        servList = refreshedServSnap.docs.map(d => ({ id: d.id, ...d.data() } as RadiologyService));
      }
      setServices(servList);

      // 4. Fetch Center Reports
      const repQuery = query(
        collection(db, 'radiology_reports'),
        where('centerId', '==', user.uid)
      );
      const repSnap = await getDocs(repQuery);
      const repList = repSnap.docs.map(d => ({ id: d.id, ...d.data() } as RadiologyReport));
      repList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(repList);

    } catch (err: unknown) {
      console.error('Error loading radiology center data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRadiologyData();
  }, [user]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Helper to send in-app notification to patient
  const sendPatientNotification = async (patientUid: string, title: string, message: string, type: 'booking_update' | 'report_ready') => {
    if (!patientUid) return;
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientUid: patientUid,
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to record notification in firestore:', e);
    }
  };

  // Booking Actions
  const handleUpdateBookingStatus = async (bookingId: string, status: RadiologyBookingStatus, patientId?: string, extra?: { cancellationReason?: string }) => {
    if (!isOperable) {
      showToast(language === 'ar' ? 'يتطلب إجراء العمليات اعتماد المشرف العام' : 'Super Admin approval required', 'error');
      return;
    }
    try {
      const ref = doc(db, 'radiology_bookings', bookingId);
      const updateData: Partial<RadiologyBooking> = {
        status,
        updatedAt: new Date().toISOString(),
        ...(extra?.cancellationReason ? { cancellationReason: extra.cancellationReason } : {}),
      };
      await updateDoc(ref, updateData);

      // Notify patient
      if (patientId) {
        const notifTitle = language === 'ar' ? 'تحديث موعد فحص الأشعة والسونار' : 'Radiology Booking Update';
        const notifMsg = language === 'ar' 
          ? `تم تحديث حالة حجز الفحص لدى ${centerProfile?.centerName || 'المركز'} إلى: ${status}${extra?.cancellationReason ? ` (السبب: ${extra.cancellationReason})` : ''}`
          : `Your radiology appointment status has been updated to: ${status}`;
        await sendPatientNotification(patientId, notifTitle, notifMsg, 'booking_update');
      }

      showToast(
        language === 'ar' ? `تم تحديث حالة الحجز إلى: ${status}` : `Booking updated to: ${status}`
      );
      await loadRadiologyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `radiology_bookings/${bookingId}`);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingBooking || !rescheduleData.newDate) return;
    if (!isOperable) {
      showToast(language === 'ar' ? 'يتطلب إجراء العمليات اعتماد المشرف العام' : 'Super Admin approval required', 'error');
      return;
    }
    try {
      const ref = doc(db, 'radiology_bookings', reschedulingBooking.id);
      await updateDoc(ref, {
        status: 'rescheduled',
        rescheduleDate: rescheduleData.newDate,
        rescheduleReason: rescheduleData.reason || 'الموعد المعاد جدولته بناء على جداول أجهزة التصوير',
        updatedAt: new Date().toISOString(),
      });

      if (reschedulingBooking.patientId) {
        await sendPatientNotification(
          reschedulingBooking.patientId,
          language === 'ar' ? 'إعادة جدولة موعد الفحص الإشعاعي' : 'Scan Rescheduled',
          language === 'ar' 
            ? `يقترح المركز الموعد البديل: ${rescheduleData.newDate}. السبب: ${rescheduleData.reason}`
            : `Proposed new scan time: ${rescheduleData.newDate}.`,
          'booking_update'
        );
      }

      showToast(
        language === 'ar' ? 'تم تسجيل وتعديل الموعد وإرسال إشعار للمراجع' : 'Reschedule confirmed'
      );
      setReschedulingBooking(null);
      setRescheduleData({ newDate: '', reason: '' });
      await loadRadiologyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `radiology_bookings/${reschedulingBooking.id}`);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    await handleUpdateBookingStatus(cancellingBooking.id, 'cancelled', cancellingBooking.patientId, {
      cancellationReason: cancelReason || (language === 'ar' ? 'تم الإلغاء من قبل إدارة المركز' : 'Cancelled by center administration')
    });
    setCancellingBooking(null);
    setCancelReason('');
  };

  // Create Walk-in / Direct Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBookingData.patientName.trim()) return;

    try {
      const bookingId = `rbook_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const newBooking: RadiologyBooking = {
        id: bookingId,
        centerId: user.uid,
        centerName: centerProfile?.centerName || userProfile?.facilityName || 'مركز الأشعة والسونار',
        patientId: `pat_${Date.now()}`,
        patientName: newBookingData.patientName,
        patientPhone: newBookingData.patientPhone || '07XXXXXXXXX',
        serviceId: `srv_${newBookingData.modality}`,
        serviceName: newBookingData.serviceName,
        modality: newBookingData.modality,
        date: newBookingData.date,
        timeSlot: newBookingData.timeSlot,
        status: isOperable ? 'accepted' : 'pending',
        notes: newBookingData.notes,
        reportReady: false,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'radiology_bookings', bookingId), newBooking);
      showToast(
        language === 'ar' ? 'تم تسجيل حجز الفحص بنجاح' : 'Scan booking registered'
      );
      setShowNewBookingModal(false);
      setNewBookingData({
        patientName: '',
        patientPhone: '',
        serviceName: 'سونار البطن والحوض الشامل',
        modality: 'ultrasound',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '11:00 AM',
        notes: '',
      });
      await loadRadiologyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'radiology_bookings');
    }
  };

  // Manage Services (Create & Toggle)
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newServiceData.name.trim()) return;

    try {
      const sId = `serv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const service: RadiologyService = {
        id: sId,
        centerId: user.uid,
        name: newServiceData.name,
        modality: newServiceData.modality,
        price: Number(newServiceData.price),
        preparationInstructions: newServiceData.preparationInstructions,
        estimatedReportHours: Number(newServiceData.estimatedReportHours),
        isAvailable: newServiceData.isAvailable,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'radiology_services', sId), service);
      showToast(language === 'ar' ? 'تمت إضافة الفحص لقائمة الخدمات' : 'Service added');
      setShowNewServiceModal(false);
      setNewServiceData({
        name: '',
        modality: 'ultrasound',
        price: 30000,
        preparationInstructions: 'صيام 6 ساعات عن الطعام.',
        estimatedReportHours: 2,
        isAvailable: true,
      });
      await loadRadiologyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'radiology_services');
    }
  };

  const handleToggleService = async (serviceId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'radiology_services', serviceId), {
        isAvailable: !currentStatus,
        updatedAt: new Date().toISOString(),
      });
      showToast(language === 'ar' ? 'تم تعديل جاهزية الخدمة' : 'Service status updated');
      await loadRadiologyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `radiology_services/${serviceId}`);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteDoc(doc(db, 'radiology_services', serviceId));
      showToast(language === 'ar' ? 'تم حذف الخدمة' : 'Service deleted');
      await loadRadiologyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `radiology_services/${serviceId}`);
    }
  };

  // Image Upload handler for Report (reads file to base64 Data URL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      showToast(language === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت' : 'Image size must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setNewReportData(prev => ({
          ...prev,
          scanImages: [...prev.scanImages, dataUrl]
        }));
        showToast(language === 'ar' ? 'تم إرفاق صورة الفحص الإشعاعي' : 'Scan image attached');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReportImage = (indexToRemove: number) => {
    setNewReportData(prev => ({
      ...prev,
      scanImages: prev.scanImages.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Create & Publish Radiology Report
  const handlePublishReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReportData.patientName.trim() || !newReportData.findings.trim()) return;

    if (!isOperable) {
      showToast(language === 'ar' ? 'لا يمكن نشر التقارير قبل الحصول على اعتماد الإدارة' : 'Center approval required to publish reports', 'error');
      return;
    }

    try {
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const patientId = selectedBookingForReport?.patientId || `pat_${Date.now()}`;

      const report: RadiologyReport = {
        id: reportId,
        centerId: user.uid,
        centerName: centerProfile?.centerName || userProfile?.facilityName || 'مركز الأشعة التخصصي',
        patientId,
        patientName: newReportData.patientName,
        bookingId: selectedBookingForReport?.id,
        serviceName: newReportData.serviceName,
        modality: newReportData.modality,
        clinicalIndication: newReportData.clinicalIndication,
        technique: newReportData.technique,
        findings: newReportData.findings,
        impression: newReportData.impression,
        recommendations: newReportData.recommendations,
        radiologistName: newReportData.radiologistName,
        radiologistLicense: newReportData.radiologistLicense,
        fileUrl: newReportData.fileUrl || `https://m737.iq/reports/download/${reportId}.pdf`,
        scanImages: newReportData.scanImages,
        status: newReportData.status,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'radiology_reports', reportId), report);

      // Also mark linked booking report as ready
      if (selectedBookingForReport?.id) {
        await updateDoc(doc(db, 'radiology_bookings', selectedBookingForReport.id), {
          reportReady: true,
          reportId: reportId,
          status: 'completed',
          updatedAt: now,
        });
      }

      // Notify Patient that their report is ready
      await sendPatientNotification(
        patientId,
        language === 'ar' ? 'جاهزية التقرير الشعاعي' : 'Radiology Report Published',
        language === 'ar'
          ? `صدر تقرير فحص (${newReportData.serviceName}) من ${centerProfile?.centerName}. يمكنك الاطلاع عليه في ملفك الصحي.`
          : `Your scan report for (${newReportData.serviceName}) is ready.`,
        'report_ready'
      );

      showToast(
        language === 'ar' ? 'تم اعتماد ونشر التقرير الشعاعي وإشعار المراجع' : 'Report published successfully'
      );
      setShowNewReportModal(false);
      setSelectedBookingForReport(null);
      setNewReportData({
        patientName: '',
        serviceName: 'سونار البطن والحوض',
        modality: 'ultrasound',
        clinicalIndication: '',
        technique: 'Gray scale 2D & Color Doppler ultrasound',
        findings: '',
        impression: '',
        recommendations: '',
        radiologistName: 'د. استشاري الأشعة والسونار',
        radiologistLicense: 'RAD-IQ-8821',
        fileUrl: '',
        scanImages: [],
        status: 'published',
      });
      await loadRadiologyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'radiology_reports');
    }
  };

  // Save Center Settings
  const handleSaveCenterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const now = new Date().toISOString();
      const equipmentArray = editProfileForm.equipmentInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updatedProfile: RadiologyProfile = {
        centerId: user.uid,
        centerName: editProfileForm.centerName,
        logoUrl: editProfileForm.logoUrl,
        licenseNumber: editProfileForm.licenseNumber || centerProfile?.licenseNumber || '',
        address: editProfileForm.address,
        governorate: editProfileForm.governorate,
        phone: editProfileForm.phone,
        whatsapp: editProfileForm.whatsapp,
        workingHours: editProfileForm.workingHours,
        equipmentList: equipmentArray,
        mapsUrl: editProfileForm.mapsUrl,
        bio: editProfileForm.bio,
        createdAt: centerProfile?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'radiology_profiles', user.uid), updatedProfile);

      // Sync non-privileged user profile fields
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editProfileForm.centerName,
        facilityName: editProfileForm.centerName,
        governorate: editProfileForm.governorate,
        phone: editProfileForm.phone,
        updatedAt: now,
      });

      showToast(
        language === 'ar' ? 'تم حفظ إعدادات وبيانات المركز بنجاح' : 'Center profile saved'
      );
      await loadRadiologyData();
      await refreshProfile();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `radiology_profiles/${user.uid}`);
    }
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'all') return true;
    return b.status === bookingFilter;
  });

  // Filtered Reports
  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.modality === reportFilter;
  });

  // Aggregated Unique Patient List
  const patientsRoster = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      phone: string;
      bookingsCount: number;
      lastVisitDate: string;
      modalities: Set<RadiologyModality>;
      latestReport?: RadiologyReport;
    }>();

    // From Bookings
    bookings.forEach(b => {
      const key = (b.patientPhone || b.patientName).trim();
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.bookingsCount += 1;
        existing.modalities.add(b.modality);
        if (new Date(b.date) > new Date(existing.lastVisitDate)) {
          existing.lastVisitDate = b.date;
        }
      } else {
        map.set(key, {
          id: b.patientId,
          name: b.patientName,
          phone: b.patientPhone,
          bookingsCount: 1,
          lastVisitDate: b.date,
          modalities: new Set([b.modality]),
        });
      }
    });

    // From Reports
    reports.forEach(r => {
      const key = (r.patientName).trim();
      const match = Array.from(map.values()).find(p => p.name === r.patientName);
      if (match) {
        match.latestReport = r;
      } else if (!map.has(key)) {
        map.set(key, {
          id: r.patientId,
          name: r.patientName,
          phone: '07XXXXXXXXX',
          bookingsCount: 1,
          lastVisitDate: r.createdAt.split('T')[0],
          modalities: new Set([r.modality]),
          latestReport: r,
        });
      }
    });

    let list = Array.from(map.values());
    if (patientSearchTerm.trim()) {
      const term = patientSearchTerm.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(term) || p.phone.includes(term)
      );
    }
    return list;
  }, [bookings, reports, patientSearchTerm]);

  // Derived Metrics
  const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
  const acceptedBookingsCount = bookings.filter(b => b.status === 'accepted').length;
  const completedBookingsCount = bookings.filter(b => b.status === 'completed').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-lg animate-in slide-in-from-top-3 ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          <CheckCircle2 size={18} />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Accreditation Status Warning if unapproved */}
      {!isOperable && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-4">
          <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">
              {language === 'ar' ? 'حساب المركز قيد المراجعة والاعتماد' : 'Center Accreditation Pending Review'}
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {language === 'ar'
                ? 'وفقاً لضوابط السلامة الإشعاعية ونقابة الأطباء في العراق، يتم تقييد قبول حجوزات الفحص ونشر التقارير الطبية حتى يتم تدقيق الترخيص المهني من قبل المشرف العام للمنصة.'
                : 'Pursuant to radiation safety standards, accepting bookings and publishing reports are restricted until license verification by Super Admin.'}
            </p>
          </div>
        </div>
      )}

      {/* Center Brand Banner */}
      <div className="bg-gradient-to-r from-[#002244] via-[#004060] to-[#0891b2] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {centerProfile?.logoUrl ? (
              <img 
                src={centerProfile.logoUrl} 
                alt="Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white/10 backdrop-blur-md border border-white/20 shadow-md shrink-0" 
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md shrink-0">
                <Scan size={36} className="text-cyan-300" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-bold mb-1.5">
                <CheckCircle2 size={13} />
                <span>{isOperable ? (language === 'ar' ? 'مركز أشعة وسونار معتمد وموثق' : 'Certified Radiology Center') : (language === 'ar' ? 'قيد التدقيق الإداري' : 'Pending Verification')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {centerProfile?.centerName || userProfile?.facilityName || 'مركز الأشعة والسونار'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-200 mt-1">
                <span>{language === 'ar' ? 'ترخيص النقابة / الوزارة:' : 'License:'} {centerProfile?.licenseNumber || userProfile?.licenseNumber || 'RAD-IQ'}</span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-cyan-300" />
                  <span>{centerProfile?.address || userProfile?.facilityName || 'العراق'}</span>
                </span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-cyan-300" />
                  <span>{centerProfile?.workingHours || '9:00 AM - 9:00 PM'}</span>
                </span>
                {centerProfile?.mapsUrl && (
                  <>
                    <span className="opacity-40">·</span>
                    <a 
                      href={centerProfile.mapsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-cyan-200 hover:text-white underline flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      <span>{language === 'ar' ? 'الموقع على الخريطة' : 'View on Maps'}</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                loadRadiologyData();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{language === 'ar' ? 'تحديث' : 'Sync'}</span>
            </button>
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-[#004060] hover:bg-slate-100 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'تسجيل فحص مراجع' : 'New Scan Intake'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Radiology Workspace Tabs Navigation */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-200/80 rounded-2xl overflow-x-auto text-xs font-bold">
        {[
          { id: 'dashboard', labelAr: 'لوحة المؤشرات', labelEn: 'Dashboard', icon: Activity },
          { id: 'bookings', labelAr: `الحجوزات والفحوصات (${bookings.length})`, labelEn: `Bookings (${bookings.length})`, icon: Calendar },
          { id: 'patients', labelAr: `سجل المراجعين (${patientsRoster.length})`, labelEn: `Patients (${patientsRoster.length})`, icon: Users },
          { id: 'services', labelAr: `قائمة الخدمات والأسعار (${services.length})`, labelEn: `Scan Services (${services.length})`, icon: DollarSign },
          { id: 'reports', labelAr: `التقارير وصور الأشعة (${reports.length})`, labelEn: `Reports & PACS (${reports.length})`, icon: FileText },
          { id: 'settings', labelAr: 'إعدادات المركز والأجهزة', labelEn: 'Center & Equipment', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#0891b2] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-[#0891b2]' : 'text-slate-400'} />
              <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              {tab.id === 'bookings' && pendingBookingsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] flex items-center justify-center font-mono">
                  {pendingBookingsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Metrics Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block mb-1 font-semibold">{language === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{bookings.length}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">{language === 'ar' ? 'سجلات حية بـ Firestore' : 'Live database'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs">
              <span className="text-xs text-amber-700 block mb-1 font-semibold">{language === 'ar' ? 'بانتظار التأكيد' : 'Pending Intake'}</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">{pendingBookingsCount}</div>
              <span className="text-[11px] text-amber-600 mt-1 block">{language === 'ar' ? 'تتطلب قرار المركز' : 'Requires triage'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-cyan-200 shadow-xs">
              <span className="text-xs text-cyan-700 block mb-1 font-semibold">{language === 'ar' ? 'فحوصات مؤكدة' : 'Confirmed Scans'}</span>
              <div className="text-2xl sm:text-3xl font-black text-cyan-800 font-mono">{acceptedBookingsCount}</div>
              <span className="text-[11px] text-cyan-600 mt-1 block">{language === 'ar' ? 'جاهزة للتصوير' : 'Scheduled'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs">
              <span className="text-xs text-emerald-700 block mb-1 font-semibold">{language === 'ar' ? 'تقارير منشورة' : 'Published Reports'}</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">{reports.length}</div>
              <span className="text-[11px] text-emerald-600 mt-1 block">{language === 'ar' ? 'معتمدة ومسلمة للمريض' : 'Archived & Verified'}</span>
            </div>
          </div>

          {/* Pending Requests Alert */}
          {pendingBookingsCount > 0 && (
            <div className="p-5 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={22} className="text-[#0891b2] shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">
                    {language === 'ar' ? `لديك (${pendingBookingsCount}) طلبات فحص شعاعي جديدة بحاجة للقبول وتأكيد الموعد` : `You have (${pendingBookingsCount}) pending imaging requests`}
                  </h4>
                  <p className="text-xs text-cyan-800 mt-0.5">
                    {language === 'ar' ? 'يمكنك قبول الفحص وإبلاغ المريض بتعليمات الصيام والتحضير مباشرة.' : 'Review scan intake and verify prep instructions.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setBookingFilter('pending');
                  setActiveTab('bookings');
                }}
                className="px-4 py-2 rounded-xl bg-[#0891b2] hover:bg-cyan-700 text-white font-bold text-xs transition-colors shrink-0"
              >
                {language === 'ar' ? 'مراجعة الطلبات الآن' : 'Review Requests'}
              </button>
            </div>
          )}

          {/* 2-Column Split: Scans Queue & Recent Diagnostic Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Bookings Queue */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-[#0891b2]" />
                  <h3 className="font-bold text-base text-slate-900">{language === 'ar' ? 'طابور الفحوصات القادمة' : 'Upcoming Scan Appointments'}</h3>
                </div>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs font-bold text-[#0891b2] hover:underline"
                >
                  {language === 'ar' ? 'عرض الكل' : 'View All'}
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Scan size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{language === 'ar' ? 'لا توجد طلبات فحص مسجلة حالياً' : 'No scan bookings yet'}</p>
                  <button
                    onClick={() => setShowNewBookingModal(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    {language === 'ar' ? 'تسجيل حجز مباشر' : 'Register Direct Booking'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 text-[#0891b2] flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                          {b.modality.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{b.patientName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{b.serviceName}</span>
                            <span>·</span>
                            <span className="font-mono">{b.date} ({b.timeSlot})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'accepted'
                            ? 'bg-cyan-100 text-cyan-800'
                            : b.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {b.status}
                        </span>

                        {b.status === 'accepted' && isOperable && (
                          <button
                            onClick={() => {
                              setSelectedBookingForReport(b);
                              setNewReportData({
                                ...newReportData,
                                patientName: b.patientName,
                                serviceName: b.serviceName,
                                modality: b.modality,
                              });
                              setShowNewReportModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-[#0891b2] hover:bg-cyan-700 text-white text-xs font-bold"
                            title="إصدار التقرير"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipment & Capabilities Summary */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-[#0891b2]" />
                    <h3 className="font-bold text-base text-slate-900">{language === 'ar' ? 'الأجهزة والتقنيات الإشعاعية' : 'Diagnostic Equipment'}</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    <Settings size={14} />
                  </button>
                </div>

                <div className="space-y-2">
                  {(centerProfile?.equipmentList || ['MRI 1.5 Tesla', 'CT Scan 128 Slices', '4D Ultrasound', 'Digital X-Ray']).map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{language === 'ar' ? 'ساعات الدوام اليومي:' : 'Working Hours:'}</span>
                  <span className="font-bold text-slate-800">{centerProfile?.workingHours || '9:00 AM - 9:00 PM'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS MANAGEMENT */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'جدول المواعيد وحجوزات الفحوصات' : 'Imaging Appointments & Queue'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'إدارة طلبات الفحص الشعاعي، قبول أو رفض المواعيد، وإعادة الجدولة والتواصل المباشر مع المراجعين.'
                  : 'Manage patient bookings, confirm slots, reschedule or mark procedures complete.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewBookingModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#0891b2] hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'تسجيل حجز فحص' : 'Book Scan'}</span>
              </button>
            </div>
          </div>

          {/* Filter Status Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { id: 'all', labelAr: 'الكل', labelEn: 'All' },
              { id: 'pending', labelAr: 'قيد الانتظار', labelEn: 'Pending' },
              { id: 'accepted', labelAr: 'مؤكدة', labelEn: 'Accepted' },
              { id: 'rescheduled', labelAr: 'معاد جدولتها', labelEn: 'Rescheduled' },
              { id: 'completed', labelAr: 'مكتملة', labelEn: 'Completed' },
              { id: 'cancelled', labelAr: 'ملغاة', labelEn: 'Cancelled' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setBookingFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  bookingFilter === f.id
                    ? 'bg-[#0891b2] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا توجد حجوزات في هذه الفئة' : 'No bookings in this filter'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'اختر فئة أخرى أو قم بتسجيل موعد فحص جديد للمراجع' : 'Try another filter or intake a patient'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-100 text-[#0891b2] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      {b.modality}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">{b.patientName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'accepted'
                            ? 'bg-cyan-100 text-cyan-800'
                            : b.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'rescheduled'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {b.status}
                        </span>
                        {b.reportReady && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            <span>{language === 'ar' ? 'التقرير معتمد' : 'Report Published'}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span className="font-bold text-slate-700">{b.serviceName}</span>
                        <span>·</span>
                        <span className="font-mono">{b.date} ({b.timeSlot})</span>
                        <span>·</span>
                        <span className="font-mono">{b.patientPhone}</span>
                        {b.notes && (
                          <>
                            <span>·</span>
                            <span className="italic text-slate-600">"{b.notes}"</span>
                          </>
                        )}
                      </div>

                      {b.rescheduleDate && (
                        <div className="mt-2 text-xs text-purple-800 bg-purple-50 p-2 rounded-lg">
                          <strong>{language === 'ar' ? 'الموعد المقترح بدلاً:' : 'Proposed Reschedule:'}</strong> {b.rescheduleDate} ({b.rescheduleReason})
                        </div>
                      )}

                      {b.cancellationReason && (
                        <div className="mt-2 text-xs text-red-800 bg-red-50 p-2 rounded-lg">
                          <strong>{language === 'ar' ? 'سبب الإلغاء:' : 'Cancellation Reason:'}</strong> {b.cancellationReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {b.status === 'pending' && isOperable && (
                      <>
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'accepted', b.patientId)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Check size={14} />
                          <span>{language === 'ar' ? 'قبول وتأكيد' : 'Accept'}</span>
                        </button>
                        <button
                          onClick={() => setReschedulingBooking(b)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs"
                        >
                          {language === 'ar' ? 'إعادة جدولة' : 'Reschedule'}
                        </button>
                        <button
                          onClick={() => setCancellingBooking(b)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </>
                    )}

                    {b.status === 'accepted' && isOperable && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedBookingForReport(b);
                            setNewReportData({
                              ...newReportData,
                              patientName: b.patientName,
                              serviceName: b.serviceName,
                              modality: b.modality,
                            });
                            setShowNewReportModal(true);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-[#0891b2] hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <FileText size={14} />
                          <span>{language === 'ar' ? 'إصدار التقرير الطبي' : 'Publish Report'}</span>
                        </button>

                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'completed', b.patientId)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} />
                          <span>{language === 'ar' ? 'اكتمال الفحص' : 'Complete'}</span>
                        </button>

                        <button
                          onClick={() => setCancellingBooking(b)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 font-bold text-xs"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </>
                    )}

                    {b.patientPhone && (
                      <a
                        href={`https://wa.me/964${b.patientPhone.replace(/^0+/, '')}?text=${encodeURIComponent(
                          language === 'ar'
                            ? `تحية طيبة من ${centerProfile?.centerName || 'مركز الأشعة'}. نود إعلامكم بخصوص موعد فحص (${b.serviceName}) ليوم ${b.date}.`
                            : `Hello from ${centerProfile?.centerName}. Regarding your scan appointment for ${b.serviceName} on ${b.date}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="مراسلة واتساب"
                      >
                        <MessageSquare size={16} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PATIENTS ROSTER & HISTORY */}
      {activeTab === 'patients' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'سجل المراجعين والمرضى' : 'Patient Diagnostic Directory'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'قائمة المراجعين الذين أجروا فحوصات بالمركز، وسجل تقاريرهم وحجوزاتهم السابقة.'
                  : 'Patients roster, visit frequencies, scan histories and certified reports.'}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute top-3 start-3 text-slate-400" />
              <input
                type="text"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'بحث باسم المريض أو الهاتف...' : 'Search by name or phone...'}
                className="w-full ps-9 pe-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>

          {patientsRoster.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا يوجد مراجعون مسجلون' : 'No patients found'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'قم بتسجيل مراجع جديد لإدراجه في السجل الصحي' : 'Register a patient intake to populate this directory'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patientsRoster.map((pat, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                          {pat.name.charAt(0)}
                        </div>
                        <h4 className="font-bold text-base text-slate-900">{pat.name}</h4>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                        {pat.bookingsCount} {language === 'ar' ? 'فحوصات' : 'Scans'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />
                        <span className="font-mono">{pat.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{language === 'ar' ? 'آخر زيارة:' : 'Last Visit:'} {pat.lastVisitDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Layers size={13} className="text-slate-400" />
                        <span className="text-slate-500">{language === 'ar' ? 'التقنيات المستخدمة:' : 'Modalities:'}</span>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(pat.modalities).map((m, mIdx) => (
                            <span key={mIdx} className="px-1.5 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-bold uppercase">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    {pat.latestReport ? (
                      <button
                        onClick={() => setViewingReportModal(pat.latestReport!)}
                        className="text-xs font-bold text-[#0891b2] hover:underline flex items-center gap-1"
                      >
                        <FileText size={14} />
                        <span>{language === 'ar' ? 'عرض التقرير الطبي' : 'View Report'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {language === 'ar' ? 'لا يوجد تقرير صادر بعد' : 'No report yet'}
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setNewBookingData({
                            patientName: pat.name,
                            patientPhone: pat.phone,
                            serviceName: 'سونار البطن والحوض',
                            modality: 'ultrasound',
                            date: new Date().toISOString().split('T')[0],
                            timeSlot: '12:00 PM',
                            notes: '',
                          });
                          setShowNewBookingModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        {language === 'ar' ? 'حجز فحص' : 'Book'}
                      </button>

                      {pat.phone && (
                        <a
                          href={`https://wa.me/964${pat.phone.replace(/^0+/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          title="WhatsApp"
                        >
                          <MessageSquare size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SERVICES & PRICE LIST */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'دليل الفحوصات الإشعاعية، الأسعار والتحضيرات' : 'Imaging Services, Modalities & Pricing'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'إدارة قائمة الفحوصات المتاحة، تسعير الفحوصات بالدينار، وتحديد شروط صيام وتحضير المريض.'
                  : 'Manage pricing, fasting prep notes, and turnaround time per modality.'}
              </p>
            </div>

            <button
              onClick={() => setShowNewServiceModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0891b2] hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة فحص جديد' : 'Add Procedure'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((serv) => (
              <div
                key={serv.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 uppercase">
                      {serv.modality}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      serv.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {serv.isAvailable ? (language === 'ar' ? 'متاح ومفعل' : 'Available') : (language === 'ar' ? 'متوقف مؤقتاً' : 'Disabled')}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-slate-900 mb-1">{serv.name}</h4>
                  
                  <div className="text-sm font-black text-[#0891b2] mb-3 font-mono">
                    {serv.price.toLocaleString()} {language === 'ar' ? 'د.ع' : 'IQD'}
                  </div>

                  {serv.preparationInstructions && (
                    <div className="p-3 rounded-xl bg-white border border-slate-100 text-xs text-slate-600 mb-3">
                      <strong className="block text-slate-800 mb-0.5">{language === 'ar' ? 'تعليمات التحضير:' : 'Prep Notes:'}</strong>
                      <p>{serv.preparationInstructions}</p>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{language === 'ar' ? 'الوقت المتوقع لإصدار التقرير:' : 'Turnaround:'}</span>
                    <span className="font-bold text-slate-700">{serv.estimatedReportHours} {language === 'ar' ? 'ساعات' : 'Hours'}</span>
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-200/80 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleService(serv.id, serv.isAvailable)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    {serv.isAvailable ? (language === 'ar' ? 'إيقاف الفحص' : 'Deactivate') : (language === 'ar' ? 'تفعيل الفحص' : 'Activate')}
                  </button>

                  <button
                    onClick={() => handleDeleteService(serv.id)}
                    className="text-xs text-red-600 hover:text-red-700 p-1"
                    title="حذف الفحص"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS & PACS / MEDICAL IMAGING ARCHIVE */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'أرشيف التقارير وصور الفحوصات الإشعاعية' : 'Radiology Diagnostic Reports Archive'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'إصدار التقارير التشخيصية المعتمدة بتوقيع طبيب الأشعة، وإتاحة تحميل صور وفحوصات السونار والرنين للمريض بصيغة PDF.'
                  : 'Certified radiologist reports, impressions, scan images, and secure patient report downloads.'}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedBookingForReport(null);
                setShowNewReportModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0891b2] hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'صياغة تقرير جديد' : 'New Report'}</span>
            </button>
          </div>

          {/* Modality Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setReportFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                reportFilter === 'all' ? 'bg-[#0891b2] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {language === 'ar' ? 'كافة التقارير' : 'All Reports'}
            </button>
            {modalitiesList.map((m) => (
              <button
                key={m.id}
                onClick={() => setReportFilter(m.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  reportFilter === m.id ? 'bg-[#0891b2] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {language === 'ar' ? m.labelAr : m.labelEn}
              </button>
            ))}
          </div>

          {/* Reports Grid */}
          {filteredReports.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا توجد تقارير منشورة حالياً' : 'No diagnostic reports published yet'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'قم بإصدار تقارير الفحوصات المكتملة لتوثيقها بالسجل الطبي للمريض' : 'Publish findings for completed scans'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 uppercase">
                        {rep.modality}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{rep.createdAt.split('T')[0]}</span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 mb-1">{rep.serviceName}</h4>
                    <div className="text-xs font-semibold text-slate-700 mb-3">
                      {language === 'ar' ? 'المريض:' : 'Patient:'} {rep.patientName}
                    </div>

                    <div className="space-y-2 mb-3 text-xs bg-white p-3 rounded-xl border border-slate-100">
                      <div>
                        <strong className="text-slate-800 block mb-0.5">{language === 'ar' ? 'النتائج والمشاهدات (Findings):' : 'Findings:'}</strong>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line line-clamp-3">{rep.findings}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <strong className="text-[#0891b2] block mb-0.5">{language === 'ar' ? 'التشخيص النهائي (Impression):' : 'Impression:'}</strong>
                        <p className="text-slate-800 font-semibold leading-relaxed line-clamp-2">{rep.impression}</p>
                      </div>
                    </div>

                    {rep.scanImages && rep.scanImages.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1">
                          {language === 'ar' ? `صور الفحص المرفقة (${rep.scanImages.length})` : `Attached Scans (${rep.scanImages.length})`}
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {rep.scanImages.slice(0, 3).map((img, i) => (
                            <img key={i} src={img} alt="scan" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{language === 'ar' ? 'طبيب الأشعة:' : 'Radiologist:'} {rep.radiologistName}</span>
                      <span className="font-mono">{rep.radiologistLicense}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>{language === 'ar' ? 'معتمد ومتاح للمريض' : 'Verified & Distributed'}</span>
                    </span>

                    <button
                      onClick={() => setViewingReportModal(rep)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>{language === 'ar' ? 'معاينة وطباعة التقرير' : 'View & Print PDF'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CENTER PROFILE & SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveCenterSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'بيانات المركز، الترخيص وساعات العمل' : 'Center Profile, Accreditation & Hours'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar'
                ? 'تحديث تفاصيل المنشأة، أرقام التواصل، شعار المركز، وقائمة الأجهزة الإشعاعية المعتمدة بالمركز.'
                : 'Configure facility details, communication lines, logo, and installed scanners.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الاسم الرسمي للمركز *' : 'Center Official Name *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.centerName}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, centerName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رابط شعار المركز (Logo URL)' : 'Center Logo URL'}
              </label>
              <input
                type="url"
                value={editProfileForm.logoUrl}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, logoUrl: e.target.value })}
                placeholder="https://.../logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الإجازة الصحية / الترخيص *' : 'Ministry Health License *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.licenseNumber}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, licenseNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
              </label>
              <select
                value={editProfileForm.governorate}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, governorate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-[#0891b2]"
              >
                {governoratesList.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'عنوان المركز بالتفصيل *' : 'Full Street Address *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.address}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                placeholder="بغداد، الكرادة، ساحة الواثق، مجمع النخيل الطبي"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الهاتف المباشر *' : 'Phone Number *'}
              </label>
              <input
                type="tel"
                required
                value={editProfileForm.phone}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الواتساب لاستقبال الحجوزات' : 'WhatsApp Line'}
              </label>
              <input
                type="tel"
                value={editProfileForm.whatsapp}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, whatsapp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'ساعات العمل اليومية *' : 'Daily Working Hours *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.workingHours}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, workingHours: e.target.value })}
                placeholder="9:00 AM - 9:00 PM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'قائمة الأجهزة والماسحات المتوفرة (مفصولة بفواصل) *' : 'Diagnostic Equipment List (Comma-separated) *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.equipmentInput}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, equipmentInput: e.target.value })}
                placeholder="MRI 1.5 Tesla, CT Scan 128 Slices, 4D Doppler Ultrasound, Panoramic X-Ray"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رابط الموقع على خرائط Google' : 'Google Maps Location Link'}
              </label>
              <input
                type="url"
                value={editProfileForm.mapsUrl}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, mapsUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'نبذة تعريفية بالمركز والتقنيات' : 'Center Bio & Capabilities'}
              </label>
              <textarea
                rows={3}
                value={editProfileForm.bio}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
                placeholder={language === 'ar' ? 'مركز تخصصي يقدم الفحوصات الشعاعية بأحدث البروتوكولات العالمية...' : 'Leading imaging provider...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {language === 'ar' ? 'الاعتماد المركزي محمي وموثق في Firestore' : 'Accredited through central governance'}
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0891b2] hover:bg-cyan-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Save size={16} />
              <span>{language === 'ar' ? 'حفظ بيانات المركز' : 'Save Center Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* MODAL: DIRECT SCAN BOOKING INTAKE */}
      {showNewBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-900">
                {language === 'ar' ? 'تسجيل حجز فحص إشعاعي للمراجع' : 'Register Scan Intake'}
              </h3>
              <button
                onClick={() => setShowNewBookingModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم المراجع / المريض *' : 'Patient Name *'}</label>
                <input
                  type="text"
                  required
                  value={newBookingData.patientName}
                  onChange={(e) => setNewBookingData({ ...newBookingData, patientName: e.target.value })}
                  placeholder={language === 'ar' ? 'الاسم الثلاثي للمراجع' : 'Patient Full Name'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'رقم الهاتف (واتساب) *' : 'Phone Number *'}</label>
                <input
                  type="tel"
                  required
                  value={newBookingData.patientPhone}
                  onChange={(e) => setNewBookingData({ ...newBookingData, patientPhone: e.target.value })}
                  placeholder="07XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0891b2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع التقنية (Modality) *' : 'Modality *'}</label>
                  <select
                    value={newBookingData.modality}
                    onChange={(e) => setNewBookingData({ ...newBookingData, modality: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {modalitiesList.map((m) => (
                      <option key={m.id} value={m.id}>{language === 'ar' ? m.labelAr : m.labelEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم الفحص / العضو *' : 'Procedure *'}</label>
                  <input
                    type="text"
                    required
                    value={newBookingData.serviceName}
                    onChange={(e) => setNewBookingData({ ...newBookingData, serviceName: e.target.value })}
                    placeholder={language === 'ar' ? 'سونار البطن / رنين الركبة' : 'Scan title'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'التاريخ *' : 'Date *'}</label>
                  <input
                    type="date"
                    required
                    value={newBookingData.date}
                    onChange={(e) => setNewBookingData({ ...newBookingData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الوقت *' : 'Time Slot *'}</label>
                  <input
                    type="text"
                    required
                    value={newBookingData.timeSlot}
                    onChange={(e) => setNewBookingData({ ...newBookingData, timeSlot: e.target.value })}
                    placeholder="11:30 AM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'ملاحظات إحالة الطبيب المعالج' : 'Referral Notes'}</label>
                <textarea
                  rows={2}
                  value={newBookingData.notes}
                  onChange={(e) => setNewBookingData({ ...newBookingData, notes: e.target.value })}
                  placeholder={language === 'ar' ? 'اشتباه حصى مرارة، ألم بطني حاد...' : 'Clinical indications...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBookingModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0891b2] text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESCHEDULE SCAN */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              {language === 'ar' ? `إعادة جدولة فحص: ${reschedulingBooking.patientName}` : `Reschedule: ${reschedulingBooking.patientName}`}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' ? `الموعد الحالي: ${reschedulingBooking.date} الساعة ${reschedulingBooking.timeSlot}` : `Current: ${reschedulingBooking.date} at ${reschedulingBooking.timeSlot}`}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الموعد البديل المقترح *' : 'Proposed New Date/Time *'}</label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: الخميس 2026/10/29 الساعة 2:00 ظهراً' : 'e.g. Thursday Oct 29 at 2:00 PM'}
                  value={rescheduleData.newDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'السبب' : 'Reason'}</label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'صيانة جهاز الرنين / عدم اكتمال الصيام' : 'Equipment calibration / Fasting preparation'}
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReschedulingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold"
                >
                  {language === 'ar' ? 'إرسال التعديل' : 'Save Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL SCAN */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              {language === 'ar' ? `إلغاء حجز فحص: ${cancellingBooking.patientName}` : `Cancel Booking: ${cancellingBooking.patientName}`}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' ? 'سيتم إشعار المراجع بسبب الإلغاء وتعديل حالة السجل.' : 'Patient will be alerted and booking status set to cancelled.'}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'سبب الإلغاء' : 'Cancellation Reason'}</label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'عدم توفر المادة الملونة، اعتذار المركز...' : 'Contrast material unavailable...'}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'تراجع' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD IMAGING SERVICE */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              {language === 'ar' ? 'إضافة فحص إشعاعي جديد للقائمة' : 'Add Imaging Service'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' ? 'حدد اسم الفحص والتقنية والأجور وشروط التحضير.' : 'Define procedure details and preparation.'}
            </p>

            <form onSubmit={handleCreateService} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم الفحص *' : 'Service Title *'}</label>
                <input
                  type="text"
                  required
                  value={newServiceData.name}
                  onChange={(e) => setNewServiceData({ ...newServiceData, name: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: رنين الفقرات العنقية' : 'e.g. Cervical Spine MRI'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'التقنية الإشعاعية *' : 'Modality *'}</label>
                  <select
                    value={newServiceData.modality}
                    onChange={(e) => setNewServiceData({ ...newServiceData, modality: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {modalitiesList.map((m) => (
                      <option key={m.id} value={m.id}>{language === 'ar' ? m.labelAr : m.labelEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'السعر (دينار عراقي) *' : 'Price (IQD) *'}</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={5000}
                    value={newServiceData.price}
                    onChange={(e) => setNewServiceData({ ...newServiceData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تعليمات الصيام / التحضير' : 'Fasting / Prep Instructions'}</label>
                <textarea
                  rows={2}
                  value={newServiceData.preparationInstructions}
                  onChange={(e) => setNewServiceData({ ...newServiceData, preparationInstructions: e.target.value })}
                  placeholder={language === 'ar' ? 'صيام 6 ساعات، إزالة المعادن...' : 'Fasting 6 hours...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الوقت المتوقع لصدور التقرير (بالساعات)' : 'Report Turnaround (Hours)'}</label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={newServiceData.estimatedReportHours}
                  onChange={(e) => setNewServiceData({ ...newServiceData, estimatedReportHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewServiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0891b2] text-white font-bold"
                >
                  {language === 'ar' ? 'إضافة الفحص' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH RADIOLOGY REPORT WITH ATTACHED IMAGERY */}
      {showNewReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {language === 'ar' ? 'إصدار واعتماد التقرير الشعاعي' : 'Publish Diagnostic Scan Report'}
                </h3>
                <span className="text-xs text-slate-500">
                  {language === 'ar' ? 'ربط مباشر بملف المريض برقم UID مشفر' : 'Direct linkage to patient UID'}
                </span>
              </div>
              <button
                onClick={() => setShowNewReportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishReport} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم المريض *' : 'Patient Name *'}</label>
                  <input
                    type="text"
                    required
                    value={newReportData.patientName}
                    onChange={(e) => setNewReportData({ ...newReportData, patientName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع التقنية *' : 'Modality *'}</label>
                  <select
                    value={newReportData.modality}
                    onChange={(e) => setNewReportData({ ...newReportData, modality: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {modalitiesList.map((m) => (
                      <option key={m.id} value={m.id}>{language === 'ar' ? m.labelAr : m.labelEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'عنوان الفحص *' : 'Scan Title *'}</label>
                <input
                  type="text"
                  required
                  value={newReportData.serviceName}
                  onChange={(e) => setNewReportData({ ...newReportData, serviceName: e.target.value })}
                  placeholder="سونار البطن والحوض الشامل"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'دواعي الإحالة السريرية (Clinical Indication)' : 'Clinical Indication'}</label>
                <input
                  type="text"
                  value={newReportData.clinicalIndication}
                  onChange={(e) => setNewReportData({ ...newReportData, clinicalIndication: e.target.value })}
                  placeholder="ألم في الخاصرة اليمنى مع بول دموي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'بروتوكول التصوير (Technique)' : 'Technique'}</label>
                <input
                  type="text"
                  value={newReportData.technique}
                  onChange={(e) => setNewReportData({ ...newReportData, technique: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'المشاهدات والنتائج التشريحية (Findings) *' : 'Findings *'}</label>
                <textarea
                  rows={4}
                  required
                  value={newReportData.findings}
                  onChange={(e) => setNewReportData({ ...newReportData, findings: e.target.value })}
                  placeholder={language === 'ar' ? 'الكبد: حجم طبيعي ومتجانس الإشارة بدون كتل، المرارة: جدار رقيق بدون حصى...' : 'Liver, gallbladder, kidneys findings...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'التشخيص وخلاصة التقرير (Impression) *' : 'Impression *'}</label>
                <textarea
                  rows={2}
                  required
                  value={newReportData.impression}
                  onChange={(e) => setNewReportData({ ...newReportData, impression: e.target.value })}
                  placeholder={language === 'ar' ? 'فحص سليم بدون مؤشرات التهابية أو انسدادية حادة.' : 'Normal study.'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'التوصيات والمتابعة (Recommendations)' : 'Recommendations'}</label>
                <input
                  type="text"
                  value={newReportData.recommendations}
                  onChange={(e) => setNewReportData({ ...newReportData, recommendations: e.target.value })}
                  placeholder={language === 'ar' ? 'إعادة الفحص بعد 6 أشهر للمتابعة...' : 'Follow up scan in 6 months...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {/* Upload Scan Images Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-[#0891b2]" />
                    <span>{language === 'ar' ? 'إرفاق صور السونار والأشعة (PACS / Scan Images)' : 'Attach Scan Images'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>{language === 'ar' ? 'رفع صورة' : 'Upload Image'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {newReportData.scanImages.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar' ? 'يمكنك إرفاق صور التلفزيون والأشعة المقطعية لتوثيقها وحفظها في التقرير الطبي للمريض.' : 'Attach scan frames for medical documentation.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                    {newReportData.scanImages.map((img, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square">
                        <img src={img} alt="scan" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveReportImage(i)}
                          className="absolute top-1 end-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-80 group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم طبيب الأشعة الموقع *' : 'Signing Radiologist *'}</label>
                  <input
                    type="text"
                    required
                    value={newReportData.radiologistName}
                    onChange={(e) => setNewReportData({ ...newReportData, radiologistName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'رقم الإجازة المهنية' : 'License ID'}</label>
                  <input
                    type="text"
                    value={newReportData.radiologistLicense}
                    onChange={(e) => setNewReportData({ ...newReportData, radiologistLicense: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'رابط ملف الـ PDF الخارجي (اختياري)' : 'External PDF URL (Optional)'}</label>
                <input
                  type="url"
                  value={newReportData.fileUrl}
                  onChange={(e) => setNewReportData({ ...newReportData, fileUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">
                  {language === 'ar' ? 'سيتم إشعار المريض فورياً وتفعيل تحميل التقرير' : 'Patient will be alerted upon publish'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewReportModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0891b2] text-white font-bold"
                  >
                    {language === 'ar' ? 'اعتماد ونشر التقرير' : 'Publish Report'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL REPORT PDF VIEWER & PRINT MODAL */}
      {viewingReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-10 border border-slate-200 shadow-2xl my-8 relative">
            {/* Action Bar (Top) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                  <ShieldCheck size={14} />
                  <span>{language === 'ar' ? 'تقرير طبي موثق في Firestore' : 'Certified Record'}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {viewingReportModal.id}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer size={15} />
                  <span>{language === 'ar' ? 'طباعة التقرير / حفظ PDF' : 'Print / Save PDF'}</span>
                </button>
                <button
                  onClick={() => setViewingReportModal(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE OFFICIAL MEDICAL DOCUMENT */}
            <div className="medical-print-document space-y-6 text-slate-900">
              {/* Official Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {centerProfile?.centerName || viewingReportModal.centerName}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5 font-semibold">
                    {language === 'ar' ? 'مركز تخصصي للأشعة والسونار والرنين المغناطيسي' : 'Specialized Center for Diagnostic Imaging & Ultrasound'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {centerProfile?.address} · {centerProfile?.phone} · ترخيص وزارة الصحة: {centerProfile?.licenseNumber || 'RAD-IQ'}
                  </p>
                </div>

                <div className="text-end">
                  <div className="text-sm font-black text-[#003366]">M737 MEDICAL PLATFORM</div>
                  <div className="text-[10px] text-slate-400">منظومة الرعاية الصحية الرقمية</div>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-bold">
                    {viewingReportModal.modality.toUpperCase()} REPORT
                  </div>
                </div>
              </div>

              {/* Patient Information Demographics Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'اسم المريض:' : 'Patient Name:'}</span>
                  <span className="font-bold text-slate-900">{viewingReportModal.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'تاريخ الفحص:' : 'Exam Date:'}</span>
                  <span className="font-mono font-bold text-slate-900">{viewingReportModal.createdAt.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'نوع الفحص:' : 'Procedure:'}</span>
                  <span className="font-bold text-slate-900">{viewingReportModal.serviceName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'التقنية:' : 'Modality:'}</span>
                  <span className="font-mono font-bold text-[#0891b2] uppercase">{viewingReportModal.modality}</span>
                </div>
              </div>

              {/* Clinical Indication & Technique */}
              {(viewingReportModal.clinicalIndication || viewingReportModal.technique) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  {viewingReportModal.clinicalIndication && (
                    <div>
                      <strong className="text-slate-700 block mb-0.5">{language === 'ar' ? 'دواعي الفحص السريرية:' : 'Clinical Indication:'}</strong>
                      <span className="text-slate-600">{viewingReportModal.clinicalIndication}</span>
                    </div>
                  )}
                  {viewingReportModal.technique && (
                    <div>
                      <strong className="text-slate-700 block mb-0.5">{language === 'ar' ? 'بروتوكول التصوير:' : 'Technique:'}</strong>
                      <span className="text-slate-600">{viewingReportModal.technique}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Findings */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  {language === 'ar' ? 'النتائج والمشاهدات التشريحية (Findings)' : 'Detailed Findings'}
                </h3>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-slate-100 font-sans">
                  {viewingReportModal.findings}
                </div>
              </div>

              {/* Diagnostic Impression */}
              <div className="bg-cyan-50/60 border border-cyan-200 rounded-2xl p-4">
                <h3 className="text-sm font-black text-[#0891b2] uppercase tracking-wider mb-1">
                  {language === 'ar' ? 'التشخيص وخلاصة التقرير (Impression)' : 'Diagnostic Impression'}
                </h3>
                <p className="text-xs font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                  {viewingReportModal.impression}
                </p>
              </div>

              {/* Recommendations */}
              {viewingReportModal.recommendations && (
                <div className="text-xs text-slate-600">
                  <strong className="text-slate-800">{language === 'ar' ? 'التوصيات والمتابعة: ' : 'Recommendations: '}</strong>
                  <span>{viewingReportModal.recommendations}</span>
                </div>
              )}

              {/* Attached Scan Images in Print / View */}
              {viewingReportModal.scanImages && viewingReportModal.scanImages.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">{language === 'ar' ? 'صور الفحص الإشعاعي المرفقة:' : 'Attached Scan Imagery:'}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {viewingReportModal.scanImages.map((img, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video flex items-center justify-center">
                        <img src={img} alt="scan" className="max-h-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Radiologist Signature & Stamp */}
              <div className="pt-6 border-t-2 border-slate-900 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{viewingReportModal.radiologistName}</div>
                  <div className="text-[11px] text-slate-500">{language === 'ar' ? 'طبيب اختصاصي الأشعة والتصوير الطبي' : 'Specialist Radiologist'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">License: {viewingReportModal.radiologistLicense}</div>
                </div>

                <div className="text-center p-2 rounded-xl border border-slate-300 bg-slate-50 text-[10px] font-mono">
                  <div className="font-bold text-emerald-800 flex items-center gap-1 justify-center">
                    <CheckCircle2 size={12} />
                    <span>M737 VERIFIED</span>
                  </div>
                  <div className="text-slate-400">UID: {viewingReportModal.patientId.slice(0, 8)}...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
