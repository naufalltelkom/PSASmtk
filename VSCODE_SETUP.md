# Panduan Menjalankan MathCipher 3D di Visual Studio Code (VS Code)

Game ini dibangun menggunakan **React 19 + TypeScript + Vite + Tailwind CSS + Three.js**. Ikuti langkah-langkah mudah di bawah ini untuk membuka dan menjalankannya secara lokal di komputer Anda:

---

## 1. Persiapan Awal
Pastikan komputer Anda sudah terpasang:
- **Node.js** (versi 18 ke atas disarankan). Cek dengan perintah di terminal:
  ```bash
  node -v
  npm -v
  ```
- **Visual Studio Code** (VS Code).

---

## 2. Struktur Folder Proyek
Pastikan struktur file di folder proyek Anda tertata seperti berikut:

```
mathcipher-3d/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── game/
    │   ├── types.ts         # Definisi tipe TypeScript & state game
    │   ├── cipher.ts        # Logika matematika enkripsi & dekripsi modulo 26
    │   ├── audio.ts         # Sintesis suara prosedural Web Audio API
    │   ├── character.ts     # Rig 3D karakter & kinematika jalan/lari
    │   ├── world.ts         # Labirin 3D Backrooms, tekstur HD & partikel debu
    │   └── controls.ts      # Fisika gerakan, deteksi tabrakan & kamera orbit
    └── components/
        ├── HUD.tsx          # Radar minimap taktis, timer, darah & objektif
        ├── TerminalModal.tsx # Terminal enkripsi, panduan invers & kalkulator uji
        ├── StartScreen.tsx  # Layar judul & pemilihan tingkat kesulitan
        ├── EndScreen.tsx    # Layar hasil misi (Victory / Defeat)
        └── TouchControls.tsx # Virtual joystick untuk layar sentuh
```

---

## 3. Langkah Menjalankan di VS Code

1. **Buka Folder di VS Code**:
   - Buka aplikasi VS Code.
   - Pilih menu `File` > `Open Folder...` dan pilih folder proyek ini.

2. **Buka Terminal Terintegrasi**:
   - Tekan `Ctrl + \`` (backtick) atau pilih menu `Terminal` > `New Terminal`.

3. **Pasang Dependensi (*Install Packages*)**:
   Jalankan perintah berikut di terminal:
   ```bash
   npm install
   ```

4. **Jalankan Server Development**:
   Setelah instalasi selesai, jalankan:
   ```bash
   npm run dev
   ```

5. **Buka di Browser**:
   Buka peramban (Chrome, Edge, Firefox, atau Brave) dan kunjungi alamat:
   ```
   http://localhost:3000
   ```
   *(Atau klik link lokal yang muncul di terminal VS Code).*

---

## 4. Tombol Kontrol Permainan
- **W / A / S / D** atau **Panah**: Menggerakkan karakter (W maju mengikuti kamera, S berbalik arah mundur, A/D belok kiri/kanan).
- **SHIFT**: Lari cepat (*Sprint*) disertai efek suara desau angin dan entakan langkah kaki.
- **Tarik Mouse (*Drag*)**: Memutar sudut pandang kamera 3D di sekitar karakter.
- **E**: Berinteraksi dengan Terminal Enkripsi atau membuka Pintu Keluar.
- **ESC**: Menutup terminal / pause.
