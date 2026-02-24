/* 
GZS Manager - script.js
VERSÃO BLINDADA + FUNCIONALIDADE TOTAL (LOGIN, FUNCIONÁRIOS, VALES, DESCONTOS, FINANCEIRO)
COM FILTROS DE FUNCIONÁRIOS ATIVOS/INATIVOS
*/

(function(){

const LS_KEY = 'gzs_manager_v3';

/* -------------------------
UTILS
------------------------- */
function loadStore(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw) return JSON.parse(raw);
  } catch{}
  return {};
}

function saveStore(s){
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function el(id){ return document.getElementById(id); }

function money(v){
  return "R$ " + Number(v||0).toFixed(2).replace(".",",");
}

const store = loadStore();

/* -------------------------
BLINDAGEM GLOBAL
------------------------- */
store.config ||= {};
store.config.admin ||= { user:"gelozonasul", pass:"1234" };
store.config.settings ||= {
  weeklySalary:350,
  lateLimit:"08:21",
  latePenalty:10,
  mealValue:20,
  dayOffValue:100
};
store.config.empresa ||= "GZS Manager";

store.employees ||= [];
store.periods ||= {};
store.vales ||= {};
store.descontos ||= {};
store.historico ||= [];

saveStore(store);

function ensureEmployeeStores(id){
  store.periods[id] ||= null;
  store.vales[id] ||= [];
  store.descontos[id] ||= [];
  store.historico[id] ||= [];
}

function isAtraso(entrada){
  if(!entrada) return false;
  return entrada > store.config.settings.lateLimit;
}

/* -------------------------
LOGIN
------------------------- */
function setupLogin(){
  const btn = el("btnLogin");
  if(!btn) return;

  btn.addEventListener("click", ()=>{
    const userInput = el("user")?.value?.trim() || "";
    const passInput = el("pass")?.value?.trim() || "";

    if(userInput === store.config.admin.user && passInput === store.config.admin.pass){
      localStorage.setItem("gzs_logged","1");
      location.href="painel.html";
    } else {
      alert("Usuário ou senha inválidos");
    }
  });
}

function protect(){
  const p = location.pathname.split("/").pop();
  if(["painel.html","funcionario.html","configuracoes.html"].includes(p) &&
     localStorage.getItem("gzs_logged")!=="1"){
    location.href="index.html";
  }
}

/* -------------------------
PAINEL
------------------------- */
function setupAddEmployee(){
  const btn = el("btnAddEmp");
  if(!btn) return;

  btn.onclick = ()=>{
    const name = prompt("Nome do funcionário:")?.trim();
    if(!name) return;

    const id = Date.now().toString();
    store.employees.push({
      id,
      name,
      payType:"Quinzenal",
      foodMode:"Acumulado",
      active:true
    });

    ensureEmployeeStores(id);
    saveStore(store);
    renderEmployeeList();
  };
}

function renderEmployeeList(filter="todos"){
  const list = el("empList");
  if(!list) return;

  list.innerHTML = "";

  // Filtra os funcionários conforme a opção escolhida
  const filteredEmployees = store.employees.filter(emp=>{
    if(filter === "ativos") return emp.active;
    if(filter === "inativos") return !emp.active;
    return true; // todos
  });

  filteredEmployees.forEach(emp=>{
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `
      <strong>${emp.name}</strong>
      <div class="actions">
        <button class="btn btnAbrir" ${emp.active ? "" : "disabled"}>${emp.active ? "Abrir" : "Inativo"}</button>
        <button class="btn danger btnInativar">${emp.active ? "Inativar" : "Ativar"}</button>
      </div>
    `;

    d.querySelector(".btnAbrir").onclick = ()=>{
      if(emp.active) location.href="funcionario.html?id="+emp.id;
    };

    d.querySelector(".btnInativar").onclick = ()=>{
      emp.active = !emp.active;
      saveStore(store);
      renderEmployeeList(filter); // mantém o filtro ao atualizar
    };

    list.appendChild(d);
  });
}

/* -------------------------
FILTRO DE FUNCIONÁRIOS
------------------------- */
function setupEmployeeFilter(){
  const filterEl = el("filterEmployees");
  if(!filterEl) return;

  filterEl.onchange = ()=>{
    renderEmployeeList(filterEl.value);
  };
}

/* -------------------------
VALES
------------------------- */
function setupValesFuncionario(id){
  const btn = el("btnAddVale");
  if(!btn) return;

  btn.onclick = ()=>{
    const valor = parseFloat(prompt("Valor do vale (R$):"));
    if(isNaN(valor) || valor <= 0) return alert("Valor inválido");

    const data = prompt("Data do vale (YYYY-MM-DD)")?.trim();
    if(!data) return alert("Data inválida");

    store.vales[id].push({ valor, data });
    saveStore(store);
    renderVales(id);
  };

  renderVales(id);
}

function renderVales(id){
  const box = el("listaVales");
  if(!box) return;

  if(!store.vales[id] || store.vales[id].length === 0){
    box.innerHTML = "Nenhum vale lançado";
    return;
  }

  box.innerHTML = store.vales[id].map(v => `${v.data} — ${money(v.valor)}`).join("<br>");
}

/* -------------------------
DESCONTOS
------------------------- */
function setupDescontosFuncionario(id){
  const btn = el("btnAddDesconto");
  if(!btn) return;

  btn.onclick = ()=>{
    const valor = parseFloat(prompt("Valor do desconto (R$):"));
    if(isNaN(valor) || valor <= 0) return alert("Valor inválido");

    const motivo = prompt("Motivo do desconto:")?.trim();
    if(!motivo) return alert("Motivo inválido");

    store.descontos[id].push({ valor, motivo, data:new Date().toISOString().slice(0,10) });
    saveStore(store);
    renderDescontos(id);
  };

  renderDescontos(id);
}

function renderDescontos(id){
  const box = el("listaDescontos");
  if(!box) return;

  if(!store.descontos[id] || store.descontos[id].length === 0){
    box.innerHTML = "Nenhum desconto lançado";
    return;
  }

  box.innerHTML = store.descontos[id].map(d => `${d.data} — ${money(d.valor)} (${d.motivo})`).join("<br>");
}

/* -------------------------
FUNCIONÁRIO
------------------------- */
function renderFuncionario(){
  const id = new URLSearchParams(location.search).get("id");
  const emp = store.employees.find(e=>e.id===id);
  if(!emp) return location.href="painel.html";

  ensureEmployeeStores(id);

  const card = el("pointsCard");
  if(!card) return;

  card.innerHTML = `
    <div class="card">
      <h3>${emp.name}</h3>
      <div class="grid" style="margin:15px 0;">
        <div>
          <label class="small">Pagamento do Salário</label>
          <select id="selectPayType" class="input">
            <option value="Semanal" ${emp.payType==="Semanal"?"selected":""}>Semanal</option>
            <option value="Quinzenal" ${emp.payType==="Quinzenal"?"selected":""}>Quinzenal</option>
          </select>
        </div>
        <div>
          <label class="small">Pagamento da Alimentação</label>
          <select id="selectFoodMode" class="input">
            <option value="Acumulado" ${emp.foodMode==="Acumulado"?"selected":""}>Acumulado</option>
            <option value="Diario" ${emp.foodMode==="Diario"?"selected":""}>Diário</option>
          </select>
        </div>
      </div>

      <h4>Período de Apuração</h4>
      <div class="grid">
        <input type="date" id="perInicio" class="input"/>
        <input type="date" id="perFim" class="input"/>
        <button class="btn" id="defPeriodo">Definir período</button>
        <button class="btn danger" id="fecharPeriodo">Fechar período</button>
      </div>

      <div id="periodoAtivo" class="small"></div>
      <div id="tabelaPeriodo"></div>
      <div id="financeiroPeriodo"></div>
    </div>
  `;

  setupValesFuncionario(id);
  setupDescontosFuncionario(id);

  const selPay = el("selectPayType");
  const selFood = el("selectFoodMode");

  if(selPay) selPay.onchange = ()=>{
    emp.payType = selPay.value;
    saveStore(store);
    renderTabela();
  };

  if(selFood) selFood.onchange = ()=>{
    emp.foodMode = selFood.value;
    saveStore(store);
    renderTabela();
  };

  el("defPeriodo")?.addEventListener("click", ()=>{
    const inicio = el("perInicio")?.value;
    const fim = el("perFim")?.value;
    if(!inicio || !fim) return alert("Informe o período completo");

    const dias = {};
    let d = new Date(inicio);
    const f = new Date(fim);

    while(d <= f){
      const key = d.toISOString().slice(0,10);
      dias[key] = { entrada:"", saida:"", status:"Presente", folgaVenda:"Nenhuma" };
      d.setDate(d.getDate()+1);
    }

    store.periods[id] = { inicio, fim, fechado:false, dias };
    saveStore(store);
    renderTabela();
  });

  el("fecharPeriodo")?.addEventListener("click", ()=>{
    if(!store.periods[id]) return;
    store.periods[id].fechado = true;
    saveStore(store);
    renderTabela();
  });

  if(store.periods[id]) renderTabela();

  function renderTabela(){
    const p = store.periods[id];
    if(!p) return;

    el("periodoAtivo") && (el("periodoAtivo").innerText =
      `Período: ${p.inicio} até ${p.fim} ${p.fechado ? "(FECHADO)" : ""}`
    );

    let totalFalta=0, totalAtrasos=0;

    let html = `<table class="table">
      <tr>
        <th>Data</th><th>Status</th><th>Folga</th><th>Entrada</th><th>Saída</th>
      </tr>`;

    Object.entries(p.dias).forEach(([data,info])=>{
      if(info.status==="Falta") totalFalta++;
      if(info.status==="Presente" && isAtraso(info.entrada)) totalAtrasos++;

      html += `<tr>
        <td>${data}</td>
        <td>
          <select data-date="${data}" data-d="status">
            <option ${info.status==="Presente"?"selected":""}>Presente</option>
            <option ${info.status==="Falta"?"selected":""}>Falta</option>
            <option ${info.status==="Folga"?"selected":""}>Folga</option>
          </select>
        </td>
        <td>
          <select data-date="${data}" data-d="folgaVenda">
            <option ${info.folgaVenda==="Nenhuma"?"selected":""}>Nenhuma</option>
            <option ${info.folgaVenda==="Paga"?"selected":""}>Paga</option>
            <option ${info.folgaVenda==="Acumulada"?"selected":""}>Acumulada</option>
          </select>
        </td>
        <td><input type="time" data-d="entrada" data-date="${data}" value="${info.entrada}"></td>
        <td><input type="time" data-d="saida" data-date="${data}" value="${info.saida}"></td>
      </tr>`;
    });

    html += "</table>";
    el("tabelaPeriodo") && (el("tabelaPeriodo").innerHTML = html);

    el("tabelaPeriodo")?.querySelectorAll("input,select").forEach(inp=>{
      inp.onchange = ()=>{
        const d = inp.dataset.date;
        const k = inp.dataset.d;
        p.dias[d][k] = inp.value;
        saveStore(store);
        renderTabela();
      };
    });

    /* RESUMO FINANCEIRO */
    let salarioPeriodo = emp.payType==="Semanal"? store.config.settings.weeklySalary : store.config.settings.weeklySalary*2;
    let diasPeriodo = emp.payType==="Semanal"? 7 : 15;
    const valorDia = salarioPeriodo / diasPeriodo;
    let totalAlimentacao = 0;

    if(emp.foodMode==="Acumulado"){
      Object.values(p.dias).forEach(info=>{
        if(info.status==="Presente" && info.entrada) totalAlimentacao += store.config.settings.mealValue;
      });
    }

    const totalVales = (store.vales[id]||[]).reduce((s,v)=>s+v.valor,0);
    const totalDescontos = (store.descontos[id]||[]).reduce((s,d)=>s+d.valor,0);
    const descontoFaltas = totalFalta * valorDia;
    const descontoAtrasos = totalAtrasos * store.config.settings.latePenalty;
    const salarioFinal = salarioPeriodo - descontoFaltas - descontoAtrasos - totalVales - totalDescontos + totalAlimentacao;

    el("financeiroPeriodo") && (el("financeiroPeriodo").innerHTML = `
      <div class="card" style="padding:20px;background:#fdfdfd;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);max-width:400px;margin:10px 0;">
        <h4 style="margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:5px;">Resumo Financeiro</h4>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span>Salário Base:</span><span>${money(salarioPeriodo)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span>Desconto por Faltas (${totalFalta}):</span><span style="color:#e74c3c;">- ${money(descontoFaltas)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span>Desconto por Atrasos (${totalAtrasos}):</span><span style="color:#e74c3c;">- ${money(descontoAtrasos)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span>Vales:</span><span style="color:#e74c3c;">- ${money(totalVales)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span>Descontos Extras:</span><span style="color:#e74c3c;">- ${money(totalDescontos)}</span></div>
        <div style="display:flex;justify-content:space-between;margin:15px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;padding:10px 0;font-weight:bold;"><span>Alimentação Acumulada:</span><span style="color:#27ae60;">+ ${money(totalAlimentacao)}</span></div>
        <div style="text-align:center;margin-top:15px;"><h3 style="color:#2c3e50;">Total a Receber: ${money(salarioFinal)}</h3></div>
      </div>
    `);
  }
}

/* -------------------------
INIT
------------------------- */
function init(){
  setupLogin();
  protect();

  const p = location.pathname.split("/").pop();
  if(p==="painel.html"){ 
    renderEmployeeList(); 
    setupAddEmployee(); 
    setupEmployeeFilter(); // ADICIONADO
  }
  if(p==="funcionario.html"){ renderFuncionario(); }
}

document.readyState==="loading" ? document.addEventListener("DOMContentLoaded",init) : init();

})();
