# ETAPA 14 — Checklist de Venda do AVGESTÃO

> Checklist operacional para conduzir a primeira venda e o pós-venda dos primeiros clientes.

---

## 1. Antes de Vender (pré-requisitos comerciais)

### Sistema
- [ ] App em produção: `https://avgestao.com.br` respondendo 200
- [ ] HTTPS válido (cadeado no navegador)
- [ ] Login funciona
- [ ] Smoke test 100% passando
- [ ] Backup automatizado rodando (cron 3AM)
- [ ] Restore testado em staging
- [ ] Sentry capturando erros
- [ ] Stripe em modo **live**
- [ ] Resend domínio verificado

### Documentos legais
- [ ] Termos de uso publicados em `/termos` (ver `docs/ETAPA-14-TERMOS-LGPD.md`)
- [ ] Política de privacidade em `/privacidade`
- [ ] Proposta comercial em PDF (template próprio)
- [ ] Contrato de prestação de serviço (assinado por ambas as partes)

### Material comercial
- [ ] Demo gravada em vídeo (5 min) hospedada
- [ ] Apresentação PDF com cases
- [ ] Tabela de preços (ver `docs/ETAPA-14-PLANOS-PRECOS.md`)
- [ ] Print screens do produto (10 módulos)

### Operacional
- [ ] Conta Stripe recebe pagamentos
- [ ] Conta Resend envia emails
- [ ] WhatsApp Business configurado
- [ ] Email comercial (admin@avgestao.com.br) com resposta automática

---

## 2. Checklist da Demo (30-45 min)

### Antes da demo
- [ ] Confirmar horário com cliente
- [ ] Testar link da demo 1h antes
- [ ] Login de super admin e empresa demo prontos
- [ ] Plano de backup se a demo travar (gravar vídeo)

### Roteiro da demo (sugestão)
- [ ] **0-5 min**: Apresentação do problema (gestão manual em Excel/papel)
- [ ] **5-10 min**: Tour pelo sistema (dashboard, módulos)
- [ ] **10-20 min**: Demo prática — criar cliente, gerar OS, fechar OS, ver financeiro
- [ ] **20-25 min**: Cardápio digital / portal do cliente (se aplicável ao segmento)
- [ ] **25-30 min**: Relatórios, multi-usuário, multi-empresa
- [ ] **30-35 min**: Planos e preços
- [ ] **35-40 min**: Perguntas do cliente
- [ ] **40-45 min**: Próximos passos

### Pós-demo
- [ ] Enviar email de agradecimento (até 24h)
- [ ] Enviar proposta comercial (até 48h)
- [ ] Follow-up por WhatsApp (3 dias depois)

---

## 3. Checklist de Ativação do Cliente

### Recebimento do pagamento
- [ ] Pagamento confirmado no Stripe dashboard
- [ ] Recibo/NF enviado ao cliente
- [ ] Email de boas-vindas enviado

### Setup técnico (ver `docs/ETAPA-14-ONBOARDING-CLIENTE.md`)
- [ ] Empresa criada no painel super admin (status TRIAL 15 dias)
- [ ] Módulos ativados conforme plano contratado
- [ ] Usuário admin criado (com senha segura enviada por email separado)
- [ ] Senha inicial forçada a alterar no primeiro login
- [ ] Logo da empresa configurado (se aplicável)
- [ ] Dados de contato da empresa preenchidos
- [ ] Email de trial criado (Resend)
- [ ] Webhook do Stripe testado para esta empresa

### Onboarding do usuário admin
- [ ] Treinamento 1:1 agendado (30-45 min)
- [ ] Material de apoio enviado (vídeos + manual)
- [ ] Acesso ao WhatsApp de suporte enviado

---

## 4. Checklist Pós-Venda (Acompanhamento 7 dias)

### Dia 1
- [ ] Mensagem de boas-vindas (WhatsApp)
- [ ] Confirmar que login funcionou
- [ ] Confirmar que primeiro cliente foi cadastrado

### Dia 2
- [ ] Confirmar criação da primeira OS
- [ ] Tirar dúvidas operacionais

### Dia 3
- [ ] Confirmar fechamento de OS
- [ ] Confirmar que financeiro apareceu

### Dia 5
- [ ] Perguntar se está usando todos os módulos contratados
- [ ] Oferecer treinamento adicional se necessário

### Dia 7
- [ ] Pesquisa de satisfação (NPS)
- [ ] Agendar call de revisão quinzenal
- [ ] **Converter trial em ACTIVE** (se aplicável)
- [ ] Confirmar ativação automática via Stripe

### Dia 14
- [ ] Call de revisão (30 min)
- [ ] Avaliar upgrade de plano
- [ ] Avaliar indicação de outros clientes

### Dia 30
- [ ] Call de check-in mensal
- [ ] Relatório de uso (módulos ativos, OSs criadas)
- [ ] Renovação confirmada (se mensal)

---

## 5. Sinais de Alerta (cliente em risco)

Acompanhar e agir se:

- [ ] Cliente não loga há 7+ dias
- [ ] Cliente tem < 5 clientes cadastrados em 14 dias
- [ ] Cliente relata bugs repetidos
- [ ] Cliente pediu cancelamento
- [ ] Cliente atrasou pagamento

Ação: ligar proativamente, oferecer ajuda, ajustar plano se necessário.

---

## 6. Métricas de Sucesso (acompanhar mensalmente)

| Métrica | Meta |
|---------|------|
| Tempo médio de onboarding | < 3 dias |
| Taxa de conversão trial → pago | > 60% |
| NPS | > 8 |
| Churn mensal | < 5% |
| Ticket médio | R$ 99 |
| Módulos ativos por cliente (média) | ≥ 4 |
| OSs criadas por cliente/mês | ≥ 20 |
