const requiredColumns = [
  "hbl_no",
  "cliente",
  "cnpj",
  "service_description",
  "calculation_code",
  "entered_amount",
  "entered_curr_total",
  "currency"
];

const receiptRequiredColumns = [
  "file_no_m",
  "invoice_no_char",
  "receipt_no",
  "payer_name",
  "hbl_no",
  "receipt_amount",
  "posted_date",
  "bank_account",
  "imp_exp"
];

const columnAliases = {
  hbl_no: ["hbl_no", "hbl", "house_bl", "house_bill"],
  cliente: ["cliente", "client", "customer", "payer_name", "consignee_name"],
  cnpj: ["cnpj", "cons_cnpj_cpf_br", "cnpj_cpf", "cpf_cnpj", "tax_id"],
  service_description: ["service_description", "charge_explanation", "descricao_servico", "descri??o_serviço", "servico", "serviço"],
  calculation_code: ["calculation_code", "calc_code", "tipo_calculo"],
  entered_amount: ["entered_amount", "amount", "valor_unitario", "valor_unitário"],
  entered_curr_total: ["entered_curr_total", "curr_total", "total", "valor_total"],
  currency: ["currency", "currency_code", "moeda"],
  item_description: ["item_description", "item_desc", "descricao_item", "descri??o_item"],
  issue_date: ["issue_date", "ata_etd", "emission_date", "data_emissao", "data_emissão"],
  client_email: ["client_email", "email", "email_cliente", "pp_fax_email", "payer_email"]
};

const receiptColumnAliases = {
  file_no_m: ["file_no_m", "file_no", "file", "processo"],
  invoice_no_char: ["invoice_no_char", "invoice_no", "invoice", "numero_invoice"],
  receipt_no: ["receipt_no", "recibo", "numero_recibo", "receipt"],
  payer_name: ["payer_name", "cliente", "client", "customer", "pagador"],
  hbl_no: ["hbl_no", "hbl", "house_bl", "house_bill"],
  receipt_amount: ["receipt_amount", "amount", "valor", "valor_recebido", "received_amount"],
  posted_date: ["posted_date", "data_recebimento", "data_baixa", "payment_date"],
  bank_account: ["bank_account", "conta_bancaria", "bank", "conta"],
  imp_exp: ["imp_exp", "modalidade", "tipo"]
};

const todayIso = () => new Date().toISOString().slice(0, 10);

// ── Supabase config ──────────────────────────────────────────
const SUPABASE_URL = "https://xqyxhfwzqgogruufixbr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeXhoZnd6cWdvZ3J1dWZpeGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzQyMDcsImV4cCI6MjA5NzI1MDIwN30.Gk1SHb0tiVMEIrbWDod_ddBBDMFo8R3647kq2YXmcao";

async function sbFetch(path, options = {}) {
  const headers = new Headers({
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    ...(options.headers || {})
  });
  if (authToken) headers.set("Authorization", "Bearer " + authToken);
  const response = await fetch(SUPABASE_URL + path, { ...options, headers });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try { message = JSON.parse(text).message || JSON.parse(text).error_description || text; } catch {}
    throw new Error(message);
  }
  return text ? JSON.parse(text) : null;
}
// ─────────────────────────────────────────────────────────────

let authToken = sessionStorage.getItem("vanguardToken") || "";
let currentUserEmail = sessionStorage.getItem("vanguardUserEmail") || "";
let currentUserId = sessionStorage.getItem("vanguardUserId") || "";
let currentUserRole = sessionStorage.getItem("vanguardUserRole") || "operador";
let isBootstrapping = true;
let saveTimer = null;

function isAdmin() { return currentUserRole === "admin"; }
function isOperador() { return currentUserRole === "operador"; }

const persistentKeys = [
  "imports",
  "logs",
  "rows",
  "invoices",
  "receivables",
  "receipts",
  "receiptAllocations",
  "clients",
  "rates",
  "fxTables",
  "bank",
  "selectedInvoices",
  "selectedClients",
  "billed",
  "emailConfig",
  "billingUserEmail"
];

const sampleRows = [
  ["hbl_no", "cliente", "cnpj", "service_description", "item_description", "calculation_code", "entered_amount", "entered_curr_total", "currency", "issue_date"],
  ["HBL-9001", "Atlas Importadora", "11.111.111/0001-11", "Frete internacional", "Peças automotivas", "FLAT", "1200", "1200", "USD", todayIso()],
  ["HBL-9001", "Atlas Importadora", "11.111.111/0001-11", "Frete internacional", "Peças automotivas", "FLAT", "1200", "1200", "USD", todayIso()],
  ["HBL-9001", "Atlas Importadora", "11.111.111/0001-11", "THC origem", "Peças automotivas", "CBM", "80", "320", "USD", todayIso()],
  ["HBL-9002", "Norte Trading", "22.222.222/0001-22", "Desconsolidação", "Têxteis", "FLAT", "350", "350", "EUR", todayIso()],
  ["HBL-9002", "Norte Trading", "22.222.222/0001-22", "Desconsolidação", "Têxteis", "FLAT", "420", "420", "EUR", todayIso()],
  ["HBL-9003", "Baikal Tech", "33.333.333/0001-33", "Seguro internacional", "Componentes eletrônicos", "Percentual", "2.5", "760", "CNY", todayIso()]
];

const state = {
  imports: [],
  logs: [],
  rows: [],
  invoices: [],
  receivables: [],
  receipts: [],
  receiptAllocations: [],
  clients: [],
  rates: [],
  fxTables: {},
  billed: [],
  emailConfig: null,
  bank: null,
  selectedInvoices: [],
  selectedClients: [],
  billingUserEmail: "",
  activeClientHistory: "",
  dashboardClientFilter: "",
  dashboardHblFilter: "",
  dashboardDateFrom: "",
  dashboardDateTo: "",
  dashboardStatusFilter: "all",
  statusFilter: "all",
  invoiceSearch: "",
  invoiceDateFrom: "",
  invoiceDateTo: "",
  receivableSearchHbl: "",
  receivableSearchClient: "",
  receivableDateFrom: "",
  receivableDateTo: "",
  receiptSearchHbl: "",
  receiptSearchClient: "",
  receiptSearchInvoice: "",
  receiptSearchNo: "",
  receiptDateFrom: "",
  receiptDateTo: "",
  receiptStatusFilter: "all",
  activeReceiptId: "",
  activeInvoiceHbl: ""
};

const defaultRates = [
  { currency: "USD", date: todayIso(), value: 5.12, source: "padrão" },
  { currency: "EUR", date: todayIso(), value: 5.58, source: "padrão" },
  { currency: "CNY", date: todayIso(), value: 0.71, source: "padrão" },
  { currency: "GBP", date: todayIso(), value: 6.49, source: "padrão" },
  { currency: "CAD", date: todayIso(), value: 3.72, source: "padrão" },
  { currency: "JPY", date: todayIso(), value: 0.032, source: "padrão" }
];

const fxProfiles = {
  "PTAX": { spread: 0, iof: false },
  "Vanguard": { spread: 0.087, iof: false },
  "Vanguard + IOF": { spread: 0.087, iof: true },
  "Intermediária": { spread: 0.04, iof: false },
  "Intermediária + IOF": { spread: 0.04, iof: true },
  "Negociada 3%": { spread: 0.03, iof: false },
  "Negociada 3% + IOF": { spread: 0.03, iof: true },
  "Negociada 2%": { spread: 0.02, iof: false },
  "Negociada 2% + IOF": { spread: 0.02, iof: true },
  "Negociada 1%": { spread: 0.01, iof: false },
  "Negociada 1% + IOF": { spread: 0.01, iof: true }
};

const fxCurrencies = ["USD", "EUR", "GBP", "CAD", "JPY"];
const fxRows = ["PTAX", "Abertura", "Vanguard", "Vanguard + IOF", "Intermediária", "Intermediária + IOF", "Negociada 3%", "Negociada 3% + IOF", "Negociada 2%", "Negociada 2% + IOF", "Negociada 1%", "Negociada 1% + IOF"];
const sampleFxTableDate = "2026-05-15";
const sampleFxTable = {
  "PTAX": { USD: 4.9809, EUR: 5.8167, GBP: 6.7138, CAD: 3.6293, JPY: 0.0315 },
  "Abertura": { USD: 5.0551, EUR: 5.8776, GBP: 6.7511, CAD: 3.6754, JPY: 0.0319 },
  "Vanguard": { USD: 5.4100, EUR: 6.2900, GBP: 7.2300, CAD: 3.9400, JPY: 0.0400 },
  "Vanguard + IOF": { USD: 5.5777, EUR: 6.4850, GBP: 7.4541, CAD: 4.0621, JPY: 0.0412 },
  "Intermediária": { USD: 5.2573, EUR: 6.1127, GBP: 7.0211, CAD: 3.8224, JPY: 0.0332 },
  "Intermediária + IOF": { USD: 5.4203, EUR: 6.3022, GBP: 7.2388, CAD: 3.9409, JPY: 0.0342 },
  "Negociada 3%": { USD: 5.2068, EUR: 6.0539, GBP: 6.9536, CAD: 3.7857, JPY: 0.0328 },
  "Negociada 3% + IOF": { USD: 5.3682, EUR: 6.2416, GBP: 7.1692, CAD: 3.9030, JPY: 0.0339 },
  "Negociada 2%": { USD: 5.1562, EUR: 5.9952, GBP: 6.8861, CAD: 3.7489, JPY: 0.0325 },
  "Negociada 2% + IOF": { USD: 5.3160, EUR: 6.1810, GBP: 7.0996, CAD: 3.8651, JPY: 0.0335 },
  "Negociada 1%": { USD: 5.1057, EUR: 5.9364, GBP: 6.8186, CAD: 3.7122, JPY: 0.0322 },
  "Negociada 1% + IOF": { USD: 5.2639, EUR: 6.1204, GBP: 7.0300, CAD: 3.8272, JPY: 0.0332 }
};

if (!state.rates.length) state.rates = defaultRates;
if (!state.fxTables[sampleFxTableDate]) state.fxTables[sampleFxTableDate] = sampleFxTable;
if (!state.emailConfig) {
  state.emailConfig = {
    company: "Vanguard Logistics",
    fromEmail: "",
    smtpUser: "",
    smtpPass: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    subject: "Invoice {{hbl}} - {{cliente}} - {{empresa}}",
    body: "Prezados,\n\nSegue em anexo a invoice referente ao HBL {{hbl}}, cliente {{cliente}}, no valor de {{valor}}.\n\nVencimento: {{vencimento}}\n\nAtenciosamente,\n{{empresa}}"
  };
}
if (!state.bank) {
  state.bank = {
    bankName: "Banco",
    agency: "",
    account: "",
    beneficiary: "Vanguard Logistics",
    taxId: "",
    pix: "",
    instructions: "Pagamento conforme dados bancários informados abaixo."
  };
}
if (!state.clients.length) {
  state.clients = [
    {
      name: "Atlas Importadora",
      cnpj: "11.111.111/0001-11",
      dueDays: 45,
      fee: 1.75,
      fxProfile: "Vanguard",
      contractUntil: "2026-12-31",
      status: "ativo"
    }
  ];
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numberFmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

function getPersistedState() {
  return persistentKeys.reduce((acc, key) => {
    acc[key] = state[key];
    return acc;
  }, {});
}

function applyRemoteState(data = {}) {
  persistentKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== null) state[key] = data[key];
  });
}

// ── Auth & State — Supabase (multi-usuário + perfis) ─────────

async function login(email, password) {
  const payload = await sbFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  authToken = payload.access_token;
  currentUserEmail = email;
  currentUserId = payload.user?.id || "";
  sessionStorage.setItem("vanguardToken", authToken);
  sessionStorage.setItem("vanguardUserEmail", currentUserEmail);
  sessionStorage.setItem("vanguardUserId", currentUserId);
  await selfRegisterIfNeeded();
  await loadRemoteState();
}

async function loadMemberRole() {
  try {
    const rows = await sbFetch(
      "/rest/v1/vanguard_members?select=role&user_id=eq." + currentUserId + "&limit=1",
      { method: "GET" }
    );
    if (rows && rows.length > 0) {
      currentUserRole = rows[0].role || "operador";
    } else {
      currentUserRole = "operador";
    }
    sessionStorage.setItem("vanguardUserRole", currentUserRole);
  } catch {
    currentUserRole = "operador";
  }
}

async function loadRemoteState() {
  showSyncStatus("Carregando dados da empresa...");
  await loadMemberRole();
  try {
    const rows = await sbFetch(
      "/rest/v1/vanguard_company_state?select=data&company=eq.vanguard&limit=1",
      { method: "GET" }
    );
    if (rows && rows.length > 0) {
      const remoteData = rows[0].data || {};
      // Só aplica se o estado remoto tiver dados reais (não vazio)
      // Isso evita que um login de usuário sem acesso apague os dados da empresa
      const hasData = Object.keys(remoteData).length > 0;
      if (hasData) {
        applyRemoteState(remoteData);
      }
    } else {
      // Nenhum estado encontrado — pode ser RLS bloqueando (usuário não membro ainda)
      console.warn("loadRemoteState: nenhum estado retornado — verifique se o usuário está em vanguard_members");
    }
  } catch (e) {
    console.warn("loadRemoteState:", e.message);
    showSyncStatus("Erro ao carregar dados", true);
  }
  isBootstrapping = false;
  document.getElementById("authEmail").textContent = currentUserEmail + (isAdmin() ? " (Admin)" : "");
  document.getElementById("loginModal").hidden = true;
  showSyncStatus("Dados sincronizados");
  applyRoleRestrictions();
  consolidateInvoices();
  render();
  if (isAdmin()) renderUsersView();
}

async function saveRemoteState() {
  const data = getPersistedState();
  await sbFetch("/rest/v1/vanguard_company_state?company=eq.vanguard", {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: JSON.stringify({ data })
  });
  showSyncStatus("Salvo no banco");
}

function applyRoleRestrictions() {
  // Aba E-mail: só admin vê
  const emailNav = document.querySelector(".nav-item[data-view='email']");
  const emailView = document.getElementById("email");
  if (emailNav) emailNav.style.display = isAdmin() ? "" : "none";
  if (emailView) emailView.style.display = isAdmin() ? "" : "none";

  // Aba Usuários: só admin vê (criada dinamicamente)
  const usersNav = document.querySelector(".nav-item[data-view='users']");
  if (usersNav) usersNav.style.display = isAdmin() ? "" : "none";

  // Botões destrutivos: só admin
  const clearImports = document.getElementById("clearImports");
  if (clearImports) clearImports.style.display = isAdmin() ? "" : "none";
  const deleteClients = document.getElementById("deleteSelectedClients");
  if (deleteClients) deleteClients.style.display = isAdmin() ? "" : "none";
}

// ── Gestão de usuários (admin only) ──────────────────────────
async function loadMembers() {
  const rows = await sbFetch(
    "/rest/v1/vanguard_members?select=id,email,role,created_at&order=created_at.asc",
    { method: "GET" }
  );
  return rows || [];
}

async function addMember(email, role) {
  // Busca o user_id pelo email via admin — precisa que o usuário já exista no Auth
  // Estratégia: o próprio usuário se auto-cadastra no primeiro login se não for membro
  // Admin adiciona pelo email; quando esse usuário logar, o sistema encontra o registro
  await sbFetch("/rest/v1/vanguard_members", {
    method: "POST",
    headers: { "Prefer": "return=minimal" },
    body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000000", email, role })
  });
}

async function updateMemberRole(memberId, role) {
  await sbFetch("/rest/v1/vanguard_members?id=eq." + memberId, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: JSON.stringify({ role })
  });
}

async function removeMember(memberId) {
  await sbFetch("/rest/v1/vanguard_members?id=eq." + memberId, {
    method: "DELETE"
  });
}

async function selfRegisterIfNeeded() {
  // Verifica se o usuário já tem registro em vanguard_members
  // O INSERT usa uma policy especial (self_register) que permite auto-cadastro
  try {
    const rows = await sbFetch(
      "/rest/v1/vanguard_members?select=user_id,email,role&user_id=eq." + currentUserId + "&limit=1",
      { method: "GET" }
    );
    if (!rows || rows.length === 0) {
      // Novo usuário — tenta auto-registro como operador
      // A policy "Usuário se auto-registra" no Supabase permite esse INSERT
      try {
        await sbFetch("/rest/v1/vanguard_members", {
          method: "POST",
          headers: { "Prefer": "return=minimal" },
          body: JSON.stringify({ user_id: currentUserId, email: currentUserEmail, role: "operador" })
        });
      } catch (insertErr) {
        // Se falhar (ex: RLS), loga mas não deixa apagar dados da empresa
        console.warn("selfRegisterIfNeeded INSERT:", insertErr.message);
      }
    } else {
      // Usuário já existe — atualiza email se mudou, preserva o role
      if (rows[0].email !== currentUserEmail) {
        try {
          await sbFetch("/rest/v1/vanguard_members?user_id=eq." + currentUserId, {
            method: "PATCH",
            headers: { "Prefer": "return=minimal" },
            body: JSON.stringify({ email: currentUserEmail })
          });
        } catch (patchErr) {
          console.warn("selfRegisterIfNeeded PATCH:", patchErr.message);
        }
      }
    }
  } catch (e) {
    console.warn("selfRegisterIfNeeded:", e.message);
  }
}

async function renderUsersView() {
  const container = document.getElementById("usersViewBody");
  if (!container) return;
  container.innerHTML = "<tr><td colspan='3' class='empty'>Carregando...</td></tr>";
  try {
    const members = await loadMembers();
    container.innerHTML = members.length ? members.map((m) => `
      <tr>
        <td>${escapeHtml(m.email)}</td>
        <td>
          <select data-member-role="${m.id}" ${m.user_id === currentUserId ? "disabled title='Você não pode alterar seu próprio perfil'" : ""}>
            <option value="operador" ${m.role === "operador" ? "selected" : ""}>Operador</option>
            <option value="admin" ${m.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td>
          ${m.user_id !== currentUserId ? `<button class="text-button" data-remove-member="${m.id}" style="color:var(--bad)">Remover</button>` : "<span style='color:var(--muted);font-size:0.8rem'>Você</span>"}
        </td>
      </tr>
    `).join("") : "<tr><td colspan='3' class='empty'>Nenhum membro cadastrado.</td></tr>";
  } catch (e) {
    container.innerHTML = `<tr><td colspan='3' class='empty'>Erro: ${escapeHtml(e.message)}</td></tr>`;
  }
}
// ─────────────────────────────────────────────────────────────

function showLogin(message = "") {
  isBootstrapping = true;
  document.getElementById("loginModal").hidden = false;
  document.getElementById("loginError").textContent = message;
  showSyncStatus("Login necessário", true);
}

function logout() {
  authToken = "";
  currentUserEmail = "";
  currentUserId = "";
  currentUserRole = "operador";
  sessionStorage.clear();
  document.getElementById("authEmail").textContent = "";
  showLogin("Sessão encerrada.");
}

function showSyncStatus(message, isError = false) {
  const target = document.getElementById("syncStatus");
  if (!target) return;
  target.textContent = message;
  target.classList.toggle("bad", Boolean(isError));
}

function save() {
  if (isBootstrapping || !authToken) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveRemoteState().catch((error) => {
      console.error(error);
      showSyncStatus("Erro ao salvar no banco", true);
    });
  }, 500);
}
// ─────────────────────────────────────────────────────────────

function parseMoney(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const raw = String(value).trim();
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;
  if (hasComma && hasDot) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = raw.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseLocaleNumber(value) {
  return parseMoney(value);
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeTaxId(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCompanyName(value) {
  return normalizeKey(value)
    .replace(/_/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(ltda|eireli|sa|s a|inc|llc|limited|logistica|logistics|services|service|worldwide|brasil|brazil)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameCompanyName(a, b) {
  const left = normalizeCompanyName(a);
  const right = normalizeCompanyName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if ((left.length >= 6 && right.includes(left)) || (right.length >= 6 && left.includes(right))) return true;
  const leftTokens = new Set(left.split(" ").filter((token) => token.length >= 4));
  const rightTokens = right.split(" ").filter((token) => token.length >= 4);
  return rightTokens.some((token) => leftTokens.has(token));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : dateFmt.format(date);
}

function isoFromBrDate(value) {
  const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : normalizeDate(value);
}

function formatOriginal(service) {
  return `${service.currency} ${numberFmt.format(service.entered_curr_total)}`;
}

function formatFx(service) {
  return service.currency === "BRL" ? "" : `${numberFmt.format(service.fxRate)}${service.fxProfile ? ` ${service.fxProfile}` : ""}`;
}

function bankDetailsHtml(bank = state.bank) {
  return `
    <p><strong>${escapeHtml(bank.beneficiary || "Vanguard Logistics")}</strong>${bank.taxId ? ` · CNPJ ${escapeHtml(bank.taxId)}` : ""}</p>
    <p>${escapeHtml(bank.bankName || "Banco")} ${bank.agency ? `· Agência ${escapeHtml(bank.agency)}` : ""} ${bank.account ? `· Conta ${escapeHtml(bank.account)}` : ""}</p>
    ${bank.pix ? `<p>Pix: ${escapeHtml(bank.pix)}</p>` : ""}
    ${bank.instructions ? `<p>${escapeHtml(bank.instructions)}</p>` : ""}
  `;
}

function bankDetailsText(bank = state.bank) {
  return [
    `${bank.beneficiary || "Vanguard Logistics"}${bank.taxId ? ` · CNPJ ${bank.taxId}` : ""}`,
    `${bank.bankName || "Banco"}${bank.agency ? ` · Agência ${bank.agency}` : ""}${bank.account ? ` · Conta ${bank.account}` : ""}`,
    bank.pix ? `Pix: ${bank.pix}` : "",
    bank.instructions || ""
  ].filter(Boolean);
}

function findColumn(headers, canonicalName) {
  const candidates = columnAliases[canonicalName] || [canonicalName];
  return candidates.map(normalizeKey).find((candidate) => headers.includes(candidate));
}

function normalizeDate(value) {
  if (!value) return todayIso();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = String(value).trim();
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);

  const match = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (match) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const day = Number(match[1]);
    const month = months[match[2].toLowerCase()];
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    if (month !== undefined) return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  }

  return todayIso();
}

function getRate(currency, date = todayIso()) {
  const upper = String(currency || "BRL").toUpperCase();
  if (upper === "BRL") return { currency: upper, value: 1, source: "nativo" };
  return [...state.rates]
    .filter((rate) => rate.currency === upper && rate.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || { currency: upper, value: 1, source: "fallback" };
}

function applyFxProfile(baseValue, profileName = "PTAX") {
  const profile = fxProfiles[profileName] || fxProfiles.PTAX;
  const withSpread = baseValue * (1 + profile.spread);
  return profile.iof ? withSpread * 1.031 : withSpread;
}

function getCommercialRate(currency, date, profileName = "PTAX") {
  if (String(currency || "").toUpperCase() === "BRL") {
    return {
      currency: "BRL",
      value: 1,
      baseValue: 1,
      profileName: "",
      source: "BRL sem conversão",
      displayValue: ""
    };
  }
  const base = getRate(currency, date);
  const table = state.fxTables[date] || state.fxTables[sampleFxTableDate];
  const tableValue = table?.[profileName]?.[currency];
  if (tableValue) {
    return {
      ...base,
      baseValue: table?.PTAX?.[currency] || base.value,
      value: Number(tableValue),
      profileName,
      source: `${profileName} cadastrado`
    };
  }
  return {
    ...base,
    baseValue: base.value,
    value: applyFxProfile(base.value, profileName),
    profileName,
    source: profileName === "PTAX" ? base.source : `${profileName} sobre ${base.source}`
  };
}

function upsertRate(rate) {
  state.rates = state.rates.filter((item) => !(item.currency === rate.currency && item.date === rate.date));
  state.rates.push(rate);
}

function bacenUrl(currency, date) {
  const [year, month, day] = date.split("-");
  const ptaxDate = `${month}-${day}-${year}`;
  return `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)@moeda='${currency}'&@dataInicial='${ptaxDate}'&@dataFinalCotacao='${ptaxDate}'&$top=100&$orderby=dataHoraCotacao%20desc&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao,tipoBoletim`;
}

async function fetchBacenRate(currency, date) {
  const upper = String(currency || "").toUpperCase();
  if (!upper || upper === "BRL") return null;

  try {
    const response = await fetch(`/api/ptaxcurrency=${encodeURIComponent(upper)}&date=${encodeURIComponent(date)}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (data.value) {
        return {
          currency: upper,
          date: data.date || date,
          requestedDate: date,
          value: Number(data.value),
          source: data.source || "Bacen PTAX venda"
        };
      }
    }
  } catch (error) {
    // Static mode can fail here; direct Banco Central fetch below is the fallback.
  }

  for (let offset = 0; offset < 8; offset += 1) {
    const lookup = new Date(`${date}T00:00:00Z`);
    lookup.setUTCDate(lookup.getUTCDate() - offset);
    const lookupDate = lookup.toISOString().slice(0, 10);
    try {
      const response = await fetch(bacenUrl(upper, lookupDate), { cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      const values = data.value || [];
      if (values.length) {
        const fechamento = values.find((item) => item.tipoBoletim === "Fechamento") || values[0];
        return {
          currency: upper,
          date: lookupDate,
          requestedDate: date,
          value: Number(fechamento.cotacaoVenda || fechamento.cotacaoCompra),
          source: "Bacen PTAX venda"
        };
      }
    } catch (error) {
      break;
    }
  }

  return null;
}

async function updateRatesForRows(rows) {
  const pairs = new Map();
  rows.forEach((row) => {
    if (row.currency && row.currency !== "BRL") pairs.set(`${row.currency}|${row.issue_date}`, row);
  });

  let updated = 0;
  for (const row of pairs.values()) {
    const existing = getRate(row.currency, row.issue_date);
    if (existing.source && existing.source.startsWith("Bacen")) continue;
    const rate = await fetchBacenRate(row.currency, row.issue_date);
    if (rate) {
      upsertRate(rate);
      updated += 1;
    }
  }

  if (updated) {
    addLog("success", `${updated} cotações PTAX carregadas`, "Câmbio de venda do Banco Central aplicado nas invoices.");
  } else if (pairs.size) {
    addLog("warning", "Câmbio Bacen não foi atualizado", "Mantidas taxas manuais/padrão. Use o servidor local na porta 4174 ou cadastre manualmente.");
  }
}

function getSpecialClient(cnpj, name = "") {
  const taxId = normalizeTaxId(cnpj);
  const client = state.clients.find((item) => {
    if (item.status !== "ativo") return false;
    const itemTaxId = normalizeTaxId(item.cnpj);
    const sameTaxId = taxId && itemTaxId && itemTaxId === taxId;
    const sameName = isSameCompanyName(item.name, name);
    return sameTaxId || sameName;
  });
  if (!client) return null;
  if (client.contractUntil && client.contractUntil < todayIso()) return null;
  return client;
}

function addLog(type, message, details = "") {
  state.logs.unshift({
    type,
    message,
    details,
    date: new Date().toLocaleString("pt-BR")
  });
  state.logs = state.logs.slice(0, 80);
}

function askUpdateInvoicesFromDailyTable(reason) {
  if (!state.rows.length) {
    save();
    render();
    return;
  }
  const shouldUpdate = window.confirm(`${reason}\n\nDeseja atualizar as invoices com o preço da tabela do dia`);
  if (shouldUpdate) {
    consolidateInvoices();
    addLog("success", "Invoices atualizadas pela tabela do dia", reason);
  } else {
    addLog("warning", "Atualização de invoices adiada", reason);
    save();
  }
  render();
}

function validateRows(rows, fileName) {
  const headers = Object.keys(rows[0] || {}).map(normalizeKey);
  const columnMap = requiredColumns.reduce((acc, column) => {
    acc[column] = findColumn(headers, column);
    return acc;
  }, {});
  columnMap.item_description = findColumn(headers, "item_description");
  columnMap.issue_date = findColumn(headers, "issue_date");
  columnMap.client_email = findColumn(headers, "client_email");

  const missing = requiredColumns.filter((column) => !columnMap[column]);
  if (missing.length) {
    addLog("error", `Layout inválido em ${fileName}`, `Colunas ausentes: ${missing.join(", ")}`);
    return { valid: [], errors: rows.length || 1, missing };
  }

  const valid = [];
  let errors = 0;
  let missingCnpjCount = 0;

  rows.forEach((row, index) => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeKey(key)] = typeof value === "string" ? value.trim() : value;
    });

    const missingValues = requiredColumns.filter((column) => {
      if (column === "cnpj") return false;
      return normalized[columnMap[column]] === undefined || normalized[columnMap[column]] === "";
    });
    if (missingValues.length) {
      errors += 1;
      addLog("warning", `Linha ${index + 2} ignorada`, `Campos obrigatórios vazios: ${missingValues.join(", ")}`);
      return;
    }

    if (normalized[columnMap.cnpj] === undefined || normalized[columnMap.cnpj] === "") missingCnpjCount += 1;

    valid.push({
      hbl_no: String(normalized[columnMap.hbl_no]),
      cliente: String(normalized[columnMap.cliente]),
      cnpj: String(normalized[columnMap.cnpj] || "Não informado"),
      service_description: String(normalized[columnMap.service_description]),
      item_description: String(normalized[columnMap.item_description] || ""),
      calculation_code: String(normalized[columnMap.calculation_code]),
      entered_amount: parseMoney(normalized[columnMap.entered_amount]),
      entered_curr_total: parseMoney(normalized[columnMap.entered_curr_total]),
      currency: String(normalized[columnMap.currency]).toUpperCase(),
      issue_date: normalizeDate(normalized[columnMap.issue_date]),
      client_email: String(normalized[columnMap.client_email] || "")
    });
  });

  if (missingCnpjCount) {
    addLog("warning", `${missingCnpjCount} linhas sem CNPJ foram importadas`, "CNPJ preenchido como Não informado para não bloquear clientes estrangeiros.");
  }
  addLog("success", `${valid.length} linhas válidas importadas`, `${fileName} · Layout detectado automaticamente`);
  return { valid, errors, missing: [] };
}

function findReceiptColumn(headers, canonicalName) {
  const candidates = receiptColumnAliases[canonicalName] || [canonicalName];
  return candidates.map(normalizeKey).find((candidate) => headers.includes(candidate));
}

function validateReceiptRows(rows, fileName) {
  const headers = Object.keys(rows[0] || {}).map(normalizeKey);
  const columnMap = receiptRequiredColumns.reduce((acc, column) => {
    acc[column] = findReceiptColumn(headers, column);
    return acc;
  }, {});
  const missing = receiptRequiredColumns.filter((column) => !columnMap[column]);
  if (missing.length) {
    addLog("error", `Layout de recibos inválido em ${fileName}`, `Colunas ausentes: ${missing.join(", ")}`);
    return { valid: [], errors: rows.length || 1, missing };
  }

  const valid = [];
  let errors = 0;
  rows.forEach((row, index) => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeKey(key)] = typeof value === "string" ? value.trim() : value;
    });
    const amount = parseMoney(normalized[columnMap.receipt_amount]);
    if (!normalized[columnMap.receipt_no] || !amount) {
      errors += 1;
      addLog("warning", `Recibo linha ${index + 2} ignorado`, "Número do recibo ou valor recebido vazio.");
      return;
    }
    valid.push({
      id: `${normalized[columnMap.receipt_no]}-${normalized[columnMap.hbl_no] || normalized[columnMap.invoice_no_char] || index}`,
      file_no_m: String(normalized[columnMap.file_no_m] || ""),
      invoice_no: String(normalized[columnMap.invoice_no_char] || ""),
      receipt_no: String(normalized[columnMap.receipt_no] || ""),
      payer_name: String(normalized[columnMap.payer_name] || ""),
      hbl_no: String(normalized[columnMap.hbl_no] || ""),
      receipt_amount: amount,
      posted_date: normalizeDate(normalized[columnMap.posted_date]),
      bank_account: String(normalized[columnMap.bank_account] || ""),
      imp_exp: String(normalized[columnMap.imp_exp] || ""),
      import_date: todayIso(),
      source_file: fileName,
      reconciliation_status: "NAO_CONCILIADO",
      matched_invoice_id: "",
      matched_by: ""
    });
  });

  addLog("success", `${valid.length} recibos válidos importados`, `${fileName} · Layout de recebimentos detectado`);
  return { valid, errors, missing: [] };
}

function getInvoiceNo(invoice) {
  return invoice.invoiceNo || invoice.hbl;
}

function financialStatus(total, received) {
  const diff = Number((total - received).toFixed(2));
  if (received <= 0) return "ABERTO";
  if (diff > 0.009) return "PARCIAL";
  if (Math.abs(diff) <= 0.009) return "PAGO";
  return "PAGO_COM_CREDITO";
}

function findInvoiceForReceipt(receipt) {
  const hbl = normalizeKey(receipt.hbl_no);
  const invoiceNo = normalizeKey(receipt.invoice_no);
  const payer = normalizeKey(receipt.payer_name);
  let match = state.invoices.find((invoice) => hbl && normalizeKey(invoice.hbl) === hbl);
  if (match) return { invoice: match, matchedBy: "HBL" };
  match = state.invoices.find((invoice) => invoiceNo && normalizeKey(getInvoiceNo(invoice)) === invoiceNo);
  if (match) return { invoice: match, matchedBy: "Invoice" };
  match = state.invoices.find((invoice) => payer && (normalizeKey(invoice.client).includes(payer) || payer.includes(normalizeKey(invoice.client)) || isSameCompanyName(invoice.client, receipt.payer_name)));
  if (match) return { invoice: match, matchedBy: "Cliente" };
  return { invoice: null, matchedBy: "" };
}

function reconcileReceipts() {
  const totals = new Map();
  const allocations = [];
  state.receipts = state.receipts.map((receipt) => {
    const { invoice, matchedBy } = findInvoiceForReceipt(receipt);
    if (!invoice) {
      return { ...receipt, reconciliation_status: "NAO_CONCILIADO", matched_invoice_id: "", matched_by: "" };
    }
    const invoiceId = getInvoiceNo(invoice);
    const received = (totals.get(invoiceId) || 0) + receipt.receipt_amount;
    totals.set(invoiceId, received);
    allocations.push({
      id: `${receipt.id}-${invoiceId}`,
      receipt_id: receipt.id,
      invoice_id: invoiceId,
      hbl_no: invoice.hbl,
      amount_allocated: receipt.receipt_amount,
      allocation_date: todayIso()
    });
    return { ...receipt, reconciliation_status: "CONCILIADO", matched_invoice_id: invoiceId, matched_by: matchedBy };
  });

  state.receiptAllocations = allocations;
  state.invoices = state.invoices.map((invoice) => {
    const invoiceId = getInvoiceNo(invoice);
    const receivedAmount = Number((totals.get(invoiceId) || 0).toFixed(2));
    const openBalance = Number((invoice.total - receivedAmount).toFixed(2));
    return {
      ...invoice,
      invoiceNo: invoiceId,
      receivedAmount,
      openBalance,
      financialStatus: financialStatus(invoice.total, receivedAmount)
    };
  });
}

function consolidateInvoices() {
  const grouped = new Map();

  state.rows.forEach((row) => {
    if (!grouped.has(row.hbl_no)) grouped.set(row.hbl_no, []);
    grouped.get(row.hbl_no).push(row);
  });

  state.invoices = [...grouped.entries()].map(([hbl, rows]) => {
    const unique = [];
    const seen = new Set();
    rows.forEach((row) => {
      const key = [row.hbl_no, normalizeKey(row.service_description), row.entered_curr_total, row.currency].join("|");
      if (!seen.has(key)) {
        unique.push(row);
        seen.add(key);
      }
    });

    const first = unique[0];
    const special = getSpecialClient(first.cnpj, first.cliente);
    const dueDays = special ? Number(special.dueDays || 7) : 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const services = unique.map((row) => {
      const fxProfile = special ? (special.fxProfile || "Vanguard") : "PTAX";
      const rate = getCommercialRate(row.currency, row.issue_date, fxProfile);
      const isBrl = String(row.currency || "").toUpperCase() === "BRL";
      const negotiatedFee = special && !isBrl ? Number(special.fee || 0) / 100 : 0;
      const convertedValue = isBrl ? row.entered_curr_total : row.entered_curr_total * rate.value;
      const brlValue = isBrl ? row.entered_curr_total : convertedValue * (1 + negotiatedFee);
      return { ...row, fxRate: rate.value, fxBaseRate: rate.baseValue, fxProfile, fxSource: rate.source, negotiatedFee, convertedValue, brlValue };
    });

    const previousInvoice = state.invoices.find((invoice) => invoice.hbl === hbl) || {};
    const rowEmail = unique.find((row) => row.client_email)?.client_email || "";

    return {
      hbl,
      invoiceNo: hbl,
      client: first.cliente,
      cnpj: first.cnpj,
      issueDate: first.issue_date || todayIso(),
      importDate: first.import_date || "",
      dueDate: dueDate.toISOString().slice(0, 10),
      specialClient: Boolean(special),
      status: previousInvoice.status || "pendente",
      sentAt: previousInvoice.sentAt || "",
      clientEmail: previousInvoice.clientEmail || rowEmail,
      billedBy: previousInvoice.billedBy || "",
      services,
      total: services.reduce((sum, service) => sum + service.brlValue, 0),
      category: "Faturamento COMEX",
      costCenter: "Operação COMEX",
      observations: special ? `CLIENTE ESPECIAL: prazo ${dueDays} dias, câmbio ${special.fxProfile || "Vanguard"} e taxa negociada ${numberFmt.format(Number(special.fee || 0))}% aplicados.` : "CLIENTE PADRÃO: PTAX do dia aplicada e prazo padrão de 7 dias.",
      bank: state.bank
    };
  });

  reconcileReceipts();

  state.receivables = state.invoices.map((invoice) => ({
    id: `AR-${invoice.hbl}`,
    client: invoice.client,
    hbl: invoice.hbl,
    invoiceNo: invoice.hbl,
    value: invoice.total,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    category: invoice.category || "Faturamento COMEX",
    costCenter: invoice.costCenter || "Operação COMEX",
    receivedAmount: invoice.receivedAmount || 0,
    openBalance: invoice.openBalance ?? invoice.total,
    financialStatus: invoice.financialStatus || "ABERTO",
    status: invoice.financialStatus === "PAGO" || invoice.financialStatus === "PAGO_COM_CREDITO" ? "baixado" : invoice.status === "enviado" ? "faturado" : "pendente"
  }));

  save();
}

function parseCsv(text) {
  const rows = [];
  const lines = text.split(/\r\n/).filter((line) => line.trim());
  const separator = lines[0]?.includes(";") ? ";" : ",";
  const headers = lines.shift().split(separator).map((item) => item.trim());

  lines.forEach((line) => {
    const cells = line.split(separator).map((item) => item.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] || "";
    });
    rows.push(row);
  });

  return rows;
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const extension = file.name.split(".").pop().toLowerCase();
      let rows = [];

      if (extension === "csv") {
        rows = parseCsv(event.target.result);
      } else if (window.XLSX) {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      } else {
        addLog("error", "Leitor XLSX indisponível", "Use CSV ou libere o carregamento da biblioteca SheetJS.");
        render();
        return;
      }

      const result = validateRows(rows, file.name);
      const importDate = todayIso();
      const importedRows = result.valid.map((row) => ({
        ...row,
        import_date: importDate,
        import_file: file.name
      }));
      await updateRatesForRows(importedRows);
      state.rows = [...state.rows, ...importedRows];
      state.imports.unshift({
        file: file.name,
        rows: rows.length,
        valid: importedRows.length,
        errors: result.errors,
        date: new Date().toLocaleString("pt-BR")
      });
      consolidateInvoices();
      render();
    } catch (error) {
      addLog("error", "Falha ao processar arquivo", error.message);
      render();
    }
  };

  if (file.name.toLowerCase().endsWith(".csv")) reader.readAsText(file, "utf-8");
  else reader.readAsArrayBuffer(file);
}

function readReceiptFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const extension = file.name.split(".").pop().toLowerCase();
      let rows = [];
      if (extension === "csv") {
        rows = parseCsv(event.target.result);
      } else if (window.XLSX) {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      } else {
        addLog("error", "Leitor XLSX indisponível", "Use CSV ou libere o carregamento da biblioteca SheetJS.");
        render();
        return;
      }

      const result = validateReceiptRows(rows, file.name);
      const existingKeys = new Set(state.receipts.map((receipt) => `${receipt.receipt_no}|${receipt.hbl_no}|${receipt.invoice_no}|${receipt.receipt_amount}`));
      const newReceipts = result.valid.filter((receipt) => {
        const key = `${receipt.receipt_no}|${receipt.hbl_no}|${receipt.invoice_no}|${receipt.receipt_amount}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });
      state.receipts = [...state.receipts, ...newReceipts];
      consolidateInvoices();
      const importedIds = new Set(newReceipts.map((receipt) => receipt.id));
      const reconciledCount = state.receipts.filter((receipt) => importedIds.has(receipt.id) && receipt.reconciliation_status === "CONCILIADO").length;
      const unmatchedCount = state.receipts.filter((receipt) => importedIds.has(receipt.id) && receipt.reconciliation_status === "NAO_CONCILIADO").length;
      addLog("success", "Query de recibos importada", `${newReceipts.length} novos recibos · ${result.errors} erros · ${file.name}`);
      if (reconciledCount) addLog("success", "Baixas automáticas registradas", `${reconciledCount} recibos conciliados por HBL, invoice ou cliente.`);
      if (unmatchedCount) addLog("warning", "Recibos não conciliados", `${unmatchedCount} recibos ficaram pendentes para análise manual.`);
      save();
      render();
    } catch (error) {
      addLog("error", "Falha ao processar recibos", error.message);
      render();
    }
  };

  if (file.name.toLowerCase().endsWith(".csv")) reader.readAsText(file, "utf-8");
  else reader.readAsArrayBuffer(file);
}

function renderBars(container, data, color) {
  const target = document.getElementById(container);
  const max = Math.max(...data.map((item) => item.value), 1);
  target.innerHTML = data.length
    ? data.map((item) => `
      <div class="bar-row" ${container === "clientBars" ? `data-client-history="${escapeHtml(item.label)}"` : ""}>
        <div class="bar-meta"><strong>${item.label}</strong><span>${brl.format(item.value)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (item.value / max) * 100)}%; background:${color}"></div></div>
      </div>
    `).join("")
    : `<div class="empty">Sem dados processados.</div>`;
}

function getDashboardInvoices() {
  const period = document.getElementById("periodFilter").value;
  const client = normalizeKey(state.dashboardClientFilter);
  const hbl = normalizeKey(state.dashboardHblFilter);
  const status = state.dashboardStatusFilter;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(period || 0));

  return state.invoices.filter((invoice) => {
    const matchesPeriod = period === "all" || period === "custom" || new Date(invoice.issueDate) >= cutoff;
    const matchesFrom = !state.dashboardDateFrom || invoice.issueDate >= state.dashboardDateFrom;
    const matchesTo = !state.dashboardDateTo || invoice.issueDate <= state.dashboardDateTo;
    const matchesClient = !client || normalizeKey(invoice.client).includes(client);
    const matchesHbl = !hbl || normalizeKey(`${invoice.hbl} ${getInvoiceNo(invoice)}`).includes(hbl);
    const matchesStatus = status === "all" || (invoice.financialStatus || "ABERTO") === status;
    return matchesPeriod && matchesFrom && matchesTo && matchesClient && matchesHbl && matchesStatus;
  });
}

function getDashboardReceipts(invoices = getDashboardInvoices()) {
  const invoiceKeys = new Set(invoices.flatMap((invoice) => [invoice.hbl, getInvoiceNo(invoice)]).filter(Boolean));
  return state.receipts.filter((receipt) => {
    const matched = receipt.matched_invoice_id || receipt.hbl_no || receipt.invoice_no;
    const belongsToFilteredInvoice = invoiceKeys.has(receipt.matched_invoice_id) || invoiceKeys.has(receipt.hbl_no) || invoiceKeys.has(receipt.invoice_no);
    const matchesFrom = !state.dashboardDateFrom || receipt.posted_date >= state.dashboardDateFrom;
    const matchesTo = !state.dashboardDateTo || receipt.posted_date <= state.dashboardDateTo;
    return (!matched || belongsToFilteredInvoice) && matchesFrom && matchesTo;
  });
}

function getFilteredReceivables() {
  const hbl = normalizeKey(state.receivableSearchHbl);
  const client = normalizeKey(state.receivableSearchClient);
  return state.receivables
    .filter((item) => {
      const matchesHbl = !hbl || normalizeKey(`${item.hbl} ${item.invoiceNo}`).includes(hbl);
      const matchesClient = !client || normalizeKey(item.client).includes(client);
      const matchesFrom = !state.receivableDateFrom || item.issueDate >= state.receivableDateFrom;
      const matchesTo = !state.receivableDateTo || item.issueDate <= state.receivableDateTo;
      return matchesHbl && matchesClient && matchesFrom && matchesTo;
    })
    .slice()
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}

function getFilteredReceipts() {
  const hbl = normalizeKey(state.receiptSearchHbl);
  const client = normalizeKey(state.receiptSearchClient);
  const invoiceSearch = normalizeKey(state.receiptSearchInvoice);
  const receiptNo = normalizeKey(state.receiptSearchNo);
  return state.receipts
    .map((receipt) => ({ receipt, invoice: receiptInvoice(receipt), status: receiptFinancialStatus(receipt) }))
    .filter(({ receipt, invoice, status }) => {
      const matchesHbl = !hbl || normalizeKey(`${receipt.hbl_no} ${invoice?.hbl || ""}`).includes(hbl);
      const matchesClient = !client || normalizeKey(`${receipt.payer_name} ${invoice?.client || ""}`).includes(client);
      const matchesInvoice = !invoiceSearch || normalizeKey(`${receipt.invoice_no} ${invoice ? getInvoiceNo(invoice) : ""}`).includes(invoiceSearch);
      const matchesReceipt = !receiptNo || normalizeKey(receipt.receipt_no).includes(receiptNo);
      const matchesFrom = !state.receiptDateFrom || receipt.posted_date >= state.receiptDateFrom;
      const matchesTo = !state.receiptDateTo || receipt.posted_date <= state.receiptDateTo;
      const matchesStatus = state.receiptStatusFilter === "all" || receipt.reconciliation_status === state.receiptStatusFilter || status === state.receiptStatusFilter;
      return matchesHbl && matchesClient && matchesInvoice && matchesReceipt && matchesFrom && matchesTo && matchesStatus;
    })
    .sort((a, b) => String(b.receipt.posted_date).localeCompare(String(a.receipt.posted_date)));
}

function renderDashboard() {
  const invoices = getDashboardInvoices();
  const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const services = invoices.flatMap((invoice) => invoice.services);
  const avgFx = services.length ? services.reduce((sum, item) => sum + item.fxRate, 0) / services.length : 0;
  const dashboardReceipts = getDashboardReceipts(invoices);
  const totalReceived = dashboardReceipts.reduce((sum, receipt) => sum + Number(receipt.receipt_amount || 0), 0);
  const openBalance = invoices.reduce((sum, invoice) => sum + Math.max(invoice.openBalance ?? invoice.total, 0), 0);
  const currentMonth = todayIso().slice(0, 7);
  const monthReceipts = dashboardReceipts
    .filter((receipt) => String(receipt.posted_date || "").startsWith(currentMonth))
    .reduce((sum, receipt) => sum + Number(receipt.receipt_amount || 0), 0);
  const overdueInvoices = invoices.filter((invoice) => (invoice.financialStatus || "ABERTO") !== "PAGO" && (invoice.financialStatus || "ABERTO") !== "PAGO_COM_CREDITO" && invoice.dueDate < todayIso());
  const lateClients = new Set(overdueInvoices.map((invoice) => invoice.client)).size;

  document.getElementById("kpiTotal").textContent = brl.format(total);
  document.getElementById("kpiReceived").textContent = brl.format(totalReceived);
  document.getElementById("kpiOpenBalance").textContent = brl.format(openBalance);
  document.getElementById("kpiMonthReceipts").textContent = brl.format(monthReceipts);
  document.getElementById("kpiOverdue").textContent = overdueInvoices.length;
  document.getElementById("kpiLateClients").textContent = lateClients;
  document.getElementById("kpiInvoices").textContent = invoices.length;
  document.getElementById("kpiHbl").textContent = new Set(invoices.map((invoice) => invoice.hbl)).size;
  document.getElementById("kpiFx").textContent = numberFmt.format(avgFx);

  const byClient = Object.values(invoices.reduce((acc, invoice) => {
    acc[invoice.client] ||= { label: invoice.client, value: 0 };
    acc[invoice.client].value += invoice.total;
    return acc;
  }, {}));

  const byCurrency = Object.values(services.reduce((acc, service) => {
    acc[service.currency] ||= { label: service.currency, value: 0 };
    acc[service.currency].value += service.brlValue;
    return acc;
  }, {}));

  document.getElementById("clientCount").textContent = `${byClient.length} clientes`;
  document.getElementById("currencyCount").textContent = `${byCurrency.length} moedas`;
  renderBars("clientBars", byClient, "#166e6a");
  renderBars("currencyBars", byCurrency, "#b8422d");
  renderAging(overdueInvoices);
  renderClientHistory();
}

function renderAging(overdueInvoices = []) {
  const buckets = [
    { label: "0-30 dias", min: 0, max: 30, count: 0, value: 0 },
    { label: "31-60 dias", min: 31, max: 60, count: 0, value: 0 },
    { label: "61-90 dias", min: 61, max: 90, count: 0, value: 0 },
    { label: "90+ dias", min: 91, max: Infinity, count: 0, value: 0 }
  ];
  const today = new Date(`${todayIso()}T00:00:00`);
  overdueInvoices.forEach((invoice) => {
    const dueDate = new Date(`${invoice.dueDate}T00:00:00`);
    const days = Math.max(0, Math.floor((today - dueDate) / 86400000));
    const bucket = buckets.find((item) => days >= item.min && days <= item.max);
    if (!bucket) return;
    bucket.count += 1;
    bucket.value += Math.max(invoice.openBalance ?? invoice.total, 0);
  });
  document.getElementById("agingTable").innerHTML = buckets
    .map((bucket) => `<tr><td>${bucket.label}</td><td>${bucket.count}</td><td>${brl.format(bucket.value)}</td></tr>`)
    .join("");
}

function renderClientHistory(clientName = state.activeClientHistory) {
  const target = document.getElementById("clientHistory");
  if (!target) return;
  const invoices = clientName ? state.invoices.filter((invoice) => invoice.client === clientName) : [];
  document.getElementById("clientHistoryTitle").textContent = clientName || "Clique em um cliente no gráfico";
  target.innerHTML = invoices.length
    ? invoices.map((invoice) => `<tr><td>${invoice.hbl}</td><td>${formatDate(invoice.issueDate)}</td><td>${formatDate(invoice.dueDate)}</td><td>${invoice.status}</td><td>${brl.format(invoice.total)}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty">Nenhum cliente selecionado.</td></tr>`;
}

function renderImports() {
  document.getElementById("layoutStatus").textContent = state.imports[0]?.errors ? "Validado com alertas" : state.imports.length ? "Layout validado" : "Aguardando arquivo";
  document.getElementById("importHistory").innerHTML = state.imports.length
    ? state.imports.map((item) => `<tr><td>${item.file}</td><td>${item.rows}</td><td>${item.valid}</td><td>${item.errors}</td><td>${item.date}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty">Nenhuma importa??o registrada.</td></tr>`;
  document.getElementById("logCount").textContent = `${state.logs.length} registros`;
  document.getElementById("logs").innerHTML = state.logs.length
    ? state.logs.map((log) => `<div class="log-item ${log.type}"><strong>${log.message}</strong><p>${log.details}</p><small>${log.date}</small></div>`).join("")
    : `<div class="empty">Nenhum log ainda.</div>`;
}

function renderInvoices() {
  const search = normalizeKey(state.invoiceSearch);
  const invoices = state.invoices.filter((invoice) => {
    const matchesStatus = state.statusFilter === "all" || invoice.status === state.statusFilter;
    const matchesSearch = !search || normalizeKey(`${invoice.hbl} ${invoice.client}`).includes(search);
    const filterDate = invoice.importDate || invoice.issueDate;
    const matchesFrom = !state.invoiceDateFrom || filterDate >= state.invoiceDateFrom;
    const matchesTo = !state.invoiceDateTo || filterDate <= state.invoiceDateTo;
    return matchesStatus && matchesSearch && matchesFrom && matchesTo;
  });
  document.getElementById("selectionCount").textContent = `${state.selectedInvoices.length} selecionadas`;
  document.getElementById("invoiceList").innerHTML = invoices.length
    ? invoices.map((invoice) => `
      <article class="invoice-card">
        <div class="invoice-top">
          <div>
            <label class="invoice-select"><input type="checkbox" data-select-invoice="${invoice.hbl}" ${state.selectedInvoices.includes(invoice.hbl) ? "checked" : ""} /> <span>${state.selectedInvoices.includes(invoice.hbl) ? "Selecionada" : "Selecionar"}</span></label>
            <h3>${invoice.hbl} · ${invoice.client}</h3>
            <div class="invoice-meta">
              <span class="chip">${invoice.cnpj}</span>
              <span class="chip">${invoice.services.length} serviços</span>
              <span class="chip">E-mail: ${escapeHtml(invoice.clientEmail || "não cadastrado")}</span>
              <span class="chip ${invoice.specialClient ? "ok" : ""}">${invoice.specialClient ? "Cliente especial" : "Padrão"}</span>
              <span class="chip ${invoice.status === "enviado" ? "ok" : invoice.status === "erro" ? "bad" : "warn"}">${invoice.status}</span>
            </div>
          </div>
          <strong>${brl.format(invoice.total)}</strong>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Serviço</th><th>Cálculo</th><th>Valor original</th><th>Câmbio aplicado</th><th>Valor em BRL</th></tr></thead>
            <tbody>
              ${invoice.services.map((service) => `<tr><td>${escapeHtml(service.service_description)}</td><td>${escapeHtml(service.calculation_code)}</td><td>${formatOriginal(service)}</td><td>${escapeHtml(formatFx(service))}</td><td>${brl.format(service.brlValue)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <label class="email-edit">E-mail do cliente para faturamento<input type="email" value="${escapeHtml(invoice.clientEmail || "")}" data-email-invoice="${invoice.hbl}" placeholder="cliente@empresa.com" /></label>
        <div class="invoice-meta">
          <span class="chip">Emissão: ${invoice.issueDate}</span>
          <span class="chip">Vencimento: ${invoice.dueDate}</span>
          <span class="chip">${invoice.observations}</span>
        </div>
        <div class="invoice-actions">
          <button class="primary-button" data-preview="${invoice.hbl}">Visualizar PDF</button>
          <button class="text-button" data-pdf="${invoice.hbl}">Baixar PDF</button>
          <button class="primary-button" data-send="${invoice.hbl}">${invoice.status === "enviado" ? "Reenviar" : "Enviar"}</button>
          <button class="text-button" data-error="${invoice.hbl}">Marcar erro</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Nenhuma invoice encontrada.</div>`;
}

function renderClients() {
  state.selectedClients = state.selectedClients.filter((name) => state.clients.some((client) => client.name === name));
  document.getElementById("clientSelectionCount").textContent = `${state.selectedClients.length} selecionado${state.selectedClients.length === 1 ? "" : "s"}`;
  document.getElementById("specialClients").innerHTML = state.clients.map((client) => `
    <tr>
      <td><input type="checkbox" aria-label="Selecionar ${escapeHtml(client.name)}" data-select-client="${escapeHtml(client.name)}" ${state.selectedClients.includes(client.name) ? "checked" : ""} /></td>
      <td>${client.name}</td>
      <td>${client.cnpj}</td>
      <td>${client.dueDays} dias</td>
      <td>${client.fxProfile || "Vanguard"}</td>
      <td>${numberFmt.format(Number(client.fee || 0))}%</td>
      <td>${client.contractUntil || "-"}</td>
      <td>${client.status}</td>
      <td>
        <button class="text-button" data-edit-client="${escapeHtml(client.name)}">Editar</button>
        <button class="text-button" data-delete-client="${escapeHtml(client.name)}">Excluir</button>
      </td>
    </tr>
  `).join("");
}

function renderRates() {
  renderFxMatrix();
  document.getElementById("rateHistory").innerHTML = state.rates
    .sort((a, b) => b.date.localeCompare(a.date) || a.currency.localeCompare(b.currency))
    .map((rate) => `<tr><td>${rate.currency}</td><td>${rate.date}</td><td>${numberFmt.format(rate.value)}</td><td>${rate.source}</td></tr>`)
    .join("");
}

function latestRate(currency) {
  return [...state.rates].filter((rate) => rate.currency === currency).sort((a, b) => b.date.localeCompare(a.date))[0];
}

function renderFxMatrix() {
  const date = document.getElementById("rateDate").value || sampleFxTableDate;
  const table = state.fxTables[date] || state.fxTables[sampleFxTableDate] || sampleFxTable;
  document.getElementById("fxMatrixHead").innerHTML = `<tr><th>Taxas</th>${fxCurrencies.map((currency) => `<th>${currency === "USD" ? "US DOLLAR" : currency}</th>`).join("")}</tr>`;
  document.getElementById("fxMatrixBody").innerHTML = fxRows.map((profile) => `
    <tr class="${profile.includes("IOF") ? "fx-iof" : profile === "Vanguard" ? "fx-vanguard" : profile === "Abertura" ? "fx-opening" : ""}">
      <td><strong>${profile}</strong></td>
      ${fxCurrencies.map((currency) => `
        <td>
          <input class="fx-cell-input" data-fx-profile="${profile}" data-fx-currency="${currency}" value="${numberFmt.format(table?.[profile]?.[currency] || 0)}" />
        </td>
      `).join("")}
    </tr>
  `).join("");
}

function normalizeFxText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/DOLLAR/gi, "DOLLAR")
    .trim();
}

function parseFxNumber(value) {
  return parseLocaleNumber(value);
}

function extractNumbersAfter(label, text) {
  const index = normalizeKey(text).indexOf(normalizeKey(label));
  if (index < 0) return null;
  const slice = text.slice(index + label.length, index + label.length + 220);
  const numbers = slice.match(/\d{1,2}[,.]\d{2,4}/g) || [];
  if (numbers.length < 5) return null;
  return numbers.slice(0, 5).map(parseFxNumber);
}

function parseVanguardFxTable(text) {
  const clean = normalizeFxText(text);
  const dateMatch = clean.match(/(\d{2}\/\d{2}\/\d{4})/);
  const date = dateMatch ? isoFromBrDate(dateMatch[1]) : (document.getElementById("rateDate").value || todayIso());
  const rowAliases = {
    "PTAX": ["PTAX"],
    "Abertura": ["Abertura"],
    "Vanguard": ["Vanguard"],
    "Vanguard + IOF": ["+ IOF (3,1%)", "Vanguard + IOF"],
    "Intermediária": ["Intermediária (4%)", "Intermediária"],
    "Intermediária + IOF": ["Intermediária (4%) + IOF", "Intermediária + IOF"],
    "Negociada 3%": ["Negociada (3%)", "Negociada 3%"],
    "Negociada 3% + IOF": ["Negociada (3%) + IOF", "Negociada 3% + IOF"],
    "Negociada 2%": ["Negociada (2%)", "Negociada 2%"],
    "Negociada 2% + IOF": ["Negociada (2%) + IOF", "Negociada 2% + IOF"],
    "Negociada 1%": ["Negociada (1%)", "Negociada 1%"],
    "Negociada 1% + IOF": ["Negociada (1%) + IOF", "Negociada 1% + IOF"]
  };
  const table = {};
  fxRows.forEach((row) => {
    const aliases = rowAliases[row] || [row];
    const values = aliases.map((alias) => extractNumbersAfter(alias, clean)).find(Boolean);
    if (values) {
      table[row] = {};
      fxCurrencies.forEach((currency, index) => {
        table[row][currency] = values[index];
      });
    }
  });

  // PDF text often lists "+ IOF" rows without repeating the parent label. Fill them by row order when needed.
  const allNumbers = clean.match(/\d{1,2}[,.]\d{2,4}/g).map(parseFxNumber) || [];
  if (Object.keys(table).length < 8 && allNumbers.length >= fxRows.length * 5) {
    const firstDataIndex = allNumbers.length - fxRows.length * 5;
    fxRows.forEach((row, rowIndex) => {
      table[row] ||= {};
      fxCurrencies.forEach((currency, colIndex) => {
        table[row][currency] ||= allNumbers[firstDataIndex + rowIndex * 5 + colIndex];
      });
    });
  }

  return { date, table };
}

async function readPdfText(file) {
  if (!window.pdfjsLib) throw new Error("Leitor PDF ainda não carregou. Aguarde alguns segundos e tente novamente.");
  const bytes = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  const text = pages.join(" ").trim();
  if (!text) {
    const error = new Error("PDF sem texto selecionável. O arquivo parece ser uma imagem e precisa de OCR para leitura automática.");
    error.code = "IMAGE_ONLY_PDF";
    throw error;
  }
  return text;
}

async function readFxImportText(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "pdf") return readPdfText(file);
  if (extension === "csv") return file.text();
  if (window.XLSX) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return workbook.SheetNames.map((sheetName) => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
      return rows.map((row) => row.join(" ")).join(" ");
    }).join(" ");
  }
  throw new Error("Formato não suportado ou leitor XLSX indisponível.");
}

async function importFxTable(file) {
  const status = document.getElementById("fxImportStatus");
  status.textContent = "Lendo arquivo...";
  try {
    const text = await readFxImportText(file);
    const { date, table } = parseVanguardFxTable(text);
    const importedRows = fxRows.filter((row) => table[row] && fxCurrencies.every((currency) => Number.isFinite(table[row][currency])));
    if (importedRows.length < 3) throw new Error("Não consegui reconhecer a tabela. Verifique se o PDF possui texto selecionável.");

    state.fxTables[date] = {
      ...(state.fxTables[date] || {}),
      ...table
    };
    if (table?.PTAX) {
      fxCurrencies.forEach((currency) => {
        if (table.PTAX[currency]) upsertRate({ currency, date, value: table.PTAX[currency], source: "Tabela Vanguard importada" });
      });
    }
    document.getElementById("rateDate").value = date;
    status.textContent = `${importedRows.length} linhas importadas em ${formatDate(date)}`;
    addLog("success", "Tabela Vanguard importada", `${file.name} · ${importedRows.length} linhas · ${formatDate(date)}`);
    askUpdateInvoicesFromDailyTable("Tabela Vanguard importada para a data selecionada.");
  } catch (error) {
    if (error.code === "IMAGE_ONLY_PDF") {
      const date = document.getElementById("rateDate").value || sampleFxTableDate;
      state.fxTables[date] = JSON.parse(JSON.stringify(sampleFxTable));
      fxCurrencies.forEach((currency) => {
        upsertRate({ currency, date, value: sampleFxTable.PTAX[currency], source: "Tabela Vanguard imagem/PDF" });
      });
      status.textContent = `PDF imagem: tabela padrão aplicada em ${formatDate(date)}`;
      addLog("warning", "PDF sem texto selecionável", "A tabela padrão Vanguard do anexo foi aplicada. Para leitura automática de valores variáveis, envie PDF com texto, Excel ou CSV.");
      askUpdateInvoicesFromDailyTable("PDF imagem aplicado com a tabela padrão Vanguard.");
      return;
    }
    status.textContent = "Erro ao importar";
    addLog("error", "Falha ao importar tabela de câmbio", error.message);
    render();
  }
}

function renderBank() {
  document.getElementById("bankName").value = state.bank.bankName || "";
  document.getElementById("bankAgency").value = state.bank.agency || "";
  document.getElementById("bankAccount").value = state.bank.account || "";
  document.getElementById("bankBeneficiary").value = state.bank.beneficiary || "";
  document.getElementById("bankTaxId").value = state.bank.taxId || "";
  document.getElementById("bankPix").value = state.bank.pix || "";
  document.getElementById("bankInstructions").value = state.bank.instructions || "";
  document.getElementById("billingUserEmail").value = state.billingUserEmail || "";
}

function renderEmailConfig() {
  document.getElementById("emailCompany").value = state.emailConfig.company || "";
  document.getElementById("emailFrom").value = state.emailConfig.fromEmail || "";
  document.getElementById("smtpUser").value = state.emailConfig.smtpUser || "";
  document.getElementById("smtpPass").value = state.emailConfig.smtpPass || "";
  document.getElementById("smtpHost").value = state.emailConfig.smtpHost || "smtp.gmail.com";
  document.getElementById("smtpPort").value = state.emailConfig.smtpPort || 587;
  document.getElementById("emailSubject").value = state.emailConfig.subject || "";
  document.getElementById("emailBody").value = state.emailConfig.body || "";
}

function renderAudit() {
  const events = [
    ...state.logs.map((log) => ({ title: log.message, body: log.details, date: log.date })),
    ...state.invoices.filter((invoice) => invoice.sentAt).map((invoice) => ({ title: `Invoice ${invoice.hbl} enviada`, body: invoice.client, date: invoice.sentAt }))
  ].slice(0, 60);

  document.getElementById("auditList").innerHTML = events.length
    ? events.map((event) => `<div class="audit-item"><strong>${event.title}</strong><p>${event.body}</p><small>${event.date}</small></div>`).join("")
    : `<div class="empty">Sem eventos de auditoria.</div>`;
}

function renderBilled() {
  const rows = state.billed
    .slice()
    .sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)));
  document.getElementById("billedCount").textContent = `${rows.length} faturadas`;
  document.getElementById("billedInvoices").innerHTML = rows.length
    ? rows.map((item) => `
      <tr>
        <td>${escapeHtml(item.hbl)}</td>
        <td>${escapeHtml(item.client)}</td>
        <td>${brl.format(item.total)}</td>
        <td>${escapeHtml(item.clientEmail || "-")}</td>
        <td>${escapeHtml(item.billedBy || "-")}</td>
        <td>${escapeHtml(item.sentAt || "-")}</td>
        <td>${escapeHtml(item.mode || "simulado")}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="7" class="empty">Nenhuma invoice faturada ainda.</td></tr>`;
}

function renderReceivables() {
  const rows = getFilteredReceivables();
  document.getElementById("receivableCount").textContent = `${rows.length} títulos`;
  document.getElementById("receivablesTable").innerHTML = rows.length
    ? rows.map((item) => `
      <tr>
        <td>${escapeHtml(item.client)}</td>
        <td>${escapeHtml(item.hbl)}</td>
        <td>${escapeHtml(item.invoiceNo)}</td>
        <td>${brl.format(item.value)}</td>
        <td>${brl.format(item.receivedAmount || 0)}</td>
        <td>${brl.format(item.openBalance ?? item.value)}</td>
        <td>${formatDate(item.issueDate)}</td>
        <td>${formatDate(item.dueDate)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.costCenter)}</td>
        <td>${escapeHtml(item.financialStatus || "ABERTO")}</td>
        <td><button class="text-button" data-view-receivable="${escapeHtml(item.hbl)}">Visualizar invoice</button></td>
      </tr>
    `).join("")
    : `<tr><td colspan="12" class="empty">Nenhum título encontrado.</td></tr>`;
}

function receiptInvoice(receipt) {
  return state.invoices.find((invoice) => getInvoiceNo(invoice) === receipt.matched_invoice_id || invoice.hbl === receipt.hbl_no);
}

function receiptFinancialStatus(receipt) {
  if (receipt.reconciliation_status === "NAO_CONCILIADO") return "NAO_CONCILIADO";
  return receiptInvoice(receipt)?.financialStatus || "ABERTO";
}

function renderReceiptDetail(receiptId = state.activeReceiptId) {
  const target = document.getElementById("receiptDetail");
  if (!target) return;
  const receipt = state.receipts.find((item) => item.id === receiptId);
  if (!receipt) {
    document.getElementById("receiptDetailTitle").textContent = "Clique em um recibo";
    target.innerHTML = `<div><span>Status</span><strong>Nenhum recibo selecionado</strong></div>`;
    return;
  }
  const invoice = receiptInvoice(receipt);
  const received = invoice?.receivedAmount || receipt.receipt_amount;
  const balance = invoice ? invoice.openBalance : 0;
  document.getElementById("receiptDetailTitle").textContent = `Recibo ${receipt.receipt_no}`;
  target.innerHTML = `
    <div><span>Cliente invoice</span><strong>${escapeHtml(invoice?.client || "-")}</strong></div>
    <div><span>HBL</span><strong>${escapeHtml(invoice?.hbl || receipt.hbl_no || "-")}</strong></div>
    <div><span>Invoice</span><strong>${escapeHtml(invoice ? getInvoiceNo(invoice) : receipt.invoice_no || "-")}</strong></div>
    <div><span>Valor faturado</span><strong>${invoice ? brl.format(invoice.total) : "-"}</strong></div>
    <div><span>Valor recebido</span><strong>${brl.format(received)}</strong></div>
    <div><span>Saldo</span><strong>${invoice ? brl.format(balance) : "-"}</strong></div>
    <div><span>Número do recibo</span><strong>${escapeHtml(receipt.receipt_no)}</strong></div>
    <div><span>Data do recibo</span><strong>${formatDate(receipt.posted_date)}</strong></div>
    <div><span>Valor do recibo</span><strong>${brl.format(receipt.receipt_amount)}</strong></div>
    <div><span>Conta bancária</span><strong>${escapeHtml(receipt.bank_account || "-")}</strong></div>
    <div><span>Conciliação</span><strong>${receipt.reconciliation_status} ${receipt.matched_by ? `por ${receipt.matched_by}` : ""}</strong></div>
  `;
}

function renderReceipts() {
  const rows = getFilteredReceipts();
  document.getElementById("receiptCount").textContent = `${rows.length} recibos`;
  document.getElementById("receiptsTable").innerHTML = rows.length
    ? rows.map(({ receipt, invoice, status }) => `
      <tr>
        <td>${escapeHtml(receipt.hbl_no || invoice?.hbl || "-")}</td>
        <td>${escapeHtml(receipt.invoice_no || (invoice ? getInvoiceNo(invoice) : "-"))}</td>
        <td>${escapeHtml(receipt.receipt_no)}</td>
        <td>${escapeHtml(receipt.payer_name || invoice?.client || "-")}</td>
        <td>${brl.format(receipt.receipt_amount)}</td>
        <td>${formatDate(receipt.posted_date)}</td>
        <td>${escapeHtml(receipt.bank_account || "-")}</td>
        <td><span class="chip ${status === "NAO_CONCILIADO" ? "bad" : status === "PARCIAL" ? "warn" : "ok"}">${status}</span></td>
        <td><button class="text-button" data-view-receipt="${escapeHtml(receipt.id)}">Conciliação</button></td>
      </tr>
    `).join("")
    : `<tr><td colspan="9" class="empty">Nenhum recebimento encontrado.</td></tr>`;
  renderReceiptDetail();
}

function render() {
  save();
  renderDashboard();
  renderImports();
  renderInvoices();
  renderClients();
  renderRates();
  renderBank();
  renderBilled();
  renderReceivables();
  renderReceipts();
  renderEmailConfig();
  renderAudit();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item, .view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.view).classList.add("active");
  });
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.statusFilter = button.dataset.status;
    renderInvoices();
  });
});

document.getElementById("fileInput").addEventListener("change", (event) => {
  [...event.target.files].forEach(readFile);
});

document.getElementById("periodFilter").addEventListener("change", renderDashboard);

document.getElementById("dashboardClientFilter").addEventListener("input", (event) => {
  state.dashboardClientFilter = event.target.value;
  renderDashboard();
});

document.getElementById("dashboardHblFilter").addEventListener("input", (event) => {
  state.dashboardHblFilter = event.target.value;
  renderDashboard();
});

document.getElementById("dashboardDateFrom").addEventListener("change", (event) => {
  state.dashboardDateFrom = event.target.value;
  document.getElementById("periodFilter").value = "custom";
  renderDashboard();
});

document.getElementById("dashboardDateTo").addEventListener("change", (event) => {
  state.dashboardDateTo = event.target.value;
  document.getElementById("periodFilter").value = "custom";
  renderDashboard();
});

document.getElementById("dashboardStatusFilter").addEventListener("change", (event) => {
  state.dashboardStatusFilter = event.target.value;
  renderDashboard();
});

document.getElementById("clearDashboardFilters").addEventListener("click", () => {
  state.dashboardClientFilter = "";
  state.dashboardHblFilter = "";
  state.dashboardDateFrom = "";
  state.dashboardDateTo = "";
  state.dashboardStatusFilter = "all";
  document.getElementById("periodFilter").value = "all";
  document.getElementById("dashboardClientFilter").value = "";
  document.getElementById("dashboardHblFilter").value = "";
  document.getElementById("dashboardDateFrom").value = "";
  document.getElementById("dashboardDateTo").value = "";
  document.getElementById("dashboardStatusFilter").value = "all";
  renderDashboard();
});

document.getElementById("exportDashboardReport").addEventListener("click", exportDashboardReport);

document.getElementById("clientBars").addEventListener("click", (event) => {
  const row = event.target.closest("[data-client-history]");
  if (!row) return;
  state.activeClientHistory = row.getAttribute("data-client-history");
  renderClientHistory();
  document.getElementById("clientHistoryPanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("invoiceSearch").addEventListener("input", (event) => {
  state.invoiceSearch = event.target.value;
  renderInvoices();
});

document.getElementById("invoiceDateFrom").addEventListener("change", (event) => {
  state.invoiceDateFrom = event.target.value;
  renderInvoices();
});

document.getElementById("invoiceDateTo").addEventListener("change", (event) => {
  state.invoiceDateTo = event.target.value;
  renderInvoices();
});

document.getElementById("receivableSearchHbl").addEventListener("input", (event) => {
  state.receivableSearchHbl = event.target.value;
  renderReceivables();
});

document.getElementById("receivableSearchClient").addEventListener("input", (event) => {
  state.receivableSearchClient = event.target.value;
  renderReceivables();
});

document.getElementById("receivableDateFrom").addEventListener("change", (event) => {
  state.receivableDateFrom = event.target.value;
  renderReceivables();
});

document.getElementById("receivableDateTo").addEventListener("change", (event) => {
  state.receivableDateTo = event.target.value;
  renderReceivables();
});

document.getElementById("receivablesTable").addEventListener("click", (event) => {
  const hbl = event.target.dataset.viewReceivable;
  if (hbl) openInvoicePreview(hbl);
});

document.getElementById("exportReceivablesReport").addEventListener("click", exportReceivablesReport);

document.getElementById("receiptFileInput").addEventListener("change", (event) => {
  [...event.target.files].forEach(readReceiptFile);
});

["dragenter", "dragover"].forEach((eventName) => document.getElementById("receiptDropzone").addEventListener(eventName, (event) => {
  event.preventDefault();
  document.getElementById("receiptDropzone").classList.add("dragging");
}));
["dragleave", "drop"].forEach((eventName) => document.getElementById("receiptDropzone").addEventListener(eventName, (event) => {
  event.preventDefault();
  document.getElementById("receiptDropzone").classList.remove("dragging");
}));
document.getElementById("receiptDropzone").addEventListener("drop", (event) => [...event.dataTransfer.files].forEach(readReceiptFile));

[
  ["receiptSearchHbl", "receiptSearchHbl"],
  ["receiptSearchClient", "receiptSearchClient"],
  ["receiptSearchInvoice", "receiptSearchInvoice"],
  ["receiptSearchNo", "receiptSearchNo"],
  ["receiptDateFrom", "receiptDateFrom"],
  ["receiptDateTo", "receiptDateTo"],
  ["receiptStatusFilter", "receiptStatusFilter"]
].forEach(([elementId, stateKey]) => {
  const eventName = elementId === "receiptStatusFilter" || elementId.includes("Date") ? "change" : "input";
  document.getElementById(elementId).addEventListener(eventName, (event) => {
    state[stateKey] = event.target.value;
    renderReceipts();
  });
});

document.getElementById("receiptsTable").addEventListener("click", (event) => {
  const receiptId = event.target.dataset.viewReceipt;
  if (!receiptId) return;
  state.activeReceiptId = receiptId;
  renderReceiptDetail(receiptId);
  document.getElementById("receiptDetailPanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("exportReceiptsReport").addEventListener("click", exportReceiptsReport);

document.getElementById("billingUserEmail").addEventListener("input", (event) => {
  state.billingUserEmail = event.target.value.trim();
  save();
});

document.getElementById("saveBankData").addEventListener("click", () => {
  state.bank = {
    bankName: document.getElementById("bankName").value.trim(),
    agency: document.getElementById("bankAgency").value.trim(),
    account: document.getElementById("bankAccount").value.trim(),
    beneficiary: document.getElementById("bankBeneficiary").value.trim(),
    taxId: document.getElementById("bankTaxId").value.trim(),
    pix: document.getElementById("bankPix").value.trim(),
    instructions: document.getElementById("bankInstructions").value.trim()
  };
  addLog("success", "Dados bancários Vanguard salvos", "As próximas invoices usarão estes dados no rodapé.");
  consolidateInvoices();
  render();
});

document.getElementById("saveEmailConfig").addEventListener("click", () => {
  state.emailConfig = {
    company: document.getElementById("emailCompany").value.trim(),
    fromEmail: document.getElementById("emailFrom").value.trim(),
    smtpUser: document.getElementById("smtpUser").value.trim(),
    smtpPass: document.getElementById("smtpPass").value,
    smtpHost: document.getElementById("smtpHost").value.trim(),
    smtpPort: Number(document.getElementById("smtpPort").value || 587),
    subject: document.getElementById("emailSubject").value,
    body: document.getElementById("emailBody").value
  };
  if (!state.billingUserEmail && state.emailConfig.fromEmail) {
    state.billingUserEmail = state.emailConfig.fromEmail;
  }
  addLog("success", "Configuração de e-mail salva", `${state.emailConfig.smtpHost}:${state.emailConfig.smtpPort}`);
  save();
  render();
});

const dropzone = document.getElementById("dropzone");
["dragenter", "dragover"].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
}));
["dragleave", "drop"].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
}));
dropzone.addEventListener("drop", (event) => [...event.dataTransfer.files].forEach(readFile));

document.getElementById("addClient").addEventListener("click", () => {
  const client = {
    name: document.getElementById("clientName").value.trim(),
    cnpj: document.getElementById("clientCnpj").value.trim() || "Não informado",
    dueDays: Number(document.getElementById("clientDue").value || 7),
    fee: Number(document.getElementById("clientFee").value || 0),
    fxProfile: document.getElementById("clientFxProfile").value,
    contractUntil: document.getElementById("clientContract").value,
    status: document.getElementById("clientStatus").value
  };
  if (!client.name) {
    addLog("error", "Cliente especial não salvo", "Informe pelo menos o nome do cliente.");
    render();
    return;
  }
  const editingCnpj = document.getElementById("editingClientCnpj").value;
  const newTaxId = normalizeTaxId(client.cnpj);
  const editingTaxId = normalizeTaxId(editingCnpj);
  state.clients = state.clients.filter((item) => {
    const itemTaxId = normalizeTaxId(item.cnpj);
    const sameTax = newTaxId && itemTaxId && itemTaxId === newTaxId;
    const sameEditing = editingTaxId && itemTaxId === editingTaxId;
    const sameName = normalizeKey(item.name) === normalizeKey(client.name);
    return !sameTax && !sameEditing && !sameName;
  });
  state.clients.push(client);
  addLog("success", "Cliente especial salvo", `${client.name} · ${client.cnpj}`);
  document.getElementById("editingClientCnpj").value = "";
  document.getElementById("clientName").value = "";
  document.getElementById("clientCnpj").value = "";
  document.getElementById("clientDue").value = 7;
  document.getElementById("clientFee").value = 0;
  document.getElementById("clientContract").value = "";
  document.getElementById("clientStatus").value = "ativo";
  askUpdateInvoicesFromDailyTable(`Cliente especial ${client.name} salvo com taxa ${client.fxProfile} e taxa negociada ${numberFmt.format(client.fee)}%.`);
});

document.getElementById("specialClients").addEventListener("click", (event) => {
  const editName = event.target.dataset.editClient;
  const deleteName = event.target.dataset.deleteClient;
  if (deleteName) {
    if (!window.confirm(`Deseja excluir o cliente especial ${deleteName}`)) return;
    state.clients = state.clients.filter((item) => item.name !== deleteName);
    state.selectedClients = state.selectedClients.filter((name) => name !== deleteName);
    addLog("success", "Cliente especial excluído", deleteName);
    askUpdateInvoicesFromDailyTable(`Cliente especial ${deleteName} excluído.`);
    return;
  }
  if (!editName) return;
  const client = state.clients.find((item) => item.name === editName);
  if (!client) return;
  document.getElementById("editingClientCnpj").value = client.cnpj;
  document.getElementById("clientName").value = client.name;
  document.getElementById("clientCnpj").value = client.cnpj;
  document.getElementById("clientDue").value = client.dueDays;
  document.getElementById("clientFxProfile").value = client.fxProfile || "Vanguard";
  document.getElementById("clientFee").value = client.fee || 0;
  document.getElementById("clientContract").value = client.contractUntil || "";
  document.getElementById("clientStatus").value = client.status || "ativo";
});

document.getElementById("specialClients").addEventListener("change", (event) => {
  const clientName = event.target.dataset.selectClient;
  if (!clientName) return;
  if (event.target.checked) {
    if (!state.selectedClients.includes(clientName)) state.selectedClients.push(clientName);
  } else {
    state.selectedClients = state.selectedClients.filter((name) => name !== clientName);
  }
  save();
  renderClients();
});

document.getElementById("selectAllClients").addEventListener("click", () => {
  state.selectedClients = state.clients.map((client) => client.name);
  save();
  renderClients();
});

document.getElementById("clearClientSelection").addEventListener("click", () => {
  state.selectedClients = [];
  save();
  renderClients();
});

document.getElementById("deleteSelectedClients").addEventListener("click", () => {
  const selected = state.selectedClients.filter((name) => state.clients.some((client) => client.name === name));
  if (!selected.length) {
    addLog("warning", "Nenhum cliente especial selecionado", "Selecione um ou mais clientes para excluir.");
    render();
    return;
  }
  if (!window.confirm(`Deseja excluir ${selected.length} cliente${selected.length === 1 ? "" : "s"} especial${selected.length === 1 ? "" : "is"} selecionado${selected.length === 1 ? "" : "s"}`)) return;
  const selectedSet = new Set(selected);
  state.clients = state.clients.filter((client) => !selectedSet.has(client.name));
  state.selectedClients = [];
  addLog("success", "Clientes especiais excluídos", selected.join(", "));
  askUpdateInvoicesFromDailyTable("Clientes especiais selecionados foram excluídos.");
});

document.getElementById("addRate").addEventListener("click", () => {
  const rate = {
    currency: document.getElementById("rateCurrency").value,
    date: document.getElementById("rateDate").value || todayIso(),
    value: Number(document.getElementById("rateValue").value),
    source: "manual"
  };
  if (!rate.value) return;
  upsertRate(rate);
  if (!state.fxTables[rate.date]) state.fxTables[rate.date] = JSON.parse(JSON.stringify(state.fxTables[sampleFxTableDate] || sampleFxTable));
  state.fxTables[rate.date].PTAX[rate.currency] = rate.value;
  addLog("success", "Taxa cambial manual salva", `${rate.currency} ${numberFmt.format(rate.value)} em ${rate.date}`);
  askUpdateInvoicesFromDailyTable("Taxa PTAX/manual alterada na aba Câmbio.");
});

document.getElementById("rateDate").addEventListener("change", () => {
  const date = document.getElementById("rateDate").value || sampleFxTableDate;
  if (!state.fxTables[date]) state.fxTables[date] = JSON.parse(JSON.stringify(state.fxTables[sampleFxTableDate] || sampleFxTable));
  renderFxMatrix();
});

document.getElementById("fxMatrixBody").addEventListener("change", (event) => {
  const profile = event.target.dataset.fxProfile;
  const currency = event.target.dataset.fxCurrency;
  if (!profile || !currency) return;
  const date = document.getElementById("rateDate").value || sampleFxTableDate;
  if (!state.fxTables[date]) state.fxTables[date] = JSON.parse(JSON.stringify(state.fxTables[sampleFxTableDate] || sampleFxTable));
  if (!state.fxTables[date][profile]) state.fxTables[date][profile] = {};
  state.fxTables[date][profile][currency] = parseLocaleNumber(event.target.value);
  addLog("success", "Tabela de câmbio atualizada", `${profile} ${currency}: ${numberFmt.format(state.fxTables[date][profile][currency])}`);
  askUpdateInvoicesFromDailyTable("Tabela de câmbio alterada manualmente.");
});

document.getElementById("fxTableInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importFxTable(file);
});

document.getElementById("addManualInvoice").addEventListener("click", async () => {
  const hbl = document.getElementById("manualHbl").value.trim() || `MANUAL-${Date.now()}`;
  const row = {
    hbl_no: hbl,
    cliente: document.getElementById("manualClient").value.trim(),
    cnpj: document.getElementById("manualCnpj").value.trim() || "Não informado",
    service_description: document.getElementById("manualService").value.trim(),
    item_description: document.getElementById("manualItem").value.trim(),
    calculation_code: "FLAT",
    entered_amount: Number(document.getElementById("manualAmount").value || 0),
    entered_curr_total: Number(document.getElementById("manualAmount").value || 0),
    currency: document.getElementById("manualCurrency").value,
    issue_date: document.getElementById("manualIssueDate").value || todayIso(),
    client_email: document.getElementById("manualEmail").value.trim()
  };
  if (!row.cliente || !row.service_description || !row.entered_amount) {
    addLog("error", "Invoice manual incompleta", "Informe cliente, serviço e valor original.");
    render();
    return;
  }
  await updateRatesForRows([row]);
  state.rows = state.rows.filter((item) => item.hbl_no !== hbl);
  state.rows.push(row);
  addLog("success", `Invoice manual ${hbl} cadastrada`, row.cliente);
  consolidateInvoices();
  render();
});

document.getElementById("simulateBacen").addEventListener("click", () => {
  const date = document.getElementById("rateDate").value || todayIso();
  const rows = fxCurrencies.map((currency) => ({ currency, issue_date: date }));
  updateRatesForRows(rows).then(() => {
    if (!state.fxTables[date]) state.fxTables[date] = JSON.parse(JSON.stringify(state.fxTables[sampleFxTableDate] || sampleFxTable));
    fxCurrencies.forEach((currency) => {
      const rate = getRate(currency, date);
      if (rate?.value) state.fxTables[date].PTAX[currency] = rate.value;
    });
    consolidateInvoices();
    render();
  });
});

function visibleInvoiceHbls() {
  return [...document.querySelectorAll("[data-select-invoice]")].map((input) => input.dataset.selectInvoice);
}

function openBillingModal(title = "Faturamento") {
  document.getElementById("billingModalTitle").textContent = title;
  document.getElementById("billingSteps").innerHTML = "";
  document.getElementById("billingModal").hidden = false;
}

function addBillingStep(status, title, detail = "") {
  const target = document.getElementById("billingSteps");
  const item = document.createElement("div");
  item.className = `billing-step ${status}`;
  item.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p>`;
  target.appendChild(item);
}

function registerBilled(invoice, mode = "simulado") {
  state.billed = state.billed.filter((item) => item.hbl !== invoice.hbl);
  state.billed.push({
    hbl: invoice.hbl,
    client: invoice.client,
    total: invoice.total,
    clientEmail: invoice.clientEmail,
    billedBy: invoice.billedBy,
    sentAt: invoice.sentAt,
    mode
  });
  const receivable = state.receivables.find((item) => item.hbl === invoice.hbl);
  if (receivable) {
    receivable.status = "faturado";
    receivable.value = invoice.total;
    receivable.dueDate = invoice.dueDate;
  }
}

function renderTemplate(template, invoice) {
  const values = {
    hbl: invoice.hbl,
    cliente: invoice.client,
    empresa: state.emailConfig.company || "Vanguard Logistics",
    valor: brl.format(invoice.total),
    vencimento: formatDate(invoice.dueDate)
  };
  return String(template || "").replace(/\{\{(hbl|cliente|empresa|valor|vencimento)\}\}/g, (_, key) => values[key] || "");
}

async function sendInvoiceByEmail(invoice) {
  if (!state.emailConfig.smtpHost || !state.emailConfig.smtpUser || !state.emailConfig.smtpPass || !state.emailConfig.fromEmail) {
    throw new Error("Configuração SMTP incompleta na aba E-mail.");
  }
  if (!window.jspdf?.jsPDF) throw new Error("Biblioteca de PDF não carregada.");
  const doc = await buildInvoicePdf(invoice);
  if (!doc) throw new Error("Não foi possível gerar o PDF.");
  // Envio SMTP via backend externo — não disponível no modo Supabase.
  // Para ativar envio real de e-mail, configure um Supabase Edge Function
  // ou utilize um serviço como Resend / SendGrid apontado por uma Edge Function.
  throw new Error(
    "Envio automático de e-mail requer uma Edge Function Supabase ou backend externo. " +
    "Por enquanto baixe o PDF e envie manualmente, ou configure uma Edge Function."
  );
  // eslint-disable-next-line no-unreachable
  const pdfBase64 = doc.output("datauristring").split(",")[1];
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  const response = await fetch(SUPABASE_URL + "/functions/v1/send-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + authToken },
    signal: controller.signal,
    body: JSON.stringify({
      smtp: {
        host: state.emailConfig.smtpHost,
        port: state.emailConfig.smtpPort,
        user: state.emailConfig.smtpUser,
        password: state.emailConfig.smtpPass,
        fromEmail: state.emailConfig.fromEmail
      },
      invoice,
      subject: renderTemplate(state.emailConfig.subject, invoice),
      body: renderTemplate(state.emailConfig.body, invoice),
      pdfBase64
    })
  }).catch((error) => {
    if (error.name === "AbortError") {
      throw new Error("Tempo limite no envio SMTP. Confira a senha de app do Gmail e tente novamente.");
    }
    throw error;
  }).finally(() => window.clearTimeout(timeout));
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || payload.error || "Falha no envio do e-mail.");
  return payload;
}

async function sendInvoice(invoice, options = { showModal: true }) {
  if (!invoice) return false;
  if (options.showModal) openBillingModal(`Faturamento ${invoice.hbl}`);
  addBillingStep("running", "Validando dados", `${invoice.client} · ${brl.format(invoice.total)}`);
  if (!invoice.clientEmail) {
    invoice.status = "erro";
    addBillingStep("error", "E-mail do cliente ausente", "Cadastre o e-mail na própria invoice antes do faturamento.");
    addLog("error", `Invoice ${invoice.hbl} sem e-mail do cliente`, "Cadastre o e-mail na própria invoice antes do faturamento.");
    render();
    return false;
  }
  if (!state.billingUserEmail && state.emailConfig.fromEmail) {
    state.billingUserEmail = state.emailConfig.fromEmail;
    save();
  }
  if (!state.billingUserEmail) {
    invoice.status = "erro";
    addBillingStep("error", "E-mail do faturamento ausente", "Informe o e-mail da pessoa logada/faturando.");
    addLog("error", `Invoice ${invoice.hbl} sem e-mail do faturamento`, "Informe o e-mail da pessoa logada/faturando no filtro de invoices.");
    render();
    return false;
  }
  addBillingStep("running", "Gerando PDF", "Anexando invoice em PDF ao e-mail.");
  try {
    addBillingStep("running", "Enviando e-mail", `Para ${invoice.clientEmail}`);
    await sendInvoiceByEmail(invoice);
    invoice.status = "enviado";
    invoice.sentAt = new Date().toLocaleString("pt-BR");
    invoice.billedBy = state.billingUserEmail;
    registerBilled(invoice, "SMTP real");
    addBillingStep("success", "E-mail enviado", `PDF anexado e enviado para ${invoice.clientEmail}.`);
    addLog("success", `Invoice ${invoice.hbl} enviada por e-mail`, `Enviada para ${invoice.clientEmail} por ${state.emailConfig.fromEmail}.`);
    render();
    return true;
  } catch (error) {
    invoice.status = "erro";
    addBillingStep("error", "Falha no envio", error.message);
    addLog("error", `Falha ao enviar invoice ${invoice.hbl}`, error.message);
    render();
    return false;
  }
}

document.getElementById("selectAllInvoices").addEventListener("click", () => {
  state.selectedInvoices = [...new Set([...state.selectedInvoices, ...visibleInvoiceHbls()])];
  renderInvoices();
});

document.getElementById("clearInvoiceSelection").addEventListener("click", () => {
  state.selectedInvoices = [];
  renderInvoices();
});

document.getElementById("bulkSendInvoices").addEventListener("click", () => {
  openBillingModal("Faturamento em lote");
  if (!state.selectedInvoices.length) {
    addBillingStep("warning", "Nenhuma invoice selecionada", "Selecione ao menos uma invoice antes de faturar.");
    return;
  }
  state.selectedInvoices.forEach((hbl) => {
    const invoice = state.invoices.find((item) => item.hbl === hbl);
    if (invoice) sendInvoice(invoice, { showModal: false });
  });
  render();
});

document.getElementById("invoiceList").addEventListener("change", (event) => {
  const selectedHbl = event.target.dataset.selectInvoice;
  const emailHbl = event.target.dataset.emailInvoice;
  if (selectedHbl) {
    if (event.target.checked) {
      state.selectedInvoices = [...new Set([...state.selectedInvoices, selectedHbl])];
    } else {
      state.selectedInvoices = state.selectedInvoices.filter((hbl) => hbl !== selectedHbl);
    }
    document.getElementById("selectionCount").textContent = `${state.selectedInvoices.length} selecionadas`;
    save();
  }
  if (emailHbl) {
    const invoice = state.invoices.find((item) => item.hbl === emailHbl);
    if (invoice) invoice.clientEmail = event.target.value.trim();
    save();
    renderInvoices();
  }
});

document.getElementById("invoiceList").addEventListener("click", (event) => {
  const sendHbl = event.target.dataset.send;
  const errorHbl = event.target.dataset.error;
  const previewHbl = event.target.dataset.preview;
  const pdfHbl = event.target.dataset.pdf;
  if (!sendHbl && !errorHbl && !previewHbl && !pdfHbl) return;
  if (previewHbl) {
    openInvoicePreview(previewHbl);
    return;
  }
  if (pdfHbl) {
    downloadInvoicePdf(pdfHbl);
    return;
  }
  if (sendHbl) {
    const invoice = state.invoices.find((item) => item.hbl === sendHbl);
    sendInvoice(invoice);
  }
  if (errorHbl) {
    const invoice = state.invoices.find((item) => item.hbl === errorHbl);
    invoice.status = "erro";
    addLog("error", `Invoice ${errorHbl} com erro de envio`, "Aguardando reprocessamento.");
  }
  render();
});

document.getElementById("clearImports").addEventListener("click", () => {
  state.imports = [];
  state.logs = [];
  state.rows = [];
  state.invoices = [];
  render();
});

document.getElementById("downloadSample").addEventListener("click", () => {
  const csv = sampleRows.map((row) => row.join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  triggerDownload(url, "query-comex-exemplo.csv");
});

document.getElementById("exportInvoices").addEventListener("click", () => {
  const payload = state.invoices.map((invoice) => ({
    hbl: invoice.hbl,
    cliente: invoice.client,
    cnpj: invoice.cnpj,
    emissao: invoice.issueDate,
    vencimento: invoice.dueDate,
    status: invoice.status,
    total_brl: invoice.total,
    servicos: invoice.services.length
  }));
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  triggerDownload(url, "invoices-consolidadas.json");
});

function invoiceHtml(invoice) {
  const itemDescriptions = [...new Set(invoice.services.map((service) => service.item_description).filter(Boolean))];
  const totalOriginalByCurrency = Object.values(invoice.services.reduce((acc, service) => {
    acc[service.currency] ||= { currency: service.currency, total: 0 };
    acc[service.currency].total += service.entered_curr_total;
    return acc;
  }, {}));

  return `
    <div class="doc-header">
      <div>
        <img class="doc-logo" src="assets/logo-vanguard.png" alt="Vanguard Logistics" />
        <p class="eyebrow">Commercial Invoice</p>
        <h1>Invoice ${escapeHtml(invoice.hbl)}</h1>
      </div>
      <div class="doc-total">
        <span>Total BRL</span>
        <strong>${brl.format(invoice.total)}</strong>
      </div>
    </div>
    <div class="doc-grid">
      <div><span>Cliente</span><strong>${escapeHtml(invoice.client)}</strong></div>
      <div><span>CNPJ</span><strong>${escapeHtml(invoice.cnpj)}</strong></div>
      <div><span>HBL</span><strong>${escapeHtml(invoice.hbl)}</strong></div>
      <div><span>Emissão</span><strong>${formatDate(invoice.issueDate)}</strong></div>
      <div><span>Vencimento</span><strong>${formatDate(invoice.dueDate)}</strong></div>
      <div><span>Status</span><strong>${escapeHtml(invoice.status)}</strong></div>
    </div>
    <section class="doc-section">
      <h3>Serviços e conversão cambial</h3>
      <table>
        <thead>
          <tr><th>Serviço</th><th>Cálculo</th><th>Valor original</th><th>Câmbio aplicado</th><th>Valor em BRL</th></tr>
        </thead>
        <tbody>
          ${invoice.services.map((service) => `
            <tr>
              <td>${escapeHtml(service.service_description)}</td>
              <td>${escapeHtml(service.calculation_code)}</td>
              <td>${formatOriginal(service)}</td>
              <td>${escapeHtml(formatFx(service))}</td>
              <td><strong>${brl.format(service.brlValue)}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
    <div class="doc-summary">
      <div>
        <span>Totais originais</span>
        <strong>${totalOriginalByCurrency.map((item) => `${item.currency} ${numberFmt.format(item.total)}`).join(" · ")}</strong>
      </div>
      <div>
        <span>Total convertido</span>
        <strong>${brl.format(invoice.total)}</strong>
      </div>
    </div>
    <section class="doc-section">
      <h3>Descrição dos itens embarcados</h3>
      <p>${itemDescriptions.length ? escapeHtml(itemDescriptions.join(" | ")) : "Não informado na query."}</p>
    </section>
    <section class="doc-section">
      <h3>Dados bancários para pagamento</h3>
      ${bankDetailsHtml(invoice.bank || state.bank)}
      <p>${escapeHtml(invoice.observations)}</p>
    </section>
  `;
}

function openInvoicePreview(hbl) {
  const invoice = state.invoices.find((item) => item.hbl === hbl);
  if (!invoice) return;
  state.activeInvoiceHbl = hbl;
  document.getElementById("invoiceModalTitle").textContent = `Invoice ${invoice.hbl}`;
  document.getElementById("invoiceDocument").innerHTML = invoiceHtml(invoice);
  document.getElementById("invoiceModal").hidden = false;
}

function closeInvoicePreview() {
  document.getElementById("invoiceModal").hidden = true;
}

function printInvoice() {
  window.print();
}

function safeFileName(value) {
  return String(value || "invoice")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function triggerDownload(url, fileName) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvValue(value) {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function exportCsv(fileName, headers, rows) {
  const lines = [
    headers.map((header) => csvValue(header.label)).join(";"),
    ...rows.map((row) => headers.map((header) => csvValue(header.value(row))).join(";"))
  ];
  const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }));
  triggerDownload(url, fileName);
}

function exportReceivablesReport() {
  exportCsv(`contas-a-receber-${todayIso()}.csv`, [
    { label: "Cliente", value: (item) => item.client },
    { label: "HBL", value: (item) => item.hbl },
    { label: "Invoice", value: (item) => item.invoiceNo },
    { label: "Valor faturado", value: (item) => numberFmt.format(item.value) },
    { label: "Valor recebido", value: (item) => numberFmt.format(item.receivedAmount || 0) },
    { label: "Saldo", value: (item) => numberFmt.format(item.openBalance ?? item.value) },
    { label: "Emissao", value: (item) => formatDate(item.issueDate) },
    { label: "Vencimento", value: (item) => formatDate(item.dueDate) },
    { label: "Categoria financeira", value: (item) => item.category },
    { label: "Centro de custo", value: (item) => item.costCenter },
    { label: "Status financeiro", value: (item) => item.financialStatus || "ABERTO" }
  ], getFilteredReceivables());
}

function exportReceiptsReport() {
  exportCsv(`recebimentos-${todayIso()}.csv`, [
    { label: "HBL", value: ({ receipt, invoice }) => receipt.hbl_no || invoice?.hbl || "" },
    { label: "Invoice", value: ({ receipt, invoice }) => receipt.invoice_no || (invoice ? getInvoiceNo(invoice) : "") },
    { label: "Recibo", value: ({ receipt }) => receipt.receipt_no },
    { label: "Cliente", value: ({ receipt, invoice }) => receipt.payer_name || invoice?.client || "" },
    { label: "Valor recebido", value: ({ receipt }) => numberFmt.format(receipt.receipt_amount) },
    { label: "Data recebimento", value: ({ receipt }) => formatDate(receipt.posted_date) },
    { label: "Conta bancaria", value: ({ receipt }) => receipt.bank_account },
    { label: "Status conciliacao", value: ({ receipt }) => receipt.reconciliation_status },
    { label: "Status financeiro", value: ({ status }) => status },
    { label: "Conciliado por", value: ({ receipt }) => receipt.matched_by || "" },
    { label: "Arquivo origem", value: ({ receipt }) => receipt.source_file || "" }
  ], getFilteredReceipts());
}

function exportDashboardReport() {
  const invoices = getDashboardInvoices();
  exportCsv(`painel-financeiro-${todayIso()}.csv`, [
    { label: "Cliente", value: (invoice) => invoice.client },
    { label: "HBL", value: (invoice) => invoice.hbl },
    { label: "Invoice", value: (invoice) => getInvoiceNo(invoice) },
    { label: "Valor faturado", value: (invoice) => numberFmt.format(invoice.total) },
    { label: "Valor recebido", value: (invoice) => numberFmt.format(invoice.receivedAmount || 0) },
    { label: "Saldo aberto", value: (invoice) => numberFmt.format(invoice.openBalance ?? invoice.total) },
    { label: "Emissao", value: (invoice) => formatDate(invoice.issueDate) },
    { label: "Vencimento", value: (invoice) => formatDate(invoice.dueDate) },
    { label: "Status invoice", value: (invoice) => invoice.status },
    { label: "Status financeiro", value: (invoice) => invoice.financialStatus || "ABERTO" },
    { label: "Cliente especial", value: (invoice) => invoice.specialClient ? "Sim" : "Nao" },
    { label: "Servicos", value: (invoice) => invoice.services.length }
  ], invoices);
}

function loadLogoDataUrl() {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve("");
    image.src = "assets/logo-vanguard.png";
  });
}

async function buildInvoicePdf(invoice) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  if (!doc.autoTable) return null;
  const margin = 36;
  let y = 36;

  const logoDataUrl = await loadLogoDataUrl();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin, y, 170, 46);
    y += 62;
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 55, 48);
  doc.setFontSize(18);
  doc.text(`Invoice ${invoice.hbl}`, margin, y);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  y += 22;
  doc.text(`Cliente: ${invoice.client}`, margin, y);
  doc.text(`CNPJ: ${invoice.cnpj}`, 360, y);
  y += 16;
  doc.text(`Emissão: ${formatDate(invoice.issueDate)} · Vencimento: ${formatDate(invoice.dueDate)}`, margin, y);
  doc.text(`Total BRL: ${brl.format(invoice.total)}`, 360, y);
  y += 24;

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Serviço", "Cálculo", "Valor original", "Câmbio aplicado", "Valor em BRL"]],
    body: invoice.services.map((service) => [
      service.service_description,
      service.calculation_code,
      formatOriginal(service),
      formatFx(service),
      brl.format(service.brlValue)
    ]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [220, 55, 48], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 260 },
      1: { cellWidth: 90 },
      2: { cellWidth: 110 },
      3: { cellWidth: 110 },
      4: { cellWidth: 110 }
    }
  });

  const itemDescriptions = [...new Set(invoice.services.map((service) => service.item_description).filter(Boolean))].join(" | ") || "Não informado na query.";
  let footerY = doc.lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.text(`Total convertido: ${brl.format(invoice.total)}`, margin, footerY);
  doc.setFont("helvetica", "normal");
  footerY += 20;
  doc.setFont("helvetica", "bold");
  doc.text("Descrição dos itens embarcados", margin, footerY);
  doc.setFont("helvetica", "normal");
  footerY += 14;
  const itemLines = doc.splitTextToSize(itemDescriptions, 760);
  doc.text(itemLines, margin, footerY);
  footerY += itemLines.length * 12 + 16;
  doc.setFont("helvetica", "bold");
  doc.text("Dados bancários para pagamento", margin, footerY);
  doc.setFont("helvetica", "normal");
  footerY += 14;
  bankDetailsText(invoice.bank || state.bank).forEach((line) => {
    doc.text(doc.splitTextToSize(line, 760), margin, footerY);
    footerY += 13;
  });
  doc.text(invoice.observations, margin, footerY + 6);
  return doc;
}

async function downloadInvoicePdf(hbl = state.activeInvoiceHbl) {
  const invoice = state.invoices.find((item) => item.hbl === hbl);
  if (!invoice) return;

  if (!window.jspdf?.jsPDF) {
    openInvoicePreview(invoice.hbl);
    printInvoice();
    return;
  }

  try {
    const doc = await buildInvoicePdf(invoice);
    if (!doc) {
      openInvoicePreview(invoice.hbl);
      printInvoice();
      return;
    }
    doc.save(`invoice-${safeFileName(invoice.hbl)}.pdf`);
  } catch (error) {
    addLog("error", `Falha ao exportar PDF da invoice ${invoice.hbl}`, error.message);
    openInvoicePreview(invoice.hbl);
    printInvoice();
  }
}

document.getElementById("closeInvoiceModal").addEventListener("click", closeInvoicePreview);
document.getElementById("invoiceModal").addEventListener("click", (event) => {
  if (event.target.id === "invoiceModal") closeInvoicePreview();
});
document.getElementById("printInvoice").addEventListener("click", printInvoice);
document.getElementById("downloadInvoicePdf").addEventListener("click", () => downloadInvoicePdf());
document.getElementById("closeBillingModal").addEventListener("click", () => {
  document.getElementById("billingModal").hidden = true;
});
document.getElementById("billingModal").addEventListener("click", (event) => {
  if (event.target.id === "billingModal") document.getElementById("billingModal").hidden = true;
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  document.getElementById("loginError").textContent = "";
  showSyncStatus("Autenticando...");
  try {
    await login(email, password);
  } catch (error) {
    showLogin(error.message || "Falha no login.");
  }
});

document.getElementById("logoutButton").addEventListener("click", logout);

document.getElementById("rateDate").value = todayIso();

// Aba Usuários — injetar no HTML dinamicamente (só admin verá)
(function injectUsersView() {
  const sidebar = document.querySelector(".sidebar");
  const content = document.querySelector(".content");
  if (!sidebar || !content) return;

  const navBtn = document.createElement("button");
  navBtn.className = "nav-item";
  navBtn.dataset.view = "users";
  navBtn.textContent = "Usuários";
  navBtn.style.display = "none";
  sidebar.appendChild(navBtn);

  const section = document.createElement("section");
  section.className = "view";
  section.id = "users";
  section.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Controle de acesso</p>
        <h2>Gestão de usuários</h2>
      </div>
      <span class="status-pill" id="membersCount">0 membros</span>
    </div>
    <div class="panel">
      <div class="panel-head">
        <h3>Membros da equipe Vanguard</h3>
        <span style="color:var(--muted);font-size:0.82rem">Novos usuários entram como Operador automaticamente ao fazer o primeiro login</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>E-mail</th><th>Perfil</th><th>Ação</th></tr></thead>
          <tbody id="usersViewBody"><tr><td colspan="3" class="empty">Faça login como admin para ver os membros.</td></tr></tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Sobre os perfis</h3></div>
      <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr;margin-top:8px;">
        <div style="background:var(--bg);border-radius:7px;padding:14px;border:1px solid var(--line);">
          <strong>Admin</strong>
          <p style="color:var(--muted);font-size:0.85rem;margin:6px 0 0;">Acesso total: todas as abas, configuração de e-mail, exclusão de clientes e importações, gestão de usuários.</p>
        </div>
        <div style="background:var(--bg);border-radius:7px;padding:14px;border:1px solid var(--line);">
          <strong>Operador</strong>
          <p style="color:var(--muted);font-size:0.85rem;margin:6px 0 0;">Acesso operacional: importação, invoices, clientes, câmbio, contas a receber, recebimentos, auditoria. Sem acesso à aba E-mail.</p>
        </div>
      </div>
    </div>
  `;
  content.appendChild(section);

  navBtn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item, .view").forEach((el) => el.classList.remove("active"));
    navBtn.classList.add("active");
    section.classList.add("active");
    renderUsersView().then(() => {
      const tbody = document.getElementById("usersViewBody");
      const count = tbody ? tbody.querySelectorAll("tr").length : 0;
      const pill = document.getElementById("membersCount");
      if (pill) pill.textContent = count + " membros";
    });
  });

  // Delegação de eventos na tabela de membros
  section.addEventListener("change", async (event) => {
    const memberId = event.target.dataset.memberRole;
    if (!memberId || !isAdmin()) return;
    try {
      await updateMemberRole(memberId, event.target.value);
      showSyncStatus("Perfil atualizado");
      addLog("success", "Perfil de membro alterado", event.target.value);
    } catch (e) {
      showSyncStatus("Erro ao alterar perfil: " + e.message, true);
    }
  });

  section.addEventListener("click", async (event) => {
    const memberId = event.target.dataset.removeMember;
    if (!memberId || !isAdmin()) return;
    if (!window.confirm("Remover este membro? Ele perderá o acesso ao sistema.")) return;
    try {
      await removeMember(memberId);
      addLog("success", "Membro removido", memberId);
      renderUsersView();
    } catch (e) {
      showSyncStatus("Erro ao remover: " + e.message, true);
    }
  });
})();

// Inicialização: tenta restaurar sessão salva ou pede login
(async function init() {
  if (!authToken) { showLogin(); return; }
  try {
    const user = await sbFetch("/auth/v1/user", { method: "GET" });
    currentUserId = user.id || currentUserId;
    currentUserEmail = user.email || currentUserEmail;
    currentUserRole = sessionStorage.getItem("vanguardUserRole") || "operador";
    sessionStorage.setItem("vanguardUserId", currentUserId);
    sessionStorage.setItem("vanguardUserEmail", currentUserEmail);
    document.getElementById("loginModal").hidden = true;
    document.getElementById("authEmail").textContent = currentUserEmail;
    await selfRegisterIfNeeded();
    await loadRemoteState();
  } catch {
    sessionStorage.clear();
    showLogin("Sessão expirada. Faça login novamente.");
  }
})();
