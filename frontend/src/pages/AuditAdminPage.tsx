import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuditEvent, User } from '../types';
import {
  ShieldAlert
} from 'lucide-react';

interface AuditAdminPageProps {
  currentUser: User | null;
}

export const AuditAdminPage: React.FC<AuditAdminPageProps> = ({ currentUser }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadAuditEvents();
  }, [categoryFilter, page]);

  const loadAuditEvents = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditEvents({
        category: categoryFilter,
        skip: page * limit,
        limit,
      });
      setEvents(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit events', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="pb-2 border-b border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#3A0F34] tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-[#EAAA00]" />
            <span>Security & Compliance Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Immutable log separating security events (authentication, access denials) from business state changes
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 rounded-md font-extrabold bg-[#3A0F34] text-[#EAAA00] shadow-xs">
            Role: {currentUser?.role}
          </span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-slate-700 font-mono font-bold bg-white border border-slate-300 px-2.5 py-1 rounded-md shadow-xs">
            {total} Total Logged Events
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white border border-slate-300/80 rounded-2xl flex items-center space-x-3 text-xs shadow-xs">
        <span className="text-slate-600 font-bold">Filter Category:</span>
        {['ALL', 'SECURITY', 'BUSINESS', 'AUTHORIZATION_FAILURE'].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategoryFilter(cat);
              setPage(0);
            }}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              categoryFilter === cat
                ? 'bg-[#3A0F34] text-white shadow-xs'
                : 'bg-[#F6F8FA] text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Events Table */}
      <div className="bg-white border border-slate-300/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#3A0F34] text-white uppercase tracking-wider text-[10px] font-bold border-b border-[#3A0F34]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor Email</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Object Target</th>
                <th className="py-3 px-4">Details / Metadata</th>
                <th className="py-3 px-4 text-right">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px] bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    No audit records found matching selected filter.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#F6F8FA]">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">{ev.actor_email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.event_category === 'SECURITY'
                            ? 'bg-[#3A0F34]/10 text-[#3A0F34] border border-[#3A0F34]/20'
                            : ev.event_category === 'AUTHORIZATION_FAILURE'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {ev.event_category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#3A0F34]">{ev.event_type}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {ev.object_type ? `${ev.object_type}:${ev.object_id?.slice(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium max-w-xs truncate" title={ev.details}>
                      {ev.details || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-[10px]">
                      {ev.request_id ? ev.request_id.slice(0, 8) : 'sys'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3.5 bg-[#F6F8FA] border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div>
            Page <span className="font-extrabold text-[#3A0F34]">{page + 1}</span> of{' '}
            <span className="font-extrabold text-[#3A0F34]">{Math.max(1, Math.ceil(total / limit))}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 rounded font-semibold transition cursor-pointer shadow-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 rounded font-semibold transition cursor-pointer shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
