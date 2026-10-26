import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { OverlapCandidate, User } from '../types';
import {
  Crosshair,
  Link2,
  XCircle,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface ConflictRadarPageProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const ConflictRadarPage: React.FC<ConflictRadarPageProps> = ({ currentUser, onRefreshData }) => {
  const [candidates, setCandidates] = useState<OverlapCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('UNREVIEWED');
  const [minScore, setMinScore] = useState(40);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Review Decision Modal
  const [reviewModalCandidate, setReviewModalCandidate] = useState<OverlapCandidate | null>(null);
  const [decisionType, setDecisionType] = useState<'LINK' | 'DISMISS' | 'DEFER'>('LINK');
  const [relationshipType, setRelationshipType] = useState('CROSS_BUREAU_COORDINATION');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  useEffect(() => {
    loadCandidates();
  }, [currentUser, statusFilter, minScore]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const res = await api.getOverlaps({
        review_status: statusFilter,
        min_score: minScore,
        limit: 50,
      });
      setCandidates(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load overlap candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async () => {
    try {
      setScanning(true);
      setScanMessage(null);
      const res = await api.triggerRadarScan();
      setScanMessage(res.message);
      await loadCandidates();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setScanMessage(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleOpenDecision = (candidate: OverlapCandidate, decision: 'LINK' | 'DISMISS' | 'DEFER') => {
    setReviewModalCandidate(candidate);
    setDecisionType(decision);
    setReason('');
    setDecisionError(null);
  };

  const handleSubmitDecision = async () => {
    if (!reviewModalCandidate) return;
    if (!reason.trim()) {
      setDecisionError('A clear justification or review rationale is required');
      return;
    }

    try {
      setSubmitting(true);
      setDecisionError(null);
      await api.submitOverlapDecision(
        reviewModalCandidate.id,
        decisionType,
        reason,
        decisionType === 'LINK' ? relationshipType : undefined
      );
      setReviewModalCandidate(null);
      await loadCandidates();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setDecisionError(err.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-300">
        <div>
          <h2 className="text-2xl font-extrabold text-[#3A0F34] tracking-tight flex items-center space-x-2">
            <Crosshair className="w-6 h-6 text-[#EAAA00]" />
            <span>Conflict Radar: Cross-Bureau Candidate Review</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Explainable multi-signal detection engine flagging potential case overlaps for human coordination review
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center space-x-2 px-4 py-2 bg-[#EAAA00] hover:bg-[#d49900] disabled:opacity-50 text-[#3A0F34] rounded-lg text-xs font-extrabold shadow-md shadow-[#EAAA00]/25 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3A0F34] ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Analyzing Case Pairs...' : 'Run Radar Scan'}</span>
          </button>
        </div>
      </div>

      {/* Scan Feedback Message */}
      {scanMessage && (
        <div className="p-3 bg-white border border-[#EAAA00] rounded-xl text-xs text-[#3A0F34] font-semibold flex items-center space-x-2 shadow-xs">
          <Sparkles className="w-4 h-4 text-[#EAAA00] shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Control Filter Bar */}
      <div className="p-4 bg-white border border-slate-300/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-600 font-bold mr-1">Queue State:</span>
          {['UNREVIEWED', 'LINKED', 'DISMISSED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#3A0F34] text-white shadow-xs'
                  : 'bg-[#F6F8FA] text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Score Threshold Slider */}
        <div className="flex items-center space-x-3 text-xs text-slate-600 font-medium">
          <span>Min Score:</span>
          <input
            type="range"
            min={40}
            max={90}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-28 accent-[#3A0F34] cursor-pointer"
          />
          <span className="font-mono font-extrabold text-[#3A0F34]">{minScore} pts</span>
        </div>
      </div>

      {/* Candidate Cards List */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-2 font-medium">
            <div className="w-8 h-8 border-4 border-[#3A0F34] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Evaluating matching signals across active case pairs...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-16 bg-white border border-slate-300/80 rounded-2xl text-center text-slate-500 text-xs space-y-2 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto opacity-75" />
            <p className="font-bold text-slate-800 text-sm">Conflict Radar Queue Clear</p>
            <p>No candidates match the selected review criteria and score threshold.</p>
          </div>
        ) : (
          candidates.map((cand) => {
            const isHighPriority = cand.composite_score >= 70;
            const isMedium = cand.composite_score >= 50;
            return (
              <div
                key={cand.id}
                className="bg-white border border-slate-300/80 hover:border-[#3A0F34]/50 rounded-2xl p-6 shadow-xs hover:shadow-md space-y-5 transition-all"
              >
                {/* Candidate Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-sm flex items-center space-x-1.5 shadow-xs ${
                        isHighPriority
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : isMedium
                          ? 'bg-[#EAAA00]/20 text-[#855700] border border-[#EAAA00]/60'
                          : 'bg-[#3A0F34]/10 text-[#3A0F34] border border-[#3A0F34]/20'
                      }`}
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>{cand.composite_score}/100</span>
                      <span className="text-[10px] font-bold uppercase opacity-80">
                        {isHighPriority ? 'High' : isMedium ? 'Medium' : 'Low'} Priority
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        cand.review_status === 'LINKED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : cand.review_status === 'DISMISSED'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : cand.review_status === 'DEFERRED'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-[#EAAA00]/20 text-[#3A0F34] border border-[#EAAA00]/50'
                      }`}
                    >
                      {cand.review_status}
                    </span>
                  </div>

                  {/* Review Actions */}
                  {cand.review_status === 'UNREVIEWED' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenDecision(cand, 'LINK')}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Link Related</span>
                      </button>
                      <button
                        onClick={() => handleOpenDecision(cand, 'DISMISS')}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>Dismiss</span>
                      </button>
                      <button
                        onClick={() => handleOpenDecision(cand, 'DEFER')}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs font-medium cursor-pointer shadow-xs"
                      >
                        Defer
                      </button>
                    </div>
                  )}

                  {cand.review_status !== 'UNREVIEWED' && cand.review_reason && (
                    <div className="text-xs text-slate-600 font-medium">
                      <span className="font-bold text-[#3A0F34]">Reviewer Note: </span>
                      {cand.review_reason}
                    </div>
                  )}
                </div>

                {/* Side-by-Side Comparison: Case A vs Case B */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Case A */}
                  <div className="p-4 bg-[#F6F8FA] border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-[#3A0F34] text-white">
                          {cand.case_a.bureau}
                        </span>
                        <span className="font-mono font-extrabold text-[#3A0F34]">{cand.case_a.source_case_id}</span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] rounded font-semibold bg-white border border-slate-200 text-slate-700">
                        {cand.case_a.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">{cand.case_a.institution_name}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-medium">AICTE ID: {cand.case_a.aicte_id || 'N/A'}</div>
                    <p className="text-xs text-slate-700 font-medium pt-1">{cand.case_a.subject}</p>
                    <span className="inline-block text-[10px] font-bold text-[#3A0F34] bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {cand.case_a.category}
                    </span>
                  </div>

                  {/* Case B */}
                  <div className="p-4 bg-[#F6F8FA] border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-[#EAAA00] text-[#3A0F34]">
                          {cand.case_b.bureau}
                        </span>
                        <span className="font-mono font-extrabold text-[#3A0F34]">{cand.case_b.source_case_id}</span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] rounded font-semibold bg-white border border-slate-200 text-slate-700">
                        {cand.case_b.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">{cand.case_b.institution_name}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-medium">AICTE ID: {cand.case_b.aicte_id || 'N/A'}</div>
                    <p className="text-xs text-slate-700 font-medium pt-1">{cand.case_b.subject}</p>
                    <span className="inline-block text-[10px] font-bold text-[#3A0F34] bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {cand.case_b.category}
                    </span>
                  </div>
                </div>

                {/* Explainability Breakdown Card */}
                <div className="p-4 bg-[#DDE3E8]/40 border border-[#3A0F34]/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-[#3A0F34] font-extrabold">
                      <Info className="w-3.5 h-3.5 text-[#EAAA00]" />
                      <span>Why was this candidate flagged? (Explainable Matching Breakdown)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono font-medium">Algorithm v1.0</span>
                  </div>

                  {/* Signal Points Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                      <div className="text-[10px] text-slate-500 font-medium">1. Exact AICTE ID</div>
                      <div className="text-sm font-extrabold text-[#3A0F34] mt-0.5">
                        +{cand.signals.exact_institution_id?.score || 0}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/ 45</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                      <div className="text-[10px] text-slate-500 font-medium">2. Name/Address Sim</div>
                      <div className="text-sm font-extrabold text-[#3A0F34] mt-0.5">
                        +{cand.signals.name_address_similarity?.score || 0}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/ 15</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                      <div className="text-[10px] text-slate-500 font-medium">3. Category Match</div>
                      <div className="text-sm font-extrabold text-[#3A0F34] mt-0.5">
                        +{cand.signals.category_similarity?.score || 0}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/ 15</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                      <div className="text-[10px] text-slate-500 font-medium">4. Narrative Keywords</div>
                      <div className="text-sm font-extrabold text-[#3A0F34] mt-0.5">
                        +{cand.signals.description_similarity?.score || 0}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/ 15</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-xs">
                      <div className="text-[10px] text-slate-500 font-medium">5. Cross-Bureau Need</div>
                      <div className="text-sm font-extrabold text-[#3A0F34] mt-0.5">
                        +{cand.signals.cross_bureau_active?.score || 0}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/ 10</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pt-1 font-medium">
                    {cand.explanation}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Decision Modal */}
      {reviewModalCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border-2 border-[#3A0F34] rounded-2xl p-6 space-y-4 shadow-2xl text-slate-800">
            <h3 className="font-extrabold text-base text-[#3A0F34] flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-[#EAAA00]" />
              <span>
                {decisionType === 'LINK' && 'Link Candidate Cases as Related'}
                {decisionType === 'DISMISS' && 'Dismiss Overlap Candidate'}
                {decisionType === 'DEFER' && 'Defer Candidate Review'}
              </span>
            </h3>

            {decisionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
                {decisionError}
              </div>
            )}

            <div className="p-3 bg-[#F6F8FA] border border-slate-300 rounded-xl text-xs space-y-1">
              <div>
                <span className="text-slate-500 font-medium">Pair: </span>
                <span className="font-bold text-[#3A0F34]">
                  {reviewModalCandidate.case_a.source_case_id} ({reviewModalCandidate.case_a.bureau}) &harr;{' '}
                  {reviewModalCandidate.case_b.source_case_id} ({reviewModalCandidate.case_b.bureau})
                </span>
              </div>
              <div className="text-slate-600">
                Score: <span className="font-extrabold text-[#3A0F34]">{reviewModalCandidate.composite_score}/100</span>
              </div>
            </div>

            {decisionType === 'LINK' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Relationship Type</label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  >
                    <option value="CROSS_BUREAU_COORDINATION">Cross-Bureau Coordination Needed</option>
                    <option value="DUPLICATE_COMPLAINT">Duplicate / Repeat Complaint</option>
                    <option value="RELATED_SERIES">Related Compliance Series</option>
                    <option value="REFERRED">Referred Matter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reviewer Justification (Mandatory)</label>
                  <textarea
                    rows={3}
                    placeholder="Document mandatory administrative rationale for linking these records..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  />
                </div>
              </div>
            )}

            {decisionType === 'DISMISS' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 text-xs">
                  Dismissing this candidate records the reason and prevents repeat alerts for this pair unless underlying case fields materially change.
                </p>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason for Dismissal (Mandatory)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Unrelated matters targeting separate departments without systemic crossover..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  />
                </div>
              </div>
            )}

            {decisionType === 'DEFER' && (
              <div className="space-y-3 text-xs">
                <label className="block text-slate-700 font-bold mb-1">Deferral Notes</label>
                <textarea
                  rows={3}
                  placeholder="Notes for follow-up review..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                onClick={() => setReviewModalCandidate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDecision}
                disabled={submitting}
                className="px-4 py-2 bg-[#EAAA00] hover:bg-[#d49900] disabled:opacity-50 text-[#3A0F34] rounded-lg text-xs font-extrabold cursor-pointer shadow-md shadow-[#EAAA00]/25"
              >
                {submitting ? 'Recording...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
