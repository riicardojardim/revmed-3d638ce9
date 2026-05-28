import type { ComponentType } from 'react'
import { template as paymentApproved } from './payment-approved'
import { template as passwordReset } from './password-reset'
import { template as welcome } from './welcome'
import SignupEmail from './signup'
import InviteEmail from './invite'
import MagicLinkEmail from './magic-link'
import RecoveryEmail from './recovery'
import EmailChangeEmail from './email-change'
import ReauthenticationEmail from './reauthentication'

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
  'signup': { component: SignupEmail, subject: 'Confirme seu e-mail — REVMED' },
  'invite': { component: InviteEmail, subject: 'Você foi convidado(a) — REVMED' },
  'magiclink': { component: MagicLinkEmail, subject: 'Seu link de acesso — REVMED' },
  'recovery': { component: RecoveryEmail, subject: 'Redefinição de senha — REVMED' },
  'email_change': { component: EmailChangeEmail, subject: 'Confirme seu novo e-mail — REVMED' },
  'reauthentication': { component: ReauthenticationEmail, subject: 'Seu código de verificação — REVMED' },
}
