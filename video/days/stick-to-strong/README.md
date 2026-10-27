# Stick to Strong: neuen Tag anlegen

Ein Film (`films/stick-to-strong.html`) für alle 100 Tage. Jeder Tag ist nur eine JSON-Datei hier im Ordner.

## Neuer Tag in 3 Schritten

1. Letzten Tag kopieren: `cp day-01.json day-02.json`
2. Werte ändern: `day`, `weight`, `bulk`, `headline`, `scene`, `actions`, `tip`, `outro`, `duration`.
3. Im Ordner `video/`:

```sh
DAY=2 npm run render && DAY=2 npm run mix      # -> out/stick-to-strong-day-02.mp4
DAY=2 npm run check                            # vorher: Fußcheck (muss "foot lock OK" sagen)
DAY=2 npm run stills                           # Standbilder -> build/stills-stick-to-strong-day-02/
```

Im Browser: `films/stick-to-strong.html?day=2` über einen lokalen Webserver (z. B. `npx serve video`).

## Felder

| Feld | Bedeutung |
|---|---|
| `day` | Zahl oben: `DAY 2/100` |
| `weight` | Gewicht in Gelb, z. B. `58.4` -> `58.4 KG` |
| `bulk` | Muskeln 0.0–1.0 (0 = dünnes Strichmännchen, 1 = breite Brust, dicke Arme und Oberschenkel) |
| `headline` | Hook-Text ab Bild 0: `"TEXT."` oder `{ "text": "TEXT.", "until": 3.0 }` |
| `scene` | `mirror`, `kitchen`, `gym`, `bed`, `scale` |
| `leo` | optional: Startpunkt `[x, tiefe, blickrichtung]` (sonst Standard der Szene) |
| `actions` | Liste `{ "t": start, "end": ende, "do": "...", ... }` (siehe unten) |
| `tip` | `{ "title": "...", "lines": ["...", "..."] }` (1–3 Zeilen), "SAVE THIS" kommt automatisch |
| `outro` | `"DAY 3 TOMORROW."` oder eine Frage zum Abstimmen |
| `duration` | Länge in Sekunden (12–18) |
| `stills` | optional: Zeitpunkte für `npm run stills` |

## Aktionen (`do`)

| do | Felder | was passiert |
|---|---|---|
| `flex` | `side` (`R`/`L`) | Bizeps anspannen (Arm vor, Faust hoch, zweimal drücken) |
| `lookArm` | `side` | schaut auf den Arm, Kopf schief |
| `memory` | `text` | kleine graue Erinnerung neben dem Kopf |
| `text` | `text` | Caption oben (wie die Headline) |
| `plank` | – | runter in die Liegestütz-Position |
| `pushUp` | `height` 0–1, `shake` 0–1 | langsam hochdrücken, Arme zittern |
| `collapse` | – | Arme knicken weg, flach auf den Boden, Staub (nach `plank`/`pushUp`) |
| `lookCamera` | – | dreht im Liegen den Kopf zur Kamera |
| `standUp` | – | vom Boden aufstehen (nach `plank`) |
| `nod` | – | nicken |
| `walk` | `to: [x, tiefe]`, `mood` | gehen (`walk`, `heavy`, `forced`, `jog` ...) |
| `turn` | `yaw` | umdrehen (0 = rechts, 180 = links, -90 = zur Kamera) |
| `track` | `name`, `value`, `ease` | jede Haltung direkt, z. B. `slump`, `head`, `shDrop` |
| `tip` | – | Tipp-Karte (Inhalt aus `tip`) mit "pling" |
| `outro` | – | Outro-Text bis zum harten Ende |

Sounds kommen automatisch aus der Szene (Raumton/Gym-Atmo, Schritte auf Holz oder Fliesen) und aus den Aktionen
(Hände auf dem Boden, Ausatmen, Aufprall, pling). Datei: `sounds/stick-to-strong.js`.
Für Gym-Hantel und Waage gibt es die Sounds schon (`clank`, `grunt`, `beep`); die passenden Aktionen
(Bankdrücken, Wiegen, Essen, Schlafen) kommen dazu, sobald ein Tag sie braucht.
