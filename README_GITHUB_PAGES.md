# MD Erişim GitHub Pages Yayını

Bu klasör, uygulamanın GitHub Pages üzerinden yayınlanacak statik sürümüdür.

## Önemli

Bu yayın biçimi gerçek gizlilik sağlamaz. Çünkü:

- `data/residents.json` herkes tarafından indirilebilir
- giriş kontrolü tarayıcı içinde çalışır
- kullanıcı adı ve şifre teknik olarak kaynak dosyalarda görülebilir

Bu yüzden bu sürüm ancak kolay paylaşım içindir. Gerçek güvenli kullanım için sunuculu sürüm gerekir.

## Windows'tan yayın adımları

1. GitHub hesabında yeni bir repo oluştur.
   Örnek: `md-erisim`

2. Bu klasördeki tüm dosyaları repoya yükle.
   Yüklenecek dosyalar:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `assets/`
   - `data/`
   - `.nojekyll`

3. GitHub'da repo içine gir.

4. `Settings > Pages` bölümünü aç.

5. `Build and deployment` altında:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`

6. Kaydet.

7. Birkaç dakika sonra link oluşur:
   - `https://kullaniciadi.github.io/repo-adi/`

## iPhone kurulumu

1. Safari ile linki aç.
2. `Paylaş` tuşuna bas.
3. `Ana Ekrana Ekle` seç.
4. Uygulama gibi aç.

## Varsayılan giriş

- Kullanıcı adı: `admin`
- Şifre: `Acarkent2026!`
