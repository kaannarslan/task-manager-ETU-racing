# TOBB ETÜ Racing Yönetim Paneli — Tasarım Dokümanı

Tarih: 2026-11-12
Durum: Onay bekliyor

## Amaç ve Neden

TOBB ETÜ Racing Formula Student takımı (~40 kişi; mekanik, elektrik,
yazılım, organizasyon departmanları) için iş takip uygulaması.
Görevler şu an dağınık yürüyor; takımın departman bazlı kanban
board'larıyla kimin ne yaptığını ve deadline'ları tek yerden görmesi
hedefleniyor.

Kritik kısıt: projeyi yazan kişi Mayıs 2027'de mezun oluyor. Uygulama
ondan sonra takımdan başka bir öğrenciye devredilecek. Bu yüzden
"sade ve devredilebilir" her kararın üstünde: az bağımlılık, standart
pattern'ler, tek yerde toplanmış iş mantığı, ücretsiz katmanda çalışan
servisler.

## Hedefler (MVP)

- Takım davet koduyla kayıt, e-posta + şifre ile giriş (Supabase Auth).
- Dört departman, her birinin kanban board'u. Kolonlar sabit:
  **Yapılacak → Devam Ediyor → Blokeli → Tamamlandı**.
- Görev kartı: başlık, açıklama, sorumlu, durum, deadline, ekler.
- Görev board'un departmanına aittir ama **sorumlusu herhangi bir
  departmandan** olabilir (departmanlar arası çalışma yaygın).
- Görev eki: küçük dosya yükleme (Supabase Storage) **veya** link
  yapıştırma (büyük CAD dosyaları / Drive klasörleri için).
- "Görevlerim" sayfası: kişiye atanmış tüm görevler, tüm
  board'lardan, deadline sırasıyla.
- Minimal admin paneli (tek sayfa): üye listesi, departman atama,
  admin yapma/çıkarma, davet kodunu görüntüleme/yenileme.
- Board'da canlı güncelleme (Supabase Realtime): iki kişi aynı anda
  bakarken kart hareketleri anında yansır.

## Hedef Olmayanlar (MVP dışı, ileride eklenebilir)

- Departman döküman arşivi ve Google Drive entegrasyonu (arşiv
  şimdilik Drive'da kalıyor; kartlara Drive linki eklemek bu ihtiyacın
  çoğunu karşılıyor).
- Özelleştirilebilir kanban kolonları.
- Yorumlar, bildirimler, e-posta hatırlatmaları.
- Çoklu takım / sezon desteği.
- Mobil uygulama (responsive web yeter).

## Anti-Hedefler (bunlar olursa proje başarısız sayılır)

- Devralan öğrencinin anlayamayacağı karmaşıklık: egzotik kütüphane,
  dağınık state management, SQL politikalarına gömülü iş mantığı.
- Ücretli servis zorunluluğu. Her şey Supabase + Vercel ücretsiz
  katmanında çalışmalı.
- Bakım gerektiren özellik şişkinliği.

## Kısıtlar

- Stack sabit: **Next.js (App Router) + Supabase + Vercel**.
- Supabase ücretsiz katman: ~1 GB depolama. Büyük dosyalar yüklenmez,
  link olarak eklenir; dosya yüklemeye boyut limiti konur.
- UI dili Türkçe; kod, veritabanı şeması ve teknik dokümantasyon
  İngilizce (devralan için standart).
- İlham: Notion'un sade, temiz görünümü. UI tasarımı geliştiriciye
  bırakıldı.

## Yaklaşımlar

Değerlendirilen üç mimari:

- **A — İnce istemci:** `supabase-js` doğrudan tarayıcıdan, tüm yetki
  RLS'te. En az kod ama iş mantığı SQL politikalarına dağılıyor,
  devralan kişi için okunması zor.
- **B — Sunucu öncelikli (seçilen):** Okumalar Server Component'lerde,
  yazmalar `app/actions/` altında Server Action'larda. RLS açık kalır
  ama **ikinci kilit** görevi görür; asıl mantık tek klasörde okunabilir
  TypeScript. Güncel Next.js standardı; "sade ve devredilebilir"
  hedefiyle en uyumlusu. Kullanıcı bu seçeneği onayladı.
- **C — Ayrı API katmanı:** 40 kişilik iç araç için gereksiz ağırlık,
  elendi.

## Kararlaştırılan Nasıllar

### Üyelik ve roller
- Kayıt ekranı tek bir **takım davet kodu** ister; kod doğruysa hesap
  açılır. Kod admin panelinden görüntülenir ve yenilenebilir
  (`app_settings` benzeri tek satırlık tabloda tutulur).
- İki rol: **admin** ve **üye**. Adminler: departman atama, her görevde
  tam yetki, görev silme, admin yapma/çıkarma, davet kodu yönetimi,
  üye pasifleştirme.
- Yeni üye kayıtta departmanını seçer; admin sonradan değiştirebilir.
- E-posta doğrulama **kapalı** (davet kodu zaten kapı görevi görüyor;
  Supabase'in yerleşik e-posta servisi düşük limitli). Şifre sıfırlama
  Supabase'in yerleşik e-postasıyla yapılır — sıfırlama nadirdir, limit
  yeterli; sorun olursa ücretsiz bir SMTP'ye geçiş README'de not edilir.
  [geliştirici kararı]
- **Bootstrap:** seed migration ilk davet kodunu oluşturur; **ilk kayıt
  olan kullanıcı otomatik admin olur** ve bu README'de açıkça yazılır.
  [geliştirici kararı]
- **Üye ayrılması:** `profiles.is_active` bayrağı; admin panelinden
  pasifleştirilen üye giriş yapamaz, geçmiş görevlerindeki sorumlu
  bilgisi korunur, görevleri yeniden atanabilir. Auth kullanıcısı
  silinmez. [geliştirici kararı]

### Yetki modeli
- **Okuma:** giriş yapmış herkes her board'u ve her görevi görür.
- **Oluşturma:** herkes her board'a görev açabilir (kullanıcı kararı;
  departmanlar arası çalışma yaygın, silme zaten admin'de).
- **Yazma:** kendi departmanının board'undaki görevler + departman
  fark etmeksizin sorumlusu olduğu görevler. Sorumlu, görevin tüm
  alanlarını düzenleyebilir; görevi başkasına devredebilir (devrettiği
  an, görev kendi departmanında değilse yazma yetkisi biter).
  [geliştirici kararı] Adminler her yerde.
- **Silme:** yalnız adminler.
- Bu kurallar Server Action'larda uygulanır; RLS aynı kuralları
  veritabanı seviyesinde ikinci kilit olarak tekrarlar.

### Veri modeli (ana hatlar)
- `departments`: 4 kayıt seed edilir (mekanik, elektrik, yazılım,
  organizasyon).
- `profiles`: auth kullanıcısına 1-1; ad soyad, `department_id`,
  `is_admin`.
- `tasks`: `title`, `description`, `department_id` (board),
  `assignee_id` (herhangi bir üye, **boş olabilir**), `status`
  (`todo | in_progress | blocked | done`), `deadline` (**boş
  olabilir**), `created_by`, zaman damgaları. Sorumsuz görevleri kendi
  departmanının üyeleri ve adminler düzenler (mevcut yazma kuralı zaten
  kapsıyor). [geliştirici kararı]
- `attachments`: `task_id`, tür (`file | link`), dosya yolu veya URL,
  görünen ad.

### Sayfalar
- Giriş / kayıt (davet kodlu).
- Departman board'u: 4 kolonlu kanban, sürükle-bırak (@dnd-kit),
  Realtime ile canlı. Departmanlar arası geçiş için switcher.
  "Tamamlandı" kolonu yalnız **son 30 günde** tamamlananları gösterir;
  eski kayıtlar veritabanında kalır (sezon boyunca kolonun şişmemesi
  için). [geliştirici kararı]
- Görev detayı: oluşturma/düzenleme formu ve ekler.
- Görevlerim: deadline sıralı liste.
- Admin paneli: tek sayfa.

### Teknoloji çağrıları
- UI: **Tailwind + shadcn/ui** (hazır, erişilebilir bileşenler).
- Sürükle-bırak: **@dnd-kit**.
- Canlı güncelleme: **Supabase Realtime**, yalnızca board sayfasında
  (`tasks` tablosuna abonelik).
- Supabase istemcileri: `@supabase/ssr` ile sunucu/istemci ayrımı.
- Bunların dışına yeni bağımlılık eklenmez.

### Devir planı
- README: kurulum, Supabase projesi oluşturma, migration/seed çalıştırma,
  Vercel deploy adımları — sıfırdan kuracak öğrenci için yazılır.
- Admin devri uygulama içinden tek tık (admin yapma/çıkarma).
- Veritabanı şeması migration dosyalarında versiyonlu tutulur.

## Geliştiriciye Bırakılanlar

- UI tasarımın tamamı: renk paleti, tipografi, boşluk düzeni,
  Notion-vari sadelik nasıl yorumlanır (ui-ux-pro-max skill'i
  kullanılacak).
- Görev detayının modal mı ayrı sayfa mı olacağı.
- Dosya yükleme boyut limiti ve izin verilen türler.
- Kanban içi kart sıralaması (kolon içinde manuel sıra tutulacak mı,
  yoksa deadline/oluşturma sırası mı).
- Form doğrulama ve hata mesajı ayrıntıları.
- Seed/migration dosyalarının düzeni.
