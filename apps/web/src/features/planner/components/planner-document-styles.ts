// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot resolve this conditional CommonJS export; TypeScript and the production build verify it.
import { StyleSheet } from '@react-pdf/renderer';
import { colors, fonts, LAYOUT } from './planner-document-constants';

export const styles = StyleSheet.create({
  page: {
    padding: LAYOUT.pagePadding,
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 9,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  pageContent: { height: LAYOUT.contentHeight, flexShrink: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: LAYOUT.headerHeight,
    marginBottom: LAYOUT.headerMargin,
  },
  weekId: {
    fontFamily: fonts.display,
    fontWeight: 600,
    fontSize: 22,
    lineHeight: 1.1,
    letterSpacing: -0.4,
  },
  dateRange: {
    fontFamily: fonts.mono,
    fontWeight: 400,
    fontSize: 8.5,
    letterSpacing: 0.3,
    color: colors.graphite,
    marginTop: 3,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontWeight: 400,
    fontSize: 13,
    letterSpacing: -0.4,
    paddingBottom: 1,
  },
  wordmarkItalic: { fontStyle: 'italic' },
  dayRow: { paddingBottom: LAYOUT.dayGap, flexShrink: 0 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: LAYOUT.dayHeaderHeight,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.ink,
  },
  dayName: { fontFamily: fonts.display, fontWeight: 600, fontSize: 14 },
  dayDate: {
    fontFamily: fonts.mono,
    fontWeight: 400,
    fontSize: 9,
    letterSpacing: 0.3,
    color: colors.graphite,
    paddingBottom: 1,
  },
  subjectSection: { flexDirection: 'row', flexShrink: 0 },
  subjectLabel: {
    width: LAYOUT.labelWidth,
    paddingRight: LAYOUT.labelGap,
    paddingBottom: 1.5,
    justifyContent: 'flex-end',
  },
  // Two wrapped label lines must fit inside one 8 mm ruled line.
  subjectLabelText: {
    fontSize: 9,
    lineHeight: 1.1,
    color: colors.graphite,
  },
  writingArea: {
    flex: 1,
    borderLeftWidth: 0.5,
    borderLeftColor: colors.hairlineStrong,
  },
  writingLine: {
    borderBottomWidth: 0.4,
    borderBottomColor: colors.hairline,
    flexShrink: 0,
  },
  emptyDayText: { paddingTop: 8, fontSize: 9, color: colors.graphite },
  footer: {
    height: LAYOUT.footerHeight,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    fontFamily: fonts.mono,
    fontWeight: 400,
    fontSize: 7.5,
    letterSpacing: 0.3,
    color: colors.graphite,
  },
});
