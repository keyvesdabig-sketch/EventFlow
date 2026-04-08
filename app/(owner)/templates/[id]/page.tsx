import { createClient } from '@/lib/supabase/server'
import { templateMapper } from '@/lib/supabase/mappers'
import { notFound } from 'next/navigation'
import { TemplateInlineEditor } from './inline-editor'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('production_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!row) notFound()
  const template = templateMapper.fromDb(row)

  return <TemplateInlineEditor template={template} />
}
