import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e5a7747a093546df9ea91308e76636dc',
  appName: 'promo-sync-suite',
  webDir: 'dist',
  server: {
    url: 'https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;