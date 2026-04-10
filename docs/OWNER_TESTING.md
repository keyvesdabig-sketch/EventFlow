# EventFlow — Testphase To-Do's für den Owner

Hallo Dani — diese Liste führt dich durch alles, was du vor dem ersten echten Event einmalig einrichten und prüfen musst.

**App:** https://event-flow-chi.vercel.app  
**Login:** `info@nativecrew.ch` → Magic Link per E-Mail

---

## 1. Erster Login & Account-Verknüpfung

- [ ] App aufrufen und mit `info@nativecrew.ch` einloggen
- [ ] Prüfen: Weiterleitung auf `/dashboard` (Owner-Bereich) — nicht auf `/home` (Freelancer-Bereich)
- [ ] Prüfen: Dein Name erscheint oben rechts in der Navigation

---

## 2. Metadaten prüfen — Skills

Die App kennt folgende Skill-Kategorien für Freelancer:

| Key | Anzeige |
|---|---|
| `camera` | Kamera |
| `evs` | EVS |
| `audio` | Audio |
| `vision_mixing` | Bildmischer |
| `rf_tech` | RF-Tech |
| `replay` | Replay |
| `graphics` | Grafik |

- [ ] Stimmen diese Kategorien für deine Crew? Fehlende oder falsche Skills dem Entwickler melden.

---

## 3. Metadaten prüfen — Production Template

Aktuell gibt es ein Beispiel-Template: **«NL2 Heimspiel EHC Chur»**

- [ ] Template unter **Templates** öffnen und prüfen:
  - [ ] Phasen korrekt? (Rigging 4h → Rehearsal 2h → Live 3h)
  - [ ] Rollen vollständig? (Kameramann 1, Kameramann 2, EVS-Operator, Toningenieur, Bildmischer)
  - [ ] Standard-Venue korrekt? (Eissportzentrum Chur, Güterstrasse 5)
- [ ] Falls Anpassungen nötig: direkt inline bearbeiten (Stift-Icon) oder dem Entwickler melden falls neue Rollen/Phasen fehlen

---

## 4. Freelancer-Pool aufbauen

Erstelle zuerst einen **Test-Freelancer** um den Invite-Flow zu prüfen, bevor du echte Crew-Mitglieder einträgst:

- [ ] Unter **People** → «+ Neuer Freelancer» folgenden Eintrag erstellen:
  - **Name:** Test Freelancer
  - **E-Mail:** deine eigene E-Mail-Adresse (z.B. `danigeser@dinim.ch`)
  - **Telefon:** (leer lassen)
  - **Skills:** beliebig auswählen
- [ ] **Login-Link generieren** — du erhältst den Link per E-Mail an dich selbst
- [ ] Den Link in einem **Inkognito-Fenster** öffnen → du solltest auf `/home` (Freelancer-Ansicht) landen
- [ ] Prüfen: Booking-Anfragen erscheinen korrekt in der Freelancer-Ansicht
- [ ] Test-Freelancer danach wieder löschen (People → Eintrag aufklappen → Löschen)

Danach die **echten Techniker** erfassen:

- [ ] Jeden Freelancer unter **People** → «+ Neuer Freelancer» eintragen
- [ ] Für jeden: **Login-Link generieren** und per WhatsApp oder E-Mail weiterleiten
- [ ] Warten bis mindestens 2–3 Freelancer ihren ersten Login gemacht haben (Account-Verknüpfung)

---

## 5. Test-Event durchspielen

- [ ] **Neues Test-Event** erstellen (kein echtes Datum nötig — z.B. «Test-Produktion»)
- [ ] Booking starten und mindestens 2 Rollen besetzen
- [ ] Anfragen senden → prüfen ob E-Mails bei den Freelancern ankommen
- [ ] Als Freelancer (separates Gerät oder Inkognito-Fenster) zustimmen
- [ ] Prüfen: Event-Status wechselt automatisch auf «Bestätigt» sobald alle Rollen besetzt
- [ ] Call Sheet auf dem Handy öffnen und Darstellung prüfen

---

## 6. E-Mail-Flow prüfen

- [ ] Booking-Anfrage-E-Mail: kommt sie an? Ist der Inhalt verständlich?
- [ ] Tag-vor-Event-Erinnerung: kann erst bei einem echten zukünftigen Event getestet werden
- [ ] Absage-E-Mail: eine Rolle ablehnen und prüfen ob Event-Absage-Mail funktioniert

---

## Feedback an Entwickler

Alles was nicht stimmt, fehlt oder verbessert werden soll — einfach melden:
- Fehlende Skills oder Rollen
- Unklare Texte in der App
- Funktionen die fehlen oder nicht wie erwartet funktionieren
