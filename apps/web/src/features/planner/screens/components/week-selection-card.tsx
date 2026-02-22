import { Button, Card, CardContent, CardHeader } from '@/shared/components';

type WeekSelectionCardProps = {
  readonly currentWeekId: string;
  readonly dateRangeStr: string;
  readonly onOpenWeekModal: () => void;
};

export const WeekSelectionCard = ({
  currentWeekId,
  dateRangeStr,
  onOpenWeekModal,
}: WeekSelectionCardProps): React.ReactElement => (
  <Card>
    <CardHeader>
      <h2 className="text-lg font-semibold font-display">Week Selection</h2>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:border-accent/50 transition-colors">
        <div>
          <p className="font-semibold text-foreground">{currentWeekId}</p>
          <p className="text-sm text-muted">{dateRangeStr}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onOpenWeekModal}>
          Change
        </Button>
      </div>
    </CardContent>
  </Card>
);
