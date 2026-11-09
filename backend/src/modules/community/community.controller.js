import * as community from './community.service.js';

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function fail(res, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) console.error('[community]', error);

  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'Something went wrong. Please try again.' : error.message,
    code: error?.code || 'COMMUNITY_ERROR',
    ...(error?.errors ? { errors: error.errors } : {}),
  });
}

export async function listJourneys(req, res) {
  try {
    const data = await community.listPublicJourneys({
      search: req.query.search,
      tag: req.query.tag,
      page: req.query.page,
      limit: req.query.limit,
      viewerId: req.user?.id,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function getJourney(req, res) {
  try {
    const data = await community.getPublicJourney(req.params.slug, req.user?.id);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function listTags(_req, res) {
  try {
    const data = await community.listTags();
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function createJourney(req, res) {
  try {
    const data = await community.createJourney(req.body || {}, { ip: clientIp(req), user: req.user });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function voteJourney(req, res) {
  try {
    const data = await community.voteOnJourney(req.params.slug, req.user, req.body?.value);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function deleteJourney(req, res) {
  try {
    const data = await community.deleteOwnJourney(req.params.slug, req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function contactAuthor(req, res) {
  try {
    const data = await community.contactAuthor(req.params.slug, req.body || {}, { ip: clientIp(req) });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function reportJourney(req, res) {
  try {
    const data = await community.reportJourney(req.params.slug, req.body || {}, { ip: clientIp(req) });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function listComments(req, res) {
  try {
    const data = await community.listJourneyComments(req.params.slug);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function addComment(req, res) {
  try {
    const data = await community.addJourneyComment(req.params.slug, req.body || {}, {
      ip: clientIp(req),
      user: req.user,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function readManageLink(req, res) {
  try {
    const data = await community.getJourneyByToken(req.params.token);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function updateViaManageLink(req, res) {
  try {
    const data = await community.updateJourneyByToken(req.params.token, req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function deleteViaManageLink(req, res) {
  try {
    const data = await community.deleteJourneyByToken(req.params.token);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

/* Admin */

export async function adminList(req, res) {
  try {
    const data = await community.adminListJourneys({
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function adminReview(req, res) {
  try {
    const data = await community.adminReviewJourney(req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function adminUpdate(req, res) {
  try {
    const data = await community.adminUpdateJourney(req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function adminDelete(req, res) {
  try {
    const data = await community.adminDeleteJourney(req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function adminReports(req, res) {
  try {
    const data = await community.adminListReports({ status: req.query.status });
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function adminReportsSummary(_req, res) {
  try {
    const data = await community.adminListReports({ status: 'open' });
    return res.json({ success: true, data: { openCount: data.openCount } });
  } catch (error) {
    return fail(res, error);
  }
}

export async function adminResolveReport(req, res) {
  try {
    const data = await community.adminResolveReport(req.params.id, req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function adminComments(req, res) {
  try {
    const data = await community.adminListComments(req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function adminDeleteComment(req, res) {
  try {
    const data = await community.adminDeleteComment(req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, error);
  }
}

export async function reportReasons(_req, res) {
  return res.json({ success: true, data: community.REPORT_REASONS });
}
