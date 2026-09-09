import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { MainLayout } from '@/shared/components/navigation';
import { ToastProvider } from '@/shared/components/toast';

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
  description:
    'Scan your paper homework planner at home, review the reading, and send approved tasks to Super Productivity.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
      <ToastProvider>
        <MainLayout>{children}</MainLayout>
      </ToastProvider>
    </body>
  </html>
);

export default RootLayout;
