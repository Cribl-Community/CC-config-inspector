/// <reference types="vite/client" />

declare const CRIBL_API_URL: string
declare const CRIBL_BASE_PATH: string

interface CriblUser {
  id: string
  username: string
  email?: string
  firstName?: string
  lastName?: string
  initials?: string
}

interface Window {
  CRIBL_API_URL: string
  CRIBL_BASE_PATH: string
  getCriblUser?: () => Promise<CriblUser>
}
