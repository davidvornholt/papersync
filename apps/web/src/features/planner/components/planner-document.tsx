// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot resolve this conditional CommonJS export; TypeScript and the production build verify it.
import { Document, Font, Page, View } from '@react-pdf/renderer';
import { LAYOUT } from './planner-document-constants';
import {
  calculatePageData,
  formatCompactDateRange,
  getDaysOfWeek,
} from './planner-document-helpers';
import {
  DayRow,
  PlannerFooter,
  PlannerHeader,
} from './planner-document-sections';
import { styles } from './planner-document-styles';
import type { PlannerProps } from './planner-document-types';

const frontPageDays = 3;
const schoolDays = 5;
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
}: PlannerProps): React.ReactElement => {
  const days = getDaysOfWeek(dateRange.start);
  const dateRangeStr = formatCompactDateRange(dateRange.start);

  const page1Days = days.slice(0, frontPageDays);
  const page2Days = days.slice(frontPageDays, schoolDays);

  const page1Data = calculatePageData(
    page1Days,
    timetable,
    subjects,
    LAYOUT.contentHeight,
  );

  const page2Data = calculatePageData(
    page2Days,
    timetable,
    subjects,
    LAYOUT.contentHeight,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PlannerHeader weekId={weekId} dateRange={dateRangeStr} />
        <View style={styles.pageContent}>
          {page1Data.map((dayData) => (
            <DayRow key={dayData.day.dayKey} dayData={dayData} />
          ))}
        </View>
        <PlannerFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <PlannerHeader weekId={weekId} dateRange={dateRangeStr} />
        <View style={styles.pageContent}>
          {page2Data.map((dayData) => (
            <DayRow key={dayData.day.dayKey} dayData={dayData} />
          ))}
        </View>
        <PlannerFooter />
      </Page>
    </Document>
  );
};
