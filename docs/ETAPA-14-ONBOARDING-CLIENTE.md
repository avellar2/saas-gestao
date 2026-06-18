# ETAPA 14 — Onboarding do Cliente

> Procedimento operacional para ativar um novo cliente no AVGESTÃO.

---

## 1. Dados Necessários do Cliente

Solicitar antes do onboarding (via formulário ou WhatsApp):

### Dados da empresa
- [ ] Nome fantasia
- [ ] Razão social
- [ ] CNPJ ou CPF
- [ ] Endereço completo
- [ ] Telefone principal
- [ ] Email principal
- [ ] Logo (PNG, ideal 512x512, fundo transparente)
- [ ] Segmento (oficina, restaurante, loja, salão, etc)

### Dados do responsável (admin da conta)
- [ ] Nome completo
- [ ] CPF
- [ ] Cargo (dono, gerente, etc)
- [ ] Celular com WhatsApp
- [ ] Email pessoal (será usado para login)

### Módulos contratados
- [ ] Plano base (Inicial / Crescimento / Profissional / Completo)
- [ ] Módulos extras (se aplicável)
- [ ] Quantidade de usuários
- [ ] Data de início do trial

---

## 2. Criação da Empresa (Super Admin)

Acessar `https://avgestao.com.br/admin/empresas` (apenas super admin).

### Via interface
1. Login como `admin@avgestao.com.br` (super admin)
2. Ir em **Empresas** > **Nova empresa**
3. Preencher:
   - Nome: `<Nome fantasia>`
   - Status: TRIAL (forçado, ver P19)
   - trialDays: 15 (padrão)
4. Salvar

### Via API (alternativa)
```bash
curl -X POST https://avgestao.com.br/api/empresas \
  -H "Content-Type: application/json" \
  -b "authjs.session-token=<token>" \
  -d '{
    "name": "Nome da Empresa",
    "trialDays": 15
  }'
```

**Anotar o ID da empresa retornado** (vai ser usado nos próximos passos).

---

## 3. Ativação dos Módulos

Via painel super admin > **Módulos** ou API:

```bash
# Exemplo: ativar módulo de Orçamentos para empresa X
curl -X POST https://avgestao.com.br/api/admin/empresas/{id}/modules \
  -H "Content-Type: application/json" \
  -b "authjs.session-token=<token>" \
  -d '{
    "moduleKey": "quotes",
    "active": true,
    "price": 30
  }'
```

Módulos disponíveis (referência):

| Key | Nome |
|-----|------|
| `customers` | Clientes (sempre ativo) |
| `quotes` | Orçamentos |
| `service_orders` | Ordens de Serviço |
| `inventory` | Estoque |
| `finance` | Financeiro |
| `users` | Usuários |
| `scheduling` | Agendamento |
| `catalog` | Catálogo WhatsApp |
| `menu` | Cardápio Digital |
| `reports` | Relatórios |

---

## 4. Criação do Usuário Admin

Acessar `https://avgestao.com.br/admin/empresas/{id}/usuarios` (via super admin).

### Dados do admin
- Email: `<email pessoal do responsável>`
- Senha: **gerar senha forte** (16+ chars, ex: `openssl rand -base64 16`)
- Nome: `<nome completo>`
- Role: `COMPANY_ADMIN`
- Empresa: `<id da empresa>`
- Status: `active: true`

> **Enviar a senha por canal separado** (não no mesmo email do link). Sugestão: WhatsApp ou telefone.

---

## 5. Dados Iniciais da Empresa

Ajudar o cliente a configurar:

### Logo e identidade
- [ ] Logo carregado (em **Configurações da empresa**)
- [ ] Cor primária configurada (se houver)
- [ ] Nome fantasia confirmado
- [ ] Endereço e telefone preenchidos

### Primeiro cliente teste
- [ ] Criar 1-2 clientes reais
- [ ] Testar busca e listagem

### Catálogo inicial (se módulo ativo)
- [ ] Cadastrar 3-5 produtos OU serviços
- [ ] Definir preços
- [ ] Confirmar que aparece no cardápio/orçamento

### Funcionários (se módulo users ativo)
- [ ] Cadastrar funcionários adicionais
- [ ] Definir roles (COMPANY_ADMIN ou STAFF)
- [ ] Enviar senhas por canal seguro

---

## 6. Treinamento (30-45 min, 1:1 via Google Meet)

### Roteiro sugerido

#### Bloco 1: Tour (10 min)
- Dashboard
- Sidebar de módulos
- Configurações da empresa

#### Bloco 2: Fluxo principal (15 min)
- Criar cliente
- Criar orçamento OU OS
- Fechar OS / aprovar orçamento
- Ver financeiro gerado

#### Bloco 3: Funcionalidades extras (10 min)
- Portal do cliente (link público)
- Cardápio digital / QR code (se aplicável)
- Relatórios

#### Bloco 4: Dúvidas e próximos passos (10 min)
- Responder perguntas
- Alinhar próximos 7 dias
- Alinhar suporte (canal, SLA)

### Material de apoio
- [ ] Enviar vídeos curtos por WhatsApp
- [ ] Enviar PDF de "primeiros passos"
- [ ] Enviar link dos termos e política de privacidade

---

## 7. Acompanhamento Pós-Treinamento

### Imediato (até 2h depois)
- [ ] Resumir o que foi configurado
- [ ] Confirmar que login funcionou em ambiente do cliente
- [ ] Enviar link do WhatsApp de suporte

### Dia 1
- [ ] Mensagem de check-in
- [ ] Perguntar se tem dúvidas imediatas

### Dia 3
- [ ] Verificar se primeira OS foi criada
- [ ] Tirar dúvidas

### Dia 7
- [ ] Call de revisão (15-20 min)
- [ ] Avaliar ativação de módulos extras (upsell)

### Dia 14
- [ ] Ativar modo pago (se trial acabou)
- [ ] Confirmar Stripe funcionando

---

## 8. Dados Sensíveis — Boas Práticas

- **NUNCA** commitar dados de cliente no git
- **NUNCA** compartilhar senhas por email
- **SEMPRE** usar canal separado para enviar senha
- **SEMPRE** documentar o que foi feito (em sistema interno, não no AVGESTÃO)
- **SEMPRE** seguir LGPD: não armazenar dados além do necessário

---

## 9. Templates de Mensagens

### Email de boas-vindas (template)

```
Assunto: Bem-vindo ao AVGESTÃO!

Olá [NOME],

Sua conta está ativa. Aqui estão seus dados de acesso:

🔗 Link: https://avgestao.com.br
📧 Email: [EMAIL]
🔑 Senha: [ENVIADA EM MENSAGEM SEPARADA]

Treinamento agendado para [DATA/HORA] via Google Meet:
[LINK DO MEET]

Suporte:
📱 WhatsApp: [NÚMERO]
📧 Email: suporte@avgestao.com.br

Bons negócios!
Equipe AVGESTÃO
```

### WhatsApp de check-in (Dia 1)

```
Oi [NOME]! Aqui é [OPERADOR] do AVGESTÃO.

Tudo certo com o login? Conseguiu acessar a plataforma?

Qualquer dúvida, é só me chamar aqui no WhatsApp.

Bons negócios! 🚀
```

### WhatsApp de trial acabando (Dia 12 do trial)

```
Oi [NOME]! Seu trial do AVGESTÃO acaba em 3 dias.

Para continuar usando, é só [ATIVAR PAGAMENTO] ou me
chamar que eu te ajudo.

O que achou até agora? Tem alguma funcionalidade que
faltou?
```

---

## 10. Checklist Final do Onboarding

- [ ] Empresa criada
- [ ] Módulos ativados conforme contrato
- [ ] Admin criado com senha forte
- [ ] Senha enviada por canal seguro
- [ ] Logo carregado
- [ ] Dados da empresa preenchidos
- [ ] Primeiro cliente teste criado (com cliente)
- [ ] Treinamento 1:1 realizado
- [ ] Material de apoio enviado
- [ ] WhatsApp de suporte enviado
- [ ] Email de boas-vindas enviado
- [ ] Follow-up dia 1, 3, 7, 14 agendado
