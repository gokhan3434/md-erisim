# MD Erişim iPhone Uygulaması

Bu klasör, sunucudan bağımsız çalışan offline iPhone uygulama paketidir.

## İçerik

- `www/`: Uygulamanın offline çalışan arayüzü ve veri dosyası
- `www/data/residents.json`: Uygulama içine gömülü villa kayıtları
- `capacitor.config.ts`: iOS uygulama yapılandırması
- `package.json`: Capacitor bağımlılıkları

## Not

Bu ortam Windows olduğu için imzalı `.ipa` dosyası burada üretilemez. iPhone'a gerçek yükleme için bir Mac üzerinde Xcode ile derleme ve Apple imzası gerekir.
