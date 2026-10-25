# Strichfiguren-Video: Vorlage für neue Videos

Diese Datei fasst zusammen, wie "Ask Twice" gebaut ist, damit du neue Videos im selben Stil
machen kannst. Der ganze Code liegt im Ordner `video/` (Branch `claude/vertical-animation-sound-xbq7vf`).

---

## 1. Prompt zum Kopieren (für einen neuen Chat mit Claude)

> Nutze das Projekt in `video/` aus dem Repo emyfaked-droid/Brose-Website als Vorlage
> (Engine in `engine.js`, Renderer `scripts/render.js`, Ton `sound-timeline.js` + `scripts/mix.js`).
> Behalte Stil, Figuren und Geh-Animation exakt bei (siehe `video/VORLAGE.md`).
> Neue Geschichte: **[hier deine Story mit Zeiten, Texten und Sounds]**.
> Format 720x1280, 30 fps, ca. **[Länge]** Sekunden. Erst Standbilder und einen Test-Clip zeigen,
> dann das fertige MP4 mit Ton rendern.

---

## 2. Stil (nicht ändern, dann sieht es gleich aus)

- **Figuren:** dünne Strichfiguren. Weiße, runde Linien mit schwarzem Rand, runder weißer Kopf ohne Gesicht.
  Gliedmaßen 13 px, Rand 3,5 px, Kopf 54 px. Arm und Bein auf der abgewandten Seite sind grau.
- **Nahtlose Hüfte:** Rumpf und vorderes Bein werden als **eine** Form gezeichnet (`strokeBody`),
  also ohne Linie an der Hüfte. Das hintere Bein liegt immer hinter dem Körper.
- **Hintergrund:** fast schwarz, weiches Licht, Vignette, glänzender Boden mit Spiegelung.
- **Farbe:** Graustufen plus **eine** Akzentfarbe (warmes Gelb).
- **Text:** fette Monospace-Schrift, GROSSBUCHSTABEN, weite Buchstabenabstände, oben mittig, sanft ein- und ausblenden.
- **Requisite:** weiße ovale Maske mit Lächeln, das einzige Gesicht im Video.
- **Proportionen** (in `DIM`): Oberschenkel 82, Unterschenkel 80, Rumpf 100, Oberarm 56, Unterarm 52.
- **Tür und Möbel:** passend zur Figur. Tür ca. 1,2-mal Körperhöhe (395 px hoch, 150 px breit).

---

## 3. Gehen: die Einstellungen (`MOOD` in `index.html`)

Grundregel: **Geschwindigkeit = Schrittlänge × Schritte pro Sekunde**. Nur so bleibt der Fuß am Boden stehen.

| Stil | Wofür | Schritt (px) | Schritte/s | Fuß-Hub | Armschwung | Gefühl |
|---|---|---|---|---|---|---|
| `walk` | normales Gehen | 118 | 1,95 | 11 | 17° | entspannt, Arme locker, kaum Federn |
| `forced` | aufrecht, "zusammenreißen" | 112 | 2,1 | 12 | 21° | etwas leichter und aufrechter |
| `heavy` | traurig, schwer | 70 | 1,45 | 5 | 6° | kurze, schleppende Schritte, gebeugt |
| `bouncy` | ein paar kleine Schritte | 34 | 2,1 | 7 | 9° | kurz und locker |
| `jog`, `run` | Joggen / Rennen | 120 / 165 | 2,6 / 2,85 | 30 / 34 (Ferse hinten bis 62 / 80) | 27° / 34° | mit Flugphase, Ellbogen ~75°, Ferse kickt hoch, Knie zieht nach vorn, kürzere Schritte beim Anlaufen und Abbremsen |

Was jeder Schritt automatisch macht:
- Ferse setzt zuerst auf, der Fuß rollt ab und drückt über die Zehen ab. Der stehende Fuß rutscht nie.
- Das Knie beugt sich beim Aufsetzen. Das Becken geht runter und hoch (Kontakt, Tief, Passing, Hoch)
  und verlagert sich zum Standbein.
- Die Arme schwingen gegengleich zu den Beinen, der Ellbogen leicht verzögert. Die Schultern drehen gegen die Hüfte. Der Kopf bleibt ruhig.
- Anfahren und Anhalten sind weich: halber Startschritt, Abbremsen, Oberkörper schwingt leicht nach.
- Drehungen laufen über kleine Trippelschritte, nie über einen rutschenden Fuß.

Benutzung im Code:
```js
const fig = new Fig('ID', { x: 300, d: 20, yaw: 0, seed: 1 });   // yaw 0 = schaut nach rechts, -90 = zur Kamera
const ende = fig.walk(1.0, [600, 20], MOOD.walk, 'R');            // ab 1,0 s nach x=600 gehen, gibt die Endzeit zurück
fig.turn(ende, ende + 0.6, -90);                                   // danach zur Kamera drehen
```

Körperhaltung ändern (Werte gleiten weich von Zeit a bis Zeit b):
```js
fig.tr.slump.to(a, b, 17);   // zusammensacken
fig.tr.head.to(a, b, 26);    // Kopf senken
fig.tr.lean.to(a, b, 8);     // nach vorn lehnen
```

---

## 4. Ablauf (Befehle im Ordner `video/`)

```sh
npm install && npx playwright install chromium   # einmalig
npm run check      # Prüft, dass kein Fuß rutscht und nichts ruckelt
npm run stills     # Standbilder der wichtigen Momente -> build/stills
npm run walktest   # Geh-Test-Clips in Seitenansicht mit mitfahrender Kamera
npm run render     # Bild -> build/video.mp4 (ca. 40 s)
npm run sfx        # Ersatz-Sounds neu erzeugen (synthetisch)
npm run mix        # Ton mischen und anlegen -> out/ask-twice.mp4
```

Geh-Test im Browser: `index.html?test=walk&mood=walk&track=1` (mood: walk, forced, heavy, bouncy, jog, run).

---

## 5. Ton

- Alle Sounds stehen mit Zeit, Datei, Lautstärke und Fades in `sound-timeline.js`.
- Schritte werden automatisch genau auf den Frame gelegt, an dem die Ferse aufsetzt.
- Der Mix landet bei -14 LUFS mit max. -1,5 dBTP, also mit Platz für Musik.
- Die Dateien in `sfx/` sind synthetische Ersatz-Sounds. Echte Aufnahmen mit gleichem Namen ersetzen sie
  (eine `.mp3` hat Vorrang vor der `.wav`). Die Liste mit Suchbegriffen steht in `sfx/README.md`.

---

## 6. Posting-Text (Ask Twice)

Everyone's "fine." Until they're alone.

"How are you?" "Fine."
The easiest lie we tell every day.
If someone says they're fine… ask twice. 🖤

Tag someone you should check on today.

#asktwice #mentalhealth #checkonyourfriends #stickmananimation #fyp


---

## 7. Zweiter Film: It Ends With You

- Datei `it-ends-with-you.html`, gleiche Engine (`engine.js`). Befehle: `npm run iewy:check`, `iewy:stills`, `iewy:render`, `iewy:mix`, `iewy:build`.
- Neu in der Engine: Kinder (`{ s: 0.6 }`), Knien (`fig.footGoal`), Rückwärtsschritte (`walk(..., { back: true })`),
  Einfrieren (`fig.warp`), Umarmen (zwei Figuren lesen gegenseitig ihre Pose mit `fig.pose(t, true)`).
- Aufbau: Szene 2 ist Szene 1 plus 6,0 s, mit vertauschten Rollen. Alle Zeiten stehen im Objekt `T` oben in der Datei.

---

## 8. Dritter Film: I Wish I Was Your Phone

- Datei `i-wish-i-was-your-phone.html`. Befehle: `npm run phone:check`, `phone:stills`, `phone:render`, `phone:mix`, `phone:build`.
- Licht: eine Lichtkarte (Grundlicht + Lampe + Handy) wird über das fertige Bild multipliziert. So ist nur hell, was das
  Handy oder die Lampe wirklich anstrahlt.
- Neu in der Engine: `tr.ox` / `tr.od` (Becken in Weltrichtung verschieben, z. B. Kind hochheben), `extra.props` in
  `drawFigure` (Requisiten in der Hand werden mit den Armen nach Tiefe sortiert), Untertitel mit eigener Höhe (zweizeilig).
- Tipp für Arme: Der Ellbogen-Pol darf nie auf der Linie Schulter–Hand liegen, sonst springt der Ellbogen.
  Sicher ist ein Pol unter der Armmitte (siehe `midPole`).
- Alle Sounds sind selbst erzeugt (`scripts/make_sfx.py`), also ohne fremde Rechte.

---

## 9. Vierter Film: Motivation

- Datei `motivation.html`. Befehle: `npm run mot:check`, `mot:stills`, `mot:render`, `mot:mix`, `mot:build`.
- Vier Tage an derselben Bushaltestelle, mit kurzen Überblendungen: Tag (grau), Regen (Pfützen spiegeln das Neon-Schild),
  Schnee (sammelt sich auf Bank und Figur), Nacht (eine Straßenlaterne). Das gelbe Schild ist die einzige Farbe.
- Neu in der Engine: `tr.hyaw` (Kopf drehen), `tr.pant` (schnelles Atmen nach dem Laufen), `fig.walkMix(...)` (erst ein
  schwerer Schritt, dann normales Gehen) und ein neuer Laufzyklus für `jog`/`run` (Ferse kickt hinten hoch, Knie zieht nach
  vorn, die ersten und letzten Schritte sind kürzer). Die anderen Filme bleiben pixelgleich.
- Langes, weiches Abbremsen beim Joggen: eigene Stimmung mit größerem `td`, z. B. `{ ...MOOD.jog, td: 1.3 }`.
- Alle Sounds sind selbst erzeugt (`scripts/make_sfx.py`); echte Aufnahmen mit gleichem Namen ersetzen sie.
