/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { db, getCurrencySymbol } from '../lib/db';
import type { Business, User, Product, Service } from '../types';
import { 
  QrCode, X, Flashlight, Volume2, AlertTriangle, CheckCircle2, 
  Send, Camera, RefreshCw, Plus, Package, ShoppingCart, Sparkles, AlertCircle, Smartphone, Wifi, WifiOff, Clock
} from 'lucide-react';

export function isSupportedMobileDevice(): boolean {
  if (typeof window === 'undefined' || !navigator) return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPod|iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobileUA = isAndroid || isIOS || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  return Boolean(isMobileUA && hasTouch);
}

interface InAppMobileScannerModalProps {
  business: Business;
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onItemScanned?: (item: Product | Service, type: 'product' | 'service', barcode: string) => void;
  onScannerConnected?: (sessionId: string) => void;
}

export function InAppMobileScannerModal({
  business,
  user,
  isOpen,
  onClose,
  onItemScanned,
  onScannerConnected
}: InAppMobileScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [isBeepEnabled, setIsBeepEnabled] = useState(true);
  const [scanNotification, setScanNotification] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');

  const [scannedCount, setScannedCount] = useState(0);
  const [scannedLog, setScannedLog] = useState<Array<{ barcode: string; name: string; price: number; time: string }>>([]);

  // Not Found Modal overlay state
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductPrice, setQuickProductPrice] = useState<number | ''>('');
  const [quickProductCategory, setQuickProductCategory] = useState('General');
  const [quickProductStock, setQuickProductStock] = useState(10);

  // Camera devices selection
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamId, setSelectedCamId] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  const currencySymbol = getCurrencySymbol(business?.currency || 'GHS');

  // Audio Beep generator
  const playSuccessBeep = () => {
    if (!isBeepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio beep error:', e);
    }
  };

  const playWarningBeep = () => {
    if (!isBeepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio beep error:', e);
    }
  };

  // Process Scanned Code
  const handleBarcodeDetected = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    // Cooldown check for duplicate scans within 1.5 seconds
    const now = Date.now();
    if (code === lastScannedCodeRef.current && now - lastScanTimeRef.current < 1500) {
      return;
    }
    lastScanTimeRef.current = now;
    lastScannedCodeRef.current = code;

    // Search Inventory
    const products = db.getProducts(business.id);
    const foundProduct = products.find(p => 
      p.barcode === code || 
      p.barcodeOptional === code || 
      p.id === code || 
      p.qrCode === code || 
      (p as any).sku === code
    );

    const services = db.getServices(business.id);
    const foundService = !foundProduct ? services.find(s => s.code === code || s.id === code) : null;

    if (foundProduct) {
      playSuccessBeep();
      const price = typeof foundProduct.sellingPrice === 'number' ? foundProduct.sellingPrice : (foundProduct.price || 0);

      if (onItemScanned) {
        onItemScanned(foundProduct, 'product', code);
      }

      setScannedCount(prev => prev + 1);
      setScannedLog(prev => [
        { barcode: code, name: foundProduct.name, price, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
        ...prev
      ]);

      setScanNotification(`✓ "${foundProduct.name}" added to receipt (${currencySymbol} ${price.toFixed(2)})`);
      setTimeout(() => setScanNotification(null), 2500);

    } else if (foundService) {
      playSuccessBeep();
      const price = foundService.price || 0;

      if (onItemScanned) {
        onItemScanned(foundService, 'service', code);
      }

      setScannedCount(prev => prev + 1);
      setScannedLog(prev => [
        { barcode: code, name: foundService.name, price, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
        ...prev
      ]);

      setScanNotification(`✓ "${foundService.name}" added to receipt (${currencySymbol} ${price.toFixed(2)})`);
      setTimeout(() => setScanNotification(null), 2500);

    } else {
      playWarningBeep();
      setNotFoundBarcode(code);
      setQuickProductName(`Scanned Product (${code})`);
      setQuickProductPrice('');
      setQuickProductCategory('General');
      setQuickProductStock(10);
    }
  };

  // Start Camera Stream
  const startCamera = async (overrideCamId?: string) => {
    setCameraError('');
    setIsScanning(false);

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode('in-app-scanner-viewport');
      html5QrCodeRef.current = html5QrCode;

      // Enumerate camera devices
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices.map(d => ({ id: d.id, label: d.label || `Camera (${d.id.substring(0, 6)})` })));
          if (!overrideCamId && !selectedCamId) {
            const rearCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') || 
              d.label.toLowerCase().includes('environment')
            );
            if (rearCam) {
              setSelectedCamId(rearCam.id);
            } else {
              setSelectedCamId(devices[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Could not list cameras:', err);
      }

      const targetCamId = overrideCamId || selectedCamId;
      const cameraConfig = targetCamId ? { deviceId: { exact: targetCamId } } : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.3333
        },
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // ignore frame scan failures
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('In-app camera initialization error:', err);
      let errMsg = 'Unable to access camera. Please verify browser permissions.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.message?.includes('Permission denied')) {
        errMsg = 'Camera permission was denied. Please allow camera access in your browser settings to scan barcodes.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errMsg = 'No camera found on this device. You can enter barcodes manually below.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errMsg = 'Camera is currently in use by another application. Please close other camera apps and retry.';
      }
      setCameraError(errMsg);
      setIsScanning(false);
    }
  };

  // Stop Camera Stream and release tracks
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  // Flashlight Torch
  const toggleFlashlight = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
      if ((capabilities as any).torch) {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: !torchOn } as any]
        });
        setTorchOn(!torchOn);
      } else {
        alert('Flashlight torch is not supported on this device.');
      }
    } catch (err) {
      console.warn('Flashlight error:', err);
    }
  };

  // Switch camera device
  const handleSwitchCamera = (newCamId: string) => {
    setSelectedCamId(newCamId);
    startCamera(newCamId);
  };

  // Manual submission handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarcodeDetected(manualBarcode);
    setManualBarcode('');
  };

  // Quick Product Create handler
  const handleQuickCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notFoundBarcode || !quickProductName || quickProductPrice === '') return;

    const numPrice = typeof quickProductPrice === 'number' ? quickProductPrice : parseFloat(quickProductPrice);

    const newProd: Product = {
      id: 'prod-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: quickProductName,
      barcode: notFoundBarcode,
      description: `Quick created via scanner for barcode ${notFoundBarcode}`,
      sellingPrice: numPrice,
      costPrice: Math.round(numPrice * 0.7 * 100) / 100,
      price: numPrice,
      stockQuantity: quickProductStock || 1,
      category: quickProductCategory || 'General',
      updatedAt: new Date().toISOString()
    };

    db.saveProduct(business.id, newProd);

    if (onItemScanned) {
      onItemScanned(newProd, 'product', notFoundBarcode);
    }

    setScannedCount(prev => prev + 1);
    setScannedLog(prev => [
      { barcode: notFoundBarcode, name: newProd.name, price: numPrice, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
      ...prev
    ]);

    setScanNotification(`✓ Created & added "${newProd.name}" (${currencySymbol} ${numPrice.toFixed(2)})`);
    setTimeout(() => setScanNotification(null), 3000);

    setNotFoundBarcode(null);
  };

  // Desktop QR pairing states
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'connected' | 'disconnected' | 'expired'>('waiting');

  const createNewSession = () => {
    const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    setCurrentSessionId(newSessionId);
    setSessionStatus('waiting');

    // Save session in DB with 5 minute expiration
    db.saveScannerSession(business?.id || '', newSessionId, user?.id, undefined, 5);

    const qrUrl = `${window.location.origin}/mobile-scanner/${business?.id || ''}/${newSessionId}`;
    QRCode.toDataURL(qrUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#064e3b',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  };

  const handleGenerateNewQrCode = () => {
    createNewSession();
    setScanNotification('✓ Generated new pairing QR code');
    setTimeout(() => setScanNotification(null), 2500);
  };

  const isMobile = isSupportedMobileDevice();

  // Initialize Desktop QR session when modal opens
  useEffect(() => {
    if (isOpen && !isMobile) {
      createNewSession();
    }
  }, [isOpen, isMobile, business?.id]);

  // Track auto-close timer
  const [autoCloseTriggered, setAutoCloseTriggered] = useState(false);

  // Polling for session status and scanned items on Desktop
  useEffect(() => {
    if (!isOpen || isMobile || !currentSessionId) return;

    const interval = setInterval(() => {
      // 1. Check session connection status
      const session = db.getScannerSession(business?.id || '', currentSessionId);
      if (session) {
        if (session.status === 'expired') {
          setSessionStatus('expired');
        } else if (session.status === 'connected') {
          setSessionStatus('connected');
          if (onScannerConnected) {
            onScannerConnected(currentSessionId);
          }
          if (!autoCloseTriggered) {
            setAutoCloseTriggered(true);
            setTimeout(() => {
              onClose();
            }, 1000);
          }
        } else if (session.status === 'disconnected') {
          setSessionStatus('disconnected');
        } else if (session.status === 'waiting') {
          setSessionStatus('waiting');
        }
      } else {
        setSessionStatus('expired');
      }

      // 2. Check for scanned items sent from mobile scanner
      const items = db.getScannedItemsForSession(business?.id || '', currentSessionId);
      if (items.length > 0) {
        items.forEach(payload => {
          const barcode = payload.barcode.trim();
          if (!barcode) return;

          const products = db.getProducts(business?.id || '');
          const services = db.getServices(business?.id || '');

          const matchedProd = products.find(p => p.barcode === barcode || p.id === barcode);
          const matchedServ = services.find(s => s.code === barcode || s.id === barcode);

          if (matchedProd) {
            if (onItemScanned) {
              onItemScanned(matchedProd, 'product', barcode);
            }
            playSuccessBeep();
            setScanNotification(`📱 Mobile Scanner: Added "${matchedProd.name}" (${currencySymbol} ${matchedProd.price.toFixed(2)})`);
            setScannedCount(prev => prev + 1);
            setScannedLog(prev => [{
              barcode,
              name: matchedProd.name,
              price: matchedProd.price,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }, ...prev]);
          } else if (matchedServ) {
            if (onItemScanned) {
              onItemScanned(matchedServ, 'service', barcode);
            }
            playSuccessBeep();
            setScanNotification(`📱 Mobile Scanner: Added "${matchedServ.name}" (${currencySymbol} ${matchedServ.price.toFixed(2)})`);
            setScannedCount(prev => prev + 1);
            setScannedLog(prev => [{
              barcode,
              name: matchedServ.name,
              price: matchedServ.price,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }, ...prev]);
          } else {
            playWarningBeep();
            setScanNotification(`⚠️ Barcode ${barcode} not found in inventory`);
            setNotFoundBarcode(barcode);
          }
        });

        // Clear processed items from session queue
        db.clearScannedItemsForSession(business?.id || '', currentSessionId);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [isOpen, isMobile, currentSessionId, business?.id]);

  // Lifecycle when modal opens/closes on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, isMobile]);

  if (!isOpen) return null;

  // Desktop workflow: Connect Mobile Scanner QR Code pairing
  if (!isMobile) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 animate-in fade-in zoom-in duration-150">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#064E3B] text-white flex items-center justify-center shadow-md shrink-0">
                <QrCode className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Connect Mobile Scanner
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Pair your smartphone camera with active BusinessOS POS receipt
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Connection Status</span>
            {sessionStatus === 'waiting' && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                Waiting for mobile device...
              </span>
            )}
            {sessionStatus === 'connected' && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300/80 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Connected
              </span>
            )}
            {(sessionStatus === 'disconnected' || sessionStatus === 'expired') && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">
                <WifiOff className="h-3.5 w-3.5 text-slate-500" />
                {sessionStatus === 'expired' ? 'QR Code Expired' : 'Disconnected'}
              </span>
            )}
          </div>

          {/* QR Code Prominent Card */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-inner relative overflow-hidden space-y-4">
            <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center relative">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Mobile Scanner QR Code" className="w-56 h-56 object-contain rounded-xl" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              )}

              {sessionStatus === 'connected' && (
                <div className="absolute inset-0 bg-slate-950/85 rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-2 backdrop-blur-xs">
                  <div className="h-12 w-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-extrabold text-white">Phone Connected!</p>
                  <p className="text-xs text-emerald-300">Point phone camera at product barcodes to scan directly into active receipt.</p>
                </div>
              )}

              {sessionStatus === 'expired' && (
                <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-3">
                  <p className="text-sm font-bold text-rose-400">QR Code Expired</p>
                  <button
                    type="button"
                    onClick={handleGenerateNewQrCode}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                  >
                    Generate New QR Code
                  </button>
                </div>
              )}
            </div>

            <div className="text-center space-y-1 max-w-sm">
              <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                Scan this QR code with your phone to connect the Mobile Scanner.
              </p>
              <p className="text-[11px] text-slate-400">
                Opens directly in your phone's web browser — no app installation required.
              </p>
            </div>
          </div>

          {/* Live Scanned Items List */}
          {scannedLog.length > 0 && (
            <div className="space-y-2 bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  Added to Active Receipt ({scannedCount})
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-full font-extrabold">Real-time</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {scannedLog.slice(-4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl text-xs border border-emerald-100 shadow-2xs">
                    <span className="font-bold text-slate-800 truncate">{item.name}</span>
                    <span className="text-emerald-700 font-extrabold shrink-0 ml-2">{currencySymbol} {item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notification Toast Banner */}
          {scanNotification && (
            <div className="p-3 bg-emerald-600 text-white rounded-2xl text-xs font-extrabold shadow-md flex items-center gap-2 animate-in fade-in">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="truncate">{scanNotification}</span>
            </div>
          )}

          {/* Modal Action Footer */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerateNewQrCode}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <RefreshCw className="h-4 w-4 text-slate-600" />
              Generate New QR Code
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs transition cursor-pointer shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCloseModal = async () => {
    await stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                Mobile Barcode Scanner
                {scannedCount > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full">
                    {scannedCount} Scanned
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">Scan product barcodes directly into active receipt</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsBeepEnabled(!isBeepEnabled)}
              className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                isBeepEnabled ? 'bg-emerald-800 text-emerald-300' : 'bg-slate-800 text-slate-500'
              }`}
              title={isBeepEnabled ? 'Sound beep enabled' : 'Muted'}
            >
              <Volume2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={toggleFlashlight}
              className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                torchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
              title="Toggle Flashlight Torch"
            >
              <Flashlight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleCloseModal}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer ml-1"
              title="Close Scanner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Camera Selector (If multiple cameras detected) */}
          {availableCameras.length > 1 && (
            <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs font-medium">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                <Camera className="h-3.5 w-3.5 text-emerald-700" /> Switch Camera:
              </span>
              <select
                value={selectedCamId}
                onChange={(e) => handleSwitchCamera(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              >
                {availableCameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Camera Viewfinder Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative shadow-inner flex flex-col items-center justify-center min-h-[250px]">
            <div id="in-app-scanner-viewport" className="w-full h-full min-h-[250px]" />

            {/* Target Crosshair Overlay */}
            {isScanning && !notFoundBarcode && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-36 border-2 border-emerald-400 rounded-2xl relative shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-pulse">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#10b981]" />
                </div>
              </div>
            )}

            {/* Camera Error View */}
            {cameraError && (
              <div className="p-6 text-center space-y-3 text-rose-300 text-xs z-10 max-w-xs mx-auto">
                <AlertCircle className="h-8 w-8 mx-auto text-rose-400" />
                <p className="font-medium leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Grant Permission &amp; Retry
                </button>
              </div>
            )}
          </div>

          {/* Success Scan Toast Banner */}
          {scanNotification && (
            <div className="bg-emerald-900 text-white p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-in slide-in-from-top duration-200 border border-emerald-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
                <span>{scanNotification}</span>
              </div>
            </div>
          )}

          {/* Product Not Found Overlay Modal Dialog */}
          {notFoundBarcode && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 space-y-3 shadow-md animate-in zoom-in duration-150">
              <div className="flex items-start justify-between gap-2 border-b border-rose-200 pb-2.5">
                <div className="flex items-center gap-2 text-rose-900">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  <div>
                    <h3 className="font-extrabold text-xs">Product Not Found</h3>
                    <p className="text-[10px] text-rose-700 font-mono">Barcode: {notFoundBarcode}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotFoundBarcode(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                No item in inventory matches this barcode. You can quick-create the product below or skip to continue scanning.
              </p>

              {/* Quick Creation Form */}
              <form onSubmit={handleQuickCreateProduct} className="space-y-2.5 bg-white p-3 rounded-2xl border border-rose-200">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={quickProductName}
                    onChange={(e) => setQuickProductName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    placeholder="Enter product title..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Price ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={quickProductPrice}
                      onChange={(e) => setQuickProductPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-extrabold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Stock Qty</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={quickProductStock}
                      onChange={(e) => setQuickProductStock(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs shadow cursor-pointer transition flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Save &amp; Add to Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotFoundBarcode(null)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
                  >
                    Skip
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Manual SKU / Barcode Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Or enter barcode manually..."
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Send className="h-3.5 w-3.5" /> Submit
            </button>
          </form>

          {/* Scan Session History Log */}
          {scannedLog.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] border-b border-slate-200 pb-1.5 font-bold text-slate-700">
                <span>Recent Scanned Items</span>
                <span className="text-emerald-700">{scannedLog.length} Total</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {scannedLog.map((logItem, idx) => (
                  <div key={idx} className="p-1.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-900">{logItem.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({logItem.barcode})</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-800 shrink-0">
                      {currencySymbol} {logItem.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Keep camera pointed at barcodes to scan continuously
          </span>
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs cursor-pointer transition shadow-xs"
          >
            Done Scanning
          </button>
        </div>

      </div>
    </div>
  );
}
