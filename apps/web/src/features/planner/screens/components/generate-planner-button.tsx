import { Button } from '@papersync/ui/button';
import { Spinner } from '@/shared/components/motion-loading';

type GeneratePlannerButtonProps = {
  readonly isGenerating: boolean;
  readonly isDisabled: boolean;
  readonly onGenerate: () => void;
};

export const GeneratePlannerButton = ({
  isGenerating,
  isDisabled,
  onGenerate,
}: GeneratePlannerButtonProps): React.ReactElement => (
  <Button
    onClick={onGenerate}
    disabled={isDisabled}
    className="w-full"
    size="lg"
  >
    {isGenerating ? (
      <>
        <Spinner size="sm" className="mr-2" />
        Generating…
      </>
    ) : (
      'Generate PDF'
    )}
  </Button>
);
