import * as syncService from './sync.service.js';
import { SYNC_JOB_TYPES } from '../../services/syncJobs.js';
import { syncFailure } from '../../services/syncRunner.js';

const sendError = (res, error) => {
  console.error('[Sync Center]', error?.code || '', error?.message || error);
  const failure = syncFailure(error, 'Synchronization operation failed.');
  return res.status(failure.status).json(failure.body);
};

export const getOverview = async (_req, res) => {
  try {
    const data = await syncService.getSyncOverview();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getJobs = async (req, res) => {
  try {
    const data = await syncService.listSyncJobs(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getJob = async (req, res) => {
  try {
    const data = await syncService.getSyncJob(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Sync job not found.' });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getActions = (_req, res) =>
  res.status(200).json({ success: true, data: syncService.getSyncActions() });

const trigger = async (req, res, type, { targetType = null, targetId = null, details = null } = {}) => {
  try {
    const outcome = await syncService.triggerManualSync({
      type,
      adminId: req.user?.id,
      targetType,
      targetId,
      details,
      actor: req.user?.email || req.user?.id,
    });
    return res.status(200).json({
      success: true,
      message: `${type.replaceAll('_', ' ').toLowerCase()} finished.`,
      data: outcome,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const syncAllUniversities = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.UNIVERSITY_CATALOG);

export const syncUniversity = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.UNIVERSITY, {
    targetType: 'university',
    targetId: req.params.id,
  });

export const syncUniversityAdmissions = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.ADMISSIONS, {
    targetType: 'university',
    targetId: req.params.id,
  });

export const syncAdmissions = (req, res) => trigger(req, res, SYNC_JOB_TYPES.ADMISSIONS);

export const syncUniversityProfessors = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.PROFESSORS, {
    targetType: 'university',
    targetId: req.params.id,
  });

export const syncAllScholarships = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.SCHOLARSHIPS);

export const syncScholarship = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.SCHOLARSHIP, {
    targetType: 'scholarship',
    targetId: req.params.id,
  });

export const checkScholarshipSources = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.SCHOLARSHIP_SOURCES);

export const extractChangedScholarships = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.SCHOLARSHIP_EXTRACTION);

export const updateScholarshipDeadlines = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.SCHOLARSHIP_DEADLINES);

export const refreshResearchMetrics = (req, res) =>
  trigger(req, res, SYNC_JOB_TYPES.RESEARCH_METRICS);
