import * as React from 'react'
import { Text, Button, Section, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Layout, emailStyles } from './Layout'

const SITE_NAME = 'REVMED'
const APP_URL = 'https://revmed.app.br/app'

interface PaymentApprovedProps {
  name?: string
  planName?: string
  amount?: string
  installmentAmount?: string
  paymentMethod?: 'pix' | 'credit_card' | string
  last4?: string
  installments?: number
}

const PaymentApprovedEmail = ({ name, planName, amount, installmentAmount, paymentMethod, last4, installments }: PaymentApprovedProps) => (
  <Layout previewText={`Seu pagamento foi aprovado — acesso liberado na ${SITE_NAME}`}>
    <Section style={emailStyles.badge}>
      <Text style={emailStyles.badgeText}>✓ PAGAMENTO APROVADO</Text>
    </Section>
    
    <Heading style={emailStyles.h1}>
      {name ? `Bem-vindo(a), ${name}!` : 'Pagamento confirmado!'}
    </Heading>
    
    <Text style={emailStyles.text}>
      Sua trajetória rumo à aprovação no Revalida ganhou um novo aliado. Recebemos a confirmação do seu pagamento e seu acesso à plataforma <strong>{SITE_NAME}</strong> já está 100% liberado.
    </Text>
    
    {planName ? (
      <Section style={emailStyles.card}>
        <Text style={emailStyles.cardLabel}>Detalhes do seu plano</Text>
        <Text style={emailStyles.cardValue}>{planName}</Text>
        {amount ? (
          <>
            <Hr style={emailStyles.hr} />
            <Text style={emailStyles.cardLabel}>Valor total</Text>
            <Text style={emailStyles.cardValue}>{amount}</Text>
          </>
        ) : null}
        
        {paymentMethod === 'pix' && (
          <>
            <Hr style={emailStyles.hr} />
            <Text style={emailStyles.cardLabel}>Forma de pagamento</Text>
            <Text style={emailStyles.cardValue}>Pix (À vista)</Text>
          </>
        )}
        
        {paymentMethod !== 'pix' && (
          <>
            <Hr style={emailStyles.hr} />
            <Text style={emailStyles.cardLabel}>Forma de pagamento</Text>
            <Text style={emailStyles.cardValue}>
              Cartão {last4 ? `final ${last4}` : ''}
              {installments && installments > 1 
                ? ` — ${installments}x de ${installmentAmount || 'R$ --'}` 
                : ' — À vista'}
            </Text>
          </>
        )}
      </Section>
    ) : null}
    
    <Section style={{ textAlign: 'center', margin: '40px 0' }}>
      <Button href={APP_URL} style={emailStyles.button}>
        Começar minha preparação agora
      </Button>
    </Section>
    
    <Text style={emailStyles.text}>
      A partir de agora, você tem em mãos as melhores ferramentas, checklists e suporte para conquistar seu diploma no Brasil. 
      <br /><br />
      Bons estudos, futuro(a) aprovado(a)! Qualquer dúvida, nossa equipe está à disposição.
    </Text>
  </Layout>
)

// Helper for Heading since it was missing in the Layout styles but needed here
import { Heading } from '@react-email/components'

export const template = {
  component: PaymentApprovedEmail,
  subject: 'Pagamento aprovado — Seja bem-vindo(a) à REVMED!',
  displayName: 'Pagamento aprovado',
  previewData: { name: 'Dra. Ana', planName: 'Plano Mentoria Completa', amount: 'R$ 597,00', installmentAmount: 'R$ 59,70', paymentMethod: 'credit_card', last4: '4242', installments: 10 },
} satisfies TemplateEntry
