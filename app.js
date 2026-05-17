
// ── STORAGE KEYS ──
const K = {
  presus:      'kv_presus_v3',
  pedidos:     'kv_pedidos_v3',
  facturas:    'kv_facturas_v3',
  clientes:    'kv_clientes_v3',
  productos:   'kv_productos_v3',
  proveedores: 'kv_proveedores_v3',
  gastos:      'kv_gastos_v3',
  counters:    'kv_counters_v3',
};

// ── STATE ──
let presus=[], pedidos=[], facturas=[], clientes=[], productos=[], proveedores=[], gastos=[];
let counters = { presu:1, ped:1, fac:1, gasto:1 };
let activePanel = 'dashboard';
let tabFilters = { presupuestos:'todos', pedidos:'todos', facturas:'todos', gastos:'todos', stock:'todos' };
let itemsPresu = [], itemsFac = [];

// ── STORAGE ──
function load() {
  presus      = JSON.parse(localStorage.getItem(K.presus)      || '[]');
  pedidos     = JSON.parse(localStorage.getItem(K.pedidos)     || '[]');
  facturas    = JSON.parse(localStorage.getItem(K.facturas)    || '[]');
  clientes    = JSON.parse(localStorage.getItem(K.clientes)    || '[]');
  productos   = JSON.parse(localStorage.getItem(K.productos)   || '[]');
  proveedores = JSON.parse(localStorage.getItem(K.proveedores) || '[]');
  gastos      = JSON.parse(localStorage.getItem(K.gastos)      || '[]');
  counters    = JSON.parse(localStorage.getItem(K.counters)    || JSON.stringify(counters));
}
function saveAll() {
  localStorage.setItem(K.presus,      JSON.stringify(presus));
  localStorage.setItem(K.pedidos,     JSON.stringify(pedidos));
  localStorage.setItem(K.facturas,    JSON.stringify(facturas));
  localStorage.setItem(K.clientes,    JSON.stringify(clientes));
  localStorage.setItem(K.productos,   JSON.stringify(productos));
  localStorage.setItem(K.proveedores, JSON.stringify(proveedores));
  localStorage.setItem(K.gastos,      JSON.stringify(gastos));
  localStorage.setItem(K.counters,    JSON.stringify(counters));
}
function nextNum(key, prefix, pad) {
  if (!counters[key]) counters[key] = 1;
  const n = counters[key]++;
  return prefix + String(n).padStart(pad || 6, '0');
}

// ── HELPERS ──
function fmt(n)   { return Math.round(n || 0).toLocaleString('es-PY'); }
function fmtD(d)  { if (!d) return '—'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function today()  { return new Date().toISOString().slice(0,10); }
function he(s)    { if (s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mesActual() { return new Date().toISOString().slice(0,7); }
function nomCli(id) { const c=clientes.find(x=>x.id===id); return c?c.nombre:'—'; }
function nomProd(id){ const p=productos.find(x=>x.id===id); return p?p.nombre:'—'; }
function nomProv(id){ const p=proveedores.find(x=>x.id===id); return p?p.nombre:'—'; }
function stockTotal(p) { return Number(p.stockAsu||0)+Number(p.stockYpa||0); }

function diasMora(v) {
  if (!v) return 0;
  const h=new Date(); h.setHours(0,0,0,0);
  const d=new Date(v+'T00:00:00');
  const df=Math.floor((h-d)/86400000);
  return df>0?df:0;
}
function moraChip(v, est) {
  if (est==='pagada') return '<span class="mora-chip ok">Pagado</span>';
  const d=diasMora(v);
  if (d===0) return '<span class="mora-chip ok">Al día</span>';
  if (d<=10) return `<span class="mora-chip warn">${d}d mora</span>`;
  return `<span class="mora-chip late">${d}d mora</span>`;
}

function calcIVA(precio, cant, desc) {
  const sub  = Math.round(Number(precio)*Number(cant) - Number(desc||0));
  const iva  = Math.round(sub * 10 / 110);
  const exento = sub - iva;
  return { sub, iva, exento };
}
function totalesFromItems(arr) {
  let exento=0, iva=0, total=0, desc=0;
  (arr||[]).forEach(r => {
    const c = calcIVA(r.precio, r.cant, r.desc_gs);
    exento += c.exento; iva += c.iva; total += c.sub; desc += Number(r.desc_gs||0);
  });
  return { exento, iva, total, desc };
}

function badgePed(e)  { const m={pendiente:'amber',entregado:'green',cancelado:'gray'}; const l={pendiente:'Pendiente',entregado:'Entregado',cancelado:'Cancelado'}; return `<span class="badge ${m[e]||'gray'}">${l[e]||e}</span>`; }
function badgeFac(e)  { const m={pagada:'green',pendiente:'amber',pago_parcial:'blue'}; const l={pagada:'Pagada',pendiente:'Pendiente',pago_parcial:'Parcial'}; return `<span class="badge ${m[e]||'gray'}">${l[e]||e}</span>`; }
function badgePresu(e){ const m={pendiente:'amber',aprobado:'green',rechazado:'red',facturado:'blue'}; const l={pendiente:'Pendiente',aprobado:'Aprobado',rechazado:'Rechazado',facturado:'Facturado'}; return `<span class="badge ${m[e]||'gray'}">${l[e]||e}</span>`; }
function badgeGasto(e){ const m={pagado:'green',pendiente:'amber'}; const l={pagado:'Pagado',pendiente:'Pendiente'}; return `<span class="badge ${m[e]||'gray'}">${l[e]||e}</span>`; }

// ── TOAST ──
function toast(msg, type='s') {
  const w = document.getElementById('toast-wrap');
  const d = document.createElement('div');
  d.className = `toast-item ${type}`;
  d.innerHTML = `<span>${{s:'✓',e:'✕',w:'⚠'}[type]||'ℹ'}</span><span>${msg}</span>`;
  w.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

// ── MODALS ──
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── FILLS ──
function fillCliSel(selId, val) {
  const s = document.getElementById(selId);
  s.innerHTML = '<option value="">— Cliente —</option>' +
    clientes.map(c => `<option value="${c.id}"${c.id===val?' selected':''}>${he(c.nombre)}</option>`).join('');
}
function fillProvSel(selId, val) {
  const s = document.getElementById(selId);
  s.innerHTML = '<option value="">— Proveedor (opcional) —</option>' +
    proveedores.map(p => `<option value="${p.id}"${p.id===val?' selected':''}>${he(p.nombre)}</option>`).join('');
}
function fillProdSel(selId, val) {
  const s = document.getElementById(selId);
  s.innerHTML = '<option value="">— Producto —</option>' +
    productos.map(p => `<option value="${p.id}"${p.id===val?' selected':''}>${he(p.nombre)} — Gs.${fmt(p.precioVenta)}</option>`).join('');
}

// ── NAVIGATION ──
const panelTitles = {
  dashboard:'Dashboard / Inicio', presupuestos:'Presupuestos / Cotizaciones',
  pedidos:'Pedidos / Gestión', facturas:'Facturación',
  cobrar:'Cuentas a Cobrar', gastos:'Gastos / Egresos',
  stock:'Stock / Inventario', clientes:'Clientes',
  productos:'Productos', proveedores:'Proveedores',
};
const topbarMap = {
  dashboard:    { lbl:'＋ Presupuesto',    fn:'openModalPresupuesto' },
  presupuestos: { lbl:'＋ Nuevo Presupuesto', fn:'openModalPresupuesto' },
  pedidos:      { lbl:'＋ Nuevo Pedido',    fn:'openModalPedido' },
  facturas:     { lbl:'＋ Nueva Factura',   fn:'openModalFactura' },
  cobrar:       { lbl:'', fn:'' },
  gastos:       { lbl:'＋ Registrar Gasto', fn:'openModalGasto' },
  stock:        { lbl:'＋ Nuevo Producto',  fn:'openModalProducto' },
  clientes:     { lbl:'＋ Nuevo Cliente',   fn:'openModalCliente' },
  productos:    { lbl:'＋ Nuevo Producto',  fn:'openModalProducto' },
  proveedores:  { lbl:'＋ Nuevo Proveedor', fn:'openModalProveedor' },
};

function goPanel(id) {
  activePanel = id;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  const sb = document.getElementById('sb-'+id);
  if (sb) sb.classList.add('active');
  const t = panelTitles[id]||id;
  const parts = t.split(' / ');
  document.getElementById('topbar-title').innerHTML = parts[0] + (parts[1] ? ` <span>/ ${parts[1]}</span>` : '');
  const bm = topbarMap[id]||{lbl:'',fn:''};
  const b = document.getElementById('topbar-new-btn');
  if (bm.lbl) { b.style.display='flex'; b.textContent=bm.lbl; b.onclick=()=>window[bm.fn]&&window[bm.fn](); }
  else b.style.display = 'none';
  renderPanel(id);
  updateSidebar();
}

function renderPanel(id) {
  switch(id) {
    case 'dashboard':    renderDashboard();    break;
    case 'presupuestos': renderPresupuestos(); break;
    case 'pedidos':      renderPedidos();      break;
    case 'facturas':     renderFacturas();     break;
    case 'cobrar':       renderCobrar();       break;
    case 'gastos':       renderGastos();       break;
    case 'stock':        renderStock();        break;
    case 'clientes':     renderClientes();     break;
    case 'productos':    renderProductos();    break;
    case 'proveedores':  renderProveedores();  break;
  }
}
function switchTab(panel, filter, el) {
  tabFilters[panel] = filter;
  el.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderPanel(panel);
}
function topbarNew() { const bm=topbarMap[activePanel]; if(bm&&bm.fn&&window[bm.fn]) window[bm.fn](); }

// ── SIDEBAR BADGES ──
function updateSidebar() {
  const pp = presus.filter(p=>p.estado==='pendiente').length;
  const spp = document.getElementById('sbb-presu');
  spp.textContent=pp; spp.style.display=pp?'':'none';

  const pedp = pedidos.filter(p=>p.estado==='pendiente').length;
  const spd = document.getElementById('sbb-ped');
  spd.textContent=pedp; spd.style.display=pedp?'':'none';

  const cv = facturas.filter(f=>f.condicion==='credito'&&f.estado!=='pagada'&&diasMora(f.fechaVenc)>0).length;
  const sc = document.getElementById('sbb-cobrar');
  sc.textContent=cv; sc.style.display=cv?'':'none';

  const ss = productos.filter(p=>stockTotal(p)<=p.stockMin).length;
  const sk = document.getElementById('sbb-stock');
  if (ss) { sk.textContent=ss; sk.style.display=''; sk.className='sbadge '+(productos.some(p=>stockTotal(p)<=0)?'red':'amber'); }
  else sk.style.display='none';
}

// ═══════════════════════════════
// DASHBOARD
// ═══════════════════════════════
function renderDashboard() {
  const mes = mesActual();
  const facsMes = facturas.filter(f=>f.fecha&&f.fecha.startsWith(mes));
  const ventasMes = facsMes.reduce((s,f)=>s+Number(f.total||0), 0);
  const gastosMes = gastos.filter(g=>g.fecha&&g.fecha.startsWith(mes)).reduce((s,g)=>s+Number(g.monto||0), 0);
  const totalDeuda = facturas.filter(f=>f.condicion==='credito'&&f.estado!=='pagada').reduce((s,f)=>s+Number(f.saldo||0), 0);
  const pedPend = pedidos.filter(p=>p.estado==='pendiente').length;
  const presuPend = presus.filter(p=>p.estado==='pendiente').length;
  const facVenc = facturas.filter(f=>f.condicion==='credito'&&f.estado!=='pagada'&&diasMora(f.fechaVenc)>0).length;
  const bajoStock = productos.filter(p=>stockTotal(p)<=p.stockMin).length;

  document.getElementById('dash-kpis').innerHTML = `
    <div class="kpi-card green"><div class="kpi-label">Ventas del Mes</div><div class="kpi-val green">Gs. ${fmt(ventasMes)}</div><div class="kpi-sub">${facsMes.length} factura(s) — ${mes}</div><div class="kpi-ico">💵</div></div>
    <div class="kpi-card red"><div class="kpi-label">Cuentas a Cobrar</div><div class="kpi-val red">Gs. ${fmt(totalDeuda)}</div><div class="kpi-sub">Créditos pendientes</div><div class="kpi-ico">💳</div></div>
    <div class="kpi-card amber"><div class="kpi-label">Gastos del Mes</div><div class="kpi-val amber">Gs. ${fmt(gastosMes)}</div><div class="kpi-sub">Pagos y costos operativos</div><div class="kpi-ico">💸</div></div>
    <div class="kpi-card blue"><div class="kpi-label">Pedidos Pendientes</div><div class="kpi-val blue">${pedPend}</div><div class="kpi-sub">${presuPend} presupuesto(s) pend.</div><div class="kpi-ico">📦</div></div>
    <div class="kpi-card red"><div class="kpi-label">Facturas Vencidas</div><div class="kpi-val red">${facVenc}</div><div class="kpi-sub">Con saldo pendiente</div><div class="kpi-ico">⚠️</div></div>
    <div class="kpi-card amber"><div class="kpi-label">Bajo Stock</div><div class="kpi-val amber">${bajoStock}</div><div class="kpi-sub">Productos a reponer</div><div class="kpi-ico">📉</div></div>
  `;

  // Alertas
  const ab = document.getElementById('dash-alerts'); ab.innerHTML='';
  if (facVenc) ab.innerHTML += `<div class="alert-box red">⚠️ <strong>${facVenc}</strong> factura(s) vencida(s). <button class="btn-t b" onclick="goPanel('cobrar')" style="margin-left:8px">Ver →</button></div>`;
  const sinStock = productos.filter(p=>stockTotal(p)<=0).length;
  if (sinStock) ab.innerHTML += `<div class="alert-box red">🔴 <strong>${sinStock}</strong> producto(s) sin stock. <button class="btn-t g" onclick="goPanel('stock')" style="margin-left:8px">Ver →</button></div>`;
  if (presuPend) ab.innerHTML += `<div class="alert-box amber">📋 <strong>${presuPend}</strong> presupuesto(s) esperando respuesta. <button class="btn-t g" onclick="goPanel('presupuestos')" style="margin-left:8px">Ver →</button></div>`;

  // Chart barras 6 meses
  const meses6=[]; const now=new Date();
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);meses6.push({key:d.toISOString().slice(0,7),lbl:['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]});}
  const vals = meses6.map(m=>facturas.filter(f=>f.fecha&&f.fecha.startsWith(m.key)).reduce((s,f)=>s+Number(f.total||0),0));
  const maxV = Math.max(...vals, 1);
  document.getElementById('dash-chart').innerHTML = vals.map((v,i) => {
    const h = Math.max(Math.round(v/maxV*82), 4);
    return `<div class="bar-col"><div class="bar${i===vals.length-1?' active-bar':''}" style="height:${h}px"><span class="bval">Gs.${fmt(v)}</span></div></div>`;
  }).join('');
  document.getElementById('dash-chart-labels').innerHTML = meses6.map(m=>`<div style="flex:1;text-align:center;font-family:var(--fm);font-size:9px;color:var(--text3)">${m.lbl}</div>`).join('');

  // Pie estado cuentas
  const cliIds = new Set(facturas.map(f=>f.clienteId));
  const alDia    = Array.from(cliIds).filter(id=>{const fs=facturas.filter(f=>f.clienteId===id&&f.condicion==='credito');return fs.length===0||fs.every(f=>f.estado==='pagada'||diasMora(f.fechaVenc)===0);}).length||0;
  const conDeuda = Array.from(cliIds).filter(id=>{const fs=facturas.filter(f=>f.clienteId===id&&f.condicion==='credito'&&f.estado!=='pagada');return fs.some(f=>diasMora(f.fechaVenc)===0);}).length||0;
  const vencidos = Array.from(cliIds).filter(id=>{const fs=facturas.filter(f=>f.clienteId===id&&f.condicion==='credito'&&f.estado!=='pagada');return fs.some(f=>diasMora(f.fechaVenc)>0);}).length||0;
  const totalPie = Math.max(alDia+conDeuda+vencidos, 1);
  const pAl=Math.round(alDia/totalPie*100), pDeu=Math.round(conDeuda/totalPie*100), pVen=100-pAl-pDeu;
  document.getElementById('dash-pie').innerHTML = `
    <svg class="pie-svg" width="100" height="100" viewBox="0 0 36 36">
      ${pieSlice(pAl,0,'#27ae60')}${pieSlice(pDeu,pAl,'#e67e22')}${pieSlice(pVen,pAl+pDeu,'#e74c3c')}
      <circle cx="18" cy="18" r="10" fill="var(--card)"/>
    </svg>
    <div class="pie-legend">
      <div class="pie-leg-item"><div class="pie-dot" style="background:#27ae60"></div>Al día — ${alDia} (${pAl}%)</div>
      <div class="pie-leg-item"><div class="pie-dot" style="background:var(--amber)"></div>Con deuda — ${conDeuda} (${pDeu}%)</div>
      <div class="pie-leg-item"><div class="pie-dot" style="background:var(--red)"></div>Vencidos — ${vencidos} (${pVen}%)</div>
    </div>`;

  // Stock bajo
  const bajo = productos.filter(p=>stockTotal(p)<=p.stockMin).sort((a,b)=>stockTotal(a)-stockTotal(b)).slice(0,6);
  document.getElementById('dash-stock-bajo').innerHTML = bajo.length
    ? bajo.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
        <span style="color:var(--text2)">${he(p.nombre)}</span>
        <span class="badge ${stockTotal(p)<=0?'red':'amber'}">${stockTotal(p)<=0?'Sin stock':stockTotal(p)+' '+he(p.unidad||'')}</span>
      </div>`).join('')
    : `<div class="empty" style="padding:18px"><div class="icon">✅</div>Todo en stock</div>`;

  // Top 5
  const pv={};
  facturas.forEach(f=>(f.items||[]).forEach(it=>{if(it.prodId)pv[it.prodId]=(pv[it.prodId]||0)+Number(it.cant||0);}));
  const top5=Object.entries(pv).sort((a,b)=>b[1]-a[1]).slice(0,5);
  document.getElementById('dash-top5').innerHTML = top5.length
    ? `<table style="width:100%"><thead><tr><th style="color:var(--text3);font-family:var(--fm);font-size:10px;padding:4px 0">#</th><th style="color:var(--text3);font-family:var(--fm);font-size:10px">Producto</th><th class="r" style="color:var(--text3);font-family:var(--fm);font-size:10px">Cant.</th></tr></thead><tbody>`
      +top5.map(([id,q],i)=>`<tr><td style="padding:6px 0;color:var(--text3);font-size:12px">${i+1}</td><td style="color:var(--text2);font-size:12px">${he(nomProd(parseInt(id)))}</td><td class="r" style="font-family:var(--fm);font-size:12px;color:var(--g2)">${fmt(q)}</td></tr>`).join('')
      +'</tbody></table>'
    : `<div class="empty" style="padding:18px"><div class="icon">📊</div>Sin datos</div>`;

  // Últimas facturas
  const ulf=[...facturas].sort((a,b)=>b.id-a.id).slice(0,5);
  document.getElementById('dash-ult-facs').innerHTML = ulf.length
    ? ulf.map(f=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
        <div><div style="font-family:var(--fm);font-size:11px;color:var(--g2)">${f.num}</div><div style="color:var(--text2);font-size:11px">${he(nomCli(f.clienteId))}</div></div>
        <div style="text-align:right"><div style="font-family:var(--fm);font-weight:700;font-size:12px">Gs. ${fmt(f.total)}</div><div>${badgeFac(f.estado)}</div></div>
      </div>`).join('')
    : `<div class="empty" style="padding:18px"><div class="icon">🧾</div>Sin facturas</div>`;
}

function pieSlice(pct, offset, color) {
  if (pct<=0) return '';
  if (pct>=100) return `<circle cx="18" cy="18" r="15.9" fill="${color}"/>`;
  const circ=2*Math.PI*15.9, dash=circ*pct/100, gap=circ-dash, rot=-90+360*offset/100;
  return `<circle cx="18" cy="18" r="15.9" fill="none" stroke="${color}" stroke-width="3.8" stroke-dasharray="${dash} ${gap}" style="transform:rotate(${rot}deg);transform-origin:center"/>`;
}

// ═══════════════════════════════
// ITEMS MULTI-LÍNEA (presupuesto y factura)
// ═══════════════════════════════
function addItemRow(type) {
  const arr = type==='presu' ? itemsPresu : itemsFac;
  arr.push({ id: Date.now()+Math.random(), prodId:'', desc:'', cant:1, precio:0, desc_gs:0 });
  renderItemRows(type);
}
function delItemRow(type, id) {
  if (type==='presu') itemsPresu = itemsPresu.filter(x=>x.id!==id);
  else itemsFac = itemsFac.filter(x=>x.id!==id);
  renderItemRows(type);
}
function onItemChange(type, id, field, val) {
  const arr = type==='presu' ? itemsPresu : itemsFac;
  const row = arr.find(x=>x.id===id);
  if (!row) return;
  if (field==='prod') {
    const pid = parseInt(val); row.prodId = pid||'';
    if (pid) { const p=productos.find(x=>x.id===pid); if(p){row.desc=p.nombre;row.precio=p.precioVenta||0;} }
  } else if (field==='desc')   { row.desc=val; row.prodId=''; }
  else if (field==='cant')    { row.cant=parseFloat(val)||0; }
  else if (field==='precio')  { row.precio=parseFloat(val)||0; }
  else if (field==='desc_gs') { row.desc_gs=parseFloat(val)||0; }
  renderItemRows(type);
}

function renderItemRows(type) {
  const arr = type==='presu' ? itemsPresu : itemsFac;
  const body = document.getElementById(type+'-items-body');
  const totEl = document.getElementById(type+'-totals');

  if (!arr.length) {
    body.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text3);font-family:var(--fm);font-size:11px">Clic en "＋ Agregar producto" para añadir líneas al documento</div>`;
    totEl.innerHTML = '';
    return;
  }

  const prodOpts = productos.map(p=>`<option value="${p.id}">${he(p.nombre)} — Gs.${fmt(p.precioVenta)}</option>`).join('');

  body.innerHTML = arr.map(r => {
    const { sub, iva, exento } = calcIVA(r.precio, r.cant, r.desc_gs);
    const selOpts = `<option value="">— Producto —</option>${prodOpts}`.replace(
      `value="${r.prodId}"`, `value="${r.prodId}" selected`
    );
    return `<div class="item-row">
      <div class="item-cell" style="display:flex;flex-direction:column;gap:3px">
        <select onchange="onItemChange('${type}',${r.id},'prod',this.value)">${selOpts}</select>
        <input type="text" placeholder="Descripción libre..." value="${he(r.desc)}"
          oninput="onItemChange('${type}',${r.id},'desc',this.value)"
          style="background:var(--bg2);border:1px solid transparent;border-radius:4px;padding:4px 6px;font-size:11px;width:100%">
      </div>
      <div class="item-cell"><input type="number" class="tc" min="0" value="${r.cant}"
        oninput="onItemChange('${type}',${r.id},'cant',this.value)"></div>
      <div class="item-cell"><input type="number" class="tr" min="0" value="${r.precio}"
        oninput="onItemChange('${type}',${r.id},'precio',this.value)"></div>
      <div class="item-cell"><input type="number" class="tr" min="0" value="${r.desc_gs||0}"
        oninput="onItemChange('${type}',${r.id},'desc_gs',this.value)"></div>
      <div class="item-readonly">Gs.${fmt(exento)}</div>
      <div class="item-readonly iva">Gs.${fmt(iva)}</div>
      <div><button class="item-del-btn" onclick="delItemRow('${type}',${r.id})">✕</button></div>
    </div>`;
  }).join('');

  let totEx=0, totIVA=0, totDesc=0, totBruto=0;
  arr.forEach(r => { const c=calcIVA(r.precio,r.cant,r.desc_gs); totEx+=c.exento; totIVA+=c.iva; totDesc+=Number(r.desc_gs||0); totBruto+=c.sub; });

  totEl.innerHTML = `
    <div class="total-line"><span>Descuentos:</span><span>Gs. ${fmt(totDesc)}</span></div>
    <div class="total-line"><span>Subtotal Exento (100/110):</span><span>Gs. ${fmt(totEx)}</span></div>
    <div class="total-line"><span>IVA 10% incluido (10/110):</span><span>Gs. ${fmt(totIVA)}</span></div>
    <div class="total-line grand"><span>TOTAL A COBRAR:</span><span>Gs. ${fmt(totBruto)}</span></div>
  `;
}

// ═══════════════════════════════
// PRESUPUESTOS
// ═══════════════════════════════
function renderPresupuestos() {
  const filter = tabFilters.presupuestos||'todos';
  let data = [...presus].sort((a,b)=>b.id-a.id);
  if (filter!=='todos') data = data.filter(p=>p.estado===filter);
  const cts = { pendiente:0, aprobado:0, rechazado:0, facturado:0 };
  presus.forEach(p => cts[p.estado]=(cts[p.estado]||0)+1);
  document.getElementById('presu-mini-stats').innerHTML = `
    <div class="mini-stat"><div class="val">${presus.length}</div><div class="lbl">Total</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--amber)">${cts.pendiente||0}</div><div class="lbl">Pendientes</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--g2)">${cts.aprobado||0}</div><div class="lbl">Aprobados</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--blue)">${cts.facturado||0}</div><div class="lbl">Facturados</div></div>
  `;
  const tb = document.getElementById('tabla-presupuestos');
  if (!data.length) { tb.innerHTML=`<tr><td colspan="9"><div class="empty"><div class="icon">📋</div>Sin presupuestos</div></td></tr>`; return; }
  const tots = p => totalesFromItems(p.items||[]);
  tb.innerHTML = data.map(p => {
    const t = tots(p);
    const acc=[];
    if (p.estado==='pendiente') {
      acc.push(`<button class="btn-t g" onclick="aprobarPresu(${p.id})">✓ Aprobar</button>`);
      acc.push(`<button class="btn-t r" onclick="rechazarPresu(${p.id})">✕ Rechazar</button>`);
    }
    if (p.estado==='aprobado'&&!p.facturadoId) acc.push(`<button class="btn-t b" onclick="facturarPresupuesto(${p.id})">🧾 Facturar</button>`);
    if (p.facturadoId) acc.push(`<span style="font-family:var(--fm);font-size:10px;color:var(--blue)">✓ Facturado</span>`);
    acc.push(`<button class="btn-t gr" onclick="verDocumento('presu',${p.id})">👁</button>`);
    acc.push(`<button class="btn-t gr" onclick="editPresupuesto(${p.id})">✏</button>`);
    acc.push(`<button class="btn-t r" onclick="delPresupuesto(${p.id})">🗑</button>`);
    return `<tr>
      <td style="font-family:var(--fm);font-size:11px;color:var(--g2)">${p.num}</td>
      <td style="font-size:12px;color:var(--text3)">${fmtD(p.fecha)}</td>
      <td style="font-weight:600">${he(nomCli(p.clienteId))}</td>
      <td style="font-size:12px;color:var(--text3)">${he((p.items||[]).map(i=>i.desc).filter(Boolean).join(', ').slice(0,35)||'—')}</td>
      <td class="r" style="font-family:var(--fm);font-size:11px">Gs.${fmt(t.exento)}</td>
      <td class="r" style="font-family:var(--fm);font-size:11px;color:var(--amber)">Gs.${fmt(t.iva)}</td>
      <td class="r" style="font-family:var(--fm);font-weight:700;color:var(--g2)">Gs.${fmt(t.total)}</td>
      <td>${badgePresu(p.estado)}</td>
      <td><div class="act-group">${acc.join('')}</div></td>
    </tr>`;
  }).join('');
}

function openModalPresupuesto() {
  itemsPresu = [];
  document.getElementById('presu-id').value = '';
  document.getElementById('modal-presu-title').textContent = 'Nuevo Presupuesto';
  fillCliSel('presu-cliente');
  document.getElementById('presu-fecha').value = today();
  document.getElementById('presu-num').value = '(auto)';
  document.getElementById('presu-validez').value = 7;
  document.getElementById('presu-obs').value = '';
  renderItemRows('presu');
  openModal('modal-presupuesto');
}

function editPresupuesto(id) {
  const p = presus.find(x=>x.id===id); if(!p) return;
  itemsPresu = (p.items||[]).map(x=>({...x, id:Date.now()+Math.random()}));
  document.getElementById('presu-id').value = p.id;
  document.getElementById('modal-presu-title').textContent = 'Editar Presupuesto';
  fillCliSel('presu-cliente', p.clienteId);
  document.getElementById('presu-fecha').value = p.fecha||today();
  document.getElementById('presu-num').value = p.num;
  document.getElementById('presu-validez').value = p.validez||7;
  document.getElementById('presu-obs').value = p.obs||'';
  renderItemRows('presu');
  openModal('modal-presupuesto');
}

function savePresupuesto() {
  const cliId = parseInt(document.getElementById('presu-cliente').value);
  if (!cliId) { toast('Seleccioná un cliente','w'); return; }
  if (!itemsPresu.length) { toast('Agregá al menos un producto','w'); return; }
  const tots = totalesFromItems(itemsPresu);
  const eid = document.getElementById('presu-id').value;
  const existing = eid ? presus.find(x=>x.id===parseInt(eid)) : null;
  const obj = {
    id:          eid ? parseInt(eid) : Date.now(),
    num:         existing ? existing.num : nextNum('presu','PRES-',4),
    clienteId:   cliId,
    fecha:       document.getElementById('presu-fecha').value||today(),
    validez:     parseInt(document.getElementById('presu-validez').value)||7,
    obs:         document.getElementById('presu-obs').value.trim(),
    items:       itemsPresu.map(r=>({...r})),
    ...tots,
    estado:      existing ? existing.estado : 'pendiente',
    facturadoId: existing ? existing.facturadoId : null,
  };
  if (eid) presus = presus.map(x=>x.id===parseInt(eid)?obj:x); else presus.unshift(obj);
  saveAll(); closeModal('modal-presupuesto');
  toast('Presupuesto guardado ✓');
  renderPanel(activePanel); updateSidebar();
}

function aprobarPresu(id) {
  const p=presus.find(x=>x.id===id); if(!p) return;
  if (!confirm(`¿Marcar presupuesto ${p.num} como APROBADO?`)) return;
  p.estado='aprobado'; saveAll();
  toast('Presupuesto aprobado ✓'); renderPanel(activePanel); updateSidebar();
}
function rechazarPresu(id) {
  const p=presus.find(x=>x.id===id); if(!p) return;
  if (!confirm(`¿Rechazar presupuesto ${p.num}?`)) return;
  p.estado='rechazado'; saveAll();
  toast('Presupuesto rechazado'); renderPanel(activePanel); updateSidebar();
}
function delPresupuesto(id) {
  if (!confirm('¿Eliminar presupuesto?')) return;
  presus=presus.filter(x=>x.id!==id); saveAll();
  toast('Eliminado'); renderPanel(activePanel); updateSidebar();
}
function facturarPresupuesto(id) {
  const p=presus.find(x=>x.id===id); if(!p) return;
  itemsFac = (p.items||[]).map(x=>({...x, id:Date.now()+Math.random()}));
  document.getElementById('fac-id').value='';
  document.getElementById('fac-pedido-id').value='';
  document.getElementById('fac-presu-id').value=p.id;
  document.getElementById('modal-fac-title').textContent='Factura — '+p.num;
  fillCliSel('fac-cliente', p.clienteId);
  document.getElementById('fac-fecha').value=today();
  document.getElementById('fac-timbrado').value='';
  document.getElementById('fac-num-display').value='(auto)';
  document.getElementById('fac-vendedor').value='';
  document.getElementById('fac-condicion').value='contado';
  document.getElementById('fac-dias').value=30;
  document.getElementById('fac-obs').value='';
  facCondChanged(); renderItemRows('fac');
  openModal('modal-factura');
}

// ═══════════════════════════════
// PEDIDOS
// ═══════════════════════════════
function renderPedidos() {
  const filter = tabFilters.pedidos||'todos';
  let data = [...pedidos].sort((a,b)=>b.id-a.id);
  if (filter!=='todos') data = data.filter(p=>p.estado===filter);
  const cts={pendiente:0,entregado:0,cancelado:0};
  pedidos.forEach(p=>cts[p.estado]=(cts[p.estado]||0)+1);
  document.getElementById('pedidos-mini-stats').innerHTML = `
    <div class="mini-stat"><div class="val">${pedidos.length}</div><div class="lbl">Total</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--amber)">${cts.pendiente||0}</div><div class="lbl">Pendientes</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--g2)">${cts.entregado||0}</div><div class="lbl">Entregados</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--text3)">${cts.cancelado||0}</div><div class="lbl">Cancelados</div></div>
  `;
  const tb = document.getElementById('tabla-pedidos');
  if (!data.length) { tb.innerHTML=`<tr><td colspan="8"><div class="empty"><div class="icon">📦</div>Sin pedidos</div></td></tr>`; return; }
  tb.innerHTML = data.map(p => {
    const acc=[];
    if (p.estado==='pendiente') {
      acc.push(`<button class="btn-t g" onclick="entregarPedido(${p.id})">✓ Entregar</button>`);
      acc.push(`<button class="btn-t r" onclick="cancelarPedido(${p.id})">✕ Cancelar</button>`);
      acc.push(`<button class="btn-t gr" onclick="editPedido(${p.id})">✏</button>`);
    }
    if (p.estado==='entregado'&&!p.facturadoId) acc.push(`<button class="btn-t b" onclick="facturarPedido(${p.id})">🧾 Facturar</button>`);
    if (p.facturadoId) acc.push(`<span style="font-family:var(--fm);font-size:10px;color:var(--blue)">✓ Fac.</span>`);
    const dep = p.deposito==='ypacarai' ? '🌿 Ypa.' : '🏪 Asu.';
    return `<tr>
      <td style="font-family:var(--fm);font-size:11px;color:var(--text3)">${p.num}</td>
      <td style="font-size:12px;color:var(--text3)">${fmtD(p.fecha)}</td>
      <td style="font-weight:600">${he(nomCli(p.clienteId))}</td>
      <td style="font-size:12px">${he(p.detalle||'—')} <span style="font-family:var(--fm);font-size:10px;color:var(--text3)">${dep}</span></td>
      <td class="r">${fmt(p.cantidad||1)}</td>
      <td class="r" style="font-family:var(--fm);color:var(--g2)">Gs.${fmt(p.monto)}</td>
      <td>${badgePed(p.estado)}</td>
      <td><div class="act-group">${acc.join('')}</div></td>
    </tr>`;
  }).join('');
}

function openModalPedido() {
  document.getElementById('ped-id').value='';
  document.getElementById('modal-ped-title').textContent='Nuevo Pedido';
  fillCliSel('ped-cliente'); fillProdSel('ped-prod');
  document.getElementById('ped-fecha').value=today();
  document.getElementById('ped-cant').value=1;
  document.getElementById('ped-precio').value=0;
  document.getElementById('ped-monto').value=0;
  document.getElementById('ped-detalle').value='';
  document.getElementById('ped-obs').value='';
  document.getElementById('ped-deposito').value='asuncion';
  openModal('modal-pedido');
}
function editPedido(id) {
  const p=pedidos.find(x=>x.id===id); if(!p) return;
  document.getElementById('ped-id').value=p.id;
  document.getElementById('modal-ped-title').textContent='Editar Pedido';
  fillCliSel('ped-cliente',p.clienteId); fillProdSel('ped-prod',p.prodId);
  document.getElementById('ped-fecha').value=p.fecha||today();
  document.getElementById('ped-cant').value=p.cantidad||1;
  document.getElementById('ped-precio').value=p.precio||0;
  document.getElementById('ped-monto').value=p.monto||0;
  document.getElementById('ped-detalle').value=p.detalle||'';
  document.getElementById('ped-obs').value=p.obs||'';
  document.getElementById('ped-deposito').value=p.deposito||'asuncion';
  openModal('modal-pedido');
}
function pedProdSelected() {
  const pid=parseInt(document.getElementById('ped-prod').value);
  if(!pid) return;
  const p=productos.find(x=>x.id===pid); if(!p) return;
  document.getElementById('ped-precio').value=p.precioVenta||0;
  document.getElementById('ped-detalle').value=p.nombre;
  calcPedMonto();
}
function calcPedMonto() {
  const c=parseFloat(document.getElementById('ped-cant').value)||0;
  const p=parseFloat(document.getElementById('ped-precio').value)||0;
  document.getElementById('ped-monto').value=c*p;
}
function savePedido() {
  const cliId=parseInt(document.getElementById('ped-cliente').value);
  if (!cliId) { toast('Seleccioná un cliente','w'); return; }
  const detalle=document.getElementById('ped-detalle').value.trim();
  if (!detalle) { toast('Ingresá el detalle','w'); return; }
  const eid=document.getElementById('ped-id').value;
  const ex=eid?pedidos.find(x=>x.id===parseInt(eid)):null;
  const obj={
    id:eid?parseInt(eid):Date.now(), num:ex?ex.num:nextNum('ped','PED-',5),
    clienteId:cliId, fecha:document.getElementById('ped-fecha').value||today(),
    prodId:parseInt(document.getElementById('ped-prod').value)||null,
    deposito:document.getElementById('ped-deposito').value||'asuncion',
    detalle, cantidad:parseFloat(document.getElementById('ped-cant').value)||1,
    precio:parseFloat(document.getElementById('ped-precio').value)||0,
    monto:parseFloat(document.getElementById('ped-monto').value)||0,
    obs:document.getElementById('ped-obs').value.trim(),
    estado:ex?ex.estado:'pendiente', facturadoId:ex?ex.facturadoId:null,
  };
  if (eid) pedidos=pedidos.map(x=>x.id===parseInt(eid)?obj:x); else pedidos.unshift(obj);
  saveAll(); closeModal('modal-pedido'); toast('Pedido guardado ✓');
  renderPanel(activePanel); updateSidebar();
}
function entregarPedido(id) {
  const p=pedidos.find(x=>x.id===id); if(!p) return;
  if (!confirm(`¿Entregar pedido ${p.num}?\nSe descuenta del depósito ${p.deposito==='ypacarai'?'Ypacararaí':'Asunción'}.`)) return;
  p.estado='entregado';
  if (p.prodId && p.cantidad) {
    const prod=productos.find(x=>x.id===p.prodId);
    if (prod) {
      const dep = p.deposito==='ypacarai' ? 'stockYpa' : 'stockAsu';
      prod[dep] = Math.max(0, Number(prod[dep]||0)-Number(p.cantidad||0));
      const total = stockTotal(prod);
      if (total<=0) toast(`⚠ ${prod.nombre} sin stock!`,'w');
      else if (total<=prod.stockMin) toast(`📉 ${prod.nombre} bajo stock (${total} total)`,'w');
    }
  }
  saveAll(); toast(`Pedido ${p.num} entregado ✓`); renderPanel(activePanel); updateSidebar();
}
function cancelarPedido(id) {
  const p=pedidos.find(x=>x.id===id); if(!p) return;
  if (!confirm(`¿Cancelar pedido ${p.num}?`)) return;
  p.estado='cancelado'; saveAll(); toast('Pedido cancelado'); renderPanel(activePanel); updateSidebar();
}
function facturarPedido(id) {
  const p=pedidos.find(x=>x.id===id); if(!p) return;
  itemsFac=[{id:Date.now(),prodId:p.prodId||'',desc:p.detalle||'',cant:p.cantidad||1,precio:p.precio||0,desc_gs:0}];
  document.getElementById('fac-id').value='';
  document.getElementById('fac-pedido-id').value=p.id;
  document.getElementById('fac-presu-id').value='';
  document.getElementById('modal-fac-title').textContent='Factura — Pedido '+p.num;
  fillCliSel('fac-cliente',p.clienteId);
  document.getElementById('fac-fecha').value=today();
  document.getElementById('fac-timbrado').value='';
  document.getElementById('fac-num-display').value='(auto)';
  document.getElementById('fac-vendedor').value='';
  document.getElementById('fac-condicion').value='contado';
  document.getElementById('fac-dias').value=30;
  document.getElementById('fac-obs').value='';
  facCondChanged(); renderItemRows('fac');
  openModal('modal-factura');
}

// ═══════════════════════════════
// FACTURAS
// ═══════════════════════════════
function renderFacturas() {
  const filter=tabFilters.facturas||'todos';
  let data=[...facturas].sort((a,b)=>b.id-a.id);
  if (filter!=='todos') data=data.filter(f=>f.estado===filter);
  const tb=document.getElementById('tabla-facturas');
  if (!data.length) { tb.innerHTML=`<tr><td colspan="11"><div class="empty"><div class="icon">🧾</div>Sin facturas</div></td></tr>`; return; }
  tb.innerHTML=data.map(f=>{
    const acc=[`<button class="btn-t gr" onclick="verDocumento('fac',${f.id})">👁</button>`];
    if (f.condicion==='credito'&&f.estado!=='pagada') acc.push(`<button class="btn-t g" onclick="openPago(${f.id})">💰 Pago</button>`);
    acc.push(`<button class="btn-t r" onclick="delFactura(${f.id})">🗑</button>`);
    return `<tr>
      <td style="font-family:var(--fm);font-size:11px;color:var(--g2)">${f.num}</td>
      <td style="font-family:var(--fm);font-size:10px;color:var(--text3)">${he(f.timbrado||'—')}</td>
      <td style="font-size:12px;color:var(--text3)">${fmtD(f.fecha)}</td>
      <td style="font-weight:600">${he(nomCli(f.clienteId))}</td>
      <td class="r" style="font-family:var(--fm);font-size:11px">Gs.${fmt(f.exento||0)}</td>
      <td class="r" style="font-family:var(--fm);font-size:11px;color:var(--amber)">Gs.${fmt(f.iva||0)}</td>
      <td class="r" style="font-family:var(--fm);font-weight:700;color:var(--g2)">Gs.${fmt(f.total)}</td>
      <td><span class="badge ${f.condicion==='credito'?'amber':'green'}">${f.condicion==='credito'?'Crédito':'Contado'}</span></td>
      <td style="font-size:12px;color:var(--text3)">${fmtD(f.fechaVenc)}</td>
      <td>${badgeFac(f.estado)}</td>
      <td><div class="act-group">${acc.join('')}</div></td>
    </tr>`;
  }).join('');
}

function openModalFactura() {
  itemsFac=[];
  document.getElementById('fac-id').value='';
  document.getElementById('fac-pedido-id').value='';
  document.getElementById('fac-presu-id').value='';
  document.getElementById('modal-fac-title').textContent='Nueva Factura';
  fillCliSel('fac-cliente');
  document.getElementById('fac-fecha').value=today();
  document.getElementById('fac-timbrado').value='';
  document.getElementById('fac-num-display').value='(auto)';
  document.getElementById('fac-vendedor').value='';
  document.getElementById('fac-condicion').value='contado';
  document.getElementById('fac-dias').value=30;
  document.getElementById('fac-obs').value='';
  facCondChanged(); renderItemRows('fac');
  openModal('modal-factura');
}
function facCondChanged() {
  const cred=document.getElementById('fac-condicion').value==='credito';
  document.getElementById('fac-dias-wrap').style.display=cred?'':'none';
}
function saveFactura() {
  const cliId=parseInt(document.getElementById('fac-cliente').value);
  if (!cliId) { toast('Seleccioná un cliente','w'); return; }
  if (!itemsFac.length) { toast('Agregá al menos un producto','w'); return; }
  const timbrado=document.getElementById('fac-timbrado').value.trim();
  if (!timbrado) { toast('Ingresá el número de timbrado','w'); return; }
  const condicion=document.getElementById('fac-condicion').value;
  const dias=parseInt(document.getElementById('fac-dias').value)||30;
  const tots=totalesFromItems(itemsFac);
  let fechaVenc='';
  if (condicion==='credito'){const d=new Date(today()+'T00:00:00');d.setDate(d.getDate()+dias);fechaVenc=d.toISOString().slice(0,10);}
  const eid=document.getElementById('fac-id').value;
  const ex=eid?facturas.find(x=>x.id===parseInt(eid)):null;
  const pedId=parseInt(document.getElementById('fac-pedido-id').value)||null;
  const presuId=parseInt(document.getElementById('fac-presu-id').value)||null;
  const obj={
    id:eid?parseInt(eid):Date.now(),
    num:ex?ex.num:nextNum('fac','001-001-',7),
    timbrado, vendedor:document.getElementById('fac-vendedor').value.trim(),
    clienteId:cliId, fecha:document.getElementById('fac-fecha').value||today(),
    items:itemsFac.map(r=>({...r})), ...tots,
    condicion, diasCredito:dias, fechaVenc,
    obs:document.getElementById('fac-obs').value.trim(),
    estado:condicion==='contado'?'pagada':'pendiente',
    pagado:condicion==='contado'?tots.total:0,
    saldo:condicion==='contado'?0:tots.total,
    pagos:[], pedidoId:pedId, presuId,
  };
  if (eid) facturas=facturas.map(x=>x.id===parseInt(eid)?obj:x); else facturas.unshift(obj);
  if (pedId){const p=pedidos.find(x=>x.id===pedId);if(p)p.facturadoId=obj.id;}
  if (presuId){const p=presus.find(x=>x.id===presuId);if(p){p.facturadoId=obj.id;p.estado='facturado';}}
  saveAll(); closeModal('modal-factura');
  toast(condicion==='contado'?'Factura contado — PAGADA ✓':'Factura crédito — en Cuentas a Cobrar');
  renderPanel(activePanel); updateSidebar();
}
function delFactura(id) {
  if (!confirm('¿Eliminar factura?')) return;
  facturas=facturas.filter(x=>x.id!==id); saveAll(); toast('Factura eliminada'); renderPanel(activePanel); updateSidebar();
}

// ═══════════════════════════════
// COBRAR
// ═══════════════════════════════
function renderCobrar() {
  const creds=facturas.filter(f=>f.condicion==='credito');
  const totalPend=creds.filter(f=>f.estado!=='pagada').reduce((s,f)=>s+Number(f.saldo||0),0);
  const montoVenc=creds.filter(f=>f.estado!=='pagada'&&diasMora(f.fechaVenc)>0).reduce((s,f)=>s+Number(f.saldo||0),0);
  const nVenc=creds.filter(f=>f.estado!=='pagada'&&diasMora(f.fechaVenc)>0).length;
  document.getElementById('cobrar-resumen').innerHTML=`<div class="mini-stats">
    <div class="mini-stat"><div class="val" style="color:var(--amber)">Gs.${fmt(totalPend)}</div><div class="lbl">Total pendiente</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--red)">Gs.${fmt(montoVenc)}</div><div class="lbl">Monto vencido</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--red)">${nVenc}</div><div class="lbl">Facturas vencidas</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--blue)">${creds.filter(f=>f.estado==='pago_parcial').length}</div><div class="lbl">Pago parcial</div></div>
  </div>`;
  const data=[...creds].sort((a,b)=>diasMora(b.fechaVenc)-diasMora(a.fechaVenc));
  const tb=document.getElementById('tabla-cobrar');
  if (!data.length) { tb.innerHTML=`<tr><td colspan="9"><div class="empty"><div class="icon">💰</div>Sin cuentas a cobrar</div></td></tr>`; return; }
  tb.innerHTML=data.map(f=>`<tr>
    <td style="font-family:var(--fm);font-size:11px;color:var(--g2)">${f.num}</td>
    <td style="font-weight:600">${he(nomCli(f.clienteId))}</td>
    <td class="r" style="font-family:var(--fm)">Gs.${fmt(f.total)}</td>
    <td class="r" style="font-family:var(--fm);color:var(--g2)">Gs.${fmt(f.pagado||0)}</td>
    <td class="r" style="font-family:var(--fm);font-weight:700;color:${f.saldo>0?'var(--amber)':'var(--g2)'}">Gs.${fmt(f.saldo||0)}</td>
    <td style="font-size:12px;color:var(--text3)">${fmtD(f.fechaVenc)}</td>
    <td>${moraChip(f.fechaVenc,f.estado)}</td>
    <td>${badgeFac(f.estado)}</td>
    <td><div class="act-group">${f.estado!=='pagada'?`<button class="btn-t g" onclick="openPago(${f.id})">💰 Pagar</button>`:'<span style="font-family:var(--fm);font-size:10px;color:var(--g2)">✓</span>'}</div></td>
  </tr>`).join('');
}
function openPago(facId) {
  const f=facturas.find(x=>x.id===facId); if(!f) return;
  document.getElementById('pago-fac-id').value=facId;
  document.getElementById('pago-info').innerHTML=`<strong>${f.num}</strong> — ${he(nomCli(f.clienteId))}<br>
    Total: Gs.${fmt(f.total)} &nbsp;|&nbsp; Pagado: <span style="color:var(--g2)">Gs.${fmt(f.pagado||0)}</span> &nbsp;|&nbsp;
    Saldo: <strong style="color:var(--amber)">Gs.${fmt(f.saldo||0)}</strong>`;
  document.getElementById('pago-monto').value='';
  document.getElementById('pago-fecha').value=today();
  document.getElementById('pago-obs').value='';
  openModal('modal-pago');
}
function savePago() {
  const facId=parseInt(document.getElementById('pago-fac-id').value);
  const f=facturas.find(x=>x.id===facId); if(!f) return;
  const monto=parseFloat(document.getElementById('pago-monto').value)||0;
  if (!monto||monto<=0) { toast('Ingresá un monto válido','w'); return; }
  if (monto>f.saldo) { toast(`El monto supera el saldo (Gs.${fmt(f.saldo)})`,'w'); return; }
  if (!f.pagos) f.pagos=[];
  f.pagos.push({monto, fecha:document.getElementById('pago-fecha').value||today(), obs:document.getElementById('pago-obs').value.trim()});
  f.pagado=Number(f.pagado||0)+monto;
  f.saldo=Number(f.total||0)-Number(f.pagado||0);
  if (f.saldo<=0) { f.saldo=0; f.pagado=f.total; f.estado='pagada'; toast('Factura PAGADA en su totalidad ✓','s'); }
  else { f.estado='pago_parcial'; toast(`Pago registrado — Saldo: Gs.${fmt(f.saldo)}`); }
  saveAll(); closeModal('modal-pago'); renderPanel(activePanel); updateSidebar();
}

// ═══════════════════════════════
// GASTOS
// ═══════════════════════════════
function renderGastos() {
  const filter=tabFilters.gastos||'todos';
  let data=[...gastos].sort((a,b)=>b.id-a.id);
  if (filter!=='todos') data=data.filter(g=>g.categoria===filter);
  const mes=mesActual();
  const totMes=gastos.filter(g=>g.fecha&&g.fecha.startsWith(mes)).reduce((s,g)=>s+Number(g.monto||0),0);
  const totPend=gastos.filter(g=>g.estado==='pendiente').reduce((s,g)=>s+Number(g.monto||0),0);
  const totProv=gastos.filter(g=>g.categoria==='proveedor').reduce((s,g)=>s+Number(g.monto||0),0);
  document.getElementById('gastos-mini-stats').innerHTML=`
    <div class="mini-stat"><div class="val" style="color:var(--red)">Gs.${fmt(totMes)}</div><div class="lbl">Gastos del mes</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--amber)">Gs.${fmt(totPend)}</div><div class="lbl">Pendientes de pago</div></div>
    <div class="mini-stat"><div class="val" style="color:var(--blue)">Gs.${fmt(totProv)}</div><div class="lbl">A proveedores (total)</div></div>
    <div class="mini-stat"><div class="val">${gastos.length}</div><div class="lbl">Registros</div></div>
  `;
  const tb=document.getElementById('tabla-gastos');
  if (!data.length) { tb.innerHTML=`<tr><td colspan="8"><div class="empty"><div class="icon">💸</div>Sin gastos registrados</div></td></tr>`; return; }
  const catLabel={proveedor:'Proveedor',operativo:'Operativo',otro:'Otro'};
  const catColor={proveedor:'blue',operativo:'amber',otro:'gray'};
  tb.innerHTML=data.map(g=>`<tr>
    <td style="font-family:var(--fm);font-size:11px;color:var(--text3)">${g.num}</td>
    <td style="font-size:12px;color:var(--text3)">${fmtD(g.fecha)}</td>
    <td><span class="badge ${catColor[g.categoria]||'gray'}">${catLabel[g.categoria]||g.categoria}</span></td>
    <td style="font-weight:600;color:var(--text)">${he(g.concepto||'—')}</td>
    <td style="font-size:12px;color:var(--text2)">${he(g.proveedorId?nomProv(g.proveedorId):g.proveedorNombre||'—')}</td>
    <td class="r" style="font-family:var(--fm);font-weight:700;color:var(--red)">Gs.${fmt(g.monto)}</td>
    <td>${badgeGasto(g.estado)}</td>
    <td><div class="act-group">
      <button class="btn-t gr" onclick="editGasto(${g.id})">✏</button>
      <button class="btn-t r" onclick="delGasto(${g.id})">🗑</button>
    </div></td>
  </tr>`).join('');
}

function openModalGasto() {
  document.getElementById('gasto-id').value='';
  document.getElementById('modal-gasto-title').textContent='Registrar Gasto';
  document.getElementById('gasto-fecha').value=today();
  document.getElementById('gasto-cat').value='proveedor';
  document.getElementById('gasto-concepto').value='';
  document.getElementById('gasto-monto').value=0;
  document.getElementById('gasto-nrofac').value='';
  document.getElementById('gasto-obs').value='';
  document.getElementById('gasto-estado').value='pagado';
  fillProvSel('gasto-proveedor');
  openModal('modal-gasto');
}
function editGasto(id) {
  const g=gastos.find(x=>x.id===id); if(!g) return;
  document.getElementById('gasto-id').value=g.id;
  document.getElementById('modal-gasto-title').textContent='Editar Gasto';
  document.getElementById('gasto-fecha').value=g.fecha||today();
  document.getElementById('gasto-cat').value=g.categoria||'proveedor';
  document.getElementById('gasto-concepto').value=g.concepto||'';
  document.getElementById('gasto-monto').value=g.monto||0;
  document.getElementById('gasto-nrofac').value=g.nrofac||'';
  document.getElementById('gasto-obs').value=g.obs||'';
  document.getElementById('gasto-estado').value=g.estado||'pagado';
  fillProvSel('gasto-proveedor', g.proveedorId);
  openModal('modal-gasto');
}
function saveGasto() {
  const concepto=document.getElementById('gasto-concepto').value.trim();
  if (!concepto) { toast('Ingresá el concepto del gasto','w'); return; }
  const monto=parseFloat(document.getElementById('gasto-monto').value)||0;
  if (!monto) { toast('Ingresá el monto','w'); return; }
  const eid=document.getElementById('gasto-id').value;
  const ex=eid?gastos.find(x=>x.id===parseInt(eid)):null;
  const obj={
    id:eid?parseInt(eid):Date.now(),
    num:ex?ex.num:nextNum('gasto','GST-',5),
    fecha:document.getElementById('gasto-fecha').value||today(),
    categoria:document.getElementById('gasto-cat').value||'proveedor',
    concepto,
    proveedorId:parseInt(document.getElementById('gasto-proveedor').value)||null,
    monto,
    nrofac:document.getElementById('gasto-nrofac').value.trim(),
    obs:document.getElementById('gasto-obs').value.trim(),
    estado:document.getElementById('gasto-estado').value||'pagado',
  };
  if (eid) gastos=gastos.map(x=>x.id===parseInt(eid)?obj:x); else gastos.unshift(obj);
  saveAll(); closeModal('modal-gasto'); toast('Gasto guardado ✓');
  renderPanel(activePanel); updateSidebar();
}
function delGasto(id) {
  if (!confirm('¿Eliminar gasto?')) return;
  gastos=gastos.filter(x=>x.id!==id); saveAll(); toast('Gasto eliminado'); renderPanel(activePanel);
}

// ═══════════════════════════════
// STOCK — 2 DEPÓSITOS
// ═══════════════════════════════
function renderStock() {
  const filter=tabFilters.stock||'todos';
  // alertas
  const sa=document.getElementById('stock-alerts'); sa.innerHTML='';
  const sin=productos.filter(p=>stockTotal(p)<=0);
  const bajo=productos.filter(p=>stockTotal(p)>0&&stockTotal(p)<=p.stockMin);
  if (sin.length) sa.innerHTML+=`<div class="alert-box red">🔴 Sin stock: ${sin.map(p=>he(p.nombre)).join(', ')}</div>`;
  if (bajo.length) sa.innerHTML+=`<div class="alert-box amber">📉 Bajo stock: ${bajo.map(p=>`${he(p.nombre)} (${stockTotal(p)})`).join(', ')}</div>`;

  // resumen depósitos
  const totAsu=productos.reduce((s,p)=>s+Number(p.stockAsu||0),0);
  const totYpa=productos.reduce((s,p)=>s+Number(p.stockYpa||0),0);
  document.getElementById('stock-depositos-resumen').innerHTML=`
    <div class="dep-grid">
      <div class="dep-card">
        <div class="dep-name">🏪 Depósito Asunción</div>
        <div class="dep-sub">${productos.length} productos</div>
        <div class="dep-num">${fmt(totAsu)} <span style="font-size:13px;color:var(--text3)">u. total</span></div>
      </div>
      <div class="dep-card">
        <div class="dep-name">🌿 Depósito Ypacararaí</div>
        <div class="dep-sub">${productos.length} productos</div>
        <div class="dep-num">${fmt(totYpa)} <span style="font-size:13px;color:var(--text3)">u. total</span></div>
      </div>
    </div>`;

  let data=[...productos];
  if (filter==='asuncion') data=data.filter(p=>Number(p.stockAsu||0)>0);
  else if (filter==='ypacarai') data=data.filter(p=>Number(p.stockYpa||0)>0);
  else if (filter==='alertas') data=data.filter(p=>stockTotal(p)<=p.stockMin);

  const tb=document.getElementById('tabla-stock');
  if (!data.length) { tb.innerHTML=`<tr><td colspan="10"><div class="empty"><div class="icon">🏭</div>Sin productos</div></td></tr>`; return; }
  tb.innerHTML=data.map(p=>{
    const tot=stockTotal(p);
    let est,ec;
    if (tot<=0){est='Sin stock';ec='red';}
    else if (tot<=p.stockMin){est='Bajo stock';ec='amber';}
    else{est='Disponible';ec='green';}
    return `<tr>
      <td style="font-family:var(--fm);font-size:11px;color:var(--text3)">${he(p.codigo||'—')}</td>
      <td style="font-weight:600;color:var(--text)">${he(p.nombre)}</td>
      <td><span class="badge gray">${he(p.categoria||'—')}</span></td>
      <td class="r" style="font-family:var(--fm);font-size:13px;font-weight:700;color:var(--g2)">${fmt(p.stockAsu||0)}</td>
      <td class="r" style="font-family:var(--fm);font-size:13px;font-weight:700;color:var(--blue)">${fmt(p.stockYpa||0)}</td>
      <td class="r" style="font-family:var(--fm);font-size:14px;font-weight:800;color:var(--text)">${fmt(tot)}</td>
      <td class="r" style="font-family:var(--fm);color:var(--text3)">${fmt(p.stockMin)}</td>
      <td class="r" style="font-family:var(--fm);font-size:11px">Gs.${fmt(p.precioVenta)}</td>
      <td><span class="badge ${ec}">${est}</span></td>
      <td><div class="act-group">
        <button class="btn-t g" onclick="openStockAjuste(${p.id})">🔧 Ajustar</button>
        <button class="btn-t gr" onclick="editProducto(${p.id})">✏</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openStockAjuste(id) {
  const p=productos.find(x=>x.id===id); if(!p) return;
  document.getElementById('stockaj-prod-id').value=id;
  document.getElementById('stockaj-info').innerHTML=`<strong>${p.nombre}</strong><br>
    🏪 Asunción: <strong>${p.stockAsu||0}</strong> ${p.unidad||''} &nbsp;|&nbsp;
    🌿 Ypacararaí: <strong>${p.stockYpa||0}</strong> ${p.unidad||''}`;
  document.getElementById('stockaj-cant').value=0;
  document.getElementById('stockaj-motivo').value='';
  document.getElementById('stockaj-tipo').value='add';
  document.getElementById('stockaj-deposito').value='asuncion';
  openModal('modal-stock-ajuste');
}
function saveStockAjuste() {
  const id=parseInt(document.getElementById('stockaj-prod-id').value);
  const p=productos.find(x=>x.id===id); if(!p) return;
  const tipo=document.getElementById('stockaj-tipo').value;
  const cant=parseFloat(document.getElementById('stockaj-cant').value)||0;
  const dep=document.getElementById('stockaj-deposito').value;
  const key=dep==='ypacarai'?'stockYpa':'stockAsu';
  const keyOther=dep==='ypacarai'?'stockAsu':'stockYpa';
  if (!p[key]) p[key]=0;
  if (!p[keyOther]) p[keyOther]=0;
  if (tipo==='add')      p[key]=Number(p[key])+cant;
  else if (tipo==='sub') p[key]=Math.max(0,Number(p[key])-cant);
  else if (tipo==='set') p[key]=cant;
  else if (tipo==='transfer') { p[key]=Math.max(0,Number(p[key])-cant); p[keyOther]=Number(p[keyOther])+cant; }
  saveAll(); closeModal('modal-stock-ajuste');
  toast(`Stock actualizado — ${p.nombre}: Asu:${p.stockAsu} / Ypa:${p.stockYpa}`);
  renderPanel(activePanel); updateSidebar();
}

// ═══════════════════════════════
// CLIENTES
// ═══════════════════════════════
function renderClientes() {
  const tb=document.getElementById('tabla-clientes');
  if (!clientes.length) { tb.innerHTML=`<tr><td colspan="6"><div class="empty"><div class="icon">👥</div>Sin clientes</div></td></tr>`; return; }
  tb.innerHTML=[...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).map(c=>`<tr>
    <td style="font-weight:600;color:var(--text)">${he(c.nombre)}</td>
    <td style="font-family:var(--fm);font-size:12px">${he(c.ruc||'—')}</td>
    <td style="font-size:12px">${he(c.tel||'—')}</td>
    <td style="font-size:12px;color:var(--text3)">${he(c.email||'—')}</td>
    <td style="font-size:12px;color:var(--text3)">${he(c.dir||'—')}</td>
    <td><div class="act-group">
      <button class="btn-t gr" onclick="editCliente(${c.id})">✏</button>
      <button class="btn-t r" onclick="delCliente(${c.id})">🗑</button>
    </div></td>
  </tr>`).join('');
}
function openModalCliente() {
  document.getElementById('cli-id').value='';
  document.getElementById('modal-cli-title').textContent='Nuevo Cliente';
  ['cli-nombre','cli-ruc','cli-tel','cli-email','cli-dir'].forEach(id=>document.getElementById(id).value='');
  openModal('modal-cliente');
}
function editCliente(id) {
  const c=clientes.find(x=>x.id===id); if(!c) return;
  document.getElementById('cli-id').value=c.id;
  document.getElementById('modal-cli-title').textContent='Editar Cliente';
  document.getElementById('cli-nombre').value=c.nombre||'';
  document.getElementById('cli-ruc').value=c.ruc||'';
  document.getElementById('cli-tel').value=c.tel||'';
  document.getElementById('cli-email').value=c.email||'';
  document.getElementById('cli-dir').value=c.dir||'';
  openModal('modal-cliente');
}
function saveCliente() {
  const nombre=document.getElementById('cli-nombre').value.trim();
  if (!nombre) { toast('Ingresá el nombre','w'); return; }
  const eid=document.getElementById('cli-id').value;
  const obj={id:eid?parseInt(eid):Date.now(),nombre,ruc:document.getElementById('cli-ruc').value.trim(),tel:document.getElementById('cli-tel').value.trim(),email:document.getElementById('cli-email').value.trim(),dir:document.getElementById('cli-dir').value.trim()};
  if (eid) clientes=clientes.map(x=>x.id===parseInt(eid)?obj:x); else clientes.push(obj);
  saveAll(); closeModal('modal-cliente'); toast('Cliente guardado'); renderPanel(activePanel);
}
function delCliente(id) { if(!confirm('¿Eliminar cliente?')) return; clientes=clientes.filter(x=>x.id!==id); saveAll(); toast('Cliente eliminado'); renderPanel(activePanel); }

// ═══════════════════════════════
// PRODUCTOS
// ═══════════════════════════════
function renderProductos() {
  const tb=document.getElementById('tabla-productos');
  if (!productos.length) { tb.innerHTML=`<tr><td colspan="9"><div class="empty"><div class="icon">🗂</div>Sin productos</div></td></tr>`; return; }
  tb.innerHTML=[...productos].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).map(p=>`<tr>
    <td style="font-family:var(--fm);font-size:11px;color:var(--text3)">${he(p.codigo||'—')}</td>
    <td style="font-weight:600;color:var(--text)">${he(p.nombre)}</td>
    <td><span class="badge gray">${he(p.categoria||'—')}</span></td>
    <td class="r" style="font-family:var(--fm)">Gs.${fmt(p.precioCosto)}</td>
    <td class="r" style="font-family:var(--fm);color:var(--g2)">Gs.${fmt(p.precioVenta)}</td>
    <td class="r" style="font-family:var(--fm);color:var(--g2)">${fmt(p.stockAsu||0)}</td>
    <td class="r" style="font-family:var(--fm);color:var(--blue)">${fmt(p.stockYpa||0)}</td>
    <td class="r" style="font-family:var(--fm);color:var(--text3)">${fmt(p.stockMin)}</td>
    <td><div class="act-group">
      <button class="btn-t gr" onclick="editProducto(${p.id})">✏</button>
      <button class="btn-t r" onclick="delProducto(${p.id})">🗑</button>
    </div></td>
  </tr>`).join('');
}
function openModalProducto() {
  document.getElementById('prod-id').value='';
  document.getElementById('modal-prod-title').textContent='Nuevo Producto';
  ['prod-cod','prod-cat','prod-nombre','prod-unidad'].forEach(id=>document.getElementById(id).value='');
  ['prod-costo','prod-venta','prod-stock-asu','prod-stock-ypa'].forEach(id=>document.getElementById(id).value=0);
  document.getElementById('prod-min').value=5;
  openModal('modal-producto');
}
function editProducto(id) {
  const p=productos.find(x=>x.id===id); if(!p) return;
  document.getElementById('prod-id').value=p.id;
  document.getElementById('modal-prod-title').textContent='Editar Producto';
  document.getElementById('prod-cod').value=p.codigo||'';
  document.getElementById('prod-cat').value=p.categoria||'';
  document.getElementById('prod-nombre').value=p.nombre||'';
  document.getElementById('prod-unidad').value=p.unidad||'';
  document.getElementById('prod-costo').value=p.precioCosto||0;
  document.getElementById('prod-venta').value=p.precioVenta||0;
  document.getElementById('prod-stock-asu').value=p.stockAsu||0;
  document.getElementById('prod-stock-ypa').value=p.stockYpa||0;
  document.getElementById('prod-min').value=p.stockMin||5;
  openModal('modal-producto');
}
function saveProducto() {
  const nombre=document.getElementById('prod-nombre').value.trim();
  if (!nombre) { toast('Ingresá el nombre','w'); return; }
  const eid=document.getElementById('prod-id').value;
  const obj={
    id:eid?parseInt(eid):Date.now(),
    codigo:document.getElementById('prod-cod').value.trim(),
    nombre, categoria:document.getElementById('prod-cat').value.trim(),
    unidad:document.getElementById('prod-unidad').value.trim(),
    precioCosto:parseFloat(document.getElementById('prod-costo').value)||0,
    precioVenta:parseFloat(document.getElementById('prod-venta').value)||0,
    stockAsu:parseFloat(document.getElementById('prod-stock-asu').value)||0,
    stockYpa:parseFloat(document.getElementById('prod-stock-ypa').value)||0,
    stockMin:parseFloat(document.getElementById('prod-min').value)||5,
  };
  if (eid) productos=productos.map(x=>x.id===parseInt(eid)?obj:x); else productos.push(obj);
  saveAll(); closeModal('modal-producto'); toast('Producto guardado'); renderPanel(activePanel); updateSidebar();
}
function delProducto(id) { if(!confirm('¿Eliminar producto?')) return; productos=productos.filter(x=>x.id!==id); saveAll(); toast('Producto eliminado'); renderPanel(activePanel); }

// ═══════════════════════════════
// PROVEEDORES
// ═══════════════════════════════
function renderProveedores() {
  const tb=document.getElementById('tabla-proveedores');
  if (!proveedores.length) { tb.innerHTML=`<tr><td colspan="5"><div class="empty"><div class="icon">🚚</div>Sin proveedores</div></td></tr>`; return; }
  tb.innerHTML=[...proveedores].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).map(p=>`<tr>
    <td style="font-weight:600;color:var(--text)">${he(p.nombre)}</td>
    <td style="font-family:var(--fm);font-size:12px">${he(p.ruc||'—')}</td>
    <td style="font-size:12px">${he(p.tel||'—')}</td>
    <td><span class="badge gray">${he(p.rubro||'—')}</span></td>
    <td><div class="act-group">
      <button class="btn-t gr" onclick="editProveedor(${p.id})">✏</button>
      <button class="btn-t r" onclick="delProveedor(${p.id})">🗑</button>
    </div></td>
  </tr>`).join('');
}
function openModalProveedor() {
  document.getElementById('prov-id').value='';
  document.getElementById('modal-prov-title').textContent='Nuevo Proveedor';
  ['prov-nombre','prov-ruc','prov-tel','prov-email','prov-rubro','prov-dir'].forEach(id=>document.getElementById(id).value='');
  openModal('modal-proveedor');
}
function editProveedor(id) {
  const p=proveedores.find(x=>x.id===id); if(!p) return;
  document.getElementById('prov-id').value=p.id;
  document.getElementById('modal-prov-title').textContent='Editar Proveedor';
  document.getElementById('prov-nombre').value=p.nombre||'';
  document.getElementById('prov-ruc').value=p.ruc||'';
  document.getElementById('prov-tel').value=p.tel||'';
  document.getElementById('prov-email').value=p.email||'';
  document.getElementById('prov-rubro').value=p.rubro||'';
  document.getElementById('prov-dir').value=p.dir||'';
  openModal('modal-proveedor');
}
function saveProveedor() {
  const nombre=document.getElementById('prov-nombre').value.trim();
  if (!nombre) { toast('Ingresá el nombre','w'); return; }
  const eid=document.getElementById('prov-id').value;
  const obj={id:eid?parseInt(eid):Date.now(),nombre,ruc:document.getElementById('prov-ruc').value.trim(),tel:document.getElementById('prov-tel').value.trim(),email:document.getElementById('prov-email').value.trim(),rubro:document.getElementById('prov-rubro').value.trim(),dir:document.getElementById('prov-dir').value.trim()};
  if (eid) proveedores=proveedores.map(x=>x.id===parseInt(eid)?obj:x); else proveedores.push(obj);
  saveAll(); closeModal('modal-proveedor'); toast('Proveedor guardado'); renderPanel(activePanel);
}
function delProveedor(id) { if(!confirm('¿Eliminar proveedor?')) return; proveedores=proveedores.filter(x=>x.id!==id); saveAll(); toast('Proveedor eliminado'); renderPanel(activePanel); }

// ═══════════════════════════════
// VER DOCUMENTO (Presupuesto / Factura)
// ═══════════════════════════════
function verDocumento(tipo, id) {
  let doc, html;
  if (tipo==='presu') {
    doc=presus.find(x=>x.id===id); if(!doc) return;
    html=buildPresupuestoHTML(doc);
    document.getElementById('print-toolbar-title').textContent='📋 Presupuesto '+doc.num;
  } else {
    doc=facturas.find(x=>x.id===id); if(!doc) return;
    html=buildFacturaHTML(doc);
    document.getElementById('print-toolbar-title').textContent='🧾 Factura '+doc.num;
  }
  document.getElementById('print-body').innerHTML=html;
  document.getElementById('share-img-wrap').style.display='none';
  document.getElementById('share-img').src='';
  document.getElementById('print-overlay').classList.add('show');
  window.scrollTo(0,0);
}
function closePrint() {
  document.getElementById('print-overlay').classList.remove('show');
  document.getElementById('share-img-wrap').style.display='none';
}

// ── Fecha larga ──
function fmtFechaLarga(d) {
  if (!d) return '—';
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dt=new Date(d+'T12:00:00');
  return `${meses[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

// ── BUILD PRESUPUESTO HTML (para imprimir/WhatsApp) ──
function buildPresupuestoHTML(p) {
  const cli=clientes.find(x=>x.id===p.clienteId)||{};
  const tots=totalesFromItems(p.items||[]);
  const venc=p.fecha?(() => {const d=new Date(p.fecha+'T00:00:00');d.setDate(d.getDate()+(p.validez||7));return fmtD(d.toISOString().slice(0,10));})():'—';
  return `<style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif}
    body{background:#f5f5f5;color:#222;font-size:13px}
    .wrap{max-width:820px;margin:20px auto;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .hdr{padding:20px 24px;border-bottom:3px solid #27ae60;display:flex;justify-content:space-between;align-items:flex-start;background:#fff}
    .logo-box{width:64px;height:64px;background:#27ae60;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
    .logo-box span{color:rgba(255,255,255,.8);font-size:8px;letter-spacing:1px;text-transform:uppercase}
    .logo-box strong{color:#fff;font-size:15px;font-weight:800}
    .emp h1{font-size:17px;font-weight:800;color:#27ae60;margin-left:14px}
    .emp p{font-size:11px;color:#666;line-height:1.8;margin-left:14px;margin-top:3px}
    .hdr-right{text-align:right}
    .doc-tipo{font-size:10px;font-weight:700;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:4px}
    .doc-num{font-size:20px;font-weight:800;color:#27ae60;border:2px solid #27ae60;padding:4px 14px;border-radius:6px;background:#f0faf4;letter-spacing:1px}
    .doc-fecha{font-size:14px;font-weight:600;color:#222;margin-top:6px}
    .estado-chip{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase}
    .chip-pend{background:#fff3cd;color:#856404;border:1px solid #ffc107}
    .chip-aprob{background:#d1e7dd;color:#0a3622;border:1px solid #198754}
    .info{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #eee}
    .info-col{padding:14px 24px}.info-col:first-child{border-right:1px solid #eee}
    .ir{display:flex;gap:8px;margin-bottom:6px;font-size:12px}
    .il{font-weight:700;color:#555;min-width:90px;flex-shrink:0}
    .iv{color:#222}.iv.lnk{color:#27ae60;font-weight:600}
    .tbl-wrap{padding:14px 24px}
    .tbl{width:100%;border-collapse:collapse;font-size:12px;border:1px solid #ddd}
    .tbl th{background:#27ae60;color:#fff;padding:8px 10px;text-align:left;font-size:11px;font-weight:700}
    .tbl th.r,.tbl td.r{text-align:right}
    .tbl td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
    .tbl tbody tr:nth-child(even) td{background:#f9fcfa}
    .tbl tfoot td{background:#f0faf4;font-weight:700;border-top:2px solid #27ae60;padding:9px 10px}
    .tots{padding:0 24px 18px;display:flex;justify-content:flex-end}
    .tots-box{border:1px solid #ddd;border-radius:8px;overflow:hidden;min-width:290px}
    .tot-row{display:flex;justify-content:space-between;padding:8px 14px;font-size:12px;border-bottom:1px solid #f0f0f0}
    .tot-row:last-child{background:#27ae60;color:#fff;font-size:14px;font-weight:800;border-bottom:none}
    .foot{background:#f5f5f5;border-top:1px solid #e0e0e0;padding:10px 24px;font-size:10px;color:#999;text-align:center}
  </style>
  <div class="wrap">
    <div class="hdr">
      <div style="display:flex;align-items:center">
        <div class="logo-box"><span>Agropecuaria</span><strong>KAVAJU</strong></div>
        <div class="emp"><h1>AGROPECUARIA KAVAJU E.A.S.</h1><p>RUC: 80148174-0 | Sucursal: Casa Matriz | Asunción, Paraguay</p></div>
      </div>
      <div class="hdr-right">
        <div class="doc-tipo">PRESUPUESTO</div>
        <div class="doc-num">${p.num}</div>
        <div class="doc-fecha">${fmtFechaLarga(p.fecha)}</div>
        <div><span class="estado-chip ${p.estado==='aprobado'?'chip-aprob':'chip-pend'}">${(p.estado||'').toUpperCase()}</span></div>
      </div>
    </div>
    <div class="info">
      <div class="info-col">
        <div class="ir"><span class="il">Cliente</span><span class="iv lnk">${he(cli.nombre||'—')}</span></div>
        <div class="ir"><span class="il">RUC / CI</span><span class="iv">${he(cli.ruc||'—')}</span></div>
        <div class="ir"><span class="il">Teléfono</span><span class="iv">${he(cli.tel||'—')}</span></div>
        <div class="ir"><span class="il">Dirección</span><span class="iv">${he(cli.dir||'—')}</span></div>
      </div>
      <div class="info-col">
        <div class="ir"><span class="il">Validez</span><span class="iv">${p.validez||7} días — vence ${venc}</span></div>
        <div class="ir"><span class="il">Moneda</span><span class="iv lnk">Guaraníes</span></div>
        <div class="ir"><span class="il">Cotización</span><span class="iv">Gs. 1,0000</span></div>
        ${p.obs?`<div class="ir"><span class="il">Condiciones</span><span class="iv">${he(p.obs)}</span></div>`:''}
      </div>
    </div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th>#</th><th>Concepto</th><th class="r">Cant.</th><th class="r">Precio Unit.</th><th class="r">Desc.</th><th class="r">Exento</th><th class="r">IVA 10</th></tr></thead>
        <tbody>${(p.items||[]).map((it,i)=>{const c=calcIVA(it.precio,it.cant,it.desc_gs);return`<tr><td>${i+1}</td><td>${he(it.desc||'—')}</td><td class="r">${fmt(it.cant)}×1</td><td class="r">${fmt(it.precio)}</td><td class="r">${fmt(it.desc_gs||0)}</td><td class="r">${fmt(c.exento)}</td><td class="r">${fmt(c.iva)}</td></tr>`;}).join('')}</tbody>
        <tfoot><tr><td colspan="4" style="text-align:right">Sub-Totales</td><td class="r">${fmt(tots.desc||0)}</td><td class="r">${fmt(tots.exento)}</td><td class="r">${fmt(tots.iva)}</td></tr></tfoot>
      </table>
    </div>
    <div class="tots"><div class="tots-box">
      <div class="tot-row"><span>Subtotal Exento:</span><span>Gs. ${fmt(tots.exento)}</span></div>
      <div class="tot-row"><span>IVA 10% (incluido):</span><span>Gs. ${fmt(tots.iva)}</span></div>
      <div class="tot-row"><span>TOTAL:</span><span>Gs. ${fmt(tots.total)}</span></div>
    </div></div>
    <div class="foot">Agropecuaria Kavaju E.A.S. | Presupuesto válido ${p.validez||7} días | No es comprobante fiscal</div>
  </div>`;
}

// ── BUILD FACTURA HTML ──
function buildFacturaHTML(f) {
  const cli=clientes.find(x=>x.id===f.clienteId)||{};
  const tots={exento:f.exento||0,iva:f.iva||0,total:f.total||0};
  return `<style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif}
    body{background:#f5f5f5;color:#222;font-size:13px}
    .wrap{max-width:820px;margin:20px auto;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .hdr{padding:20px 24px;border-bottom:3px solid #27ae60;display:flex;justify-content:space-between;align-items:flex-start}
    .logo-box{width:64px;height:64px;background:#27ae60;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
    .logo-box span{color:rgba(255,255,255,.8);font-size:8px;letter-spacing:1px;text-transform:uppercase}
    .logo-box strong{color:#fff;font-size:15px;font-weight:800}
    .emp{margin-left:14px}.emp h1{font-size:17px;font-weight:800;color:#27ae60}
    .emp p{font-size:11px;color:#666;line-height:1.8;margin-top:3px}
    .emp .timb{font-size:11px;color:#27ae60;font-weight:700;margin-top:3px}
    .hdr-right{text-align:right}
    .doc-tipo{font-size:10px;font-weight:700;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:4px}
    .doc-num{font-size:20px;font-weight:800;color:#27ae60;border:2px solid #27ae60;padding:4px 14px;border-radius:6px;background:#f0faf4;letter-spacing:1px}
    .doc-fecha{font-size:14px;font-weight:600;color:#222;margin-top:6px}
    .info{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #eee}
    .info-col{padding:14px 24px}.info-col:first-child{border-right:1px solid #eee}
    .ir{display:flex;gap:8px;margin-bottom:6px;font-size:12px}
    .il{font-weight:700;color:#555;min-width:100px;flex-shrink:0}
    .iv{color:#222}.iv.lnk{color:#27ae60;font-weight:600}
    .tbl-wrap{padding:14px 24px}
    .tbl{width:100%;border-collapse:collapse;font-size:12px;border:1px solid #ddd}
    .tbl th{background:#27ae60;color:#fff;padding:8px 8px;text-align:left;font-size:11px;font-weight:700}
    .tbl th.r,.tbl td.r{text-align:right}
    .tbl td{padding:8px 8px;border-bottom:1px solid #f0f0f0}
    .tbl tbody tr:nth-child(even) td{background:#f9fcfa}
    .sub-hdr{background:#e8f5e9;font-size:10px;font-weight:700;color:#27ae60}
    .tots{padding:0 24px 18px;display:flex;justify-content:flex-end}
    .tots-box{border:1px solid #ddd;border-radius:8px;overflow:hidden;min-width:290px}
    .tot-row{display:flex;justify-content:space-between;padding:8px 14px;font-size:12px;border-bottom:1px solid #f0f0f0}
    .tot-cobrar{background:#27ae60;color:#fff;font-size:14px;font-weight:800;border-bottom:none}
    .foot{background:#f5f5f5;border-top:1px solid #e0e0e0;padding:10px 24px;font-size:10px;color:#999;text-align:center}
  </style>
  <div class="wrap">
    <div class="hdr">
      <div style="display:flex;align-items:center">
        <div class="logo-box"><span>Agropecuaria</span><strong>KAVAJU</strong></div>
        <div class="emp">
          <h1>AGROPECUARIA KAVAJU E.A.S.</h1>
          <p>80148174-0 | Sucursal: Casa Matriz | Punto de Venta: Caja 1</p>
          ${f.timbrado?`<div class="timb">Timbrado N°: ${he(f.timbrado)}</div>`:''}
        </div>
      </div>
      <div class="hdr-right">
        <div class="doc-tipo">FACTURA</div>
        <div class="doc-num">${f.num}</div>
        <div class="doc-fecha">${fmtFechaLarga(f.fecha)}</div>
      </div>
    </div>
    <div class="info">
      <div class="info-col">
        <div class="ir"><span class="il">Cliente</span><span class="iv lnk">${he(cli.nombre||'—')}</span></div>
        <div class="ir"><span class="il">RUC / CI</span><span class="iv">${he(cli.ruc||'—')}</span></div>
        <div class="ir"><span class="il">Ámbito</span><span class="iv">Ámbito Fiscal</span></div>
        ${f.vendedor?`<div class="ir"><span class="il">Vendedor</span><span class="iv lnk">${he(f.vendedor)}</span></div>`:''}
        <div class="ir"><span class="il">Cód. Timbrado</span><span class="iv lnk">${he(f.timbrado||'—')}</span></div>
      </div>
      <div class="info-col">
        <div class="ir"><span class="il">Términos de Pago</span><span class="iv">${f.condicion==='credito'?'Crédito':'Contado'}</span></div>
        <div class="ir"><span class="il">Moneda</span><span class="iv lnk">Guaraníes</span></div>
        <div class="ir"><span class="il">Cotización</span><span class="iv">Gs. 1,0000</span></div>
        <div class="ir"><span class="il">Estado</span><span class="iv">Aprobado</span></div>
        <div class="ir"><span class="il">Tipo de Operación</span><span class="iv">Venta de mercadería</span></div>
        <div class="ir"><span class="il">Entrega</span><span class="iv">${fmtD(f.fecha)} 12:00:00</span></div>
      </div>
    </div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>#</th><th>Concepto</th><th class="r">Cantidad</th>
            <th class="r">Precio Unit.</th><th class="r">Descuento</th>
            <th colspan="2" style="text-align:center">Subtotales</th>
            <th class="r">Impuestos</th>
          </tr>
          <tr class="sub-hdr">
            <td colspan="5"></td>
            <td class="r" style="padding:4px 8px">Exento</td>
            <td class="r" style="padding:4px 8px">IVA 10</td>
            <td class="r" style="padding:4px 8px">IVA 10</td>
          </tr>
        </thead>
        <tbody>${(f.items||[]).map((it,i)=>{const c=calcIVA(it.precio,it.cant,it.desc_gs);return`<tr><td>${i+1}</td><td style="font-weight:600;color:#27ae60">${he(it.desc||'—')}</td><td class="r">${fmt(it.cant)}×1</td><td class="r">${fmt(it.precio)}</td><td class="r">${fmt(it.desc_gs||0)}</td><td class="r">0</td><td class="r">${fmt(c.exento)}</td><td class="r">${fmt(c.iva)}</td></tr>`;}).join('')}</tbody>
        <tfoot>
          <tr style="background:#e8f5e9"><td colspan="4" style="text-align:right;font-weight:700;padding:9px 8px">Sub-Totales</td><td class="r" style="font-weight:700">${fmt(tots.desc||0)}</td><td class="r" style="font-weight:700">0</td><td class="r" style="font-weight:700">${fmt(tots.exento)}</td><td class="r" style="font-weight:700">${fmt(tots.iva)}</td></tr>
          <tr style="background:#f0faf4"><td colspan="6" style="text-align:right;font-weight:800;font-size:13px;padding:9px 8px">Total</td><td class="r" style="font-weight:800">Gs.${fmt(tots.exento)}</td><td class="r" style="font-weight:800">Gs.${fmt(tots.iva)}</td></tr>
          <tr style="background:#27ae60"><td colspan="6" style="text-align:right;font-weight:800;color:#fff;font-size:14px;padding:10px 8px">A Cobrar</td><td colspan="2" class="r" style="font-weight:800;color:#fff;font-size:16px">Gs.${fmt(tots.total)}</td></tr>
        </tfoot>
      </table>
    </div>
    ${f.obs?`<div style="padding:0 24px 14px;font-size:12px;color:#555"><strong>Obs:</strong> ${he(f.obs)}</div>`:''}
    <div class="foot">Agropecuaria Kavaju E.A.S. | RUC: 80148174-0 | Asunción, Paraguay | Comprobante fiscal</div>
  </div>`;
}

// ═══════════════════════════════
// IMAGEN WHATSAPP
// ═══════════════════════════════
function generarImagen() {
  const btn=document.getElementById('btn-share-img');
  btn.textContent='⏳ Generando...'; btn.disabled=true;
  function loadScript(src,cb){
    if(document.querySelector(`script[src="${src}"]`)){cb();return;}
    const s=document.createElement('script');s.src=src;
    s.onload=cb;s.onerror=()=>{toast('Error cargando html2canvas','e');btn.textContent='📲 Imagen WhatsApp';btn.disabled=false;};
    document.head.appendChild(s);
  }
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',()=>{
    const el=document.getElementById('print-body');
    html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,windowWidth:860}).then(canvas=>{
      const imgData=canvas.toDataURL('image/jpeg',.93);
      document.getElementById('share-img-wrap').style.display='block';
      document.getElementById('share-img').src=imgData;
      canvas.toBlob(blob=>{
        if(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([blob],'kavaju.jpg',{type:'image/jpeg'})]})){
          navigator.share({files:[new File([blob],'kavaju.jpg',{type:'image/jpeg'})],title:'Kavaju'}).catch(()=>{});
        }
      },'image/jpeg',.93);
      btn.textContent='📲 Imagen WhatsApp'; btn.disabled=false;
      toast('✓ Mantené presionada la imagen para compartir');
      setTimeout(()=>document.getElementById('share-img-wrap').scrollIntoView({behavior:'smooth'}),200);
    }).catch(()=>{btn.textContent='📲 Imagen WhatsApp';btn.disabled=false;toast('Error al generar imagen','e');});
  });
}

// ═══════════════════════════════
// DATOS DEMO
// ═══════════════════════════════
function cargarDemo() {
  if (clientes.length||productos.length) return;
  clientes=[
    {id:1001,nombre:'Cooperativa Agroindustrial Madelon Ltda.',ruc:'80123456-7',tel:'0981 111 222',email:'madelon@demo.py',dir:'Chaco Central'},
    {id:1002,nombre:'Ganadera Tinfunque S.A.',ruc:'80234567-8',tel:'0981 333 444',email:'tinfunque@demo.py',dir:'Alto Paraguay'},
    {id:1003,nombre:'Estancia San Luis S.R.L.',ruc:'80345678-9',tel:'0981 555 666',email:'sanluis@demo.py',dir:'Concepción'},
    {id:1004,nombre:'Juan Pérez',ruc:'3456789-1',tel:'0981 777 888',email:'jperez@demo.py',dir:'Asunción'},
  ];
  proveedores=[
    {id:5001,nombre:'Lab. Drag Pharma',ruc:'80500001-0',tel:'0981 500 100',email:'dragpharma@py',rubro:'Veterinaria',dir:'Asunción'},
    {id:5002,nombre:'Importadora Vet Sur',ruc:'80500002-1',tel:'0981 500 200',email:'vetsur@py',rubro:'Veterinaria',dir:'Encarnación'},
    {id:5003,nombre:'COPETROL',ruc:'80500003-2',tel:'0981 500 300',email:'copetrol@py',rubro:'Combustible',dir:'Asunción'},
  ];
  productos=[
    {id:2001,codigo:'PRD-001',nombre:'Terracotril Spray',categoria:'Antiinfeccioso',unidad:'500ml',precioCosto:56000,precioVenta:70000,stockAsu:28,stockYpa:14,stockMin:10},
    {id:2002,codigo:'PRD-002',nombre:'Promectina Plus 3.15%',categoria:'Antiparasitario',unidad:'L',precioCosto:112000,precioVenta:140000,stockAsu:18,stockYpa:10,stockMin:8},
    {id:2003,codigo:'PRD-003',nombre:'Dorax 1%',categoria:'Antiparasitario',unidad:'L',precioCosto:288000,precioVenta:360000,stockAsu:8,stockYpa:4,stockMin:5},
    {id:2004,codigo:'PRD-004',nombre:'Terramicina L.A. 50ml',categoria:'Antibiótico',unidad:'50ml',precioCosto:30400,precioVenta:38000,stockAsu:2,stockYpa:1,stockMin:10},
    {id:2005,codigo:'PRD-005',nombre:'Vac-Sules Trivac',categoria:'Vacuna',unidad:'Dosis',precioCosto:1500,precioVenta:1856,stockAsu:0,stockYpa:0,stockMin:50},
    {id:2006,codigo:'PRD-006',nombre:'AZ+Cu Von Franken',categoria:'Mineral',unidad:'500ml',precioCosto:120000,precioVenta:150000,stockAsu:12,stockYpa:6,stockMin:6},
    {id:2007,codigo:'PRD-007',nombre:'Engordan 500ml',categoria:'Promotor',unidad:'500ml',precioCosto:108000,precioVenta:130000,stockAsu:15,stockYpa:7,stockMin:8},
  ];
  const m=new Date().toISOString().slice(0,7);
  const mp=new Date(new Date().getFullYear(),new Date().getMonth()-1,1).toISOString().slice(0,7);
  const f1Items=[
    {id:9101,prodId:2001,desc:'Terracotril Spray',cant:6,precio:70000,desc_gs:0},
    {id:9102,prodId:2002,desc:'Podocuran Sulfato Cobre',cant:2,precio:60000,desc_gs:0},
    {id:9103,prodId:2004,desc:'Terramicina L.A. x 50ml',cant:25,precio:38000,desc_gs:0},
    {id:9104,prodId:2007,desc:'Engordan x 500ml',cant:12,precio:130000,desc_gs:0},
  ];
  const t1=totalesFromItems(f1Items);
  const f2Items=[{id:9201,prodId:2006,desc:'AZ+Cu Von Franken x12',cant:12,precio:150000,desc_gs:0}];
  const t2=totalesFromItems(f2Items);
  const f3Items=[{id:9301,prodId:2005,desc:'Vac-Sules Trivac x100',cant:100,precio:1856,desc_gs:0}];
  const t3=totalesFromItems(f3Items);
  presus=[{id:8001,num:'PRES-0001',clienteId:1001,fecha:`${m}-05`,validez:7,obs:'Precios sujetos a stock disponible',items:[
    {id:9001,prodId:2001,desc:'Terracotril Spray',cant:6,precio:70000,desc_gs:0},
    {id:9002,prodId:2002,desc:'Promectina Plus',cant:12,precio:140000,desc_gs:0},
    {id:9003,prodId:2003,desc:'Dorax 1L',cant:5,precio:360000,desc_gs:0},
  ],...totalesFromItems([{prodId:2001,desc:'Terracotril Spray',cant:6,precio:70000,desc_gs:0},{prodId:2002,desc:'Promectina Plus',cant:12,precio:140000,desc_gs:0},{prodId:2003,desc:'Dorax 1L',cant:5,precio:360000,desc_gs:0}]),estado:'pendiente',facturadoId:null}];
  facturas=[
    {id:4001,num:'001-001-0001790',timbrado:'16851126',vendedor:'Nestor Vera',clienteId:1001,fecha:`${m}-08`,items:f1Items,...t1,condicion:'credito',diasCredito:30,fechaVenc:`${m}-08`,obs:'',estado:'pendiente',pagado:500000,saldo:t1.total-500000,pagos:[{monto:500000,fecha:`${m}-10`,obs:'Abono inicial'}],pedidoId:null,presuId:null},
    {id:4002,num:'001-001-0001789',timbrado:'16851126',vendedor:'Martín López',clienteId:1002,fecha:`${m}-01`,items:f2Items,...t2,condicion:'contado',diasCredito:0,fechaVenc:'',obs:'',estado:'pagada',pagado:t2.total,saldo:0,pagos:[],pedidoId:null,presuId:null},
    {id:4003,num:'001-001-0001785',timbrado:'16851126',vendedor:'Martín López',clienteId:1003,fecha:`${mp}-20`,items:f3Items,...t3,condicion:'credito',diasCredito:15,fechaVenc:`${mp}-05`,obs:'',estado:'pendiente',pagado:0,saldo:t3.total,pagos:[],pedidoId:null,presuId:null},
  ];
  pedidos=[
    {id:3001,num:'PED-00001',clienteId:1002,fecha:`${m}-12`,prodId:2002,deposito:'asuncion',detalle:'Promectina Plus x10',cantidad:10,precio:140000,monto:1400000,obs:'Urgente',estado:'pendiente',facturadoId:null},
    {id:3002,num:'PED-00002',clienteId:1004,fecha:`${m}-10`,prodId:2003,deposito:'ypacarai',detalle:'Dorax 1L x3',cantidad:3,precio:360000,monto:1080000,obs:'',estado:'entregado',facturadoId:null},
  ];
  gastos=[
    {id:6001,num:'GST-00001',fecha:`${m}-03`,categoria:'proveedor',concepto:'Compra Terracotril 48 unidades',proveedorId:5001,monto:2688000,nrofac:'F-00120',obs:'',estado:'pagado'},
    {id:6002,num:'GST-00002',fecha:`${m}-05`,categoria:'operativo',concepto:'Combustible camioneta delivery',proveedorId:5003,monto:350000,nrofac:'',obs:'Ruta Asunción-Ypacararaí',estado:'pagado'},
    {id:6003,num:'GST-00003',fecha:`${m}-10`,categoria:'operativo',concepto:'Alquiler depósito Ypacararaí',proveedorId:null,monto:500000,nrofac:'',obs:'Mes de mayo',estado:'pendiente'},
  ];
  counters={presu:2,ped:3,fac:4,gasto:4};
  saveAll();
}

// ═══════════════════════════════
// INIT
// ═══════════════════════════════
function init() {
  load();
  cargarDemo();
  // click outside para cerrar modales
  document.querySelectorAll('.modal-overlay').forEach(mo => {
    mo.addEventListener('click', e => { if(e.target===mo) mo.classList.remove('open'); });
  });
  facCondChanged();
  goPanel('dashboard');
}

init();
/* ═══════════════════════════════
   JSONBIN SYNC — KAVAJU ERP
═══════════════════════════════ */

function getERPData(){
  return {
    presus,
    pedidos,
    facturas,
    clientes,
    productos,
    proveedores,
    gastos,
    counters
  };
}

function setERPData(data){
  if(!data) return;

  presus      = data.presus      || [];
  pedidos     = data.pedidos     || [];
  facturas    = data.facturas    || [];
  clientes    = data.clientes    || [];
  productos   = data.productos   || [];
  proveedores = data.proveedores || [];
  gastos      = data.gastos      || [];
  counters    = data.counters    || counters;

  saveAll();

  renderPanel(activePanel);
  updateSidebar();

  toast("Datos cargados desde JSONBin ✓");
}

async function cargarDesdeNube(){
  const data = await loadCloud();

  if(data && Object.keys(data).length){
    setERPData(data);
  }else{
    await saveCloud(getERPData());
    toast("Base inicial subida a JSONBin ✓");
  }
}

const saveAllLocal = saveAll;

saveAll = function(){
  saveAllLocal();

  if(typeof saveCloud === "function"){
    saveCloud(getERPData());
  }
};

setTimeout(()=>{
  cargarDesdeNube();
},800);
