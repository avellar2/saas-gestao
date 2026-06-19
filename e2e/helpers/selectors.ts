export const SEL = {
  // form
  emailInput: "#email",
  passwordInput: "#password",
  submitButton: 'button[type="submit"]',
  // layout
  sidebar: '[data-testid="sidebar"]',
  userMenu: '[data-testid="user-menu"]',
  pageHeading: "h1, h2",
  // tabelas
  dataTable: "table",
  tableRow: "table tbody tr",
  // botoes comuns
  newButton: 'a:has-text("Novo"), a:has-text("Nova"), button:has-text("Novo"), button:has-text("Nova")',
  searchInput: 'input[type="search"], input[placeholder*="Buscar" i], input[placeholder*="Pesquisar" i]',
  // status
  statusPill: '[data-testid="status-pill"]',
} as const;

export const ROUTES = {
  login: "/login",
  forgot: "/forgot-password",
  dashboard: "/dashboard",
  clientes: "/clientes",
  clienteNovo: "/clientes/novo",
  orcamentos: "/orcamentos",
  orcamentoNovo: "/orcamentos/novo",
  os: "/ordens-servico",
  osNova: "/ordens-servico/novo",
  agendamento: "/agendamento",
  financeiro: "/financeiro",
  financeiroNovo: "/financeiro/novo",
  estoque: "/estoque",
  estoqueNovo: "/estoque/novo",
  catalogo: "/catalogo",
  cardapio: "/cardapio",
  cardapioNovo: "/cardapio/novo",
  cardapioMesas: "/cardapio/mesas",
  cardapioCozinha: "/cardapio/cozinha",
  cardapioPedidos: "/cardapio/pedidos",
  cardapioCaixa: "/cardapio/caixa",
  cardapioConfig: "/cardapio/config",
  relatorios: "/relatorios",
  usuarios: "/usuarios",
  upgrade: "/upgrade",
  atividades: "/atividades",
  admin: "/admin",
  adminEmpresas: "/admin/empresas",
  adminModulos: "/admin/modulos",
} as const;
