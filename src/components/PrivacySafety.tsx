import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Server,
  FileText,
  HeartPulse,
} from 'lucide-react';

interface PrivacySafetyProps {
  onClearAllHistory: () => void;
  totalScansCount: number;
}

export const PrivacySafety: React.FC<PrivacySafetyProps> = ({
  onClearAllHistory,
  totalScansCount,
}) => {
  const [cleared, setCleared] = useState(false);

  const handleWipeData = () => {
    if (
      confirm(
        'Are you sure you want to delete all scans from both local storage and the database? This action is irreversible.'
      )
    ) {
      onClearAllHistory();
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-8 max-w-5xl mx-auto shadow-sm space-y-8 pb-12">
      {/* Title */}
      <div className="pb-5 border-b border-slate-100">
        <div className="flex items-center gap-2 text-pink-700 text-xs font-bold uppercase tracking-wider mb-2 leading-none">
          <Shield className="w-4 h-4 shrink-0" />
          <span>Data Privacy, Ephemeral Processing & Safety Principles</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug">
          Privacy & Clinical Safety Architecture
        </h1>
        <p className="text-xs sm:text-base text-slate-500 mt-2 leading-relaxed">
          How OptiCycle protects user privacy, enforces local data ownership, and safeguards experimental biomedical research boundaries.
        </p>
      </div>

      {/* Safety & Non-Diagnostic Clinical Warning */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 sm:p-6 flex items-start gap-4">
        <HeartPulse className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-rose-900 leading-relaxed space-y-2">
          <h2 className="font-bold text-sm sm:text-base text-slate-900 tracking-normal leading-snug">
            Mandatory Non-Diagnostic Warning & Medical Guidance
          </h2>
          <p className="leading-relaxed">
            OptiCycle is exclusively an experimental optical research prototype. <strong>It does not measure hormone concentrations, diagnose fertility conditions, predict ovulation events, or replace clinical laboratory tests.</strong>
          </p>
          <p className="leading-relaxed">
            Always seek direct consultation with a qualified medical physician or certified healthcare provider for any questions regarding reproductive health, fertility treatment, cycle irregularities, or clinical diagnosis.
          </p>
        </div>
      </div>

      {/* Privacy Commitments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#faf8fb] border border-slate-150 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Ephemeral Image Buffers</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Uploaded and camera-captured images sent to the REST API are processed in volatile temporary memory and permanently unlinked via <code className="text-pink-700 font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">fs.unlink()</code> immediately upon feature extraction. Full camera frames are never retained on the server.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#faf8fb] border border-slate-150 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <EyeOff className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">No Personal Health Tracking</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            OptiCycle collects zero personally identifiable information (PII), names, medical records, IP addresses, or biometrics. All analyses are strictly tied to randomized anonymous scan identifiers.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#faf8fb] border border-slate-150 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Camera Stream Lifecycle Safety</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Camera video streams are explicitly terminated (<code className="text-pink-700 font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">track.stop()</code>) as soon as you capture a photo or navigate away from the scanner, preventing background camera access.
          </p>
        </div>
      </div>

      {/* User Data Ownership & Complete Purge Control */}
      <div className="p-6 sm:p-7 rounded-2xl bg-[#faf8fb] border border-slate-150 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">User Data Purge Control</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-normal">
              Permanently delete all stored historical scans (<strong className="font-mono text-slate-900 tabular-nums font-bold">{totalScansCount}</strong> entries) from local storage and SQLite.
            </p>
          </div>

          <button
            onClick={handleWipeData}
            disabled={totalScansCount === 0}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs tracking-wide flex items-center gap-2 transition-colors self-start sm:self-auto leading-none shrink-0 shadow-xs"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Wipe All Stored Scans</span>
          </button>
        </div>

        {cleared && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 leading-normal">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All historical records successfully expunged.</span>
          </div>
        )}
      </div>
    </div>
  );
};
