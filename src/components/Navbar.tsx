import React, { useState } from 'react';
import {
  Activity,
  Camera,
  Sliders,
  History,
  Info,
  Shield,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ActiveTab, CalibrationResult } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeCalibration: CalibrationResult | null;
  backendOnline: boolean;
  onOpenScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeCalibration,
  backendOnline,
  onOpenScanner,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: Activity },
    { id: 'cycle' as ActiveTab, label: 'Cycle Tracker', icon: CalendarDays },
    { id: 'scanner' as ActiveTab, label: 'Scanner', icon: Camera },
    { id: 'calibration' as ActiveTab, label: 'Calibration', icon: Sliders },
    { id: 'history' as ActiveTab, label: 'Scan History', icon: History },
    { id: 'about' as ActiveTab, label: 'About', icon: Info },
    { id: 'privacy' as ActiveTab, label: 'Privacy & Safety', icon: Shield },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100/80 shadow-xs text-slate-900 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-pink-500/25 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-lg text-white tracking-tight">OC</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                  OptiCycle
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200/80">
                  Research
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 tracking-normal hidden sm:block leading-tight font-medium">
                Optical Biosensing & Colorimetry
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold tracking-normal transition-all leading-none ${
                    isActive
                      ? 'bg-pink-50 text-pink-700 border border-pink-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50/40'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Status Badges & Quick Action */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Calibration Status Badge */}
            <div
              onClick={() => handleNavClick('calibration')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors leading-none tracking-normal ${
                activeCalibration?.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'
              }`}
              title={
                activeCalibration?.success
                  ? `Active Affine Calibration (RMSE: ${activeCalibration.rmse})`
                  : 'No active card calibration. Using raw RGB measurements.'
              }
            >
              {activeCalibration?.success ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Calibrated (RMSE: <strong className="font-mono tabular-nums">{activeCalibration.rmse}</strong>)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Raw Mode</span>
                </>
              )}
            </div>

            {/* Backend Connectivity Status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border leading-none tracking-normal ${
                backendOnline
                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
              title={backendOnline ? 'REST API & SQLite Connected' : 'Client-Side Canvas Engine Mode'}
            >
              {backendOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>API Ready</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Client Fallback</span>
                </>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-xs tracking-wide shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/35 active:scale-95 transition-all leading-none"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>New Scan</span>
            </button>
          </div>

          {/* Mobile Menu Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenScanner}
              className="p-2 rounded-lg bg-pink-50 text-pink-700 border border-pink-200/80"
              title="Open Scanner"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-pink-100/80 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold tracking-normal transition-colors leading-none ${
                    isActive
                      ? 'bg-pink-50 text-pink-700 border border-pink-200/80'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Drawer Status Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <span className="font-bold text-slate-800">
                {activeCalibration?.success ? 'Calibrated' : 'Raw Mode'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span>{backendOnline ? 'Server Active' : 'Client Mode'}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
