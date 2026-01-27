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

// Using Roboto font (TTF format) - @react-pdf/renderer only supports TTF/WOFF
// Note: Google Fonts CDN provides single-weight TTF files that work with react-pdf
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

// Disable hyphenation globally for cleaner PDF text
Font.registerHyphenationCallback((word) => [word]);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Roboto",
    fontSize: 9,
    color: "#1C1917",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E5E4",
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontFamily: "Roboto",
    fontSize: 20,
    fontWeight: 400,
    marginBottom: 4,
    color: "#1C1917",
  },
  subtitle: {
    fontSize: 10,
    color: "#78716C",
  },
  weekBadge: {
    backgroundColor: "#166534",
    color: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    marginTop: 4,
  },
  qrContainer: {
    width: 60,
    height: 60,
  },
  qrImage: {
    width: 60,
    height: 60,
  },
  grid: {
    flexDirection: "row",
    flex: 1,
  },
  dayColumn: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: "#E7E5E4",
  },
  dayColumnLast: {
    flex: 1,
    borderRightWidth: 0,
  },
  dayHeader: {
    backgroundColor: "#FAFAF9",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E7E5E4",
  },
  dayName: {
    fontSize: 8,
    fontWeight: 600,
    color: "#1C1917",
  },
  dayDate: {
    fontSize: 7,
    color: "#78716C",
    marginTop: 1,
  },
  subjectRow: {
    minHeight: 45,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E7E5E4",
  },
  subjectName: {
    fontSize: 7,
    fontWeight: 500,
    color: "#78716C",
    marginBottom: 2,
  },
  writingArea: {
    flex: 1,
    minHeight: 28,
  },
  generalTasksSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E7E5E4",
  },
  generalTasksHeader: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 8,
    color: "#1C1917",
  },
  generalTasksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  taskLine: {
    width: "50%",
    paddingRight: 8,
    paddingVertical: 4,
    fontSize: 8,
    color: "#78716C",
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 0.75,
    borderColor: "#A8A29E",
    borderRadius: 2,
    marginRight: 6,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#A8A29E",
  },
});

// ============================================================================
// Types
// ============================================================================

export type PlannerProps = {
  readonly weekId: WeekId;
  readonly dateRange: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly subjects: readonly Subject[];
  readonly qrDataUrl: string;
};

type DayInfo = {
  readonly name: string;
  readonly shortName: string;
  readonly date: Date;
};

// ============================================================================
// Helper Functions
// ============================================================================

const getDaysOfWeek = (startDate: Date): readonly DayInfo[] => {
  const days: DayInfo[] = [];
  const dayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const shortNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push({
      name: dayNames[i],
      shortName: shortNames[i],
      date,
    });
  }

  return days;
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatDateRange = (start: Date, end: Date): string =>
  `${formatDate(start)} – ${formatDate(end)}`;

// ============================================================================
// Planner PDF Component
// ============================================================================

export const PlannerDocument = ({
  weekId,
  dateRange,
  subjects,
  qrDataUrl,
}: PlannerProps): React.ReactElement => {
  const days = getDaysOfWeek(dateRange.start);
  const weekNumber = weekId.replace(/^\d{4}-W/, "W");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Weekly Planner</Text>
            <Text style={styles.subtitle}>
              {formatDateRange(dateRange.start, dateRange.end)}
            </Text>
            <Text style={styles.weekBadge}>{weekNumber}</Text>
          </View>
          <View style={styles.qrContainer}>
            <Image src={qrDataUrl} style={styles.qrImage} />
          </View>
        </View>

        {/* Day Grid */}
        <View style={styles.grid}>
          {days.map((day, dayIndex) => (
            <View
              key={day.name}
              style={dayIndex === 6 ? styles.dayColumnLast : styles.dayColumn}
            >
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day.shortName}</Text>
                <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
              </View>
              {subjects.map((subject) => (
                <View key={subject.id} style={styles.subjectRow}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <View style={styles.writingArea} />
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* General Tasks Section */}
        <View style={styles.generalTasksSection}>
          <Text style={styles.generalTasksHeader}>General Tasks</Text>
          <View style={styles.generalTasksGrid}>
            {[
              "task-1",
              "task-2",
              "task-3",
              "task-4",
              "task-5",
              "task-6",
              "task-7",
              "task-8",
            ].map((key) => (
              <View
                key={key}
                style={[
                  styles.taskLine,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                <View style={styles.checkbox} />
                <Text style={{ color: "#D6D3D1" }}>
                  _______________________________________________
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>PaperSync</Text>
          <Text>Scan QR code to sync</Text>
        </View>
      </Page>
    </Document>
  );
};
