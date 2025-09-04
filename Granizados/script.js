// script.js — Granizados Delivery SPA
// Helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const showMsg = (el, txt, type='success') => {
  if(!el) return;
  el.textContent = txt; el.classList.remove('text-success-color','text-error-color');
  el.classList.add(type==='success' ? 'text-success-color' : 'text-error-color'); el.style.display='block';
  setTimeout(()=> { el.textContent=''; el.style.display='none'; el.classList.remove('text-success-color','text-error-color') }, 4000);
};

// ---------- App state & persistence ----------
const LS_KEYS = { ORDERS:'gz_orders', USER:'gz_user', DARK:'gz_dark', FLAVORS:'gz_flavors' };
let orders = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
let user = JSON.parse(localStorage.getItem(LS_KEYS.USER) || 'null');
let flavors = JSON.parse(localStorage.getItem(LS_KEYS.FLAVORS) || 'null');

// default flavors (if not in localStorage)
const DEFAULT_FLAVORS = [
  { id:'mango', name:'Mango Tropical', price:10000, desc:'Dulce y fresco, con toque natural', image:'assets/MANGO.jpg' },
  { id:'fresa', name:'Fresa Natural', price:9500, desc:'Agridulce y brillante', image:'assets/FRESA.jpg' },
  { id:'limon', name:'Limón Refrescante', price:9000, desc:'Ácido y revitalizante', image:'assets/LIMON.jpg' },
  { id:'kiwi', name:'Kiwi Exótico', price:11000, desc:'Toque ácido y jugoso', image:'assets/KIWI.jpg' }
];
if(!flavors){ flavors = DEFAULT_FLAVORS; localStorage.setItem(LS_KEYS.FLAVORS, JSON.stringify(flavors)) }

// utils
const saveOrders = () => localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(orders));
const saveUser = () => localStorage.setItem(LS_KEYS.USER, JSON.stringify(user));
const saveDark = v => localStorage.setItem(LS_KEYS.DARK, v ? '1':'0');

// ---------- Routing (hash-based) ----------
const sections = $$('.page-section');
const navLinks = $$('.nav-link');

function navigateTo(targetId){
  sections.forEach(s=> s.classList.remove('active'));
  const sec = $(`#${targetId}-section`);
  if(sec) sec.classList.add('active');
  // update nav
  navLinks.forEach(l => {
    l.classList.toggle('active-nav-link', l.dataset.section===targetId);
    if(l.dataset.section===targetId) l.setAttribute('aria-current','page'); else l.removeAttribute('aria-current');
  });
  // load data for some pages:
  if(targetId==='explore') renderFlavors();
  if(targetId==='orders') renderOrders();
  if(targetId==='profile') renderProfile();
}

$$('.nav-link').forEach(link=>{
  link.addEventListener('click', e=>{
    e.preventDefault();
    const id = link.dataset.section;
    location.hash = id;
    navigateTo(id);
  });
});
window.addEventListener('hashchange', ()=> navigateTo(location.hash.slice(1) || 'home'));



// ---------- On load ----------
document.addEventListener('DOMContentLoaded', () => {
  $('#current-year').textContent = new Date().getFullYear();
  // session: if user exists, hide auth nav CTA label
  updateHeaderAuth();
  // load flavors preview
  renderFlavorsPreview();
  // initial route
  navigateTo(location.hash.slice(1) || 'home');
  // wire up newsletter
  $('#newsletter-form')?.addEventListener('submit', e=>{
    e.preventDefault();
    const email = $('#newsletter-email').value.trim();
    if(!email) { showMsg($('#newsletter-message'),'Introduce un email válido','error'); return; }
    showMsg($('#newsletter-message'), '¡Gracias! Te llegara un cupón al correo.', 'success'); $('#newsletter-form').reset();
  });
  // auth forms
  setupAuth();
  // create wizard init
  initWizard();
});

// ---------- Flavors (explore) rendering ----------
function createFlavorCard(f){
  const el = document.createElement('article');
  el.className='event-card card';
  el.innerHTML = `
    <a href="#event-detail-${f.id}" class="event-card-link" data-event-id="${f.id}">
      <div class="event-image-wrapper">
        <img src="${f.image}" alt="${f.name}">
        <span class="event-category">Sabor</span>
      </div>
      <div class="event-card-content">
        <h3 class="event-title">${f.name}</h3>
        <p class="event-description">${f.desc}</p>
      </div>
    </a>
    <div class="event-card-footer">
      <div class="event-votes"><span class="price">COP ${f.price.toLocaleString('es-CO')}</span></div>
      <div>
        <button class="btn btn-primary btn-order" data-id="${f.id}">Pedir</button>
      </div>
    </div>
  `;
  // click order
  el.querySelector('.btn-order').addEventListener('click', e=>{
    const id = e.currentTarget.dataset.id;
    openCreateWithFlavor(id);
    location.hash='create';
    navigateTo('create');
  });
  // click detail
  el.querySelector('.event-card-link').addEventListener('click', e=>{
    e.preventDefault();
    const id = e.currentTarget.dataset.eventId;
    loadFlavorDetail(id);
    location.hash='event-detail';
    navigateTo('event-detail');
  });
  return el;
}

function renderFlavors(containerId='events-grid'){
  const grid = $(`#${containerId}`);
  if(!grid) return;
  grid.innerHTML = '';
  setTimeout(()=>{ // simulate loading
    const sorted = [...flavors];
    sorted.forEach(f => grid.appendChild(createFlavorCard(f)));
  }, 200);
}

function renderFlavorsPreview(){
  // put first 3 flavors in home (reuse events-grid if wanted); simply render explore as initial
  renderFlavors('events-grid');
}

// ---------- Flavor detail (like event detail) ----------
function loadFlavorDetail(id){
  const f = flavors.find(x=>x.id===id);
  const sec = $('#event-detail-section');
  if(!f || !sec) { sec.innerHTML = '<div class="card p-8">Sabor no encontrado</div>'; return }
  sec.innerHTML = `
    <div class="event-detail-container card">
      <h2 class="section-title">${f.name}</h2>
      <img src="${f.image}" alt="${f.name}" class="event-detail-image">
      <p class="event-detail-description">${f.desc}</p>
      <p><strong>Precio base:</strong> COP ${f.price.toLocaleString('es-CO')}</p>
      <div class="event-detail-actions">
        <button class="btn btn-primary" id="buy-now">Crear con este sabor</button>
      </div>
    </div>
  `;
  $('#buy-now').addEventListener('click', ()=>{
    openCreateWithFlavor(id);
    location.hash='create';
    navigateTo('create');
  });
}

// ---------- Wizard (crear granizado) ----------
const WIZARD_STEPS = ['Sabor','Personalizar','Tamaño','Toppings','Contacto','Pago','Confirmación'];
let wizardState = {};
let wizardIndex = 0;

function initWizard(){
  renderWizardSteps();
  renderWizardBody();
  $('#prevStep')?.addEventListener('click', ()=> { if(wizardIndex>0) { wizardIndex--; renderWizardBody(); } });
  $('#nextStep')?.addEventListener('click', ()=> {
    // validations per step
    if(validateWizardStep(wizardIndex)) {
      if(wizardIndex < WIZARD_STEPS.length-1) { wizardIndex++; renderWizardBody(); }
      else finalizeOrder();
    }
  });
  // create flavor shortcuts (from homepage)
  document.addEventListener('click', (e)=> {
    if(e.target.matches('.open-create-with')) {
      openCreateWithFlavor(e.target.dataset.id);
      location.hash='create';
      navigateTo('create');
    }
  });
}

function renderWizardSteps(){
  const container = $('#wizardSteps');
  if(!container) return;
  container.innerHTML = '';
  WIZARD_STEPS.forEach((s,i)=>{
    const d = document.createElement('div');
    d.className = 'w-step' + (i===wizardIndex ? ' active' : '');
    d.textContent = s;
    container.appendChild(d);
  });
}

function renderWizardBody(){
  renderWizardSteps();
  const body = $('#wizardBody');
  if(!body) return;
  body.innerHTML = '';
  // initialize state if empty
  wizardState = wizardState || {};
  if(!wizardState.size) wizardState.size='M';
  if(!wizardState.toppings) wizardState.toppings=[];
  if(!wizardState.contact) wizardState.contact = {name:'',phone:'',address:''};
  // step content
  if(wizardIndex===0){ // Sabor
    const grid = document.createElement('div'); grid.className='events-grid grid-3-cols';
    flavors.forEach(f => {
      const c = createFlavorCard(f);
      // mark selected border
      if(wizardState.flavor === f.id) c.style.border = `2px solid ${getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#06b6d4'}`;
      c.addEventListener('click', ()=> { wizardState.flavor = f.id; renderWizardBody(); });
      grid.appendChild(c);
    });
    body.appendChild(grid);
  } else if(wizardIndex===1){ // Personalizar
    const area = document.createElement('div');
    area.innerHTML = `
      <label>Nota para el granizado (ej: menos azúcar, sin hielo)</label>
      <textarea id="note" rows="4" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)">${wizardState.customNote||''}</textarea>
    `;
    body.appendChild(area);
  } else if(wizardIndex===2){ // Tamaño
    const cont = document.createElement('div');
    cont.className='grid-3-cols';
    const sizes = [{id:'S',name:'Pequeño 350ml',mult:0.8},{id:'M',name:'Mediano 500ml',mult:1},{id:'L',name:'Grande 750ml',mult:1.35}];
    sizes.forEach(s=>{
      const card = document.createElement('div'); card.className='card'; card.style.padding='12px';
      card.innerHTML = `<strong>${s.name}</strong><div class="small">Precio multiplicador: ${s.mult}</div>`;
      if(wizardState.size === s.id) card.style.border = `2px solid var(--primary)`;
      card.addEventListener('click', ()=>{ wizardState.size = s.id; renderWizardBody(); });
      cont.appendChild(card);
    });
    body.appendChild(cont);
  } else if(wizardIndex===3){ // toppings
    const tlist = [{id:'crema',name:'Crema batida',price:1200},{id:'chispas',name:'Chispas chocolate',price:900},{id:'fruta',name:'Fruta extra',price:1500},{id:'sirope',name:'Sirope',price:700}];
    const cont = document.createElement('div'); cont.className='grid-3-cols';
    tlist.forEach(t=>{
      const c = document.createElement('div'); c.className='card'; c.style.padding='12px';
      const checked = wizardState.toppings.includes(t.id);
      c.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${t.name}</strong><div class="small">COP ${t.price}</div></div><div><input type="checkbox" data-id="${t.id}" ${checked? 'checked':''}></div></div>`;
      c.querySelector('input').addEventListener('click', e=>{
        const id = e.target.dataset.id;
        if(e.target.checked) wizardState.toppings.push(id); else wizardState.toppings = wizardState.toppings.filter(x=>x!==id);
        renderWizardBody();
      });
      cont.appendChild(c);
    });
    body.appendChild(cont);
  } else if(wizardIndex===4){ // contacto
    const userName = user ? user.name : '';
    const cont = document.createElement('div');
    cont.innerHTML = `
      <label>Nombre</label><input id="cname" value="${wizardState.contact.name||userName}" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)"><br><br>
      <label>Teléfono</label><input id="cphone" value="${wizardState.contact.phone||''}" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)"><br><br>
      <label>Dirección</label><input id="caddress" value="${wizardState.contact.address||''}" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)">
    `;
    body.appendChild(cont);
  } else if(wizardIndex===5){ // pago
    computePrice();
    const cont = document.createElement('div');
    cont.innerHTML = `
      <div class="small muted">Total estimado</div>
      <div style="font-weight:800;font-size:20px;margin:8px 0">COP ${wizardState.price.toLocaleString('es-CO')}</div>
      <label>Método</label>
      <select id="payMethod"><option value="card">Tarjeta</option><option value="cash">Efectivo</option></select>
      <div id="cardForm" style="margin-top:10px">
        <label>Nombre en tarjeta</label><input id="cardName" type="text" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)">
        <label>Número (demo)</label><input id="cardNumber" placeholder="4111 1111 1111 1111" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)">
        <label>CVV</label><input id="cardCvv" placeholder="123" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)">
      </div>
    `;
    body.appendChild(cont);
    $('#payMethod').addEventListener('change', (e)=> {
      $('#cardForm').style.display = e.target.value==='card' ? 'block':'none';
    });
  } else if(wizardIndex===6){ // confirm
    computePrice();
    const f = flavors.find(x=>x.id===wizardState.flavor) || {name:'--', price:0};
    const toppingsTxt = wizardState.toppings.join(', ') || 'Sin toppings';
    const cont = document.createElement('div');
    cont.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div><strong>Granizado:</strong> ${f.name}</div>
          <div><strong>Tamaño:</strong> ${wizardState.size}</div>
          <div><strong>Toppings:</strong> ${toppingsTxt}</div>
          <div><strong>Nota:</strong> ${wizardState.customNote || '---'}</div>
        </div>
        <div>
          <div><strong>Contacto:</strong><br>${wizardState.contact.name || ''}<br>${wizardState.contact.phone || ''}<br>${wizardState.contact.address || ''}</div>
          <div style="margin-top:10px"><strong>Total:</strong> COP ${wizardState.price.toLocaleString('es-CO')}</div>
          <div style="margin-top:10px"><button id="confirmOrderBtn" class="btn btn-primary">Confirmar Pedido</button></div>
        </div>
      </div>
    `;
    body.appendChild(cont);
    $('#confirmOrderBtn').addEventListener('click', finalizeOrder);
  }
}

function validateWizardStep(idx){
  // basic validations
  if(idx===0 && !wizardState.flavor){ alert('Selecciona un sabor'); return false; }
  if(idx===4){
    const name = $('#cname')?.value.trim(), phone = $('#cphone')?.value.trim(), addr = $('#caddress')?.value.trim();
    if(!name || !phone || !addr){ alert('Completa la información de contacto'); return false; }
    wizardState.contact = {name,phone,address:addr};
  }
  if(idx===1) wizardState.customNote = $('#note') ? $('#note').value.trim() : '';
  if(idx===5){
    const method = $('#payMethod')?.value || 'card';
    wizardState.payment = { method, status:'pending' };
    if(method==='card'){
      const number = ($('#cardNumber')?.value || '').replace(/\s+/g,''), cvv = ($('#cardCvv')?.value||'').trim(), cname = ($('#cardName')?.value||'').trim();
      if(number.length<12 || cvv.length<3 || !cname){ alert('Datos de tarjeta incompletos'); return false; }
      if(!number.startsWith('4')){ alert('Tarjeta rechazada (demo acepta tarjetas que empiezan por 4)'); return false; }
      wizardState.payment.status='paid';
    }
  }
  return true;
}

function computePrice(){
  if(!wizardState.flavor) { wizardState.price = 0; return; }
  const f = flavors.find(x=>x.id===wizardState.flavor);
  const sizes = {S:0.8, M:1, L:1.35};
  const mult = sizes[wizardState.size] || 1;
  const toppingsPrices = {crema:1200,chispas:900,fruta:1500,sirope:700};
  const tsum = (wizardState.toppings || []).reduce((a,id)=>a + (toppingsPrices[id]||0), 0);
  wizardState.price = Math.round((f.price * mult) + tsum);
}

// create with flavor helper
function openCreateWithFlavor(id){
  wizardState = { flavor:id, customNote:'', size:'M', toppings:[], contact:{name:user?.name||'',phone:user?.phone||'',address:user?.address||''}, payment:{method:'card',status:'pending'}, price:0 };
  wizardIndex = 0;
  renderWizardBody();
  location.hash='create';
  navigateTo('create');
}

// finalize order
function finalizeOrder(){
  computePrice();
  if(!user){ if(!confirm('Debes iniciar sesión para confirmar el pedido. ¿Ir a login?')) return; location.hash='auth'; navigateTo('auth'); return; }
  const newOrder = {
    id: 'ord_'+Date.now(),
    userEmail: user.email,
    summary: `${flavors.find(x=>x.id===wizardState.flavor).name} • ${wizardState.size}`,
    flavor: wizardState.flavor,
    size: wizardState.size,
    toppings: wizardState.toppings,
    customNote: wizardState.customNote,
    contact: wizardState.contact,
    payment: wizardState.payment,
    price: wizardState.price,
    status: wizardState.payment.status === 'paid' ? 'En preparación' : 'Pendiente de pago',
    created: Date.now()
  };
  orders.push(newOrder); saveOrders();
  // notify
  showMsg($('#newsletter-message'), 'Pedido creado: '+newOrder.id, 'success');
  // reset wizard
  wizardState = {}; wizardIndex = 0; renderWizardBody();
  // go to orders
  location.hash='orders'; navigateTo('orders');
}

// ---------- Orders rendering ----------
function renderOrders(){
  const list = $('#ordersList');
  if(!list) return;
  list.innerHTML = '';
  const my = orders.filter(o => (user && o.userEmail === user.email) || (!user && false));
  if(my.length===0) { list.innerHTML = '<div class="card p-8">No tienes órdenes aún.</div>'; return; }
  my.reverse().forEach(o=>{
    const el = document.createElement('div'); el.className='order-item';
    el.innerHTML = `<div><strong>${o.summary}</strong><div class="small muted">${new Date(o.created).toLocaleString()}</div></div><div style="text-align:right"><div class="small muted">${o.status}</div><div style="margin-top:8px"><button class="btn btn-secondary btn-reorder" data-id="${o.id}">Repetir</button></div></div>`;
    el.querySelector('.btn-reorder').addEventListener('click', ()=> {
      // load into wizard
      wizardState = { flavor:o.flavor, customNote:o.customNote, size:o.size, toppings:[...o.toppings], contact:o.contact, payment:o.payment, price:o.price };
      wizardIndex = 0; renderWizardBody(); location.hash='create'; navigateTo('create');
    });
    list.appendChild(el);
  });
}

// ---------- Profile ----------
function loadProfile(){
  navigateTo('profile');
}
function renderProfile(){
  const out = $('#profile-content');
  if(!out) return;
  if(!user){ out.innerHTML = '<div class="card p-8">Inicia sesión para ver tu perfil y pedidos.</div>'; return; }
  out.innerHTML = `<h3>Hola, ${user.name}</h3>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Teléfono:</strong> ${user.phone||'—'}</p>
    <p><strong>Dirección:</strong> ${user.address||'—'}</p>
    <div style="margin-top:12px"><button id="editProfileBtn" class="btn btn-secondary">Editar datos</button></div>`;
  $('#editProfileBtn').addEventListener('click', ()=> openEditProfile());
}
function openEditProfile(){
  const out = $('#profile-content');
  out.innerHTML = `<div class="card" style="padding:14px">
    <label>Nombre</label><input id="pname" value="${user.name}" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)"><br><br>
    <label>Teléfono</label><input id="pphone" value="${user.phone||''}" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)"><br><br>
    <label>Dirección</label><input id="paddress" value="${user.address||''}" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border)"><br><br>
    <button id="saveProfile" class="btn btn-primary">Guardar</button>
  </div>`;
  $('#saveProfile').addEventListener('click', ()=>{
    user.name = $('#pname').value.trim(); user.phone = $('#pphone').value.trim(); user.address = $('#paddress').value.trim();
    saveUser(); renderProfile(); updateHeaderAuth();
    showMsg($('#newsletter-message'),'Perfil actualizado','success');
  });
}

// ---------- Auth (simple localStorage user) ----------
function setupAuth(){
  // demo user preload
  if(!localStorage.getItem('gz_demo')) {
    localStorage.setItem('gz_demo','1');
    localStorage.setItem('gz_user_demo', JSON.stringify({name:'Cliente Demo', email:'demo@granizados.com', pass:'demo123', phone:'3001234', address:'Calle Demo 1'}));
  }
  // login
  $('#login-form')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = $('#login-email').value.trim().toLowerCase();
    const pass = $('#login-password').value;
    // check demo or persisted user
    const demo = JSON.parse(localStorage.getItem('gz_user_demo') || 'null');
    if(demo && demo.email === email && demo.pass === pass){
      user = {name:demo.name, email:demo.email, phone:demo.phone, address:demo.address};
      saveUser(); updateHeaderAuth(); showMsg($('#login-message'),'Sesión iniciada','success'); location.hash='home'; navigateTo('home'); return;
    }
    // other users persisted are stored under gz_user (single user for this simple demo)
    const stored = JSON.parse(localStorage.getItem(LS_KEYS.USER) || 'null');
    if(stored && stored.email === email && stored.pass === pass){
      user = {name:stored.name, email:stored.email, phone:stored.phone, address:stored.address};
      saveUser(); updateHeaderAuth(); showMsg($('#login-message'),'Sesión iniciada','success'); location.hash='home'; navigateTo('home'); return;
    }
    showMsg($('#login-message'),'Email o contraseña incorrectos','error');
  });
  // register
  $('#register-form')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = $('#register-name').value.trim(); const email = $('#register-email').value.trim().toLowerCase();
    const pass = $('#register-password').value;
    if(!name || !email || !pass) { showMsg($('#register-message'),'Completa todos los campos','error'); return; }
    // save new user (simple single-user store)
    localStorage.setItem(LS_KEYS.USER, JSON.stringify({name, email, pass}));
    showMsg($('#register-message'),'Cuenta creada. Ya puedes iniciar sesión','success');
    $('#register-form').reset();
  });
  // if current user exists in localStorage, load minimal
  const storedUser = JSON.parse(localStorage.getItem(LS_KEYS.USER) || 'null');
  if(storedUser && !user) { user = { name:storedUser.name, email:storedUser.email, phone:storedUser.phone, address:storedUser.address }; saveUser(); }
}

// update header auth display
function updateHeaderAuth(){
  // change auth nav label to show user name
  const authLink = $$('.nav-link').find(l => l.dataset.section==='auth');
  if(user) {
    if(authLink){ authLink.textContent = user.name; authLink.classList.remove('btn-primary'); authLink.classList.add('nav-user'); authLink.href='#profile'; authLink.dataset.section='profile' }
  } else {
    if(authLink){ authLink.textContent = 'Entrar / Registrar'; authLink.classList.add('btn-primary'); authLink.dataset.section='auth'; authLink.href='#auth' }
  }
}

// ---------- Expose global for debugging ----------
window._granizados = { orders, flavors, user };

// end of script

