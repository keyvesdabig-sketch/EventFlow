import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { TemplateInlineEditor } from '@/app/(owner)/templates/[id]/inline-editor'
import { createTemplateAction } from './actions'
import type { ProductionTemplate } from '@/lib/types'

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  let baseTemplate: ProductionTemplate = {
    id: '',
    name: '',
    phases: [],
    roleTemplates: [],
    defaultVenueInfo: '',
    createdAt: '',
  }

  if (from) {
    const supabase = await createClient()
    const { data: row } = await supabase
      .from('production_templates')
      .select('*')
      .eq('id', from)
      .single()

    if (row) {
      const source = templateMapper.fromDb(row)
      baseTemplate = {
        ...source,
        id: '',
        name: `${source.name} (Kopie)`,
        createdAt: '',
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label-control text-muted-foreground mb-1">Vorlagen</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
          {from ? 'Template duplizieren' : 'Neues Template'}
        </h1>
      </div>
      <TemplateInlineEditor
        template={baseTemplate}
        initialEditing={true}
        onSave={createTemplateAction}
        cancelHref="/templates"
      />
    </div>
  )
}
