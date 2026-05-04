export const CHURCHES = [
  { id: 'MIBC', name: 'Mactan Independent Baptist Church' },
  { id: 'QIBBC', name: 'Quiot Independent Bible Baptist Church' },
  { id: 'BBC-C', name: 'Bible Baptist Church Consolacion' },
  { id: 'BBC-A', name: 'Bible Baptist Church Asturias' },
  { id: 'BBC-D', name: 'Bible Baptist Church Dipolog' },
  { id: 'GCBC', name: 'Gospel of Christ Baptist Church' },
  { id: 'LBBC', name: 'Liberty Bible Baptist Church - San Francisco Camotes' },
  { id: 'PSBC', name: 'Precious Seed Bible Baptist Church' },
  { id: 'BBBC', name: 'Bonifacio Bible Baptist Church' },
  { id: 'CBC-OZ', name: 'Calvary Baptist Church Ozamis' },
  { id: 'BBC-M', name: 'Bible Baptist Church Minglanilla' },
] as const

export type ChurchId = typeof CHURCHES[number]['id']

export const getChurchName = (id: ChurchId | null | string): string => {
  const found = CHURCHES.find(c => c.id === id)
  return found ? found.name : id || ''
}

export type DelegateCategory = 'High School (JHS)' | 'High School (SHS)' | 'College' | 'Young Professional'
export type TShirtSize = '10' | '12' | '14' | '16' | '18' | '20' | 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type Gender = 'Male' | 'Female'
export type Mode = 'registration' | 'admin'
export type PaymentStatus = 'PAID' | 'UNPAID'
export type PaymentMethod = 'ONLINE' | 'ONSITE'
export type DelegateRole = 'Delegate' | 'Leader' | 'Assistant Leader'

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
  role?: DelegateRole
  preferredName?: string
  isNew?: boolean
  locked?: boolean
  tshirtPrinted?: boolean
  idPrinted?: boolean
  justAdded?: boolean
}

export interface Group {
  id: string
  name: string
  delegateIds: string[]
  locked?: boolean
  gender?: 'Male' | 'Female'
}

export interface RegistrationFormState {
  lastName: string
  firstName: string
  age: string
  gender: Gender
  birthday: string
  category: DelegateCategory
  tshirtSize: TShirtSize
  tshirtPrinted: 'Not Printed' | 'Printed'
  idPrinted: 'Not Printed' | 'Printed'
  preferredName: string
}
