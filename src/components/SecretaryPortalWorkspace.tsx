import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Appointment, 
  AppointmentStatus,
  DoctorProfile, 
  SecretaryDelegation,
  SecretaryAssignment,
  ClinicAuditLog,
  PatientNotification
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
  onSnapshot
} from 'firebase/firestore';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Phone, 
  Search, 
  Filter, 
  Plus, 
  UserCheck, 
  ShieldAlert, 
  RefreshCw, 
  LogOut, 
  Building2, 
  ChevronRight, 
  CalendarDays, 
  FileText, 
  Activity, 
  Check, 
  MapPin, 
  Lock, 
  Bell, 
  History, 
  AlertTriangle,
  UserPlus,
  Stethoscope,
  Info,
  DollarSign
} from 'lucide-react';

interface SecretaryPortalWorkspaceProps {
  onBackToHome: () => void;
}

export const SecretaryPortalWorkspace: React.FC<SecretaryPortalWorkspaceProps> = ({ onBackToHome }) => {
  const { user, userProfile, signInWithGoogle, signOut, refreshProfile } = useAuth();
  const { language, isRTL } = useLanguage();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments' | 'walkin' | 'schedule' | 'audit' | 'profile'>('queue');

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assignment & Doctor State
  const [assignment, setAssignment] = useState<SecretaryAssignment | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<SecretaryDelegation[]>([]);

  // Appointments & Logs State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [auditLogs, setAuditLogs] = useState<ClinicAuditLog[]>([]);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterMode, setFilterMode] = useState<'today' | 'all_dates' | 'custom'>('today');

  // Modals & Action State
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', newTimeSlot: '17:00', reason: '' });
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Walk-in / Phone Appointment Form
  const [walkinForm, setWalkinForm] = useState({
    patientName: '',
    patientPhone: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '17:00',
    consultationType: 'in_person' as 'in_person' | 'followup' | 'urgent',
    notes: '',
  });

  // Secretary Self-Profile edit form
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    phone: '',
    governorate: 'بغداد (Baghdad)',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3800);
  };

  // 1. Initial Load: Check assignment & doctor pairing
  const loadSecretaryData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);

      // Check direct assignment mapping in /secretary_assignments/{user.uid}
      const assignRef = doc(db, 'secretary_assignments', user.uid);
      const assignSnap = await getDoc(assignRef);

      if (assignSnap.exists() && assignSnap.data().status === 'active') {
        const assignData = { id: assignSnap.id, ...assignSnap.data() } as SecretaryAssignment;
        setAssignment(assignData);

        // Fetch Doctor Profile
        const docRef = doc(db, 'doctor_profiles', assignData.doctorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDoctorProfile(docSnap.data() as DoctorProfile);
        }
      } else {
        setAssignment(null);
        // Look for pending delegations by email in /secretary_delegations
        if (user.email) {
          const delegQuery = query(
            collection(db, 'secretary_delegations'),
            where('secretaryEmail', '==', user.email.toLowerCase()),
            where('status', '==', 'active')
          );
          const delegSnap = await getDocs(delegQuery);
          const invList = delegSnap.docs.map(d => ({ id: d.id, ...d.data() } as SecretaryDelegation));
          setPendingInvitations(invList);
        }
      }

      if (userProfile) {
        setProfileForm({
          displayName: userProfile.displayName || '',
          phone: userProfile.phone || '',
          governorate: userProfile.governorate || 'بغداد (Baghdad)',
        });
      }

    } catch (err) {
      console.error('Error loading secretary data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSecretaryData();
  }, [user, userProfile]);

  // 2. Real-time Listeners for Appointments and Logs once assigned
  useEffect(() => {
    if (!user || !assignment || !assignment.doctorId) {
      setAppointments([]);
      setAuditLogs([]);
      return;
    }

    // Real-time Appointments for assigned Doctor
    const apptQuery = query(
      collection(db, 'appointments'),
      where('doctorId', '==', assignment.doctorId)
    );

    const unsubAppts = onSnapshot(apptQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      list.sort((a, b) => {
        // Compare date then time
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
      setAppointments(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'appointments');
    });

    // Real-time Audit Logs
    const logsQuery = query(
      collection(db, 'clinic_audit_logs'),
      where('doctorId', '==', assignment.doctorId)
    );

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      const logsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClinicAuditLog));
      logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(logsList.slice(0, 50));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clinic_audit_logs');
    });

    // Notifications for Secretary
    const notifQuery = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid)
    );
    const unsubNotifs = onSnapshot(notifQuery, (snap) => {
      const nList = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatientNotification));
      nList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(nList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => {
      unsubAppts();
      unsubLogs();
      unsubNotifs();
    };
  }, [user, assignment]);

  // Helper: Log Front-Desk Action
  const logClinicAction = async (
    action: ClinicAuditLog['action'], 
    appointmentId: string | undefined, 
    patientName: string | undefined, 
    details: string
  ) => {
    if (!user || !assignment) return;
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newLog: ClinicAuditLog = {
        id: logId,
        doctorId: assignment.doctorId,
        doctorName: assignment.doctorName,
        actorUid: user.uid,
        actorName: userProfile?.displayName || user.email || 'سكرتير العيادة',
        actorRole: 'secretary',
        action,
        appointmentId,
        patientName,
        details,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'clinic_audit_logs', logId), newLog);
    } catch (e) {
      console.warn('Could not record audit log:', e);
    }
  };

  // Helper: Send notification to patient if UID is known
  const notifyPatient = async (patientUid: string, title: string, message: string) => {
    if (!patientUid || patientUid.startsWith('walkin_') || patientUid.startsWith('phone_')) return;
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const notif: PatientNotification = {
        id: notifId,
        recipientUid: patientUid,
        title,
        message,
        type: 'booking_update',
        read: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notifId), notif);
    } catch (e) {
      console.warn('Could not send patient notification:', e);
    }
  };

  // 3. Accept Delegation & Connect to Clinic
  const handleAcceptDelegation = async (delegation: SecretaryDelegation) => {
    if (!user) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();

      // 1) Link UID to the delegation
      const delegRef = doc(db, 'secretary_delegations', delegation.id);
      await updateDoc(delegRef, {
        secretaryUid: user.uid,
        acceptedAt: now,
        updatedAt: now,
        secretaryPhone: userProfile?.phone || ''
      });

      // 2) Create active assignment mapping
      const newAssignment: SecretaryAssignment = {
        id: user.uid,
        secretaryUid: user.uid,
        secretaryEmail: user.email?.toLowerCase() || '',
        secretaryName: userProfile?.displayName || user.email?.split('@')[0] || 'السكرتير',
        secretaryPhone: userProfile?.phone || '',
        doctorId: delegation.doctorId,
        doctorName: delegation.doctorName,
        permissions: delegation.permissions || ['canManageAppointments', 'canViewQueue'],
        status: 'active',
        delegationId: delegation.id,
        assignedAt: now,
        updatedAt: now,
        lastActiveAt: now
      };

      await setDoc(doc(db, 'secretary_assignments', user.uid), newAssignment);

      // 3) Update user account status if pending
      if (userProfile && userProfile.status !== 'approved') {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          facilityName: `عيادة د. ${delegation.doctorName}`,
          updatedAt: now
        });
        await refreshProfile();
      }

      setAssignment(newAssignment);
      setPendingInvitations([]);
      showToast(
        language === 'ar' 
          ? `تم ربط حسابك بعيادة د. ${delegation.doctorName} بنجاح!` 
          : `Successfully connected to Dr. ${delegation.doctorName}'s clinic!`
      );
      await loadSecretaryData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `secretary_assignments/${user.uid}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Appointment Status Transitions
  const handleUpdateStatus = async (appt: Appointment, newStatus: AppointmentStatus, note?: string) => {
    if (!user || !assignment) return;
    setActionLoading(true);
    try {
      const apptRef = doc(db, 'appointments', appt.id);
      const now = new Date().toISOString();
      const updates: Partial<Appointment> = {
        status: newStatus,
        updatedAt: now
      };
      if (note) {
        updates.notes = appt.notes ? `${appt.notes} | [تحديث]: ${note}` : note;
      }

      await updateDoc(apptRef, updates);

      // Log the action
      let actionType: ClinicAuditLog['action'] = 'confirm_appointment';
      let actionText = '';
      if (newStatus === 'confirmed') {
        actionType = 'confirm_appointment';
        actionText = language === 'ar' ? `تأكيد موعد المريض (${appt.patientName}) في تمام الساعة ${appt.timeSlot}` : `Confirmed appointment for ${appt.patientName}`;
      } else if (newStatus === 'completed') {
        actionType = 'complete_appointment';
        actionText = language === 'ar' ? `إنهاء زيارة وكشف المريض (${appt.patientName})` : `Completed consultation for ${appt.patientName}`;
      } else if (newStatus === 'cancelled') {
        actionType = 'cancel_appointment';
        actionText = language === 'ar' ? `إلغاء موعد المريض (${appt.patientName}): ${note || 'لا يوجد سبب'}` : `Cancelled appointment: ${note}`;
      }

      await logClinicAction(actionType, appt.id, appt.patientName, actionText);

      // Notify patient
      if (appt.patientId) {
        const notifMsg = language === 'ar'
          ? `تم تحديث حالة موعدك لدى د. ${assignment.doctorName} إلى: ${newStatus === 'confirmed' ? 'مؤكد' : newStatus === 'completed' ? 'مكتمل' : 'ملغي'}`
          : `Your appointment status with Dr. ${assignment.doctorName} has been updated to: ${newStatus}`;
        await notifyPatient(appt.patientId, language === 'ar' ? 'تحديث الموعد في العيادة' : 'Clinic Appointment Update', notifMsg);
      }

      showToast(language === 'ar' ? `تم تحديث حالة الموعد إلى (${newStatus})` : `Appointment status: ${newStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${appt.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Patient Arrival / Queue Check-In
  const handleCheckInPatient = async (appt: Appointment) => {
    if (!user || !assignment) return;
    setActionLoading(true);
    try {
      const apptRef = doc(db, 'appointments', appt.id);
      const now = new Date().toISOString();
      const checkinNote = `[حضور بالاستقبال]: ${new Date().toLocaleTimeString(language === 'ar' ? 'ar-IQ' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`;
      
      await updateDoc(apptRef, {
        status: 'confirmed',
        notes: appt.notes ? `${appt.notes} | ${checkinNote}` : checkinNote,
        updatedAt: now
      });

      await logClinicAction(
        'checkin_patient',
        appt.id,
        appt.patientName,
        language === 'ar' ? `تسجيل وصول المريض (${appt.patientName}) إلى قاعة الانتظار` : `Checked in ${appt.patientName} into waiting lounge`
      );

      showToast(language === 'ar' ? `تم تسجيل وصول ${appt.patientName} إلى صالة الانتظار` : `${appt.patientName} checked in`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${appt.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Reschedule Appointment with Collision Check
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assignment || !selectedAppt) return;
    if (!rescheduleData.newDate || !rescheduleData.newTimeSlot) {
      showToast(language === 'ar' ? 'يرجى تحديد التاريخ والوقت الجديد' : 'Select date and time slot', 'error');
      return;
    }

    // Check collision with existing confirmed appointments on same date and time
    const isConflict = appointments.some(
      a => a.id !== selectedAppt.id && 
           a.date === rescheduleData.newDate && 
           a.timeSlot === rescheduleData.newTimeSlot && 
           a.status !== 'cancelled'
    );

    if (isConflict) {
      showToast(
        language === 'ar' 
          ? 'تنبيه: هذا الوقت محجوز بالفعل لمريض آخر! يرجى اختيار وقت متاح لتفادي التضارب' 
          : 'Conflict: Slot already booked. Choose another time slot.',
        'error'
      );
      return;
    }

    setActionLoading(true);
    try {
      const apptRef = doc(db, 'appointments', selectedAppt.id);
      const now = new Date().toISOString();

      await updateDoc(apptRef, {
        date: rescheduleData.newDate,
        timeSlot: rescheduleData.newTimeSlot,
        status: 'rescheduled',
        rescheduleProposedDate: rescheduleData.newDate,
        rescheduleReason: rescheduleData.reason || 'إعادة جدولة عبر السكرتارية',
        updatedAt: now
      });

      const details = language === 'ar'
        ? `إعادة جدولة موعد (${selectedAppt.patientName}) من ${selectedAppt.date} ${selectedAppt.timeSlot} إلى ${rescheduleData.newDate} ${rescheduleData.newTimeSlot}`
        : `Rescheduled appointment for ${selectedAppt.patientName} to ${rescheduleData.newDate} ${rescheduleData.newTimeSlot}`;

      await logClinicAction('reschedule_appointment', selectedAppt.id, selectedAppt.patientName, details);

      if (selectedAppt.patientId) {
        await notifyPatient(
          selectedAppt.patientId,
          language === 'ar' ? 'تعديل موعد عيادة الطبيب' : 'Appointment Rescheduled',
          language === 'ar' 
            ? `تم تعديل موعدك إلى: ${rescheduleData.newDate} الساعة ${rescheduleData.newTimeSlot}. السبب: ${rescheduleData.reason || 'تنسيق جدول العيادة'}`
            : `Your appointment has been rescheduled to: ${rescheduleData.newDate} at ${rescheduleData.newTimeSlot}.`
        );
      }

      setShowRescheduleModal(false);
      setSelectedAppt(null);
      setRescheduleData({ newDate: '', newTimeSlot: '17:00', reason: '' });
      showToast(language === 'ar' ? 'تمت إعادة جدولة الموعد بنجاح' : 'Appointment rescheduled successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${selectedAppt.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Cancel Appointment with Mandatory Reason
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assignment || !selectedAppt) return;
    if (!cancelReason.trim()) {
      showToast(language === 'ar' ? 'يرجى كتابة سبب الإلغاء لتوثيقه' : 'Please provide cancellation reason', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const apptRef = doc(db, 'appointments', selectedAppt.id);
      const now = new Date().toISOString();

      await updateDoc(apptRef, {
        status: 'cancelled',
        rescheduleReason: `[إلغاء سكرتارية]: ${cancelReason}`,
        updatedAt: now
      });

      await logClinicAction(
        'cancel_appointment',
        selectedAppt.id,
        selectedAppt.patientName,
        language === 'ar' ? `إلغاء موعد المريض (${selectedAppt.patientName}) - السبب: ${cancelReason}` : `Cancelled: ${cancelReason}`
      );

      if (selectedAppt.patientId) {
        await notifyPatient(
          selectedAppt.patientId,
          language === 'ar' ? 'إلغاء الموعد بالعيادة' : 'Appointment Cancelled',
          language === 'ar'
            ? `نعتذر، تم إلغاء موعدك المقرر بتاريخ ${selectedAppt.date}. السبب: ${cancelReason}`
            : `Your appointment on ${selectedAppt.date} was cancelled: ${cancelReason}`
        );
      }

      setShowCancelModal(false);
      setSelectedAppt(null);
      setCancelReason('');
      showToast(language === 'ar' ? 'تم إلغاء الموعد وتوثيق السبب' : 'Appointment cancelled');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${selectedAppt.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Walk-in / Phone Booking Creation with Collision Detection
  const handleCreateWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assignment) return;
    if (!walkinForm.patientName.trim() || !walkinForm.patientPhone.trim()) {
      showToast(language === 'ar' ? 'يرجى إدخال اسم المريض ورقم الهاتف' : 'Patient name and phone required', 'error');
      return;
    }

    // Check collision for doctor schedule
    const hasCollision = appointments.some(
      a => a.date === walkinForm.date && 
           a.timeSlot === walkinForm.timeSlot && 
           a.status !== 'cancelled'
    );

    if (hasCollision) {
      showToast(
        language === 'ar' 
          ? 'تحذير: هذا الوقت محجوز مسبقاً! يرجى اختيار توقيت آخر لتفادي تداخل المراجعين' 
          : 'Time slot conflict: Selected time already booked.',
        'error'
      );
      return;
    }

    setActionLoading(true);
    try {
      const apptId = `appt_walkin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newAppt: Appointment = {
        id: apptId,
        doctorId: assignment.doctorId,
        patientId: `pat_reception_${Date.now()}`,
        patientName: walkinForm.patientName.trim(),
        patientPhone: walkinForm.patientPhone.trim(),
        doctorName: assignment.doctorName,
        specialty: doctorProfile?.specialty || assignment.doctorSpecialty || 'الطب العام',
        date: walkinForm.date,
        timeSlot: walkinForm.timeSlot,
        status: 'confirmed', // Reception walk-ins are directly confirmed
        consultationType: walkinForm.consultationType,
        notes: walkinForm.notes ? `[تسجيل مباشر بالاستقبال]: ${walkinForm.notes}` : '[حجز مباشر عبر السكرتارية]',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'appointments', apptId), newAppt);

      await logClinicAction(
        'create_walkin',
        apptId,
        walkinForm.patientName,
        language === 'ar' 
          ? `تسجيل حجز مباشر بالاستقبال للمريض (${walkinForm.patientName}) في موعد ${walkinForm.date} الساعة ${walkinForm.timeSlot}`
          : `Created reception booking for ${walkinForm.patientName} at ${walkinForm.date} ${walkinForm.timeSlot}`
      );

      setWalkinForm({
        patientName: '',
        patientPhone: '',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '17:00',
        consultationType: 'in_person',
        notes: '',
      });

      showToast(
        language === 'ar' 
          ? 'تم تسجيل الموعد بنجاح وتثبيته في جدول العيادة' 
          : 'Appointment registered and confirmed'
      );
      setActiveTab('queue');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'appointments');
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Update Secretary's Profile (Name & Phone)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: profileForm.displayName,
        phone: profileForm.phone,
        governorate: profileForm.governorate,
        updatedAt: now
      });

      if (assignment) {
        const assignRef = doc(db, 'secretary_assignments', user.uid);
        await updateDoc(assignRef, {
          secretaryName: profileForm.displayName,
          secretaryPhone: profileForm.phone,
          updatedAt: now
        });
      }

      await refreshProfile();
      showToast(language === 'ar' ? 'تم تحديث معلومات السكرتير بنجاح' : 'Profile updated successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Appointments
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      // Date filter
      if (filterMode === 'today' && a.date !== todayStr) return false;
      if (filterMode === 'custom' && a.date !== dateFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = a.patientName.toLowerCase().includes(q);
        const matchesPhone = a.patientPhone.includes(q);
        const matchesNotes = a.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesNotes) return false;
      }

      return true;
    });
  }, [appointments, filterMode, todayStr, dateFilter, statusFilter, searchTerm]);

  // Today Queue list specifically
  const todayQueue = useMemo(() => {
    return appointments.filter(a => a.date === todayStr);
  }, [appointments, todayStr]);

  // Real-time Statistics
  const stats = useMemo(() => {
    const todayTotal = todayQueue.length;
    const pendingCount = appointments.filter(a => a.status === 'pending').length;
    const todayConfirmed = todayQueue.filter(a => a.status === 'confirmed').length;
    const todayCompleted = todayQueue.filter(a => a.status === 'completed').length;
    const todayCancelled = todayQueue.filter(a => a.status === 'cancelled').length;
    return { todayTotal, pendingCount, todayConfirmed, todayCompleted, todayCancelled };
  }, [appointments, todayQueue]);

  // Standard Available Time Slots for Iraqi Clinics (Typically 4:00 PM to 9:30 PM)
  const timeSlots = [
    '16:00', '16:20', '16:40',
    '17:00', '17:20', '17:40',
    '18:00', '18:20', '18:40',
    '19:00', '19:20', '19:40',
    '20:00', '20:20', '20:40',
    '21:00', '21:20'
  ];

  // ==========================================
  // VIEW: Not signed in
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-blue-100 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {language === 'ar' ? 'بوابة السكرتارية والاستقبال الطبي' : 'Clinic Reception & Secretary Portal'}
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {language === 'ar' 
              ? 'تسجيل الدخول لإدارة طابور المراجعين، تأكيد الحجوزات، وتنظيم مواعيد العيادة بإشراف الطبيب المعتمد.' 
              : 'Sign in to coordinate front-desk queues, confirm appointments, and manage clinic schedules.'}
          </p>

          <button
            onClick={signInWithGoogle}
            className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 text-sm"
          >
            <Users className="w-5 h-5" />
            {language === 'ar' ? 'تسجيل الدخول عبر Google' : 'Sign in with Google'}
          </button>

          <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            {language === 'ar' ? 'منصة M737 — بيئة آمنة مشفرة وفق الضوابط الطبية' : 'M737 Platform — HIPAA & Medical syndicate compliant'}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: Signed In, But No Clinic Assignment Yet
  // ==========================================
  if (!loading && !assignment) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Users className="w-7 h-7 text-blue-200" />
              </div>
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  {language === 'ar' ? 'حساب سكرتير عيادة' : 'Secretary Account'}
                </span>
                <h1 className="text-2xl font-bold mt-1">{userProfile?.displayName || user.displayName || user.email}</h1>
                <p className="text-xs text-blue-200">{user.email}</p>
              </div>
            </div>

            <button
              onClick={signOut}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              {language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
            </button>
          </div>
        </div>

        {/* Pending Invitations from Doctors */}
        {pendingInvitations.length > 0 ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {language === 'ar' ? 'دعوات وتكليفات عيادة جديدة متاحة' : 'Pending Clinic Assignment Invitations'}
                </h3>
                <p className="text-xs text-slate-600">
                  {language === 'ar' 
                    ? 'قام الطبيب المعالج بمنحك صلاحيات إدارة الاستقبال والمواعيد لعيادته:' 
                    : 'A doctor has authorized you to manage their clinic reception:'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {pendingInvitations.map((inv) => (
                <div 
                  key={inv.id} 
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-900 text-base">د. {inv.doctorName}</span>
                    </div>
                    <div className="text-xs text-slate-600 flex flex-wrap gap-2 pt-1">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                        {language === 'ar' ? 'إدارة المواعيد' : 'Manage Appointments'}
                      </span>
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-medium">
                        {language === 'ar' ? 'تنظيم طابور الاستقبال' : 'Front-Desk Queue'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {language === 'ar' ? 'تاريخ التكليف:' : 'Issued on:'} {new Date(inv.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptDelegation(inv)}
                    disabled={actionLoading}
                    className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {actionLoading ? (language === 'ar' ? 'جاري الربط...' : 'Connecting...') : (language === 'ar' ? 'قبول والربط بالعيادة' : 'Accept & Connect')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'بانتظار تكليف الطبيب لربط العيادة' : 'Awaiting Doctor Clinic Assignment'}
            </h3>
            <p className="max-w-lg mx-auto text-sm text-slate-600 leading-relaxed">
              {language === 'ar' 
                ? 'لا يمكن للسكرتير تفعيل حسابه أو منح صلاحيات لنفسه بصورة ذاتية. لبدء العمل، يرجى تزويد الطبيب المعالج ببريدك الإلكتروني المسجل أدناه ليقوم بإضافتك من تبويب "إدارة السكرتارية" داخل بوابته.'
                : 'Secretaries cannot self-approve or grant themselves permissions. Please provide your email address to your attending doctor to assign you from their "Secretary Management" tab.'}
            </p>

            <div className="inline-block p-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
              {user.email}
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                onClick={loadSecretaryData}
                disabled={refreshing}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {language === 'ar' ? 'تحديث التحقق من التكليف' : 'Recheck Invitations'}
              </button>
              <button
                onClick={onBackToHome}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: Active Connected Secretary Workspace
  // ==========================================
  return (
    <div className={`max-w-7xl mx-auto p-4 sm:p-6 space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700' 
              : 'bg-rose-950 text-rose-200 border-rose-700'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main Clinic Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-200 shadow-inner shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {language === 'ar' ? 'عيادة متصلة ونشطة' : 'Active Clinic Desk'}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/10 text-slate-200">
                  {language === 'ar' ? 'منظومة الاستقبال والسكرتارية' : 'Front-Desk Portal'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                عيادة د. {assignment?.doctorName}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-blue-200 mt-2">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-300" />
                  {doctorProfile?.specialty || assignment?.doctorSpecialty || (language === 'ar' ? 'الطب العام والتخصصي' : 'Specialist')}
                </span>
                {doctorProfile?.clinicAddress && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-300" />
                    {doctorProfile.clinicAddress}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-300" />
                  {doctorProfile?.workingHours || '4:00 PM - 9:00 PM'}
                </span>
              </div>
            </div>
          </div>

          {/* Secretary Info Card */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15 w-full lg:w-auto justify-between lg:justify-start">
            <div className="space-y-0.5">
              <div className="text-[11px] text-blue-200">{language === 'ar' ? 'السكرتير المسؤول:' : 'Active Secretary:'}</div>
              <div className="font-bold text-sm text-white">{assignment?.secretaryName || userProfile?.displayName || user.email}</div>
              <div className="text-[10px] text-emerald-300 font-mono">
                {language === 'ar' ? 'صلاحيات الاستقبال معتمدة' : 'Verified Receptionist'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadSecretaryData}
                disabled={refreshing}
                title={language === 'ar' ? 'تحديث البيانات' : 'Refresh'}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={signOut}
                title={language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-rose-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Front-Desk Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-blue-200">{language === 'ar' ? 'مواعيد اليوم الكلية' : "Today's Bookings"}</div>
            <div className="text-2xl font-black text-white mt-1">{stats.todayTotal}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-amber-200">{language === 'ar' ? 'طلبات قيد المراجعة' : 'Pending Requests'}</div>
            <div className="text-2xl font-black text-amber-300 mt-1">{stats.pendingCount}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-emerald-200">{language === 'ar' ? 'مؤكدة اليوم' : 'Confirmed Today'}</div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{stats.todayConfirmed}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-sky-200">{language === 'ar' ? 'زيارات مكتملة اليوم' : 'Completed Visits'}</div>
            <div className="text-2xl font-black text-sky-300 mt-1">{stats.todayCompleted}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-rose-200">{language === 'ar' ? 'ملغية اليوم' : 'Cancelled Today'}</div>
            <div className="text-2xl font-black text-rose-300 mt-1">{stats.todayCancelled}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          {language === 'ar' ? 'طابور الانتظار والاستقبال' : "Reception Queue"}
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {todayQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          {language === 'ar' ? 'سجل كافة المواعيد' : 'All Appointments'}
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {appointments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('walkin')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'walkin'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          {language === 'ar' ? 'حجز مباشر / هاتفي' : 'Walk-in / Phone Booking'}
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          {language === 'ar' ? 'جدول الطبيب وساعات العمل' : "Doctor's Schedule"}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          {language === 'ar' ? 'سجل العمليات والتنبيهات' : 'Audit Logs & Alerts'}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          {language === 'ar' ? 'الملف والصلاحيات والخصوصية' : 'Profile & Privacy'}
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: TODAY'S RECEPTION & QUEUE                     */}
      {/* ==================================================== */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  {language === 'ar' ? 'طابور مراجعي اليوم' : "Today's Patient Reception Queue"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar' 
                    ? `تاريخ اليوم: ${todayStr} — ترتيب المراجعين حسب أوقات الحجز` 
                    : `Date: ${todayStr} — Ordered by scheduled time slot`}
                </p>
              </div>

              <button
                onClick={() => setActiveTab('walkin')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة مراجع واصل الآن' : 'Add Walk-in Patient'}
              </button>
            </div>

            {todayQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">{language === 'ar' ? 'لا توجد مواعيد مسجلة لهذا اليوم حتى الآن' : 'No appointments scheduled for today yet'}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'ar' ? 'يمكنك تسجيل الحجوزات الهاتفية أو المباشرة عبر تبويب "حجز مباشر / هاتفي"' : 'Add phone or walk-in arrivals via Walk-in tab'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-4">
                {todayQueue.map((appt, idx) => (
                  <div key={appt.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/80 p-3 rounded-2xl transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0 border border-blue-100">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-base">{appt.patientName}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                            appt.status === 'completed' ? 'bg-sky-100 text-sky-800' :
                            appt.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            appt.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {appt.status}
                          </span>
                          {appt.consultationType && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {appt.consultationType === 'urgent' ? (language === 'ar' ? 'حالة طارئة' : 'Urgent') :
                               appt.consultationType === 'followup' ? (language === 'ar' ? 'مراجعة' : 'Follow-up') :
                               (language === 'ar' ? 'كشف جديد' : 'New Visit')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                          <span className="flex items-center gap-1 font-mono font-bold text-blue-700">
                            <Clock className="w-3.5 h-3.5" />
                            {appt.timeSlot}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            <a href={`tel:${appt.patientPhone}`} className="hover:underline font-mono">
                              {appt.patientPhone}
                            </a>
                          </span>
                          {appt.notes && (
                            <span className="text-slate-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-[11px]">
                              {appt.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Queue Reception Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {appt.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(appt, 'confirmed')}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {language === 'ar' ? 'تأكيد' : 'Confirm'}
                        </button>
                      )}

                      {appt.status === 'confirmed' && (
                        <button
                          onClick={() => handleCheckInPatient(appt)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {language === 'ar' ? 'تسجيل وصول' : 'Check-In'}
                        </button>
                      )}

                      {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                        <button
                          onClick={() => handleUpdateStatus(appt, 'completed')}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs flex items-center gap-1 border border-slate-200"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {language === 'ar' ? 'اكتمال الزيارة' : 'Complete'}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedAppt(appt);
                          setRescheduleData({ newDate: appt.date, newTimeSlot: appt.timeSlot, reason: '' });
                          setShowRescheduleModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                        title={language === 'ar' ? 'إعادة جدولة' : 'Reschedule'}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>

                      {appt.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setSelectedAppt(appt);
                            setCancelReason('');
                            setShowCancelModal(true);
                          }}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                          title={language === 'ar' ? 'إلغاء الموعد' : 'Cancel'}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: ALL APPOINTMENTS DESK                         */}
      {/* ==================================================== */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3.5 right-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search patient or phone...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="all">{language === 'ar' ? 'كافة الحالات' : 'All Statuses'}</option>
                  <option value="pending">{language === 'ar' ? 'قيد المراجعة (Pending)' : 'Pending'}</option>
                  <option value="confirmed">{language === 'ar' ? 'مؤكدة (Confirmed)' : 'Confirmed'}</option>
                  <option value="completed">{language === 'ar' ? 'مكتملة (Completed)' : 'Completed'}</option>
                  <option value="rescheduled">{language === 'ar' ? 'مجدولة (Rescheduled)' : 'Rescheduled'}</option>
                  <option value="cancelled">{language === 'ar' ? 'ملغية (Cancelled)' : 'Cancelled'}</option>
                </select>
              </div>

              {/* Date Scope Mode */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterMode('today')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors ${filterMode === 'today' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600'}`}
                >
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all_dates')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors ${filterMode === 'all_dates' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600'}`}
                >
                  {language === 'ar' ? 'كافة التواريخ' : 'All Dates'}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('custom')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors ${filterMode === 'custom' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600'}`}
                >
                  {language === 'ar' ? 'تاريخ محدد' : 'Custom'}
                </button>
              </div>

              {/* Custom Date Picker (if custom) */}
              {filterMode === 'custom' && (
                <div>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {language === 'ar' ? 'قائمة الحجوزات والمواعيد' : 'Clinic Appointment Schedule'}
                <span className="text-xs text-slate-500 font-normal">({filteredAppointments.length})</span>
              </h3>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">{language === 'ar' ? 'لا توجد مواعيد مطابقة للبحث' : 'No matching appointments found'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'المريض' : 'Patient'}</th>
                      <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
                      <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</th>
                      <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'نوع الزيارة' : 'Visit Type'}</th>
                      <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-center">{language === 'ar' ? 'إجراءات السكرتارية' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {appt.patientName}
                          {appt.notes && (
                            <div className="text-[10px] text-slate-500 font-normal truncate max-w-xs">{appt.notes}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{appt.date}</div>
                          <div className="text-blue-600 font-mono font-bold text-[11px]">{appt.timeSlot}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          <a href={`tel:${appt.patientPhone}`} className="hover:text-blue-600">
                            {appt.patientPhone}
                          </a>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {appt.consultationType || 'in_person'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                            appt.status === 'completed' ? 'bg-sky-100 text-sky-800' :
                            appt.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            appt.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {appt.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateStatus(appt, 'confirmed')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                              >
                                {language === 'ar' ? 'تأكيد' : 'Confirm'}
                              </button>
                            )}

                            {appt.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateStatus(appt, 'completed')}
                                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px]"
                              >
                                {language === 'ar' ? 'اكتمال' : 'Complete'}
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedAppt(appt);
                                setRescheduleData({ newDate: appt.date, newTimeSlot: appt.timeSlot, reason: '' });
                                setShowRescheduleModal(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold"
                            >
                              {language === 'ar' ? 'جدولة' : 'Reschedule'}
                            </button>

                            {appt.status !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  setSelectedAppt(appt);
                                  setCancelReason('');
                                  setShowCancelModal(true);
                                }}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: WALK-IN / PHONE BOOKING CREATION              */}
      {/* ==================================================== */}
      {activeTab === 'walkin' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {language === 'ar' ? 'تسجيل حجز مباشر أو اتصال هاتفي' : 'Register Walk-in or Phone Patient'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'ar' 
                    ? `تثبيت موعد مراجع في عيادة د. ${assignment?.doctorName} مع التحقق التلقائي من عدم تضارب الوقت` 
                    : `Direct booking with automatic clash protection`}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateWalkin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'اسم المريض الثلاثي *' : 'Patient Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'ar' ? 'مثال: أحمد عبد الله رشيد' : 'e.g. John Doe'}
                    value={walkinForm.patientName}
                    onChange={(e) => setWalkinForm({ ...walkinForm, patientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'رقم الهاتف للتواصل *' : 'Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="07XXXXXXXXX"
                    value={walkinForm.patientPhone}
                    onChange={(e) => setWalkinForm({ ...walkinForm, patientPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'تاريخ الزيارة *' : 'Appointment Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={walkinForm.date}
                    onChange={(e) => setWalkinForm({ ...walkinForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'التوقيت *' : 'Time Slot *'}
                  </label>
                  <select
                    value={walkinForm.timeSlot}
                    onChange={(e) => setWalkinForm({ ...walkinForm, timeSlot: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                  >
                    {timeSlots.map((slot) => {
                      const isTaken = appointments.some(
                        a => a.date === walkinForm.date && a.timeSlot === slot && a.status !== 'cancelled'
                      );
                      return (
                        <option key={slot} value={slot} disabled={isTaken}>
                          {slot} {isTaken ? (language === 'ar' ? '(محجوز)' : '(Booked)') : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'نوع الزيارة' : 'Consultation Type'}
                  </label>
                  <select
                    value={walkinForm.consultationType}
                    onChange={(e) => setWalkinForm({ ...walkinForm, consultationType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="in_person">{language === 'ar' ? 'كشف جديد (In-Person)' : 'New Visit'}</option>
                    <option value="followup">{language === 'ar' ? 'مراجعة (Follow-up)' : 'Follow-up'}</option>
                    <option value="urgent">{language === 'ar' ? 'حالة مستعجلة (Urgent)' : 'Urgent'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'ملاحظات الاستقبال الأولية' : 'Front-Desk / Triage Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'ar' ? 'مثال: فحص ضغط عند الوصول 130/85، حجز هاتفي بواسطة المرافق' : 'Reception triage notes'}
                  value={walkinForm.notes}
                  onChange={(e) => setWalkinForm({ ...walkinForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('queue')}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {actionLoading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'تثبيت وتأكيد الحجز' : 'Confirm & Save Booking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: DOCTOR'S SCHEDULE & WORKING HOURS             */}
      {/* ==================================================== */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {language === 'ar' ? `جدول وساعات عمل د. ${assignment?.doctorName}` : `Dr. ${assignment?.doctorName}'s Schedule`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'ar' ? 'عرض توقيتات الدوام وأيام الاستشارات المعتمدة (للقراءة فقط)' : 'Read-only clinic availability schedule'}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                {language === 'ar' ? 'تعديل الإعدادات محصور بالطبيب' : 'Doctor-Only Setting'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-600">{language === 'ar' ? 'ساعات الاستشارة اليومية:' : 'Consultation Hours:'}</span>
                  <div className="text-lg font-black text-blue-900">{doctorProfile?.workingHours || '4:00 PM - 9:00 PM'}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-600">{language === 'ar' ? 'أيام العمل الأسبوعية:' : 'Working Days:'}</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(doctorProfile?.workingDays || ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']).map((day, i) => (
                      <span key={i} className="px-3 py-1 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-600">{language === 'ar' ? 'أجور الاستشارة الطبية:' : 'Consultation Fee:'}</span>
                  <div className="text-base font-bold text-slate-900">
                    {doctorProfile?.consultationFee?.toLocaleString() || '25,000'} IQD ({language === 'ar' ? 'دينار عراقي' : 'Iraqi Dinars'})
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                <h4 className="font-bold text-sm text-blue-950 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-700" />
                  {language === 'ar' ? 'إرشادات السكرتارية في استقبال وتنسيق الحجوزات' : 'Front-Desk Coordination Policy'}
                </h4>
                <ul className="text-xs text-blue-900/80 space-y-2 list-disc list-inside leading-relaxed">
                  <li>{language === 'ar' ? 'مدة الكشف التقديرية لكل مراجع تتراوح بين 15 إلى 20 دقيقة.' : 'Average consultation time is 15-20 minutes.'}</li>
                  <li>{language === 'ar' ? 'يمنع إدخال حجزين على نفس الوقت لضمان راحة المرضى وعدم تكدس صالة الانتظار.' : 'Double booking is strictly prevented.'}</li>
                  <li>{language === 'ar' ? 'الحالات الطارئة تمنح أولوية الدخول المباشر للطبيب بعد التنسيق السريع.' : 'Urgent cases receive emergency priority.'}</li>
                  <li>{language === 'ar' ? 'أي تغيير في أيام الدوام أو إجازات الطبيب يتم تحديثه من حساب الطبيب فقط.' : 'Vacations and schedule shifts are set directly by the physician.'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: AUDIT LOG & NOTIFICATIONS                     */}
      {/* ==================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {language === 'ar' ? 'سجل العمليات والتدقيق الأمني' : 'Clinic Front-Desk Audit Trail'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'ar' ? 'توثيق حركات تأكيد وإلغاء وتعديل المواعيد لحفظ الشفافية' : 'Audit logs for appointment state modifications'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {auditLogs.length} {language === 'ar' ? 'عملية مسجلة' : 'entries'}
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">{language === 'ar' ? 'لا توجد حركات مسجلة حتى الآن' : 'No audit entries recorded yet'}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'confirm_appointment' ? 'bg-emerald-100 text-emerald-800' :
                          log.action === 'cancel_appointment' ? 'bg-rose-100 text-rose-800' :
                          log.action === 'reschedule_appointment' ? 'bg-amber-100 text-amber-800' :
                          log.action === 'checkin_patient' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {log.action}
                        </span>
                        <span className="font-bold text-slate-900">{log.actorName}</span>
                      </div>
                      <p className="text-slate-600">{log.details}</p>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-US')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: SECRETARY PROFILE & PRIVACY SAFEGUARDS        */}
      {/* ==================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Privacy & Medical Records Isolation Notice */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-blue-950">
                  {language === 'ar' ? 'ميثاق الخصوصية وحماية الملفات الطبية (HIPAA / Syndicate Standard)' : 'Privacy & Medical Records Isolation Safeguard'}
                </h4>
                <p className="text-xs text-blue-800">
                  {language === 'ar' ? 'الصلاحيات الإدارية المنضبطة لحماية خصوصية المرضى' : 'Strict Role-Based Access Control'}
                </p>
              </div>
            </div>

            <p className="text-xs text-blue-900/80 leading-relaxed">
              {language === 'ar' 
                ? 'وفقاً لتعليمات نقابة الأطباء العراقية ومعايير الأمن الرقمي، تقتصر صلاحيات موظفي الاستقبال والسكرتارية على البيانات التنظيمية (الاسم، الهاتف، التوقيت، وحالة الحجز). تُعزل التقارير الطبية السريرية ونتائج الفحوصات المخبرية وصور الأشعة التشخيصية والمراسلات الخاصة بالكامل ولا يمكن الاطلاع عليها إلا من قبل الطبيب المعالج والمريض صاحب العلاقة.'
                : 'Secretary access is mathematically restricted via Firestore Security Rules to reception and scheduling duties. Diagnostic radiology scans, laboratory parameters, clinical doctor notes, and prescriptions remain strictly isolated and accessible only to attending physicians and authenticated patients.'}
            </p>
          </div>

          {/* Secretary Details Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100">
              {language === 'ar' ? 'تعديل بيانات السكرتير الشخصية' : 'Secretary Profile Settings'}
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الاسم الظاهر في العيادة' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'رقم الهاتف المعتمد بالاستقبال' : 'Contact Phone'}
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'البريد الإلكتروني المرتبط' : 'Associated Email'}
                </label>
                <input
                  type="text"
                  disabled
                  value={user.email || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-mono cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {language === 'ar' ? 'البريد مرتبط بتفويض الطبيب ولا يمكن تغييره يدوياً' : 'Bound to doctor clinic delegation'}
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {actionLoading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: RESCHEDULE APPOINTMENT                        */}
      {/* ==================================================== */}
      {showRescheduleModal && selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {language === 'ar' ? 'إعادة جدولة موعد المريض' : 'Reschedule Appointment'}
                </h3>
                <span className="text-xs text-blue-600 font-semibold">{selectedAppt.patientName}</span>
              </div>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'التاريخ الجديد المطلوب *' : 'New Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleData.newDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الوقت الجديد *' : 'New Time Slot *'}
                </label>
                <select
                  value={rescheduleData.newTimeSlot}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, newTimeSlot: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                >
                  {timeSlots.map((slot) => {
                    const isTaken = appointments.some(
                      a => a.id !== selectedAppt.id && a.date === rescheduleData.newDate && a.timeSlot === slot && a.status !== 'cancelled'
                    );
                    return (
                      <option key={slot} value={slot} disabled={isTaken}>
                        {slot} {isTaken ? (language === 'ar' ? '(محجوز لمريض آخر)' : '(Booked)') : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'سبب إعادة الجدولة' : 'Reason for Rescheduling'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'ar' ? 'مثال: طلب المريض التأجيل لظرف طارئ' : 'Reason'}
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow"
                >
                  {actionLoading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'تأكيد التعديل' : 'Confirm Reschedule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CANCEL APPOINTMENT WITH REASON                */}
      {/* ==================================================== */}
      {showCancelModal && selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 text-rose-700">
                  {language === 'ar' ? 'إلغاء موعد المريض' : 'Cancel Appointment'}
                </h3>
                <span className="text-xs text-slate-600 font-semibold">{selectedAppt.patientName}</span>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 leading-relaxed">
                {language === 'ar' 
                  ? 'يرجى تدوين سبب واضح للإلغاء ليتم إرساله للمريض وتوثيقه في السجل الأمني للعيادة.' 
                  : 'Please document the cancellation reason to notify the patient and log in clinic audit.'}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'سبب الإلغاء *' : 'Cancellation Reason *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={language === 'ar' ? 'مثال: اعتذار المريض، أو ظرف طارئ في جدول الطبيب...' : 'Cancellation reason...'}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  {language === 'ar' ? 'تراجع' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow"
                >
                  {actionLoading ? (language === 'ar' ? 'جاري الإلغاء...' : 'Cancelling...') : (language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancellation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
