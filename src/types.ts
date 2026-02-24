export const CHURCHES = [
  { id: 'MIBC', name: 'Mactan Independent Baptist Church' },
  { id: 'QIBBC', name: 'Quiot Independent Bible Baptist Church' },
  { id: 'BBC-C', name: 'Bible Baptist Church Consolacion' },
  { id: 'GCBC', name: 'Gospel of Christ Baptist Church' },
] as const

export type ChurchId = typeof CHURCHES[number]['id']

export const getChurchName = (id: ChurchId | null | string): string => {
  const found = CHURCHES.find(c => c.id === id)
  return found ? found.name : id || ''
}

export type DelegateCategory = 'High School (JHS)' | 'High School (SHS)' | 'College' | 'Young Professional'
export type TShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type Gender = 'Male' | 'Female'
export type Mode = 'registration' | 'admin'
export type PaymentStatus = 'PAID' | 'UNPAID'
export type PaymentMethod = 'ONLINE' | 'ONSITE'

export interface Delegate {
  id: string
  church: ChurchId
  lastName: string
  firstName: string
  age: number
  gender: Gender
  birthday: string
  category: DelegateCategory
  tshirtSize: TShirtSize
  createdAt: string
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  referenceNumber?: string
}

export interface Group {
  id: string
  name: string
  delegateIds: string[]
}

export interface RegistrationFormState {
  lastName: string
  firstName: string
  age: string
  gender: Gender
  birthday: string
  category: DelegateCategory
  tshirtSize: TShirtSize
}
