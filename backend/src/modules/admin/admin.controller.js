import * as adminService from './admin.service.js';

export const updateUniversity = async (req, res) => {
  const { id } = req.params;
  const result = await adminService.updateUniversity(id, req.body);
  return res.status(result.status).json(result.body);
};

export const broadcastAnnouncement = async (req, res) => {
  const { id } = req.params;
  const result = await adminService.broadcastAnnouncement(id, req.body);
  return res.status(result.status).json(result.body);
};

export const updateScholarship = async (req, res) => {
  const { id } = req.params;
  const result = await adminService.updateScholarship(id, req.body);
  return res.status(result.status).json(result.body);
};

export const getAdminStats = async (req, res) => {
  const result = await adminService.getAdminStats();
  return res.status(result.status).json(result.body);
};

export const discoverUniversities = async (req, res) => {
  const result = await adminService.discoverUniversities(req.query);
  return res.status(result.status).json(result.body);
};

export const importUniversity = async (req, res) => {
  const result = await adminService.importAndSyncUniversity(req.body, req.user?.id);
  return res.status(result.status).json(result.body);
};

export const listUsers = async (req, res) => {
  const result = await adminService.listUsers(req.query);
  return res.status(result.status).json(result.body);
};

export const deleteUser = async (req, res) => {
  const result = await adminService.deleteUser(req.params.id, req.user?.id);
  return res.status(result.status).json(result.body);
};

export const deleteUniversity = async (req, res) => {
  const result = await adminService.deleteUniversity(req.params.id);
  return res.status(result.status).json(result.body);
};

export const deleteScholarship = async (req, res) => {
  const result = await adminService.deleteScholarship(req.params.id);
  return res.status(result.status).json(result.body);
};

export const deleteProfessor = async (req, res) => {
  const result = await adminService.deleteProfessor(req.params.id);
  return res.status(result.status).json(result.body);
};
