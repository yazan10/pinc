import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Activity, Copy, Check } from 'lucide-react';

export interface RailMeasurementItem {
  rail: string;
  expectedReading: string;
  componentRef?: string;
  testInstruction: string;
}

interface DiodeModeChartProps {
  items: RailMeasurementItem[];
  lang: 'ar' | 'en';
  title?: string;
}

interface ParsedChartPoint {
  id: string;
  shortName: string;
  fullRail: string;
  diodeValue: number;
  minSafeDiode: number;
  maxSafeDiode: number;
  voltageValue: number;
  expectedReadingRaw: string;
  componentRef: string;
  testInstruction: string;
}

function parseRailValues(item: RailMeasurementItem, index: number): ParsedChartPoint {
  const raw = item.expectedReading || '';

  // Extract Diode mode value (typically between 0.150V and 0.850V)
  let diodeVal = 0.41;
  const diodeExplicitMatch = raw.match(/diode[^0-9]*([0-9]+\.[0-9]+)/i);
  if (diodeExplicitMatch?.[1]) {
    diodeVal = parseFloat(diodeExplicitMatch[1]);
  } else {
    const allDecimals = [...raw.matchAll(/([0-9]+\.[0-9]+)/g)].map((m) => parseFloat(m[1]));
    const subOne = allDecimals.find((n) => n > 0.12 && n < 0.89);
    if (subOne !== undefined) {
      diodeVal = subOne;
    } else if (raw.includes('0.9')) {
      diodeVal = 0.285;
    } else if (raw.includes('1.8')) {
      diodeVal = 0.385;
    } else if (raw.includes('2.5') || raw.includes('2.6')) {
      diodeVal = 0.36;
    } else if (raw.includes('3.8') || raw.includes('4.2') || raw.includes('4.3')) {
      diodeVal = 0.345;
    }
  }

  // Extract Voltage value (e.g., 1.8V, 3.8V, 0.9V, 2.5V)
  let voltageVal = 1.8;
  const allNums = [...raw.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*V/gi)].map((m) => parseFloat(m[1]));
  const voltCandidate = allNums.find((n) => n >= 0.8 && n <= 20);
  if (voltCandidate !== undefined) {
    voltageVal = voltCandidate;
  } else if (item.rail.includes('1V8')) {
    voltageVal = 1.8;
  } else if (item.rail.includes('2V5') || item.rail.includes('2V6')) {
    voltageVal = 2.5;
  } else if (item.rail.includes('0V9') || item.rail.includes('0V8')) {
    voltageVal = 0.9;
  } else if (item.rail.includes('VDD_MAIN') || item.rail.includes('BATT') || item.rail.includes('BOOST')) {
    voltageVal = 3.85;
  }

  const shortLabel =
    item.rail.length > 20 ? `${item.rail.slice(0, 18)}…` : item.rail;

  return {
    id: `rail-${index}`,
    shortName: shortLabel,
    fullRail: item.rail,
    diodeValue: Number(diodeVal.toFixed(3)),
    minSafeDiode: Number(Math.max(0.1, diodeVal - 0.045).toFixed(3)),
    maxSafeDiode: Number((diodeVal + 0.045).toFixed(3)),
    voltageValue: Number(voltageVal.toFixed(2)),
    expectedReadingRaw: item.expectedReading,
    componentRef: item.componentRef || 'FPC / Test Point',
    testInstruction: item.testInstruction,
  };
}

const BAR_COLORS = ['#2563eb', '#1d4ed8', '#f59e0b', '#dc2626', '#0284c7', '#4f46e5'];

export const DiodeModeChart: React.FC<DiodeModeChartProps> = ({ items, lang, title }) => {
  const [viewMode, setViewMode] = useState<'diode' | 'combined' | 'both'>('both');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chartData = useMemo(() => {
    return items.map((item, idx) => parseRailValues(item, idx));
  }, [items]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1600);
  };

  if (chartData.length === 0) return null;

  const isAr = lang === 'ar';

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
      {/* Header & Interactive View Mode Switcher (Blue, Yellow, Red Buttons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-950">
            {title ||
              (isAr
                ? 'الرسم البياني التفاعلي لقيم الممانعة والفولتية (Diode Mode & Voltage)'
                : 'Interactive Diode Mode & Voltage Rail Chart')}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('diode')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'diode'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-600/85 text-white hover:bg-blue-700'
            }`}
          >
            {isAr ? 'مخطط الممانعة فقط (Diode)' : 'Diode Chart Only'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('combined')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'combined'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-amber-400/85 text-slate-950 hover:bg-amber-500'
            }`}
          >
            {isAr ? 'مقارنة الممانعة والفولتية' : 'Diode vs Voltage'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'both'
                ? 'bg-red-600 text-white'
                : 'bg-red-600/85 text-white hover:bg-red-700'
            }`}
          >
            {isAr ? 'المخطط + تفاصيل النقاط' : 'Chart + Details'}
          </button>
        </div>
      </div>

      {/* Interactive Recharts Canvas */}
      <div dir="ltr" className="w-full h-64 sm:h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 20, left: 4, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="shortName"
              tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
              interval={0}
              angle={-10}
              textAnchor="end"
              height={46}
            />
            <YAxis
              yAxisId="diode"
              domain={[0, 0.7]}
              tickFormatter={(v) => `${v}V`}
              tick={{ fill: '#1d4ed8', fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Diode (V)',
                angle: -90,
                position: 'insideLeft',
                fill: '#1d4ed8',
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            {viewMode === 'combined' && (
              <YAxis
                yAxisId="voltage"
                orientation="right"
                domain={[0, 5]}
                tickFormatter={(v) => `${v}V`}
                tick={{
                  fill: '#d97706',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'IBM Plex Mono',
                }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
              />
            )}
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const dataPoint = payload[0].payload as ParsedChartPoint;
                return (
                  <div
                    dir={isAr ? 'rtl' : 'ltr'}
                    className="max-w-xs p-3.5 bg-white border-2 border-blue-600 rounded-xl shadow-xl space-y-2 text-xs font-sans"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-1.5">
                      <span className="font-mono font-bold text-blue-700">
                        {dataPoint.fullRail}
                      </span>
                      <span className="font-mono font-bold text-red-600 tabular-nums">
                        {dataPoint.diodeValue}V
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500">
                          {isAr ? 'قراءة الدايود المرجعية:' : 'Reference Diode:'}
                        </span>
                        <span className="font-mono font-bold text-blue-700 tabular-nums">
                          ~{dataPoint.diodeValue}V ({dataPoint.minSafeDiode}V – {dataPoint.maxSafeDiode}V)
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500">
                          {isAr ? 'الفولتية المتوقعة:' : 'Expected Voltage:'}
                        </span>
                        <span className="font-mono font-bold text-amber-600 tabular-nums">
                          {dataPoint.voltageValue}V
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500">
                          {isAr ? 'القيمة المسجلة بالمخطط:' : 'Schematic Spec:'}
                        </span>
                        <span className="font-mono font-semibold text-slate-900">
                          {dataPoint.expectedReadingRaw}
                        </span>
                      </div>
                    </div>
                    <p className="pt-1 border-t border-slate-100 text-slate-700 font-medium leading-relaxed">
                      {dataPoint.testInstruction}
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                fontWeight: 700,
                paddingTop: '4px',
              }}
            />
            <ReferenceLine
              yAxisId="diode"
              y={0.4}
              stroke="#dc2626"
              strokeDasharray="4 4"
              label={{
                value: isAr ? 'متوسط ممانعة المسار (~0.400V)' : 'Ref Diode (~0.400V)',
                position: 'top',
                fill: '#dc2626',
                fontSize: 10,
                fontWeight: 700,
              }}
            />
            <Bar
              yAxisId="diode"
              dataKey="diodeValue"
              name={isAr ? 'قيمة الممانعة (Diode V)' : 'Diode Mode (V)'}
              radius={[6, 6, 0, 0]}
              maxBarSize={54}
            >
              {chartData.map((entry, idx) => (
                <Cell key={entry.id} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
              ))}
            </Bar>
            <Line
              yAxisId="diode"
              type="monotone"
              dataKey="maxSafeDiode"
              name={isAr ? 'الحد الأعلى المسموح (V)' : 'Max Safe Diode (V)'}
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
            />
            {viewMode === 'combined' && (
              <Line
                yAxisId="voltage"
                type="monotone"
                dataKey="voltageValue"
                name={isAr ? 'الفولتية (Voltage V)' : 'Rail Voltage (V)'}
                stroke="#dc2626"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#dc2626' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Rail Cards below the Chart (when viewMode === 'both') */}
      {viewMode === 'both' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
          {chartData.map((point) => (
            <div
              key={point.id}
              className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 truncate">
                  {point.fullRail}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-600 text-white rounded tabular-nums">
                    Diode: ~{point.diodeValue}V
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(point.fullRail, point.id)}
                    className="p-1 text-xs font-bold text-slate-700 bg-amber-400 rounded hover:bg-amber-500 transition-colors cursor-pointer"
                    title={isAr ? 'نسخ اسم المسار' : 'Copy Rail Name'}
                  >
                    {copiedId === point.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className="text-xs font-mono font-semibold text-slate-800">
                {point.expectedReadingRaw}
              </div>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                {point.testInstruction}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
