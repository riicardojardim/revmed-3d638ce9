import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade — REVMED" },
      { name: "description", content: "Como a REVMED coleta, usa e protege seus dados pessoais em conformidade com a LGPD." },
      { property: "og:title", content: "Política de Privacidade — REVMED" },
      { property: "og:description", content: "Como a REVMED coleta, usa e protege seus dados pessoais em conformidade com a LGPD." },
      { property: "og:url", content: "https://revmed.app.br/privacidade" },
    ],
    links: [{ rel: "canonical", href: "https://revmed.app.br/privacidade" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-mint hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Voltar para o site
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: 22 de maio de 2026
          </p>
        </header>

        <div className="prose prose-invert mt-10 max-w-none text-sm leading-relaxed text-foreground/90">
          <p>
            Esta Política de Privacidade descreve como a <strong>REVMED</strong> (&quot;nós&quot;) coleta,
            utiliza, armazena, compartilha e protege os dados pessoais dos usuários (&quot;você&quot;) da
            plataforma <strong>revmed.app.br</strong>, em conformidade com a Lei nº 13.709/2018 (Lei Geral de
            Proteção de Dados Pessoais — LGPD).
          </p>

          <h2 className="mt-8 text-xl font-semibold">1. Quem é o controlador dos dados</h2>
          <p>
            O controlador dos dados tratados nesta plataforma é a REVMED, responsável pelas decisões
            referentes ao tratamento de dados pessoais. Para qualquer dúvida, exercício de direitos ou
            solicitação relacionada aos seus dados, entre em contato pelo e-mail{" "}
            <a href="mailto:contato@revmed.app.br" className="text-mint hover:underline">contato@revmed.app.br</a>.
          </p>

          <h2 className="mt-8 text-xl font-semibold">2. Dados que coletamos</h2>
          <p>Coletamos as seguintes categorias de dados:</p>
          <ul className="list-disc pl-6">
            <li><strong>Dados de cadastro:</strong> nome completo, e-mail, nome de usuário, data de nascimento, CPF e WhatsApp.</li>
            <li><strong>Dados de perfil:</strong> foto de avatar, ano da prova, especialidade de interesse e demais informações fornecidas voluntariamente.</li>
            <li><strong>Dados de uso:</strong> estações realizadas, pontuações, tempo de estudo, flashcards revisados, histórico de simulações.</li>
            <li><strong>Dados de pagamento:</strong> os dados sensíveis de cartão são processados diretamente pelo gateway de pagamento contratado; nós armazenamos apenas o status e o histórico da assinatura.</li>
            <li><strong>Dados técnicos:</strong> endereço IP, identificador do dispositivo, navegador, sistema operacional e cookies.</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold">3. Finalidades do tratamento</h2>
          <p>Utilizamos seus dados para:</p>
          <ul className="list-disc pl-6">
            <li>Criar e manter sua conta na plataforma;</li>
            <li>Liberar e personalizar o acesso ao conteúdo conforme seu plano;</li>
            <li>Processar pagamentos, emitir cobranças e gerir assinaturas;</li>
            <li>Acompanhar sua evolução de estudo e gerar relatórios de desempenho;</li>
            <li>Enviar comunicações operacionais (e-mails de confirmação, lembretes de vencimento, suporte);</li>
            <li>Cumprir obrigações legais e regulatórias;</li>
            <li>Prevenir fraudes e garantir a segurança da plataforma.</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold">4. Base legal</h2>
          <p>
            O tratamento dos dados é fundamentado em: (i) execução de contrato (art. 7º, V, LGPD) para a
            prestação do serviço; (ii) cumprimento de obrigação legal (art. 7º, II); (iii) legítimo interesse
            para segurança e prevenção a fraudes (art. 7º, IX); e (iv) consentimento (art. 7º, I) para
            comunicações de marketing, quando aplicável.
          </p>

          <h2 className="mt-8 text-xl font-semibold">5. Compartilhamento de dados</h2>
          <p>
            Não vendemos seus dados. Compartilhamos informações apenas com:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Provedores de infraestrutura</strong> (hospedagem, banco de dados, e-mail transacional);</li>
            <li><strong>Gateways de pagamento</strong> para processamento de assinaturas;</li>
            <li><strong>Autoridades públicas</strong>, quando exigido por lei ou ordem judicial.</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold">6. Cookies e tecnologias semelhantes</h2>
          <p>
            Utilizamos cookies essenciais para autenticação e funcionamento da plataforma e, mediante
            consentimento, cookies analíticos (como Google Analytics e Meta Pixel) para entender o uso do
            site e otimizar a experiência.
          </p>

          <h2 className="mt-8 text-xl font-semibold">7. Seus direitos como titular</h2>
          <p>Você pode, a qualquer momento:</p>
          <ul className="list-disc pl-6">
            <li>Confirmar a existência de tratamento dos seus dados;</li>
            <li>Acessar seus dados;</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
            <li>Solicitar a portabilidade dos dados;</li>
            <li>Revogar consentimento;</li>
            <li>Solicitar a exclusão da sua conta.</li>
          </ul>
          <p>
            Para exercer esses direitos, envie um e-mail para{" "}
            <a href="mailto:contato@revmed.app.br" className="text-mint hover:underline">contato@revmed.app.br</a>.
          </p>

          <h2 className="mt-8 text-xl font-semibold">8. Segurança e retenção</h2>
          <p>
            Adotamos medidas técnicas e organizacionais apropriadas para proteger seus dados, incluindo
            criptografia em trânsito (HTTPS), controle de acesso e backups regulares. Mantemos seus dados
            pelo tempo necessário ao cumprimento das finalidades descritas e das obrigações legais aplicáveis.
          </p>

          <h2 className="mt-8 text-xl font-semibold">9. Menores de idade</h2>
          <p>
            A plataforma é destinada a maiores de 18 anos. Não coletamos intencionalmente dados de menores
            sem o consentimento dos responsáveis legais.
          </p>

          <h2 className="mt-8 text-xl font-semibold">10. Atualizações desta política</h2>
          <p>
            Esta Política pode ser atualizada periodicamente. A versão vigente estará sempre disponível em{" "}
            <Link to="/privacidade" className="text-mint hover:underline">revmed.app.br/privacidade</Link>.
          </p>

          <h2 className="mt-8 text-xl font-semibold">11. Contato</h2>
          <p>
            Para dúvidas sobre esta Política ou sobre o tratamento dos seus dados pessoais, fale com nosso
            Encarregado de Dados (DPO) por meio do e-mail{" "}
            <a href="mailto:contato@revmed.app.br" className="text-mint hover:underline">contato@revmed.app.br</a>.
          </p>
        </div>

        <div className="mt-12 flex gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link to="/termos" className="text-mint hover:underline">Termos de Uso</Link>
          <span>·</span>
          <Link to="/" className="hover:underline">Início</Link>
        </div>
      </div>
    </div>
  );
}