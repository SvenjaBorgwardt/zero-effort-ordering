# UTE – Unkomplizierte Theken-Eingabe
## Hackathon Präsentation – Notizen & Struktur

---

## 1. Intro / Hook

> "Ihr kennt das: Man steht morgens in der Bäckerei. Die Verkäuferin hinter der Theke kennt einen seit Jahren – sie weiß genau was man will, sie fragt nach den Kindern, sie empfiehlt das neue Brot. Und dann kommt die Kasse. Und plötzlich bricht der Blickkontakt. Die Verkäuferin tippt, sucht, scrollt – und die Kundin wartet. Die Technik unterbricht genau das, was die Bäckerei besonders macht: das Gespräch.
>
> Wir haben uns gefragt: Was wäre, wenn die Kasse das Gespräch einfach versteht – statt es zu unterbrechen?
>
> Das ist **UTE** – Unkomplizierte Theken-Eingabe. Und wir zeigen euch jetzt live, wie das funktioniert."

---

## 2. Was UTE kann (Kurzübersicht)

UTE ist ein KI-gestütztes Kassensystem, das das Verkaufsgespräch in Echtzeit mitversteht – ohne dass die Verkäuferin ihr Verhalten ändern muss:

- Erkennt automatisch bestellte Produkte und Mengen
- Identifiziert Stammkunden am Namen
- Sperrt Allergene und warnt visuell
- Erkennt Besonderheiten wie "vegan", "bio", "regional" im Gespräch
- Schlägt passende Zusatzprodukte vor (Cross-Selling)
- Erkennt Zahlart ("bar" / "Karte") automatisch per Sprache

---

## 3. Demo-Skript (Drehbuch)

### Vorbereitung
Mitarbeiterin **Svenja** loggt sich ein.

> "Ich starte jetzt die Spracheingabe – und alles andere übernimmt unsere EU AI Act konforme Spracherkennung mit Mistral AI."

*Verkäuferin drückt "Spracheingabe"*

---

### Szene 1: Stammkundin erkannt

**Verkäuferin:** "Guten Tag Frau Schmidt!"

→ **System erkennt:** Stammkundin Frau Schmidt
→ **Popup:** "Stammkunde erkannt! Frau Schmidt" + letzte Bestellung
→ **Automatisch:** Sesam-Allergie wird gesperrt, Sesam-Produkte werden ausgegraut

> "Jetzt seht ihr, dass Frau Schmidt eine Stammkundin ist und sie hat leider eine Sesam-Allergie. Wie ihr seht, zeigt meine Kasse jetzt automatisch eine Warnung an und markiert alle Produkte mit Sesam rot."

---

### Szene 2: Eigene Bestellung

**Frau Schmidt:** "Ich hätte gerne zwei Buttercroissants."

→ **Live-Erkennung:** 2× Buttercroissant erscheint sofort in der Bestellliste

---

### Szene 3: Tante mit Nussallergie

**Frau Schmidt:** "Meine Tante kommt heute zum Kaffee vorbei. Sie hat eine Nussallergie. Was können Sie mir empfehlen?"

→ **System erkennt:** "Nussallergie" → Nüsse werden zusätzlich gesperrt (H, H1, H2, H3)
→ Nuss-Produkte werden jetzt auch ausgegraut

**Verkäuferin:** "Ah, mit einer Nussallergie kann ich den Käsekuchen oder den Bienenstich empfehlen!"

**Frau Schmidt:** "Dann nehme ich bitte einen Bienenstich."

→ **Live-Erkennung:** 1× Bienenstich wird in die Bestellung gebucht

---

### Szene 4: Nichte ist Veganerin

**Frau Schmidt:** "Ach ja, meine Nichte kommt auch – und die ist jetzt Veganerin. Was haben Sie denn da?"

→ **System erkennt:** "Veganerin" → Vegan-Filter springt automatisch an
→ Katalog zeigt nur noch vegane Produkte (z.B. Apfeltasche)
→ Badge "Vegan" erscheint in der Aufnahmeleiste

**Verkäuferin:** "Da haben wir die Apfeltasche!"

→ **Live-Erkennung:** 1× Apfeltasche wird gebucht
→ **Cross-Selling:** "Dazu eine vegane Quiche? Herzhaft trifft süß!" wird angezeigt

---

### Szene 5: Regionales Brot

**Frau Schmidt:** "Ach, und ich bräuchte noch ein Brot – und das soll bitte aus regionalem Anbau sein, weil ich meiner Tante gerne die lokale Brotkultur zeigen möchte."

→ **System erkennt:** "regional" → Regional-Filter wird zusätzlich aktiviert
→ Filter zeigen jetzt zum Paderborner (6,10 €)

**Verkäuferin:** "Also ein Paderborner!"

→ **Live-Erkennung:** 1× Paderborner wird gebucht

---

### Szene 6: Abschluss & Zahlart

**Verkäuferin:** "Darf es sonst noch etwas sein?"

**Frau Schmidt:** "Nein danke, das war's!"

**Verkäuferin:** "Möchten Sie bar oder mit Karte zahlen?"

**Frau Schmidt:** "Bar bitte."

**Verkäuferin:** "Bar."

→ **System erkennt:** "Bar" → Zahlart wird automatisch auf "Barzahlung" gesetzt

*Verkäuferin drückt "Fertig" → dann "Kassieren"*

→ **Bestellung abgeschlossen!**

---

### Zusammenfassung der Demo

| Was passiert | Welches Feature |
|---|---|
| "Frau Schmidt" → erkannt + Sesam gesperrt | Stammkunden-Erkennung + Allergen-Sperre |
| "Buttercroissants" → live gebucht | Echtzeit-Produkterkennung |
| "Nussallergie" → Nüsse gesperrt | Allergen-Spracherkennung |
| "Bienenstich" → gebucht | Live-Matching |
| "Veganerin" → Filter an | Besonderheiten-Erkennung |
| "Apfeltasche" → gebucht + Quiche vorgeschlagen | Live-Matching + Cross-Selling |
| "regional" → Filter an → Paderborner | Besonderheiten-Erkennung |
| "Bar" → Zahlart gesetzt | Zahlart-Spracherkennung |

---

## 4. Technische Architektur (eine Folie)

```
Mikrofon
   │
   ├──▶ Browser Speech API (live, <200ms)
   │       → Echtzeit-Transkript + Live-Produkterkennung
   │       → Stammkunden, Allergene, Besonderheiten, Zahlart
   │
   └──▶ Mistral Voxtral (Korrektur-Pass, ~2s)
           → Genauere Transkription
           │
           └──▶ Mistral Large (Parsing)
                   → Smalltalk rausfiltern
                   → Nur echte Bestellpositionen extrahieren
                   │
                   └──▶ Fuse.js (Fuzzy Matching)
                           → Produkte im Katalog zuordnen
                           │
                           └──▶ Supabase (PostgreSQL)
                                   → Bestellung speichern
```

**Zwei-Pass-System:**
- **Pass 1 (sofort):** Browser Speech API liefert Echtzeit-Vorschau – Produkte erscheinen noch während der Kunde spricht
- **Pass 2 (Hintergrund):** Voxtral + Mistral Large korrigieren und verfeinern nach Aufnahme-Ende

---

## 5. Features im Detail

### 5.1 Sprach-Erkennung (Live)
- Mikrofon-Aufnahme über Web Audio API
- Browser Speech API für sofortige deutsche Transkription
- Zahlwort-Erkennung: "acht" → 8, "halbes" → 0.5
- Produktnamen-Matching mit Plural/Singular und Umlaut-Varianten

### 5.2 Stammkunden-Erkennung
- Erkennt Namen im Gespräch: "Hallo Frau Schmidt"
- Sucht in Stammkunden-Datenbank (Name, Nachname, Spitzname)
- Zeigt Popup mit letzter Bestellung → "Wie immer?" mit einem Klick
- Setzt automatisch Allergie-Sperren für den Kunden
- Neue Stammkunden können direkt an der Kasse angelegt werden

### 5.3 Allergen-System (LMIV-konform)
- 16 Allergen-Codes nach EU-Standard (A–N, mit Untergruppen)
- Jedes Produkt hat: enthaltene Allergene + "kann Spuren enthalten"
- Sprach-Erkennung: "keine Nüsse", "glutenfrei", "Sesamallergie" → automatische Sperre
- Gesperrte Produkte werden ausgegraut aber bleiben sichtbar und bestellbar
- Bei Tap auf gesperrtes Produkt: Warnung-Popup mit "Trotzdem hinzufügen"

### 5.4 Besonderheiten-Erkennung
- Erkennt im Gespräch automatisch: "vegan", "bio", "pflanzlich", "ökologisch", "regional"
- Setzt entsprechende Filter im Produktkatalog
- Zeigt erkannte Filter als Badges in der Aufnahmeleiste

### 5.5 Zahlart-Erkennung
- Erkennt "bar" / "Karte" am Ende des Gesprächs
- Setzt Zahlart automatisch im System

### 5.6 Cross-Selling
- Regelbasierte Vorschläge (z.B. Apfeltasche → vegane Quiche)
- Priorisiertes System (produktspezifisch > kategoriebasiert)

### 5.7 Fallback-System
- Wenn Mistral API nicht erreichbar → automatischer Fallback auf Mock-Daten
- Die Kasse steht nie still, auch ohne Internet

---

## 6. Zahlen & Fakten

| Kennzahl | Wert |
|---|---|
| Produkte im Katalog | 40+ |
| Allergen-Codes (EU-Standard) | 16 |
| Echtzeit-Erkennung (Browser) | < 200ms |
| Korrektur-Pass (Voxtral + Mistral) | < 3 Sekunden |
| Stammkunden | Dynamisch erweiterbar |
| Cross-Selling Regeln | 9 |
| Sprach-erkannte Allergen-Phrasen | 33+ |
| Sprach-erkannte Besonderheiten-Phrasen | 17+ |

---

## 7. Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Radix UI |
| Backend | Express.js, Node.js |
| KI/ML | Mistral Large (Parsing), Mistral Voxtral (Transkription) |
| Datenbank | Supabase (PostgreSQL) |
| Matching | Fuse.js (Fuzzy Search) |
| Audio | Web Audio API, Browser Speech API |
| Deployment | Vercel-ready (Serverless) |

---

## 8. Warum UTE gewinnen sollte

1. **Echtes Problem:** Gesetzliche Allergen-Pflicht (LMIV) in der Gastronomie
2. **Zero Effort:** Verkäuferin ändert nichts an ihrem Verhalten – sie spricht einfach normal
3. **Menschlichkeit:** Blickkontakt statt Bildschirm-Suche
4. **EU AI Act konform:** Transparente Mistral-AI-Nutzung
5. **Sicherheitsnetz:** Allergen-Warnungen schützen Kunden, erlauben aber bewusstes Übersteuern
6. **Praxisnah:** Entwickelt mit Input von echten Bäckerinnen
7. **Resilient:** Funktioniert auch ohne Internet dank Fallback-System
