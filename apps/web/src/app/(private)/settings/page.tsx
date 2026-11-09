import { connection } from 'next/server';
import { SettingsScreen } from '@/features/settings/screens/settings-screen';
import { hasClaudeConfiguration } from '@/shared/ocr/services/vision-claude-config';

const SettingsPage = async (): Promise<React.ReactElement> => {
  await connection();
  return <SettingsScreen isManagedAI={hasClaudeConfiguration()} />;
};

export default SettingsPage;
