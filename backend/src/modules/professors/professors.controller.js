import * as professors from './professors.service.js';

function fail(res, error) {
  console.error('[professors]', error);
  return res.status(500).json({ success: false, message: 'Could not load the faculty directory right now.' });
}

export async function list(req, res) {
  try {
    const data = await professors.listProfessors({
      search: req.query.search,
      university: req.query.university,
      universityId: req.query.universityId,
      field: req.query.field,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function fields(_req, res) {
  try {
    return res.json({ success: true, data: await professors.listFields() });
  } catch (error) {
    return fail(res, error);
  }
}

export async function byUniversity(req, res) {
  try {
    const data = await professors.listProfessorsForUniversity(req.params.universityId, { limit: req.query.limit });
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}
