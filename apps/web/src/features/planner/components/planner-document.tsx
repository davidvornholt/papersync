// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot resolve this conditional CommonJS export; TypeScript and the production build verify it.
import { Document, Font, Page, View } from '@react-pdf/renderer';
import { FONT_SOURCES } from './planner-document-constants';
import {
  calculateSheetLayout,
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
  for (const source of FONT_SOURCES) {
    Font.register(source);
  }
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

  const sheet = calculateSheetLayout(
    [days.slice(0, frontPageDays), days.slice(frontPageDays, schoolDays)],
    timetable,
    subjects,
  );

  return (
    <Document>
      {sheet.pages.map((pageDays) => (
        <Page key={pageDays[0]?.day.dayKey} size="A4" style={styles.page}>
          <PlannerHeader weekId={weekId} dateRange={dateRangeStr} />
          <View style={styles.pageContent}>
            {pageDays.map((dayData) => (
              <DayRow
                key={dayData.day.dayKey}
                dayData={dayData}
                lineHeight={sheet.lineHeight}
              />
            ))}
          </View>
          <PlannerFooter />
        </Page>
      ))}
    </Document>
  );
};
