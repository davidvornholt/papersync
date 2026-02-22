import { Image, Text, View } from '@react-pdf/renderer';
import { formatDate, generateLineKeys } from './planner-document-helpers';
import { styles } from './planner-document-styles';
import type { DayData } from './planner-document-types';

type DayRowProps = {
  readonly dayData: DayData;
  readonly isLast?: boolean;
};

export const DayRow = ({
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

type NotesSectionProps = {
  readonly flexGrow: number;
  readonly lineCount: number;
};

export const NotesSection = ({
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

type HeaderProps = {
  readonly weekNumber: string;
  readonly dateRange: string;
  readonly qrDataUrl: string;
};

export const PlannerHeader = ({
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
