import React from 'react';
import { ArrowLeft, Shield, Mail, Database, Video, Users, Globe, Lock, Trash2, Baby, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
  const updatedAt = '27 de agosto de 2026';

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = './';
    }
  };

  const sections = [
    {
      icon: <Shield size={24} />,
      title: '1. Identificação do Responsável',
      content: (
        <div className="space-y-4">
          <p>
            Esta Política de Privacidade descreve como o <strong>SOS Editor</strong> (também referido como "S.O.S Editor" ou "Aplicativo" ou "Nós") coleta, utiliza, armazena e protege informações quando você utiliza:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>o aplicativo de desktop para Windows (Electron);</li>
            <li>o site oficial <a href="https://www.soseditor.com.br" className="text-primary hover:underline">www.soseditor.com.br</a>;</li>
            <li>o painel administrativo;</li>
            <li>o player público de vídeos;</li>
            <li>e as APIs relacionadas que integram o serviço.</li>
          </ul>
          <p>
            O serviço é disponibilizado por <strong>S.O.S Editor Team</strong> — responsável pelo produto e pelas informações tratadas.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Data da última atualização:</strong> {updatedAt}.
          </p>
        </div>
      )
    },
    {
      icon: <Database size={24} />,
      title: '2. Quais dados podem ser tratados',
      content: (
        <div className="space-y-4">
          <p>
            O SOS Editor trata somente informações necessárias para a operação do aplicativo, do site e da publicação de vídeos. Não solicitamos dados sensíveis desnecessariamente.
          </p>
          <h4 className="font-semibold text-white">2.1 Dados fornecidos voluntariamente pelo usuário</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>E-mail e senha:</strong> quando você cria uma conta ou licença no aplicativo/site;</li>
            <li><strong>Nome de exibição (display_name):</strong> quando fornecido no cadastro;</li>
            <li><strong>Cupons de desconto:</strong> caso você informe no momento de aquisição de plano;</li>
            <li><strong>Informações de pagamento:</strong> quando você contrata um plano pago, dados de pagamento (como referência de transação e provedor de pagamento) podem ser registrados como pagamento (payment_provider / payment_ref) para controle de licenças e ativação de plano;</li>
            <li><strong>Comunicações por e-mail:</strong> caso você entre em contato via canal de suporte.</li>
          </ul>
          <h4 className="font-semibold text-white">2.2 Dados técnicos e de uso necessários</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Identificador de dispositivo (device_id):</strong> gerado pelo aplicativo de desktop para associar licença/ensaio trial ao computador do usuário (campo users.device_id);</li>
            <li><strong>Endereço IP:</strong> coletado no momento de criação da conta (ip_created), no momento de publicação de vídeos (uploader_ip), no registro de acessos administrativos (ip_address) e em rotas de auditoria, sempre que houver necessidade técnica e legal;</li>
            <li><strong>Dados de sessão de administrador:</strong> token JWT (JSON Web Token) Bearer para autenticação do painel administrativo, armazenado no lado do cliente e enviado como header Authorization;</li>
            <li><strong>Visitas e downloads:</strong> contadores anonimizados de visitas ao site e downloads realizados (tabelas visits, downloads.count, track/download views);</li>
            <li><strong>Dados de visualizações:</strong> contador de views em vídeos publicados (tabela videos.views), incrementado quando um vídeo é acessado pelo player público.</li>
          </ul>
        </div>
      )
    },
    {
      icon: <Video size={24} />,
      title: '3. Arquivos, vídeos e conteúdo processado pelo Aplicativo',
      content: (
        <div className="space-y-4">
          <p>
            O SOS Editor é um editor de vídeos offline para Windows. A maior parte do processamento de vídeos, corte, adição de texto animado, áudio e ajustes acontece <strong>localmente no computador do usuário</strong>.
          </p>
          <h4 className="font-semibold text-white">3.1 Publicação de vídeos</h4>
          <p>
            Quando o usuário opta pela funcionalidade de publicação ("Gerar e Publicar"), o vídeo exportado é enviado para o armazenamento de objetos do SOS Editor, conforme fluxo:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>O aplicativo solicita uma <strong>URL de upload pré-assinada (Presigned PUT)</strong> à API;</li>
            <li>O arquivo do vídeo é enviado <strong>diretamente do computador do usuário para o bucket SOS-Editor-Videos (Cloudflare R2)</strong>, sem passar corpo a corpo pelo servidor;</li>
            <li>Após a conclusão, o aplicativo confirma o upload e os seguintes atributos são registrados em banco de dados: título (title), nome do arquivo (filename), tamanho em bytes (size_bytes), tipo MIME (mime_type), data de criação (created_at), ID do dispositivo que enviou (uploader_device_id) e endereço IP de quem enviou (uploader_ip);</li>
            <li>O vídeo publicado é servido publicamente por CDN, na URL <code className="bg-black/40 px-1 rounded text-sm text-primary">https://www.soseditor.com.br/video/&lt;video_id&gt;</code>.</li>
          </ul>
          <h4 className="font-semibold text-white">3.2 Armazenamento de arquivos</h4>
          <p>
            Os vídeos publicados permanecem armazenados no bucket Cloudflare R2, enquanto os metadados (sem o conteúdo binário) ficam no banco de dados SQL Cloudflare D1. Vídeos NÃO publicados (trabalhos locais, projetos temporários, rascunhos, exportações não enviadas) permanecem exclusivamente no computador do usuário e <strong>NÃO são coletados pelo SOS Editor</strong>.
          </p>
        </div>
      )
    },
    {
      icon: <Users size={24} />,
      title: '4. Finalidades de uso dos dados',
      content: (
        <ul className="list-disc pl-6 space-y-3">
          <li>Permitir autenticação, ativação de licenças, plano trial e associação de dispositivo do usuário;</li>
          <li>Viabilizar publicação, reprodução pública e compartilhamento de vídeos exportados pelo usuário;</li>
          <li>Fornecer suporte, atender contatos e responder comunicações enviadas pelos usuários;</li>
          <li>Combater fraudes, acessos indevidos, abusos e cumprir obrigações legais/administrativas (como auditorias via tabela admin_audit_logs);</li>
          <li>Medir estatísticas anônimas de acessos, downloads e visualizações para melhoria do serviço;</li>
          <li>Executar obrigações contratuais com planos pagos (controle de subscription, ativação e expiração).</li>
        </ul>
      )
    },
    {
      icon: <Globe size={24} />,
      title: '5. Compartilhamento de dados com terceiros',
      content: (
        <div className="space-y-4">
          <p>
            O SOS Editor compartilha dados somente nos casos abaixo, com terceiros que realmente participam da operação do produto:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Cloudflare, Inc.:</strong> provedor de infraestrutura em nuvem utilizado para: (a) hospedagem da API em Workers; (b) banco de dados relacional D1 (metadados); (c) armazenamento de objetos R2 (vídeos publicados); (d) rede CDN para entrega do player público e site;</li>
            <li><strong>GitHub (GitHub Pages):</strong> hospedagem estática do site oficial, painel admin e player público;</li>
            <li><strong>Provedor de pagamento (payment_provider registrado):</strong> quando você faz uma aquisição de plano pago, o provedor responsável processa o pagamento e retorna uma referência (payment_ref) ao SOS Editor para ativação da licença;</li>
            <li><strong>Autoridades públicas ou judiciais:</strong> exclusivamente mediante ordem judicial/requisição legal válida, no limite do exigido por lei.</li>
          </ul>
          <p>
            Não há venda, aluguel, troca ou exploração comercial dos seus dados para anunciantes, parceiros ou plataformas de publicidade.
          </p>
        </div>
      )
    },
    {
      icon: <Lock size={24} />,
      title: '6. Segurança das informações',
      content: (
        <div className="space-y-4">
          <ul className="list-disc pl-6 space-y-2">
            <li>Transmissão HTTPS (TLS) em todo o site, player, API e uploads;</li>
            <li>Autenticação de administrador por JWT com senha hasheada;</li>
            <li>Uploads diretos via presigned URL, reduzindo superfície de exposição;</li>
            <li>Controle de permissões administrativas e trilha de auditoria (admin_audit_logs) com IP e data;</li>
            <li>Armazenamento em provedores com certificações e boas práticas de segurança (Cloudflare e GitHub Pages).</li>
          </ul>
          <p>
            Apesar dos controles, nenhum sistema de internet é 100% seguro. Caso seja identificado incidente de segurança relevante, os afetados e as autoridades competentes serão comunicados nos termos legais aplicáveis.
          </p>
        </div>
      )
    },
    {
      icon: <Trash2 size={24} />,
      title: '7. Retenção e exclusão de dados',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Contas e licenças:</strong> mantidas enquanto houver vínculo ativo ou obrigação legal, e excluídas mediante solicitação do titular, no prazo legal (exceto retenções obrigatórias por lei);</li>
          <li><strong>Vídeos publicados:</strong> permanecem publicados enquanto a conta estiver ativa ou até solicitação de exclusão do usuário, sendo removidos do bucket R2 e da tabela de vídeos quando aplicável;</li>
          <li><strong>Logs de auditoria e acessos administrativos:</strong> mantidos pelo período necessário à segurança e à auditoria, conforme legislação aplicável;</li>
          <li><strong>Dados técnicos de IP/device_id em uploads/publicações:</strong> mantidos para segurança, prevenção de abusos e auditorias enquanto o vídeo publicado permanecer disponível.</li>
        </ul>
      )
    },
    {
      icon: <Shield size={24} />,
      title: '8. Direitos do usuário',
      content: (
        <div className="space-y-4">
          <p>
            Você é titular dos seus dados pessoais e pode exercer, a qualquer tempo:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Confirmação da existência de tratamento e acesso aos dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
            <li>Eliminação de dados pessoais tratados com base em consentimento, quando aplicável;</li>
            <li>Informação sobre compartilhamento com terceiros;</li>
            <li>Revogação de consentimento, quando houver, sem prejuízo do tratamento legítimo anterior;</li>
            <li>Direito à portabilidade, quando aplicável por lei.</li>
          </ul>
          <p>
            Para exercer esses direitos, basta contatar o canal indicado na seção 12 abaixo.
          </p>
        </div>
      )
    },
    {
      icon: <RefreshCw size={24} />,
      title: '9. Cookies e tecnologias semelhantes',
      content: (
        <div className="space-y-4">
          <p>
            O site oficial e o painel administrativo <strong>NÃO utilizam cookies publicitários, analytics de terceiros, beacons, pixels ou qualquer tecnologia de rastreamento de publicidade</strong>.
          </p>
          <p>
            Tecnologias de armazenamento estritamente necessárias:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Armazenamento local (Web Storage / localStorage / sessionStorage):</strong> exclusivamente para sessão autenticada do painel administrativo (ex.: token JWT) e preferências locais do navegador, sem finalidade de rastreamento.</li>
            <li><strong>Cookies de sessão HTTP nativos:</strong> se necessários para manter compatibilidade do navegador durante navegação HTTPS no domínio.</li>
          </ul>
          <p>
            Você pode gerenciar essas preferências diretamente nas configurações de privacidade do seu navegador.
          </p>
        </div>
      )
    },
    {
      icon: <Baby size={24} />,
      title: '10. Privacidade de menores',
      content: (
        <p>
          O SOS Editor não é direcionado a crianças ou adolescentes com idade inferior a 18 (dezoito) anos. Não coletamos intencionalmente dados pessoais de menores. Caso seja identificado tratamento de dados de menor sem autorização legal adequada, providenciaremos a exclusão imediata das informações após contato responsável, utilizando o canal da seção seguinte.
        </p>
      )
    },
    {
      icon: <RefreshCw size={24} />,
      title: '11. Alterações nesta Política',
      content: (
        <p>
          Podemos atualizar esta Política ocasionalmente para refletir novas funcionalidades, mudanças legais ou ajustes operacionais. A versão mais recente sempre estará disponível em <a href="https://www.soseditor.com.br/politica-de-privacidade/" className="text-primary hover:underline">www.soseditor.com.br/politica-de-privacidade/</a>, com a data de última atualização indicada no topo. Quando uma alteração for relevante, faremos a comunicação por meio adequado no site ou no aplicativo.
        </p>
      )
    },
    {
      icon: <Mail size={24} />,
      title: '12. Contato de privacidade e suporte',
      content: (
        <div className="space-y-4">
          <p>
            Para dúvidas, reclamações, solicitações de direitos de titular, questões sobre segurança ou tratamento de dados pessoais no SOS Editor, contate o responsável pelo serviço:
          </p>
          <div className="glass-card p-5 space-y-2">
            <p className="font-semibold text-white">S.O.S Editor Team</p>
            <p>Site oficial: <a href="https://www.soseditor.com.br" className="text-primary hover:underline">https://www.soseditor.com.br</a></p>
            <p>
              E-mail de contato:{' '}
              <a href="mailto:contato@soseditor.com.br" className="text-primary font-medium hover:underline">
                contato@soseditor.com.br
              </a>
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background text-gray-100 font-sans selection:bg-primary selection:text-white overflow-x-hidden">
      <Navbar />

      <main className="container-custom py-12 md:py-16">
        {/* Cabeçalho */}
        <div className="mb-10">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span>Voltar para a página inicial</span>
          </button>

          <div className="glass-card p-6 md:p-10">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Shield size={32} />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                  Política de Privacidade
                </h1>
                <p className="text-gray-400 mb-2">
                  Como o SOS Editor coleta, utiliza, armazena e protege as suas informações.
                </p>
                <p className="text-sm text-gray-500">
                  Última atualização: <strong className="text-gray-300">{updatedAt}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Seções */}
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <section key={idx} className="glass-card p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-white/5 border border-white/10 text-primary flex items-center justify-center">
                  {section.icon}
                </div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-white pt-1">
                  {section.title}
                </h2>
              </div>
              <div className="pl-0 md:pl-15 text-gray-300 leading-relaxed text-[15px]">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button onClick={handleBack} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={18} />
            Voltar para a página inicial
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
