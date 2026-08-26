import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ccommit.dodgelab',
  appName: 'DODGE LAB',
  webDir: 'dist',
  // 게임 배경색과 동일하게 — 부팅·회전 시 흰 플래시를 막는다.
  backgroundColor: '#0b1220',
};

export default config;
