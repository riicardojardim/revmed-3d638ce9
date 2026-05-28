import * as React from 'react'
import { Text, Button, Section, Heading } from '@react-email/components'
import { Layout, emailStyles } from './Layout'

interface InviteEmailProps {
  siteName: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  confirmationUrl,
}: InviteEmailProps) => (
  <Layout previewText={`Você foi convidado(a) para participar da ${siteName}`}>
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>CONVITE</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      Você foi convidado(a)!
    </Heading>
    
    <Text style={emailStyles.text}>
      Você recebeu um convite para participar da <strong>{siteName}</strong>. 
      Clique no botão abaixo para aceitar o convite e criar sua conta:
    </Text>
    
    <Section style={{ textAlign: 'center', margin: '40px 0' }}>
      <Button href={confirmationUrl} style={emailStyles.button}>
        Aceitar convite
      </Button>
    </Section>
    
    <Text style={emailStyles.text}>
      Se você não esperava este convite, pode ignorar este e-mail.
    </Text>
  </Layout>
)

export default InviteEmail
