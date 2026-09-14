// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot resolve this conditional CommonJS export; TypeScript and the production build verify it.
import { StyleSheet } from '@react-pdf/renderer';
import { colors, LAYOUT } from './planner-document-constants';

export const styles = StyleSheet.create({
  page: {
    padding: LAYOUT.pagePadding,
    fontFamily: 'Roboto',
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },
  pageContent: { height: LAYOUT.contentHeight, flexShrink: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: LAYOUT.headerHeight,
    marginBottom: LAYOUT.headerMargin,
  },
  appName: { fontSize: 15, fontWeight: 700 },
  weekHeading: { alignItems: 'flex-end' },
  weekInfo: { fontSize: 11, fontWeight: 700 },
  dateRange: { fontSize: 8, color: colors.darkGray, marginTop: 2 },
  dayRow: { paddingBottom: LAYOUT.dayPadding, flexShrink: 0 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: LAYOUT.dayHeaderHeight,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.darkGray,
  },
  dayName: { fontSize: 12, fontWeight: 700 },
  dayDate: { fontSize: 9, color: colors.darkGray },
  subjectSection: { flexDirection: 'row', flexShrink: 0 },
  subjectLabel: {
    width: 100,
    paddingTop: 6,
    paddingRight: 12,
    fontSize: 9,
    fontWeight: 500,
    color: colors.darkGray,
  },
  writingArea: { flex: 1 },
  writingLine: {
    borderBottomWidth: 0.4,
    borderBottomColor: colors.lightGray,
    flexShrink: 0,
  },
  emptyDayText: { paddingTop: 8, fontSize: 9, color: colors.darkGray },
  footer: {
    height: LAYOUT.footerHeight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    fontSize: 7,
    color: colors.darkGray,
  },
});
