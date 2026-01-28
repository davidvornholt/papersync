import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type React from "react";
import type { Subject, WeekId } from "@/app/shared/types";

// ============================================================================
// Font Registration
// ============================================================================

Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
  fontWeight: 400,
});

Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
  fontWeight: 500,
});

Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
  fontWeight: 700,
});

Font.registerHyphenationCallback((word) => [word]);

// ============================================================================
// Grayscale Colors (Ink-Saving)
// ============================================================================

const colors = {
  black: "#000000",
  darkGray: "#444444",
  mediumGray: "#888888",
  lightGray: "#BBBBBB",
  veryLightGray: "#DDDDDD",
  white: "#FFFFFF",
} as const;

// ============================================================================
// Layout Constants
// ============================================================================

// A4 = 595pt × 841pt
// With 16pt padding: usable = 841 - 32 = 809pt
// Minus header (28pt) and margin (8pt): ~770pt for content
const LAYOUT = {
  pagePadding: 16,
  headerHeight: 28,
  headerMargin: 6,
  contentHeight: 770, // Conservative estimate for content area
  lineHeight: 14, // Height per homework line (tighter)
  dayHeaderHeight: 18, // Day header row
  subjectLabelHeight: 12, // Subject label
  dayPadding: 8, // Padding per day section
  minLinesPerSubject: 2,
  maxLinesPerSubject: 4, // Cap to prevent overflow
  notesWeight: 2,
} as const;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: LAYOUT.pagePadding,
    fontFamily: "Roboto",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },
  pageContent: {
    flex: 1,
    flexDirection: "column",
  },
  // Header - compact
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: LAYOUT.headerHeight,
    marginBottom: LAYOUT.headerMargin,
    paddingBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.darkGray,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  appName: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.black,
  },
  weekInfo: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.darkGray,
  },
  qrContainer: {
    width: 24,
    height: 24,
  },
  qrImage: {
    width: 24,
    height: 24,
  },
  // Day rows with improved separator
  dayRow: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.lightGray,
    paddingTop: 4,
    paddingBottom: 3,
  },
  dayRowLast: {
    paddingTop: 4,
    paddingBottom: 3,
  },
  // Day header - cleaner design with left border accent
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    paddingLeft: 5,
    borderLeftWidth: 2,
    borderLeftColor: colors.darkGray,
  },
  dayName: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayDate: {
    fontSize: 9,
    color: colors.mediumGray,
    marginLeft: 8,
  },
  dayContent: {
    flex: 1,
    paddingLeft: 8,
  },
  // Subject section - compact
  subjectSection: {
    marginBottom: 2,
  },
  subjectLabel: {
    fontSize: 8,
    fontWeight: 500,
    color: colors.darkGray,
    marginBottom: 1,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    height: LAYOUT.lineHeight,
  },
  bullet: {
    fontSize: 8,
    color: colors.mediumGray,
    marginRight: 4,
    width: 8,
  },
  writingLine: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.veryLightGray,
    height: LAYOUT.lineHeight - 2,
  },
  // Empty day
  emptyDay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
  },
  emptyDayText: {
    fontSize: 8,
    color: colors.lightGray,
    fontStyle: "italic",
  },
  // Notes section
  notesSection: {
    paddingTop: 4,
    paddingBottom: 3,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    paddingLeft: 5,
    borderLeftWidth: 2,
    borderLeftColor: colors.darkGray,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesContent: {
    flex: 1,
    paddingLeft: 8,
  },
});

// ============================================================================
// Types
// ============================================================================

type TimetableSlot = {
  readonly id: string;
  readonly subjectId: string;
};

type TimetableDay = {
  readonly day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  readonly slots: readonly TimetableSlot[];
};

export type PlannerProps = {
  readonly weekId: WeekId;
  readonly dateRange: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly subjects: readonly Subject[];
  readonly timetable: readonly TimetableDay[];
  readonly qrDataUrl: string;
};

type DayInfo = {
  readonly name: string;
  readonly shortName: string;
  readonly date: Date;
  readonly dayKey: TimetableDay["day"];
};

type DayData = {
  readonly day: DayInfo;
  readonly subjects: readonly Subject[];
  readonly weight: number;
  readonly linesPerSubject: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

const WEEKDAYS: Array<{
  name: string;
  shortName: string;
  key: TimetableDay["day"];
}> = [
  { name: "Monday", shortName: "Mon", key: "monday" },
  { name: "Tuesday", shortName: "Tue", key: "tuesday" },
  { name: "Wednesday", shortName: "Wed", key: "wednesday" },
  { name: "Thursday", shortName: "Thu", key: "thursday" },
  { name: "Friday", shortName: "Fri", key: "friday" },
];

const getDaysOfWeek = (startDate: Date): readonly DayInfo[] => {
  return WEEKDAYS.map((day, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    return {
      name: day.name,
      shortName: day.shortName,
      date,
      dayKey: day.key,
    };
  });
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatCompactDateRange = (start: Date): string => {
  const friday = new Date(start);
  friday.setDate(start.getDate() + 4);
  return `${formatDate(start)} – ${formatDate(friday)}`;
};

const getSubjectsForDay = (
  dayKey: TimetableDay["day"],
  timetable: readonly TimetableDay[],
  subjects: readonly Subject[],
): readonly Subject[] => {
  const daySchedule = timetable.find((t) => t.day === dayKey);
  if (!daySchedule || daySchedule.slots.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const result: Subject[] = [];

  for (const slot of daySchedule.slots) {
    if (!seenIds.has(slot.subjectId)) {
      const subject = subjects.find((s) => s.id === slot.subjectId);
      if (subject) {
        seenIds.add(slot.subjectId);
        result.push(subject);
      }
    }
  }

  return result;
};

// Calculate how many lines each subject should get based on available space
const calculateLinesPerSubject = (
  subjectCount: number,
  availableHeight: number,
): number => {
  if (subjectCount === 0) return 0;

  // Available for subjects: height minus day header and padding
  const contentHeight =
    availableHeight - LAYOUT.dayHeaderHeight - LAYOUT.dayPadding;

  // Each subject needs: label height + (lines × line height) + margin
  const perSubjectOverhead = LAYOUT.subjectLabelHeight + 2; // label + margin
  const heightPerSubject = contentHeight / subjectCount;
  const heightForLines = heightPerSubject - perSubjectOverhead;

  const lines = Math.floor(heightForLines / LAYOUT.lineHeight);

  // Clamp between min and max
  return Math.min(
    LAYOUT.maxLinesPerSubject,
    Math.max(LAYOUT.minLinesPerSubject, lines),
  );
};

// Calculate day data for a page
const calculatePageData = (
  days: readonly DayInfo[],
  timetable: readonly TimetableDay[],
  subjects: readonly Subject[],
  availableHeight: number,
): DayData[] => {
  // Get subject counts and weights
  const daysWithSubjects = days.map((day) => ({
    day,
    subjects: getSubjectsForDay(day.dayKey, timetable, subjects),
  }));

  const weights = daysWithSubjects.map((d) => Math.max(1, d.subjects.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return daysWithSubjects.map((d, i) => {
    const weight = weights[i];
    const dayHeight = (weight / totalWeight) * availableHeight;
    const linesPerSubject = calculateLinesPerSubject(
      d.subjects.length,
      dayHeight,
    );

    return {
      day: d.day,
      subjects: d.subjects,
      weight,
      linesPerSubject,
    };
  });
};

// Generate line keys for a subject
const generateLineKeys = (subjectId: string, count: number): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(`${subjectId}-l${i}`);
  }
  return keys;
};

// ============================================================================
// Day Row Component
// ============================================================================

type DayRowProps = {
  readonly dayData: DayData;
  readonly isLast?: boolean;
};

const DayRow = ({
  dayData,
  isLast = false,
}: DayRowProps): React.ReactElement => {
  const { day, subjects: daySubjects, weight, linesPerSubject } = dayData;
  const baseStyle = isLast ? styles.dayRowLast : styles.dayRow;

  return (
    <View style={[baseStyle, { flexGrow: weight }]}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayName}>{day.name}</Text>
        <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
      </View>
      <View style={styles.dayContent}>
        {daySubjects.length > 0 ? (
          daySubjects.map((subject) => (
            <View key={subject.id} style={styles.subjectSection}>
              <Text style={styles.subjectLabel}>{subject.name}</Text>
              {generateLineKeys(subject.id, linesPerSubject).map((key) => (
                <View key={key} style={styles.bulletRow}>
                  <Text style={styles.bullet}>–</Text>
                  <View style={styles.writingLine} />
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayText}>No classes</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// Notes Section Component
// ============================================================================

type NotesSectionProps = {
  readonly flexGrow: number;
  readonly lineCount: number;
};

const NotesSection = ({
  flexGrow,
  lineCount,
}: NotesSectionProps): React.ReactElement => {
  const noteLineKeys = Array.from({ length: lineCount }, (_, i) => `n${i}`);

  return (
    <View style={[styles.notesSection, { flexGrow }]}>
      <View style={styles.notesHeader}>
        <Text style={styles.notesTitle}>Notes</Text>
      </View>
      <View style={styles.notesContent}>
        {noteLineKeys.map((key) => (
          <View key={key} style={styles.bulletRow}>
            <Text style={styles.bullet}>–</Text>
            <View style={styles.writingLine} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// Header Component
// ============================================================================

type HeaderProps = {
  readonly weekNumber: string;
  readonly dateRange: string;
  readonly qrDataUrl: string;
};

const Header = ({
  weekNumber,
  dateRange,
  qrDataUrl,
}: HeaderProps): React.ReactElement => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <Text style={styles.appName}>PaperSync</Text>
      <Text style={styles.weekInfo}>
        {weekNumber} · {dateRange}
      </Text>
    </View>
    <View style={styles.qrContainer}>
      <Image src={qrDataUrl} style={styles.qrImage} />
    </View>
  </View>
);

// ============================================================================
// Planner PDF Component
// ============================================================================

export const PlannerDocument = ({
  weekId,
  dateRange,
  subjects,
  timetable,
  qrDataUrl,
}: PlannerProps): React.ReactElement => {
  const days = getDaysOfWeek(dateRange.start);
  const weekNumber = weekId.replace(/^\d{4}-W/, "W");
  const dateRangeStr = formatCompactDateRange(dateRange.start);

  // Split days: Page 1 = Mon, Tue, Wed | Page 2 = Thu, Fri + Notes
  const page1Days = days.slice(0, 3);
  const page2Days = days.slice(3, 5);

  // Calculate page 1 data (full content height available)
  const page1Data = calculatePageData(
    page1Days,
    timetable,
    subjects,
    LAYOUT.contentHeight,
  );

  // For page 2, calculate weights including notes
  const page2Weights = page2Days.map((day) => {
    const daySubjects = getSubjectsForDay(day.dayKey, timetable, subjects);
    return Math.max(1, daySubjects.length);
  });
  const page2DaysWeight = page2Weights.reduce((a, b) => a + b, 0);
  const notesWeight = Math.max(
    LAYOUT.notesWeight,
    Math.ceil(page2DaysWeight / 2),
  );
  const page2TotalWeight = page2DaysWeight + notesWeight;

  // Height available for days on page 2 (proportional)
  const page2DaysHeight =
    (page2DaysWeight / page2TotalWeight) * LAYOUT.contentHeight;
  const page2Data = calculatePageData(
    page2Days,
    timetable,
    subjects,
    page2DaysHeight,
  );

  // Notes section height and lines
  const notesHeight = (notesWeight / page2TotalWeight) * LAYOUT.contentHeight;
  const notesLines = Math.max(
    4,
    Math.floor((notesHeight - LAYOUT.dayHeaderHeight) / LAYOUT.lineHeight),
  );

  return (
    <Document>
      {/* Page 1: Monday, Tuesday, Wednesday */}
      <Page size="A4" style={styles.page}>
        <Header
          weekNumber={weekNumber}
          dateRange={dateRangeStr}
          qrDataUrl={qrDataUrl}
        />
        <View style={styles.pageContent}>
          {page1Data.map((dayData, index) => (
            <DayRow
              key={dayData.day.dayKey}
              dayData={dayData}
              isLast={index === page1Data.length - 1}
            />
          ))}
        </View>
      </Page>

      {/* Page 2: Thursday, Friday, Notes */}
      <Page size="A4" style={styles.page}>
        <Header
          weekNumber={weekNumber}
          dateRange={dateRangeStr}
          qrDataUrl={qrDataUrl}
        />
        <View style={styles.pageContent}>
          {page2Data.map((dayData) => (
            <DayRow key={dayData.day.dayKey} dayData={dayData} />
          ))}
          <NotesSection flexGrow={notesWeight} lineCount={notesLines} />
        </View>
      </Page>
    </Document>
  );
};
