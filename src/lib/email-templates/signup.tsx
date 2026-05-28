import * as React from 'react'
import { Text, Button, Section, Heading } from '@react-email/components'
import { Layout, emailStyles } from './Layout'

interface SignupEmailProps {
  siteName: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Layout previewText={`Confirme seu e-mail na ${siteName}`}>
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>BEM-VINDO(A)</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      Confirme seu e-mail
    </Heading>
    
    <Text style={emailStyles.text}>
      Ficamos felizes em ter você conosco na <strong>{siteName}</strong>! <br /><br />
      Para começar sua preparação para o Revalida, por favor confirme seu endereço de e-mail ({recipient}) clicando no botão abaixo:
    </Text>
    
    <Section style={{ textAlign: 'center', margin: '40px 0' }}>
      <Button href={confirmationUrl} style={emailStyles.button}>
        Confirmar meu e-mail
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

export default SignupEmail
