// tema1.js — interactividad del tema 1
import { supabase, requireAuth } from './supabase.js';

let userEmail = null;
let answers = {}; // { qid: text }

async function init(){
  const email = await requireAuth();
  userEmail = email;
  // Cargar respuestas previas
  const { data } = await supabase.from('progreso_estudiantes')
    .select('respuestas, avance')
    .eq('email', userEmail).eq('tema', 1).maybeSingle();
  if(data?.respuestas){
    answers = data.respuestas;
    for(const [qid, text] of Object.entries(answers)){
      const el = document.querySelector(`.answer[data-qid="${qid}"]`);
      if(el){ el.value = text; }
    }
    updateProgressUI(data.avance || 0);
  }
  bindQuiz();
  bindDragGame();
  bindComplete();
  animateCanvas();
}
function updateProgressUI(value){
  const p = document.getElementById('temaProgress');
  const t = document.getElementById('temaProgressText');
  if(p){ p.value = value; }
  if(t){ t.textContent = Math.round(value) + '%'; }
}

function bindQuiz(){
  document.querySelectorAll('.answer').forEach((ta)=>{
    const qid = ta.dataset.qid;
    const status = document.createElement('div');
    status.className = 'save-status';
    ta.insertAdjacentElement('afterend', status);

    let timer;
    ta.addEventListener('input', ()=>{
      clearTimeout(timer);
      timer = setTimeout(async ()=>{
        answers[qid] = ta.value.trim();
        status.textContent = 'Guardando…';
        await saveProgress();
        status.textContent = 'Guardado ✓';
      }, 500);
    });
  });
}

async function saveProgress(){
  // calcular avance: % de preguntas respondidas + bonus por mini-juego
  const totalQuestions = document.querySelectorAll('.answer').length;
  const answered = Object.values(answers).filter(v=>v && v.length>3).length;
  let bonus = +(window.__dragGameCompleted || 0) * 10; // 0 o 10%
  const avance = Math.min(100, Math.round((answered/totalQuestions)*90 + bonus));

  const payload = { email: userEmail, tema: 1, avance, respuestas: answers };
  const { error } = await supabase.from('progreso_estudiantes')
    .upsert(payload, { onConflict: 'email,tema' });
  if(!error){ updateProgressUI(avance); }
}

function bindDragGame(){
  const tokens = document.querySelectorAll('.token');
  const buckets = document.querySelectorAll('.bucket');
  tokens.forEach(t=>{
    t.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('text/plain', t.textContent);
      e.dataTransfer.setData('target', t.dataset.target);
    });
  });
  buckets.forEach(b=>{
    b.addEventListener('dragover', e=>{ e.preventDefault(); b.classList.add('dragover'); });
    b.addEventListener('dragleave', ()=> b.classList.remove('dragover'));
    b.addEventListener('drop', e=>{
      e.preventDefault(); b.classList.remove('dragover');
      const txt = e.dataTransfer.getData('text/plain');
      const target = e.dataTransfer.getData('target');
      if(b.dataset.accept === target){
        const node = document.createElement('div');
        node.className = 'token'; node.textContent = txt;
        b.appendChild(node);
        window.__dragGameCompleted = 1;
        saveProgress();
      }else{
        alert('Categoría incorrecta. Inténtalo de nuevo.');
      }
    });
  });
}

function bindComplete(){
  document.getElementById('markComplete')?.addEventListener('click', async ()=>{
    const { data } = await supabase.from('progreso_estudiantes')
      .select('avance').eq('email', userEmail).eq('tema',1).maybeSingle();
    const avance = Math.max(100, data?.avance || 0);
    await supabase.from('progreso_estudiantes')
      .upsert({ email: userEmail, tema: 1, avance, respuestas: answers }, { onConflict:'email,tema' });
    updateProgressUI(100);
    alert('¡Tema 1 marcado como completado!');
  });
}

// Animación canvas del tema
function animateCanvas(){
  const c = document.getElementById('temaCanvas'); if(!c) return;
  const x = c.getContext('2d'); let w = c.width, h = c.height;
  let t = 0;
  function frame(){
    t += 0.01;
    x.clearRect(0,0,w,h);
    // ondas senoidales superpuestas
    for(let i=0;i<3;i++){
      x.beginPath();
      for(let px=0; px<w; px+=4){
        const y = h/2 + Math.sin(px*0.01 + t*2 + i)*30 + Math.cos(px*0.02 + i*t)*12;
        if(px===0) x.moveTo(px,y); else x.lineTo(px,y);
      }
      x.strokeStyle = i===0 ? '#b5179e' : (i===1 ? '#4cc9f0' : '#72efdd');
      x.lineWidth = 2; x.stroke();
    }
    requestAnimationFrame(frame);
  }
  frame();
}

init();
