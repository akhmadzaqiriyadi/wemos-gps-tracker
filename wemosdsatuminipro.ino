/*
 * Wemos D1 Mini Pro (ESP8266) + GPS u-blox NEO-6M + WiFi Web Tracker
 * 
 * WiFi Hotspot:
 *   SSID     : iPhone 16 Pro Zaqi
 *   Password : zaqi24112003
 * 
 * Hardware Wiring:
 *   GPS VCC -> Wemos 5V (atau 3V3)
 *   GPS GND -> Wemos G (GND)
 *   GPS TX  -> Wemos D6 (GPIO 12) [SoftwareSerial RX]
 *   GPS RX  -> Wemos D7 (GPIO 13) [SoftwareSerial TX]
 * 
 * Fitur:
 *   1. Membaca satelit, koordinat (Lat/Lng), kecepatan, ketinggian secara real-time.
 *   2. Terhubung ke WiFi Hotspot (iPhone 16 Pro Zaqi).
 *   3. Embedded Web Server internal di IP Wemos (port 80) & endpoint /api/gps (JSON).
 *   4. Mengirim data HTTP POST ke Next.js Dashboard (/api/location).
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SoftwareSerial.h>
#include <TinyGPSPlus.h>

// Konfigurasi WiFi
const char* ssid     = "iPhone 16 Pro Zaqi";
const char* password = "zaqi24112003";

// URL Next.js Dashboard Server (IP laptop Anda saat konek ke Hotspot iPhone)
// Catatan: Jika Next.js dijalankan di laptop, IP ini akan otomatis terhubung di subnet yang sama
char serverUrl[128] = "http://192.168.110.96:3000/api/location"; 

// Pin GPS SoftwareSerial
static const int RXPin = 12; // D6 -> TX GPS
static const int TXPin = 13; // D7 -> RX GPS
static const uint32_t GPSBaud = 9600;

TinyGPSPlus gps;
SoftwareSerial ss(RXPin, TXPin);
ESP8266WebServer server(80);

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 2500; // Kirim update tiap 2.5 detik
unsigned long charsReceived = 0;

// Handler Endpoint JSON untuk Wemos Web Server
void handleGpsJson() {
  String json = "{";
  json += "\"valid\":" + String(gps.location.isValid() ? "true" : "false") + ",";
  json += "\"satellites\":" + String(gps.satellites.isValid() ? gps.satellites.value() : 0) + ",";
  json += "\"lat\":" + String(gps.location.lat(), 6) + ",";
  json += "\"lng\":" + String(gps.location.lng(), 6) + ",";
  json += "\"speed\":" + String(gps.speed.kmph(), 1) + ",";
  json += "\"altitude\":" + String(gps.altitude.meters(), 1) + ",";
  json += "\"chars\":" + String(charsReceived) + ",";
  json += "\"uptime_ms\":" + String(millis());
  json += "}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// Handler Halaman Utama Internal Wemos
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>Wemos D1 Mini GPS</title>";
  html += "<style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:20px;text-align:center}";
  html += ".card{background:#1e293b;border-radius:16px;padding:20px;max-width:400px;margin:auto;box-shadow:0 10px 25px rgba(0,0,0,0.5)}";
  html += "h1{font-size:20px;color:#38bdf8} .stat{font-size:26px;font-weight:bold;margin:10px 0;color:#4ade80}";
  html += "a{color:#60a5fa;text-decoration:none;font-weight:bold}</style></head><body>";
  html += "<div class='card'><h1>🛰️ Wemos GPS Tracker</h1>";
  html += "<p>Status Satelit: " + String(gps.satellites.isValid() ? String(gps.satellites.value()) : "Mencari...") + "</p>";
  if (gps.location.isValid()) {
    html += "<div class='stat'>" + String(gps.location.lat(), 5) + ", " + String(gps.location.lng(), 5) + "</div>";
    html += "<p>Kecepatan: " + String(gps.speed.kmph(), 1) + " km/jam</p>";
    html += "<p><a href='https://maps.google.com/?q=" + String(gps.location.lat(), 6) + "," + String(gps.location.lng(), 6) + "' target='_blank'>Buka Google Maps &rarr;</a></p>";
  } else {
    html += "<p style='color:#fbbf24'>Sedang mencari lock satelit...</p>";
  }
  html += "<hr style='border-color:#334155;margin:15px 0'>";
  html += "<p style='font-size:12px;color:#94a3b8'>Total byte GPS diterima: " + String(charsReceived) + "</p>";
  html += "<p style='font-size:12px'><a href='/api/gps'>Lihat Endpoint /api/gps (JSON)</a></p>";
  html += "</div><script>setTimeout(function(){location.reload();}, 3000);</script></body></html>";
  server.send(200, "text/html", html);
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // LED mati

  Serial.begin(115200);
  ss.begin(GPSBaud);
  delay(500);

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("  WEMOS D1 MINI PRO - GPS TRACKER & WIFI STATION  "));
  Serial.println(F("=================================================="));
  Serial.printf("Menghubungkan ke Hotspot: %s\n", ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  // Tunggu koneksi sambil tetap mengalirkan buffer GPS
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 25) {
    delay(500);
    Serial.print(".");
    timeout++;
    
    // Tetap baca GPS saat connect
    while (ss.available() > 0) {
      gps.encode(ss.read());
      charsReceived++;
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println(F("[WIFI] BERHASIL TERHUBUNG!"));
    Serial.printf("[WIFI] IP Address Wemos: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] Kekuatan Sinyal : %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println();
    Serial.println(F("[WIFI] Belum terhubung (akan coba reconnect otomatis di latar)."));
  }

  // Setup Web Server di Wemos
  server.on("/", handleRoot);
  server.on("/api/gps", handleGpsJson);
  server.begin();
  Serial.println(F("[SERVER] Web Server internal Wemos aktif di port 80"));
  Serial.println(F("=================================================="));
}

// Kirim data ke Next.js API (/api/location)
void sendToNextJsServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;

  if (http.begin(client, serverUrl)) {
    http.addHeader("Content-Type", "application/json");

    // Jika belum lock satelit (misal saat indoor), kirim koordinat default / dummy yang valid
    double lat = gps.location.isValid() ? gps.location.lat() : -7.747035;
    double lng = gps.location.isValid() ? gps.location.lng() : 110.355398;
    float spd = gps.speed.isValid() ? gps.speed.kmph() : 0.0;
    float alt = gps.altitude.isValid() ? gps.altitude.meters() : 145.0;
    int sats = gps.satellites.isValid() ? gps.satellites.value() : 0;

    String payload = "{";
    payload += "\"lat\":" + String(lat, 6) + ",";
    payload += "\"lng\":" + String(lng, 6) + ",";
    payload += "\"speed\":" + String(spd, 1) + ",";
    payload += "\"altitude\":" + String(alt, 1) + ",";
    payload += "\"satellites\":" + String(sats);
    payload += "}";

    int httpCode = http.POST(payload);
    if (httpCode > 0) {
      Serial.printf("[HTTP POST] Sukses kirim ke Next.js (Respon: %d)\n", httpCode);
    } else {
      Serial.printf("[HTTP POST] Gagal kirim ke server (%s)\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }
}

void loop() {
  // 1. Baca data dari sensor GPS
  while (ss.available() > 0) {
    char c = ss.read();
    gps.encode(c);
    charsReceived++;
  }

  // 2. Layani permintaan HTTP dari browser
  server.handleClient();

  // 3. Blink LED & Kirim data berkala
  unsigned long now = millis();
  if (now - lastSendTime >= sendInterval) {
    lastSendTime = now;

    // Toggle onboard LED sebagai indikator aktif
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));

    Serial.printf("\n[STATUS] GPS Chars: %lu | Sats: %d | WiFi: %s\n", 
                  charsReceived,
                  gps.satellites.isValid() ? gps.satellites.value() : 0,
                  (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString().c_str() : "Disconnected");

    if (gps.location.isValid()) {
      Serial.printf("  Lat: %.6f, Lng: %.6f | Kecepatan: %.1f km/h\n", 
                    gps.location.lat(), gps.location.lng(), gps.speed.kmph());
    } else {
      Serial.println(F("  Koordinat: Mencari sinyal satelit (Fixing...)"));
    }

    // Kirim HTTP POST ke Next.js
    sendToNextJsServer();
  }
}
