"""
Wemos D1 Mini Pro (ESP8266) - MicroPython Test Script

Fitur:
1. Kedip Onboard LED (Pin 2 / D4 - Active LOW)
2. Scan jaringan WiFi
3. Status memori dan informasi chip
"""

import machine
import network
import time
import esp
import gc

# Onboard LED Wemos D1 Mini Pro ada di GPIO2 (D4), Active LOW
led = machine.Pin(2, machine.Pin.OUT)
led.value(1)  # 1 = Off, 0 = On

print("========================================")
print("  WEMOS D1 MINI PRO - MICROPYTHON TEST  ")
print("========================================")
print("Flash size (bytes):", esp.flash_size())
print("Free memory (bytes):", gc.mem_free())
print("========================================")

# Inisialisasi WiFi Station untuk scanning
wlan = network.WLAN(network.STA_IF)
wlan.active(True)

print("Memindai jaringan WiFi sekitar...")
try:
    nets = wlan.scan()
    print("Ditemukan {} jaringan:".format(len(nets)))
    for net in nets:
        ssid = net[0].decode('utf-8', 'ignore')
        rssi = net[3]
        print("  - {:<28} (RSSI: {} dBm)".format(ssid, rssi))
except Exception as e:
    print("Gagal scan WiFi:", e)

print("\nMemulai loop LED blink (Ctrl+C untuk berhenti)...")
counter = 0
try:
    while True:
        led.value(0)  # Nyala
        time.sleep(0.5)
        led.value(1)  # Mati
        time.sleep(0.5)
        counter += 1
        if counter % 10 == 0:
            print("Detak aktif: {} detik | Free RAM: {}".format(counter, gc.mem_free()))
except KeyboardInterrupt:
    led.value(1)
    print("\nProgram dihentikan.")
