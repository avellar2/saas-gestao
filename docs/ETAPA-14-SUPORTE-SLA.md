# ETAPA 14 — Política de Suporte e SLA

> Como oferecemos suporte, em que prazo, e o que está incluso.

---

## 1. Canais de Suporte

| Canal | Quando usar | Resposta esperada |
|-------|-------------|-------------------|
| **WhatsApp** (principal) | Dúvidas rápidas, bugs, status | Até 4h úteis |
| **Email** (suporte@avgestao.com.br) | Tickets formais, com anexo | Até 8h úteis |
| **Dashboard de bugs** (Trello público) | Acompanhar status de correções | Tempo real |

**Horário de atendimento**: segunda a sexta, 9h às 18h (horário de Brasília).
**Fora do horário**: tickets viram resposta no próximo dia útil.

---

## 2. Prazos de Resposta (SLA)

| Severidade | Descrição | Exemplo | Resposta | Resolução |
|------------|-----------|---------|----------|-----------|
| **Crítica** | Sistema fora do ar ou função principal quebrada | Login não funciona, banco fora | 1h útil | 4h úteis |
| **Alta** | Função importante com workaround | PDF não gera, mas dá pra ver na tela | 4h úteis | 24h úteis |
| **Média** | Bug que afeta 1 usuário | Cardápio não abre em 1 celular específico | 8h úteis | 72h úteis |
| **Baixa** | Cosmético ou dúvida | Cor errada, texto com typo | 24h úteis | Próxima sprint |

> "Resposta" = primeiro contato do suporte confirmando que viu o ticket.
> "Resolução" = correção entregue (não workaround).

---

## 3. O que Está Incluso no Plano

- ✓ Correção de bugs do sistema
- ✓ Dúvidas de uso (como faço X?)
- ✓ Orientação sobre configuração
- ✓ Acompanhamento pós-onboarding (7 dias)
- ✓ Atualizações de segurança
- ✓ Atualizações de funcionalidade incluídas no plano

---

## 4. O que NÃO Está Incluso (cobra à parte)

- ✗ Customização de funcionalidade nova
- ✗ Integração com sistema externo do cliente
- ✗ Importação de dados legados
- ✗ Treinamento adicional (após o onboarding inicial)
- ✗ Suporte 24/7
- ✗ Consultoria estratégica / análise de negócio
- ✗ SLA contratual com multa
- ✗ Customização de design (cor, logo além do padrão)

> Estes são projetos separados com orçamento à parte.

---

## 5. Suporte Emergencial (Fora do Horário)

**Apenas para clientes com SLA Premium** (add-on, R$ 200/mês):

- Resposta em 1h, 24/7
- Resolução em até 4h para críticos
- Canal dedicado (WhatsApp VIP)

> Para todos os outros clientes, emergências são tratadas no próximo dia útil.

---

## 6. Como o Cliente Abre um Ticket

### WhatsApp (recomendado)
Enviar mensagem para o número de suporte com:

```
Assunto: <resumo em 1 linha>

Empresa: <nome da empresa>
Usuário: <email do usuário>
Módulo: <módulo afetado>
Severidade: crítica / alta / média / baixa
Descrição: <o que está acontecendo>
Passos para reproduzir: <1. ... 2. ... 3. ...>
```

### Email
Enviar para `suporte@avgestao.com.br` com o mesmo template.

### Telefone
**Não atendemos telefone**. Use WhatsApp ou email. Telefone é só para negociação comercial.

---

## 7. Processo Interno de Suporte

### Recebimento
1. Cliente abre ticket (WhatsApp/email)
2. Operador classifica severidade
3. Operador cria card no Trello (ou similar)

### Resolução
1. Investigar (logs, banco, código)
2. Aplicar fix (commit + push)
3. Deploy (geralmente mesmo dia, máximo 24h)
4. Avisar cliente que está resolvido
5. Confirmar com cliente (smoke test do problema)

### Pós-resolução
- Documentar no card
- Atualizar FAQ se for recorrente
- Cobrar se for customização

---

## 8. Limites do Suporte

Para manter qualidade e preço baixo:

- **Máximo 10 tickets/mês por cliente** (acima disso, é treinamento adicional)
- **Sem suporte a integração externa** no plano padrão
- **Sem acesso ao banco** do cliente (somente via interface)
- **Sem garantia de tempo exato de resolução** (apenas resposta inicial)

---

## 9. Auto-Suporte (preferível quando possível)

Sempre que possível, indicar ao cliente:

- [ ] Manual do usuário (em construção)
- [ ] Vídeos tutoriais (em construção)
- [ ] FAQ no site
- [ ] Documentação de API (quando aplicável)

> Cliente que resolve sozinho = mais feliz e custa menos suporte.

---

## 10. Métricas de Suporte (acompanhar mensalmente)

| Métrica | Meta |
|---------|------|
| Tempo médio de resposta (crítica) | < 1h |
| Tempo médio de resposta (geral) | < 4h |
| Taxa de resolução no primeiro contato | > 60% |
| NPS do suporte | > 8 |
| Tickets por cliente/mês | < 5 |
| Taxa de reabertura | < 10% |

---

## 11. Quando Escalonar

Se o operador não conseguir resolver em 4h (crítica) ou 24h (alta):

1. Escalar para outro operador
2. Se ninguém resolve, escalar para o dev principal
3. Se mesmo assim não resolve, avisar cliente do atraso
4. **Nunca deixar cliente sem resposta por mais de 24h** (exceto fim de semana)

---

## 12. Quando Negar um Pedido

Se o cliente pedir algo fora do escopo:

> "Essa customização não está inclusa no plano atual, mas posso fazer como projeto separado. Quer que eu monte uma proposta?"

Não fazer sem combinar antes. Não prometer prazo sem avaliar.
