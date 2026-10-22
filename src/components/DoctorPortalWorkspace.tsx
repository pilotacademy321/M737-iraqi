import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  DoctorProfile, 
  Appointment, 
  MedicalRecord, 
  SecretaryDelegation,
  AppointmentStatus,
  MedicalRecordType
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
  Stethoscope, 
  Calendar, 
  Clock, 
  FileText, 
  Users, 
  Settings, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Phone, 
  DollarSign, 
  RefreshCw, 
  Search, 
  Filter, 
  Edit3, 
  ShieldCheck, 
  Share2, 
  ExternalLink,
  Save,
  Trash2,
  CalendarDays,
  Activity,
  Check,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface DoctorPortalWorkspaceProps {
  onBackToHome: () => void;
}

export const DoctorPortalWorkspace: React.FC<DoctorPortalWorkspaceProps> = ({ onBackToHome }) => {
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const { language, isRTL } = useLanguage();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'records' | 'schedule' | 'secretary'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Doctor Profile State
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  // New Appointment Form
  const [newApptData, setNewApptData] = useState({
    patientName: '',
    patientPhone: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '17:00',
    consultationType: 'in_person' as 'in_person' | 'followup' | 'urgent',
    notes: '',
  });

  // Reschedule Modal State
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', reason: '' });

  // Medical Records State
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [recordFilter, setRecordFilter] = useState<string>('all');
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [newRecordData, setNewRecordData] = useState({
    patientName: '',
    recordType: 'clinical_note' as MedicalRecordType,
    title: '',
    details: '',
    sourceFacility: '',
    doctorNotes: '',
  });

  // Secretary Delegations State
  const [delegations, setDelegations] = useState<SecretaryDelegation[]>([]);
  const [showNewSecretaryModal, setShowNewSecretaryModal] = useState(false);
  const [newSecretaryData, setNewSecretaryData] = useState({
    secretaryEmail: '',
    secretaryName: '',
    canManageAppointments: true,
    canViewQueue: true,
    canCollectFees: false,
  });

  // Profile Form State for Settings Tab
  const [editProfileForm, setEditProfileForm] = useState({
    fullName: '',
    specialty: '',
    subspecialty: '',
    qualifications: '',
    experienceYears: 10,
    clinicAddress: '',
    governorate: 'بغداد (Baghdad)',
    phone: '',
    whatsapp: '',
    consultationFee: 25000,
    workingDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'],
    workingHours: '4:00 PM - 9:00 PM',
    mapsUrl: '',
    bio: '',
  });

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

  const daysOfWeek = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  // Load All Doctor Data from Firestore
  const loadDoctorData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Doctor Profile
      const profRef = doc(db, 'doctor_profiles', user.uid);
      const profSnap = await getDoc(profRef);

      if (profSnap.exists()) {
        const data = profSnap.data() as DoctorProfile;
        setDoctorProfile(data);
        setEditProfileForm({
          fullName: data.fullName || userProfile?.displayName || '',
          specialty: data.specialty || 'أمراض باطنية وقلبية',
          subspecialty: data.subspecialty || '',
          qualifications: data.qualifications || 'بورد عراقي / عربي',
          experienceYears: data.experienceYears || 10,
          clinicAddress: data.clinicAddress || userProfile?.facilityName || '',
          governorate: data.governorate || userProfile?.governorate || 'بغداد (Baghdad)',
          phone: data.phone || userProfile?.phone || '',
          whatsapp: data.whatsapp || userProfile?.phone || '',
          consultationFee: data.consultationFee || 25000,
          workingDays: data.workingDays || ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'],
          workingHours: data.workingHours || '4:00 PM - 9:00 PM',
          mapsUrl: data.mapsUrl || '',
          bio: data.bio || '',
        });
      } else {
        // Initialize default doctor profile
        const initialProfile: DoctorProfile = {
          doctorId: user.uid,
          fullName: userProfile?.displayName || user.displayName || 'الدكتور المعالج',
          specialty: 'أمراض باطنية وقلبية',
          qualifications: 'بورد عراقي في الطب الباطني',
          experienceYears: 10,
          clinicAddress: userProfile?.facilityName || 'شارع الكندي، الحارثية',
          governorate: userProfile?.governorate || 'بغداد (Baghdad)',
          phone: userProfile?.phone || '07XXXXXXXXX',
          whatsapp: userProfile?.phone || '07XXXXXXXXX',
          consultationFee: 25000,
          workingDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'],
          workingHours: '4:00 PM - 9:00 PM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(profRef, initialProfile);
        setDoctorProfile(initialProfile);
      }

      // 2. Fetch Appointments for this Doctor
      const apptQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', user.uid)
      );
      const apptSnap = await getDocs(apptQuery);
      const apptList = apptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      // Sort newest first
      apptList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAppointments(apptList);

      // 3. Fetch Medical Records for this Doctor
      const recordsQuery = query(
        collection(db, 'medical_records'),
        where('doctorId', '==', user.uid)
      );
      const recordsSnap = await getDocs(recordsQuery);
      const recList = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalRecord));
      recList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMedicalRecords(recList);

      // 4. Fetch Secretary Delegations
      const delegQuery = query(
        collection(db, 'secretary_delegations'),
        where('doctorId', '==', user.uid)
      );
      const delegSnap = await getDocs(delegQuery);
      const delegList = delegSnap.docs.map(d => ({ id: d.id, ...d.data() } as SecretaryDelegation));
      setDelegations(delegList);

    } catch (err: unknown) {
      console.error('Error loading doctor workspace:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [user]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Appointment Actions
  const handleUpdateAppointmentStatus = async (apptId: string, status: AppointmentStatus) => {
    try {
      const ref = doc(db, 'appointments', apptId);
      await updateDoc(ref, {
        status,
        updatedAt: new Date().toISOString(),
      });
      showToast(
        language === 'ar' ? `تم تحديث حالة الموعد إلى: ${status}` : `Appointment updated to: ${status}`
      );
      await loadDoctorData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${apptId}`);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingAppt || !rescheduleData.newDate) return;
    try {
      const ref = doc(db, 'appointments', reschedulingAppt.id);
      await updateDoc(ref, {
        status: 'rescheduled',
        rescheduleProposedDate: rescheduleData.newDate,
        rescheduleReason: rescheduleData.reason || 'الموعد المعاد جدولته بناء على توصية الطبيب',
        updatedAt: new Date().toISOString(),
      });
      showToast(
        language === 'ar' ? 'تم حفظ طلب إعادة الجدولة وإبلاغ المريض' : 'Reschedule request saved'
      );
      setReschedulingAppt(null);
      setRescheduleData({ newDate: '', reason: '' });
      await loadDoctorData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${reschedulingAppt.id}`);
    }
  };

  // Create In-Clinic / Phone Appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newApptData.patientName.trim()) return;

    try {
      const apptId = `appt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const appt: Appointment = {
        id: apptId,
        doctorId: user.uid,
        patientId: `pat_${Date.now()}`,
        patientName: newApptData.patientName,
        patientPhone: newApptData.patientPhone || '07XXXXXXXXX',
        doctorName: doctorProfile?.fullName || userProfile?.displayName || 'الطبيب المعالج',
        specialty: doctorProfile?.specialty || 'استشارة عامة',
        date: newApptData.date,
        timeSlot: newApptData.timeSlot,
        status: 'confirmed',
        consultationType: newApptData.consultationType,
        notes: newApptData.notes,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'appointments', apptId), appt);
      showToast(
        language === 'ar' ? 'تم تسجيل وتأكيد الموعد بنجاح في قاعدة البيانات' : 'Appointment registered'
      );
      setShowNewAppointmentModal(false);
      setNewApptData({
        patientName: '',
        patientPhone: '',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '17:00',
        consultationType: 'in_person',
        notes: '',
      });
      await loadDoctorData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'appointments');
    }
  };

  // Create Medical Record
  const handleCreateMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRecordData.patientName.trim() || !newRecordData.title.trim()) return;

    try {
      const recordId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const record: MedicalRecord = {
        id: recordId,
        patientId: `pat_rec_${Date.now()}`,
        patientName: newRecordData.patientName,
        doctorId: user.uid,
        recordType: newRecordData.recordType,
        title: newRecordData.title,
        details: newRecordData.details,
        sourceFacility: newRecordData.sourceFacility || doctorProfile?.clinicAddress || 'عيادة الطبيب المعتمدة',
        doctorNotes: newRecordData.doctorNotes,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'medical_records', recordId), record);
      showToast(
        language === 'ar' ? 'تم حفظ التقرير الطبي وتوثيقه في السجل المشفر' : 'Medical record saved'
      );
      setShowNewRecordModal(false);
      setNewRecordData({
        patientName: '',
        recordType: 'clinical_note',
        title: '',
        details: '',
        sourceFacility: '',
        doctorNotes: '',
      });
      await loadDoctorData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'medical_records');
    }
  };

  // Create Secretary Delegation
  const handleCreateSecretaryDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSecretaryData.secretaryEmail.trim()) return;

    try {
      const delegationId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const perms: string[] = [];
      if (newSecretaryData.canManageAppointments) perms.push('canManageAppointments');
      if (newSecretaryData.canViewQueue) perms.push('canViewQueue');
      if (newSecretaryData.canCollectFees) perms.push('canCollectFees');

      const delegation: SecretaryDelegation = {
        id: delegationId,
        doctorId: user.uid,
        doctorName: doctorProfile?.fullName || userProfile?.displayName || 'الطبيب المعالج',
        secretaryEmail: newSecretaryData.secretaryEmail.toLowerCase(),
        secretaryName: newSecretaryData.secretaryName || newSecretaryData.secretaryEmail.split('@')[0],
        permissions: perms,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'secretary_delegations', delegationId), delegation);
      showToast(
        language === 'ar' ? 'تم منح صلاحيات السكرتارية بنجاح' : 'Secretary access delegated'
      );
      setShowNewSecretaryModal(false);
      setNewSecretaryData({
        secretaryEmail: '',
        secretaryName: '',
        canManageAppointments: true,
        canViewQueue: true,
        canCollectFees: false,
      });
      await loadDoctorData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'secretary_delegations');
    }
  };

  // Toggle or Revoke Secretary
  const handleToggleSecretary = async (delegationId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'revoked' : 'active';
      const ref = doc(db, 'secretary_delegations', delegationId);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // Synchronize with secretary_assignments if secretaryUid is linked
      const deleg = delegations.find(d => d.id === delegationId);
      if (deleg && deleg.secretaryUid) {
        try {
          await updateDoc(doc(db, 'secretary_assignments', deleg.secretaryUid), {
            status: newStatus,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // ignore if doc not yet created
        }
      }

      showToast(
        language === 'ar' ? `تم تعديل حالة التفويض إلى: ${newStatus}` : `Delegation status: ${newStatus}`
      );
      await loadDoctorData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `secretary_delegations/${delegationId}`);
    }
  };

  const handleDeleteSecretary = async (delegationId: string) => {
    try {
      const deleg = delegations.find(d => d.id === delegationId);
      await deleteDoc(doc(db, 'secretary_delegations', delegationId));
      if (deleg && deleg.secretaryUid) {
        try {
          await deleteDoc(doc(db, 'secretary_assignments', deleg.secretaryUid));
        } catch {
          // ignore
        }
      }
      showToast(language === 'ar' ? 'تم حذف التفويض' : 'Delegation removed');
      await loadDoctorData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `secretary_delegations/${delegationId}`);
    }
  };

  // Save Schedule & Clinic Settings
  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const now = new Date().toISOString();
      const updatedProfile: DoctorProfile = {
        doctorId: user.uid,
        fullName: editProfileForm.fullName,
        specialty: editProfileForm.specialty,
        subspecialty: editProfileForm.subspecialty,
        qualifications: editProfileForm.qualifications,
        experienceYears: Number(editProfileForm.experienceYears),
        clinicAddress: editProfileForm.clinicAddress,
        governorate: editProfileForm.governorate,
        phone: editProfileForm.phone,
        whatsapp: editProfileForm.whatsapp,
        consultationFee: Number(editProfileForm.consultationFee),
        workingDays: editProfileForm.workingDays,
        workingHours: editProfileForm.workingHours,
        mapsUrl: editProfileForm.mapsUrl,
        bio: editProfileForm.bio,
        createdAt: doctorProfile?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'doctor_profiles', user.uid), updatedProfile);

      // Also update non-privileged user profile fields
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editProfileForm.fullName,
        facilityName: editProfileForm.clinicAddress,
        governorate: editProfileForm.governorate,
        phone: editProfileForm.phone,
        updatedAt: now,
      });

      showToast(
        language === 'ar' ? 'تم حفظ إعدادات العيادة وأوقات الدوام بنجاح' : 'Clinic settings saved'
      );
      await loadDoctorData();
      await refreshProfile();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `doctor_profiles/${user.uid}`);
    }
  };

  const toggleDaySelection = (day: string) => {
    const current = editProfileForm.workingDays;
    if (current.includes(day)) {
      setEditProfileForm({ ...editProfileForm, workingDays: current.filter(d => d !== day) });
    } else {
      setEditProfileForm({ ...editProfileForm, workingDays: [...current, day] });
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((appt) => {
    if (appointmentFilter === 'all') return true;
    return appt.status === appointmentFilter;
  });

  // Filtered Records
  const filteredRecords = medicalRecords.filter((rec) => {
    if (recordFilter === 'all') return true;
    return rec.recordType === recordFilter;
  });

  // Derived Dashboard Metrics
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

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

      {/* Doctor Brand Banner */}
      <div className="bg-gradient-to-r from-[#002244] via-[#003366] to-[#b8142a] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md shrink-0">
              <Stethoscope size={36} className="text-red-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-1.5">
                <CheckCircle2 size={13} />
                <span>{language === 'ar' ? 'طبيب اختصاص معتمد وموثق' : 'Certified Doctor'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {doctorProfile?.fullName || userProfile?.displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-200 mt-1">
                <span>{doctorProfile?.specialty || 'استشاري جراحة وباطنية'}</span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-red-300" />
                  <span>{doctorProfile?.clinicAddress || userProfile?.facilityName || 'بغداد'}</span>
                </span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1 font-mono text-emerald-300 font-bold">
                  <span>{Number(doctorProfile?.consultationFee || 25000).toLocaleString()} د.ع</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                loadDoctorData();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{language === 'ar' ? 'تحديث' : 'Sync'}</span>
            </button>
            <button
              onClick={() => setShowNewAppointmentModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-[#003366] hover:bg-slate-100 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'تسجيل كشفية / موعد' : 'New Appointment'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Doctor Workspace Tabs Navigation */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-200/80 rounded-2xl overflow-x-auto text-xs font-bold">
        {[
          { id: 'dashboard', labelAr: 'لوحة المؤشرات', labelEn: 'Dashboard', icon: Activity },
          { id: 'appointments', labelAr: `المواعيد (${appointments.length})`, labelEn: `Appointments (${appointments.length})`, icon: Calendar },
          { id: 'records', labelAr: `السجلات والتقارير (${medicalRecords.length})`, labelEn: `Medical Records (${medicalRecords.length})`, icon: FileText },
          { id: 'schedule', labelAr: 'الدوام ومعلومات العيادة', labelEn: 'Schedule & Clinic', icon: Clock },
          { id: 'secretary', labelAr: `السكرتارية (${delegations.length})`, labelEn: `Secretary (${delegations.length})`, icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#003366] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-[#c4152e]' : 'text-slate-400'} />
              <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              {tab.id === 'appointments' && pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-mono">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block mb-1 font-semibold">{language === 'ar' ? 'إجمالي المواعيد' : 'Total Bookings'}</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{appointments.length}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">{language === 'ar' ? 'في قاعدة بيانات Firestore' : 'Live database'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs">
              <span className="text-xs text-amber-700 block mb-1 font-semibold">{language === 'ar' ? 'بانتظار الموافقة' : 'Pending Requests'}</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">{pendingCount}</div>
              <span className="text-[11px] text-amber-600 mt-1 block">{language === 'ar' ? 'تتطلب قرار الطبيب' : 'Action required'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs">
              <span className="text-xs text-emerald-700 block mb-1 font-semibold">{language === 'ar' ? 'مواعيد مؤكدة قادمة' : 'Confirmed Visits'}</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">{confirmedCount}</div>
              <span className="text-[11px] text-emerald-600 mt-1 block">{language === 'ar' ? 'جاهزة للاستقبال' : 'Scheduled queue'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-xs">
              <span className="text-xs text-blue-700 block mb-1 font-semibold">{language === 'ar' ? 'السجلات الطبية المؤرشفة' : 'Medical Records'}</span>
              <div className="text-2xl sm:text-3xl font-black text-blue-800 font-mono">{medicalRecords.length}</div>
              <span className="text-[11px] text-blue-600 mt-1 block">{language === 'ar' ? 'تحاليل وتقارير وكشوفات' : 'Confidential reports'}</span>
            </div>
          </div>

          {/* Pending Requests Alert */}
          {pendingCount > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={22} className="text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">
                    {language === 'ar' ? `لديك (${pendingCount}) طلبات مواعيد جديدة بحاجة لتأكيدك` : `You have (${pendingCount}) pending appointment requests`}
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {language === 'ar' ? 'يمكنك قبول الطلبات أو اقتراح موعد بديل فوراً.' : 'Review requests to confirm or propose a reschedule.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAppointmentFilter('pending');
                  setActiveTab('appointments');
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0"
              >
                {language === 'ar' ? 'مراجعة الطلبات الآن' : 'Review Requests'}
              </button>
            </div>
          )}

          {/* 2-Column Split: Today's Appointments & Recent Medical Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Upcoming Appointments List */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-[#c4152e]" />
                  <h3 className="font-bold text-base text-slate-900">{language === 'ar' ? 'المواعيد القادمة' : 'Upcoming Consultations'}</h3>
                </div>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-xs font-bold text-[#003366] hover:underline"
                >
                  {language === 'ar' ? 'عرض الكل' : 'View All'}
                </button>
              </div>

              {appointments.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Calendar size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{language === 'ar' ? 'لا توجد مواعيد مسجلة حالياً' : 'No appointments scheduled'}</p>
                  <button
                    onClick={() => setShowNewAppointmentModal(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    {language === 'ar' ? 'تسجيل أول موعد' : 'Book First Appointment'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 5).map((appt) => (
                    <div
                      key={appt.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-[#c4152e] flex items-center justify-center font-bold text-xs shrink-0">
                          {appt.timeSlot}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{appt.patientName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{appt.date}</span>
                            <span>·</span>
                            <span className="font-mono">{appt.patientPhone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : appt.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : appt.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {appt.status}
                        </span>
                        {appt.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateAppointmentStatus(appt.id, 'completed')}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            title="اكتمال الكشف"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Medical Records / Notes */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#003366]" />
                    <h3 className="font-bold text-base text-slate-900">{language === 'ar' ? 'أحدث التقارير الطبية' : 'Recent Patient Reports'}</h3>
                  </div>
                  <button
                    onClick={() => setShowNewRecordModal(true)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {medicalRecords.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FileText size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">{language === 'ar' ? 'لا توجد تقارير مخبرية أو شعاعية محفوظة' : 'No records yet'}</p>
                    <button
                      onClick={() => setShowNewRecordModal(true)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      {language === 'ar' ? 'إضافة تقرير فحص / روشتة' : 'Add Medical Entry'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medicalRecords.slice(0, 4).map((rec) => (
                      <div key={rec.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 truncate">{rec.title}</span>
                          <span className="text-[10px] text-slate-400">{rec.createdAt.split('T')[0]}</span>
                        </div>
                        <div className="text-slate-600 flex items-center justify-between">
                          <span>{rec.patientName}</span>
                          <span className="font-semibold text-blue-700 capitalize">{rec.recordType.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{language === 'ar' ? 'حماية البيانات: مشفرة بالكامل' : 'Protected Patient Data'}</span>
                <button
                  onClick={() => setActiveTab('records')}
                  className="font-bold text-[#003366] hover:underline"
                >
                  {language === 'ar' ? 'فتح الأرشيف الكامل' : 'Open Archive'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENTS WORKFLOW */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'جدول المواعيد والاستشارات' : 'Appointment Schedule & Queue'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'إدارة حجوزات المراجعين، قبول الطلبات أو طلب إعادة جدولتها، وتأكيد اكتمال الكشف.'
                  : 'Manage patient bookings, confirm requests, propose reschedules, and record visits.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewAppointmentModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#c4152e] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'تسجيل موعد جديد' : 'New Appointment'}</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { id: 'all', label: language === 'ar' ? 'كافة المواعيد' : 'All' },
              { id: 'pending', label: language === 'ar' ? `بانتظار الموافقة (${pendingCount})` : `Pending (${pendingCount})` },
              { id: 'confirmed', label: language === 'ar' ? `مؤكدة (${confirmedCount})` : `Confirmed (${confirmedCount})` },
              { id: 'completed', label: language === 'ar' ? `مكتملة (${completedCount})` : `Completed (${completedCount})` },
              { id: 'cancelled', label: language === 'ar' ? 'ملغاة' : 'Cancelled' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAppointmentFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  appointmentFilter === f.id
                    ? 'bg-[#003366] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Appointments Table / Cards */}
          {filteredAppointments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا توجد مواعيد تطابق الفلتر' : 'No appointments matching filter'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'يمكنك تسجيل مواعيد يدوية للعيادة أو استقبال الحجوزات السحابية' : 'Create appointments or wait for patient bookings'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#003366] flex flex-col items-center justify-center font-bold text-xs shrink-0">
                      <span>{appt.date.split('-')[1]}/{appt.date.split('-')[2]}</span>
                      <span className="text-[10px] text-slate-400">{appt.timeSlot}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">{appt.patientName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : appt.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : appt.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : appt.status === 'rescheduled'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {appt.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span className="font-mono">{appt.patientPhone}</span>
                        <span>·</span>
                        <span>{appt.consultationType || 'معاينة بالعيادة'}</span>
                        {appt.notes && (
                          <>
                            <span>·</span>
                            <span className="text-slate-600 italic">"{appt.notes}"</span>
                          </>
                        )}
                      </div>

                      {appt.rescheduleProposedDate && (
                        <div className="mt-2 text-xs text-purple-800 bg-purple-50 p-2 rounded-lg">
                          <strong>{language === 'ar' ? 'الموعد المقترح للجدولة:' : 'Proposed Date:'}</strong> {appt.rescheduleProposedDate} ({appt.rescheduleReason})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {appt.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateAppointmentStatus(appt.id, 'confirmed')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Check size={14} />
                          <span>{language === 'ar' ? 'تأكيد وقبول' : 'Confirm'}</span>
                        </button>
                        <button
                          onClick={() => setReschedulingAppt(appt)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors"
                        >
                          {language === 'ar' ? 'إعادة جدولة' : 'Reschedule'}
                        </button>
                        <button
                          onClick={() => handleUpdateAppointmentStatus(appt.id, 'cancelled')}
                          className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs transition-colors"
                        >
                          {language === 'ar' ? 'اعتذار / رفض' : 'Reject'}
                        </button>
                      </>
                    )}

                    {appt.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleUpdateAppointmentStatus(appt.id, 'completed')}
                          className="px-4 py-1.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          <span>{language === 'ar' ? 'اكتمال الكشف الطبي' : 'Mark Completed'}</span>
                        </button>
                        <button
                          onClick={() => setReschedulingAppt(appt)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs"
                        >
                          {language === 'ar' ? 'تأجيل' : 'Reschedule'}
                        </button>
                      </>
                    )}

                    {appt.status === 'completed' && (
                      <button
                        onClick={() => {
                          setNewRecordData({
                            patientName: appt.patientName,
                            recordType: 'clinical_note',
                            title: `كشف واستشارة ${appt.patientName}`,
                            details: `تمت المعاينة السريرية في العيادة بتاريخ ${appt.date}.`,
                            sourceFacility: doctorProfile?.clinicAddress || '',
                            doctorNotes: '',
                          });
                          setShowNewRecordModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5"
                      >
                        <FileText size={14} />
                        <span>{language === 'ar' ? 'إصدار روشتة / تقرير' : 'Create Record'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEDICAL RECORDS & LAB RESULTS */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'السجلات الطبية والتقارير المحالة' : 'Diagnostic Records & Patient Files'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'استعراض نتائج المختبرات السريرية، تقارير مراكز الأشعة والسونار، والوصفات الطبية المشفرة.'
                  : 'Review certified pathology results, radiology scans, and electronic prescriptions.'}
              </p>
            </div>

            <button
              onClick={() => setShowNewRecordModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة تقرير / روشتة جديدة' : 'Add New Record'}</span>
            </button>
          </div>

          {/* Record Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { id: 'all', label: language === 'ar' ? 'كافة السجلات' : 'All Records' },
              { id: 'lab_result', label: language === 'ar' ? 'تحاليل مخبرية' : 'Lab Tests' },
              { id: 'radiology_report', label: language === 'ar' ? 'أشعة وسونار' : 'Radiology & Scans' },
              { id: 'prescription', label: language === 'ar' ? 'روشتات إلكترونية' : 'e-Prescriptions' },
              { id: 'clinical_note', label: language === 'ar' ? 'تشخيص وملاحظات' : 'Clinical Notes' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRecordFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  recordFilter === f.id
                    ? 'bg-[#003366] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Records Grid */}
          {filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا توجد تقارير في هذا التصنيف' : 'No records found'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'يمكنك تسجيل التشخيص والوصفة لمرضاك وحفظها سحابياً' : 'Add notes or prescriptions for patients'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 capitalize">
                        {rec.recordType.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">{rec.createdAt.split('T')[0]}</span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 mb-1">{rec.title}</h4>
                    <div className="text-xs font-semibold text-slate-600 mb-2">
                      {language === 'ar' ? 'المريض:' : 'Patient:'} {rec.patientName}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 mb-3 whitespace-pre-line">
                      {rec.details}
                    </p>

                    {rec.doctorNotes && (
                      <div className="text-xs text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-100 mb-2">
                        <strong>{language === 'ar' ? 'توصيات الطبيب:' : 'Doctor Commentary:'}</strong> {rec.doctorNotes}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate">{rec.sourceFacility || 'منشأة معتمدة'}</span>
                    <span className="text-emerald-700 font-bold">{language === 'ar' ? 'موثق رسمياً' : 'Verified'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCHEDULE & CLINIC SETTINGS */}
      {activeTab === 'schedule' && (
        <form onSubmit={handleSaveProfileSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'إعدادات العيادة، أوقات العمل والأجور' : 'Clinic Hours, Address & Consultation Fees'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar'
                ? 'تحديث بيانات عيادتك، أيام الدوام، وأجور المعاينة لتمكين المرضى من الحجز بدقة.'
                : 'Configure clinic hours, active days, consultation fee, and location.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الاسم المهني للطبيب *' : 'Doctor Full Professional Name *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.fullName}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الاختصاص الرئيسي *' : 'Medical Specialty *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.specialty}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, specialty: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الاختصاص الدقيق / الفرعي' : 'Subspecialty'}
              </label>
              <input
                type="text"
                value={editProfileForm.subspecialty}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, subspecialty: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: قسطرة تداخلية، جراحة مناظير' : 'e.g. Interventional Cardiology'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'المؤهلات والشهادات *' : 'Qualifications & Fellowships *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.qualifications}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, qualifications: e.target.value })}
                placeholder={language === 'ar' ? 'بورد عراقي / عربي، زميل كلية الجراحين الملكية' : 'Iraqi/Arab Board, FRCS'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'أجر المعاينة / الكشفية (دينار عراقي) *' : 'Consultation Fee (IQD) *'}
              </label>
              <input
                type="number"
                required
                min={0}
                step={5000}
                value={editProfileForm.consultationFee}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, consultationFee: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
              </label>
              <select
                value={editProfileForm.governorate}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, governorate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] bg-white"
              >
                {governoratesList.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'عنوان العيادة التفصيلي *' : 'Detailed Clinic Address *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.clinicAddress}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, clinicAddress: e.target.value })}
                placeholder={language === 'ar' ? 'بغداد، الحارثية، شارع الكندي، مجمع النخيل الطبي، الطابق الثالث' : 'Baghdad, Al-Kindi St, Al-Nakheel Complex'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الهاتف للعيادة *' : 'Clinic Phone *'}
              </label>
              <input
                type="tel"
                required
                value={editProfileForm.phone}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الواتساب للاستفسارات' : 'WhatsApp Line'}
              </label>
              <input
                type="tel"
                value={editProfileForm.whatsapp}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, whatsapp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'ساعات الدوام اليومي *' : 'Working Hours Window *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.workingHours}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, workingHours: e.target.value })}
                placeholder="4:00 PM - 9:00 PM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رابط الموقع على خرائط Google' : 'Google Maps Location URL'}
              </label>
              <input
                type="url"
                value={editProfileForm.mapsUrl}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, mapsUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            {/* Days of Week Checkboxes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {language === 'ar' ? 'أيام الاستقبال بالعيادة:' : 'Active Clinic Days:'}
              </label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => {
                  const isSelected = editProfileForm.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDaySelection(day)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#003366] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'نبذة تعريفية للمرضى' : 'Doctor Bio & Summary'}
              </label>
              <textarea
                rows={3}
                value={editProfileForm.bio}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
                placeholder={language === 'ar' ? 'اكتب نبذة عن مسيرتك المهنية ومجالات التخصص...' : 'Brief summary of expertise...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {language === 'ar' ? 'حالة الحساب وترخيص النقابة محمي وموثق سحابياً' : 'Protected accreditation fields cannot be self-elevated'}
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Save size={16} />
              <span>{language === 'ar' ? 'حفظ إعدادات العيادة' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: SECRETARY ACCESS DELEGATION */}
      {activeTab === 'secretary' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'إدارة تفويض وصلاحيات السكرتارية' : 'Clinic Secretary Delegations & Permissions'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'منح وتعديل صلاحيات سكرتير العيادة لتنظيم المواعيد، استقبال المرضى، والربط مع المراكز.'
                  : 'Grant and revoke specific reception permissions to clinic assistants.'}
              </p>
            </div>

            <button
              onClick={() => setShowNewSecretaryModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة سكرتير مصرح' : 'Delegate Secretary'}</span>
            </button>
          </div>

          {delegations.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا يوجد سكرتير مفوض حالياً' : 'No secretaries delegated'}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'يمكنك إضافة البريد الإلكتروني لمساعد العيادة لمنحه صلاحية إدارة طابور المرضى والحجوزات'
                  : 'Add your assistant’s email to delegate check-in and queue management'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {delegations.map((del) => (
                <div
                  key={del.id}
                  className="p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-slate-900">{del.secretaryName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        del.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {del.status === 'active' ? (language === 'ar' ? 'مفعل' : 'Active') : (language === 'ar' ? 'معطل' : 'Revoked')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono mt-0.5">{del.secretaryEmail}</div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {del.permissions.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {p === 'canManageAppointments' && (language === 'ar' ? 'إدارة المواعيد' : 'Manage Appointments')}
                          {p === 'canViewQueue' && (language === 'ar' ? 'طابور الانتظار' : 'Waiting Queue')}
                          {p === 'canCollectFees' && (language === 'ar' ? 'تسجيل الكشفيات' : 'Fees Ledger')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSecretary(del.id, del.status)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                        del.status === 'active'
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {del.status === 'active' ? (language === 'ar' ? 'تعليق الصلاحية' : 'Revoke') : (language === 'ar' ? 'إعادة التفعيل' : 'Activate')}
                    </button>
                    <button
                      onClick={() => handleDeleteSecretary(del.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف التفويض"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NEW APPOINTMENT */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-900">
                {language === 'ar' ? 'تسجيل موعد استشارة جديدة' : 'Register New Consultation'}
              </h3>
              <button
                onClick={() => setShowNewAppointmentModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم المريض *' : 'Patient Name *'}</label>
                <input
                  type="text"
                  required
                  value={newApptData.patientName}
                  onChange={(e) => setNewApptData({ ...newApptData, patientName: e.target.value })}
                  placeholder={language === 'ar' ? 'محمد جاسم حسين' : 'Patient Full Name'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#003366]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'رقم الهاتف (واتساب)' : 'Phone Number'}</label>
                <input
                  type="tel"
                  value={newApptData.patientPhone}
                  onChange={(e) => setNewApptData({ ...newApptData, patientPhone: e.target.value })}
                  placeholder="07XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'التاريخ *' : 'Date *'}</label>
                  <input
                    type="date"
                    required
                    value={newApptData.date}
                    onChange={(e) => setNewApptData({ ...newApptData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الوقت *' : 'Time *'}</label>
                  <input
                    type="time"
                    required
                    value={newApptData.timeSlot}
                    onChange={(e) => setNewApptData({ ...newApptData, timeSlot: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع الكشفية' : 'Visit Type'}</label>
                <select
                  value={newApptData.consultationType}
                  onChange={(e) => setNewApptData({ ...newApptData, consultationType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="in_person">{language === 'ar' ? 'معاينة جديدة بالعيادة' : 'New In-Person Visit'}</option>
                  <option value="followup">{language === 'ar' ? 'مراجعة وتدقيق تحاليل' : 'Follow-up'}</option>
                  <option value="urgent">{language === 'ar' ? 'حالة مستعجلة' : 'Urgent Case'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'ملاحظات أولية' : 'Notes'}</label>
                <textarea
                  rows={2}
                  value={newApptData.notes}
                  onChange={(e) => setNewApptData({ ...newApptData, notes: e.target.value })}
                  placeholder={language === 'ar' ? 'أعراض، تاريخ سابق...' : 'Symptoms or history...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAppointmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c4152e] text-white font-bold"
                >
                  {language === 'ar' ? 'حفظ وتأكيد الموعد' : 'Save & Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESCHEDULE */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              {language === 'ar' ? `إعادة جدولة موعد: ${reschedulingAppt.patientName}` : `Reschedule: ${reschedulingAppt.patientName}`}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' ? `الموعد الحالي: ${reschedulingAppt.date} الساعة ${reschedulingAppt.timeSlot}` : `Current: ${reschedulingAppt.date} at ${reschedulingAppt.timeSlot}`}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الموعد البديل المقترح *' : 'Proposed New Date/Time *'}</label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: الأربعاء 2026/10/28 الساعة 6:00 م' : 'e.g. Wednesday Oct 28 at 6:00 PM'}
                  value={rescheduleData.newDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'السبب' : 'Reason'}</label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'عملية طارئة / مؤتمر طبي' : 'Urgent surgical case'}
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReschedulingAppt(null)}
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

      {/* MODAL: NEW MEDICAL RECORD */}
      {showNewRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-900">
                {language === 'ar' ? 'توثيق تقرير طبي / روشتة إلكترونية' : 'Add Medical Record / Prescription'}
              </h3>
              <button
                onClick={() => setShowNewRecordModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMedicalRecord} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم المريض *' : 'Patient Name *'}</label>
                <input
                  type="text"
                  required
                  value={newRecordData.patientName}
                  onChange={(e) => setNewRecordData({ ...newRecordData, patientName: e.target.value })}
                  placeholder={language === 'ar' ? 'اسم المراجع' : 'Patient Name'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع السجل *' : 'Record Type *'}</label>
                  <select
                    value={newRecordData.recordType}
                    onChange={(e) => setNewRecordData({ ...newRecordData, recordType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="clinical_note">{language === 'ar' ? 'تشخيص وملاحظات سريرية' : 'Clinical Diagnosis'}</option>
                    <option value="prescription">{language === 'ar' ? 'روشتة علاجية' : 'e-Prescription'}</option>
                    <option value="lab_result">{language === 'ar' ? 'نتائج فحص مخبري' : 'Lab Result'}</option>
                    <option value="radiology_report">{language === 'ar' ? 'تقرير أشعة وسونار' : 'Radiology Report'}</option>
                    <option value="diagnostic_summary">{language === 'ar' ? 'ملخص خروج / تقرير شامل' : 'Summary Report'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'عنوان التقرير *' : 'Title *'}</label>
                  <input
                    type="text"
                    required
                    value={newRecordData.title}
                    onChange={(e) => setNewRecordData({ ...newRecordData, title: e.target.value })}
                    placeholder={language === 'ar' ? 'مثال: فحص وظائف الكبد / روشتة ضغط' : 'e.g. ECG Analysis'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تفاصيل التقرير والتشخيص / العلاج *' : 'Clinical Details & Prescribed Drugs *'}</label>
                <textarea
                  rows={4}
                  required
                  value={newRecordData.details}
                  onChange={(e) => setNewRecordData({ ...newRecordData, details: e.target.value })}
                  placeholder={language === 'ar' ? 'التشخيص، الجرعات، التوصيات الطبية...' : 'Diagnosis, dosage, clinical findings...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'المنشأة المصدرة' : 'Facility'}</label>
                <input
                  type="text"
                  value={newRecordData.sourceFacility}
                  onChange={(e) => setNewRecordData({ ...newRecordData, sourceFacility: e.target.value })}
                  placeholder={doctorProfile?.clinicAddress || 'عيادة الطبيب'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRecordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#003366] text-white font-bold"
                >
                  {language === 'ar' ? 'حفظ السجل في الأرشيف' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW SECRETARY DELEGATION */}
      {showNewSecretaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              {language === 'ar' ? 'تفويض سكرتير عيادة جديد' : 'Delegate Clinic Secretary'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' ? 'أدخل البريد الإلكتروني لمساعد العيادة وحدد الصلاحيات الممنوحة.' : 'Specify assistant email and assign operational permissions.'}
            </p>

            <form onSubmit={handleCreateSecretaryDelegation} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'البريد الإلكتروني للسكرتير *' : 'Secretary Email *'}</label>
                <input
                  type="email"
                  required
                  value={newSecretaryData.secretaryEmail}
                  onChange={(e) => setNewSecretaryData({ ...newSecretaryData, secretaryEmail: e.target.value })}
                  placeholder="assistant@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم السكرتير / المساعد' : 'Secretary Name'}</label>
                <input
                  type="text"
                  value={newSecretaryData.secretaryName}
                  onChange={(e) => setNewSecretaryData({ ...newSecretaryData, secretaryName: e.target.value })}
                  placeholder={language === 'ar' ? 'سارة علي' : 'Assistant Name'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-700">{language === 'ar' ? 'الصلاحيات الممنوحة:' : 'Assigned Permissions:'}</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSecretaryData.canManageAppointments}
                    onChange={(e) => setNewSecretaryData({ ...newSecretaryData, canManageAppointments: e.target.checked })}
                    className="rounded text-[#003366]"
                  />
                  <span>{language === 'ar' ? 'إدارة وتأكيد المواعيد الهاتفية والعيادية' : 'Manage & Confirm Appointments'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSecretaryData.canViewQueue}
                    onChange={(e) => setNewSecretaryData({ ...newSecretaryData, canViewQueue: e.target.checked })}
                    className="rounded text-[#003366]"
                  />
                  <span>{language === 'ar' ? 'إدارة طابور الانتظار وتأكيد وصول المرضى' : 'Manage Waiting Room Queue'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSecretaryData.canCollectFees}
                    onChange={(e) => setNewSecretaryData({ ...newSecretaryData, canCollectFees: e.target.checked })}
                    className="rounded text-[#003366]"
                  />
                  <span>{language === 'ar' ? 'تسجيل إيصالات الكشفية والدفع' : 'Register Clinic Fees & Receipts'}</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSecretaryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#003366] text-white font-bold"
                >
                  {language === 'ar' ? 'منح التفويض' : 'Grant Delegation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
