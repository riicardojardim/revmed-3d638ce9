import * as React from 'react'
import { Text, Button, Section, Heading } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Layout, emailStyles } from './Layout'

const SITE_NAME = 'REVMED'
const APP_URL = 'https://revmed.app.br/app'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Layout previewText={`Bem-vindo(a) à ${SITE_NAME} — Sua jornada começa aqui!`}>
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>BEM-VINDO(A)</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      {name ? `Olá, ${name}!` : 'Seja muito bem-vindo(a)!'}
    </Heading>
    
    <Text style={emailStyles.text}>
      É uma honra ter você na nossa família. A partir de agora, você faz parte da maior comunidade de preparação para o Revalida INEP.
      <br /><br />
      Nosso propósito é devolver esperança, direção e confiança para que você possa exercer sua profissão no Brasil com excelência.
    </Text>
    
    <Section style={emailStyles.card}>
      <Text style={emailStyles.cardLabel}>O que você encontra agora:</Text>
      <Text style={emailStyles.cardValue}>• Checklists exclusivos</Text>
      <Text style={emailStyles.cardValue}>• Cronograma inteligente</Text>
      <Text style={emailStyles.cardValue}>• Mentoria especializada</Text>
      <Text style={emailStyles.cardValue}>• Flashcards focados</Text>
    </Section>
    
    <Section style={{ textAlign: 'center', margin: '40px 0' }}>
      <Button href={APP_URL} style={emailStyles.button}>
        Acessar meu painel
      </Button>
    </Section>
    
    <Text style={emailStyles.text}>
      Estamos aqui para caminhar ao seu lado em cada etapa. Se precisar de qualquer coisa, basta responder este e-mail ou nos chamar no suporte.
      <br /><br />
      Vamos juntos rumo à aprovação!
    </Text>
  </Layout>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bem-vindo(a) à REVMED — Sua jornada rumo à aprovação!',
  displayName: 'Bem-vindo',
  previewData: { name: 'Dra. Ana' },
} satisfies TemplateEntry
