import { supabase } from '@/lib/supabase'
import { ensureAuthSession } from './enrollment.service'

export interface DocumentRecord {
  id: string
  filename: string
  display_name?: string
  original_name: string
  folder_name: string
  file_size: number
  mime_type: string
  storage_path: string
  is_public: boolean
  created_at: string
}

export async function initStorage() {
  await ensureAuthSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error("Unauthorized")

  const response = await fetch('/api/admin/init-storage', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
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

export async function uploadDocument(file: File, folder: string, isPublic: boolean, customName?: string) {
  await ensureAuthSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error("Unauthorized")

  // 1. Prepare Filename: YYYY-MM-DD_filename
  const dateStr = new Date().toISOString().split('T')[0]
  const cleanName = (customName || file.name).replace(/[^a-zA-Z0-9._-]/g, '_')

  // Ensure extension is preserved if customName is used
  const extension = file.name.split('.').pop()
  const baseName = cleanName.endsWith(`.${extension}`) ? cleanName : `${cleanName}.${extension}`

  const finalFilename = `${dateStr}_${baseName}`
  const storagePath = `${folder}/${finalFilename}`

  // 2. Upload to Storage (Client-side directly to Supabase for large files)
  const { error: uploadError } = await supabase.storage
    .from('vault')
    .upload(storagePath, file, { upsert: true })

  if (uploadError) throw uploadError

  // 3. Save Metadata to DB via Server-side API (to bypass RLS insertion issues)
  const metaResponse = await fetch('/api/admin/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      filename: finalFilename,
      display_name: customName || file.name,
      original_name: file.name,
      folder_name: folder,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      is_public: isPublic
    })
  })

  const metaResult = await metaResponse.json()
  if (!metaResponse.ok || !metaResult.success) {
    // Cleanup storage if DB fails
    await supabase.storage.from('vault').remove([storagePath])
    throw new Error(metaResult.error || "Failed to save document metadata")
  }

  return { success: true }
}

export async function deleteDocument(id: string, path: string, isFolder = false, folderName?: string) {
  await ensureAuthSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error("Unauthorized")

  const params = new URLSearchParams()
  if (id) params.append('id', id)
  if (path) params.append('path', path)
  if (isFolder) params.append('is_folder', 'true')
  if (folderName) params.append('folder_name', folderName)

  const response = await fetch(`/api/admin/documents?${params}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
}

export async function createFolder(folderPath: string, displayFolderName: string) {
  await ensureAuthSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error("Unauthorized")

  const response = await fetch('/api/admin/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      filename: '.keep',
      original_name: '.keep',
      display_name: displayFolderName,
      folder_name: folderPath,
      file_size: 0,
      mime_type: 'application/vnd.rotc.folder',
      storage_path: `${folderPath}/.keep`,
      is_public: false
    })
  })

  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to create folder record")
  }

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
