import { motion } from 'motion/react';
import { Button, Spinner } from '@/shared/components';

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
  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
    <Button
      onClick={onGenerate}
      disabled={isDisabled}
      className="w-full"
      size="lg"
    >
      {isGenerating ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Generating...
        </>
      ) : (
        'Generate PDF'
      )}
    </Button>
  </motion.div>
);
