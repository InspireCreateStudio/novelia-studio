'use strict';
// =====================================================================
//  Novelia Studio — PUBLICAR (por novela): Ficha, Amazon KDP,
//  Producción y lectoras beta, Lanzamiento, Redes, Citas y Web.
//  Y «Tu Mesa»: color e icono.
// =====================================================================

const copiarTexto = (t, msg = 'Copiado') => navigator.clipboard.writeText(t).then(() => aviso(msg)).catch(() => aviso('No he podido copiar'));
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ---------- imágenes guardadas aparte (portada, A+) ----------
async function guardarImagen(file, maxLado = 2000) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((r, e) => { img.onload = r; img.onerror = e; img.src = url; });
  const k = Math.min(1, maxLado / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  const id = uid();
  await Store.set('mesa:img:' + id, { data: c.toDataURL('image/jpeg', 0.9), w: img.width, h: img.height });
  return id;
}
const leerImagen = async (id) => id ? (await Store.get('mesa:img:' + id)) || null : null;
// Elegir imagen: de tu ordenador o de tus tableros
function elegirImagen() {
  return new Promise(async (res) => {
    const all = HAY_CHROME ? await chrome.storage.local.get(null) : {};
    const imgs = Object.keys(all).filter(k => k.startsWith('item:') && all[k].type === 'img').map(k => all[k]).slice(0, 60);
    modal(`<h3>Elegir imagen</h3><button class="btn prim" id="ei-subir">Subir desde el ordenador…</button><input type="file" id="ei-f" accept="image/*" hidden>
      ${imgs.length ? `<h2 style="margin-top:18px">De tus tableros</h2><div class="ei-grid">${imgs.map(i => `<img src="${i.src}" data-it="${i.id}" alt="">`).join('')}</div>` : ''}
      <div class="pie"><button class="btn" data-cerrar>Cancelar</button></div>`, { ancho: 620, alAbrir: (m, cerrar) => {
      $('#ei-subir', m).onclick = () => $('#ei-f', m).click();
      $('#ei-f', m).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const id = await guardarImagen(f); cerrar(); res(id); };
      $$('[data-it]', m).forEach(im => im.onclick = async () => {
        const it = all['item:' + im.dataset.it]; const id = uid();
        await Store.set('mesa:img:' + id, { data: it.src, w: it.w, h: it.h }); cerrar(); res(id);
      });
    } });
  });
}

// ---------- datos de Publicar ----------
const FASES_PROD = ['Primer borrador', 'Reescritura', 'Lectoras beta', 'Corrección', 'Revisión final', 'Portada', 'Maquetación ebook (Kindle Create)', 'Maquetación papel', 'Subido a KDP'];
const TAREAS_LANZ = [
  [-90, 'Portada encargada o terminada', 'Producción'], [-75, 'Corrección profesional terminada', 'Producción'],
  [-60, 'Fecha de lanzamiento y de preventa decididas', 'Amazon'], [-60, 'Ficha completa: sinopsis, palabras clave y categorías', 'Amazon'],
  [-45, 'Maquetar ebook (Kindle Create) y papel', 'Producción'], [-45, 'Subir la preventa a KDP', 'Amazon'],
  [-40, 'Revelación de portada (redes + newsletter)', 'Redes'], [-35, 'Página del libro en la web', 'Web'],
  [-30, 'Buscar lectoras ARC y bookstagrammers', 'Lectoras'], [-30, 'Preparar el contenido A+', 'Amazon'],
  [-21, 'Enviar los ejemplares anticipados (ARC)', 'Lectoras'], [-21, 'Primer capítulo en la newsletter', 'Newsletter'],
  [-14, 'Batch de reels y carruseles del lanzamiento', 'Redes'], [-14, 'Programar la newsletter de lanzamiento en MailerLite', 'Newsletter'],
  [-7, 'Cuenta atrás en stories', 'Redes'], [-5, 'Subir el archivo final del ebook (antes del cierre de la preventa: mira el aviso de KDP)', 'Amazon'],
  [-3, 'Revisar la ficha de Amazon: precio, categorías y A+', 'Amazon'],
  [0, 'Día D: reel, post, stories y newsletter', 'Redes'], [0, 'Enlaces de compra en la web y en la bio', 'Web'],
  [1, 'Compartir las primeras reseñas', 'Redes'], [3, 'Recordar a las lectoras ARC que dejen reseña', 'Lectoras'],
  [7, 'Mirar ventas y ranking', 'Amazon'], [14, 'Carrusel «Lo que dicen las lectoras»', 'Redes'], [30, 'Balance del lanzamiento', 'Amazon']
];
const CATS_LANZ = ['Producción', 'Amazon', 'Redes', 'Newsletter', 'Web', 'Lectoras'];
const HASHTAGS_DEF = '#novelaromantica #romanticacontemporanea #bookstagram #librosrecomendados #literaturaromantica';
function pub(pid = M.actual) {
  M.publicar = M.publicar || {};
  if (!M.publicar[pid]) {
    const p = M.proyectos.find(x => x.id === pid);
    M.publicar[pid] = {
      ficha: { titulo: p ? p.titulo : '', subtitulo: '', serie: '', numero: '', genero: M.perfil.genero || 'Romance', subgenero: '', tropos: [], avisos: '', comparables: '', pitch: '', sinopsisCorta: '', sinopsisLarga: '', portada: null },
      kdp: { keywords: ['', '', '', '', '', '', ''], categorias: ['', '', ''], formatos: { ebook: {}, blanda: {}, dura: {} }, enlaces: { amazon: '', papel: '', otros: '' }, aplus: [] },
      prod: { fases: FASES_PROD.map(n => ({ id: uid(), nombre: n, estado: 'pendiente', fecha: '', archivo: '', quien: '' })), betas: [] },
      lanz: { fecha: '', preventa: '', tareas: [] },
      redes: [], citas: []
    };
  }
  const P = M.publicar[pid];
  P.citas = P.citas || []; P.redes = P.redes || [];
  return P;
}

// =====================================================================
//  VISTA PUBLICAR
// =====================================================================
// Lo de publicar (ficha, Amazon, producción, lanzamiento, redes y web) vive ahora en el Kit Escritoras.
// Aquí se quedan las citas que guardas mientras escribes, y el botón para pasarlo todo al Kit.
let pubTab = 'citas';
VISTAS.publicar = (cont) => {
  const P = pub(); const p = proyecto();
  cont.innerHTML = `<div class="pagina" style="max-width:1180px">
    <h1>Citas de «${esc(p.titulo)}»</h1>
    <div class="tarjeta fila" style="flex-wrap:wrap;gap:14px;margin:14px 0 22px"><div style="flex:1;min-width:260px"><b>Pasar al Kit Escritoras</b>
      <div class="suave" style="font-size:13px">Descarga un archivo con el título, las palabras escritas y las citas${tieneDatosPublicar(P) ? ', y lo que tenías de Amazon, producción, lanzamiento y redes' : ''}. En el Kit, ve a <b>Libro › Traer de Novelia Studio</b> y elígelo.</div></div>
      <button class="btn prim" id="ct-kit">Descargar para el Kit</button></div>
    <div id="pub-cuerpo"></div></div>`;
  $('#ct-kit', cont).onclick = () => exportarParaKit();
  pubCitas($('#pub-cuerpo', cont), P);
};
function tieneDatosPublicar(P) {
  const F = P.ficha || {}, K = P.kdp || {};
  return !!(F.sinopsisLarga || F.sinopsisCorta || F.pitch || (K.keywords || []).some(Boolean) || (P.lanz && (P.lanz.fecha || P.lanz.tareas.length)) || P.redes.length || (P.prod && P.prod.betas.length));
}
async function exportarParaKit() {
  const p = proyecto(); const P = pub();
  let portada = '';
  const im = await leerImagen(P.ficha && P.ficha.portada);
  if (im) {
    const i = new Image(); await new Promise(r => { i.onload = r; i.onerror = r; i.src = im.data; });
    if (i.width) { const k = Math.min(1, 800 / Math.max(i.width, i.height)); const cv = document.createElement('canvas'); cv.width = Math.round(i.width * k); cv.height = Math.round(i.height * k); cv.getContext('2d').drawImage(i, 0, 0, cv.width, cv.height); portada = cv.toDataURL('image/jpeg', 0.85); }
  }
  const publicar = JSON.parse(JSON.stringify(P));
  if (publicar.ficha) publicar.ficha.portada = null;
  if (publicar.kdp) (publicar.kdp.aplus || []).forEach(m => { m.imgs = []; });
  const datos = { tipo: 'novelia-para-kit', v: 1, exportado: new Date().toISOString(), autora: (M.perfil && M.perfil.nombre) || '',
    perfil: M.perfil ? { nombre: M.perfil.nombre || '', usuario: M.perfil.usuario || '', genero: M.perfil.genero || '', foto: M.perfil.foto || '', enlaces: M.perfil.enlaces || {}, otros: M.perfil.otros || [] } : null,
    novela: { titulo: p.titulo, objetivo: p.objetivo || 0, palabras: totalProyecto(), portada, citas: [], publicar } };
  descargar(new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' }), `Para el Kit - ${nombreArchivo(p.titulo)}.json`);
  aviso('Archivo descargado: ábrelo desde el Kit Escritoras');
}
const guardarPub = debounce(() => guardarMeta(), 400);
// Enlaza inputs con data-ruta="ficha.titulo" al objeto P
function enlazarRutas(raiz, P, alCambiar) {
  $$('[data-ruta]', raiz).forEach(i => {
    const ruta = i.dataset.ruta.split('.');
    const set = () => {
      let o = P; for (let k = 0; k < ruta.length - 1; k++) o = o[ruta[k]] = o[ruta[k]] || {};
      o[ruta[ruta.length - 1]] = i.type === 'checkbox' ? i.checked : i.value;
      guardarPub(); alCambiar && alCambiar(i);
    };
    i.addEventListener('input', set); i.addEventListener('change', set);
  });
}
const val = (P, ruta) => { let o = P; for (const k of ruta.split('.')) { if (o == null) return ''; o = o[k]; } return o == null ? '' : o; };
const contador = (n, max) => `<span class="cont${n > max ? ' pasado' : ''}">${fmt(n)} / ${fmt(max)}</span>`;

// (Ficha, Amazon KDP, Producción, Lanzamiento, Redes y Web están ahora en el Kit Escritoras.)

// ---------- Citas y tarjetas para redes ----------
function guardarCita(texto, capTitulo) {
  const P = pub();
  const t = texto.replace(/\s+/g, ' ').trim();
  if (!t) return;
  if (P.citas.some(c => c.texto === t)) return aviso('Esa cita ya estaba guardada');
  P.citas.unshift({ id: uid(), texto: t, cap: capTitulo || '', creada: Date.now() });
  guardarMeta(); aviso('Cita guardada en Citas');
}
const ESTILOS_TARJ = {
  acento: { n: 'Color', fondo: () => getComputedStyle(document.documentElement).getPropertyValue('--acento-base').trim() || '#2f5d50', tinta: '#fffdf8' },
  papel: { n: 'Papel', fondo: () => '#f6f1e8', tinta: '#2a2420' },
  noche: { n: 'Noche', fondo: () => '#1b1916', tinta: '#ece5da' },
  rosa: { n: 'Rosa', fondo: () => '#f3d9dc', tinta: '#5a1f30' },
  imagen: { n: 'Con imagen', fondo: () => '#000', tinta: '#ffffff' }
};
let tarjCfg = { formato: '1080x1350', estilo: 'acento', img: null };
function pubCitas(c, P) {
  c.innerHTML = `<div class="rejilla" style="grid-template-columns:minmax(0,1fr) 420px;gap:20px;align-items:start">
    <div><p class="sub" style="margin-top:0">Guarda frases mientras escribes o relees: selecciona el texto y pulsa <b>❝ Guardar cita</b>. Luego conviértelas en tarjetas para Instagram o en el gancho de un reel.</p>
      <div class="entrada-idea"><input class="txt" id="ct-in" placeholder="O escribe o pega una cita y pulsa Enter"></div>
      ${P.citas.length ? P.citas.map(ci => `<div class="cita${ci.id === tarjCfg.cita ? ' sel' : ''}" data-id="${ci.id}"><div class="cita-t">«${esc(ci.texto)}»</div><div class="fila sep tenue" style="font-size:12px"><span>${esc(ci.cap || '')}</span><span><button class="btn peq" data-tarj>Hacer tarjeta</button> <button class="icono" data-copiar title="Copiar">⧉</button><button class="icono" data-del title="Quitar">✕</button></span></div></div>`).join('') : '<div class="tarjeta vacio">Todavía no hay citas.</div>'}</div>
    <div class="tarjeta" style="position:sticky;top:16px" id="ct-tarjeta">${tarjCfg.cita ? '' : '<div class="vacio">Elige «Hacer tarjeta» en una cita</div>'}</div></div>`;
  $('#ct-in', c).onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { guardarCita(e.target.value, ''); pubCitas(c, P); } };
  $$('.cita', c).forEach(d => { const ci = P.citas.find(x => x.id === d.dataset.id);
    $('[data-tarj]', d).onclick = () => { tarjCfg.cita = ci.id; pubCitas(c, P); };
    $('[data-copiar]', d).onclick = () => copiarTexto(`«${ci.texto}»`);
    $('[data-del]', d).onclick = () => { P.citas = P.citas.filter(x => x !== ci); if (tarjCfg.cita === ci.id) tarjCfg.cita = null; guardarMeta(); pubCitas(c, P); };
  });
  if (tarjCfg.cita && P.citas.some(x => x.id === tarjCfg.cita)) pintarTarjeta($('#ct-tarjeta', c), P);
}
async function pintarTarjeta(caja, P) {
  const ci = P.citas.find(x => x.id === tarjCfg.cita);
  caja.innerHTML = `<h2>Tarjeta</h2>
    <div class="segmentos peq" style="margin-bottom:8px">${[['1080x1350', 'Post 4:5'], ['1080x1080', 'Cuadrada'], ['1080x1920', 'Story / reel']].map(([k, t]) => `<button data-tf="${k}"${tarjCfg.formato === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
    <div style="margin-bottom:10px">${Object.entries(ESTILOS_TARJ).map(([k, e]) => `<span class="chip${tarjCfg.estilo === k ? ' on' : ''}" data-te="${k}">${e.n}</span>`).join('')}</div>
    ${tarjCfg.estilo === 'imagen' ? '<button class="btn peq" id="tj-img" style="margin-bottom:10px">Elegir imagen de fondo…</button>' : ''}
    <canvas id="tj-c" style="width:100%;border-radius:10px;box-shadow:var(--sombra)"></canvas>
    <div class="fila" style="margin-top:10px"><button class="btn prim" id="tj-png">Descargar PNG</button><button class="btn" id="tj-tab">Guardar en el tablero</button></div>`;
  $$('[data-tf]', caja).forEach(b => b.onclick = () => { tarjCfg.formato = b.dataset.tf; pintarTarjeta(caja, P); });
  $$('[data-te]', caja).forEach(b => b.onclick = () => { tarjCfg.estilo = b.dataset.te; pintarTarjeta(caja, P); });
  if ($('#tj-img', caja)) $('#tj-img', caja).onclick = async () => { const id = await elegirImagen(); if (id) { tarjCfg.img = id; pintarTarjeta(caja, P); } };
  const [W, H] = tarjCfg.formato.split('x').map(Number);
  const cv = $('#tj-c', caja); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const est = ESTILOS_TARJ[tarjCfg.estilo];
  g.fillStyle = est.fondo(); g.fillRect(0, 0, W, H);
  const bg = tarjCfg.estilo === 'imagen' ? await leerImagen(tarjCfg.img || P.ficha.portada) : null;
  if (bg) {
    const im = new Image(); await new Promise(r => { im.onload = r; im.onerror = r; im.src = bg.data; });
    const k = Math.max(W / im.width, H / im.height); const w = im.width * k, h = im.height * k;
    g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(0, 0, W, H);
  }
  const serif = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  const margen = 120, ancho = W - margen * 2;
  const texto = ci.texto;
  let tam = 74, lineas = [];
  const partir = (t) => { const out = []; let l = ''; t.split(' ').forEach(w => { const p = l ? l + ' ' + w : w; if (g.measureText(p).width > ancho && l) { out.push(l); l = w; } else l = p; }); if (l) out.push(l); return out; };
  for (; tam >= 30; tam -= 2) { g.font = `italic ${tam}px ${serif}`; lineas = partir(texto); if (lineas.length * tam * 1.38 < H * 0.55) break; }
  const alto = lineas.length * tam * 1.38;
  let y = (H - alto) / 2 + tam * 0.4;
  g.fillStyle = est.tinta; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = 0.35; g.font = `${tam * 2.6}px ${serif}`; g.fillText('“', W / 2, y - tam * 1.5); g.globalAlpha = 1;
  g.font = `italic ${tam}px ${serif}`;
  lineas.forEach((l, i) => g.fillText(l, W / 2, y + i * tam * 1.38));
  g.font = `600 30px ui-sans-serif, system-ui, sans-serif`; g.globalAlpha = 0.85;
  const pie = [P.ficha.titulo || proyecto().titulo, M.perfil.nombre].filter(Boolean).join(' · ').toUpperCase();
  g.fillText(pie.split('').join(String.fromCharCode(8202)), W / 2, H - 120); g.globalAlpha = 1;
  $('#tj-png', caja).onclick = () => cv.toBlob(b => descargar(b, `Cita ${nombreArchivo((P.ficha.titulo || 'novela'))} ${tarjCfg.formato}.png`), 'image/png');
  $('#tj-tab', caja).onclick = async () => {
    const boards = await getBoards();
    const b = boards.find(x => (x.nombre || '').toLowerCase() === (P.ficha.titulo || proyecto().titulo).toLowerCase()) || boards[0];
    await guardarItem({ board: b.id, type: 'img', src: cv.toDataURL('image/jpeg', 0.88), w: W, h: H, note: `Cita: «${texto.slice(0, 80)}»`, pageUrl: '', pageTitle: '' });
    aviso(`Guardada en el tablero «${b.nombre}»`);
  };
}
// Botón flotante «Guardar cita» al seleccionar texto en Escribir o Leer
(function () {
  const b = el('button', { class: 'btn-cita', type: 'button' }, '❝ Guardar cita');
  document.body.append(b);
  let texto = '', cap = '';
  const ocultar = () => b.classList.remove('on');
  document.addEventListener('mouseup', (e) => {
    if (e.target === b) return;
    setTimeout(() => {
      const s = getSelection();
      const zona = s && s.anchorNode && (s.anchorNode.parentElement || s.anchorNode).closest && (s.anchorNode.parentElement || s.anchorNode).closest('#editor, #libro, #su-libro, .suelto-vista');
      const t = s ? s.toString().trim() : '';
      if (!zona || t.length < 12 || t.length > 600) return ocultar();
      texto = t;
      const n = M.nodos[nodoAbierto]; cap = zona.id === 'editor' && n ? (n.tipo === 'esc' ? (M.nodos[n.padre] || {}).titulo : n.titulo) : '';
      const r = s.getRangeAt(0).getBoundingClientRect();
      b.style.left = Math.min(innerWidth - 150, Math.max(10, r.left + r.width / 2 - 65)) + 'px';
      b.style.top = Math.max(10, r.top - 44) + 'px';
      b.classList.add('on');
    }, 10);
  });
  document.addEventListener('mousedown', (e) => { if (e.target !== b) ocultar(); });
  document.addEventListener('scroll', ocultar, true);
  b.addEventListener('click', () => { guardarCita(texto, cap); ocultar(); });
})();

const ACENTOS = [['#2f5d50', 'Verde'], ['#7a1f3d', 'Vino'], ['#b5536b', 'Rosa'], ['#3d6a8a', 'Azul'], ['#6b4f8a', 'Morado'], ['#c27c4e', 'Teja'], ['#2b2622', 'Tinta']];
function aplicarAcento() {
  const A = M.ajustes; const ac = A.acento || '#2f5d50';
  const r = document.documentElement;
  r.style.setProperty('--acento-base', ac);
  const noche = r.dataset.theme === 'noche';
  r.style.setProperty('--verde', noche ? `color-mix(in srgb, ${ac} 60%, #ffffff)` : ac);
  r.style.setProperty('--verde-claro', noche ? `color-mix(in srgb, ${ac} 28%, #22201c)` : `color-mix(in srgb, ${ac} 14%, #fffdf8)`);
  const logo = $('.rail .logo');
  if (logo) {
    const ic = A.icono || { tipo: 'letra', texto: 'N' };
    logo.style.background = ic.tipo === 'imagen' ? 'transparent' : ac;
    logo.innerHTML = ic.tipo === 'imagen' && ic.img ? `<img src="${ic.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:11px">` : esc(ic.texto || 'N');
    logo.style.fontStyle = ic.tipo === 'emoji' ? 'normal' : 'italic';
  }
}
function dibujarIcono(ic, color, lado) {
  const cv = document.createElement('canvas'); cv.width = cv.height = lado;
  const g = cv.getContext('2d');
  return new Promise(async (res) => {
    const rr = lado * 0.24;
    g.beginPath(); g.moveTo(rr, 0); g.arcTo(lado, 0, lado, lado, rr); g.arcTo(lado, lado, 0, lado, rr); g.arcTo(0, lado, 0, 0, rr); g.arcTo(0, 0, lado, 0, rr); g.closePath();
    if (ic.tipo === 'imagen' && ic.img) {
      const im = new Image(); await new Promise(r => { im.onload = r; im.onerror = r; im.src = ic.img; });
      g.save(); g.clip(); const k = Math.max(lado / im.width, lado / im.height); g.drawImage(im, (lado - im.width * k) / 2, (lado - im.height * k) / 2, im.width * k, im.height * k); g.restore();
    } else {
      g.fillStyle = color; g.fill();
      g.fillStyle = '#fffdf8'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const t = ic.texto || 'N';
      g.font = ic.tipo === 'emoji' ? `${lado * 0.62}px "Apple Color Emoji","Segoe UI Emoji",sans-serif` : `italic 600 ${lado * (t.length > 1 ? 0.5 : 0.68)}px "Iowan Old Style",Palatino,Georgia,serif`;
      g.fillText(t, lado / 2, lado / 2 + lado * 0.04);
    }
    res(cv);
  });
}
async function aplicarIconoChrome() {
  const ic = M.ajustes.icono; if (!ic) return;
  const datos = {}; const urls = {};
  for (const l of [16, 32, 48, 128]) { const cv = await dibujarIcono(ic, M.ajustes.acento || '#2f5d50', l); datos[l] = cv.getContext('2d').getImageData(0, 0, l, l); if (l === 32 || l === 128) urls[l] = cv.toDataURL('image/png'); }
  await Store.set('mesa:icono', { urls, acento: M.ajustes.acento, icono: ic });
  if (window.Puente) Puente.pedir({ tipo: 'icono', urls });
  const fav = $('link[rel=icon]'); if (fav) fav.href = urls[32];
}
function tarjetaTuMesa() {
  const A = M.ajustes; const ic = A.icono || { tipo: 'letra', texto: 'N' };
  return `<div class="tarjeta" id="aj-tumesa"><h2>Tu Novelia: color e icono</h2>
    <div class="campo"><span>Color</span><div class="fila" style="flex-wrap:wrap">${ACENTOS.map(([c, n]) => `<button class="color-ac${(A.acento || '#2f5d50') === c ? ' on' : ''}" data-ac="${c}" title="${n}" style="background:${c}"></button>`).join('')}
      <label class="fila suave" style="font-size:12.5px;gap:6px;margin-left:6px">Otro <input type="color" id="tm-color" value="${A.acento || '#2f5d50'}" style="width:36px;height:28px;border:0;background:none;padding:0"></label></div></div>
    <div class="campo"><span>Icono (en la barra de Chrome y arriba a la izquierda)</span>
      <div class="fila" style="flex-wrap:wrap"><div class="segmentos peq">${[['letra', 'Letra'], ['emoji', 'Emoji'], ['imagen', 'Imagen']].map(([k, t]) => `<button data-it="${k}"${ic.tipo === k ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
        ${ic.tipo === 'imagen' ? '<button class="btn peq" id="tm-img">Elegir imagen…</button>' : `<input class="txt" id="tm-txt" value="${esc(ic.texto || (ic.tipo === 'emoji' ? '✍️' : 'N'))}" maxlength="${ic.tipo === 'emoji' ? 4 : 2}" style="width:70px;text-align:center;font-size:18px">`}
        ${ic.tipo === 'emoji' ? ['✍️', '📖', '🖋️', '🌊', '💌', '☕', '🌙', '🍂'].map(e => `<span class="chip" data-emo="${e}" style="font-size:16px">${e}</span>`).join('') : ''}
        <canvas id="tm-prev" width="64" height="64" style="width:40px;height:40px;margin-left:8px"></canvas></div></div>
    <p class="tenue" style="font-size:12.5px;margin:0">El icono del Dock lo pone el sistema al instalar la app; este cambia el de la ventana y el del ayudante en Chrome.</p></div>`;
}
function enlazarTuMesa(cont) {
  const A = M.ajustes; A.icono = A.icono || { tipo: 'letra', texto: 'N' };
  const prev = async () => { const cv = await dibujarIcono(A.icono, A.acento || '#2f5d50', 64); const p = $('#tm-prev', cont); if (p) p.getContext('2d').clearRect(0, 0, 64, 64), p.getContext('2d').drawImage(cv, 0, 0); };
  const aplicar = debounce(async () => { guardarMeta(); aplicarAcento(); await aplicarIconoChrome(); prev(); }, 200);
  $$('[data-ac]', cont).forEach(b => b.onclick = () => { A.acento = b.dataset.ac; aplicar(); $$('[data-ac]', cont).forEach(x => x.classList.toggle('on', x === b)); $('#tm-color', cont).value = A.acento; });
  $('#tm-color', cont).oninput = (e) => { A.acento = e.target.value; $$('[data-ac]', cont).forEach(x => x.classList.remove('on')); aplicar(); };
  $$('[data-it]', cont).forEach(b => b.onclick = () => { A.icono = { tipo: b.dataset.it, texto: b.dataset.it === 'emoji' ? '✍️' : b.dataset.it === 'letra' ? 'N' : '', img: A.icono.img }; guardarMeta(); VISTAS.ajustes(cont).then(() => { aplicar(); $('#aj-tumesa', cont).scrollIntoView({ block: 'center' }); }); });
  if ($('#tm-txt', cont)) $('#tm-txt', cont).oninput = (e) => { A.icono.texto = e.target.value.trim() || 'N'; aplicar(); };
  $$('[data-emo]', cont).forEach(x => x.onclick = () => { A.icono.texto = x.dataset.emo; $('#tm-txt', cont).value = x.dataset.emo; aplicar(); });
  if ($('#tm-img', cont)) $('#tm-img', cont).onclick = async () => { const id = await elegirImagen(); if (!id) return; const im = await leerImagen(id); const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); const i = new Image(); await new Promise(r => { i.onload = r; i.src = im.data; }); const k = Math.max(256 / i.width, 256 / i.height); g.drawImage(i, (256 - i.width * k) / 2, (256 - i.height * k) / 2, i.width * k, i.height * k); A.icono.img = cv.toDataURL('image/png'); Store.remove('mesa:img:' + id); aplicar(); };
  prev();
}

// ---------- enganches con el resto de la app ----------
(function () {
  const ajustesOrig = VISTAS.ajustes;
  VISTAS.ajustes = async (cont) => {
    await ajustesOrig(cont);
    const rej = $('.pagina .rejilla', cont);
    if (rej) { const d = document.createElement('div'); d.innerHTML = tarjetaTuMesa(); rej.insertBefore(d.firstElementChild, rej.children[1]); enlazarTuMesa(cont); }
  };
})();

// ---------- arranque ----------
(async () => { if (window.NOVELIA_APP) await prepararApp(); await iniciar(); aplicarAcento(); if (window.NOVELIA_APP) despuesDeIniciar(); })();
