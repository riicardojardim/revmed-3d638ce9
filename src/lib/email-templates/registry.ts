import type { ComponentType } from 'react'
import { template as paymentApproved } from './payment-approved'
import { template as passwordReset } from './password-reset'
import { template as welcome } from './welcome'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'payment-approved': paymentApproved,
  'password-reset': passwordReset,
  'welcome': welcome,
}
