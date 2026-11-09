import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../config/database.js';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage',
);

export const signToken = (student) =>
  jwt.sign(
    { id: student.id, email: student.email, name: student.name, role: student.role || 'student' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// Strip sensitive fields before returning user data to the client
export const publicUser = (student) => {
  const { password, googleId, ...rest } = student;
  return rest;
};

// Coerce optional numeric fields so empty strings/undefined become null
// and numeric strings become numbers (Prisma Int/Decimal columns reject "")
const toNumberOrNull = (value) => {
  if (value === undefined || value === null) return null;
  if (String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

export const register = async (payload = {}) => {
  const {
    name,
    email,
    password,
    phone,
    country,
    institution,
    subject,
    cgpa,
    satScore,
    ieltsScore,
    preferredSubject,
    profileImage,
  } = payload;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    !password ||
    typeof country !== 'string' ||
    !country.trim()
  ) {
    return { status: 400, body: { message: 'Name, email, password and country are required.' } };
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { status: 400, body: { message: 'Password must be at least 6 characters long.' } };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 400, body: { message: 'Please provide a valid email address.' } };
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.student.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return { status: 409, body: { message: 'An account with this email already exists.' } };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone?.trim() || null,
        country: country.trim(),
        institution: institution?.trim() || null,
        subject: subject?.trim() || null,
        cgpa: toNumberOrNull(cgpa),
        satScore: toNumberOrNull(satScore),
        ieltsScore: toNumberOrNull(ieltsScore),
        greScore: toNumberOrNull(payload.greScore),
        toeflScore: toNumberOrNull(payload.toeflScore),
        duolingoScore: toNumberOrNull(payload.duolingoScore),
        targetDegree: payload.targetDegree?.trim() || null,
        targetIntake: payload.targetIntake?.trim() || null,
        targetCountry: payload.targetCountry?.trim() || null,
        fundingPreference: payload.fundingPreference?.trim() || null,
        graduationYear: toNumberOrNull(payload.graduationYear),
        researchInterests: payload.researchInterests?.trim() || null,
        publicationsCount: toNumberOrNull(payload.publicationsCount),
        workExperienceYears: toNumberOrNull(payload.workExperienceYears),
        linkedinUrl: payload.linkedinUrl?.trim() || null,
        githubUrl: payload.githubUrl?.trim() || null,
        researchGateUrl: payload.researchGateUrl?.trim() || null,
        statementOfPurpose: payload.statementOfPurpose?.trim() || null,
        preferredSubject: preferredSubject?.trim() || null,
        profileImage: profileImage?.trim() || null,
      },
    });

    const token = signToken(student);

    return {
      status: 201,
      body: { success: true, message: 'Account created successfully.', token, user: publicUser(student) },
    };
  } catch (err) {
    console.error('Register error:', err);
    return { status: 500, body: { message: 'Something went wrong while creating your account.' } };
  }
};

export const me = async (userId) => {
  if (!userId) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    const student = await prisma.student.findUnique({ where: { id: userId } });
    if (!student) {
      return { status: 404, body: { message: 'User not found.' } };
    }

    if (student.email === 'admin@studybridge.com' && student.role !== 'admin') {
      student.role = 'admin';
      await prisma.student.update({ where: { id: student.id }, data: { role: 'admin' } });
    }

    return { status: 200, body: { success: true, user: publicUser(student) } };
  } catch (err) {
    console.error('Me error:', err);
    return { status: 500, body: { message: 'Something went wrong while loading your profile.' } };
  }
};

export const googleLogin = async (payload = {}) => {
  const { credential, code } = payload;

  try {
    let googleUserId, email, name, picture;

    if (credential) {
      // ID token flow
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const idPayload = ticket.getPayload();
      googleUserId = idPayload.sub;
      email = idPayload.email;
      name = idPayload.name;
      picture = idPayload.picture;
    } else if (code) {
      // Auth code flow — exchange code for tokens
      const { tokens } = await googleClient.getToken(code);
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const idPayload = ticket.getPayload();
      googleUserId = idPayload.sub;
      email = idPayload.email;
      name = idPayload.name;
      picture = idPayload.picture;
    } else {
      return { status: 400, body: { message: 'Google credential or code is required.' } };
    }

    if (!email) {
      return { status: 400, body: { message: 'Google account has no email.' } };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if a student with this googleId already exists
    let student = await prisma.student.findUnique({ where: { googleId: googleUserId } });

    if (!student) {
      // Check if a student with this email already exists (registered via email/password)
      student = await prisma.student.findUnique({ where: { email: normalizedEmail } });

      if (student) {
        // Link the Google account to the existing student
        student = await prisma.student.update({
          where: { id: student.id },
          data: {
            googleId: googleUserId,
            profileImage: student.profileImage || picture || null,
          },
        });
      } else {
        // Create a new student from the Google profile
        student = await prisma.student.create({
          data: {
            name: name || 'Google User',
            email: normalizedEmail,
            googleId: googleUserId,
            password: null,
            country: 'Not specified',
            profileImage: picture || null,
          },
        });
      }
    }

    const token = signToken(student);
    const isNewUser = !student.country || student.country === 'Not specified';

    return {
      status: 200,
      body: { success: true, token, user: publicUser(student), isNewUser },
    };
  } catch (err) {
    console.error('Google login error:', err?.message || err);

    if (err?.message?.includes('Token used too late') || err?.message?.includes('invalid_token')) {
      return { status: 401, body: { message: 'Google credential is invalid or expired.' } };
    }
    if (err?.message?.includes('Wrong number of segments')) {
      return { status: 401, body: { message: 'Invalid Google credential format.' } };
    }

    return { status: 500, body: { message: 'Google authentication failed. Please try again.' } };
  }
};

export const completeProfile = async (userId, payload = {}) => {
  if (!userId) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  const {
    name,
    country,
    phone,
    institution,
    subject,
    preferredSubject,
    targetDegree,
    targetIntake,
    targetCountry,
    fundingPreference,
    cgpa,
    satScore,
    ieltsScore,
    greScore,
    toeflScore,
    duolingoScore,
    graduationYear,
    researchInterests,
    publicationsCount,
    workExperienceYears,
    linkedinUrl,
    githubUrl,
    researchGateUrl,
    statementOfPurpose,
    profileImage,
  } = payload;

  try {
    const existing = await prisma.student.findUnique({ where: { id: userId } });
    if (!existing) {
      return { status: 404, body: { message: 'User not found.' } };
    }

    const resolvedName = name?.trim() || existing.name;
    const resolvedCountry = country?.trim() || existing.country;

    if (!resolvedName || !resolvedCountry) {
      return { status: 400, body: { message: 'Name and country are required.' } };
    }

    const updateData = {
      name: resolvedName,
      country: resolvedCountry,
    };

    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (institution !== undefined) updateData.institution = institution?.trim() || null;
    if (subject !== undefined) updateData.subject = subject?.trim() || null;
    if (preferredSubject !== undefined) updateData.preferredSubject = preferredSubject?.trim() || null;
    if (targetDegree !== undefined) updateData.targetDegree = targetDegree?.trim() || null;
    if (targetIntake !== undefined) updateData.targetIntake = targetIntake?.trim() || null;
    if (targetCountry !== undefined) updateData.targetCountry = targetCountry?.trim() || null;
    if (fundingPreference !== undefined) updateData.fundingPreference = fundingPreference?.trim() || null;
    if (cgpa !== undefined) updateData.cgpa = toNumberOrNull(cgpa);
    if (satScore !== undefined) updateData.satScore = toNumberOrNull(satScore);
    if (ieltsScore !== undefined) updateData.ieltsScore = toNumberOrNull(ieltsScore);
    if (greScore !== undefined) updateData.greScore = toNumberOrNull(greScore);
    if (toeflScore !== undefined) updateData.toeflScore = toNumberOrNull(toeflScore);
    if (duolingoScore !== undefined) updateData.duolingoScore = toNumberOrNull(duolingoScore);
    if (graduationYear !== undefined) updateData.graduationYear = toNumberOrNull(graduationYear);
    if (researchInterests !== undefined) updateData.researchInterests = researchInterests?.trim() || null;
    if (publicationsCount !== undefined) updateData.publicationsCount = toNumberOrNull(publicationsCount);
    if (workExperienceYears !== undefined) updateData.workExperienceYears = toNumberOrNull(workExperienceYears);
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl?.trim() || null;
    if (githubUrl !== undefined) updateData.githubUrl = githubUrl?.trim() || null;
    if (researchGateUrl !== undefined) updateData.researchGateUrl = researchGateUrl?.trim() || null;
    if (statementOfPurpose !== undefined) updateData.statementOfPurpose = statementOfPurpose?.trim() || null;
    if (profileImage !== undefined) updateData.profileImage = profileImage?.trim() || null;

    const student = await prisma.student.update({
      where: { id: userId },
      data: updateData,
    });

    const token = signToken(student);

    return {
      status: 200,
      body: { success: true, message: 'Profile updated successfully.', token, user: publicUser(student) },
    };
  } catch (err) {
    console.error('Complete profile error:', err);
    return { status: 500, body: { message: 'Something went wrong while updating your profile.' } };
  }
};

export const getStudentCount = async () => {
  try {
    const count = await prisma.student.count();
    return { status: 200, body: { success: true, count } };
  } catch (err) {
    console.error('Student count error:', err);
    return { status: 500, body: { message: 'Could not fetch student count.' } };
  }
};

export const login = async (payload = {}) => {
  const { email, password } = payload;

  if (!email || !password) {
    return { status: 400, body: { message: 'Email and password are required.' } };
  }

  try {
    const student = await prisma.student.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!student) {
      return { status: 401, body: { message: 'Invalid email or password.' } };
    }

    const validPassword = await bcrypt.compare(password, student.password);
    if (!validPassword) {
      return { status: 401, body: { message: 'Invalid email or password.' } };
    }

    if (student.email === 'admin@studybridge.com' && student.role !== 'admin') {
      student.role = 'admin';
      await prisma.student.update({ where: { id: student.id }, data: { role: 'admin' } });
    }

    const token = signToken(student);

    return {
      status: 200,
      body: { success: true, token, user: publicUser(student) },
    };
  } catch (err) {
    console.error('Login error:', err);
    return { status: 500, body: { message: 'Something went wrong while signing you in.' } };
  }
};

/**
 * Initialize or promote the default administrator user in the database.
 */
export const ensureAdminUser = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@studybridge.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    const existing = await prisma.student.findUnique({
      where: { email: adminEmail },
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (!existing) {
      const created = await prisma.student.create({
        data: {
          name: 'StudyBridge Administrator',
          email: adminEmail,
          password: hashedPassword,
          country: 'Global',
          role: 'admin',
        },
      });
      console.log(`[Admin] Initialized default admin account: ${created.email}`);
      return created;
    }

    const matchesCurrent = await bcrypt.compare(adminPassword, existing.password);
    if (!matchesCurrent || existing.role !== 'admin') {
      const updated = await prisma.student.update({
        where: { email: adminEmail },
        data: {
          role: 'admin',
          password: hashedPassword,
        },
      });
      console.log(`[Admin] Synced admin account credentials and role for ${updated.email}`);
      return updated;
    }

    return existing;
  } catch (error) {
    console.warn('[Admin] Could not initialize admin account:', error?.message);
    return null;
  }
};
