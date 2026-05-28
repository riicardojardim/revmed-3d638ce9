import * as React from 'react'
import { Text, Button, Section, Heading, Link } from '@react-email/components'
import { Layout, emailStyles } from './Layout'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Layout previewText={`Confirme sua alteração de e-mail na ${siteName}`}>
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>SEGURANÇA</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      Alteração de e-mail
    </Heading>
    
    <Text style={emailStyles.text}>
      Você solicitou a alteração do seu e-mail na <strong>{siteName}</strong> de <span style={{ color: '#f97316' }}>{oldEmail}</span> para <span style={{ color: '#f97316' }}>{newEmail}</span>.
    </Text>
    
    <Section style={{ textAlign: 'center', margin: '40px 0' }}>
      <Button href={confirmationUrl} style={emailStyles.button}>
        Confirmar novo e-mail
      </Button>
    </Section>
    
    <Text style={emailStyles.text}>
      Se você não solicitou esta mudança, entre em contato com nosso suporte imediatamente.
    </Text>
  </Layout>
)

export default EmailChangeEmail
