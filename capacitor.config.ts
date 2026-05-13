import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.meryemdilber.mderisim",
  appName: "MD Erişim",
  webDir: "www",
  bundledWebRuntime: false,
  ios: {
    contentInset: "automatic",
    scrollEnabled: false
  }
};

export default config;
