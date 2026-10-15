import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Eye,
  Download,
  Calendar,
  Layers,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ScanRecord } from '../types';

interface ScanHistoryProps {
  scans: ScanRecord[];
  onViewScan: (scan: ScanRecord) => void;
  onDeleteScan: (id: string) => void;
  onOpenScanner: () => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({
  scans,
  onViewScan,
  onDeleteScan,
  onOpenScanner,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'real' | 'simulated'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter & search
  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      // Type filter
      if (filterType === 'real' && s.isSimulated) return false;
      if (filterType === 'simulated' && !s.isSimulated) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesHex = s.hexCode.toLowerCase().includes(q);
        const matchesNotes = s.notes?.toLowerCase().includes(q);
        return matchesTitle || matchesHex || matchesNotes;
      }
      return true;
    });
  }, [scans, filterType, searchQuery]);

  // Prepare chronological data for Recharts (oldest to newest)
  const chartData = useMemo(() => {
    return [...scans]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((s, idx) => {
        const color = s.calibratedColor || s.rawColor;
        const dateObj = new Date(s.timestamp);
        const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:${String(
          dateObj.getMinutes()
        ).padStart(2, '0')}`;

        return {
          idx: idx + 1,
          dateLabel,
          title: s.title,
          opticalDensity: s.simulatedInterpretation.chromaticIndex,
          r: color.r,
          g: color.g,
          b: color.b,
          hex: color.hex,
          isSimulated: s.isSimulated,
        };
      });
  }, [scans]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this scan record? This action cannot be undone.')) {
      setDeletingId(id);
      onDeleteScan(id);
      setTimeout(() => setDeletingId(null), 500);
    }
  };

  const exportAllHistoryCsv = () => {
    const headers = [
      'ID',
      'Timestamp',
      'Title',
      'IsSimulated',
      'IsCalibrated',
      'Raw_Hex',
      'Calibrated_Hex',
      'OpticalDensity_OD',
      'BandIntensity',
      'QualityStatus',
    ];
    const rows = filteredScans.map((s) => [
      s.id,
      s.timestamp,
      `"${s.title.replace(/"/g, '""')}"`,
      s.isSimulated ? 'SIMULATED' : 'ACTUAL',
      s.isCalibrated ? 'CALIBRATED' : 'RAW',
      s.rawColor.hex,
      s.calibratedColor ? s.calibratedColor.hex : 'N/A',
      s.simulatedInterpretation.chromaticIndex,
      s.simulatedInterpretation.relativeBandIntensity,
      s.qualityMetrics.overallStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `opticycle_history_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
            Scan History & Chromatic Trends
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-normal">
            Tracking longitudinal optical density and colorimetric coordinates across test entries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportAllHistoryCsv}
            disabled={filteredScans.length === 0}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold tracking-wide flex items-center gap-2 transition-colors disabled:opacity-50 shadow-xs leading-none"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs tracking-wide shadow-md shadow-pink-500/25 active:scale-95 transition-all leading-none"
          >
            New Scan
          </button>
        </div>
      </div>

      {/* Recharts Color Trend Chart */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600">
              <TrendingUp className="w-4 h-4 shrink-0" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Optical Density & RGB Response Curves
            </h2>
          </div>
          <span className="text-xs text-slate-500 tracking-wide font-medium">
            {chartData.length} Chronological Entries • Non-diagnostic prototype data
          </span>
        </div>

        {chartData.length < 2 ? (
          <div className="py-12 text-center text-xs sm:text-sm text-slate-500 leading-relaxed bg-[#faf8fb] rounded-2xl border border-dashed border-pink-100">
            Need at least 2 scans to render longitudinal trend curves.
          </div>
        ) : (
          <div className="w-full h-72 sm:h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#e11d48"
                  fontSize={11}
                  domain={[0, 1]}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, 255]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xl text-xs space-y-2 leading-tight">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-bold text-slate-900 tracking-tight">{data.title}</span>
                            <div
                              className="w-4 h-4 rounded-full border border-slate-200 shrink-0 shadow-xs"
                              style={{ backgroundColor: data.hex }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">{data.dateLabel}</p>
                          <div className="pt-2 border-t border-slate-100 space-y-1 font-mono text-xs tabular-nums">
                            <p className="text-pink-600 font-bold">
                              Optical Density: {data.opticalDensity.toFixed(2)} OD
                            </p>
                            <p className="text-slate-700">
                              RGB: ({data.r}, {data.g}, {data.b})
                            </p>
                            <p className="text-slate-500">Hex: {data.hex}</p>
                            {data.isSimulated && (
                              <p className="text-pink-700 text-[10px] font-sans font-bold uppercase tracking-wider">Simulated Entry</p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="opticalDensity"
                  name="Optical Density (OD)"
                  stroke="#e11d48"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#e11d48' }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="r"
                  name="Red Channel"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="g"
                  name="Green Channel"
                  stroke="#059669"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="b"
                  name="Blue Channel"
                  stroke="#0284c7"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#faf8fb] border border-pink-100/70 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shrink-0 leading-none ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Scans ({scans.length})
          </button>
          <button
            onClick={() => setFilterType('real')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shrink-0 leading-none ${
              filterType === 'real'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Actual Photos ({scans.filter((s) => !s.isSimulated).length})
          </button>
          <button
            onClick={() => setFilterType('simulated')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shrink-0 leading-none ${
              filterType === 'simulated'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simulated Benchmarks ({scans.filter((s) => s.isSimulated).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search scans by title, hex, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-pink-500 shadow-xs transition-colors tracking-normal"
          />
        </div>
      </div>

      {/* Scans List / Cards */}
      {filteredScans.length === 0 ? (
        <div className="bg-white border border-dashed border-pink-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 border border-pink-200/80 flex items-center justify-center mx-auto mb-2">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-slate-900 font-bold text-base tracking-tight">No Scans Match Filter</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `No scan records found matching "${searchQuery}".`
              : 'Start by capturing an optical patch with the scanner.'}
          </p>
          <button
            onClick={onOpenScanner}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold tracking-wide shadow-md shadow-pink-500/25 transition-colors leading-none"
          >
            Start Scan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScans.map((scan) => {
            const color = scan.calibratedColor || scan.rawColor;
            const isDeleting = deletingId === scan.id;

            return (
              <div
                key={scan.id}
                onClick={() => onViewScan(scan)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-3xl bg-white hover:bg-pink-50/40 border border-slate-100 hover:border-pink-200 cursor-pointer transition-all shadow-xs gap-4 ${
                  isDeleting ? 'opacity-30 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Swatch */}
                  <div
                    className="w-12 h-12 rounded-2xl shadow-xs border border-slate-200 shrink-0 relative overflow-hidden"
                    style={{ backgroundColor: color.hex }}
                  >
                    {scan.isCalibrated && (
                      <div
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-tl-md flex items-center justify-center text-[9px] text-white"
                        title="Calibrated"
                      >
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">{scan.title}</h3>
                      {scan.isSimulated ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-bold tracking-wider uppercase leading-none">
                          Simulated
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold tracking-wider uppercase leading-none">
                          Actual Image
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 leading-normal">
                      <span className="font-mono text-slate-800 font-bold tabular-nums">{color.hex}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        RGB({color.r}, {color.g}, {color.b})
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-pink-600 font-bold">
                        OD: <strong className="font-mono tabular-nums">{scan.simulatedInterpretation.chromaticIndex.toFixed(2)}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(scan.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Badges & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                  <span
                    className={`text-[11px] px-3 py-1 rounded-full font-bold tracking-wider uppercase leading-none ${
                      scan.qualityMetrics.overallStatus === 'pass'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : scan.qualityMetrics.overallStatus === 'warning'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {scan.qualityMetrics.overallStatus.toUpperCase()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewScan(scan);
                      }}
                      className="p-2.5 rounded-xl text-slate-600 hover:text-pink-600 hover:bg-pink-50 border border-slate-200 transition-colors shadow-xs"
                      title="Inspect scan details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleDelete(scan.id, e)}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors shadow-xs"
                      title="Delete scan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
