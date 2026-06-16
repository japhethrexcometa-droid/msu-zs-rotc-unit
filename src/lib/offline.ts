import { openDB } from 'idb'

interface OfflineScan {
  id?: number
  qrCode: string
  userId: string
  scannedAt: string
  synced: boolean
}

const DB_NAME = 'rotc_offline'
const STORE = 'pending_scans'

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('synced', 'synced')
      }
    }
  })
}

export async function queueOfflineScan(qrCode: string, userId: string): Promise<void> {
  const db = await getDB()
  await db.add(STORE, {
    qrCode,
    userId,
    scannedAt: new Date().toISOString(),
    synced: false
  })
}

export async function getPendingScans(): Promise<OfflineScan[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORE, 'synced', IDBKeyRange.only(false))
}

export async function markScanSynced(id: number): Promise<void> {
  const db = await getDB()
  const scan = await db.get(STORE, id)
  if (scan) await db.put(STORE, { ...scan, synced: true })
}

export async function clearSyncedScans(): Promise<void> {
  const db = await getDB()
  const synced = await db.getAllFromIndex(STORE, 'synced', IDBKeyRange.only(true))
  await Promise.all(synced.map(s => db.delete(STORE, s.id!)))
}
