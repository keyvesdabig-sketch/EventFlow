import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('production_templates')
    .select('*')
    .order('created_at', { ascending: false })

  const templates = (rows ?? []).map(templateMapper.fromDb)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-control text-muted-foreground mb-1">Vorlagen</p>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            Templates
          </h1>
        </div>
        <Button asChild>
          <Link href="/templates/new">+ Neues Template</Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="ghost-border rounded-lg bg-level-2 p-12 text-center text-muted-foreground text-sm">
          Keine Templates vorhanden.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-4"
            >
              <Link
                href={`/templates/${template.id}`}
                className="flex-1 space-y-0.5 hover:opacity-80 transition-opacity"
              >
                <p className="font-medium text-foreground">{template.name}</p>
                <p className="data-technical text-xs text-muted-foreground">
                  {template.roleTemplates.reduce((sum, rt) => sum + rt.count, 0)} Rollen · {template.phases.length} Phasen
                </p>
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href={`/templates/new?from=${template.id}`}
                  className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Duplizieren
                </Link>
                <Link
                  href={`/templates/${template.id}`}
                  className="label-control text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
