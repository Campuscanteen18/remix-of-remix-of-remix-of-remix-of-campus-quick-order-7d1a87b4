import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ac6a2be2d4c641d7810bcbdebecd6536',
  appName: 'Campus Canteen',
  webDir: 'dist',
  server: {
    url: 'https://ac6a2be2-d4c6-41d7-810b-cbdebecd6536.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    backgroundColor: '#faf8f5'
  }
};

export default config;
