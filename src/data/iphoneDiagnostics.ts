export type SeverityLevel = 'critical' | 'warning' | 'info';

export interface BoardTestPoint {
  railName: string;
  expectedValue: string;
  componentRef: string;
  description: string;
}

export interface MatchedFault {
  id: string;
  title: string;
  subsystem: string;
  severity: SeverityLevel;
  confidence: number;
  matchedKeyword: string;
  matchedLineNumber: number;
  summary: string;
  rootCauses: string[];
  repairSteps: string[];
  testPoints: BoardTestPoint[];
  rebootInterval?: string;
}

export interface ParsedLogLine {
  lineNumber: number;
  content: string;
  severity: 'critical' | 'warning' | 'info' | 'normal';
  tag?: string;
}

export interface LogAnalysisResult {
  fileName: string;
  analyzedAt: string;
  deviceIdentifier: string;
  deviceMarketingName: string;
  boardNumber: string;
  socName: string;
  osVersion: string;
  buildNumber: string;
  bugType: string;
  bugTypeLabel: string;
  incidentId: string;
  crashTimestamp: string;
  panicString: string;
  overallSeverity: SeverityLevel;
  matchedFaults: MatchedFault[];
  missingSensors: { code: string; nameAr: string; locationAr: string; rail: string }[];
  parsedLines: ParsedLogLine[];
  stats: {
    totalLines: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
}

export interface IphoneErrorCodeItem {
  code: string;
  title: string;
  category: 'هاردوير البورد' | 'الفلاتات والحساسات' | 'الذاكرة والمعالج' | 'النظام والريستور';
  severity: SeverityLevel;
  stage: string;
  symptoms: string;
  cause: string;
  boardRails: string[];
  solutionSteps: string[];
}

export interface SampleLogPreset {
  id: string;
  label: string;
  fileName: string;
  deviceBadge: string;
  severity: SeverityLevel;
  content: string;
}

export const DEVICE_MAP: Record<
  string,
  { name: string; board: string; soc: string }
> = {
  'iPhone10,1': { name: 'iPhone 8', board: '820-00872', soc: 'Apple A11 Bionic' },
  'iPhone10,2': { name: 'iPhone 8 Plus', board: '820-00846', soc: 'Apple A11 Bionic' },
  'iPhone10,3': { name: 'iPhone X (Global)', board: '820-00863', soc: 'Apple A11 Bionic' },
  'iPhone10,6': { name: 'iPhone X (GSM)', board: '820-00869', soc: 'Apple A11 Bionic' },
  'iPhone11,2': { name: 'iPhone XS', board: '820-01019', soc: 'Apple A12 Bionic' },
  'iPhone11,6': { name: 'iPhone XS Max', board: '820-01225', soc: 'Apple A12 Bionic' },
  'iPhone11,8': { name: 'iPhone XR', board: '820-01209', soc: 'Apple A12 Bionic' },
  'iPhone12,1': { name: 'iPhone 11', board: '820-01523', soc: 'Apple A13 Bionic' },
  'iPhone12,3': { name: 'iPhone 11 Pro', board: '820-01582', soc: 'Apple A13 Bionic' },
  'iPhone12,5': { name: 'iPhone 11 Pro Max', board: '820-01682', soc: 'Apple A13 Bionic' },
  'iPhone13,1': { name: 'iPhone 12 mini', board: '820-01958', soc: 'Apple A14 Bionic' },
  'iPhone13,2': { name: 'iPhone 12', board: '820-01970', soc: 'Apple A14 Bionic' },
  'iPhone13,3': { name: 'iPhone 12 Pro', board: '820-01970', soc: 'Apple A14 Bionic' },
  'iPhone13,4': { name: 'iPhone 12 Pro Max', board: '820-01993', soc: 'Apple A14 Bionic' },
  'iPhone14,2': { name: 'iPhone 13 Pro', board: '820-02059', soc: 'Apple A15 Bionic' },
  'iPhone14,3': { name: 'iPhone 13 Pro Max', board: '820-02060', soc: 'Apple A15 Bionic' },
  'iPhone14,4': { name: 'iPhone 13 mini', board: '820-02067', soc: 'Apple A15 Bionic' },
  'iPhone14,5': { name: 'iPhone 13', board: '820-02056', soc: 'Apple A15 Bionic' },
  'iPhone14,7': { name: 'iPhone 14', board: '820-02458', soc: 'Apple A15 Bionic' },
  'iPhone14,8': { name: 'iPhone 14 Plus', board: '820-02460', soc: 'Apple A15 Bionic' },
  'iPhone15,2': { name: 'iPhone 14 Pro', board: '820-02535', soc: 'Apple A16 Bionic' },
  'iPhone15,3': { name: 'iPhone 14 Pro Max', board: '820-02536', soc: 'Apple A16 Bionic' },
  'iPhone15,4': { name: 'iPhone 15', board: '820-02690', soc: 'Apple A16 Bionic' },
  'iPhone15,5': { name: 'iPhone 15 Plus', board: '820-02692', soc: 'Apple A16 Bionic' },
  'iPhone16,1': { name: 'iPhone 15 Pro', board: '820-02705', soc: 'Apple A17 Pro' },
  'iPhone16,2': { name: 'iPhone 15 Pro Max', board: '820-02706', soc: 'Apple A17 Pro' },
  'iPhone17,1': { name: 'iPhone 16 Pro', board: '820-02890', soc: 'Apple A18 Pro' },
  'iPhone17,2': { name: 'iPhone 16 Pro Max', board: '820-02892', soc: 'Apple A18 Pro' },
};

export const BUG_TYPE_MAP: Record<string, string> = {
  '210': 'Kernel Panic — انهيار النواة وإعادة تشغيل قسرية (عطل هاردوير/مسار)',
  '115': 'ResetCounter — إعادة تشغيل مفاجئة من وحدة الطاقة PMU',
  '298': 'JetsamEvent — إغلاق بسبب امتلاء الذاكرة العشوائية RAM',
  '109': 'App Crash — توقف تطبيق أو خدمة نظام فرعية',
  '288': 'Watchdog Timeout — انتهاء مهلة استجابة الخدمة الحيوية',
  '309': 'ExcUserFault — خطأ استثناء في طبقة المستخدم',
};

export const SENSOR_DICTIONARY: Record<
  string,
  { nameAr: string; locationAr: string; rail: string }
> = {
  prs0: {
    nameAr: 'حساس الضغط الجوي (Barometric Pressure Sensor)',
    locationAr: 'فلاتة الشحن السفلية (Dock Flex) أو مسار I2C0/SPMI',
    rail: 'PP1V8_S2 / I2C_SMC_SDA',
  },
  mic1: {
    nameAr: 'الميكروفون السفلي الأول (Primary Bottom Microphone)',
    locationAr: 'فلاتة الشحن السفلية (Charging Port Flex)',
    rail: 'PP1V8_VA_LDO / AP_TO_CODEC_I2S',
  },
  mic2: {
    nameAr: 'الميكروفون العلوي الأمامي (Front Receiver Mic)',
    locationAr: 'فلاتة السماعة العلوية وحساس التقارب (Earpiece Flex)',
    rail: 'MIC2_BIAS / CODEC_TO_EAR_MIC',
  },
  mic3: {
    nameAr: 'ميكروفون الكاميرا الخلفية (Rear Camera Mic)',
    locationAr: 'فلاتة الفلاش والباور الخلفية (Power & Flash Flex)',
    rail: 'PP1V8_AUDIO /DMIC3_CLK',
  },
  tg0b: {
    nameAr: 'حساس بيانات وحرارة البطارية (Battery Gas Gauge SWI)',
    locationAr: 'كونكتور البطارية J1000 أو مسار بيانات البطارية',
    rail: 'BATT_SWI_CONN /smc_to_tigris_i2c',
  },
  tg0v: {
    nameAr: 'حساس فولتية البطارية (Battery Voltage Telemetry)',
    locationAr: 'آيسي الشحن Tigris/Hydra/Yangtze أو فلاتة البطارية',
    rail: 'PP_VDD_MAIN / BATT_SNS',
  },
  tp0p: {
    nameAr: 'حساس حرارة فلاتة الشحن أو الظهر (Thermal Sensor TP0P)',
    locationAr: 'فلاتة الشحن السفلية أو ملف الشحن اللاسلكي (MagSafe Coil)',
    rail: 'I2C_THERMAL_SDA / PP1V8_ALWAYS',
  },
  ta0p: {
    nameAr: 'حساس حرارة مضخم الطاقة أو الفلاش (Ambient/PA Thermal Sensor)',
    locationAr: 'فلاتة الفلاش/الباور أو منطقة الشبكة السفلية',
    rail: 'THERM_PA0 / ADC_IN',
  },
  als0: {
    nameAr: 'حساس الإضاءة المحيطة (Ambient Light Sensor)',
    locationAr: 'فلاتة السماعة العلوية (Top Sensor Flex)',
    rail: 'PP2V8_ALS / AOP_TO_ALS_I2C',
  },
};

interface PanicRuleDefinition {
  id: string;
  regex: RegExp;
  title: string;
  subsystem: string;
  severity: SeverityLevel;
  confidence: number;
  rebootInterval?: string;
  summary: string;
  rootCauses: string[];
  repairSteps: string[];
  testPoints: BoardTestPoint[];
}

const PANIC_RULES: PanicRuleDefinition[] = [
  {
    id: 'thermalmonitord-prs0',
    regex: /missing sensor:\s*prs0/i,
    title: 'انقطاع حساس الضغط الجوي (prs0) — فلاتة الشحن',
    subsystem: 'منظومة الحساسات الحرارية والضغط (thermalmonitord)',
    severity: 'critical',
    confidence: 98,
    rebootInterval: 'يفصل ويعيد التشغيل كل 180 ثانية (3 دقائق بالضبط)',
    summary:
      'النظام لم يتلقَّ قراءة من حساس البارومتر (prs0) الموجود على فلاتة الشحن السفلية، مما دفع خدمة thermalmonitord لإيقاف النواة.',
    rootCauses: [
      'تلف فلاتة الشحن السفلية أو تركيب فلاتة تجارية لا تحتوي على حساس prs0 أصلي.',
      'وجود أكسدة أو سوائل داخل كونكتور فلاتة الشحن على البورد.',
      'قطع في مسار التغذية PP1V8_S2 أو مسارات الاتصال I2C الخاصة بالحساس.',
    ],
    repairSteps: [
      'افصل فلاتة الشحن الحالية وجرّب فلاتة شحن أصلية (Original Pull) موثوقة أولاً قبل العمل على البورد.',
      'افحص كونكتور الشحن تحت الميكروسكوب وتأكد من سلامة الأرجل وعدم وجود كسر أو تمليح.',
      'قس الممانعة (Diode Mode) على أرجل I2C وخط تغذية 1.8V؛ إذا كانت OL فهناك مقاومة فيوزية مفصولة خلف الكونكتور.',
    ],
    testPoints: [
      {
        railName: 'PP1V8_S2 / PP1V8_IO',
        expectedValue: '1.8V (ممانعة ~0.380V)',
        componentRef: 'J6400 / Dock Connector',
        description: 'خط تغذية الحساسات على فلاتة الشحن',
      },
      {
        railName: 'I2C_SMC_SDA / SCL',
        expectedValue: 'ممانعة متطابقة ~0.440V',
        componentRef: 'R6410 / R6411',
        description: 'مسار نقل بيانات حساس الضغط prs0 إلى المعالج',
      },
    ],
  },
  {
    id: 'thermalmonitord-mic1',
    regex: /missing sensor:\s*mic1/i,
    title: 'انقطاع حساس الميكروفون السفلي (mic1) — فلاتة الشحن',
    subsystem: 'دائرة الصوت والحساسات السفلية (Dock Flex / Audio)',
    severity: 'critical',
    confidence: 97,
    rebootInterval: 'يعيد التشغيل كل 180 ثانية (3 دقائق)',
    summary:
      'توقف إشارة الميكروفون الرقمي السفلي (mic1) المرتبط بفلاتة الشحن، ويُعد في أجهزة iPhone من Hensors المراقبة حرارياً.',
    rootCauses: [
      'تلف الميكروفون السفلي أو تمزق جزئي في فلاتة الشحن السفلية.',
      'تركيب فلاتة شحن غير متوافقة مع إصدار المنطقة (أمريكي / عالمي).',
      'فصل في فلتر أو ملف مسار DMIC1 قرب كونكتور الشحن.',
    ],
    repairSteps: [
      'استبدل فلاتة الشحن السفلية بأخرى أصلية وتأكد من ثبات الكونكتور.',
      'افحص مسار DMIC1_CLK و DMIC1_DATA على كونكتور فلاتة الشحن باستخدام الأفوميتر على وضع الدايود.',
      'تحقق من عدم وجود شورت في مكثفات التصفية على خط تغذية المايك PP1V8_VA.',
    ],
    testPoints: [
      {
        railName: 'AP_TO_FCAM_DMIC1_CLK',
        expectedValue: 'ممانعة ~0.460V',
        componentRef: 'J6400 Pin 12/14',
        description: 'خط نبضة الساعة للميكروفون السفلي الأول',
      },
      {
        railName: 'PP1V8_VA_LDO',
        expectedValue: '1.8V مستقر',
        componentRef: 'U4700 (Audio Codec)',
        description: 'تغذية دائرة الميكروفون الرقمي',
      },
    ],
  },
  {
    id: 'thermalmonitord-tg0b',
    regex: /missing sensor:\s*tg0[bv]/i,
    title: 'انقطاع خط بيانات البطارية (tg0b / tg0v) — مسار SWI / I2C',
    subsystem: 'منظومة البطارية والشحن (Battery Gas Gauge / Tigris / Yangtze)',
    severity: 'critical',
    confidence: 98,
    rebootInterval: 'يفصل كل 3 دقائق مع اختفاء نسبة البطارية أو ثباتها على 1%',
    summary:
      'المعالج لا يستطيع قراءة بيانات شريحة البطارية (Gas Gauge) عبر مسار SWI/I2C، مما يسبب ريستارت دوري كل 180 ثانية.',
    rootCauses: [
      'عدم ثبات كونكتور البطارية أو تلف ريشة البيانات الوسطى في كونكتور البطارية على البورد.',
      'تلف فلاتة البطارية أو لحام BMS غير سليم بعد نقل شريحة البطارية.',
      'تلف الترانزستور/الموسفت Q2301 أو آيسي الشحن (Tigris / Hydra / Yangtze).',
    ],
    repairSteps: [
      'تحقق من ظهور نسبة صحة البطارية (Battery Health) في الإعدادات أو عبر برنامج 3uTools.',
      'افحص كونكتور البطارية على البورد وقس ممانعة ريشة بيانات البطارية (SWI / I2C)؛ القيمة الطبيعية بين 0.410V و 0.520V.',
      'إذا كانت الممانعة مفقودة (OL)، افحص المقاومة الفيوزية المتصلة بآيسي الشحن أو استبدل آيسي الشحن.',
    ],
    testPoints: [
      {
        railName: 'BATT_SWI_CONN / SMC_TO_TIGRIS',
        expectedValue: 'ممانعة ~0.450V',
        componentRef: 'J1000 (Battery Conn)',
        description: 'مسار قراءة بيانات وحرارة البطارية من الـ BMS',
      },
      {
        railName: 'PP_VDD_MAIN',
        expectedValue: '3.8V – 4.35V',
        componentRef: 'U2300 (Charger IC)',
        description: 'خط التغذية الرئيسي الخارج من آيسي الشحن',
      },
    ],
  },
  {
    id: 'thermalmonitord-tp0p',
    regex: /missing sensor:\s*t[pa]0[pg]/i,
    title: 'فقدان حساس الحرارة (tp0p / ta0p) — فلاتة الفلاش أو الشحن اللاسلكي',
    subsystem: 'فلاتة الباور والفلاش / ملف MagSafe اللاسلكي',
    severity: 'critical',
    confidence: 95,
    rebootInterval: 'يعيد التشغيل كل 180 ثانية (3 دقائق)',
    summary:
      'انقطاع قراءة حساس الحرارة المثبت على فلاتة الفلاش/الباور أو فلاتة الشحن اللاسلكي في ظهر الجهاز.',
    rootCauses: [
      'تمزق فلاتة الشحن اللاسلكي (Wireless Charging Coil) أثناء فتح الظهر الزجاجي.',
      'فصل أو تلف فلاتة زر الباور والفلاش العلوي بعد الصيانة.',
      'تلف مقاومة Pull-up الخاصة بمسار I2C الحراري على البورد.',
    ],
    repairSteps: [
      'افحص فلاتة الفلاش وفلاتة الشحن اللاسلكي (MagSafe) وتأكد من عدم قطعها بأداة فك الظهر.',
      'جرّب تشغيل الجهاز مع تركيب فلاتة شحن لاسلكي وفلاتة باور موثوقة.',
      'قس ممانعة أطراف كونكتور الشحن اللاسلكي وكونكتور الفلاش على البورد.',
    ],
    testPoints: [
      {
        railName: 'I2C_THERMAL_SDA / SCL',
        expectedValue: '1.8V (ممانعة ~0.430V)',
        componentRef: 'J4200 / Wireless Flex Conn',
        description: 'مسار اتصال حساس الحرارة الخلفي',
      },
    ],
  },
  {
    id: 'thermalmonitord-generic',
    regex: /no successful checkins from thermalmonitord/i,
    title: 'توقف خدمة المراقبة الحرارية (thermalmonitord Watchdog Timeout)',
    subsystem: 'منظومة الحساسات الحرارية (Thermal Subsystem)',
    severity: 'critical',
    confidence: 94,
    rebootInterval: 'ريستارت منتظم كل 180 ثانية',
    summary:
      'خدمة thermalmonitord فشلت في إرسال إشارة الاستجابة الدورية بسبب غياب أحد الحساسات الحرارية أو تعليق خط I2C المتصل بها.',
    rootCauses: [
      'تلف إحدى الفلاتات الطرفية الثلاث: فلاتة الشحن، فلاتة السماعة العلوية، أو فلاتة الباور/اللاسلكي.',
      'شورت جزئي على خط تغذية 1.8V المشترك بين الحساسات.',
    ],
    repairSteps: [
      'ابحث في السطر التالي مباشرة عن عبارة "missing sensor" لتحديد الكود الدقيق للحساس المفقود.',
      'إذا لم يُذكر اسم حساس محدد، افصل الفلاتات الطرفية (السماعة العلوية، الفلاش، الشحن) وركّب فلاتة شحن أصلية للاختبار.',
    ],
    testPoints: [
      {
        railName: 'PP1V8_ALWAYS / PP1V8_S2',
        expectedValue: '1.8V مستقر',
        componentRef: 'PMU Output',
        description: 'تغذية الحساسات الحرارية الفرعية',
      },
    ],
  },
  {
    id: 'aop-panic-als',
    regex: /AOP PANIC|als|FloodIlluminator|prox/i,
    title: 'انهيار المعالج المساعد (AOP PANIC) — فلاتة السماعة العلوية / حساس الإضاءة',
    subsystem: 'المعالج الدائم (Always-On Processor) وفلاتة Face ID العلوية',
    severity: 'critical',
    confidence: 95,
    rebootInterval: 'ريستارت عند إجراء مكالمة أو تقريب الشاشة أو كل 3 دقائق',
    summary:
      'حدث خطأ قاتل في معالج AOP المسؤول عن إدارة حساس التقارب والإضاءة (ALS) والبوصلة والمايك العلوي.',
    rootCauses: [
      'وصول سوائل إلى فلاتة السماعة العلوية وحساس الإضاءة/التقارب (Proximity / Flood Illuminator).',
      'شورت في خط تغذية PP2V8_ALS أو مسار AOP_I2C.',
    ],
    repairSteps: [
      'افصل فلاتة السماعة العلوية (Earpiece / Sensor Flex) تماماً وشغّل الجهاز؛ إذا استقر الجهاز فالعطل محصور في الفلاتة العلوية.',
      'نظف كونكتور الفلاتة العلوية، أو استبدل حساس الـ ALS/Proximity مع الحفاظ على التشفير إذا كان الجهاز يدعم Face ID.',
    ],
    testPoints: [
      {
        railName: 'AOP_TO_ALS_I2C_SDA / SCL',
        expectedValue: 'ممانعة ~0.440V',
        componentRef: 'J4500 (Top Sensor Conn)',
        description: 'مسار اتصال معالج AOP بحساس الإضاءة والتقارب',
      },
      {
        railName: 'PP2V8_ALS_LDO',
        expectedValue: '2.8V',
        componentRef: 'C4512',
        description: 'خط تغذية حساس الإضاءة العلوي',
      },
    ],
  },
  {
    id: 'nvme-nand-panic',
    regex: /nvme|ANS2|nand|AppleANS|S3E/i,
    title: 'عطل ذاكرة التخزين الداخلية (NAND / NVMe Controller Panic)',
    subsystem: 'ذاكرة الفلاش الداخلية (NAND Flash & ANS2 Controller)',
    severity: 'critical',
    confidence: 96,
    rebootInterval: 'تعليق مفاجئ ثم إعادة تشغيل أو الوقوف على شعار التفاحة (خطأ 4013/9)',
    summary:
      'انقطاع الاتصال بين المعالج وذاكرة التخزين الداخلية NAND أو فشل متحكم NVMe أثناء القراءة/الكتابة.',
    rootCauses: [
      'هبوط في أحد خطوط تغذية الـ NAND مثل PP2V5_NAND أو PP0V9_NAND أو PP1V8_NAND.',
      'تآكل اللحام تحت شريحة الـ NAND نتيجة صدمة قوية أو انحناء البورد.',
      'تلف القطاعات الداخلية للذاكرة (Bad Blocks) وحاجتها لإعادة برمجة أو استبدال.',
    ],
    repairSteps: [
      'قس فولتيات وممانعات المكثفات المحيطة بشريحة الـ NAND (خطوط 2.5V و 0.9V و 1.8V).',
      'إذا كانت الخطوط سليمة، ارفع شريحة الـ NAND، نظف الرجول، وأعد شبلنتها (Reballing) أو اختبرها على مبرمجة JC P13 / P15.',
    ],
    testPoints: [
      {
        railName: 'PP2V5_NAND (أو PP2V63_NAND)',
        expectedValue: '2.5V (ممانعة ~0.360V)',
        componentRef: 'C2601 / C2602',
        description: 'التغذية الرئيسية لشريحة ذاكرة التخزين NAND',
      },
      {
        railName: 'PP0V9_NAND',
        expectedValue: '0.9V (ممانعة ~0.240V)',
        componentRef: 'C2610',
        description: 'تغذية منطق متحكم الـ NVMe داخل الذاكرة',
      },
      {
        railName: 'PCIe_AP_TO_NAND',
        expectedValue: 'ممانعة متماثلة ~0.390V',
        componentRef: 'C2630 / C2631',
        description: 'مسارات نقل البيانات عالية السرعة بين المعالج والـ NAND',
      },
    ],
  },
  {
    id: 'i2c-bus-hang',
    regex: /i2c[0-4]|AppleS5L8940XI2C/i,
    title: 'تعليق أو شورت في مسار الاتصال التسلسلي (I2C Bus Timeout / Error)',
    subsystem: 'خطوط نقل البيانات التسلسلية (I2C0 / I2C1 / I2C2 / I2C3)',
    severity: 'warning',
    confidence: 92,
    summary:
      'أحد مسارات I2C على البورد معلّق على حالة Low (أرضي أو شورت جزئي) بسبب تلف آيسي متصل بالمسار أو تلف مقاومة Pull-up.',
    rootCauses: [
      'تلف آيسي الشحن/الـ USB (Hydra / Tristar / Kraken) المتصل بمسار I2C0.',
      'تلف إحدى الكاميرات أو آيسي الإضاءة المتصل بالمسار.',
      'تلف إحدى مقاومات الرفع (Pull-up Resistors 2.2KΩ) الخاصة بخطي SDA أو SCL.',
    ],
    repairSteps: [
      'حدّد رقم مسار الـ I2C المذكور في السجل (مثلاً i2c0 أو i2c1 أو i2c2) وافتح المخطط (ZXW / JCID) لمعرفة الآيسيات المشتركة على هذا المسار.',
      'قس الفولتية على خطي SDA و SCL أثناء التشغيل؛ يجب أن تكون 1.8V على كليهما.',
    ],
    testPoints: [
      {
        railName: 'I2C0_AP_SDA / SCL',
        expectedValue: '1.8V (ممانعة ~0.430V)',
        componentRef: 'R0401 / R0402 (2.2kΩ)',
        description: 'مسار I2C0 الرئيسي المتصل بآيسي الشحن والطاقة',
      },
    ],
  },
  {
    id: 'sep-panic',
    regex: /SEP Panic|sep_rom|sks|AppleSEPManager/i,
    title: 'انهيار المعالج الأمني (SEP Panic — Secure Enclave Processor)',
    subsystem: 'وحدة التشفير والحماية (SEP & EEPROM)',
    severity: 'critical',
    confidence: 94,
    summary:
      'فشل المعالج الأمني SEP المسؤول عن التشفير وقفل الشاشة وبيانات البصمة/Face ID في التواصل مع المعالج أو شريحة EEPROM.',
    rootCauses: [
      'تلف أو تحرك شريحة الـ EEPROM الأمنية القريبة من المعالج.',
      'انفصال في طبقتي البورد (Interposer) في المسارات الواصلة بين المعالج و SEP.',
      'شورت في خط تغذية PP1V8_S2 أو مسارات I2C_SEP.',
    ],
    repairSteps: [
      'افحص شريحة الـ EEPROM الأمنية وتأكد من عدم وجود كسر في زواياها أو تآكل تحتها.',
      'افحص ممانعة مسارات I2C_SEP بين طبقتي البورد إذا كان الجهاز قد تعرض لسقوط.',
    ],
    testPoints: [
      {
        railName: 'I2C_SEP_TO_EEPROM_SDA',
        expectedValue: 'ممانعة ~0.460V',
        componentRef: 'U0900 (SEP EEPROM)',
        description: 'مسار بيانات شريحة التشفير SEP',
      },
    ],
  },
  {
    id: 'socd-cpu-watchdog',
    regex: /SOCD report detected|AP watchdog expired|LLC Bus error|CPU\s*\d+\s*panic|MCA/i,
    title: 'تعليق المعالج الرئيسي أو انفصال طبقتي البورد (SOCD / AP Watchdog)',
    subsystem: 'المعالج الرئيسي والذاكرة العشوائية (AP CPU / RAM / Interposer)',
    severity: 'critical',
    confidence: 91,
    summary:
      'توقف نوى المعالج الرئيسي (Application Processor) عن الاستجابة نتيجة خلل في تغذية المعالج أو فك في لحام طبقتي البورد.',
    rootCauses: [
      'فصل في النقاط البينية (Interposer Pads) بين البورد العلوي والسفلي بعد سقوط الجهاز.',
      'عدم استقرار خطوط تغذية المعالج PP_CPU_PCORE أو PP_GPU أو PP_VDD_BOOST.',
      'خلل في الذاكرة العشوائية RAM المثبتة فوق المعالج.',
    ],
    repairSteps: [
      'افحص استهلاك الجهاز على الباور سبلاي قبل وبعد ضغطة الباور للتأكد من عدم وجود تسريب.',
      'افصل طبقتي البورد (Board Separation) واختبر البورد العلوي بمفرده (Core Board) لتحديد ما إذا كان الخلل من الطبقة السفلية أم من المعالج.',
    ],
    testPoints: [
      {
        railName: 'PP_CPU_PCORE',
        expectedValue: '0.65V – 1.05V (ممانعة ~0.045V)',
        componentRef: 'L2001 / L2002',
        description: 'تغذية نوى الأداء العالي في المعالج الرئيسي',
      },
      {
        railName: 'PP1V1_S2 / PP_RAM',
        expectedValue: '1.1V (ممانعة ~0.180V)',
        componentRef: 'PMU Buck Output',
        description: 'تغذية الذاكرة العشوائية LPDDR',
      },
    ],
  },
  {
    id: 'wifi-pcie-panic',
    regex: /wifid|AppleBCMWLAN|wlan|pcie.*link/i,
    title: 'انقطاع اتصال آيسي الواي فاي والبلوتوث (Wi-Fi / PCIe Bus Timeout)',
    subsystem: 'وحدة الاتصال اللاسلكي (Wi-Fi / Bluetooth IC & Interposer)',
    severity: 'warning',
    confidence: 93,
    summary:
      'فشل خدمة wifid أو ناقل PCIe في التواصل مع آيسي الواي فاي، وغالباً ما يرافقه انطفاء خيار الواي فاي باللون الرمادي.',
    rootCauses: [
      'انفصال أرجل مسارات PCIe_WLAN في الإطار الأوسط بين طبقتي البورد (شائع جداً في iPhone 12/13/14 بعد السقوط).',
      'تلف آيسي الواي فاي أو وجود شورت في مكثفات التغذية المحيطة به.',
    ],
    repairSteps: [
      'تأكد من حالة أيقونة الواي فاي والبلوتوث في الإعدادات.',
      'افصل طبقتي البورد وأعد شبلنة الإطار الأوسط (Reball Interposer) مع فحص النقاط المفقودة تحت آيسي الواي فاي.',
    ],
    testPoints: [
      {
        railName: 'PCIE_AP_TO_WLAN_RX/TX',
        expectedValue: 'ممانعة ~0.380V',
        componentRef: 'Interposer Middle Frame',
        description: 'خطوط الاتصال السريع بين المعالج وآيسي الواي فاي',
      },
    ],
  },
  {
    id: 'reset-counter-pmu',
    regex: /ResetCounter|"bug_type"\s*:\s*"115"|PMU\s*reset/i,
    title: 'إعادة تشغيل قسرية من منظومة الطاقة (PMU ResetCounter 115)',
    subsystem: 'آيسي الباور الرئيسي (PMU) والبطارية',
    severity: 'warning',
    confidence: 90,
    summary:
      'سجل ResetCounter يشير إلى أن آيسي الباور (PMU) قام بقطع الطاقة فجأة نتيجة هبوط حاد في الفولتية (UVLO) أو ضغط مطول على زر الباور.',
    rootCauses: [
      'ضعف خلايا البطارية وهبوط الفولتية تحت الحمل العالي (Peak Current Drop).',
      'تسريب أو شورت لحظي على خط PP_VDD_MAIN أو PP_VDD_BOOST.',
      'تعلق زر الباور أو وجود رطوبة في فلاتة الباور.',
    ],
    repairSteps: [
      'اختبر الجهاز على بطارية جديدة أصلية أو على الباور سبلاي لمراقبة السحب عند الذروة.',
      'افحص خط PP_VDD_MAIN وخط PP_VDD_BOOST بالكاميرا الحرارية.',
    ],
    testPoints: [
      {
        railName: 'PP_VDD_BOOST',
        expectedValue: '3.8V – 4.4V (ممانعة ~0.350V)',
        componentRef: 'U2400 (Boost IC)',
        description: 'منظم رفع وتثبيت الفولتية للنظام',
      },
    ],
  },
];

export const IPHONE_ERROR_CODES: IphoneErrorCodeItem[] = [
  {
    code: '4013',
    title: 'خطأ 4013 — انقطاع الاتصال أثناء التحديث أو الريستور قبل ظهور شريط التقدم',
    category: 'هاردوير البورد',
    severity: 'critical',
    stage: 'مرحلة تهيئة المعالج أو الكشف عن الـ NAND والـ I2C قبل كتابة النظام',
    symptoms: 'الجهاز يقف على شعار التفاحة ثم يعيد التشغيل، وعند عمل سوفتوير يظهر خطأ 4013 فور ظهور التفاحة.',
    cause:
      'في أجهزة Face ID يكون السبب غالباً شورت في فلاتة السماعة العلوية (Flood Illuminator)، أو خلل في ذاكرة الـ NAND / خطوط تغذيتها (2.5V / 0.9V)، أو انفصال طبقتي البورد.',
    boardRails: ['PP2V8_ALS / I2C_AOP', 'PP2V5_NAND', 'PP0V9_NAND', 'PP1V8_NAND'],
    solutionSteps: [
      'الخطوة الأولى دائماً: افصل فلاتة السماعة العلوية (Earpiece Flex) بالكامل وجرّب عمل ريستور؛ أكثر من 50% من أعطال 4013 تحل بفصلها.',
      'جرّب كابل USB أصلي ومنفذ مختلف للتأكد من سلامة خط USB_DATA.',
      'افحص فولتيات الـ NAND (خطوط 2.5V و 1.8V و 0.9V) وقس الممانعة حول الذاكرة.',
      'إذا كانت الفولتيات سليمة، قم برفع الـ NAND وتنظيفها وإعادة شبلنتها (Reballing) أو فحصها على المبرمجة.',
    ],
  },
  {
    code: '4014',
    title: 'خطأ 4014 — فشل تهيئة المعالج الرئيسي أو الذاكرة العشوائية RAM',
    category: 'الذاكرة والمعالج',
    severity: 'critical',
    stage: 'مرحلة إرسال ملفات iBSS / iBEC إلى الذاكرة العشوائية RAM قبل ظهور التفاحة',
    symptoms: 'الشاشة تبقى سوداء أثناء الريستور ولا يظهر شعار التفاحة، ثم يتوقف الآيتونز/3uTools على خطأ 4014.',
    cause:
      'انقطاع الاتصال بين المعالج الرئيسي (CPU) والذاكرة العشوائية (RAM)، أو شورت على مسار I2C0 / I2C1، أو هبوط فولتية تغذية الـ RAM (PP1V1_S2).',
    boardRails: ['PP1V1_S2 (RAM Supply)', 'PP_CPU_PCORE', 'I2C0_AP_SDA/SCL'],
    solutionSteps: [
      'افحص ممانعة وفولتية مسارات I2C0 و I2C1 للتأكد من عدم وجود آيسي يسبب شورت على المسار.',
      'افحص تغذية الـ RAM (1.1V) وتغذية المعالج حول آيسي الباور.',
      'في حال تعرض الجهاز لصدمة، غالباً يحتاج المعالج والـ RAM إلى إعادة شبلنة (CPU & RAM Reball).',
    ],
  },
  {
    code: '9',
    title: 'خطأ 9 — انقطاع الاتصال مع ذاكرة الـ NAND أثناء كتابة النظام',
    category: 'الذاكرة والمعالج',
    severity: 'critical',
    stage: 'يظهر بعد ظهور شعار التفاحة وبداية شريط التقدم (بين 15% و 35%)',
    symptoms: 'يبدأ شريط التقدم بالامتلاء جزئياً ثم يفصل الجهاز فجأة ويعود لوضع الريكفري مع رسالة خطأ 9.',
    cause:
      'تلف في قطاعات ذاكرة التخزين الداخلية (NAND)، أو فصل في مسارات PCIe_NAND بين المعالج والذاكرة، أو فصل في الإطار الأوسط للبورد.',
    boardRails: ['PCIE_AP_TO_NAND_RX/TX', 'PP2V5_NAND', 'AP_TO_NAND_RESET_L'],
    solutionSteps: [
      'ارفع شريحة الـ NAND وافحص سلامة جميع الـ Pads تحتها، خاصة خطوط الـ PCIe ومسار الـ Reset.',
      'اختبر الـ NAND على مبرمجة JC P13/P15 وقم بعمل Format/Repair أو استبدلها بشريحة NAND أخرى.',
      'في الأجهزة ذات الطبقتين، تأكد من عدم وجود انتفاخ أو فك في لحام الطبقتين قرب المعالج.',
    ],
  },
  {
    code: '40',
    title: 'خطأ 40 — عدم قدرة المعالج على التعرف على شريحة الـ NAND',
    category: 'الذاكرة والمعالج',
    severity: 'critical',
    stage: 'عند بداية مرحلة التهيئة بعد ظهور شعار التفاحة مباشرة',
    symptoms: 'شريط التقدم لا يتحرك نهائياً تحت التفاحة ثم يظهر خطأ 40.',
    cause: 'تلف كامل في شريحة الـ NAND أو قطع في مسار التغذية الرئيسي PP1V8_NAND / PP2V5_NAND أو مقاومات التوقيت.',
    boardRails: ['PP1V8_NAND', 'PP2V5_NAND', 'NAND_SYS_CLK'],
    solutionSteps: [
      'قس ممانعة كافة النقاط تحت شريحة الـ NAND بعد رفعها للتحقق من اتصالها بالمعالج.',
      'تأكد من سلامة المقاومة المرجعية (ZQ Resistor) بجانب الـ NAND.',
      'استبدل شريحة الـ NAND بشريحة موثوقة مبرمجة بنفس السيريال.',
    ],
  },
  {
    code: '-1',
    title: 'خطأ -1 — فشل برمجة دائرة الشبكة والمودم (Baseband Update Failure)',
    category: 'هاردوير البورد',
    severity: 'critical',
    stage: 'في نهاية عملية السوفتوير (عند 80% - 99% أثناء Updating Baseband)',
    symptoms: 'يكتمل شريط التقدم تقريباً حتى النهاية ثم يفشل التحديث بخطأ -1 (أو خطأ 50 في بعض الإصدارات).',
    cause:
      'خلل في معالج الشبكة (Baseband CPU)، أو آيسي باور الشبكة (BB PMU)، أو شريحة الـ EEPROM الخاصة بالشبكة، أو فك بين طبقتي البورد (البورد السفلي RF Board).',
    boardRails: ['PP_VREG_SMPS_BB', 'BB_PMU_RESET_L', 'PCIE_AP_TO_BB', 'I2C_BB_EEPROM'],
    solutionSteps: [
      'في أجهزة الطبقتين (iPhone X فما فوق)، افصل البورد وأعد شبلنة الطبقة السفلية (RF Board) وتأكد من سلامة جميع الأرجل.',
      'افحص فولتيات آيسي باور الشبكة (BB_PMU) وتأكد من عدم وجود شورت أو آثار مياه.',
      'تحقق من سلامة شريحة EEPROM الشبكة وعدم فقدان بياناتها.',
    ],
  },
  {
    code: '1110',
    title: 'خطأ 1110 — امتلاء ذاكرة التخزين بالكامل أثناء التحديث (Storage Full Loop)',
    category: 'النظام والريستور',
    severity: 'warning',
    stage: 'أثناء محاولة عمل Update (تحديث مع حفظ البيانات) عبر الآيتونز أو 3uTools',
    symptoms: 'الجهاز عالق على التفاحة بسبب امتلاء المساحة 100%، وعند محاولة التحديث للحفاظ على الصور يظهر خطأ 1110.',
    cause:
      'عدم وجود مساحة كافية على قسم النظام والبيانات لفك ضغط ملفات التحديث الجديد دون مسح المحتوى.',
    boardRails: ['لا يوجد عطل هاردوير — مشكلة مساحة قسم البيانات APFS'],
    solutionSteps: [
      'استخدم وضع "Fix Flash" أو "Retain User Data" عبر إصدار حديث من 3uTools أو أداة Apple Configurator 2.',
      'إذا لم ينجح التحديث مع حفظ البيانات وكان العميل لا يحتاج البيانات، فإن عمل Clean Restore (مسح كامل) يحل المشكلة فوراً.',
    ],
  },
  {
    code: '75',
    title: 'خطأ 75 / 78 — فشل فك ضغط ملفات النظام أو خلل في مسار الـ NAND / USB',
    category: 'النظام والريستور',
    severity: 'warning',
    stage: 'في بداية شريط التقدم (12% - 20%) على أنظمة iOS 16 / 17 / 18',
    symptoms: 'يتوقف السوفتوير في البداية مع ظهور كود الخطأ 75 على الآيتونز أو 3uTools.',
    cause:
      'إما تلف ملف الـ IPSW المحمّل، أو مشكلة في اتصال كابل الـ USB، أو بداية تلف في ذاكرة الـ NAND، أو شورت في فلاتة السماعة العلوية.',
    boardRails: ['USB_DP / USB_DN', 'PP2V5_NAND', 'AOP_I2C'],
    solutionSteps: [
      'افصل فلاتة السماعة العلوية وجرّب التفليش عبر وضع DFU بدلاً من وضع Recovery.',
      'تأكد من تحميل ملف IPSW رسمي جديد واستخدم كابل USB-A بدلاً من USB-C to Lightning أثناء التفليش.',
    ],
  },
  {
    code: '56',
    title: 'خطأ 56 — فشل فحص دائرة الـ NFC أو الكاميرا أثناء التحديث',
    category: 'هاردوير البورد',
    severity: 'warning',
    stage: 'عند حوالي 65% - 70% من شريط التقدم أثناء الريستور',
    symptoms: 'يتوقف الريستور في الثلث الأخير من الشريط مع ظهور خطأ 56.',
    cause: 'تلف آيسي الـ NFC (Apple Pay IC)، أو قطع في مسارات الاتصال بينه وبين المعالج، أو شورت في تغذيته.',
    boardRails: ['PP_VDD_MAIN_NFC', 'PP1V8_NFC', 'AP_TO_NFC_I2C'],
    solutionSteps: [
      'افحص المكثفات المحيطة بآيسي الـ NFC وتأكد من عدم وجود شورت أو كسر.',
      'أعد شبلنة أو استبدل آيسي الـ NFC مع التأكد من سلامة مسارات I2C الخاصة به.',
    ],
  },
  {
    code: '210',
    title: 'Bug Type 210 — سجل انهيار النواة الكامل (Kernel Panic Full)',
    category: 'الفلاتات والحساسات',
    severity: 'critical',
    stage: 'أثناء عمل الجهاز الطبيعي (يفصل كل 3 دقائق أو بشكل عشوائي)',
    symptoms: 'يوجد ملف يبدأ باسم panic-full داخل إعدادات الخصوصية > التحليلات والبيانات.',
    cause:
      'كود 210 في ترويسة ملف الـ .ips يعني أن نواة النظام تعرضت لانهيار كامل بسبب فقدان حساس حيوي أو شورت في مسار هاردوير.',
    boardRails: ['يُحدد حسب نص panicString داخل الملف (مثل prs0 أو mic1 أو tg0b)'],
    solutionSteps: [
      'انسخ محتوى ملف panic-full أو ارفعه في المحلل أعلاه لقراءة الحقل panicString وتحديد القطعة المسببة للعطل بدقة.',
    ],
  },
];

export const SAMPLE_LOGS: SampleLogPreset[] = [
  {
    id: 'sample-prs0-14pro',
    label: 'عطل فلاتة الشحن (prs0) — iPhone 14 Pro',
    fileName: 'panic-full-2026-10-25-iPhone14Pro.ips',
    deviceBadge: 'iPhone 14 Pro',
    severity: 'critical',
    content: `{"bug_type":"210","timestamp":"2026-10-25 19:42:18.00 +0300","os_version":"iPhone OS 17.5.1 (21F90)","roots_installed":0,"incident_id":"8F4D2A91-C12B-4E19-9A83-7721B3E09114"}
{
  "build" : "iPhone OS 17.5.1 (21F90)",
  "product" : "iPhone15,2",
  "socId" : "0x00008120",
  "kernel" : "Darwin Kernel Version 23.5.0: Wed May  1 20:33:18 PDT 2024; root:xnu-10063.122.3~1/RELEASE_ARM64_T8120",
  "incident" : "8F4D2A91-C12B-4E19-9A83-7721B3E09114",
  "crashReporterKey" : "c910a44f12b83e9100a19c7421ef9823a0192b11",
  "date" : "2026-10-25 19:42:18.00 +0300",
  "panicString" : "panic(cpu 2 caller 0xfffffff02418a9c4): userspace watchdog timeout: no successful checkins from thermalmonitord in 180 seconds\\nservice returned not alive with context : is_alive_func returned unhealthy : current 3fffffffffffc, mask 7ffffffffffff, expected 7ffffffffffff. SD: 1 BC: 1 RC: 0 BS: 1, Missing sensor(s): prs0 \\nservice: backboardd, total successful checkins in 214 seconds: 21, last successful checkin: 0 seconds ago\\nservice: SpringBoard, total successful checkins in 189 seconds: 18, last successful checkin: 0 seconds ago\\nservice: thermalmonitord, total successful checkins in 214 seconds: 0, last successful checkin: 180 seconds ago\\nDebugger message: panic\\nMemory ID: 0xff\\nOS release type: User\\nOS version: 21F90\\nKernel version: Darwin Kernel Version 23.5.0",
  "panicFlags" : "0x802",
  "otherString" : "\\n** Stackshot Succeeded ** Bytes Traced 392412 (Uncompressed 984120) **\\n"
}`,
  },
  {
    id: 'sample-tg0b-13promax',
    label: 'عطل بيانات البطارية (tg0b) — iPhone 13 Pro Max',
    fileName: 'panic-full-2026-10-24-iPhone13ProMax.ips',
    deviceBadge: 'iPhone 13 Pro Max',
    severity: 'critical',
    content: `{"bug_type":"210","timestamp":"2026-10-24 14:15:09.00 +0300","os_version":"iPhone OS 17.4.1 (21E236)","roots_installed":0,"incident_id":"3A19F882-9012-44C1-B908-112098AB3410"}
{
  "build" : "iPhone OS 17.4.1 (21E236)",
  "product" : "iPhone14,3",
  "socId" : "0x00008110",
  "kernel" : "Darwin Kernel Version 23.4.0: Fri Mar 15 00:12:41 PDT 2024; root:xnu-10063.102.1~1/RELEASE_ARM64_T8110",
  "incident" : "3A19F882-9012-44C1-B908-112098AB3410",
  "date" : "2026-10-24 14:15:09.00 +0300",
  "panicString" : "panic(cpu 1 caller 0xfffffff019a21088): userspace watchdog timeout: no successful checkins from thermalmonitord in 180 seconds\\nservice returned not alive with context : is_alive_func returned unhealthy : Missing sensor(s): tg0b tg0v \\nservice: thermalmonitord, total successful checkins in 195 seconds: 0\\nSMC PANIC - smc_to_tigris_i2c timeout on bus i2c0\\nDebugger message: panic\\nOS version: 21E236",
  "panicFlags" : "0x802"
}`,
  },
  {
    id: 'sample-nand-12promax',
    label: 'عطل ذاكرة التخزين (NVMe / NAND) — iPhone 12 Pro Max',
    fileName: 'panic-full-2026-10-22-iPhone12ProMax.ips',
    deviceBadge: 'iPhone 12 Pro Max',
    severity: 'critical',
    content: `{"bug_type":"210","timestamp":"2026-10-22 22:08:44.00 +0300","os_version":"iPhone OS 16.7.2 (20H115)","roots_installed":0,"incident_id":"E712C094-55A1-4D88-8812-9012FA883120"}
{
  "build" : "iPhone OS 16.7.2 (20H115)",
  "product" : "iPhone13,4",
  "socId" : "0x00008101",
  "kernel" : "Darwin Kernel Version 22.6.0; RELEASE_ARM64_T8101",
  "incident" : "E712C094-55A1-4D88-8812-9012FA883120",
  "date" : "2026-10-22 22:08:44.00 +0300",
  "panicString" : "panic(cpu 0 caller 0xfffffff021c90124): ANS2 Recoverable Panic - assert failed: [14502] nvme controller fatal timeout on PCIe link, nand_sys_clk stalled, S3E power rail drop detected\\nRTKit: RTKit-2062.140.2.release - Client: AppleANS2NVMeController\\nDebugger message: panic\\nOS version: 20H115",
  "panicFlags" : "0x104"
}`,
  },
  {
    id: 'sample-aop-15pro',
    label: 'عطل الحساس العلوي و I2C (AOP / mic1) — iPhone 15 Pro',
    fileName: 'panic-full-2026-10-26-iPhone15Pro.ips',
    deviceBadge: 'iPhone 15 Pro',
    severity: 'warning',
    content: `{"bug_type":"210","timestamp":"2026-10-26 11:20:05.00 +0300","os_version":"iPhone OS 18.0.1 (22A3370)","roots_installed":0,"incident_id":"C441098B-2219-4F01-9E12-66512098CC12"}
{
  "build" : "iPhone OS 18.0.1 (22A3370)",
  "product" : "iPhone16,1",
  "socId" : "0x00008130",
  "kernel" : "Darwin Kernel Version 24.0.0; RELEASE_ARM64_T8130",
  "incident" : "C441098B-2219-4F01-9E12-66512098CC12",
  "date" : "2026-10-26 11:20:05.00 +0300",
  "panicString" : "panic(cpu 4 caller 0xfffffff028f11420): AOP PANIC - FloodIlluminator / als0 sensor bus i2c2 timeout! userspace watchdog timeout: no successful checkins from thermalmonitord in 180 seconds, Missing sensor(s): mic1 tp0p \\nRTKit: AOP-2410.10.1\\nDebugger message: panic",
  "panicFlags" : "0x802"
}`,
  },
];

export function analyzeIphoneLog(rawText: string, fileName = 'pasted-panic-log.ips'): LogAnalysisResult {
  const trimmed = rawText.trim();
  const rawLines = trimmed.split(/\r?\n/);

  let deviceIdentifier = 'غير محدد';
  let osVersion = 'غير محدد';
  let buildNumber = 'غير محدد';
  let bugType = '210';
  let incidentId = 'غير متوفر';
  let crashTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let panicString = '';

  // 1. Parse IPS JSON Header (First line of .ips files is often a JSON header)
  if (rawLines.length > 0 && rawLines[0].trim().startsWith('{')) {
    try {
      const firstLineObj = JSON.parse(rawLines[0].trim());
      if (firstLineObj.bug_type) bugType = String(firstLineObj.bug_type);
      if (firstLineObj.os_version) osVersion = String(firstLineObj.os_version);
      if (firstLineObj.incident_id) incidentId = String(firstLineObj.incident_id);
      if (firstLineObj.timestamp) crashTimestamp = String(firstLineObj.timestamp);
    } catch {
      // Might be multi-line JSON
    }
  }

  // 2. Try parsing JSON body (from line 2 onwards or full text)
  const bodyCandidate = rawLines.length > 1 && rawLines[0].trim().startsWith('{') && rawLines[1].trim().startsWith('{')
    ? rawLines.slice(1).join('\n')
    : trimmed;

  try {
    const parsedBody = JSON.parse(bodyCandidate);
    if (parsedBody.product) deviceIdentifier = String(parsedBody.product);
    if (parsedBody.build) {
      buildNumber = String(parsedBody.build);
      if (osVersion === 'غير محدد') osVersion = buildNumber;
    }
    if (parsedBody.incident && incidentId === 'غير متوفر') incidentId = String(parsedBody.incident);
    if (parsedBody.date) crashTimestamp = String(parsedBody.date);
    if (parsedBody.panicString) panicString = String(parsedBody.panicString);
  } catch {
    // Fallback regex extraction for non-JSON or truncated .ips/.log files
    const productMatch = trimmed.match(/"product"\s*:\s*"([^"]+)"/i) || trimmed.match(/(iPhone\d+,\d+)/i);
    if (productMatch) deviceIdentifier = productMatch[1];

    const osMatch = trimmed.match(/"(?:os_version|build)"\s*:\s*"([^"]+)"/i) || trimmed.match(/(iPhone OS [\d.]+ \([A-Z0-9]+\))/i);
    if (osMatch) osVersion = osMatch[1];

    const bugMatch = trimmed.match(/"bug_type"\s*:\s*"(\d+)"/i);
    if (bugMatch) bugType = bugMatch[1];

    const incidentMatch = trimmed.match(/"incident(?:_id)?"\s*:\s*"([^"]+)"/i);
    if (incidentMatch) incidentId = incidentMatch[1];

    const dateMatch = trimmed.match(/"(?:timestamp|date)"\s*:\s*"([^"]+)"/i);
    if (dateMatch) crashTimestamp = dateMatch[1];

    const panicMatch = trimmed.match(/"panicString"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
    if (panicMatch) {
      panicString = panicMatch[1].replace(/\\n/g, '\n');
    } else {
      panicString = trimmed;
    }
  }

  // Expand escaped newlines so line-by-line inspection is clean and readable
  const expandedText = panicString
    ? `${rawLines[0]}\n${ trimmed.replace(/\\n/g, '\n') }`
    : trimmed.replace(/\\n/g, '\n');
  const displayLines = expandedText.split(/\r?\n/);

  const deviceInfo = DEVICE_MAP[deviceIdentifier] || {
    name: deviceIdentifier !== 'غير محدد' ? `جهاز آيفون (${deviceIdentifier})` : 'جهاز iPhone (غير محدد بالترويسة)',
    board: 'حسب الموديل (راجع المخطط)',
    soc: 'Apple Silicon SoC',
  };

  const bugTypeLabel = BUG_TYPE_MAP[bugType] || `سجل خطأ نظام آيفون (كود ${bugType})`;

  // Detect missing sensors explicitly
  const missingSensors: { code: string; nameAr: string; locationAr: string; rail: string }[] = [];
  const sensorAreaMatch = expandedText.match(/missing sensor\(s\)\s*:\s*([^\n\r"\\]+)/i);
  const searchCorpus = sensorAreaMatch ? `${sensorAreaMatch[1]} ${expandedText}` : expandedText;

  Object.entries(SENSOR_DICTIONARY).forEach(([code, info]) => {
    const codeRegex = new RegExp(`\\b${code}\\b`, 'i');
    if (codeRegex.test(searchCorpus)) {
      missingSensors.push({ code, ...info });
    }
  });

  // Evaluate Panic Rules & Line annotations
  const matchedFaults: MatchedFault[] = [];
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  const parsedLines: ParsedLogLine[] = displayLines.map((line, idx) => {
    const lineNum = idx + 1;
    let severity: ParsedLogLine['severity'] = 'normal';
    let tag: string | undefined;

    if (/panic\(|missing sensor|fatal|assert failed|unhealthy|AOP PANIC|SMC PANIC|SEP Panic|watchdog timeout/i.test(line)) {
      severity = 'critical';
      tag = 'خطأ حرج';
      criticalCount++;
    } else if (/i2c\d|timeout|warning|checkins:\s*0|nvme|nand|wifid|ResetCounter/i.test(line)) {
      severity = 'warning';
      tag = 'تحذير مسار';
      warningCount++;
    } else if (/"product"|"os_version"|"bug_type"|"incident"|Kernel version|socId/i.test(line)) {
      severity = 'info';
      tag = 'بيانات الجهاز';
      infoCount++;
    }

    return {
      lineNumber: lineNum,
      content: line,
      severity,
      tag,
    };
  });

  PANIC_RULES.forEach((rule) => {
    const match = expandedText.match(rule.regex);
    if (match) {
      const matchedLineObj =
        parsedLines.find((l) => rule.regex.test(l.content)) || parsedLines[0];

      matchedFaults.push({
        id: rule.id,
        title: rule.title,
        subsystem: rule.subsystem,
        severity: rule.severity,
        confidence: rule.confidence,
        matchedKeyword: match[0],
        matchedLineNumber: matchedLineObj ? matchedLineObj.lineNumber : 1,
        summary: rule.summary,
        rootCauses: rule.rootCauses,
        repairSteps: rule.repairSteps,
        testPoints: rule.testPoints,
        rebootInterval: rule.rebootInterval,
      });
    }
  });

  // Also check if user pasted a direct error code like "4013" or "Error 4013"
  IPHONE_ERROR_CODES.forEach((errItem) => {
    const errRegex = new RegExp(`(?:error|خطأ|كود|^)\\s*${errItem.code}\\b`, 'i');
    if (errRegex.test(trimmed)) {
      matchedFaults.push({
        id: `error-code-${errItem.code}`,
        title: errItem.title,
        subsystem: errItem.category,
        severity: errItem.severity,
        confidence: 96,
        matchedKeyword: `Error ${errItem.code}`,
        matchedLineNumber: 1,
        summary: `${errItem.symptoms} — ${errItem.cause}`,
        rootCauses: [errItem.cause, `مرحلة الظهور: ${errItem.stage}`],
        repairSteps: errItem.solutionSteps,
        testPoints: errItem.boardRails.map((rail) => ({
          railName: rail,
          expectedValue: 'راجع قيمة الممانعة القياسية',
          componentRef: 'مسار الفحص المباشر',
          description: `مسار مرتبط بالخطأ رقم ${errItem.code}`,
        })),
      });
    }
  });

  // Default fallback if custom text has no known signature yet
  if (matchedFaults.length === 0 && trimmed.length > 0) {
    matchedFaults.push({
      id: 'general-log-inspection',
      title: 'تحليل عام للسجل — لم يتم رصد توقيع Kernel Panic حرج',
      subsystem: 'فحص سلامة سجل النظام (General iOS Log)',
      severity: 'info',
      confidence: 78,
      matchedKeyword: bugType ? `bug_type: ${bugType}` : 'سجل نصي عام',
      matchedLineNumber: 1,
      summary:
        'لا يحتوي هذا السجل على كود انقطاع حساس حراري (مثل prs0 أو mic1 أو tg0b) أو انهيار نواة صريح. قد يكون سجل استنزاف ذاكرة (Jetsam) أو توقف تطبيق عابر.',
      rootCauses: [
        'امتلاء الذاكرة العشوائية المؤقتة (Jetsam Event 298) وإغلاق التطبيقات في الخلفية.',
        'توقف تطبيق طرف ثالث دون وجود عطل هاردوير في مسارات البورد.',
      ],
      repairSteps: [
        'تأكد من فتح ملف يبدأ باسم panic-full أو ResetCounter من داخل إعدادات الآيفون > الخصوصية والأمن > التحليلات والتحسينات > بيانات التحليلات.',
        'إذا كان الجهاز يعاني من مشكلة أثناء السوفتوير، ابحث برقم كود الخطأ (مثل 4013 أو 9 أو 4014) في دليل الأكواد.',
      ],
      testPoints: [
        {
          railName: 'PP_VDD_MAIN',
          expectedValue: '3.8V – 4.35V',
          componentRef: 'خط التغذية الرئيسي',
          description: 'فحص أولي لاستقرار تغذية البورد',
        },
      ],
    });
  }

  const overallSeverity: SeverityLevel = matchedFaults.some((f) => f.severity === 'critical')
    ? 'critical'
    : matchedFaults.some((f) => f.severity === 'warning')
    ? 'warning'
    : 'info';

  const now = new Date();
  const localDatePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const localTimePart = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return {
    fileName,
    analyzedAt: `${localDatePart} · ${localTimePart}`,
    deviceIdentifier,
    deviceMarketingName: deviceInfo.name,
    boardNumber: deviceInfo.board,
    socName: deviceInfo.soc,
    osVersion,
    buildNumber,
    bugType,
    bugTypeLabel,
    incidentId,
    crashTimestamp,
    panicString: panicString || trimmed.slice(0, 320),
    overallSeverity,
    matchedFaults,
    missingSensors,
    parsedLines,
    stats: {
      totalLines: parsedLines.length,
      criticalCount,
      warningCount,
      infoCount,
    },
  };
}
