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
  const result = await universitiesService.syncUniversity(req.params.id);
  return res.status(result.status).json(result.body);
};

export const syncAllUniversities = async (req, res) => {
  const result = await universitiesService.syncAllUniversities();
  return res.status(result.status).json(result.body);
};