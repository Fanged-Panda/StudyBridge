import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../../config/database.js';

// Lazy-initialized singleton
let genAIClient;

const getApiKey = () => {
  const raw = process.env.GEMINI_API_KEY || '';
  return raw.replace(/^['"]|['"]$/g, '').trim();
};

const getClient = () => {
  if (!genAIClient) {
    const key = getApiKey();
    genAIClient = new GoogleGenerativeAI(key);
  }
  return genAIClient;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildStudentContext = (student) => {
  const lines = [
    `Name: ${student.name}`,
    `Email: ${student.email}`,
    `Country: ${student.country}`,
  ];

  if (student.institution) lines.push(`Current Institution: ${student.institution}`);
  if (student.subject) lines.push(`Current Subject: ${student.subject}`);
  if (student.preferredSubject) lines.push(`Preferred Subject for Study Abroad: ${student.preferredSubject}`);
  if (student.cgpa != null) lines.push(`CGPA: ${student.cgpa}`);
  if (student.ieltsScore != null) lines.push(`IELTS Score: ${student.ieltsScore}`);
  if (student.satScore != null) lines.push(`SAT Score: ${student.satScore}`);
  if (student.greScore != null) lines.push(`GRE Score: ${student.greScore}`);

  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Build university & scholarship context from database
// ---------------------------------------------------------------------------

const buildUniversityContext = (universities) => {
  if (!universities || universities.length === 0) {
    return 'No university data available in the database.';
  }

  return universities.map((u) => {
    const courses = Array.isArray(u.courses) ? u.courses.join(', ') : 'N/A';
    const lines = [
      `📌 ${u.name} (Rank #${u.ranking})`,
      `   Location: ${u.city || 'N/A'}, ${u.country}`,
      `   Tuition: $${u.tuitionAnnualUsd?.toLocaleString() || 'N/A'}/year`,
      `   Acceptance Rate: ${u.acceptanceRate != null ? u.acceptanceRate + '%' : 'N/A'}`,
      `   Application Fee: $${u.applicationFee || 'N/A'}`,
      `   Application Deadline: ${u.applicationDeadline || 'N/A'}`,
      `   IELTS Requirement: ${u.ieltsRequirement != null ? u.ieltsRequirement : 'Not specified'}`,
      `   GRE Requirement: ${u.greRequirement != null ? u.greRequirement : 'Not required'}`,
      `   Courses: ${courses}`,
      `   Website: ${u.websiteUrl || 'N/A'}`,
    ];
    return lines.join('\n');
  }).join('\n\n');
};

const buildScholarshipContext = (scholarships) => {
  if (!scholarships || scholarships.length === 0) {
    return 'No scholarship data available in the database.';
  }

  return scholarships.map((s) => {
    const lines = [
      `💰 ${s.name}`,
      `   Country: ${s.country}`,
      `   Amount: $${s.amountUsd?.toLocaleString() || 'N/A'}/year`,
      `   Funding Level: ${s.fundingLevel}`,
      `   Eligibility: ${s.eligibility || 'N/A'}`,
      `   Deadline: ${s.deadline || 'N/A'}`,
      `   Website: ${s.websiteUrl || 'N/A'}`,
    ];
    return lines.join('\n');
  }).join('\n\n');
};

const buildSystemPrompt = (studentContext, universityContext, scholarshipContext) => `
You are StudyBridge AI Admission Advisor — an elite, knowledgeable, and empathetic global education counselor helping students navigate university admissions, scholarships, exam preparation, visa procedures, and career planning.

STUDENT PROFILE (from live database):
${studentContext}

=== PARTNER UNIVERSITIES DATABASE (${universityContext.split('📌').length - 1} institutions) ===
${universityContext}

=== SCHOLARSHIP DATABASE ===
${scholarshipContext}

YOUR COUNSELING CAPABILITIES & INTENT-BASED ADAPTATION:

1. DYNAMIC LENGTH & CONCISENESS (CRITICAL):
   - 💬 Simple Greetings & Small Talk (e.g. "Hi", "Hello", "Hey", "How are you?"):
     * Keep it SHORT, WARM, and CONCISE (2 to 4 sentences maximum).
     * Greet the student by their first name, warmly welcome them, and ask what they would like help with today (e.g. university recommendations, scholarship search, SOP review, or visa questions).
     * DO NOT dump full university lists, profile breakdowns, or lengthy evaluations on a simple greeting!
   
   - 🎯 Specific / Direct Inquiries (e.g. "What is the IELTS score for Waterloo?", "What is OPT in the US?", "When is the CMU deadline?", "Is Germany tuition free?"):
     * Be DIRECT, PRECISE, and FOCUSED (2 to 6 sentences or a concise bullet list).
     * Answer the exact question immediately with accurate numbers, add 1 helpful counselor tip, and conclude with a quick relevant follow-up.
   
   - 🚀 In-Depth / Matching Requests (e.g. "Match universities to my profile", "Recommend colleges for my GPA", "Give me a full SOP guide", "Compare USA vs Germany"):
     * Provide a rich, structured, comprehensive breakdown with categories, exact metrics (tuition, requirements, deadlines), actionable tips, and next steps.

2. University Recommendations Structure (When explicitly requested):
   - Provide 3 to 5 tailored university recommendations categorized into:
     * 🚀 **Reach / Dream** (Top-tier, highly competitive)
     * 🎯 **Target / Strong Match** (Great alignment with student's CGPA & test scores)
     * 🛡️ **Safety / Budget-Friendly** (High acceptance or low/free tuition like Germany/Europe)
   - For each recommended university, include:
     - **Name, Rank & Location**
     - **Matching Degree/Program**
     - **Tuition & Costs**
     - **Entry Requirements vs Student's Actual Scores** (highlighting CGPA, IELTS, SAT/GRE)
     - **Deadline & Direct Official Website Link**

3. Tone & Conversation Flow:
   - Professional, supportive, and natural counselor persona.
   - Reference student profile details naturally when relevant without repeating raw profile dumps on every message.
   - End with 1 relevant, engaging follow-up question.

4. Formatting:
   - Clean Markdown with bold highlights, compact bullet points, and headers (###) only when needed for structured multi-section answers.

5. FIT CHECK MODE ("Check fit" requests):
   - A message that starts with "[FIT CHECK]" asks you to assess whether the student is eligible for ONE specific university or scholarship. The details of that item are stated in the message; earlier turns of the conversation are included for context.
   - Start from the STUDENT PROFILE above and never ask again for information already listed there.
   - If important information is still missing (for example target degree level, budget, work experience, backlogs, or English test status), ask at most 3 short numbered questions and then stop. Do not give a verdict in that same reply.
   - When you have enough information, reply with:
     * a one-line verdict: **Strong fit**, **Possible with conditions**, or **Not a fit yet**;
     * a short requirement-by-requirement checklist marking each item **Met**, **Not met** or **Unknown** against the student's profile;
     * the 2-3 most useful next steps.
   - If the profile already covers the requirements, give the verdict immediately and state any assumptions you made. Never invent requirements that the item details do not mention.
`.trim();

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CHARS = 6_000;

/**
 * Turn the client's recent transcript into Gemini contents. Consecutive turns
 * with the same role are merged (Gemini expects alternating user/model turns),
 * and leading assistant turns are dropped so the conversation starts with the
 * student.
 */
const buildContents = (history, message) => {
  const turns = [];

  const push = (role, text) => {
    if (!text) return;
    const previous = turns[turns.length - 1];
    if (previous && previous.role === role) {
      previous.parts[0].text = `${previous.parts[0].text}\n\n${text}`;
      return;
    }
    turns.push({ role, parts: [{ text }] });
  };

  if (Array.isArray(history)) {
    for (const entry of history.slice(-MAX_HISTORY_MESSAGES)) {
      if (!entry || typeof entry !== 'object') continue;

      const role = entry.role === 'assistant' || entry.role === 'model' ? 'model' : 'user';
      const raw = typeof entry.content === 'string' ? entry.content : entry.text;
      if (typeof raw !== 'string') continue;

      const text = raw.slice(0, MAX_HISTORY_CHARS).trim();
      if (!text) continue;

      push(role, text);
    }
  }

  push('user', message.trim());

  while (turns.length > 0 && turns[0].role === 'model') {
    turns.shift();
  }

  return turns;
};

export const sendMessage = async (userId, message, history) => {
  // --- Input validation ---
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { status: 400, body: { success: false, message: 'Message is required.' } };
  }

  if (!getApiKey()) {
    console.error('Chatbot error: GEMINI_API_KEY is not configured.');
    return { status: 500, body: { success: false, message: 'AI service is not configured.' } };
  }

  try {
    // --- Load student profile ---
    const student = await prisma.student.findUnique({ where: { id: userId } });

    if (!student) {
      return { status: 404, body: { success: false, message: 'Student profile not found.' } };
    }

    // --- Load universities and scholarships from database ---
    const [universities, scholarships] = await Promise.all([
      prisma.university.findMany({ orderBy: { ranking: 'asc' } }),
      prisma.scholarship.findMany({ orderBy: { name: 'asc' } }),
    ]);

    // --- Build prompt ---
    const studentContext = buildStudentContext(student);
    const universityContext = buildUniversityContext(universities);
    const scholarshipContext = buildScholarshipContext(scholarships);
    const systemPrompt = buildSystemPrompt(studentContext, universityContext, scholarshipContext);

    // --- Call Gemini with Fallback Models ---
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const fallbackModels = [
      preferredModel,
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite-preview',
      'gemini-3-flash-preview',
      'gemini-3.5-flash-lite',
    ];
    // Remove duplicate model names while preserving order
    const candidateModels = [...new Set(fallbackModels)];

    const genAI = getClient();
    let reply = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
        });

        const result = await model.generateContent({
          contents: buildContents(history, message),
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        });

        reply = result?.response?.text()?.trim();
        if (reply) break;
      } catch (err) {
        lastError = err;
        console.warn(`Gemini model ${modelName} failed, trying next fallback:`, err?.message || err);
      }
    }

    if (!reply) {
      if (lastError) throw lastError;
      return { status: 502, body: { success: false, message: 'AI service returned an empty response.' } };
    }

    return { status: 200, body: { success: true, reply } };
  } catch (err) {
    console.error('Chatbot error:', err?.status, err?.message || err);

    if (
      err?.status === 401 ||
      err?.code === 'invalid_api_key' ||
      (err?.status === 400 && (err?.message?.includes('API key') || err?.message?.includes('API_KEY')))
    ) {
      return { status: 502, body: { success: false, message: 'AI service authentication failed. Check your Gemini API key.' } };
    }
    if (err?.status === 404) {
      return { status: 502, body: { success: false, message: 'AI model not found. Please check your GEMINI_MODEL configuration.' } };
    }
    if (err?.status === 429) {
      return { status: 429, body: { success: false, message: 'AI service rate limit exceeded. Please try again in a moment.' } };
    }
    if (err?.status >= 500) {
      return { status: 502, body: { success: false, message: 'AI service is temporarily unavailable.' } };
    }

    return { status: 500, body: { success: false, message: 'Something went wrong while processing your message.' } };
  }
};
