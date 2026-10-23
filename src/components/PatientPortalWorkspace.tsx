import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  UserProfile,
  PatientProfile, 
  DoctorProfile, 
  Appointment, 
  AppointmentStatus,
  MedicalRecord, 
  MedicalRecordType,
  RadiologyProfile,
  RadiologyService,
  RadiologyBooking,
  RadiologyReport,
  RadiologyModality,
  LabProfile,
  LabTest,
  LabBooking,
  LabResult,
  PharmacyProfile,
  MedicineItem,
  PharmacyOrder,
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
  deleteDoc 
} from 'firebase/firestore';
import { 
  User, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  DollarSign, 
  Activity, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  Printer, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Heart, 
  HeartPulse, 
  Stethoscope, 
  FlaskConical, 
  Scan, 
  Pill, 
  ShoppingBag, 
  Truck, 
  AlertTriangle, 
  ExternalLink, 
  Upload, 
  Check, 
  X, 
  Bell, 
  FileCheck2, 
  Sparkles, 
  Building2, 
  BadgeAlert, 
  Layers, 
  Settings,
  MessageSquare,
  Info
} from 'lucide-react';

interface PatientPortalWorkspaceProps {
  onBackToHome: () => void;
}

export const PatientPortalWorkspace: React.FC<PatientPortalWorkspaceProps> = ({ onBackToHome }) => {
  const { user, userProfile, refreshProfile, signOut } = useAuth();
  const { language, isRTL } = useLanguage();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'doctors' | 'pharmacy' | 'labs' | 'radiology' | 'records' | 'notifications' | 'profile'
  >('dashboard');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Patient Profile State
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [editProfileForm, setEditProfileForm] = useState({
    fullName: '',
    phone: '',
    governorate: 'بغداد (Baghdad)',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodType: 'O+' as const,
    chronicDiseases: '',
    allergies: '',
    currentMedications: '',
    heightCm: 170,
    weightKg: 70,
    dateOfBirth: '1995-01-01',
    gender: 'male' as 'male' | 'female',
    photoURL: '',
  });

  // 2. Doctor Directory & Appointments
  const [doctorsList, setDoctorsList] = useState<DoctorProfile[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState('all');
  const [doctorGovernorateFilter, setDoctorGovernorateFilter] = useState('all');
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<DoctorProfile | null>(null);
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);
  const [appointmentBookingForm, setAppointmentBookingForm] = useState({
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    timeSlot: '10:00 AM - 10:30 AM',
    consultationType: 'in_person' as 'in_person' | 'followup' | 'urgent',
    notes: '',
  });
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);

  // 3. Pharmacy & Medicine Search & Orders
  const [medicinesList, setMedicinesList] = useState<MedicineItem[]>([]);
  const [pharmaciesList, setPharmaciesList] = useState<PharmacyProfile[]>([]);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicineDosageFilter, setMedicineDosageFilter] = useState('all');
  const [medicineAvailabilityFilter, setMedicineAvailabilityFilter] = useState<'all' | 'in_stock' | 'prescription'>('all');
  const [selectedMedicineForOrder, setSelectedMedicineForOrder] = useState<MedicineItem | null>(null);
  const [viewingMedicineDetails, setViewingMedicineDetails] = useState<MedicineItem | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [patientPharmacyOrders, setPatientPharmacyOrders] = useState<PharmacyOrder[]>([]);

  // 4. Laboratory Services & Bookings & Test Results
  const [labsList, setLabsList] = useState<LabProfile[]>([]);
  const [labTestsList, setLabTestsList] = useState<LabTest[]>([]);
  const [labTestSearch, setLabTestSearch] = useState('');
  const [labCategoryFilter, setLabCategoryFilter] = useState('all');
  const [selectedTestForBooking, setSelectedTestForBooking] = useState<LabTest | null>(null);
  const [labBookingForm, setLabBookingForm] = useState({
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    timeSlot: '09:00 AM - 10:00 AM',
    bookingType: 'in_lab' as 'in_lab' | 'home_collection',
    homeAddress: '',
    notes: '',
  });
  const [patientLabBookings, setPatientLabBookings] = useState<LabBooking[]>([]);
  const [patientLabResults, setPatientLabResults] = useState<LabResult[]>([]);
  const [selectedLabResultModal, setSelectedLabResultModal] = useState<LabResult | null>(null);

  // 5. Radiology Services & Bookings & Diagnostic Reports
  const [radiologyCentersList, setRadiologyCentersList] = useState<RadiologyProfile[]>([]);
  const [radiologyServicesList, setRadiologyServicesList] = useState<RadiologyService[]>([]);
  const [scanSearch, setScanSearch] = useState('');
  const [scanModalityFilter, setScanModalityFilter] = useState('all');
  const [selectedScanForBooking, setSelectedScanForBooking] = useState<RadiologyService | null>(null);
  const [scanBookingForm, setScanBookingForm] = useState({
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    timeSlot: '11:00 AM - 11:30 AM',
    notes: '',
  });
  const [patientRadiologyBookings, setPatientRadiologyBookings] = useState<RadiologyBooking[]>([]);
  const [patientRadiologyReports, setPatientRadiologyReports] = useState<RadiologyReport[]>([]);
  const [selectedRadiologyReportModal, setSelectedRadiologyReportModal] = useState<RadiologyReport | null>(null);

  // 6. Medical Records (Personal Uploads & Prescriptions)
  const [personalRecords, setPersonalRecords] = useState<MedicalRecord[]>([]);
  const [showUploadRecordModal, setShowUploadRecordModal] = useState(false);
  const [uploadRecordForm, setUploadRecordForm] = useState({
    title: '',
    recordType: 'lab_result' as MedicalRecordType,
    details: '',
    sourceFacility: '',
    fileUrl: '',
  });
  const [viewingRecordDetails, setViewingRecordDetails] = useState<MedicalRecord | null>(null);

  // 7. Notifications State
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);

  // Governorates List
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

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Generate deterministic or random medical ID
  const generateMedicalId = (uid: string) => {
    const hash = uid.slice(0, 6).toUpperCase();
    return `M737-PAT-${hash}`;
  };

  // Helper: check medicine expiration
  const isExpired = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return expiry < today;
  };

  // ==========================================
  // LOAD ALL PATIENT DATA FROM FIRESTORE
  // ==========================================
  const loadPatientWorkspaceData = async () => {
    if (!user) return;
    try {
      // 1. Patient Profile
      const pRef = doc(db, 'patient_profiles', user.uid);
      const pSnap = await getDoc(pRef);

      if (pSnap.exists()) {
        const pData = pSnap.data() as PatientProfile;
        setPatientProfile(pData);
        setEditProfileForm({
          fullName: pData.fullName || userProfile?.displayName || user.displayName || 'مريض منصة M737',
          phone: pData.phone || userProfile?.phone || '',
          governorate: pData.governorate || userProfile?.governorate || 'بغداد (Baghdad)',
          address: pData.address || '',
          emergencyContactName: pData.emergencyContactName || '',
          emergencyContactPhone: pData.emergencyContactPhone || '',
          bloodType: (pData.bloodType as any) || 'O+',
          chronicDiseases: (pData.chronicDiseases || []).join(', '),
          allergies: (pData.allergies || []).join(', '),
          currentMedications: (pData.currentMedications || []).join(', '),
          heightCm: pData.heightCm || 170,
          weightKg: pData.weightKg || 70,
          dateOfBirth: pData.dateOfBirth || '1995-01-01',
          gender: pData.gender || 'male',
          photoURL: pData.photoURL || user.photoURL || '',
        });
      } else {
        // Initialize default patient profile
        const initialProfile: PatientProfile = {
          patientId: user.uid,
          fullName: userProfile?.displayName || user.displayName || 'مواطن / مراجع',
          medicalId: generateMedicalId(user.uid),
          email: user.email || '',
          phone: userProfile?.phone || '07800000000',
          governorate: userProfile?.governorate || 'بغداد (Baghdad)',
          address: 'العراق، بغداد',
          emergencyContactName: 'جهة اتصال طوارئ',
          emergencyContactPhone: '07800000000',
          bloodType: 'O+',
          chronicDiseases: [],
          allergies: ['لا توجد تحسسات مسجلة'],
          currentMedications: [],
          heightCm: 172,
          weightKg: 74,
          dateOfBirth: '1995-05-15',
          gender: 'male',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(pRef, initialProfile);
        setPatientProfile(initialProfile);
      }

      // 2. Fetch Doctors Directory & Patient Appointments
      const docsSnap = await getDocs(collection(db, 'doctor_profiles'));
      const docsList = docsSnap.docs.map(d => ({ doctorId: d.id, ...d.data() } as DoctorProfile));
      setDoctorsList(docsList);

      const appQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', user.uid)
      );
      const appSnap = await getDocs(appQuery);
      const appList = appSnap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      appList.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setDoctorAppointments(appList);

      // 3. Fetch Pharmacy Medicines, Pharmacies & Patient Orders
      const medSnap = await getDocs(collection(db, 'medicines'));
      const medList = medSnap.docs.map(d => ({ id: d.id, ...d.data() } as MedicineItem));
      setMedicinesList(medList);

      const pharmSnap = await getDocs(collection(db, 'pharmacy_profiles'));
      const pharmList = pharmSnap.docs.map(d => ({ pharmacyId: d.id, ...d.data() } as PharmacyProfile));
      setPharmaciesList(pharmList);

      const ordQuery = query(
        collection(db, 'pharmacy_orders'),
        where('patientId', '==', user.uid)
      );
      const ordSnap = await getDocs(ordQuery);
      const ordList = ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as PharmacyOrder));
      ordList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPatientPharmacyOrders(ordList);

      // 4. Fetch Laboratories, Tests, Bookings, & Results
      const labsSnap = await getDocs(collection(db, 'lab_profiles'));
      const labsArr = labsSnap.docs.map(d => ({ labId: d.id, ...d.data() } as LabProfile));
      setLabsList(labsArr);

      const testsSnap = await getDocs(collection(db, 'lab_tests'));
      const testsArr = testsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabTest));
      setLabTestsList(testsArr);

      const labBookQuery = query(
        collection(db, 'lab_bookings'),
        where('patientId', '==', user.uid)
      );
      const labBookSnap = await getDocs(labBookQuery);
      const labBookings = labBookSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabBooking));
      labBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPatientLabBookings(labBookings);

      const labResQuery = query(
        collection(db, 'lab_results'),
        where('patientId', '==', user.uid)
      );
      const labResSnap = await getDocs(labResQuery);
      const labResults = labResSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabResult));
      labResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPatientLabResults(labResults);

      // 5. Fetch Radiology Centers, Services, Bookings, & Reports
      const radCentersSnap = await getDocs(collection(db, 'radiology_profiles'));
      const radCenters = radCentersSnap.docs.map(d => ({ centerId: d.id, ...d.data() } as RadiologyProfile));
      setRadiologyCentersList(radCenters);

      const radServicesSnap = await getDocs(collection(db, 'radiology_services'));
      const radServices = radServicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as RadiologyService));
      setRadiologyServicesList(radServices);

      const radBookQuery = query(
        collection(db, 'radiology_bookings'),
        where('patientId', '==', user.uid)
      );
      const radBookSnap = await getDocs(radBookQuery);
      const radBookings = radBookSnap.docs.map(d => ({ id: d.id, ...d.data() } as RadiologyBooking));
      radBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPatientRadiologyBookings(radBookings);

      const radRepQuery = query(
        collection(db, 'radiology_reports'),
        where('patientId', '==', user.uid)
      );
      const radRepSnap = await getDocs(radRepQuery);
      const radReports = radRepSnap.docs.map(d => ({ id: d.id, ...d.data() } as RadiologyReport));
      radReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPatientRadiologyReports(radReports);

      // 6. Fetch Personal Uploaded Medical Records
      const recQuery = query(
        collection(db, 'medical_records'),
        where('patientId', '==', user.uid)
      );
      const recSnap = await getDocs(recQuery);
      const recList = recSnap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalRecord));
      recList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPersonalRecords(recList);

      // 7. Fetch Notifications
      const notifQuery = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', user.uid)
      );
      const notifSnap = await getDocs(notifQuery);
      const notifList = notifSnap.docs.map(d => ({ id: d.id, ...d.data() } as PatientNotification));
      notifList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifList);

    } catch (err: unknown) {
      console.error('Error loading patient portal workspace data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPatientWorkspaceData();
  }, [user]);

  // ==========================================
  // ACTION: SAVE PATIENT HEALTH PROFILE
  // ==========================================
  const handleSavePatientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const now = new Date().toISOString();
      const updatedProfile: PatientProfile = {
        patientId: user.uid,
        fullName: editProfileForm.fullName,
        medicalId: patientProfile?.medicalId || generateMedicalId(user.uid),
        email: user.email || '',
        phone: editProfileForm.phone,
        governorate: editProfileForm.governorate,
        address: editProfileForm.address,
        emergencyContactName: editProfileForm.emergencyContactName,
        emergencyContactPhone: editProfileForm.emergencyContactPhone,
        bloodType: editProfileForm.bloodType,
        chronicDiseases: editProfileForm.chronicDiseases
          ? editProfileForm.chronicDiseases.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        allergies: editProfileForm.allergies
          ? editProfileForm.allergies.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        currentMedications: editProfileForm.currentMedications
          ? editProfileForm.currentMedications.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        heightCm: Number(editProfileForm.heightCm) || 170,
        weightKg: Number(editProfileForm.weightKg) || 70,
        dateOfBirth: editProfileForm.dateOfBirth,
        gender: editProfileForm.gender,
        photoURL: editProfileForm.photoURL || user.photoURL || '',
        createdAt: patientProfile?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'patient_profiles', user.uid), updatedProfile);

      // Update non-privileged user profile fields
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editProfileForm.fullName,
        governorate: editProfileForm.governorate,
        phone: editProfileForm.phone,
        updatedAt: now,
      });

      showToast(language === 'ar' ? 'تم تحديث الملف الصحي الشخصي بنجاح' : 'Health profile updated');
      setPatientProfile(updatedProfile);
      await refreshProfile();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `patient_profiles/${user.uid}`);
    }
  };

  // ==========================================
  // ACTION: BOOK DOCTOR APPOINTMENT
  // ==========================================
  const handleBookDoctorAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDoctorForBooking) return;
    try {
      const aptId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newApt: Appointment = {
        id: aptId,
        doctorId: selectedDoctorForBooking.doctorId,
        patientId: user.uid,
        patientName: patientProfile?.fullName || userProfile?.displayName || 'مريض',
        patientPhone: patientProfile?.phone || userProfile?.phone || '07XXXXXXXXX',
        doctorName: selectedDoctorForBooking.fullName,
        specialty: selectedDoctorForBooking.specialty,
        date: appointmentBookingForm.date,
        timeSlot: appointmentBookingForm.timeSlot,
        consultationType: appointmentBookingForm.consultationType,
        status: 'pending',
        notes: appointmentBookingForm.notes,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'appointments', aptId), newApt);

      // Also create notification for doctor
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientUid: selectedDoctorForBooking.doctorId,
          title: 'طلب موعد كشفية جديد',
          message: `طلب مريض (${patientProfile?.fullName || 'مراجع'}) حجز موعد جديد في ${appointmentBookingForm.date} - ${appointmentBookingForm.timeSlot}.`,
          type: 'booking_update',
          read: false,
          createdAt: now,
        });
      } catch (e) {
        console.warn('Doctor notification write:', e);
      }

      showToast(language === 'ar' ? 'تم إرسال طلب حجز الموعد بنجاح إلى العيادة' : 'Appointment request submitted');
      setSelectedDoctorForBooking(null);
      setAppointmentBookingForm({
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        timeSlot: '10:00 AM - 10:30 AM',
        consultationType: 'in_person',
        notes: '',
      });
      await loadPatientWorkspaceData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'appointments');
    }
  };

  // ==========================================
  // ACTION: CANCEL DOCTOR APPOINTMENT
  // ==========================================
  const handleCancelAppointment = async (apt: Appointment) => {
    try {
      await updateDoc(doc(db, 'appointments', apt.id), {
        status: 'cancelled',
        rescheduleReason: language === 'ar' ? 'تم الإلغاء من قبل المريض' : 'Cancelled by patient',
        updatedAt: new Date().toISOString(),
      });
      showToast(language === 'ar' ? 'تم إلغاء الموعد' : 'Appointment cancelled');
      setCancellingAppointment(null);
      await loadPatientWorkspaceData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${apt.id}`);
    }
  };

  // ==========================================
  // ACTION: ORDER MEDICINE FROM PHARMACY
  // ==========================================
  const handleOrderMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMedicineForOrder) return;
    try {
      const ordId = `pord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const medTotal = selectedMedicineForOrder.price * orderQuantity;

      const newOrder: PharmacyOrder = {
        id: ordId,
        pharmacyId: selectedMedicineForOrder.pharmacyId,
        pharmacyName: selectedMedicineForOrder.pharmacyName,
        patientId: user.uid,
        patientName: patientProfile?.fullName || userProfile?.displayName || 'المراجع',
        patientPhone: patientProfile?.phone || userProfile?.phone || '07XXXXXXXXX',
        items: [
          {
            medicineId: selectedMedicineForOrder.id,
            name: selectedMedicineForOrder.name,
            activeIngredient: selectedMedicineForOrder.activeIngredient,
            strength: selectedMedicineForOrder.strength,
            quantity: orderQuantity,
            unitPrice: selectedMedicineForOrder.price,
            totalPrice: medTotal,
          }
        ],
        totalAmount: medTotal,
        orderType,
        deliveryAddress: orderType === 'delivery' ? orderDeliveryAddress : undefined,
        status: 'pending',
        pharmacistNotes: orderNotes ? `ملاحظات المريض: ${orderNotes}` : undefined,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'pharmacy_orders', ordId), newOrder);

      // In-app alert to pharmacy
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientUid: selectedMedicineForOrder.pharmacyId,
          title: 'طلب دواء جديد من مراجع',
          message: `طلب مريض (${newOrder.patientName}) صنف: ${selectedMedicineForOrder.name} (${orderQuantity} عبوة).`,
          type: 'booking_update',
          read: false,
          createdAt: now,
        });
      } catch (e) {
        console.warn('Pharmacy notif warning:', e);
      }

      showToast(language === 'ar' ? 'تم إرسال طلب الدواء إلى الصيدلية' : 'Medicine order placed');
      setSelectedMedicineForOrder(null);
      setOrderQuantity(1);
      setOrderNotes('');
      setOrderDeliveryAddress('');
      await loadPatientWorkspaceData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'pharmacy_orders');
    }
  };

  // ==========================================
  // ACTION: BOOK LAB TEST
  // ==========================================
  const handleBookLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTestForBooking) return;
    try {
      const bookId = `lbook_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newBooking: LabBooking = {
        id: bookId,
        labId: selectedTestForBooking.labId,
        labName: selectedTestForBooking.labName || 'المختبر الطبي',
        patientId: user.uid,
        patientName: patientProfile?.fullName || userProfile?.displayName || 'المراجع',
        patientPhone: patientProfile?.phone || userProfile?.phone || '07XXXXXXXXX',
        testId: selectedTestForBooking.id,
        testName: selectedTestForBooking.name,
        category: selectedTestForBooking.category,
        date: labBookingForm.date,
        timeSlot: labBookingForm.timeSlot,
        bookingType: labBookingForm.bookingType,
        homeAddress: labBookingForm.bookingType === 'home_collection' ? labBookingForm.homeAddress : undefined,
        status: 'pending',
        sampleStatus: 'pending_collection',
        notes: labBookingForm.notes,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'lab_bookings', bookId), newBooking);

      showToast(language === 'ar' ? 'تم إرسال حجز التحليل للمختبر' : 'Lab test booked');
      setSelectedTestForBooking(null);
      setLabBookingForm({
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        timeSlot: '09:00 AM - 10:00 AM',
        bookingType: 'in_lab',
        homeAddress: '',
        notes: '',
      });
      await loadPatientWorkspaceData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'lab_bookings');
    }
  };

  // ==========================================
  // ACTION: BOOK RADIOLOGY SCAN
  // ==========================================
  const handleBookRadiologyScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedScanForBooking) return;
    try {
      const bookId = `rbook_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const center = radiologyCentersList.find(c => c.centerId === selectedScanForBooking.centerId);

      const newScanBooking: RadiologyBooking = {
        id: bookId,
        centerId: selectedScanForBooking.centerId,
        centerName: center?.centerName || 'مركز الأشعة التخصصي',
        patientId: user.uid,
        patientName: patientProfile?.fullName || userProfile?.displayName || 'المراجع',
        patientPhone: patientProfile?.phone || userProfile?.phone || '07XXXXXXXXX',
        serviceId: selectedScanForBooking.id,
        serviceName: selectedScanForBooking.name,
        modality: selectedScanForBooking.modality,
        date: scanBookingForm.date,
        timeSlot: scanBookingForm.timeSlot,
        status: 'pending',
        notes: scanBookingForm.notes,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'radiology_bookings', bookId), newScanBooking);

      showToast(language === 'ar' ? 'تم إرسال طلب حجز الفحص لمركز الأشعة' : 'Radiology scan booked');
      setSelectedScanForBooking(null);
      setScanBookingForm({
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        timeSlot: '11:00 AM - 11:30 AM',
        notes: '',
      });
      await loadPatientWorkspaceData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'radiology_bookings');
    }
  };

  // ==========================================
  // ACTION: UPLOAD PERSONAL MEDICAL RECORD
  // ==========================================
  const handleUploadPersonalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uploadRecordForm.title.trim()) return;
    try {
      const recId = `mrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newRecord: MedicalRecord = {
        id: recId,
        patientId: user.uid,
        patientName: patientProfile?.fullName || userProfile?.displayName || 'المراجع',
        doctorId: user.uid, // Patient self-uploaded document
        recordType: uploadRecordForm.recordType,
        title: uploadRecordForm.title,
        details: uploadRecordForm.details,
        sourceFacility: uploadRecordForm.sourceFacility,
        fileUrl: uploadRecordForm.fileUrl || undefined,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'medical_records', recId), newRecord);

      showToast(language === 'ar' ? 'تم حفظ التقرير الطبي في سجلك الصحي' : 'Medical record uploaded');
      setShowUploadRecordModal(false);
      setUploadRecordForm({
        title: '',
        recordType: 'lab_result',
        details: '',
        sourceFacility: '',
        fileUrl: '',
      });
      await loadPatientWorkspaceData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'medical_records');
    }
  };

  // Handle local file preview as data URL for secure personal documents
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadRecordForm(prev => ({ ...prev, fileUrl: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePersonalRecord = async (recordId: string) => {
    if (!window.confirm(language === 'ar' ? 'هل تريد حذف هذا المستند من سجلك الصحي؟' : 'Delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'medical_records', recordId));
      showToast(language === 'ar' ? 'تم حذف المستند' : 'Record deleted');
      await loadPatientWorkspaceData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `medical_records/${recordId}`);
    }
  };

  // Mark notification as read
  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), {
        read: true,
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (e) {
      console.warn('Mark notif read error:', e);
    }
  };

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctorsList.filter(d => {
      if (doctorSearch.trim()) {
        const q = doctorSearch.toLowerCase();
        const matchesName = d.fullName.toLowerCase().includes(q);
        const matchesSpec = d.specialty.toLowerCase().includes(q);
        const matchesSub = d.subspecialty?.toLowerCase().includes(q);
        const matchesAddr = d.clinicAddress?.toLowerCase().includes(q);
        if (!matchesName && !matchesSpec && !matchesSub && !matchesAddr) return false;
      }
      if (doctorSpecialtyFilter !== 'all' && d.specialty !== doctorSpecialtyFilter) return false;
      if (doctorGovernorateFilter !== 'all' && d.governorate !== doctorGovernorateFilter) return false;
      return true;
    });
  }, [doctorsList, doctorSearch, doctorSpecialtyFilter, doctorGovernorateFilter]);

  // Unique specialties
  const doctorSpecialties = useMemo(() => {
    const set = new Set<string>();
    doctorsList.forEach(d => { if (d.specialty) set.add(d.specialty); });
    return Array.from(set);
  }, [doctorsList]);

  // Filtered Medicines
  const filteredMedicines = useMemo(() => {
    return medicinesList.filter(m => {
      if (medicineSearch.trim()) {
        const q = medicineSearch.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesGeneric = m.activeIngredient.toLowerCase().includes(q);
        const matchesBrand = m.brand?.toLowerCase().includes(q);
        const matchesMfr = m.manufacturer?.toLowerCase().includes(q);
        const matchesPharmacy = m.pharmacyName?.toLowerCase().includes(q);
        const matchesBenefits = m.benefits?.toLowerCase().includes(q);
        if (!matchesName && !matchesGeneric && !matchesBrand && !matchesMfr && !matchesPharmacy && !matchesBenefits) return false;
      }
      if (medicineDosageFilter !== 'all' && m.dosageForm !== medicineDosageFilter) return false;
      if (medicineAvailabilityFilter === 'in_stock') {
        if (m.quantity <= 0 || isExpired(m.expiryDate)) return false;
      } else if (medicineAvailabilityFilter === 'prescription') {
        if (!m.requiresPrescription) return false;
      }
      return true;
    });
  }, [medicinesList, medicineSearch, medicineDosageFilter, medicineAvailabilityFilter]);

  // Filtered Lab Tests
  const filteredLabTests = useMemo(() => {
    return labTestsList.filter(t => {
      if (labTestSearch.trim()) {
        const q = labTestSearch.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesCat = t.category.toLowerCase().includes(q);
        const matchesLab = t.labName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesLab) return false;
      }
      if (labCategoryFilter !== 'all' && t.category !== labCategoryFilter) return false;
      return true;
    });
  }, [labTestsList, labTestSearch, labCategoryFilter]);

  const labCategories = useMemo(() => {
    const set = new Set<string>();
    labTestsList.forEach(t => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [labTestsList]);

  // Filtered Radiology Scans
  const filteredRadiologyScans = useMemo(() => {
    return radiologyServicesList.filter(s => {
      if (scanSearch.trim()) {
        const q = scanSearch.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesMod = s.modality.toLowerCase().includes(q);
        if (!matchesName && !matchesMod) return false;
      }
      if (scanModalityFilter !== 'all' && s.modality !== scanModalityFilter) return false;
      return true;
    });
  }, [radiologyServicesList, scanSearch, scanModalityFilter]);

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

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

      {/* Patient Health Passport Top Hero Banner */}
      <div className="bg-gradient-to-r from-[#002244] via-[#0284c7] to-[#0369a1] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {patientProfile?.photoURL ? (
              <img 
                src={patientProfile.photoURL} 
                alt="Avatar" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white/10 backdrop-blur-md border border-white/20 shadow-md shrink-0" 
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md shrink-0">
                <User size={36} className="text-sky-300" />
              </div>
            )}

            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30 text-xs font-bold mb-1.5">
                <ShieldCheck size={13} />
                <span>{language === 'ar' ? 'جواز صحي وطني معتمد' : 'Verified Digital Health Passport'}</span>
                <span className="opacity-50">·</span>
                <span className="text-emerald-300">{language === 'ar' ? 'دخول مجاني دائم' : 'Free Access'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {patientProfile?.fullName || userProfile?.displayName || 'مواطن / مراجع'}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-sky-100 mt-1">
                <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded-md text-white border border-white/20">
                  {patientProfile?.medicalId || generateMedicalId(user?.uid || 'user')}
                </span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-sky-300" />
                  <span className="font-mono">{patientProfile?.phone || userProfile?.phone || '07XXXXXXXXX'}</span>
                </span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-sky-300" />
                  <span>{patientProfile?.governorate || 'بغداد'}</span>
                </span>
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-200 font-bold border border-red-400/30">
                  <HeartPulse size={12} />
                  <span>{language === 'ar' ? 'فصيلة الدم:' : 'Blood:'} {patientProfile?.bloodType || 'O+'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                loadPatientWorkspaceData();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{language === 'ar' ? 'تحديث' : 'Sync'}</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className="px-4 py-2.5 rounded-xl bg-white text-[#003366] hover:bg-slate-100 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Edit3 size={15} />
              <span>{language === 'ar' ? 'تعديل الملف الصحي' : 'Edit Passport'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-200/80 rounded-2xl overflow-x-auto text-xs font-bold">
        {[
          { id: 'dashboard', labelAr: 'نظرة عامة والجواز', labelEn: 'Passport', icon: Activity },
          { id: 'doctors', labelAr: `الأطباء والمواعيد (${doctorAppointments.length})`, labelEn: `Doctors (${doctorAppointments.length})`, icon: Stethoscope },
          { id: 'pharmacy', labelAr: `دليل الأدوية والطلبات (${patientPharmacyOrders.length})`, labelEn: `Medicines (${patientPharmacyOrders.length})`, icon: Pill },
          { id: 'labs', labelAr: `التحاليل والمختبرات (${patientLabBookings.length})`, labelEn: `Lab Tests (${patientLabBookings.length})`, icon: FlaskConical },
          { id: 'radiology', labelAr: `الأشعة والسونار (${patientRadiologyBookings.length})`, labelEn: `Radiology (${patientRadiologyBookings.length})`, icon: Scan },
          { id: 'records', labelAr: `سجلي الطبي والتقارير (${personalRecords.length + patientRadiologyReports.length + patientLabResults.length})`, labelEn: `My Records (${personalRecords.length + patientRadiologyReports.length + patientLabResults.length})`, icon: FileCheck2 },
          { id: 'notifications', labelAr: `التنبيهات (${notifications.length})`, labelEn: `Alerts (${notifications.length})`, icon: Bell },
          { id: 'profile', labelAr: 'بيانات الطوارئ والصحة', labelEn: 'Health Profile', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#0284c7] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-[#0284c7]' : 'text-slate-400'} />
              <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              {tab.id === 'notifications' && unreadNotifsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-mono">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: DASHBOARD OVERVIEW & DIGITAL HEALTH PASSPORT */}
      {/* ==================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Key Quick Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => setActiveTab('doctors')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-sky-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">{language === 'ar' ? 'مواعيد الأطباء' : 'Appointments'}</span>
                <Stethoscope size={16} className="text-sky-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{doctorAppointments.length}</div>
              <span className="text-[11px] text-sky-700 mt-1 block">
                {doctorAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length} {language === 'ar' ? 'قيد الانتظار أو مؤكدة' : 'upcoming'}
              </span>
            </div>

            <div 
              onClick={() => setActiveTab('records')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">{language === 'ar' ? 'التقارير الطبية' : 'Diagnostic Reports'}</span>
                <FileCheck2 size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {patientRadiologyReports.length + patientLabResults.length + personalRecords.length}
              </div>
              <span className="text-[11px] text-emerald-700 mt-1 block">
                {patientRadiologyReports.length} {language === 'ar' ? 'أشعة' : 'scans'} · {patientLabResults.length} {language === 'ar' ? 'تحاليل' : 'labs'}
              </span>
            </div>

            <div 
              onClick={() => setActiveTab('pharmacy')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-teal-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">{language === 'ar' ? 'طلبات الأدوية' : 'Prescription Orders'}</span>
                <ShoppingBag size={16} className="text-teal-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{patientPharmacyOrders.length}</div>
              <span className="text-[11px] text-teal-700 mt-1 block">
                {patientPharmacyOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length} {language === 'ar' ? 'جاري تجهيزها' : 'active'}
              </span>
            </div>

            <div 
              onClick={() => setActiveTab('notifications')}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-red-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-semibold">{language === 'ar' ? 'التنبيهات والإشعارات' : 'Notifications'}</span>
                <Bell size={16} className="text-red-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{notifications.length}</div>
              <span className="text-[11px] text-red-600 mt-1 block font-bold">
                {unreadNotifsCount} {language === 'ar' ? 'غير مقروءة' : 'unread alerts'}
              </span>
            </div>
          </div>

          {/* Printable Digital Medical Passport Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                  <HeartPulse size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {language === 'ar' ? 'بطاقة البيانات الصحية وحالات الطوارئ (Medical Passport)' : 'Medical Identity & Emergency Card'}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {patientProfile?.medicalId || generateMedicalId(user?.uid || '')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={14} />
                  <span>{language === 'ar' ? 'طباعة البطاقة' : 'Print Card'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">{language === 'ar' ? 'فصيلة الدم المعتمدة:' : 'Blood Group:'}</span>
                <span className="text-xl font-black text-red-600 font-mono">{patientProfile?.bloodType || 'O+'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">{language === 'ar' ? 'جهة اتصال الطوارئ:' : 'Emergency Contact:'}</span>
                <div className="font-bold text-slate-900">{patientProfile?.emergencyContactName || 'غير محدد'}</div>
                <div className="text-sky-700 font-mono mt-0.5">{patientProfile?.emergencyContactPhone || '—'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">{language === 'ar' ? 'القياسات الحيوية:' : 'Vitals / Body Stats:'}</span>
                <div className="font-bold text-slate-900">
                  {language === 'ar' ? 'الطول:' : 'Height:'} {patientProfile?.heightCm || 170} سم · {language === 'ar' ? 'الوزن:' : 'Weight:'} {patientProfile?.weightKg || 70} كغم
                </div>
                <div className="text-slate-500 mt-0.5">
                  BMI: {(((patientProfile?.weightKg || 70) / Math.pow((patientProfile?.heightCm || 170) / 100, 2))).toFixed(1)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">{language === 'ar' ? 'المحافظة والعنوان:' : 'Governorate & City:'}</span>
                <div className="font-bold text-slate-900">{patientProfile?.governorate || 'بغداد'}</div>
                <div className="text-slate-500 truncate mt-0.5">{patientProfile?.address || 'العراق'}</div>
              </div>
            </div>

            {/* Allergies & Chronic Conditions */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100">
                <div className="flex items-center gap-1.5 text-red-800 font-bold mb-2">
                  <AlertCircle size={15} />
                  <span>{language === 'ar' ? 'التحسسات الدوائية والغذائية المسجلة:' : 'Recorded Allergies (Allergens):'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(patientProfile?.allergies && patientProfile.allergies.length > 0) ? (
                    patientProfile.allergies.map((al, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-semibold text-[11px]">
                        {al}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">{language === 'ar' ? 'لا توجد تحسسات مسجلة' : 'No recorded allergies'}</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-2">
                  <HeartPulse size={15} />
                  <span>{language === 'ar' ? 'الأمراض المزمنة والأدوية المستمرة:' : 'Chronic Conditions & Ongoing Rx:'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(patientProfile?.chronicDiseases && patientProfile.chronicDiseases.length > 0) ? (
                    patientProfile.chronicDiseases.map((cd, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-semibold text-[11px]">
                        {cd}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">{language === 'ar' ? 'سليم من الأمراض المزمنة' : 'No chronic conditions recorded'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Grid to Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => setActiveTab('doctors')}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
                  <Stethoscope size={20} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">{language === 'ar' ? 'حجز موعد طبيب' : 'Find a Doctor'}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {language === 'ar' ? 'تصفح نخبة الأطباء الاستشاريين في العراق وحجز موعد كشفية معتمد.' : 'Browse certified Iraqi specialists and book clinic consultations.'}
                </p>
              </div>
              <span className="text-xs font-bold text-sky-700 mt-4 flex items-center gap-1">
                {language === 'ar' ? 'تصفح الأطباء ←' : 'Browse Doctors →'}
              </span>
            </div>

            <div 
              onClick={() => setActiveTab('pharmacy')}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                  <Pill size={20} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">{language === 'ar' ? 'محرك بحث الأدوية' : 'Search Medicines'}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {language === 'ar' ? 'البحث بالاسم التجاري أو المادة الفعالة وتحديد الصيدليات المتوفر بها.' : 'Search trade brands or active ingredients with real Iraqi pharmacy stock.'}
                </p>
              </div>
              <span className="text-xs font-bold text-teal-700 mt-4 flex items-center gap-1">
                {language === 'ar' ? 'البحث في الصيدليات ←' : 'Search Pharmacies →'}
              </span>
            </div>

            <div 
              onClick={() => setActiveTab('labs')}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center mb-3">
                  <FlaskConical size={20} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">{language === 'ar' ? 'التحاليل الطبية' : 'Lab Tests'}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {language === 'ar' ? 'حجز تحاليل الدم والمختبرات مع توفر سحب العينات من المنزل.' : 'Book clinical blood tests with lab visits or home sample collection.'}
                </p>
              </div>
              <span className="text-xs font-bold text-orange-700 mt-4 flex items-center gap-1">
                {language === 'ar' ? 'دليل المختبرات ←' : 'Explore Labs →'}
              </span>
            </div>

            <div 
              onClick={() => setActiveTab('radiology')}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3">
                  <Scan size={20} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">{language === 'ar' ? 'الأشعة والسونار' : 'Radiology & Scans'}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {language === 'ar' ? 'فحوصات السونار، الرنين المغناطيسي، المفراس والأشعة السينية.' : 'Schedule ultrasound, MRI, CT scan and X-ray imaging.'}
                </p>
              </div>
              <span className="text-xs font-bold text-cyan-700 mt-4 flex items-center gap-1">
                {language === 'ar' ? 'مراكز الأشعة ←' : 'Imaging Centers →'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: DOCTOR DIRECTORY & APPOINTMENTS */}
      {/* ==================================================== */}
      {activeTab === 'doctors' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {language === 'ar' ? 'دليل الأطباء الاستشاريين وحجز المواعيد' : 'Doctor Directory & Appointments'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ar'
                    ? 'اختر الطبيب المناسب حسب الاختصاص والمحافظة، واطلع على أجور الكشفية وساعات الدوام.'
                    : 'Search approved medical doctors, review consultation fees, clinic locations and schedule appointments.'}
                </p>
              </div>

              <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200">
                {filteredDoctors.length} {language === 'ar' ? 'طبيب متاح' : 'doctors available'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-6 relative">
                <Search size={16} className="absolute top-3.5 start-3 text-slate-400" />
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث باسم الطبيب، التخصص، أو المنطقة...' : 'Search doctor by name, specialty or clinic address...'}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={doctorSpecialtyFilter}
                  onChange={(e) => setDoctorSpecialtyFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                >
                  <option value="all">{language === 'ar' ? 'كافة الاختصاصات' : 'All Specialties'}</option>
                  {doctorSpecialties.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={doctorGovernorateFilter}
                  onChange={(e) => setDoctorGovernorateFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                >
                  <option value="all">{language === 'ar' ? 'كافة المحافظات' : 'All Governorates'}</option>
                  {governoratesList.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctors Cards Grid */}
            {filteredDoctors.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Stethoscope size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">{language === 'ar' ? 'لا يوجد أطباء مطابقين للبحث حالياً' : 'No doctors matched your search criteria'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredDoctors.map((doc) => (
                  <div
                    key={doc.doctorId}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        {doc.photoURL ? (
                          <img src={doc.photoURL} alt={doc.fullName} className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
                            <Stethoscope size={22} />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-base text-slate-900">{doc.fullName}</h4>
                          <span className="text-xs font-bold text-sky-700 block">{doc.specialty}</span>
                          {doc.subspecialty && (
                            <span className="text-[11px] text-slate-500">{doc.subspecialty}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1.5 mb-4">
                        <div className="flex items-start gap-1.5">
                          <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                          <span>{doc.clinicAddress || doc.governorate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>{doc.workingHours || '4:00 PM - 9:00 PM'}</span>
                        </div>
                        {doc.phone && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <Phone size={13} className="text-slate-400 shrink-0" />
                            <span>{doc.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'أجور الكشفية:' : 'Fee:'}</span>
                        <span className="font-mono font-bold text-sm text-[#003366]">
                          {doc.consultationFee ? `${doc.consultationFee.toLocaleString()} د.ع` : (language === 'ar' ? 'تحدد بالعيادة' : 'At clinic')}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedDoctorForBooking(doc)}
                        className="px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Calendar size={14} />
                        <span>{language === 'ar' ? 'حجز موعد' : 'Book'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Booked Appointments Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100">
              {language === 'ar' ? 'مواعيدي المسجلة لدى الأطباء' : 'My Scheduled Doctor Appointments'}
            </h3>

            {doctorAppointments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'ليس لديك مواعيد طبية حالياً.' : 'No booked appointments yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                {doctorAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-base">{apt.doctorName}</strong>
                        <span className="text-xs font-semibold text-sky-800">({apt.specialty})</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : apt.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {apt.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{apt.date}</span>
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={13} className="text-slate-400" />
                          <span>{apt.timeSlot}</span>
                        </span>
                        {apt.notes && (
                          <>
                            <span>·</span>
                            <span className="italic">{apt.notes}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {apt.status === 'pending' && (
                        <button
                          onClick={() => setCancellingAppointment(apt)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold cursor-pointer"
                        >
                          {language === 'ar' ? 'إلغاء الموعد' : 'Cancel'}
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
      {/* TAB 3: PHARMACY & MEDICINE SEARCH & ORDERS */}
      {/* ==================================================== */}
      {activeTab === 'pharmacy' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {language === 'ar' ? 'البحث عن الأدوية والصيدليات المعتمدة' : 'Medicine & Pharmacy Search Engine'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ar'
                    ? 'ابحث بالاسم التجاري أو المادة الفعالة لمعرفة توفر الدواء، الأسعار الرسمية بالدينار، والصيدليات المعتمدة.'
                    : 'Search medicines by trade brand or generic active ingredient with current Iraqi pharmacy availability.'}
                </p>
              </div>

              <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200">
                {filteredMedicines.length} {language === 'ar' ? 'صنف مسجل' : 'products found'}
              </div>
            </div>

            {/* Multi-Criteria Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-6 relative">
                <Search size={16} className="absolute top-3.5 start-3 text-slate-400" />
                <input
                  type="text"
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث بالاسم التجاري (Panadol) أو المادة الفعالة (Paracetamol)...' : 'Search trade name, generic or manufacturer...'}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#00796b]"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={medicineDosageFilter}
                  onChange={(e) => setMedicineDosageFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                >
                  <option value="all">{language === 'ar' ? 'كافة الأشكال الصيدلانية' : 'All Dosage Forms'}</option>
                  <option value="Tablets (أقراص)">أقراص (Tablets)</option>
                  <option value="Capsules (كبسولات)">كبسولات (Capsules)</option>
                  <option value="Syrup (شراب)">شراب (Syrup)</option>
                  <option value="Inhaler (بخاخ)">بخاخ (Inhaler)</option>
                  <option value="Injection / Ampoule (حقن)">حقن (Injection)</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={medicineAvailabilityFilter}
                  onChange={(e) => setMedicineAvailabilityFilter(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                >
                  <option value="all">{language === 'ar' ? 'كافة الأصناف' : 'All Products'}</option>
                  <option value="in_stock">{language === 'ar' ? 'متوفر بالمخزون فقط' : 'In Stock Only'}</option>
                  <option value="prescription">{language === 'ar' ? 'أدوية بوصفة طبية فقط (Rx)' : 'Rx Only'}</option>
                </select>
              </div>
            </div>

            {/* Medicines Grid */}
            {filteredMedicines.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'لا توجد أدوية مطابقة لمعايير البحث.' : 'No medicines matched your criteria.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredMedicines.map((m) => {
                  const expiredItem = isExpired(m.expiryDate);
                  const isAvailable = !expiredItem && m.quantity > 0 && m.isAvailable;

                  return (
                    <div
                      key={m.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        expiredItem
                          ? 'border-red-200 bg-red-50/30'
                          : !isAvailable
                          ? 'border-slate-200 bg-slate-50/50 opacity-80'
                          : 'border-slate-200 hover:border-teal-300 bg-white shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                            {m.dosageForm}
                          </span>

                          <div className="flex items-center gap-1">
                            {m.requiresPrescription && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-800" title="يتطلب وصفة طبية">
                                Rx
                              </span>
                            )}
                            {expiredItem ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white">
                                {language === 'ar' ? 'منتهي الصلاحية' : 'Expired'}
                              </span>
                            ) : isAvailable ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                {language === 'ar' ? 'متوفر' : 'Available'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                                {language === 'ar' ? 'غير متوفر' : 'Out of Stock'}
                              </span>
                            )}
                          </div>
                        </div>

                        <h4 className="font-bold text-base text-slate-900 mb-0.5">{m.name}</h4>

                        <div className="text-xs text-[#004d40] font-semibold mb-2">
                          <span className="text-slate-400">{language === 'ar' ? 'المادة العلمية:' : 'Generic:'}</span> {m.activeIngredient}
                        </div>

                        <div className="text-xs text-slate-500 space-y-1 mb-3">
                          <div className="flex justify-between">
                            <span>{language === 'ar' ? 'العيار والعبوة:' : 'Pack:'}</span>
                            <span className="font-mono text-slate-800">{m.strength} ({m.packageSize})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{language === 'ar' ? 'الصيدلية المعتمدة:' : 'Pharmacy:'}</span>
                            <span className="text-slate-900 font-bold">{m.pharmacyName}</span>
                          </div>
                          {(m.pharmacyGovernorate || m.pharmacyAddress) && (
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>{language === 'ar' ? 'الموقع:' : 'Location:'}</span>
                              <span className="truncate max-w-[170px]">{m.pharmacyGovernorate} {m.pharmacyAddress ? `· ${m.pharmacyAddress}` : ''}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>{language === 'ar' ? 'تاريخ الصلاحية:' : 'Expiry Date:'}</span>
                            <span className={`font-mono font-bold ${expiredItem ? 'text-red-700' : 'text-slate-800'}`}>
                              {m.expiryDate}
                            </span>
                          </div>

                          {m.benefits && (
                            <div className="pt-2 border-t border-slate-100 text-[11px] text-teal-800 bg-teal-50/60 p-2 rounded-xl">
                              <span className="font-bold text-teal-950 block mb-0.5">
                                {language === 'ar' ? '💡 فائدة الدواء:' : '💡 Benefits:'}
                              </span>
                              <p className="line-clamp-2">{m.benefits}</p>
                            </div>
                          )}

                          {m.sideEffects && (
                            <div className="text-[11px] text-rose-800 bg-rose-50/60 p-2 rounded-xl">
                              <span className="font-bold text-rose-950 block mb-0.5">
                                {language === 'ar' ? '⚠️ الأضرار والمحاذير:' : '⚠️ Risks & Side Effects:'}
                              </span>
                              <p className="line-clamp-2">{m.sideEffects}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="font-mono font-black text-sm text-[#00796b]">
                          {m.price.toLocaleString()} {language === 'ar' ? 'د.ع' : 'IQD'}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingMedicineDetails(m)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            title={language === 'ar' ? 'عرض الفائدة والأضرار وتفاصيل الصيدلية' : 'View Benefits, Risks & Pharmacy Details'}
                          >
                            <Info size={13} className="text-[#00796b]" />
                            <span>{language === 'ar' ? 'التفاصيل والفوائد' : 'Details'}</span>
                          </button>

                          <button
                            disabled={!isAvailable}
                            onClick={() => {
                              setSelectedMedicineForOrder(m);
                              setOrderQuantity(1);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#00796b] hover:bg-teal-800 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <ShoppingBag size={13} />
                            <span>{language === 'ar' ? 'طلب' : 'Order'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Medicine Orders */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100">
              {language === 'ar' ? 'طلبات الأدوية الخاصة بي' : 'My Pharmacy Orders & Deliveries'}
            </h3>

            {patientPharmacyOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'لا توجد طلبات أدوية مسجلة حتى الآن.' : 'No medicine orders placed yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                {patientPharmacyOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-base">{ord.pharmacyName}</strong>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {ord.status}
                        </span>
                        {ord.orderType === 'delivery' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 flex items-center gap-1">
                            <Truck size={10} />
                            <span>{language === 'ar' ? 'توصيل' : 'Delivery'}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                        {ord.items.map((it, idx) => (
                          <div key={idx}>
                            {it.name} ({it.strength}) × {it.quantity} — <span className="font-mono text-teal-800 font-bold">{it.totalPrice.toLocaleString()} د.ع</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-xs text-slate-400 font-mono mt-1">
                        {ord.createdAt.split('T')[0]} · {language === 'ar' ? 'الإجمالي:' : 'Total:'} {ord.totalAmount.toLocaleString()} د.ع
                      </div>
                    </div>

                    {ord.deliveryAddress && (
                      <div className="text-xs text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                        <MapPin size={12} className="inline me-1 text-slate-400" />
                        <span>{ord.deliveryAddress}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: LABORATORY SERVICES & TEST BOOKINGS */}
      {/* ==================================================== */}
      {activeTab === 'labs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {language === 'ar' ? 'دليل الفحوصات والتحاليل الطبية المخبرية' : 'Clinical Laboratory Tests Directory'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ar'
                    ? 'اختر التحليل المطلوب، واطلع على شروط الصيام وسحب العينة، مع إمكانية السحب المنزلي.'
                    : 'Browse lab tests, fasting requirements, estimated turnaround time, and book laboratory visits.'}
                </p>
              </div>

              <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-50 text-orange-800 border border-orange-200">
                {filteredLabTests.length} {language === 'ar' ? 'تحليل متاح' : 'tests available'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-8 relative">
                <Search size={16} className="absolute top-3.5 start-3 text-slate-400" />
                <input
                  type="text"
                  value={labTestSearch}
                  onChange={(e) => setLabTestSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث باسم التحليل (CBC, HbA1c, Lipid Profile)...' : 'Search test name or category...'}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={labCategoryFilter}
                  onChange={(e) => setLabCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                >
                  <option value="all">{language === 'ar' ? 'كافة أقسام التحاليل' : 'All Categories'}</option>
                  {labCategories.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tests Grid */}
            {filteredLabTests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'لا توجد تحاليل مطابقة لمعايير البحث.' : 'No tests found matching your search.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredLabTests.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                          {t.category}
                        </span>
                        {(t.fastingRequired || (t.fastingInstructions && t.fastingInstructions.length > 0)) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            {language === 'ar' ? 'يتطلب صيام' : 'Fasting Req.'}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base text-slate-900 mb-1">{t.name}</h4>
                      <div className="text-xs text-slate-500 mb-3">{t.labName || (language === 'ar' ? 'مختبر تحليلات' : 'Clinical Lab')}</div>

                      <div className="text-xs text-slate-600 space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>{language === 'ar' ? 'نوع العينة:' : 'Sample:'}</span>
                          <span className="font-semibold text-slate-800">{t.sampleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{language === 'ar' ? 'وقت ظهور النتيجة:' : 'Turnaround:'}</span>
                          <span className="text-slate-800">{t.estimatedHours || t.turnaroundHours || 24} {language === 'ar' ? 'ساعة' : 'hours'}</span>
                        </div>
                        {(t.preparationInstructions || t.fastingInstructions) && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg mt-2">
                            {t.preparationInstructions || t.fastingInstructions}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="font-mono font-bold text-sm text-orange-950">
                        {t.price.toLocaleString()} {language === 'ar' ? 'د.ع' : 'IQD'}
                      </div>

                      <button
                        onClick={() => setSelectedTestForBooking(t)}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FlaskConical size={14} />
                        <span>{language === 'ar' ? 'حجز التحليل' : 'Book Test'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Lab Bookings */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100">
              {language === 'ar' ? 'حجوزات وتتبع عينات التحاليل الخاصة بي' : 'My Lab Appointments & Sample Tracking'}
            </h3>

            {patientLabBookings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'لا توجد حجوزات تحاليل مسجلة حالياً.' : 'No lab bookings found.'}
              </div>
            ) : (
              <div className="space-y-3">
                {patientLabBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-base">{b.testName}</strong>
                        <span className="text-xs text-slate-500">({b.labName})</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {b.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 font-mono">
                          {b.sampleStatus}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span>{b.date}</span>
                        <span>·</span>
                        <span>{b.timeSlot}</span>
                        <span>·</span>
                        <span>{b.bookingType === 'home_collection' ? (language === 'ar' ? 'سحب منزلي' : 'Home Collection') : (language === 'ar' ? 'حضور للمختبر' : 'In-Lab')}</span>
                      </div>
                    </div>

                    {b.resultReady && b.resultId && (
                      <button
                        onClick={() => {
                          const res = patientLabResults.find(r => r.id === b.resultId);
                          if (res) setSelectedLabResultModal(res);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>{language === 'ar' ? 'عرض النتيجة' : 'View Result'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: RADIOLOGY & ULTRASOUND SERVICES */}
      {/* ==================================================== */}
      {activeTab === 'radiology' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {language === 'ar' ? 'دليل فحوصات الأشعة والسونار والرنين' : 'Radiology & Imaging Scans Directory'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ar'
                    ? 'فحوصات السونار، الأشعة السينية، الرنين المغناطيسي، والمفراس الحلزوني في المراكز المعتمدة.'
                    : 'Schedule ultrasound, X-ray, MRI, and CT scan examinations.'}
                </p>
              </div>

              <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-200">
                {filteredRadiologyScans.length} {language === 'ar' ? 'فحص متاح' : 'scans available'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-8 relative">
                <Search size={16} className="absolute top-3.5 start-3 text-slate-400" />
                <input
                  type="text"
                  value={scanSearch}
                  onChange={(e) => setScanSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث باسم الفحص (Pelvic Ultrasound, Chest X-Ray, Brain MRI)...' : 'Search scan name or modality...'}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={scanModalityFilter}
                  onChange={(e) => setScanModalityFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                >
                  <option value="all">{language === 'ar' ? 'كافة الأجهزة والموديلات' : 'All Modalities'}</option>
                  <option value="ultrasound">{language === 'ar' ? 'سونار (Ultrasound)' : 'Ultrasound'}</option>
                  <option value="xray">{language === 'ar' ? 'أشعة سينية (X-Ray)' : 'X-Ray'}</option>
                  <option value="mri">{language === 'ar' ? 'رنين مغناطيسي (MRI)' : 'MRI'}</option>
                  <option value="ct">{language === 'ar' ? 'مفراس حلزوني (CT)' : 'CT Scan'}</option>
                  <option value="doppler">{language === 'ar' ? 'دوبلر ملون (Doppler)' : 'Doppler'}</option>
                </select>
              </div>
            </div>

            {/* Scans Grid */}
            {filteredRadiologyScans.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'لا توجد فحوصات أشعة مطابقة للبحث.' : 'No imaging scans found.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredRadiologyScans.map((s) => (
                  <div
                    key={s.id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 uppercase font-mono">
                          {s.modality}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-slate-900 mb-2">{s.name}</h4>

                      {s.preparationInstructions && (
                        <p className="text-[11px] text-cyan-900 bg-cyan-50 p-2 rounded-lg mb-3">
                          {s.preparationInstructions}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="font-mono font-bold text-sm text-cyan-950">
                        {s.price.toLocaleString()} {language === 'ar' ? 'د.ع' : 'IQD'}
                      </div>

                      <button
                        onClick={() => setSelectedScanForBooking(s)}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Scan size={14} />
                        <span>{language === 'ar' ? 'حجز الفحص' : 'Book Scan'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Radiology Bookings */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100">
              {language === 'ar' ? 'حجوزاتي في مراكز الأشعة والسونار' : 'My Radiology Appointments & Status'}
            </h3>

            {patientRadiologyBookings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'لا توجد حجوزات أشعة مسجلة حالياً.' : 'No radiology bookings found.'}
              </div>
            ) : (
              <div className="space-y-3">
                {patientRadiologyBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-base">{b.serviceName}</strong>
                        <span className="text-xs text-slate-500">({b.centerName})</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}>
                          {b.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span>{b.date}</span>
                        <span>·</span>
                        <span>{b.timeSlot}</span>
                        <span>·</span>
                        <span className="uppercase font-mono font-bold text-cyan-800">{b.modality}</span>
                      </div>
                    </div>

                    {b.reportReady && b.reportId && (
                      <button
                        onClick={() => {
                          const rep = patientRadiologyReports.find(r => r.id === b.reportId);
                          if (rep) setSelectedRadiologyReportModal(rep);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>{language === 'ar' ? 'عرض التقرير الطبي' : 'View Report'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: MEDICAL RECORDS & DIAGNOSTIC VAULT */}
      {/* ==================================================== */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {language === 'ar' ? 'السجل الطبي الموحد والتقارير التشخيصية' : 'Comprehensive Medical Records Vault'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ar'
                    ? 'تقارير الأشعة المعتمدة، نتائج التحاليل المخبرية، والوثائق والوصفات المرفوعة من قبلك.'
                    : 'Certified radiology reports, lab test findings, and personal medical records protected in Firestore.'}
                </p>
              </div>

              <button
                onClick={() => setShowUploadRecordModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#003366] hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Upload size={16} />
                <span>{language === 'ar' ? 'إضافة تقرير / فحص طبي' : 'Upload Medical Document'}</span>
              </button>
            </div>

            {/* Official Radiology Reports Section */}
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <Scan size={16} className="text-cyan-600" />
                <span>{language === 'ar' ? 'تقارير الأشعة والسونار الصادرة من المراكز المعتمدة:' : 'Certified Radiology Diagnostic Reports:'}</span>
                <span className="text-xs text-slate-400 font-mono">({patientRadiologyReports.length})</span>
              </h3>

              {patientRadiologyReports.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 text-center text-slate-400 text-xs">
                  {language === 'ar' ? 'لا توجد تقارير أشعة منشورة حتى الآن.' : 'No certified radiology reports published yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientRadiologyReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-cyan-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 uppercase font-mono">
                            {rep.modality}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{rep.createdAt.split('T')[0]}</span>
                        </div>

                        <h4 className="font-bold text-base text-slate-900 mb-1">{rep.serviceName}</h4>
                        <div className="text-xs text-slate-500 mb-2">{rep.centerName}</div>

                        <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 mb-3 line-clamp-3">
                          <strong>{language === 'ar' ? 'الخلاصة التشخيصية (Impression):' : 'Impression:'}</strong>{' '}
                          {rep.impression}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">{rep.radiologistName}</span>
                        <button
                          onClick={() => setSelectedRadiologyReportModal(rep)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>{language === 'ar' ? 'فتح التقرير الرسمي' : 'View Full Report'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Official Laboratory Results Section */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <FlaskConical size={16} className="text-orange-600" />
                <span>{language === 'ar' ? 'نتائج التحاليل المخبرية المعتمدة:' : 'Certified Laboratory Results:'}</span>
                <span className="text-xs text-slate-400 font-mono">({patientLabResults.length})</span>
              </h3>

              {patientLabResults.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 text-center text-slate-400 text-xs">
                  {language === 'ar' ? 'لا توجد نتائج تحاليل منشورة حتى الآن.' : 'No certified lab results published yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientLabResults.map((labRes) => (
                    <div
                      key={labRes.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-orange-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                            {labRes.category || 'Clinical Lab'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{labRes.createdAt.split('T')[0]}</span>
                        </div>

                        <h4 className="font-bold text-base text-slate-900 mb-1">{labRes.testName}</h4>
                        <div className="text-xs text-slate-500 mb-3">{labRes.labName}</div>

                        <div className="space-y-1 mb-3">
                          {labRes.parameters.slice(0, 3).map((p, idx) => (
                            <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100">
                              <span className="text-slate-700">{p.name}</span>
                              <span className={`font-mono font-bold ${
                                p.status === 'normal' ? 'text-emerald-700' : 'text-red-600'
                              }`}>
                                {p.value} {p.unit}
                              </span>
                            </div>
                          ))}
                          {labRes.parameters.length > 3 && (
                            <span className="text-[11px] text-slate-400 block pt-1">
                              +{labRes.parameters.length - 3} {language === 'ar' ? 'مؤشرات إضافية' : 'more parameters'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">{labRes.pathologistName}</span>
                        <button
                          onClick={() => setSelectedLabResultModal(labRes)}
                          className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>{language === 'ar' ? 'عرض النتيجة' : 'View Result'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Personal Uploaded Documents Section */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-slate-600" />
                <span>{language === 'ar' ? 'الوثائق والفحوصات المرفوعة من قبلي:' : 'Self-Uploaded Medical Documents:'}</span>
                <span className="text-xs text-slate-400 font-mono">({personalRecords.length})</span>
              </h3>

              {personalRecords.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 text-center text-slate-400 text-xs">
                  {language === 'ar' ? 'لم تقم برفع أي وثائق طبية سابقة.' : 'No self-uploaded documents yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personalRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {rec.recordType}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{rec.createdAt.split('T')[0]}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mb-1">{rec.title}</h4>
                        {rec.sourceFacility && (
                          <div className="text-xs text-slate-500 mb-2">{rec.sourceFacility}</div>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2">{rec.details}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
                        <button
                          onClick={() => setViewingRecordDetails(rec)}
                          className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>{language === 'ar' ? 'عرض' : 'View'}</span>
                        </button>
                        <button
                          onClick={() => handleDeletePersonalRecord(rec.id)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          title="حذف المستند"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 7: NOTIFICATIONS & SYSTEM ALERTS */}
      {/* ==================================================== */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'مركز الإشعارات والتنبيهات الحية' : 'Real-Time Notifications'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'إشعارات حقيقية حول تحديثات المواعيد وجاهزية نتائج التحاليل وتقارير الأشعة من Firestore.'
                  : 'Live updates regarding appointment confirmations, ready reports and pharmacy orders.'}
              </p>
            </div>

            <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 text-red-800">
              {unreadNotifsCount} {language === 'ar' ? 'تنبيهات جديدة' : 'unread'}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bell size={40} className="mx-auto mb-2 opacity-30" />
              <p>{language === 'ar' ? 'لا توجد إشعارات مسجلة حالياً.' : 'No notifications found.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkNotificationRead(n.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    n.read 
                      ? 'bg-slate-50/60 border-slate-200 text-slate-700' 
                      : 'bg-sky-50/80 border-sky-300 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      n.read ? 'bg-slate-200 text-slate-600' : 'bg-[#0284c7] text-white'
                    }`}>
                      <Bell size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{n.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                  </div>

                  {!n.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 8: PATIENT HEALTH PASSPORT PROFILE SETTINGS */}
      {/* ==================================================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSavePatientProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'بيانات الجواز الصحي والطوارئ' : 'Health Passport & Emergency Settings'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'تحديث بيانات الهوية الشخصية، فصيلة الدم، أرقام الطوارئ، الأمراض المزمنة والتحسسات.'
                  : 'Maintain personal credentials, emergency contacts, blood group, allergies and medications.'}
              </p>
            </div>

            <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800">
              {patientProfile?.medicalId || generateMedicalId(user?.uid || '')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الاسم الكامل للمريض *' : 'Patient Full Name *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.fullName}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0284c7]"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
              </label>
              <select
                value={editProfileForm.governorate}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, governorate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-[#0284c7]"
              >
                {governoratesList.map((gov) => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'فصيلة الدم *' : 'Blood Type *'}
              </label>
              <select
                value={editProfileForm.bloodType}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, bloodType: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-[#0284c7]"
              >
                {bloodTypes.map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'عنوان السكن بالتفصيل' : 'Detailed Home Address'}
              </label>
              <input
                type="text"
                value={editProfileForm.address}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                placeholder="بغداد، الكرخ، حي الجامعة"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>

            {/* Emergency Contacts Box */}
            <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-red-950 mb-1">
                  {language === 'ar' ? 'اسم جهة اتصال الطوارئ (الأب / الزوج / القريب)' : 'Emergency Contact Name'}
                </label>
                <input
                  type="text"
                  value={editProfileForm.emergencyContactName}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, emergencyContactName: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: محمد علي (شقيق)' : 'e.g. John Doe (Brother)'}
                  className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-red-950 mb-1">
                  {language === 'ar' ? 'هاتف الطوارئ المباشر' : 'Emergency Contact Phone'}
                </label>
                <input
                  type="tel"
                  value={editProfileForm.emergencyContactPhone}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, emergencyContactPhone: e.target.value })}
                  placeholder="07XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm bg-white font-mono"
                />
              </div>
            </div>

            {/* Vitals */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الطول (سم)' : 'Height (cm)'}
              </label>
              <input
                type="number"
                min={50}
                max={250}
                value={editProfileForm.heightCm}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, heightCm: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الوزن (كغم)' : 'Weight (kg)'}
              </label>
              <input
                type="number"
                min={20}
                max={300}
                value={editProfileForm.weightKg}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, weightKg: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}
              </label>
              <input
                type="date"
                value={editProfileForm.dateOfBirth}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, dateOfBirth: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الجنس' : 'Gender'}
              </label>
              <select
                value={editProfileForm.gender}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, gender: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="male">{language === 'ar' ? 'ذكر' : 'Male'}</option>
                <option value="female">{language === 'ar' ? 'أنثى' : 'Female'}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'التحسسات الدوائية والغذائية (مفصولة بفواصل)' : 'Known Allergies (comma-separated)'}
              </label>
              <input
                type="text"
                value={editProfileForm.allergies}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, allergies: e.target.value })}
                placeholder="Penicillin, Sulfa, Peanuts..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الأمراض المزمنة (مفصولة بفواصل)' : 'Chronic Conditions (comma-separated)'}
              </label>
              <input
                type="text"
                value={editProfileForm.chronicDiseases}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, chronicDiseases: e.target.value })}
                placeholder="Hypertension, Type 2 Diabetes, Asthma..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الأدوية المستمرة التي يتناولها المريض حالياً' : 'Current Ongoing Medications'}
              </label>
              <textarea
                rows={2}
                value={editProfileForm.currentMedications}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, currentMedications: e.target.value })}
                placeholder="Metformin 500mg, Lisinopril 10mg..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {language === 'ar' ? 'البيانات محمية بموجب قواعد حماية خصوصية المرضى في Firestore' : 'Patient data secured via Firestore rules'}
            </span>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer"
            >
              {language === 'ar' ? 'حفظ البيانات الصحية' : 'Save Health Profile'}
            </button>
          </div>
        </form>
      )}

      {/* ==================================================== */}
      {/* MODAL: BOOK DOCTOR APPOINTMENT */}
      {/* ==================================================== */}
      {selectedDoctorForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {language === 'ar' ? `حجز موعد لدى: ${selectedDoctorForBooking.fullName}` : `Book: ${selectedDoctorForBooking.fullName}`}
                </h3>
                <span className="text-xs text-sky-700 font-semibold">{selectedDoctorForBooking.specialty}</span>
              </div>
              <button
                onClick={() => setSelectedDoctorForBooking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookDoctorAppointment} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <span>{language === 'ar' ? 'أجور الكشفية:' : 'Consultation Fee:'}</span>
                <span className="font-mono font-bold text-[#003366] text-sm">
                  {selectedDoctorForBooking.consultationFee ? `${selectedDoctorForBooking.consultationFee.toLocaleString()} د.ع` : 'تحدد بالعيادة'}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تاريخ الموعد المطلوب *' : 'Appointment Date *'}</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={appointmentBookingForm.date}
                  onChange={(e) => setAppointmentBookingForm({ ...appointmentBookingForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الفترة الزمنية المفضلة *' : 'Preferred Time Slot *'}</label>
                <select
                  value={appointmentBookingForm.timeSlot}
                  onChange={(e) => setAppointmentBookingForm({ ...appointmentBookingForm, timeSlot: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM (صباحاً)</option>
                  <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM (صباحاً)</option>
                  <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM (مساءً)</option>
                  <option value="05:30 PM - 06:00 PM">05:30 PM - 06:00 PM (مساءً)</option>
                  <option value="07:00 PM - 07:30 PM">07:00 PM - 07:30 PM (مساءً)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع الزيارة' : 'Consultation Type'}</label>
                <select
                  value={appointmentBookingForm.consultationType}
                  onChange={(e) => setAppointmentBookingForm({ ...appointmentBookingForm, consultationType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="in_person">{language === 'ar' ? 'كشفية أولى بالعيادة' : 'First In-Person Visit'}</option>
                  <option value="followup">{language === 'ar' ? 'مراجعة ومتابعة علاج' : 'Follow-up'}</option>
                  <option value="urgent">{language === 'ar' ? 'حالة مستعجلة' : 'Urgent'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الشكوى أو الأعراض التي تعاني منها' : 'Symptoms or Medical Notes'}</label>
                <textarea
                  rows={2}
                  value={appointmentBookingForm.notes}
                  onChange={(e) => setAppointmentBookingForm({ ...appointmentBookingForm, notes: e.target.value })}
                  placeholder={language === 'ar' ? 'ألم في المفاصل، صداع مزمن، فحوصات سابقة...' : 'Notes for doctor...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoctorForBooking(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0284c7] hover:bg-sky-700 text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد إرسال الطلب' : 'Submit Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ORDER MEDICINE FROM PHARMACY */}
      {/* ==================================================== */}
      {selectedMedicineForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedMedicineForOrder.name}</h3>
                <span className="text-xs text-teal-700">{selectedMedicineForOrder.pharmacyName}</span>
              </div>
              <button
                onClick={() => setSelectedMedicineForOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOrderMedicine} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'ar' ? 'المادة الفعالة:' : 'Generic:'}</span>
                  <span className="font-semibold text-slate-800">{selectedMedicineForOrder.activeIngredient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'ar' ? 'السعر الرسمي للعبوة:' : 'Unit Price:'}</span>
                  <span className="font-mono font-bold text-teal-800">{selectedMedicineForOrder.price.toLocaleString()} د.ع</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'عدد العبوات المطلوبة *' : 'Quantity *'}</label>
                <input
                  type="number"
                  min={1}
                  max={selectedMedicineForOrder.quantity || 10}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'طريقة الاستلام *' : 'Delivery Method *'}</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="pickup">{language === 'ar' ? 'استلام مباشر من الصيدلية' : 'In-Pharmacy Pickup'}</option>
                  <option value="delivery">{language === 'ar' ? 'توصيل منزلي' : 'Home Delivery'}</option>
                </select>
              </div>

              {orderType === 'delivery' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'عنوان التوصيل بالتفصيل *' : 'Delivery Address *'}</label>
                  <input
                    type="text"
                    required
                    value={orderDeliveryAddress}
                    onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                    placeholder="المنطقة، الشارع، أقرب نقطة دالة"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'ملاحظات للصيدلي' : 'Instructions for Pharmacist'}</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'وصفة طبية مرفقة أو استفسار...' : 'Notes...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-100 flex justify-between items-center text-sm font-bold text-teal-900">
                <span>{language === 'ar' ? 'الإجمالي التقديري:' : 'Total Amount:'}</span>
                <span className="font-mono text-base">{(selectedMedicineForOrder.price * orderQuantity).toLocaleString()} د.ع</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMedicineForOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00796b] text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد الطلب' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: MEDICINE DETAILS, BENEFITS, HARMS & PHARMACY */}
      {/* ==================================================== */}
      {viewingMedicineDetails && (() => {
        const linkedPharmacy = pharmaciesList.find(p => p.pharmacyId === viewingMedicineDetails.pharmacyId);
        const pharmacyPhone = viewingMedicineDetails.pharmacyPhone || linkedPharmacy?.phone || '';
        const pharmacyAddress = viewingMedicineDetails.pharmacyAddress || linkedPharmacy?.address || '';
        const pharmacyGov = viewingMedicineDetails.pharmacyGovernorate || linkedPharmacy?.governorate || '';
        const expired = isExpired(viewingMedicineDetails.expiryDate);
        const cleanPhone = pharmacyPhone.replace(/[^0-9]/g, '');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 font-bold text-xl flex-shrink-0">
                    💊
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                      <span>{viewingMedicineDetails.name}</span>
                      {viewingMedicineDetails.strength && (
                        <span className="text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono">
                          {viewingMedicineDetails.strength}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {language === 'ar' ? 'المادة العلمية الفعالة: ' : 'Active Ingredient: '}
                      <span className="font-semibold text-slate-800">{viewingMedicineDetails.activeIngredient || '—'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingMedicineDetails(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Status and badges banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'السعر الرسمي' : 'Official Price'}</span>
                  <span className="text-sm font-mono font-black text-teal-700">{viewingMedicineDetails.price.toLocaleString()} د.ع</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'الشكل الصيدلاني' : 'Dosage Form'}</span>
                  <span className="text-xs font-bold text-slate-800">{viewingMedicineDetails.dosageForm || 'أقراص / علاج'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'تاريخ الصلاحية' : 'Expiry Date'}</span>
                  <span className={`text-xs font-mono font-bold ${expired ? 'text-rose-600' : 'text-slate-700'}`}>
                    {viewingMedicineDetails.expiryDate || '—'} {expired && `(${language === 'ar' ? 'منتهي' : 'Expired'})`}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'نوع الصرف' : 'Rx Status'}</span>
                  <span className={`text-[11px] font-bold ${viewingMedicineDetails.requiresPrescription ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {viewingMedicineDetails.requiresPrescription 
                      ? (language === 'ar' ? 'بوصفة طبية' : 'Prescription Req.') 
                      : (language === 'ar' ? 'صرف مباشر OTC' : 'Over The Counter')}
                  </span>
                </div>
              </div>

              {/* Main Content Sections */}
              <div className="space-y-4 text-xs">
                {/* Benefits / Uses */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-200/80">
                  <div className="flex items-center gap-2 mb-2 font-bold text-emerald-950 text-sm">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shadow-sm">✓</span>
                    <h4>{language === 'ar' ? 'فائدة الدواء ودواعي الاستعمال' : 'Medical Benefits & Therapeutic Indications'}</h4>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-normal whitespace-pre-line text-xs sm:text-sm">
                    {viewingMedicineDetails.benefits 
                      ? viewingMedicineDetails.benefits 
                      : (language === 'ar' 
                          ? 'يُستخدم هذا المستحضر الطبي وفق الاستطبابات المعتمدة ووفق إرشادات الصيدلي والطبيب المعالج. يرجى مراجعة الصيدلية لمزيد من التفاصيل والاستشارة المتخصصة.' 
                          : 'Used according to approved clinical indications. Consult the pharmacist or attending physician for specific therapeutic guidance.')}
                  </p>
                </div>

                {/* Harms / Side Effects / Warnings */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-rose-50/40 border border-amber-200/80">
                  <div className="flex items-center gap-2 mb-2 font-bold text-amber-950 text-sm">
                    <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs shadow-sm">⚠️</span>
                    <h4>{language === 'ar' ? 'أضرار الدواء والآثار الجانبية وموانع الاستعمال' : 'Side Effects, Harms & Contraindications'}</h4>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-normal whitespace-pre-line text-xs sm:text-sm">
                    {viewingMedicineDetails.sideEffects 
                      ? viewingMedicineDetails.sideEffects 
                      : (language === 'ar' 
                          ? 'قد تشمل الآثار الجانبية الشائعة اضطرابات هضمية طفيفة أو تحسس لدى بعض المرضى. يحظر الاستخدام في حال وجود حساسية تجاه المادة الفعالة أو خلال الحمل والرضاعة إلا بإشراف طبي دقيق.' 
                          : 'May cause common side effects or hypersensitivity. Contraindicated in case of allergy to active compound, or during pregnancy/lactation unless explicitly directed by a doctor.')}
                  </p>
                </div>

                {/* Pharmacy Location & Stock Info */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <span className="text-base">🏥</span>
                      <h4>{language === 'ar' ? 'الصيدلية المتوفر بها هذا الدواء' : 'Available At Pharmacy'}</h4>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${viewingMedicineDetails.quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {viewingMedicineDetails.quantity > 0 
                        ? (language === 'ar' ? `متوفر في المخزن (${viewingMedicineDetails.quantity} عبوة)` : `In Stock (${viewingMedicineDetails.quantity})`)
                        : (language === 'ar' ? 'غير متوفر حالياً' : 'Out of Stock')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">{language === 'ar' ? 'اسم الصيدلية:' : 'Pharmacy Name:'}</span>
                      <span className="font-bold text-slate-800 text-sm">{viewingMedicineDetails.pharmacyName || 'الصيدلية المعتمدة'}</span>
                    </div>

                    {(pharmacyGov || pharmacyAddress) && (
                      <div>
                        <span className="text-slate-500 block">{language === 'ar' ? 'الموقع والعنوان:' : 'Location & Address:'}</span>
                        <span className="font-semibold text-slate-700">
                          {pharmacyGov ? `${pharmacyGov} - ` : ''}{pharmacyAddress || 'المركز الطبي'}
                        </span>
                      </div>
                    )}
                  </div>

                  {pharmacyPhone && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{language === 'ar' ? 'هاتف الصيدلية:' : 'Phone:'}</span>
                        <span className="font-mono font-bold text-slate-900">{pharmacyPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${pharmacyPhone}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                        >
                          <span>📞</span>
                          <span>{language === 'ar' ? 'اتصال مباشر' : 'Call'}</span>
                        </a>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                          >
                            <span>💬</span>
                            <span>{language === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Clinical / Package Specs */}
                {(viewingMedicineDetails.brand || viewingMedicineDetails.manufacturer || viewingMedicineDetails.packageSize) && (
                  <div className="p-3 rounded-xl bg-slate-100/60 text-slate-600 flex flex-wrap gap-4 text-[11px]">
                    {viewingMedicineDetails.brand && (
                      <div>
                        <span className="text-slate-400">{language === 'ar' ? 'العلامة التجارية: ' : 'Brand: '}</span>
                        <span className="font-semibold text-slate-700">{viewingMedicineDetails.brand}</span>
                      </div>
                    )}
                    {viewingMedicineDetails.manufacturer && (
                      <div>
                        <span className="text-slate-400">{language === 'ar' ? 'الشركة المصنعة: ' : 'Manufacturer: '}</span>
                        <span className="font-semibold text-slate-700">{viewingMedicineDetails.manufacturer}</span>
                      </div>
                    )}
                    {viewingMedicineDetails.packageSize && (
                      <div>
                        <span className="text-slate-400">{language === 'ar' ? 'حجم العبوة: ' : 'Package Size: '}</span>
                        <span className="font-semibold text-slate-700">{viewingMedicineDetails.packageSize}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setViewingMedicineDetails(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const med = viewingMedicineDetails;
                    setViewingMedicineDetails(null);
                    setSelectedMedicineForOrder(med);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#00796b] hover:bg-[#004d40] text-white font-bold inline-flex items-center gap-2 shadow-lg shadow-teal-700/20 transition-all"
                >
                  <span>🛒</span>
                  <span>{language === 'ar' ? 'طلب هذا الدواء الآن' : 'Order Medicine Now'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================================================== */}
      {/* MODAL: BOOK LAB TEST */}
      {/* ==================================================== */}
      {selectedTestForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedTestForBooking.name}</h3>
                <span className="text-xs text-orange-700 font-semibold">{selectedTestForBooking.labName || (language === 'ar' ? 'المختبر المعتمد' : 'Accredited Lab')}</span>
              </div>
              <button
                onClick={() => setSelectedTestForBooking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookLabTest} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100 flex justify-between items-center font-bold">
                <span>{language === 'ar' ? 'سعر التحليل:' : 'Test Fee:'}</span>
                <span className="font-mono text-orange-950 text-base">{selectedTestForBooking.price.toLocaleString()} د.ع</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تاريخ التحليل *' : 'Appointment Date *'}</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={labBookingForm.date}
                  onChange={(e) => setLabBookingForm({ ...labBookingForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'طريقة سحب العينة *' : 'Collection Mode *'}</label>
                <select
                  value={labBookingForm.bookingType}
                  onChange={(e) => setLabBookingForm({ ...labBookingForm, bookingType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="in_lab">{language === 'ar' ? 'حضور للمختبر' : 'In-Lab Visit'}</option>
                  <option value="home_collection">{language === 'ar' ? 'سحب العينة من المنزل (Home Collection)' : 'Home Collection'}</option>
                </select>
              </div>

              {labBookingForm.bookingType === 'home_collection' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'عنوان سحب العينة *' : 'Home Address *'}</label>
                  <input
                    type="text"
                    required
                    value={labBookingForm.homeAddress}
                    onChange={(e) => setLabBookingForm({ ...labBookingForm, homeAddress: e.target.value })}
                    placeholder="المنطقة والشارع ورقم الدار"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'ملاحظات إضافية' : 'Notes'}</label>
                <textarea
                  rows={2}
                  value={labBookingForm.notes}
                  onChange={(e) => setLabBookingForm({ ...labBookingForm, notes: e.target.value })}
                  placeholder="ملاحظات..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTestForBooking(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد الحجز' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: BOOK RADIOLOGY SCAN */}
      {/* ==================================================== */}
      {selectedScanForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedScanForBooking.name}</h3>
                <span className="text-xs text-cyan-700 font-mono uppercase">{selectedScanForBooking.modality}</span>
              </div>
              <button
                onClick={() => setSelectedScanForBooking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookRadiologyScan} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-100 flex justify-between items-center font-bold">
                <span>{language === 'ar' ? 'سعر الفحص:' : 'Scan Fee:'}</span>
                <span className="font-mono text-cyan-950 text-base">{selectedScanForBooking.price.toLocaleString()} د.ع</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تاريخ الفحص *' : 'Scan Date *'}</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={scanBookingForm.date}
                  onChange={(e) => setScanBookingForm({ ...scanBookingForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الوقت المفضل *' : 'Time Slot *'}</label>
                <select
                  value={scanBookingForm.timeSlot}
                  onChange={(e) => setScanBookingForm({ ...scanBookingForm, timeSlot: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                  <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                  <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                  <option value="06:00 PM - 06:30 PM">06:00 PM - 06:30 PM</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تعليمات أو إحالة الطبيب' : 'Clinical Indication / Referral'}</label>
                <textarea
                  rows={2}
                  value={scanBookingForm.notes}
                  onChange={(e) => setScanBookingForm({ ...scanBookingForm, notes: e.target.value })}
                  placeholder={language === 'ar' ? 'فحص بإحالة الدكتور...' : 'Doctor referral...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedScanForBooking(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد الحجز' : 'Submit Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: UPLOAD PERSONAL MEDICAL RECORD */}
      {/* ==================================================== */}
      {showUploadRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-900">
                {language === 'ar' ? 'إضافة تقرير أو فحص طبي للسجل' : 'Upload Medical Document'}
              </h3>
              <button
                onClick={() => setShowUploadRecordModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadPersonalRecord} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'عنوان التقرير / الفحص *' : 'Document Title *'}</label>
                <input
                  type="text"
                  required
                  value={uploadRecordForm.title}
                  onChange={(e) => setUploadRecordForm({ ...uploadRecordForm, title: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: فحص دم شامل، تقرير سونار بطن' : 'e.g. Complete Blood Count, Abdominal Ultrasound'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'نوع المستند *' : 'Document Type *'}</label>
                  <select
                    value={uploadRecordForm.recordType}
                    onChange={(e) => setUploadRecordForm({ ...uploadRecordForm, recordType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="lab_result">{language === 'ar' ? 'تحليل مخبري' : 'Lab Result'}</option>
                    <option value="radiology_report">{language === 'ar' ? 'تقرير أشعة' : 'Radiology Report'}</option>
                    <option value="prescription">{language === 'ar' ? 'وصفة طبية' : 'Prescription'}</option>
                    <option value="clinical_note">{language === 'ar' ? 'تقرير طبي عام' : 'Clinical Note'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'المستشفى / المركز المصدر' : 'Issuing Facility'}</label>
                  <input
                    type="text"
                    value={uploadRecordForm.sourceFacility}
                    onChange={(e) => setUploadRecordForm({ ...uploadRecordForm, sourceFacility: e.target.value })}
                    placeholder="مستشفى اليرموك، مختبر المنصور..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'ملخص النتيجة أو الملاحظات' : 'Medical Details / Findings'}</label>
                <textarea
                  rows={3}
                  value={uploadRecordForm.details}
                  onChange={(e) => setUploadRecordForm({ ...uploadRecordForm, details: e.target.value })}
                  placeholder={language === 'ar' ? 'سجل تفاصيل النتيجة، التوصيات الطبية...' : 'Key findings...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'إرفاق صورة المستند / التقرير' : 'Attach Scan / Document Image'}</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:me-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {uploadRecordForm.fileUrl && (
                  <div className="mt-2 text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>{language === 'ar' ? 'تم تجهيز الملف المرفق بنجاح' : 'File attached'}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadRecordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#003366] text-white font-bold"
                >
                  {language === 'ar' ? 'حفظ بالسجل الصحي' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: VIEW RADIOLOGY OFFICIAL REPORT */}
      {/* ==================================================== */}
      {selectedRadiologyReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {language === 'ar' ? 'التقرير التشخيصي للأشعة والسونار' : 'Radiology Diagnostic Report'}
                </h3>
                <span className="text-xs text-cyan-800 font-semibold">{selectedRadiologyReportModal.centerName}</span>
              </div>
              <button
                onClick={() => setSelectedRadiologyReportModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100 flex flex-wrap justify-between gap-3">
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'المريض:' : 'Patient:'}</span>
                  <strong className="text-slate-900 text-sm">{selectedRadiologyReportModal.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'الفحص والجهاز:' : 'Procedure:'}</span>
                  <strong className="text-cyan-900">{selectedRadiologyReportModal.serviceName} ({selectedRadiologyReportModal.modality})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'تاريخ التقرير:' : 'Date:'}</span>
                  <span className="font-mono">{selectedRadiologyReportModal.createdAt.split('T')[0]}</span>
                </div>
              </div>

              <div>
                <strong className="font-bold text-slate-900 text-sm block mb-1">
                  {language === 'ar' ? 'الموجودات التشخيصية (Findings):' : 'Radiological Findings:'}
                </strong>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                  {selectedRadiologyReportModal.findings}
                </div>
              </div>

              <div>
                <strong className="font-bold text-slate-900 text-sm block mb-1">
                  {language === 'ar' ? 'الاستنتاج والخلاصة (Impression):' : 'Impression / Conclusion:'}
                </strong>
                <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 font-bold leading-relaxed text-xs sm:text-sm">
                  {selectedRadiologyReportModal.impression}
                </div>
              </div>

              {selectedRadiologyReportModal.recommendations && (
                <div>
                  <strong className="font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'التوصيات والمتابعة:' : 'Recommendations:'}
                  </strong>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedRadiologyReportModal.recommendations}
                  </p>
                </div>
              )}

              {/* Scans Gallery */}
              {selectedRadiologyReportModal.scanImages && selectedRadiologyReportModal.scanImages.length > 0 && (
                <div>
                  <strong className="font-bold text-slate-700 block mb-2">{language === 'ar' ? 'صور الفحص الإشعاعي المرفقة:' : 'Attached Scan Images:'}</strong>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRadiologyReportModal.scanImages.map((img, idx) => (
                      <img key={idx} src={img} alt="Scan" className="rounded-xl object-cover h-36 w-full border border-slate-200" />
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'الطبيب الإشعاعي الموقع:' : 'Signing Radiologist:'}</span>
                  <strong className="text-slate-800 text-sm">{selectedRadiologyReportModal.radiologistName}</strong>
                  {selectedRadiologyReportModal.radiologistLicense && (
                    <span className="text-[11px] text-slate-500 font-mono block">Lic: {selectedRadiologyReportModal.radiologistLicense}</span>
                  )}
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{language === 'ar' ? 'طباعة التقرير' : 'Print PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: VIEW LAB OFFICIAL RESULT */}
      {/* ==================================================== */}
      {selectedLabResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {language === 'ar' ? 'نتيجة الفحص المخبري المعتمدة' : 'Official Laboratory Result'}
                </h3>
                <span className="text-xs text-orange-800 font-semibold">{selectedLabResultModal.labName}</span>
              </div>
              <button
                onClick={() => setSelectedLabResultModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100 flex flex-wrap justify-between gap-3">
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'المريض:' : 'Patient:'}</span>
                  <strong className="text-slate-900 text-sm">{selectedLabResultModal.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'التحليل:' : 'Test:'}</span>
                  <strong className="text-orange-950">{selectedLabResultModal.testName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                  <span className="font-mono">{selectedLabResultModal.createdAt.split('T')[0]}</span>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">{language === 'ar' ? 'المؤشر / الفحص' : 'Parameter'}</th>
                      <th className="p-3">{language === 'ar' ? 'النتيجة المقاسة' : 'Result Value'}</th>
                      <th className="p-3">{language === 'ar' ? 'الوحدة' : 'Unit'}</th>
                      <th className="p-3">{language === 'ar' ? 'المعدل الطبيعي المعتمد' : 'Reference Range'}</th>
                      <th className="p-3">{language === 'ar' ? 'التقييم' : 'Flag'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLabResultModal.parameters.map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="p-3 font-bold text-slate-900">{p.name}</td>
                        <td className="p-3 font-mono font-bold text-sm text-slate-800">{p.value}</td>
                        <td className="p-3 text-slate-500 font-mono">{p.unit}</td>
                        <td className="p-3 text-slate-600 font-mono">{p.referenceRange}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'normal' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedLabResultModal.notes && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <strong>{language === 'ar' ? 'ملاحظات اختصاصي التحاليل:' : 'Pathologist Remarks:'}</strong>
                  <p className="mt-0.5">{selectedLabResultModal.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'المشرف المخبري:' : 'Certified Pathologist:'}</span>
                  <strong className="text-slate-800 text-sm">{selectedLabResultModal.pathologistName}</strong>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{language === 'ar' ? 'طباعة النتيجة' : 'Print PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: VIEW PERSONAL RECORD DETAILS */}
      {/* ==================================================== */}
      {viewingRecordDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{viewingRecordDetails.title}</h3>
                <span className="text-xs text-slate-400 font-mono">{viewingRecordDetails.recordType}</span>
              </div>
              <button
                onClick={() => setViewingRecordDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {viewingRecordDetails.sourceFacility && (
                <div className="text-slate-600">
                  <strong>{language === 'ar' ? 'الجهة المصدرة:' : 'Facility:'}</strong> {viewingRecordDetails.sourceFacility}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">
                {viewingRecordDetails.details || (language === 'ar' ? 'لا توجد ملاحظات إضافية.' : 'No additional notes.')}
              </div>

              {viewingRecordDetails.fileUrl && (
                <div>
                  <strong className="block text-slate-700 mb-1">{language === 'ar' ? 'الملف المرفق:' : 'Attached Scan / File:'}</strong>
                  <img src={viewingRecordDetails.fileUrl} alt="Attached File" className="rounded-xl max-h-60 w-full object-contain bg-slate-100 border border-slate-200" />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setViewingRecordDetails(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CONFIRM CANCEL APPOINTMENT */}
      {/* ==================================================== */}
      {cancellingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              {language === 'ar' ? 'تأكيد إلغاء موعد العيادة' : 'Cancel Appointment Confirmation'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {language === 'ar' 
                ? `هل أنت متأكد من إلغاء موعدك مع ${cancellingAppointment.doctorName} بتاريخ ${cancellingAppointment.date}؟` 
                : `Are you sure you want to cancel your appointment with ${cancellingAppointment.doctorName} on ${cancellingAppointment.date}?`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancellingAppointment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
              >
                {language === 'ar' ? 'تراجع' : 'No, Keep'}
              </button>
              <button
                onClick={() => handleCancelAppointment(cancellingAppointment)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs"
              >
                {language === 'ar' ? 'تأكيد الإلغاء' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
