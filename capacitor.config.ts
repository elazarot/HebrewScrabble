import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hebrewscrabble.app',
  appName: 'שבץ נא',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.201:3000',
    cleartext: true
  }
};

export default config;
