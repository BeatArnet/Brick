# Bricks Game Extended

**Bricks Game Extended** ist eine erweiterte Version des klassischen Breakout-Spiels, entwickelt mit Python und [pygame](https://www.pygame.org/).

## 🕹️ Spielbeschreibung

Steuere ein Paddle am unteren Bildschirmrand und halte den Ball im Spiel, um möglichst viele Blöcke ("Bricks") am oberen Rand zu zerstören. Ziel ist es, alle Bricks abzuräumen und Punkte zu sammeln.

Das Spiel endet, wenn der Ball den unteren Bildschirmrand passiert.

---

## 🎮 Steuerung

- **Maus:** Paddle folgt der horizontalen Position der Maus (innerhalb des Spielfensters)
- **Tastatur:**
  - **Linke Pfeiltaste:** Paddle nach links bewegen
  - **Rechte Pfeiltaste:** Paddle nach rechts bewegen

Die Tastatursteuerung ist jederzeit aktiv, auch wenn du die Maus benutzt.

---

## 🌟 Features

- **Attraktive Grafik:** Hintergrundbild, farbige Bricks, abgerundetes Paddle
- **Soundeffekte:** Eigene Sounds für Kollisionen mit Bricks, Paddle und Wänden
- **Dynamisches Spielgefühl:** Ball springt je nach Auftreffpunkt verschieden ab, Paddle wechselt die Farbe
- **Punktesystem:** Punkte für zerstörte Bricks
- **Automatischer Neustart:** Nach Ballverlust startet das Spiel neu
- **You Win-Screen:** Wenn alle Bricks zerstört wurden

---

## 📂 Assets & Verzeichnisstruktur

Das Spiel benötigt folgende Verzeichnisse und Dateien:

Brick/
├─ assets/
│ ├─ images/
│ │ └─ background.png
│ └─ sounds/
│ ├─ brick_hit.wav
│ ├─ paddle_hit.wav
│ └─ wall_hit.wav
└─ Brick.py

> Lege alle Sounds und das Hintergrundbild in die entsprechenden Unterordner!

## 🛠️ Installation & Start

1. **Python & Pygame installieren**

   ```bash
   pip install pygame
