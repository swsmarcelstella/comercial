const templates = {
  qar: {
    label: "Qualidade do Ar (ABNT NBR 17037:2023)",
    unit: "ponto",
    defaultDescription:
      "Avaliação de ar climatizado e ar externo conforme ABNT NBR 17037:2023, com parâmetros microbiológicos, físicos e de CO2, incluindo comparativo com padrão referencial aplicável.",
    technicalText: [
      "Escopo alinhado ao modelo atualizado da ABNT NBR 17037:2023 para ambientes climatizados artificialmente (não residenciais).",
      "Parâmetros: umidade, temperatura, velocidade do ar, fungos viáveis (ar externo e climatizado), gêneros fúngicos isolados, relação I/E, PM2,5, PM10, CO2 (ar externo e climatizado) e diferença de CO2 (interno - externo).",
      "Métodos de referência: ABNT NBR 17037:2023, POP-001 e ISO 21501-4:2018 (conforme aplicabilidade do parâmetro).",
      "Prazo estimado padrão para emissão do relatório: até 10 dias úteis após a coleta."
    ]
  },
  potabilidade: {
    label: "Potabilidade da Água",
    unit: "amostra",
    defaultDescription:
      "Análise de água para consumo humano (pacote C1), com parâmetros microbiológicos e físico-químicos e comparativo legal.",
    technicalText: [
      "Escopo sugerido para água de consumo (C1): Coliformes Totais, Escherichia coli, pH, Cloro Livre, Turbidez e Cor Aparente.",
      "Métodos de referência usuais: SMWW 23ª ed. (9223 B, 4500 H-B, 4500-Cl G, 2130 B, 2120 C).",
      "Comparativo de conformidade com a Portaria GM/MS nº 888, de 04/05/2021.",
      "Prazo estimado padrão para emissão do relatório: até 10 dias úteis após a coleta."
    ]
  },
  legionella: {
    label: "Análise de Legionella",
    unit: "amostra",
    defaultDescription:
      "Detecção e quantificação de Legionella em água, incluindo L. pneumophila (sorogrupos 1 e 2 a 15).",
    technicalText: [
      "Escopo sugerido (L1 - POP-023): Bactérias Heterotróficas, Legionella sp., L. pneumophila (sorogrupo 1) e L. pneumophila (sorogrupos 2 a 15).",
      "Métodos de referência: POP-023 para Legionella e SMWW 23ª ed. método 9215 B para bactérias heterotróficas.",
      "Comparativo conforme procedimento POP-023 (detecção e quantificação de Legionella).",
      "Prazo estimado padrão para emissão do relatório: até 20 dias após a coleta."
    ]
  },
  custom: {
    label: "Serviço customizado",
    unit: "un",
    defaultDescription: "Descreva o escopo técnico e comercial do serviço.",
    technicalText: ["Escopo técnico customizado conforme descrição dos itens contratados."]
  }
};

const STATUS_LABELS = {
  open: "Aberta",
  converted: "Convertida",
  lost: "Perdida"
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const STORAGE_KEY = "savecomercial.proposals.v1";

const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
const SAVE_LOGO_URL = window.SAVE_LOGO_URL || "";
const supabase =
  window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

let currentProposalId = null;
let currentClientId = null;
let isGeneratingProposalNumber = false;
window.__eventsBound = false;

const itemsContainer = document.getElementById("itemsContainer");
const itemTemplate = document.getElementById("itemTemplate");
const proposalPreview = document.getElementById("proposalPreview");
const internalSummary = document.getElementById("internalSummary");
const dashboardPeriod = document.getElementById("dashboardPeriod");
const dashboardCards = document.getElementById("dashboardCards");
const recentProposalsBody = document.querySelector("#recentProposalsTable tbody");
const editProposalSelect = document.getElementById("editProposalSelect");
const editingHint = document.getElementById("editingHint");
const runtimeErrorHint = document.getElementById("runtimeErrorHint");

// Expondo handlers principais cedo para o fallback HTML usar o fluxo real.
window.__appAddItem = function () {
  createItem();
  updateInternalSummary();
};

window.__appGenerate = function () {
  renderProposal(getData());
};

function bindEvent(id, eventName, handler) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Elemento não encontrado: #${id}`);
    return;
  }
  el.addEventListener(eventName, handler);
}

function showRuntimeError(error, context = "execução") {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Erro em ${context}:`, error);
  if (runtimeErrorHint) {
    runtimeErrorHint.style.display = "block";
    runtimeErrorHint.textContent = `Erro em ${context}: ${message}`;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function createItem(initial = {}) {
  const node = itemTemplate.content.firstElementChild.cloneNode(true);

  const serviceEl = node.querySelector(".item-service");
  const unitEl = node.querySelector(".item-unit");
  const qtyEl = node.querySelector(".item-qty");
  const priceEl = node.querySelector(".item-price");
  const supplierCostEl = node.querySelector(".item-supplier-cost");
  const logisticsCostEl = node.querySelector(".item-logistics-cost");
  const sampleShippingEl = node.querySelector(".item-sample-shipping-cost");
  const descEl = node.querySelector(".item-description");
  const removeBtn = node.querySelector(".remove-item");

  serviceEl.value = initial.service || "qar";
  const cfg = templates[serviceEl.value];

  unitEl.value = initial.unit || cfg.unit;
  qtyEl.value = initial.quantity ?? 1;
  priceEl.value = initial.unitPrice ?? 0;
  supplierCostEl.value = initial.supplierCostUnit ?? 0;
  logisticsCostEl.value = initial.logisticsCost ?? 0;
  sampleShippingEl.value = initial.sampleShippingCost ?? 0;
  descEl.value = initial.description || cfg.defaultDescription;

  serviceEl.addEventListener("change", () => {
    const selected = templates[serviceEl.value];
    unitEl.value = selected.unit;
    descEl.value = selected.defaultDescription;
    updateInternalSummary();
  });

  [qtyEl, priceEl, supplierCostEl, logisticsCostEl, sampleShippingEl].forEach((el) => {
    el.addEventListener("input", updateInternalSummary);
  });

  removeBtn.addEventListener("click", () => {
    node.remove();
    refreshItemIndexes();
    updateInternalSummary();
  });

  itemsContainer.appendChild(node);
  refreshItemIndexes();
}

function refreshItemIndexes() {
  [...itemsContainer.children].forEach((item, index) => {
    item.querySelector(".item-index").textContent = index + 1;
  });
}

function readItemNode(node) {
  const service = node.querySelector(".item-service").value;
  const quantity = toNumber(node.querySelector(".item-qty").value);
  const unitPrice = toNumber(node.querySelector(".item-price").value);
  const total = quantity * unitPrice;

  const supplierCostUnit = toNumber(node.querySelector(".item-supplier-cost").value);
  const supplierCostTotal = quantity * supplierCostUnit;
  const logisticsCost = toNumber(node.querySelector(".item-logistics-cost").value);
  const sampleShippingCost = toNumber(node.querySelector(".item-sample-shipping-cost").value);
  const itemTotalCost = supplierCostTotal + logisticsCost + sampleShippingCost;
  const itemProfit = total - itemTotalCost;

  return {
    service,
    serviceLabel: templates[service].label,
    unit: node.querySelector(".item-unit").value.trim() || "un",
    quantity,
    unitPrice,
    total,
    description: node.querySelector(".item-description").value.trim(),
    supplierCostUnit,
    supplierCostTotal,
    logisticsCost,
    sampleShippingCost,
    itemTotalCost,
    itemProfit
  };
}

function calculateInternalCosts(items) {
  const grossRevenue = items.reduce((sum, item) => sum + item.total, 0);
  const itemsInternalCost = items.reduce((sum, item) => sum + item.itemTotalCost, 0);

  const taxPercent = toNumber(document.getElementById("taxPercent").value);
  const commissionPercent = toNumber(document.getElementById("commissionPercent").value);

  const taxAmount = grossRevenue * (taxPercent / 100);
  const commissionAmount = grossRevenue * (commissionPercent / 100);
  const totalInternalCosts = itemsInternalCost + taxAmount + commissionAmount;
  const netProfit = grossRevenue - totalInternalCosts;
  const profitMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  return {
    taxPercent,
    commissionPercent,
    grossRevenue,
    taxAmount,
    commissionAmount,
    itemsInternalCost,
    totalInternalCosts,
    netProfit,
    profitMarginPercent
  };
}

function updateInternalSummary() {
  const items = [...itemsContainer.children].map(readItemNode);
  const costs = calculateInternalCosts(items);

  internalSummary.innerHTML = `
    <div><strong>Receita bruta:</strong> ${currency.format(costs.grossRevenue)}</div>
    <div><strong>Custo itens:</strong> ${currency.format(costs.itemsInternalCost)}</div>
    <div><strong>Imposto:</strong> ${currency.format(costs.taxAmount)}</div>
    <div><strong>Comissão:</strong> ${currency.format(costs.commissionAmount)}</div>
    <div><strong>Custos internos totais:</strong> ${currency.format(costs.totalInternalCosts)}</div>
    <div><strong>Lucro líquido:</strong> ${currency.format(costs.netProfit)}</div>
    <div><strong>Margem:</strong> ${costs.profitMarginPercent.toFixed(2)}%</div>
  `;
}

function getData() {
  const items = [...itemsContainer.children].map(readItemNode);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const internalCosts = calculateInternalCosts(items);

  return {
    id: currentProposalId,
    clientId: currentClientId,
    proposalNumber: document.getElementById("proposalNumber").value.trim(),
    proposalDate: document.getElementById("proposalDate").value,
    proposalCity: document.getElementById("proposalCity").value.trim(),
    validityDays: toNumber(document.getElementById("validityDays").value || 60),
    proposalStatus: document.getElementById("proposalStatus").value,
    clientName: document.getElementById("clientName").value.trim(),
    clientCnpj: document.getElementById("clientCnpj").value.trim(),
    attentionTo: document.getElementById("attentionTo").value.trim(),
    clientEmail: document.getElementById("clientEmail").value.trim(),
    clientPhone: document.getElementById("clientPhone").value.trim(),
    clientAddress: document.getElementById("clientAddress").value.trim(),
    collectionTime: document.getElementById("collectionTime").value.trim(),
    reportTime: document.getElementById("reportTime").value.trim(),
    paymentTerms: document.getElementById("paymentTerms").value.trim(),
    salesPerson: document.getElementById("salesPerson").value.trim(),
    generalNotes: document.getElementById("generalNotes").value.trim(),
    items,
    subtotal,
    internalCosts
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTechnicalScope(items) {
  const serviceKeys = [...new Set(items.map((i) => i.service))];

  return serviceKeys
    .map((key) => {
      const cfg = templates[key];
      return `
        <h4>${escapeHtml(cfg.label)}</h4>
        <ul>
          ${cfg.technicalText.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        </ul>
      `;
    })
    .join("");
}

function renderProposal(data) {
  if (!data.items.length) {
    proposalPreview.classList.add("empty");
    proposalPreview.textContent = "Adicione ao menos um item para gerar a proposta.";
    return;
  }

  const itemRows = data.items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.serviceLabel)}<br><small>${escapeHtml(item.description)}</small></td>
        <td>${escapeHtml(item.unit)}</td>
        <td class="align-right">${item.quantity}</td>
        <td class="align-right">${currency.format(item.unitPrice)}</td>
        <td class="align-right">${currency.format(item.total)}</td>
      </tr>
    `
    )
    .join("");

  proposalPreview.classList.remove("empty");
  proposalPreview.innerHTML = `
    <article class="proposal">
      <header class="proposal-brand">
        ${
          SAVE_LOGO_URL
            ? `<img src="${escapeHtml(SAVE_LOGO_URL)}" alt="Save Water Solutions" class="proposal-logo" />`
            : `<div class="proposal-brand-fallback">
                 <strong>SAVE</strong>
                 <span>Water Solutions</span>
               </div>`
        }
      </header>
      <h2>Proposta Comercial Nº ${escapeHtml(data.proposalNumber || "-")}</h2>
      <p><strong>${escapeHtml(data.proposalCity || "")}</strong>, ${escapeHtml(formatDate(data.proposalDate))}</p>

      <p><strong>A/C:</strong> ${escapeHtml(data.attentionTo || data.clientName || "-")}</p>
      <p><strong>Cliente:</strong> ${escapeHtml(data.clientName || "-")} ${
    data.clientCnpj ? `| <strong>CNPJ:</strong> ${escapeHtml(data.clientCnpj)}` : ""
  }</p>
      <p><strong>Contato:</strong> ${escapeHtml(data.clientEmail || "-")} ${
    data.clientPhone ? `| ${escapeHtml(data.clientPhone)}` : ""
  }</p>
      <p><strong>Endereço:</strong> ${escapeHtml(data.clientAddress || "-")}</p>

      <h3>1. Objeto</h3>
      <p>Apresentamos proposta para execução dos serviços de análises ambientais e sanitárias conforme escopo técnico e comercial descrito neste documento.</p>

      <h3>2. Escopo Técnico</h3>
      ${renderTechnicalScope(data.items)}

      <h3>3. Investimento</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Descrição</th>
            <th>Unid.</th>
            <th class="align-right">Qtd.</th>
            <th class="align-right">Valor Unitário</th>
            <th class="align-right">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <table class="summary">
        <tbody>
          <tr>
            <th>Total da Proposta</th>
            <td class="align-right"><strong>${currency.format(data.subtotal)}</strong></td>
          </tr>
        </tbody>
      </table>

      <h3>4. Condições Comerciais</h3>
      <ul>
        <li>Prazo para coleta: ${escapeHtml(data.collectionTime || "A combinar")}</li>
        <li>Prazo para entrega do laudo: ${escapeHtml(data.reportTime || "A combinar")}</li>
        <li>Forma de pagamento: ${escapeHtml(data.paymentTerms || "A combinar")}</li>
        <li>Validade desta proposta: ${escapeHtml(String(data.validityDays || 60))} dias corridos.</li>
      </ul>

      <h3>5. Observações</h3>
      <p>${escapeHtml(data.generalNotes || "Todos os serviços serão executados conforme alinhamento técnico e operacional prévio entre as partes.")}</p>

      <p style="margin-top: 32px;">Atenciosamente,</p>
      <p><strong>${escapeHtml(data.salesPerson || "Equipe Comercial")}</strong></p>
    </article>
  `;
}

function saveJson() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `proposta-${data.proposalNumber || "sem-numero"}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function setValue(id, value) {
  const el = document.getElementById(id);
  el.value = value ?? "";
}

function resetFormState() {
  currentProposalId = null;
  currentClientId = null;
}

function renderEditingState() {
  if (!editingHint) return;
  if (currentProposalId) {
    const number = document.getElementById("proposalNumber").value || "-";
    editingHint.textContent = `Modo atual: editando proposta ${number}`;
  } else {
    editingHint.textContent = "Modo atual: nova proposta";
  }
}

function refreshEditProposalSelect() {
  if (!editProposalSelect) return;
  const proposals = getLocalProposals().sort((a, b) =>
    (a.updatedAt || a.proposalDate || "") < (b.updatedAt || b.proposalDate || "") ? 1 : -1
  );

  editProposalSelect.innerHTML = `
    <option value="">Selecione uma proposta...</option>
    ${proposals
      .map((p) => {
        const label = `${p.proposalNumber || "-"} | ${p.clientName || "-"} | ${formatDate(p.proposalDate || "")}`;
        return `<option value="${escapeHtml(p.id)}">${escapeHtml(label)}</option>`;
      })
      .join("")}
  `;
}

function fillForm(data) {
  currentProposalId = data.id || null;
  currentClientId = data.clientId || null;

  setValue("proposalNumber", data.proposalNumber);
  setValue("proposalDate", data.proposalDate || todayIso());
  setValue("proposalCity", data.proposalCity);
  setValue("validityDays", data.validityDays || 60);
  setValue("proposalStatus", data.proposalStatus || "open");
  setValue("clientName", data.clientName);
  setValue("clientCnpj", data.clientCnpj);
  setValue("attentionTo", data.attentionTo);
  setValue("clientEmail", data.clientEmail);
  setValue("clientPhone", data.clientPhone);
  setValue("clientAddress", data.clientAddress);
  setValue("collectionTime", data.collectionTime);
  setValue("reportTime", data.reportTime);
  setValue("paymentTerms", data.paymentTerms);
  setValue("salesPerson", data.salesPerson);
  setValue("generalNotes", data.generalNotes);
  setValue("taxPercent", data.internalCosts?.taxPercent || 0);
  setValue("commissionPercent", data.internalCosts?.commissionPercent || 0);

  itemsContainer.innerHTML = "";
  (data.items || []).forEach((item) => createItem(item));
  if (!(data.items || []).length) createItem();
  updateInternalSummary();
  renderProposal(getData());
  renderEditingState();
  if (currentProposalId && editProposalSelect) editProposalSelect.value = currentProposalId;
}

function loadJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const data = JSON.parse(reader.result);
    fillForm(data);
  };
  reader.readAsText(file);
}

function getLocalProposals() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setLocalProposals(proposals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
}

function extractSequenceForYear(proposalNumber, year) {
  if (!proposalNumber) return null;
  const value = String(proposalNumber).trim();

  const pcMatch = value.match(/PC\s*(\d+)\s*\/\s*(\d{4})/i);
  if (pcMatch) {
    const seq = Number(pcMatch[1]);
    const foundYear = Number(pcMatch[2]);
    if (foundYear === year && Number.isFinite(seq)) return seq;
  }

  const legacyMatch = value.match(/(\d{4})\.(\d{1,6})/);
  if (legacyMatch) {
    const foundYear = Number(legacyMatch[1]);
    const seq = Number(legacyMatch[2]);
    if (foundYear === year && Number.isFinite(seq)) return seq;
  }

  return null;
}

function getYearFromDateInput() {
  const dateValue = document.getElementById("proposalDate").value || todayIso();
  return Number(dateValue.slice(0, 4));
}

async function getExistingProposalNumbers(year) {
  const localNumbers = getLocalProposals()
    .filter((p) => {
      const proposalYear = Number((p.proposalDate || "").slice(0, 4));
      if (proposalYear === year) return true;
      return extractSequenceForYear(p.proposalNumber, year) !== null;
    })
    .map((p) => p.proposalNumber)
    .filter(Boolean);

  if (!supabase) return localNumbers;

  try {
    const { data, error } = await supabase
      .from("proposals")
      .select("proposal_number, proposal_date")
      .gte("proposal_date", `${year}-01-01`)
      .lte("proposal_date", `${year}-12-31`);

    if (error) throw error;

    const remoteNumbers = (data || []).map((row) => row.proposal_number).filter(Boolean);
    return [...new Set([...localNumbers, ...remoteNumbers])];
  } catch (error) {
    console.warn("Falha ao consultar sequencial no Supabase. Usando base local.", error);
    return localNumbers;
  }
}

async function generateNextProposalNumber() {
  const year = getYearFromDateInput();
  const numbers = await getExistingProposalNumbers(year);
  const maxSeq = numbers.reduce((max, number) => {
    const seq = extractSequenceForYear(number, year);
    return seq && seq > max ? seq : max;
  }, 0);

  return `PC${maxSeq + 1}/${year}.1`;
}

async function ensureProposalNumber({ force = false } = {}) {
  if (isGeneratingProposalNumber) return;
  if (currentProposalId && !force) return;

  const proposalNumberEl = document.getElementById("proposalNumber");
  const hasValue = proposalNumberEl.value.trim().length > 0;
  if (hasValue && !force) return;

  try {
    isGeneratingProposalNumber = true;
    proposalNumberEl.value = await generateNextProposalNumber();
  } finally {
    isGeneratingProposalNumber = false;
  }
}

function upsertLocalProposal(data) {
  const proposals = getLocalProposals();
  const id = data.id || crypto.randomUUID();
  const enriched = {
    ...data,
    id,
    updatedAt: new Date().toISOString()
  };

  const idx = proposals.findIndex((p) => p.id === id || p.proposalNumber === data.proposalNumber);
  if (idx >= 0) proposals[idx] = enriched;
  else proposals.push(enriched);

  setLocalProposals(proposals);
  return enriched;
}

async function startNewProposal() {
  resetFormState();
  fillForm({
    proposalDate: todayIso(),
    validityDays: 60,
    proposalStatus: "open",
    collectionTime: "Agendamento em até 5 dias úteis e visita técnica em até 15 dias úteis",
    reportTime: "Até 10 dias úteis após a coleta",
    paymentTerms: "1x boleto bancário, 30 ddl após emissão da nota fiscal",
    salesPerson: "Equipe Comercial Save",
    internalCosts: { taxPercent: 0, commissionPercent: 0 },
    items: []
  });
  await ensureProposalNumber({ force: true });
  renderProposal(getData());
  renderEditingState();
}

function inPeriod(dateStr, period) {
  const date = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();

  if (period === "month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  if (period === "30days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return date >= start && date <= now;
  }

  if (period === "year") {
    return date.getFullYear() === now.getFullYear();
  }

  return true;
}

function buildDashboardMetrics(source) {
  const period = dashboardPeriod.value;
  const proposals = source.filter((p) => inPeriod(p.proposalDate, period));

  const total = proposals.length;
  const converted = proposals.filter((p) => p.proposalStatus === "converted");
  const notConverted = proposals.filter((p) => p.proposalStatus !== "converted");

  const totalRevenue = proposals.reduce((sum, p) => sum + toNumber(p.subtotal), 0);
  const convertedRevenue = converted.reduce((sum, p) => sum + toNumber(p.subtotal), 0);
  const notConvertedRevenue = notConverted.reduce((sum, p) => sum + toNumber(p.subtotal), 0);

  const totalCosts = proposals.reduce((sum, p) => sum + toNumber(p.internalCosts?.totalInternalCosts), 0);
  const totalProfit = proposals.reduce((sum, p) => sum + toNumber(p.internalCosts?.netProfit), 0);

  const conversionRateQty = total > 0 ? (converted.length / total) * 100 : 0;
  const conversionRateValue = totalRevenue > 0 ? (convertedRevenue / totalRevenue) * 100 : 0;
  const avgMargin =
    proposals.length > 0
      ? proposals.reduce((sum, p) => sum + toNumber(p.internalCosts?.profitMarginPercent), 0) / proposals.length
      : 0;

  return {
    proposals,
    total,
    convertedCount: converted.length,
    notConvertedCount: notConverted.length,
    totalRevenue,
    convertedRevenue,
    notConvertedRevenue,
    totalCosts,
    totalProfit,
    conversionRateQty,
    conversionRateValue,
    avgMargin
  };
}

function renderDashboard() {
  const proposals = getLocalProposals();
  const m = buildDashboardMetrics(proposals);

  dashboardCards.innerHTML = `
    <div class="metric-card"><p>Total propostas</p><strong>${m.total}</strong></div>
    <div class="metric-card"><p>Convertidas</p><strong>${m.convertedCount}</strong></div>
    <div class="metric-card"><p>Não convertidas</p><strong>${m.notConvertedCount}</strong></div>
    <div class="metric-card"><p>Taxa (qtd)</p><strong>${m.conversionRateQty.toFixed(1)}%</strong></div>
    <div class="metric-card"><p>Taxa (valor)</p><strong>${m.conversionRateValue.toFixed(1)}%</strong></div>
    <div class="metric-card"><p>Receita bruta</p><strong>${currency.format(m.totalRevenue)}</strong></div>
    <div class="metric-card"><p>Custos internos</p><strong>${currency.format(m.totalCosts)}</strong></div>
    <div class="metric-card"><p>Lucro líquido</p><strong>${currency.format(m.totalProfit)}</strong></div>
    <div class="metric-card"><p>Margem média</p><strong>${m.avgMargin.toFixed(1)}%</strong></div>
  `;

  const qtyConvertedWidth = m.total > 0 ? (m.convertedCount / m.total) * 100 : 0;
  const qtyNotConvertedWidth = m.total > 0 ? (m.notConvertedCount / m.total) * 100 : 0;
  const valueConvertedWidth = m.totalRevenue > 0 ? (m.convertedRevenue / m.totalRevenue) * 100 : 0;
  const valueNotConvertedWidth = m.totalRevenue > 0 ? (m.notConvertedRevenue / m.totalRevenue) * 100 : 0;

  document.getElementById("qtyConvertedBar").style.width = `${Math.max(qtyConvertedWidth, 2)}%`;
  document.getElementById("qtyNotConvertedBar").style.width = `${Math.max(qtyNotConvertedWidth, 2)}%`;
  document.getElementById("valueConvertedBar").style.width = `${Math.max(valueConvertedWidth, 2)}%`;
  document.getElementById("valueNotConvertedBar").style.width = `${Math.max(valueNotConvertedWidth, 2)}%`;

  recentProposalsBody.innerHTML = m.proposals
    .sort((a, b) => (a.proposalDate < b.proposalDate ? 1 : -1))
    .slice(0, 12)
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.proposalNumber || "-")}</td>
        <td>${escapeHtml(p.clientName || "-")}</td>
        <td>${escapeHtml(formatDate(p.proposalDate))}</td>
        <td>${escapeHtml(STATUS_LABELS[p.proposalStatus] || "-")}</td>
        <td>${currency.format(toNumber(p.subtotal))}</td>
        <td><button class="btn small" data-load-id="${escapeHtml(p.id)}">Abrir</button></td>
      </tr>
    `
    )
    .join("");

  refreshEditProposalSelect();
}

if (recentProposalsBody) {
  recentProposalsBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.getAttribute("data-load-id");
    if (!id) return;

    const proposal = getLocalProposals().find((p) => p.id === id);
    if (proposal) fillForm(proposal);
  });
}

async function saveToSupabase(data, isUpdate) {
  if (!supabase) return null;

  let clientId = data.clientId;
  if (isUpdate && !data.id) throw new Error("Selecione uma proposta para atualizar.");

  if (clientId) {
    const { error } = await supabase
      .from("clients")
      .update({
        name: data.clientName,
        cnpj: data.clientCnpj,
        email: data.clientEmail,
        phone: data.clientPhone,
        address: data.clientAddress
      })
      .eq("id", clientId);

    if (error) throw error;
  } else {
    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        name: data.clientName,
        cnpj: data.clientCnpj,
        email: data.clientEmail,
        phone: data.clientPhone,
        address: data.clientAddress
      })
      .select("id")
      .single();

    if (error) throw error;
    clientId = client.id;
  }

  const proposalPayload = {
    proposal_number: data.proposalNumber,
    proposal_date: data.proposalDate,
    proposal_city: data.proposalCity,
    validity_days: data.validityDays,
    status: data.proposalStatus,
    attention_to: data.attentionTo,
    collection_time: data.collectionTime,
    report_time: data.reportTime,
    payment_terms: data.paymentTerms,
    sales_person: data.salesPerson,
    general_notes: data.generalNotes,
    subtotal: data.subtotal,
    client_id: clientId,
    tax_percent: data.internalCosts.taxPercent,
    commission_percent: data.internalCosts.commissionPercent,
    gross_revenue: data.internalCosts.grossRevenue,
    tax_amount: data.internalCosts.taxAmount,
    total_internal_costs: data.internalCosts.totalInternalCosts,
    net_profit: data.internalCosts.netProfit,
    profit_margin_percent: data.internalCosts.profitMarginPercent
  };

  let proposalId = data.id;

  if (isUpdate) {
    const { error } = await supabase.from("proposals").update(proposalPayload).eq("id", proposalId);
    if (error) throw error;
  } else {
    const { data: proposal, error } = await supabase
      .from("proposals")
      .insert(proposalPayload)
      .select("id")
      .single();

    if (error) throw error;
    proposalId = proposal.id;
  }

  if (isUpdate) {
    const { error: deleteError } = await supabase.from("proposal_items").delete().eq("proposal_id", proposalId);
    if (deleteError) throw deleteError;
  }

  const itemsPayload = data.items.map((item, index) => ({
    proposal_id: proposalId,
    service: item.service,
    service_label: item.serviceLabel,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total: item.total,
    position: index + 1,
    supplier_cost_unit: item.supplierCostUnit,
    supplier_cost_total: item.supplierCostTotal,
    logistics_cost: item.logisticsCost,
    sample_shipping_cost: item.sampleShippingCost,
    item_total_cost: item.itemTotalCost,
    item_profit: item.itemProfit
  }));

  if (itemsPayload.length > 0) {
    const { error: itemError } = await supabase.from("proposal_items").insert(itemsPayload);
    if (itemError) throw itemError;
  }

  return { id: proposalId, clientId };
}

async function syncSupabaseToLocal() {
  if (!supabase) return;

  const { data: proposalsRows, error: proposalsError } = await supabase
    .from("proposals")
    .select("*")
    .order("proposal_date", { ascending: false });
  if (proposalsError) throw proposalsError;

  if (!proposalsRows?.length) {
    setLocalProposals([]);
    return;
  }

  const proposalIds = proposalsRows.map((row) => row.id);
  const clientIds = [...new Set(proposalsRows.map((row) => row.client_id).filter(Boolean))];

  const [{ data: clientsRows, error: clientsError }, { data: itemsRows, error: itemsError }] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("*").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    proposalIds.length
      ? supabase.from("proposal_items").select("*").in("proposal_id", proposalIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (clientsError) throw clientsError;
  if (itemsError) throw itemsError;

  const clientMap = new Map((clientsRows || []).map((row) => [row.id, row]));
  const itemsByProposal = new Map();

  (itemsRows || []).forEach((item) => {
    if (!itemsByProposal.has(item.proposal_id)) itemsByProposal.set(item.proposal_id, []);
    itemsByProposal.get(item.proposal_id).push(item);
  });

  const normalized = proposalsRows.map((proposal) => {
    const client = clientMap.get(proposal.client_id) || {};
    const items = (itemsByProposal.get(proposal.id) || [])
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((item) => ({
        service: item.service,
        serviceLabel: item.service_label || templates[item.service]?.label || "Serviço",
        description: item.description || "",
        unit: item.unit || "un",
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unit_price),
        total: toNumber(item.total),
        supplierCostUnit: toNumber(item.supplier_cost_unit),
        supplierCostTotal: toNumber(item.supplier_cost_total),
        logisticsCost: toNumber(item.logistics_cost),
        sampleShippingCost: toNumber(item.sample_shipping_cost),
        itemTotalCost: toNumber(item.item_total_cost),
        itemProfit: toNumber(item.item_profit)
      }));

    return {
      id: proposal.id,
      clientId: proposal.client_id,
      proposalNumber: proposal.proposal_number,
      proposalDate: proposal.proposal_date,
      proposalCity: proposal.proposal_city || "",
      validityDays: toNumber(proposal.validity_days || 60),
      proposalStatus: proposal.status || "open",
      clientName: client.name || "",
      clientCnpj: client.cnpj || "",
      attentionTo: proposal.attention_to || "",
      clientEmail: client.email || "",
      clientPhone: client.phone || "",
      clientAddress: client.address || "",
      collectionTime: proposal.collection_time || "",
      reportTime: proposal.report_time || "",
      paymentTerms: proposal.payment_terms || "",
      salesPerson: proposal.sales_person || "",
      generalNotes: proposal.general_notes || "",
      items,
      subtotal: toNumber(proposal.subtotal),
      internalCosts: {
        taxPercent: toNumber(proposal.tax_percent),
        commissionPercent: toNumber(proposal.commission_percent),
        grossRevenue: toNumber(proposal.gross_revenue),
        taxAmount: toNumber(proposal.tax_amount),
        totalInternalCosts: toNumber(proposal.total_internal_costs),
        netProfit: toNumber(proposal.net_profit),
        profitMarginPercent: toNumber(proposal.profit_margin_percent)
      },
      updatedAt: proposal.updated_at || proposal.created_at || new Date().toISOString()
    };
  });

  setLocalProposals(normalized);
}

async function persistProposal(isUpdate) {
  if (isUpdate && !currentProposalId) {
    alert("Carregue uma proposta salva para atualizar.");
    return;
  }

  await ensureProposalNumber();
  const data = getData();

  let supabaseInfo = null;
  try {
    supabaseInfo = await saveToSupabase(data, isUpdate);
  } catch (error) {
    console.warn("Falha ao salvar no Supabase. Mantendo apenas local.", error);
  }

  const saved = upsertLocalProposal({
    ...data,
    id: supabaseInfo?.id || data.id || undefined,
    clientId: supabaseInfo?.clientId || data.clientId || undefined
  });

  currentProposalId = saved.id;
  currentClientId = saved.clientId || null;

  renderDashboard();
  renderEditingState();
  if (currentProposalId && editProposalSelect) editProposalSelect.value = currentProposalId;
  alert(isUpdate ? "Proposta atualizada com sucesso." : "Proposta salva com sucesso.");
}

function wireInputsForRealtimeCalculation() {
  [
    "taxPercent",
    "commissionPercent",
    "proposalDate",
    "proposalStatus",
    "proposalNumber",
    "clientName",
    "collectionTime",
    "reportTime",
    "paymentTerms"
  ].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
      updateInternalSummary();
      renderProposal(getData());
    });
    el.addEventListener("change", () => {
      updateInternalSummary();
      renderProposal(getData());
    });
  });

  document.getElementById("proposalDate").addEventListener("change", async () => {
    if (!currentProposalId) {
      await ensureProposalNumber({ force: true });
      renderProposal(getData());
    }
  });
}

bindEvent("addItemBtn", "click", () => {
  try {
    createItem();
    updateInternalSummary();
  } catch (error) {
    showRuntimeError(error, "Adicionar item");
  }
});
bindEvent("generateBtn", "click", () => {
  try {
    renderProposal(getData());
  } catch (error) {
    showRuntimeError(error, "Gerar proposta");
  }
});
bindEvent("saveProposalBtn", "click", async () => {
  try {
    await persistProposal(false);
  } catch (error) {
    showRuntimeError(error, "Salvar proposta");
  }
});
bindEvent("updateProposalBtn", "click", async () => {
  try {
    await persistProposal(true);
  } catch (error) {
    showRuntimeError(error, "Atualizar proposta");
  }
});
bindEvent("printBtn", "click", () => window.print());
bindEvent("saveBtn", "click", saveJson);
bindEvent("newProposalBtn", "click", async () => {
  try {
    await startNewProposal();
  } catch (error) {
    showRuntimeError(error, "Nova proposta");
  }
});
bindEvent("newProposalBtnInline", "click", async () => {
  try {
    await startNewProposal();
  } catch (error) {
    showRuntimeError(error, "Nova proposta");
  }
});
bindEvent("syncSupabaseBtn", "click", async () => {
  if (!supabase) {
    alert("Supabase não está configurado.");
    return;
  }
  try {
    await syncSupabaseToLocal();
    renderDashboard();
    refreshEditProposalSelect();
    alert("Sincronização concluída.");
  } catch (error) {
    console.error(error);
    alert("Falha ao sincronizar com Supabase.");
  }
});
bindEvent("loadSelectedProposalBtn", "click", () => {
  try {
    if (!editProposalSelect) return;
    const id = editProposalSelect.value;
    if (!id) return;
    const proposal = getLocalProposals().find((p) => p.id === id);
    if (proposal) fillForm(proposal);
  } catch (error) {
    showRuntimeError(error, "Carregar seleção");
  }
});
bindEvent("loadFile", "change", (event) => {
  const file = event.target.files?.[0];
  if (file) loadJson(file);
});
if (dashboardPeriod) dashboardPeriod.addEventListener("change", renderDashboard);

try {
  document.getElementById("proposalDate").value = todayIso();
  createItem();
  wireInputsForRealtimeCalculation();
  updateInternalSummary();
  renderProposal(getData());
  renderDashboard();
  ensureProposalNumber();
  renderEditingState();
} catch (error) {
  showRuntimeError(error, "inicialização");
}

window.addEventListener("error", (event) => {
  showRuntimeError(event.error || event.message, "runtime");
});

window.__fallbackAddItem = () => {
  if (window.__eventsBound) return;
  try {
    createItem();
    updateInternalSummary();
  } catch (error) {
    showRuntimeError(error, "Fallback Adicionar item");
  }
};

window.__fallbackGenerate = () => {
  if (window.__eventsBound) return;
  try {
    renderProposal(getData());
  } catch (error) {
    showRuntimeError(error, "Fallback Gerar proposta");
  }
};

window.__eventsBound = true;

if (!supabase) {
  console.info("Supabase não configurado. Use window.SUPABASE_URL e window.SUPABASE_ANON_KEY para ativar integração remota.");
} else {
  syncSupabaseToLocal()
    .then(() => {
      renderDashboard();
      refreshEditProposalSelect();
    })
    .catch((error) => console.warn("Não foi possível sincronizar na inicialização.", error));
}
