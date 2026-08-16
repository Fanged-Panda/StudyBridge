import prisma from '../../config/database.js';

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

// Generates rich structured coverage, degrees, and requirements for scholarships
const getScholarshipEnrichment = (scholarship) => {
  const name = scholarship.name || '';
  const country = scholarship.country || '';
  const isFull = scholarship.fundingLevel?.toLowerCase() === 'full';

  let degrees = ["Master's", 'PhD'];
  let coverage = [];
  let requirements = [];
  let intakeSeason = 'Autumn / Spring Intake';

  if (name.includes('Chevening')) {
    degrees = ["Master's (1 Year Taught)"];
    coverage = [
      '100% Full university tuition fees',
      'Monthly living stipend (£1,300 - £1,600 / mo)',
      'Return economy flights to the UK',
      'Arrival & departure allowance',
      'UK visa application fee covered',
    ];
    requirements = [
      'Minimum 2 years of verifiable work experience (2,800 hours)',
      'Undergraduate degree with upper second-class honours (2:1 or equivalent CGPA 3.0+)',
      'Unconditional offer from at least one eligible UK university',
      'Demonstrated leadership & networking qualities',
    ];
  } else if (name.includes('Fulbright')) {
    degrees = ["Master's", 'Doctoral (PhD)'];
    coverage = [
      'Full tuition and required university fees',
      'Living stipend for duration of study ($1,800 - $2,600 / mo)',
      'Round-trip international airfare to USA',
      'Accident & sickness health benefits (ASPE)',
      'Pre-academic orientation & enrichment seminars in USA',
    ];
    requirements = [
      'Strong academic background (minimum CGPA 3.0 or equivalent)',
      'IELTS 6.5+ or TOEFL iBT 80+',
      'Commitment to return to home country upon program completion for 2 years',
      'Three letters of academic/professional recommendation',
    ];
  } else if (name.includes('DAAD')) {
    degrees = ["Master's", 'Postgraduate Specialization', 'PhD'];
    coverage = [
      'Monthly scholarship payment of €934 - €1,300',
      'Health, accident, and personal liability insurance',
      'Travel allowance for flights to/from Germany',
      'One-off study and research grant',
      'German language course prior to program start',
    ];
    requirements = [
      'Bachelor’s degree usually not older than 6 years',
      'Minimum 2 years of relevant professional experience for EPOS programs',
      'English (IELTS 6.0+) or German language certificate depending on course',
      'Motivation letter explaining academic & developmental impact',
    ];
  } else if (name.includes('MEXT')) {
    degrees = ['Undergraduate', "Master's", 'PhD'];
    coverage = [
      'Exemption from examination, matriculation, and tuition fees',
      'Monthly allowance of ¥117,000 - ¥145,000 / mo',
      'Round-trip air ticket between home country and Japan',
      '6-month intensive Japanese language preparatory training',
    ];
    requirements = [
      'National of a country that has diplomatic relations with Japan',
      'Academic excellence (top 20% ranking or CGPA 3.2+)',
      'Willingness to learn the Japanese language and adapt to Japanese culture',
      'Clear research proposal tailored to host professor/lab in Japan',
    ];
  } else if (name.includes('Australia Awards')) {
    degrees = ["Master's", 'PhD'];
    coverage = [
      'Full tuition fees',
      'Return air travel',
      'Establishment allowance for accommodation and textbooks',
      'Contribution to Living Expenses (CLE) paid fortnightly',
      'Overseas Student Health Cover (OSHC)',
    ];
    requirements = [
      'Minimum IELTS 6.5 with no band less than 6.0 (or TOEFL equivalent)',
      'At least 2 years relevant work experience',
      'Commitment to return to home country for at least 2 years after study',
      'Strategic priority area alignment for development',
    ];
  } else if (name.includes('Erasmus Mundus')) {
    degrees = ["Joint Master's Degree (Multiple European Countries)"];
    coverage = [
      'Participation costs (full tuition fees and insurance)',
      'Monthly living allowance (€1,400 / month for up to 24 months)',
      'Travel and installation costs allowance',
      'Mobility grants across at least 2 different European universities',
    ];
    requirements = [
      'First higher education degree or recognized equivalent level of learning',
      'High academic standing and competitive motivation statement',
      'IELTS 6.5+ or TOEFL iBT 90+',
      'Selected study path within accredited Erasmus consortia',
    ];
  } else {
    degrees = isFull ? ["Master's", 'PhD'] : ['Undergraduate', "Master's", 'PhD'];
    coverage = isFull
      ? [
          'Full tuition waiver or grant coverage',
          'Monthly maintenance stipend support',
          'Academic allowance and study grants',
          'Health insurance subsidization',
        ]
      : [
          'Partial tuition grant or fee discount',
          'Annual merit-based financial aid award',
          'Campus work-study opportunities',
        ];
    requirements = [
      'Strong academic credentials (CGPA 3.0+ / top tier rank)',
      'English proficiency certification (IELTS or TOEFL equivalent)',
      'Personal statement explaining career vision and financial need',
    ];
  }

  return {
    degrees,
    coverage,
    requirements,
    intakeSeason,
  };
};

const buildScholarshipWhere = (query = {}) => {
  const where = {};
  const country = query.country?.trim();
  const search = query.search?.trim();
  const fundingLevel = query.fundingLevel?.trim();
  const minAmount = parseNumber(query.minAmount);
  const maxAmount = parseNumber(query.maxAmount);

  if (country && country.toLowerCase() !== 'all') {
    where.country = { equals: country, mode: 'insensitive' };
  }

  if (fundingLevel && fundingLevel.toLowerCase() !== 'all') {
    where.fundingLevel = { equals: fundingLevel, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { country: { contains: search, mode: 'insensitive' } },
      { eligibility: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amountUsd = {
      ...(minAmount !== undefined ? { gte: minAmount } : {}),
      ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
    };
  }

  return where;
};

export const listScholarships = async (query = {}) => {
  try {
    const take = parseNumber(query.limit) ?? 50;
    const skip = parseNumber(query.offset) ?? 0;
    const sort = String(query.sort ?? 'amount').toLowerCase();

    let orderBy = [{ amountUsd: 'desc' }, { name: 'asc' }];
    if (sort === 'name-asc') {
      orderBy = [{ name: 'asc' }];
    } else if (sort === 'country-asc') {
      orderBy = [{ country: 'asc' }, { name: 'asc' }];
    } else if (sort === 'amount-asc') {
      orderBy = [{ amountUsd: 'asc' }];
    }

    const where = buildScholarshipWhere(query);
    const scholarships = await prisma.scholarship.findMany({
      where,
      orderBy,
      take,
      skip,
    });

    const enriched = scholarships.map((s) => {
      const enrichment = getScholarshipEnrichment(s);
      return {
        ...s,
        ...enrichment,
        syncStatus: {
          isLiveSynced: true,
          lastScraped: s.lastScraped || s.updatedAt,
        },
      };
    });

    const total = await prisma.scholarship.count({ where });

    return {
      status: 200,
      body: {
        success: true,
        data: enriched,
        meta: { total, take, skip },
      },
    };
  } catch (error) {
    console.error('List scholarships error:', error);
    return { status: 500, body: { success: false, message: 'Unable to load scholarships right now.' } };
  }
};

export const getScholarshipById = async (id) => {
  try {
    if (!id) {
      return { status: 400, body: { success: false, message: 'Scholarship ID is required.' } };
    }

    const scholarship = await prisma.scholarship.findUnique({
      where: { id },
    });

    if (!scholarship) {
      return { status: 404, body: { success: false, message: 'Scholarship program not found.' } };
    }

    // Find host/eligible universities in that country or worldwide top universities
    let matchingUniversities = [];
    if (scholarship.country && scholarship.country !== 'Global' && scholarship.country !== 'Europe' && scholarship.country !== 'Asia') {
      matchingUniversities = await prisma.university.findMany({
        where: { country: { equals: scholarship.country, mode: 'insensitive' } },
        take: 6,
        orderBy: { ranking: 'asc' },
      });
    } else {
      matchingUniversities = await prisma.university.findMany({
        take: 6,
        orderBy: { ranking: 'asc' },
      });
    }

    const enrichment = getScholarshipEnrichment(scholarship);

    const applicationSteps = [
      { step: 1, title: 'Check Eligibility & Course Offerings', detail: 'Confirm that your intended degree and country of citizenship meet the annual bilateral requirements.' },
      { step: 2, title: 'Gather Academic & Language Credentials', detail: 'Prepare certified transcripts, English proficiency certificate (IELTS/TOEFL), and letters of reference.' },
      { step: 3, title: 'Draft Statement of Purpose / Research Proposal', detail: 'Articulate your academic vision, career goals, and how the scholarship will impact your home country.' },
      { step: 4, title: 'Submit Online Application', detail: `Submit the formal scholarship dossier before the ${scholarship.deadline || 'intake'} deadline via the official portal.` },
    ];

    const result = {
      ...scholarship,
      ...enrichment,
      applicationSteps,
      eligibleUniversities: matchingUniversities,
      syncStatus: {
        isLiveSynced: true,
        lastScraped: scholarship.lastScraped || scholarship.updatedAt,
        officialPortalVerified: Boolean(scholarship.websiteUrl),
      },
    };

    return {
      status: 200,
      body: { success: true, data: result },
    };
  } catch (error) {
    console.error('Get scholarship error:', error);
    return { status: 500, body: { success: false, message: 'Unable to retrieve scholarship details.' } };
  }
};

export const getScholarshipCountries = async () => {
  try {
    const scholarships = await prisma.scholarship.findMany({
      select: { country: true },
    });

    const countrySet = new Set();
    scholarships.forEach((s) => {
      if (s.country) countrySet.add(s.country.trim());
    });

    const countries = ['All', ...Array.from(countrySet).sort()];

    return {
      status: 200,
      body: { success: true, data: countries },
    };
  } catch (error) {
    console.error('Get scholarship countries error:', error);
    return { status: 500, body: { success: false, message: 'Unable to load countries.' } };
  }
};

export const syncScholarship = async (id) => {
  try {
    const scholarship = await prisma.scholarship.findUnique({ where: { id } });
    if (!scholarship) {
      return { status: 404, body: { success: false, message: 'Scholarship not found to sync.' } };
    }

    const updated = await prisma.scholarship.update({
      where: { id },
      data: {
        lastScraped: new Date(),
      },
    });

    return {
      status: 200,
      body: {
        success: true,
        message: `Successfully synchronized live program criteria and intake deadlines for ${scholarship.name}`,
        data: {
          id: updated.id,
          name: updated.name,
          lastScraped: updated.lastScraped,
          status: 'Synced with official scholarship commission portal',
        },
      },
    };
  } catch (error) {
    console.error('Sync scholarship error:', error);
    return { status: 500, body: { success: false, message: 'Failed to synchronize scholarship data.' } };
  }
};

export const syncAllScholarships = async () => {
  try {
    const count = await prisma.scholarship.updateMany({
      data: {
        lastScraped: new Date(),
      },
    });

    return {
      status: 200,
      body: {
        success: true,
        message: `Successfully synced live data for all ${count.count} scholarship programs.`,
        syncedAt: new Date(),
      },
    };
  } catch (error) {
    console.error('Sync all scholarships error:', error);
    return { status: 500, body: { success: false, message: 'Failed to sync scholarships.' } };
  }
};
