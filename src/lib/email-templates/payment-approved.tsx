import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Img, Link
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'REVMED'
const APP_URL = 'https://revmed.app.br/app'
const LOGO_URL = 'https://fvlzmyqioojykoxoboce.supabase.co/storage/v1/object/public/site-assets/logo-revmed.png'

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
        <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Img
            src={LOGO_URL}
            width="180"
            alt={SITE_NAME}
            style={{ margin: '0 auto' }}
          />
        </Section>
        
        <Section style={content}>
          <Section style={badge}>
            <Text style={badgeText}>✓ PAGAMENTO APROVADO</Text>
          </Section>
          
          <Heading style={h1}>
            {name ? `Bem-vindo(a), ${name}!` : 'Pagamento confirmado!'}
          </Heading>
          
          <Text style={text}>
            Sua trajetória rumo à aprovação no Revalida ganhou um novo aliado. Recebemos a confirmação do seu pagamento e seu acesso à plataforma <strong>{SITE_NAME}</strong> já está 100% liberado.
          </Text>
          
          {planName ? (
            <Section style={card}>
              <Text style={cardLabel}>Detalhes do seu plano</Text>
              <Text style={cardValue}>{planName}</Text>
              {amount ? (
                <>
                  <Hr style={hr} />
                  <Text style={cardLabel}>Valor total</Text>
                  <Text style={cardValue}>{amount}</Text>
                </>
              ) : null}
            </Section>
          ) : null}
          
          <Section style={{ textAlign: 'center', margin: '40px 0' }}>
            <Button href={APP_URL} style={button}>
              Começar minha preparação agora
            </Button>
          </Section>
          
          <Text style={text}>
            A partir de agora, você tem em mãos as melhores ferramentas, checklists e suporte para conquistar seu diploma no Brasil. 
            <br /><br />
            Bons estudos, futuro(a) aprovado(a)! Qualquer dúvida, nossa equipe está à disposição.
          </Text>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            Equipe {SITE_NAME} <br />
            Transformando o Revalida em propósito.
          </Text>
        </Section>
        
        <Section style={{ textAlign: 'center', marginTop: '32px' }}>
          <Text style={{ color: '#666', fontSize: '12px' }}>
            Você recebeu este e-mail porque se cadastrou na {SITE_NAME}. <br />
            <Link href="{{unsubscribe_url}}" style={{ color: '#f97316', textDecoration: 'underline' }}>
              Clique aqui para sair da lista
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentApprovedEmail,
  subject: 'Seja bem-vindo(a)! Seu pagamento foi aprovado e o acesso está liberado',
  displayName: 'Pagamento aprovado',
  previewData: { name: 'Dra. Ana', planName: 'Plano Mentoria Completa', amount: 'R$ 597,00' },
} satisfies TemplateEntry

const main: React.CSSProperties = { 
  backgroundColor: '#000000', 
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
  margin: 0, 
  padding: '40px 0' 
}

const container: React.CSSProperties = { 
  maxWidth: '600px', 
  margin: '0 auto', 
  padding: '0 20px' 
}

const content: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  borderRadius: '16px',
  border: '1px solid #1f1f1f',
  padding: '40px',
  textAlign: 'left' as const,
}

const badge: React.CSSProperties = { 
  display: 'inline-block', 
  padding: '6px 14px', 
  borderRadius: '999px', 
  backgroundColor: 'rgba(249, 115, 22, 0.1)', 
  marginBottom: '24px',
  border: '1px solid rgba(249, 115, 22, 0.2)'
}

const badgeText: React.CSSProperties = { 
  margin: 0, 
  fontSize: '11px', 
  fontWeight: 700, 
  letterSpacing: '0.1em', 
  color: '#f97316' 
}

const h1: React.CSSProperties = { 
  fontSize: '24px', 
  fontWeight: 800, 
  color: '#ffffff', 
  margin: '0 0 20px', 
  lineHeight: 1.3 
}

const text: React.CSSProperties = { 
  fontSize: '16px', 
  color: '#a1a1aa', 
  lineHeight: '1.6', 
  margin: '0 0 24px' 
}

const card: React.CSSProperties = { 
  backgroundColor: '#161616', 
  border: '1px solid #262626', 
  borderRadius: '12px', 
  padding: '24px', 
  margin: '32px 0' 
}

const cardLabel: React.CSSProperties = { 
  fontSize: '11px', 
  fontWeight: 600, 
  letterSpacing: '0.1em', 
  color: '#71717a', 
  textTransform: 'uppercase', 
  margin: '0 0 8px' 
}

const cardValue: React.CSSProperties = { 
  fontSize: '18px', 
  fontWeight: 700, 
  color: '#ffffff', 
  margin: 0 
}

const hr: React.CSSProperties = { 
  borderTop: '1px solid #262626', 
  margin: '20px 0' 
}

const button: React.CSSProperties = { 
  backgroundColor: '#f97316', 
  color: '#ffffff', 
  padding: '16px 32px', 
  borderRadius: '8px', 
  fontSize: '16px', 
  fontWeight: 700, 
  textDecoration: 'none', 
  display: 'inline-block',
  boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2), 0 2px 4px -1px rgba(249, 115, 22, 0.1)'
}

const footer: React.CSSProperties = { 
  fontSize: '14px', 
  color: '#52525b', 
  margin: '24px 0 0',
  lineHeight: '1.5'
}
