import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { GlucoseReading } from '../../types';

interface BloodSugarChartProps {
  glucoseReadings: GlucoseReading[];
}

export const BloodSugarChart = React.memo(({ glucoseReadings }: BloodSugarChartProps) => {
    // Feed placeholders if there are insufficient logs
    const emptyPlaceholderData = useMemo(() => [
      { val: 105, label: '06:00 ص', status: 'normal' as const },
      { val: 115, label: '08:00 ص', status: 'normal' as const },
      { val: 110, label: '10:00 ص', status: 'normal' as const },
      { val: 110, label: 'الآن', status: 'normal' as const },
    ], []);

    const actualData = useMemo(() => {
      return [...glucoseReadings]
        .slice(0, 5)
        .reverse()
        .map((r) => {
          return {
            val: r.value,
            label: new Date(r.loggedAt).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
            status: r.status,
          };
        });
    }, [glucoseReadings]);

    const chartData = actualData.length >= 2 ? actualData : emptyPlaceholderData;

    // SVG Points and Curve calculations (Heavily caching these calculations via useMemo)
    const paddingX = 40;
    const paddingY = 15;
    const chartWidth = 320;
    const chartHeight = 90;

    const svgCalculated = useMemo(() => {
      const minGlucoseVal = Math.min(...chartData.map((d) => d.val), 60);
      const maxGlucoseVal = Math.max(...chartData.map((d) => d.val), 200);
      const valRange = Math.max(maxGlucoseVal - minGlucoseVal, 40);

      const coords = chartData.map((d, index) => {
        const x = paddingX + (index / (chartData.length - 1)) * (chartWidth - paddingX * 2);
        const ratio = (d.val - minGlucoseVal) / valRange;
        const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
        return { x, y, val: d.val, label: d.label };
      });

      let pathD = '';
      if (coords.length > 0) {
        pathD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
          const p0 = coords[i - 1];
          const p1 = coords[i];
          const cpX1 = p0.x + (p1.x - p0.x) / 2;
          const cpY1 = p0.y;
          const cpX2 = p0.x + (p1.x - p0.x) / 2;
          const cpY2 = p1.y;
          pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
        }
      }

      return { coords, pathD };
    }, [chartData]);

    return (
      <div className="relative pt-1 font-sans select-none flex flex-col space-y-2">
        {/* Header Title Accent */}
        <div className="flex justify-between items-center bg-slate-950/20 p-1.5 px-2.5 rounded-2xl border border-slate-800/20 shrink-0">
          <span className="text-[10px] font-black text-slate-350 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-400 stroke-[2.5]" />
            <span>عرض تقلّبات السكر (آخر ٥ قراءات)</span>
          </span>
        </div>

        {/* Dynamic Frame - Render high-performance wave strictly */}
        <div className="min-h-[96px] relative overflow-hidden flex items-center justify-center">
          <svg className="w-full h-24 overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" style={{ willChange: 'transform' }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />

            {svgCalculated.coords.length > 0 && (
              <path
                d={`${svgCalculated.pathD} L ${svgCalculated.coords[svgCalculated.coords.length - 1].x} ${chartHeight - 4} L ${svgCalculated.coords[0].x} ${chartHeight - 4} Z`}
                fill="url(#chartGradient)"
              />
            )}

            <path
              d={svgCalculated.pathD}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="drop-shadow-[0_2px_8px_rgba(14,165,233,0.3)]"
            />

            {svgCalculated.coords.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#0f172a"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="cursor-pointer"
                />
                <text
                  x={pt.x}
                  y={pt.y - 9}
                  textAnchor="middle"
                  fill="#f3f4f6"
                  fontSize="9.5"
                  fontWeight="800"
                  className="font-mono bg-slate-950 px-1 rounded"
                >
                  {pt.val}
                </text>
                <text
                  x={pt.x}
                  y={chartHeight - 1}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                  fontWeight="500"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
});
BloodSugarChart.displayName = 'BloodSugarChart';

