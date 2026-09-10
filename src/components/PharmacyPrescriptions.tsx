/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, Prescription, Customer, Product } from '../types';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Building2,
  Trash2,
  Printer,
  ShoppingCart,
  X,
  ShieldCheck,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface PharmacyPrescriptionsProps {
  business: Business;
  user: User;
  onNavigatePOS?: () => void;
}

interface PrescribedItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
}

export const PharmacyPrescriptions: React.FC<PharmacyPrescriptionsProps> = ({
  business,
  user,
  onNavigatePOS
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Dispensed' | 'Cancelled'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);

  // Form State
  const [prescriptionNumber, setPrescriptionNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [clinicOrHospital, setClinicOrHospital] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState<PrescribedItem[]>([
    { medicineName: '', dosage: '500mg', frequency: 'TID (3x daily)', duration: '5 days', quantity: 15 }
  ]);

  const prescriptions = db.getPrescriptions(business.id);
  const customers = db.getCustomers(business.id);
  const products = db.getProducts(business.id);

  // Filtered List
  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesStatus = statusFilter === 'All' || rx.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      rx.prescriptionNumber.toLowerCase().includes(term) ||
      rx.patientName.toLowerCase().includes(term) ||
      (rx.doctorName && rx.doctorName.toLowerCase().includes(term)) ||
      (rx.patientPhone && rx.patientPhone.includes(term));
    return matchesStatus && matchesSearch;
  });

  const handleOpenNewModal = () => {
    setPrescriptionNumber('RX-' + Math.floor(10000 + Math.random() * 90000));
    setPatientName('');
    setPatientPhone('');
    setDoctorName('');
    setClinicOrHospital('');
    setDiagnosis('');
    setNotes('');
    setItems([{ medicineName: '', dosage: '500mg', frequency: 'TID (3x daily)', duration: '5 days', quantity: 15 }]);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      { medicineName: '', dosage: 'Tablets', frequency: 'BD (2x daily)', duration: '7 days', quantity: 14 }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemRow = (idx: number, field: keyof PrescribedItem, val: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      showError('Patient Name Required', 'Please provide the patient name.');
      return;
    }

    const validItems = items.filter(i => i.medicineName.trim().length > 0);
    if (validItems.length === 0) {
      showError('Medicines Required', 'Please enter at least one prescribed medicine.');
      return;
    }

    const newRx: Prescription = {
      id: 'rx_' + Date.now(),
      businessId: business.id,
      prescriptionNumber: prescriptionNumber.trim(),
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim() || undefined,
      doctorName: doctorName.trim() || undefined,
      clinicOrHospital: clinicOrHospital.trim() || undefined,
      prescribedDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      medicines: validItems.map(item => ({
        medicineName: item.medicineName,
        dosage: `${item.dosage} - ${item.frequency} for ${item.duration}`,
        quantity: item.quantity
      })),
      notes: diagnosis ? `Diagnosis: ${diagnosis}. ${notes}` : notes,
      createdAt: new Date().toISOString()
    };

    db.savePrescription(business.id, newRx);
    showSuccess('Prescription Recorded', `Rx #${newRx.prescriptionNumber} registered under Pending dispensations.`);
    setIsModalOpen(false);
  };

  const handleMarkDispensed = (rx: Prescription) => {
    db.savePrescription(business.id, {
      ...rx,
      status: 'Dispensed',
      dispensedAt: new Date().toISOString(),
      dispensedBy: user.name
    });
    showSuccess('Prescription Dispensed', `Rx #${rx.prescriptionNumber} marked as completed.`);
    if (viewingRx?.id === rx.id) {
      setViewingRx(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Disclaimer Banner */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-3 text-blue-900 shadow-xs">
        <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0" />
        <div className="text-xs">
          <strong>Pharmacy Regulatory Notice:</strong> The prescription recording subsystem is for pharmacy business operations, dispensing logs, and inventory reconciliation. It does not replace independent clinical or pharmaceutical assessment.
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-700" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Prescription Registry & Dispensary Intake
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Intake external doctor prescriptions, track patient dosages, and verify dispensed pharmaceutical records.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Record Prescription</span>
          </button>
          {onNavigatePOS && (
            <button
              onClick={onNavigatePOS}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Open Dispensary POS
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {(['All', 'Pending', 'Dispensed', 'Cancelled'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by Rx #, patient, doctor..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">Rx Number</th>
                <th className="py-4 px-4">Patient Name & Phone</th>
                <th className="py-4 px-4">Prescriber / Clinic</th>
                <th className="py-4 px-4">Medicines Prescribed</th>
                <th className="py-4 px-4">Date</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrescriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-800">No prescriptions recorded yet.</p>
                    <button
                      onClick={handleOpenNewModal}
                      className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                    >
                      Record First Prescription
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPrescriptions.map(rx => (
                  <tr key={rx.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {rx.prescriptionNumber}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-sm">{rx.patientName}</div>
                      {rx.patientPhone && (
                        <div className="text-[11px] text-slate-500">{rx.patientPhone}</div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-800">
                        {rx.doctorName ? `Dr. ${rx.doctorName}` : 'External Physician'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {rx.clinicOrHospital || 'Clinic / Hospital'}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-slate-800 font-bold">
                        {rx.medicines?.length || 0} prescribed item{rx.medicines?.length === 1 ? '' : 's'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {rx.medicines?.map(m => m.medicineName).join(', ')}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {new Date(rx.prescribedDate).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        rx.status === 'Dispensed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rx.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rx.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingRx(rx)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          View Rx
                        </button>
                        {rx.status === 'Pending' && (
                          <button
                            onClick={() => handleMarkDispensed(rx)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Mark Dispensed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Prescription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-700" />
                <h3 className="font-extrabold text-base text-slate-900">Intake New Prescription</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prescription Ref # *</label>
                  <input
                    type="text"
                    required
                    value={prescriptionNumber}
                    onChange={e => setPrescriptionNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Kwame Mensah"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Patient Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="0244123456"
                    value={patientPhone}
                    onChange={e => setPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prescribing Doctor / Clinician</label>
                  <input
                    type="text"
                    placeholder="Dr. K. Appiah"
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hospital / Clinic / Medical Center</label>
                  <input
                    type="text"
                    placeholder="Korle Bu / Ridge Hospital / Trust Clinic"
                    value={clinicOrHospital}
                    onChange={e => setClinicOrHospital(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Prescribed Items Sub-form */}
              <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Prescribed Medicines & Dosage Instructions
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Medicine name (e.g. Amoxicillin 500mg)"
                          value={it.medicineName}
                          onChange={e => handleUpdateItemRow(idx, 'medicineName', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Frequency (TID / BD)"
                          value={it.frequency}
                          onChange={e => handleUpdateItemRow(idx, 'frequency', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Duration (e.g. 5 days)"
                          value={it.duration}
                          onChange={e => handleUpdateItemRow(idx, 'duration', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={it.quantity}
                          onChange={e => handleUpdateItemRow(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                          className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnosis / Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Diagnosis & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Clinical notes or patient allergies..."
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Register Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Detail & Print View Modal */}
      {viewingRx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Prescription Record</span>
                <h3 className="font-extrabold text-base text-slate-900">{viewingRx.prescriptionNumber}</h3>
              </div>
              <button onClick={() => setViewingRx(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">{viewingRx.patientName}</span>
              </div>
              {viewingRx.patientPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-700">{viewingRx.patientPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-semibold text-slate-800">{viewingRx.doctorName || 'General Practitioner'}</span>
              </div>
              {viewingRx.clinicOrHospital && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Clinic:</span>
                  <span className="text-slate-700">{viewingRx.clinicOrHospital}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="text-slate-700">{new Date(viewingRx.prescribedDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700 uppercase">{viewingRx.status}</span>
              </div>
              {viewingRx.notes && (
                <div className="pt-2 border-t border-slate-200 text-slate-600 italic text-[11px]">
                  {viewingRx.notes}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Medicines List</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {viewingRx.medicines?.map((m, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{m.medicineName}</div>
                      <div className="text-[10px] text-slate-500">{m.dosage}</div>
                    </div>
                    <span className="font-extrabold text-slate-800">{m.quantity} units</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {viewingRx.status === 'Pending' && (
                <button
                  onClick={() => handleMarkDispensed(viewingRx)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  Mark as Dispensed
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Rx Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
