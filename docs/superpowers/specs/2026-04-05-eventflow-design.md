# EventFlow — Design Spec
**Datum:** 2026-04-05  
**Produkt:** Internes Personal-Planungstool für Sport-Streaming-Produktionen  
**Kontext:** EHC Chur, Swiss League (NL2) Eishockey-Produktionen  
**Autor:** Product Owner Session

---

## 1. Ausgangslage & Ziel

Der Inhaber einer Sport-Streaming-Produktionsfirma plant regelmässig Eishockey-Übertragungen (EHC Chur, Swiss League) mit einem Pool von 15–20 hochspezialisierten Freelancern (Kameraleute, Bildmischer, Toningenieure, EVS-Operatoren). Die Koordination läuft heute über WhatsApp, E-Mail und Telefon – ohne zentrales System.

**Ziel:** Eine PWA (Progressive Web App), die den gesamten Workflow von der Event-Erstellung bis zum abgeschlossenen Sendetag abbildet. Zwei Nutzerrollen: Inhaber (plant, bucht, kommuniziert) und Freelancer (bestätigt/lehnt ab, konsumiert Call Sheet).

---

## 2. Informations-Architektur — Datenobjekte

### `ProductionTemplate`
Vorlage für wiederkehrende Produktionstypen (z.B. "NL2 Heimspiel EHC Chur").

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| name | String | z.B. "NL2 Heimspiel" |
| phases | Phase[] | Geordnete Liste von Phasen mit Standarddauer (h) |
| roles | RoleTemplate[] | Rollentitel + benötigte Anzahl + bevorzugte Personen |
| defaultVenueInfo | String | Standardinfos Ü-Wagen, Einfahrt, Technik |
| documents | DocumentRef[] | Signalplan-Vorlage, Lagepläne |

**Phase (innerhalb Template):**  
`{ name: "Rigging" | "Rehearsal" | "Live" | String, defaultDurationHours: number }`

**RoleTemplate:**  
`{ title: String, count: number, preferredPersonIds: PersonId[] }`

---

### `Event`
Konkretes Produktionsobjekt, erstellt als Snapshot eines Templates.

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| templateRef | TemplateId | Referenz (read-only, für Rückverfolgung) |
| title | String | z.B. "EHC Chur vs. HC Davos" |
| phases | ConcretePhase[] | Phasen mit konkreten Start-/Endzeiten |
| venue | Venue | Name, Adresse, GPS, Parkplatz-Info, Zufahrtsbeschreibung |
| status | EventStatus | `draft → booking → confirmed → live → completed` |
| roles | Role[] | Zu besetzende Rollen (aus Template übernommen) |
| documents | Document[] | Signalpläne, Lagepläne, sonstige PDFs |
| notes | String | Freitext für Besonderheiten |

**EventStatus-Übergänge:**
```
draft → booking      (Inhaber startet Buchungsprozess)
booking → confirmed  (alle Rollen bestätigt)
confirmed → live     (Sendetag hat begonnen)
live → completed     (Inhaber schliesst Event manuell)
* → cancelled        (jederzeit möglich; alle bestätigten Personen werden benachrichtigt)
```

---

### `Role` *(innerhalb eines Events)*
Eine zu besetzende Stelle im Event.

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| title | String | z.B. "EVS-Operator" |
| assignedPersonId | PersonId? | null = unbesetzt |

Der effektive Buchungsstatus einer Role wird aus ihrem aktiven `Booking`-Datensatz abgeleitet (nicht redundant gespeichert):
- Kein Booking → `open`
- Booking.status = `sent` → `requested`
- Booking.status = `confirmed` → `confirmed`
- Booking.status = `declined` → `declined` (neues Booking möglich → wieder `open`)

---

### `Person`
Freelancer im Pool.

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| name | String | |
| photo | ImageRef? | |
| phone | String | |
| email | String | |
| skills | Skill[] | Mehrfachauswahl: `camera`, `evs`, `audio`, `vision_mixing`, `rf_tech`, … |
| notes | String | Freitext (z.B. "kein Nachtfahrten") |

---

### `Booking`
Verbindungsobjekt zwischen Person und Role — Kommunikations-Datensatz.

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| roleRef | RoleId | |
| personRef | PersonId | |
| requestedAt | DateTime | |
| respondedAt | DateTime? | |
| status | `sent \| confirmed \| declined` | |
| declineReason | String? | Freitext, optional |

**Verknüpfungslogik:**  
`Event → [Role] → Booking → Person`  
Personendaten leben nur in `Person`. Rollenbezeichnungen kommen aus Template. Keine Redundanz.

---

## 3. Architektur-Entscheid: Template-Driven + Dashboard-Hub

**Gewählter Ansatz:** Option C (Template-Driven), ergänzt durch ein schlankes Dashboard (Option B).

**Begründung:** NL2-Heimspiele wiederholen sich jede Saison mit identischen Rollen und ähnlichen Venues. Ein Template für "NL2 Heimspiel EHC Chur" mit vordefinierten Rollen und bevorzugten Personen reduziert die Event-Erstellung auf < 5 Minuten. Das Dashboard gibt dem Inhaber jederzeit Überblick über alle laufenden Buchungsprozesse.

---

## 4. Workflow "Happy Path"

```
1. EVENT ERSTELLEN (Inhaber, ~3 Min.)
   ├── Template wählen (z.B. "NL2 Heimspiel EHC Chur")
   ├── Titel eingeben (z.B. "EHC Chur vs. HC Davos")
   ├── Datum + Uhrzeiten pro Phase setzen
   ├── Venue prüfen / anpassen (Adresse, GPS, Parkplatz, Zufahrt)
   └── Speichern → Status: Draft

2. BOOKING STARTEN (Inhaber)
   ├── Rollenübersicht öffnen
   ├── Pro Rolle: Empfohlene Person 1-Klick auswählen
   │   └── oder per Skill-Filter aus Pool wählen
   │       (Doppelbuchungs-Konflikt wird angezeigt)
   ├── Alle Rollen bestückt
   └── "Anfragen senden" → Status: Booking
       └── Push-Notification an alle ausgewählten Personen

3. FREELANCER ANTWORTEN (async)
   ├── App öffnen → Anfrage sichtbar auf Startbildschirm
   ├── Event-Details + Phasenzeiten prüfen
   └── [ZUSAGEN] oder [ABLEHNEN] tippen (+ optionaler Ablehnungsgrund)

4. INHABER DASHBOARD (live)
   ├── Alle Rollen mit Echtzeit-Status sichtbar
   ├── Grün = bestätigt, Orange = ausstehend, Rot = abgesagt
   └── Rote Rollen → Ersatz auswählen → neue Anfrage senden

5. VOLLSTÄNDIG BESTÄTIGT → Status: Confirmed
   ├── Alle Rollen grün
   ├── Call Sheet automatisch generiert
   └── Crew sieht Call Sheet sofort in ihrer App

6. SENDETAG → Status: Live
   └── Crew öffnet App → 1-Tap Call Sheet

7. ABSCHLUSS → Status: Completed
   └── Inhaber markiert Event manuell als abgeschlossen
```

---

## 5. Umgang mit kurzfristigen Änderungen

**Spielverschiebung / Zeitänderung:**
1. Inhaber öffnet Event → Datum/Uhrzeit anpassen
2. Button "Crew benachrichtigen" → Push-Notification mit Delta ("Spielbeginn verschoben: 19:45 → 20:15")
3. Inhaber entscheidet: erneute Bestätigung verlangen (setzt betroffene Rollen auf `requested`) oder nur informieren

**Kurzfristiger Ausfall eines Crew-Mitglieds:**
1. Inhaber öffnet Rollenübersicht → Rolle manuell auf `open` setzen
2. Ersatzperson auswählen → Anfrage senden
3. Betroffene Person erhält keine weitere App-Aktion (Buchung wird still deaktiviert)

**Storno des Events:**
1. Event-Status auf `cancelled` setzen
2. Alle bestätigten Personen erhalten Push-Notification "Event wurde abgesagt"

---

## 6. Smart Booking UX — Inhaber-Seite

### Rollenübersicht (Booking-Screen)
Alle Rollen als vertikale Liste. Pro Rolle:
- Rollenbezeichnung
- Bis zu 3 Empfehlungen (Avatar + Name, aus Template-Präferenz)
- 1-Klick-Auswahl pro Empfehlung
- "Andere wählen"-Link → öffnet Skill-Filter

### Skill-Filter / Suchansicht
- Filterchips: Skills (Mehrfachauswahl)
- Freitextsuche (Name)
- Ergebnisliste: Foto, Name, Skills, Konflikt-Indikator (rotes Symbol bei Doppelbuchung im System)

### Anfrage senden
- Einzelner "Anfragen senden"-Button (sendet an alle gleichzeitig)
- Nach dem Senden: Live-Status-View der Rollen

### Live-Status-View
```
Kameramann 1    Max Müller      [Angefragt ●]
EVS-Operator    Sara Bauer      [Zugesagt ✓]
Toningenieur    Tom Keller      [Abgesagt ✗] → [Jetzt ersetzen]
Bildmischer     Urs Caflisch    [Angefragt ●]
```

---

## 7. Mobile UX — Freelancer Call Sheet

### Startbildschirm (Freelancer)
Nächstes Event gross und sofort lesbar, ohne Navigation:

```
┌─────────────────────────────────────┐
│  🏒 NL2 — EHC Chur vs. HC Davos    │
│  Sa, 12. Apr · 13:00–22:00         │
│  Eissportzentrum Chur              │
│                                     │
│  Deine Rolle: EVS-Operator          │
│                                     │
│  [  CALL SHEET ÖFFNEN  ]           │
│                                     │
│  Offene Anfragen (1)  ›             │
└─────────────────────────────────────┘
```

### Call Sheet (1 vertikaler Scroll)
Kein Tab-System. Klare Sektionen:

```
── ZEITPLAN ──────────────────────────
  08:00  Rigging-Beginn
  12:00  Rehearsal
  15:30  Sendebeginn (Live)
  22:00  Abbau / Ende

── VENUE ─────────────────────────────
  Eissportzentrum Chur
  Güterstrasse 5, 7000 Chur
  [Karte öffnen ↗]

── Ü-WAGEN PARKPLATZ ────────────────
  Eingang Nord, Tor B
  [GPS-Navigation starten ↗]

── CREW ──────────────────────────────
  Kameramann 1    Max Müller      📞
  Kameramann 2    Lena Graf       📞
  EVS-Operator    (du)
  Toningenieur    Sara Bauer      📞
  Bildmischer     Tom Keller      📞

── TECHNISCHE KONTAKTE ──────────────
  Stadion-IT      Peter Huber     📞
  Regie vor Ort   Anna Schmidt    📞

── DOKUMENTE ─────────────────────────
  [Signalplan PDF ↗]
  [Lageplan Halle ↗]
```

- Telefonnummern: tippbare `tel:`-Links
- GPS: öffnet native Apple/Google Maps
- PDFs: In-App-Viewer oder nativer Download

### Anfrage-Screen
```
┌─────────────────────────────────────┐
│  Neue Anfrage                       │
│  NL2 · EHC Chur vs. SCL Tigers     │
│  Sa, 19. Apr · EVS-Operator        │
│  09:00–23:00                       │
│                                     │
│  [     ZUSAGEN     ]               │
│  [     ABLEHNEN    ]               │
└─────────────────────────────────────┘
```
Bei "Ablehnen": optionales Freitext-Feld erscheint.

---

## 8. Funktions-Matrix

| Feature | Inhaber (Desktop) | Inhaber (Mobile) | Freelancer (Mobile) |
|---------|:-----------------:|:----------------:|:-------------------:|
| Templates erstellen/bearbeiten | ✓ | — | — |
| Event erstellen | ✓ | ✓ (vereinfacht) | — |
| Rollen besetzen & Anfragen senden | ✓ | ✓ | — |
| Booking-Dashboard (Live-Status) | ✓ | ✓ | — |
| Event bearbeiten / verschieben | ✓ | ✓ | — |
| Crew benachrichtigen | ✓ | ✓ | — |
| Anfragen empfangen & beantworten | — | — | ✓ |
| Call Sheet anzeigen | ✓ | ✓ | ✓ |
| Dokumente hochladen | ✓ | — | — |
| Freelancer-Pool verwalten | ✓ | — | — |
| Event als "Completed" markieren | ✓ | ✓ | — |

---

## 9. Bewusst ausgeschlossen (v1)

- Freelancer-seitige Verfügbarkeitskalender (zu viel Pflege-Overhead)
- Automatische Eskalation bei Absagen (Inhaber entscheidet selbst)
- Rechnungs- / Honorarverwaltung
- Kalender-Sync (Google Calendar, iCal) — für spätere Version
- Native iOS/Android App — PWA ist ausreichend

---

## 10. Offene Fragen für Implementierung

1. **Authentifizierung:** Wie erhalten Freelancer ihren initialen Zugang? (Einladungs-Link per E-Mail empfohlen)
2. **Push-Notifications:** Web Push API (funktioniert in PWA auf iOS ab iOS 16.4) — Fallback auf E-Mail für ältere Geräte?
3. **Supabase als Backend:** Passt gut für Realtime-Updates im Dashboard (Supabase Realtime).
4. **PDF-Generierung:** Call Sheet als clientseitig gerenderter View oder serverseitig generiertes PDF?
