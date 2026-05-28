import * as React from 'react'
import { Text, Button, Section, Heading } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Layout, emailStyles } from './Layout'

const SITE_NAME = 'REVMED'

interface PasswordResetProps {
  name?: string
  resetLink?: string
}

const PasswordResetEmail = ({ name, resetLink }: PasswordResetProps) => (
  <Layout previewText={`Redefinição de senha — ${SITE_NAME}`}>
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>SEGURANÇA</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      Redefinição de senha
    </Heading>
    
    <Text style={emailStyles.text}>
      Olá{name ? `, ${name}` : ''}. <br /><br />
      Recebemos uma solicitação para redefinir a senha da sua conta na <strong>{SITE_NAME}</strong>. 
      Se você não fez essa solicitação, pode ignorar este e-mail com segurança.
    </Text>
    
    <Section style={{ textAlign: 'center', margin: '40px 0' }}>
      <Button href={resetLink || '{{ .ConfirmationURL }}'} style={emailStyles.button}>
        Redefinir minha senha
      </Button>
    </Section>
    
    <Text style={emailStyles.text}>
      O link acima expirará em breve por motivos de segurança. <br /><br />
      Se o botão não funcionar, copie e cole o seguinte endereço no seu navegador: <br />
      <span style={{ color: '#f97316', fontSize: '14px', wordBreak: 'break-all' }}>
        {resetLink || '{{ .ConfirmationURL }}'}
      </span>
    </Text>
  </Layout>
)

export const template = {
  component: PasswordResetEmail,
  subject: 'Redefinição de senha — REVMED',
  displayName: 'Redefinição de senha',
  previewData: { name: 'Dra. Ana', resetLink: 'https://revmed.app.br/reset-password' },
} satisfies TemplateEntry
