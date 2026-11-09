/**
 * Seeds the faculty directory from src/modules/professors/professorData.js.
 * Safe to re-run: professors are matched on (name, universityId) and updated.
 *
 *   cd backend && node scripts/seed-professors.mjs
 */
import prisma from '../src/config/database.js';
import { PROFESSORS } from '../src/modules/professors/professorData.js';

const universities = await prisma.university.findMany({ select: { id: true, name: true } });
const byName = new Map(universities.map((uni) => [uni.name.toLowerCase(), uni]));

let created = 0;
let updated = 0;
const skipped = [];

for (const entry of PROFESSORS) {
  const university = byName.get(entry.university.toLowerCase());
  if (!university) {
    skipped.push(entry.university);
    continue;
  }

  const existing = await prisma.professor.findFirst({
    where: { name: entry.name, universityId: university.id },
    select: { id: true },
  });

  const data = {
    name: entry.name,
    title: entry.title,
    department: entry.department,
    field: entry.field,
    bio: entry.bio,
    email: entry.email || null,
    profileUrl: entry.profileUrl || null,
    photoUrl: entry.photoUrl || null,
    universityId: university.id,
  };

  if (existing) {
    await prisma.professor.update({ where: { id: existing.id }, data });
    updated += 1;
  } else {
    await prisma.professor.create({ data });
    created += 1;
  }
}

console.log(`Professors seeded: ${created} created, ${updated} updated, total ${await prisma.professor.count()}.`);
if (skipped.length) console.log(`Skipped (university not found): ${[...new Set(skipped)].join(', ')}`);

await prisma.$disconnect();
