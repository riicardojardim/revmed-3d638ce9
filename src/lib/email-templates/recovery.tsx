import * as React from 'react'
import { Text, Button, Section, Heading } from '@react-email/components'
import { Layout, emailStyles } from './Layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Layout previewText={`Redefinição de senha — ${siteName}`}>
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>SEGURANÇA</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      Redefinição de senha
    </Heading>
    
    <Text style={emailStyles.text}>
      Recebemos uma solicitação para redefinir a senha da sua conta na <strong>{siteName}</strong>. <br /><br />
      Se você não fez essa solicitação, pode ignorar este e-mail com segurança. Sua senha atual permanecerá a mesma.
    </Text>
    
    <Section style={{ textAlign: 'center', margin: '40px 0' }}>
      <Button href={confirmationUrl} style={emailStyles.button}>
        Redefinir minha senha
      </Button>
    </Section>
    
    <Text style={emailStyles.text}>
      Se o botão não funcionar, copie e cole o link abaixo no seu navegador: <br />
      <span style={{ color: '#f97316', fontSize: '14px', wordBreak: 'break-all' }}>
        {confirmationUrl}
      </span>
    </Text>
  </Layout>
)

export default RecoveryEmail
