export default function FreelancerHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Deine Einsätze</p>
        <h1 className="text-xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
          Meine Events
        </h1>
      </div>
      <div className="ghost-border rounded-lg bg-level-2 p-6 text-muted-foreground text-sm">
        Call Sheets und Anfragen — folgt in Plan 3 &amp; 4.
      </div>
    </div>
  )
}
