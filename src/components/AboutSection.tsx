import React from 'react';
import {
  Info,
  Sliders,
  Sparkles,
  BookOpen,
  Cpu,
  ShieldAlert,
  Sun,
  Activity,
  Layers,
  FileText,
} from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-8 max-w-5xl mx-auto shadow-sm space-y-8 pb-12">
      {/* Title */}
      <div className="pb-5 border-b border-slate-100">
        <div className="flex items-center gap-2 text-pink-700 text-xs font-bold uppercase tracking-wider mb-2 leading-none">
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Scientific Methodology & Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug">
          About OptiCycle Optical Biosensing
        </h1>
        <p className="text-xs sm:text-base text-slate-500 mt-2 leading-relaxed">
          Standardizing smartphone-based colorimetry for optical lateral-flow membranes and diagnostic patches through rigorous affine illuminant calibration.
        </p>
      </div>

      {/* Prominent Prototype Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
          <p className="font-bold text-sm sm:text-base text-slate-900 tracking-normal mb-1">
            Research & Demonstration Boundary
          </p>
          <p className="leading-relaxed">
            OptiCycle is an optical engineering research prototype. <strong>Never use colorimetry readouts for clinical diagnosis, contraception, fertility management, or hormone therapy.</strong> Results are simulated and experimental. Consult accredited healthcare providers and standard certified immunoassay instruments for diagnostic needs.
          </p>
        </div>
      </div>

      {/* 1. Core Science: The Mobile Optical Problem */}
      <div className="space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
          <Sun className="w-5 h-5 text-amber-500 shrink-0" />
          <span>1. The Mobile Sensor Problem in Optical Densitometry</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Smartphone cameras are engineered to produce aesthetically pleasing consumer photographs, not calibrated spectrophotometric instruments. When a user captures a lateral-flow biosensing membrane or colorimetric test patch, three major sources of optical distortion occur:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs sm:text-sm pt-1">
          <div className="p-5 rounded-2xl bg-[#faf8fb] border border-pink-100/70 space-y-2 hover:bg-pink-50/40 transition-colors">
            <h3 className="font-bold text-slate-900 tracking-normal text-sm sm:text-base">Illuminant Color Temperature</h3>
            <p className="text-slate-600 leading-relaxed text-xs">
              Ambient lighting ranges from warm incandescent (2700K) to cool overcast daylight (6500K+). This shifts raw sensor RGB values by up to 45% across the visible spectrum.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#faf8fb] border border-pink-100/70 space-y-2 hover:bg-pink-50/40 transition-colors">
            <h3 className="font-bold text-slate-900 tracking-normal text-sm sm:text-base">Aggressive ISP Tone Mapping</h3>
            <p className="text-slate-600 leading-relaxed text-xs">
              Onboard Image Signal Processors apply non-linear gamma curves, spatial sharpening, and dynamic white balance (AWB) that corrupt quantitative color density.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#faf8fb] border border-pink-100/70 space-y-2 hover:bg-pink-50/40 transition-colors">
            <h3 className="font-bold text-slate-900 tracking-normal text-sm sm:text-base">Spectral Quantum Efficiency</h3>
            <p className="text-slate-600 leading-relaxed text-xs">
              Bayer color filter arrays (CFA) vary across smartphone models (Sony, Samsung, OmniVision sensors), resulting in disparate device-dependent RGB representations.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Affine Calibration Mathematics */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
          <Cpu className="w-5 h-5 text-pink-600 shrink-0" />
          <span>2. Least-Squares Affine Calibration Algorithm</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          To normalize ambient lighting variations without requiring a spectrophotometer, OptiCycle co-captures a 6-target color reference card alongside the test membrane. The linear color correction model is formulated as:
        </p>

        <div className="p-5 rounded-2xl bg-[#faf8fb] border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 overflow-x-auto text-center space-y-2.5 shadow-xs">
          <p className="text-slate-500 text-xs font-sans tracking-normal font-semibold">Linear Transformation with Offset Bias:</p>
          <p className="text-sm sm:text-base font-bold text-pink-600 tracking-wide">
            [ R_cal, G_cal, B_cal ]^T = M_(3×3) · [ R_raw, G_raw, B_raw ]^T + b_(3×1)
          </p>
          <p className="text-slate-500 text-xs font-sans">
            Expressed in homogeneous matrix coordinates as <code className="text-slate-900 font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">Y = X · W</code>
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Given <span className="font-mono text-pink-600 font-bold">N ≥ 3</span> measured reference patches in matrix <span className="font-mono text-slate-800 font-bold">X (N × 4)</span> and ground-truth sRGB values in matrix <span className="font-mono text-slate-800 font-bold">Y (N × 3)</span>, OptiCycle computes the optimal coefficient matrix <span className="font-mono text-slate-800 font-bold">W</span> via the regularized normal equations:
        </p>

        <div className="p-4 rounded-2xl bg-[#faf8fb] border border-slate-200 font-mono text-xs sm:text-sm text-center text-emerald-700 tracking-wide font-bold shadow-xs">
          W = (X^T · X + λ · I)^(-1) · X^T · Y
        </div>

        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          The residual Root Mean Square Error (RMSE) is calculated across all targets. If <span className="font-mono text-pink-600 font-bold tabular-nums">RMSE &gt; 38.0</span>, the calibration is marked unreliable, preventing misleading corrected readings and falling back to raw values.
        </p>
      </div>

      {/* 3. Pre-Analytical Quality Checks */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
          <Activity className="w-5 h-5 text-pink-600 shrink-0" />
          <span>3. Pre-Analytical Image Quality Verification</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Before performing color extraction, OptiCycle executes five automated quality filters:
        </p>

        <div className="space-y-3 pt-1">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#faf8fb] border border-slate-150 flex items-start gap-3.5 shadow-xs">
            <span className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 leading-none">
              A
            </span>
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-xs sm:text-sm tracking-normal">Focus & Motion Blur (Laplacian Variance)</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Convolves a 3×3 discrete Laplacian operator over the grayscale luminance channel to measure high-frequency spatial gradients. Blurred photos (variance &lt; 45) trigger an immediate retake directive.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#faf8fb] border border-slate-150 flex items-start gap-3.5 shadow-xs">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 leading-none">
              B
            </span>
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-xs sm:text-sm tracking-normal">Mean Luminance & Dynamic Range</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates perceived luminance (Y = 0.299R + 0.587G + 0.114B). Underexposed scenes (&lt; 45) and clipped overexposures (&gt; 230) are rejected to preserve linear sensor response.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#faf8fb] border border-slate-150 flex items-start gap-3.5 shadow-xs">
            <span className="w-7 h-7 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 leading-none">
              C
            </span>
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-xs sm:text-sm tracking-normal">Specular Glare Detection</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Detects concentrated bright reflections on glossy membrane housings where R, G, B values saturate near 255 with near-zero chromaticity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
