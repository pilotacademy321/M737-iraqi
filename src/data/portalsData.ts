import { PortalInfo } from '../types';

export const PORTALS_DATA: PortalInfo[] = [
  {
    id: 'doctor',
    role: 'doctor',
    order: 1,
    titleAr: 'بوابة الطبيب',
    titleEn: 'Doctor Portal',
    subtitleAr: 'الحجوزات، الملف المهني وإدارة المواعيد',
    subtitleEn: 'Bookings, professional profile & appointment management',
    descAr: 'منظومة متكاملة للأطباء لإدارة العيادة اليومية، جدول الاستشارات، مراجعة السجلات الطبية للمرضى وإصدار الوصفات الطبية الرقمية.',
    descEn: 'Comprehensive suite for clinicians to manage daily consultations, access verified medical records, schedule appointments, and issue digital prescriptions.',
    accentColor: '#dc2626', // Red
    bgLight: 'bg-red-50 text-red-600',
    borderColor: 'border-red-200 hover:border-red-400',
    iconName: 'doctor',
    plannedModulesAr: [
      'جدول المواعيد والاستشارات الفورية',
      'إدارة السجل الطبي الرقمي الموحد للمريض',
      'الوصفة الطبية الإلكترونية المشفرة',
      'شبكة الإحالة إلى المختبرات ومراكز الأشعة'
    ],
    plannedModulesEn: [
      'Appointment & Clinical Consultation Calendar',
      'Unified Digital Patient Health Records',
      'Secure Electronic Prescription Dispatch',
      'Diagnostic Lab & Radiology Referral Network'
    ]
  },
  {
    id: 'radiology',
    role: 'radiology_center',
    order: 2,
    titleAr: 'بوابة الأشعة والسونار',
    titleEn: 'Radiology and Ultrasound Portal',
    subtitleAr: 'الفحوصات، الصور والتقارير الطبية',
    subtitleEn: 'Scans, imaging & diagnostic radiology reports',
    descAr: 'ربط مراكز الأشعة والسونار والتصوير بالرنين والمفراس لتسليم التقارير والصور الشعاعية مباشرة للأطباء والمرضى بأعلى درجات الدقة.',
    descEn: 'Connecting MRI, CT, ultrasound and X-ray imaging centers to deliver diagnostic scans and radiologist findings securely to physicians and patients.',
    accentColor: '#0891b2', // Cyan/Teal
    bgLight: 'bg-cyan-50 text-cyan-600',
    borderColor: 'border-cyan-200 hover:border-cyan-400',
    iconName: 'radiology',
    plannedModulesAr: [
      'نظام إدارة وحفظ الصور الشعاعية (PACS)',
      'إصدار وتصديق تقارير أطباء الأشعة',
      'استقبال طلبات الفحص من العيادات',
      'تسليم النتائج الرقمية الفورية للمريض'
    ],
    plannedModulesEn: [
      'Radiology PACS Image Ingestion & Viewer',
      'Radiologist Diagnostic Report Verification',
      'Incoming Clinic Referral Request Stream',
      'Secure Patient Digital Imaging Delivery'
    ]
  },
  {
    id: 'laboratory',
    role: 'laboratory',
    order: 3,
    titleAr: 'بوابة المختبرات والتحاليل',
    titleEn: 'Medical Laboratories Portal',
    subtitleAr: 'التحاليل والنتائج والتقارير',
    subtitleEn: 'Lab tests, clinical pathology & automated results',
    descAr: 'إدارة متقدمة للتحاليل المخبرية السريرية، ربط الأجهزة الآلية، وتوفير نتائج الفحوصات بباركود موحد موثوق للطبيب والمريض.',
    descEn: 'State-of-the-art laboratory information workflow connecting automated analyzers, specimen barcodes, and rapid certified pathology reporting.',
    accentColor: '#ea580c', // Orange
    bgLight: 'bg-orange-50 text-orange-600',
    borderColor: 'border-orange-200 hover:border-orange-400',
    iconName: 'laboratory',
    plannedModulesAr: [
      'تتبع العينات السريرية برمز الباركود',
      'إدخال وأرشفة نتائج التحاليل المخبرية',
      'إشعارات فورية للطبيب والمريض بجاهزية النتيجة',
      'تكامل مع أجهزة الفحص والتحليل الآلي'
    ],
    plannedModulesEn: [
      'Clinical Specimen Barcode & Chain of Custody',
      'Pathology & Chemistry Test Result Entry',
      'Automated SMS/Notification Dispatch',
      'Direct Diagnostic Analyzer Integration'
    ]
  },
  {
    id: 'pharmacy',
    role: 'pharmacy',
    order: 4,
    titleAr: 'بوابة الصيدليات',
    titleEn: 'Pharmacy Portal',
    subtitleAr: 'الدواء، الأسعار وتوفر المخزون',
    subtitleEn: 'Prescriptions, medication stock & live availability',
    descAr: 'صرف الوصفات الطبية الإلكترونية المعتمدة، متابعة توفر الأدوية في الصيدليات الأهلية والمستودعات، وتسهيل بحث المرضى عن العلاج.',
    descEn: 'Streamlined dispensing of electronic prescriptions, live inventory tracking across Iraqi pharmacies, and medication availability locator.',
    accentColor: '#059669', // Emerald Green
    bgLight: 'bg-emerald-50 text-emerald-600',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    iconName: 'pharmacy',
    plannedModulesAr: [
      'التحقق من الوصفة الإلكترونية وصرف الدواء',
      'إدارة المخزون والتنبيه بنواقص الأدوية والتواريخ',
      'نظام التوافق الدوائي والتحذير من التفاعلات',
      'إتاحة استعلام المرضى عن توافر الدواء القريب'
    ],
    plannedModulesEn: [
      'e-Prescription Verification & Dispensing Desk',
      'Stock Inventory & Expiry Date Alert Engine',
      'Drug-Drug Interaction Safety Checks',
      'Medication Location & Price Lookup Index'
    ]
  },
  {
    id: 'patient',
    role: 'patient',
    order: 5,
    titleAr: 'بوابة المريض',
    titleEn: 'Patient Portal',
    subtitleAr: 'حجز المواعيد، البحث عن الأدوية والمتابعة الصحية',
    subtitleEn: 'Appointments, pharmacy finder & personal health history',
    descAr: 'الملف الصحي الرقمي المتكامل للمواطن، حجز مواعيد الأطباء، الاطلاع على الفحوصات وتقارير الأشعة، والبحث عن الأدوية الشحيحة بسهولة.',
    descEn: 'Unified digital healthcare companion for patients: book verified doctor consultations, view lab results & radiology scans, and locate medicines nearby.',
    accentColor: '#0284c7', // Sky / Medical Blue
    bgLight: 'bg-sky-50 text-sky-600',
    borderColor: 'border-sky-200 hover:border-sky-400',
    iconName: 'patient',
    plannedModulesAr: [
      'سجل المريض الطبي الإلكتروني وتاريخ الزيارات',
      'حجز وتأكيد المواعيد لدى الأطباء والمراكز',
      'استعراض نتائج المختبر وصور الأشعة والسونار',
      'محرك البحث عن الصيدليات وتوفر الأدوية'
    ],
    plannedModulesEn: [
      'Personal Electronic Health Records & History',
      'Real-Time Appointment Scheduling & Reminders',
      'Direct Access to Lab Results & Ultrasound Scans',
      'Local Pharmacy Finder & Medication Locator'
    ]
  },
  {
    id: 'super_admin',
    role: 'super_admin',
    order: 6,
    titleAr: 'بوابة المشرف العام',
    titleEn: 'Super Admin Portal',
    subtitleAr: 'إدارة المستخدمين والاشتراكات',
    subtitleEn: 'User governance, licensing & subscription management',
    descAr: 'مركز القيادة والرقابة التنظيمية للمنصة، تدقيق تراخيص الكوادر الطبية والمراكز الصحية، وإدارة مستويات الصلاحيات والأمان وفق المعايير المعتمدة.',
    descEn: 'Central administrative governance hub: verifying healthcare provider credentials, managing licensing tiers, security audits, and system parameters.',
    accentColor: '#7c3aed', // Purple / Violet
    bgLight: 'bg-purple-50 text-purple-600',
    borderColor: 'border-purple-200 hover:border-purple-400',
    iconName: 'super_admin',
    plannedModulesAr: [
      'تدقيق وتفعيل حسابات الأطباء والمراكز الصحية',
      'إدارة باقات الاشتراك والامتيازات المؤسسية',
      'مراقبة سلامة وسرعة تدفق البيانات الطبية',
      'سجلات التدقيق الأمني ومطابقة الخصوصية'
    ],
    plannedModulesEn: [
      'Provider Credential Verification & Approval',
      'Subscription Tier & Licensing Governance',
      'Platform Health & Aviation-Grade Reliability Telemetry',
      'Security Audit Trails & Data Privacy Compliance'
    ]
  },
  {
    id: 'secretary',
    role: 'secretary',
    order: 7,
    titleAr: 'بوابة السكرتير',
    titleEn: 'Secretary Portal',
    subtitleAr: 'الربط بين المراكز وإدارة الصلاحيات',
    subtitleEn: 'Reception triage, inter-center links & schedule coordination',
    descAr: 'تنظيم قاعة الانتظار، استقبال وتأكيد وصول المراجعين، تنسيق جداول الأطباء، وتسهيل التواصل بين العيادة والمختبرات والصيدليات المحيطة.',
    descEn: 'Front-desk reception and clinical workflow coordinator: manages patient check-ins, organizes waiting queues, and coordinates schedules across clinical centers.',
    accentColor: '#2563eb', // Indigo / Blue
    bgLight: 'bg-blue-50 text-blue-600',
    borderColor: 'border-blue-200 hover:border-blue-400',
    iconName: 'secretary',
    plannedModulesAr: [
      'إدارة طابور الانتظار وتأكيد وصول المرضى',
      'جدولة المواعيد الهاتفية والطارئة',
      'تنسيق التحويلات بين العيادة والمراكز المجاورة',
      'إدارة سجل المدفوعات والوصولات الأولية'
    ],
    plannedModulesEn: [
      'Patient Reception Queue & Check-in Desk',
      'Phone & Walk-in Appointment Scheduling',
      'Inter-facility Coordination & Referrals',
      'Clinic Receipts & Billing Reconciliation'
    ]
  }
];
