import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'REVMED'
const APP_URL = 'https://revmed.app.br/app'

interface PaymentApprovedProps {
  name?: string
  planName?: string
  amount?: string
}

const PaymentApprovedEmail = ({ name, planName, amount }: PaymentApprovedProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu pagamento foi aprovado — acesso liberado na {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={badge}>
          <Text style={badgeText}>✓ PAGAMENTO APROVADO</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Bem-vindo(a), ${name}!` : 'Pagamento confirmado!'}
        </Heading>
        <Text style={text}>
          Recebemos a confirmação do seu pagamento e seu acesso à <strong>{SITE_NAME}</strong> já está liberado.
        </Text>
        {planName ? (
          <Section style={card}>
            <Text style={cardLabel}>Plano contratado</Text>
            <Text style={cardValue}>{planName}</Text>
            {amount ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Valor</Text>
                <Text style={cardValue}>{amount}</Text>
              </>
            ) : null}
          </Section>
        ) : null}
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={APP_URL} style={button}>
            Acessar minha plataforma
          </Button>
        </Section>
        <Text style={text}>
          Bons estudos e boa preparação para o Revalida! Qualquer dúvida, é só responder este e-mail.
        </Text>
        <Text style={footer}>Equipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentApprovedEmail,
  subject: 'Pagamento aprovado — seu acesso REVMED está liberado',
  displayName: 'Pagamento aprovado',
  previewData: { name: 'Dra. Ana', planName: 'Plano Plataforma', amount: 'R$ 597,00' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#dcfce7', marginBottom: '20px' }
const badgeText: React.CSSProperties = { margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#15803d' }
const h1: React.CSSProperties = { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', lineHeight: 1.2 }
const text: React.CSSProperties = { fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }
const card: React.CSSProperties = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px 22px', margin: '24px 0' }
const cardLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px' }
const cardValue: React.CSSProperties = { fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }
const hr: React.CSSProperties = { borderTop: '1px solid #e2e8f0', margin: '14px 0' }
const button: React.CSSProperties = { backgroundColor: '#0f172a', color: '#ffffff', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#94a3b8', margin: '28px 0 0' }