# Wemos D1 Mini Pro (ESP8266) - Project Files

Folder ini berisi skrip pengujian hardware untuk papan pengembangan **Wemos D1 Mini Pro** (ESP8266 dengan flash 16MB).

---

## 📁 Berkas yang Tersedia

1. **[wemosdsatuminipro.ino](file:///Users/zaq/wemosdsatuminipro/wemosdsatuminipro.ino)**:
   - Skrip utama untuk **Arduino IDE** / PlatformIO (C++).
   - Menguji LED Onboard (GPIO 2 / D4, Active LOW).
   - Membaca informasi chip (ID, ukuran flash, frekuensi CPU).
   - Memindai jaringan WiFi di sekitar.
   - Menerima interaksi lewat Serial Monitor (`s` untuk scan ulang, `i` untuk info status).

2. **[main.py](file:///Users/zaq/wemosdsatuminipro/main.py)**:
   - Skrip alternatif jika board Anda menggunakan firmware **MicroPython**.
   - Menjalankan uji blink LED, scan WiFi, dan pemantauan memori RAM.

---

## 📌 Pinout Wemos D1 Mini Pro

| Pin Board | ESP8266 GPIO | Fungsi / Catatan |
|-----------|--------------|-------------------|
| **D0**    | GPIO16       | Deep Sleep Wake   |
| **D1**    | GPIO5        | I2C SCL           |
| **D2**    | GPIO4        | I2C SDA           |
| **D3**    | GPIO0        | Flash Boot (Pull-up 10k) |
| **D4**    | GPIO2        | **LED_BUILTIN** (Active LOW, Pull-up 10k) |
| **D5**    | GPIO14       | SPI SCK           |
| **D6**    | GPIO12       | SPI MISO          |
| **D7**    | GPIO13       | SPI MOSI          |
| **D8**    | GPIO15       | SPI SS (Pull-down 10k) |
| **A0**    | A0 (ADC0)    | Input Analog (0 - 3.2V) |
| **3V3**   | 3.3V         | Tegangan kerja logika |
| **5V**    | 5V           | Input daya USB / regulator |
| **G**     | GND          | Ground            |

---

## ⚙️ Petunjuk Upload via Arduino IDE

1. **Install Board ESP8266**:
   - Masuk ke *Settings / Preferences* -> *Additional Board Manager URLs*:
     `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - Buka *Board Manager*, cari `esp8266` dan pasang.
2. **Konfigurasi Board**:
   - **Board**: `LOLIN(WEMOS) D1 mini Pro` (atau `LOLIN(WEMOS) D1 R2 & mini`)
   - **Flash Size**: `16MB (FS:14MB OTA:~1019KB)` *(Pro memiliki chip 16MB)*
   - **Upload Speed**: `921600` atau `115200`
   - **Port**: Pilih port serial USB (biasanya menggunakan driver CP2104 / CH340).
3. **Serial Monitor**:
   - Set baudrate ke **`115200`**.
