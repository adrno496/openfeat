import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartlife.hltrader',
  appName: 'HL TRADER',
  webDir: 'www',
  android: {
    buildOptions: {
      keystorePath: '~/hl-trader-release.jks',
      keystoreAlias: 'hltrader',
    },
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#00D4FF',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#080C10',
    },
  },
};

export default config;
