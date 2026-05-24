import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/termos")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Termos de Uso — REVMED" },
      { name: "description", content: "Termos e condições de uso da plataforma REVMED de preparação para o Revalida." },
      { property: "og:title", content: "Termos de Uso — REVMED" },
      { property: "og:description", content: "Termos e condições de uso da plataforma REVMED de preparação para o Revalida." },
      { property: "og:url", content: "https://revmed.app.br/termos" },
    ],
    links: [{ rel: "canonical", href: "https://revmed.app.br/termos" }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-mint hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Voltar para o site
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Termos de Uso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: 24 de maio de 2026
          </p>
        </header>

        <div className="prose prose-invert mt-10 max-w-none text-sm leading-relaxed text-foreground/90">
          <p>
            Estes Termos de Uso regem o acesso e a utilização da plataforma <strong>REVMED</strong>,
            disponível em <strong>revmed.app.br</strong>. Ao criar uma conta ou utilizar nossos serviços,
            você declara ter lido, entendido e concordado integralmente com estes Termos.
          </p>

          <h2 className="mt-8 text-xl font-semibold">1. Objeto</h2>
          <p>
            A REVMED é uma plataforma digital de preparação para a prova de habilidades clínicas do
            Revalida, oferecendo estações simuladas em tempo real com áudio e vídeo, checklists,
            flashcards, resumos, vídeoaulas, ferramentas de avaliação por competência e recursos
            assistidos por inteligência artificial.
          </p>

          <h2 className="mt-8 text-xl font-semibold">2. Elegibilidade</h2>
          <p>
            Para usar a plataforma você deve ter pelo menos <strong>16 anos</strong> e ser plenamente
            capaz de contratar nos termos da legislação civil brasileira. Menores de 18 anos só podem
            contratar planos pagos com a assistência de seus responsáveis legais.
          </p>

          <h2 className="mt-8 text-xl font-semibold">3. Cadastro e conta</h2>
          <ul className="list-disc pl-6">
            <li>O cadastro é gratuito e requer informações verdadeiras, completas e atualizadas;</li>
            <li>Você é o único responsável pela confidencialidade da sua senha e por todas as atividades realizadas na sua conta;</li>
            <li>É proibido compartilhar credenciais ou utilizar a conta de terceiros — cada conta é pessoal e intransferível;</li>
            <li>
              Por segurança, <strong>cada conta só pode estar conectada em um dispositivo por vez</strong>.
              Ao acessar de um novo dispositivo, a sessão anterior é encerrada automaticamente;
            </li>
            <li>A REVMED pode suspender ou encerrar contas que violem estes Termos.</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold">4. Planos e pagamentos</h2>
          <ul className="list-disc pl-6">
            <li>
              A REVMED oferece planos com diferentes níveis de acesso (por exemplo, <strong>Ator</strong>{" "}
              e <strong>Full</strong>), com vigência limitada e descrição apresentada na página de planos
              antes da contratação;
            </li>
            <li>Os preços, formas de pagamento e ciclos de cobrança são informados antes da contratação;</li>
            <li>
              Os pagamentos são processados por gateways terceirizados (Pix, cartão de crédito e demais
              meios disponíveis), sujeitos aos termos próprios do provedor;
            </li>
            <li>O não pagamento na data de vencimento implica suspensão automática do acesso ao conteúdo pago.</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold">5. Direito de arrependimento e reembolso</h2>
          <p>
            Em conformidade com o art. 49 do Código de Defesa do Consumidor, você tem o direito de
            arrepender-se da compra em até <strong>7 (sete) dias corridos</strong> contados da contratação,
            recebendo o reembolso integral do valor pago. Após esse prazo, eventuais reembolsos serão
            avaliados caso a caso e podem ser proporcionais ao tempo de uso.
          </p>

          <h2 className="mt-8 text-xl font-semibold">6. Sessões ao vivo, áudio e vídeo</h2>
          <p>
            A REVMED oferece simulações de estação em tempo real, nas quais participantes assumem os
            papéis de <strong>ator (paciente simulado)</strong>, <strong>candidato avaliado</strong> e{" "}
            <strong>espectador</strong>. Ao entrar em uma sala você concorda que:
          </p>
          <ul className="list-disc pl-6">
            <li>
              Durante a estação, somente o ator e o candidato selecionado transmitem áudio e vídeo; os
              demais participantes permanecem apenas como ouvintes até o encerramento da estação;
            </li>
            <li>
              As sessões podem ser <strong>gravadas integralmente</strong> (áudio, vídeo e eventos) para
              fins de feedback, revisão pelo próprio usuário, controle de qualidade e treinamento da
              plataforma;
            </li>
            <li>
              Você é responsável por estar em ambiente adequado, com vestimenta apropriada e sem expor
              terceiros, dados sensíveis, prontuários reais ou informações de pacientes reais;
            </li>
            <li>
              É terminantemente proibido gravar, capturar tela, retransmitir ou divulgar publicamente o
              conteúdo das sessões sem autorização expressa dos demais participantes e da REVMED.
            </li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold">7. Recursos com inteligência artificial</h2>
          <p>
            A REVMED pode oferecer recursos baseados em modelos de IA (resumos, feedbacks automáticos,
            análises de desempenho, transcrições). Tais saídas têm caráter <strong>auxiliar</strong>,
            podem conter imprecisões e <strong>não substituem julgamento clínico, orientação médica
            individualizada nem avaliação humana</strong>. Você concorda em revisar criticamente qualquer
            conteúdo gerado por IA antes de utilizá-lo.
          </p>

          <h2 className="mt-8 text-xl font-semibold">8. Uso aceitável</h2>
          <p>Ao utilizar a plataforma, você se compromete a:</p>
          <ul className="list-disc pl-6">
            <li>Não copiar, redistribuir, vender ou disponibilizar publicamente o conteúdo da REVMED;</li>
            <li>Não realizar engenharia reversa, scraping ou qualquer forma automatizada de extração massiva;</li>
            <li>Não publicar, na comunidade, nos chats ou nas salas ao vivo, conteúdo ofensivo, discriminatório, ilegal, sexual, violento, com discurso de ódio ou que viole direitos de terceiros;</li>
            <li>Não inserir dados reais identificáveis de pacientes, nem violar sigilo médico em estações simuladas;</li>
            <li>Não tentar burlar limites técnicos da plataforma, incluindo a restrição de uma sessão por usuário;</li>
            <li>Respeitar colegas, professores e a equipe de suporte.</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold">9. Propriedade intelectual</h2>
          <p>
            Todo o conteúdo disponibilizado na plataforma — incluindo estações clínicas, checklists,
            flashcards, resumos, vídeoaulas, marca, logos e código-fonte — é de titularidade exclusiva da
            REVMED ou de seus licenciadores e é protegido pelas leis de direitos autorais e propriedade
            industrial. É concedida ao assinante uma licença pessoal, intransferível e não exclusiva,
            limitada ao período da assinatura ativa.
          </p>

          <h2 className="mt-8 text-xl font-semibold">10. Conteúdo gerado pelos usuários</h2>
          <p>
            Posts, comentários, mensagens, avaliações e atuações em sala enviados pelos usuários são de
            responsabilidade exclusiva de seus autores. Ao publicar conteúdo, você concede à REVMED uma
            licença gratuita, não exclusiva e mundial para armazenar, exibir e processar tal conteúdo
            estritamente para operar e melhorar a plataforma. A REVMED pode moderar, ocultar ou remover
            qualquer conteúdo que viole estes Termos, sem aviso prévio.
          </p>

          <h2 className="mt-8 text-xl font-semibold">11. Disponibilidade e limitações</h2>
          <p>
            Empenhamo-nos em manter a plataforma sempre disponível, mas o serviço é fornecido &quot;como
            está&quot;. Não garantimos disponibilidade ininterrupta, ausência de erros ou que o uso da
            plataforma garantirá aprovação no Revalida. Os conteúdos são de natureza educacional e não
            substituem orientação médica formal.
          </p>

          <h2 className="mt-8 text-xl font-semibold">12. Limitação de responsabilidade</h2>
          <p>
            Na máxima extensão permitida em lei, a REVMED não se responsabiliza por: (i) decisões clínicas
            tomadas com base no conteúdo da plataforma; (ii) perdas indiretas, lucros cessantes ou danos
            morais decorrentes do uso ou da indisponibilidade do serviço; (iii) condutas, falas ou
            conteúdos de outros usuários em salas ao vivo, fóruns ou chats; (iv) ações de terceiros, como
            falhas do gateway de pagamento, provedor de infraestrutura ou provedor de comunicação por
            áudio e vídeo.
          </p>

          <h2 className="mt-8 text-xl font-semibold">13. Privacidade e proteção de dados</h2>
          <p>
            O tratamento dos seus dados pessoais é regido pela nossa{" "}
            <Link to="/privacidade" className="text-mint hover:underline">Política de Privacidade</Link>,
            parte integrante destes Termos, em observância à Lei Geral de Proteção de Dados (Lei
            13.709/2018).
          </p>

          <h2 className="mt-8 text-xl font-semibold">14. Encerramento</h2>
          <p>
            Você pode encerrar sua conta a qualquer momento através do menu Perfil ou enviando solicitação
            para <a href="mailto:contato@revmed.app.br" className="text-mint hover:underline">contato@revmed.app.br</a>.
            A REVMED pode encerrar contas que violem estes Termos, sem prejuízo da apuração de eventuais
            responsabilidades.
          </p>

          <h2 className="mt-8 text-xl font-semibold">15. Alterações dos Termos</h2>
          <p>
            Estes Termos podem ser atualizados a qualquer momento. Alterações materiais serão comunicadas
            por e-mail ou aviso na plataforma. O uso continuado após a comunicação implica aceitação tácita
            da nova versão.
          </p>

          <h2 className="mt-8 text-xl font-semibold">16. Foro</h2>
          <p>
            Fica eleito o foro da comarca do domicílio do consumidor para dirimir quaisquer controvérsias
            decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que
            seja.
          </p>

          <h2 className="mt-8 text-xl font-semibold">17. Contato</h2>
          <p>
            Dúvidas sobre estes Termos podem ser enviadas para{" "}
            <a href="mailto:contato@revmed.app.br" className="text-mint hover:underline">contato@revmed.app.br</a>.
          </p>
        </div>

        <div className="mt-12 flex gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link to="/privacidade" className="text-mint hover:underline">Política de Privacidade</Link>
          <span>·</span>
          <Link to="/" className="hover:underline">Início</Link>
        </div>
      </div>
    </div>
  );
}