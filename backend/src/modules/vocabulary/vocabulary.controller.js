import * as vocabularyService from './vocabulary.service.js';

function userIdFrom(req) {
  const id = req.user?.id || req.user?.sub;
  if (!id) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  return String(id);
}

function respondWithError(error, res) {
  const status = error.status && Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('Vocabulary error:', error);
  return res.status(status).json({
    success: false,
    code: error.code || 'VOCABULARY_ERROR',
    message: status >= 500 ? 'Something went wrong. Please try again.' : error.message,
  });
}

export async function dashboard(req, res) {
  try {
    const data = await vocabularyService.getDashboard(userIdFrom(req));
    return res.json({ success: true, data });
  } catch (error) {
    return respondWithError(error, res);
  }
}

export async function listWords(req, res) {
  try {
    const words = await vocabularyService.listWords(userIdFrom(req));
    return res.json({ success: true, data: words });
  } catch (error) {
    return respondWithError(error, res);
  }
}

export async function learn(req, res) {
  try {
    const data = await vocabularyService.learnTodayWord(userIdFrom(req), {
      knewIt: Boolean(req.body?.knewIt),
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return respondWithError(error, res);
  }
}

export async function updateGoal(req, res) {
  try {
    const data = await vocabularyService.setDailyGoal(userIdFrom(req), req.body?.dailyGoal);
    return res.json({ success: true, data });
  } catch (error) {
    return respondWithError(error, res);
  }
}

export async function startTest(req, res) {
  try {
    const data = await vocabularyService.startTest(userIdFrom(req));
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return respondWithError(error, res);
  }
}

export async function submitTest(req, res) {
  try {
    const data = await vocabularyService.submitTest(
      userIdFrom(req),
      req.body?.testId,
      req.body?.answers || {},
    );
    return res.json({ success: true, data });
  } catch (error) {
    return respondWithError(error, res);
  }
}
