import * as React from 'react'
import {
  Body, Container, Head, Html, Preview, Section, Img, Link, Text
} from '@react-email/components'

const LOGO_URL = 'https://fvlzmyqioojykoxoboce.supabase.co/storage/v1/object/public/site-assets/logo-revmed.png'
const SITE_NAME = 'REVMED'

interface LayoutProps {
  previewText: string
  children: React.ReactNode
  unsubscribeUrl?: string
}

export const Layout = ({ previewText, children, unsubscribeUrl }: LayoutProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{previewText}</Preview>
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
          {children}
          
          <Section style={footerSection}>
            <Text style={footer}>
              Equipe {SITE_NAME} <br />
              Transformando o Revalida em propósito.
            </Text>
          </Section>
        </Section>
        
        <Section style={{ textAlign: 'center', marginTop: '32px' }}>
          <Text style={{ color: '#666', fontSize: '12px' }}>
            Você recebeu este e-mail porque se cadastrou na {SITE_NAME}. <br />
            {unsubscribeUrl ? (
              <Link href={unsubscribeUrl} style={{ color: '#f97316', textDecoration: 'underline' }}>
                Clique aqui para sair da lista
              </Link>
            ) : (
              <Link href="{{unsubscribe_url}}" style={{ color: '#f97316', textDecoration: 'underline' }}>
                Clique aqui para sair da lista
              </Link>
            )}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

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

const footerSection: React.CSSProperties = {
  marginTop: '32px',
  borderTop: '1px solid #262626',
  paddingTop: '24px',
}

const footer: React.CSSProperties = { 
  fontSize: '14px', 
  color: '#52525b', 
  margin: 0,
  lineHeight: '1.5'
}

export const emailStyles = {
  badge: { 
    display: 'inline-block' as const, 
    padding: '6px 14px', 
    borderRadius: '999px', 
    backgroundColor: 'rgba(249, 115, 22, 0.1)', 
    marginBottom: '24px',
    border: '1px solid rgba(249, 115, 22, 0.2)'
  },
  badgeText: { 
    margin: 0, 
    fontSize: '11px', 
    fontWeight: 700, 
    letterSpacing: '0.1em', 
    color: '#f97316' 
  },
  h1: { 
    fontSize: '24px', 
    fontWeight: 800, 
    color: '#ffffff', 
    margin: '0 0 20px', 
    lineHeight: 1.3 
  },
  text: { 
    fontSize: '16px', 
    color: '#a1a1aa', 
    lineHeight: '1.6', 
    margin: '0 0 24px' 
  },
  card: { 
    backgroundColor: '#161616', 
    border: '1px solid #262626', 
    borderRadius: '12px', 
    padding: '24px', 
    margin: '32px 0' 
  },
  cardLabel: { 
    fontSize: '11px', 
    fontWeight: 600, 
    letterSpacing: '0.1em', 
    color: '#71717a', 
    textTransform: 'uppercase', 
    margin: '0 0 8px' 
  },
  cardValue: { 
    fontSize: '18px', 
    fontWeight: 700, 
    color: '#ffffff', 
    margin: 0 
  },
  hr: { 
    borderTop: '1px solid #262626', 
    margin: '20px 0' 
  },
  button: { 
    backgroundColor: '#f97316', 
    color: '#ffffff', 
    padding: '16px 32px', 
    borderRadius: '8px', 
    fontSize: '16px', 
    fontWeight: 700, 
    textDecoration: 'none', 
    display: 'inline-block' as const,
    boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2), 0 2px 4px -1px rgba(249, 115, 22, 0.1)'
  }
}
