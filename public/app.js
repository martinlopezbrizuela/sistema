const BIN_ID = '6a090b2fadc21f119aaf5293';
const API_KEY = '$2a$10$7rFsw/Rs1i.Z39Kt2LYdVuNmfJc0OR5xy706GRKw28q1wUi3tVChK';
let presupuestos = [];
let pedidos = [];
let facturas = [];
let gastos = [];
let clientes = [];
let productos = [];
let proveedores = [];
let activePanel = 'dashboard';

const topbarMap = {
  presupuestos: { lbl: '＋ Nuevo', fn: 'openModalPresupuesto' },
  pedidos: { lbl: '＋ Nuevo', fn: 'openModalPedido' },
  facturas: { lbl: '＋ Nuevo', fn: 'openModalFactura' },
  gastos: { lbl: '＋ Nuevo', fn: 'openModalGasto' },
  clientes: { lbl: '＋ Nuevo', fn: 'openModalCliente' },
  productos: { lbl: '＋ Nuevo', fn: 'openModalProducto' },
  proveedores: { lbl: '＋ Nuevo', fn: 'openModalProveedor' },
};

function fmt(n)   { return Math.round(n || 0).toLocaleString('es-PY'); }
function fmtD(d)  { if (!d) return '—'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function today()  { return new Date().toISOString().slice(0,10); }
function he(s)    { if (s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mesActual() { return new Date().toISOString().slice(0,7); }
function nomCli(id) { const c=clientes.find(x=>x.id===id); return c?c.nombre:'—'; }
function nomProd(id){ const p=productos.find(x=>x.id===id); return p?p.nombre:'—'; }
function nomProv(id){ const p=proveedores.find(x=>x.id===id); return p?p.nombre:'—'; }
function stockTotal(p) { return Number(p.stockAsu||0)+Number(p.stockYpa||0); }
function toast(msg, tipo='s') { const w=document.getElementById('toast-wrap'); const t=document.createElement('div'); t.className='toast-item '+tipo; t.textContent=msg; w.appendChild(t); setTimeout(()=>t.remove(),4000); }
function showLoading(show=true) { const b=document.getElementById('lbar'); if(show) b.style.width='75%'; else { b.style.width='0'; } }

function badgePed(e)  { const m={pendiente:'amber',entregado:'green',cancelado:'gray'}; const l={pendiente:'Pendiente',entregado:'Entregado',cancelado:'Cancelado'}; return `<span class="badge ${m[e]||'gray'}">${l[e]||e}</span>`; }
function badgeFac(e)  { const m={pagada:'green',pendiente:'amber',pago_parcial:'blue'}; const l={pagada:'Pagada',pendiente:'Pendiente',pago_parcial:'Parcial'}; return `<span class="badge ${m[e]||'gray'}">${l[e]||e}</span>`; }
function badgePresu(e){ const m={pendiente:'amber',aprobado:'green',rechazado:'red',facturado:'blue'}; const l={pendiente:'Pendiente',aprobado:'Aprobado',rechazado:'Rechazado',facturado:'Facturado'}; return `<span class="badge ${m[e]||'gray'}">${l[e]||e}</span>`; }
function badgeGasto(e){ const m={pagado:'green',pendiente:'amber'}; const l={pagado:'Pagado',pendiente:'Pendiente'}; return `<span class="badge ${m[e]||'gray'}">${l[e]||e}</span>`; }

function initApp() {
  loadAll();
  renderDashboard();
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m.id);
    });
  });
  document.getElementById('global-search').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.toLowerCase();
      if (!q) return;
      searchGlobal(q);
    }
  });
}

function goPanel(panel) {
  activePanel = panel;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + panel).classList.add('active');
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  const sbi = document.getElementById('sb-' + panel);
  if (sbi) sbi.classList.add('active');
  const tb = topbarMap[panel];
  const b = document.getElementById('topbar-new-btn');
  if (b.lbl) { b.style.display='flex'; b.textContent=tb.lbl; b.onclick=()=>window[tb.fn]&&window[tb.fn](); }
  else { b.style.display='none'; }
  renderPanel(panel);
}

function topbarNew() { const bm=topbarMap[activePanel]; if(bm&&bm.fn&&window[bm.fn]) window[bm.fn](); }

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function renderDashboard() {
  const kpis = [
    { lbl: 'Presupuestos', val: presupuestos.length, color: 'blue', ico: '📋' },
    { lbl: 'Pedidos Pendientes', val: pedidos.filter(x=>x.estado==='pendiente').length, color: 'amber', ico: '📦' },
    { lbl: 'Cuentas x Cobrar', val: facturas.filter(x=>x.estado!=='pagada').length, color: 'red', ico: '💰' },
    { lbl: 'Total Clientes', val: clientes.length, color: 'green', ico: '👥' },
  ];
  const kh = kpis.map(k => `<div class="kpi-card ${k.color}"><div class="kpi-label">${k.lbl}</div><div class="kpi-val ${k.color}">${fmt(k.val)}</div><div class="kpi-ico">${k.ico}</div></div>`).join('');
  document.getElementById('dash-kpis').innerHTML = kh;
  renderCharts();
}

function renderCharts() {
  const months = ['Ene','Feb','Mar','Abr','May','Jun'];
  const data = months.map(() => Math.floor(Math.random()*1000000));
  const max = Math.max(...data);
  const bc = data.map((v,i) => `<div class="bar-col"><div class="bar active-bar" style="height:${(v/max)*100}%"><span class="bval">${fmt(v)}</span></div></div>`).join('');
  const bl = months.map(m => `<span style="font-size:11px;color:var(--text3)">${m}</span>`).join('');
  document.getElementById('dash-chart').innerHTML = bc;
  document.getElementById('dash-chart-labels').innerHTML = bl;
  const pieData = [{l:'Pagadas',v:10,c:'#2E9E5B'},{l:'Pendientes',v:15,c:'#D94040'},{l:'Parciales',v:8,c:'#2563EB'}];
  const pieW = 80, pieH = 80;
  let svg = `<svg class="pie-svg" width="${pieW}" height="${pieH}" viewBox="0 0 ${pieW} ${pieH}">`;
  let angle = -90;
  pieData.forEach(d => {
    const slice = (d.v/33)*360;
    const rad = (Math.PI * slice) / 180;
    const x1 = 40 + 30*Math.cos((angle*Math.PI)/180);
    const y1 = 40 + 30*Math.sin((angle*Math.PI)/180);
    const x2 = 40 + 30*Math.cos(((angle+slice)*Math.PI)/180);
    const y2 = 40 + 30*Math.sin(((angle+slice)*Math.PI)/180);
    const large = slice > 180 ? 1 : 0;
    svg += `<path d="M 40 40 L ${x1} ${y1} A 30 30 0 ${large} 1 ${x2} ${y2} Z" fill="${d.c}" />`;
    angle += slice;
  });
  svg += '</svg>';
  const pieL = pieData.map(d => `<div class="pie-leg-item"><div class="pie-dot" style="background:${d.c}"></div><span>${d.l}</span></div>`).join('');
  document.getElementById('dash-pie').innerHTML = `${svg}<div class="pie-legend">${pieL}</div>`;
}

function renderPanel(panel) {
  if(panel==='presupuestos') renderPresupuestos();
  else if(panel==='pedidos') renderPedidos();
  else if(panel==='facturas') renderFacturas();
  else if(panel==='cobrar') renderCobrar();
  else if(panel==='gastos') renderGastos();
  else if(panel==='stock') renderStock();
  else if(panel==='clientes') renderClientes();
  else if(panel==='productos') renderProductos();
  else if(panel==='proveedores') renderProveedores();
}

function renderPresupuestos() {
  const rows = presupuestos.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${fmtD(p.fecha)}</td>
      <td>${he(nomCli(p.cliente))}</td>
      <td>${(p.items||[]).length}</td>
      <td class="r">${fmt(p.exento)}</td>
      <td class="r">${fmt(p.iva)}</td>
      <td class="r">${fmt(p.total)}</td>
      <td>${badgePresu(p.estado)}</td>
      <td><div class="act-group"><button class="btn-t g" onclick="editPresupuesto(${p.id})">✏</button><button class="btn-t r" onclick="delPresupuesto(${p.id})">🗑</button></div></td>
    </tr>
  `).join('');
  document.getElementById('tabla-presupuestos').innerHTML = rows || '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text3)">Sin presupuestos registrados</td></tr>';
}

function renderPedidos() {
  const rows = pedidos.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${fmtD(p.fecha)}</td>
      <td>${he(nomCli(p.cliente))}</td>
      <td>${he(p.detalle)}</td>
      <td class="r">${fmt(p.cantidad)}</td>
      <td class="r">${fmt(p.monto)}</td>
      <td>${badgePed(p.estado)}</td>
      <td><div class="act-group"><button class="btn-t g" onclick="editPedido(${p.id})">✏</button><button class="btn-t r" onclick="delPedido(${p.id})">🗑</button></div></td>
    </tr>
  `).join('');
  document.getElementById('tabla-pedidos').innerHTML = rows || '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)">Sin pedidos registrados</td></tr>';
}

function renderFacturas() {
  const rows = facturas.map(f => `
    <tr>
      <td>${f.numero}</td>
      <td>${f.timbrado}</td>
      <td>${fmtD(f.fecha)}</td>
      <td>${he(nomCli(f.cliente))}</td>
      <td class="r">${fmt(f.exento)}</td>
      <td class="r">${fmt(f.iva)}</td>
      <td class="r">${fmt(f.total)}</td>
      <td>${f.condicion==='contado'?'Contado':'Crédito'}</td>
      <td>${fmtD(f.vencimiento)}</td>
      <td><div class="act-group"><button class="btn-t g" onclick="editFactura(${f.id})">✏</button><button class="btn-t r" onclick="delFactura(${f.id})">🗑</button></div></td>
    </tr>
  `).join('');
  document.getElementById('tabla-facturas').innerHTML = rows || '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text3)">Sin facturas registradas</td></tr>';
}

function renderCobrar() {
  const resumen = `<div class="dep-grid"><div class="dep-card"><div class="dep-name">Total a Cobrar</div><div class="dep-num">Gs.${fmt(facturas.filter(f=>f.estado!=='pagada').reduce((a,f)=>a+f.total,0))}</div></div></div>`;
  document.getElementById('cobrar-resumen').innerHTML = resumen;
  const rows = facturas.filter(f=>f.estado!=='pagada').map(f => `
    <tr>
      <td>${f.numero}</td>
      <td>${he(nomCli(f.cliente))}</td>
      <td class="r">${fmt(f.total)}</td>
      <td class="r">${fmt(f.pagado||0)}</td>
      <td class="r">${fmt((f.saldo||f.total))}</td>
      <td>${fmtD(f.vencimiento)}</td>
      <td><span class="mora-chip ${(new Date(f.vencimiento)<new Date())?'late':((new Date(f.vencimiento)-new Date())<86400000)?'warn':'ok'}">${(new Date(f.vencimiento)<new Date())?'Vencida':((new Date(f.vencimiento)-new Date())<86400000)?'Por vencer':'Al día'}</span></td>
      <td>${badgeFac(f.estado)}</td>
      <td><button class="btn-t b" onclick="openPagoModal(${f.id})">💰 Pago</button></td>
    </tr>
  `).join('');
  document.getElementById('tabla-cobrar').innerHTML = rows || '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text3)">Sin cuentas pendientes</td></tr>';
}

function renderGastos() {
  const rows = gastos.map(g => `
    <tr>
      <td>${g.id}</td>
      <td>${fmtD(g.fecha)}</td>
      <td>${he(g.categoria)}</td>
      <td>${he(g.concepto)}</td>
      <td>${he(nomProv(g.proveedor))}</td>
      <td class="r">${fmt(g.monto)}</td>
      <td>${badgeGasto(g.estado)}</td>
      <td><div class="act-group"><button class="btn-t g" onclick="editGasto(${g.id})">✏</button><button class="btn-t r" onclick="delGasto(${g.id})">🗑</button></div></td>
    </tr>
  `).join('');
  document.getElementById('tabla-gastos').innerHTML = rows || '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)">Sin gastos registrados</td></tr>';
}

function renderStock() {
  const rows = productos.map(p => {
    const total = stockTotal(p);
    const bajo = total <= (p.minimo||5);
    return `
      <tr ${bajo?'style="background:rgba(217,64,64,.05)"':''}>
        <td>${he(p.codigo||'—')}</td>
        <td>${he(p.nombre)}</td>
        <td>${he(p.categoria||'—')}</td>
        <td class="r">${fmt(p.stockAsu||0)}</td>
        <td class="r">${fmt(p.stockYpa||0)}</td>
        <td class="r" style="font-weight:600;color:${bajo?'var(--red)':'var(--text2)'}">${fmt(total)}</td>
        <td class="r" style="color:var(--text3)">${fmt(p.minimo||0)}</td>
        <td class="r">${fmt(p.precioVenta||0)}</td>
        <td><button class="btn-t br" onclick="openStockAjuste(${p.id})">📝 Ajuste</button></td>
      </tr>
    `;
  }).join('');
  document.getElementById('tabla-stock').innerHTML = rows || '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text3)">Sin productos en inventario</td></tr>';
}

function renderClientes() {
  const rows = clientes.map(c => `
    <tr>
      <td>${he(c.nombre)}</td>
      <td>${he(c.ruc||'—')}</td>
      <td>${he(c.telefono||'—')}</td>
      <td>${he(c.email||'—')}</td>
      <td>${he(c.direccion||'—')}</td>
      <td><div class="act-group"><button class="btn-t g" onclick="editCliente(${c.id})">✏</button><button class="btn-t r" onclick="delCliente(${c.id})">🗑</button></div></td>
    </tr>
  `).join('');
  document.getElementById('tabla-clientes').innerHTML = rows || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3)">Sin clientes registrados</td></tr>';
}

function renderProductos() {
  const rows = productos.map(p => `
    <tr>
      <td>${he(p.codigo||'—')}</td>
      <td>${he(p.nombre)}</td>
      <td>${he(p.categoria||'—')}</td>
      <td class="r">${fmt(p.precioCosto||0)}</td>
      <td class="r">${fmt(p.precioVenta||0)}</td>
      <td class="r">${fmt(p.stockAsu||0)}</td>
      <td class="r">${fmt(p.stockYpa||0)}</td>
      <td><div class="act-group"><button class="btn-t g" onclick="editProducto(${p.id})">✏</button><button class="btn-t r" onclick="delProducto(${p.id})">🗑</button></div></td>
    </tr>
  `).join('');
  document.getElementById('tabla-productos').innerHTML = rows || '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)">Sin productos registrados</td></tr>';
}

function renderProveedores() {
  const rows = proveedores.map(p => `
    <tr>
      <td>${he(p.nombre)}</td>
      <td>${he(p.ruc||'—')}</td>
      <td>${he(p.telefono||'—')}</td>
      <td>${he(p.rubro||'—')}</td>
      <td><div class="act-group"><button class="btn-t g" onclick="editProveedor(${p.id})">✏</button><button class="btn-t r" onclick="delProveedor(${p.id})">🗑</button></div></td>
    </tr>
  `).join('');
  document.getElementById('tabla-proveedores').innerHTML = rows || '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text3)">Sin proveedores registrados</td></tr>';
}

function savePresupuesto() {
  const id = Number(document.getElementById('presu-id').value) || Date.now();
  const p = { id, cliente: Number(document.getElementById('presu-cliente').value), fecha: document.getElementById('presu-fecha').value||today(), numero: document.getElementById('presu-num').value, validez: Number(document.getElementById('presu-validez').value)||7, observaciones: document.getElementById('presu-obs').value, items: [] };
  document.querySelectorAll('#presu-items-body .item-row').forEach(r => {
    const producto = r.querySelector('[data-col="prod"]').value; const cantidad = Number(r.querySelector('[data-col="cant"]').value)||0; const precio = Number(r.querySelector('[data-col="precio"]').value)||0;
    p.items.push({ producto, cantidad, precio });
  });
  const tots = totalesFromItems(p.items);
  p.exento = tots.exento; p.iva = tots.iva; p.total = tots.total; p.estado = 'pendiente';
  const idx = presupuestos.findIndex(x=>x.id===id);
  if(idx>=0) presupuestos[idx] = p; else presupuestos.push(p);
  saveAll(); toast('Presupuesto guardado'); closeModal('modal-presupuesto'); renderPanel('presupuestos');
}

function totalesFromItems(items) { let exento=0, iva=0; (items||[]).forEach(i => { const subtotal = i.cantidad*i.precio; iva += subtotal*0.1; exento += subtotal*0.9; }); return { exento: Math.round(exento), iva: Math.round(iva), total: Math.round(exento+iva) }; }

function editPresupuesto(id) { const p = presupuestos.find(x=>x.id===id); if(!p) return; document.getElementById('presu-id').value=id; document.getElementById('presu-cliente').value=p.cliente; document.getElementById('presu-fecha').value=p.fecha; document.getElementById('presu-num').value=p.numero; document.getElementById('presu-validez').value=p.validez; document.getElementById('presu-obs').value=p.observaciones; renderItemsTable('presu', p.items||[]); openModal('modal-presupuesto'); }

function delPresupuesto(id) { if(!confirm('¿Eliminar presupuesto?')) return; presupuestos = presupuestos.filter(x=>x.id!==id); saveAll(); toast('Presupuesto eliminado'); renderPanel('presupuestos'); }

function addItemRow(type) {
  const tbody = document.getElementById(type + '-items-body');
  const r = document.createElement('div'); r.className = 'item-row';
  r.innerHTML = `
    <div class="item-cell"><input type="text" data-col="prod" placeholder="Producto..."/></div>
    <div class="item-cell"><input type="number" data-col="cant" min="1" value="1" class="tc" oninput="calcItemTotals('${type}')"/></div>
    <div class="item-cell"><input type="number" data-col="precio" min="0" value="0" class="tr" oninput="calcItemTotals('${type}')"/></div>
    <div class="item-cell"><input type="number" data-col="desc" min="0" value="0" class="tr" oninput="calcItemTotals('${type}')"/></div>
    <div class="item-cell"><span class="item-readonly tr">0</span></div>
    <button class="item-del-btn" onclick="this.parentElement.remove();calcItemTotals('${type}')">✕</button>
  `;
  tbody.appendChild(r);
}

function calcItemTotals(type) {
  const tbody = document.getElementById(type + '-items-body');
  let totExento=0, totIva=0;
  tbody.querySelectorAll('.item-row').forEach(r => {
    const cant = Number(r.querySelector('[data-col="cant"]').value)||0;
    const precio = Number(r.querySelector('[data-col="precio"]').value)||0;
    const desc = Number(r.querySelector('[data-col="desc"]').value)||0;
    const subtotal = (cant*precio)-desc;
    const iva_line = subtotal*0.1;
    const exento_line = subtotal*0.9;
    r.querySelector('.item-readonly').textContent = fmt(subtotal);
    totExento += exento_line;
    totIva += iva_line;
  });
  const totBox = document.getElementById(type + '-totals');
  totBox.innerHTML = `
    <div class="total-line"><span>Exento</span><span>Gs. ${fmt(totExento)}</span></div>
    <div class="total-line"><span>IVA 10%</span><span class="item-readonly iva">Gs. ${fmt(totIva)}</span></div>
    <div class="total-line grand"><span>TOTAL</span><span>Gs. ${fmt(totExento+totIva)}</span></div>
  `;
}

function renderItemsTable(type, items) {
  const tbody = document.getElementById(type + '-items-body');
  tbody.innerHTML = '';
  (items||[]).forEach(item => {
    const r = document.createElement('div'); r.className = 'item-row';
    r.innerHTML = `
      <div class="item-cell"><input type="text" data-col="prod" value="${he(item.producto)}" placeholder="Producto..."/></div>
      <div class="item-cell"><input type="number" data-col="cant" min="1" value="${item.cantidad}" class="tc" oninput="calcItemTotals('${type}')"/></div>
      <div class="item-cell"><input type="number" data-col="precio" min="0" value="${item.precio}" class="tr" oninput="calcItemTotals('${type}')"/></div>
      <div class="item-cell"><input type="number" data-col="desc" min="0" value="0" class="tr" oninput="calcItemTotals('${type}')"/></div>
      <div class="item-cell"><span class="item-readonly tr">${fmt(item.cantidad*item.precio)}</span></div>
      <button class="item-del-btn" onclick="this.parentElement.remove();calcItemTotals('${type}')">✕</button>
    `;
    tbody.appendChild(r);
  });
  calcItemTotals(type);
}

function openModalPresupuesto() { document.getElementById('presu-id').value=''; document.getElementById('presu-num').value='PRE-'+Date.now().toString().slice(-6); document.getElementById('presu-cliente').innerHTML = clientes.map(c => `<option value="${c.id}">${he(c.nombre)}</option>`).join(''); document.getElementById('presu-fecha').value = today(); document.getElementById('presu-items-body').innerHTML=''; addItemRow('presu'); openModal('modal-presupuesto'); }

function savePedido() { const id = Number(document.getElementById('ped-id').value) || Date.now(); const p = { id, cliente: Number(document.getElementById('ped-cliente').value), fecha: document.getElementById('ped-fecha').value||today(), producto: Number(document.getElementById('ped-prod').value), deposito: document.getElementById('ped-deposito').value, cantidad: Number(document.getElementById('ped-cant').value)||0, precio: Number(document.getElementById('ped-precio').value)||0, monto: 0, detalle: document.getElementById('ped-detalle').value, observaciones: document.getElementById('ped-obs').value, estado: 'pendiente' }; p.monto = p.cantidad*p.precio; const idx = pedidos.findIndex(x=>x.id===id); if(idx>=0) pedidos[idx]=p; else pedidos.push(p); saveAll(); toast('Pedido guardado'); closeModal('modal-pedido'); renderPanel('pedidos'); }

function openModalPedido() { document.getElementById('ped-id').value=''; document.getElementById('ped-cliente').innerHTML = clientes.map(c => `<option value="${c.id}">${he(c.nombre)}</option>`).join(''); document.getElementById('ped-prod').innerHTML = productos.map(p => `<option value="${p.id}">${he(p.nombre)}</option>`).join(''); document.getElementById('ped-fecha').value = today(); document.getElementById('ped-cant').value=1; document.getElementById('ped-precio').value=0; openModal('modal-pedido'); }

function editPedido(id) { const p = pedidos.find(x=>x.id===id); if(!p) return; document.getElementById('ped-id').value=id; document.getElementById('ped-cliente').value=p.cliente; document.getElementById('ped-prod').value=p.producto; document.getElementById('ped-deposito').value=p.deposito; document.getElementById('ped-cant').value=p.cantidad; document.getElementById('ped-precio').value=p.precio; document.getElementById('ped-detalle').value=p.detalle; document.getElementById('ped-obs').value=p.observaciones; openModal('modal-pedido'); }

function delPedido(id) { if(!confirm('¿Eliminar pedido?')) return; pedidos = pedidos.filter(x=>x.id!==id); saveAll(); toast('Pedido eliminado'); renderPanel('pedidos'); }

function saveFactura() { const id = Number(document.getElementById('fac-id').value) || Date.now(); const f = { id, cliente: Number(document.getElementById('fac-cliente').value), fecha: document.getElementById('fac-fecha').value||today(), timbrado: document.getElementById('fac-timbrado').value, numero: document.getElementById('fac-num-display').value, vendedor: document.getElementById('fac-vendedor').value, condicion: document.getElementById('fac-condicion').value, dias: Number(document.getElementById('fac-dias').value)||30, observaciones: document.getElementById('fac-obs').value, items: [], exento: 0, iva: 0, total: 0, pagado: 0, saldo: 0, estado: 'pendiente' }; document.querySelectorAll('#fac-items-body .item-row').forEach(r => { const producto = r.querySelector('[data-col="prod"]').value; const cantidad = Number(r.querySelector('[data-col="cant"]').value)||0; const precio = Number(r.querySelector('[data-col="precio"]').value)||0; f.items.push({producto, cantidad, precio}); }); const tots = totalesFromItems(f.items); f.exento = tots.exento; f.iva = tots.iva; f.total = tots.total; f.saldo = f.total; if(f.condicion==='credito') { const venc = new Date(); venc.setDate(venc.getDate()+f.dias); f.vencimiento = venc.toISOString().slice(0,10); } else { f.vencimiento = f.fecha; } const idx = facturas.findIndex(x=>x.id===id); if(idx>=0) facturas[idx]=f; else facturas.push(f); saveAll(); toast('Factura guardada'); closeModal('modal-factura'); renderPanel('facturas'); }

function openModalFactura() { document.getElementById('fac-id').value=''; document.getElementById('fac-num-display').value='FAC-'+Date.now().toString().slice(-6); document.getElementById('fac-cliente').innerHTML = clientes.map(c => `<option value="${c.id}">${he(c.nombre)}</option>`).join(''); document.getElementById('fac-fecha').value = today(); document.getElementById('fac-items-body').innerHTML=''; addItemRow('fac'); document.getElementById('fac-dias-wrap').style.display='none'; openModal('modal-factura'); }

function editFactura(id) { const f = facturas.find(x=>x.id===id); if(!f) return; document.getElementById('fac-id').value=id; document.getElementById('fac-cliente').value=f.cliente; document.getElementById('fac-fecha').value=f.fecha; document.getElementById('fac-timbrado').value=f.timbrado; document.getElementById('fac-num-display').value=f.numero; document.getElementById('fac-vendedor').value=f.vendedor; document.getElementById('fac-condicion').value=f.condicion; document.getElementById('fac-dias').value=f.dias; document.getElementById('fac-obs').value=f.observaciones; renderItemsTable('fac', f.items||[]); openModal('modal-factura'); }

function delFactura(id) { if(!confirm('¿Eliminar factura?')) return; facturas = facturas.filter(x=>x.id!==id); saveAll(); toast('Factura eliminada'); renderPanel('facturas'); }

function facCondChanged() { const w = document.getElementById('fac-dias-wrap'); if(document.getElementById('fac-condicion').value==='credito') w.style.display='flex'; else w.style.display='none'; }

function openPagoModal(id) { const f = facturas.find(x=>x.id===id); if(!f) return; document.getElementById('pago-fac-id').value=id; document.getElementById('pago-info').innerHTML = `<strong>${he(nomCli(f.cliente))}</strong><br/>Factura: ${f.numero}<br/>Total: Gs. ${fmt(f.total)}<br/>Pagado: Gs. ${fmt(f.pagado||0)}<br/>Saldo: Gs. ${fmt(f.saldo||f.total)}`; document.getElementById('pago-monto').value=f.saldo||f.total; document.getElementById('pago-fecha').value = today(); document.getElementById('pago-obs').value=''; openModal('modal-pago'); }

function savePago() { const id = Number(document.getElementById('pago-fac-id').value); const monto = Number(document.getElementById('pago-monto').value)||0; const f = facturas.find(x=>x.id===id); if(!f || !monto) { toast('Datos inválidos','e'); return; } f.pagado = (f.pagado||0)+monto; f.saldo = Math.max(0, f.total-(f.pagado||0)); if(f.saldo===0) f.estado='pagada'; else f.estado='pago_parcial'; toast(`Pago registrado — Saldo: Gs.${fmt(f.saldo)}`); closeModal('modal-pago'); saveAll(); renderPanel('cobrar'); }

function openModalCliente() { document.getElementById('cli-id').value=''; document.getElementById('cli-nombre').value=''; document.getElementById('cli-ruc').value=''; document.getElementById('cli-tel').value=''; document.getElementById('cli-email').value=''; document.getElementById('cli-dir').value=''; document.getElementById('modal-cli-title').textContent='Nuevo Cliente'; openModal('modal-cliente'); }

function saveCliente() { const id = Number(document.getElementById('cli-id').value) || Date.now(); const c = { id, nombre: document.getElementById('cli-nombre').value, ruc: document.getElementById('cli-ruc').value, telefono: document.getElementById('cli-tel').value, email: document.getElementById('cli-email').value, direccion: document.getElementById('cli-dir').value }; if(!c.nombre) { toast('Nombre requerido','e'); return; } const idx = clientes.findIndex(x=>x.id===id); if(idx>=0) clientes[idx]=c; else clientes.push(c); saveAll(); toast('Cliente guardado'); closeModal('modal-cliente'); renderPanel('clientes'); }

function editCliente(id) { const c = clientes.find(x=>x.id===id); if(!c) return; document.getElementById('cli-id').value=id; document.getElementById('cli-nombre').value=c.nombre; document.getElementById('cli-ruc').value=c.ruc||''; document.getElementById('cli-tel').value=c.telefono||''; document.getElementById('cli-email').value=c.email||''; document.getElementById('cli-dir').value=c.direccion||''; document.getElementById('modal-cli-title').textContent='Editar Cliente'; openModal('modal-cliente'); }

function delCliente(id) { if(!confirm('¿Eliminar cliente?')) return; clientes=clientes.filter(x=>x.id!==id); saveAll(); toast('Cliente eliminado'); renderPanel('clientes'); }

function openModalProducto() { document.getElementById('prod-id').value=''; document.getElementById('prod-cod').value=''; document.getElementById('prod-cat').value=''; document.getElementById('prod-nombre').value=''; document.getElementById('prod-unidad').value=''; document.getElementById('prod-costo').value='0'; document.getElementById('prod-venta').value='0'; document.getElementById('prod-stock-asu').value='0'; document.getElementById('prod-stock-ypa').value='0'; document.getElementById('prod-min').value='5'; document.getElementById('modal-prod-title').textContent='Nuevo Producto'; openModal('modal-producto'); }

function saveProducto() { const id = Number(document.getElementById('prod-id').value) || Date.now(); const p = { id, codigo: document.getElementById('prod-cod').value, categoria: document.getElementById('prod-cat').value, nombre: document.getElementById('prod-nombre').value, unidad: document.getElementById('prod-unidad').value, precioCosto: Number(document.getElementById('prod-costo').value)||0, precioVenta: Number(document.getElementById('prod-venta').value)||0, stockAsu: Number(document.getElementById('prod-stock-asu').value)||0, stockYpa: Number(document.getElementById('prod-stock-ypa').value)||0, minimo: Number(document.getElementById('prod-min').value)||5 }; if(!p.nombre) { toast('Nombre requerido','e'); return; } const idx = productos.findIndex(x=>x.id===id); if(idx>=0) productos[idx]=p; else productos.push(p); saveAll(); toast('Producto guardado'); closeModal('modal-producto'); renderPanel('productos'); }

function editProducto(id) { const p = productos.find(x=>x.id===id); if(!p) return; document.getElementById('prod-id').value=id; document.getElementById('prod-cod').value=p.codigo||''; document.getElementById('prod-cat').value=p.categoria||''; document.getElementById('prod-nombre').value=p.nombre; document.getElementById('prod-unidad').value=p.unidad||''; document.getElementById('prod-costo').value=p.precioCosto||0; document.getElementById('prod-venta').value=p.precioVenta||0; document.getElementById('prod-stock-asu').value=p.stockAsu||0; document.getElementById('prod-stock-ypa').value=p.stockYpa||0; document.getElementById('prod-min').value=p.minimo||5; document.getElementById('modal-prod-title').textContent='Editar Producto'; openModal('modal-producto'); }

function delProducto(id) { if(!confirm('¿Eliminar producto?')) return; productos=productos.filter(x=>x.id!==id); saveAll(); toast('Producto eliminado'); renderPanel('productos'); }

function openStockAjuste(id) { const p = productos.find(x=>x.id===id); if(!p) return; document.getElementById('stockaj-prod-id').value=id; document.getElementById('stockaj-info').innerHTML=`<strong>${he(p.nombre)}</strong><br/>Stock Asunción: ${fmt(p.stockAsu||0)}<br/>Stock Ypacaraí: ${fmt(p.stockYpa||0)}<br/>Total: ${fmt(stockTotal(p))}`; document.getElementById('stockaj-deposito').value='asuncion'; document.getElementById('stockaj-tipo').value='add'; document.getElementById('stockaj-cant').value=0; document.getElementById('stockaj-motivo').value=''; openModal('modal-stock-ajuste'); }

function saveStockAjuste() { const id=Number(document.getElementById('stockaj-prod-id').value); const p=productos.find(x=>x.id===id); if(!p) return; const deposito=document.getElementById('stockaj-deposito').value; const tipo=document.getElementById('stockaj-tipo').value; const cant=Number(document.getElementById('stockaj-cant').value)||0; if(tipo==='add') { if(deposito==='asuncion') p.stockAsu=(p.stockAsu||0)+cant; else p.stockYpa=(p.stockYpa||0)+cant; } else if(tipo==='sub') { if(deposito==='asuncion') p.stockAsu=Math.max(0,(p.stockAsu||0)-cant); else p.stockYpa=Math.max(0,(p.stockYpa||0)-cant); } else if(tipo==='set') { if(deposito==='asuncion') p.stockAsu=cant; else p.stockYpa=cant; } saveAll(); toast('Stock ajustado'); closeModal('modal-stock-ajuste'); renderPanel('stock'); }

function openModalProveedor() { document.getElementById('prov-id').value=''; document.getElementById('prov-nombre').value=''; document.getElementById('prov-ruc').value=''; document.getElementById('prov-tel').value=''; document.getElementById('prov-email').value=''; document.getElementById('prov-rubro').value=''; document.getElementById('prov-dir').value=''; document.getElementById('modal-prov-title').textContent='Nuevo Proveedor'; openModal('modal-proveedor'); }

function saveProveedor() { const id = Number(document.getElementById('prov-id').value) || Date.now(); const p = { id, nombre: document.getElementById('prov-nombre').value, ruc: document.getElementById('prov-ruc').value, telefono: document.getElementById('prov-tel').value, email: document.getElementById('prov-email').value, rubro: document.getElementById('prov-rubro').value, direccion: document.getElementById('prov-dir').value }; if(!p.nombre) { toast('Nombre requerido','e'); return; } const idx = proveedores.findIndex(x=>x.id===id); if(idx>=0) proveedores[idx]=p; else proveedores.push(p); saveAll(); toast('Proveedor guardado'); closeModal('modal-proveedor'); renderPanel('proveedores'); }

function editProveedor(id) { const p = proveedores.find(x=>x.id===id); if(!p) return; document.getElementById('prov-id').value=id; document.getElementById('prov-nombre').value=p.nombre; document.getElementById('prov-ruc').value=p.ruc||''; document.getElementById('prov-tel').value=p.telefono||''; document.getElementById('prov-email').value=p.email||''; document.getElementById('prov-rubro').value=p.rubro||''; document.getElementById('prov-dir').value=p.direccion||''; document.getElementById('modal-prov-title').textContent='Editar Proveedor'; openModal('modal-proveedor'); }

function delProveedor(id) { if(!confirm('¿Eliminar proveedor?')) return; proveedores=proveedores.filter(x=>x.id!==id); saveAll(); toast('Proveedor eliminado'); renderPanel('proveedores'); }

function saveGasto() { const id = Number(document.getElementById('gasto-id').value) || Date.now(); const g = { id, categoria: document.getElementById('gasto-cat').value, fecha: document.getElementById('gasto-fecha').value||today(), proveedor: Number(document.getElementById('gasto-proveedor').value)||null, estado: document.getElementById('gasto-estado').value, concepto: document.getElementById('gasto-concepto').value, monto: Number(document.getElementById('gasto-monto').value)||0, factura: document.getElementById('gasto-nrofac').value, observaciones: document.getElementById('gasto-obs').value }; if(!g.concepto || !g.monto) { toast('Concepto y monto requeridos','e'); return; } const idx = gastos.findIndex(x=>x.id===id); if(idx>=0) gastos[idx]=g; else gastos.push(g); saveAll(); toast('Gasto guardado'); closeModal('modal-gasto'); renderPanel('gastos'); }

function openModalGasto() { document.getElementById('gasto-id').value=''; document.getElementById('gasto-cat').value='proveedor'; document.getElementById('gasto-fecha').value=today(); document.getElementById('gasto-proveedor').innerHTML = proveedores.map(p => `<option value="${p.id}">${he(p.nombre)}</option>`).join(''); document.getElementById('gasto-estado').value='pagado'; document.getElementById('gasto-concepto').value=''; document.getElementById('gasto-monto').value=0; document.getElementById('gasto-nrofac').value=''; document.getElementById('gasto-obs').value=''; document.getElementById('modal-gasto-title').textContent='Registrar Gasto'; openModal('modal-gasto'); }

function editGasto(id) { const g = gastos.find(x=>x.id===id); if(!g) return; document.getElementById('gasto-id').value=id; document.getElementById('gasto-cat').value=g.categoria; document.getElementById('gasto-fecha').value=g.fecha; document.getElementById('gasto-proveedor').value=g.proveedor||''; document.getElementById('gasto-estado').value=g.estado; document.getElementById('gasto-concepto').value=g.concepto; document.getElementById('gasto-monto').value=g.monto; document.getElementById('gasto-nrofac').value=g.factura||''; document.getElementById('gasto-obs').value=g.observaciones||''; document.getElementById('modal-gasto-title').textContent='Editar Gasto'; openModal('modal-gasto'); }

function delGasto(id) { if(!confirm('¿Eliminar gasto?')) return; gastos=gastos.filter(x=>x.id!==id); saveAll(); toast('Gasto eliminado'); renderPanel('gastos'); }

function switchTab(panel, tab, el) { document.querySelectorAll(`#panel-${panel} .tab`).forEach(t => t.classList.remove('active')); el.classList.add('active'); renderPanel(panel); }

function saveAll() { localStorage.setItem('kavaju_data', JSON.stringify({ presupuestos, pedidos, facturas, gastos, clientes, productos, proveedores })); saveCloud({ presupuestos, pedidos, facturas, gastos, clientes, productos, proveedores }); }

function loadAll() { const saved = localStorage.getItem('kavaju_data'); if(saved) { const data = JSON.parse(saved); presupuestos = data.presupuestos||[]; pedidos = data.pedidos||[]; facturas = data.facturas||[]; gastos = data.gastos||[]; clientes = data.clientes||[]; productos = data.productos||[]; proveedores = data.proveedores||[]; } }

window.addEventListener('load', () => initApp());
