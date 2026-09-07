
const $ = s => document.querySelector(s);

const wakeWord = {
  enabled: false,
  recognition: null,
  restartTimer: null,
  supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
};

const state = {
  backend: localStorage.getItem('jarvis_backend') || '',
  tasks: JSON.parse(localStorage.getItem('jarvis_tasks') || '[]'),
  projects: JSON.parse(localStorage.getItem('jarvis_projects') || '[]'),
  memory: JSON.parse(localStorage.getItem('jarvis_memory') || '[]'),
  chat: JSON.parse(localStorage.getItem('jarvis_chat') || '[]')
};

function save() {
  localStorage.setItem('jarvis_tasks', JSON.stringify(state.tasks));
  localStorage.setItem('jarvis_projects', JSON.stringify(state.projects));
  localStorage.setItem('jarvis_memory', JSON.stringify(state.memory));
  localStorage.setItem('jarvis_chat', JSON.stringify(state.chat));
}

function esc(s){
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
}

function addChat(role,text){
  state.chat.push({role,text,time:new Date().toISOString()});
  state.chat=state.chat.slice(-60);
  save(); renderChat();
}

function renderChat(){
  const box=$('#conversation');
  box.innerHTML=state.chat.slice(-15).map(m =>
    `<div class="message ${m.role}">${esc(m.text)}</div>`
  ).join('');
  box.scrollTop=box.scrollHeight;
}

function speak(text){
  if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.rate=.95; u.pitch=.9;
  speechSynthesis.speak(u);
}

function setStatus(t){ $('#status').textContent=t; }
function setThinking(on){
  $('#orb').classList.toggle('listening',on);
  setStatus(on?'THINKING':'SYSTEM ONLINE');
}

function normalize(c){
  return c.toLowerCase().replace(/[,.!?]/g,'').trim();
}

function addTask(task){
  if(!task) return false;
  state.tasks.push(task);
  save();
  return true;
}

function addMemory(item){
  if(!item) return false;
  state.memory.push(item);
  save();
  return true;
}

function addProject(name){
  if(!name) return false;
  state.projects.push(name);
  save();
  return true;
}

function openSite(url, label){
  // Browsers may block this in some situations; this is an authorized user command.
  window.open(url, '_blank', 'noopener,noreferrer');
  return `Opening ${label}.`;
}

function brief(){
  const d=new Date();
  const taskCount=state.tasks.length;
  const projectCount=state.projects.length;
  return `It is ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. You have ${taskCount} task${taskCount===1?'':'s'} and ${projectCount} project${projectCount===1?'':'s'} stored locally.`;
}

async function localBrain(command){
  const c=normalize(command);

  // Website actions
  if(/\b(open|launch|go to)\s+(youtube)\b/.test(c)) return openSite('https://www.youtube.com','YouTube');
  if(/\b(open|launch|go to)\s+(google)\b/.test(c)) return openSite('https://www.google.com','Google');
  if(/\b(open|launch|go to)\s+(instagram)\b/.test(c)) return openSite('https://www.instagram.com','Instagram');
  if(/\b(open|launch|go to)\s+(github)\b/.test(c)) return openSite('https://github.com','GitHub');

  let m=c.match(/(?:search|google)\s+(?:for\s+)?(.+)/);
  if(m && m[1]){
    const q=encodeURIComponent(m[1]);
    return openSite(`https://www.google.com/search?q=${q}`,`a Google search for ${m[1]}`);
  }

  // Tasks
  m=command.match(/^(?:jarvis[, ]*)?(?:add|create|remember)\s+(?:a\s+)?task(?:\s+(?:to|:))?\s*(.+)$/i);
  if(m && m[1]){
    addTask(m[1].trim());
    return `Task added: ${m[1].trim()}.`;
  }

  if(c.startsWith('add task ') || c.startsWith('create task ')){
    const task=command.replace(/^(add|create)\s+task\s*/i,'').trim();
    if(task){ addTask(task); return `Task added: ${task}.`; }
  }

  // Memory
  m=command.match(/^(?:jarvis[, ]*)?remember(?:\s+that)?\s+(.+)$/i);
  if(m && m[1]){
    addMemory(m[1].trim());
    return `Stored in local memory: ${m[1].trim()}.`;
  }

  // Projects
  m=command.match(/^(?:create|add|start)\s+(?:a\s+)?project(?:\s+(?:called|named|:))?\s*(.+)$/i);
  if(m && m[1]){
    addProject(m[1].trim());
    return `Project created: ${m[1].trim()}.`;
  }

  // Briefing / utility
  if(c.includes('brief me') || c.includes('my briefing') || c==='brief'){
    return brief();
  }

  if(c.includes('what time') || c==='time'){
    return `It is ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}.`;
  }

  if(c.includes('what date') || c.includes("today's date")){
    return `Today is ${new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}.`;
  }

  if(/^(hello|hi|hey)( jarvis)?$/.test(c)){
    return "Hello, Dev. Systems are online. Give me an objective.";
  }

  if(c.includes('what can you do')){
    return "Right now I can manage local tasks, projects and memory, respond by voice, open supported websites, perform Google searches, and connect to an external AI backend when you configure one.";
  }

  return null;
}

async function backendBrain(command){
  const base=state.backend.replace(/\/$/,'');
  const res=await fetch(base+'/command',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      command,
      user:'Dev',
      context:{
        tasks:state.tasks,
        projects:state.projects,
        memory:state.memory.slice(-20)
      }
    })
  });
  if(!res.ok) throw new Error('Backend returned '+res.status);
  const data=await res.json();
  return data.response || data.message || JSON.stringify(data);
}

async function think(command){
  const local=await localBrain(command);
  if(local) return local;

  if(state.backend){
    return await backendBrain(command);
  }

  return "I understand the command, but my full AI brain is not connected yet. My local action system can already handle tasks, memory, projects, supported websites and searches. Configure a secure AI backend in Settings for open-ended intelligence.";
}

async function sendCommand(command){
  if(!command.trim()) return;

  addChat('user',command);
  $('#commandInput').value='';
  setThinking(true);

  let answer;
  try{
    answer=await think(command);
  }catch(e){
    answer="Brain connection failed: "+e.message;
  }

  $('#jarvisMessage').textContent=answer;
  addChat('jarvis',answer);
  setThinking(false);
  speak(answer);
}

$('#sendBtn').onclick=()=>sendCommand($('#commandInput').value);
$('#commandInput').addEventListener('keydown',e=>{
  if(e.key==='Enter') sendCommand(e.target.value);
});


function startWakeWord(){
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!Recognition){
    $('#jarvisMessage').textContent='Wake word mode is not supported by this browser.';
    return;
  }

  stopWakeWord();
  wakeWord.enabled = true;

  const r = new Recognition();
  wakeWord.recognition = r;
  r.lang = 'en-IN';
  r.continuous = true;
  r.interimResults = true;

  setStatus('WAKE WORD ACTIVE');

  r.onresult = e => {
    const text = Array.from(e.results)
      .slice(e.resultIndex)
      .map(x => x[0].transcript)
      .join(' ')
      .trim();

    const lower = text.toLowerCase();
    const match = lower.match(/\bjarvis\b[\s,.:;!?-]*(.*)$/i);

    if(match){
      const afterWake = match[1].trim();

      // Stop listening briefly so the command is not duplicated.
      try { r.stop(); } catch(_) {}
      wakeWord.enabled = false;

      $('#orb').classList.add('listening');
      setStatus('JARVIS AWAKE');

      if(afterWake.length > 0){
        setTimeout(() => sendCommand(afterWake), 250);
      } else {
        speak('Yes, Dev?');
        $('#jarvisMessage').textContent = 'Yes, Dev?';
        setTimeout(startCommandListening, 900);
      }
    }
  };

  r.onerror = e => {
    if(e.error === 'not-allowed' || e.error === 'service-not-allowed'){
      wakeWord.enabled = false;
      setStatus('MICROPHONE BLOCKED');
      $('#jarvisMessage').textContent='Microphone permission is required for wake-word mode.';
    }
  };

  r.onend = () => {
    if(wakeWord.enabled){
      clearTimeout(wakeWord.restartTimer);
      wakeWord.restartTimer = setTimeout(startWakeWord, 500);
    }
  };

  try { r.start(); } catch(_) {}
}

function stopWakeWord(){
  wakeWord.enabled = false;
  clearTimeout(wakeWord.restartTimer);
  if(wakeWord.recognition){
    try { wakeWord.recognition.stop(); } catch(_) {}
    wakeWord.recognition = null;
  }
  if($('#status')) setStatus('SYSTEM ONLINE');
}

function startCommandListening(){
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!Recognition) return;

  const r = new Recognition();
  r.lang='en-IN';
  r.interimResults=false;
  r.continuous=false;

  setStatus('LISTENING');
  r.onresult=e=>sendCommand(e.results[0][0].transcript);
  r.onerror=()=> {
    $('#jarvisMessage').textContent='I did not catch that.';
    setThinking(false);
    setTimeout(startWakeWord, 500);
  };
  r.onend=()=> {
    if($('#status').textContent==='LISTENING') setThinking(false);
    if(!wakeWord.enabled) setTimeout(startWakeWord, 500);
  };
  try { r.start(); } catch(_) {}
}

function toggleWakeWord(){
  if(wakeWord.enabled){
    stopWakeWord();
    $('#jarvisMessage').textContent='Wake-word mode disabled.';
  } else {
    $('#jarvisMessage').textContent='Wake-word mode enabled. Say Jarvis followed by your command.';
    startWakeWord();
  }
}

$('#voiceBtn').onclick=()=>{
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){
    $('#jarvisMessage').textContent='Voice recognition is not supported by this browser.';
    return;
  }
  const r=new Recognition();
  r.lang='en-IN';
  r.interimResults=false;
  r.continuous=false;

  $('#orb').classList.add('listening');
  setStatus('LISTENING');

  r.onresult=e=>sendCommand(e.results[0][0].transcript);
  r.onerror=e=>{
    $('#jarvisMessage').textContent='Voice input error: '+e.error;
    setThinking(false);
  };
  r.onend=()=> {
    if($('#status').textContent==='LISTENING') setThinking(false);
  };
  r.start();
};

function modal(html){
  $('#modalCard').innerHTML=html;
  $('#modal').classList.remove('hidden');
}
function closeModal(){ $('#modal').classList.add('hidden'); }
$('#modal').onclick=e=>{ if(e.target.id==='modal') closeModal(); };

$('#settingsBtn').onclick=()=>modal(`
  <h2>JARVIS Brain Settings</h2>
  <p class="small">Leave this blank to use local actions only. Never place a private AI API key directly in this website.</p>
  <input id="backendInput" value="${esc(state.backend)}" placeholder="https://your-secure-jarvis-backend.com">
  <button id="saveSettings">Save brain connection</button>
  <button onclick="document.querySelector('#modal').classList.add('hidden')">Close</button>
`);

function showTasks(){
  modal(`<h2>Tasks</h2>
  <input id="newTask" placeholder="New task">
  <button id="addTask">Add task</button>
  <div>${state.tasks.map((t,i)=>`<div class="list-item"><span>${esc(t)}</span><button data-del-task="${i}">Done</button></div>`).join('') || '<p class="small">No tasks yet.</p>'}</div>`);
}
function showProjects(){
  modal(`<h2>Projects</h2>
  <input id="newProject" placeholder="Project name">
  <button id="addProject">Add project</button>
  <div>${state.projects.map((p,i)=>`<div class="list-item"><span>${esc(p)}</span><button data-del-project="${i}">Remove</button></div>`).join('') || '<p class="small">No projects yet.</p>'}</div>`);
}
function showMemory(){
  modal(`<h2>Memory</h2>
  <p class="small">This local memory stays in this browser unless you later connect cloud memory.</p>
  <textarea id="newMemory" placeholder="Remember something important..."></textarea>
  <button id="addMemory">Remember</button>
  ${state.memory.slice().reverse().map((m,i)=>`<div class="list-item"><span>${esc(m)}</span></div>`).join('') || '<p class="small">No saved memories.</p>'}`);
}

document.addEventListener('click',e=>{
  if(e.target.id==='saveSettings'){
    state.backend=$('#backendInput').value.trim();
    localStorage.setItem('jarvis_backend',state.backend);
    closeModal();
    $('#jarvisMessage').textContent=state.backend?'Secure brain connection saved.':'Local JARVIS mode active.';
  }
  if(e.target.id==='addTask'){
    const v=$('#newTask').value.trim();
    if(v){addTask(v);showTasks();}
  }
  if(e.target.dataset.delTask!==undefined){
    state.tasks.splice(+e.target.dataset.delTask,1); save(); showTasks();
  }
  if(e.target.id==='addProject'){
    const v=$('#newProject').value.trim();
    if(v){addProject(v);showProjects();}
  }
  if(e.target.dataset.delProject!==undefined){
    state.projects.splice(+e.target.dataset.delProject,1);save();showProjects();
  }
  if(e.target.id==='addMemory'){
    const v=$('#newMemory').value.trim();
    if(v){addMemory(v);showMemory();}
  }
});

document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  if(b.dataset.view==='tasks') showTasks();
  if(b.dataset.view==='projects') showProjects();
  if(b.dataset.view==='memory') showMemory();
  if(b.dataset.view==='home') closeModal();
});

document.querySelectorAll('.quick-actions button').forEach(b=>b.onclick=()=>{
  if(b.dataset.action==='task') showTasks();
  else if(b.dataset.action==='project') showProjects();
  else sendCommand('Jarvis, brief me');
});

renderChat();
if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');


const wakeBtn = document.querySelector('#wakeBtn');
if(wakeBtn) wakeBtn.onclick = toggleWakeWord;
