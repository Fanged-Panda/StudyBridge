import * as scholarshipsService from './scholarships.service.js';

export const listScholarships = async (req, res) => {
  const result = await scholarshipsService.listScholarships(req.query);
  return res.status(result.status).json(result.body);
};

export const getScholarshipById = async (req, res) => {
  const result = await scholarshipsService.getScholarshipById(req.params.id);
  return res.status(result.status).json(result.body);
};

export const getScholarshipCountries = async (req, res) => {
  const result = await scholarshipsService.getScholarshipCountries();
  return res.status(result.status).json(result.body);
};

export const syncScholarship = async (req, res) => {
  const result = await scholarshipsService.syncScholarship(req.params.id);
  return res.status(result.status).json(result.body);
};

export const syncAllScholarships = async (req, res) => {
  const result = await scholarshipsService.syncAllScholarships();
  return res.status(result.status).json(result.body);
};
