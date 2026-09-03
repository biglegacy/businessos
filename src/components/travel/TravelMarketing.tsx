import React, { useState, useEffect } from 'react';
import { Send, Search, Plus, Trash2, Globe, Sparkles, MessageSquare, X } from 'lucide-react';
import { Business, TravelMarketing } from '../../types';
import { db } from '../../lib/db';

interface TravelMarketingProps {
  business: Business;
}

export const TravelMarketingCampaigns: React.FC<TravelMarketingProps> = ({ business }) => {
  const [campaigns, setCampaigns] = useState<TravelMarketing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<TravelMarketing>>({
    campaignName: '',
    channel: 'WhatsApp / SMS',
    targetAudience: 'All Registered Travelers',
    content: '',
    status: 'Scheduled',
  });

  const loadData = () => {
    const list = db.getTravelMarketings(business.id);
    setCampaigns(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setFormData({
      campaignName: 'Dubai Summer Special Promo',
      channel: 'WhatsApp Broadcast',
      targetAudience: 'Frequent Travelers',
      content: 'Book your Dubai 7-Day Tour today and get 15% off visa processing fees! Reply YES to get full details.',
      status: 'Scheduled',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campaignName || !formData.content) {
      alert('Campaign Title and Message Content are required.');
      return;
    }

    const record: TravelMarketing = {
      id: `tmk-${Date.now()}`,
      businessId: business.id,
      campaignName: formData.campaignName || '',
      channel: (formData.channel as any) || 'WhatsApp Broadcast',
      targetAudience: formData.targetAudience || 'All Travelers',
      content: formData.content || '',
      scheduledDate: new Date().toISOString().split('T')[0],
      status: (formData.status as any) || 'Sent',
      createdAt: new Date().toISOString(),
    };

    db.saveTravelMarketing(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this marketing campaign?')) {
      db.deleteTravelMarketing(id);
    }
  };

  const filtered = campaigns.filter(c => 
    c.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.channel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" /> Travel Marketing & Client Broadcasts
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Send WhatsApp deals, promotional SMS alerts, and email newsletters for tour deals
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search campaigns by title, channel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            No marketing campaigns created yet. Click "Create Campaign" to launch a promotional broadcast.
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-base">{c.campaignName}</h3>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                    {c.channel}
                  </span>
                </div>

                <div className="text-xs text-slate-500 mb-3">
                  Target: <span className="font-medium text-slate-700">{c.targetAudience}</span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 italic">
                  "{c.content}"
                </p>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-full">
                  {c.status}
                </span>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">New Marketing Campaign</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={formData.campaignName}
                  onChange={e => setFormData({ ...formData, campaignName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Easter Holiday Tour Deals"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Channel</label>
                <select
                  value={formData.channel}
                  onChange={e => setFormData({ ...formData, channel: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="WhatsApp Broadcast">WhatsApp Broadcast</option>
                  <option value="SMS Broadcast">SMS Broadcast</option>
                  <option value="Email Newsletter">Email Newsletter</option>
                  <option value="Social Media Ad">Social Media Ad</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. All Past Clients / UK Visa Applicants"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Type your promotional message or announcement..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
