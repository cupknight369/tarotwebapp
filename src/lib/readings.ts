import { supabase } from './supabase.js'

export async function getSavedStateLimit(): Promise<number> {
  const { data, error } = await supabase
    .from('app_configuration')
    .select('value')
    .eq('key', 'SavedStateLimit')
    .single()

  if (error || !data) {
    return 500
  }
  const parsed = parseInt(data.value, 10)
  return isNaN(parsed) ? 500 : parsed
}

export async function getReadingsCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('readings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (error) return 0
  return count ?? 0
}

export async function listReadings(): Promise<ReadingSummary[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('readings')
    .select('id, name, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return []
  return (data ?? []) as ReadingSummary[]
}

export async function loadReading(id: string): Promise<{ state: SavedReadingState; name: string } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('readings')
    .select('state, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null
  return { state: data.state as SavedReadingState, name: data.name ?? 'Untitled Reading' }
}

export async function saveReading(
  state: SavedReadingState,
  name?: string,
  readingId?: string
): Promise<{ id: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const payload = {
    user_id: user.id,
    name: name ?? 'Untitled Reading',
    state,
    updated_at: new Date().toISOString(),
  }

  if (readingId) {
    const { data, error } = await supabase
      .from('readings')
      .update({ state: payload.state, updated_at: payload.updated_at })
      .eq('id', readingId)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (error) return { error: error.message }
    return { id: data.id }
  }

  const { data, error } = await supabase
    .from('readings')
    .insert({
      user_id: payload.user_id,
      name: payload.name,
      state: payload.state,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function deleteReading(id: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('readings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return {}
}
