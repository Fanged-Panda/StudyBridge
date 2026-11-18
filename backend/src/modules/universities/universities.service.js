import prisma from '../../config/database.js';
import { queueOnDemandRefresh } from '../../services/onDemandSync.js';
import { runManualSync, syncFailure } from '../../services/syncRunner.js';
import { SYNC_JOB_TYPES } from '../../services/syncJobs.js';

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const getEstimatedLivingCost = (country = '') => {
  const c = country.toLowerCase();
  if (c.includes('usa') || c.includes('united states')) return 16500;
  if (c.includes('uk') || c.includes('united kingdom')) return 15200;
  if (c.includes('switzerland')) return 19500;
  if (c.includes('australia')) return 17000;
  if (c.includes('canada')) return 14500;
  if (c.includes('singapore')) return 14000;
  if (c.includes('germany') || c.includes('netherlands') || c.includes('belgium') || c.includes('france') || c.includes('denmark') || c.includes('ireland')) return 12000;
  if (c.includes('japan') || c.includes('south korea') || c.includes('hong kong')) return 11000;
  if (c.includes('china')) return 7500;
  return 12000;
};

const EUROPEAN_COUNTRIES = new Set([
  'albania', 'austria', 'belarus', 'belgium', 'bosnia and herzegovina', 'bulgaria',
  'croatia', 'cyprus', 'czech republic', 'denmark', 'estonia', 'finland', 'france',
  'germany', 'greece', 'hungary', 'iceland', 'ireland', 'italy', 'latvia', 'lithuania',
  'luxembourg', 'malta', 'moldova', 'montenegro', 'netherlands', 'north macedonia',
  'norway', 'poland', 'portugal', 'romania', 'serbia', 'slovakia', 'slovenia', 'spain',
  'sweden', 'switzerland', 'uk', 'united kingdom',
]);

const ASIAN_COUNTRIES = new Set([
  'bangladesh', 'china', 'hong kong', 'india', 'indonesia', 'japan', 'malaysia',
  'pakistan', 'philippines', 'singapore', 'south korea', 'sri lanka', 'taiwan',
  'thailand', 'vietnam',
]);

const normalizeCountry = (country = '') => {
  const normalized = String(country).trim().toLowerCase();
  if (normalized === 'usa' || normalized === 'united states') return 'united states';
  if (normalized === 'uk' || normalized === 'united kingdom') return 'united kingdom';
  return normalized;
};

const isScholarshipApplicableToUniversity = (scholarship, university) => {
  const universityCountry = normalizeCountry(university.country);
  const scholarshipCountry = normalizeCountry(scholarship.country);
  const name = String(scholarship.name || '').toLowerCase();

  if (scholarshipCountry === universityCountry) return true;
  if (scholarshipCountry === 'europe') return EUROPEAN_COUNTRIES.has(universityCountry);
  if (scholarshipCountry === 'asia') return ASIAN_COUNTRIES.has(universityCountry);

  if (scholarshipCountry === 'global') {
    // Destination-specific or partner-restricted programs are not general
    // Global awards for every university.
    if (name.includes('fulbright u.s.') || name.includes('japan/world bank') || name.includes('adb-japan')) {
      return false;
    }
  }

  return false;
};

// Generates rich course structures for each discipline/course string or object
export const enrichCourses = (courses = [], tuitionAnnualUsd = 0, ieltsReq = 6.5) => {
  if (!Array.isArray(courses)) return [];

  const defaultTemplates = {
    'Computer Science': {
      degrees: ["Bachelor's in Computer Science", "MSc in Advanced Computing", "PhD in Computer Science"],
      duration: '3-4 Yrs (UG) / 1-2 Yrs (PG)',
      skills: ['Algorithms', 'Software Engineering', 'Distributed Systems', 'Cloud Computing'],
    },
    'AI': {
      degrees: ["BSc in Artificial Intelligence", "MSc in Machine Learning & AI", "PhD in Cognitive AI"],
      duration: '3-4 Yrs (UG) / 1-2 Yrs (PG)',
      skills: ['Neural Networks', 'Natural Language Processing', 'Computer Vision', 'Deep Learning'],
    },
    'Robotics': {
      degrees: ["BSc in Robotics & Mechatronics", "MSc in Autonomous Systems", "PhD in Robotics"],
      duration: '4 Yrs (UG) / 2 Yrs (PG)',
      skills: ['Control Systems', 'Embedded Hardware', 'ROS', 'Kinematics'],
    },
    'Data Science': {
      degrees: ["BSc in Data Science & Analytics", "MSc in Big Data Technologies", "PhD in Data Analytics"],
      duration: '3-4 Yrs (UG) / 1-2 Yrs (PG)',
      skills: ['Statistical Modeling', 'Big Data Engineering', 'Machine Learning', 'Data Visualization'],
    },
    'Engineering': {
      degrees: ["B.Eng in Electrical/Mechanical", "M.Eng in Industrial Engineering", "PhD in Engineering Sciences"],
      duration: '4 Yrs (UG) / 2 Yrs (PG)',
      skills: ['CAD/CAM', 'Thermodynamics', 'Signal Processing', 'Systems Design'],
    },
    'Mechanical Engineering': {
      degrees: ["B.Eng Mechanical Engineering", "M.Eng Advanced Mechanical Systems"],
      duration: '4 Yrs (UG) / 2 Yrs (PG)',
      skills: ['Fluid Dynamics', 'Robotics', 'Solid Mechanics', 'Materials Science'],
    },
    'Aerospace Engineering': {
      degrees: ["BSc in Aerospace Engineering", "MSc in Aeronautical Systems"],
      duration: '4 Yrs (UG) / 2 Yrs (PG)',
      skills: ['Aerodynamics', 'Propulsion', 'Avionics', 'Orbital Mechanics'],
    },
    'Business': {
      degrees: ["BBA in International Business", "MBA (Global Management)", "MSc in Strategic Management"],
      duration: '3-4 Yrs (UG) / 1-2 Yrs (PG)',
      skills: ['Financial Modeling', 'Strategic Leadership', 'Operations', 'Global Marketing'],
    },
    'Finance': {
      degrees: ["BSc in Quantitative Finance", "Master in Financial Engineering (MFE)", "MSc Corporate Finance"],
      duration: '3-4 Yrs (UG) / 1-2 Yrs (PG)',
      skills: ['Portfolio Management', 'Econometrics', 'Risk Analysis', 'FinTech'],
    },
    'Economics': {
      degrees: ["BSc in Economics", "MSc in Applied Econometrics", "PhD in Quantitative Economics"],
      duration: '3 Yrs (UG) / 2 Yrs (PG)',
      skills: ['Macroeconomics', 'Game Theory', 'Microeconomic Policy', 'Statistical Forecasting'],
    },
    'Medicine': {
      degrees: ["Doctor of Medicine (MD)", "MBBS", "MSc in Biomedical Sciences"],
      duration: '5-6 Yrs (Undergraduate Entry / Graduate Entry)',
      skills: ['Clinical Anatomy', 'Pathology', 'Pharmacology', 'Patient Diagnostics'],
    },
    'Pharmacy': {
      degrees: ["Bachelor of Pharmacy (BPharm)", "PharmD (Doctor of Pharmacy)", "MSc in Clinical Pharmacology"],
      duration: '4-5 Yrs',
      skills: ['Drug Formulation', 'Toxicology', 'Clinical Therapeutics', 'Biochemistry'],
    },
    'Nursing': {
      degrees: ["Bachelor of Science in Nursing (BSN)", "Master of Science in Clinical Nursing"],
      duration: '3-4 Yrs',
      skills: ['Acute Care', 'Patient Advocacy', 'Health Assessment', 'Evidence-Based Practice'],
    },
    'Law': {
      degrees: ["Bachelor of Laws (LLB)", "Juris Doctor (JD)", "Master of Laws (LLM)"],
      duration: '3 Yrs (LLB/JD) / 1 Yr (LLM)',
      skills: ['Constitutional Law', 'International Arbitration', 'Corporate Law', 'Litigation'],
    },
    'Physics': {
      degrees: ["BSc in Pure Physics", "MSc in Quantum Information", "PhD in Theoretical Physics"],
      duration: '3-4 Yrs (UG) / 2 Yrs (PG)',
      skills: ['Quantum Mechanics', 'Electrodynamics', 'Condensed Matter', 'Astrophysics'],
    },
    'Mathematics': {
      degrees: ["BSc in Mathematical Sciences", "MSc in Applied Mathematics & Computing"],
      duration: '3-4 Yrs (UG) / 2 Yrs (PG)',
      skills: ['Abstract Algebra', 'Differential Geometry', 'Numerical Analysis', 'Topology'],
    },
    'Architecture': {
      degrees: ["Bachelor of Architecture (BArch)", "Master of Architecture (MArch)"],
      duration: '5 Yrs (BArch) / 2 Yrs (MArch)',
      skills: ['Urban Planning', '3D BIM Modeling', 'Sustainable Design', 'Structural Systems'],
    },
    'Psychology': {
      degrees: ["BSc in Cognitive Psychology", "MSc in Clinical & Behavioral Psychology"],
      duration: '3-4 Yrs',
      skills: ['Cognitive Neuroscience', 'Experimental Design', 'Psychometrics', 'Behavioral Therapy'],
    },
    'International Relations': {
      degrees: ["BA in International Studies", "Master of International Affairs (MIA)"],
      duration: '3-4 Yrs (UG) / 2 Yrs (PG)',
      skills: ['Diplomatic Negotiations', 'Geopolitics', 'International Security', 'Foreign Policy'],
    },
  };

  return courses.map((item, idx) => {
    if (typeof item === 'object' && item !== null && item.name) {
      return item;
    }

    const name = typeof item === 'string' ? item : `Program ${idx + 1}`;
    const info = defaultTemplates[name] || {
      degrees: [`BSc in ${name}`, `MSc in Advanced ${name}`],
      duration: '3-4 Years (UG) / 1-2 Years (PG)',
      skills: ['Foundational Theory', 'Applied Methodology', 'Research Thesis'],
    };

    return {
      id: `course-${idx + 1}`,
      name,
      discipline: name,
      degrees: info.degrees,
      duration: info.duration,
      skills: info.skills,
      estimatedTuitionUsd: tuitionAnnualUsd || 0,
      ieltsMin: ieltsReq || 6.5,
    };
  });
};

const buildBudgetFilter = (budget) => {
  if (!budget) return undefined;

  switch (String(budget).toLowerCase()) {
    case 'low':
      return { lt: 15000 };
    case 'mid':
      return { gte: 15000, lt: 30000 };
    case 'high':
      return { gte: 30000 };
    default:
      return undefined;
  }
};

const buildUniversityWhere = (query = {}) => {
  const where = {};
  const country = query.country?.trim();
  const search = query.search?.trim();
  const minTuition = parseNumber(query.minTuition);
  const maxTuition = parseNumber(query.maxTuition);
  const minAcceptance = parseNumber(query.minAcceptance);
  const maxAcceptance = parseNumber(query.maxAcceptance);
  const maxIelts = parseNumber(query.maxIelts);
  const maxGre = parseNumber(query.maxGre);
  const budget = buildBudgetFilter(query.budget);

  if (country && country.toLowerCase() !== 'all') {
    where.country = { equals: country, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { country: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (minTuition !== undefined || maxTuition !== undefined || budget) {
    where.tuitionAnnualUsd = {
      ...(minTuition !== undefined ? { gte: minTuition } : {}),
      ...(maxTuition !== undefined ? { lte: maxTuition } : {}),
      ...(budget ?? {}),
    };
  }

  if (minAcceptance !== undefined || maxAcceptance !== undefined) {
    where.acceptanceRate = {
      ...(minAcceptance !== undefined ? { gte: minAcceptance } : {}),
      ...(maxAcceptance !== undefined ? { lte: maxAcceptance } : {}),
    };
  }

  if (maxIelts !== undefined) {
    where.OR = [
      { ieltsRequirement: { lte: maxIelts } },
      { ieltsRequirement: null },
    ];
  }

  if (maxGre !== undefined) {
    where.OR = [
      { greRequirement: { lte: maxGre } },
      { greRequirement: null },
    ];
  }

  return where;
};

export const listUniversities = async (query = {}) => {
  try {
    const take = parseNumber(query.limit) ?? 50;
    const skip = parseNumber(query.offset) ?? 0;
    const sort = String(query.sort ?? 'ranking').toLowerCase();
    const subject = query.subject?.trim();

    let orderBy = { ranking: 'asc' };
    if (sort === 'tuition-asc' || sort === 'tuition') {
      orderBy = { tuitionAnnualUsd: 'asc' };
    } else if (sort === 'tuition-desc') {
      orderBy = { tuitionAnnualUsd: 'desc' };
    } else if (sort === 'acceptance-asc') {
      orderBy = { acceptanceRate: 'asc' };
    } else if (sort === 'acceptance-desc') {
      orderBy = { acceptanceRate: 'desc' };
    } else if (sort === 'name-asc') {
      orderBy = { name: 'asc' };
    }

    const where = buildUniversityWhere(query);
    const universities = await prisma.university.findMany({
      where,
      orderBy,
      take,
      skip,
    });

    // Enriched processing & subject filtering in memory if required
    let processed = universities.map((u) => {
      const livingCost = getEstimatedLivingCost(u.country);
      const enrichedCourseList = enrichCourses(u.courses, u.tuitionAnnualUsd, u.ieltsRequirement);
      return {
        ...u,
        livingCostAnnualUsd: livingCost,
        totalEstimatedAnnualUsd: (u.tuitionAnnualUsd || 0) + livingCost,
        detailedCourses: enrichedCourseList,
      };
    });

    if (subject && subject.toLowerCase() !== 'all') {
      const target = subject.toLowerCase();
      processed = processed.filter((u) => {
        const rawCourses = Array.isArray(u.courses) ? u.courses : [];
        return rawCourses.some((c) => {
          const str = typeof c === 'string' ? c : c?.name || '';
          return str.toLowerCase().includes(target);
        });
      });
    }

    const total = await prisma.university.count({ where });

    return {
      status: 200,
      body: {
        success: true,
        data: processed,
        meta: { total: subject && subject.toLowerCase() !== 'all' ? processed.length : total, take, skip },
      },
    };
  } catch (error) {
    console.error('List universities error:', error);
    return { status: 500, body: { success: false, message: 'Unable to load universities right now.' } };
  }
};

export const getUniversityById = async (id) => {
  try {
    if (!id) {
      return { status: 400, body: { success: false, message: 'University ID is required.' } };
    }

    const university = await prisma.university.findUnique({
      where: { id },
    });

    if (!university) {
      return { status: 404, body: { success: false, message: 'University not found.' } };
    }

    // Serve the database row first; stale data is refreshed by the cron worker.
    queueOnDemandRefresh('university', university).catch((error) =>
      console.warn('[On-demand sync] University queue failed:', error?.message),
    );

    // Show only destination-appropriate and genuinely applicable scholarships.
    const candidateScholarships = await prisma.scholarship.findMany({
      where: {
        OR: [
          { country: { equals: university.country, mode: 'insensitive' } },
          { country: { equals: 'Global', mode: 'insensitive' } },
          { country: { equals: 'Europe', mode: 'insensitive' } },
          { country: { equals: 'Asia', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ deadline: 'asc' }, { name: 'asc' }],
    });
    const matchingScholarships = candidateScholarships
      .filter((scholarship) => isScholarshipApplicableToUniversity(scholarship, university))
      .slice(0, 6);

    const livingCost = getEstimatedLivingCost(university.country);
    const detailedCourses = enrichCourses(university.courses, university.tuitionAnnualUsd, university.ieltsRequirement);

    // Calculate budget tier
    const tuition = university.tuitionAnnualUsd || 0;
    const budgetCategory = tuition === 0 ? 'Tuition-Free' : tuition < 15000 ? 'Low Tuition' : tuition < 35000 ? 'Moderate' : 'Premium';

    // Admission eligibility checklist
    const eligibilityChecklist = [
      {
        criterion: 'English Proficiency (IELTS)',
        requirement: university.ieltsRequirement ? `Minimum ${university.ieltsRequirement} Band overall` : 'Optional / Program dependent',
        metDefault: true,
      },
      {
        criterion: 'Graduate Record Exam (GRE)',
        requirement: university.greRequirement ? `Competitive score: ${university.greRequirement}+` : 'Not required / Optional for most tracks',
        metDefault: true,
      },
      {
        criterion: 'Estimated Acceptance Competition',
        requirement: university.acceptanceRate ? `${university.acceptanceRate}% acceptance rate` : 'Holistic review',
        metDefault: true,
      },
      {
        criterion: 'Application Deadlines',
        requirement: university.applicationDeadline ? `Main intake priority: ${university.applicationDeadline}` : 'Rolling admissions',
        metDefault: true,
      },
      {
        criterion: 'Application Processing Fee',
        requirement: university.applicationFee ? `$${university.applicationFee} USD non-refundable fee` : 'Fee waiver available',
        metDefault: true,
      },
    ];

    const result = {
      ...university,
      budgetCategory,
      livingCostAnnualUsd: livingCost,
      totalEstimatedAnnualUsd: tuition + livingCost,
      detailedCourses,
      eligibilityChecklist,
      scholarships: matchingScholarships,
      syncStatus: {
        isLiveSynced: Boolean(university.lastSyncedAt),
        lastScraped: university.lastScraped || university.updatedAt,
        lastSyncedAt: university.lastSyncedAt,
        nextSyncAt: university.nextSyncAt,
        state: university.syncStatus,
        officialSourceVerified: Boolean(university.websiteUrl),
      },
    };

    return {
      status: 200,
      body: { success: true, data: result },
    };
  } catch (error) {
    console.error('Get university error:', error);
    return { status: 500, body: { success: false, message: 'Unable to retrieve university details.' } };
  }
};

export const getAvailableSubjects = async () => {
  try {
    const universities = await prisma.university.findMany({
      select: { courses: true },
    });

    const subjectSet = new Set();
    universities.forEach((u) => {
      if (Array.isArray(u.courses)) {
        u.courses.forEach((c) => {
          const name = typeof c === 'string' ? c : c?.name;
          if (name) subjectSet.add(name.trim());
        });
      }
    });

    const subjects = ['All', ...Array.from(subjectSet).sort()];

    return {
      status: 200,
      body: { success: true, data: subjects },
    };
  } catch (error) {
    console.error('Get available subjects error:', error);
    return { status: 500, body: { success: false, message: 'Unable to load subjects.' } };
  }
};

export const syncUniversity = async (id, adminId = null) => {
  try {
    const university = await prisma.university.findUnique({ where: { id } });
    if (!university) {
      return { status: 404, body: { success: false, message: 'University not found to sync.' } };
    }

    const outcome = await runManualSync({
      type: SYNC_JOB_TYPES.UNIVERSITY,
      adminId,
      targetType: 'university',
      targetId: id,
    });
    const updated = await prisma.university.findUnique({ where: { id } });

    // Notify followers about synchronization / update
    try {
      const followers = await prisma.followedUniversity.findMany({
        where: { universityId: id },
        select: { userId: true },
      });

      if (followers.length > 0) {
        await prisma.notification.createMany({
          data: followers.map((f) => ({
            userId: f.userId,
            universityId: id,
            title: `Admissions Sync — ${university.name}`,
            message: `${university.name} has refreshed its live faculty and admission data from official sources.`,
            type: 'GENERAL_UNIVERSITY_UPDATE',
            isRead: false,
            metadata: {
              universityName: university.name,
              country: university.country,
              actionUrl: `/universities?search=${encodeURIComponent(university.name)}`,
            },
          })),
        });
      }
    } catch (notifErr) {
      console.error('Failed to notify followers on sync:', notifErr);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: `Successfully ran the synchronized refresh for ${university.name}.`,
        data: {
          id: updated.id,
          name: updated.name,
          lastScraped: updated.lastScraped,
          job: outcome.job,
          sources: ['openalex', 'gemini-search'],
          warnings: outcome.result?.error ? [outcome.result.error] : [],
          status: 'Synced with OpenAlex and a grounded Gemini web search',
        },
      },
    };
  } catch (error) {
    console.error('Sync university error:', error);
    return syncFailure(error, 'Failed to synchronize university data.');
  }
};

export const syncAllUniversities = async (adminId = null) => {
  try {
    const outcome = await runManualSync({ type: SYNC_JOB_TYPES.UNIVERSITY_CATALOG, adminId });

    return {
      status: 200,
      body: {
        success: true,
        message: `University discovery job ${outcome.job.status.toLowerCase()}: ${outcome.job.created} new, ${outcome.job.updated} enriched.`,
        data: { job: outcome.job, result: outcome.result },
        syncedAt: new Date(),
      },
    };
  } catch (error) {
    console.error('Sync all universities error:', error);
    return syncFailure(error, 'Failed to sync universities.');
  }
};

/**
 * Follow a university for the authenticated user.
 */
export const followUniversity = async (userId, universityId) => {
  if (!userId) {
    return { status: 401, body: { success: false, message: 'Unauthorized. Please log in to follow universities.' } };
  }
  if (!universityId) {
    return { status: 400, body: { success: false, message: 'University ID is required.' } };
  }

  try {
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      return { status: 404, body: { success: false, message: 'University not found.' } };
    }

    const existingFollow = await prisma.followedUniversity.findUnique({
      where: {
        userId_universityId: {
          userId,
          universityId,
        },
      },
    });

    if (existingFollow) {
      return {
        status: 200,
        body: {
          success: true,
          message: `You are already following ${university.name}.`,
          isFollowing: true,
          university: { id: university.id, name: university.name },
        },
      };
    }

    await prisma.followedUniversity.create({
      data: {
        userId,
        universityId,
      },
    });

    return {
      status: 200,
      body: {
        success: true,
        message: `You are now following ${university.name}. You will receive admission updates.`,
        isFollowing: true,
        university: { id: university.id, name: university.name },
      },
    };
  } catch (error) {
    console.error('followUniversity error:', error);
    return { status: 500, body: { success: false, message: 'Failed to follow university.' } };
  }
};

/**
 * Unfollow a university for the authenticated user.
 */
export const unfollowUniversity = async (userId, universityId) => {
  if (!userId) {
    return { status: 401, body: { success: false, message: 'Unauthorized.' } };
  }
  if (!universityId) {
    return { status: 400, body: { success: false, message: 'University ID is required.' } };
  }

  try {
    const existingFollow = await prisma.followedUniversity.findUnique({
      where: {
        userId_universityId: {
          userId,
          universityId,
        },
      },
    });

    if (!existingFollow) {
      return {
        status: 200,
        body: {
          success: true,
          message: 'University is not currently followed.',
          isFollowing: false,
        },
      };
    }

    await prisma.followedUniversity.delete({
      where: { id: existingFollow.id },
    });

    return {
      status: 200,
      body: {
        success: true,
        message: 'Successfully unfollowed university.',
        isFollowing: false,
      },
    };
  } catch (error) {
    console.error('unfollowUniversity error:', error);
    return { status: 500, body: { success: false, message: 'Failed to unfollow university.' } };
  }
};

/**
 * Check if the user follows a specific university.
 */
export const checkFollowStatus = async (userId, universityId) => {
  if (!userId) {
    return { status: 200, body: { success: true, isFollowing: false } };
  }
  if (!universityId) {
    return { status: 400, body: { success: false, message: 'University ID is required.' } };
  }

  try {
    const follow = await prisma.followedUniversity.findUnique({
      where: {
        userId_universityId: {
          userId,
          universityId,
        },
      },
    });

    return {
      status: 200,
      body: {
        success: true,
        isFollowing: Boolean(follow),
      },
    };
  } catch (error) {
    console.error('checkFollowStatus error:', error);
    return { status: 500, body: { success: false, message: 'Failed to check follow status.' } };
  }
};

/**
 * Get all universities followed by the authenticated user.
 */
export const getFollowedUniversities = async (userId) => {
  if (!userId) {
    return { status: 401, body: { success: false, message: 'Unauthorized.' } };
  }

  try {
    const follows = await prisma.followedUniversity.findMany({
      where: { userId },
      include: {
        university: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const universities = follows.map((f) => ({
      ...f.university,
      followedAt: f.createdAt,
    }));

    return {
      status: 200,
      body: {
        success: true,
        count: universities.length,
        data: universities,
      },
    };
  } catch (error) {
    console.error('getFollowedUniversities error:', error);
    return { status: 500, body: { success: false, message: 'Failed to load followed universities.' } };
  }
};

/**
 * Get list of followed university IDs for quick client lookup.
 */
export const getFollowedUniversityIds = async (userId) => {
  if (!userId) {
    return { status: 200, body: { success: true, followedIds: [] } };
  }

  try {
    const follows = await prisma.followedUniversity.findMany({
      where: { userId },
      select: { universityId: true },
    });

    return {
      status: 200,
      body: {
        success: true,
        followedIds: follows.map((f) => f.universityId),
      },
    };
  } catch (error) {
    console.error('getFollowedUniversityIds error:', error);
    return { status: 500, body: { success: false, message: 'Failed to load followed university IDs.' } };
  }
};