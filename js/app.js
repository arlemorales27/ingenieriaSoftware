// app.js — lógica común de la app (inicio, animación de portada, auth y progreso)
import { supabase } from './supabase.js';

const emailInput = document.getElementById('emailInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

async function loadSession(){
  const { data: { session } } = await supabase.auth.getSession();
  if(session){
    emailInput.value = session.user.email;
    emailInput.setAttribute('readonly','true');
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
    updateTopicProgressUI(session.user.email);
  }
}
logoutBtn?.addEventListener('click', async ()=>{
  await supabase.auth.signOut();
  location.reload();
});

loginBtn?.addEventListener('click', async ()=>{
  const email = (emailInput.value || '').trim();
  if(!email || !/@/.test(email)) return alert('Introduce tu correo institucional');
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } });
  if(error){ alert('Error al enviar enlace mágico: ' + error.message); return; }
  alert('Te enviamos un enlace de acceso a tu correo. Revísalo y vuelve a esta ventana.');
});

loadSession();

// Animación canvas portada
const canvas = document.getElementById('heroCanvas');
if(canvas){
  const ctx = canvas.getContext('2d');
  let w, h, nodes, t = 0;
  function reset(){
    w = canvas.width = canvas.clientWidth * devicePixelRatio;
    h = canvas.height = 500 * devicePixelRatio;
    nodes = Array.from({length: 90}, (_,i)=> ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-.5)*.6, vy: (Math.random()-.5)*.6,
      r: 1 + Math.random()*2
    }));
  }
  function step(){
    t+=0.01;
    ctx.clearRect(0,0,w,h);
    // background glow
    const grad = ctx.createRadialGradient(w*.2,h*.2,10, w*.2,h*.2, Math.max(w,h)*.7);
    grad.addColorStop(0,'rgba(76,201,240,.12)');
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);

    for(const n of nodes){
      n.x+=n.vx; n.y+=n.vy;
      if(n.x<0||n.x>w) n.vx*=-1;
      if(n.y<0||n.y>h) n.vy*=-1;
    }
    // connections
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a = nodes[i], b = nodes[j];
        const dx=a.x-b.x, dy=a.y-b.y;
        const d = Math.hypot(dx,dy);
        if(d<120*devicePixelRatio){
          ctx.globalAlpha = 1 - d/(120*devicePixelRatio);
          ctx.strokeStyle = 'rgba(76,201,240,.6)';
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    for(const n of nodes){
      ctx.beginPath();
      ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
      ctx.fillStyle = '#4cc9f0';
      ctx.fill();
    }
    requestAnimationFrame(step);
  }
  window.addEventListener('resize', reset, {passive:true});
  reset(); step();
}

// Cargar el progreso de cada tema para el usuario
async function updateTopicProgressUI(email){
  for(let i=1;i<=16;i++){
    const el = document.getElementById('progress-t'+i);
    if(!el) continue;
    const { data, error } = await supabase
      .from('progreso_estudiantes')
      .select('avance')
      .eq('email', email)
      .eq('tema', i)
      .single();
    if(!error && data){ el.value = data.avance || 0; }
  }
}
