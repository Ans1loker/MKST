export type MetaProgress = {
  currency: number
  baseDamage: number
  fireRate: number
  maxHp: number
  magnet: number
}

const DEFAULT_META: MetaProgress = {
  currency: 0,
  baseDamage: 1,
  fireRate: 0,
  maxHp: 0,
  magnet: 0
}

export function loadMeta(): MetaProgress {
  try {
    const raw = localStorage.getItem('space_meta')
    if (!raw) return { ...DEFAULT_META }
    const parsed = JSON.parse(raw) as Partial<MetaProgress>
    return { ...DEFAULT_META, ...parsed }
  } catch {
    return { ...DEFAULT_META }
  }
}

export function saveMeta(meta: MetaProgress): void {
  localStorage.setItem('space_meta', JSON.stringify(meta))
}