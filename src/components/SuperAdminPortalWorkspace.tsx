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
  Appointment
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
  ExternalLink
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

  // Filters
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Load All Users and System Metrics
  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const list = usersSnap.docs.map((d) => d.data() as UserProfile);
      // Sort newest first
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
                ? 'إحصائيات مباشرة من السجل الموحد لقواعد بيانات Firestore تشمل الأطباء ومراكز الأشعة والمختبرات والصيدليات.'
                : 'Real-time telemetry and network distribution across all 7 platform portals.'}
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

      {/* TAB 4: SUBSCRIPTIONS & CLINIC TIERS */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-[#003366]" />
              <span>{language === 'ar' ? 'خطط وباقات العيادات والمراكز الصحية' : 'Provider Subscription Tiers'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'إدارة فئات اشتراك العيادات الطبية والمراكز التشخيصية في المنصة.'
                : 'Subscription tier overview for Iraqi healthcare providers.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#003366] uppercase mb-1">Standard</div>
                <h4 className="text-lg font-black text-slate-900">{language === 'ar' ? 'العيادة الفردية' : 'Solo Practice'}</h4>
                <div className="text-2xl font-black text-slate-900 mt-3 mb-4">
                  25,000 <span className="text-xs font-normal text-slate-500">IQD / {language === 'ar' ? 'شهر' : 'mo'}</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'حساب طبيب واحد مستقل' : '1 Certified Doctor Account'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'تفويض سكرتيرة واحدة' : '1 Secretary Delegation'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'سجلات طبية مشفرة' : 'Encrypted Medical Records'}</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                {language === 'ar' ? 'الخطة القياسية للأطباء' : 'Default tier'}
              </div>
            </div>

            <div className="p-6 rounded-2xl border-2 border-[#003366] bg-blue-50/40 flex flex-col justify-between relative shadow-sm">
              <div className="absolute top-3 end-3 px-2 py-0.5 rounded-full bg-[#003366] text-white text-[10px] font-bold">
                {language === 'ar' ? 'الأكثر طلباً' : 'Popular'}
              </div>
              <div>
                <div className="text-xs font-bold text-[#003366] uppercase mb-1">Professional Pro</div>
                <h4 className="text-lg font-black text-slate-900">{language === 'ar' ? 'المجمع التخصصي' : 'Specialized Complex'}</h4>
                <div className="text-2xl font-black text-slate-900 mt-3 mb-4">
                  60,000 <span className="text-xs font-normal text-slate-500">IQD / {language === 'ar' ? 'شهر' : 'mo'}</span>
                </div>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'حتى 5 أطباء استشاريين' : 'Up to 5 Doctors'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'سكرتارية متعددة واستقبال' : 'Multiple Front-Desk Staff'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'ربط مباشر بالمختبرات والأشعة' : 'Direct Diagnostic Linking'}</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-blue-200 text-xs text-[#003366] font-semibold">
                {language === 'ar' ? 'مخصص للمجمعات الطبية' : 'For Multi-Specialty Clinics'}
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#003366] uppercase mb-1">Enterprise Hospital</div>
                <h4 className="text-lg font-black text-slate-900">{language === 'ar' ? 'المستشفيات والمراكز الكبرى' : 'Hospital / Center'}</h4>
                <div className="text-2xl font-black text-slate-900 mt-3 mb-4">
                  {language === 'ar' ? 'عقد سنوي مخصص' : 'Custom Agreement'}
                </div>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'أطباء وسكرتارية غير محدودة' : 'Unlimited Staff & Doctors'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'نظام أرشفة صور DICOM' : 'Full Radiology PACS Integration'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'دعم تقني وإداري 24/7' : '24/7 Priority Support'}</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                {language === 'ar' ? 'تواصل مع إدارة M737' : 'Contact Platform Admin'}
              </div>
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
    </div>
  );
};
