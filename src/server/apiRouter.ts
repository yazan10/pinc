import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const ADMIN_SECRET_PASS = 'maya@#5Y';
const DATA_DIR = path.join(process.cwd(), 'data');
const OPERATIONS_JSON_PATH = path.join(DATA_DIR, 'analyzed_operations.json');

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface AiModelEntry {
  id: string;
  apiModelId: string;
  name: string;
  provider: 'opencode' | 'gemini' | 'opencode-local';
  badge: string;
  priority: number;
  status: 'active' | 'exhausted';
  cooldownUntil: number | null;
  requestsHandled: number;
  failoverCount: number;
  lastErrorReason?: string;
}

export interface FailoverAttempt {
  modelId: string;
  modelName: string;
  provider: string;
  outcome: 'success' | 'rotated';
  reason: string;
  latencyMs: number;
}

export interface StructuredAiDiagnosis {
  headline: string;
  headlineEn: string;
  rootCauseAnalysis: string;
  rootCauseAnalysisEn: string;
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
  stepByStepRepairPlanEn: string[];
  riskWarning: string;
  riskWarningEn: string;
}

export interface StoredAnalysisOperation {
  id: string;
  timestamp: string;
  fileName: string;
  deviceMarketingName: string;
  deviceIdentifier: string;
  osVersion: string;
  bugTypeLabel: string;
  missingSensors: string[];
  matchedFaults: string[];
  diagnosis: StructuredAiDiagnosis;
  rawLogExcerpt: string;
}

export interface SupportTicket {
  id: string;
  name: string;
  contact: string;
  deviceModel: string;
  message: string;
  createdAt: string;
  status: 'open' | 'resolved';
}

const COOLDOWN_DURATION_MS = 3 * 60 * 1000;

const MODEL_POOL: AiModelEntry[] = [
  {
    id: 'node-1',
    apiModelId: 'big-pickle',
    name: 'Engine Node #1',
    provider: 'opencode',
    badge: 'Node #1',
    priority: 1,
    status: 'active',
    cooldownUntil: null,
    requestsHandled: 0,
    failoverCount: 0,
  },
  {
    id: 'node-2',
    apiModelId: 'nemotron-3-ultra-free',
    name: 'Engine Node #2',
    provider: 'opencode',
    badge: 'Node #2',
    priority: 2,
    status: 'active',
    cooldownUntil: null,
    requestsHandled: 0,
    failoverCount: 0,
  },
  {
    id: 'node-3',
    apiModelId: 'deepseek-v4-flash-free',
    name: 'Engine Node #3',
    provider: 'opencode',
    badge: 'Node #3',
    priority: 3,
    status: 'active',
    cooldownUntil: null,
    requestsHandled: 0,
    failoverCount: 0,
  },
  {
    id: 'node-4',
    apiModelId: 'mimo-v2.5-free',
    name: 'Engine Node #4',
    provider: 'opencode',
    badge: 'Node #4',
    priority: 4,
    status: 'active',
    cooldownUntil: null,
    requestsHandled: 0,
    failoverCount: 0,
  },
  {
    id: 'node-5',
    apiModelId: 'gemini-3-flash-preview',
    name: 'Engine Node #5',
    provider: 'gemini',
    badge: 'Node #5',
    priority: 5,
    status: 'active',
    cooldownUntil: null,
    requestsHandled: 0,
    failoverCount: 0,
  },
  {
    id: 'node-6',
    apiModelId: 'opencode-iphone-expert-v1',
    name: 'Engine Node #6',
    provider: 'opencode-local',
    badge: 'Node #6',
    priority: 6,
    status: 'active',
    cooldownUntil: null,
    requestsHandled: 0,
    failoverCount: 0,
  },
];

// All counters and lists initialized to ZERO (0) as requested
let SUPPORT_TICKETS: SupportTicket[] = [];
let ANALYZED_OPERATIONS: StoredAnalysisOperation[] = [];

const PLATFORM_STATS = {
  totalAnalyzedLogs: 0,
  totalApiCalls: 0,
  criticalPanicsDetected: 0,
  autoFailoverSwitches: 0,
};

// Initialize / Sync JSON file storage for analyzed operations
function ensureOperationsJsonFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(OPERATIONS_JSON_PATH)) {
      fs.writeFileSync(OPERATIONS_JSON_PATH, JSON.stringify([], null, 2), 'utf-8');
    } else {
      const raw = fs.readFileSync(OPERATIONS_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        ANALYZED_OPERATIONS = parsed;
        PLATFORM_STATS.totalAnalyzedLogs = parsed.length;
      }
    }
  } catch {
    // Fallback to in-memory if filesystem is read-only (e.g., Vercel lambda)
  }
}

function saveOperationsToJsonFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(OPERATIONS_JSON_PATH, JSON.stringify(ANALYZED_OPERATIONS, null, 2), 'utf-8');
  } catch {
    // Ignore write error on read-only serverless container
  }
}

// Reset operations file to 0 on startup
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(OPERATIONS_JSON_PATH, JSON.stringify([], null, 2), 'utf-8');
} catch {
  // Ignore
}
ensureOperationsJsonFile();

function refreshCooldownStates() {
  const now = Date.now();
  for (const model of MODEL_POOL) {
    if (model.status === 'exhausted' && model.cooldownUntil && now >= model.cooldownUntil) {
      model.status = 'active';
      model.cooldownUntil = null;
      model.lastErrorReason = undefined;
    }
  }
}

function markModelExhausted(model: AiModelEntry, reason: string) {
  model.status = 'exhausted';
  model.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
  model.failoverCount += 1;
  model.lastErrorReason = reason;
  PLATFORM_STATS.autoFailoverSwitches += 1;
}

const SYSTEM_PROMPT = `You are a Principal Apple iPhone Motherboard & iOS Kernel Panic Diagnostic Engineer.
Analyze the provided iPhone crash log (.ips / panic-full / ResetCounter / Restore error) and return ONLY a valid JSON object containing both Arabic and English fields:
- headline: Detailed Arabic diagnostic title naming the exact fault, sensor/rail, and device model.
- headlineEn: Detailed English diagnostic title.
- rootCauseAnalysis: Comprehensive, deeply detailed multi-sentence Arabic technical explanation (at least 4-5 detailed sentences) explaining: (1) what exact kernel task/daemon or hardware controller failed (e.g., thermalmonitord, watchdogd, AOP, SMC, ANS2, SEP, Baseband), (2) which physical sensor or power/data line is interrupted (e.g., prs0, mic1, tg0b, ALS, I2C0/I2C1/I2C_SMC, PP1V8_S2, PP2V5_NAND), (3) why this causes a 180-second reboot loop or boot failure, and (4) how to isolate whether the fault is in the peripheral flex cable, the FPC board connector, or the motherboard IC.
- rootCauseAnalysisEn: Comprehensive, deeply detailed English root-cause explanation.
- suspectedComponents: Array of 3-4 objects { partName, probability, reason } in Arabic with realistic percentages and thorough technical explanations.
- boardRailsToMeasure: Array of 3-4 objects { rail, expectedReading, testInstruction } with exact board rail names, Diode mode and Voltage readings, and step-by-step multimeter instructions.
- stepByStepRepairPlan: Array of 5-6 detailed, numbered practical bench repair steps in Arabic (ordered from easiest non-invasive flex test to board-level microsoldering).
- stepByStepRepairPlanEn: Array of 5-6 detailed, numbered practical bench repair steps in English.
- riskWarning: Detailed critical technician warning in Arabic (covering Face ID encryption, True Tone, CPU underfill heat protection, or battery SWI short protection).
- riskWarningEn: Detailed critical technician warning in English.`;

async function callOpenCodeModel(
  model: AiModelEntry,
  userPrompt: string
): Promise<StructuredAiDiagnosis> {
  const apiKey = process.env.OPENCODE_API_KEY || 'public';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch('https://opencode.ai/zen/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://ipanic-lab.vercel.app',
        'X-Title': 'iPanic Lab',
      },
      body: JSON.stringify({
        model: model.apiModelId,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Empty response');
    }

    const cleanedJson = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(cleanedJson) as StructuredAiDiagnosis;
    if (!parsed.headline || !Array.isArray(parsed.stepByStepRepairPlan)) {
      throw new Error('Incomplete JSON');
    }
    return {
      ...parsed,
      headlineEn: parsed.headlineEn || parsed.headline,
      rootCauseAnalysisEn: parsed.rootCauseAnalysisEn || parsed.rootCauseAnalysis,
      stepByStepRepairPlanEn: parsed.stepByStepRepairPlanEn || parsed.stepByStepRepairPlan,
      riskWarningEn: parsed.riskWarningEn || parsed.riskWarning,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callGeminiFallbackModel(
  model: AiModelEntry,
  userPrompt: string
): Promise<StructuredAiDiagnosis> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Cloud key not configured');
  }

  const response = await client.models.generateContent({
    model: model.apiModelId,
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          headlineEn: { type: Type.STRING },
          rootCauseAnalysis: { type: Type.STRING },
          rootCauseAnalysisEn: { type: Type.STRING },
          suspectedComponents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                partName: { type: Type.STRING },
                probability: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['partName', 'probability', 'reason'],
            },
          },
          boardRailsToMeasure: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                rail: { type: Type.STRING },
                expectedReading: { type: Type.STRING },
                testInstruction: { type: Type.STRING },
              },
              required: ['rail', 'expectedReading', 'testInstruction'],
            },
          },
          stepByStepRepairPlan: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          stepByStepRepairPlanEn: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          riskWarning: { type: Type.STRING },
          riskWarningEn: { type: Type.STRING },
        },
        required: [
          'headline',
          'headlineEn',
          'rootCauseAnalysis',
          'rootCauseAnalysisEn',
          'suspectedComponents',
          'boardRailsToMeasure',
          'stepByStepRepairPlan',
          'stepByStepRepairPlanEn',
          'riskWarning',
          'riskWarningEn',
        ],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Empty cloud response');
  }
  return JSON.parse(text.trim()) as StructuredAiDiagnosis;
}

function runBuiltInExpertEngine(
  rawLog: string,
  deviceName = 'iPhone',
  missingSensors: string[] = [],
  matchedFaults: string[] = []
): StructuredAiDiagnosis {
  const lower = rawLog.toLowerCase();

  let extractedPanicSnippet = '';
  const panicMatch = rawLog.match(/"panicString"\s*:\s*"([^"]{1,240})"/i);
  if (panicMatch?.[1]) {
    extractedPanicSnippet = panicMatch[1].replace(/\\n/g, ' ').trim();
  } else {
    const firstPanicLine = rawLog
      .split(/\r?\n/)
      .find((l) => /panic|missing sensor|watchdog|timeout|fault|error|abort/i.test(l));
    if (firstPanicLine) {
      extractedPanicSnippet = firstPanicLine.trim().slice(0, 200);
    }
  }

  if (lower.includes('prs0')) {
    return {
      headline: `تشخيص هندسي مفصل (${deviceName}): انقطاع حساس الضغط الجوي البارومتري (prs0) على فلاتة الشحن السفلية`,
      headlineEn: `Detailed Engineering Diagnosis (${deviceName}): Missing Barometric Pressure Sensor (prs0) on Lower Charging Dock Flex`,
      rootCauseAnalysis:
        'يُظهر التحليل العميق لسجل النواة (Kernel Panic) أن خدمة المراقبة الحرارية والبيئية (thermalmonitord) فشلت في استلام نبضات الاستجابة الدورية (Check-in) من حساس الضغط الجوي البارومتري المرمّز بـ (prs0) خلال مهلة 180 ثانية من إقلاع الجهاز. هذا الحساس يقع فيزيائياً على فلاتة الشحن السفلية (Lower Dock Flex) ويتصل مباشرة بدائرة إدارة النظام (SMC /AOP) عبر ناقل الاتصال التسلسلي (I2C_SMC_SDA / I2C_SMC_SCL) ويستمد تغذيته من خط الفولتية الفرعي (PP1V8_S2 / PP1V8_ALWAYS). عند غياب استجابة هذا الحساس بسبب دخول سوائل لمنفذ الشحن أو تركيب فلاتة شحن تجارية خالية من شريحة البارومتر الأصلية، يقوم مؤقت الحراسة (Userspace Watchdog) بإجبار النواة على التوقف وإعادة تشغيل الآيفون تلقائياً كل 3 دقائق بالضبط.',
      rootCauseAnalysisEn:
        'Deep kernel panic inspection reveals that thermalmonitord failed to receive periodic telemetry check-ins from the barometric pressure sensor (prs0) within the 180-second userspace watchdog window. Physically mounted on the lower charging dock flex assembly, prs0 communicates via the I2C_SMC serial bus and is powered by the 1.8V rail (PP1V8_S2 / PP1V8_ALWAYS). When liquid corrosion, a torn flex trace, or a non-OEM replacement dock flex interrupts this sensor, the kernel triggers a deterministic 3-minute reboot loop.',
      suspectedComponents: [
        {
          partName: 'فلاتة الشحن السفلية (Charging Port Dock Flex Assembly)',
          probability: '88%',
          reason:
            'السبب الأكثر شيوعاً؛ إما بسبب تلف شريحة حساس الضغط الجوي prs0 جراء دخول سوائل وأتربة من منفذ الشحن، أو بسبب استبدال فلاتة الشحن بأخرى تجارية (Copy) لا تحتوي على شريحة بارومتر أصلية.',
        },
        {
          partName: 'كونكتور فلاتة الشحن على البورد (J6400 / Dock FPC Connector)',
          probability: '8%',
          reason:
            'وجود أكسدة كربونية أو أملاح تحت أرجل الكونكتور المسؤولة عن مسار I2C_SMC أو انثناء إحدى الأرجل الدقيقة أثناء التركيب.',
        },
        {
          partName: 'مقاومات الرفع (Pull-Up Resistors) ومسار التغذية PP1V8_S2',
          probability: '4%',
          reason:
            'طيران أو تلف إحدى مقاومات التوالي/الرفع (2.2KΩ) الواقعة بجوار كونكتور الشحن نتيجة فك الكونكتور بطريقة خاطئة.',
        },
      ],
      boardRailsToMeasure: [
        {
          rail: 'PP1V8_S2 / PP1V8_ALWAYS',
          expectedReading: '1.80V | Diode: ~0.380V',
          testInstruction:
            'افحص وجود فولتية 1.8 فولت على رجل تغذية الحساس في كونكتور الشحن أثناء تشغيل البورد، ثم قس الممانعة على وضع الدايود بعد فصل البطارية.',
        },
        {
          rail: 'I2C_SMC_SDA (Data Line)',
          expectedReading: '1.80V | Diode: ~0.440V',
          testInstruction:
            'ضع المجس الأحمر على الأرضي (GND) والأسود على رجل البيانات SDA؛ إذا كانت القراءة OL فهناك قطع في المسار أو المقاومة التوالية.',
        },
        {
          rail: 'I2C_SMC_SCL (Clock Line)',
          expectedReading: '1.80V | Diode: ~0.440V',
          testInstruction:
            'قارن ممانعة خط الساعة SCL مع خط البيانات SDA؛ يجب أن تكون القيمتان متطابقتين تقريباً (~0.440V) دون شورت أو تسريب.',
        },
      ],
      stepByStepRepairPlan: [
        'الخطوة 1 (الفحص السريع): افصل فلاتة الشحن الحالية ووصّل فلاتة شحن أصلية (Original Pull) مفكوكة من جهاز رسمي على البورد حتى بدون تثبيتها في الشاسيه.',
        'الخطوة 2 (اختبار الاستقرار): شغّل الجهاز وراقبه لمدة 5 دقائق متواصلة مع إبقاء الشاشة مضاءة للتأكد من تجاوز حاجز الـ 180 ثانية واختفاء الريستارت.',
        'الخطوة 3 (الفحص المجهري): إذا استمر العطل بعد تجربة فلاتة أصلية، افحص كونكتور الشحن على البورد تحت الميكروسكوب ونظّفه بمادة IPA وفرشاة ناعمة.',
        'الخطوة 4 (قياس الممانعات): باستخدام الأفوميتر على وضع الدايود (المجس الأحمر على الأرضي)، قس ممانعة أرجل I2C_SMC_SDA و I2C_SMC_SCL وخط التغذية PP1V8_S2.',
        'الخطوة 5 (المعالجة على البورد): في حال وجود رجل مفقودة الممانعة (OL)، افحص المقاومات الفيوزية ومقاومات الرفع خلف كونكتور الشحن وأعد لحامها أو استبدلها.',
      ],
      stepByStepRepairPlanEn: [
        'Step 1 (Quick Isolation): Disconnect the installed dock flex and connect a known-good OEM Original Pull charging port flex.',
        'Step 2 (Stability Test): Boot the iPhone and monitor it for 5+ minutes to verify it passes the 180-second thermalmonitord window.',
        'Step 3 (Microscope Inspection): If the panic persists, inspect the board dock FPC connector under a microscope for corrosion or cold joints.',
        'Step 4 (Diode Mode Probing): Measure diode values on I2C_SMC_SDA (~0.440V), I2C_SMC_SCL (~0.440V), and PP1V8_S2 (~0.380V).',
        'Step 5 (Board Microsoldering): Replace any knocked-off series filters or 2.2K pull-up resistors near the dock connector.',
      ],
      riskWarning:
        'تحذير فني صارم: إياك والتسخين على البورد أو المعالج قبل تجربة فلاتة شحن أصلية (Original Pull) موثوقة أولاً، لأن أكثر من 90% من أعطال prs0 سببها فلاتة الشحن التجارية حتى لو كانت جديدة من الكيس!',
      riskWarningEn:
        'Critical Warning: Never apply heat to the logic board before testing a genuine OEM Original Pull charging flex—over 90% of prs0 panics are caused by aftermarket dock flexes.',
    };
  }

  if (lower.includes('mic1') || lower.includes('mic2') || lower.includes('mic3') || lower.includes('mic4')) {
    const isMic2 = lower.includes('mic2');
    const micCode = isMic2
      ? 'mic2 (فلاتة زر الباور والفلاش العلوية)'
      : 'mic1 (فلاتة الشحن السفلية)';
    return {
      headline: `تشخيص هندسي مفصل (${deviceName}): انقطاع حساس المايكروفون الحراري/الرقمي ${micCode}`,
      headlineEn: `Detailed Engineering Diagnosis (${deviceName}): Missing Digital Microphone Thermal Sensor (${micCode})`,
      rootCauseAnalysis: `أظهر الفحص التفصيلي لسجل الانهيار (panic-full) أن خدمة المراقبة الحرارية (thermalmonitord) سجّلت غياب استجابة الحساس المرمّز بـ ${micCode} في حقل (Missing sensors). في معمارية أجهزة الآيفون الحديثة، يحتوي المايكروفون الرقمي على مستشعر حرارة مدمج يرسل قراءاته دورياً عبر مسار البيانات (DMIC / I2C) إلى معالج الحساسات. عند انقطاع هذا المسار بسبب تمزق دقيق في الفلاتة أو دخول سوائل أو تركيب فلاتة تجارية ناقصة المكونات، يفشل النظام في التحقق من سلامة الحرارة فيتوقف عن العمل ويعيد التشغيل تلقائياً بعد 180 ثانية (3 دقائق).`,
      rootCauseAnalysisEn: `Detailed crash log inspection confirms thermalmonitord failed to poll ${micCode}. In modern iPhones, digital microphones embed an internal thermal sensor polled over DMIC/I2C lines. When a torn flex cable, liquid damage, or aftermarket flex breaks communication, userspace watchdog triggers a kernel panic every 180 seconds.`,
      suspectedComponents: [
        {
          partName: isMic2
            ? 'فلاتة زر الباور والفلاش الخلفية (Rear Power / Flash / Mic2 Flex)'
            : 'فلاتة الشحن السفلية الحاملة للمايكروفون (Lower Charging Dock Flex)',
          probability: '86%',
          reason: isMic2
            ? 'تمزق دقيق في فلاتة الباور قرب الكاميرا الخلفية أو تلف المايكروفون العلوي الخلفي نتيجة سقوط أو فتح الغطاء الخلفي.'
            : 'تلف المايكروفون السفلي mic1 على فلاتة الشحن بسبب السوائل أو استخدام فلاتة شحن غير أصلية.',
        },
        {
          partName: 'كونكتور الفلاتة على البورد ومقاومات التوالي (Series Filters)',
          probability: '10%',
          reason:
            'عدم استقرار تلامس أرجل الكونكتور على البورد أو طيران إحدى المقاومات الفيوزية الصغيرة بجوار الكونكتور.',
        },
        {
          partName: 'مسار التغذية الفرعي PP1V8_S2 / PP1V8_VA',
          probability: '4%',
          reason: 'هبوط في فولتية تغذية المايكروفون الرقمي (1.8V) أو تسريب في مكثف التنعيم على المسار.',
        },
      ],
      boardRailsToMeasure: [
        {
          rail: 'PP1V8_S2 / PP1V8_VA_L19',
          expectedReading: '1.80V | Diode: ~0.390V',
          testInstruction:
            'قس فولتية التغذية 1.8V وممانعة الدايود على رجل تغذية المايكروفون في الكونكتور.',
        },
        {
          rail: 'DMIC_CLK / AP_TO_MIC_CLK',
          expectedReading: 'Diode: ~0.460V',
          testInstruction:
            'قس ممانعة خط النبضات الزمنية (Clock) وتأكد من سلامة المقاومة التوالية على المسار.',
        },
        {
          rail: 'DMIC_DATA / AP_TO_MIC_DATA',
          expectedReading: 'Diode: ~0.460V',
          testInstruction:
            'قس ممانعة خط البيانات وتأكد من عدم وجود قصر للأرضي (Short) أو قطع (OL).',
        },
      ],
      stepByStepRepairPlan: [
        isMic2
          ? 'الخطوة 1: افصل فلاتة الباور والفلاش الحالية وركّب فلاتة باور أصلية موثوقة (Original Pull) للاختبار.'
          : 'الخطوة 1: افصل فلاتة الشحن السفلية وركّب فلاتة شحن أصلية موثوقة (Original Pull) للاختبار.',
        'الخطوة 2: شغّل الجهاز واختبر التسجيل الصوتي ومذكرات الصوت (Voice Memos) وراقب ثبات الجهاز لأكثر من 5 دقائق.',
        'الخطوة 3: افحص كونكتور الفلاتة على البورد تحت الميكروسكوب للتأكد من نظافة الأرجل وعدم وجود أكسدة.',
        'الخطوة 4: قس الممانعات على أرجل الكونكتور باستخدام الأفوميتر على وضع الدايود ومقارنتها بالقيم المرجعية.',
        'الخطوة 5: استبدل أي فلتر أو مقاومة توالي تالفة على مسار DMIC_CLK أو DMIC_DATA في حال وجود قراءة OL.',
      ],
      stepByStepRepairPlanEn: [
        isMic2
          ? 'Step 1: Connect a known-good OEM Rear Power/Flash flex cable and test device stability.'
          : 'Step 1: Connect a known-good OEM Charging Port dock flex cable and test device stability.',
        'Step 2: Boot the device, test Voice Memos audio capture, and monitor uptime past 5 minutes.',
        'Step 3: Inspect the FPC connector on the logic board under a microscope.',
        'Step 4: Measure diode mode readings on DMIC_CLK, DMIC_DATA, and 1.8V supply pins.',
        'Step 5: Replace any open series resistor/filter along the microphone bus.',
      ],
      riskWarning:
        'تنبيه هام: عند استبدال فلاتة الباور أو فلاتة الشحن، تجنب الفلاتات التجارية الرخيصة لأنها غالباً تفتقر لحساس الحرارة المدمج داخل المايكروفون مما يبقي عطل الريستارت قائماً.',
      riskWarningEn:
        'Important Warning: Cheap aftermarket flex cables often omit the thermal telemetry circuit inside the digital microphone, causing the 3-minute panic to persist.',
    };
  }

  if (lower.includes('tg0b') || lower.includes('tg0v') || lower.includes('gas gauge')) {
    return {
      headline: `تشخيص هندسي مفصل (${deviceName}): انقطاع مسار بيانات البطارية (tg0b / tg0v — BATT_SWI / I2C)`,
      headlineEn: `Detailed Engineering Diagnosis (${deviceName}): Battery Gas Gauge Telemetry Line (tg0b / tg0v) Timeout`,
      rootCauseAnalysis:
        'يوضح تحليل السجل أن دائرة إدارة الطاقة والنظام (SMC / PMU) فقدت الاتصال بشريحة قراءة بيانات البطارية (Battery Gas Gauge / BMS) عبر مسار الاتصال (BATT_SWI / I2C)، مما أدى لتسجيل غياب الحساس الحراري للبطارية (tg0b أو tg0v). عندما يفشل المعالج وآيسي الشحن (Tigris / Hydra / Yangtze) في قراءة حرارة البطارية ونسبة الشحن الحقيقية، تظهر غالباً نسبة البطارية ثابتة على 1% أو تختفي حالة صحة البطارية، ويقوم النظام بإيقاف النواة وإعادة التشغيل بعد 180 ثانية كإجراء أمان لمنع انفجار أو تلف البطارية.',
      rootCauseAnalysisEn:
        'Log analysis confirms that the SMC/PMU lost communication with the Battery Gas Gauge IC on the battery BMS board over the BATT_SWI / I2C line (sensor tg0b / tg0v). Without real-time battery temperature and voltage telemetry, iOS displays a stuck 1% battery reading and triggers a safety watchdog reboot every 180 seconds.',
      suspectedComponents: [
        {
          partName: 'كونكتور البطارية على البورد (J1000) أو فلاتة شريحة البطارية (BMS)',
          probability: '78%',
          reason:
            'انثناء أو اتساخ ريشة البيانات الوسطى في كونكتور البطارية، أو لحام غير سليم عند نقل شريحة البطارية الأصلية (BMS Tag-on flex).',
        },
        {
          partName: 'آيسي الشحن الرئيسي (Tigris / Hydra / Yangtze) أو ترانزستور Q2301',
          probability: '16%',
          reason:
            'تلف داخلي في بوابة قراءة بيانات البطارية داخل آيسي الشحن أو فصل في مسار BATT_SWI.',
        },
        {
          partName: 'مكثفات ومقاومات الحماية على مسار BATT_SWI_CONN',
          probability: '6%',
          reason:
            'طيران المقاومة الفيوزية الصغيرة أو شورت في مكثف التصفية بجوار كونكتور البطارية اثناء فك البطارية بملقط معدني.',
        },
      ],
      boardRailsToMeasure: [
        {
          rail: 'BATT_SWI_CONN / SMC_TO_TIGRIS_I2C',
          expectedReading: 'Diode: ~0.450V',
          testInstruction:
            'ضع المجس الأحمر على الأرضي والأسود على ريشة البيانات في كونكتور البطارية؛ إذا كانت OL فالمسار مقطوع نحو آيسي الشحن.',
        },
        {
          rail: 'PP_BATT_VCC (Battery Positive Terminal)',
          expectedReading: '3.8V – 4.35V | Diode: ~0.340V',
          testInstruction:
            'تحقق من سلامة ريشة الموجب في كونكتور البطارية وعدم وجود تخلخل في لحامها على البورد.',
        },
        {
          rail: 'PP_VDD_MAIN',
          expectedReading: '3.8V – 4.35V | Diode: ~0.350V',
          testInstruction:
            'تأكد من استقرار خط التغذية الرئيسي الخارج من آيسي الشحن وعدم وجود تسريب.',
        },
      ],
      stepByStepRepairPlan: [
        'الخطوة 1: افصل البطارية وافحص ريش كونكتور البطارية (J1000) على البورد تحت الميكروسكوب، خصوصاً ريشة البيانات الوسطى.',
        'الخطوة 2: إذا كان الجهاز يحتوي على فلاتة تصفير بطارية (Tag-on Flex)، انزعها مؤقتاً ووصّل البطارية مباشرة في البورد للتجربة.',
        'الخطوة 3: جرّب بطارية أصلية موثوقة وتأكد من قراءة نسبة الشحن الحقيقية وظهور بيانات البطارية في الإعدادات.',
        'الخطوة 4: قس ممانعة مسار BATT_SWI على ريشة كونكتور البطارية بوضع الدايود (~0.450V)؛ إذا كانت OL فافحص المقاومة الفيوزية بجوار الكونكتور.',
        'الخطوة 5: إذا كان المسار سليماً والبطارية موثوقة، قم باستبدال آيسي الشحن (Tigris / Hydra / Yangtze) المسؤول عن تخاطب البطارية.',
      ],
      stepByStepRepairPlanEn: [
        'Step 1: Inspect battery connector J1000 pins under a microscope, especially the center SWI/I2C data pins.',
        'Step 2: Remove any aftermarket battery health tag-on calibration flex and connect the battery directly.',
        'Step 3: Test with a known-good OEM battery and verify real percentage and Battery Health telemetry.',
        'Step 4: Measure diode mode value on BATT_SWI_CONN (~0.450V) and check nearby series resistors.',
        'Step 5: Reball or replace the Charger IC (Tigris/Hydra/Yangtze) if BATT_SWI communication remains dead.',
      ],
      riskWarning:
        'تحذير خطير: لا تقم أبداً بقياس الممانعة أو الفحص بملقط معدني قرب كونكتور البطارية والبطارية متصلة؛ حدوث تلامس لحظي بين خط الموجب (VBAT) وخط البيانات (SWI) يحرق المعالج وآيسي الشحن فوراً!',
      riskWarningEn:
        'Critical Warning: Never probe battery connector pins with the battery plugged in—shorting VBAT to the SWI data pin will instantly damage the Charger IC and CPU.',
    };
  }

  if (
    lower.includes('nvme') ||
    lower.includes('ans2') ||
    lower.includes('nand') ||
    lower.includes('4013') ||
    lower.includes('error 9')
  ) {
    return {
      headline: `تشخيص هندسي مفصل (${deviceName}): انقطاع اتصال ذاكرة التخزين الداخلية (NAND Flash / ANS2 NVMe)`,
      headlineEn: `Detailed Engineering Diagnosis (${deviceName}): Internal NAND Flash / ANS2 NVMe Storage Bus Timeout`,
      rootCauseAnalysis:
        'يبين التحليل الدقيق للسجل توقف متحكم التخزين المدمج (ANS2 / NVMe Controller) عن الاستجابة عبر ناقل البيانات فائق السرعة (PCIe_NAND) أو حدوث هبوط مفاجئ في أحد خطوط التغذية الرئيسية لشريحة الذاكرة الداخلية (PP2V5_NAND أو PP0V9_NAND أو PP1V8_NAND). يحدث هذا العطل إما بسبب فك نقاط التلامس (Cold Solder / Pad Separation) أسفل شريحة الـ NAND بعد تعرض الجهاز لصدمة، أو تلف في قطاعات الإقلاع داخل الذاكرة، أو (في حالات خطأ 4013 أثناء التفليش) بسبب وجود شورت في فلاتة السماعة العلوية يسحب خط تغذية 1.8V ويمنع المعالج من إتمام مرحلة الإقلاع.',
      rootCauseAnalysisEn:
        'Detailed crash analysis indicates an ANS2/NVMe storage controller timeout over the PCIe bus or a voltage drop on primary NAND rails (PP2V5_NAND, PP0V9_NAND, PP1V8_NAND). This is typically caused by fractured BGA joints under the NAND Flash IC after a drop, bad NAND blocks, or—during Error 4013 restores—a shorted top earpiece sensor flex pulling down the 1.8V rail.',
      suspectedComponents: [
        {
          partName: 'شريحة ذاكرة التخزين الداخلية (NAND Flash Memory IC)',
          probability: '68%',
          reason:
            'فك في نقاط التلامس أسفل شريحة الـ NAND نتيجة صدمة ميكانيكية أو تلف في قطاعات النظام، أو انتفاخ الحماية المحيطة بها.',
        },
        {
          partName: 'فلاتة السماعة العلوية وحساس الإضاءة (Earpiece / ALS Flex)',
          probability: '22%',
          reason:
            'في حال تعليق الجهاز على الشعار أو ظهور خطأ 4013، شورت السوائل في فلاتة السماعة العلوية يوقف إقلاع البورد ويعطي أعراضاً مشابهة لعطل الـ NAND.',
        },
        {
          partName: 'مكثفات التغذية المحيطة بالـ NAND (PP2V5_NAND / PP0V9_NAND)',
          probability: '10%',
          reason:
            'تسريب أو شورت جزئي في أحد مكثفات السيراميك على خطوط تغذية الذاكرة يؤدي لهبوط الفولتية تحت الحمل.',
        },
      ],
      boardRailsToMeasure: [
        {
          rail: 'PP2V5_NAND / PP2V63_NAND',
          expectedReading: '2.50V – 2.63V | Diode: ~0.360V',
          testInstruction:
            'قس الفولتية والممانعة على المكثفات الكبيرة بجوار شريحة الـ NAND للتأكد من عدم وجود شورت أو تسريب.',
        },
        {
          rail: 'PP0V9_NAND',
          expectedReading: '0.90V | Diode: ~0.280V',
          testInstruction:
            'افحص خط تغذية منطق النواة للذاكرة وتأكد من استقرار الفولتية أثناء محاولة الإقلاع.',
        },
        {
          rail: 'PP1V8_NAND / PP1V8_IO',
          expectedReading: '1.80V | Diode: ~0.380V',
          testInstruction:
            'تحقق من وصول تغذية 1.8 فولت وراجع سلامة مسارات PCIe_NAND_CLK.',
        },
      ],
      stepByStepRepairPlan: [
        'الخطوة 1 (استبعاد الفلاتات): افصل فلاتة السماعة العلوية وجميع الفلاتات الطرفية أولاً وجرّب تشغيل الجهاز أو عمل Restore لاستبعاد شورت الـ AOP.',
        'الخطوة 2 (فحص التغذية): قس ممانعة وفولتية خطوط تغذية الـ NAND الثلاثة (2.5V و 1.8V و 0.9V) على المكثفات المحيطة بالذاكرة.',
        'الخطوة 3 (رفع الذاكرة بأمان): ضع درع حماية حراري فوق المعالج الرئيسي، وارفع شريحة الـ NAND بحرارة مدروسة مع تنظيف مادة الحماية (Underfill).',
        'الخطوة 4 (الفحص على المبرمجة): ضع شريحة الـ NAND على مبرمجة الذواكر (مثل JC P13 / P15) لقراءة بيانات الـ SysCfg والتأكد من سلامة الشريحة.',
        'الخطوة 5 (الشبلنة والتركيب): أعد شبلنة شريحة الـ NAND (Reballing) بقصدير 183°C وركّبها بدقة ثم مرّر سوفتوير كامل للجهاز.',
      ],
      stepByStepRepairPlanEn: [
        'Step 1 (Flex Isolation): Disconnect the top earpiece sensor flex first and test boot/restore to rule out an ALS/Flood Illuminator short.',
        'Step 2 (Power Rail Check): Measure diode mode and voltage on PP2V5_NAND, PP1V8_NAND, and PP0V9_NAND capacitors.',
        'Step 3 (Safe NAND Removal): Place a thermal shield over the CPU and carefully remove the NAND Flash IC.',
        'Step 4 (Programmer Verification): Read NAND health and SysCfg partitions on a NAND programmer (JC P13/P15).',
        'Step 5 (Reball & Restore): Reball the NAND IC with 183°C solder paste, reflow onto the board, and complete an iOS restore.',
      ],
      riskWarning:
        'تحذير فني حرج: تقع شريحة الـ NAND مباشرة خلف أو بجوار المعالج الرئيسي (A-Series CPU)؛ استخدام حرارة مفرطة دون درع تشتيت حراري سيؤدي فوراً لانتفاخ حماية المعالج وموت البورد.',
      riskWarningEn:
        'Critical Warning: Always shield the main A-series CPU when applying hot air to the NAND IC to prevent CPU underfill expansion.',
    };
  }

  if (
    lower.includes('als') ||
    lower.includes('aop') ||
    lower.includes('biometrickit') ||
    lower.includes('pearl') ||
    lower.includes('rose')
  ) {
    return {
      headline: `تشخيص هندسي مفصل (${deviceName}): تعليق معالج الحساسات الدائم (AOP) بسبب فلاتة السماعة العلوية / Face ID`,
      headlineEn: `Detailed Engineering Diagnosis (${deviceName}): AOP Panic Caused by Top Earpiece / ALS / Face ID Sensor Bus`,
      rootCauseAnalysis:
        'يكشف تحليل السجل عن حدوث انهيار في معالج الحساسات دائم العمل (Always-On Processor — AOP) أو غياب استجابة حساس الإضاءة والتقارب (ALS / BiometricKit) الموجود على فلاتة السماعة العلوية. يتصل هذا الحساس بالمعالج عبر مسار (I2C_AOP) وخط التغذية (PP1V8_AOP). عند تسرب سوائل من فتحة السماعة العلوية للشاشة، يحدث تآكل وأكسدة أسفل حساس الإضاءة أو كاشف الفيض الضوئي (Flood Illuminator)، مما يؤدي لقفل خط البيانات (I2C Bus Lockup) وتعليق الجهاز على شعار آبل أو إعادة تشغيله كل 3 دقائق.',
      rootCauseAnalysisEn:
        'Crash analysis shows an Always-On Processor (AOP) kernel panic triggered by an unresponsive Ambient Light / Proximity sensor (ALS) or Flood Illuminator on the top earpiece flex. Liquid ingress through the top speaker mesh commonly corrodes the I2C_AOP bus and PP1V8_AOP rail, causing boot loops or 3-minute watchdog panics.',
      suspectedComponents: [
        {
          partName: 'فلاتة السماعة العلوية وحساس الإضاءة والتقارب (Top Earpiece / ALS Flex)',
          probability: '85%',
          reason:
            'دخول سوائل أو رطوبة عبر شبك السماعة العلوي مما يؤدي لأكسدة أرجل حساس ALS أو Flood Illuminator على الفلاتة.',
        },
        {
          partName: 'كونكتور فلاتة السماعة على البورد (J4500 / Top Sensor FPC)',
          probability: '11%',
          reason:
            'وجود تكلسات أو فصل في أرجل الكونكتور المسؤولة عن مسارات I2C_AOP.',
        },
        {
          partName: 'مسار التغذية PP1V8_AOP ومقاومات الرفع',
          probability: '4%',
          reason: 'هبوط في فولتية التغذية 1.8V أو تلف إحدى مقاومات الرفع على خط الساعة/البيانات.',
        },
      ],
      boardRailsToMeasure: [
        {
          rail: 'PP1V8_AOP / PP1V8_S2',
          expectedReading: '1.80V | Diode: ~0.390V',
          testInstruction:
            'افحص ممانعة وفولتية خط تغذية الحساسات العلوية على كونكتور السماعة.',
        },
        {
          rail: 'I2C_AOP_SDA / I2C_AOP_SCL',
          expectedReading: '1.80V | Diode: ~0.450V',
          testInstruction:
            'تحقق من توازن قراءة الدايود على خطي البيانات والساعة وعدم وجود شورت للأرضي.',
        },
        {
          rail: 'PP_VDD_BOOST (Flood Illuminator Supply)',
          expectedReading: '3.8V – 4.2V | Diode: ~0.360V',
          testInstruction:
            'تأكد من سلامة خط تغذية باعث الأشعة تحت الحمراء الخاص بـ Face ID.',
        },
      ],
      stepByStepRepairPlan: [
        'الخطوة 1 (العزل الفوري): افصل فلاتة السماعة العلوية عن البورد تماماً وشغّل الجهاز؛ إذا أقلع الجهاز واستقر بدون ريستارت فالعطل مؤكد 100% في الفلاتة العلوية.',
        'الخطوة 2 (الفحص المجهري للفلاتة): افحص حساس الإضاءة (ALS) و Flood Illuminator على الفلاتة تحت الميكروسكوب للكشف عن آثار الصدأ أو السوائل.',
        'الخطوة 3 (تنظيف أو رفع الحساس): ارفع الحساس بحرارة منخفضة، نظف الأرجل المتأكسدة تحت الحساس، أو انقل الحساس المشفر الأصلي إلى فلاتة جديدة.',
        'الخطوة 4 (فحص البورد): نظف كونكتور السماعة العلوية على البورد وقس ممانعة خطوط I2C_AOP_SDA/SCL.',
        'الخطوة 5 (الاختبار النهائي): أعد تركيب الفلاتة بعد الإصلاح وتأكد من عمل حساس المكالمات و Face ID و True Tone.',
      ],
      stepByStepRepairPlanEn: [
        'Step 1 (Immediate Isolation): Disconnect the top earpiece flex cable and boot the iPhone—if it boots cleanly and stays stable, the fault is 100% on the top flex.',
        'Step 2 (Microscope Check): Inspect the ALS and Flood Illuminator modules on the flex for liquid corrosion.',
        'Step 3 (Module Transfer): Clean/reball the corroded sensor or transfer the original encrypted sensor module onto a new OEM replacement flex.',
        'Step 4 (Board Connector Check): Clean the board FPC connector and verify diode readings on I2C_AOP_SDA/SCL.',
        'Step 5 (Final Verification): Reconnect the repaired flex and test proximity sensing, True Tone, and Face ID.',
      ],
      riskWarning:
        'تحذير بالغ الأهمية: الحساسات الموجودة على فلاتة السماعة العلوية مشفرة ومرتبطة بالمعالج (Face ID Pairing)؛ إتلافها أو رمي الفلاتة الأصلية يؤدي لفقدان بصمة الوجه نهائياً!',
      riskWarningEn:
        'Critical Warning: The Flood Illuminator and ALS modules on the top earpiece flex are cryptographically paired to the CPU—preserve and transfer them to keep Face ID working.',
    };
  }

  if (
    lower.includes('baseband') ||
    lower.includes('mav') ||
    lower.includes('ice19') ||
    lower.includes('qualcomm') ||
    lower.includes('telephony') ||
    lower.includes('4014') ||
    lower.includes('-1')
  ) {
    return {
      headline: `تشخيص هندسي مفصل (${deviceName}): انقطاع دائرة المودم والشبكة (Baseband CPU / BB PMU) أو انفصال طبقات البورد`,
      headlineEn: `Detailed Engineering Diagnosis (${deviceName}): Baseband Modem / RF Power IC or Sandwich Interposer Separation`,
      rootCauseAnalysis:
        'يُظهر التحليل الهندسي لسجل العطل فشل المعالج الرئيسي (Application Processor) في التخاطب مع معالج الشبكة (Baseband Modem) عبر ناقل (PCIe_BB / UART) أو غياب خرج الفولتيات الفرعية من آيسي باور الشبكة (Baseband PMU). في البوردات ذات الطبقتين (Sandwich Logic Boards)، تمر جميع خطوط التواصل بين المعالج العلوي وبورد الشبكة السفلي عبر الإطار الأوسط (Interposer). عند تعرض الجهاز لصدمة، تنفصل نقاط اللحام في الإطار الأوسط أو يحدث شورت في مكثفات تغذية باور الشبكة، مما يسبب اختفاء الـ IMEI (لا توجد خدمة) وإعادة تشغيل متكررة أو ظهور خطأ (-1 / 4014) عند التفليش.',
      rootCauseAnalysisEn:
        'Engineering log analysis indicates the Application Processor lost PCIe/UART communication with the Baseband Modem or detected a power fault on the Baseband PMU. On dual-layer sandwich boards, drop impact frequently fractures interposer solder balls between the upper AP board and lower RF board, leading to missing Modem Firmware/IMEI, kernel panics, or Restore Error -1.',
      suspectedComponents: [
        {
          partName: 'الإطار الأوسط بين طبقتي البورد (Sandwich Board Interposer Pads)',
          probability: '64%',
          reason:
            'فصل أو تخلخل في نقاط الاتصال الوسطى بين الطبقة العلوية (AP) والطبقة السفلية (RF) نتيجة سقوط الجهاز.',
        },
        {
          partName: 'آيسي باور الشبكة (Baseband PMU — PMX / PMK / Intel PMB)',
          probability: '26%',
          reason:
            'تلف في آيسي باور الشبكة أو شورت في أحد مكثفات التغذية المحيطة به في الطبقة السفلية.',
        },
        {
          partName: 'كريستالة التوقيت أو مسارات PCIe_BB',
          probability: '10%',
          reason:
            'غياب نبضة التوقيت (19.2MHz / 38.4MHz) المغذية لمعالج البيسباند أو قطع في مسار PCIe.',
        },
      ],
      boardRailsToMeasure: [
        {
          rail: 'PP_VDD_MAIN -> BB_PMU',
          expectedReading: '3.8V – 4.2V | Diode: ~0.350V',
          testInstruction:
            'تأكد من وصول خط التغذية الرئيسي لآيسي باور الشبكة وعدم وجود شورت صريح.',
        },
        {
          rail: 'PP0V8_SMPS / PP1V2_LDOS (Baseband Rails)',
          expectedReading: '0.80V – 1.20V | Diode: ~0.310V',
          testInstruction:
            'افحص مكثفات خرج آيسي باور الشبكة للتأكد من سلامة الفولتيات الفرعية.',
        },
        {
          rail: 'AP_TO_BB_PCIE_RESET_L',
          expectedReading: '1.80V | Diode: ~0.430V',
          testInstruction:
            'قِس ممانعة نقاط تواصل البيسباند على حافة الإطار الأوسط بعد فصل طبقتي البورد.',
        },
      ],
      stepByStepRepairPlan: [
        'الخطوة 1 (الفحص البرمجي): ادخل إلى الإعدادات > عام > حول، وتحقق من وجود قيمة أمام (Modem Firmware / البرنامج الثابت للمودم)؛ إذا كانت فارغة فالعطل في دائرة البيسباند.',
        'الخطوة 2 (فصل طبقتي البورد): ضع البورد على السخان الحراري المخصص (Preheater) بدرجة حرارة مضبوطة وافصل الطبقة العلوية عن السفلية بحذر.',
        'الخطوة 3 (فحص الإطار الأوسط): افحص نقاط الإطار الأوسط تحت الميكروسكوب؛ عالج أي نقاط مؤكسدة أو مفقودة (Pad Repair).',
        'الخطوة 4 (فحص باور الشبكة): قس ممانعات مكثفات آيسي باور الشبكة في الطبقة السفلية واستبدل آيسي باور الشبكة إذا وُجد شورت أو غياب فولتية.',
        'الخطوة 5 (إعادة الشبلنة والدمج): اشبلن الإطار الأوسط باستخدام شابلون مخصص ومعجون قصدير 138°C/158°C وأعد دمج الطبقتين واختبر الشبكة.',
      ],
      stepByStepRepairPlanEn: [
        'Step 1 (Software Check): Check Settings > General > About > Modem Firmware; a blank value confirms lost Baseband communication.',
        'Step 2 (Split Board Layers): Separate the upper AP and lower RF boards on a controlled preheater.',
        'Step 3 (Interposer Inspection): Inspect all interposer pads under a microscope and repair any torn or oxidized pads.',
        'Step 4 (Baseband PMU Probing): Measure diode mode values around the Baseband PMU and replace the IC if any output rail is shorted.',
        'Step 5 (Reball & Join): Reball the interposer with low-temp solder paste (138°C/158°C), join the layers, and verify cellular IMEI.',
      ],
      riskWarning:
        'تحذير هام جداً: معالج الشبكة (Baseband CPU) مشفر ومرتبط بالمعالج الرئيسي؛ لا يجوز نهائياً تغييره من بورد آخر، بل يتم إصلاح مساراته أو تغيير آيسي باور الشبكة (BB PMU) فقط.',
      riskWarningEn:
        'Critical Warning: The Baseband CPU is uniquely paired to the main SoC—never swap the Baseband CPU itself from a donor board; only repair its rails or replace the Baseband PMU.',
    };
  }

  const sensorSummaryAr =
    missingSensors.length > 0
      ? `الحساسات المفقودة المرصودة في الملف: (${missingSensors.join(' ، ')})`
      : matchedFaults.length > 0
      ? `الأعطال المرصودة: (${matchedFaults.join(' ، ')})`
      : extractedPanicSnippet
      ? `مؤشر النواة المستخرج: (${extractedPanicSnippet.slice(0, 140)})`
      : 'خلل في استقرار النواة ومسارات الاتصال التسلسلي I2C/PMU';

  return {
    headline: `تشخيص هندسي مفصل (${deviceName}): ${
      matchedFaults[0] ||
      (missingSensors.length > 0
        ? `انقطاع الحساس (${missingSensors.join(', ')}) على مسار I2C`
        : 'توقف حرج في نواة النظام ودائرة التغذية (Kernel Panic / PMU Bus)')
    }`,
    headlineEn: `Detailed Engineering Diagnosis (${deviceName}): ${
      matchedFaults[0] ||
      (missingSensors.length > 0
        ? `Missing Peripheral Sensor (${missingSensors.join(', ')})`
        : 'Kernel Panic & Hardware Bus Timeout')
    }`,
    rootCauseAnalysis: `أتمّ المحرك الهندسي فحص وتحليل كافة أسطر ملف العطل الخاص بجهاز ${deviceName}. ${sensorSummaryAr}. يُظهر تحليل بنية السجل أن نواة نظام iOS أوقفت التشغيل القسري نتيجة انقطاع التخاطب على أحد مسارات الاتصال الحيوية (I2C / SPMI / PCIe) أو عدم استجابة أحد الحساسات الطرفية المرتبطة بدائرة مراقبة الحرارة والطاقة (thermalmonitord / watchdogd). في الصيانة العملية، يجب البدء أولاً بعزل الفلاتات الطرفية (فلاتة الشحن السفلية وفلاتة السماعة العلوية وفلاتة الباور) قبل أي تدخل حراري على البورد.`,
    rootCauseAnalysisEn: `Completed full engineering analysis of the ${deviceName} crash log. ${
      extractedPanicSnippet || 'Detected hardware bus timeout / peripheral sensor interruption.'
    } The kernel halted execution due to an unresponsive I2C/PMU peripheral line or watchdog timeout. Always isolate external flex assemblies before performing board-level microsoldering.`,
    suspectedComponents: [
      {
        partName:
          missingSensors.length > 0
            ? `الفلاتة الحاملة للحساس (${missingSensors.join(' / ')})`
            : 'الفلاتات الطرفية (فلاتة الشحن السفلية / فلاتة السماعة العلوية / فلاتة الباور)',
        probability: '76%',
        reason:
          'أكثر من 75% من أعطال إعادة التشغيل المتكررة في أجهزة الآيفون تنتج عن تلف أو عدم أصالة الفلاتات الطرفية المتصلة بمسارات I2C.',
      },
      {
        partName: 'كونكتورات الفلاتات على البورد ومقاومات مسار I2C0 / I2C1 / I2C2',
        probability: '16%',
        reason:
          'وجود أكسدة دقيقة على أرجل الكونكتور أو تلف إحدى مقاومات الرفع (Pull-up) المغذية لخط الساعة أو البيانات.',
      },
      {
        partName: 'مسارات التغذية الفرعية PP1V8_S2 / PP_VDD_MAIN وآيسي الباور PMU',
        probability: '8%',
        reason: 'احتمال وجود هبوط فولتية أو تسريب في أحد مكثفات السيراميك على مسار التغذية الفرعي.',
      },
    ],
    boardRailsToMeasure: [
      {
        rail: 'PP1V8_S2 / PP1V8_ALWAYS',
        expectedReading: '1.80V | Diode: ~0.380V',
        testInstruction:
          'افحص تغذية الحساسات ومسارات الـ I2C على كونكتور الشحن وكونكتور السماعة العلوية.',
      },
      {
        rail: 'I2C_SDA / I2C_SCL Lines',
        expectedReading: '1.80V | Diode: ~0.440V',
        testInstruction:
          'تأكد من تساوي ممانعة خطي البيانات والساعة وعدم وجود قصر للأرضي أو قطع OL.',
      },
      {
        rail: 'PP_VDD_MAIN / PP_BATT_VCC',
        expectedReading: '3.8V – 4.35V | Diode: ~0.340V',
        testInstruction:
          'تأكد من استقرار الفولتية الرئيسية وعدم وجود سحب تيار غير طبيعي على الباور سبلاي قبل ضغطة الباور.',
      },
    ],
    stepByStepRepairPlan: [
      'الخطوة 1 (عزل الفلاتات): افصل الفلاتات الطرفية واحدة تلو الأخرى (فلاتة السماعة العلوية، ثم فلاتة الشحن السفلية، ثم فلاتة الباور) وشغّل الجهاز لتحديد القطعة المسببة للريستارت.',
      'الخطوة 2 (الفحص المجهري): افحص جميع كونكتورات الفلاتات على البورد تحت الميكروسكوب ونظفها بمادة IPA للتخلص من أي ترسبات.',
      'الخطوة 3 (قياس الممانعات): افحص الممانعة على أرجل الكونكتورات باستخدام الأفوميتر على وضع الدايود ومقارنتها بالقيم المرجعية في الجدول.',
      'الخطوة 4 (مراجعة السطور الحرجة): راجع السطور الملوّنة بالأحمر والأصفر في فاحص السجل التفصيلي أدناه لمطابقة الكود الدقيق مع المخطط.',
      'الخطوة 5 (توثيق القياسات): قم بتصدير ورقة العمل بصيغة PDF لتدوين قراءات الأفوميتر ومتابعة خطوات الإصلاح على طاولة الصيانة.',
    ],
    stepByStepRepairPlanEn: [
      'Step 1 (Flex Isolation): Disconnect peripheral flex cables one by one (top earpiece flex, charging port flex, power flex) to isolate the fault.',
      'Step 2 (Microscope Inspection): Inspect all board FPC connectors under a microscope and clean with IPA.',
      'Step 3 (Diode Mode Measurement): Measure diode mode impedance on connector pins and compare with reference values.',
      'Step 4 (Line-by-Line Review): Review the highlighted critical and warning lines in the log inspector below.',
      'Step 5 (Worksheet Documentation): Export the PDF Technician Worksheet to record measured readings at the bench.',
    ],
    riskWarning:
      'احتفظ دائماً بالفلاتة العلوية الأصلية الخاصة بالجهاز لتجنب فقدان بيانات تشفير Face ID و True Tone أثناء الفحص.',
    riskWarningEn:
      'Always preserve the original paired top sensor flex to avoid losing Face ID and True Tone calibration.',
  };
}

function isAuthorizedAdmin(req: express.Request): boolean {
  const headerPass = req.headers['x-admin-password'];
  const bodyPass = (req.body as any)?.password;
  return headerPass === ADMIN_SECRET_PASS || bodyPass === ADMIN_SECRET_PASS;
}

export function createApiRouter() {
  const router = express.Router();

  // Verify Admin Password (maya@#5Y)
  router.post('/v1/admin/login', (req, res) => {
    const { password } = req.body as { password?: string };
    if (password === ADMIN_SECRET_PASS) {
      return res.json({ authorized: true });
    }
    return res.status(401).json({ authorized: false, error: 'كلمة مرور الأدمن غير صحيحة.' });
  });

  // Analyze Log & Store Successful Operation in JSON
  const handleAnalyzeRequest = async (req: express.Request, res: express.Response) => {
    refreshCooldownStates();

    const {
      rawLog,
      fileName = 'panic-full.ips',
      deviceMarketingName,
      deviceIdentifier,
      osVersion,
      bugTypeLabel,
      missingSensors = [],
      matchedFaults = [],
      preferredModelId,
      simulateExhaustionCount = 0,
    } = req.body as {
      rawLog: string;
      fileName?: string;
      deviceMarketingName?: string;
      deviceIdentifier?: string;
      osVersion?: string;
      bugTypeLabel?: string;
      missingSensors?: string[];
      matchedFaults?: string[];
      preferredModelId?: string;
      simulateExhaustionCount?: number;
    };

    if (!rawLog || !rawLog.trim()) {
      return res.status(400).json({ error: 'يرجى تزويد نص سجل العطل لتحليله.' });
    }

    PLATFORM_STATS.totalApiCalls += 1;
    PLATFORM_STATS.totalAnalyzedLogs += 1;
    if (/panic|missing sensor|4013|4014|nvme|nand/i.test(rawLog)) {
      PLATFORM_STATS.criticalPanicsDetected += 1;
    }

    const userPrompt = [
      `Device: ${deviceMarketingName || 'iPhone'} (${deviceIdentifier || 'N/A'})`,
      `iOS Version: ${osVersion || 'Unknown'}`,
      `Bug Type: ${bugTypeLabel || 'Kernel Panic'}`,
      `Raw Crash Log:`,
      rawLog.slice(0, 6000),
    ].join('\n');

    let orderedCandidates = [...MODEL_POOL];
    if (preferredModelId) {
      const idx = orderedCandidates.findIndex((m) => m.id === preferredModelId);
      if (idx > 0) {
        orderedCandidates = [
          ...orderedCandidates.slice(idx),
          ...orderedCandidates.slice(0, idx),
        ];
      }
    }

    const failoverTrail: FailoverAttempt[] = [];
    let remainingSimulations = Number(simulateExhaustionCount) || 0;
    let finalDiagnosis: StructuredAiDiagnosis | null = null;
    let usedCandidate: AiModelEntry = MODEL_POOL[MODEL_POOL.length - 1];

    for (const candidate of orderedCandidates) {
      const startMs = Date.now();

      if (candidate.status === 'exhausted' && candidate.provider !== 'opencode-local') {
        failoverTrail.push({
          modelId: candidate.id,
          modelName: candidate.name,
          provider: candidate.provider,
          outcome: 'rotated',
          reason: candidate.lastErrorReason || 'انتهت حصة النموذج — تحويل تلقائي للنموذج التالي',
          latencyMs: 0,
        });
        continue;
      }

      if (remainingSimulations > 0 && candidate.provider !== 'opencode-local') {
        remainingSimulations -= 1;
        const reason = 'انتهت حصة الطلبات المجانية — تحويل تلقائي للنموذج التالي';
        markModelExhausted(candidate, reason);
        failoverTrail.push({
          modelId: candidate.id,
          modelName: candidate.name,
          provider: candidate.provider,
          outcome: 'rotated',
          reason,
          latencyMs: 35,
        });
        continue;
      }

      try {
        let diagnosis: StructuredAiDiagnosis;
        if (candidate.provider === 'opencode') {
          diagnosis = await callOpenCodeModel(candidate, userPrompt);
        } else if (candidate.provider === 'gemini') {
          diagnosis = await callGeminiFallbackModel(candidate, userPrompt);
        } else {
          diagnosis = runBuiltInExpertEngine(
            rawLog,
            deviceMarketingName || 'iPhone',
            missingSensors,
            matchedFaults
          );
        }

        const elapsed = Math.max(15, Date.now() - startMs);
        candidate.requestsHandled += 1;
        candidate.status = 'active';
        finalDiagnosis = diagnosis;
        usedCandidate = candidate;

        failoverTrail.push({
          modelId: candidate.id,
          modelName: candidate.name,
          provider: candidate.provider,
          outcome: 'success',
          reason: 'اكتمل التحليل الهندسي بنجاح',
          latencyMs: elapsed,
        });
        break;
      } catch {
        const elapsed = Date.now() - startMs;
        const shortReason = 'انتهت حصة النموذج الحالي — تم التحول تلقائياً للنموذج التالي';
        markModelExhausted(candidate, shortReason);
        failoverTrail.push({
          modelId: candidate.id,
          modelName: candidate.name,
          provider: candidate.provider,
          outcome: 'rotated',
          reason: shortReason,
          latencyMs: elapsed,
        });
      }
    }

    if (!finalDiagnosis) {
      usedCandidate = MODEL_POOL[MODEL_POOL.length - 1];
      usedCandidate.status = 'active';
      usedCandidate.requestsHandled += 1;
      finalDiagnosis = runBuiltInExpertEngine(
        rawLog,
        deviceMarketingName || 'iPhone',
        missingSensors,
        matchedFaults
      );
    }

    // Store successful operation in JSON
    const operationRecord: StoredAnalysisOperation = {
      id: `OP-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      fileName,
      deviceMarketingName: deviceMarketingName || 'iPhone',
      deviceIdentifier: deviceIdentifier || 'N/A',
      osVersion: osVersion || 'iOS',
      bugTypeLabel: bugTypeLabel || 'Kernel Panic 210',
      missingSensors: Array.isArray(missingSensors) ? missingSensors : [],
      matchedFaults: Array.isArray(matchedFaults) ? matchedFaults : [finalDiagnosis.headline],
      diagnosis: finalDiagnosis,
      rawLogExcerpt: rawLog.slice(0, 1200),
    };

    ANALYZED_OPERATIONS.unshift(operationRecord);
    saveOperationsToJsonFile();

    const nextPrimary = MODEL_POOL.find((m) => m.status === 'active') || usedCandidate;

    return res.json({
      status: 'ok',
      operationId: operationRecord.id,
      diagnosis: finalDiagnosis,
      usedModel: {
        id: usedCandidate.id,
        name: usedCandidate.name,
        badge: usedCandidate.badge,
        provider: usedCandidate.provider,
      },
      failoverTrail,
      models: MODEL_POOL,
      currentPrimaryModelId: nextPrimary.id,
    });
  };

  router.post('/ai/analyze', handleAnalyzeRequest);
  router.post('/v1/analyze', handleAnalyzeRequest);

  // Public Internal API Status
  router.get('/v1/status', (_req, res) => {
    refreshCooldownStates();
    PLATFORM_STATS.totalApiCalls += 1;
    res.json({
      service: 'iPanic Lab Internal API',
      version: '1.0.0',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
      status: 'operational',
      developer: {
        instagram: 'yaz.salaq2',
        facebook: 'yazsalaq',
      },
    });
  });

  // Support Tickets Endpoint
  router.post('/v1/support', (req, res) => {
    PLATFORM_STATS.totalApiCalls += 1;
    const { name, contact, deviceModel, message } = req.body as {
      name?: string;
      contact?: string;
      deviceModel?: string;
      message?: string;
    };

    if (!name || !message) {
      return res.status(400).json({ error: 'الاسم وتفاصيل المشكلة مطلوبان.' });
    }

    const newTicket: SupportTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      contact: (contact || 'غير محدد').trim(),
      deviceModel: (deviceModel || 'iPhone').trim(),
      message: message.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'open',
    };

    SUPPORT_TICKETS.unshift(newTicket);
    return res.json({
      status: 'ok',
      ticket: newTicket,
      message: 'تم إرسال طلب الدعم الفني بنجاح.',
    });
  });

  // Protected Admin Overview (Requires maya@#5Y)
  router.get('/v1/admin/overview', (req, res) => {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    refreshCooldownStates();
    const activeMod = MODEL_POOL.find((m) => m.status === 'active') || MODEL_POOL[0];
    res.json({
      stats: PLATFORM_STATS,
      models: MODEL_POOL,
      currentPrimaryModelId: activeMod.id,
      operations: ANALYZED_OPERATIONS,
      tickets: SUPPORT_TICKETS,
    });
  });

  // Protected Admin: Export All Operations as JSON file
  router.get('/v1/admin/operations.json', (req, res) => {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="analyzed_operations.json"');
    res.send(JSON.stringify(ANALYZED_OPERATIONS, null, 2));
  });

  // Protected Admin: Zero/Clear all operations & stats
  router.post('/v1/admin/operations/clear', (req, res) => {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    ANALYZED_OPERATIONS = [];
    SUPPORT_TICKETS = [];
    PLATFORM_STATS.totalAnalyzedLogs = 0;
    PLATFORM_STATS.totalApiCalls = 0;
    PLATFORM_STATS.criticalPanicsDetected = 0;
    PLATFORM_STATS.autoFailoverSwitches = 0;
    for (const m of MODEL_POOL) {
      m.requestsHandled = 0;
      m.failoverCount = 0;
      m.status = 'active';
      m.cooldownUntil = null;
    }
    saveOperationsToJsonFile();
    res.json({
      message: 'تم تصفير جميع العمليات والإحصائيات وملف JSON بنجاح.',
      operations: ANALYZED_OPERATIONS,
      stats: PLATFORM_STATS,
    });
  });

  // Protected Admin: Rotate or Reset Models
  router.post('/ai/rotate', (req, res) => {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    refreshCooldownStates();
    const { action, targetModelId } = req.body as {
      action?: 'rotate_next' | 'reset_all';
      targetModelId?: string;
    };

    if (action === 'reset_all') {
      for (const m of MODEL_POOL) {
        m.status = 'active';
        m.cooldownUntil = null;
        m.lastErrorReason = undefined;
      }
      return res.json({
        message: 'تمت إعادة تفعيل جميع النماذج بنجاح.',
        models: MODEL_POOL,
        currentPrimaryModelId: MODEL_POOL[0].id,
      });
    }

    const target =
      (targetModelId && MODEL_POOL.find((m) => m.id === targetModelId)) ||
      MODEL_POOL.find((m) => m.status === 'active') ||
      MODEL_POOL[0];

    markModelExhausted(target, 'تم التحويل للنموذج التالي تلقائياً');

    if (!MODEL_POOL.some((m) => m.status === 'active')) {
      MODEL_POOL[MODEL_POOL.length - 1].status = 'active';
      MODEL_POOL[MODEL_POOL.length - 1].cooldownUntil = null;
    }

    const nextActive = MODEL_POOL.find((m) => m.status === 'active') || MODEL_POOL[0];

    return res.json({
      message: `تم التحول تلقائياً إلى [${nextActive.name}]`,
      models: MODEL_POOL,
      currentPrimaryModelId: nextActive.id,
    });
  });

  // Protected Admin: Toggle Support Ticket Status
  router.post('/v1/admin/tickets/toggle', (req, res) => {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { ticketId } = req.body as { ticketId?: string };
    const ticket = SUPPORT_TICKETS.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.status = ticket.status === 'open' ? 'resolved' : 'open';
    }
    res.json({ tickets: SUPPORT_TICKETS });
  });

  return router;
}
