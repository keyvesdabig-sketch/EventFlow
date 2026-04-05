Design System Document: Native Crew Production Suite (v2.1)
1. Overview & Creative North Star
Creative North Star: "The Kinetic Control Room"
This design system mirrors the precision and high-stakes intensity of a live sports broadcast center. It is an active production tool, not a passive administrative dashboard.

The "Safe-Asymmetry" Rule:
We utilize Intentional Asymmetry (overlapping typography, offset containers) for brand moments such as login screens and high-level hero dashboards. However, in functional areas (Call Sheets, Timelines, Technical Specs), we pivot to a Strict Data Matrix. Performance and legibility in the field (e.g., at the OB Van) take absolute precedence over graphic flair.

2. Colors & Functional Logic
Palette Strategy
Rooted in background: #0e0e13 (Nocturne), providing a high-contrast canvas for vibrant broadcast accents.

The "Hybrid-Line" Rule: While structure is primarily defined by background shifts, all interactive containers must feature a Ghost Border (outline-variant #48474d at 15% opacity). This ensures component boundaries remain visible under direct sunlight (High-Glare).

Status-Semantics (Broadcast Standard):

Tally-Red: #ff7162 (Live / Action Required / Error).

Signal-Green: #00ff88 (Confirmed / Checked-in / Stable).

Pending-Amber: #ffb800 (Request Sent / Pending).

Glassmorphism Lite: backdrop-blur (24px) is reserved strictly for the global navigation (Top-Bar). Content cards remain opaque to minimize CPU load on mobile devices and ensure maximum contrast.

3. Typography
Display & Headline (Space Grotesk): For "Loudspeaker" moments and headers. Letter-spacing: -0.02em.

Body & Utility (Manrope): The workhorse for descriptions and standard info.

Technical Data (Space Grotesk Mono / Tabular Numbers): Essential for all time-critical data (Kick-off, Call-time, Frequencies, IP addresses). Must utilize font-variant-numeric: tabular-nums to prevent "jumping" values in lists.

Labels: Always Uppercase, 0.05em spacing, for that "Control Panel" feel.

4. Elevation & Depth (The Z-Axis)
Hierarchy is achieved through Tonal Layering to avoid "shadow-mud" on mobile displays:

Level 0 (Deep Space): #000000 – App frame and deep background.

Level 1 (Launchpad): #0e0e13 – Standard content containers.

Level 2 (Mission Control): #1c1c24 – Active cards, Modals, and Detail views.

Level 3 (Tactile): #25252c – Input fields and interactive UI elements.

5. Components (Production-Optimized)
The "Tally-Header"
Every shift-specific screen features a narrow (4px) header stripe.

Red: Production is Live / You are assigned.

Green: You have successfully Checked-in.

Buttons (The "Trigger")
Primary: Gradient from primary to primary-container. Shape: 0.375rem (sharp but professional).

Tactile Feedback: Every button press in the PWA must trigger a short haptic vibration (haptic feedback) to simulate the feel of a physical toggle in a cockpit.

Digital Call Sheet Card
No-Line-Exception: Uses a rigid vertical grid for maximum data density.

Quick-Action: A dedicated "Maps Trigger" (icon next to address) that launches the native Google Maps app with precise GPS coordinates for the OB Van parking spot.

Production Chips
Status indicators for skills and roles (e.g., "EVS", "SNG", "CAM 1").

Background: surface-container-highest, Typography: label-sm.

6. Do's and Don'ts
Do
Do maintain high contrast for text on surface elements (WCAG AA Standard).

Do place critical information (Call-time, Venue) in the "Thumb-Zone" (bottom third of the screen).

Do use Monospaced Numbers for all technical parameters to ensure alignment.

Do provide "One-Tap" access to the Technical Coordinator's phone number.

Don't
Don't bleed text over images if the text contains critical data (e.g., frequencies).

Don't use thin 1px lines without background contrast—they vanish in outdoor high-brightness settings.

Don't rely solely on gesture-based navigation. Every mission-critical process (Confirm/Check-in) requires a visible, physical-looking button.