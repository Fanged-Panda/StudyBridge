import * as universitiesService from './universities.service.js';

export const listUniversities = async (req, res) => {
  const result = await universitiesService.listUniversities(req.query);
  return res.status(result.status).json(result.body);
};

export const getUniversityById = async (req, res) => {
  const result = await universitiesService.getUniversityById(req.params.id);
  return res.status(result.status).json(result.body);
};

export const getAvailableSubjects = async (req, res) => {
  const result = await universitiesService.getAvailableSubjects();
  return res.status(result.status).json(result.body);
};

export const syncUniversity = async (req, res) => {
  const result = await universitiesService.syncUniversity(req.params.id, req.user?.id);
  return res.status(result.status).json(result.body);
};

export const syncAllUniversities = async (req, res) => {
  const result = await universitiesService.syncAllUniversities(req.user?.id);
  return res.status(result.status).json(result.body);
};

export const followUniversity = async (req, res) => {
  const result = await universitiesService.followUniversity(req.user?.id, req.params.id);
  return res.status(result.status).json(result.body);
};

export const unfollowUniversity = async (req, res) => {
  const result = await universitiesService.unfollowUniversity(req.user?.id, req.params.id);
  return res.status(result.status).json(result.body);
};

export const checkFollowStatus = async (req, res) => {
  const result = await universitiesService.checkFollowStatus(req.user?.id, req.params.id);
  return res.status(result.status).json(result.body);
};

export const getFollowedUniversities = async (req, res) => {
  const result = await universitiesService.getFollowedUniversities(req.user?.id);
  return res.status(result.status).json(result.body);
};

export const getFollowedUniversityIds = async (req, res) => {
  const result = await universitiesService.getFollowedUniversityIds(req.user?.id);
  return res.status(result.status).json(result.body);
};