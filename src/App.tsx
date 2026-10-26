/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload,
  Search,
  Copy,
  Check,
  Download,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  FileCode,
  Cpu,
  Wrench,
  BookOpen,
  History,
  SlidersHorizontal,
  ArrowUpRight,
  Globe,
  Headphones,
  RefreshCw,
  Send,
  Loader2,
  Lock,
  FileJson,
  Eye,
  FileText,
  Terminal,
  Clock,
} from 'lucide-react';
import {
  IPHONE_ERROR_CODES,
  SENSOR_DICTIONARY,
  analyzeIphoneLog,
  type LogAnalysisResult,
  type IphoneErrorCodeItem,
} from './data/iphoneDiagnostics';
import { exportTechnicianWorksheetPdf } from './utils/pdfExporter';
import { DiodeModeChart } from './components/DiodeModeChart';
import { motion, AnimatePresence } from 'motion/react';

type ActiveSection = 'analyzer' | 'codes' | 'sensors' | 'support' | 'history' | 'admin';
type LineFilterMode = 'all' | 'critical' | 'warning' | 'info';
type Language = 'ar' | 'en';

interface ClientStructuredAiDiagnosis {
  headline: string;
  headlineEn?: string;
  rootCauseAnalysis: string;
  rootCauseAnalysisEn?: string;
  suspectedComponents: {
    partName: string;
    probability: string;
    reason: string;
  }[];
  boardRailsToMeasure: {
    rail: string;
    expectedReading: string;
    testInstruction: string;
  }[];
  stepByStepRepairPlan: string[];
  stepByStepRepairPlanEn?: string[];
  riskWarning: string;
  riskWarningEn?: string;
}

interface StoredOperationItem {
  id: string;
  timestamp: string;
  fileName: string;
  deviceMarketingName: string;
  deviceIdentifier: string;
  osVersion: string;
  bugTypeLabel: string;
  missingSensors: string[];
  matchedFaults: string[];
  diagnosis: ClientStructuredAiDiagnosis;
  rawLogExcerpt: string;
}

interface AdminOverviewData {
  stats: {
    totalAnalyzedLogs: number;
    totalApiCalls: number;
    criticalPanicsDetected: number;
    autoFailoverSwitches: number;
  };
  models: {
    id: string;
    apiModelId: string;
    name: string;
    provider: string;
    badge: string;
    priority: number;
    status: 'active' | 'exhausted';
    requestsHandled: number;
    failoverCount: number;
  }[];
  currentPrimaryModelId: string;
  operations: StoredOperationItem[];
  tickets: {
    id: string;
    name: string;
    contact: string;
    deviceModel: string;
    message: string;
    createdAt: string;
    status: 'open' | 'resolved';
  }[];
}

const UI_TEXT = {
  ar: {
    navAnalyzer: 'محلل السجلات',
    navCodes: 'الأخطاء الشائعة',
    navSensors: 'خريطة الحساسات',
    navSupport: 'الدعم الفني',
    navHistory: 'سجل الفحوصات',
    uploadBtn: 'رفع ملف سجل (.ips)',
    heroMeta1: 'مختبر تشخيص أعطال أجهزة Apple iPhone',
    heroMeta2: 'دعم ملفات panic-full و ResetCounter وأكواد الريستور',
    heroTitle: 'تحليل فوري لملفات أخطاء الآيفون وتشخيص المسارات والحساسات المفقودة',
    heroSubtitle:
      'ارفع ملف السجل .ips أو الصق نص panicString لتحديد الحساس التالف أو المسار المقطوع على البورد مع قيم الممانعة وخطوات الإصلاح المباشرة.',
    analyzeBtn: 'تحليل السجل وتشخيص العطل',
    analyzingWaitTitle: 'يرجى الانتظار جاري تحليل الملف',
    analyzingWaitSub: 'يتم الآن فحص بنية السجل ومطابقة مسارات البورد والحساسات...',
    sampleBtn: 'تحميل سجل عطل تجريبي',
    clearBtn: 'مسح السجل وإعادة الضبط',
    langToggle: 'English',
    presetsTitle: 'نماذج سجلات أعطال حقيقية للفحص السريع:',
    inputPanelTitle: '01. إدخال ملف الخطأ أو السجل النصي',
    dropzoneMain: 'اسحب وأفلت ملف .ips أو panic-full هنا',
    dropzoneSub: 'أو اضغط لاختيار ملف من جهازك · يدعم أيضاً لصق كود الخطأ مثل 4013 أو 4014',
    rawLabel: 'محتوى السجل الخام (JSON / Panic Dump):',
    lineUnit: 'سطر',
    startAnalyzeBtn: 'تحليل الملف الآن',
    warningsFilterBtn: 'فحص التحذيرات',
    criticalFilterBtn: 'عزل الأخطاء الحرجة',
    reportPanelTitle: '02. التقرير الهندسي وتشخيص العطل',
    inspectedAt: 'التاريخ والوقت المحلي:',
    incidentId: 'معرّف الحادثة:',
    exportTxt: 'تصدير التقرير (TXT)',
    deviceModel: 'موديل الجهاز',
    boardAndSoc: 'رقم البورد والمعالج',
    osVersion: 'إصدار النظام',
    severityLevel: 'مستوى الخطورة',
    criticalHardware: 'عطل هاردوير حرج',
    warningPath: 'تحذير مسار / طاقة',
    normalLog: 'سجل نظام اعتيادي',
    matchedCount: 'تشخيص مطابق',
    missingSensorsHeader: 'الحساسات المفقودة المرصودة في السجل (Missing Sensors):',
    sensorCode: 'كود الحساس',
    sensorName: 'اسم الحساس والوظيفة',
    sensorLocation: 'الموقع على الجهاز',
    sensorRail: 'مسار الفحص والتغذية',
    diagnosisNum: 'تشخيص رقم',
    confidenceLabel: 'التطابق:',
    lineNumLabel: 'السطر',
    rebootPattern: 'النمط الزمني للعطل:',
    rootCausesTitle: 'الأسباب الهندسية المحتملة:',
    repairStepsTitle: 'خطوات الفحص والإصلاح العملية:',
    testPointsTitle: 'مسارات الفحص والممانعة القياسية على المخطط (Board Test Points):',
    railNameCol: 'اسم المسار (Rail Name)',
    expectedValCol: 'القيمة / الممانعة المتوقعة',
    refCol: 'الرمز على المخطط',
    funcCol: 'الوظيفة',
    copyCol: 'نسخ',
    copied: 'تم',
    copy: 'نسخ',
    deepAiHeader: 'الخلاصة التشخيصية المتقدمة وتوصيات الصيانة:',
    riskNotice: 'تنبيه فني أثناء الصيانة:',
    inspectorTitle: '03. فاحص أسطر السجل التفصيلي (Line-by-Line Crash Inspector)',
    inspectorSub:
      'يتم تلوين وتمييز الأسطر التي تحتوي على استثناءات النواة أو الحساسات المفقودة أو مسارات I2C تلقائياً.',
    showAllLines: 'عرض كل الأسطر',
    pathWarnings: 'تحذيرات المسارات',
    criticalOnly: 'الأخطاء الحرجة فقط',
    searchLogPlaceholder: 'ابحث داخل أسطر السجل (مثال: prs0 أو thermalmonitord أو i2c0 أو nvme)...',
    supportTitle: 'مركز الدعم الفني والتواصل مع المطور',
    supportSubtitle:
      'تواصل مباشرة مع مطور المنصة للاستفسارات الفنية أو أرسل تذكرة دعم لفحص سجلات الأعطال المعقدة.',
    devInstagram: 'حساب انستغرام المطور',
    devFacebook: 'حساب فيسبوك المطور',
    sendTicketTitle: 'إرسال طلب دعم فني مباشر',
    yourName: 'الاسم الكامل أو اسم المركز',
    yourContact: 'وسيلة التواصل (واتساب / تيليجرام / انستغرام)',
    iphoneModelField: 'موديل الآيفون ورقم الخطأ',
    problemDetailsField: 'تفاصيل العطل أو نص السجل',
    submitTicketBtn: 'إرسال تذكرة الدعم الفني',
    emptyReportTitle: 'جاهز لتحليل ملف العطل',
    emptyReportSub:
      'ارفع ملف .ips أو الصق نص السجل في المربع الجانبي ثم اضغط على زر «تحليل الملف الآن» لبدء الفحص وإظهار التقرير الفني.',
    commonErrorsQuickTitle: 'الأخطاء الشائعة في أجهزة الآيفون (فحص سريع):',
  },
  en: {
    navAnalyzer: 'Log Analyzer',
    navCodes: 'Common Errors',
    navSensors: 'Sensor Map',
    navSupport: 'Tech Support',
    navHistory: 'History',
    uploadBtn: 'Upload Log (.ips)',
    heroMeta1: 'Apple iPhone Hardware & Panic Diagnostic Lab',
    heroMeta2: 'Supports panic-full, ResetCounter & Restore Errors',
    heroTitle: 'Instant iPhone Crash Log Analysis & Missing Sensor Pinpointing',
    heroSubtitle:
      'Upload your .ips crash file or paste the panicString to identify faulty sensors, broken board rails, diode mode readings, and step-by-step repair instructions.',
    analyzeBtn: 'Analyze Log & Diagnose',
    analyzingWaitTitle: 'يرجى الانتظار جاري تحليل الملف · Please wait, analyzing file',
    analyzingWaitSub: 'Inspecting kernel panic dump, matching board rails and sensor check-ins...',
    sampleBtn: 'Load Sample Panic Log',
    clearBtn: 'Clear & Reset',
    langToggle: 'العربية',
    presetsTitle: 'Real iPhone Crash Log Presets for Quick Testing:',
    inputPanelTitle: '01. Crash File Upload or Raw Log Input',
    dropzoneMain: 'Drag & drop .ips or panic-full file here',
    dropzoneSub: 'Or click to browse · Also supports pasting Error Codes like 4013 or 4014',
    rawLabel: 'Raw Crash Log Content (JSON / Panic Dump):',
    lineUnit: 'lines',
    startAnalyzeBtn: 'Analyze File Now',
    warningsFilterBtn: 'Inspect Warnings',
    criticalFilterBtn: 'Isolate Critical Errors',
    reportPanelTitle: '02. Engineering Diagnostic Report',
    inspectedAt: 'Local Date & Time:',
    incidentId: 'Incident ID:',
    exportTxt: 'Export Report (TXT)',
    deviceModel: 'Device Model',
    boardAndSoc: 'Board & SoC',
    osVersion: 'iOS Version',
    severityLevel: 'Severity Level',
    criticalHardware: 'Critical Hardware Fault',
    warningPath: 'Bus / Power Warning',
    normalLog: 'Standard System Log',
    matchedCount: 'matched faults',
    missingSensorsHeader: 'Detected Missing Sensors in Log:',
    sensorCode: 'Sensor Code',
    sensorName: 'Sensor Name & Function',
    sensorLocation: 'Hardware Location',
    sensorRail: 'Board Rail & Supply',
    diagnosisNum: 'Diagnosis #',
    confidenceLabel: 'Confidence:',
    lineNumLabel: 'Line',
    rebootPattern: 'Reboot Timing Pattern:',
    rootCausesTitle: 'Probable Engineering Root Causes:',
    repairStepsTitle: 'Step-by-Step Repair Procedure:',
    testPointsTitle: 'Schematic Board Test Points & Diode Readings:',
    railNameCol: 'Rail Name',
    expectedValCol: 'Expected Value / Diode',
    refCol: 'Schematic Ref',
    funcCol: 'Description',
    copyCol: 'Copy',
    copied: 'Copied',
    copy: 'Copy',
    deepAiHeader: 'Advanced Engineering Summary & Repair Recommendations:',
    riskNotice: 'Technician Precaution:',
    inspectorTitle: '03. Line-by-Line Crash Log Inspector',
    inspectorSub:
      'Lines containing kernel panics, missing sensors, or I2C bus timeouts are automatically highlighted.',
    showAllLines: 'Show All Lines',
    pathWarnings: 'Bus Warnings',
    criticalOnly: 'Critical Errors Only',
    searchLogPlaceholder: 'Search inside log lines (e.g. prs0, thermalmonitord, i2c0, nvme)...',
    supportTitle: 'Technical Support & Developer Contact',
    supportSubtitle:
      'Connect directly with the platform developer or submit a technical support ticket for complex board diagnostics.',
    devInstagram: 'Developer Instagram',
    devFacebook: 'Developer Facebook',
    sendTicketTitle: 'Submit Technical Support Ticket',
    yourName: 'Your Name or Repair Shop Name',
    yourContact: 'Contact Info (Instagram / WhatsApp / Email)',
    iphoneModelField: 'iPhone Model & Error Code',
    problemDetailsField: 'Fault Description or Panic Snippet',
    submitTicketBtn: 'Submit Support Ticket',
    emptyReportTitle: 'Ready to Analyze Crash File',
    emptyReportSub:
      'Upload a .ips file or paste the crash dump in the input box and click "Analyze File Now" to generate the diagnostic report.',
    commonErrorsQuickTitle: 'Common iPhone Errors (Quick Inspection):',
  },
};

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const t = UI_TEXT[lang];

  // Zero initial operations on startup — only Common Errors remain pre-loaded
  const [rawInput, setRawInput] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('panic-full.ips');
  const [analysisResult, setAnalysisResult] = useState<LogAnalysisResult | null>(null);
  const [historyList, setHistoryList] = useState<LogAnalysisResult[]>([]);

  const [activeSection, setActiveSection] = useState<ActiveSection>('analyzer');
  const [lineFilter, setLineFilter] = useState<LineFilterMode>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [errorSearchQuery, setErrorSearchQuery] = useState<string>('');
  const [errorCategoryFilter, setErrorCategoryFilter] = useState<string>('الكل');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Boot loading screen on initial load and refresh (3s with smooth fade-out)
  const [isBootLoading, setIsBootLoading] = useState<boolean>(true);
  const [isBootFadingOut, setIsBootFadingOut] = useState<boolean>(false);

  // Loading state + live terminal logs while the API analyzes the uploaded file
  const [isAnalyzingFile, setIsAnalyzingFile] = useState<boolean>(false);
  const [isAnalysisFadingOut, setIsAnalysisFadingOut] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<ClientStructuredAiDiagnosis | null>(null);

  // Secret 6-Click + Password Modal (maya@#5Y)
  const [titleClickCount, setTitleClickCount] = useState<number>(0);
  const titleClickTimerRef = useRef<number | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [adminSessionPass, setAdminSessionPass] = useState<string>('');
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);
  const [adminData, setAdminData] = useState<AdminOverviewData | null>(null);
  const [selectedJsonOp, setSelectedJsonOp] = useState<StoredOperationItem | null>(null);

  // Support Ticket Form State
  const [ticketName, setTicketName] = useState<string>('');
  const [ticketContact, setTicketContact] = useState<string>('');
  const [ticketModel, setTicketModel] = useState<string>('');
  const [ticketMessage, setTicketMessage] = useState<string>('');
  const [ticketSubmitting, setTicketSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setIsBootFadingOut(true);
    }, 2550);
    const doneTimer = window.setTimeout(() => {
      setIsBootLoading(false);
      setIsBootFadingOut(false);
    }, 3050);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const triggerNotice = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const fetchAdminOverview = async (passKey = adminSessionPass) => {
    if (!passKey) return;
    try {
      const res = await fetch('/api/v1/admin/overview', {
        headers: { 'x-admin-password': passKey },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminData(data);
      }
    } catch {
      // Ignore
    }
  };

  // Secret 6 consecutive clicks on "iPanic Lab" brand title -> opens password prompt
  const handleBrandTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (titleClickTimerRef.current) {
      window.clearTimeout(titleClickTimerRef.current);
    }

    const nextCount = titleClickCount + 1;
    if (nextCount >= 6) {
      setTitleClickCount(0);
      if (adminUnlocked && adminSessionPass) {
        setActiveSection('admin');
        fetchAdminOverview(adminSessionPass);
      } else {
        setAdminPasswordInput('');
        setAdminPasswordError(null);
        setShowPasswordPrompt(true);
      }
      return;
    }

    setTitleClickCount(nextCount);
    if (nextCount === 1 && activeSection !== 'analyzer') {
      setActiveSection('analyzer');
    }

    titleClickTimerRef.current = window.setTimeout(() => {
      setTitleClickCount(0);
    }, 2200);
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError(null);
    try {
      const res = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput }),
      });

      if (!res.ok) {
        setAdminPasswordError('كلمة المرور غير صحيحة.');
        return;
      }

      const pass = adminPasswordInput;
      setAdminSessionPass(pass);
      setAdminUnlocked(true);
      setShowPasswordPrompt(false);
      setAdminPasswordInput('');
      setActiveSection('admin');
      await fetchAdminOverview(pass);
    } catch {
      setAdminPasswordError('تعذر التحقق من كلمة المرور.');
    }
  };

  // Run Analysis with blurred loading screen, live terminal log stream, and smooth fade-out
  const handleRunAnalysis = async (
    textToAnalyze = rawInput,
    fileLabel = currentFileName
  ) => {
    if (!textToAnalyze.trim()) {
      triggerNotice(
        lang === 'ar'
          ? 'يرجى لصق نص السجل أو رفع ملف .ips أولاً قبل بدء التحليل.'
          : 'Please paste a crash log or upload a .ips file first.'
      );
      return;
    }

    setIsAnalysisFadingOut(false);
    setIsAnalyzingFile(true);
    setActiveSection('analyzer');

    const localParsed = analyzeIphoneLog(textToAnalyze, fileLabel);

    const stagedTerminalSteps =
      lang === 'ar'
        ? [
            `[00:00.12] $ ipanic-analyzer --inspect "${fileLabel}"`,
            `[00:00.55] > قراءة بنية السجل واستخراج معرف الجهاز: ${localParsed.deviceMarketingName} (${localParsed.deviceIdentifier}) — ${localParsed.osVersion}`,
            `[00:01.10] > فحص نواة النظام (Kernel Panic String) وتتبع المهام المتوقفة (Bug Type ${localParsed.bugType})...`,
            `[00:01.65] > فحص خدمة المراقبة الحرارية (thermalmonitord) ومسارات الاتصال التسلسلي (I2C / SPMI / PCIe)...`,
            `[00:02.20] > مطابقة الحساسات المفقودة (${
              localParsed.missingSensors.map((s) => s.code).join(', ') || 'فحص مسارات البورد'
            }) وحساب قيم الممانعة (Diode Mode)...`,
            `[00:02.75] > بناء التقرير الهندسي المفصل وخطة الإصلاح خطوة بخطوة...`,
          ]
        : [
            `[00:00.12] $ ipanic-analyzer --inspect "${fileLabel}"`,
            `[00:00.55] > Parsing crash header: ${localParsed.deviceMarketingName} (${localParsed.deviceIdentifier}) — ${localParsed.osVersion}`,
            `[00:01.10] > Inspecting Kernel Panic String & backtrace (Bug Type ${localParsed.bugType})...`,
            `[00:01.65] > Checking thermalmonitord sensor telemetry & I2C/SPMI/PCIe bus lines...`,
            `[00:02.20] > Mapping missing sensors (${
              localParsed.missingSensors.map((s) => s.code).join(', ') || 'board rails'
            }) & reference diode mode readings...`,
            `[00:02.75] > Generating detailed engineering diagnosis & step-by-step repair worksheet...`,
          ];

    setTerminalLogs([stagedTerminalSteps[0]]);
    const stepTimers: number[] = [];
    stagedTerminalSteps.slice(1).forEach((lineText, idx) => {
      const tId = window.setTimeout(() => {
        setTerminalLogs((prev) => [...prev, lineText]);
      }, (idx + 1) * 520);
      stepTimers.push(tId);
    });

    const minWaitPromise = new Promise((resolve) => setTimeout(resolve, 3100));

    try {
      const apiPromise = fetch('/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawLog: textToAnalyze,
          fileName: fileLabel,
          deviceMarketingName: localParsed.deviceMarketingName,
          deviceIdentifier: localParsed.deviceIdentifier,
          osVersion: localParsed.osVersion,
          bugTypeLabel: localParsed.bugTypeLabel,
          missingSensors: localParsed.missingSensors.map((s) => s.code),
          matchedFaults: localParsed.matchedFaults.map((f) => f.title),
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const [apiData] = await Promise.all([apiPromise, minWaitPromise]);

      setTerminalLogs((prev) => [
        ...prev,
        lang === 'ar'
          ? '[00:03.10] ✓ اكتمل تحليل الملف وتحديد الأعطال بنجاح — جاري عرض التقرير المفصل...'
          : '[00:03.10] ✓ Analysis complete — rendering detailed diagnostic report...',
      ]);

      setAnalysisResult(localParsed);
      setLineFilter('all');
      if (apiData?.diagnosis) {
        setAiDiagnosis(apiData.diagnosis);
      }

      setHistoryList((prev) => {
        const filtered = prev.filter(
          (item) =>
            item.fileName !== localParsed.fileName ||
            item.panicString !== localParsed.panicString
        );
        return [localParsed, ...filtered].slice(0, 15);
      });

      if (adminUnlocked && adminSessionPass) {
        fetchAdminOverview(adminSessionPass);
      }

      // Smooth fade-out of the loading screen
      setIsAnalysisFadingOut(true);
      await new Promise((resolve) => setTimeout(resolve, 450));

      triggerNotice(
        lang === 'ar'
          ? `تم تحليل الملف بنجاح: ${localParsed.deviceMarketingName}`
          : `File analyzed successfully: ${localParsed.deviceMarketingName}`
      );
    } finally {
      stepTimers.forEach((id) => window.clearTimeout(id));
      setIsAnalyzingFile(false);
      setIsAnalysisFadingOut(false);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setRawInput(content);
      setCurrentFileName(file.name);
      handleRunAnalysis(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleClearWorkbench = () => {
    setRawInput('');
    setCurrentFileName('panic-full.ips');
    setAnalysisResult(null);
    setLineFilter('all');
    setLogSearchQuery('');
    setAiDiagnosis(null);
    triggerNotice(
      lang === 'ar'
        ? 'تم تفريغ محرر السجلات وإعادة الضبط.'
        : 'Log editor cleared and reset.'
    );
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handleDownloadJsonFile = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    if (!analysisResult) return;
    const deepSection = aiDiagnosis
      ? [
          '----------------------------------------------------',
          'الخلاصة الهندسية المتقدمة:',
          `العنوان: ${aiDiagnosis.headline}`,
          `السبب الجذري: ${aiDiagnosis.rootCauseAnalysis}`,
          'خطة الإصلاح المعتمدة:',
          ...aiDiagnosis.stepByStepRepairPlan.map((s, idx) => `  ${idx + 1}. ${s}`),
          `تحذير الصيانة: ${aiDiagnosis.riskWarning}`,
        ]
      : [];

    const reportLines = [
      '====================================================',
      'تقرير تشخيص أعطال الآيفون — منصة iPanic Lab',
      'Developer Instagram: @yaz.salaq2 | Facebook: yazsalaq',
      '====================================================',
      `اسم الملف: ${analysisResult.fileName}`,
      `معرّف الحادثة: ${analysisResult.incidentId} | التاريخ والوقت المحلي للفحص: ${analysisResult.analyzedAt}`,
      `الجهاز: ${analysisResult.deviceMarketingName} (${analysisResult.deviceIdentifier})`,
      `رقم البورد: ${analysisResult.boardNumber} | المعالج: ${analysisResult.socName}`,
      `إصدار النظام: ${analysisResult.osVersion}`,
      `نوع الخطأ: ${analysisResult.bugTypeLabel}`,
      `تاريخ الحادثة: ${analysisResult.crashTimestamp}`,
      '----------------------------------------------------',
      'الأعطال المكتشفة:',
      ...analysisResult.matchedFaults.map(
        (f, i) =>
          `${i + 1}. ${f.title} (نسبة التطابق ${f.confidence}%)\n   - الدائرة: ${f.subsystem}\n   - الملخص: ${f.summary}\n   - خطوات الإصلاح: ${f.repairSteps.join(' | ')}`
      ),
      '----------------------------------------------------',
      'الحساسات المفقودة:',
      analysisResult.missingSensors.length > 0
        ? analysisResult.missingSensors
            .map((s) => `- ${s.code}: ${s.nameAr} (${s.locationAr}) | المسار: ${s.rail}`)
            .join('\n')
        : 'لا توجد حساسات مفقودة مسجلة.',
      ...deepSection,
      '====================================================',
    ].join('\n');

    const blob = new Blob([reportLines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iPanic-Report-${analysisResult.deviceIdentifier || 'iPhone'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotice(
      lang === 'ar' ? 'تم تحميل التقرير الفني بصيغة TXT.' : 'Technical report downloaded (TXT).'
    );
  };

  const handleExportPdfReport = async () => {
    if (!analysisResult || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportTechnicianWorksheetPdf(analysisResult, aiDiagnosis, lang);
      triggerNotice(
        lang === 'ar'
          ? 'تم تصدير ورقة عمل الصيانة الهندسية بصيغة PDF بنجاح.'
          : 'Technician diagnostic worksheet exported as PDF.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleInspectErrorCodeInWorkbench = (errItem: IphoneErrorCodeItem) => {
    const syntheticLog = `Error ${errItem.code}\nStage: ${errItem.stage}\nSymptoms: ${errItem.symptoms}\nRails: ${errItem.boardRails.join(', ')}`;
    setRawInput(syntheticLog);
    setCurrentFileName(`Restore-Error-${errItem.code}.log`);
    handleRunAnalysis(syntheticLog, `Restore-Error-${errItem.code}.log`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName.trim() || !ticketMessage.trim()) {
      triggerNotice(
        lang === 'ar'
          ? 'يرجى إدخال الاسم وتفاصيل العطل لإرسال التذكرة.'
          : 'Please enter your name and fault details.'
      );
      return;
    }

    setTicketSubmitting(true);
    try {
      const res = await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ticketName,
          contact: ticketContact,
          deviceModel: ticketModel,
          message: ticketMessage,
        }),
      });
      if (res.ok) {
        setTicketName('');
        setTicketContact('');
        setTicketModel('');
        setTicketMessage('');
        triggerNotice(
          lang === 'ar'
            ? 'تم إرسال طلب الدعم الفني بنجاح، سيتم مراجعته من قبل المطور.'
            : 'Support ticket submitted successfully!'
        );
      }
    } finally {
      setTicketSubmitting(false);
    }
  };

  const filteredLogLines = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.parsedLines.filter((line) => {
      if (lineFilter === 'critical' && line.severity !== 'critical') return false;
      if (lineFilter === 'warning' && line.severity !== 'warning') return false;
      if (lineFilter === 'info' && line.severity !== 'info') return false;
      if (logSearchQuery.trim()) {
        return line.content.toLowerCase().includes(logSearchQuery.trim().toLowerCase());
      }
      return true;
    });
  }, [analysisResult, lineFilter, logSearchQuery]);

  const filteredErrorCodes = useMemo(() => {
    return IPHONE_ERROR_CODES.filter((item) => {
      const matchesCategory =
        errorCategoryFilter === 'الكل' || item.category === errorCategoryFilter;
      const q = errorSearchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.cause.toLowerCase().includes(q) ||
        item.boardRails.some((r) => r.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [errorSearchQuery, errorCategoryFilter]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Initial & Refresh 3-Second Blurred Loading Screen with Smooth Fade-Out */}
      {isBootLoading && (
        <div
          className={`fixed inset-0 z-50 bg-white/55 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none transition-opacity duration-500 ${
            isBootFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            {/* دائرة التحميل فوق خط التحميل مباشرة */}
            <div className="relative flex items-center justify-center w-12 h-12 mb-5">
              <div className="spinner">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
            {/* خط التحميل */}
            <div className="loader"></div>
          </div>
          <p className="mt-5 text-base font-bold text-slate-950 tracking-tight">
            iPanic Lab
          </p>
        </div>
      )}

      {/* Full-screen Blurred Loading Overlay + Live Terminal Box during File Analysis */}
      {isAnalyzingFile && (
        <div
          className={`fixed inset-0 z-50 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none transition-opacity duration-500 ${
            isAnalysisFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            {/* دائرة التحميل فوق خط التحميل مباشرة */}
            <div className="relative flex items-center justify-center w-12 h-12 mb-5">
              <div className="spinner">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
            {/* خط التحميل */}
            <div className="loader"></div>
          </div>

          <div className="mt-6 space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950">
              جاري تحليل الملف وتحديد الأعطال
            </h2>
            <p className="text-sm font-bold text-slate-700">
              {lang === 'ar'
                ? 'يرجى الانتظار... يتم الآن فحص السجل واستخراج القطع المسببة للعطل'
                : t.analyzingWaitSub}
            </p>
          </div>

          {/* Live Diagnostic Terminal Box */}
          <div
            dir="ltr"
            className="mt-6 w-full max-w-2xl bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-left font-mono"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold text-slate-200">iPanic Lab Kernel Inspector Terminal</span>
              </div>
              <span className="tabular-nums text-emerald-400">{currentFileName}</span>
            </div>
            <div className="p-4 space-y-2 text-xs leading-relaxed min-h-[175px]">
              {terminalLogs.map((logLine, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex items-start gap-2"
                >
                  <span className="text-blue-400 shrink-0">❯</span>
                  <span className="text-emerald-300 break-all">{logLine}</span>
                </motion.div>
              ))}
              <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                <span className="text-blue-400">❯</span>
                <span>_</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Password Modal (Only appears after 6 consecutive clicks on iPanic Lab) */}
      <AnimatePresence>
        {showPasswordPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xl"
            >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-bold text-slate-950">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>تسجيل الدخول</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordPrompt(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  أدخل كلمة المرور للمتابعة:
                </label>
                <input
                  type="password"
                  dir="ltr"
                  autoFocus
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              {adminPasswordError && (
                <div className="text-xs font-bold text-red-600">{adminPasswordError}</div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  دخول
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordPrompt(false)}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 lg:px-12 py-4 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={handleBrandTitleClick}
          className="text-xl font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 select-none cursor-pointer"
        >
          iPanic Lab
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-slate-700">
          <button
            type="button"
            onClick={() => setActiveSection('analyzer')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeSection === 'analyzer'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            {t.navAnalyzer}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('codes')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeSection === 'codes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            {t.navCodes}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('sensors')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeSection === 'sensors'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            {t.navSensors}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('support')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeSection === 'support'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            {t.navSupport}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('history')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeSection === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            {t.navHistory} ({historyList.length})
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.uploadBtn}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ips,.panic,.log,.txt,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('analyzer')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 ${
            activeSection === 'analyzer' ? 'bg-blue-600 text-white' : 'text-slate-700'
          }`}
        >
          {t.navAnalyzer}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('codes')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 ${
            activeSection === 'codes' ? 'bg-blue-600 text-white' : 'text-slate-700'
          }`}
        >
          {t.navCodes}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('sensors')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 ${
            activeSection === 'sensors' ? 'bg-blue-600 text-white' : 'text-slate-700'
          }`}
        >
          {t.navSensors}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('support')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 ${
            activeSection === 'support' ? 'bg-blue-600 text-white' : 'text-slate-700'
          }`}
        >
          {t.navSupport}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('history')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 ${
            activeSection === 'history' ? 'bg-blue-600 text-white' : 'text-slate-700'
          }`}
        >
          {t.navHistory} ({historyList.length})
        </button>
      </div>

      {/* Main Content Container */}
      <main id="top" className="max-w-[1380px] mx-auto px-6 lg:px-12 py-8 space-y-10">
        {/* Hero & Action Bar */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="pb-8 border-b border-slate-200"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                <span>{t.heroMeta1}</span>
                <span aria-hidden="true">·</span>
                <span>{t.heroMeta2}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">iOS 12 – iOS 18+</span>
              </div>
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-950 tracking-tight leading-snug"
                style={{ textWrap: 'balance' }}
              >
                {t.heroTitle}
              </h1>
              <p className="text-base font-medium text-slate-600 leading-relaxed max-w-2xl">
                {t.heroSubtitle}
              </p>
            </div>

            {/* Primary Blue, Yellow, Red Buttons + Language Switcher */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleRunAnalysis(rawInput, currentFileName)}
                disabled={isAnalyzingFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Cpu className="w-4 h-4" />
                <span>{t.analyzeBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('codes')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-500 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{t.navCodes}</span>
              </button>

              <button
                type="button"
                onClick={handleClearWorkbench}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.clearBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>{t.langToggle}</span>
              </button>
            </div>
          </div>

          {statusNotice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-bold text-slate-800"
            >
              <span>{statusNotice}</span>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-blue-600 hover:underline whitespace-nowrap shrink-0"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </motion.div>
          )}
        </motion.section>

        {/* SECTION 1: LOG ANALYZER WORKBENCH */}
        {activeSection === 'analyzer' && (
          <motion.div
            key="section-analyzer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-10"
          >

            {/* 2-Column Split: Log Input Dropzone + Diagnostic Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Input Column (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between border border-slate-200 rounded-xl p-6 bg-white space-y-5 transition-all duration-300 hover:border-blue-200 hover:shadow-md">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-slate-950">{t.inputPanelTitle}</h2>
                    <span className="text-xs font-mono font-semibold text-slate-500 truncate max-w-[180px] tabular-nums">
                      {currentFileName}
                    </span>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
                      isDragging
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-300 hover:border-blue-600 bg-slate-50/60'
                    }`}
                  >
                    <Upload className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-sm font-bold text-slate-900">{t.dropzoneMain}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{t.dropzoneSub}</p>
                  </div>

                  {/* Raw Log Textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <label htmlFor="raw-panic-input">{t.rawLabel}</label>
                      <span className="font-mono tabular-nums text-slate-500">
                        {rawInput.split(/\r?\n/).filter(Boolean).length} {t.lineUnit}
                      </span>
                    </div>
                    <textarea
                      id="raw-panic-input"
                      dir="ltr"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder='{"bug_type":"210","os_version":"iPhone OS 17.5.1"} ... or Error 4013'
                      rows={11}
                      className="w-full p-3.5 text-xs font-mono leading-relaxed text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 resize-y"
                    />
                  </div>
                </div>

                {/* Action Buttons Footer inside Input Panel (Blue, Yellow, Red) */}
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isAnalyzingFile}
                    onClick={() => handleRunAnalysis(rawInput, currentFileName)}
                    className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.startAnalyzeBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('codes')}
                    className="px-3.5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.navCodes}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearWorkbench}
                    className="px-3.5 py-2.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.clearBtn}
                  </button>
                </div>
              </div>

              {/* Diagnostic Result Column (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between border border-slate-200 rounded-xl p-6 bg-white space-y-6 transition-all duration-300 hover:border-blue-200 hover:shadow-md">
                {isAnalyzingFile ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-5">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center w-12 h-12 mb-5">
                        <div className="spinner">
                          <div></div>
                          <div></div>
                          <div></div>
                          <div></div>
                          <div></div>
                          <div></div>
                          <div></div>
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>
                      </div>
                      <div className="loader"></div>
                    </div>
                    <div className="text-lg font-bold text-slate-950">
                      جاري تحليل الملف وتحديد الأعطال
                    </div>
                    <p className="text-xs font-medium text-slate-500 max-w-md">
                      {lang === 'ar'
                        ? 'يرجى الانتظار... يتم الآن فحص السجل واستخراج القطع المسببة للعطل'
                        : t.analyzingWaitSub}
                    </p>
                  </div>
                ) : !analysisResult ? (
                  /* Clean Zeroed State + Quick Common Errors Access */
                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                      <Cpu className="w-8 h-8 text-blue-600 mx-auto" />
                      <h3 className="text-lg font-bold text-slate-950">{t.emptyReportTitle}</h3>
                      <p className="text-xs font-medium text-slate-600 max-w-lg mx-auto leading-relaxed">
                        {t.emptyReportSub}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-950">
                          {t.commonErrorsQuickTitle}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActiveSection('codes')}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {t.navCodes} ({IPHONE_ERROR_CODES.length})
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {IPHONE_ERROR_CODES.slice(0, 4).map((err, idx) => (
                          <motion.div
                            key={err.code}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: idx * 0.06 }}
                            whileHover={{ y: -2 }}
                            className="p-3.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 transition-shadow hover:border-blue-300 hover:shadow-sm"
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-sm font-bold text-red-600 tabular-nums">
                                Error #{err.code}
                              </div>
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {err.title}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleInspectErrorCodeInWorkbench(err)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 shrink-0 cursor-pointer"
                            >
                              {lang === 'ar' ? 'فحص' : 'Inspect'}
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="space-y-6"
                  >
                    {/* Header with Severity Status & Export Button */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-bold text-slate-950">{t.reportPanelTitle}</h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-800">
                            <span>{t.incidentId}</span>
                            <span
                              dir="ltr"
                              className="font-mono font-bold text-blue-700 tabular-nums"
                            >
                              {analysisResult.incidentId.slice(0, 18)}
                            </span>
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/60 border border-blue-200 text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{t.inspectedAt}</span>
                            <span
                              dir="ltr"
                              className="font-mono font-bold text-slate-950 tabular-nums"
                            >
                              {analysisResult.analyzedAt}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleExportPdfReport}
                          disabled={isExportingPdf}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            {lang === 'ar'
                              ? 'تصدير التقرير (PDF)'
                              : 'Export Report (PDF)'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportReport}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t.exportTxt}</span>
                        </button>
                      </div>
                    </div>

                    {/* Device Telemetry Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 px-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div>
                        <div className="text-xs font-bold text-slate-500">{t.deviceModel}</div>
                        <div className="text-sm font-bold text-slate-950 mt-0.5">
                          {analysisResult.deviceMarketingName}
                        </div>
                        <div className="text-xs font-mono text-slate-500 tabular-nums">
                          {analysisResult.deviceIdentifier}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500">{t.boardAndSoc}</div>
                        <div className="text-sm font-mono font-semibold text-slate-950 mt-0.5 tabular-nums">
                          {analysisResult.boardNumber}
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                          {analysisResult.socName}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500">{t.osVersion}</div>
                        <div className="text-sm font-mono font-semibold text-slate-950 mt-0.5 tabular-nums">
                          {analysisResult.osVersion}
                        </div>
                        <div className="text-xs font-mono text-slate-500 tabular-nums">
                          Bug Type: {analysisResult.bugType}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500">{t.severityLevel}</div>
                        <div className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                          {analysisResult.overallSeverity === 'critical' && (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertOctagon className="w-4 h-4 shrink-0" />
                              <span>{t.criticalHardware}</span>
                            </span>
                          )}
                          {analysisResult.overallSeverity === 'warning' && (
                            <span className="text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>{t.warningPath}</span>
                            </span>
                          )}
                          {analysisResult.overallSeverity === 'info' && (
                            <span className="text-blue-600">{t.normalLog}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          {analysisResult.matchedFaults.length} {t.matchedCount}
                        </div>
                      </div>
                    </div>

                    {/* PRIMARY API DIAGNOSIS RESULT (Displayed Immediately at the Top) */}
                    {aiDiagnosis && (
                      <div className="p-4 sm:p-5 rounded-xl bg-blue-50/50 border-2 border-blue-600 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                            <Cpu className="w-4 h-4 shrink-0" />
                            <span>{t.deepAiHeader}</span>
                          </h3>
                          <span className="text-xs font-mono font-bold text-blue-700 tabular-nums">
                            {analysisResult.deviceMarketingName}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-2">
                          <div className="text-base font-bold text-slate-950">
                            {lang === 'en' && aiDiagnosis.headlineEn
                              ? aiDiagnosis.headlineEn
                              : aiDiagnosis.headline}
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                            {lang === 'en' && aiDiagnosis.rootCauseAnalysisEn
                              ? aiDiagnosis.rootCauseAnalysisEn
                              : aiDiagnosis.rootCauseAnalysis}
                          </p>
                        </div>

                        {/* Suspected Components from API */}
                        {aiDiagnosis.suspectedComponents?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-900">
                              {lang === 'ar'
                                ? 'القطع والأجزاء المشتبه بتلفها (حسب نتيجة التحليل):'
                                : 'Suspected Faulty Components:'}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {aiDiagnosis.suspectedComponents.map((comp, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-white border border-slate-200 space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-950">
                                      {comp.partName}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-red-600 tabular-nums">
                                      {comp.probability}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                    {comp.reason}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Step-by-Step Repair Plan from API */}
                        {aiDiagnosis.stepByStepRepairPlan?.length > 0 && (
                          <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-2">
                            <h4 className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 shrink-0" />
                              <span>{t.repairStepsTitle}</span>
                            </h4>
                            <ol className="space-y-1.5 text-xs font-medium text-slate-800 list-decimal list-inside leading-relaxed">
                              {(lang === 'en' && aiDiagnosis.stepByStepRepairPlanEn?.length
                                ? aiDiagnosis.stepByStepRepairPlanEn
                                : aiDiagnosis.stepByStepRepairPlan
                              ).map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Interactive Recharts Diode Mode Chart for API Board Rails */}
                        {aiDiagnosis.boardRailsToMeasure?.length > 0 && (
                          <DiodeModeChart
                            items={aiDiagnosis.boardRailsToMeasure}
                            lang={lang}
                            title={t.testPointsTitle}
                          />
                        )}

                        {aiDiagnosis.riskWarning && (
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-950">
                            {t.riskNotice}{' '}
                            {lang === 'en' && aiDiagnosis.riskWarningEn
                              ? aiDiagnosis.riskWarningEn
                              : aiDiagnosis.riskWarning}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Missing Sensors Alert Section */}
                    {analysisResult.missingSensors.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                            <AlertOctagon className="w-4 h-4 shrink-0" />
                            <span>{t.missingSensorsHeader}</span>
                          </h3>
                          <span className="text-xs font-bold text-slate-500 font-mono tabular-nums">
                            {analysisResult.missingSensors.length}
                          </span>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                              <tr>
                                <th className="py-2.5 px-3 text-start">{t.sensorCode}</th>
                                <th className="py-2.5 px-3 text-start">{t.sensorName}</th>
                                <th className="py-2.5 px-3 text-start">{t.sensorLocation}</th>
                                <th className="py-2.5 px-3 text-start">{t.sensorRail}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {analysisResult.missingSensors.map((sensor) => (
                                <tr key={sensor.code} className="hover:bg-slate-50/80">
                                  <td className="py-2.5 px-3 font-mono font-bold text-red-600 tabular-nums">
                                    {sensor.code}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900">
                                    {sensor.nameAr}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                                    {sensor.locationAr}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-blue-700 font-semibold tabular-nums">
                                    {sensor.rail}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Matched Hardware Faults List */}
                    <div className="space-y-5">
                      {analysisResult.matchedFaults.map((fault, index) => (
                        <div
                          key={fault.id}
                          className="pt-4 first:pt-0 border-t first:border-t-0 border-slate-200 space-y-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <span>
                                  {t.diagnosisNum} {index + 1}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{fault.subsystem}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-slate-700 tabular-nums">
                                  {t.confidenceLabel} {fault.confidence}%
                                </span>
                              </div>
                              <h3 className="text-base sm:text-lg font-bold text-slate-950">
                                {fault.title}
                              </h3>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-700 tabular-nums">
                              <span>
                                {t.lineNumLabel} #{fault.matchedLineNumber}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-red-600">{fault.matchedKeyword}</span>
                            </div>
                          </div>

                          {fault.rebootInterval && (
                            <div className="text-xs font-bold text-slate-800 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
                              {t.rebootPattern} {fault.rebootInterval}
                            </div>
                          )}

                          <p className="text-sm font-medium text-slate-700 leading-relaxed">
                            {fault.summary}
                          </p>

                          {/* Root Causes & Step-by-Step Repair Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-slate-900">
                                {t.rootCausesTitle}
                              </h4>
                              <ul className="space-y-1.5 text-xs font-medium text-slate-700 list-disc list-inside leading-relaxed">
                                {fault.rootCauses.map((cause, cIdx) => (
                                  <li key={cIdx}>{cause}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 shrink-0" />
                                <span>{t.repairStepsTitle}</span>
                              </h4>
                              <ol className="space-y-1.5 text-xs font-medium text-slate-800 list-decimal list-inside leading-relaxed">
                                {fault.repairSteps.map((step, sIdx) => (
                                  <li key={sIdx}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          </div>

                          {/* Interactive Recharts Diode Mode Chart for Fault Test Points */}
                          {fault.testPoints.length > 0 && (
                            <div className="pt-2">
                              <DiodeModeChart
                                items={fault.testPoints.map((tp) => ({
                                  rail: tp.railName,
                                  expectedReading: tp.expectedValue,
                                  componentRef: tp.componentRef,
                                  testInstruction: `${tp.componentRef} — ${tp.description}`,
                                }))}
                                lang={lang}
                                title={t.testPointsTitle}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Quick Jump Footer inside Diagnostic Card */}
                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-600">
                    {lang === 'ar'
                      ? 'هل تحتاج لمراجعة الأخطاء الشائعة أو التواصل مع الدعم الفني؟'
                      : 'Need common restore errors or direct technical support?'}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSection('codes')}
                      className="px-3.5 py-1.5 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      {t.navCodes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('support')}
                      className="px-3.5 py-1.5 font-bold text-slate-950 bg-amber-400 rounded-md hover:bg-amber-500 transition-colors cursor-pointer"
                    >
                      {t.navSupport}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Annotated Line-by-Line Log Inspector (Shown when a file is analyzed) */}
            {analysisResult && (
              <section
                id="log-inspector-section"
                className="border border-slate-200 rounded-xl p-6 bg-white space-y-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-950">{t.inspectorTitle}</h2>
                    <p className="text-xs font-medium text-slate-500">{t.inspectorSub}</p>
                  </div>

                  {/* Blue, Yellow, Red Interactive Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setLineFilter('all')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        lineFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-600/90 text-white hover:bg-blue-700'
                      }`}
                    >
                      {t.showAllLines} ({analysisResult.stats.totalLines})
                    </button>

                    <button
                      type="button"
                      onClick={() => setLineFilter('warning')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        lineFilter === 'warning'
                          ? 'bg-amber-500 text-slate-950 ring-2 ring-slate-900'
                          : 'bg-amber-400 text-slate-950 hover:bg-amber-500'
                      }`}
                    >
                      {t.pathWarnings} ({analysisResult.stats.warningCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setLineFilter('critical')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        lineFilter === 'critical'
                          ? 'bg-red-700 text-white ring-2 ring-slate-900'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {t.criticalOnly} ({analysisResult.stats.criticalCount})
                    </button>
                  </div>
                </div>

                {/* Search Bar inside Log Lines */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      placeholder={t.searchLogPlaceholder}
                      className="w-full pr-10 pl-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  {logSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLogSearchQuery('')}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {lang === 'ar' ? 'مسح البحث' : 'Clear'}
                    </button>
                  )}
                </div>

                {/* Log Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div
                    className="max-h-[420px] overflow-y-auto divide-y divide-slate-200 font-mono text-xs"
                    dir="ltr"
                  >
                    {filteredLogLines.map((line) => {
                      const rowBg =
                        line.severity === 'critical'
                          ? 'bg-red-50/90 text-red-950 font-semibold'
                          : line.severity === 'warning'
                          ? 'bg-amber-50/90 text-amber-950 font-semibold'
                          : line.severity === 'info'
                          ? 'bg-blue-50/50 text-slate-900'
                          : 'bg-white text-slate-700';

                      return (
                        <div
                          key={line.lineNumber}
                          className={`flex items-start gap-4 px-4 py-2 hover:bg-slate-100/70 transition-colors ${rowBg}`}
                        >
                          <span className="w-10 shrink-0 text-right text-slate-400 select-none tabular-nums">
                            {line.lineNumber}
                          </span>
                          <div className="flex-1 break-all whitespace-pre-wrap leading-relaxed">
                            {line.content || ' '}
                          </div>
                          {line.tag && (
                            <span
                              dir="rtl"
                              className={`shrink-0 font-sans text-[11px] font-bold px-2 py-0.5 rounded ${
                                line.severity === 'critical'
                                  ? 'text-red-700'
                                  : line.severity === 'warning'
                                  ? 'text-amber-800'
                                  : 'text-blue-700'
                              }`}
                            >
                              {line.tag}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </motion.div>
        )}

        {/* SECTION 2: COMMON IPHONE ERRORS & RESTORE CODES */}
        {activeSection === 'codes' && (
          <motion.section
            key="section-codes"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  <span>
                    {lang === 'ar'
                      ? 'الأخطاء الشائعة وأكواد الريستور في أجهزة الآيفون'
                      : 'Common iPhone Errors & Restore Error Codes'}
                  </span>
                </h2>
                <p className="text-sm font-medium text-slate-600">
                  {lang === 'ar'
                    ? 'ابحث برقم الخطأ (مثل 4013، 4014، 9، -1، 1110، 56) لمعرفة المرحلة التي يتوقف عندها الجهاز والمسار المسبب للعطل.'
                    : 'Search by error number (4013, 4014, 9, -1, 1110, 56) to identify the failure stage and faulty board rails.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setErrorCategoryFilter('الكل')}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                >
                  {lang === 'ar' ? 'جميع الأخطاء الشائعة' : 'All Common Errors'} (
                  {IPHONE_ERROR_CODES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setErrorCategoryFilter('هاردوير البورد')}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-500 cursor-pointer"
                >
                  {lang === 'ar' ? 'هاردوير البورد' : 'Board Hardware'}
                </button>
                <button
                  type="button"
                  onClick={() => setErrorCategoryFilter('الذاكرة والمعالج')}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                >
                  {lang === 'ar' ? 'الذاكرة والمعالج (NAND / CPU)' : 'NAND & CPU'}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={errorSearchQuery}
                  onChange={(e) => setErrorSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'أدخل رقم الخطأ أو اسم المسار (مثال: 4013 أو 4014 أو NAND)...'
                      : 'Enter error number or rail name (e.g. 4013, 4014, NAND)...'
                  }
                  className="w-full pr-10 pl-4 py-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredErrorCodes.map((err, idx) => (
                <motion.div
                  key={err.code}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(idx * 0.04, 0.25) }}
                  whileHover={{ y: -3 }}
                  className="border border-slate-200 rounded-xl p-6 bg-white flex flex-col justify-between space-y-5 transition-shadow duration-300 hover:border-blue-300 hover:shadow-md"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span>{err.category}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              err.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                            }
                          >
                            {err.severity === 'critical' ? 'Critical' : 'Warning'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-950 mt-1">{err.title}</h3>
                      </div>

                      <span className="font-mono text-xl font-bold text-blue-600 tabular-nums shrink-0">
                        #{err.code}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">مرحلة الظهور: </span>
                        <span className="font-medium text-slate-700">{err.stage}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">الأعراض: </span>
                        <span className="font-medium text-slate-700">{err.symptoms}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">السبب الفني: </span>
                        <span className="font-medium text-slate-700">{err.cause}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-900">خطوات الحل المعتمدة:</div>
                      <ol className="space-y-1 text-xs font-medium text-slate-700 list-decimal list-inside leading-relaxed">
                        {err.solutionSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleInspectErrorCodeInWorkbench(err)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <span>{lang === 'ar' ? 'فتح في المحلل الهندسي' : 'Inspect in Analyzer'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* SECTION 3: SENSOR REFERENCE MAP */}
        {activeSection === 'sensors' && (
          <motion.section
            key="section-sensors"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
                  <SlidersHorizontal className="w-6 h-6 text-blue-600" />
                  <span>
                    {lang === 'ar'
                      ? 'جدول أكواد حساسات الآيفون (thermalmonitord Missing Sensors)'
                      : 'iPhone thermalmonitord Missing Sensors Map'}
                  </span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection('analyzer')}
                className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.navAnalyzer}
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                  <tr>
                    <th className="py-3.5 px-4 text-start">{t.sensorCode}</th>
                    <th className="py-3.5 px-4 text-start">{t.sensorName}</th>
                    <th className="py-3.5 px-4 text-start">{t.sensorLocation}</th>
                    <th className="py-3.5 px-4 text-start">{t.sensorRail}</th>
                    <th className="py-3.5 px-4 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {Object.entries(SENSOR_DICTIONARY).map(([code, info]) => (
                    <tr key={code} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono font-bold text-red-600 text-sm tabular-nums">
                        {code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{info.nameAr}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{info.locationAr}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-700 tabular-nums">
                        {info.rail}
                      </td>
                      <td className="py-3.5 px-4 text-end">
                        <button
                          type="button"
                          onClick={() => {
                            const simLog = `{"bug_type":"210","os_version":"iPhone OS 17.5.1"}\n{"product":"iPhone15,2","panicString":"userspace watchdog timeout: no successful checkins from thermalmonitord in 180 seconds\\nMissing sensor(s): ${code}"}`;
                            setRawInput(simLog);
                            setCurrentFileName(`sensor-${code}-simulation.ips`);
                            handleRunAnalysis(simLog, `sensor-${code}-simulation.ips`);
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-500 transition-colors cursor-pointer"
                        >
                          {lang === 'ar' ? 'اختبار في المحلل' : 'Test in Analyzer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}

        {/* SECTION 4: TECHNICAL SUPPORT & DEVELOPER CONTACT PAGE */}
        {activeSection === 'support' && (
          <motion.section
            key="section-support"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
                  <Headphones className="w-6 h-6 text-blue-600" />
                  <span>{t.supportTitle}</span>
                </h2>
                <p className="text-sm font-medium text-slate-600">{t.supportSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Developer Social Profiles Column (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between border border-slate-200 rounded-xl p-6 bg-white space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-950">
                    {lang === 'ar'
                      ? 'الحسابات الرسمية لمطور المنصة'
                      : 'Official Developer Social Accounts'}
                  </h3>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    {lang === 'ar'
                      ? 'يمكنك التواصل المباشر مع المطور عبر انستغرام أو فيسبوك للاستفسارات البرمجية والفنية أو اقتراح إضافة أعطال جديدة.'
                      : 'Connect directly with the developer via Instagram or Facebook for technical inquiries or feature requests.'}
                  </p>

                  {/* Instagram Card: yaz.salaq2 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-500">{t.devInstagram}</div>
                      <div className="text-base font-mono font-bold text-slate-950 mt-0.5">
                        @yaz.salaq2
                      </div>
                    </div>
                    <a
                      href="https://instagram.com/yaz.salaq2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Instagram</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Facebook Card: yazsalaq */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-500">{t.devFacebook}</div>
                      <div className="text-base font-mono font-bold text-slate-950 mt-0.5">
                        yazsalaq
                      </div>
                    </div>
                    <a
                      href="https://facebook.com/yazsalaq"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-500 transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Facebook</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 text-xs font-bold text-slate-500">
                  <span>iPanic Lab</span>
                </div>
              </div>

              {/* Technical Support Ticket Form (7 cols) */}
              <div className="lg:col-span-7 border border-slate-200 rounded-xl p-6 bg-white">
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-950">{t.sendTicketTitle}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        {t.yourName}
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketName}
                        onChange={(e) => setTicketName(e.target.value)}
                        placeholder={lang === 'ar' ? 'مثال: مركز المهندس للصيانة' : 'Your Name'}
                        className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        {t.yourContact}
                      </label>
                      <input
                        type="text"
                        value={ticketContact}
                        onChange={(e) => setTicketContact(e.target.value)}
                        placeholder="@username / +962..."
                        className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {t.iphoneModelField}
                    </label>
                    <input
                      type="text"
                      value={ticketModel}
                      onChange={(e) => setTicketModel(e.target.value)}
                      placeholder="iPhone 14 Pro Max — prs0 / Error 4013"
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {t.problemDetailsField}
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder={
                        lang === 'ar'
                          ? 'اشرح حالة الجهاز والخطوات التي قمت بتجربتها أو الصق جزءاً من سجل الخطأ...'
                          : 'Describe the device symptoms or paste the panic string snippet...'
                      }
                      className="w-full p-3.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 resize-y"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={ticketSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {ticketSubmitting
                          ? lang === 'ar'
                            ? 'جارٍ الإرسال...'
                            : 'Sending...'
                          : t.submitTicketBtn}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTicketName('');
                        setTicketContact('');
                        setTicketModel('');
                        setTicketMessage('');
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      {lang === 'ar' ? 'تفريغ الحقول' : 'Clear Form'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.section>
        )}

        {/* SECTION 5: INSPECTION HISTORY */}
        {activeSection === 'history' && (
          <motion.section
            key="section-history"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
                  <History className="w-6 h-6 text-blue-600" />
                  <span>{t.navHistory}</span>
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSection('analyzer')}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  {t.navAnalyzer}
                </button>
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistoryList([])}
                    className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                  >
                    {lang === 'ar' ? 'تصفير السجل' : 'Clear History'}
                  </button>
                )}
              </div>
            </div>

            {historyList.length === 0 ? (
              <div className="p-10 text-center border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                <p className="text-sm font-bold text-slate-700">
                  {lang === 'ar'
                    ? 'لا توجد عمليات مفحوصة حالياً (0 عملية).'
                    : 'No analyzed operations yet (0 operations).'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('analyzer')}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  {lang === 'ar' ? 'الذهاب لمحلل السجلات' : 'Go to Analyzer'}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{t.inspectedAt}</th>
                      <th className="py-3.5 px-4 text-start">File</th>
                      <th className="py-3.5 px-4 text-start">{t.deviceModel}</th>
                      <th className="py-3.5 px-4 text-start">Fault</th>
                      <th className="py-3.5 px-4 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {historyList.map((item, idx) => (
                      <tr key={`${item.fileName}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono text-slate-600 tabular-nums">
                          {item.analyzedAt}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {item.fileName}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {item.deviceMarketingName}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-700">
                          {item.matchedFaults[0]?.title || 'General Log'}
                        </td>
                        <td className="py-3.5 px-4 text-end">
                          <button
                            type="button"
                            onClick={() => {
                              setAnalysisResult(item);
                              setCurrentFileName(item.fileName);
                              setActiveSection('analyzer');
                            }}
                            className="px-3.5 py-1.5 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            {lang === 'ar' ? 'عرض التقرير' : 'View Report'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>
        )}

        {/* SECTION 6: PROTECTED ADMIN DASHBOARD (Requires 6 clicks + maya@#5Y) */}
        {activeSection === 'admin' && adminUnlocked && (
          <motion.section
            key="section-admin"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-950">
                  لوحة تحكم الأدمن — أرشيف العمليات المحللة (JSON)
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  جميع العمليات التي نجح تحليلها يتم حفظها تلقائياً بصيغة JSON وعرضها هنا.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fetchAdminOverview(adminSessionPass)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث السجلات</span>
                </button>
                {adminData && adminData.operations.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadJsonFile(adminData.operations, 'analyzed_operations.json')
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-500 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل كل العمليات (JSON)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch('/api/v1/admin/operations/clear', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': adminSessionPass,
                      },
                    });
                    if (res.ok) {
                      setSelectedJsonOp(null);
                      setHistoryList([]);
                      fetchAdminOverview(adminSessionPass);
                      triggerNotice('تم تصفير جميع العمليات وملفات JSON بنجاح.');
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                >
                  تصفير جميع العمليات (0)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminUnlocked(false);
                    setAdminSessionPass('');
                    setActiveSection('analyzer');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                >
                  خروج من الأدمن
                </button>
              </div>
            </div>

            {/* Admin KPI Strip */}
            {adminData && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500">
                    العمليات الناجحة المخزنة (JSON)
                  </div>
                  <div className="text-2xl font-mono font-bold text-blue-600 mt-1 tabular-nums">
                    {adminData.operations.length}
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500">إجمالي طلبات التحليل</div>
                  <div className="text-2xl font-mono font-bold text-slate-950 mt-1 tabular-nums">
                    {adminData.stats.totalAnalyzedLogs}
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500">مرات التبديل التلقائي للنماذج</div>
                  <div className="text-2xl font-mono font-bold text-amber-600 mt-1 tabular-nums">
                    {adminData.stats.autoFailoverSwitches}
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500">تذاكر الدعم الفني</div>
                  <div className="text-2xl font-mono font-bold text-red-600 mt-1 tabular-nums">
                    {adminData.tickets.length}
                  </div>
                </div>
              </div>
            )}

            {/* DEDICATED SECTION: SUCCESSFULLY ANALYZED JSON OPERATIONS */}
            {adminData && (
              <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                      <FileJson className="w-5 h-5 text-blue-600" />
                      <span>
                        قسم العمليات التي نجح تحليلها بملفات JSON ({adminData.operations.length})
                      </span>
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      كل عملية تحليل ناجحة في الموقع تُحفظ تلقائياً في ملف JSON ويمكنك استعراضها أو تنزيلها مباشرة.
                    </p>
                  </div>
                </div>

                {adminData.operations.length === 0 ? (
                  <div className="p-8 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs font-bold text-slate-600">
                    لا توجد عمليات محللة مخزنة حالياً (0 عملية). عند تحليل أي ملف سيظهر ملف الـ JSON الخاص به هنا فوراً.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
                          <tr>
                            <th className="py-3 px-3 text-start">معرّف العملية</th>
                            <th className="py-3 px-3 text-start">الوقت</th>
                            <th className="py-3 px-3 text-start">اسم الملف</th>
                            <th className="py-3 px-3 text-start">الجهاز والنظام</th>
                            <th className="py-3 px-3 text-start">الحساسات / الأعطال</th>
                            <th className="py-3 px-3 text-end">ملف JSON</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {adminData.operations.map((op) => (
                            <tr key={op.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-mono font-bold text-blue-700 tabular-nums">
                                {op.id}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-600 tabular-nums">
                                {op.timestamp}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                {op.fileName}
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-900">
                                {op.deviceMarketingName}{' '}
                                <span className="font-mono text-slate-500">({op.osVersion})</span>
                              </td>
                              <td className="py-3 px-3 font-bold text-red-600">
                                {op.missingSensors.length > 0
                                  ? `Missing: ${op.missingSensors.join(', ')}`
                                  : op.matchedFaults[0] || op.diagnosis.headline}
                              </td>
                              <td className="py-3 px-3 text-end">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedJsonOp(
                                        selectedJsonOp?.id === op.id ? null : op
                                      )
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>
                                      {selectedJsonOp?.id === op.id ? 'إخفاء JSON' : 'عرض JSON'}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadJsonFile(op, `${op.id}.json`)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 font-bold text-slate-950 bg-amber-400 rounded hover:bg-amber-500 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>تنزيل .json</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Live JSON Viewer for Selected Operation */}
                    {selectedJsonOp && (
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-950 text-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            {selectedJsonOp.id}.json — {selectedJsonOp.deviceMarketingName}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  JSON.stringify(selectedJsonOp, null, 2),
                                  selectedJsonOp.id
                                )
                              }
                              className="px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
                            >
                              {copiedKey === selectedJsonOp.id ? 'تم النسخ' : 'نسخ JSON'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedJsonOp(null)}
                              className="px-3 py-1 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                            >
                              إغلاق
                            </button>
                          </div>
                        </div>
                        <pre
                          dir="ltr"
                          className="text-xs font-mono leading-relaxed overflow-x-auto max-h-[380px]"
                        >
                          {JSON.stringify(selectedJsonOp, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Admin Model Pool & Support Tickets */}
            {adminData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-950">
                      مصفوفة النماذج والتبديل التلقائي
                    </h3>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch('/api/ai/rotate', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-admin-password': adminSessionPass,
                          },
                          body: JSON.stringify({ action: 'rotate_next' }),
                        });
                        fetchAdminOverview(adminSessionPass);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-500 cursor-pointer"
                    >
                      تبديل للنموذج التالي
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="py-2 px-3 text-start">#</th>
                          <th className="py-2 px-3 text-start">النموذج</th>
                          <th className="py-2 px-3 text-start">الحالة</th>
                          <th className="py-2 px-3 text-start">العمليات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {adminData.models.map((m) => (
                          <tr key={m.id}>
                            <td className="py-2 px-3 font-mono font-bold tabular-nums">
                              #{m.priority}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-800">{m.apiModelId}</td>
                            <td className="py-2 px-3 font-bold">
                              {m.status === 'active' ? (
                                <span className="text-blue-600">نشط</span>
                              ) : (
                                <span className="text-red-600">تم التحويل للتالي</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold tabular-nums">
                              {m.requestsHandled}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4">
                  <h3 className="text-base font-bold text-slate-950">
                    تذاكر الدعم الفني الواردة ({adminData.tickets.length})
                  </h3>
                  {adminData.tickets.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                      لا توجد تذاكر دعم فني حالياً (0).
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {adminData.tickets.map((tkt) => (
                        <div
                          key={tkt.id}
                          className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>
                              {tkt.name} · {tkt.deviceModel}
                            </span>
                            <span className="font-mono text-slate-500">{tkt.contact}</span>
                          </div>
                          <p className="text-slate-700 font-medium">{tkt.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.section>
        )}
      </main>

      {/* Clean Footer with Developer Social Links */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 px-6 lg:px-12">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">iPanic Lab</span>
            <span aria-hidden="true">·</span>
            <span>Instagram:</span>
            <a
              href="https://instagram.com/yaz.salaq2"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-bold text-blue-600 hover:underline"
            >
              @yaz.salaq2
            </a>
            <span aria-hidden="true">·</span>
            <span>Facebook:</span>
            <a
              href="https://facebook.com/yazsalaq"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-bold text-blue-600 hover:underline"
            >
              yazsalaq
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('analyzer')}
              className="hover:text-slate-900 cursor-pointer"
            >
              {t.navAnalyzer}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('codes')}
              className="hover:text-slate-900 cursor-pointer"
            >
              {t.navCodes}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('support')}
              className="hover:text-slate-900 cursor-pointer"
            >
              {t.navSupport}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
