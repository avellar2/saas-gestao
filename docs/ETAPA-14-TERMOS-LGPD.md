# ETAPA 14 — Termos de Uso, Privacidade e LGPD

> Versão inicial, NÃO substitui revisão jurídica profissional.
> Usar como base até contratar advogado especialista em direito digital.

---

## 1. Termos de Uso (resumo)

### 1.1 Aceitação

Ao usar o AVGESTÃO, o cliente concorda com estes Termos. Se não concordar, não use o serviço.

### 1.2 O que é o AVGESTÃO

Plataforma SaaS (Software as a Service) de gestão empresarial multiempresa, com módulos de clientes, ordens de serviço, financeiro, estoque, agendamento, cardápio digital, entre outros.

### 1.3 Cadastro

- O cliente deve fornecer dados verdadeiros
- A senha é pessoal e intransferível
- O cliente é responsável por todas as ações feitas com sua conta

### 1.4 Uso permitido

- Uso para gestão do próprio negócio do cliente
- Multi-usuário dentro da mesma empresa
- Acesso via web (responsivo)

### 1.5 Uso proibido

- Revender o serviço sem autorização
- Tentar acessar dados de outros clientes
- Fazer engenharia reversa do software
- Usar para atividades ilegais

### 1.6 Pagamento

- Mensalidade cobrada via Stripe (cartão, boleto ou PIX)
- Atraso > 15 dias pode suspender a conta
- Cancelamento a qualquer momento (sem multa)
- Sem reembolso proporcional (plano mensal)

### 1.7 Limitação de responsabilidade

- Não nos responsabilizamos por perda de dados por mau uso
- Não nos responsabilizamos por danos indiretos
- Nossa responsabilidade total limita-se ao valor pago nos últimos 12 meses

### 1.8 Alterações nos termos

- Podemos atualizar estes termos
- Cliente será avisado por email com 30 dias de antecedência
- Se não concordar com novos termos, pode cancelar antes da vigência

### 1.9 Foro

Fórum da comarca de [CIDADE] para dirimir quaisquer questões.

---

## 2. Política de Privacidade (resumo LGPD)

### 2.1 Dados que coletamos

#### Do cliente (responsável pela empresa)
- Nome, email, CPF/CNPJ, telefone
- Dados de pagamento (processados pelo Stripe, não armazenados por nós)
- Logs de acesso (IP, timestamp, ações)

#### Dos usuários cadastrados pelo cliente
- Nome, email, telefone (opcional)
- Logs de uso dentro do sistema

#### Dos clientes finais cadastrados pelo nosso cliente
- **Importante**: esses dados são de responsabilidade do nosso cliente (controlador)
- Nós somos apenas operadores (processamos em nome do cliente)
- Não acessamos esses dados para nenhuma finalidade própria

### 2.2 Para que usamos os dados

- Fornecer o serviço contratado
- Processar pagamento
- Enviar emails transacionais (trial, cobrança, suporte)
- Suporte ao cliente
- Melhorias no produto (dados agregados, nunca individuais)

### 2.3 Com quem compartilhamos

- **Stripe**: processa pagamentos (PCI-DSS compliant)
- **Resend**: envia emails transacionais
- **Sentry**: monitora erros técnicos (com PII filtrada)
- **VPS Contabo**: hospeda o banco de dados (Brasil)

**Não vendemos, não alugamos, não compartilhamos dados para marketing.**

### 2.4 Direitos do titular (LGPD art. 18)

O titular dos dados tem direito a:

- Confirmação da existência de tratamento
- Acesso aos dados
- Correção de dados incompletos/incorretos
- Anonimização, bloqueio ou eliminação
- Portabilidade
- Revogação do consentimento

Para exercer esses direitos: `privacidade@avgestao.com.br` (resposta em até 15 dias).

### 2.5 Retenção de dados

- **Durante o contrato**: dados mantidos enquanto conta estiver ativa
- **Após cancelamento**: dados disponíveis para exportação por 30 dias
- **Após 30 dias do cancelamento**: dados são deletados do banco
- **Backups**: deletados automaticamente após 30 dias (retenção do backup)

### 2.6 Segurança

- HTTPS obrigatório (TLS 1.2+)
- Senhas hasheadas com bcrypt (cost 12)
- Isolamento multi-tenant com 3 camadas (middleware, Prisma, RLS)
- Backup diário criptografado em repouso
- Rate limiting em APIs
- Auditoria regular de segurança

### 2.7 Encarregado de dados (DPO)

Nome: [NOME DO DPO]
Email: `dpo@avgestao.com.br`
(ou, se não houver DPO, indicar responsável legal)

### 2.8 Cookies

Usamos apenas cookies essenciais para:
- Autenticação (sessão)
- Preferências de tema (claro/escuro)
- CSRF protection

**Não usamos cookies de marketing ou analytics invasivos.**

---

## 3. Política de Backup e Disponibilidade

### 3.1 SLA de disponibilidade

- **Meta**: 99,5% de uptime mensal (≈ 3,6 horas de downtime/mês)
- **Manutenção programada**: avisada com 48h de antecedência
- **Manutenção emergencial**: avisada com 1h de antecedência (quando possível)

### 3.2 Backup

- Backup diário do banco de dados (todo dia às 3h)
- Retenção de 30 dias
- Armazenado no mesmo datacenter (Brasil)
- **Não fazemos backup off-site no MVP** (considerar para V2)

### 3.3 Restore

- Cliente pode solicitar restore até 30 dias atrás
- Prazo de execução: até 24h úteis
- **Restore não é cobrado** se for nossa falha
- **Restore pode ser cobrado** se for por erro do cliente (ex: deletou dados por engano)

---

## 4. Política de Cancelamento

### 4.1 Pelo cliente

- A qualquer momento, sem multa
- Via painel do cliente ou email para `cancelamento@avgestao.com.br`
- Acesso continua até o fim do ciclo pago
- Dados disponíveis para exportação por 30 dias

### 4.2 Por nós

Podemos suspender/cancelar a conta se:

- Pagamento atrasado > 30 dias
- Violação dos termos de uso
- Uso ilegal do sistema
- Atividade que coloque outros clientes em risco

Cliente será avisado por email antes da suspensão, exceto em caso de urgência (ex: ataque hacker).

### 4.3 Reembolso

- **Mensal**: sem reembolso (ciclo já foi pago)
- **Anual**: sem reembolso (valor integral já foi pago)
- **Exceção**: erro comprovado nosso = reembolso pro-rata

---

## 5. LGPD — Responsabilidades

### 5.1 Do AVGESTÃO (operador)

- Processar dados apenas para fornecer o serviço
- Implementar medidas de segurança técnicas e administrativas
- Notificar o cliente em até 24h se houver incidente de segurança
- Auxiliar o cliente a atender titulares de dados
- Devolver ou deletar dados ao fim do contrato

### 5.2 Do Cliente (controlador)

- Obter consentimento dos titulares (seus clientes finais)
- Fornecer aviso de privacidade aos titulares
- Atender solicitações dos titulares (acesso, correção, etc)
- Definir base legal de tratamento
- Manter registro de operações (RIPD)

> **Importante**: o cliente é o controlador dos dados dos seus clientes finais. AVGESTÃO é apenas o operador. Isso significa que o cliente responde diretamente à ANPD pelos dados dos seus clientes.

---

## 6. Disposições Gerais

- Estes termos são regidos pela lei brasileira
- LGPD (Lei 13.709/2018) é a lei aplicável para proteção de dados
- Marco Civil da Internet (Lei 12.965/2014) aplica-se a questões de rede
- CDC (Código de Defesa do Consumidor) aplica-se a relações de consumo

---

## 7. Contato

Para questões sobre estes termos, privacidade ou LGPD:

- **Email**: `privacidade@avgestao.com.br`
- **DPO**: `dpo@avgestao.com.br`
- **Suporte**: `suporte@avgestao.com.br`
- **Cancelamento**: `cancelamento@avgestao.com.br`

---

> ⚠️ **AVISO**: Este documento é uma versão inicial e **NÃO substitui revisão jurídica profissional**. Recomenda-se consultar um advogado especializado em direito digital antes de usar em produção com clientes pagantes.
