import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CameraScanner } from './components/CameraScanner';
import { QualityCheckView } from './components/QualityCheckView';
import { CalibrationView } from './components/CalibrationView';
import { AnalysisResults } from './components/AnalysisResults';
import { ScanHistory } from './components/ScanHistory';
import { ScanDetails } from './components/ScanDetails';
import { AboutSection } from './components/AboutSection';
import { PrivacySafety } from './components/PrivacySafety';
import { CycleTrackingView } from './components/CycleTrackingView';
import {
  ActiveTab,
  ScanRecord,
  CalibrationResult,
  QualityMetrics,
} from './types';
import {
  checkBackendHealth,
  apiGetScans,
  apiCheckQuality,
  apiAnalyzeScan,
  apiDeleteScan,
} from './services/api';
import {
  Activity,
  Camera,
  Sliders,
  History,
  ShieldAlert,
  Loader2,
  Sparkles,
  CalendarDays,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [backendOnline, setBackendOnline] = useState(false);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);

  // Active calibration profile in memory
  const [activeCalibration, setActiveCalibration] = useState<CalibrationResult | null>(null);

  // Current scanner & analysis workflow states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<ScanRecord | null>(null);
  const [selectedScanDetail, setSelectedScanDetail] = useState<ScanRecord | null>(null);

  // Initial load: check health and fetch scans
  useEffect(() => {
    async function init() {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);

      try {
        const fetchedScans = await apiGetScans();
        setScans(fetchedScans);
      } catch (e) {
        console.warn('Initial fetch error:', e);
      } finally {
        setLoadingScans(false);
      }
    }
    init();

    // Periodic health check every 30 seconds
    const interval = setInterval(async () => {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // When photo captured from scanner
  const handleImageCaptured = async (imageDataUrl: string, isSampleTest: boolean = false) => {
    setCapturedImage(imageDataUrl);
    setAnalyzing(true);
    setActiveTab('quality');

    try {
      const metrics = await apiCheckQuality(imageDataUrl);
      setQualityMetrics(metrics);
    } catch (err) {
      console.error('Quality check failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // When user proceeds from Quality Check to Analysis
  const handleProceedToAnalysis = async () => {
    if (!capturedImage) return;
    setAnalyzing(true);

    try {
      // Standard central patch coordinates (40% x, 40% y, 20% w, 20% h)
      const patchCoordinates = { x: 0.42, y: 0.4, width: 0.16, height: 0.2 };
      const scan = await apiAnalyzeScan({
        image: capturedImage,
        patchCoordinates,
        calibrationMatrix: activeCalibration?.success ? activeCalibration.matrix : null,
        calibrationResult: activeCalibration,
        title: `Optical Scan ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        isSimulated: capturedImage.includes('data:image/jpeg') && !capturedImage.startsWith('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD'),
      });

      setCurrentAnalysis(scan);
      // Prepend to scans list
      setScans((prev) => [scan, ...prev.filter((s) => s.id !== scan.id)]);
      setActiveTab('analysis');
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Save scan to history
  const handleSaveToHistory = async (scan: ScanRecord) => {
    setScans((prev) => {
      if (prev.some((s) => s.id === scan.id)) return prev;
      return [scan, ...prev];
    });
  };

  // Delete scan
  const handleDeleteScan = async (id: string) => {
    await apiDeleteScan(id);
    setScans((prev) => prev.filter((s) => s.id !== id));
    if (selectedScanDetail?.id === id) {
      setSelectedScanDetail(null);
      setActiveTab('history');
    }
  };

  // Clear all scans
  const handleClearAllHistory = async () => {
    for (const s of scans) {
      await apiDeleteScan(s.id);
    }
    setScans([]);
    setSelectedScanDetail(null);
  };

  // View specific scan in details
  const handleViewScan = (scan: ScanRecord) => {
    setSelectedScanDetail(scan);
    setActiveTab('details');
  };

  return (
    <div className="min-h-screen bg-[#fbfafd] text-slate-900 flex flex-col font-sans selection:bg-pink-500 selection:text-white antialiased">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        activeCalibration={activeCalibration}
        backendOnline={backendOnline}
        onOpenScanner={() => {
          setCapturedImage(null);
          setQualityMetrics(null);
          setActiveTab('scanner');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32 sm:pb-24">
        {/* Loading overlay for async analysis */}
        {analyzing && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl border border-pink-100 flex items-center justify-center text-pink-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="text-center bg-white/95 px-6 py-3 rounded-2xl shadow-lg border border-pink-100">
              <p className="text-base font-bold text-slate-900">Performing Optical Densitometry...</p>
              <p className="text-xs text-slate-500 mt-0.5">Computing Laplacian variance & affine calibration</p>
            </div>
          </div>
        )}

        {/* Dynamic Section View */}
        {activeTab === 'dashboard' && (
          <Dashboard
            scans={scans}
            activeCalibration={activeCalibration}
            onOpenScanner={() => {
              setCapturedImage(null);
              setActiveTab('scanner');
            }}
            onOpenCalibration={() => setActiveTab('calibration')}
            onOpenCycleTracker={() => setActiveTab('cycle')}
            onViewScan={handleViewScan}
            onViewAllHistory={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'cycle' && (
          <CycleTrackingView
            onOpenScanner={() => {
              setCapturedImage(null);
              setActiveTab('scanner');
            }}
          />
        )}

        {activeTab === 'scanner' && (
          <CameraScanner
            onImageCaptured={handleImageCaptured}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'quality' && capturedImage && qualityMetrics && (
          <QualityCheckView
            metrics={qualityMetrics}
            imagePreview={capturedImage}
            onRetake={() => {
              setCapturedImage(null);
              setQualityMetrics(null);
              setActiveTab('scanner');
            }}
            onProceed={handleProceedToAnalysis}
          />
        )}

        {activeTab === 'calibration' && (
          <CalibrationView
            currentCalibration={activeCalibration}
            onCalibrationSaved={(cal) => {
              setActiveCalibration(cal);
            }}
            imagePreview={capturedImage}
          />
        )}

        {activeTab === 'analysis' && currentAnalysis && (
          <AnalysisResults
            scan={currentAnalysis}
            onRetake={() => {
              setCapturedImage(null);
              setQualityMetrics(null);
              setActiveTab('scanner');
            }}
            onSaveToHistory={handleSaveToHistory}
            onViewAllHistory={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'history' && (
          <ScanHistory
            scans={scans}
            onViewScan={handleViewScan}
            onDeleteScan={handleDeleteScan}
            onOpenScanner={() => {
              setCapturedImage(null);
              setActiveTab('scanner');
            }}
          />
        )}

        {activeTab === 'details' && selectedScanDetail && (
          <ScanDetails
            scan={selectedScanDetail}
            onBack={() => setActiveTab('history')}
            onDelete={handleDeleteScan}
          />
        )}

        {activeTab === 'about' && <AboutSection />}

        {activeTab === 'privacy' && (
          <PrivacySafety
            onClearAllHistory={handleClearAllHistory}
            totalScansCount={scans.length}
          />
        )}
      </main>

      {/* Persistent Bottom Mobile Navigation Bar for Touch Devices */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-2 flex items-center justify-around text-xs text-slate-500 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-1 tracking-wide leading-none transition-colors ${
            activeTab === 'dashboard' ? 'text-pink-600 font-bold' : 'hover:text-slate-900'
          }`}
        >
          <Activity className="w-5 h-5 shrink-0" />
          <span className="text-[11px]">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('cycle')}
          className={`flex flex-col items-center gap-1 p-1 tracking-wide leading-none transition-colors ${
            activeTab === 'cycle' ? 'text-pink-600 font-bold' : 'hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-5 h-5 shrink-0" />
          <span className="text-[11px]">Cycle</span>
        </button>

        <button
          onClick={() => {
            setCapturedImage(null);
            setActiveTab('scanner');
          }}
          className="flex flex-col items-center gap-1 text-white -mt-5"
        >
          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/35 border-2 border-white active:scale-95 transition-transform">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-[11px] text-pink-600 tracking-wider uppercase leading-none mt-0.5">Scan</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 p-1 tracking-wide leading-none transition-colors ${
            activeTab === 'history' ? 'text-pink-600 font-bold' : 'hover:text-slate-900'
          }`}
        >
          <History className="w-5 h-5 shrink-0" />
          <span className="text-[11px]">History</span>
        </button>

        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex flex-col items-center gap-1 p-1 tracking-wide leading-none transition-colors ${
            activeTab === 'calibration' ? 'text-pink-600 font-bold' : 'hover:text-slate-900'
          }`}
        >
          <Sliders className="w-5 h-5 shrink-0" />
          <span className="text-[11px]">Calibrate</span>
        </button>
      </nav>

      {/* Desktop Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-10 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto space-y-3.5">
          <p className="font-bold text-slate-800 tracking-normal text-sm sm:text-base">
            OptiCycle Optical Biosensing & Colorimetric Research Platform
          </p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mx-auto">
            Research prototype. Results are experimental and not clinically validated. Not for medical diagnosis or treatment. All interpretations use simulated and representative reference data.
          </p>
          <div className="flex justify-center items-center gap-5 text-xs text-slate-500 pt-1 tracking-wide">
            <button onClick={() => setActiveTab('cycle')} className="hover:text-pink-600 transition-colors">
              Menstrual Cycle
            </button>
            <span className="text-slate-300">•</span>
            <button onClick={() => setActiveTab('about')} className="hover:text-pink-600 transition-colors">
              Methodology
            </button>
            <span className="text-slate-300">•</span>
            <button onClick={() => setActiveTab('privacy')} className="hover:text-pink-600 transition-colors">
              Privacy & Safety
            </button>
            <span className="text-slate-300">•</span>
            <button onClick={() => setActiveTab('calibration')} className="hover:text-pink-600 transition-colors">
              Card Calibration
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
