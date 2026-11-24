{
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'dilshangulati07@gmail.com';

/* ---------- the orb: one WebGL fragment shader ---------- */
const FS = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uTalk; uniform float uBloom;
float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
vec3 rotX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}
vec3 pal(float t){
  vec3 c1=vec3(.62,.95,.88),c2=vec3(.66,.70,1.),c3=vec3(1.,.77,.66);
  float f=fract(t)*6.2831853;
  float w1=.5+.5*cos(f),w2=.5+.5*cos(f-2.0944),w3=.5+.5*cos(f-4.1888);
  w1*=w1*w1;w2*=w2*w2;w3*=w3*w3;
  return (c1*w1+c2*w2+c3*w3)/(w1+w2+w3+1e-4);
}
void main(){
  float m=min(uRes.x,uRes.y);
  vec2 p=(gl_FragCoord.xy-.5*uRes)/(.5*m);
  float r=length(p),ang=atan(p.y,p.x);
  float R=.6*uBloom;
  float wob=.006*sin(ang*3.+uTime*1.1)+uTalk*(.013*sin(ang*5.+uTime*6.)+.007*sin(ang*9.-uTime*8.3));
  float Rw=max(R+wob*uBloom,1e-4);
  float d=r-Rw;
  vec3 hc=pal(ang/6.2831853+uTime*.04);
  float halo=exp(-max(d,0.)*(6.5-2.5*uTalk))*(.34+.14*uTalk)*uBloom*(1.-smoothstep(.7,.98,r));
  vec3 col=hc*halo; float a=halo;
  if(r<Rw+.01){
    vec2 q=p/Rw; float rr=length(q); float z=sqrt(max(0.,1.-rr*rr));
    float tt=uTime*(1.+uTalk*.7);
    vec2 v=q*(1.+.32*(1.-z));
    float tw=(1.-rr)*1.1*sin(tt*.31)+tt*.12;
    v=mat2(cos(tw),-sin(tw),sin(tw),cos(tw))*v;
    v+=(vec2(fbm(vec3(v*1.6,tt*.11)),fbm(vec3(v*1.6+4.3,-tt*.09)))-.5)*.55;
    vec3 c=mix(vec3(.045,.05,.07),vec3(.10,.11,.15),smoothstep(-1.,1.,q.y));
    float amp=.9+.22*uTalk;
    for(int i=0;i<4;i++){
      float fi=float(i);
      vec2 ce=.56*vec2(cos(tt*(.37+.09*fi)+fi*1.9),sin(tt*(.29+.07*fi)+fi*2.6));
      vec2 dd=v-ce;
      float an=fi*.8+tt*.2;
      dd=mat2(cos(an),-sin(an),sin(an),cos(an))*dd;
      dd.x*=.62;
      float g=exp(-dot(dd,dd)*(8.-1.1*uTalk));
      vec3 bc=i==0?vec3(.31,.89,.78):i==1?vec3(.47,.53,1.):i==2?vec3(1.,.6,.46):vec3(.72,.58,1.);
      c+=bc*g*amp*(.5+.5*z);
    }
    c+=vec3(.9,.95,1.)*pow(z,3.)*.06;
    vec2 hl=(q-vec2(-.36,.46))*vec2(1.,1.9);
    c+=(1.-smoothstep(0.,.34,length(hl)))*.24;
    float fres=pow(1.-z,3.);
    c+=fres*pal(ang/6.2831853+uTime*.04+.15)*1.15;
    c+=smoothstep(.93,1.,rr)*(1.-smoothstep(.985,1.,rr))*.25;
    c=c/(1.+.25*c);
    float e=smoothstep(0.,.008,Rw-r);
    col=mix(col,c,e); a=mix(a,1.,e);
  }
  gl_FragColor=vec4(col,a);
}`;

const orb = (() => {
  const wrap = $('#orb-wrap'), cv = $('#orb');
  const noop = { talk() {}, pulse() {} };
  let gl;
  try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) {}
  if (!gl) { wrap.classList.add('flat'); return noop; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  } catch (e) { wrap.classList.add('flat'); return noop; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uTime', 'uMouse', 'uTalk', 'uBloom'].forEach(n => U[n] = gl.getUniformLocation(prog, n));

  const st = { mx: 0, my: 0, tx: 0, ty: 0, talk: 0, talkT: 0, pulse: 0, bloom: reduce ? 1 : 0, on: false, seen: true, t0: performance.now() };
  const ease = x => 1 - Math.pow(1 - x, 3);
  const size = () => {
    const d = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.round(cv.clientWidth * d), hgt = Math.round(cv.clientHeight * d);
    if (cv.width !== w || cv.height !== hgt) { cv.width = w; cv.height = hgt; gl.viewport(0, 0, w, hgt); }
  };
  const draw = now => {
    size();
    st.mx += (st.tx - st.mx) * .05; st.my += (st.ty - st.my) * .05;
    st.pulse *= .88;
    st.talk += (Math.min(1.2, st.talkT + st.pulse) - st.talk) * .12;
    if (st.bloom < 1) st.bloom = Math.min(1, st.bloom + .011);
    gl.uniform2f(U.uRes, cv.width, cv.height);
    gl.uniform1f(U.uTime, reduce ? 6 : (now - st.t0) / 1000);
    gl.uniform2f(U.uMouse, st.mx, st.my);
    gl.uniform1f(U.uTalk, st.talk);
    gl.uniform1f(U.uBloom, ease(st.bloom));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = now => { draw(now); if (st.on) requestAnimationFrame(loop); };
  const run = () => {
    const want = !reduce && st.seen && !document.hidden;
    if (want && !st.on) { st.on = true; requestAnimationFrame(loop); }
    if (!want) st.on = false;
  };
  if (reduce) {
    draw(performance.now());
    const ro = new ResizeObserver(() => draw(performance.now()));
    ro.observe(cv);
  } else {
    const io = new IntersectionObserver(es => { st.seen = es[0].isIntersecting; run(); });
    io.observe(wrap);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      st.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * .9)));
      st.ty = Math.max(-1, Math.min(1, -(e.clientY - (r.top + r.height / 2)) / (r.height * .9)));
    }, { passive: true });
    run();
  }
  return {
    talk(on) { st.talkT = on ? .55 : 0; },
    pulse() { st.pulse = .5; }
  };
})();

/* ---------- Velos talking ---------- */
const answers = {
  intro: { a: "Hi, I'm Velos. Dilshan built me to run his PC by voice. Ask me something about him." },
  built: { a: 'Four things he uses himself: me, Rigsmith for building PCs in 3D, Kafé Bangkok for cafés, and Metro Buddy for the trains.', act: ['See Rigsmith next', '#rigsmith'] },
  january: { a: "Yes. He's in his third year at Siam University and looking for an internship in Bangkok from January 2027.", act: ['Email him', '#contact'] },
  fast: { a: 'About 1.8 seconds for a command and 2.3 for a chat. I used to take 25, until he rebuilt how I load and speak.', act: ['How he did it', '#velos-info'] },
  work: { a: "He writes the plan first, builds fast, and lets tests decide when it's done. I have 877 of them.", act: ['More about him', '#about'] },
  reach: { a: `Email is fastest: ${EMAIL}. He's on LinkedIn and GitHub too.`, act: ['Copy email', 'copy'] }
};
const talkEl = $('#talk'), cap = $('#caption'), capSr = $('#caption-sr'), slot = $('#act-slot');
let sayId = 0;

async function copyEmail(btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(EMAIL); ok = true; } catch (e) {}
  if (btn) {
    const was = btn.textContent;
    btn.textContent = ok ? 'Copied' : EMAIL;
    setTimeout(() => { btn.textContent = was; }, 2200);
  }
}

async function say(key) {
  const item = answers[key]; if (!item) return;
  const id = ++sayId;
  slot.replaceChildren();
  capSr.textContent = item.a;
  talkEl.classList.add('speaking'); orb.talk(true);
  const words = item.a.split(' ');
  if (reduce) { cap.textContent = item.a; }
  else {
    cap.replaceChildren();
    for (let i = 0; i < words.length; i++) {
      if (id !== sayId) return;
      const s = document.createElement('span');
      s.className = 'w'; s.textContent = words[i];
      cap.append(s, i < words.length - 1 ? ' ' : '');
      orb.pulse();
      await wait(55 + Math.min(words[i].length * 13, 130));
    }
  }
  if (id !== sayId) return;
  if (item.act) {
    const [label, target] = item.act;
    const el = target === 'copy' ? document.createElement('button') : document.createElement('a');
    el.className = 'act'; el.textContent = label;
    if (target === 'copy') { el.type = 'button'; el.addEventListener('click', () => copyEmail(el)); }
    else el.href = target;
    slot.append(el);
  }
  await wait(500);
  if (id === sayId) { talkEl.classList.remove('speaking'); orb.talk(false); }
}

let asked = false;
$('.asks').addEventListener('click', e => {
  const b = e.target.closest('button[data-q]'); if (!b) return;
  asked = true;
  $$('.asks button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  say(b.dataset.q);
});
$$('.asks button').forEach(b => b.setAttribute('aria-pressed', 'false'));
const talkIO = new IntersectionObserver(es => {
  if (es[0].isIntersecting) { talkIO.disconnect(); setTimeout(() => { if (!asked) say('intro'); }, 350); }
}, { threshold: .55 });
talkIO.observe($('#talk'));

/* ---------- fit the name and the email to their width ---------- */
const fitters = [];
function fit(el, { max = 400, min = 20 } = {}) {
  const inner = $('.fit-in', el) || el;
  const run = () => {
    const avail = el.clientWidth; if (!avail) return;
    const probe = inner.cloneNode(true);
    probe.removeAttribute('id');
    Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', animation: 'none', fontSize: '100px', left: '-9999px', top: '0' });
    let widest = 0;
    const stacked = getComputedStyle($('.w1', el) || inner).display === 'block';
    el.appendChild(probe);
    if (stacked) { $$('.w1, .w2', probe).forEach(w => { w.style.display = 'inline-block'; }); widest = Math.max(...$$('.w1, .w2', probe).map(w => w.getBoundingClientRect().width)); }
    else widest = probe.getBoundingClientRect().width;
    probe.remove();
    const size = Math.max(min, Math.min(max, 100 * avail / widest * .985));
    el.style.fontSize = size + 'px';
  };
  fitters.push(run);
  run();
}
const refit = () => fitters.forEach(f => f());
fit($('.mail a'), { max: 72, min: 22 });
if (document.fonts) { document.fonts.load('700 100px Onest').then(refit, refit); document.fonts.ready.then(refit); }
window.addEventListener('load', () => { refit(); setTimeout(refit, 1700); });
let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(refit, 80); });

/* ---------- header ---------- */
const bar = $('#top-bar');
const onScroll = () => bar.classList.toggle('solid', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- screenshot switchers ---------- */
$$('.thumbs').forEach(g => {
  const img = $(g.dataset.for);
  g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.getAttribute('aria-pressed') === 'true') return;
    $$('button', g).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    img.classList.add('swap');
    const next = new Image(); next.src = b.dataset.src;
    const show = () => { img.src = b.dataset.src; img.alt = b.dataset.alt; requestAnimationFrame(() => img.classList.remove('swap')); };
    (next.decode ? next.decode() : Promise.resolve()).then(show, show);
  });
});

/* ---------- stages lean toward the pointer ---------- */
if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  $$('.stage').forEach(s => {
    const rig = $('.rig', s);
    s.addEventListener('pointermove', e => {
      const r = s.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      rig.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`;
    });
    s.addEventListener('pointerleave', () => { rig.style.transform = ''; });
  });
}

/* ---------- bars fill when they come into view ---------- */
const barIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); barIO.unobserve(e.target); }
}), { threshold: .45 });
$$('.bars').forEach(b => barIO.observe(b));

/* ---------- stage lights come on as each project arrives ---------- */
const stageIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('lit'); stageIO.unobserve(e.target); }
}), { threshold: .18, rootMargin: '0px 0px -8% 0px' });
$$('.stage').forEach(s => stageIO.observe(s));

/* ---------- full-size screenshot viewer ---------- */
const lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
let lbList = [], lbI = 0;
const lbShow = () => {
  const it = lbList[lbI];
  lbImg.src = it.src; lbImg.alt = it.alt;
  lbCap.textContent = lbList.length > 1 ? `${it.label} (${lbI + 1} of ${lbList.length})` : it.label;
  lb.classList.toggle('single', lbList.length < 2);
};
const lbStep = d => { lbI = (lbI + d + lbList.length) % lbList.length; lbShow(); };
$$('.proj').forEach(p => {
  if (!lb.showModal) return;
  const name = $('h3', p).textContent;
  $$('.device img', p).forEach(shot => {
    const group = shot.id ? $$('.thumbs', p).find(g => g.dataset.for === '#' + shot.id) : null;
    shot.classList.add('zoomable'); shot.tabIndex = 0; shot.setAttribute('role', 'button');
    shot.setAttribute('aria-label', `View ${name} screenshot full size`);
    const open = () => {
      const btns = group ? $$('button', group) : [];
      lbList = btns.length ? btns.map(b => ({ src: b.dataset.src, alt: b.dataset.alt, label: `${name}: ${b.textContent.trim()}` }))
                           : [{ src: shot.getAttribute('src'), alt: shot.alt, label: name }];
      lbI = Math.max(0, btns.findIndex(b => b.getAttribute('aria-pressed') === 'true'));
      lbShow(); lb.showModal();
    };
    shot.addEventListener('click', open);
    shot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
});
lb.addEventListener('click', e => {
  const a = e.target.closest('[data-lb]');
  if (a) { const k = a.dataset.lb; if (k === 'close') lb.close(); else lbStep(k === 'next' ? 1 : -1); return; }
  if (e.target === lb || e.target.tagName === 'FIGURE') lb.close();
});
lb.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') lbStep(1);
  if (e.key === 'ArrowLeft') lbStep(-1);
});

/* ---------- hero: "I build ..." line and the floating project cards ---------- */
const art = $('#hero-art'), rws = $$('.rw'), cards = $$('.hero-art .card');
let ri = 0, rotTimer = null, paused = false;
const showRot = i => {
  if (i === ri && rws[i].classList.contains('on')) { cards.forEach(c => c.classList.toggle('on', +c.dataset.i === i)); return; }
  const prev = rws[ri];
  prev.classList.remove('on'); prev.classList.add('out');
  setTimeout(() => prev.classList.remove('out'), 700);
  ri = i; rws[ri].classList.add('on');
  cards.forEach(c => c.classList.toggle('on', +c.dataset.i === ri));
};
const startRot = () => { clearInterval(rotTimer); rotTimer = setInterval(() => { if (!paused && !document.hidden) showRot((ri + 1) % rws.length); }, 2800); };
if (!reduce) {
  art.classList.add('live');
  cards.forEach(c => c.classList.toggle('on', +c.dataset.i === 0));
  setTimeout(startRot, 1600);
  cards.forEach(c => {
    c.addEventListener('pointerenter', () => { paused = true; showRot(+c.dataset.i); });
    c.addEventListener('pointerleave', () => { paused = false; startRot(); });
    c.addEventListener('focus', () => { paused = true; showRot(+c.dataset.i); });
    c.addEventListener('blur', () => { paused = false; });
  });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = 0, px = 0, py = 0;
    window.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        document.documentElement.style.setProperty('--px', px + 'px');
        document.documentElement.style.setProperty('--py', py + 'px');
        if (window.scrollY < innerHeight) {
          const r = art.getBoundingClientRect();
          art.style.setProperty('--mx', Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / (innerWidth / 2))).toFixed(3));
          art.style.setProperty('--my', Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / (innerHeight / 2))).toFixed(3));
        }
      });
    }, { passive: true });
  }
}

/* ---------- background colours follow the section you're in ---------- */
const sceneIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) document.body.dataset.scene = e.target.dataset.scene;
}), { rootMargin: '-45% 0px -50% 0px' });
$$('[data-scene]').forEach(s => sceneIO.observe(s));

/* ---------- headings, text and cards rise in as you scroll ---------- */
if (!reduce && 'IntersectionObserver' in window) {
  $$('h2').forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', words.join(' '));
    h.textContent = '';
    words.forEach((w, k) => {
      const s = document.createElement('span');
      s.className = 'sw'; s.style.setProperty('--k', k); s.setAttribute('aria-hidden', 'true'); s.textContent = w;
      h.append(s, k < words.length - 1 ? ' ' : '');
    });
    h.classList.add('reveal');
  });
  const groups = ['.intro p', '.info .head', '.info .body', '.thumbs', '.talkbox', '.game .art', '.g-text', '.team', '.a-text p', '.a-side', '.contact > p', '.mail', '.contact .cta'];
  groups.forEach(sel => $$(sel).forEach((el, k) => {
    el.classList.add('reveal');
    if (sel === '.team' || sel === '.a-text p') el.style.setProperty('--rd', (k % 3) * .12 + 's');
    if (sel === '.info .body') el.style.setProperty('--rd', '.12s');
  }));
  const revIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('shown'); revIO.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => revIO.observe(el));

  /* numbers count up */
  const cIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t0 = performance.now(), dur = 1400;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  }), { threshold: .8 });
  $$('[data-count]').forEach(el => cIO.observe(el));
}

/* ---------- copy email ---------- */
$('#copy').addEventListener('click', e => copyEmail(e.currentTarget));
}
