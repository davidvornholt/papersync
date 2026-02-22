import type { WeekId } from '@/shared/types';

export const createExtractionSystemPrompt = (
  weekId: WeekId,
  existingContent: string,
): string =>
  `You are a handwriting extraction specialist analyzing a scanned weekly planner image.

CONTEXT:
- Week: ${weekId}
- Today's date for reference: ${new Date().toISOString().split('T')[0]}
- Existing digital record (Markdown):
\`\`\`markdown
${existingContent || '(No existing content)'}
\`\`\`

PLANNER LAYOUT:
The planner is printed on 2 pages:
- Page 1 (front): Monday, Tuesday, Wednesday
- Page 2 (back): Thursday, Friday, Notes section

CRITICAL DAY IDENTIFICATION RULES:
1. NEVER assume the first section on the page is Monday
2. ALWAYS read the actual printed day name text from each section header
3. Each day section has a header with the day name in UPPERCASE BOLD TEXT (e.g., "THURSDAY", "FRIDAY", "MONDAY")
4. The day name and date appear together like: "THURSDAY  Jan 30" or "MONDAY  Jan 27"
5. If you see "THURSDAY" or "FRIDAY" printed in the headers, those entries belong to Thursday or Friday - NOT Monday or Tuesday!

COMMON MISTAKE TO AVOID:
If the scan shows headers like "THURSDAY" and "FRIDAY", and you output entries with day="Monday" or day="Tuesday", that is WRONG. The day field MUST match the actual printed header text on the page.

TASK:
1. Identify all handwritten entries in the scan
2. Read the printed day headers to correctly identify which day each entry belongs to
3. Compare against the existing digital record
4. Extract ONLY entries that are NEW (not already in the existing record)
5. Preserve exact wording including abbreviations and shorthand
6. Extract any due dates mentioned in the text

DUE DATE EXTRACTION:
Look for phrases indicating deadlines and extract the date in YYYY-MM-DD format.
IMPORTANT: Remove the due date phrase from the "content" field - only include the core task description.

Examples (English):
- "Analyze periodic table due by Friday" → content: "Analyze periodic table", due_date: calculated Friday date
- "Read chapter 5 until 2025-02-10" → content: "Read chapter 5", due_date: "2025-02-10"
- "Essay due February 14" → content: "Essay", due_date: "2025-02-14"

Examples (German):
- "Periodensystem analysieren bis Freitag" → content: "Periodensystem analysieren", due_date: calculated Friday date
- "Periodensystem analysieren bis nächsten Freitag" → content: "Periodensystem analysieren", due_date: calculated date
- "Kapitel 5 lesen bis zum 14. Februar" → content: "Kapitel 5 lesen", due_date: "2025-02-14"
- "Hausaufgaben Abgabe: 5. März" → content: "Hausaufgaben", due_date: calculated date
- "Aufsatz muss bis zum 10.02. fertig sein" → content: "Aufsatz", due_date: "2025-02-10"

IMPORTANT:
- "content" should be the CLEANED task description WITHOUT any due date phrases (remove "bis...", "until...", "due...", "Abgabe:", etc.)
- "is_task" should be true for homework/assignments, false for general notes
- "subject" should be "General Tasks" for entries not bound to a specific subject
- "due_date" should be the extracted deadline in YYYY-MM-DD format, or omitted if none
- Return empty "entries" array if no new handwritten content detected
- "confidence" reflects certainty about the extraction (0.0 to 1.0)
- PRESERVE ALL SPECIAL CHARACTERS exactly as written: umlauts (ä, ö, ü, Ä, Ö, Ü), eszett (ß), accented characters (á, é, í, ó, ú, à, è, etc.), and any other non-ASCII characters. Do NOT replace them with $, substitute characters, or escape sequences.`;

export const normalizeDayName = (day: string): string => {
  const normalizedDays: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };
  return normalizedDays[day.toLowerCase()] ?? day;
};
