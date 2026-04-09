# People Management (`/people`) — Design Spec

**Datum:** 2026-04-09  
**Status:** Approved

---

## Ziel

Der Owner kann seine Freelancer-Crew verwalten: bestehende Einträge bearbeiten, Personen löschen und neue Freelancer einladen. Die Seite ist ausschliesslich für den Owner zugänglich.

---

## Routen & Dateien

| Datei | Typ | Zweck |
|---|---|---|
| `app/(owner)/people/page.tsx` | Server Component | Lädt alle Freelancer aus Supabase, rendert `<PersonList>` |
| `app/(owner)/people/person-list.tsx` | Client Component | Liste mit expandierbarem Edit-Panel pro Person + Invite-Formular |
| `app/(owner)/people/actions.ts` | Server Actions | `updatePerson`, `deletePerson`, `createPerson`, `generateAndSendInviteLink` |
| `app/(owner)/layout.tsx` | Bestehend | "People"-Nav-Link ergänzen |

---

## Listenansicht

Die Seite zeigt alle Personen mit `role = 'freelancer'` (Owner wird nicht angezeigt).

Pro Person in der Übersicht:
- Name
- E-Mail
- Telefon
- Skills als `ProductionChip`-Komponenten

Ein Klick auf eine Person expandiert das Edit-Panel darunter. Nur ein Panel ist gleichzeitig geöffnet.

---

## Edit-Panel (expandierend)

Felder:
- **Name** — `<input type="text">`, Pflichtfeld
- **E-Mail** — `<input type="email">`, Pflichtfeld
- **Telefon** — `<input type="tel">`
- **Skills** — Toggle-Chips für alle 7 Werte: `camera`, `evs`, `audio`, `vision_mixing`, `rf_tech`, `replay`, `graphics`
- **Notizen** — `<textarea>`

Aktionen:
- **Speichern** — ruft `updatePerson` auf, schliesst das Panel bei Erfolg
- **Abbrechen** — schliesst das Panel ohne Änderungen
- **Löschen** — roter Button, öffnet einen Bestätigungsdialog (`"Wirklich löschen?"`), ruft dann `deletePerson` auf

---

## Neuer Freelancer — Invite-Flow

Ein "Neuer Freelancer"-Button öffnet ein Formular (expandierendes Panel am Ende der Liste oder oberhalb).

Felder:
- **Name** — Pflichtfeld
- **E-Mail** — Pflichtfeld
- **Telefon** — optional
- **Skills** — optional, Toggle-Chips

Ablauf beim Absenden:

1. `createPerson` legt einen neuen `persons`-Eintrag an (`role = 'freelancer'`, `user_id = null`)
2. `generateAndSendInviteLink` ruft `supabase.auth.admin.generateLink({ type: 'magiclink', email })` auf — benötigt den Service Role Key (bereits als Supabase Secret vorhanden, im Server-Client verfügbar)
3. Der generierte Magic Link wird auf dem Bildschirm angezeigt (zum Kopieren)
4. Zusätzlich wird eine E-Mail via Resend an die Owner-E-Mail gesendet (Owner-E-Mail aus `persons` mit `role = 'owner'` lesen)

Der Magic Link ist einmalig gültig (Supabase Standard: 1 Stunde). Beim ersten Login läuft der bestehende Auth-Callback durch und verknüpft den Freelancer mit seinem `persons`-Eintrag via `linkPersonToUser()`.

---

## Server Actions

### `updatePerson(id, data)`
- Validiert Pflichtfelder (Name, E-Mail)
- Prüft Owner-Auth
- Schreibt via Supabase Server-Client in `persons`

### `deletePerson(id)`
- Prüft Owner-Auth
- Löscht den `persons`-Eintrag
- Hinweis: RLS und Supabase Cascades regeln abhängige `bookings`-Einträge

### `createPerson(data)`
- Validiert Name + E-Mail
- Prüft Owner-Auth
- Legt neuen Eintrag an mit `role = 'freelancer'`, `user_id = null`
- Gibt die neue `id` zurück

### `generateAndSendInviteLink(email)`
- Ruft Supabase Admin API auf: `supabase.auth.admin.generateLink({ type: 'magiclink', email })`
- Liest Owner-E-Mail aus `persons` (role = 'owner')
- Sendet E-Mail via Resend mit dem Link
- Gibt den Link-String zurück (für Anzeige auf dem Bildschirm)

---

## Navigation

`app/(owner)/layout.tsx` bekommt einen dritten Nav-Link:

```
Dashboard | Templates | People
```

---

## Was bewusst nicht gebaut wird

- Skill-basierte Filterung der Liste (Plan 7)
- Verfügbarkeitskalender (Plan 7 / Plan 9)
- Foto-Upload (`photoUrl`)
- Direkter E-Mail-Versand des Links an den Freelancer (Owner leitet manuell weiter)
