import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import Link from 'next/link'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('production_templates')
    .select('*')
    .order('created_at', { ascending: false })

  const templates = (rows ?? []).map(templateMapper.fromDb)

  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Vorlagen</p>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ letterSpacing: '-0.02em' }}
        >
          Templates
        </h1>
      </div>

      {templates.length === 0 ? (
        <div className="ghost-border rounded-lg bg-level-2 p-12 text-center text-muted-foreground text-sm">
          Keine Templates vorhanden.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <Link
              key={template.id}
              href={`/templates/${template.id}`}
              className="flex items-center justify-between ghost-border rounded-lg bg-level-1 px-5 py-4 hover:bg-level-2 transition-colors group"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">{template.name}</p>
                <p className="data-technical text-xs text-muted-foreground">
                  {template.roleTemplates.reduce((sum, rt) => sum + rt.count, 0)} Rollen · {template.phases.length} Phasen
                </p>
              </div>
              <span className="label-control text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Details →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
