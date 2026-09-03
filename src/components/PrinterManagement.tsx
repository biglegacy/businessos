/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Business, User, PrinterSettings } from '../types';
import { 
  Printer, Plus, Trash2, Edit2, Check, Star, Settings2, FileText, 
  Utensils, Eye, X, Upload, Download, Sparkles, AlertCircle
} from 'lucide-react';

interface PrinterManagementProps {
  business: Business;
  user: User;
}

export function PrinterManagement({ business, user }: PrinterManagementProps) {
  const [printers, setPrinters] = useState<PrinterSettings[]>([]);
  const [editingPrinter, setEditingPrinter] = useState<PrinterSettings | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [printerName, setPrinterName] = useState('');
  const [printerType, setPrinterType] = useState<PrinterSettings['printerType']>('Thermal Receipt Printer');
  const [connectionType, setConnectionType] = useState<PrinterSettings['connectionType']>('USB');
  const [paperSize, setPaperSize] = useState<PrinterSettings['paperSize']>('80mm');
  const [isDefault, setIsDefault] = useState(false);

  // Template Customizer State
  const [logoUrl, setLogoUrl] = useState(business.logoUrl || '');
  const [templateBusName, setTemplateBusName] = useState(business.receiptConfig?.businessName || business.name);
  const [templateAddress, setTemplateAddress] = useState(business.receiptConfig?.contactInfo || business.phone || '');
  const [templatePhone, setTemplatePhone] = useState(business.phone || '');
  const [templateTaxNumber, setTemplateTaxNumber] = useState(business.taxId || 'GST-10294-88');
  const [templateFooter, setTemplateFooter] = useState(business.receiptConfig?.footerMessage || 'Thank you for your business. Please come again!');

  // Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'food' | 'kitchen' | 'retail' | 'wholesale' | 'service'>('food');
  const [previewPrinter, setPreviewPrinter] = useState<PrinterSettings | null>(null);

  // Load printers from local cloud synced database
  const loadPrinters = () => {
    const list = db.getPrinterSettings(business.id);
    setPrinters(list);
  };

  useEffect(() => {
    loadPrinters();
    
    // Subscribe to DB updates for real-time cloud changes
    const unsubscribe = db.subscribe(() => {
      loadPrinters();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const cloudUrl = await db.uploadFile(file.name, base64);
          setLogoUrl(cloudUrl);
        } catch (err) {
          console.error('Cloud upload failed, falling back to local base64 encoding', err);
          setLogoUrl(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    setEditingPrinter(null);
    setPrinterName('');
    setPrinterType('Thermal Receipt Printer');
    setConnectionType('USB');
    setPaperSize('80mm');
    setIsDefault(printers.length === 0); // default if first printer
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: PrinterSettings) => {
    setEditingPrinter(p);
    setPrinterName(p.printerName);
    setPrinterType(p.printerType);
    setConnectionType(p.connectionType);
    setPaperSize(p.paperSize);
    setIsDefault(p.isDefault);
    setIsFormOpen(true);
  };

  const handleSavePrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerName.trim()) {
      alert('Please provide a descriptive printer name.');
      return;
    }

    const settings: PrinterSettings = {
      printerId: editingPrinter?.printerId || 'prn_' + Math.random().toString(36).substring(2, 11),
      businessId: business.id,
      printerName: printerName.trim(),
      printerType,
      connectionType,
      paperSize,
      isDefault,
      receiptTemplate: {
        logoUrl: logoUrl || undefined,
        businessName: templateBusName,
        address: templateAddress,
        phone: templatePhone,
        taxNumber: templateTaxNumber,
        footerMessage: templateFooter,
      },
      createdAt: editingPrinter?.createdAt || new Date().toISOString(),
    };

    db.savePrinterSettings(business.id, settings);
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: editingPrinter ? 'Printer Settings Updated' : 'New Printer Added',
      details: `${editingPrinter ? 'Modified' : 'Registered'} printer "${printerName}" (${printerType}, connection: ${connectionType}).`
    });

    setIsFormOpen(false);
    loadPrinters();
  };

  const handleDeletePrinter = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete printer "${name}"?`)) {
      db.deletePrinterSettings(business.id, id);
      db.addActivityLog(business.id, {
        userId: user.id,
        userName: user.name,
        action: 'Printer Settings Deleted',
        details: `Deleted printer config "${name}".`
      });
      loadPrinters();
    }
  };

  // Quick setup helper based on common printer types
  const handleAutoConfigure = (preset: 'kitchen' | 'counter' | 'office') => {
    if (preset === 'kitchen') {
      setPrinterName('Kitchen Order Ticket Printer');
      setPrinterType('Kitchen Printer');
      setConnectionType('LAN Network');
      setPaperSize('80mm');
      setIsDefault(false);
    } else if (preset === 'counter') {
      setPrinterName('Main Cashier POS Receipt');
      setPrinterType('Thermal Receipt Printer');
      setConnectionType('USB');
      setPaperSize('80mm');
      setIsDefault(true);
    } else if (preset === 'office') {
      setPrinterName('Office Laser Document Printer');
      setPrinterType('Laser Printer');
      setConnectionType('WiFi');
      setPaperSize('A4');
      setIsDefault(false);
    }
  };

  // Helper to handle trigger printing (simulation of actual system print or iframe standard window.print)
  const handleTriggerPrint = (p: PrinterSettings | null) => {
    const printDoc = document.getElementById('printable-preview-content');
    if (!printDoc) return;

    // Use iframe or window.print fallback
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

    // Prepare styles for thermal / standard printing
    const isThermal = p ? (p.printerType === 'Thermal Receipt Printer' || p.printerType === 'Kitchen Printer' || p.paperSize === '58mm' || p.paperSize === '80mm') : true;
    const sizeWidth = p?.paperSize === '58mm' ? '58mm' : p?.paperSize === '80mm' ? '80mm' : '210mm'; // A4 width

    doc.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: ${isThermal ? '"JetBrains Mono", monospace' : '"Inter", sans-serif'};
              font-size: ${isThermal ? '12px' : '14px'};
              color: #000;
              margin: 0;
              padding: ${isThermal ? '10px' : '20px'};
              background: #fff;
              width: ${isThermal ? sizeWidth : '100%'};
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            hr { border: 0; border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 4px 0; }
            .title { font-size: ${isThermal ? '16px' : '22px'}; font-weight: 800; text-transform: uppercase; }
            .subtitle { font-size: 11px; color: #444; }
            .invoice-box {
              border: ${isThermal ? 'none' : '1px solid #ddd'};
              padding: ${isThermal ? '0' : '20px'};
              border-radius: ${isThermal ? '0' : '8px'};
            }
            @media print {
              @page {
                size: ${isThermal ? 'auto' : 'A4'};
                margin: 0;
              }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="invoice-box">
            ${printDoc.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  // Sample data creators
  const getFoodReceiptHTML = () => {
    return (
      <div className="text-center font-mono text-slate-800 text-xs">
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="h-10 w-10 mx-auto mb-2 rounded-lg object-cover" />
        )}
        <div className="text-sm font-bold uppercase">{templateBusName}</div>
        <div className="text-[10px] text-slate-500 whitespace-pre-line">{templateAddress}</div>
        <div className="text-[10px] text-slate-500">Tel: {templatePhone}</div>
        {templateTaxNumber && <div className="text-[10px] text-slate-400">Tax ID: {templateTaxNumber}</div>}
        <div className="border-t border-dashed border-slate-300 my-2"></div>
        <div className="text-left space-y-0.5 text-[10px]">
          <div><strong>Receipt No:</strong> #R-9021</div>
          <div><strong>Date:</strong> {new Date().toLocaleString()}</div>
          <div><strong>Cashier:</strong> {user.name}</div>
          <div><strong>Table:</strong> Table 4 (Dine-In)</div>
        </div>
        <div className="border-t border-dashed border-slate-300 my-2"></div>
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr className="font-bold">
              <th>ITEM</th>
              <th className="text-center">QTY</th>
              <th className="text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Chicken Jollof Rice</td>
              <td className="text-center">2</td>
              <td className="text-right">GHC 90.00</td>
            </tr>
            <tr>
              <td>Spiced Grilled Tilapia</td>
              <td className="text-center">1</td>
              <td className="text-right">GHC 85.00</td>
            </tr>
            <tr>
              <td>Fresh Ginger Juice</td>
              <td className="text-center">2</td>
              <td className="text-right">GHC 30.00</td>
            </tr>
          </tbody>
        </table>
        <div className="border-t border-dashed border-slate-300 my-2"></div>
        <div className="space-y-1 text-right text-[10px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>GHC 205.00</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>TOTAL:</span>
            <span>GHC 205.00</span>
          </div>
        </div>
        <div className="border-t border-dashed border-slate-300 my-2"></div>
        <div className="text-left text-[10px]">
          <div><strong>Payment Method:</strong> Mobile Money (MTN)</div>
          <div><strong>Transaction ID:</strong> txn_298491823</div>
        </div>
        <div className="border-t border-dashed border-slate-300 my-2"></div>
        <div className="text-[10px] text-slate-500 italic text-center">
          {templateFooter}
        </div>
      </div>
    );
  };

  const getKitchenTicketHTML = () => {
    return (
      <div className="font-mono text-slate-900 text-xs text-left p-2 space-y-2 border-2 border-slate-800">
        <div className="text-center font-black border-b-2 border-slate-800 pb-1 text-sm tracking-wide">
          *** KITCHEN ORDER TICKET ***
        </div>
        <div className="flex justify-between text-[11px] font-bold">
          <span>Order No: #K-1025</span>
          <span>Table: 5 (Dine-in)</span>
        </div>
        <div className="text-[10px] text-slate-600">
          Time: {new Date().toLocaleTimeString()}
        </div>
        <div className="border-t border-slate-800 my-1"></div>
        <div className="space-y-1.5 font-bold text-sm">
          <div className="flex justify-between">
            <span>Chicken Jollof Rice</span>
            <span>x2</span>
          </div>
          <div className="flex justify-between">
            <span>Fried Rice (Beef)</span>
            <span>x1</span>
          </div>
          <div className="flex justify-between text-slate-600 text-xs">
            <span>- Extra Shito</span>
            <span></span>
          </div>
          <div className="flex justify-between">
            <span>Chilled Ginger Juice</span>
            <span>x2</span>
          </div>
        </div>
        <div className="border-t border-slate-800 my-1"></div>
        <div className="p-1 bg-slate-100 rounded text-[10px] font-bold text-slate-800">
          Special Instructions: <span className="text-red-700">NO PEPPER ON THE BEEF RICE, MAKE SHITO EXTRA SPICY.</span>
        </div>
        <div className="text-center text-[9px] text-slate-500 font-bold border-t border-slate-300 pt-1">
          POS Terminal Kitchen Link Enabled
        </div>
      </div>
    );
  };

  const getRetailReceiptHTML = () => {
    return (
      <div className="text-center font-sans text-slate-800 text-xs">
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="h-10 w-10 mx-auto mb-2 rounded-lg object-cover" />
        )}
        <div className="text-sm font-bold uppercase">{templateBusName}</div>
        <div className="text-[10px] text-slate-500 whitespace-pre-line">{templateAddress}</div>
        <div className="text-[10px] text-slate-500">Tel: {templatePhone}</div>
        <div className="border-t border-slate-200 my-2"></div>
        <div className="text-left space-y-0.5 text-[10px] font-mono">
          <div>Receipt No: #RET-2041</div>
          <div>Date: {new Date().toLocaleDateString()}</div>
          <div>Cashier: {user.name}</div>
        </div>
        <div className="border-t border-slate-200 my-2"></div>
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr className="font-bold border-b border-slate-200">
              <th>PRODUCT ITEM</th>
              <th className="text-center">QTY</th>
              <th className="text-right">PRICE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-1">Standing Fan (Standard 16")</td>
              <td className="text-center py-1">1</td>
              <td className="text-right py-1">GHC 500.00</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-1">Extension Cord 5-Way</td>
              <td className="text-center py-1">2</td>
              <td className="text-right py-1">GHC 90.00</td>
            </tr>
          </tbody>
        </table>
        <div className="space-y-1 text-right text-[10px] mt-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>GHC 590.00</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>TOTAL:</span>
            <span>GHC 590.00</span>
          </div>
        </div>
        <div className="border-t border-slate-200 my-2"></div>
        <div className="text-left text-[10px]">
          <strong>Payment:</strong> Cash
        </div>
        <div className="border-t border-slate-200 my-2"></div>
        <div className="text-[10px] text-slate-500 text-center">
          {templateFooter}
        </div>
      </div>
    );
  };

  const getWholesaleHTML = () => {
    return (
      <div className="text-left font-sans text-slate-800 text-[10px] p-4 bg-white border border-slate-200 rounded-xl space-y-4">
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div>
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-10 w-10 mb-2 rounded-lg object-cover" />
            )}
            <h3 className="font-extrabold text-slate-900 text-sm">{templateBusName}</h3>
            <p className="text-slate-500 text-[9px] leading-relaxed whitespace-pre-line">{templateAddress}</p>
            <p className="text-slate-500 text-[9px]">Phone: {templatePhone}</p>
            {templateTaxNumber && <p className="text-slate-400 text-[9px]">Tax Registry ID: {templateTaxNumber}</p>}
          </div>
          <div className="text-right space-y-1">
            <h4 className="text-slate-900 font-black text-xs uppercase tracking-wide">WHOLESALE INVOICE</h4>
            <p className="font-mono text-slate-500">#INV-2026-0042</p>
            <p className="text-[9px]"><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            <p className="text-[9px]"><strong>Due Date:</strong> Net 15 Days</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[9px] border-b border-slate-150 pb-3">
          <div>
            <h5 className="font-bold text-slate-500 uppercase tracking-wide">Billed To (Client):</h5>
            <p className="font-bold text-slate-800">Afrifa Retail Outlets Ltd</p>
            <p className="text-slate-500">Suite 12, Accra Central Trade Mall</p>
            <p className="text-slate-500">Tel: +233 24 555 1092</p>
          </div>
          <div>
            <h5 className="font-bold text-slate-500 uppercase tracking-wide">Shipment / Delivery Notes:</h5>
            <p className="text-slate-600"><strong>Driver:</strong> Kojo Mensah (Truck B-12)</p>
            <p className="text-slate-600"><strong>Destination:</strong> Adabraka Main Depot</p>
            <p className="text-slate-600"><strong>Terms:</strong> FOB Destination</p>
          </div>
        </div>

        <table className="w-full text-left text-[9px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <th className="p-1">DESCRIPTION</th>
              <th className="p-1 text-center">QUANTITY (CASES)</th>
              <th className="p-1 text-right">UNIT PRICE</th>
              <th className="p-1 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="p-1 font-semibold text-slate-800">Bulk Cooking Oil (5L Jerrycans)</td>
              <td className="p-1 text-center">20</td>
              <td className="p-1 text-right">GHC 110.00</td>
              <td className="p-1 text-right font-mono">GHC 2,200.00</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="p-1 font-semibold text-slate-800">Premium Long Grain Jasmine Rice (25kg)</td>
              <td className="p-1 text-center">50</td>
              <td className="p-1 text-right">GHC 240.00</td>
              <td className="p-1 text-right font-mono">GHC 12,000.00</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="p-1 font-semibold text-slate-800">Refined Granulated Sugar (50kg Bag)</td>
              <td className="p-1 text-center">10</td>
              <td className="p-1 text-right">GHC 320.00</td>
              <td className="p-1 text-right font-mono">GHC 3,200.00</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between items-start pt-2">
          <div className="w-1/2 space-y-1 text-[8px] text-slate-500 leading-normal">
            <p><strong>Payment Instructions:</strong></p>
            <p>Please make all bank transfers to Ecobank Ghana, Account #14430928491, Accra Main Branch.</p>
          </div>
          <div className="w-1/3 text-right space-y-1 text-[9px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>GHC 17,400.00</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax (1.5%):</span>
              <span>GHC 261.00</span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900 text-[10px]">
              <span>Grand Total:</span>
              <span>GHC 17,661.00</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[8px] text-slate-400">
          <p>{templateFooter}</p>
          <p className="italic">Page 1 of 1</p>
        </div>
      </div>
    );
  };

  const getServiceReceiptHTML = () => {
    return (
      <div className="text-left font-sans text-slate-800 text-[10px] p-4 bg-white border border-slate-200 rounded-xl space-y-3">
        <div className="text-center pb-2 border-b border-slate-100">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-8 w-8 mx-auto mb-1 rounded-full object-cover" />
          )}
          <h3 className="font-extrabold text-slate-900 text-xs">{templateBusName}</h3>
          <p className="text-slate-500 text-[8px]">{templateAddress}</p>
        </div>

        <div className="flex justify-between text-[8px] text-slate-500">
          <div>
            <strong>Client:</strong> Dr. Michael Mensah
          </div>
          <div className="text-right">
            <strong>Job Ref:</strong> #JOB-8012<br />
            <strong>Date:</strong> {new Date().toLocaleDateString()}
          </div>
        </div>

        <table className="w-full text-left text-[9px] border-t border-slate-100 pt-2">
          <thead>
            <tr className="text-slate-500 font-bold">
              <th>SERVICE WORK</th>
              <th className="text-center">HOURS</th>
              <th className="text-right">RATE</th>
              <th className="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-50">
              <td className="py-1 font-semibold text-slate-800">Advanced Advisory Consultation</td>
              <td className="text-center py-1">2</td>
              <td className="text-right py-1">GHC 175.00</td>
              <td className="text-right py-1 font-mono">GHC 350.00</td>
            </tr>
            <tr className="border-b border-slate-50">
              <td className="py-1 font-semibold text-slate-800">Workspace Business Diagnostics Audit</td>
              <td className="text-center py-1">1</td>
              <td className="text-right py-1">GHC 150.00</td>
              <td className="text-right py-1 font-mono">GHC 150.00</td>
            </tr>
          </tbody>
        </table>

        <div className="space-y-1 text-right text-[9px] pt-1">
          <div className="flex justify-between font-bold text-slate-900">
            <span>Total Payable:</span>
            <span>GHC 500.00</span>
          </div>
          <div className="flex justify-between text-emerald-800 font-bold">
            <span>Amount Paid:</span>
            <span>GHC 500.00</span>
          </div>
        </div>

        <div className="bg-emerald-50 text-emerald-800 p-1.5 rounded-lg text-center text-[9px] font-bold border border-emerald-100">
          Payment Status: FULLY PAID & RECEIVED WITH THANKS
        </div>

        <div className="text-center text-[8px] text-slate-400 italic pt-1 border-t border-slate-100">
          {templateFooter}
        </div>
      </div>
    );
  };

  const getActivePreviewHTML = () => {
    switch (previewType) {
      case 'kitchen':
        return getKitchenTicketHTML();
      case 'retail':
        return getRetailReceiptHTML();
      case 'wholesale':
        return getWholesaleHTML();
      case 'service':
        return getServiceReceiptHTML();
      default:
        return getFoodReceiptHTML();
    }
  };

  const handleSavePDF = () => {
    // Highly lightweight offline simulation of Saving receipt details as a text file snap
    const plainText = document.getElementById('printable-preview-content')?.innerText || '';
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BOS_Receipt_Preview_${previewType}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: 'Receipt PDF Exported',
      details: `Saved plain text receipt draft for: ${previewType}.`
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[calc(100vh-12rem)] font-sans">
      
      {/* Left 2 Columns: Printer Registration & Layout Customization */}
      <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-1">
        
        {/* Header Block with Premium Presets */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Printer className="h-4.5 w-4.5 text-emerald-800 animate-pulse" /> Universal Hardware Printers
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Configure unlimited thermal receipt, kitchen, laser, or system document printers linking to Cloud Sync.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" /> Add Hardware Printer
            </button>
          </div>

          {/* Quick presets row */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">Auto-Configure Presets:</span>
            <button 
              onClick={() => { handleOpenAdd(); handleAutoConfigure('counter'); }}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer"
            >
              🛒 Cashier Thermal (80mm)
            </button>
            <button 
              onClick={() => { handleOpenAdd(); handleAutoConfigure('kitchen'); }}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer"
            >
              🍳 Restaurant Kitchen (80mm)
            </button>
            <button 
              onClick={() => { handleOpenAdd(); handleAutoConfigure('office'); }}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer"
            >
              📄 Standard Laser (A4)
            </button>
          </div>
        </div>

        {/* Existing Printers Directory */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <header className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Connected Printer Terminals ({printers.length})</span>
            {printers.length === 0 && (
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> System print default fallback active
              </span>
            )}
          </header>

          {printers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-150">
                <Printer className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-700 text-xs">No Custom Hardware Printers Configured</p>
                <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-normal">
                  Standard browser <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px]">window.print()</code> fallback is active. Add custom thermal/network printers to unlock tailored kitchen ticketing and receipts.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {printers.map((p) => (
                <div key={p.printerId} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/30 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs leading-none">{p.printerName}</span>
                      {p.isDefault && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                          <Star className="h-2 w-2 fill-amber-500 text-amber-500" /> Default
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-[9px]">{p.printerType}</span>
                      <span className="text-slate-300">•</span>
                      <span>Conn: <strong className="text-slate-700">{p.connectionType}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Paper: <strong className="text-slate-700">{p.paperSize}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => {
                        setPreviewPrinter(p);
                        // Default preview based on business category or printer type
                        if (p.printerType === 'Kitchen Printer') {
                          setPreviewType('kitchen');
                        } else if (business.category === 'Restaurant') {
                          setPreviewType('food');
                        } else {
                          setPreviewType('retail');
                        }
                        setPreviewOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Print Preview / Test Page"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Configuration"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePrinter(p.printerId, p.printerName)}
                      className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Printer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Receipt Template Details Branding Customization */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="h-4 w-4 text-emerald-800" /> Custom Receipt Template Branding
            </h4>
            <p className="text-[10px] text-slate-500 mt-1">
              Customize business metadata headers and logo rules rendering globally across A4, 80mm, and 58mm outputs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Logo Upload */}
            <div className="sm:col-span-2">
              <label className="block text-slate-500 font-bold uppercase mb-2">Receipt Brand Logo</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-cover border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-12 w-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center font-bold text-slate-400 text-[10px]">
                    LOGO
                  </div>
                )}
                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[10px] cursor-pointer transition-colors border border-slate-200">
                  <Upload className="h-3 w-3" /> Change Receipt Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logoUrl && (
                  <button onClick={() => setLogoUrl('')} className="text-rose-600 hover:text-rose-800 font-semibold text-[10px]">
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Invoicing Brand Name</label>
              <input
                type="text"
                value={templateBusName}
                onChange={(e) => setTemplateBusName(e.target.value)}
                placeholder="Enterprise Name"
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Tax Registry / VAT ID</label>
              <input
                type="text"
                value={templateTaxNumber}
                onChange={(e) => setTemplateTaxNumber(e.target.value)}
                placeholder="GST-XXXXXX"
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Customer Helpline Telephone</label>
              <input
                type="text"
                value={templatePhone}
                onChange={(e) => setTemplatePhone(e.target.value)}
                placeholder="+233 XXX XXX XXX"
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Receipt Friendly Footer Line</label>
              <input
                type="text"
                value={templateFooter}
                onChange={(e) => setTemplateFooter(e.target.value)}
                placeholder="Thank you message..."
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-500 font-bold uppercase mb-1">Business Store Address Header Details</label>
              <textarea
                rows={2}
                value={templateAddress}
                onChange={(e) => setTemplateAddress(e.target.value)}
                placeholder="Shop 1, Main Street, Accra..."
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                // Update default receipt configurations inside business entity
                const updated: Business = {
                  ...business,
                  receiptConfig: {
                    ...business.receiptConfig,
                    businessName: templateBusName,
                    contactInfo: templateAddress,
                    footerMessage: templateFooter,
                  },
                  taxId: templateTaxNumber || undefined,
                  logoUrl: logoUrl || undefined,
                };
                db.saveBusiness(updated);
                alert('Receipt custom branding template changes synced to all terminal printers.');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow transition-colors"
            >
              Sync Template Layout Branding
            </button>
          </div>
        </div>

      </div>

      {/* Right Column: Interactive Quick Registration Form & Real-time Live Simulator */}
      <div className="space-y-6">
        
        {/* Printer Configuration Form Modal/Block */}
        {isFormOpen && (
          <div className="bg-white p-6 rounded-3xl border-2 border-emerald-800 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom duration-200 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                <Settings2 className="h-4 w-4 text-emerald-800" /> {editingPrinter ? 'Modify Hardware Printer' : 'Register New Printer'}
              </span>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrinter} className="space-y-4">
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Friendly Printer Name</label>
                <input
                  type="text"
                  required
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                  placeholder="e.g., Counter POS Terminal, Kitchen Grill B"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">Printer Type</label>
                  <select
                    value={printerType}
                    onChange={(e) => setPrinterType(e.target.value as PrinterSettings['printerType'])}
                    className="block w-full px-2.5 py-2 border border-slate-200 rounded-xl text-slate-800 bg-white font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500 text-xs"
                  >
                    <option value="Thermal Receipt Printer">Thermal Receipt</option>
                    <option value="Kitchen Printer">Kitchen Ticket</option>
                    <option value="Standard Printer">Standard Printer</option>
                    <option value="Laser Printer">Laser Office</option>
                    <option value="Inkjet Printer">Inkjet Office</option>
                    <option value="Network Printer">Network Printer</option>
                    <option value="Bluetooth Printer">Bluetooth POS</option>
                    <option value="USB Printer">USB Thermal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">Connection Link</label>
                  <select
                    value={connectionType}
                    onChange={(e) => setConnectionType(e.target.value as PrinterSettings['connectionType'])}
                    className="block w-full px-2.5 py-2 border border-slate-200 rounded-xl text-slate-800 bg-white font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500 text-xs"
                  >
                    <option value="USB">USB Cable</option>
                    <option value="Bluetooth">Bluetooth Sync</option>
                    <option value="WiFi">WiFi Local network</option>
                    <option value="LAN Network">LAN Ethernet Port</option>
                    <option value="Serial">Serial Link (RS232)</option>
                    <option value="System Printer">Device Default driver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">Paper Feed Size</label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as PrinterSettings['paperSize'])}
                    className="block w-full px-2.5 py-2 border border-slate-200 rounded-xl text-slate-800 bg-white font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500 text-xs"
                  >
                    <option value="58mm">58mm Thermal paper</option>
                    <option value="80mm">80mm Thermal paper</option>
                    <option value="A4">A4 standard page</option>
                    <option value="A5">A5 half page</option>
                    <option value="Letter">Letter US format</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="h-4 w-4 rounded text-emerald-800 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <span className="font-bold text-slate-600">Default Terminal?</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl cursor-pointer shadow transition-all"
                >
                  {editingPrinter ? 'Modify Changes' : 'Register Printer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Real-time Hardware Command Simulator Console */}
        <div className="bg-slate-900 text-slate-200 p-6 rounded-3xl border border-slate-800 shadow-md space-y-4 text-xs font-mono">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-bold text-[10px] text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              PRINT HARDWARE STREAM STATUS
            </span>
            <span className="text-[9px] text-slate-500">ESC/POS LOG</span>
          </div>

          <div className="space-y-1.5 text-[10px] text-slate-400 overflow-y-auto max-h-32 divide-y divide-slate-800/50">
            <div className="py-1">[$] Starting BusinessOS Print Service Daemon... [OK]</div>
            <div className="py-1">[$] Mapping local endpoints and USB serial queues...</div>
            <div className="py-1">[$] Found {printers.length} registered hardware virtual targets</div>
            {printers.map(p => (
              <div key={p.printerId} className="py-1 text-slate-300 flex justify-between">
                <span>-&gt; PORT [{p.connectionType}]: {p.printerName}</span>
                <span className="text-emerald-500">[STANDBY]</span>
              </div>
            ))}
            {printers.length === 0 && (
              <div className="py-1 text-amber-500">[$] WARNING: No active hardware registered. Using fallback window.print() driver.</div>
            )}
            <div className="py-1 text-[9px] text-slate-500 pt-1">Listening on local virtual loopback interface 127.0.0.1:9100</div>
          </div>
        </div>

        {/* Document Printing Guide */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-xs leading-relaxed">
          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="h-4.5 w-4.5 text-slate-500" /> Device Compatibility Notes
          </h4>
          <p className="text-slate-500">
            <strong>Thermal Receipts:</strong> ESC/POS commands are pre-encoded in our stream. Set paper size to <strong>58mm</strong> or <strong>80mm</strong> inside standard system settings to bypass scaling issues.
          </p>
          <p className="text-slate-500">
            <strong>Network/WiFi:</strong> Ensure raw IP/Port 9100 is accessible on your local subnet router to route kitchen dockets immediately upon checkout.
          </p>
        </div>

      </div>

      {/* PRINT PREVIEW / TEST DRAWER MODAL */}
      {previewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-300 flex flex-col max-h-[90vh] overflow-hidden text-xs">
            <header className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <Eye className="h-4.5 w-4.5 text-emerald-800" /> Hardware Print Preview Terminal
                </h4>
                <p className="text-[9px] text-slate-400">
                  Target Printer: {previewPrinter ? `${previewPrinter.printerName} (${previewPrinter.paperSize})` : 'System Default Fallback'}
                </p>
              </div>
              <button 
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </header>

            {/* Sub-tabs selector for layout previews */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1 overflow-x-auto shrink-0">
              <button
                onClick={() => setPreviewType('food')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                  previewType === 'food' ? 'bg-[#064E3B] text-white' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                🍳 Food Receipt
              </button>
              <button
                onClick={() => setPreviewType('kitchen')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                  previewType === 'kitchen' ? 'bg-amber-800 text-white' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                🔥 Kitchen Ticket
              </button>
              <button
                onClick={() => setPreviewType('retail')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                  previewType === 'retail' ? 'bg-indigo-900 text-white' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                🛍️ Retail POS
              </button>
              <button
                onClick={() => setPreviewType('wholesale')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                  previewType === 'wholesale' ? 'bg-slate-800 text-white' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                🏢 Wholesale Invoice
              </button>
              <button
                onClick={() => setPreviewType('service')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                  previewType === 'service' ? 'bg-teal-900 text-white' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                💼 Professional Services
              </button>
            </div>

            {/* Scrollable Receipt Canvas Container */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
              {/* Receipt Wrapper with 3D shadow and real-world width look */}
              <div 
                id="printable-preview-content"
                className={`bg-white p-6 shadow-2xl border border-slate-300 rounded-lg select-all ${
                  previewType === 'wholesale' ? 'w-full max-w-lg' : 'w-72 font-mono'
                }`}
              >
                {getActivePreviewHTML()}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-between items-center gap-4 shrink-0">
              <button
                onClick={handleSavePDF}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1 cursor-pointer transition"
              >
                <Download className="h-4 w-4" /> Save PDF / TXT
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTriggerPrint(previewPrinter)}
                  className="px-4 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer shadow transition"
                >
                  <Printer className="h-4 w-4" /> Trigger Print Output
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
