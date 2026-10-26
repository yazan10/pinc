import { jsPDF } from 'jspdf';
import { type LogAnalysisResult } from '../data/iphoneDiagnostics';

export interface PdfStructuredDiagnosis {
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

const A4_WIDTH_PX = 1240; // High-DPI A4 width (at ~150 DPI, scaled 2x on canvas)
const A4_HEIGHT_PX = 1754;
const PAGE_PADDING = 64;
const CONTENT_WIDTH = A4_WIDTH_PX - PAGE_PADDING * 2;

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (words.length === 0 || (words.length === 1 && words[0] === '')) {
      lines.push('');
      continue;
    }

    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const testLine = `${currentLine} ${words[i]}`;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export async function exportTechnicianWorksheetPdf(
  report: LogAnalysisResult,
  aiDiagnosis: PdfStructuredDiagnosis | null,
  lang: 'ar' | 'en' = 'ar'
): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if font ready promise fails
    }
  }

  const isAr = lang === 'ar';
  const pages: HTMLCanvasElement[] = [];

  const createNewPage = (pageNumber: number): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    cursorY: number;
  } => {
    const canvas = document.createElement('canvas');
    canvas.width = A4_WIDTH_PX;
    canvas.height = A4_HEIGHT_PX;
    const ctx = canvas.getContext('2d')!;

    ctx.direction = isAr ? 'rtl' : 'ltr';
    ctx.textBaseline = 'top';

    // Crisp White A4 Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

    // Top Accent Bar (Blue / Yellow / Red diagnostic strip)
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, A4_WIDTH_PX * 0.65, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(A4_WIDTH_PX * 0.65, 0, A4_WIDTH_PX * 0.2, 12);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(A4_WIDTH_PX * 0.85, 0, A4_WIDTH_PX * 0.15, 12);

    // Header Box
    let y = 40;
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 34px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = isAr ? 'right' : 'left';
    const xStart = isAr ? A4_WIDTH_PX - PAGE_PADDING : PAGE_PADDING;
    const xOpposite = isAr ? PAGE_PADDING : A4_WIDTH_PX - PAGE_PADDING;

    ctx.fillText(
      isAr
        ? 'iPanic Lab — ورقة عمل التشخيص والصيانة الهندسية'
        : 'iPanic Lab — Printed Technician Diagnostic Worksheet',
      xStart,
      y
    );

    ctx.fillStyle = '#2563eb';
    ctx.font = '700 18px "IBM Plex Mono", monospace';
    ctx.textAlign = isAr ? 'left' : 'right';
    ctx.fillText(`PAGE #${pageNumber}`, xOpposite, y + 8);

    y += 46;
    ctx.fillStyle = '#475569';
    ctx.font = '700 18px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(
      isAr
        ? `معرّف الحادثة: ${report.incidentId}   |   التاريخ والوقت المحلي: ${report.analyzedAt}   |   الملف: ${report.fileName}`
        : `Incident ID: ${report.incidentId}   |   Local Date & Time: ${report.analyzedAt}   |   File: ${report.fileName}`,
      xStart,
      y
    );

    y += 34;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAGE_PADDING, y);
    ctx.lineTo(A4_WIDTH_PX - PAGE_PADDING, y);
    ctx.stroke();

    // Footer on every page
    const footerY = A4_HEIGHT_PX - 56;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAGE_PADDING, footerY - 12);
    ctx.lineTo(A4_WIDTH_PX - PAGE_PADDING, footerY - 12);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '700 15px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(
      isAr
        ? 'منصة iPanic Lab لتحليل أعطال وسجلات أجهزة الآيفون — وثيقة عمل فنية مخصصة لمهندسي الصيانة'
        : 'iPanic Lab iPhone Motherboard & Kernel Panic Diagnostic Platform — Technician Worksheet',
      xStart,
      footerY
    );

    ctx.textAlign = isAr ? 'left' : 'right';
    ctx.font = '700 15px "IBM Plex Mono", monospace';
    ctx.fillText('IG: @yaz.salaq2 | FB: yazsalaq', xOpposite, footerY);

    pages.push(canvas);
    return { canvas, ctx, cursorY: y + 24 };
  };

  let pageIndex = 1;
  let { ctx, cursorY } = createNewPage(pageIndex);
  const maxContentY = A4_HEIGHT_PX - 92;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > maxContentY) {
      pageIndex += 1;
      const next = createNewPage(pageIndex);
      ctx = next.ctx;
      cursorY = next.cursorY;
    }
  };

  const xAlign = isAr ? A4_WIDTH_PX - PAGE_PADDING : PAGE_PADDING;

  // 1. DEVICE TELEMETRY METADATA GRID
  ensureSpace(120);
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.fillRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, 102);
  ctx.strokeRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, 102);

  const colWidth = CONTENT_WIDTH / 4;
  const metaItems = [
    {
      label: isAr ? 'طراز الجهاز' : 'Device Model',
      val1: report.deviceMarketingName,
      val2: report.deviceIdentifier,
    },
    {
      label: isAr ? 'رقم البورد والمعالج' : 'Board & SoC',
      val1: report.boardNumber,
      val2: report.socName,
    },
    {
      label: isAr ? 'إصدار النظام ونوع السجل' : 'iOS & Bug Type',
      val1: report.osVersion,
      val2: `Bug Type ${report.bugType}`,
    },
    {
      label: isAr ? 'مستوى الخطورة' : 'Severity Level',
      val1:
        report.overallSeverity === 'critical'
          ? isAr
            ? 'عطل هاردوير حرج'
            : 'CRITICAL HARDWARE'
          : isAr
          ? 'تحذير مسار فرعي'
          : 'WARNING PATH',
      val2: isAr
        ? `${report.matchedFaults.length} أعطال مطابقة`
        : `${report.matchedFaults.length} Matched Faults`,
    },
  ];

  metaItems.forEach((item, idx) => {
    const cellX = isAr
      ? A4_WIDTH_PX - PAGE_PADDING - idx * colWidth - 18
      : PAGE_PADDING + idx * colWidth + 18;

    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '700 15px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(item.label, cellX, cursorY + 14);

    ctx.fillStyle = idx === 3 && report.overallSeverity === 'critical' ? '#dc2626' : '#0f172a';
    ctx.font = '700 19px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(item.val1.slice(0, 26), cellX, cursorY + 40);

    ctx.fillStyle = '#334155';
    ctx.font = '700 15px "IBM Plex Mono", monospace';
    ctx.fillText(item.val2.slice(0, 28), cellX, cursorY + 70);
  });

  cursorY += 126;

  // 2. PRIMARY DETAILED DIAGNOSIS SECTION
  const headlineText = aiDiagnosis
    ? !isAr && aiDiagnosis.headlineEn
      ? aiDiagnosis.headlineEn
      : aiDiagnosis.headline
    : report.matchedFaults[0]?.title || 'تشخيص العطل الهندسي';

  const rootCauseText = aiDiagnosis
    ? !isAr && aiDiagnosis.rootCauseAnalysisEn
      ? aiDiagnosis.rootCauseAnalysisEn
      : aiDiagnosis.rootCauseAnalysis
    : report.matchedFaults[0]?.summary || '';

  ctx.font = '700 19px "IBM Plex Sans Arabic", sans-serif';
  const wrappedRootCause = wrapTextLines(ctx, rootCauseText, CONTENT_WIDTH - 48);
  const diagBoxHeight = Math.max(150, 96 + wrappedRootCause.length * 30);

  ensureSpace(diagBoxHeight + 24);

  ctx.fillStyle = '#eff6ff';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2.5;
  ctx.fillRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, diagBoxHeight);
  ctx.strokeRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, diagBoxHeight);

  ctx.textAlign = isAr ? 'right' : 'left';
  const innerX = isAr ? A4_WIDTH_PX - PAGE_PADDING - 24 : PAGE_PADDING + 24;

  ctx.fillStyle = '#1d4ed8';
  ctx.font = '700 17px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(
    isAr
      ? 'التشخيص الهندسي المفصل وتحديد سبب العطل:'
      : 'PRIMARY ENGINEERING DIAGNOSIS & ROOT CAUSE:',
    innerX,
    cursorY + 18
  );

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 23px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(headlineText.slice(0, 85), innerX, cursorY + 48);

  ctx.fillStyle = '#1e293b';
  ctx.font = '700 18px "IBM Plex Sans Arabic", sans-serif';
  let textY = cursorY + 86;
  for (const line of wrappedRootCause) {
    ctx.fillText(line, innerX, textY);
    textY += 29;
  }

  cursorY += diagBoxHeight + 28;

  // 3. SUSPECTED COMPONENTS TABLE
  const suspectedList =
    aiDiagnosis?.suspectedComponents && aiDiagnosis.suspectedComponents.length > 0
      ? aiDiagnosis.suspectedComponents
      : report.matchedFaults.map((f) => ({
          partName: f.subsystem,
          probability: `${f.confidence}%`,
          reason: f.summary,
        }));

  if (suspectedList.length > 0) {
    ensureSpace(80);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(
      isAr
        ? '1. القطع والمسارات المشتبه بتلفها (مرتبة حسب نسبة الاحتمال)'
        : '1. Suspected Faulty Components (Ranked by Probability)',
      xAlign,
      cursorY
    );
    cursorY += 38;

    for (const comp of suspectedList) {
      ctx.font = '700 17px "IBM Plex Sans Arabic", sans-serif';
      const reasonLines = wrapTextLines(ctx, comp.reason, CONTENT_WIDTH - 190);
      const rowHeight = Math.max(72, 42 + reasonLines.length * 26);
      ensureSpace(rowHeight + 12);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.fillRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, rowHeight);
      ctx.strokeRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, rowHeight);

      // Probability Badge
      const badgeW = 110;
      const badgeX = isAr ? PAGE_PADDING + 18 : A4_WIDTH_PX - PAGE_PADDING - badgeW - 18;
      ctx.fillStyle = '#fef2f2';
      ctx.strokeStyle = '#dc2626';
      ctx.fillRect(badgeX, cursorY + 16, badgeW, 38);
      ctx.strokeRect(badgeX, cursorY + 16, badgeW, 38);

      ctx.fillStyle = '#dc2626';
      ctx.font = '700 18px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(comp.probability, badgeX + badgeW / 2, cursorY + 25);

      // Component Title & Reason
      ctx.textAlign = isAr ? 'right' : 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 19px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(comp.partName, innerX, cursorY + 12);

      ctx.fillStyle = '#475569';
      ctx.font = '700 16px "IBM Plex Sans Arabic", sans-serif';
      let rY = cursorY + 40;
      for (const rLine of reasonLines) {
        ctx.fillText(rLine, innerX, rY);
        rY += 24;
      }

      cursorY += rowHeight + 10;
    }
    cursorY += 16;
  }

  // 4. MISSING SENSORS TABLE (If any)
  if (report.missingSensors.length > 0) {
    ensureSpace(110);
    ctx.fillStyle = '#dc2626';
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(
      isAr
        ? `2. الحساسات المفقودة المرصودة في السجل (${report.missingSensors.length})`
        : `2. Missing Sensors Detected in Log (${report.missingSensors.length})`,
      xAlign,
      cursorY
    );
    cursorY += 36;

    for (const sensor of report.missingSensors) {
      ensureSpace(64);
      ctx.fillStyle = '#fffbeb';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.fillRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, 56);
      ctx.strokeRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, 56);

      ctx.textAlign = isAr ? 'right' : 'left';
      ctx.fillStyle = '#dc2626';
      ctx.font = '700 19px "IBM Plex Mono", monospace';
      ctx.fillText(`[${sensor.code}]`, innerX, cursorY + 16);

      const offsetCode = isAr ? innerX - 110 : innerX + 110;
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 18px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(`${sensor.nameAr} — ${sensor.locationAr}`, offsetCode, cursorY + 16);

      ctx.textAlign = isAr ? 'left' : 'right';
      ctx.fillStyle = '#1d4ed8';
      ctx.font = '700 16px "IBM Plex Mono", monospace';
      ctx.fillText(
        sensor.rail,
        isAr ? PAGE_PADDING + 20 : A4_WIDTH_PX - PAGE_PADDING - 20,
        cursorY + 18
      );

      cursorY += 64;
    }
    cursorY += 16;
  }

  // 5. BOARD RAILS & MULTIMETER MEASUREMENT WORKSHEET
  const railsList =
    aiDiagnosis?.boardRailsToMeasure && aiDiagnosis.boardRailsToMeasure.length > 0
      ? aiDiagnosis.boardRailsToMeasure
      : report.matchedFaults.flatMap((f) =>
          f.testPoints.map((tp) => ({
            rail: tp.railName,
            expectedReading: tp.expectedValue,
            testInstruction: `${tp.componentRef} — ${tp.description}`,
          }))
        );

  if (railsList.length > 0) {
    ensureSpace(90);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(
      isAr
        ? '3. جدول قياسات الممانعة والفولتية على البورد (للقياس بالأفوميتر)'
        : '3. Board Rails & Diode/Voltage Measurement Worksheet',
      xAlign,
      cursorY
    );
    cursorY += 38;

    for (const railItem of railsList) {
      ctx.font = '700 16px "IBM Plex Sans Arabic", sans-serif';
      const instLines = wrapTextLines(ctx, railItem.testInstruction, CONTENT_WIDTH - 420);
      const rHeight = Math.max(66, 36 + instLines.length * 24);
      ensureSpace(rHeight + 10);

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.fillRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, rHeight);
      ctx.strokeRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, rHeight);

      // Technician Check Box [ ]
      const checkX = isAr ? A4_WIDTH_PX - PAGE_PADDING - 42 : PAGE_PADDING + 18;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(checkX, cursorY + 20, 24, 24);

      const textStartX = isAr ? checkX - 18 : checkX + 42;
      ctx.textAlign = isAr ? 'right' : 'left';
      ctx.fillStyle = '#1d4ed8';
      ctx.font = '700 18px "IBM Plex Mono", monospace';
      ctx.fillText(railItem.rail, textStartX, cursorY + 12);

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 16px "IBM Plex Mono", monospace';
      ctx.fillText(
        `${isAr ? 'القيمة المتوقعة:' : 'Expected:'} ${railItem.expectedReading}`,
        textStartX,
        cursorY + 38
      );

      // Instruction on the other half
      const instX = isAr ? PAGE_PADDING + 24 : A4_WIDTH_PX - PAGE_PADDING - 24;
      ctx.textAlign = isAr ? 'left' : 'right';
      ctx.fillStyle = '#334155';
      ctx.font = '700 16px "IBM Plex Sans Arabic", sans-serif';
      let iy = cursorY + 16;
      for (const il of instLines) {
        ctx.fillText(il, instX, iy);
        iy += 24;
      }

      cursorY += rHeight + 8;
    }
    cursorY += 18;
  }

  // 6. STEP-BY-STEP REPAIR CHECKLIST
  const stepsList =
    aiDiagnosis?.stepByStepRepairPlan && aiDiagnosis.stepByStepRepairPlan.length > 0
      ? !isAr && aiDiagnosis.stepByStepRepairPlanEn?.length
        ? aiDiagnosis.stepByStepRepairPlanEn
        : aiDiagnosis.stepByStepRepairPlan
      : report.matchedFaults.flatMap((f) => f.repairSteps);

  if (stepsList.length > 0) {
    ensureSpace(85);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(
      isAr
        ? '4. خطوات الفحص والإصلاح العملية (قائمة تحقق فني الصيانة)'
        : '4. Step-by-Step Technician Repair Checklist',
      xAlign,
      cursorY
    );
    cursorY += 38;

    stepsList.forEach((step, idx) => {
      ctx.font = '700 18px "IBM Plex Sans Arabic", sans-serif';
      const stepLines = wrapTextLines(ctx, `${idx + 1}. ${step}`, CONTENT_WIDTH - 90);
      const stepBoxH = Math.max(54, 24 + stepLines.length * 28);
      ensureSpace(stepBoxH + 10);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.fillRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, stepBoxH);
      ctx.strokeRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, stepBoxH);

      // Checkbox
      const checkX = isAr ? A4_WIDTH_PX - PAGE_PADDING - 42 : PAGE_PADDING + 18;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(checkX, cursorY + 15, 24, 24);

      const stepTextX = isAr ? checkX - 18 : checkX + 42;
      ctx.textAlign = isAr ? 'right' : 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 18px "IBM Plex Sans Arabic", sans-serif';
      let sy = cursorY + 14;
      for (const sl of stepLines) {
        ctx.fillText(sl, stepTextX, sy);
        sy += 27;
      }

      cursorY += stepBoxH + 8;
    });
    cursorY += 18;
  }

  // 7. RISK WARNING & TECHNICIAN SIGN-OFF BLOCK
  const warningText = aiDiagnosis
    ? !isAr && aiDiagnosis.riskWarningEn
      ? aiDiagnosis.riskWarningEn
      : aiDiagnosis.riskWarning
    : '';

  if (warningText) {
    ctx.font = '700 17px "IBM Plex Sans Arabic", sans-serif';
    const warnLines = wrapTextLines(
      ctx,
      `${isAr ? 'تنبيه فني هام:' : 'CRITICAL WARNING:'} ${warningText}`,
      CONTENT_WIDTH - 48
    );
    const warnH = Math.max(70, 32 + warnLines.length * 26);
    ensureSpace(warnH + 24);

    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.fillRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, warnH);
    ctx.strokeRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, warnH);

    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillStyle = '#78350f';
    let wy = cursorY + 18;
    for (const wl of warnLines) {
      ctx.fillText(wl, innerX, wy);
      wy += 26;
    }

    cursorY += warnH + 24;
  }

  // Technician Notes & Sign-Off Box at bottom of worksheet
  ensureSpace(130);
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.fillRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, 115);
  ctx.strokeRect(PAGE_PADDING, cursorY, CONTENT_WIDTH, 115);

  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.fillStyle = '#334155';
  ctx.font = '700 17px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(
    isAr
      ? 'ملاحظات مهندس الصيانة بعد القياس / القيم الفعلية على البورد:'
      : 'Technician Bench Notes / Measured Diode & Voltage Readings:',
    innerX,
    cursorY + 16
  );

  ctx.fillStyle = '#64748b';
  ctx.font = '700 16px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(
    isAr
      ? 'اسم المهندس الفاحص: ........................................    حالة الإصلاح: [  ] تم الإصلاح   [  ] قيد المتابعة    التوقيع: ........................'
      : 'Technician Name: ........................................    Status: [  ] Repaired   [  ] Pending    Signature: ........................',
    innerX,
    cursorY + 74
  );

  // Compile all rendered A4 canvases into a multi-page PDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((pageCanvas, idx) => {
    if (idx > 0) {
      pdf.addPage();
    }
    const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  const safeModel = report.deviceMarketingName.replace(/[^a-zA-Z0-9_-]/g, '-');
  pdf.save(`iPanic-Lab-Worksheet-${safeModel}.pdf`);
}
