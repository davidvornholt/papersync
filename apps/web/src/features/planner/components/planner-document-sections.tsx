import { Text, View } from '@react-pdf/renderer';
import { formatDate, generateLineKeys } from './planner-document-helpers';
import { styles } from './planner-document-styles';
import type { DayData } from './planner-document-types';

type DayRowProps = {
  readonly dayData: DayData;
};

export const DayRow = ({ dayData }: DayRowProps): React.ReactElement => {
  const { day, subjects, height, subjectHeight, linesPerSubject } = dayData;
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
            style={[styles.subjectSection, { height: subjectHeight }]}
          >
            <Text style={styles.subjectLabel}>{subject.name}</Text>
            <View style={styles.writingArea}>
              {generateLineKeys(subject.id, linesPerSubject).map((key) => (
                <View
                  key={key}
                  style={[
                    styles.writingLine,
                    { height: subjectHeight / linesPerSubject },
                  ]}
                />
              ))}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyDayText}>No classes</Text>
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
    <Text style={styles.appName}>PaperSync</Text>
    <View style={styles.weekHeading}>
      <Text style={styles.weekInfo}>{weekId}</Text>
      <Text style={styles.dateRange}>{dateRange}</Text>
    </View>
  </View>
);

export const PlannerFooter = (): React.ReactElement => (
  <View style={styles.footer}>
    <Text>Write homework and deadlines beside each subject.</Text>
    <Text
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  </View>
);
