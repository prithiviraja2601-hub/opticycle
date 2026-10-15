import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Flashlight,
  AlertCircle,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2,
  X,
} from 'lucide-react';

interface CameraScannerProps {
  onImageCaptured: (imageDataUrl: string, isSampleTest?: boolean) => void;
  onCancel: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onImageCaptured, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'sample'>('camera');
  const [isCapturing, setIsCapturing] = useState(false);

  // Initialize camera
  const startCamera = async (mode: 'environment' | 'user' = 'environment') => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);

        // Check if torch is supported
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        if (capabilities.torch) {
          setTorchAvailable(true);
        }
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      let errMsg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission was denied. Please allow camera permissions in browser settings or use image upload below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera device found on this system. You can upload an image or choose a sample test strip.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is currently in use by another application.';
      }
      setCameraError(errMsg);
      setCameraActive(false);
      setActiveTab('upload');
    }
  };

  // Stop camera stream safely
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Flip camera between environment and user
  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Take photo from video feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);
      stopCamera();
    }
    setIsCapturing(false);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Generate synthetic sample strip image on canvas
  const generateSampleStripImage = (type: 'baseline' | 'moderate' | 'peak') => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d')!;

    // Background: Lab bench light surface
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, 0, 1200, 900);

    // Subtle table texture
    ctx.fillStyle = '#E2E8F0';
    for (let i = 0; i < 900; i += 40) {
      ctx.fillRect(0, i, 1200, 1);
    }

    // 1. Reference Card (Bottom Area)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(150, 600, 900, 220, 16);
    ctx.fill();
    ctx.stroke();

    // Reference Card Title
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('OPTICYCLE 6-PATCH CALIBRATION TARGET (ISO 11664)', 180, 640);

    const refColors = [
      { name: 'White', color: '#F0F0F0', border: '#D1D5DB' },
      { name: 'Gray', color: '#808080', border: '#64748B' },
      { name: 'Black', color: '#202024', border: '#0F172A' },
      { name: 'Cyan', color: '#00A8CC', border: '#0891B2' },
      { name: 'Magenta', color: '#D63384', border: '#BE185D' },
      { name: 'Yellow', color: '#FFCC00', border: '#D97706' },
    ];

    refColors.forEach((patch, idx) => {
      const px = 180 + idx * 145;
      const py = 660;
      ctx.fillStyle = patch.color;
      ctx.fillRect(px, py, 120, 120);
      ctx.strokeStyle = patch.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, 120, 120);

      ctx.fillStyle = '#475569';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(patch.name, px + 10, py + 140);
    });

    // 2. Lateral Flow Test Strip Cassette (Center Area)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(350, 120, 500, 420, 20);
    ctx.fill();
    ctx.stroke();

    // Cassette Branding
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('OPTICYCLE TEST CARTRIDGE', 390, 165);
    ctx.fillStyle = '#64748B';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Lateral Flow Optical Immunoassay - Research Grade', 390, 190);

    // Nitrocellulose Strip Membrane Window
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3;
    ctx.fillRect(480, 220, 240, 280);
    ctx.strokeRect(480, 220, 240, 280);

    // Control Line (C Line) - standard consistent red/magenta band
    ctx.fillStyle = '#BE185D';
    ctx.fillRect(520, 270, 160, 18);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('C', 700, 284);

    // Test Line (T Line) - depends on type
    let testColor = '#F2D3DF'; // Baseline faint
    if (type === 'moderate') testColor = '#DB7CA0';
    if (type === 'peak') testColor = '#CC3E7A';

    ctx.fillStyle = testColor;
    ctx.fillRect(520, 390, 160, 22);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('T', 700, 406);

    // Guide target markers
    ctx.strokeStyle = '#F43F5E';
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(510, 375, 180, 52);
    ctx.setLineDash([]);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    setCapturedImage(dataUrl);
  };

  // Mount effect to start camera when activeTab is camera
  useEffect(() => {
    if (activeTab === 'camera' && !capturedImage) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const handleRetake = () => {
    setCapturedImage(null);
    if (activeTab === 'camera') {
      startCamera(facingMode);
    }
  };

  const handleProceed = () => {
    if (capturedImage) {
      stopCamera();
      onImageCaptured(capturedImage, activeTab === 'sample');
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-8 max-w-4xl mx-auto shadow-sm">
      <div className="flex items-center justify-between pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 border border-pink-200/80 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">Optical Patch Scanner</h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-normal">Position test patch and reference card in view</p>
          </div>
        </div>

        <button
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Close Scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 mt-6 p-1.5 bg-[#faf8fb] rounded-2xl border border-pink-100/70">
        <button
          onClick={() => {
            setActiveTab('camera');
            setCapturedImage(null);
          }}
          className={`flex-1 py-2.5 px-3 text-xs font-semibold tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all leading-none ${
            activeTab === 'camera'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span>Live Camera</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('upload');
            stopCamera();
          }}
          className={`flex-1 py-2.5 px-3 text-xs font-semibold tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all leading-none ${
            activeTab === 'upload'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span>Upload Photo</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('sample');
            stopCamera();
          }}
          className={`flex-1 py-2.5 px-3 text-xs font-semibold tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all leading-none ${
            activeTab === 'sample'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Synthetic Strip</span>
        </button>
      </div>

      {/* Main View Area */}
      <div className="mt-6">
        {capturedImage ? (
          /* Preview of captured/selected image */
          <div className="space-y-5">
            <div className="relative aspect-video sm:aspect-[4/3] max-h-[500px] w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 shadow-sm">
              <img
                src={capturedImage}
                alt="Captured strip preview"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-xs font-semibold text-slate-800 border border-slate-200 flex items-center gap-2 shadow-xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Image Acquired</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={handleRetake}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake / Choose Another</span>
              </button>

              <button
                onClick={handleProceed}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-bold shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/35 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Run Quality Check & Analyze</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : activeTab === 'camera' ? (
          /* Live Camera View */
          <div className="space-y-4">
            <div className="relative aspect-[4/3] max-h-[480px] w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 shadow-sm">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Optical Positioning Guide Overlay */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                  {/* Top Status */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-slate-800 text-xs font-semibold tracking-wide border border-slate-200 leading-none shadow-xs">
                      Distance: 15–20 cm
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-emerald-700 text-xs font-semibold tracking-wide border border-slate-200 flex items-center gap-2 leading-none shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Sensor</span>
                    </span>
                  </div>

                  {/* Center Test Patch Target Reticle */}
                  <div className="relative self-center w-60 h-40 border-2 border-dashed border-pink-400 rounded-2xl bg-pink-500/15 flex flex-col items-center justify-center shadow-lg shadow-pink-500/20 p-2 text-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider bg-slate-900/80 px-3 py-1 rounded-lg leading-tight backdrop-blur-xs">
                      Center Test Strip (T-Band)
                    </span>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-pink-400 rounded-full" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-pink-400 rounded-full" />
                  </div>

                  {/* Bottom Reference Card Alignment Target */}
                  <div className="w-full max-w-md self-center h-20 border-2 border-dotted border-cyan-400 rounded-2xl bg-cyan-500/15 flex items-center justify-center p-2 text-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider bg-slate-900/80 px-3 py-1 rounded-lg leading-tight backdrop-blur-xs">
                      Align 6-Color Reference Card Here
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Error / Inactive State */}
              {!cameraActive && (
                <div className="text-center p-6 max-w-md">
                  <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                  <h4 className="text-white font-bold text-base">Camera Unavailable</h4>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {cameraError || 'Allow camera permission or choose image upload / synthetic test strip.'}
                  </p>
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="mt-4 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-sm inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera Controls Bar */}
            {cameraActive && (
              <div className="flex items-center justify-between gap-4 p-3.5 bg-[#faf8fb] rounded-2xl border border-slate-150">
                <div className="flex items-center gap-2">
                  {torchAvailable && (
                    <button
                      onClick={toggleTorch}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        torchOn
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="Toggle Torch / Flashlight"
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={switchCamera}
                    className="p-3 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
                    title="Switch Front / Rear Camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Shutter Button */}
                <button
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-600 hover:opacity-95 border-4 border-white shadow-lg shadow-pink-500/35 active:scale-90 transition-transform flex items-center justify-center cursor-pointer"
                  aria-label="Capture photo"
                >
                  <div className="w-9 h-9 rounded-full bg-white/95" />
                </button>

                <div className="w-20 text-right text-[11px] font-medium text-slate-500">
                  <span>Rear Lens Preferred</span>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'upload' ? (
          /* Upload View */
          <div className="border-2 border-dashed border-pink-200 hover:border-pink-400 rounded-3xl p-8 sm:p-12 text-center transition-colors bg-[#faf8fb]">
            <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 border border-pink-200/80 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-slate-900 font-bold text-base">Upload Test Strip Image</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1 leading-relaxed">
              Upload a clear photo containing both your test patch and the color calibration card. Supported: JPEG, PNG, WebP (up to 15MB).
            </p>

            <label className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-sm cursor-pointer shadow-md shadow-pink-500/25 active:scale-95 transition-all">
              <Upload className="w-4 h-4" />
              <span>Select Photo File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          /* Synthetic Strip Presets for Quick Testing */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-pink-50/80 border border-pink-200/80 text-pink-900 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
              <p>
                <strong>Synthetic Test Bench:</strong> Test the entire optical densitometry and calibration pipeline using calibrated lateral-flow simulation patterns without requiring a physical test strip.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => generateSampleStripImage('baseline')}
                className="p-5 rounded-2xl bg-[#faf8fb] hover:bg-pink-50/50 border border-slate-100 hover:border-pink-300 cursor-pointer transition-all group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs mb-3 group-hover:scale-105 transition-transform">
                  01
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Baseline Phase Strip</h4>
                <p className="text-xs text-slate-500 mt-1">Faint test band, low optical density (OD ~0.25).</p>
                <div className="mt-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center px-1">
                  <div className="h-2 w-1/4 rounded-full bg-rose-300" />
                </div>
              </div>

              <div
                onClick={() => generateSampleStripImage('moderate')}
                className="p-5 rounded-2xl bg-[#faf8fb] hover:bg-pink-50/50 border border-slate-100 hover:border-pink-300 cursor-pointer transition-all group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs mb-3 group-hover:scale-105 transition-transform">
                  02
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Mid-Phase Rise Strip</h4>
                <p className="text-xs text-slate-500 mt-1">Medium saturation test band (OD ~0.55).</p>
                <div className="mt-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center px-1">
                  <div className="h-2 w-2/3 rounded-full bg-rose-400" />
                </div>
              </div>

              <div
                onClick={() => generateSampleStripImage('peak')}
                className="p-5 rounded-2xl bg-[#faf8fb] hover:bg-pink-50/50 border border-slate-100 hover:border-pink-300 cursor-pointer transition-all group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs mb-3 group-hover:scale-105 transition-transform">
                  03
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Peak Surge Band Strip</h4>
                <p className="text-xs text-slate-500 mt-1">High dye absorption, strong contrast (OD ~0.82).</p>
                <div className="mt-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center px-1">
                  <div className="h-2 w-5/6 rounded-full bg-rose-600" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
