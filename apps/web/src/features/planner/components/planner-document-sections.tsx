import { Text, View } from '@react-pdf/renderer';
import { formatDate, generateLineKeys } from './planner-document-helpers';
import { styles } from './planner-document-styles';
import type { DayData } from './planner-document-types';

type DayRowProps = {
  readonly dayData: DayData;
  readonly lineHeight: number;
};

export const DayRow = ({
  dayData,
  lineHeight,
}: DayRowProps): React.ReactElement => {
  const { day, subjects, height, cellHeight, linesPerSubject } = dayData;
  // The cell's own bottom rule is the last ruled line.
  const interiorLines = linesPerSubject - 1;
  return (
    <View style={[styles.dayRow, { height }]} wrap={false}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayName}>{day.name}</Text>
        <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
      </View>
      {subjects.length > 0 ? (
        subjects.map((subject) => (
          <View
            key={subject.id}
            style={[styles.subjectCell, { height: cellHeight }]}
          >
            <View style={styles.subjectLabel}>
              <Text style={styles.subjectLabelText}>{subject.name}</Text>
            </View>
            <View style={[styles.writingArea, { paddingBottom: lineHeight }]}>
              {generateLineKeys(subject.id, interiorLines).map((key) => (
                <View
                  key={key}
                  style={[styles.writingLine, { height: lineHeight }]}
                />
              ))}
            </View>
          </View>
        ))
      ) : (
        <View style={[styles.subjectCell, { height: cellHeight }]}>
          <View style={styles.subjectLabel}>
            <Text style={styles.subjectLabelText}>No classes</Text>
          </View>
          <View style={styles.writingArea} />
        </View>
      )}
    </View>
  );
};

type HeaderProps = {
  readonly weekId: string;
  readonly dateRange: string;
};

export const PlannerHeader = ({
  weekId,
  dateRange,
}: HeaderProps): React.ReactElement => (
  <View style={styles.header}>
    <View>
      <Text style={styles.weekId}>{weekId}</Text>
      <Text style={styles.dateRange}>{dateRange}</Text>
    </View>
    <Text style={styles.wordmark}>
      Paper<Text style={styles.wordmarkItalic}>Sync</Text>
    </Text>
  </View>
);

export const PlannerFooter = (): React.ReactElement => (
  <View style={styles.footer}>
    <Text
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  </View>
);
