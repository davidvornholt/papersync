import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { MotionProvider } from '@/shared/components/motion-provider';
import { MainLayout } from '@/shared/components/navigation';
import { ToastProvider } from '@/shared/components/toast';
import { appDescription, appThemeColor } from '@/shared/pwa/app-identity';
import { ServiceWorkerRegistration } from '@/shared/pwa/service-worker-registration';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK', 'opsz'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'PaperSync | Homework from paper to plan',
  applicationName: 'PaperSync',
  description: appDescription,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: appThemeColor,
};

type RootLayoutProps = {
  readonly children: React.ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps): React.ReactElement => (
  <html
    lang="en"
    data-scroll-behavior="smooth"
    className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
  >
    <body>
      <MotionProvider>
        <ToastProvider>
          <MainLayout>{children}</MainLayout>
        </ToastProvider>
      </MotionProvider>
      <ServiceWorkerRegistration />
    </body>
  </html>
);

export default RootLayout;
