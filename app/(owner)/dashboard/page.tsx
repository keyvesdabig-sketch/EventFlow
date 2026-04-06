export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Übersicht</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
          Dashboard
        </h1>
      </div>
      <div className="ghost-border rounded-lg bg-level-2 p-6 text-muted-foreground text-sm">
        Events und Buchungen — folgt in Plan 2 &amp; 3.
      </div>
    </div>
  )
}
