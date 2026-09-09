import { connection } from 'next/server';
import { SettingsScreen } from '@/features/settings/screens/settings-screen';
import { hasVertexConfiguration } from '@/shared/ocr/services/vision-vertex-config';

const SettingsPage = async (): Promise<React.ReactElement> => {
  await connection();
  return <SettingsScreen isManagedAI={hasVertexConfiguration()} />;
};

export default SettingsPage;
