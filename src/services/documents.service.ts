import { supabase } from '@/lib/supabase'
import { ensureAuthSession } from './enrollment.service'

export interface DocumentRecord {
  id: string
  filename: string
  original_name: string
  folder_name: string
  file_size: number
  mime_type: string
  storage_path: string
  is_public: boolean
  created_at: string
}

export async function getAdminDocuments(params: { search?: string, folder?: string, page?: number, pageSize?: number }) {
  await ensureAuthSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error("Unauthorized")

  const urlParams = new URLSearchParams()
  if (params.search) urlParams.append('search', params.search)
  if (params.folder) urlParams.append('folder', params.folder)
  if (params.page) urlParams.append('page', params.page.toString())
  if (params.pageSize) urlParams.append('pageSize', params.pageSize.toString())

  const response = await fetch(`/api/admin/documents?${urlParams}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
}

export async function uploadDocument(file: File, folder: string, isPublic: boolean) {
  await ensureAuthSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error("Unauthorized")

  // 1. Prepare Filename: YYYY-MM-DD_filename
  const dateStr = new Date().toISOString().split('T')[0]
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const finalFilename = `${dateStr}_${cleanName}`
  const storagePath = `${folder}/${finalFilename}`

  // 2. Upload to Storage (Client-side directly to Supabase for large files)
  const { error: uploadError } = await supabase.storage
    .from('vault')
    .upload(storagePath, file, { upsert: true })

  if (uploadError) throw uploadError

  // 3. Save Metadata to DB
  const { error: dbError } = await supabase.from('archived_documents').insert({
    filename: finalFilename,
    original_name: file.name,
    folder_name: folder,
    file_size: file.size,
    mime_type: file.type,
    storage_path: storagePath,
    is_public: isPublic,
    uploaded_by: sessionData.session?.user.id
  })

  if (dbError) {
    // Cleanup storage if DB fails
    await supabase.storage.from('vault').remove([storagePath])
    throw dbError
  }

  return { success: true }
}

export async function deleteDocument(id: string, path: string) {
  await ensureAuthSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error("Unauthorized")

  const response = await fetch(`/api/admin/documents?id=${id}&path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
}

export async function getPublicDocuments(params: { search?: string, folder?: string }) {
  await ensureAuthSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error("Unauthorized")

  const urlParams = new URLSearchParams()
  if (params.search) urlParams.append('search', params.search)
  if (params.folder) urlParams.append('folder', params.folder)

  const response = await fetch(`/api/documents/list?${urlParams}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result.data
}

export async function getDownloadUrl(path: string) {
  const { data, error } = await supabase.storage.from('vault').createSignedUrl(path, 60)
  if (error) throw error
  return data.signedUrl
}
