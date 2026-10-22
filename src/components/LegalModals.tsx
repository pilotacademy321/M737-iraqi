import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, type, onClose }) => {
  const { t, language } = useLanguage();

  if (!isOpen || !type) return null;

  const isPrivacy = type === 'privacy';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 text-start">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#003366] flex items-center justify-center shrink-0">
              {isPrivacy ? <ShieldAlert size={22} /> : <FileText size={22} />}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {isPrivacy ? t.legal.privacyTitle : t.legal.termsTitle}
              </h3>
              <span className="text-xs text-slate-500">
                {language === 'ar' ? 'مسودة أولية - المرحلة 1' : 'Preliminary Draft - Stage 1'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Disclaimer Banner Required by Instructions */}
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
          <strong>{language === 'ar' ? 'إشعار توضيحي:' : 'Notice:'}</strong> {t.legal.placeholderDisclaimer}
        </div>

        {/* Modal Body Content */}
        <div className="mt-5 space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {isPrivacy ? (
            <>
              <p>
                {language === 'ar'
                  ? 'تلتزم منصة M737 الطبية بحماية خصوصية المرضى والكوادر الطبية والمراكز الصحية في العراق وفق أرقى المعايير التقنية والأخلاقية.'
                  : 'M737 Medical Platform is committed to safeguarding patient, clinician, and medical facility confidentiality in accordance with strict ethical and technological benchmarks.'}
              </p>
              <h4 className="font-bold text-slate-800 text-sm mt-3">
                {language === 'ar' ? '١. جمع البيانات وسريتها' : '1. Data Collection & Confidentiality'}
              </h4>
              <p>
                {language === 'ar'
                  ? 'يتم تخزين السجلات الطبية وتقارير الفحوصات وصور الأشعة بتشفير سحابي لا يمكن الاطلاع عليه إلا من قبل الطبيب المعالج المصرح له أو المريض صاحب الملف.'
                  : 'Medical records, pathology test sheets, and radiological imaging are protected with access-restricted encryption protocols.'}
              </p>
              <h4 className="font-bold text-slate-800 text-sm mt-3">
                {language === 'ar' ? '٢. عدم مشاركة البيانات مع جهات تجارية' : '2. No Commercial Data Sharing'}
              </h4>
              <p>
                {language === 'ar'
                  ? 'لا يتم بيع أو مشاركة أي بيانات صحية أو تفاصيل تواصل شخصية لأغراض إعلانية خارجية.'
                  : 'No personal health data or contact telemetry is sold or shared for external commercial advertising.'}
              </p>
            </>
          ) : (
            <>
              <p>
                {language === 'ar'
                  ? 'تحكم هذه الشروط استخدام منصة M737 الطبية وبواباتها السبع المستقلة المخصصة للرعاية الصحية في العراق.'
                  : 'These terms govern the access and authorized utilization of M737 Medical Platform and its seven dedicated gateways.'}
              </p>
              <h4 className="font-bold text-slate-800 text-sm mt-3">
                {language === 'ar' ? '١. الاعتماد والترخيص الطبي' : '1. Medical Licensing & Accreditation'}
              </h4>
              <p>
                {language === 'ar'
                  ? 'يتطلب استخدام بوابات الأطباء والمختبرات والأشعة والصيدليات توفر ترخيص ممارسة مهنة ساري المفعول داخل جمهورية العراق.'
                  : 'Professional portals require valid practice credentials and certification within the Republic of Iraq.'}
              </p>
              <h4 className="font-bold text-slate-800 text-sm mt-3">
                {language === 'ar' ? '٢. استقلالية البوابات والمسؤولية الطبية' : '2. Clinical Responsibility'}
              </h4>
              <p>
                {language === 'ar'
                  ? 'تعد القرارات التشخيصية والعلاجية وصرف الدواء مسؤولية مباشرة للكوادر الطبية المعنية وفق أخلاقيات المهنة.'
                  : 'Diagnostic decisions, prescription issuing, and medication dispensing remain the direct responsibility of licensed healthcare practitioners.'}
              </p>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#003366] hover:bg-[#002244] transition-colors"
          >
            {t.legal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
