import { connection } from 'next/server';
import { SettingsScreen } from '@/features/settings/screens/settings-screen';
import { hasBedrockConfiguration } from '@/shared/ocr/services/vision-bedrock-config';

const SettingsPage = async (): Promise<React.ReactElement> => {
  await connection();
  return <SettingsScreen isManagedAI={hasBedrockConfiguration()} />;
};

export default SettingsPage;
