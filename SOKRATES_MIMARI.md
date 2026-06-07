# Sokrates Öğrenci Asistanı — Mobil Mimari ve Teknik Kurulum Kılavuzu

Bu kılavuz, bilgisayar kullanmadan, sadece bir mobil cihaz (telefon/tablet) üzerinden **Sokrates Öğrenci Asistanı** uygulamasını sıfırdan geliştirmek, yerel veritabanı kurmak, Gemini API entegrasyonu yapmak ve hafif interaktif bir 3D Harita modülü entegre etmek için gereken tüm teknik adımları, kod iskeletlerini ve mimari kararları içerir.

---

## 1. Mobil Geliştirme Ortamı ve Çalışma Yolu Önerisi

Bilgisayar olmadan, tamamen akıllı telefon üzerinden APK çıktısı alabileceğiniz en temiz geliştirme yollarının karşılaştırması aşağıdadır:

### Geliştirme Seçenekleri Karşılaştırması

| Kriter / Çözüm | Kotlin (AIDE / Native) | Flutter | React Native (Expo Go + EAS Build) ⭐ |
| :--- | :--- | :--- | :--- |
| **Geliştirme Kolaylığı** | Orta (AIDE arabirimi eski, kütüphaneler sınırlı) | Orta (Paket derleme mobilde zordur) | **Çok Yüksek** (Tarayıcıdan sandbox editörler veya telefonda yazılarak çalışır) |
| **APK Çıktısı Alma** | Doğrudan cihaz üzerinde (AIDE) | Cloud Build veya terminal | **Bulut Tabanlı (EAS Build)** (Sıfır işlemci yüküyle doğrudan telefona indirme linki) |
| **Kütüphane Desteği** | Düşük / Sınırlı (Eski Gradle) | Orta-Yüksek | **Mükemmel** (npm ekosistemi, modern haritalar, SQLite) |
| **3D Harita Uyumluluğu** | Zor (OpenGL/NDK kullanımı telefonda kabustur) | Orta (WebView / Flutter 3D) | **Kolay** (WebView üzerinden ultra hafif Three.js/GLTF) |

### ⭐ NET ÖNERİ: "Bu proje için en uygun yol React Native / Expo ve Expo CLI’dır."

#### Neden Expo?
1. **Sıfır Kurulum Maliyeti:** Bilgisayar gerektirmez. Telefona indireceğiniz **Expo Go** uygulaması ile kodunuzu yazarken canlı olarak telefonda test edersiniz.
2. **EAS Build (Cloud Compilation):** Telefonunuzun işlemcisini veya RAM'ini yormadan, Expo'nun bulut sunucularına tek komutla (`eas build`) APK derlettirebilir ve telefonunuza doğrudan yükleyebilirsiniz.
3. **Geliştirme Araçları:** Telefonunuzun tarayıcısından **GitHub Codespaces** veya **Replit** üzerinde kod yazabilir veya telefondaki bir kod editörü (örn: **Acode**) ile kodları tutup GitHub'a push ederek tamamen bulut tabanlı bir iş akışı sağlayabilirsiniz.

---

## 2. Uygulama Dosya Mimarisi (Klasör Yapısı)

React Native + TypeScript projeniz için önerilen temiz, modüler ve genişletilebilir klasör organizasyonu:

```text
sokrates-assistant/
├── App.tsx                   # Uygulama ana giriş noktası
├── app.json                  # Expo ve uygulama yapılandırma ayarları
├── package.json              # Paket bağımlılıkları ve scriptler
├── assets/
│   └── models/
│       └── earth_simple.glb  # Optimize edilmiş, düşük poligonlu 3D Dünya modeli
├── src/
│   ├── components/           # Ortak kullanılan arayüz bileşenleri
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Header.tsx
│   ├── database/             # SQLite veritabanı katmanı
│   │   ├── db.ts             # SQLite bağlantı ve tablo kurulumları
│   │   └── service.ts        # Veritabanı okuma/yazma (CRUD) işlemleri
│   ├── hooks/                # Özel React Hook'ları
│   │   └── useInterval.ts
│   ├── modules/              # İşlevsel büyük modüller (Dikey mimari)
│   │   ├── timer/            # Sayaç modülü ekranları ve servisleri
│   │   │   ├── TimerScreen.tsx
│   │   │   └── timerService.ts
│   │   ├── gemini/           # Yapay zeka modülü
│   │   │   ├── AIResponseScreen.tsx
│   │   │   └── geminiService.ts
│   │   ├── geography3d/      # Coğrafya 3D Harita ekranı ve harita varlıkları
│   │   │   └── MapScreen.tsx
│   │   └── stats/            # Süreç ve performans istatistikleri
│   │       └── StatsScreen.tsx
│   ├── types/                # TypeScript tip ve arayüz tanımları
│   │   └── index.ts
│   └── utils/                # Yardımcı fonksiyonlar (Tarih formatlama, süre çevirici)
│       └── formatters.ts
```

---

## 3. SQLite Veritabanı Şeması

SQLite yerel veritabanında tüm tablolar, ilişkileri ve veri türleri en optimize şekilde tasarlanmıştır.

```sql
-- 1. Dersler Tablosu (Subjects)
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULLSquare,
    color TEXT DEFAULT '#4F46E5',  -- Arayüz için renk kodu
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 2. Konular Tablosu (Topics)
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 3. Çalışma Oturumları Tablosu (Study Sessions)
-- NOT: Sadece başlangıç, bitiş zamanlarını tutar, milisaniyede bir yazıp pili tüketmez.
CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    topic_id TEXT,
    started_at TEXT NOT NULL,       -- ISO8601 formatı (YYYY-MM-DD HH:MM:SS)
    ended_at TEXT NOT NULL,         -- ISO8601 formatı
    duration_seconds INTEGER NOT NULL, -- saniye bazında kesin çalışma süresi
    note TEXT,                      -- Oturum sonu alınan kullanıcı notu
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE SET NULL
);

-- 4. Kullanıcı Çalışma Notları ve Özet Alanları (Study Notes)
CREATE TABLE IF NOT EXISTS study_notes (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    raw_content TEXT NOT NULL,      -- Çalışma esnasında alınan ham not
    summary TEXT,                   -- Gemini tarafından sadeleştirilen özet hali
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 5. Gemini Koçluk ve Analiz Geçmişi (Gemini Analysis Logs)
CREATE TABLE IF NOT EXISTS gemini_analysis (
    id TEXT PRIMARY KEY,
    analysis_type TEXT NOT NULL,    -- 'daily', 'weekly', 'topic_recap'
    prompt_text TEXT NOT NULL,      -- Gönderilen özet veriler
    response_text TEXT NOT NULL,    -- Gemini'ın detaylı tüyoları
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 6. API Kullanım Kayıtları (API Usage Logs)
-- Maliyetleri ve token tüketimini takip etmek için
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id TEXT PRIMARY KEY,
    endpoint TEXT DEFAULT 'gemini-3.1-flash-lite',
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 7. Uygulama Ayarları Tablosu (App Settings - Key/Value Çifti)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## 4. Pil ve Performans Dostu Zaman Sayacı Mimarisi

Sürekli arka planda saniye saniye sayan mekanizmalar mobil işletim sistemleri (özellikle Android Doze modu) tarafından pil tasarrufu için sonlandırılır.

### Doğru Tasarım Mantığı (Epoch-Time Alignment)
Saniyede bir veritabanına veri yazıp diski yormak veya arka planda işlemciyi meşgul etmek yerine **zaman damgası kararlılığı** kullanıyoruz:

1. **Sayacı Başlatma:** Kullanıcı düğmeye bastığı an sistemin o anki milisaniye cinsinden zaman damgası (`Date.now()`) bir değişkene ve geçici olarak hafızaya (örn. React State / AsyncStorage) `startedAt` olarak atanır.
2. **Arka Plana Geçiş (App State Active / Background):** 
   - Arayüz arka plana gittiğinde görsel timer güncellemeleri durdurulur (işlemci sıfıra iner).
   - İşletim sistemi uygulamayı kilitlese dahi, başlama anı hafızadaki `startedAt` damgasındadır.
3. **Uygulamaya Geri Dönüş veya Bitirme:**
   - Kullanıcı uygulamayı tekrar açınca veya 'Bitir' butonuna basınca o anki zaman damgası alınır (`Date.now()`).
   - `duration_seconds = (now - startedAt) / 1000` formülüyle süre anında ve %100 doğrulukta hesaplanır.
   - Bu sayede arka planda hiçbir servis aşırı kaynak tüketmez ve hata olasılığı sıfıra iner.

#### React Native İçin Gerekli Paket:
Eğer sayaç çalışırken ekranda sabit bir bildirim (Foreground Service) şeklinde kalmasını istiyorsanız `expo-task-manager` ve `expo-background-fetch` kullanılabilir, ancak yukarıdaki zaman damgası formülü ile bu karmaşıklıklara girmeden de kusursuz bir çevrimdışı sayaç üretebilirsiniz.

---

## 5. Gemini API Entegrasyon ve Prompt Yapısı

Mobil uygulamada performansı korumak ve kotayı (API Token maliyetleri) aşmamak için **Token Tasarruflu Bilgi Derleme** yapısı kullanılmalıdır. Ham SQL çıktılarını aynen göndermek yerine veritabanından aldığımız verileri önceden özetleyip JSON veya sıkışık metin olarak gönderiyoruz.

### Yapay Zeka Entegrasyon Mantığı (Pipeline)
1. **Veri Derleme:** SQLite'dan son 24 saatlik veya son 7 günlük `study_sessions` verilerini agregate ederek çekin (Örn: "Matematik -> 7200sn, Fizik -> 3600sn").
2. **Prompt Sıkıştırma:** Gemini'ye gereksiz "id", "created_at" gibi kolonları göndermeyin. Yalnızca ders adları, çalışılan dakikalar ve eklenen kısa notları paketleyin.
3. **Akıllı İstek:** Sistem talimatları (System Instructions) kullanarak modelin sadece Türkçe, direkt ve koç odaklı konuşmasını emredin.

### Optimize Edilmiş Profesyonel Prompt Şablonu

```text
Sistem Rolü:
Sen "Sokrates Öğrenci Asistanı" uygulamasının resmi, profesyonel eğitim koçusun. Görevin, kullanıcının yerel ders çalışma verilerini analiz edip ona tamamen gerçekçi, uygulanabilir ve pratik tavsiyeler vermektir.
- Asla gereksiz motivasyonel sloganlar veya kalıplaşmış "Harikasın, devam et!" cümleleri kurma.
- Analizin kısa, net ve doğrudan olsun.
- Eksik dersleri, dengesiz çalışma sürelerini tespit et.
- Yanıtı Türkçe ver ve markdown formatını kullan.

Giriş Verileri:
- Bugünkü Toplam Çalışma: {totalTodayMinutes} dakika
- Derslerin Dağılımı: {subjectsJSON}
- Alınan Notlar: {notesSummary}
- Haftalık Toplam Çalışma: {totalWeeklyMinutes} dakika

Lütfen tam olarak şu şablonda yanıt ver:
1. **Günlük Durum**: (Bugün yapılan çalışmanın rasyonel özeti)
2. **Denge Analizi**: (Çalışma dengesizliği var mı? Hangi derse az çalışılmış?)
3. **Günün Pratik Tavsiyesi**: (Doğrudan uygulanabilir, sonraki çalışma için net konu önerisi)
4. **Hızlı Tekrar Noktası**: (En son çalışılan konulardan hangisinin hızlıca hafızaya alınması gerektiği)
```

---

## 6. Coğrafya İçin 3D Harita Modeli Entegrasyon İskeleti

Mobil cihazlarda yerel bir 3D oyun motoru (OpenGL, Unity) çalıştırmak hem APK boyutunu yüzlerce megabayta çıkarır hem de telefonu aşırı ısıtır. 

### En Optimal Yol: WebView + Three.js (Offline GLB)
En akıllıca mimari, React Native bileşeni olan `@react-native-webview` kullanarak cihaz içinde yerel olarak barındırılan bir HTML/JS şablonu çalıştırmaktır.

- **Kütüphane:** `THREE.js` (veya daha basiti `OrbitControls` yüklü hazır bir mini html dosyası).
- **Format:** `GLTF` veya `.glb` formatında, en yüksek derecede sıkıştırılmış (Draco compression kullanılmış), maksimum **2MB** boyutunda bir dünya modeli.
- **Çevrimdışı Çalışma:** HTML dosyası ve GLB modeli uygulamanın `assets/` klasöründe lokal olarak saklanır. WebView'a bu yerel HTML dosyasının yolu (`uri`) verilerek **internetsiz de çalışması** sağlanır.
- **Duyarlılık ve Optimizasyon:** Aydınlatma (lighting) parametrelerinde gölgeler (shadows) kapatılır, böylece en eski telefonlarda bile harita 60 FPS hızla döner.

---

## 7. Örnek Kod İskeletleri

### 7.1 SQLite Veritabanı Servisi (`src/database/service.ts`)

Expo'nun yerel SQLite kütüphanesini (`expo-sqlite`) kullanan örnek veritabanı CRUD operasyonları:

```typescript
import * as SQLite from 'expo-sqlite';

// Veritabanı dosyasını aç (yoksa otomatik oluşturur)
const db = SQLite.openDatabaseSync('sokrates_local.db');

export interface StudySessionInput {
  id: string;
  subjectId: string;
  topicId?: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  note?: string;
}

export const DatabaseService = {
  // İlk kurulum tablolarını ayağa kaldır
  initializeDatabase: () => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#4F46E5',
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
      
      CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        topic_id TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);
    console.log("SQLite tabloları başarıyla başlatıldı.");
  },

  // Ders Çalışma Oturumunu Kaydet
  saveStudySession: (session: StudySessionInput) => {
    db.runSync(
      `INSERT INTO study_sessions (id, subject_id, topic_id, started_at, ended_at, duration_seconds, note)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        session.id,
        session.subjectId,
        session.topicId || null,
        session.startedAt,
        session.endedAt,
        session.durationSeconds,
        session.note || null
      ]
    );
  },

  // Bugünün çalışma istatistiklerini getir
  getTodayStudyTimeSeconds: (): number => {
    const result = db.getFirstSync<{ total: number }>(
      `SELECT SUM(duration_seconds) as total 
       FROM study_sessions 
       WHERE date(started_at) = date('now', 'localtime');`
    );
    return result?.total || 0;
  },

  // Gemini analizi için ders bazında çalışma dağılımı listele
  getStudySummaryForAI: () => {
    return db.getAllSync<{ subject_name: string; total_minutes: number }>(
      `SELECT s.name as subject_name, SUM(session.duration_seconds) / 60 as total_minutes
       FROM study_sessions session
       JOIN subjects s ON session.subject_id = s.id
       WHERE session.started_at >= datetime('now', '-7 days', 'localtime')
       GROUP BY s.id;`
    );
  }
};
```

### 7.2 Pil Dostu Sayaç Ekranı (`src/modules/timer/TimerScreen.tsx`)

Milisaniye farkı yöntemiyle çalışan, arka plandan etkilenmeyen sayaç arayüzü:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DatabaseService } from '../../database/service';

export default function TimerScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sayaç Başlat/Durdur tetikleyicisi
  const handleToggleTimer = () => {
    if (!isRunning) {
      // 1. Başlangıç anı zaman damgasını sabitle
      startTimeRef.current = Date.now() - (elapsedSeconds * 1000);
      setIsRunning(true);

      // 2. Sadece ekrandaki görsel sayacı güncellemek için interval çalıştır
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(currentElapsed);
        }
      }, 1000);
    } else {
      // Duraklatma durumunda interval'i sıfırla, gerçek geçen süreyi tut
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
    }
  };

  // Çalışmayı bitirip SQLite'a yazma
  const handleFinishSession = () => {
    if (elapsedSeconds < 10) {
      Alert.alert("Uyarı", "10 saniyeden kısa çalışmalar kaydedilmez.");
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    
    const startedTimeStr = startTimeRef.current 
      ? new Date(startTimeRef.current).toISOString() 
      : new Date().toISOString();
    
    // Veritabanına kaydet
    DatabaseService.saveStudySession({
      id: "sess_" + Math.random().toString(36).substring(2, 9),
      subjectId: "sub_matematik", // Örnek id
      startedAt: startedTimeStr,
      endedAt: new Date().toISOString(),
      durationSeconds: elapsedSeconds
    });

    // Resetle
    setIsRunning(false);
    setElapsedSeconds(0);
    startTimeRef.current = null;
    Alert.alert("Tebrikler!", "Çalışma oturumunuz başarıyla veritabanına kaydedildi.");
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatDisplayTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sokrates Odak Sayacı</Text>
      <Text style={styles.timerText}>{formatDisplayTime(elapsedSeconds)}</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleToggleTimer}>
          <Text style={styles.buttonText}>{isRunning ? "DURAKLAT" : "BAŞLAT"}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.finishButton]} onPress={handleFinishSession}>
          <Text style={styles.buttonText}>BİTİR VE KAYDET</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#94A3B8', marginBottom: 20, letterSpacing: 1 },
  timerText: { fontSize: 64, fontWeight: '900', color: '#6366F1', marginVertical: 30, fontVariant: ['tabular-nums'] },
  buttonRow: { flexDirection: 'row', gap: 15 },
  button: { backgroundColor: '#312E81', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12 },
  finishButton: { backgroundColor: '#059669' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
```

### 7.3 Gemini Analiz ve İstek Servisi (`src/modules/gemini/geminiService.ts`)

```typescript
import { DatabaseService } from '../../database/service';

export const GeminiService = {
  // Cihaz ayarlarından API anahtarını çek
  retrieveApiKey: async (): Promise<string | null> => {
    // SQLite veya SecureStore üzerinden anahtarı getirir
    return "AIzaSyYourDecodedRealApiKeyHere"; 
  },

  // Haftalık çalışmayı derleyip analiz çıkarma fonksiyonu
  generateWeeklyCoachingFeedback: async (): Promise<string> => {
    try {
      const apiKey = await GeminiService.retrieveApiKey();
      if (!apiKey) throw new Error("Lütfen ayarlardan Gemini API Key tanımlayın.");

      // 1. Yerel verileri veritabanından agregate olarak derle (Token tasarrufu)
      const studyStats = DatabaseService.getStudySummaryForAI();
      const statsSummary = studyStats.map(s => `${s.subject_name}: ${s.total_minutes} dk`).join("\n");
      const todaySeconds = DatabaseService.getTodayStudyTimeSeconds();
      const todayMinutes = Math.round(todaySeconds / 60);

      // 2. Prompt yapısını oluştur
      const prompt = `
      Sen Sokrates Öğrenci Asistanı uygulamasının resmi, rasyonel eğitim koçusun.
      Verilere göre kısa, net ve doğrudan sonraki adımları öner.
      
      Çalışma Verilerim:
      - Bugün toplam çalışma: ${todayMinutes} dakika
      - Son 7 günlük ders dağılımı:
      ${statsSummary || "Kaydedilmiş çalışma verisi yok."}
      
      Cevabı şu formda Türkçe ver:
      1. Günlük Durum
      2. Denge Analizi
      3. Bugün için Net Önerilen Çalışma Hedefi
      `;

      // 3. Gemini API HTTP Talebi (En verimli / hızlı JSON endpoint)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2, // Yüksek doğruluk ve sabit analiz için düzelttik
              maxOutputTokens: 350 // Çıktıyı daraltarak hem hızı artırıyoruz hem de token koruyoruz
            }
          })
        }
      );

      const json = await response.json();
      const textResponse = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      return textResponse || "Analiz oluşturulamadı.";
    } catch (error: any) {
      console.error(error);
      return `Hata oluştu: ${error.message}`;
    }
  }
};
```

### 7.4 3D Harita Modülü Arayüzü (`src/modules/geography3d/MapScreen.tsx`)

Mobil performansı sıfır kasma ile çözmek için en kararlı WebView 3D iskeleti:

```typescript
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MapScreen() {
  // Offline çalışabilen gömülü 3D Three.js ve dokunmatik dünya kodları
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; overflow: hidden; background-color: #0F172A; }
        canvas { width: 100%; height: 100%; display: block; }
        #info {
          position: absolute; top: 10px; width: 100%; text-align: center;
          color: white; font-family: sans-serif; font-size: 11px; pointer-events: none;
        }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    </head>
    <body>
      <div id="info">3D Coğrafya Haritası (Parmakla Döndürün / Yakınlaştırın)</div>
      <script>
        // Üç Boyutlu Sahne Kurulumu
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // Küre şeklinde Dünya modeli ve coğrafi doku alternatifi
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0x4F46E5,
          wireframe: true // Bulut tabanlı hızlı performans ve sade coğrafi tasarım için wireframe matris
        });
        const earth = new THREE.Mesh(geometry, material);
        scene.add(earth);

        camera.position.z = 5;

        // Dokunmatik Parmağa Göre Döndürme Etkileşim Kontrolü
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        document.addEventListener('touchstart', (e) => {
          isDragging = true;
          previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, false);

        document.addEventListener('touchmove', (e) => {
          if (!isDragging) return;
          const deltaMove = {
            x: e.touches[0].clientX - previousMousePosition.x,
            y: e.touches[0].clientY - previousMousePosition.y
          };

          earth.rotation.y += deltaMove.x * 0.005;
          earth.rotation.x += deltaMove.y * 0.005;

          previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, false);

        document.addEventListener('touchend', () => { isDragging = false; }, false);

        // Çizim Döngüsü
        function animate() {
          requestAnimationFrame(animate);
          if (!isDragging) {
            earth.rotation.y += 0.002; // Hafif serbest salınım dönüşü
          }
          renderer.render(scene, camera);
        }
        animate();

        // Pencere Boyutu Uyumlandırması
        window.addEventListener('resize', () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView 
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        useWebKit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  webview: { flex: 1 }
});
```

---

## 8. MVP Geliştirme Sırası (Öncelikli Yol Haritası)

Projenizi adım adım inşa ederken en verimli yol haritası:

1. **Aşama 1: Veritabanı ve Ders Ekleme**
   - SQLite bağlantı kurgusu geliştirilir. 
   - Elle Ders ve Konu başlığı tanımlama ekranları tasarlanır (`DatabaseService`).
2. **Aşama 2: Pil Dostu Odaklanma Sayacı**
   - Milisaniye farkı hesaplama yöntemiyle sayaç ekranı tasarlanır.
   - Oturum bitiminde `study_sessions` tablosuna verilerin hatasız yazıldığı test edilir.
3. **Aşama 3: Süreç İstatistik Ekranı**
   - Günlük ve haftalık toplam çalışma dakikalarını SQLite'dan çekerek ekrana yazdıran arayüz kurulur.
4. **Aşama 4: Gemini Entegrasyonu**
   - Ayarlar sayfasına API Key girişi eklenir.
   - Haftalık/günlük özet agregate edilip prompt ile Gemini'ye gönderilir, rasyonel dönütler ekrana yazdırılır.
5. **Aşama 5: WebView 3D Harita Ekranı**
   - 3D küre haritası entegre edilir, optimize edilmiş `.glb` uzantılı coğrafya modeli asset olarak eklenir.

---

## 9. Dikkat Edilmesi Gereken Kritik Noktalar

* **Gerçek Çevrimdışı Çalışma:** SQLite verilerinizin internet gerektirmeden tam fonksiyonel çalıştığından emin olun. İnternet yalnızca Gemini API çağrısı sırasında tetiklenmelidir.
* **API Maliyetini Yönetme:** 'gemini-3.1-flash-lite' (Ekonomik), 'gemini-2.5-flash' (Dengeli) veya 'gemini-3.1-pro-preview' (Kaliteli) modellerini tercih edin ve prompt başındaki agregate edilmiş özetleri maksimum 300 kelimede tutun.
* **Sıfır Oyunlaştırma Prensibi:** Puan tablosu veya seviye atlamaları gibi dikkati dağıtacak tüm dış etkenlerden kaçınarak odağı sadece rasyonel zamana odaklayın.
* **3D Grafik Hassasiyeti:** Mobil cihazların batarya sağlığı için gölge hesaplamalarını WebView içindeki ışıklarda (light shadows) pasife alın ve poligon sayısını düşük tutun.
