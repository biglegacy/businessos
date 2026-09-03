import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { Product, Service, Business } from '../types';
import { isSupportedMobileDevice } from './InAppMobileScannerModal';
import { 
  QrCode, Flashlight, CheckCircle2, AlertCircle, 
  ArrowLeft, Volume2, Send, Printer, Plus, Minus, Trash2, 
  ShoppingCart, Receipt, Check, Package, Sparkles, X, ListChecks, Smartphone
} from 'lucide-react';

interface MobileScannerProps {
  businessId?: string;
  sessionId?: string;
  onClose?: () => void;
}

interface CartLineItem {
  id: string;
  barcode: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'service';
  stockQuantity?: number;
  imageUrl?: string;
}

interface ReviewItem {
  reviewId: string;
  id: string;
  barcode: string;
  name: string;
  price: number;
  type: 'product' | 'service';
  stockQuantity?: number;
  imageUrl?: string;
  selected: boolean;
}

export const MobileScanner: React.FC<MobileScannerProps> = ({
  businessId: propBusinessId,
  sessionId: propSessionId,
  onClose
}) => {
  // Extract businessId & sessionId from props OR URL path:
  // Supported patterns:
  // - /mobile-scanner/:businessId/:sessionId
  // - /scanner/:businessId/:sessionId
  // - /mobile-scanner/session/:sessionId/:businessId
  // - /mobile-scanner/session/:sessionId
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let pathBusinessId = '';
  let pathSessionId = '';

  if (pathParts.length >= 2 && (pathParts[0] === 'scanner' || pathParts[0] === 'mobile-scanner')) {
    if (pathParts[1] === 'session' && pathParts[2]) {
      pathSessionId = pathParts[2];
      if (pathParts[3]) pathBusinessId = pathParts[3];
    } else {
      pathBusinessId = pathParts[1];
      pathSessionId = pathParts[2] || pathParts[1];
    }
  }

  // If businessId wasn't in URL, try finding it from bos_scanner_sessions using pathSessionId
  if (!pathBusinessId && pathSessionId) {
    const allSessions = db.getScannerSessionsRaw();
    const matchedSession = allSessions.find(s => s.sessionId === pathSessionId);
    if (matchedSession) {
      pathBusinessId = matchedSession.businessId;
    }
  }

  // If still no businessId, fallback to the first active business in database
  if (!pathBusinessId) {
    const allBusinesses = db.getBusinesses();
    if (allBusinesses.length > 0) {
      pathBusinessId = allBusinesses[0].id;
    }
  }

  const businessId = propBusinessId || pathBusinessId || 'default-business';
  const sessionId = propSessionId || pathSessionId || 'scan-session';

  // Fetch business details safely
  const business: Business | null = db.getBusinesses().find(b => b.id === businessId) || null;
  const currencySymbol = getCurrencySymbol(business?.currency || 'GHS');

  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    name: string;
    barcode: string;
    price: number;
    stockQty?: number;
    imageUrl?: string;
  } | null>(null);

  const [isBeepEnabled, setIsBeepEnabled] = useState(true);
  const [scanNotification, setScanNotification] = useState<string | null>(null);

  // Auto-Add Toggle Switch State
  const [isAutoAdd, setIsAutoAdd] = useState<boolean>(true);

  // Pending Review Items (when Auto-Add is OFF)
  const [pendingReviewItems, setPendingReviewItems] = useState<ReviewItem[]>([]);

  // Live Cart Items for POS Receipt
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [scannedLog, setScannedLog] = useState<{ barcode: string; time: string; productName?: string }[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Play audio beep tone on scan
  const playBeepSound = () => {
    if (!isBeepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz pitch
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15); // 150ms duration
    } catch (err) {
      console.warn('Audio context error:', err);
    }
  };

  // Process barcode detection continuously
  const handleBarCodeDetected = (barcodeText: string) => {
    const trimmed = barcodeText.trim();
    if (!trimmed) return;

    // Cooldown check for continuous camera scanning (prevent duplicate multi-firing on identical frame in < 1.2s)
    const now = Date.now();
    if (trimmed === lastScannedCode && now - lastScanTimeRef.current < 1200) {
      return;
    }
    lastScanTimeRef.current = now;

    playBeepSound();
    setLastScannedCode(trimmed);

    // Look up product or service in inventory
    const products = db.getProducts(businessId);
    const foundProduct = products.find(p => 
      p.barcode === trimmed || 
      p.barcodeOptional === trimmed || 
      p.id === trimmed || 
      p.qrCode === trimmed ||
      (p as any).sku === trimmed
    );

    const services = db.getServices(businessId);
    const foundService = !foundProduct 
      ? services.find(s => s.code === trimmed || s.id === trimmed)
      : null;

    let itemName = trimmed;
    let itemPrice = 0;
    let itemType: 'product' | 'service' = 'product';
    let itemId = 'item-' + Math.random().toString(36).substring(2, 9);
    let stockQty: number | undefined = undefined;
    let imageUrl: string | undefined = undefined;

    if (foundProduct) {
      itemName = foundProduct.name;
      itemPrice = typeof foundProduct.sellingPrice === 'number' ? foundProduct.sellingPrice : (foundProduct.price || 0);
      itemType = 'product';
      itemId = foundProduct.id;
      stockQty = foundProduct.stockQuantity;
      imageUrl = foundProduct.imageUrl;
    } else if (foundService) {
      itemName = foundService.name;
      itemPrice = foundService.price || 0;
      itemType = 'service';
      itemId = foundService.id;
    }

    setLastScannedProduct({
      name: itemName,
      barcode: trimmed,
      price: itemPrice,
      stockQty,
      imageUrl
    });

    if (isAutoAdd) {
      // --- AUTO-ADD ENABLED (ON) ---
      // 1. Send session payload to POS terminal in real-time
      const payload = {
        id: 'scan-' + Math.random().toString(36).substring(2, 9),
        sessionId,
        businessId,
        barcode: trimmed,
        timestamp: new Date().toISOString()
      };
      db.saveScannedItem(payload);

      // 2. Automatically add to live receipt cart or increase quantity
      let updatedQty = 1;
      setCart(prev => {
        const existingIdx = prev.findIndex(i => i.barcode === trimmed || i.id === itemId);
        if (existingIdx >= 0) {
          const next = [...prev];
          updatedQty = next[existingIdx].quantity + 1;
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: updatedQty
          };
          return next;
        } else {
          return [
            ...prev,
            {
              id: itemId,
              barcode: trimmed,
              name: itemName,
              price: itemPrice,
              quantity: 1,
              type: itemType,
              stockQuantity: stockQty,
              imageUrl
            }
          ];
        }
      });

      // Notification
      setScanNotification(`✓ "${itemName}" added to cart`);
      setTimeout(() => {
        setScanNotification(null);
      }, 2500);

      // Log session item
      setScannedLog(prev => [
        {
          barcode: trimmed,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          productName: itemName !== trimmed ? itemName : undefined
        },
        ...prev
      ]);
    } else {
      // --- AUTO-ADD DISABLED (OFF) ---
      // Store in temporary review list
      const reviewItem: ReviewItem = {
        reviewId: 'rev-' + Math.random().toString(36).substring(2, 9),
        id: itemId,
        barcode: trimmed,
        name: itemName,
        price: itemPrice,
        type: itemType,
        stockQuantity: stockQty,
        imageUrl,
        selected: true
      };

      setPendingReviewItems(prev => [...prev, reviewItem]);
      setScanNotification(`Item scanned: "${itemName}" (Pending Confirmation)`);
      setTimeout(() => {
        setScanNotification(null);
      }, 2500);
    }
  };

  // Confirm and Add Selected Items from Review List to POS Cart
  const handleConfirmAddItems = () => {
    const selectedItems = pendingReviewItems.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    selectedItems.forEach(item => {
      // 1. Send session payload to POS terminal
      const payload = {
        id: 'scan-' + Math.random().toString(36).substring(2, 9),
        sessionId,
        businessId,
        barcode: item.barcode,
        timestamp: new Date().toISOString()
      };
      db.saveScannedItem(payload);

      // 2. Add to mobile scanner live cart / update quantity
      setCart(prev => {
        const existingIdx = prev.findIndex(i => i.barcode === item.barcode || i.id === item.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + 1
          };
          return next;
        } else {
          return [
            ...prev,
            {
              id: item.id,
              barcode: item.barcode,
              name: item.name,
              price: item.price,
              quantity: 1,
              type: item.type,
              stockQuantity: item.stockQuantity,
              imageUrl: item.imageUrl
            }
          ];
        }
      });

      // 3. Log session
      setScannedLog(prev => [
        {
          barcode: item.barcode,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          productName: item.name !== item.barcode ? item.name : undefined
        },
        ...prev
      ]);
    });

    // Remove confirmed items from pending list
    setPendingReviewItems(prev => prev.filter(i => !i.selected));
    setScanNotification(`✓ Added ${selectedItems.length} items to POS receipt`);
    setTimeout(() => setScanNotification(null), 3000);
  };

  // Quantity control helpers on live receipt
  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter((item): item is CartLineItem => item !== null));
  };

  const removeCartItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Calculate live receipt totals
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const taxRate = (business as any)?.taxRate || 0;
  const tax = taxRate > 0 ? (subtotal * taxRate) / 100 : 0;
  const grandTotal = subtotal + tax;

  // Print Receipt handler
  const handlePrintReceipt = () => {
    if (cart.length === 0) {
      alert('No items in current POS receipt to print. Please scan product barcodes first.');
      return;
    }

    // Send remote print command to desktop POS terminal
    if (businessId && sessionId) {
      db.savePrintCommand({
        id: 'pr-' + Date.now(),
        sessionId,
        businessId,
        items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total: grandTotal,
        timestamp: new Date().toISOString()
      });
      setScanNotification('✓ Print command sent to desktop receipt printer!');
      setTimeout(() => setScanNotification(null), 3500);
    }

    const storeName = business?.name || business?.receiptConfig?.businessName || 'BusinessOS Store';
    const contactInfo = business?.phone || business?.receiptConfig?.contactInfo || '';
    const footerMsg = business?.receiptConfig?.footerMessage || 'Thank you for your business!';

    const itemsHtml = cart.map(item => `
      <tr>
        <td style="padding: 4px 0;">${item.name}</td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right;">${currencySymbol} ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>POS Receipt - ${storeName}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 10px; padding: 0; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
            .grand-total { font-weight: bold; font-size: 14px; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">${storeName}</div>
          ${contactInfo ? `<div class="center" style="font-size: 10px;">${contactInfo}</div>` : ''}
          <div class="center" style="font-size: 10px; margin-top: 4px;">Mobile Scanner Live Receipt</div>
          <hr />
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <hr />
          <div>
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${currencySymbol} ${subtotal.toFixed(2)}</span>
            </div>
            ${tax > 0 ? `
            <div class="total-row">
              <span>Tax/VAT:</span>
              <span>${currencySymbol} ${tax.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>GRAND TOTAL:</span>
              <span>${currencySymbol} ${grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <hr />
          <div class="center" style="margin-top: 12px; font-size: 10px;">
            ${footerMsg}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                try { window.frameElement.remove(); } catch(e) {}
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError('');
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-viewport');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Rear camera
        {
          fps: 10,
          qrbox: { width: 250, height: 180 },
          aspectRatio: 1.3333
        },
        (decodedText) => {
          handleBarCodeDetected(decodedText);
        },
        () => {
          // Ignore frame decode failures
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setCameraError('Unable to access camera. Ensure camera permissions are granted or use manual barcode entry below.');
      setIsScanning(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
      setIsScanning(false);
    }
  };

  // Flashlight Torch Toggle
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
      console.warn('Flashlight toggle error:', err);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarCodeDetected(manualBarcode);
    setManualBarcode('');
  };

  const handleExitScanner = async () => {
    await stopCamera();
    if (businessId && sessionId) {
      db.updateScannerSessionStatus(businessId, sessionId, 'disconnected');
    }
    if (onClose) {
      onClose();
    } else {
      window.location.href = '/';
    }
  };

  const isMobile = isSupportedMobileDevice();

  useEffect(() => {
    if (isMobile) {
      if (businessId && sessionId) {
        db.updateScannerSessionStatus(businessId, sessionId, 'connected');
      }
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isMobile, businessId, sessionId]);

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-6 text-center animate-in fade-in zoom-in duration-150">
          <button
            type="button"
            onClick={handleExitScanner}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-sm">
            <Smartphone className="h-8 w-8" />
          </div>

          <div className="space-y-3">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              Mobile Scanner Available Only on Mobile Devices
            </h3>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              The Mobile Scanner is designed for smartphones and tablets with a built-in camera. Please open BusinessOS on your Android or iPhone to scan products.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleExitScanner}
              className="w-full py-3.5 px-6 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-2xl font-black text-sm shadow-md transition cursor-pointer active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans select-none">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExitScanner}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back / Close"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-emerald-700" /> BusinessOS Mobile Scanner
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {business?.name || 'Live POS Session'} &bull; <span className="font-mono">{sessionId.substring(0, 10)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBeepEnabled(!isBeepEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${isBeepEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
            title={isBeepEnabled ? 'Beep sound enabled' : 'Beep sound muted'}
          >
            <Volume2 className="h-4 w-4" />
          </button>

          <button
            onClick={toggleFlashlight}
            className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${torchOn ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            title="Toggle Flashlight Torch"
          >
            <Flashlight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Camera Viewfinder Viewport */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative shadow-xl flex flex-col items-center justify-center min-h-[260px]">
          <div id="qr-reader-viewport" className="w-full h-full min-h-[260px]" />

          {/* Target Scan Box Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-emerald-400 rounded-2xl relative shadow-[0_0_25px_rgba(16,185,129,0.35)] animate-pulse">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
              </div>
            </div>
          )}

          {cameraError && (
            <div className="p-6 text-center space-y-2 text-rose-300 text-xs z-10">
              <AlertCircle className="h-8 w-8 mx-auto text-rose-400" />
              <p>{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition"
              >
                Retry Camera Access
              </button>
            </div>
          )}
        </div>

        {/* Auto-Add Toggle Switch Panel */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl transition ${isAutoAdd ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Auto-Add Mode</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                {isAutoAdd ? 'ON: Scanned items added to receipt automatically' : 'OFF: Scanned items hold in review list for confirmation'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAutoAdd(!isAutoAdd)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
              isAutoAdd ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
            title={`Toggle Auto-Add Mode (Currently ${isAutoAdd ? 'ON' : 'OFF'})`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAutoAdd ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Real-time Scan Notification Toast */}
        {scanNotification && (
          <div className="bg-emerald-900 text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
              <span>{scanNotification}</span>
            </div>
            <span className="text-[9px] bg-emerald-950 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
              {isAutoAdd ? 'Added' : 'Review'}
            </span>
          </div>
        )}

        {/* AUTO-ADD DISABLED (OFF): Temporary Review List Section */}
        {!isAutoAdd && pendingReviewItems.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-4 space-y-3 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-amber-800" />
                <h3 className="text-xs font-black text-amber-950">Scanned Items ({pendingReviewItems.length})</h3>
              </div>
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full">
                Pending Confirmation
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {pendingReviewItems.map((item) => (
                <div
                  key={item.reviewId}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition ${
                    item.selected ? 'bg-white border-amber-400 shadow-2xs' : 'bg-amber-50/50 border-amber-200/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPendingReviewItems(prev => prev.map(i => i.reviewId === item.reviewId ? { ...i, selected: checked } : i));
                      }}
                      className="h-4 w-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                    />
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="h-8 w-8 object-cover rounded-lg border border-slate-200 shrink-0" />
                    )}
                    <div className="truncate">
                      <p className="font-extrabold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {currencySymbol} {item.price.toFixed(2)} &bull; Barcode: {item.barcode}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingReviewItems(prev => prev.filter(i => i.reviewId !== item.reviewId));
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer shrink-0"
                    title="Remove item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleConfirmAddItems}
              disabled={!pendingReviewItems.some(i => i.selected)}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-extrabold rounded-2xl text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="h-4 w-4" /> Confirm Add Items ({pendingReviewItems.filter(i => i.selected).length})
            </button>
          </div>
        )}

        {/* Current / Last Scanned Product Details Card */}
        {lastScannedProduct && (
          <div className="bg-white border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              {lastScannedProduct.imageUrl ? (
                <img src={lastScannedProduct.imageUrl} alt={lastScannedProduct.name} className="h-10 w-10 object-cover rounded-xl border border-slate-200 shrink-0" />
              ) : (
                <div className="h-10 w-10 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center font-bold shrink-0 border border-emerald-100">
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="truncate">
                <p className="font-extrabold text-slate-900 truncate text-xs">{lastScannedProduct.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {currencySymbol} {lastScannedProduct.price.toFixed(2)} &bull; Stock: {lastScannedProduct.stockQty !== undefined ? lastScannedProduct.stockQty : 'Available'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              ✓ Barcode: {lastScannedProduct.barcode}
            </span>
          </div>
        )}

        {/* Live POS Receipt Preview Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-800" />
              <h3 className="text-xs font-black text-slate-900 tracking-tight">Active POS Receipt</h3>
            </div>
            <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </span>
          </div>

          {/* Cart Line Items Table */}
          {cart.length === 0 ? (
            <div className="py-8 text-center space-y-2 text-slate-400 text-xs">
              <ShoppingCart className="h-8 w-8 mx-auto text-slate-300" />
              <p className="font-medium text-slate-500">No items in active receipt yet.</p>
              <p className="text-[10px] text-slate-400">Point mobile camera at product barcodes to scan directly into this POS receipt.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-xs truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {currencySymbol} {item.price.toFixed(2)} &bull; Total: <span className="font-bold text-slate-800">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, -1)}
                      className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                      title="Decrease Qty"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-1.5 font-extrabold text-xs text-slate-900 font-mono min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, 1)}
                      className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                      title="Increase Qty"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCartItem(item.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition ml-1"
                      title="Remove Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Receipt Totals Recalculation Summary */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-800 font-mono">{currencySymbol} {subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax/VAT ({taxRate}%):</span>
                <span className="font-bold text-slate-800 font-mono">{currencySymbol} {tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-emerald-800 font-mono text-base">{currencySymbol} {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* PRINT RECEIPT BUTTON */}
          <button
            type="button"
            onClick={handlePrintReceipt}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
        </div>

        {/* Manual SKU / Barcode Entry Form */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Type SKU / Barcode manually..."
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono shadow-2xs"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Send className="h-4 w-4" /> Add
          </button>
        </form>

        {/* Session Scanned Barcode Log */}
        {scannedLog.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-700">Scan Session Log ({scannedLog.length})</h4>
              <span className="text-[10px] text-emerald-700 font-mono font-bold">Synced with POS</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {scannedLog.map((item, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="truncate pr-2">
                    <span className="font-bold text-slate-800">{item.barcode}</span>
                    {item.productName && (
                      <span className="text-[10px] text-emerald-700 font-sans ml-2 font-medium">({item.productName})</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
