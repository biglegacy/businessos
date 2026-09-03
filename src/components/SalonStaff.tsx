import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, SalonStaff } from '../types';
import { ImageUploadInput } from './ImageUploadInput';
import { 
  UserCheck, Plus, Search, Edit3, Trash2, Award, 
  Phone, Mail, DollarSign, Calendar, Scissors, Sparkles, 
  CheckCircle2, X, Percent
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface SalonStaffProps {
  business: Business;
}

const STAFF_ROLES = [
  'Senior Stylist', 'Hair Stylist', 'Barber', 'Colorist', 
  'Nail Technician', 'Esthetician / Facialist', 'Masseuse', 
  'Makeup Artist', 'Salon Assistant', 'Receptionist', 'Manager'
];

export const SalonStaffComponent: React.FC<SalonStaffProps> = ({ business }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SalonStaff | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [role, setRole] = useState(STAFF_ROLES[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [status, setStatus] = useState<SalonStaff['status']>('Active');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Load Data
  const staff = db.getSalonStaff(business.id);
  const appointments = db.getSalonAppointments(business.id);

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setRole(STAFF_ROLES[0]);
    setPhone('');
    setEmail('');
    setSpecialties('');
    setCommissionRate(10);
    setStatus('Active');
    setAvatarUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: SalonStaff) => {
    setEditingStaff(s);
    setName(s.name);
    setRole(s.role);
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setSpecialties(s.specialties ? s.specialties.join(', ') : '');
    setCommissionRate(s.commissionRate || 10);
    setStatus(s.status);
    setAvatarUrl(s.avatarUrl || s.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Validation Error', 'Please enter staff name.');
      return;
    }

    const specsArray = specialties.split(',').map(item => item.trim()).filter(Boolean);

    const staffObj: SalonStaff = {
      id: editingStaff ? editingStaff.id : 'stf_' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      specialties: specsArray.length > 0 ? specsArray : undefined,
      commissionRate: Number(commissionRate) || 0,
      status,
      avatarUrl: avatarUrl || undefined,
      imageUrl: avatarUrl || undefined,
      createdAt: editingStaff ? editingStaff.createdAt : new Date().toISOString()
    };

    db.saveSalonStaff(business.id, staffObj);
    showSuccess(editingStaff ? 'Staff Updated' : 'Staff Added', `${name} profile saved.`);
    setIsModalOpen(false);
  };

  const handleDeleteStaff = (staffId: string, staffName: string) => {
    if (confirm(`Are you sure you want to delete staff member "${staffName}"?`)) {
      db.deleteSalonStaff(business.id, staffId);
      showSuccess('Staff Removed', `${staffName} was removed.`);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-purple-600" /> Stylists, Barbers & Staff Team
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage team members, roles, service specialties, commission rates, and real-time revenue earnings.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Team Member
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team members by name or role..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <UserCheck className="h-12 w-12 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-500">No staff members found.</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl hover:bg-purple-100 transition cursor-pointer"
          >
            + Add First Staff Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map(st => {
            // Calculate staff stats
            const completedApps = appointments.filter(a => a.staffId === st.id && a.status === 'Completed');
            const totalRevenue = completedApps.reduce((acc, curr) => acc + curr.price, 0);
            const commissionEarned = (totalRevenue * (st.commissionRate || 0)) / 100;

            const statusColors = {
              Active: 'bg-emerald-100 text-emerald-800',
              'On Break': 'bg-amber-100 text-amber-800',
              'Off Duty': 'bg-slate-100 text-slate-600'
            };

            return (
              <div 
                key={st.id} 
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-purple-300 transition shadow-xs hover:shadow-md p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-black text-lg flex items-center justify-center overflow-hidden border border-purple-200 shrink-0">
                        {(st.avatarUrl || st.imageUrl) ? (
                          <img src={st.avatarUrl || st.imageUrl} alt={st.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          st.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{st.name}</h3>
                        <p className="text-xs text-purple-900 font-bold">{st.role}</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${statusColors[st.status]}`}>
                      {st.status}
                    </span>
                  </div>

                  {st.specialties && st.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {st.specialties.map((spec, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded-lg text-[10px] font-bold">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Performance Statistics Cards */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-2xl text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Completed Jobs</span>
                      <span className="font-black text-slate-900 text-base">{completedApps.length}</span>
                    </div>

                    <div className="bg-purple-50 p-2.5 rounded-2xl text-center">
                      <span className="block text-[9px] font-bold text-purple-600 uppercase">Revenue Generated</span>
                      <span className="font-black text-purple-900 text-sm">{formatCurrency(totalRevenue, business.currency)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                    <span className="font-bold flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5 text-emerald-600" /> Commission ({st.commissionRate}%):
                    </span>
                    <span className="font-black text-emerald-800">{formatCurrency(commissionEarned, business.currency)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    {st.phone && <span className="text-[11px] font-mono">{st.phone}</span>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(st)}
                      className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(st.id, st.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                {editingStaff ? 'Edit Staff Profile' : 'Add New Team Member'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Staff Member Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David Beckham"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role / Position</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    {STAFF_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-extrabold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telephone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 24 000 1111"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Work Duty Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="Active">Active / On Duty</option>
                    <option value="On Break">On Break</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specialties (Comma Separated)</label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  placeholder="e.g. Skin Fades, Beard Sculpting, Balayage, Dreadlocks"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <ImageUploadInput
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  label="Staff Photo / Avatar"
                  placeholder="Upload staff avatar or URL"
                  businessId={business.id}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold shadow-md transition cursor-pointer"
                >
                  {editingStaff ? 'Save Staff Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
