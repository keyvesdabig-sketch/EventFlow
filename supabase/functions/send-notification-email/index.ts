import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const FROM = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? 'EventFlow <noreply@example.com>'
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`Resend error ${res.status}: ${body}`)
  }
}

async function getPersonEmail(personId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('persons')
    .select('email')
    .eq('id', personId)
    .single()
  return data?.email ?? null
}

async function getEventInfo(eventId: string) {
  const { data } = await supabaseAdmin
    .from('events')
    .select('title, phases')
    .eq('id', eventId)
    .single()
  if (!data) return null
  const phases = data.phases as { name: string; startTime: string; endTime: string }[]
  const firstPhase = phases[0]
  const dateStr = firstPhase
    ? new Date(firstPhase.startTime).toLocaleDateString('de-CH', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '—'
  const timeStr = firstPhase
    ? new Date(firstPhase.startTime).toLocaleTimeString('de-CH', {
        hour: '2-digit', minute: '2-digit',
      })
    : '—'
  return { title: data.title as string, dateStr, timeStr }
}

const APP_URL = Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000'

async function handleBookingRequest(bookingIds: string[]): Promise<void> {
  for (const bookingId of bookingIds) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('person_id, roles!inner(title, event_id)')
      .eq('id', bookingId)
      .single()

    if (!booking) continue

    const roleTitle = (booking as any).roles.title as string
    const eventId = (booking as any).roles.event_id as string
    const email = await getPersonEmail(booking.person_id)
    const eventInfo = await getEventInfo(eventId)

    if (!email || !eventInfo) continue

    const subject = `Neue Anfrage: ${eventInfo.title} · ${eventInfo.dateStr}`
    const html = `
      <p>Hallo,</p>
      <p>Du hast eine neue Buchungsanfrage erhalten:</p>
      <ul>
        <li><strong>Event:</strong> ${eventInfo.title}</li>
        <li><strong>Datum:</strong> ${eventInfo.dateStr} ab ${eventInfo.timeStr} Uhr</li>
        <li><strong>Deine Rolle:</strong> ${roleTitle}</li>
      </ul>
      <p><a href="${APP_URL}/home">Jetzt in der App antworten →</a></p>
    `
    await sendEmail(email, subject, html)
  }
}

async function handleEventCancelled(eventId: string): Promise<void> {
  const eventInfo = await getEventInfo(eventId)
  if (!eventInfo) return

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('person_id, roles!inner(event_id)')
    .eq('status', 'confirmed')
    .eq('roles.event_id', eventId)

  for (const booking of bookings ?? []) {
    const email = await getPersonEmail(booking.person_id)
    if (!email) continue

    const subject = `Event abgesagt: ${eventInfo.title} · ${eventInfo.dateStr}`
    const html = `
      <p>Hallo,</p>
      <p>Leider wurde folgender Event abgesagt:</p>
      <ul>
        <li><strong>Event:</strong> ${eventInfo.title}</li>
        <li><strong>Datum:</strong> ${eventInfo.dateStr}</li>
      </ul>
      <p>Bei Fragen wende dich direkt an den Inhaber.</p>
    `
    await sendEmail(email, subject, html)
  }
}

async function handleDayBeforeReminder(): Promise<void> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = tomorrow.toISOString().slice(0, 10)

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title, phases')
    .in('status', ['confirmed', 'booking'])

  const tomorrowEventIds: string[] = []
  for (const event of events ?? []) {
    const phases = event.phases as { startTime: string }[]
    if (phases[0]?.startTime.slice(0, 10) === tomorrowDate) {
      tomorrowEventIds.push(event.id)
    }
  }

  if (tomorrowEventIds.length === 0) return

  for (const eventId of tomorrowEventIds) {
    const eventInfo = await getEventInfo(eventId)
    if (!eventInfo) continue

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('person_id, roles!inner(title, event_id)')
      .eq('status', 'confirmed')
      .eq('roles.event_id', eventId)

    for (const booking of bookings ?? []) {
      const email = await getPersonEmail(booking.person_id)
      const roleTitle = (booking as any).roles.title as string
      if (!email) continue

      const subject = `Erinnerung morgen: ${eventInfo.title}`
      const html = `
        <p>Hallo,</p>
        <p>Erinnerung: Morgen findet folgender Einsatz statt:</p>
        <ul>
          <li><strong>Event:</strong> ${eventInfo.title}</li>
          <li><strong>Beginn:</strong> ${eventInfo.dateStr} ab ${eventInfo.timeStr} Uhr</li>
          <li><strong>Deine Rolle:</strong> ${roleTitle}</li>
        </ul>
        <p><a href="${APP_URL}/home">Call Sheet öffnen →</a></p>
      `
      await sendEmail(email, subject, html)
    }
  }
}

serve(async (req) => {
  try {
    const { type, bookingIds, eventId } = await req.json()

    if (type === 'booking_request') {
      await handleBookingRequest(bookingIds ?? [])
    } else if (type === 'event_cancelled') {
      await handleEventCancelled(eventId)
    } else if (type === 'day_before_reminder') {
      await handleDayBeforeReminder()
    } else {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-notification-email error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
