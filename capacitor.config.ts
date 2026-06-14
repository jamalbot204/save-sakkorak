/// <reference types="@codetrix-studio/capacitor-google-auth" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sokkarak.mazboot',
  appName: 'Sokkarak Mazboot',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '662932370603-jicgneel5u9vsdi6gegumq79vg9q390e.apps.googleusercontent.com',
      serverClientId: '662932370603-jicgneel5u9vsdi6gegumq79vg9q390e.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
