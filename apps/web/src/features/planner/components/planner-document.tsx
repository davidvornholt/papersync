import { Document, Font, Page, View } from '@react-pdf/renderer';
import { LAYOUT } from './planner-document-constants';
import {
  calculatePageData,
  formatCompactDateRange,
  getDaysOfWeek,
  getSubjectsForDay,
} from './planner-document-helpers';
import {
  DayRow,
  NotesSection,
  PlannerHeader,
} from './planner-document-sections';
import { styles } from './planner-document-styles';
import type { PlannerProps } from './planner-document-types';

const registerFonts = (): void => {
  Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
    fontWeight: 400,
  });
  Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
    fontWeight: 500,
  });
  Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
    fontWeight: 700,
  });
  Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf',
    fontWeight: 400,
    fontStyle: 'italic',
  });
  Font.registerHyphenationCallback((word) => [word]);
};

registerFonts();

export const PlannerDocument = ({
  weekId,
  dateRange,
  subjects,
  timetable,
  qrDataUrl,
}: PlannerProps): React.ReactElement => {
  const days = getDaysOfWeek(dateRange.start);
  const weekNumber = weekId.replace(/^\d{4}-W/, 'W');
  const dateRangeStr = formatCompactDateRange(dateRange.start);

  const page1Days = days.slice(0, 3);
  const page2Days = days.slice(3, 5);

  const page1Data = calculatePageData(
    page1Days,
    timetable,
    subjects,
    LAYOUT.contentHeight,
  );

  const page2Weights = page2Days.map((day) => {
    const daySubjects = getSubjectsForDay(day.dayKey, timetable, subjects);
    return Math.max(1, daySubjects.length);
  });

  const page2DaysWeight = page2Weights.reduce((sum, value) => sum + value, 0);
  const notesWeight = Math.max(
    LAYOUT.notesWeight,
    Math.ceil(page2DaysWeight / 2),
  );
  const page2TotalWeight = page2DaysWeight + notesWeight;
  const page2DaysHeight =
    (page2DaysWeight / page2TotalWeight) * LAYOUT.contentHeight;

  const page2Data = calculatePageData(
    page2Days,
    timetable,
    subjects,
    page2DaysHeight,
  );

  const notesHeight = (notesWeight / page2TotalWeight) * LAYOUT.contentHeight;
  const notesLines = Math.max(
    4,
    Math.floor((notesHeight - LAYOUT.dayHeaderHeight) / LAYOUT.lineHeight),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PlannerHeader
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

      <Page size="A4" style={styles.page}>
        <PlannerHeader
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

export type { PlannerProps } from './planner-document-types';
