const ROOT = location.pathname.includes("/src/") ? "../data" : "./data";
const state = { data: null, unit: "pct", tab: "principal", loadToken: 0 };
const $ = (selector) => document.querySelector(selector);
const money = (value, digits = 0) => new Intl.NumberFormat("es-MX", { maximumFractionDigits: digits }).format(value);
const mmp = (value) => value >= 1000000 ? `${money(value / 1000000, 1)} billones` : `${money(value / 1000, 1)} mil mdp`;
const children = (node) => node?.hijos ?? [];
const flatten = (node, level = 0, result = []) => { if (!node) return result; result.push({ ...node, level }); children(node).forEach((child) => flatten(child, level + 1, result)); return result; };

function valueFor(node) {
  if (state.unit === "pct") return node.pct_pib ?? ((node.monto_mdp / state.data.macro.pib_nominal_mdp) * 100);
  if (state.unit === "percapita" && state.data.macro.poblacion) return node.monto_mdp * 1000000 / state.data.macro.poblacion;
  return node.monto_mdp;
}
function valueLabel(node) { if (state.unit === "pct") return `${money(valueFor(node), 1)}%`; if (state.unit === "percapita") return `$${money(valueFor(node), 0)}`; return money(valueFor(node), 0); }
function percentOfTotal(node, total) { return Math.max(0, Math.min(100, (node.monto_mdp / total) * 100)); }

function renderSummary(displayYear = state.data.meta.anio_fiscal) {
  const { data } = state; const income = data.ingresos.monto_mdp; const spend = data.gasto.monto_mdp; const deficit = spend - income;
  $("#year-label").textContent = displayYear; $("#footer-year").textContent = displayYear; $("#document-type").textContent = data.meta.tipo_documento;
  $("#source-note").textContent = data.meta.tipo_documento === "PPEF" ? "Proyecto del Ejecutivo" : "Presupuesto aprobado";
  $("#hero-deficit").textContent = mmp(deficit); $("#hero-deficit-pct").textContent = `${money(deficit / data.macro.pib_nominal_mdp * 100, 1)}% del PIB`;
  $("#ratio-raised").textContent = `$${Math.round(income / spend * 100)}`; $("#ratio-borrowed").textContent = `$${Math.round(deficit / spend * 100)}`; $("#total-spend").textContent = money(spend / 1000, 1);
  $("#updated-date").textContent = data.meta.extraido_el ? `Actualizado ${data.meta.extraido_el}` : "";
  $("#warnings").innerHTML = `<p><strong>${data.meta.tipo_documento} ${data.meta.anio_fiscal}:</strong> ${(data.meta.advertencias ?? [])[0] ?? "Cifras del paquete económico."}</p>`;
}

function renderSankey() {
  const { data } = state; const debt = data.gasto.monto_mdp - data.ingresos.monto_mdp; const nodes = []; const links = [];
  const addTree = (node, parent = null, depth = 0) => { if (depth > 2) return; nodes.push({ name: node.id, title: node.nombre, color: node.color_hint }); if (parent) links.push({ source: parent.id, target: node.id, value: node.monto_mdp }); children(node).forEach((child) => addTree(child, node, depth + 1)); };
  addTree(data.gasto); nodes.push({ name: "deuda_anio", title: "Deuda del año", color: "deuda" }, { name: "ingresos", title: "Ingresos", color: "ingreso" });
  links.push({ source: "ingresos", target: data.gasto.id, value: data.ingresos.monto_mdp }, { source: "deuda_anio", target: data.gasto.id, value: debt });
  const chart = echarts.init($("#sankey")); const colors = { ingreso: "#0d7770", deuda: "#ed654f", gasto: "#e6aa45", gasto_rigido: "#c87552", neutro: "#9aa69a" };
  chart.setOption({ animationDuration: 750, tooltip: { trigger: "item", formatter: (params) => { const node = flatten(data.gasto).find((item) => item.id === params.name); return `<strong>${node?.nombre ?? params.data?.title ?? params.name}</strong><br>${node ? `${valueLabel(node)} · ${node.fuente}` : valueLabel({ monto_mdp: params.value, pct_pib: null })}`; } }, series: [{ type: "sankey", left: 4, right: 115, top: 15, bottom: 10, nodeAlign: "justify", nodeGap: 18, nodeWidth: 18, draggable: true, emphasis: { focus: "adjacency" }, data: nodes.map((node) => ({ ...node, itemStyle: { color: colors[node.color] ?? colors.neutro } })), links, lineStyle: { color: "source", opacity: .25, curveness: .5 }, label: { color: "#20231f", fontFamily: "DM Sans", fontSize: 12, formatter: (params) => nodes.find((node) => node.name === params.name)?.title ?? params.name } }] });
  window.addEventListener("resize", () => chart.resize(), { passive: true }); renderMobileFlow(debt);
}

function renderMobileFlow(debt) { const { data } = state; const total = data.gasto.monto_mdp; const sourceRows = [{ label: "Ingresos presupuestarios", value: data.ingresos.monto_mdp, type: "primary" }, { label: "Deuda del año", value: debt, type: "secondary" }]; const spending = children(data.gasto); $("#mobile-flow").innerHTML = `<div class="mobile-group"><h3>Entra</h3><div class="mobile-bar">${sourceRows.map((row) => `<span class="${row.type}" style="width:${row.value / total * 100}%"></span>`).join("")}</div><div class="mobile-caption"><span>Ingresos ${money(data.ingresos.monto_mdp / 1000, 1)} mmp</span><span>Deuda ${money(debt / 1000, 1)} mmp</span></div></div><div class="mobile-group"><h3>Sale</h3><div class="mobile-bar">${spending.map((row) => `<span class="${row.color_hint === "gasto_rigido" ? "secondary" : "primary"}" style="width:${row.monto_mdp / total * 100}%"></span>`).join("")}</div><div class="mobile-caption"><span>Programable</span><span>No programable</span></div></div>`; }

function renderDestinations() { const source = state.tab === "principal" ? state.data.gasto : state.data.clasificaciones_gasto?.[state.tab]; const rows = children(source); const total = source?.monto_mdp ?? 1; $("#destination-list").innerHTML = rows.length ? rows.map((row) => `<div class="dest-row"><div class="dest-label"><span>${row.nombre}</span><span class="dest-value">${valueLabel(row)}</span></div><div class="bar-track"><div class="bar ${row.color_hint === "gasto_rigido" ? "rigid" : ""}" style="width:${percentOfTotal(row, total)}%"></div></div><div class="dest-meta">${money(row.monto_mdp / 1000, 1)} mmp · ${row.confianza}</div></div>`).join("") : `<p class="section-deck">Esta clasificación todavía no está disponible para este año.</p>`; }

function renderTable() { const rows = [...flatten(state.data.ingresos), ...flatten(state.data.gasto), ...flatten(state.data.clasificaciones_gasto?.economica), ...flatten(state.data.clasificaciones_gasto?.funcional)]; $("#audit-table").innerHTML = rows.map((row) => `<tr><td>${row.nombre}</td><td class="confidence">${row.confianza}</td><td class="number">${money(row.monto_mdp, 1)}</td><td class="number">${row.pct_pib == null ? "—" : `${money(row.pct_pib, 1)}%`}</td><td>${row.fuente}</td></tr>`).join(""); }

function bindControls() { document.querySelectorAll(".unit").forEach((button) => button.addEventListener("click", () => { if (button.disabled) return; document.querySelector(".unit.active").classList.remove("active"); button.classList.add("active"); state.unit = button.dataset.unit; renderSankey(); renderDestinations(); })); document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => { document.querySelector(".tab.active").classList.remove("active"); button.classList.add("active"); state.tab = button.dataset.tab; renderDestinations(); })); }

async function load() { const manifest = await fetch(`${ROOT}/manifest.json`).then((response) => response.json()); const ready = manifest.anios.filter((year) => year.estado !== "pendiente"); const select = $("#year-select"); select.innerHTML = ready.map((year) => `<option value="${year.archivo}">${year.etiqueta}</option>`).join(""); select.addEventListener("change", () => loadYear(select.value)); await loadYear(ready[0]?.archivo); }
async function loadYear(file) { const token = ++state.loadToken; const data = await fetch(`${ROOT}/${file}`).then((response) => response.json()); if (token !== state.loadToken) return; state.data = data; renderSummary(Number(file.match(/\d{4}/)?.[0]) || data.meta.anio_fiscal); renderSankey(); renderDestinations(); renderTable(); }
bindControls(); load().catch((error) => { $("#warnings").innerHTML = `<p><strong>No se pudieron cargar los datos.</strong> ${error.message}</p>`; });