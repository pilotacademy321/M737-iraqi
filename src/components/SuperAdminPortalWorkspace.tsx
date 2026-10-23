import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  UserProfile, 
  UserRole, 
  AccountStatus, 
  ClinicAuditLog,
  DoctorProfile,
  Appointment,
  SubscriptionPlan,
  UserSubscription
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
  deleteDoc,
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  ShieldCheck, 
  Users, 
  Stethoscope, 
  Scan, 
  FlaskConical, 
  Pill, 
  User, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  Activity, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Lock, 
  Eye, 
  SlidersHorizontal, 
  Sparkles, 
  LogOut, 
  Calendar,
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  Database,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  Server,
  Check
} from 'lucide-react';

interface SuperAdminPortalWorkspaceProps {
  onBackToHome: () => void;
}

export const SuperAdminPortalWorkspace: React.FC<SuperAdminPortalWorkspaceProps> = ({ onBackToHome }) => {
  const { user, userProfile, isAdmin, refreshProfile, signOut, updateUserStatusByAdmin } = useAuth();
  const { language, isRTL } = useLanguage();

  const [activeTab, setActiveTab] = useState<'accreditation' | 'analytics' | 'audit_logs' | 'subscriptions'>('accreditation');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users from Firestore
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showInspectorModal, setShowInspectorModal] = useState(false);

  // Audit Logs & Stats
  const [auditLogs, setAuditLogs] = useState<ClinicAuditLog[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);

  // Subscriptions & Dynamic Plans State
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    id: '',
    nameAr: '',
    nameEn: '',
    targetRole: 'all' as UserRole | 'all',
    priceIqd: 30000,
    billingPeriod: 'monthly' as 'monthly' | 'quarterly' | 'yearly' | 'custom',
    descriptionAr: '',
    descriptionEn: '',
    featuresArText: '',
    isPopular: false,
    isActive: true,
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    userId: '',
    planId: '',
    customPriceIqd: 25000,
    durationMonths: 1,
    status: 'active' as 'active' | 'pending' | 'expired' | 'cancelled',
    notes: '',
  });

  const [subToEditPrice, setSubToEditPrice] = useState<UserSubscription | null>(null);
  const [quickPriceInput, setQuickPriceInput] = useState<number>(0);

  // Filters
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Seed default clinical plans if empty
  const defaultPlansList: SubscriptionPlan[] = [
    {
      id: 'solo-practice',
      nameAr: 'العيادة الفردية',
      nameEn: 'Solo Practice Clinic',
      targetRole: 'doctor',
      priceIqd: 25000,
      billingPeriod: 'monthly',
      descriptionAr: 'خطة متكاملة للأطباء والعيادات الاستشارية المستقلة',
      descriptionEn: 'Essential clinic management for solo practitioners',
      featuresAr: [
        'حساب طبيب معتمد مستقل',
        'ربط سكرتارية وتنظيم الحجوزات',
        'أرشفة وسجلات طبية إلكترونية مشفرة',
        'إشعارات المواعيد والتنبيهات للمرضى'
      ],
      featuresEn: [
        '1 Certified Doctor Account',
        '1 Secretary Delegation & Booking Management',
        'Encrypted Electronic Medical Records',
        'Patient SMS/In-App Reminders'
      ],
      isActive: true,
      isPopular: false,
      maxDoctors: 1,
      maxStaff: 1,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'specialized-complex',
      nameAr: 'المجمع الطبي التخصصي',
      nameEn: 'Specialized Medical Complex',
      targetRole: 'doctor',
      priceIqd: 60000,
      billingPeriod: 'monthly',
      descriptionAr: 'للمجمعات الطبية متعددة التخصصات والاستشاريين',
      descriptionEn: 'Multi-specialty clinic complex with collaborative front-desk',
      featuresAr: [
        'حتى 5 أطباء واستشاريين',
        'سكرتارية متعددة واستقبال مركزي',
        'ربط مباشر مع المختبرات والأشعة بالمجمع',
        'تقارير إحصائية متقدمة للإيرادات والمواعيد'
      ],
      featuresEn: [
        'Up to 5 Specialist Doctors',
        'Multi-Desk Secretary & Reception',
        'Direct Linking with Labs & Scans',
        'Comprehensive Financial & Patient Metrics'
      ],
      isActive: true,
      isPopular: true,
      maxDoctors: 5,
      maxStaff: 5,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'clinical-lab',
      nameAr: 'باقة المختبرات السريرية المعتمدة',
      nameEn: 'Clinical Laboratory Tier',
      targetRole: 'laboratory',
      priceIqd: 45000,
      billingPeriod: 'monthly',
      descriptionAr: 'نظام إدارة التحاليل المرضية، الباركود، والنتائج الرقمية',
      descriptionEn: 'Digital pathology, test catalogs, and barcode tracking',
      featuresAr: [
        'إدارة كتالوج الفحوصات الطبية والأسعار',
        'إصدار نتائج التحاليل السريرية مع الباركود والختم',
        'إرسال النتائج الفورية لملف المريض',
        'دعم خدمة سحب العينات المنزلية'
      ],
      featuresEn: [
        'Complete Test Catalog & Pricing Engine',
        'Digital Certified Results with Barcode & Seal',
        'Instant Result Dispatch to Patient Portals',
        'Home Sample Collection Dispatch'
      ],
      isActive: true,
      isPopular: false,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pharmacy-tier',
      nameAr: 'باقة الصيدليات والمذاخر',
      nameEn: 'Community Pharmacy Tier',
      targetRole: 'pharmacy',
      priceIqd: 35000,
      billingPeriod: 'monthly',
      descriptionAr: 'نظام مخزون الأدوية، تواريخ الصلاحية، واستقبال الطلبات',
      descriptionEn: 'Medicine stock management, expiry alerts & prescriptions',
      featuresAr: [
        'إدارة دليل الأدوية والمخزون الحي والأسعار الرسمية',
        'تحديد الفوائد والأضرار والتحذيرات الطبية',
        'تتبع تواريخ الصلاحية وتنبيهات النواقص',
        'استقبال طلبات الأدوية والتوصيل أو الاستلام المباشر'
      ],
      featuresEn: [
        'Live Medicine Inventory & Official IQD Pricing',
        'Clinical Benefits & Warnings Management',
        'Expiration Dates & Stock Alert Triggers',
        'Direct Prescription & Medicine Orders'
      ],
      isActive: true,
      isPopular: false,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'radiology-center',
      nameAr: 'مراكز الأشعة والسونار',
      nameEn: 'Radiology & Imaging Center',
      targetRole: 'radiology_center',
      priceIqd: 55000,
      billingPeriod: 'monthly',
      descriptionAr: 'حجوزات السونار، الأشعة، الرنين والمفراس وأرشفة التقارير',
      descriptionEn: 'Ultrasound, MRI, CT, and X-Ray diagnostic management',
      featuresAr: [
        'إدارة باقات وخدمات الفحص الشعاعي',
        'جدولة الحجوزات وتنبيهات التحضير المسبق',
        'أرشفة تقارير الفحص الشعاعي الموقعة',
        'ربط فوري بالأطباء المعالجين'
      ],
      featuresEn: [
        'Imaging Modalities & Scan Catalog',
        'Patient Preparation & Time Slots',
        'Certified Radiologist Diagnostic Reports',
        'Direct Clinician Dispatch'
      ],
      isActive: true,
      isPopular: false,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'enterprise-hospital',
      nameAr: 'المستشفيات والمراكز الكبرى',
      nameEn: 'Enterprise Hospital Tier',
      targetRole: 'all',
      priceIqd: 150000,
      billingPeriod: 'monthly',
      descriptionAr: 'تكامل مؤسسي شامل مع كافة الأقسام الطبية والتشخيصية',
      descriptionEn: 'Full enterprise healthcare governance and integration',
      featuresAr: [
        'أطباء وكوادر وسكرتارية غير محدودة',
        'ربط شبكي متكامل (أشعة، مختبر، صيدلية، عيادات)',
        'دعم فني وأمني على مدار الساعة 24/7',
        'تخصيص كامل للهوية المؤسسية والسجلات'
      ],
      featuresEn: [
        'Unlimited Staff & Specialist Accounts',
        'Full Multi-Department Interoperability',
        'Dedicated 24/7 Priority Support & SLA',
        'Custom Hospital Branding & Data Warehousing'
      ],
      isActive: true,
      isPopular: false,
      updatedAt: new Date().toISOString()
    }
  ];

  // Load All Users and System Metrics
  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const list = usersSnap.docs.map((d) => d.data() as UserProfile);
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setUsersList(list);

      // 2. Fetch Recent Audit Logs
      try {
        const logsSnap = await getDocs(collection(db, 'clinic_audit_logs'));
        const logs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClinicAuditLog));
        logs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        setAuditLogs(logs.slice(0, 50));
      } catch (e) {
        console.warn('Audit logs not loaded or empty:', e);
      }

      // 3. Count Appointments
      try {
        const apptsSnap = await getDocs(collection(db, 'appointments'));
        setTotalAppointments(apptsSnap.size);
      } catch {
        // ignore if empty
      }

      // 4. Fetch Dynamic Subscription Plans
      try {
        const plansSnap = await getDocs(collection(db, 'subscription_plans'));
        if (plansSnap.empty) {
          // Initialize default plans into Firestore
          for (const plan of defaultPlansList) {
            await setDoc(doc(db, 'subscription_plans', plan.id), plan);
          }
          setSubscriptionPlans(defaultPlansList);
        } else {
          const plans = plansSnap.docs.map((d) => ({ id: d.id, ...d.data() } as SubscriptionPlan));
          setSubscriptionPlans(plans);
        }
      } catch (err) {
        console.warn('Error loading subscription plans, using fallback defaults:', err);
        setSubscriptionPlans(defaultPlansList);
      }

      // 5. Fetch Provider Subscriptions
      try {
        const subsSnap = await getDocs(collection(db, 'subscriptions'));
        const subs = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as UserSubscription));
        subs.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        setUserSubscriptions(subs);
      } catch (err) {
        console.warn('Error loading subscriptions:', err);
      }

    } catch (err: unknown) {
      console.error('Error fetching admin data:', err);
      showToast(language === 'ar' ? 'فشل تحميل بيانات المشرف العام' : 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  // Open Edit Plan Modal
  const handleOpenEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlanForEdit(plan);
    setPlanForm({
      id: plan.id,
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      targetRole: plan.targetRole,
      priceIqd: plan.priceIqd,
      billingPeriod: plan.billingPeriod,
      descriptionAr: plan.descriptionAr,
      descriptionEn: plan.descriptionEn || '',
      featuresArText: (plan.featuresAr || []).join('\n'),
      isPopular: !!plan.isPopular,
      isActive: plan.isActive !== false,
    });
    setShowPlanModal(true);
  };

  // Open Create Plan Modal
  const handleOpenCreatePlan = () => {
    setSelectedPlanForEdit(null);
    const generatedId = `plan-${Date.now().toString(36)}`;
    setPlanForm({
      id: generatedId,
      nameAr: '',
      nameEn: '',
      targetRole: 'all',
      priceIqd: 35000,
      billingPeriod: 'monthly',
      descriptionAr: '',
      descriptionEn: '',
      featuresArText: 'حساب معتمد في المنصة\nلوحة تحكم متقدمة\nدعم فني مباشر',
      isPopular: false,
      isActive: true,
    });
    setShowPlanModal(true);
  };

  // Save / Update Subscription Plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.nameAr.trim() || planForm.priceIqd < 0) {
      showToast(language === 'ar' ? 'يرجى إدخال اسم الباقة وسعر صحيح' : 'Please provide plan name and valid price', 'error');
      return;
    }

    const planId = selectedPlanForEdit ? selectedPlanForEdit.id : planForm.id.trim() || `plan-${Date.now()}`;
    const featuresList = planForm.featuresArText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const planPayload: SubscriptionPlan = {
      id: planId,
      nameAr: planForm.nameAr.trim(),
      nameEn: planForm.nameEn.trim() || planForm.nameAr.trim(),
      targetRole: planForm.targetRole,
      priceIqd: Number(planForm.priceIqd),
      billingPeriod: planForm.billingPeriod,
      descriptionAr: planForm.descriptionAr.trim(),
      descriptionEn: planForm.descriptionEn.trim(),
      featuresAr: featuresList,
      featuresEn: featuresList,
      isPopular: planForm.isPopular,
      isActive: planForm.isActive,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'super_admin',
    };

    try {
      await setDoc(doc(db, 'subscription_plans', planId), planPayload);
      showToast(
        language === 'ar'
          ? `تم حفظ وتحديث باقة (${planPayload.nameAr}) بسعر ${planPayload.priceIqd.toLocaleString()} د.ع بنجاح`
          : `Plan ${planPayload.nameEn} saved successfully`
      );
      setSubscriptionPlans(prev => {
        const idx = prev.findIndex(p => p.id === planId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = planPayload;
          return updated;
        }
        return [planPayload, ...prev];
      });
      setShowPlanModal(false);
    } catch (err) {
      console.error('Error saving plan:', err);
      showToast(language === 'ar' ? 'فشل حفظ الباقة، تأكد من صلاحيات المشرف' : 'Failed to save plan', 'error');
    }
  };

  // Toggle Plan Activation
  const handleTogglePlanActive = async (plan: SubscriptionPlan) => {
    const updatedStatus = !plan.isActive;
    try {
      await updateDoc(doc(db, 'subscription_plans', plan.id), {
        isActive: updatedStatus,
        updatedAt: new Date().toISOString()
      });
      setSubscriptionPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: updatedStatus } : p));
      showToast(
        language === 'ar'
          ? `تم ${updatedStatus ? 'تفعيل' : 'تعطيل'} الباقة (${plan.nameAr})`
          : `Plan status updated`
      );
    } catch (err) {
      console.error('Error toggling plan:', err);
      showToast(language === 'ar' ? 'فشل تعديل حالة الباقة' : 'Failed to update plan', 'error');
    }
  };

  // Delete Plan
  const handleDeletePlan = async (planId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من رغبتك بحذف هذه الباقة؟' : 'Are you sure you want to delete this plan?')) return;
    try {
      await deleteDoc(doc(db, 'subscription_plans', planId));
      setSubscriptionPlans(prev => prev.filter(p => p.id !== planId));
      showToast(language === 'ar' ? 'تم حذف الباقة بنجاح' : 'Plan deleted successfully');
    } catch (err) {
      console.error('Error deleting plan:', err);
      showToast(language === 'ar' ? 'فشل حذف الباقة' : 'Failed to delete plan', 'error');
    }
  };

  // Open Assign Subscription Modal
  const handleOpenAssignModal = (preselectedUser?: UserProfile) => {
    const firstProvider = preselectedUser || usersList.find(u => u.role !== 'patient' && u.role !== 'super_admin');
    const firstPlan = subscriptionPlans[0] || defaultPlansList[0];
    setAssignForm({
      userId: firstProvider ? firstProvider.uid : '',
      planId: firstPlan ? firstPlan.id : '',
      customPriceIqd: firstPlan ? firstPlan.priceIqd : 25000,
      durationMonths: 1,
      status: 'active',
      notes: '',
    });
    setShowAssignModal(true);
  };

  // Save Assigned Subscription
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = usersList.find(u => u.uid === assignForm.userId);
    const targetPlan = subscriptionPlans.find(p => p.id === assignForm.planId) || defaultPlansList.find(p => p.id === assignForm.planId);

    if (!targetUser) {
      showToast(language === 'ar' ? 'يرجى اختيار المنشأة أو الطبيب' : 'Please select provider', 'error');
      return;
    }

    const subId = `sub-${targetUser.uid}-${Date.now().toString(36)}`;
    const startDate = new Date().toISOString();
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + Number(assignForm.durationMonths));
    const endDate = expiry.toISOString();

    const subPayload: UserSubscription = {
      id: subId,
      userId: targetUser.uid,
      userEmail: targetUser.email || '',
      userName: targetUser.displayName || 'Provider',
      userRole: targetUser.role,
      facilityName: targetUser.facilityName || '',
      planId: targetPlan?.id || 'custom-plan',
      planName: targetPlan?.nameAr || 'اشتراك مخصص',
      customPriceIqd: Number(assignForm.customPriceIqd),
      status: assignForm.status,
      startDate,
      endDate,
      notes: assignForm.notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'super_admin',
    };

    try {
      await setDoc(doc(db, 'subscriptions', subId), subPayload);
      showToast(
        language === 'ar'
          ? `تم تفعيل وتخصيص الاشتراك لـ (${targetUser.displayName}) بسعر ${subPayload.customPriceIqd.toLocaleString()} د.ع بنجاح`
          : `Subscription created successfully for ${targetUser.displayName}`
      );
      setUserSubscriptions(prev => [subPayload, ...prev]);
      setShowAssignModal(false);
    } catch (err) {
      console.error('Error creating subscription:', err);
      showToast(language === 'ar' ? 'فشل حفظ الاشتراك' : 'Failed to save subscription', 'error');
    }
  };

  // Quick Price Edit on Existing Subscription
  const handleQuickUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subToEditPrice) return;
    try {
      await updateDoc(doc(db, 'subscriptions', subToEditPrice.id), {
        customPriceIqd: Number(quickPriceInput),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'super_admin'
      });
      setUserSubscriptions(prev => prev.map(s => s.id === subToEditPrice.id ? { ...s, customPriceIqd: Number(quickPriceInput), updatedAt: new Date().toISOString() } : s));
      showToast(
        language === 'ar'
          ? `تم تعديل السعر لـ (${subToEditPrice.userName}) إلى ${Number(quickPriceInput).toLocaleString()} د.ع بنجاح`
          : 'Subscription price updated'
      );
      setSubToEditPrice(null);
    } catch (err) {
      console.error('Error updating sub price:', err);
      showToast(language === 'ar' ? 'فشل تعديل السعر' : 'Failed to update price', 'error');
    }
  };

  // Toggle Subscription Status
  const handleToggleSubStatus = async (sub: UserSubscription, nextStatus: 'active' | 'pending' | 'expired' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      setUserSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: nextStatus, updatedAt: new Date().toISOString() } : s));
      showToast(language === 'ar' ? `تم تغيير حالة الاشتراك إلى (${nextStatus})` : 'Status updated');
    } catch (err) {
      console.error('Error updating status:', err);
      showToast(language === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status', 'error');
    }
  };

  // Delete Subscription
  const handleDeleteSubscription = async (subId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الاشتراك؟' : 'Delete this subscription?')) return;
    try {
      await deleteDoc(doc(db, 'subscriptions', subId));
      setUserSubscriptions(prev => prev.filter(s => s.id !== subId));
      showToast(language === 'ar' ? 'تم حذف سجل الاشتراك بنجاح' : 'Subscription deleted');
    } catch (err) {
      console.error('Error deleting sub:', err);
      showToast(language === 'ar' ? 'فشل حذف الاشتراك' : 'Failed to delete', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await loadAdminData();
  };

  // Handle Status Update
  const handleStatusChange = async (targetUid: string, newStatus: AccountStatus) => {
    setActionLoadingId(targetUid);
    try {
      await updateUserStatusByAdmin(targetUid, newStatus);
      showToast(
        language === 'ar' 
          ? `تم تحديث حالة الحساب إلى (${newStatus === 'approved' ? 'معتمد' : newStatus === 'suspended' ? 'معلق' : newStatus}) بنجاح`
          : `User status changed to ${newStatus}`
      );
      // Update local state immediately
      setUsersList(prev => prev.map(u => u.uid === targetUid ? { ...u, status: newStatus, updatedAt: new Date().toISOString() } : u));
      if (selectedUser && selectedUser.uid === targetUid) {
        setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: unknown) {
      showToast(language === 'ar' ? 'فشل تحديث الحالة: يرجى التحقق من أذونات المدير' : 'Failed to update status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Calculated Metrics
  const metrics = useMemo(() => {
    const total = usersList.length;
    const pending = usersList.filter(u => u.status === 'pending').length;
    const approved = usersList.filter(u => u.status === 'approved').length;
    const suspended = usersList.filter(u => u.status === 'suspended').length;
    const doctors = usersList.filter(u => u.role === 'doctor').length;
    const radiology = usersList.filter(u => u.role === 'radiology_center').length;
    const laboratories = usersList.filter(u => u.role === 'laboratory').length;
    const pharmacies = usersList.filter(u => u.role === 'pharmacy').length;
    const patients = usersList.filter(u => u.role === 'patient').length;
    const secretaries = usersList.filter(u => u.role === 'secretary').length;

    return { total, pending, approved, suspended, doctors, radiology, laboratories, pharmacies, patients, secretaries };
  }, [usersList]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = u.displayName?.toLowerCase().includes(q);
        const emailMatch = u.email?.toLowerCase().includes(q);
        const licenseMatch = u.licenseNumber?.toLowerCase().includes(q);
        const facilityMatch = u.facilityName?.toLowerCase().includes(q);
        const govMatch = u.governorate?.toLowerCase().includes(q);
        return nameMatch || emailMatch || licenseMatch || facilityMatch || govMatch;
      }
      return true;
    });
  }, [usersList, roleFilter, statusFilter, searchQuery]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return { labelAr: 'طبيب', labelEn: 'Doctor', color: 'bg-blue-100 text-[#003366] border-blue-200' };
      case 'radiology_center':
        return { labelAr: 'مركز أشعة', labelEn: 'Radiology', color: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'laboratory':
        return { labelAr: 'مختبر تحليلات', labelEn: 'Laboratory', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      case 'pharmacy':
        return { labelAr: 'صيدلية', labelEn: 'Pharmacy', color: 'bg-purple-100 text-purple-900 border-purple-200' };
      case 'patient':
        return { labelAr: 'مريض', labelEn: 'Patient', color: 'bg-cyan-100 text-cyan-900 border-cyan-200' };
      case 'secretary':
        return { labelAr: 'سكرتارية طبية', labelEn: 'Secretary', color: 'bg-rose-100 text-rose-900 border-rose-200' };
      case 'super_admin':
        return { labelAr: 'مشرف عام', labelEn: 'Super Admin', color: 'bg-slate-900 text-white border-slate-700' };
      default:
        return { labelAr: role, labelEn: role, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const getStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case 'approved':
        return { labelAr: 'معتمد ومفعل', labelEn: 'Approved', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'pending':
        return { labelAr: 'قيد التدقيق', labelEn: 'Pending Review', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'suspended':
        return { labelAr: 'معلق', labelEn: 'Suspended', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'rejected':
        return { labelAr: 'مرفوض', labelEn: 'Rejected', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { labelAr: 'غير مكتمل', labelEn: 'Incomplete', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-red-200 shadow-sm">
        <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900">
          {language === 'ar' ? 'صلاحيات الإشراف العام مقيدة' : 'Administrative Access Restricted'}
        </h3>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          {language === 'ar'
            ? 'هذه البوابة مخصصة حصراً للمشرف العام على منصة M737 الطبية لتدقيق تراخيص الكوادر الصحية العراقية.'
            : 'This portal is restricted to the M737 Super Administrator for validating healthcare credentials.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-lg border transition-all animate-in fade-in slide-in-from-top-2 ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-red-50 text-red-900 border-red-200'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXECUTIVE CLOUD DATABASE & SUPER ADMIN IDENTITY CARD */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-[#002244] to-[#00172e] rounded-3xl p-6 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Subtle decorative background blur */}
        <div className="absolute top-0 end-0 -mt-8 -me-8 w-48 h-48 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {language === 'ar' ? 'متصل ونشط ومؤمن 100%' : 'Active & Online (Live RPC)'}
              </span>
              <span className="text-xs text-slate-400 font-mono">operating-league-dv9wh</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Database className="text-sky-400" size={24} />
              <span>{language === 'ar' ? 'قاعدة البيانات المركزية: Cloud Firestore' : 'Central Database: Cloud Firestore'}</span>
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <div>
                <span className="text-slate-400">{language === 'ar' ? 'معرف قاعدة البيانات الجديد (DB ID): ' : 'Database ID: '}</span>
                <span className="font-mono font-bold text-amber-300 bg-black/30 px-2 py-0.5 rounded-md border border-amber-400/20">
                  ai-studio-m737medicalplatf-06180e9d-e98a-4a8d-97fc-d8a6644012dc
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">{language === 'ar' ? 'السوبر ادمن المعتمد: ' : 'Super Admin: '}</span>
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                  bcgmoc@gmail.com
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer"
              title={language === 'ar' ? 'مزامنة فورية وتحديث البيانات' : 'Sync data'}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{language === 'ar' ? 'تحديث ومزامنة' : 'Sync Live'}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('subscriptions');
                handleOpenCreatePlan();
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-600/30"
            >
              <Plus size={14} />
              <span>{language === 'ar' ? 'إضافة باقة جديدة' : 'New Plan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Super Admin Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('accreditation')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'accreditation'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck size={16} />
          <span>{language === 'ar' ? 'مركز اعتماد الكوادر' : 'Accreditation Hub'}</span>
          {metrics.pending > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
              {metrics.pending}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity size={16} />
          <span>{language === 'ar' ? 'المؤشرات والعمليات' : 'Platform Analytics'}</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock size={16} />
          <span>{language === 'ar' ? 'سجل الرقابة الإدارية' : 'Audit Trail'}</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles size={16} />
          <span>{language === 'ar' ? 'الاشتراكات والعيادات' : 'Subscriptions'}</span>
        </button>
      </div>

      {/* TAB 1: ACCREDITATION HUB */}
      {activeTab === 'accreditation' && (
        <div className="space-y-6">
          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block mb-1">
                {language === 'ar' ? 'إجمالي الحسابات' : 'Total Accounts'}
              </span>
              <div className="text-2xl font-black text-slate-900">{metrics.total}</div>
              <span className="text-[11px] text-slate-400">
                {language === 'ar' ? 'عبر 18 محافظة عراقية' : 'Across Iraqi Governorates'}
              </span>
            </div>

            <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 shadow-xs">
              <span className="text-xs text-amber-700 font-bold block mb-1">
                {language === 'ar' ? 'قيد المراجعة والتدقيق' : 'Pending Verification'}
              </span>
              <div className="text-2xl font-black text-amber-900">{metrics.pending}</div>
              <span className="text-[11px] text-amber-700 font-medium">
                {language === 'ar' ? 'تتطلب تدقيق رقم الترخيص' : 'Awaiting License Review'}
              </span>
            </div>

            <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 shadow-xs">
              <span className="text-xs text-emerald-700 font-bold block mb-1">
                {language === 'ar' ? 'الكوادر المعتمدة' : 'Approved Providers'}
              </span>
              <div className="text-2xl font-black text-emerald-900">{metrics.approved}</div>
              <span className="text-[11px] text-emerald-700 font-medium">
                {language === 'ar' ? 'صلاحيات تشغيلية نشطة' : 'Fully Operational'}
              </span>
            </div>

            <div className="bg-red-50/80 rounded-2xl p-4 border border-red-200 shadow-xs">
              <span className="text-xs text-red-700 font-bold block mb-1">
                {language === 'ar' ? 'الحسابات المعلقة' : 'Suspended'}
              </span>
              <div className="text-2xl font-black text-red-900">{metrics.suspended}</div>
              <span className="text-[11px] text-red-700 font-medium">
                {language === 'ar' ? 'مقيدة لأسباب رقابية' : 'Access Restricted'}
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث بالاسم، المنشأة، الإيميل، رقم الترخيص، أو المحافظة...' : 'Search by name, facility, license, email...'}
                  className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] bg-slate-50 focus:bg-white"
                />
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#003366]' : ''} />
                <span>{language === 'ar' ? 'تحديث البيانات' : 'Sync Live'}</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              {/* Role filter */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-400 me-1">{language === 'ar' ? 'الدور:' : 'Role:'}</span>
                {(['all', 'doctor', 'radiology_center', 'laboratory', 'pharmacy', 'patient', 'secretary'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      roleFilter === r
                        ? 'bg-[#003366] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r === 'all' 
                      ? (language === 'ar' ? 'الكل' : 'All')
                      : r === 'doctor'
                      ? (language === 'ar' ? 'أطباء' : 'Doctors')
                      : r === 'radiology_center'
                      ? (language === 'ar' ? 'أشعة' : 'Radiology')
                      : r === 'laboratory'
                      ? (language === 'ar' ? 'مختبرات' : 'Labs')
                      : r === 'pharmacy'
                      ? (language === 'ar' ? 'صيدليات' : 'Pharmacies')
                      : r === 'patient'
                      ? (language === 'ar' ? 'مرضى' : 'Patients')
                      : (language === 'ar' ? 'سكرتارية' : 'Secretaries')}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-400 me-1">{language === 'ar' ? 'الحالة:' : 'Status:'}</span>
                {(['all', 'pending', 'approved', 'suspended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      statusFilter === s
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'all'
                      ? (language === 'ar' ? 'كل الحالات' : 'All Statuses')
                      : s === 'pending'
                      ? (language === 'ar' ? 'قيد التدقيق' : 'Pending')
                      : s === 'approved'
                      ? (language === 'ar' ? 'معتمد' : 'Approved')
                      : (language === 'ar' ? 'معلق' : 'Suspended')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Providers Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">{language === 'ar' ? 'الاسم / المنشأة' : 'Provider / Facility'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'الدور المهني' : 'Role'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'رقم الترخيص' : 'License No.'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'المحافظة' : 'Governorate'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-end">{language === 'ar' ? 'القرار الإداري' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {loading
                          ? (language === 'ar' ? 'جاري الاتصال بقاعدة بيانات Firestore...' : 'Loading records...')
                          : (language === 'ar' ? 'لم يتم العثور على سجلات تطابق الفلتر الحالي.' : 'No records match filter.')}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => {
                      const roleMeta = getRoleBadge(usr.role);
                      const statusMeta = getStatusBadge(usr.status);
                      const isActing = actionLoadingId === usr.uid;

                      return (
                        <tr key={usr.uid} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                                {usr.displayName?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{usr.displayName || 'Unnamed User'}</span>
                                  {usr.facilityName && (
                                    <span className="text-[10px] text-slate-500 font-normal">
                                      ({usr.facilityName})
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">{usr.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] border ${roleMeta.color}`}>
                              {language === 'ar' ? roleMeta.labelAr : roleMeta.labelEn}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-mono font-medium text-slate-800">
                            {usr.licenseNumber || '—'}
                          </td>

                          <td className="py-3.5 px-3 text-slate-600">
                            {usr.governorate || '—'}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] border ${statusMeta.color}`}>
                              {language === 'ar' ? statusMeta.labelAr : statusMeta.labelEn}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-end">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Inspect details button */}
                              <button
                                onClick={() => {
                                  setSelectedUser(usr);
                                  setShowInspectorModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                title={language === 'ar' ? 'عرض تفاصيل الحساب' : 'Inspect user details'}
                              >
                                <Eye size={14} />
                              </button>

                              {/* Action buttons */}
                              {usr.status !== 'approved' && (
                                <button
                                  onClick={() => handleStatusChange(usr.uid, 'approved')}
                                  disabled={isActing}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  {isActing ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={12} />
                                  )}
                                  <span>{language === 'ar' ? 'اعتماد' : 'Approve'}</span>
                                </button>
                              )}

                              {usr.status !== 'suspended' && usr.role !== 'super_admin' && (
                                <button
                                  onClick={() => handleStatusChange(usr.uid, 'suspended')}
                                  disabled={isActing}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold text-[11px] border border-slate-200 transition-colors cursor-pointer"
                                >
                                  {language === 'ar' ? 'تعليق' : 'Suspend'}
                                </button>
                              )}
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
      )}

      {/* TAB 2: PLATFORM ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Activity size={18} className="text-[#003366]" />
              <span>{language === 'ar' ? 'توزيع الكوادر والمنشآت المعتمدة في العراق' : 'Iraqi Healthcare Network Distribution'}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {language === 'ar'
                ? 'إحصائيات مباشرة من قاعدة بيانات Cloud Firestore (المعرف: ai-studio-m737medicalplatf-06180e9d-e98a-4a8d-97fc-d8a6644012dc) المربوطة بمشروع operating-league-dv9wh.'
                : 'Real-time telemetry and network distribution from Cloud Firestore (ai-studio-m737medicalplatf-06180e9d-e98a-4a8d-97fc-d8a6644012dc).'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <Stethoscope size={24} className="text-[#003366] mx-auto mb-2" />
                <div className="text-xl font-black text-slate-900">{metrics.doctors}</div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">{language === 'ar' ? 'أطباء معتمدون' : 'Doctors'}</div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <Scan size={24} className="text-amber-800 mx-auto mb-2" />
                <div className="text-xl font-black text-slate-900">{metrics.radiology}</div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">{language === 'ar' ? 'مراكز أشعة وسونار' : 'Radiology'}</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <FlaskConical size={24} className="text-emerald-800 mx-auto mb-2" />
                <div className="text-xl font-black text-slate-900">{metrics.laboratories}</div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">{language === 'ar' ? 'مختبرات سريرية' : 'Labs'}</div>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <Pill size={24} className="text-purple-800 mx-auto mb-2" />
                <div className="text-xl font-black text-slate-900">{metrics.pharmacies}</div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">{language === 'ar' ? 'صيدليات ومذاخر' : 'Pharmacies'}</div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-center">
                <User size={24} className="text-cyan-800 mx-auto mb-2" />
                <div className="text-xl font-black text-slate-900">{metrics.patients}</div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">{language === 'ar' ? 'مرضى مسجلون' : 'Patients'}</div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <Users size={24} className="text-rose-800 mx-auto mb-2" />
                <div className="text-xl font-black text-slate-900">{metrics.secretaries}</div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">{language === 'ar' ? 'سكرتارية طبية' : 'Secretaries'}</div>
              </div>
            </div>

            {/* Operational volume */}
            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-semibold">{language === 'ar' ? 'الحجوزات الطبية في النظام' : 'Registered Appointments'}</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{totalAppointments}</div>
                </div>
                <Calendar size={32} className="text-[#003366] opacity-60" />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-semibold">{language === 'ar' ? 'عمليات الرقابة الإدارية المسجلة' : 'Logged Front-Desk Actions'}</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{auditLogs.length}</div>
                </div>
                <ShieldCheck size={32} className="text-emerald-700 opacity-60" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-[#003366]" />
                <span>{language === 'ar' ? 'سجل الرقابة الإدارية والعمليات الميدانية' : 'Platform Front-Desk Audit Trail'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ar'
                  ? 'توثيق غير قابل للتعديل لكافة الإجراءات المتخذة في العيادات والمراكز الصحية لحماية خصوصية المرضى.'
                  : 'Immutable audit logs tracking scheduling, cancellations, check-ins, and walk-ins.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">{language === 'ar' ? 'التوقيت' : 'Timestamp'}</th>
                  <th className="py-2.5 px-3">{language === 'ar' ? 'العيادة / الطبيب' : 'Clinic / Doctor'}</th>
                  <th className="py-2.5 px-3">{language === 'ar' ? 'القائم بالإجراء' : 'Actor'}</th>
                  <th className="py-2.5 px-3">{language === 'ar' ? 'نوع الإجراء' : 'Action'}</th>
                  <th className="py-2.5 px-3">{language === 'ar' ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {language === 'ar' ? 'لا توجد سجلات رقابة مسجلة حالياً.' : 'No audit records logged yet.'}
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-US') : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {log.doctorName || log.doctorId}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-700">{log.actorName}</span>
                        <span className="text-[10px] text-slate-400 block capitalize">({log.actorRole})</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DYNAMIC SUBSCRIPTIONS & CUSTOM PRICING ENGINE */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Header & Quick Action Buttons */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#003366] flex items-center justify-center">
                    <DollarSign size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {language === 'ar' ? 'مركز إدارة الاشتراكات وتحديد الأسعار' : 'Subscription & Dynamic Pricing Center'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  {language === 'ar'
                    ? 'تحكم كامل للسوبر ادمن لتحديد أسعار باقات الكوادر الطبية والمراكز الصحية بالدينار العراقي، وإضافة باقات جديدة، أو منح اشتراكات مخصصة بأسعار تفاوضية لأي طبيب أو صيدلية أو مختبر.'
                    : 'Full Super Admin control to define and update subscription prices in IQD, launch custom tiers, and assign negotiated rates.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                <button
                  onClick={handleOpenCreatePlan}
                  className="px-4 py-2.5 rounded-xl bg-[#003366] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={15} />
                  <span>{language === 'ar' ? 'إضافة باقة جديدة' : 'Add New Plan'}</span>
                </button>
                <button
                  onClick={() => handleOpenAssignModal()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>{language === 'ar' ? 'تخصيص اشتراك لمنشأة / طبيب' : 'Assign Custom Sub'}</span>
                </button>
              </div>
            </div>

            {/* Quick Pricing KPI summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  {language === 'ar' ? 'الباقات الفعالة' : 'Active Plans'}
                </span>
                <span className="text-xl font-black text-slate-900">
                  {subscriptionPlans.filter(p => p.isActive !== false).length}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
                <span className="text-[11px] font-bold text-emerald-700 block mb-1">
                  {language === 'ar' ? 'الاشتراكات المخصصة' : 'Assigned Subscriptions'}
                </span>
                <span className="text-xl font-black text-emerald-900">
                  {userSubscriptions.length}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/70">
                <span className="text-[11px] font-bold text-sky-700 block mb-1">
                  {language === 'ar' ? 'الاشتراكات السارية' : 'Live Subscriptions'}
                </span>
                <span className="text-xl font-black text-sky-950">
                  {userSubscriptions.filter(s => s.status === 'active').length}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70">
                <span className="text-[11px] font-bold text-amber-700 block mb-1">
                  {language === 'ar' ? 'العملة المعتمدة' : 'Official Currency'}
                </span>
                <span className="text-sm font-black text-amber-950">
                  {language === 'ar' ? 'دينار عراقي (IQD)' : 'Iraqi Dinar (IQD)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Dynamic Subscription Plans Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span>📋</span>
                <span>{language === 'ar' ? 'باقات الاشتراك وأسعارها بالدينار العراقي' : 'Subscription Plans & IQD Pricing'}</span>
              </h4>
              <span className="text-xs text-slate-400 font-medium">
                {language === 'ar' ? 'انقر على أي باقة لتعديل السعر والمميزات' : 'Click any plan to modify price'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => {
                const roleBadge = getRoleBadge(plan.targetRole as UserRole);

                return (
                  <div
                    key={plan.id}
                    className={`rounded-3xl p-6 bg-white border-2 flex flex-col justify-between transition-all relative ${
                      plan.isPopular
                        ? 'border-[#003366] shadow-md shadow-blue-900/5'
                        : plan.isActive !== false
                        ? 'border-slate-200 hover:border-slate-300'
                        : 'border-slate-200/60 bg-slate-50/70 opacity-75'
                    }`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 end-6 px-3 py-0.5 rounded-full bg-[#003366] text-white text-[10px] font-black tracking-wide uppercase shadow-sm">
                        {language === 'ar' ? 'الأكثر طلباً' : 'Popular'}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${roleBadge.color}`}>
                          {language === 'ar' ? roleBadge.labelAr : roleBadge.labelEn}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          plan.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {plan.isActive !== false ? (language === 'ar' ? 'مفعلة' : 'Active') : (language === 'ar' ? 'معطلة' : 'Disabled')}
                        </span>
                      </div>

                      <h4 className="text-lg font-black text-slate-900 mb-1">
                        {language === 'ar' ? plan.nameAr : plan.nameEn}
                      </h4>
                      <p className="text-xs text-slate-500 mb-4 min-h-[32px] leading-relaxed">
                        {language === 'ar' ? plan.descriptionAr : plan.descriptionEn || plan.descriptionAr}
                      </p>

                      {/* Prominent Price Tag with IQD */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          {language === 'ar' ? 'السعر المحدد من قبل السوبر ادمن:' : 'Super Admin Configured Price:'}
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-2xl font-black text-[#003366] font-mono">
                            {plan.priceIqd.toLocaleString()}
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            {language === 'ar' ? 'دينار عراقي' : 'IQD'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            / {plan.billingPeriod === 'monthly' ? (language === 'ar' ? 'شهرياً' : 'mo') : plan.billingPeriod === 'yearly' ? (language === 'ar' ? 'سنوياً' : 'yr') : plan.billingPeriod}
                          </span>
                        </div>
                      </div>

                      {/* Features list */}
                      <ul className="text-xs text-slate-600 space-y-2 mb-6">
                        {(plan.featuresAr || []).map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditPlan(plan)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#003366] hover:text-white text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title={language === 'ar' ? 'تعديل السعر والمميزات' : 'Edit Price & Plan'}
                      >
                        <Edit3 size={13} />
                        <span>{language === 'ar' ? 'تعديل السعر' : 'Edit Price'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePlanActive(plan)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title={language === 'ar' ? 'تبديل حالة التفعيل' : 'Toggle Active'}
                        >
                          {plan.isActive !== false ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={language === 'ar' ? 'حذف الباقة' : 'Delete Plan'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Active Provider Subscriptions Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>🏢</span>
                  <span>{language === 'ar' ? 'سجل اشتراكات العيادات والمراكز الصحية (الأسعار المخصصة)' : 'Assigned Provider Subscriptions & Special Rates'}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar'
                    ? 'قائمة الاشتراكات المخصصة للمنشآت مع إمكانية تعديل السعر المتفق عليه أو التمديد فوراً.'
                    : 'Active provider memberships with negotiated rates and expiration controls.'}
                </p>
              </div>

              <button
                onClick={() => handleOpenAssignModal()}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>{language === 'ar' ? 'تخصيص اشتراك جديد' : 'Assign Sub'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">{language === 'ar' ? 'المنشأة / الطبيب' : 'Provider / Facility'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'الفئة' : 'Role'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'الباقة المعتمدة' : 'Plan'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'السعر المتفق عليه (IQD)' : 'Agreed Price'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expires'}</th>
                    <th className="py-3 px-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-3 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#003366] flex items-center justify-center mx-auto text-xl">
                            💼
                          </div>
                          <p className="text-slate-600 font-bold text-sm">
                            {language === 'ar' ? 'لا توجد اشتراكات مخصصة مسجلة بعد' : 'No provider subscriptions recorded yet'}
                          </p>
                          <p className="text-slate-400 text-xs">
                            {language === 'ar'
                              ? 'يمكنك الآن تخصيص أي اشتراك لأي طبيب أو منشأة وتحديد السعر المناسب بالدينار العراقي.'
                              : 'Assign plans to doctors or clinics and customize their prices.'}
                          </p>
                          <button
                            onClick={() => handleOpenAssignModal()}
                            className="px-4 py-2 rounded-xl bg-[#003366] text-white font-bold text-xs"
                          >
                            {language === 'ar' ? 'تخصيص اشتراك الآن' : 'Assign First Subscription'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    userSubscriptions.map((sub) => {
                      const roleBadge = getRoleBadge(sub.userRole);
                      const isExpiredSub = sub.endDate && new Date(sub.endDate).getTime() < Date.now();

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{sub.userName}</div>
                            {sub.facilityName && (
                              <div className="text-[11px] text-slate-500">{sub.facilityName}</div>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono">{sub.userEmail}</div>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadge.color}`}>
                              {language === 'ar' ? roleBadge.labelAr : roleBadge.labelEn}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {sub.planName}
                          </td>

                          <td className="py-3 px-3">
                            <button
                              onClick={() => {
                                setSubToEditPrice(sub);
                                setQuickPriceInput(sub.customPriceIqd);
                              }}
                              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 font-mono font-bold cursor-pointer transition-colors"
                              title={language === 'ar' ? 'انقر لتعديل السعر المخصص فوراً' : 'Click to edit price'}
                            >
                              <span>{sub.customPriceIqd.toLocaleString()} د.ع</span>
                              <Edit3 size={11} className="text-emerald-700 opacity-60 group-hover:opacity-100" />
                            </button>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600">
                            <div>{sub.endDate ? new Date(sub.endDate).toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US') : '—'}</div>
                            {isExpiredSub && (
                              <span className="text-[10px] text-rose-600 font-bold block">{language === 'ar' ? 'منتهي' : 'Expired'}</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {sub.status === 'active' ? (language === 'ar' ? 'ساري ومفعل' : 'Active') : sub.status}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSubToEditPrice(sub);
                                  setQuickPriceInput(sub.customPriceIqd);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                {language === 'ar' ? 'تعديل السعر' : 'Price'}
                              </button>

                              <button
                                onClick={() => handleToggleSubStatus(sub, sub.status === 'active' ? 'expired' : 'active')}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                {sub.status === 'active' ? (language === 'ar' ? 'تعليق' : 'Suspend') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                              </button>

                              <button
                                onClick={() => handleDeleteSubscription(sub.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
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
      )}

      {/* INSPECTOR MODAL */}
      {showInspectorModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#003366] text-white flex items-center justify-center font-bold">
                  {selectedUser.displayName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedUser.displayName}</h3>
                  <span className="text-xs text-slate-400 font-mono">{selectedUser.email}</span>
                </div>
              </div>

              <button
                onClick={() => setShowInspectorModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Profile fields */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'الدور المعتمد:' : 'Role:'}</span>
                <span className="font-bold text-slate-800 capitalize">{selectedUser.role}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'حالة الاعتماد:' : 'Status:'}</span>
                <span className="font-bold text-slate-800">{selectedUser.status}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'رقم الترخيص / الإجازة:' : 'License Number:'}</span>
                <span className="font-bold text-slate-800 font-mono">{selectedUser.licenseNumber || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'المحافظة:' : 'Governorate:'}</span>
                <span className="font-bold text-slate-800">{selectedUser.governorate || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 col-span-2">
                <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'اسم المنشأة الطبية / العيادة:' : 'Facility Name:'}</span>
                <span className="font-bold text-slate-800">{selectedUser.facilityName || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 col-span-2">
                <span className="text-slate-400 block mb-0.5">{language === 'ar' ? 'رقم الهاتف:' : 'Phone:'}</span>
                <span className="font-bold text-slate-800 font-mono">{selectedUser.phone || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 col-span-2 font-mono text-[10px] text-slate-400">
                UID: {selectedUser.uid}
              </div>
            </div>

            {/* Quick Actions inside Modal */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              {selectedUser.status !== 'approved' && (
                <button
                  onClick={() => handleStatusChange(selectedUser.uid, 'approved')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'اعتماد الحساب وتفعيل الصلاحيات' : 'Approve & Activate'}
                </button>
              )}

              {selectedUser.status !== 'suspended' && selectedUser.role !== 'super_admin' && (
                <button
                  onClick={() => handleStatusChange(selectedUser.uid, 'suspended')}
                  className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'تعليق الحساب' : 'Suspend Account'}
                </button>
              )}

              <button
                onClick={() => setShowInspectorModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: CREATE / EDIT SUBSCRIPTION PLAN & SET PRICE */}
      {/* ==================================================== */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#003366] flex items-center justify-center font-bold">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedPlanForEdit 
                      ? (language === 'ar' ? `تعديل باقة: ${selectedPlanForEdit.nameAr}` : `Edit Plan: ${selectedPlanForEdit.nameEn}`)
                      : (language === 'ar' ? 'إضافة باقة اشتراك جديدة' : 'Add New Subscription Plan')}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {language === 'ar' ? 'تحديد وتعديل السعر بالدينار العراقي والمميزات' : 'Set custom price in IQD & features'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'اسم الباقة بالعربية *' : 'Plan Name (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.nameAr}
                    onChange={(e) => setPlanForm({ ...planForm, nameAr: e.target.value })}
                    placeholder="مثال: باقة العيادة المتطورة"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'اسم الباقة بالإنجليزية' : 'Plan Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={planForm.nameEn}
                    onChange={(e) => setPlanForm({ ...planForm, nameEn: e.target.value })}
                    placeholder="e.g. Advanced Clinic Tier"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Price in IQD - Super Admin can set ANY price */}
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                <label className="block font-black text-slate-900 text-sm">
                  {language === 'ar' ? 'السعر المحدد بالدينار العراقي (IQD) *' : 'Set Plan Price in IQD *'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={planForm.priceIqd}
                      onChange={(e) => setPlanForm({ ...planForm, priceIqd: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-3 py-2.5 rounded-xl border border-sky-300 bg-white font-mono font-bold text-lg text-slate-900 focus:ring-2 focus:ring-[#003366]"
                    />
                  </div>
                  <span className="font-bold text-slate-700 text-sm shrink-0">
                    {language === 'ar' ? 'د.ع' : 'IQD'}
                  </span>
                </div>
                {/* Price Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">{language === 'ar' ? 'اقتراحات سريعة:' : 'Quick Presets:'}</span>
                  {[0, 15000, 25000, 35000, 50000, 60000, 100000, 150000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPlanForm({ ...planForm, priceIqd: preset })}
                      className="px-2 py-0.5 rounded-lg bg-white border border-sky-200 text-slate-700 font-mono text-[10px] font-bold hover:bg-sky-100 transition-colors"
                    >
                      {preset === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'الفئة المستهدفة' : 'Target Role'}
                  </label>
                  <select
                    value={planForm.targetRole}
                    onChange={(e) => setPlanForm({ ...planForm, targetRole: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="all">{language === 'ar' ? 'كافة المنشآت والكوادر' : 'All Roles'}</option>
                    <option value="doctor">{language === 'ar' ? 'أطباء وعيادات' : 'Doctors'}</option>
                    <option value="radiology_center">{language === 'ar' ? 'مراكز أشعة وسونار' : 'Radiology Centers'}</option>
                    <option value="laboratory">{language === 'ar' ? 'مختبرات سريرية' : 'Laboratories'}</option>
                    <option value="pharmacy">{language === 'ar' ? 'صيدليات ومذاخر' : 'Pharmacies'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'دورة الفوترة' : 'Billing Period'}
                  </label>
                  <select
                    value={planForm.billingPeriod}
                    onChange={(e) => setPlanForm({ ...planForm, billingPeriod: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="monthly">{language === 'ar' ? 'شهرياً' : 'Monthly'}</option>
                    <option value="quarterly">{language === 'ar' ? 'كل 3 أشهر (ربع سنوي)' : 'Quarterly'}</option>
                    <option value="yearly">{language === 'ar' ? 'سنوياً' : 'Yearly'}</option>
                    <option value="custom">{language === 'ar' ? 'عقد مخصص' : 'Custom Agreement'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'وصف مختصر للباقة' : 'Short Description'}
                </label>
                <textarea
                  rows={2}
                  value={planForm.descriptionAr}
                  onChange={(e) => setPlanForm({ ...planForm, descriptionAr: e.target.value })}
                  placeholder="وصف الخدمات والمزايا التي يحصل عليها المشترك..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'المميزات والخدمات (ميزة في كل سطر)' : 'Features (one per line)'}
                </label>
                <textarea
                  rows={4}
                  value={planForm.featuresArText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresArText: e.target.value })}
                  placeholder="حساب طبيب معتمد&#10;تفويض سكرتارية وتنظيم الحجوزات&#10;سجلات طبية مشفرة"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-sans"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isPopular}
                    onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                    className="w-4 h-4 rounded text-[#003366]"
                  />
                  <span className="font-bold text-slate-700">{language === 'ar' ? 'تمييز كباقة الأكثر طلباً' : 'Mark as Popular'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="font-bold text-slate-700">{language === 'ar' ? 'الباقة مفعلة ونشطة' : 'Active Plan'}</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#003366] hover:bg-sky-900 text-white font-bold text-xs shadow-md"
                >
                  {language === 'ar' ? 'حفظ الخطة وتثبيت السعر' : 'Save Plan & Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: ASSIGN SUBSCRIPTION & CUSTOM PRICE TO USER */}
      {/* ==================================================== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {language === 'ar' ? 'تخصيص اشتراك وسعر خاص لمنشأة / طبيب' : 'Assign Custom Subscription & Price'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {language === 'ar' ? 'تحديد السعر المتفق عليه ومدة الصلاحية' : 'Set custom negotiated price and validity'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'اختر المنشأة أو الطبيب *' : 'Select Provider / Clinic *'}
                </label>
                <select
                  required
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="">{language === 'ar' ? '-- اختر من قائمة الكوادر المسجلة --' : '-- Select Provider --'}</option>
                  {usersList
                    .filter((u) => u.role !== 'patient' && u.role !== 'super_admin')
                    .map((usr) => (
                      <option key={usr.uid} value={usr.uid}>
                        {usr.displayName} ({usr.role}) {usr.facilityName ? `- ${usr.facilityName}` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'الباقة المعتمدة *' : 'Base Plan *'}
                </label>
                <select
                  value={assignForm.planId}
                  onChange={(e) => {
                    const selPlan = subscriptionPlans.find(p => p.id === e.target.value);
                    setAssignForm({
                      ...assignForm,
                      planId: e.target.value,
                      customPriceIqd: selPlan ? selPlan.priceIqd : assignForm.customPriceIqd
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  {subscriptionPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nameAr} - السعر الافتراضي: {plan.priceIqd.toLocaleString()} د.ع
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Negotiated Price */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <label className="block font-black text-emerald-950 text-sm">
                  {language === 'ar' ? 'السعر المخصص المتفق عليه (بالدينار العراقي IQD) *' : 'Custom Negotiated Price (IQD) *'}
                </label>
                <p className="text-[11px] text-emerald-800">
                  {language === 'ar' 
                    ? 'يمكنك هنا تحديد أي سعر تريده خصيصاً لهذه المنشأة (مثلاً خصم نقابي، أو إعفاء كامل 0 د.ع):' 
                    : 'Enter any custom price negotiated for this provider:'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={assignForm.customPriceIqd}
                    onChange={(e) => setAssignForm({ ...assignForm, customPriceIqd: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-emerald-300 bg-white font-mono font-bold text-lg text-emerald-950 focus:ring-2 focus:ring-emerald-600"
                  />
                  <span className="font-bold text-slate-700 text-sm shrink-0">
                    {language === 'ar' ? 'د.ع' : 'IQD'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'مدة الاشتراك' : 'Duration'}
                  </label>
                  <select
                    value={assignForm.durationMonths}
                    onChange={(e) => setAssignForm({ ...assignForm, durationMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value={1}>{language === 'ar' ? 'شهر واحد' : '1 Month'}</option>
                    <option value={3}>{language === 'ar' ? '3 أشهر' : '3 Months'}</option>
                    <option value={6}>{language === 'ar' ? '6 أشهر' : '6 Months'}</option>
                    <option value={12}>{language === 'ar' ? 'سنة كاملة (12 شهر)' : '1 Year'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'حالة التفعيل' : 'Initial Status'}
                  </label>
                  <select
                    value={assignForm.status}
                    onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="active">{language === 'ar' ? 'مفعل وساري فوراً' : 'Active Immediately'}</option>
                    <option value="pending">{language === 'ar' ? 'قيد المراجعة / الدفع' : 'Pending'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'ar' ? 'ملاحظات الاتفاقية / الخصم' : 'Contract Notes'}
                </label>
                <input
                  type="text"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="مثال: خصم نقابة أطباء العراق، دفع مقدماً..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  {language === 'ar' ? 'تأكيد وحفظ الاشتراك' : 'Confirm & Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: QUICK EDIT PRICE ON AN EXISTING SUBSCRIPTION */}
      {/* ==================================================== */}
      {subToEditPrice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                {language === 'ar' ? `تعديل السعر لـ: ${subToEditPrice.userName}` : `Edit Price: ${subToEditPrice.userName}`}
              </h3>
              <button
                type="button"
                onClick={() => setSubToEditPrice(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickUpdatePrice} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">
                  {language === 'ar' ? 'السعر المخصص الجديد (بالدينار العراقي):' : 'New Custom Price (IQD):'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={quickPriceInput}
                    onChange={(e) => setQuickPriceInput(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-base"
                  />
                  <span className="font-bold text-slate-700">د.ع</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubToEditPrice(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#003366] text-white font-bold"
                >
                  {language === 'ar' ? 'تحديث السعر' : 'Update Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
