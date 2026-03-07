import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.app',
  appName: 'Lumina',
  webDir: 'dist',
  server: {
    // Remove this block for production — use only for live reload during development
    // androidScheme: 'https',
    // url: 'http://192.168.1.x:5173',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // We have our own custom splash
    },
    StatusBar: {
      backgroundColor: '#0a0a0f',
      style: 'DARK',
    },
  },
  ios: {
    scheme: 'Lumina',
    backgroundColor: '#0a0a0f',
  },
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: false,
  },
};

export default config;
