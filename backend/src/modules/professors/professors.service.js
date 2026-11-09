import prisma from '../../config/database.js';

const DEFAULT_PAGE_SIZE = 12;

function toPublicProfessor(row) {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    department: row.department || null,
    field: row.field,
    bio: row.bio || null,
    email: row.email || null,
    profileUrl: row.profileUrl || null,
    photoUrl: row.photoUrl || null,
    university: row.university ? { id: row.university.id, name: row.university.name, country: row.university.country } : null,
  };
}

export async function listProfessors({ search, university, universityId, field, page, limit } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_PAGE_SIZE, 1), 60);
  const safePage = Math.max(Number(page) || 1, 1);
  const term = String(search ?? '').trim().slice(0, 80);
  const fieldTerm = String(field ?? '').trim().slice(0, 80);

  const where = {};
  if (universityId) where.universityId = String(universityId);
  else if (university) {
    where.university = { name: { equals: String(university), mode: 'insensitive' } };
  }
  if (fieldTerm) where.field = { contains: fieldTerm, mode: 'insensitive' };
  if (term) {
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { field: { contains: term, mode: 'insensitive' } },
      { department: { contains: term, mode: 'insensitive' } },
      { university: { name: { contains: term, mode: 'insensitive' } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.professor.findMany({
      where,
      orderBy: [{ university: { ranking: 'asc' } }, { name: 'asc' }],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: { university: { select: { id: true, name: true, country: true } } },
    }),
    prisma.professor.count({ where }),
  ]);

  return {
    items: rows.map(toPublicProfessor),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

/** Distinct research fields with counts, used to build the filter chips. */
export async function listFields() {
  const rows = await prisma.professor.findMany({ select: { field: true } });
  const counts = new Map();

  for (const row of rows) {
    for (const piece of String(row.field || '').split(',')) {
      const name = piece.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function listProfessorsForUniversity(universityId, { limit = 24 } = {}) {
  const rows = await prisma.professor.findMany({
    where: { universityId: String(universityId) },
    orderBy: { name: 'asc' },
    take: Math.min(Math.max(Number(limit) || 24, 1), 60),
    include: { university: { select: { id: true, name: true, country: true } } },
  });

  return { items: rows.map(toPublicProfessor), total: rows.length };
}
