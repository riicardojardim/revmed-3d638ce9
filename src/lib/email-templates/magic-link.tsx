import * as React from 'react'
import { Text, Button, Section, Heading } from '@react-email/components'
import { Layout, emailStyles } from './Layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Layout previewText={`Seu link de acesso para ${siteName}`}>
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>ACESSO RÁPIDO</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      Seu link de acesso
    </Heading>
    
    <Text style={emailStyles.text}>
      Clique no botão abaixo para entrar na sua conta na <strong>{siteName}</strong>. 
      Este link é válido por tempo limitado.
    </Text>
    
    <Section style={{ textAlign: 'center', margin: '40px 0' }}>
      <Button href={confirmationUrl} style={emailStyles.button}>
        Entrar na plataforma
      </Button>
    </Section>
    
    <Text style={emailStyles.text}>
      Se você não solicitou este link, pode ignorar este e-mail.
    </Text>
  </Layout>
)

export default MagicLinkEmail
