import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';

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
      <h2 className="serif text-[20px] tracking-[-0.022em] text-ink">
        Week selection
      </h2>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="serif text-[22px] tracking-[-0.025em] text-ink leading-tight">
            {currentWeekId}
          </p>
          <p className="mono text-[12px] text-graphite mt-1">{dateRangeStr}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onOpenWeekModal}>
          Change
        </Button>
      </div>
    </CardContent>
  </Card>
);
