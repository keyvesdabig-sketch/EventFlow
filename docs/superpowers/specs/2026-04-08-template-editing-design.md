# Template Editing — Design Spec

**Datum:** 2026-04-08  
**Status:** Approved

---

## Übersicht

Owner kann bestehende Production Templates inline bearbeiten sowie neue Templates erstellen (von Grund auf oder als Duplikat eines bestehenden). Löschen ist explizit ausgeschlossen. Bestehende Events bleiben unberührt, da sie Template-Daten als Snapshot speichern.

---

## Scope

- **In Scope:** Bearbeiten aller Template-Felder (Name, Phasen, Rollen, Venue-Info), neues Template erstellen, Template duplizieren
- **Out of Scope:** Template löschen, Bearbeitung durch Freelancer, Auswirkungen auf bestehende Events

---

## UI-Verhalten

### Templates-Liste (`/templates`)

- Neuer Button **«+ Neues Template»** oben rechts (navigiert zu `/templates/new`)
- Pro Template-Zeile zusätzlicher Link **«Duplizieren»** (`href="/templates/new?from=[id]"`) — kein eigener Server-Roundtrip, nur Navigation

### Template-Detail View (`/templates/[id]`)

- **«Bearbeiten»**-Button oben rechts neben «Event erstellen»
- Klick wechselt in Edit-Modus (kein Seitenwechsel)

### Template-Detail Edit-Modus (inline)

Der Edit-Modus ersetzt die Read-only-Ansicht direkt auf derselben Seite:

- **Name:** Textfeld
- **Phasen:** Liste editierbarer Zeilen (Name + Dauer in Stunden), «✕» zum Entfernen, «+ Phase hinzufügen» am Ende
- **Rollen:** Liste editierbarer Zeilen (Titel + Anzahl), «✕» zum Entfernen, «+ Rolle hinzufügen» am Ende. `preferredPersonIds` wird nicht im UI bearbeitet — beim Speichern als leeres Array übernommen (bestehende Präferenzen gehen bei Bearbeitung verloren, da kein Personen-Picker vorgesehen)
- **Venue-Info:** Textarea
- **Speichern** / **Abbrechen** oben rechts

«Abbrechen» verwirft alle lokalen Änderungen und kehrt zum View-Modus zurück.  
«Speichern» ruft `updateTemplateAction` auf. Bei Erfolg: View-Modus, Daten aktualisiert.

### Neues Template (`/templates/new`)

- Server Component lädt optionales Quell-Template wenn `?from=[id]` vorhanden
- Rendert `TemplateInlineEditor` im Edit-Modus mit leerem oder geklontem Initialzustand
- «Speichern» → `createTemplateAction` → Supabase Insert → Redirect zu `/templates/[neue-id]`
- «Abbrechen» → zurück zur Liste `/templates`

---

## Architektur

### Neue Dateien

| Datei | Zweck |
|---|---|
| `app/(owner)/templates/[id]/inline-editor.tsx` | Client Component — verwaltet View/Edit-State, rendert alle Felder |
| `app/(owner)/templates/[id]/actions.ts` | Server Action `updateTemplateAction` |
| `app/(owner)/templates/new/page.tsx` | Server Component — lädt optionales Quell-Template, rendert Editor im Edit-Modus |
| `app/(owner)/templates/new/actions.ts` | Server Action `createTemplateAction` |

### Geänderte Dateien

| Datei | Änderung |
|---|---|
| `app/(owner)/templates/[id]/page.tsx` | Daten-Fetch bleibt, rendert neu `<TemplateInlineEditor template={template} />` |
| `app/(owner)/templates/page.tsx` | «+ Neues Template»-Button, «Duplizieren»-Link pro Zeile |

---

## Datenfluss

### Bearbeiten

1. Owner klickt «Bearbeiten» → lokaler State wechselt auf `editing: true`
2. Alle Felder werden zu Inputs; Phasen/Rollen sind als Arrays im lokalen State verwaltbar
3. Owner speichert → `updateTemplateAction(id, data)` → `supabase.from('production_templates').update(...)` → `revalidatePath('/templates/[id]')`
4. Bei Erfolg: `editing: false`, Daten aus Server-Re-Render aktualisiert

### Neu erstellen

1. `/templates/new` — Server Component prüft `?from=[id]`
2. Falls vorhanden: Supabase-Fetch des Quell-Templates, Daten werden als `initialData` an Editor übergeben (ohne `id`)
3. Owner füllt Formular, klickt «Speichern» → `createTemplateAction(data)` → `supabase.from('production_templates').insert(...)` → Redirect zu `/templates/[neue-id]`

### Duplizieren

Nur Navigation: `href="/templates/new?from=[id]"`. Keine eigene Server Action — der Flow läuft über «Neu erstellen» mit Quell-Template.

---

## Validierung

Client-seitig (im Editor):
- Name darf nicht leer sein
- Jede Phase braucht einen Namen und eine Dauer > 0
- Jede Rolle braucht einen Titel und Anzahl ≥ 1
- Speichern-Button deaktiviert wenn Validierung schlägt fehl

Server Action prüft dieselben Regeln nochmals (Pflicht an der System-Grenze).

---

## Nicht verändert

- `lib/types.ts` — `ProductionTemplate`, `TemplatePhase`, `RoleTemplate` bleiben unverändert
- `lib/supabase/mappers.ts` — `templateMapper.toDb()` existiert bereits und wird genutzt
- RLS-Policies — Owner hat bereits vollen Schreibzugriff auf `production_templates`
- Bestehende Events — referenzieren Template nur via `templateId`, Snapshot-Daten bleiben unangetastet
