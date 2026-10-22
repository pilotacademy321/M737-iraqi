import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  LabProfile, 
  LabTest, 
  LabBooking, 
  LabResult, 
  LabResultParameter, 
  LabBookingStatus, 
  LabSampleStatus 
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
  FlaskConical, 
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
  Home,
  CheckCircle,
  Truck,
  Pipette,
  TestTube
} from 'lucide-react';

interface LaboratoryPortalWorkspaceProps {
  onBackToHome: () => void;
}

export const LaboratoryPortalWorkspace: React.FC<LaboratoryPortalWorkspaceProps> = ({ onBackToHome }) => {
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const { language, isRTL } = useLanguage();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'samples' | 'tests' | 'results' | 'patients' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lab Profile State
  const [labProfile, setLabProfile] = useState<LabProfile | null>(null);

  // Bookings State
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'cancelled' | 'rescheduled'>('all');
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);

  // New Booking Form
  const [newBookingData, setNewBookingData] = useState({
    patientName: '',
    patientPhone: '',
    testName: 'فحص صورة الدم الكاملة (CBC)',
    category: 'Hematology',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '09:30 AM',
    bookingType: 'in_lab' as 'in_lab' | 'home_collection',
    homeAddress: '',
    notes: '',
  });

  // Reschedule Modal State
  const [reschedulingBooking, setReschedulingBooking] = useState<LabBooking | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', reason: '' });

  // Cancel Modal State
  const [cancellingBooking, setCancellingBooking] = useState<LabBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Sample Status Modal / Target
  const [trackingSampleBooking, setTrackingSampleBooking] = useState<LabBooking | null>(null);

  // Tests Catalog State
  const [tests, setTests] = useState<LabTest[]>([]);
  const [showNewTestModal, setShowNewTestModal] = useState(false);
  const [newTestData, setNewTestData] = useState({
    name: '',
    category: 'Hematology',
    price: 15000,
    estimatedHours: 2,
    sampleType: 'EDTA Whole Blood (دم كامل)',
    fastingInstructions: 'لا يتطلب صيام مسبق.',
    normalRange: 'Hb: 13-17 g/dL (M), 12-15 g/dL (F)',
    isAvailable: true,
    homeCollectionSupported: true,
  });

  // Lab Results State
  const [results, setResults] = useState<LabResult[]>([]);
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [showNewResultModal, setShowNewResultModal] = useState(false);
  const [selectedBookingForResult, setSelectedBookingForResult] = useState<LabBooking | null>(null);
  const [viewingResultModal, setViewingResultModal] = useState<LabResult | null>(null);

  // Result creation form
  const [newResultData, setNewResultData] = useState({
    patientName: '',
    testName: 'صورة الدم الكاملة (CBC)',
    category: 'Hematology',
    sampleType: 'EDTA Whole Blood',
    parameters: [
      { name: 'Hemoglobin (Hb)', value: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', status: 'normal' as const },
      { name: 'WBC Count', value: '7,400', unit: '/mcL', referenceRange: '4,000 - 11,000', status: 'normal' as const },
      { name: 'Platelets', value: '265,000', unit: '/mcL', referenceRange: '150,000 - 450,000', status: 'normal' as const },
      { name: 'RBC Count', value: '4.8', unit: 'x10^6/mcL', referenceRange: '4.3 - 5.7', status: 'normal' as const },
      { name: 'Hematocrit (PCV)', value: '42.5', unit: '%', referenceRange: '39 - 50', status: 'normal' as const },
    ],
    notes: 'عينات مطابقة للمواصفات المعملية، لا توجد خثرات أو تحلل دموي.',
    pathologistName: 'د. اختصاصي التحليلات المرضية',
    pathologistLicense: 'LAB-IQ-9421',
    fileUrl: '',
    attachedScans: [] as string[],
    reviewStatus: 'released' as 'draft' | 'reviewed' | 'released',
    status: 'published' as 'draft' | 'published',
  });

  // Patient Search & Directory
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Lab Settings Form State
  const [editProfileForm, setEditProfileForm] = useState({
    labName: '',
    logoUrl: '',
    directorName: '',
    licenseNumber: '',
    address: '',
    governorate: 'بغداد (Baghdad)',
    phone: '',
    whatsapp: '',
    workingHours: '8:00 AM - 10:00 PM',
    equipmentInput: 'Sysmex XN-550 Hematology, Roche Cobas c311 Chemistry Analyzer, Abbott Architect i1000SR, Bio-Rad CFX96 Real-Time PCR',
    homeCollectionAvailable: true,
    homeCollectionFee: 10000,
    mapsUrl: '',
    bio: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOperable = userProfile?.status === 'approved' || isAdmin;

  const categoriesList = [
    { id: 'Hematology', labelAr: 'أمراض الدم ومكوناته (Hematology)', labelEn: 'Hematology' },
    { id: 'Biochemistry', labelAr: 'الكيمياء السريرية والوظائف (Biochemistry)', labelEn: 'Biochemistry' },
    { id: 'Immunology', labelAr: 'المناعة والهرمونات (Immunology & Hormones)', labelEn: 'Immunology & Hormones' },
    { id: 'Microbiology', labelAr: 'الأحياء المجهرية والزرع (Microbiology)', labelEn: 'Microbiology' },
    { id: 'Molecular', labelAr: 'البيولوجيا الجزيئية وPCR (Molecular/PCR)', labelEn: 'Molecular Biology & PCR' },
    { id: 'Urinalysis', labelAr: 'فحص البول وسوائل الجسم (Urinalysis & Fluids)', labelEn: 'Urinalysis & Fluids' },
  ];

  const sampleStatusMap: Record<LabSampleStatus, { labelAr: string; labelEn: string; color: string }> = {
    pending_collection: { labelAr: 'بانتظار سحب العينة', labelEn: 'Pending Collection', color: 'bg-amber-100 text-amber-800' },
    collected: { labelAr: 'تم سحب العينة', labelEn: 'Sample Collected', color: 'bg-blue-100 text-blue-800' },
    received: { labelAr: 'استلمت في المختبر', labelEn: 'Received in Lab', color: 'bg-cyan-100 text-cyan-800' },
    processing: { labelAr: 'قيد التحليل المخبري', labelEn: 'Processing', color: 'bg-purple-100 text-purple-800' },
    completed: { labelAr: 'اكتمل التحليل', labelEn: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
    cancelled: { labelAr: 'عينة ملغاة / مرفوضة', labelEn: 'Cancelled / Rejected', color: 'bg-red-100 text-red-800' },
  };

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

  // Load All Lab Data from Firestore
  const loadLabData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Lab Profile
      const profRef = doc(db, 'lab_profiles', user.uid);
      const profSnap = await getDoc(profRef);

      if (profSnap.exists()) {
        const data = profSnap.data() as LabProfile;
        setLabProfile(data);
        setEditProfileForm({
          labName: data.labName || userProfile?.facilityName || 'المختبر التخصصي للتحليلات المرضية',
          logoUrl: data.logoUrl || '',
          directorName: data.directorName || userProfile?.displayName || 'د. مدير المختبر',
          licenseNumber: data.licenseNumber || userProfile?.licenseNumber || '',
          address: data.address || userProfile?.facilityName || '',
          governorate: data.governorate || userProfile?.governorate || 'بغداد (Baghdad)',
          phone: data.phone || userProfile?.phone || '',
          whatsapp: data.whatsapp || userProfile?.phone || '',
          workingHours: data.workingHours || '8:00 AM - 10:00 PM',
          equipmentInput: (data.equipmentList || []).join(', ') || 'Sysmex Hematology, Roche Cobas, Abbott Architect, PCR',
          homeCollectionAvailable: data.homeCollectionAvailable ?? true,
          homeCollectionFee: data.homeCollectionFee ?? 10000,
          mapsUrl: data.mapsUrl || '',
          bio: data.bio || '',
        });
      } else {
        // Initialize default lab profile
        const initialProfile: LabProfile = {
          labId: user.uid,
          labName: userProfile?.facilityName || userProfile?.displayName || 'المختبر التخصصي للتحليلات المرضية',
          logoUrl: '',
          directorName: userProfile?.displayName || 'د. مدير المختبر التخصصي',
          licenseNumber: userProfile?.licenseNumber || 'LAB-IQ-2026',
          phone: userProfile?.phone || '07885663748',
          whatsapp: userProfile?.phone || '07885663748',
          address: userProfile?.facilityName || 'بغداد، ساحة الواثق، مجمع الأطباء الاستشاري',
          governorate: userProfile?.governorate || 'بغداد (Baghdad)',
          mapsUrl: '',
          workingHours: '8:00 AM - 10:00 PM',
          equipmentList: ['Sysmex XN-550 Hematology Analyzer', 'Roche Cobas c311 Clinical Chemistry', 'Abbott Architect i1000SR Immunoassay', 'Bio-Rad Real-Time PCR'],
          homeCollectionAvailable: true,
          homeCollectionFee: 10000,
          bio: 'مختبر طبي متطور مجهز بأحدث الأجهزة التلقائية ومعايير الجودة النوعية العالمية.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(profRef, initialProfile);
        setLabProfile(initialProfile);
      }

      // 2. Fetch Lab Bookings
      const bookQuery = query(
        collection(db, 'lab_bookings'),
        where('labId', '==', user.uid)
      );
      const bookSnap = await getDocs(bookQuery);
      const bookList = bookSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabBooking));
      bookList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(bookList);

      // 3. Fetch Lab Tests
      const testsQuery = query(
        collection(db, 'lab_tests'),
        where('labId', '==', user.uid)
      );
      const testSnap = await getDocs(testsQuery);
      let testList = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabTest));

      // Seed standard Iraqi laboratory test catalog if empty
      if (testList.length === 0) {
        const defaultTests: Omit<LabTest, 'id'>[] = [
          {
            labId: user.uid,
            name: 'فحص صورة الدم الكاملة (Complete Blood Count CBC)',
            category: 'Hematology',
            price: 15000,
            estimatedHours: 2,
            sampleType: 'EDTA Whole Blood (أنبوب بنفسجي)',
            fastingInstructions: 'لا يشترط الصيام المسبق.',
            normalRange: 'Hb: 13-17 g/dL (M), WBC: 4-11 x10^3/mcL',
            isAvailable: true,
            homeCollectionSupported: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            labId: user.uid,
            name: 'فحص السكر التراكمي (HbA1c Glycated Hemoglobin)',
            category: 'Biochemistry',
            price: 20000,
            estimatedHours: 2,
            sampleType: 'EDTA Whole Blood (أنبوب بنفسجي)',
            fastingInstructions: 'لا يتطلب صيام.',
            normalRange: '< 5.7% (طبيعي)، 5.7-6.4% (مقدمات السكري)',
            isAvailable: true,
            homeCollectionSupported: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            labId: user.uid,
            name: 'فحص الدهون الشامل (Lipid Profile Panel)',
            category: 'Biochemistry',
            price: 25000,
            estimatedHours: 3,
            sampleType: 'Clotted Blood / Serum (أنبوب أصفر/أحمر)',
            fastingInstructions: 'صيام تام من 10 إلى 12 ساعة مع السماح بشرب الماء.',
            normalRange: 'Cholesterol < 200 mg/dL, Triglycerides < 150 mg/dL',
            isAvailable: true,
            homeCollectionSupported: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            labId: user.uid,
            name: 'فحص وظائف الكلى (Urea & Creatinine)',
            category: 'Biochemistry',
            price: 18000,
            estimatedHours: 2,
            sampleType: 'Serum (مصل الدم)',
            fastingInstructions: 'صيام خفيف 4-6 ساعات، شرب كميات كافية من الماء.',
            normalRange: 'Creatinine: 0.6 - 1.2 mg/dL, Blood Urea: 15 - 45 mg/dL',
            isAvailable: true,
            homeCollectionSupported: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            labId: user.uid,
            name: 'فحص هرمون الغدة الدرقية (TSH & Free T4)',
            category: 'Immunology',
            price: 30000,
            estimatedHours: 4,
            sampleType: 'Serum (مصل الدم)',
            fastingInstructions: 'يفضل سحب العينة صباحاً قبل تناول أدوية الغدة.',
            normalRange: 'TSH: 0.4 - 4.2 mIU/L, FT4: 0.8 - 1.8 ng/dL',
            isAvailable: true,
            homeCollectionSupported: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            labId: user.uid,
            name: 'فحص فيتامين د الشامل (Vitamin D 25-OH)',
            category: 'Immunology',
            price: 35000,
            estimatedHours: 4,
            sampleType: 'Serum (مصل الدم محمي من الضوء)',
            fastingInstructions: 'لا يشترط الصيام.',
            normalRange: 'Sufficiency: 30 - 100 ng/mL',
            isAvailable: true,
            homeCollectionSupported: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ];

        for (const t of defaultTests) {
          const tId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await setDoc(doc(db, 'lab_tests', tId), { id: tId, ...t });
        }
        const refreshedTestSnap = await getDocs(testsQuery);
        testList = refreshedTestSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabTest));
      }
      setTests(testList);

      // 4. Fetch Lab Results
      const resQuery = query(
        collection(db, 'lab_results'),
        where('labId', '==', user.uid)
      );
      const resSnap = await getDocs(resQuery);
      const resList = resSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabResult));
      resList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setResults(resList);

    } catch (err: unknown) {
      console.error('Error loading laboratory center data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLabData();
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

  // Update Booking Status
  const handleUpdateBookingStatus = async (bookingId: string, status: LabBookingStatus, patientId?: string, extra?: { cancellationReason?: string }) => {
    if (!isOperable) {
      showToast(language === 'ar' ? 'يتطلب إجراء العمليات اعتماد المشرف العام' : 'Super Admin approval required', 'error');
      return;
    }
    try {
      const ref = doc(db, 'lab_bookings', bookingId);
      const updateData: Partial<LabBooking> = {
        status,
        updatedAt: new Date().toISOString(),
        ...(extra?.cancellationReason ? { cancellationReason: extra.cancellationReason } : {}),
      };

      // If accepted and sample pending, set collected or received if applicable
      if (status === 'accepted') {
        updateData.sampleStatus = 'collected';
      } else if (status === 'completed') {
        updateData.sampleStatus = 'completed';
      } else if (status === 'cancelled') {
        updateData.sampleStatus = 'cancelled';
      }

      await updateDoc(ref, updateData);

      // Notify patient
      if (patientId) {
        const notifTitle = language === 'ar' ? 'تحديث موعد التحليل المخبري' : 'Lab Test Update';
        const notifMsg = language === 'ar' 
          ? `تم تحديث حالة طلب الفحص لدى ${labProfile?.labName || 'المختبر'} إلى: ${status}${extra?.cancellationReason ? ` (السبب: ${extra.cancellationReason})` : ''}`
          : `Your lab test appointment status has been updated to: ${status}`;
        await sendPatientNotification(patientId, notifTitle, notifMsg, 'booking_update');
      }

      showToast(
        language === 'ar' ? `تم تحديث حالة الحجز إلى: ${status}` : `Booking updated to: ${status}`
      );
      await loadLabData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `lab_bookings/${bookingId}`);
    }
  };

  // Update Sample Tracking Status
  const handleUpdateSampleStatus = async (bookingId: string, sampleStatus: LabSampleStatus, patientId?: string) => {
    if (!isOperable) {
      showToast(language === 'ar' ? 'يتطلب إجراء العمليات اعتماد المشرف العام' : 'Super Admin approval required', 'error');
      return;
    }
    try {
      const ref = doc(db, 'lab_bookings', bookingId);
      await updateDoc(ref, {
        sampleStatus,
        updatedAt: new Date().toISOString(),
      });

      if (patientId) {
        const notifTitle = language === 'ar' ? 'متابعة مسار العينة المخبرية' : 'Sample Status Update';
        const notifMsg = language === 'ar'
          ? `تم تحديث حالة عينة التحليل إلى: ${sampleStatusMap[sampleStatus]?.labelAr || sampleStatus}`
          : `Your laboratory sample status is now: ${sampleStatusMap[sampleStatus]?.labelEn || sampleStatus}`;
        await sendPatientNotification(patientId, notifTitle, notifMsg, 'booking_update');
      }

      showToast(language === 'ar' ? `تم تحديث مسار العينة إلى: ${sampleStatusMap[sampleStatus]?.labelAr}` : `Sample status: ${sampleStatus}`);
      await loadLabData();
      setTrackingSampleBooking(null);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `lab_bookings/${bookingId}`);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingBooking || !rescheduleData.newDate) return;
    if (!isOperable) {
      showToast(language === 'ar' ? 'يتطلب إجراء العمليات اعتماد المشرف العام' : 'Super Admin approval required', 'error');
      return;
    }
    try {
      const ref = doc(db, 'lab_bookings', reschedulingBooking.id);
      await updateDoc(ref, {
        status: 'rescheduled',
        rescheduleDate: rescheduleData.newDate,
        rescheduleReason: rescheduleData.reason || 'الموعد المعاد جدولته بناء على شروط الصيام أو جدول التحليلات',
        updatedAt: new Date().toISOString(),
      });

      if (reschedulingBooking.patientId) {
        await sendPatientNotification(
          reschedulingBooking.patientId,
          language === 'ar' ? 'إعادة جدولة موعد التحليل المخبري' : 'Lab Test Rescheduled',
          language === 'ar' 
            ? `يقترح المختبر الموعد البديل: ${rescheduleData.newDate}. السبب: ${rescheduleData.reason}`
            : `Proposed new test time: ${rescheduleData.newDate}.`,
          'booking_update'
        );
      }

      showToast(
        language === 'ar' ? 'تم تسجيل وتعديل الموعد وإرسال إشعار للمراجع' : 'Reschedule confirmed'
      );
      setReschedulingBooking(null);
      setRescheduleData({ newDate: '', reason: '' });
      await loadLabData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `lab_bookings/${reschedulingBooking.id}`);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    await handleUpdateBookingStatus(cancellingBooking.id, 'cancelled', cancellingBooking.patientId, {
      cancellationReason: cancelReason || (language === 'ar' ? 'تم الإلغاء من قبل إدارة المختبر' : 'Cancelled by lab administration')
    });
    setCancellingBooking(null);
    setCancelReason('');
  };

  // Create Walk-in / Direct Lab Order Intake
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBookingData.patientName.trim()) return;

    try {
      const bookingId = `lbook_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const barcode = `SMP-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date().toISOString();
      const newBooking: LabBooking = {
        id: bookingId,
        labId: user.uid,
        labName: labProfile?.labName || userProfile?.facilityName || 'المختبر التخصصي للتحليلات',
        patientId: `pat_${Date.now()}`,
        patientName: newBookingData.patientName,
        patientPhone: newBookingData.patientPhone || '07XXXXXXXXX',
        testId: `tst_${Date.now()}`,
        testName: newBookingData.testName,
        category: newBookingData.category,
        date: newBookingData.date,
        timeSlot: newBookingData.timeSlot,
        bookingType: newBookingData.bookingType,
        homeAddress: newBookingData.bookingType === 'home_collection' ? newBookingData.homeAddress : undefined,
        status: isOperable ? 'accepted' : 'pending',
        sampleStatus: newBookingData.bookingType === 'home_collection' ? 'pending_collection' : 'collected',
        sampleBarcode: barcode,
        notes: newBookingData.notes,
        resultReady: false,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'lab_bookings', bookingId), newBooking);
      showToast(
        language === 'ar' ? 'تم تسجيل طلب التحليل وتوليد باركود العينة' : 'Lab order registered with sample barcode'
      );
      setShowNewBookingModal(false);
      setNewBookingData({
        patientName: '',
        patientPhone: '',
        testName: 'فحص صورة الدم الكاملة (CBC)',
        category: 'Hematology',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '09:30 AM',
        bookingType: 'in_lab',
        homeAddress: '',
        notes: '',
      });
      await loadLabData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'lab_bookings');
    }
  };

  // Create Lab Test in Catalog
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTestData.name.trim()) return;

    try {
      const tId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const testItem: LabTest = {
        id: tId,
        labId: user.uid,
        name: newTestData.name,
        category: newTestData.category,
        price: Number(newTestData.price),
        estimatedHours: Number(newTestData.estimatedHours),
        sampleType: newTestData.sampleType,
        fastingInstructions: newTestData.fastingInstructions,
        normalRange: newTestData.normalRange,
        isAvailable: newTestData.isAvailable,
        homeCollectionSupported: newTestData.homeCollectionSupported,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'lab_tests', tId), testItem);
      showToast(language === 'ar' ? 'تمت إضافة الفحص لقائمة تحليلات المختبر' : 'Test added to catalog');
      setShowNewTestModal(false);
      setNewTestData({
        name: '',
        category: 'Hematology',
        price: 15000,
        estimatedHours: 2,
        sampleType: 'Serum / دم وريدي',
        fastingInstructions: 'صيام 8 ساعات.',
        normalRange: '',
        isAvailable: true,
        homeCollectionSupported: true,
      });
      await loadLabData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'lab_tests');
    }
  };

  const handleToggleTest = async (testId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'lab_tests', testId), {
        isAvailable: !currentStatus,
        updatedAt: new Date().toISOString(),
      });
      showToast(language === 'ar' ? 'تم تعديل جاهزية الفحص' : 'Test availability updated');
      await loadLabData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `lab_tests/${testId}`);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await deleteDoc(doc(db, 'lab_tests', testId));
      showToast(language === 'ar' ? 'تم حذف الفحص' : 'Test removed');
      await loadLabData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `lab_tests/${testId}`);
    }
  };

  // Add Parameter Row in Result Form
  const handleAddParameterRow = () => {
    setNewResultData(prev => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        { name: '', value: '', unit: '', referenceRange: '', status: 'normal' }
      ]
    }));
  };

  const handleUpdateParameter = (index: number, field: keyof LabResultParameter, val: string) => {
    setNewResultData(prev => {
      const updated = [...prev.parameters];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, parameters: updated };
    });
  };

  const handleRemoveParameter = (index: number) => {
    setNewResultData(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, idx) => idx !== index)
    }));
  };

  // Image upload for diagnostic result attachments
  const handleScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      showToast(language === 'ar' ? 'حجم المرفق يجب ألا يتجاوز 5 ميغابايت' : 'Attachment must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setNewResultData(prev => ({
          ...prev,
          attachedScans: [...(prev.attachedScans || []), dataUrl]
        }));
        showToast(language === 'ar' ? 'تم إرفاق صورة/شريط التحليل المخبري' : 'Lab strip/scan attached');
      }
    };
    reader.readAsDataURL(file);
  };

  // Create & Publish Lab Diagnostic Result
  const handlePublishResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newResultData.patientName.trim()) return;

    if (!isOperable) {
      showToast(language === 'ar' ? 'لا يمكن نشر نتائج التحاليل قبل الحصول على اعتماد الإدارة' : 'Lab accreditation required to publish results', 'error');
      return;
    }

    try {
      const resId = `lres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const patientId = selectedBookingForResult?.patientId || `pat_${Date.now()}`;

      const labResultDoc: LabResult = {
        id: resId,
        labId: user.uid,
        labName: labProfile?.labName || userProfile?.facilityName || 'المختبر التخصصي',
        patientId,
        patientName: newResultData.patientName,
        bookingId: selectedBookingForResult?.id,
        testName: newResultData.testName,
        category: newResultData.category,
        sampleType: newResultData.sampleType,
        parameters: newResultData.parameters.filter(p => p.name.trim() !== ''),
        notes: newResultData.notes,
        pathologistName: newResultData.pathologistName,
        pathologistLicense: newResultData.pathologistLicense,
        fileUrl: newResultData.fileUrl || `https://m737.iq/lab-results/download/${resId}.pdf`,
        attachedScans: newResultData.attachedScans,
        reviewStatus: newResultData.reviewStatus,
        status: newResultData.status,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'lab_results', resId), labResultDoc);

      // Also mark linked booking as completed and resultReady
      if (selectedBookingForResult?.id) {
        await updateDoc(doc(db, 'lab_bookings', selectedBookingForResult.id), {
          resultReady: true,
          resultId: resId,
          status: 'completed',
          sampleStatus: 'completed',
          updatedAt: now,
        });
      }

      // Notify Patient that their lab results are ready
      await sendPatientNotification(
        patientId,
        language === 'ar' ? 'صدور نتائج التحليل المخبري' : 'Laboratory Results Published',
        language === 'ar'
          ? `صدرت النتيجة المعتمدة لفحص (${newResultData.testName}) من ${labProfile?.labName}. يمكنك الاطلاع عليها وتحميل التقرير الطبي.`
          : `Your lab results for (${newResultData.testName}) are ready.`,
        'report_ready'
      );

      showToast(
        language === 'ar' ? 'تم اعتماد ونشر نتيجة التحليل وإشعار المراجع' : 'Lab result certified and published'
      );
      setShowNewResultModal(false);
      setSelectedBookingForResult(null);
      await loadLabData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'lab_results');
    }
  };

  // Save Lab Settings
  const handleSaveLabSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const now = new Date().toISOString();
      const equipmentArray = editProfileForm.equipmentInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updatedProfile: LabProfile = {
        labId: user.uid,
        labName: editProfileForm.labName,
        logoUrl: editProfileForm.logoUrl,
        directorName: editProfileForm.directorName,
        licenseNumber: editProfileForm.licenseNumber || labProfile?.licenseNumber || '',
        phone: editProfileForm.phone,
        whatsapp: editProfileForm.whatsapp,
        address: editProfileForm.address,
        governorate: editProfileForm.governorate,
        mapsUrl: editProfileForm.mapsUrl,
        workingHours: editProfileForm.workingHours,
        equipmentList: equipmentArray,
        homeCollectionAvailable: editProfileForm.homeCollectionAvailable,
        homeCollectionFee: Number(editProfileForm.homeCollectionFee),
        bio: editProfileForm.bio,
        createdAt: labProfile?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'lab_profiles', user.uid), updatedProfile);

      // Sync non-privileged user profile fields
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editProfileForm.labName,
        facilityName: editProfileForm.labName,
        governorate: editProfileForm.governorate,
        phone: editProfileForm.phone,
        updatedAt: now,
      });

      showToast(
        language === 'ar' ? 'تم حفظ إعدادات وبيانات المختبر بنجاح' : 'Laboratory profile saved'
      );
      await loadLabData();
      await refreshProfile();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `lab_profiles/${user.uid}`);
    }
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'all') return true;
    return b.status === bookingFilter;
  });

  // Filtered Results
  const filteredResults = results.filter((r) => {
    if (resultFilter === 'all') return true;
    return r.category === resultFilter;
  });

  // Aggregated Patients Directory
  const patientsRoster = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      phone: string;
      bookingsCount: number;
      lastVisitDate: string;
      testsRequested: Set<string>;
      latestResult?: LabResult;
    }>();

    // From Bookings
    bookings.forEach(b => {
      const key = (b.patientPhone || b.patientName).trim();
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.bookingsCount += 1;
        existing.testsRequested.add(b.testName);
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
          testsRequested: new Set([b.testName]),
        });
      }
    });

    // From Results
    results.forEach(r => {
      const key = (r.patientName).trim();
      const match = Array.from(map.values()).find(p => p.name === r.patientName);
      if (match) {
        match.latestResult = r;
      } else if (!map.has(key)) {
        map.set(key, {
          id: r.patientId,
          name: r.patientName,
          phone: '07XXXXXXXXX',
          bookingsCount: 1,
          lastVisitDate: r.createdAt.split('T')[0],
          testsRequested: new Set([r.testName]),
          latestResult: r,
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
  }, [bookings, results, patientSearchTerm]);

  // Derived Metrics
  const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
  const acceptedBookingsCount = bookings.filter(b => b.status === 'accepted').length;
  const homeVisitsCount = bookings.filter(b => b.bookingType === 'home_collection').length;

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

      {/* Accreditation Warning if unapproved */}
      {!isOperable && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-4">
          <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">
              {language === 'ar' ? 'المختبر قيد المراجعة والتدقيق المهني' : 'Laboratory Accreditation Under Review'}
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {language === 'ar'
                ? 'عملاً بضوابط وزارة الصحة ونقابة المهن الصحية والطبية في العراق، يتم تقييد قبول طلبات التحاليل ونشر النتائج المخبرية حتى استكمال تدقيق صحة الإجازة من قبل المشرف العام للمنصة.'
                : 'Pursuant to Iraqi healthcare regulations, intake and report publishing are restricted until license approval by the Super Admin.'}
            </p>
          </div>
        </div>
      )}

      {/* Lab Brand Banner */}
      <div className="bg-gradient-to-r from-[#002244] via-[#02457a] to-[#057a55] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {labProfile?.logoUrl ? (
              <img 
                src={labProfile.logoUrl} 
                alt="Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white/10 backdrop-blur-md border border-white/20 shadow-md shrink-0" 
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md shrink-0">
                <FlaskConical size={36} className="text-emerald-300" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-1.5">
                <CheckCircle2 size={13} />
                <span>{isOperable ? (language === 'ar' ? 'مختبر تحليلات مرضية معتمد' : 'Accredited Medical Laboratory') : (language === 'ar' ? 'قيد التدقيق الإداري' : 'Pending Verification')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {labProfile?.labName || userProfile?.facilityName || 'المختبر التخصصي'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-200 mt-1">
                <span>{language === 'ar' ? 'إشراف:' : 'Director:'} {labProfile?.directorName}</span>
                <span className="opacity-40">·</span>
                <span>{language === 'ar' ? 'ترخيص النقابة:' : 'License:'} {labProfile?.licenseNumber || userProfile?.licenseNumber || 'LAB-IQ'}</span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-emerald-300" />
                  <span>{labProfile?.address || userProfile?.facilityName || 'العراق'}</span>
                </span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-emerald-300" />
                  <span>{labProfile?.workingHours || '8:00 AM - 10:00 PM'}</span>
                </span>
                {labProfile?.homeCollectionAvailable && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-200 text-xs font-bold">
                      <Home size={12} />
                      <span>{language === 'ar' ? 'سحب منزلي متاح' : 'Home Visits'}</span>
                    </span>
                  </>
                )}
                {labProfile?.mapsUrl && (
                  <>
                    <span className="opacity-40">·</span>
                    <a 
                      href={labProfile.mapsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-emerald-200 hover:text-white underline flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      <span>{language === 'ar' ? 'خرائط Google' : 'Maps'}</span>
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
                loadLabData();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{language === 'ar' ? 'تحديث' : 'Sync'}</span>
            </button>
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-[#002244] hover:bg-slate-100 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'طلب فحص مراجع' : 'Intake Patient'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Laboratory Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-200/80 rounded-2xl overflow-x-auto text-xs font-bold">
        {[
          { id: 'dashboard', labelAr: 'لوحة المؤشرات', labelEn: 'Dashboard', icon: Activity },
          { id: 'bookings', labelAr: `طلبات التحاليل (${bookings.length})`, labelEn: `Lab Orders (${bookings.length})`, icon: Calendar },
          { id: 'samples', labelAr: 'تتبع العينات والباركود', labelEn: 'Sample Tracking', icon: Pipette },
          { id: 'tests', labelAr: `دليل الفحوصات والأسعار (${tests.length})`, labelEn: `Test Directory (${tests.length})`, icon: DollarSign },
          { id: 'results', labelAr: `النتائج والتقارير المعتمدة (${results.length})`, labelEn: `Results Archive (${results.length})`, icon: FileText },
          { id: 'patients', labelAr: `سجل المراجعين (${patientsRoster.length})`, labelEn: `Patients (${patientsRoster.length})`, icon: Users },
          { id: 'settings', labelAr: 'إعدادات المختبر والأجهزة', labelEn: 'Lab Profile & Gear', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-emerald-700' : 'text-slate-400'} />
              <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              {tab.id === 'bookings' && pendingBookingsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-mono">
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
              <span className="text-xs text-slate-500 block mb-1 font-semibold">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{bookings.length}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">{language === 'ar' ? 'قاعدة بيانات Firestore الحية' : 'Live database'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs">
              <span className="text-xs text-amber-700 block mb-1 font-semibold">{language === 'ar' ? 'طلبات بانتظار التأكيد' : 'Pending Requests'}</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">{pendingBookingsCount}</div>
              <span className="text-[11px] text-amber-600 mt-1 block">{language === 'ar' ? 'تتطلب قرار المختبر' : 'Requires triage'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-xs">
              <span className="text-xs text-blue-700 block mb-1 font-semibold">{language === 'ar' ? 'سحب منزلي مطلوب' : 'Home Sample Visits'}</span>
              <div className="text-2xl sm:text-3xl font-black text-blue-800 font-mono">{homeVisitsCount}</div>
              <span className="text-[11px] text-blue-600 mt-1 block">{language === 'ar' ? 'فريق السحب المتنقل' : 'Mobile Phlebotomy'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs">
              <span className="text-xs text-emerald-700 block mb-1 font-semibold">{language === 'ar' ? 'نتائج صادرة ومعتمدة' : 'Released Results'}</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">{results.length}</div>
              <span className="text-[11px] text-emerald-600 mt-1 block">{language === 'ar' ? 'موثقة ومتاحة للمراجعين' : 'Certified in portal'}</span>
            </div>
          </div>

          {/* Pending Alerts */}
          {pendingBookingsCount > 0 && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={22} className="text-emerald-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">
                    {language === 'ar' ? `لديك (${pendingBookingsCount}) طلبات فحص وتحاليل جديدة بحاجة للقبول وتأكيد الموعد` : `You have (${pendingBookingsCount}) pending lab test orders`}
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {language === 'ar' ? 'يرجى مراجعة شروط صيام المراجع وتأكيد موعد الحضور أو موعد السحب المنزلي.' : 'Verify fasting instructions and dispatch phlebotomist.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setBookingFilter('pending');
                  setActiveTab('bookings');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shrink-0"
              >
                {language === 'ar' ? 'مراجعة الطلبات الآن' : 'Review Orders'}
              </button>
            </div>
          )}

          {/* 2-Column Split: Orders Queue & Equipment / Director Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Bookings Queue */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-700" />
                  <h3 className="font-bold text-base text-slate-900">{language === 'ar' ? 'طابور التحاليل الأخيرة' : 'Recent Lab Orders'}</h3>
                </div>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  {language === 'ar' ? 'عرض الكل' : 'View All'}
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FlaskConical size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{language === 'ar' ? 'لا توجد طلبات تحليل مسجلة حالياً' : 'No lab orders yet'}</p>
                  <button
                    onClick={() => setShowNewBookingModal(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    {language === 'ar' ? 'تسجيل طلب مباشر' : 'Intake New Order'}
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
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          <TestTube size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <span>{b.patientName}</span>
                            {b.bookingType === 'home_collection' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                                <Home size={10} />
                                <span>{language === 'ar' ? 'منزلي' : 'Home'}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{b.testName}</span>
                            <span>·</span>
                            <span className="font-mono">{b.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : b.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {b.status}
                        </span>

                        {b.status === 'accepted' && isOperable && (
                          <button
                            onClick={() => {
                              setSelectedBookingForResult(b);
                              setNewResultData({
                                ...newResultData,
                                patientName: b.patientName,
                                testName: b.testName,
                                category: b.category || 'Hematology',
                              });
                              setShowNewResultModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                            title="إصدار النتيجة"
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

            {/* Equipment & Quality Standards Summary */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-emerald-700" />
                    <h3 className="font-bold text-base text-slate-900">{language === 'ar' ? 'أجهزة التحليل المؤتمتة' : 'Automated Analyzers'}</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    <Settings size={14} />
                  </button>
                </div>

                <div className="space-y-2">
                  {(labProfile?.equipmentList || ['Sysmex XN-550', 'Roche Cobas c311', 'Abbott Architect i1000SR', 'PCR Analyzer']).map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{language === 'ar' ? 'المدير الفني المسؤول:' : 'Director:'}</span>
                  <span className="font-bold text-slate-800">{labProfile?.directorName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS / LAB ORDERS */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'إدارة طلبات الفحوصات والتحاليل المرضية' : 'Lab Orders & Patient Intake'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'متابعة الطلبات، قبول المواعيد، طلبات السحب المنزلي، وإعادة الجدولة والتواصل المباشر مع المراجعين.'
                  : 'Manage test requests, confirm phlebotomy schedules, handle home visits, and triage.'}
              </p>
            </div>

            <button
              onClick={() => setShowNewBookingModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'تسجيل طلب فحص' : 'New Lab Order'}</span>
            </button>
          </div>

          {/* Filter Status Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { id: 'all', labelAr: 'الكل', labelEn: 'All' },
              { id: 'pending', labelAr: 'قيد الانتظار', labelEn: 'Pending' },
              { id: 'accepted', labelAr: 'مؤكدة ومقبولة', labelEn: 'Accepted' },
              { id: 'rescheduled', labelAr: 'معاد جدولتها', labelEn: 'Rescheduled' },
              { id: 'completed', labelAr: 'مكتملة', labelEn: 'Completed' },
              { id: 'cancelled', labelAr: 'ملغاة', labelEn: 'Cancelled' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setBookingFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  bookingFilter === f.id
                    ? 'bg-emerald-700 text-white shadow-xs'
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
              <FlaskConical size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا توجد طلبات تحليل في هذا الفلتر' : 'No lab orders in this filter'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'اختر فئة أخرى أو قم بتسجيل طلب جديد' : 'Try another filter or intake a patient'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                      <TestTube size={22} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">{b.patientName}</h4>
                        {b.bookingType === 'home_collection' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                            <Home size={11} />
                            <span>{language === 'ar' ? 'سحب منزلي' : 'Home Collection'}</span>
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
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
                        {b.resultReady && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            <span>{language === 'ar' ? 'النتيجة جاهزة' : 'Results Ready'}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span className="font-bold text-slate-700">{b.testName}</span>
                        <span>·</span>
                        <span className="font-mono">{b.date} ({b.timeSlot})</span>
                        <span>·</span>
                        <span className="font-mono">{b.patientPhone}</span>
                        {b.sampleBarcode && (
                          <>
                            <span>·</span>
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-700">
                              {b.sampleBarcode}
                            </span>
                          </>
                        )}
                      </div>

                      {b.homeAddress && (
                        <div className="mt-1 text-xs text-blue-800 bg-blue-50/70 p-2 rounded-lg flex items-center gap-1.5">
                          <MapPin size={13} />
                          <span><strong>{language === 'ar' ? 'عنوان السحب المنزلي:' : 'Home Address:'}</strong> {b.homeAddress}</span>
                        </div>
                      )}

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
                    {/* Sample tracking badge button */}
                    <button
                      onClick={() => setTrackingSampleBooking(b)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${sampleStatusMap[b.sampleStatus]?.color || 'bg-slate-100 text-slate-700'}`}
                      title="تحديث حالة العينة"
                    >
                      <Pipette size={14} />
                      <span>{sampleStatusMap[b.sampleStatus]?.labelAr || b.sampleStatus}</span>
                    </button>

                    {b.status === 'pending' && isOperable && (
                      <>
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'accepted', b.patientId)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Check size={14} />
                          <span>{language === 'ar' ? 'قبول' : 'Accept'}</span>
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
                          {language === 'ar' ? 'اعتذار' : 'Reject'}
                        </button>
                      </>
                    )}

                    {b.status === 'accepted' && isOperable && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedBookingForResult(b);
                            setNewResultData({
                              ...newResultData,
                              patientName: b.patientName,
                              testName: b.testName,
                              category: b.category || 'Hematology',
                            });
                            setShowNewResultModal(true);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <FileText size={14} />
                          <span>{language === 'ar' ? 'تسجيل النتيجة' : 'Record Result'}</span>
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
                            ? `تحية طيبة من ${labProfile?.labName || 'المختبر'}. بخصوص موعد فحص (${b.testName}) ليوم ${b.date}.`
                            : `Hello from ${labProfile?.labName}. Regarding your lab test for ${b.testName} on ${b.date}.`
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

      {/* TAB 3: SAMPLE TRACKING WORKFLOW */}
      {activeTab === 'samples' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'نظام مسار وتتبع العينات المخبرية (Sample Tracking)' : 'Specimen Chain of Custody & Tracking'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar'
                ? 'مراقبة حركة العينات: سحب العينة، الاستلام بالمختبر، مرحلة التحليل بالأجهزة المؤتمتة، واكتمال النتيجة.'
                : 'Monitor collection, laboratory receipt, analytical processing, and release.'}
            </p>
          </div>

          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Pipette size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-xs">{language === 'ar' ? 'لا توجد عينات جارية حالياً' : 'No active specimens in laboratory'}</p>
              </div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-slate-900 text-white">
                          {b.sampleBarcode || `SMP-${b.id.slice(-6)}`}
                        </span>
                        <h4 className="font-bold text-base text-slate-900">{b.patientName}</h4>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {b.testName} · {b.date} · {b.bookingType === 'home_collection' ? (language === 'ar' ? 'سحب منزلي' : 'Home Visit') : (language === 'ar' ? 'داخل المختبر' : 'In-Lab')}
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${sampleStatusMap[b.sampleStatus]?.color}`}>
                      {sampleStatusMap[b.sampleStatus]?.labelAr}
                    </span>
                  </div>

                  {/* Visual Tracker Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    {[
                      { status: 'pending_collection', labelAr: '1. بانتظار السحب', labelEn: 'Collection' },
                      { status: 'collected', labelAr: '2. تم السحب', labelEn: 'Collected' },
                      { status: 'received', labelAr: '3. استلمت بالمختبر', labelEn: 'Received' },
                      { status: 'processing', labelAr: '4. قيد التحليل', labelEn: 'Processing' },
                      { status: 'completed', labelAr: '5. مكتمل', labelEn: 'Complete' },
                    ].map((step, idx) => {
                      const isCurrent = b.sampleStatus === step.status;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleUpdateSampleStatus(b.id, step.status as LabSampleStatus, b.patientId)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {language === 'ar' ? step.labelAr : step.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TEST CATALOG & PRICING */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'دليل التحاليل والفحوصات، الأسعار وشروط الصيام' : 'Laboratory Test Catalog & Requirements'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'إدارة أسعار التحاليل بالدينار، تحديد نوع أنبوب العينة وشروط الصيام، وتفعيل خدمة السحب المنزلي.'
                  : 'Manage test panels, pricing, tube color/sample types, and fasting protocols.'}
              </p>
            </div>

            <button
              onClick={() => setShowNewTestModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة تحليل جديد' : 'Add Test Panel'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase">
                      {t.category}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      t.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {t.isAvailable ? (language === 'ar' ? 'متاح ومفعل' : 'Available') : (language === 'ar' ? 'متوقف مؤقتاً' : 'Disabled')}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-slate-900 mb-1">{t.name}</h4>
                  
                  <div className="text-sm font-black text-emerald-700 mb-3 font-mono">
                    {t.price.toLocaleString()} {language === 'ar' ? 'د.ع' : 'IQD'}
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-100 text-xs text-slate-600 space-y-1.5 mb-3">
                    <div>
                      <strong className="text-slate-800">{language === 'ar' ? 'نوع العينة: ' : 'Sample: '}</strong>
                      <span>{t.sampleType}</span>
                    </div>
                    <div>
                      <strong className="text-slate-800">{language === 'ar' ? 'تعليمات الصيام: ' : 'Fasting: '}</strong>
                      <span>{t.fastingInstructions}</span>
                    </div>
                    {t.normalRange && (
                      <div>
                        <strong className="text-slate-800">{language === 'ar' ? 'المعدل الطبيعي: ' : 'Reference: '}</strong>
                        <span className="font-mono text-slate-700">{t.normalRange}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{language === 'ar' ? 'الوقت المقدر لصدور النتيجة:' : 'Turnaround:'}</span>
                    <span className="font-bold text-slate-700">{t.estimatedHours} {language === 'ar' ? 'ساعات' : 'Hours'}</span>
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-200/80 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleTest(t.id, t.isAvailable)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    {t.isAvailable ? (language === 'ar' ? 'إيقاف مؤقت' : 'Deactivate') : (language === 'ar' ? 'تفعيل الفحص' : 'Activate')}
                  </button>

                  <button
                    onClick={() => handleDeleteTest(t.id)}
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

      {/* TAB 5: RESULTS & REPORTS ARCHIVE */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'أرشيف النتائج والتقارير المخبرية المعتمدة' : 'Diagnostic Laboratory Results Archive'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'إصدار النتائج التفصيلية بتوقيع اختصاصي التحليلات المرضية، مع طباعة PDF معتمدة وإشعار المراجع فورياً.'
                  : 'Certified lab reports with parameter reference ranges, sign-offs, and printable PDF documents.'}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedBookingForResult(null);
                setShowNewResultModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'صياغة نتيجة فحص جديدة' : 'New Lab Report'}</span>
            </button>
          </div>

          {/* Results Grid */}
          {filteredResults.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا توجد نتائج تحاليل منشورة حالياً' : 'No lab results published yet'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'قم بتسجيل نتيجة فحص مكتمل لتوثيقها بالسجل الصحي للمريض' : 'Record findings for completed samples'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResults.map((res) => (
                <div
                  key={res.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase">
                        {res.category}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{res.createdAt.split('T')[0]}</span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 mb-1">{res.testName}</h4>
                    <div className="text-xs font-semibold text-slate-700 mb-3">
                      {language === 'ar' ? 'المريض:' : 'Patient:'} {res.patientName}
                    </div>

                    {/* Quick Parameters Table Preview */}
                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs space-y-1.5 mb-3">
                      {res.parameters.slice(0, 3).map((p, pIdx) => (
                        <div key={pIdx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                          <span className="font-bold text-slate-700">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${
                              p.status === 'abnormal' || p.status === 'high' ? 'text-red-600' : p.status === 'low' ? 'text-amber-600' : 'text-slate-900'
                            }`}>
                              {p.value} {p.unit}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">({p.referenceRange})</span>
                          </div>
                        </div>
                      ))}
                      {res.parameters.length > 3 && (
                        <div className="text-[11px] text-slate-400 text-center pt-1 font-semibold">
                          +{res.parameters.length - 3} {language === 'ar' ? 'معاملات إضافية في التقرير الكامل' : 'more parameters in report'}
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{language === 'ar' ? 'المسؤول الفني:' : 'Pathologist:'} {res.pathologistName}</span>
                      <span className="font-mono">{res.pathologistLicense}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>{language === 'ar' ? 'معتمد ومسلم للمريض' : 'Verified & Released'}</span>
                    </span>

                    <button
                      onClick={() => setViewingResultModal(res)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>{language === 'ar' ? 'معاينة وطباعة PDF' : 'View & Print PDF'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PATIENT DIRECTORY */}
      {activeTab === 'patients' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'سجل المراجعين والمرضى' : 'Patient Laboratory Records'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'قائمة المراجعين الذين أجروا تحاليل بالمختبر، وسجل نتائجهم ومواعيدهم السابقة.'
                  : 'Patient directory, past test frequencies, and historical diagnostic results.'}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute top-3 start-3 text-slate-400" />
              <input
                type="text"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'بحث باسم المريض أو الهاتف...' : 'Search by name or phone...'}
                className="w-full ps-9 pe-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {patientsRoster.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا يوجد مراجعون مسجلون' : 'No patients found'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'قم بتسجيل مراجع جديد لإدراجه في السجل الصحي' : 'Intake a patient order to populate this directory'}</p>
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
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                          {pat.name.charAt(0)}
                        </div>
                        <h4 className="font-bold text-base text-slate-900">{pat.name}</h4>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                        {pat.bookingsCount} {language === 'ar' ? 'تحاليل' : 'Tests'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />
                        <span className="font-mono">{pat.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{language === 'ar' ? 'آخر فحص:' : 'Last Exam:'} {pat.lastVisitDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <FlaskConical size={13} className="text-slate-400" />
                        <span className="text-slate-500">{language === 'ar' ? 'التحاليل السابقة:' : 'Past Tests:'}</span>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(pat.testsRequested).map((t, tIdx) => (
                            <span key={tIdx} className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    {pat.latestResult ? (
                      <button
                        onClick={() => setViewingResultModal(pat.latestResult!)}
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <FileText size={14} />
                        <span>{language === 'ar' ? 'عرض النتيجة الطبية' : 'View Result'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {language === 'ar' ? 'النتيجة قيد التحضير' : 'Processing'}
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setNewBookingData({
                            patientName: pat.name,
                            patientPhone: pat.phone,
                            testName: 'فحص صورة الدم الكاملة (CBC)',
                            category: 'Hematology',
                            date: new Date().toISOString().split('T')[0],
                            timeSlot: '10:00 AM',
                            bookingType: 'in_lab',
                            homeAddress: '',
                            notes: '',
                          });
                          setShowNewBookingModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        {language === 'ar' ? 'طلب فحص' : 'Order'}
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

      {/* TAB 7: LAB PROFILE & SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveLabSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'بيانات المختبر، الإشراف الفني والأجهزة' : 'Laboratory Profile, Director & Gear'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar'
                ? 'تحديث بيانات المنشأة، أرقام التواصل، اسم المدير المسؤول، رسوم السحب المنزلي، وقائمة الأجهزة المعتمدة.'
                : 'Configure facility details, communication lines, phlebotomy home collection fees, and analyzers.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الاسم الرسمي للمختبر *' : 'Laboratory Official Name *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.labName}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, labName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'اسم المدير الفني المسؤول *' : 'Lab Director / Pathologist *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.directorName}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, directorName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رابط شعار المختبر (Logo URL)' : 'Lab Logo URL'}
              </label>
              <input
                type="url"
                value={editProfileForm.logoUrl}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, logoUrl: e.target.value })}
                placeholder="https://.../logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
              </label>
              <select
                value={editProfileForm.governorate}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, governorate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-emerald-600"
              >
                {governoratesList.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الواتساب للاستفسارات' : 'WhatsApp Line'}
              </label>
              <input
                type="tel"
                value={editProfileForm.whatsapp}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, whatsapp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'ساعات العمل اليومية *' : 'Daily Working Hours *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.workingHours}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, workingHours: e.target.value })}
                placeholder="8:00 AM - 10:00 PM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'عنوان المختبر بالتفصيل *' : 'Full Street Address *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.address}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                placeholder="بغداد، الكرادة، ساحة الواثق"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Home size={15} />
                  <span>{language === 'ar' ? 'خدمة سحب العينات المنزلية' : 'Home Sample Phlebotomy Service'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={editProfileForm.homeCollectionAvailable}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, homeCollectionAvailable: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </div>

              {editProfileForm.homeCollectionAvailable && (
                <div className="mt-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'أجور خدمة السحب المنزلي (دينار عراقي)' : 'Home Collection Visit Fee (IQD)'}
                  </label>
                  <input
                    type="number"
                    step={1000}
                    value={editProfileForm.homeCollectionFee}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, homeCollectionFee: Number(e.target.value) })}
                    className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'قائمة الأجهزة والتقنيات المخبرية (مفصولة بفواصل) *' : 'Laboratory Analyzers (Comma-separated) *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.equipmentInput}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, equipmentInput: e.target.value })}
                placeholder="Sysmex Hematology, Roche Cobas, Abbott Architect"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'نبذة تعريفية بالمختبر ومعايير الجودة' : 'Laboratory Bio & Quality Certifications'}
              </label>
              <textarea
                rows={3}
                value={editProfileForm.bio}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
                placeholder={language === 'ar' ? 'مختبر تخصصي حاصل على اعتمادات الجودة...' : 'Leading clinical diagnostic facility...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {language === 'ar' ? 'الاعتماد المركزي محمي وموثق في Firestore' : 'Accredited through central governance'}
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Save size={16} />
              <span>{language === 'ar' ? 'حفظ بيانات المختبر' : 'Save Lab Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* MODAL: DIRECT LAB ORDER INTAKE */}
      {showNewBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-900">
                {language === 'ar' ? 'تسجيل طلب تحليل مخبري لمراجع' : 'Intake Lab Test Order'}
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع الحضور / الخدمة *' : 'Collection Type *'}</label>
                  <select
                    value={newBookingData.bookingType}
                    onChange={(e) => setNewBookingData({ ...newBookingData, bookingType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="in_lab">{language === 'ar' ? 'حضور للمختبر' : 'In-Lab Visit'}</option>
                    <option value="home_collection">{language === 'ar' ? 'سحب منزلي متنقل' : 'Home Collection'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'القسم المخبري *' : 'Department *'}</label>
                  <select
                    value={newBookingData.category}
                    onChange={(e) => setNewBookingData({ ...newBookingData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>{language === 'ar' ? c.labelAr : c.labelEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              {newBookingData.bookingType === 'home_collection' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'عنوان المنزل بالتفصيل *' : 'Home Address *'}</label>
                  <input
                    type="text"
                    required
                    value={newBookingData.homeAddress}
                    onChange={(e) => setNewBookingData({ ...newBookingData, homeAddress: e.target.value })}
                    placeholder={language === 'ar' ? 'المنطقة، الزقاق، الدار، نقطة دالة' : 'District, street, landmark'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم التحليل المطلوب *' : 'Test Name *'}</label>
                <input
                  type="text"
                  required
                  value={newBookingData.testName}
                  onChange={(e) => setNewBookingData({ ...newBookingData, testName: e.target.value })}
                  placeholder="CBC, HbA1c, Lipid Profile..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
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
                    placeholder="09:30 AM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'ملاحظات إضافية أو إحالة الطبيب' : 'Referral Notes'}</label>
                <textarea
                  rows={2}
                  value={newBookingData.notes}
                  onChange={(e) => setNewBookingData({ ...newBookingData, notes: e.target.value })}
                  placeholder={language === 'ar' ? 'متابعة دورية، فقر دم، مراقبة جرعة العلاج...' : 'Clinical notes...'}
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
                  className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد الحجز' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESCHEDULE LAB TEST */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              {language === 'ar' ? `إعادة جدولة تحليل: ${reschedulingBooking.patientName}` : `Reschedule: ${reschedulingBooking.patientName}`}
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
                  placeholder={language === 'ar' ? 'مثال: السبت 2026/10/31 الساعة 8:30 صباحاً' : 'e.g. Saturday Oct 31 at 8:30 AM'}
                  value={rescheduleData.newDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'السبب' : 'Reason'}</label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'عدم اكتمال الصيام 12 ساعة / وصول كاشف التحليل' : 'Fasting duration incomplete'}
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

      {/* MODAL: CANCEL LAB TEST */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              {language === 'ar' ? `إلغاء طلب تحليل: ${cancellingBooking.patientName}` : `Cancel Order: ${cancellingBooking.patientName}`}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' ? 'سيتم إشعار المراجع بسبب الإلغاء وتعديل حالة السجل.' : 'Patient will be alerted and booking status set to cancelled.'}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'سبب الإلغاء' : 'Cancellation Reason'}</label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'تعذر الحضور / اعتذار المختبر...' : 'Patient requested cancellation...'}
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

      {/* MODAL: ADD LAB TEST CATALOG ITEM */}
      {showNewTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              {language === 'ar' ? 'إضافة تحليل جديد لدليل المختبر' : 'Add Test to Catalog'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' ? 'حدد اسم التحليل، نوع العينة، الأجور وشروط الصيام.' : 'Define test panel details and protocols.'}
            </p>

            <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم التحليل *' : 'Test Name *'}</label>
                <input
                  type="text"
                  required
                  value={newTestData.name}
                  onChange={(e) => setNewTestData({ ...newTestData, name: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: فحص وظائف الكبد (LFT)' : 'e.g. Liver Function Test'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'القسم المخبري *' : 'Category *'}</label>
                  <select
                    value={newTestData.category}
                    onChange={(e) => setNewTestData({ ...newTestData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>{language === 'ar' ? c.labelAr : c.labelEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'السعر (دينار عراقي) *' : 'Price (IQD) *'}</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newTestData.price}
                    onChange={(e) => setNewTestData({ ...newTestData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع العينة والأنبوب *' : 'Sample Tube / Type *'}</label>
                <input
                  type="text"
                  required
                  value={newTestData.sampleType}
                  onChange={(e) => setNewTestData({ ...newTestData, sampleType: e.target.value })}
                  placeholder="Serum (Gel Tube) / EDTA Blood"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تعليمات الصيام والتحضير' : 'Fasting Instructions'}</label>
                <input
                  type="text"
                  value={newTestData.fastingInstructions}
                  onChange={(e) => setNewTestData({ ...newTestData, fastingInstructions: e.target.value })}
                  placeholder="صيام 8 ساعات، شرب ماء كافي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الوقت المقدر (ساعات)' : 'Turnaround (Hours)'}</label>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={newTestData.estimatedHours}
                    onChange={(e) => setNewTestData({ ...newTestData, estimatedHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="homeSupp"
                    checked={newTestData.homeCollectionSupported}
                    onChange={(e) => setNewTestData({ ...newTestData, homeCollectionSupported: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="homeSupp" className="font-bold text-slate-700">
                    {language === 'ar' ? 'يدعم السحب المنزلي' : 'Home visit ok'}
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTestModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold"
                >
                  {language === 'ar' ? 'إضافة الفحص' : 'Save Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH DETAILED LAB RESULT */}
      {showNewResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {language === 'ar' ? 'صياغة واعتماد تقرير النتيجة المخبرية' : 'Publish Diagnostic Laboratory Report'}
                </h3>
                <span className="text-xs text-slate-500">
                  {language === 'ar' ? 'ربط مباشر بملف المريض برقم UID مشفر' : 'Direct linkage to patient medical record'}
                </span>
              </div>
              <button
                onClick={() => setShowNewResultModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishResult} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم المريض *' : 'Patient Name *'}</label>
                  <input
                    type="text"
                    required
                    value={newResultData.patientName}
                    onChange={(e) => setNewResultData({ ...newResultData, patientName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم الفحص *' : 'Test Name *'}</label>
                  <input
                    type="text"
                    required
                    value={newResultData.testName}
                    onChange={(e) => setNewResultData({ ...newResultData, testName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع العينة' : 'Sample Type'}</label>
                  <input
                    type="text"
                    value={newResultData.sampleType}
                    onChange={(e) => setNewResultData({ ...newResultData, sampleType: e.target.value })}
                    placeholder="EDTA Whole Blood"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Dynamic Parameters Grid */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900">{language === 'ar' ? 'معاملات ونتائج التحليل (Test Parameters)' : 'Test Parameters & Values'}</span>
                  <button
                    type="button"
                    onClick={handleAddParameterRow}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>{language === 'ar' ? 'إضافة معامل' : 'Add Row'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newResultData.parameters.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder={language === 'ar' ? 'اسم المعامل (مثل Hb)' : 'Parameter'}
                          value={p.name}
                          onChange={(e) => handleUpdateParameter(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder={language === 'ar' ? 'النتيجة (14.2)' : 'Value'}
                          value={p.value}
                          onChange={(e) => handleUpdateParameter(idx, 'value', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder={language === 'ar' ? 'الوحدة (g/dL)' : 'Unit'}
                          value={p.unit}
                          onChange={(e) => handleUpdateParameter(idx, 'unit', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder={language === 'ar' ? 'المعدل (13.0 - 17.0)' : 'Reference Range'}
                          value={p.referenceRange}
                          onChange={(e) => handleUpdateParameter(idx, 'referenceRange', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          value={p.status}
                          onChange={(e) => handleUpdateParameter(idx, 'status', e.target.value)}
                          className="w-full px-1 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                        >
                          <option value="normal">طبيعي</option>
                          <option value="high">مرتفع</option>
                          <option value="low">منخفض</option>
                          <option value="abnormal">غير سليم</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveParameter(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الملاحظات والتعليق المخبري' : 'Laboratory Comments'}</label>
                <textarea
                  rows={2}
                  value={newResultData.notes}
                  onChange={(e) => setNewResultData({ ...newResultData, notes: e.target.value })}
                  placeholder={language === 'ar' ? 'العينة مطابقة لمعايير الجودة...' : 'Comments...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {/* Attach Scan / Electrophoresis Strip */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">{language === 'ar' ? 'إرفاق صورة شريط التحليل أو المجهر' : 'Attach Scan / Lab Strip'}</span>
                  <span className="text-[11px] text-slate-500">{language === 'ar' ? 'صورة شريط الفصل الكهربائي أو الترحيل' : 'Microscopic or analyzer strip'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>{language === 'ar' ? 'رفع ملف' : 'Upload'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScanUpload}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم اختصاصي التحليلات المرضية *' : 'Signing Pathologist *'}</label>
                  <input
                    type="text"
                    required
                    value={newResultData.pathologistName}
                    onChange={(e) => setNewResultData({ ...newResultData, pathologistName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'رقم الإجازة المهنية' : 'License ID'}</label>
                  <input
                    type="text"
                    value={newResultData.pathologistLicense}
                    onChange={(e) => setNewResultData({ ...newResultData, pathologistLicense: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">
                  {language === 'ar' ? 'سيتم إشعار المريض وتحديث حالة العينة إلى مكتملة' : 'Patient will be alerted and sample set complete'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewResultModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold"
                  >
                    {language === 'ar' ? 'اعتماد ونشر النتيجة' : 'Certify & Release'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL LAB RESULT PDF VIEWER & PRINT MODAL */}
      {viewingResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-10 border border-slate-200 shadow-2xl my-8 relative">
            {/* Top Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                  <ShieldCheck size={14} />
                  <span>{language === 'ar' ? 'نتيجة مخبرية معتمدة وموثقة في Firestore' : 'Certified Record'}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {viewingResultModal.id}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer size={15} />
                  <span>{language === 'ar' ? 'طباعة النتيجة / حفظ PDF' : 'Print / Save PDF'}</span>
                </button>
                <button
                  onClick={() => setViewingResultModal(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE OFFICIAL MEDICAL DOCUMENT */}
            <div className="space-y-6 text-slate-900">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {labProfile?.labName || viewingResultModal.labName}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5 font-semibold">
                    {language === 'ar' ? 'مختبر تخصصي للتحليلات المرضية والتشخيص الجزيئي' : 'Clinical Diagnostic & Pathology Laboratory'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {labProfile?.address} · {labProfile?.phone} · ترخيص وزارة الصحة: {labProfile?.licenseNumber || 'LAB-IQ'}
                  </p>
                </div>

                <div className="text-end">
                  <div className="text-sm font-black text-[#003366]">M737 MEDICAL PLATFORM</div>
                  <div className="text-[10px] text-slate-400">منظومة الرعاية الصحية الرقمية</div>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                    LABORATORY REPORT
                  </div>
                </div>
              </div>

              {/* Patient Info Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'اسم المراجع:' : 'Patient Name:'}</span>
                  <span className="font-bold text-slate-900">{viewingResultModal.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'تاريخ الفحص:' : 'Date:'}</span>
                  <span className="font-mono font-bold text-slate-900">{viewingResultModal.createdAt.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'اسم الفحص:' : 'Test Name:'}</span>
                  <span className="font-bold text-slate-900">{viewingResultModal.testName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'نوع العينة:' : 'Sample Type:'}</span>
                  <span className="font-mono font-bold text-emerald-800">{viewingResultModal.sampleType}</span>
                </div>
              </div>

              {/* Parameters Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  {language === 'ar' ? 'النتائج المخبرية التفصيلية (Analytical Findings)' : 'Analytical Findings'}
                </h3>
                
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">{language === 'ar' ? 'المعامل (Parameter)' : 'Parameter'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'النتيجة (Result)' : 'Result'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'الوحدة (Unit)' : 'Unit'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'المعدل الطبيعي (Reference)' : 'Reference Range'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingResultModal.parameters.map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-800">{p.name}</td>
                        <td className={`p-2.5 font-mono font-black ${
                          p.status === 'abnormal' || p.status === 'high' ? 'text-red-600' : p.status === 'low' ? 'text-amber-600' : 'text-slate-900'
                        }`}>
                          {p.value}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">{p.unit}</td>
                        <td className="p-2.5 font-mono text-slate-600">{p.referenceRange}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lab Comments */}
              {viewingResultModal.notes && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <strong className="block text-slate-800 mb-0.5">{language === 'ar' ? 'تعليق المختبر وتوصيات المتابعة:' : 'Laboratory Comments:'}</strong>
                  <p className="text-slate-600 leading-relaxed">{viewingResultModal.notes}</p>
                </div>
              )}

              {/* Attached Scans or Strips */}
              {viewingResultModal.attachedScans && viewingResultModal.attachedScans.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">{language === 'ar' ? 'مرفقات التحليل المجهرية / الأشرطة:' : 'Attached Lab Strips:'}</h4>
                  <div className="flex gap-3">
                    {viewingResultModal.attachedScans.map((img, i) => (
                      <img key={i} src={img} alt="strip" className="h-24 rounded-lg border border-slate-200 object-cover" />
                    ))}
                  </div>
                </div>
              )}

              {/* Signature & Accreditation Bar */}
              <div className="pt-6 border-t-2 border-slate-900 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{viewingResultModal.pathologistName}</div>
                  <div className="text-[11px] text-slate-500">{language === 'ar' ? 'اختصاصي التحليلات المرضية والباثولوجيا السريرية' : 'Clinical Pathologist'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">License: {viewingResultModal.pathologistLicense}</div>
                </div>

                <div className="text-center p-2 rounded-xl border border-slate-300 bg-slate-50 text-[10px] font-mono">
                  <div className="font-bold text-emerald-800 flex items-center gap-1 justify-center">
                    <CheckCircle2 size={12} />
                    <span>M737 CERTIFIED LAB</span>
                  </div>
                  <div className="text-slate-400">UID: {viewingResultModal.patientId.slice(0, 8)}...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
