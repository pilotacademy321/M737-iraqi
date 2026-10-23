import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  PharmacyProfile, 
  MedicineItem, 
  PharmacyOrder, 
  PharmacyOrderStatus 
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
  Pill, 
  Search, 
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
  MessageSquare, 
  Eye, 
  Send,
  Layers,
  ChevronRight,
  ChevronLeft,
  Users,
  Printer,
  X,
  ExternalLink,
  AlertTriangle,
  FileCheck2,
  Package,
  Calendar,
  Clock,
  Truck,
  ShieldAlert,
  FileText,
  BadgeAlert,
  Sparkles,
  ShoppingBag,
  HeartPulse,
  Settings
} from 'lucide-react';

interface PharmacyPortalWorkspaceProps {
  onBackToHome: () => void;
}

export const PharmacyPortalWorkspace: React.FC<PharmacyPortalWorkspaceProps> = ({ onBackToHome }) => {
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const { language, isRTL } = useLanguage();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'catalog' | 'inventory' | 'orders' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pharmacy Profile State
  const [pharmacyProfile, setPharmacyProfile] = useState<PharmacyProfile | null>(null);

  // Medicines Catalog & Inventory State
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dosageFormFilter, setDosageFormFilter] = useState('all');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'expired' | 'prescription'>('all');
  const [showNewMedicineModal, setShowNewMedicineModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);

  // Medicine Form State
  const [medicineForm, setMedicineForm] = useState({
    name: '',
    activeIngredient: '',
    brand: '',
    manufacturer: '',
    strength: '500mg',
    dosageForm: 'Tablets (أقراص)',
    packageSize: '20 Tablets',
    price: 3500,
    quantity: 50,
    minStockAlert: 10,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    benefits: '',
    sideEffects: '',
    requiresPrescription: false,
    isAvailable: true,
    notes: '',
  });

  // Orders State
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'accepted' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'completed' | 'cancelled'>('all');
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<PharmacyOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PharmacyOrder | null>(null);

  // New Order Form State
  const [newOrderData, setNewOrderData] = useState({
    patientName: '',
    patientPhone: '',
    medicineId: '',
    quantity: 1,
    orderType: 'pickup' as 'pickup' | 'delivery',
    deliveryAddress: '',
    pharmacistNotes: '',
  });

  // Pharmacy Settings State
  const [editProfileForm, setEditProfileForm] = useState({
    pharmacyName: '',
    ownerName: '',
    licenseNumber: '',
    phone: '',
    whatsapp: '',
    address: '',
    governorate: 'بغداد (Baghdad)',
    mapsUrl: '',
    workingHours: '8:00 AM - 12:00 AM',
    logoUrl: '',
    deliveryAvailable: true,
    deliveryFee: 4000,
    nightDuty: false,
    bio: '',
  });

  const isOperable = userProfile?.status === 'approved' || isAdmin;

  const dosageFormsList = [
    'Tablets (أقراص)',
    'Capsules (كبسولات)',
    'Syrup (شراب)',
    'Suspension (معلق)',
    'Injection / Ampoule (حقن)',
    'Cream / Ointment (مرهم / كريم)',
    'Inhaler (بخاخ)',
    'Eye/Ear Drops (قطرات)',
    'Suppositories (تحاميل)',
    'Effervescent (فوار)'
  ];

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

  // Helper to determine expiry status
  const isMedicineExpired = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return expiry < today;
  };

  const isMedicineExpiringSoon = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const sixtyDaysLater = today + 60 * 24 * 60 * 60 * 1000;
    return expiry >= today && expiry <= sixtyDaysLater;
  };

  // Load All Pharmacy Data from Firestore
  const loadPharmacyData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Pharmacy Profile
      const profRef = doc(db, 'pharmacy_profiles', user.uid);
      const profSnap = await getDoc(profRef);

      if (profSnap.exists()) {
        const data = profSnap.data() as PharmacyProfile;
        setPharmacyProfile(data);
        setEditProfileForm({
          pharmacyName: data.pharmacyName || userProfile?.facilityName || 'صيدلية النور النموذجية',
          ownerName: data.ownerName || userProfile?.displayName || 'د. صيدلي استشاري',
          licenseNumber: data.licenseNumber || userProfile?.licenseNumber || '',
          phone: data.phone || userProfile?.phone || '',
          whatsapp: data.whatsapp || userProfile?.phone || '',
          address: data.address || userProfile?.facilityName || '',
          governorate: data.governorate || userProfile?.governorate || 'بغداد (Baghdad)',
          mapsUrl: data.mapsUrl || '',
          workingHours: data.workingHours || '8:00 AM - 12:00 AM',
          logoUrl: data.logoUrl || '',
          deliveryAvailable: data.deliveryAvailable ?? true,
          deliveryFee: data.deliveryFee ?? 4000,
          nightDuty: data.nightDuty ?? false,
          bio: data.bio || '',
        });
      } else {
        // Initialize default pharmacy profile
        const initialProfile: PharmacyProfile = {
          pharmacyId: user.uid,
          pharmacyName: userProfile?.facilityName || userProfile?.displayName || 'صيدلية النور النموذجية',
          ownerName: userProfile?.displayName || 'د. صيدلي مسؤول',
          licenseNumber: userProfile?.licenseNumber || 'PHARM-IQ-2026',
          phone: userProfile?.phone || '07885663748',
          whatsapp: userProfile?.phone || '07885663748',
          address: userProfile?.facilityName || 'بغداد، المنصور، شارع 14 رمضان',
          governorate: userProfile?.governorate || 'بغداد (Baghdad)',
          mapsUrl: '',
          workingHours: '8:00 AM - 12:00 AM',
          logoUrl: '',
          deliveryAvailable: true,
          deliveryFee: 4000,
          nightDuty: false,
          bio: 'صيدلية أهلية معتمدة مجهزة بمنظومة حفظ الأدوية وسلسلة التبريد المعتمدة من نقابة صيادلة العراق.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(profRef, initialProfile);
        setPharmacyProfile(initialProfile);
      }

      // 2. Fetch Pharmacy Medicines Inventory
      const medQuery = query(
        collection(db, 'medicines'),
        where('pharmacyId', '==', user.uid)
      );
      const medSnap = await getDocs(medQuery);
      let medList = medSnap.docs.map(d => ({ id: d.id, ...d.data() } as MedicineItem));

      // Seed standard Iraqi medicines if empty
      if (medList.length === 0) {
        const defaultMedicines: Omit<MedicineItem, 'id'>[] = [
          {
            pharmacyId: user.uid,
            pharmacyName: userProfile?.facilityName || 'صيدلية النور النموذجية',
            name: 'Panadol Extra (بانادول إكسترا)',
            activeIngredient: 'Paracetamol 500mg + Caffeine 65mg',
            brand: 'Panadol',
            manufacturer: 'GSK GlaxoSmithKline',
            strength: '500mg/65mg',
            dosageForm: 'Tablets (أقراص)',
            packageSize: '24 Tablets',
            price: 3500,
            quantity: 80,
            minStockAlert: 15,
            expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            requiresPrescription: false,
            isAvailable: true,
            notes: 'مسكن آلام وخافض حرارة.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            pharmacyId: user.uid,
            pharmacyName: userProfile?.facilityName || 'صيدلية النور النموذجية',
            name: 'Augmentin 1g (أوغمنتين 1 غرام)',
            activeIngredient: 'Amoxicillin 875mg + Clavulanic Acid 125mg',
            brand: 'Augmentin',
            manufacturer: 'GSK',
            strength: '1000mg (1g)',
            dosageForm: 'Tablets (أقراص)',
            packageSize: '14 Tablets',
            price: 11000,
            quantity: 25,
            minStockAlert: 8,
            expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            requiresPrescription: true,
            isAvailable: true,
            notes: 'مضاد حيوي واسع الطيف، يلزم وصفة طبية.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            pharmacyId: user.uid,
            pharmacyName: userProfile?.facilityName || 'صيدلية النور النموذجية',
            name: 'Lipitor 20mg (ليبيتور)',
            activeIngredient: 'Atorvastatin Calcium',
            brand: 'Lipitor',
            manufacturer: 'Pfizer',
            strength: '20mg',
            dosageForm: 'Tablets (أقراص)',
            packageSize: '30 Tablets',
            price: 24000,
            quantity: 18,
            minStockAlert: 5,
            expiryDate: new Date(Date.now() + 600 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            requiresPrescription: true,
            isAvailable: true,
            notes: 'خافض كوليسترول الدم ودهون الكبد.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            pharmacyId: user.uid,
            pharmacyName: userProfile?.facilityName || 'صيدلية النور النموذجية',
            name: 'Nexium 40mg (نيكسيوم)',
            activeIngredient: 'Esomeprazole Magnesium',
            brand: 'Nexium',
            manufacturer: 'AstraZeneca',
            strength: '40mg',
            dosageForm: 'Tablets (أقراص)',
            packageSize: '28 Tablets',
            price: 22000,
            quantity: 30,
            minStockAlert: 8,
            expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            requiresPrescription: false,
            isAvailable: true,
            notes: 'مثبط مضخة البروتون لعلاج حموضة المعدة والارتجاع المريئي.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            pharmacyId: user.uid,
            pharmacyName: userProfile?.facilityName || 'صيدلية النور النموذجية',
            name: 'Ventolin Evohaler (فنتولين بخاخ)',
            activeIngredient: 'Salbutamol Sulfate',
            brand: 'Ventolin',
            manufacturer: 'GSK',
            strength: '100mcg/dose',
            dosageForm: 'Inhaler (بخاخ)',
            packageSize: '200 Doses',
            price: 8500,
            quantity: 4,
            minStockAlert: 10,
            expiryDate: new Date(Date.now() + 450 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            requiresPrescription: true,
            isAvailable: true,
            notes: 'موسع قصبات لحالات الربو والضيق التنفسي الحاد.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ];

        for (const m of defaultMedicines) {
          const mId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await setDoc(doc(db, 'medicines', mId), { id: mId, ...m });
        }
        const refreshedMedSnap = await getDocs(medQuery);
        medList = refreshedMedSnap.docs.map(d => ({ id: d.id, ...d.data() } as MedicineItem));
      }
      setMedicines(medList);

      // 3. Fetch Pharmacy Orders
      const ordQuery = query(
        collection(db, 'pharmacy_orders'),
        where('pharmacyId', '==', user.uid)
      );
      const ordSnap = await getDocs(ordQuery);
      const ordList = ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as PharmacyOrder));
      ordList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(ordList);

    } catch (err: unknown) {
      console.error('Error loading pharmacy data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPharmacyData();
  }, [user]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Helper to send in-app notification to patient
  const sendPatientNotification = async (patientUid: string, title: string, message: string, type: 'booking_update' | 'general') => {
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

  // Add or Edit Medicine
  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !medicineForm.name.trim() || !medicineForm.activeIngredient.trim()) return;

    if (!isOperable) {
      showToast(language === 'ar' ? 'يتطلب إجراء العمليات اعتماد المشرف العام' : 'Super Admin approval required', 'error');
      return;
    }

    try {
      const expired = isMedicineExpired(medicineForm.expiryDate);
      const available = expired ? false : (Number(medicineForm.quantity) > 0 && medicineForm.isAvailable);
      const now = new Date().toISOString();

      if (editingMedicine) {
        // Update existing medicine
        await updateDoc(doc(db, 'medicines', editingMedicine.id), {
          name: medicineForm.name,
          activeIngredient: medicineForm.activeIngredient,
          brand: medicineForm.brand || medicineForm.name,
          manufacturer: medicineForm.manufacturer,
          strength: medicineForm.strength,
          dosageForm: medicineForm.dosageForm,
          packageSize: medicineForm.packageSize,
          price: Number(medicineForm.price),
          quantity: Number(medicineForm.quantity),
          minStockAlert: Number(medicineForm.minStockAlert),
          expiryDate: medicineForm.expiryDate,
          benefits: medicineForm.benefits || '',
          sideEffects: medicineForm.sideEffects || '',
          requiresPrescription: medicineForm.requiresPrescription,
          isAvailable: available,
          notes: medicineForm.notes,
          pharmacyPhone: pharmacyProfile?.phone || userProfile?.phone || '',
          pharmacyGovernorate: pharmacyProfile?.governorate || userProfile?.governorate || 'بغداد (Baghdad)',
          pharmacyAddress: pharmacyProfile?.address || userProfile?.facilityName || '',
          updatedAt: now,
        });
        showToast(language === 'ar' ? 'تم تحديث بيانات الدواء والفوائد والمحاذير بالمخزون' : 'Medicine updated');
      } else {
        // Create new medicine item
        const mId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newItem: MedicineItem = {
          id: mId,
          pharmacyId: user.uid,
          pharmacyName: pharmacyProfile?.pharmacyName || userProfile?.facilityName || 'الصيدلية',
          pharmacyPhone: pharmacyProfile?.phone || userProfile?.phone || '',
          pharmacyGovernorate: pharmacyProfile?.governorate || userProfile?.governorate || 'بغداد (Baghdad)',
          pharmacyAddress: pharmacyProfile?.address || userProfile?.facilityName || '',
          name: medicineForm.name,
          activeIngredient: medicineForm.activeIngredient,
          brand: medicineForm.brand || medicineForm.name,
          manufacturer: medicineForm.manufacturer,
          strength: medicineForm.strength,
          dosageForm: medicineForm.dosageForm,
          packageSize: medicineForm.packageSize,
          price: Number(medicineForm.price),
          quantity: Number(medicineForm.quantity),
          minStockAlert: Number(medicineForm.minStockAlert),
          expiryDate: medicineForm.expiryDate,
          benefits: medicineForm.benefits || '',
          sideEffects: medicineForm.sideEffects || '',
          requiresPrescription: medicineForm.requiresPrescription,
          isAvailable: available,
          notes: medicineForm.notes,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, 'medicines', mId), newItem);
        showToast(language === 'ar' ? 'تمت إضافة الدواء بنجاح للمخزون الصيدلاني' : 'Medicine registered in catalog');
      }

      setShowNewMedicineModal(false);
      setEditingMedicine(null);
      resetMedicineForm();
      await loadPharmacyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'medicines');
    }
  };

  const resetMedicineForm = () => {
    setMedicineForm({
      name: '',
      activeIngredient: '',
      brand: '',
      manufacturer: '',
      strength: '500mg',
      dosageForm: 'Tablets (أقراص)',
      packageSize: '20 Tablets',
      price: 3500,
      quantity: 50,
      minStockAlert: 10,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      benefits: '',
      sideEffects: '',
      requiresPrescription: false,
      isAvailable: true,
      notes: '',
    });
  };

  const handleEditClick = (m: MedicineItem) => {
    setEditingMedicine(m);
    setMedicineForm({
      name: m.name,
      activeIngredient: m.activeIngredient,
      brand: m.brand,
      manufacturer: m.manufacturer,
      strength: m.strength,
      dosageForm: m.dosageForm,
      packageSize: m.packageSize,
      price: m.price,
      quantity: m.quantity,
      minStockAlert: m.minStockAlert || 5,
      expiryDate: m.expiryDate,
      benefits: m.benefits || '',
      sideEffects: m.sideEffects || '',
      requiresPrescription: m.requiresPrescription,
      isAvailable: m.isAvailable,
      notes: m.notes || '',
    });
    setShowNewMedicineModal(true);
  };

  const handleDeleteMedicine = async (medId: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الدواء نهائياً من الصيدلية؟' : 'Delete this medicine from inventory?')) return;
    try {
      await deleteDoc(doc(db, 'medicines', medId));
      showToast(language === 'ar' ? 'تم حذف الدواء من السجل' : 'Medicine removed');
      await loadPharmacyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `medicines/${medId}`);
    }
  };

  // Quick Stock Adjustment
  const handleAdjustStock = async (medId: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      const med = medicines.find(m => m.id === medId);
      const isExpired = med ? isMedicineExpired(med.expiryDate) : false;
      const isAvailable = isExpired ? false : newQty > 0;

      await updateDoc(doc(db, 'medicines', medId), {
        quantity: newQty,
        isAvailable,
        updatedAt: new Date().toISOString(),
      });
      showToast(language === 'ar' ? `تم تعديل المخزون إلى: ${newQty}` : `Stock updated: ${newQty}`);
      await loadPharmacyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `medicines/${medId}`);
    }
  };

  // Create Walk-in / Direct Medicine Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newOrderData.patientName.trim() || !newOrderData.medicineId) return;

    const med = medicines.find(m => m.id === newOrderData.medicineId);
    if (!med) return;

    if (isMedicineExpired(med.expiryDate)) {
      showToast(language === 'ar' ? 'تحذير أمان: لا يمكن صرف دواء منتهي الصلاحية' : 'Safety block: Cannot dispense expired medicine', 'error');
      return;
    }

    if (med.quantity < newOrderData.quantity) {
      showToast(language === 'ar' ? `الكمية المتوفرة حالياً (${med.quantity}) غير كافية` : 'Insufficient inventory stock', 'error');
      return;
    }

    try {
      const ordId = `pord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const patientId = `pat_${Date.now()}`;
      const itemTotal = med.price * newOrderData.quantity;

      const orderDoc: PharmacyOrder = {
        id: ordId,
        pharmacyId: user.uid,
        pharmacyName: pharmacyProfile?.pharmacyName || userProfile?.facilityName || 'الصيدلية',
        patientId,
        patientName: newOrderData.patientName,
        patientPhone: newOrderData.patientPhone || '07XXXXXXXXX',
        items: [
          {
            medicineId: med.id,
            name: med.name,
            activeIngredient: med.activeIngredient,
            strength: med.strength,
            quantity: Number(newOrderData.quantity),
            unitPrice: med.price,
            totalPrice: itemTotal,
          }
        ],
        totalAmount: itemTotal + (newOrderData.orderType === 'delivery' ? (pharmacyProfile?.deliveryFee || 0) : 0),
        orderType: newOrderData.orderType,
        deliveryAddress: newOrderData.orderType === 'delivery' ? newOrderData.deliveryAddress : undefined,
        status: isOperable ? 'accepted' : 'pending',
        pharmacistNotes: newOrderData.pharmacistNotes,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'pharmacy_orders', ordId), orderDoc);

      // Decrement stock if operable
      if (isOperable) {
        await updateDoc(doc(db, 'medicines', med.id), {
          quantity: Math.max(0, med.quantity - newOrderData.quantity),
          updatedAt: now,
        });
      }

      showToast(language === 'ar' ? 'تم تسجيل وتأكيد طلب الدواء' : 'Medicine order confirmed');
      setShowNewOrderModal(false);
      setNewOrderData({
        patientName: '',
        patientPhone: '',
        medicineId: '',
        quantity: 1,
        orderType: 'pickup',
        deliveryAddress: '',
        pharmacistNotes: '',
      });
      await loadPharmacyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'pharmacy_orders');
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, status: PharmacyOrderStatus, patientId?: string) => {
    if (!isOperable) {
      showToast(language === 'ar' ? 'يتطلب إجراء العمليات اعتماد المشرف العام' : 'Super Admin approval required', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'pharmacy_orders', orderId), {
        status,
        updatedAt: new Date().toISOString(),
      });

      if (patientId) {
        const notifTitle = language === 'ar' ? 'تحديث طلب الدواء من الصيدلية' : 'Pharmacy Order Update';
        const notifMsg = language === 'ar'
          ? `تم تحديث حالة طلبك لدى ${pharmacyProfile?.pharmacyName || 'الصيدلية'} إلى: ${status}`
          : `Your medicine order status has changed to: ${status}`;
        await sendPatientNotification(patientId, notifTitle, notifMsg, 'booking_update');
      }

      showToast(language === 'ar' ? `تم تحديث حالة الطلب إلى: ${status}` : `Order status: ${status}`);
      await loadPharmacyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `pharmacy_orders/${orderId}`);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    try {
      await updateDoc(doc(db, 'pharmacy_orders', cancellingOrder.id), {
        status: 'cancelled',
        cancellationReason: cancelReason || (language === 'ar' ? 'تم الإلغاء من قبل الصيدلية' : 'Cancelled by pharmacy'),
        updatedAt: new Date().toISOString(),
      });

      // Restore quantity
      for (const item of cancellingOrder.items) {
        const med = medicines.find(m => m.id === item.medicineId);
        if (med) {
          await updateDoc(doc(db, 'medicines', med.id), {
            quantity: med.quantity + item.quantity,
            isAvailable: true,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      showToast(language === 'ar' ? 'تم إلغاء الطلب واسترجاع الكمية للمخزون' : 'Order cancelled and stock restored');
      setCancellingOrder(null);
      setCancelReason('');
      await loadPharmacyData();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `pharmacy_orders/${cancellingOrder.id}`);
    }
  };

  // Save Pharmacy Settings
  const handleSavePharmacySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const now = new Date().toISOString();
      const updatedProfile: PharmacyProfile = {
        pharmacyId: user.uid,
        pharmacyName: editProfileForm.pharmacyName,
        ownerName: editProfileForm.ownerName,
        licenseNumber: editProfileForm.licenseNumber || pharmacyProfile?.licenseNumber || '',
        phone: editProfileForm.phone,
        whatsapp: editProfileForm.whatsapp,
        address: editProfileForm.address,
        governorate: editProfileForm.governorate,
        mapsUrl: editProfileForm.mapsUrl,
        workingHours: editProfileForm.workingHours,
        logoUrl: editProfileForm.logoUrl,
        deliveryAvailable: editProfileForm.deliveryAvailable,
        deliveryFee: Number(editProfileForm.deliveryFee),
        nightDuty: editProfileForm.nightDuty,
        bio: editProfileForm.bio,
        createdAt: pharmacyProfile?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'pharmacy_profiles', user.uid), updatedProfile);

      // Sync non-privileged user profile fields
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editProfileForm.pharmacyName,
        facilityName: editProfileForm.pharmacyName,
        governorate: editProfileForm.governorate,
        phone: editProfileForm.phone,
        updatedAt: now,
      });

      showToast(language === 'ar' ? 'تم حفظ بيانات وإعدادات الصيدلية بنجاح' : 'Pharmacy profile saved');
      await loadPharmacyData();
      await refreshProfile();
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `pharmacy_profiles/${user.uid}`);
    }
  };

  // Filtered Medicines (Searching by brand, trade name, or active ingredient)
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      // Search Query
      if (searchQuery.trim()) {
        const queryStr = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(queryStr);
        const matchesIngredient = m.activeIngredient.toLowerCase().includes(queryStr);
        const matchesBrand = m.brand?.toLowerCase().includes(queryStr);
        const matchesManufacturer = m.manufacturer?.toLowerCase().includes(queryStr);
        if (!matchesName && !matchesIngredient && !matchesBrand && !matchesManufacturer) {
          return false;
        }
      }

      // Dosage Form Filter
      if (dosageFormFilter !== 'all' && m.dosageForm !== dosageFormFilter) {
        return false;
      }

      // Inventory Status Filter
      if (inventoryStatusFilter === 'in_stock') {
        if (m.quantity <= 0 || isMedicineExpired(m.expiryDate)) return false;
      } else if (inventoryStatusFilter === 'low_stock') {
        if (m.quantity > (m.minStockAlert || 5) || isMedicineExpired(m.expiryDate)) return false;
      } else if (inventoryStatusFilter === 'expired') {
        if (!isMedicineExpired(m.expiryDate)) return false;
      } else if (inventoryStatusFilter === 'prescription') {
        if (!m.requiresPrescription) return false;
      }

      return true;
    });
  }, [medicines, searchQuery, dosageFormFilter, inventoryStatusFilter]);

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  // Derived Metrics
  const lowStockCount = medicines.filter(m => m.quantity <= (m.minStockAlert || 5) && !isMedicineExpired(m.expiryDate)).length;
  const expiredCount = medicines.filter(m => isMedicineExpired(m.expiryDate)).length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const deliveryOrdersCount = orders.filter(o => o.orderType === 'delivery').length;

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
              {language === 'ar' ? 'الصيدلية قيد المراجعة والاعتماد النقابي' : 'Pharmacy Accreditation Under Review'}
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {language === 'ar'
                ? 'وفقاً لضوابط نقابة صيادلة العراق ووزارة الصحة، يتم تقييد قبول وتجهيز طلبات الأدوية وتعديل المخزون حتى يتم تدقيق إجازة ممارسة المهنة من قبل المشرف العام للمنصة.'
                : 'Pursuant to Iraqi Pharmacists Syndicate regulations, dispensing orders and stock listings are restricted until license approval by Super Admin.'}
            </p>
          </div>
        </div>
      )}

      {/* Pharmacy Brand Banner */}
      <div className="bg-gradient-to-r from-[#002244] via-[#004d40] to-[#00796b] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {pharmacyProfile?.logoUrl ? (
              <img 
                src={pharmacyProfile.logoUrl} 
                alt="Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white/10 backdrop-blur-md border border-white/20 shadow-md shrink-0" 
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md shrink-0">
                <Pill size={36} className="text-teal-300" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-bold mb-1.5">
                <CheckCircle2 size={13} />
                <span>{isOperable ? (language === 'ar' ? 'صيدلية معتمدة وموثقة نقابياً' : 'Certified Pharmacy') : (language === 'ar' ? 'قيد التدقيق الإداري' : 'Pending Verification')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {pharmacyProfile?.pharmacyName || userProfile?.facilityName || 'صيدلية النور'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-200 mt-1">
                <span>{language === 'ar' ? 'الصيدلي المسؤول:' : 'Pharmacist:'} {pharmacyProfile?.ownerName}</span>
                <span className="opacity-40">·</span>
                <span>{language === 'ar' ? 'رقم الإجازة:' : 'License:'} {pharmacyProfile?.licenseNumber || userProfile?.licenseNumber || 'PHARM-IQ'}</span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-teal-300" />
                  <span>{pharmacyProfile?.address || userProfile?.facilityName || 'العراق'}</span>
                </span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-teal-300" />
                  <span>{pharmacyProfile?.workingHours || '8:00 AM - 12:00 AM'}</span>
                </span>
                {pharmacyProfile?.deliveryAvailable && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-400/20 text-teal-200 text-xs font-bold">
                      <Truck size={12} />
                      <span>{language === 'ar' ? 'خدمة توصيل' : 'Delivery'}</span>
                    </span>
                  </>
                )}
                {pharmacyProfile?.nightDuty && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 text-xs font-bold">
                      <span>{language === 'ar' ? 'صيدلية خافرة' : 'Night Duty'}</span>
                    </span>
                  </>
                )}
                {pharmacyProfile?.mapsUrl && (
                  <>
                    <span className="opacity-40">·</span>
                    <a 
                      href={pharmacyProfile.mapsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-teal-200 hover:text-white underline flex items-center gap-1"
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
                loadPharmacyData();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{language === 'ar' ? 'تحديث' : 'Sync'}</span>
            </button>
            <button
              onClick={() => {
                resetMedicineForm();
                setEditingMedicine(null);
                setShowNewMedicineModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white text-[#004d40] hover:bg-slate-100 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة دواء جديد' : 'Add Medicine'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 flex items-center gap-3 text-xs leading-relaxed">
        <HeartPulse size={20} className="text-[#00796b] shrink-0" />
        <div>
          <strong>{language === 'ar' ? 'معايير السلامة الدوائية:' : 'Pharmaceutical Safety Notice:'}</strong>{' '}
          {language === 'ar'
            ? 'الأدوية منتهية الصلاحية يتم حجبها تلقائياً عن التوفر. الأدوية التي تحمل وسم (وصفة طبية إلزامية) تتطلب تدقيق الوصفة الطبية الصادرة من طبيب معتمد ولا يجوز صرفها دون تحقق.'
            : 'Expired medicines are automatically suppressed from availability. Prescription-required drugs mandate physician verification before dispensing.'}
        </div>
      </div>

      {/* Pharmacy Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-200/80 rounded-2xl overflow-x-auto text-xs font-bold">
        {[
          { id: 'dashboard', labelAr: 'لوحة المؤشرات', labelEn: 'Dashboard', icon: Activity },
          { id: 'catalog', labelAr: `دليل ومحرك بحث الأدوية (${medicines.length})`, labelEn: `Medicine Catalog (${medicines.length})`, icon: Pill },
          { id: 'inventory', labelAr: 'إدارة المخزون والصلاحية', labelEn: 'Inventory & Expiry', icon: Package },
          { id: 'orders', labelAr: `طلبات وتجهيز الوصفات (${orders.length})`, labelEn: `Medicine Orders (${orders.length})`, icon: ShoppingBag },
          { id: 'settings', labelAr: 'إعدادات الصيدلية والترخيص', labelEn: 'Pharmacy Profile & Hours', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#00796b] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-[#00796b]' : 'text-slate-400'} />
              <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              {tab.id === 'orders' && pendingOrdersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-mono">
                  {pendingOrdersCount}
                </span>
              )}
              {tab.id === 'inventory' && (lowStockCount > 0 || expiredCount > 0) && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
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
              <span className="text-xs text-slate-500 block mb-1 font-semibold">{language === 'ar' ? 'إجمالي الأدوية بالمخزون' : 'Total Cataloged'}</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{medicines.length}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">{language === 'ar' ? 'أصناف دوائية مسجلة' : 'Registered products'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs">
              <span className="text-xs text-amber-700 block mb-1 font-semibold">{language === 'ar' ? 'تنبيه وشك النفاد (مخزون حرج)' : 'Low Stock Alert'}</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">{lowStockCount}</div>
              <span className="text-[11px] text-amber-600 mt-1 block">{language === 'ar' ? 'أصناف بحاجة لإعادة طلب' : 'Requires restocking'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-red-200 shadow-xs">
              <span className="text-xs text-red-700 block mb-1 font-semibold">{language === 'ar' ? 'أدوية منتهية الصلاحية' : 'Expired Stock'}</span>
              <div className="text-2xl sm:text-3xl font-black text-red-800 font-mono">{expiredCount}</div>
              <span className="text-[11px] text-red-600 mt-1 block">{language === 'ar' ? 'محجوبة وممنوعة من الصرف' : 'Quarantined & blocked'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-teal-200 shadow-xs">
              <span className="text-xs text-teal-700 block mb-1 font-semibold">{language === 'ar' ? 'طلبات الأدوية والوصفات' : 'Orders & Inquiries'}</span>
              <div className="text-2xl sm:text-3xl font-black text-teal-800 font-mono">{orders.length}</div>
              <span className="text-[11px] text-teal-600 mt-1 block">{language === 'ar' ? `${pendingOrdersCount} بانتظار التجهيز` : `${pendingOrdersCount} pending`}</span>
            </div>
          </div>

          {/* Low Stock or Expired Warnings */}
          {(lowStockCount > 0 || expiredCount > 0) && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} className="text-amber-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">
                    {language === 'ar' ? 'تنبيهات سلامة المخزون الصيدلاني' : 'Pharmaceutical Inventory Alerts'}
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {expiredCount > 0 && (
                      <span className="block font-bold text-red-700">
                        • {language === 'ar' ? `يوجد (${expiredCount}) أدوية منتهية الصلاحية تم حجبها فورياً حفاظاً على صحة المرضى.` : `(${expiredCount}) expired medicines blocked from patient view.`}
                      </span>
                    )}
                    {lowStockCount > 0 && (
                      <span className="block text-amber-800">
                        • {language === 'ar' ? `يوجد (${lowStockCount}) أصناف دوائية شارف مخزونها على النفاد.` : `(${lowStockCount}) items have low inventory.`}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('inventory')}
                className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                {language === 'ar' ? 'فحص المخزون الآن' : 'Review Inventory'}
              </button>
            </div>
          )}

          {/* Quick 2-Column Split: Recent Orders & Quick Medicine Search */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Orders Queue */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#00796b]" />
                  <h3 className="font-bold text-base text-slate-900">{language === 'ar' ? 'طابور طلبات الأدوية الأخيرة' : 'Recent Medicine Orders'}</h3>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-[#00796b] hover:underline cursor-pointer"
                >
                  {language === 'ar' ? 'عرض الكل' : 'View All'}
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{language === 'ar' ? 'لا توجد طلبات أدوية مسجلة حالياً' : 'No medicine orders yet'}</p>
                  <button
                    onClick={() => setShowNewOrderModal(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    {language === 'ar' ? 'تسجيل طلب مباشر' : 'Intake Order'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-[#00796b] flex items-center justify-center font-bold text-xs shrink-0">
                          <Pill size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <span>{o.patientName}</span>
                            {o.orderType === 'delivery' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                                <Truck size={10} />
                                <span>{language === 'ar' ? 'توصيل' : 'Delivery'}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{o.items.map(i => i.name).join(', ')}</span>
                            <span>·</span>
                            <span className="font-mono font-bold text-teal-800">{o.totalAmount.toLocaleString()} د.ع</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : o.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : o.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {o.status}
                        </span>

                        <button
                          onClick={() => setSelectedOrderDetails(o)}
                          className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
                          title="عرض التفاصيل"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Moving / Essential Medicines */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <HeartPulse size={18} className="text-[#00796b]" />
                    <h3 className="font-bold text-base text-slate-900">{language === 'ar' ? 'الأصناف الدوائية الأساسية' : 'Essential Products'}</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    <Search size={14} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {medicines.slice(0, 5).map((m) => (
                    <div key={m.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-slate-500 text-[11px] font-mono">{m.activeIngredient}</div>
                      </div>
                      <div className="text-end">
                        <div className="font-bold font-mono text-teal-800">{m.price.toLocaleString()} د.ع</div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'ar' ? `الرصيد: ${m.quantity}` : `Stock: ${m.quantity}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{language === 'ar' ? 'ساعات الدوام اليومي:' : 'Working Hours:'}</span>
                  <span className="font-bold text-slate-800">{pharmacyProfile?.workingHours || '8:00 AM - 12:00 AM'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEDICINE CATALOG & PATIENT SEARCH ENGINE */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'دليل الأدوية ومحرك البحث العلمي والتجاري' : 'Medicine Catalog & Generic Search Engine'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'البحث السريع بالاسم التجاري أو المادة الفعالة العلمية للوصول للبدائل والمثائل الدوائية والتسعيرة بالدينار.'
                  : 'Search by trade brand or generic active ingredient to find matching products and alternatives.'}
              </p>
            </div>

            <button
              onClick={() => {
                resetMedicineForm();
                setEditingMedicine(null);
                setShowNewMedicineModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#00796b] hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة دواء جديد' : 'Add Medicine'}</span>
            </button>
          </div>

          {/* Search Bar & Multi-Criteria Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
            <div className="md:col-span-6 relative">
              <Search size={16} className="absolute top-3.5 start-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث بالاسم التجاري (Panadol) أو المادة الفعالة (Paracetamol)...' : 'Search by trade name, active ingredient or brand...'}
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={dosageFormFilter}
                onChange={(e) => setDosageFormFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
              >
                <option value="all">{language === 'ar' ? 'كافة الأشكال الصيدلانية' : 'All Dosage Forms'}</option>
                {dosageFormsList.map((f, idx) => (
                  <option key={idx} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={inventoryStatusFilter}
                onChange={(e) => setInventoryStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
              >
                <option value="all">{language === 'ar' ? 'كافة حالات التوفر' : 'All Availability'}</option>
                <option value="in_stock">{language === 'ar' ? 'متوفر بالمخزون فقط' : 'In Stock Only'}</option>
                <option value="low_stock">{language === 'ar' ? 'مخزون حرج / وشك النفاد' : 'Low Stock Only'}</option>
                <option value="expired">{language === 'ar' ? 'أدوية منتهية الصلاحية' : 'Expired Only'}</option>
                <option value="prescription">{language === 'ar' ? 'أدوية بوصفة طبية فقط' : 'Rx Required Only'}</option>
              </select>
            </div>
          </div>

          {/* Medicines Grid */}
          {filteredMedicines.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Pill size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا توجد أدوية مطابقة لمعايير البحث' : 'No medicines matched your query'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'جرب البحث بالمادة الفعالة أو تخفيف شروط الفلترة' : 'Try searching by active ingredient or resetting filters'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedicines.map((m) => {
                const expired = isMedicineExpired(m.expiryDate);
                const expiringSoon = isMedicineExpiringSoon(m.expiryDate);
                const lowStock = m.quantity <= (m.minStockAlert || 5) && !expired;

                return (
                  <div
                    key={m.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      expired 
                        ? 'border-red-300 bg-red-50/40' 
                        : lowStock 
                        ? 'border-amber-200 bg-amber-50/20' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                          {m.dosageForm}
                        </span>

                        <div className="flex items-center gap-1">
                          {m.requiresPrescription && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 flex items-center gap-0.5" title="وصفة طبية إلزامية">
                              <BadgeAlert size={11} />
                              <span>Rx</span>
                            </span>
                          )}

                          {expired ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white">
                              {language === 'ar' ? 'منتهي الصلاحية' : 'Expired'}
                            </span>
                          ) : expiringSoon ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white">
                              {language === 'ar' ? 'قريب الانتهاء' : 'Expiring Soon'}
                            </span>
                          ) : m.quantity <= 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                              {language === 'ar' ? 'نفد المخزون' : 'Out of Stock'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              {language === 'ar' ? 'متوفر' : 'In Stock'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Medicine Trade & Scientific Name */}
                      <h4 className="font-bold text-base text-slate-900 mb-1">{m.name}</h4>
                      
                      <div className="text-xs text-[#004d40] font-semibold mb-2 flex items-center gap-1">
                        <span className="text-slate-400">{language === 'ar' ? 'المادة الفعالة:' : 'Generic:'}</span>
                        <span>{m.activeIngredient}</span>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>{language === 'ar' ? 'العيار والعبوة:' : 'Strength / Pack:'}</span>
                          <span className="font-mono text-slate-700">{m.strength} ({m.packageSize})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{language === 'ar' ? 'الشركة المصنعة:' : 'Manufacturer:'}</span>
                          <span className="text-slate-700">{m.manufacturer || m.brand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{language === 'ar' ? 'تاريخ الصلاحية:' : 'Expiry Date:'}</span>
                          <span className={`font-mono font-bold ${expired ? 'text-red-700' : expiringSoon ? 'text-amber-700' : 'text-slate-700'}`}>
                            {m.expiryDate}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{language === 'ar' ? 'الرصيد المتبقي:' : 'Stock Count:'}</span>
                          <span className={`font-mono font-bold ${lowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                            {m.quantity} {language === 'ar' ? 'عبوة' : 'units'}
                          </span>
                        </div>
                        {m.benefits && (
                          <div className="pt-1.5 border-t border-slate-100 text-[11px] text-teal-800 line-clamp-2">
                            <span className="font-bold text-teal-900">{language === 'ar' ? 'الفائدة:' : 'Benefits:'}</span> {m.benefits}
                          </div>
                        )}

                        {m.sideEffects && (
                          <div className="text-[11px] text-rose-700 line-clamp-2">
                            <span className="font-bold text-rose-800">{language === 'ar' ? 'الأضرار/المحاذير:' : 'Side Effects:'}</span> {m.sideEffects}
                          </div>
                        )}
                      </div>

                      {/* Price Bar */}
                      <div className="text-sm font-black text-[#00796b] font-mono pb-2 mb-2 border-b border-slate-200/80">
                        {m.price.toLocaleString()} {language === 'ar' ? 'دينار عراقي' : 'IQD'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAdjustStock(m.id, m.quantity, -1)}
                          disabled={m.quantity <= 0}
                          className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer"
                          title="صرف عبوة (-1)"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-xs">{m.quantity}</span>
                        <button
                          onClick={() => handleAdjustStock(m.id, m.quantity, 1)}
                          className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center cursor-pointer"
                          title="إضافة عبوة (+1)"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(m)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                          title="تعديل بيانات الدواء"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(m.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="حذف من الصيدلية"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTORY MANAGEMENT & EXPIRY TRACKER */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'مراقبة المخزون، تواريخ الصلاحية وحالات النفاد' : 'Inventory Stock & Expiry Control'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'رصد دوري للتواريخ الحرجة، عزل الأدوية المنتهية الصلاحية ومنع عرضها، وإعادة تزويد الأرصدة الناقصة.'
                  : 'Track critical expiration windows, quarantine expired lots, and audit stock thresholds.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-red-100 text-red-800 text-xs font-bold font-mono">
                {expiredCount} {language === 'ar' ? 'منتهي' : 'Expired'}
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold font-mono">
                {lowStockCount} {language === 'ar' ? 'مخزون حرج' : 'Low Stock'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">{language === 'ar' ? 'اسم الدواء التجاري' : 'Brand Name'}</th>
                  <th className="p-3">{language === 'ar' ? 'المادة الفعالة' : 'Active Ingredient'}</th>
                  <th className="p-3">{language === 'ar' ? 'الشكل والعيار' : 'Form & Strength'}</th>
                  <th className="p-3">{language === 'ar' ? 'الرصيد الحالي' : 'Stock'}</th>
                  <th className="p-3">{language === 'ar' ? 'تاريخ الصلاحية' : 'Expiry Date'}</th>
                  <th className="p-3">{language === 'ar' ? 'حالة الأمان' : 'Safety Status'}</th>
                  <th className="p-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => {
                  const expired = isMedicineExpired(m.expiryDate);
                  const expiringSoon = isMedicineExpiringSoon(m.expiryDate);
                  const lowStock = m.quantity <= (m.minStockAlert || 5) && !expired;

                  return (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">{m.name}</td>
                      <td className="p-3 text-slate-600 font-mono">{m.activeIngredient}</td>
                      <td className="p-3 text-slate-600">{m.dosageForm} ({m.strength})</td>
                      <td className="p-3 font-mono font-bold">
                        <span className={lowStock ? 'text-amber-600' : 'text-slate-900'}>{m.quantity}</span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          expired ? 'bg-red-100 text-red-800' : expiringSoon ? 'bg-amber-100 text-amber-800' : 'text-slate-700'
                        }`}>
                          {m.expiryDate}
                        </span>
                      </td>
                      <td className="p-3">
                        {expired ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                            {language === 'ar' ? 'محجوب / تالف' : 'Quarantined'}
                          </span>
                        ) : lowStock ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                            {language === 'ar' ? 'طلب توريد' : 'Reorder'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {language === 'ar' ? 'آمن ومتاح' : 'Optimal'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleEditClick(m)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                        >
                          {language === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ORDERS & PRESCRIPTIONS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'إدارة وتجهيز طلبات الأدوية والوصفات' : 'Medicine Orders & Prescriptions'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'متابعة طلبات استلام الدواء من الصيدلية أو التوصيل للمنازل، وتدقيق الوصفات الطبية المرفقة.'
                  : 'Process in-pharmacy pickups, home deliveries, and verify medical prescriptions.'}
              </p>
            </div>

            <button
              onClick={() => setShowNewOrderModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#00796b] hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'تسجيل طلب صيدلي' : 'New Order'}</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { id: 'all', labelAr: 'الكل', labelEn: 'All' },
              { id: 'pending', labelAr: 'قيد الانتظار', labelEn: 'Pending' },
              { id: 'accepted', labelAr: 'مقبولة', labelEn: 'Accepted' },
              { id: 'preparing', labelAr: 'قيد التجهيز', labelEn: 'Preparing' },
              { id: 'ready_for_pickup', labelAr: 'جاهزة للاستلام', labelEn: 'Ready' },
              { id: 'out_for_delivery', labelAr: 'خرجت للتوصيل', labelEn: 'In Delivery' },
              { id: 'completed', labelAr: 'مكتملة ومستلمة', labelEn: 'Completed' },
              { id: 'cancelled', labelAr: 'ملغاة', labelEn: 'Cancelled' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setOrderFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  orderFilter === f.id
                    ? 'bg-[#00796b] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">{language === 'ar' ? 'لا توجد طلبات في هذا الفلتر' : 'No orders in this view'}</h3>
              <p className="text-xs text-slate-500 mt-1">{language === 'ar' ? 'اختر فلتر آخر أو قم بتسجيل طلب جديد' : 'Try another filter or intake an order'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 text-[#00796b] flex items-center justify-center font-bold text-xs shrink-0">
                      <Pill size={22} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">{o.patientName}</h4>
                        {o.orderType === 'delivery' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                            <Truck size={11} />
                            <span>{language === 'ar' ? 'توصيل منزلي' : 'Delivery'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {language === 'ar' ? 'استلام من الصيدلية' : 'Pickup'}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : o.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {o.status}
                        </span>
                      </div>

                      {/* Items details */}
                      <div className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                        {o.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{it.name} ({it.strength})</span>
                            <span className="text-slate-400">×</span>
                            <span className="font-mono">{it.quantity}</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-mono text-teal-800">{it.totalPrice.toLocaleString()} د.ع</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span className="font-mono">{o.patientPhone}</span>
                        <span>·</span>
                        <span className="font-mono">{o.createdAt.split('T')[0]}</span>
                        <span>·</span>
                        <span className="font-bold font-mono text-slate-900">
                          {language === 'ar' ? 'الإجمالي:' : 'Total:'} {o.totalAmount.toLocaleString()} د.ع
                        </span>
                      </div>

                      {o.deliveryAddress && (
                        <div className="mt-1 text-xs text-blue-800 bg-blue-50/70 p-2 rounded-lg flex items-center gap-1.5">
                          <MapPin size={13} />
                          <span><strong>{language === 'ar' ? 'عنوان التوصيل:' : 'Delivery Address:'}</strong> {o.deliveryAddress}</span>
                        </div>
                      )}

                      {o.cancellationReason && (
                        <div className="mt-2 text-xs text-red-800 bg-red-50 p-2 rounded-lg">
                          <strong>{language === 'ar' ? 'سبب الإلغاء:' : 'Cancellation Reason:'}</strong> {o.cancellationReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Status Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {o.status === 'pending' && isOperable && (
                      <>
                        <button
                          onClick={() => handleUpdateOrderStatus(o.id, 'accepted', o.patientId)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#00796b] hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>{language === 'ar' ? 'قبول الطلب' : 'Accept'}</span>
                        </button>
                        <button
                          onClick={() => setCancellingOrder(o)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs"
                        >
                          {language === 'ar' ? 'اعتذار' : 'Reject'}
                        </button>
                      </>
                    )}

                    {o.status === 'accepted' && isOperable && (
                      <button
                        onClick={() => handleUpdateOrderStatus(o.id, 'preparing', o.patientId)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <Package size={14} />
                        <span>{language === 'ar' ? 'بدء التجهيز' : 'Start Prep'}</span>
                      </button>
                    )}

                    {o.status === 'preparing' && isOperable && (
                      <button
                        onClick={() => handleUpdateOrderStatus(o.id, o.orderType === 'delivery' ? 'out_for_delivery' : 'ready_for_pickup', o.patientId)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <CheckCircle2 size={14} />
                        <span>{o.orderType === 'delivery' ? (language === 'ar' ? 'خرج للتوصيل' : 'Dispatch Delivery') : (language === 'ar' ? 'جاهز للاستلام' : 'Ready for Pickup')}</span>
                      </button>
                    )}

                    {(o.status === 'ready_for_pickup' || o.status === 'out_for_delivery') && isOperable && (
                      <button
                        onClick={() => handleUpdateOrderStatus(o.id, 'completed', o.patientId)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <CheckCircle2 size={14} />
                        <span>{language === 'ar' ? 'تم التسليم بنجاح' : 'Mark Completed'}</span>
                      </button>
                    )}

                    {o.patientPhone && (
                      <a
                        href={`https://wa.me/964${o.patientPhone.replace(/^0+/, '')}?text=${encodeURIComponent(
                          language === 'ar'
                            ? `تحية طيبة من ${pharmacyProfile?.pharmacyName || 'الصيدلية'}. بخصوص طلب الأدوية رقم (${o.id.slice(-6)}).`
                            : `Hello from ${pharmacyProfile?.pharmacyName}. Regarding your medicine order #${o.id.slice(-6)}.`
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

      {/* TAB 5: PHARMACY PROFILE & SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSavePharmacySettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'بيانات الصيدلية، الإشراف المهني وساعات الدوام' : 'Pharmacy Profile, License & Operating Hours'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar'
                ? 'تحديث تفاصيل المنشأة، أرقام التواصل، اسم الصيدلي المرخص، خفارة الليل، وأجور التوصيل.'
                : 'Configure facility credentials, licensing, night duty, and delivery options.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'الاسم الرسمي للصيدلية *' : 'Pharmacy Name *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.pharmacyName}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, pharmacyName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'اسم الصيدلي المسؤول / المرخص *' : 'Responsible Pharmacist Name *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.ownerName}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, ownerName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم إجازة ممارسة المهنة (نقابة الصيادلة) *' : 'Syndicate License ID *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.licenseNumber}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, licenseNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
              </label>
              <select
                value={editProfileForm.governorate}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, governorate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-[#00796b]"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رقم الواتساب لاستقبال الوصفات' : 'WhatsApp Line'}
              </label>
              <input
                type="tel"
                value={editProfileForm.whatsapp}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, whatsapp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'عنوان الصيدلية بالتفصيل *' : 'Full Street Address *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.address}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                placeholder="بغداد، المنصور، شارع 14 رمضان"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'ساعات الدوام اليومية *' : 'Daily Working Hours *'}
              </label>
              <input
                type="text"
                required
                value={editProfileForm.workingHours}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, workingHours: e.target.value })}
                placeholder="8:00 AM - 12:00 AM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'رابط شعار الصيدلية (Logo URL)' : 'Pharmacy Logo URL'}
              </label>
              <input
                type="url"
                value={editProfileForm.logoUrl}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, logoUrl: e.target.value })}
                placeholder="https://.../pharmacy_logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            {/* Delivery & Night Duty Options */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="delivCheck"
                    checked={editProfileForm.deliveryAvailable}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, deliveryAvailable: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="delivCheck" className="font-bold text-teal-950">
                    {language === 'ar' ? 'توفير خدمة توصيل الأدوية للمنازل' : 'Home Delivery Service Available'}
                  </label>
                </div>
                {editProfileForm.deliveryAvailable && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {language === 'ar' ? 'أجور التوصيل المعتمدة (دينار)' : 'Delivery Fee (IQD)'}
                    </label>
                    <input
                      type="number"
                      step={500}
                      value={editProfileForm.deliveryFee}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, deliveryFee: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="nightCheck"
                    checked={editProfileForm.nightDuty}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, nightDuty: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="nightCheck" className="font-bold text-teal-950">
                    {language === 'ar' ? 'صيدلية خافرة (24 ساعة / طوارئ ليلية)' : 'Night Duty / 24-Hour Emergency'}
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {language === 'ar'
                    ? 'يتم إبراز الصيدلية في دليل الطوارئ للمرضى للوصول إليها خارج أوقات الدوام الاعتيادية.'
                    : 'Highlights pharmacy in emergency lists for patients seeking late-night access.'}
                </p>
              </div>
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'ar' ? 'نبذة تعريفية بالصيدلية' : 'Pharmacy Bio & Specializations'}
              </label>
              <textarea
                rows={3}
                value={editProfileForm.bio}
                onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
                placeholder={language === 'ar' ? 'صيدلية تخصصية تقدم المشورة الدوائية...' : 'Licensed pharmacy...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {language === 'ar' ? 'الاعتماد النقابي والرقابي موثق في Firestore' : 'Accredited through central governance'}
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#00796b] hover:bg-teal-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Save size={16} />
              <span>{language === 'ar' ? 'حفظ بيانات الصيدلية' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* MODAL: ADD / EDIT MEDICINE ITEM */}
      {showNewMedicineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {editingMedicine 
                    ? (language === 'ar' ? 'تعديل بيانات الدواء والمخزون' : 'Edit Medicine Details')
                    : (language === 'ar' ? 'إضافة صنف دوائي جديد للمخزون' : 'Register New Medicine')}
                </h3>
                <span className="text-xs text-slate-500">
                  {language === 'ar' ? 'توثيق المادة الفعالة وتاريخ الصلاحية' : 'Specify generic composition & expiry'}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowNewMedicineModal(false);
                  setEditingMedicine(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم الدواء التجاري (Brand Name) *' : 'Commercial Name *'}</label>
                  <input
                    type="text"
                    required
                    value={medicineForm.name}
                    onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                    placeholder="Panadol Extra, Augmentin, etc."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'المادة الفعالة العلمية (Active Ingredient) *' : 'Active Generic Ingredient *'}</label>
                  <input
                    type="text"
                    required
                    value={medicineForm.activeIngredient}
                    onChange={(e) => setMedicineForm({ ...medicineForm, activeIngredient: e.target.value })}
                    placeholder="Paracetamol, Amoxicillin, etc."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الشكل الصيدلاني *' : 'Dosage Form *'}</label>
                  <select
                    value={medicineForm.dosageForm}
                    onChange={(e) => setMedicineForm({ ...medicineForm, dosageForm: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {dosageFormsList.map((f, idx) => (
                      <option key={idx} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'العيار والتركيز *' : 'Strength *'}</label>
                  <input
                    type="text"
                    required
                    value={medicineForm.strength}
                    onChange={(e) => setMedicineForm({ ...medicineForm, strength: e.target.value })}
                    placeholder="500mg, 1g, 10mg/5ml"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'حجم العبوة *' : 'Package Size *'}</label>
                  <input
                    type="text"
                    required
                    value={medicineForm.packageSize}
                    onChange={(e) => setMedicineForm({ ...medicineForm, packageSize: e.target.value })}
                    placeholder="20 Tablets, 100ml"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الشركة المصنعة / العلامة' : 'Manufacturer'}</label>
                  <input
                    type="text"
                    value={medicineForm.manufacturer}
                    onChange={(e) => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })}
                    placeholder="GSK, SDI, Pfizer, Julphar"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'السعر الرسمي (دينار عراقي) *' : 'Price (IQD) *'}</label>
                  <input
                    type="number"
                    required
                    min={250}
                    step={250}
                    value={medicineForm.price}
                    onChange={(e) => setMedicineForm({ ...medicineForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الكمية المتوفرة بالمخزون *' : 'Stock Quantity *'}</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={medicineForm.quantity}
                    onChange={(e) => setMedicineForm({ ...medicineForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'حد التنبيه للنفاد' : 'Min Stock Alert'}</label>
                  <input
                    type="number"
                    min={1}
                    value={medicineForm.minStockAlert}
                    onChange={(e) => setMedicineForm({ ...medicineForm, minStockAlert: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تاريخ انتهاء الصلاحية *' : 'Expiry Date *'}</label>
                  <input
                    type="date"
                    required
                    value={medicineForm.expiryDate}
                    onChange={(e) => setMedicineForm({ ...medicineForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Prescription Checkbox */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">{language === 'ar' ? 'يتطلب وصفة طبية إلزامية (Rx Required)' : 'Prescription Required (Rx)'}</span>
                  <span className="text-[11px] text-slate-500">{language === 'ar' ? 'المضادات الحيوية، أدوية الأمراض المزمنة، والمهدئات' : 'Antibiotics, controlled substances'}</span>
                </div>
                <input
                  type="checkbox"
                  checked={medicineForm.requiresPrescription}
                  onChange={(e) => setMedicineForm({ ...medicineForm, requiresPrescription: e.target.checked })}
                  className="w-5 h-5 text-teal-600 rounded"
                />
              </div>

              {/* Benefits & Medical Indications */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'فائدة الدواء ودواعي الاستعمال (Benefits & Uses) *' : 'Benefits & Medical Indications *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={medicineForm.benefits}
                  onChange={(e) => setMedicineForm({ ...medicineForm, benefits: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: خافض للحرارة ومسكن للآلام المعتدلة والصداع، آلام المفاصل...' : 'E.g., Fever reducer, mild pain relief, headache treatment...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
                />
              </div>

              {/* Side Effects & Warnings */}
              <div>
                <label className="block font-bold text-red-700 mb-1">
                  {language === 'ar' ? 'أضرار الدواء والآثار الجانبية وموانع الاستعمال (Risks & Side Effects) *' : 'Side Effects & Precautions *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={medicineForm.sideEffects}
                  onChange={(e) => setMedicineForm({ ...medicineForm, sideEffects: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: قد يسبب غثيان خفيف أو اضطراب معدة. يمنع لمرضى القصور الكبدي الحاد أو الحساسية المفرطة...' : 'E.g., Mild nausea, upset stomach. Contraindicated in severe liver impairment...'}
                  className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm focus:ring-2 focus:ring-red-400 bg-red-50/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'ملاحظات صيدلانية إضافية' : 'Pharmacist Notes'}</label>
                <textarea
                  rows={2}
                  value={medicineForm.notes}
                  onChange={(e) => setMedicineForm({ ...medicineForm, notes: e.target.value })}
                  placeholder={language === 'ar' ? 'يحفظ في درجة حرارة أقل من 25 مئوية، بعيداً عن الضوء...' : 'Store below 25°C...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMedicineModal(false);
                    setEditingMedicine(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00796b] text-white font-bold"
                >
                  {editingMedicine 
                    ? (language === 'ar' ? 'حفظ التعديلات' : 'Update Medicine') 
                    : (language === 'ar' ? 'إدراج الدواء' : 'Save Medicine')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT PHARMACY ORDER INTAKE */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-900">
                {language === 'ar' ? 'تسجيل طلب دواء / صرف وصفة' : 'Intake Medicine Order'}
              </h3>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اسم المريض / المراجع *' : 'Patient Name *'}</label>
                <input
                  type="text"
                  required
                  value={newOrderData.patientName}
                  onChange={(e) => setNewOrderData({ ...newOrderData, patientName: e.target.value })}
                  placeholder={language === 'ar' ? 'الاسم الثلاثي' : 'Patient Name'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'رقم الهاتف (واتساب) *' : 'Phone Number *'}</label>
                <input
                  type="tel"
                  required
                  value={newOrderData.patientPhone}
                  onChange={(e) => setNewOrderData({ ...newOrderData, patientPhone: e.target.value })}
                  placeholder="07XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'اختر الدواء من المخزون الصالح *' : 'Select Medicine *'}</label>
                <select
                  required
                  value={newOrderData.medicineId}
                  onChange={(e) => setNewOrderData({ ...newOrderData, medicineId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="">{language === 'ar' ? '-- اختر الصنف الدوائي --' : '-- Choose medicine --'}</option>
                  {medicines.filter(m => !isMedicineExpired(m.expiryDate) && m.quantity > 0).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.strength}) - {m.price.toLocaleString()} د.ع [الرصيد: {m.quantity}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'الكمية المطلوبة *' : 'Quantity *'}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newOrderData.quantity}
                    onChange={(e) => setNewOrderData({ ...newOrderData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'طريقة الاستلام *' : 'Delivery Method *'}</label>
                  <select
                    value={newOrderData.orderType}
                    onChange={(e) => setNewOrderData({ ...newOrderData, orderType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="pickup">{language === 'ar' ? 'استلام من الصيدلية' : 'In-Pharmacy Pickup'}</option>
                    <option value="delivery">{language === 'ar' ? 'توصيل منزلي' : 'Home Delivery'}</option>
                  </select>
                </div>
              </div>

              {newOrderData.orderType === 'delivery' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'عنوان التوصيل بالتفصيل *' : 'Delivery Address *'}</label>
                  <input
                    type="text"
                    required
                    value={newOrderData.deliveryAddress}
                    onChange={(e) => setNewOrderData({ ...newOrderData, deliveryAddress: e.target.value })}
                    placeholder={language === 'ar' ? 'المنطقة، أقرب نقطة دالة' : 'Full address'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#00796b]"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'تعليمات الصيدلي للمريض' : 'Pharmacist Instructions'}</label>
                <textarea
                  rows={2}
                  value={newOrderData.pharmacistNotes}
                  onChange={(e) => setNewOrderData({ ...newOrderData, pharmacistNotes: e.target.value })}
                  placeholder={language === 'ar' ? 'حبة واحدة بعد الطعام مرتين يومياً...' : 'Dosage directions...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00796b] text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد وصرف الطلب' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL ORDER */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">
              {language === 'ar' ? `إلغاء طلب المراجع: ${cancellingOrder.patientName}` : `Cancel Order: ${cancellingOrder.patientName}`}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' ? 'سيتم إشعار المراجع واسترجاع كميات الأدوية إلى رصيد المخزون الصيدلاني.' : 'Patient will be alerted and medicine quantities returned to stock.'}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ar' ? 'سبب الإلغاء' : 'Cancellation Reason'}</label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'عدم توفر وصفة طبية، اعتذار المراجع...' : 'Prescription missing...'}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'ar' ? 'تراجع' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelOrder}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold"
                >
                  {language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORDER DETAILS & DISPENSING SLIP */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {language === 'ar' ? 'بيانات وإيصال صرف الطلب الصيدلاني' : 'Pharmacy Dispensing Slip'}
                </h3>
                <span className="text-xs text-slate-400 font-mono">Order ID: {selectedOrderDetails.id}</span>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block">{language === 'ar' ? 'المريض:' : 'Patient:'}</span>
                  <strong className="text-slate-900 text-sm">{selectedOrderDetails.patientName}</strong>
                </div>
                <div className="text-end">
                  <span className="text-slate-400 block">{language === 'ar' ? 'الحالة:' : 'Status:'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                    {selectedOrderDetails.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-2">{language === 'ar' ? 'الأصناف المصروفة:' : 'Dispensed Items:'}</span>
                <div className="space-y-2">
                  {selectedOrderDetails.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-white flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">{it.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{it.activeIngredient} ({it.strength})</div>
                      </div>
                      <div className="text-end font-mono">
                        <div className="font-bold text-slate-900">{it.totalPrice.toLocaleString()} د.ع</div>
                        <div className="text-[10px] text-slate-400">× {it.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-sm">
                <span>{language === 'ar' ? 'المبلغ الإجمالي:' : 'Total Amount:'}</span>
                <span className="font-mono text-[#00796b] text-base">{selectedOrderDetails.totalAmount.toLocaleString()} د.ع</span>
              </div>

              {selectedOrderDetails.pharmacistNotes && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 text-teal-900 text-xs">
                  <strong>{language === 'ar' ? 'إرشادات الاستخدام:' : 'Dosage Instructions:'}</strong>
                  <p className="mt-0.5">{selectedOrderDetails.pharmacistNotes}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{language === 'ar' ? 'طباعة الإيصال' : 'Print Slip'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
