import * as React from 'react'
import { Text, Section, Heading } from '@react-email/components'
import { Layout, emailStyles } from './Layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Layout previewText="Seu código de verificação">
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>AUTENTICAÇÃO</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      Código de verificação
    </Heading>
    
    <Text style={emailStyles.text}>
      Use o código abaixo para confirmar sua identidade:
    </Text>
    
    <Section style={emailStyles.card}>
      <Text style={{ 
        ...emailStyles.cardValue, 
        fontSize: '32px', 
        letterSpacing: '0.3em', 
        textAlign: 'center',
        fontFamily: 'monospace'
      }}>
        {token}
      </Text>
    </Section>
    
    <Text style={emailStyles.text}>
      Este código expirará em breve por motivos de segurança. Se você não solicitou este código, por favor ignore este e-mail.
    </Text>
  </Layout>
)

export default ReauthenticationEmail
