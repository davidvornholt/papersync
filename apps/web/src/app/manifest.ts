import type { MetadataRoute } from 'next';
import { appDescription, appThemeColor } from '@/shared/pwa/app-identity';

const manifest = (): MetadataRoute.Manifest => ({
  id: '/',
  name: 'PaperSync',
  // biome-ignore lint/style/useNamingConvention: Web app manifest member name.
  short_name: 'PaperSync',
  description: appDescription,
  // biome-ignore lint/style/useNamingConvention: Web app manifest member name.
  start_url: '/scan',
  scope: '/',
  display: 'standalone',
  // biome-ignore lint/style/useNamingConvention: Web app manifest member name.
  background_color: appThemeColor,
  // biome-ignore lint/style/useNamingConvention: Web app manifest member name.
  theme_color: appThemeColor,
  categories: ['education', 'productivity'],
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: '/icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  // biome-ignore lint/style/useNamingConvention: Web app manifest member name.
  share_target: {
    action: '/share-target',
    method: 'POST',
    enctype: 'multipart/form-data',
    params: {
      files: [
        { name: 'page', accept: ['image/jpeg', 'image/png', 'image/webp'] },
      ],
    },
  },
  shortcuts: [
    { name: 'Scan homework', url: '/scan' },
    { name: 'Print planner', url: '/planner' },
  ],
});

export default manifest;
