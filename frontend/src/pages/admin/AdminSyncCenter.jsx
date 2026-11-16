import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';

const statusVariant = (status) => {
  if (['SUCCESS', 'UNCHANGED'].includes(status)) return 'success';
  if (['PARTIAL', 'DEFERRED', 'CHANGED', 'QUEUED', 'RUNNING'].includes(status)) return 'warning';
  if (['FAILED', 'ERROR', 'FETCH_FAILED'].includes(status)) return 'danger';
  return 'outline';
};

const formatNumber = (value) => (value === null || value === undefined ? '—' : Number(value).toLocaleString());
const formatDate = (value) => (value ? new Date(value).toLocaleString() : 'Never');
const duration = (job) => {
  if (!job?.startedAt) return '—';
  const end = job.finishedAt ? new Date(job.finishedAt) : new Date();
  const seconds = Math.max(0, Math.round((end.getTime() - new Date(job.startedAt).getTime()) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const MetricCard = ({ icon: Icon, label, value, hint, tone = 'text-primary' }) => (
  <Card className="border border-slate-200 bg-white p-4">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
        {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      </div>
      <div className="rounded-xl bg-slate-50 p-2 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  </Card>
);

const SyncActionButton = ({ label, onClick, loading, variant = 'outline', disabled = false }) => (
  <Button
    variant={variant}
    onClick={onClick}
    disabled={loading || disabled}
    className="inline-flex items-center gap-1.5 text-xs"
  >
    {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
    {loading ? 'Running…' : label}
  </Button>
);

const AdminSyncCenter = () => {
  const [overview, setOverview] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedScholarship, setSelectedScholarship] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    try {
      const [overviewRes, jobsRes, uniRes, schRes] = await Promise.all([
        api.get('/admin/sync/overview'),
        api.get('/admin/sync/jobs', { params: { limit: 20 } }),
        api.get('/universities', { params: { limit: 300, sort: 'name-asc' } }),
        api.get('/scholarships', { params: { limit: 300, sort: 'name-asc' } }),
      ]);
      setOverview(overviewRes.data?.data || null);
      setJobs(jobsRes.data?.data || []);
      setUniversities(uniRes.data?.data || []);
      setScholarships(schRes.data?.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load Sync Center data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    const timer = window.setInterval(loadOverview, 15000);
    return () => window.clearInterval(timer);
  }, [loadOverview]);

  const runAction = async ({ key, path, label, confirmText, body = {} }) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setFeedback(null);
    setSelectedJob(null);
    try {
      const res = await api.post(path, body, { timeout: 180000 });
      const job = res.data?.data?.job;
      setFeedback({
        type: 'success',
        message: `${label} finished${job ? ` (${job.status.toLowerCase()}, ${job.processed} processed)` : ''}.`,
      });
      setSelectedJob(job || null);
      await loadOverview();
    } catch (err) {
      const job = err?.response?.data?.job;
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || `${label} failed.`,
      });
      if (job) setSelectedJob(job);
      await loadOverview();
    } finally {
      setBusy('');
    }
  };

  const gemini = overview?.geminiUsage;
  const quality = overview?.quality;
  const sources = overview?.dataSources?.scholarshipSources;

  const staleTotal = useMemo(() => {
    const stale = overview?.stale || {};
    return (stale.universities || 0) + (stale.scholarships || 0) + (stale.professors || 0);
  }, [overview]);

  if (loading) {
    return (
      <Card className="p-8 text-center text-sm font-semibold text-slate-500">
        <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading Sync Center…
      </Card>
    );
  }

  if (error && !overview) {
    return (
      <Card className="border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        <AlertTriangle className="mr-2 inline h-4 w-4" /> {error}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-primary">Data Synchronization Center</h2>
          <p className="mt-1 text-xs text-slate-500">
            Live source health, quota-aware jobs and administrator-controlled refreshes.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadOverview}
          className="inline-flex w-fit items-center gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh dashboard
        </Button>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-2xl border p-3.5 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Database} label="Universities" value={formatNumber(overview?.counts?.universities)} />
        <MetricCard icon={ShieldCheck} label="Scholarships" value={formatNumber(overview?.counts?.scholarships)} />
        <MetricCard icon={Activity} label="Professors" value={formatNumber(overview?.counts?.professors)} />
        <MetricCard
          icon={Clock}
          label="Stale records"
          value={formatNumber(staleTotal)}
          hint="University, scholarship and professor due dates"
          tone={staleTotal > 0 ? 'text-amber-600' : 'text-emerald-600'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Gauge}
          label="Sync Gemini budget"
          value={`${formatNumber(gemini?.remainingSyncBudget)} / ${formatNumber(gemini?.configuredDailySyncBudget)}`}
          hint="Application-level requests remaining today"
          tone={gemini?.circuitOpen ? 'text-red-600' : 'text-primary'}
        />
        <MetricCard
          icon={Activity}
          label="Chatbot requests today"
          value={formatNumber(gemini?.chatRequests)}
          hint="Tracked separately; never limited by sync budget"
        />
        <MetricCard
          icon={Gauge}
          label="Admission extractions"
          value={formatNumber(gemini?.admissionRequests)}
          hint={`${formatNumber(gemini?.scholarshipRequests)} scholarship extractions today`}
        />
        <MetricCard
          icon={Server}
          label="Running / failed jobs"
          value={`${formatNumber((overview?.runningJobs || []).length)} / ${formatNumber(overview?.failedJobCount)}`}
          hint={`Last success: ${overview?.lastSuccessfulSync ? formatDate(overview.lastSuccessfulSync.finishedAt) : 'never'}`}
          tone={overview?.failedJobCount ? 'text-red-600' : 'text-emerald-600'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="border border-slate-200 bg-white p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Manual controls</h3>
            <Badge variant="outline">Admin only</Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SyncActionButton
              label="Sync all universities"
              loading={busy === 'catalog'}
              onClick={() =>
                runAction({
                  key: 'catalog',
                  path: '/admin/sync/universities',
                  label: 'University discovery',
                  confirmText: 'Run university directory discovery now? New universities are only imported when HIPOLABS_CREATE_NEW=true.',
                })
              }
            />
            <SyncActionButton
              label="Sync all scholarships"
              loading={busy === 'scholarships'}
              onClick={() =>
                runAction({
                  key: 'scholarships',
                  path: '/admin/sync/scholarships',
                  label: 'Scholarship sync',
                  confirmText: 'Check scholarship sources and extract changed pages now? This may use the small Gemini sync budget.',
                })
              }
            />
            <SyncActionButton
              label="Admission requirements"
              loading={busy === 'admissions'}
              onClick={() =>
                runAction({
                  key: 'admissions',
                  path: '/admin/sync/admissions',
                  label: 'Admission sync',
                  confirmText: 'Refresh a small batch of due university admission pages? Gemini budget rules apply.',
                })
              }
            />
            <SyncActionButton
              label="Refresh research metrics"
              loading={busy === 'metrics'}
              onClick={() =>
                runAction({
                  key: 'metrics',
                  path: '/admin/sync/professors/metrics',
                  label: 'Research metrics refresh',
                })
              }
            />
            <SyncActionButton
              label="Check source pages"
              loading={busy === 'sources'}
              onClick={() =>
                runAction({
                  key: 'sources',
                  path: '/admin/sync/scholarship-sources',
                  label: 'Scholarship source check',
                })
              }
            />
            <SyncActionButton
              label="Extract changed pages"
              loading={busy === 'extract'}
              onClick={() =>
                runAction({
                  key: 'extract',
                  path: '/admin/sync/scholarship-extraction',
                  label: 'Scholarship extraction',
                })
              }
            />
            <SyncActionButton
              label="Update deadlines"
              loading={busy === 'deadlines'}
              onClick={() =>
                runAction({
                  key: 'deadlines',
                  path: '/admin/sync/scholarship-deadlines',
                  label: 'Deadline status update',
                })
              }
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-3.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Particular university
              </label>
              <select
                value={selectedUniversity}
                onChange={(event) => setSelectedUniversity(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="">Select a university…</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name} — {university.country}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                <SyncActionButton
                  label="Sync university"
                  loading={busy === 'university'}
                  disabled={!selectedUniversity}
                  onClick={() =>
                    runAction({
                      key: 'university',
                      path: `/admin/sync/universities/${selectedUniversity}`,
                      label: 'University sync',
                      confirmText: 'Refresh this university from OpenAlex and its official website?',
                    })
                  }
                />
                <SyncActionButton
                  label="Admissions"
                  loading={busy === 'university-admissions'}
                  disabled={!selectedUniversity}
                  onClick={() =>
                    runAction({
                      key: 'university-admissions',
                      path: `/admin/sync/universities/${selectedUniversity}/admissions`,
                      label: 'Admission sync',
                      confirmText: 'Extract admission requirements for this university? This uses one Gemini sync request.',
                    })
                  }
                />
                <SyncActionButton
                  label="Professors"
                  loading={busy === 'university-professors'}
                  disabled={!selectedUniversity}
                  onClick={() =>
                    runAction({
                      key: 'university-professors',
                      path: `/admin/sync/universities/${selectedUniversity}/professors`,
                      label: 'Professor sync',
                    })
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Particular scholarship
              </label>
              <select
                value={selectedScholarship}
                onChange={(event) => setSelectedScholarship(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="">Select a scholarship…</option>
                {scholarships.map((scholarship) => (
                  <option key={scholarship.id} value={scholarship.id}>
                    {scholarship.name} — {scholarship.country}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                <SyncActionButton
                  label="Sync scholarship"
                  loading={busy === 'scholarship'}
                  disabled={!selectedScholarship}
                  onClick={() =>
                    runAction({
                      key: 'scholarship',
                      path: `/admin/sync/scholarships/${selectedScholarship}`,
                      label: 'Scholarship sync',
                      confirmText: 'Check this source hash and extract only if the page changed?',
                    })
                  }
                />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Changed pages are queued with SHA-256 detection. Unchanged pages never call Gemini.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-700">
            <Gauge className="h-4 w-4" /> Gemini protection
          </h3>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Chatbot</span>
              <Badge variant={gemini?.chatEnabled ? 'success' : 'danger'}>
                {gemini?.chatEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Sync extraction</span>
              <Badge variant={gemini?.syncEnabled ? 'success' : 'outline'}>
                {gemini?.syncEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Daily sync budget</span>
              <strong>{formatNumber(gemini?.configuredDailySyncBudget)}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Used / remaining</span>
              <strong>
                {formatNumber(gemini?.syncRequests)} / {formatNumber(gemini?.remainingSyncBudget)}
              </strong>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Quota errors</span>
              <strong className={gemini?.quotaErrors ? 'text-red-600' : ''}>
                {formatNumber(gemini?.quotaErrors)}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Circuit breaker</span>
              <Badge variant={gemini?.circuitOpen ? 'danger' : 'success'}>
                {gemini?.circuitOpen ? 'Open' : 'Closed'}
              </Badge>
            </div>
          </div>
          {gemini?.circuitOpen && (
            <p className="mt-3 rounded-xl bg-red-50 p-2.5 text-[11px] font-semibold text-red-700">
              Sync extraction paused until {formatDate(gemini.circuitOpenUntil)}. Chatbot requests are unaffected.
            </p>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">{gemini?.note}</p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="border border-slate-200 bg-white p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Sync history</h3>
            <Badge variant="outline">{jobs.length} recent</Badge>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">Job</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Trigger</th>
                  <th className="py-2 pr-3">Started</th>
                  <th className="py-2 pr-3">Duration</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Processed</th>
                  <th className="py-2 pr-3">New</th>
                  <th className="py-2 pr-3">Updated</th>
                  <th className="py-2">Failed</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-2.5 pr-3 font-mono text-[10px] text-slate-500">{job.id.slice(-8)}</td>
                    <td className="py-2.5 pr-3 font-bold text-primary">{job.type.replaceAll('_', ' ')}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{job.triggeredBy}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{formatDate(job.startedAt || job.createdAt)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{duration(job)}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-3">{formatNumber(job.processed)}</td>
                    <td className="py-2.5 pr-3">{formatNumber(job.created)}</td>
                    <td className="py-2.5 pr-3">{formatNumber(job.updated)}</td>
                    <td className={`py-2.5 ${job.failed ? 'font-bold text-red-600' : ''}`}>
                      {formatNumber(job.failed)}
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-500">
                      No synchronization jobs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedJob && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Job details</p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-primary">{selectedJob.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(selectedJob.status)}>{selectedJob.status}</Badge>
                  <button
                    type="button"
                    onClick={() => setSelectedJob(null)}
                    className="text-[11px] font-bold text-slate-500 hover:text-primary"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
                <span><strong>Triggered by:</strong> {selectedJob.triggeredBy}</span>
                <span><strong>Gemini calls:</strong> {formatNumber(selectedJob.geminiRequests)}</span>
                <span><strong>Finished:</strong> {formatDate(selectedJob.finishedAt)}</span>
                <span><strong>Same:</strong> {formatNumber(selectedJob.unchanged)}</span>
                <span><strong>Skipped:</strong> {formatNumber(selectedJob.skipped)}</span>
                <span><strong>Admin:</strong> {selectedJob.adminId || '—'}</span>
              </div>
              {selectedJob.error && (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-red-50 p-3 text-[10px] text-red-700">
                  {selectedJob.error}
                </pre>
              )}
              {selectedJob.details && (
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-[10px] text-slate-600">
                  {JSON.stringify(selectedJob.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </Card>

        <Card className="border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-700">
            <AlertTriangle className="h-4 w-4" /> Data quality
          </h3>
          <div className="mt-4 space-y-2 text-xs">
            {[
              ['Stale admission requirements', quality?.staleAdmissionRequirements],
              ['Missing university websites', quality?.missingUniversityWebsites],
              ['Missing scholarship deadlines', quality?.missingDeadlines],
              ['Missing scholarship source URLs', quality?.missingScholarshipSourceUrls],
              ['Unverified professor matches', quality?.unverifiedProfessorMatches],
              ['Expired but still active', quality?.expiredStillMarkedActive],
              ['Failed sync jobs', quality?.failedExtractionJobs],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">{label}</span>
                <strong className={value ? 'text-amber-600' : 'text-emerald-600'}>
                  {formatNumber(value)}
                </strong>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Source health</h4>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">HipoLabs</span>
                <Badge variant="success">Configured</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">OpenAlex</span>
                <Badge variant="success">
                  {overview?.dataSources?.openAlex?.apiKeyConfigured ? 'Key + polite pool' : 'Public'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gemini</span>
                <Badge variant={overview?.dataSources?.gemini?.configured ? 'success' : 'danger'}>
                  {overview?.dataSources?.gemini?.configured ? 'Configured' : 'Missing key'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scholarship sources</span>
                <span className="font-bold text-slate-700">
                  {formatNumber(sources?.total)} ({formatNumber(sources?.unverified)} unverified)
                </span>
              </div>
            </div>
            {sources?.recent?.length > 0 && (
              <div className="mt-3 max-h-40 overflow-auto rounded-xl border border-slate-100">
                {sources.recent.map((source) => (
                  <div key={source.id} className="flex items-start justify-between gap-2 border-b border-slate-100 p-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-slate-700">{source.name || source.url}</p>
                      <p className="truncate text-[9px] text-slate-400">{source.url}</p>
                    </div>
                    <Badge variant={statusVariant(source.syncStatus)}>{source.syncStatus || 'NEW'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="border border-amber-200 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-800">
        <strong>Operational note:</strong> synchronization is scheduled through Render Cron Jobs, not this dashboard
        and not Vercel. Manual actions use the same locks, job history and Gemini budget. If the sync budget is
        exhausted, pending extraction work stays flagged for a later run; chatbot requests continue normally.
      </Card>
    </div>
  );
};

export default AdminSyncCenter;
