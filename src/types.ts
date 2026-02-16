export type ChurchId = 'MIBC' | 'QIBBC' | 'CBBC' | 'GCBC'

export const CHURCHES: { id: ChurchId; name: string }[] = [
  { id: 'MIBC', name: 'MIBC' },
  { id: 'QIBBC', name: 'QIBBC' },
  { id: 'CBBC', name: 'CBBC' },
  { id: 'GCBC', name: 'GCBC' },
]

export type DelegateCategory = 'Young People' | 'Young Professional' | 'Bible Student' | 'Preacher'

export type TShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'

export interface Delegate {
  id: string
  church: ChurchId
  lastName: string
  firstName: string
  age: number
  birthday: string
  category: DelegateCategory
  tshirtSize: TShirtSize
  createdAt: string
}

export interface Group {
  id: string
  church: ChurchId
  name: string
  delegateIds: string[]
}

export type Mode = 'registration' | 'admin'

export const STORAGE_KEY = 'youth-camp-2026-state'

export interface StoredState {
  delegates: Delegate[]
  groups: Group[]
}

