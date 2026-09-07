const $ = s => document.querySelector(s);

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

function addChat(role, text) {
  state.chat.push({role,text,time:new Date().toISOString()});
  state.chat = state.chat.slice(-50);
  save(); renderChat();
}

function renderChat() {
  const box = $('#conversation');
  box.innerHTML = state.chat.slice(-12).map(m =>
    `<div class="message ${m.role}">${escapeHtml(m.text)}</div>`
  ).join('');
  box.scrollTop = box.scrollHeight;
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

function speak(text) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = .95; u.pitch = .9;
    speechSynthesis.speak(u);
  }
}

function setStatus(text){$('#status').textContent=text}

function localJarvis(command) {
  const c = command.toLowerCase();
  if (c.includes('task')) {
    return "I can manage that. Open Tasks and add the details, or connect your JARVIS backend for automatic task extraction.";
  }
  if (c.includes('hello') || c.includes('hi jarvis')) return "Hello, Dev. What are we working on?";
  if (c.includes('brief')) return "Your personal briefing becomes much more useful once Calendar, weather, and task integrations are connected.";
  return "The interface is operational. Connect the JARVIS backend in Settings to activate the full AI brain.";
}

async function sendCommand(command) {
  if (!command.trim()) return;
  addChat('user', command);
  $('#commandInput').value='';
  setStatus('THINKING');
  $('#orb').classList.add('listening');

  let answer;
  try {
    if (!state.backend) {
      await new Promise(r=>setTimeout(r,350));
      answer = localJarvis(command);
    } else {
      const res = await fetch(state.backend.replace(/\/$/,'') + '/command', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({command})
      });
      if (!res.ok) throw new Error('Backend returned '+res.status);
      const data = await res.json();
      answer = data.response || JSON.stringify(data);
    }
  } catch (e) {
    answer = "Connection failed. Check your backend URL. Details: " + e.message;
  }

  $('#jarvisMessage').textContent = answer;
  addChat('jarvis', answer);
  setStatus('SYSTEM ONLINE');
  $('#orb').classList.remove('listening');
  speak(answer);
}

$('#sendBtn').onclick=()=>sendCommand($('#commandInput').value);
$('#commandInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendCommand(e.target.value)});

$('#voiceBtn').onclick=()=>{
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    $('#jarvisMessage').textContent='Voice recognition is not supported in this browser.';
    return;
  }
  const r = new Recognition();
  r.lang='en-IN';
  r.interimResults=false;
  $('#orb').classList.add('listening'); setStatus('LISTENING');
  r.onresult=e=>sendCommand(e.results[0][0].transcript);
  r.onerror=()=>{setStatus('SYSTEM ONLINE');$('#orb').classList.remove('listening')};
  r.onend=()=>{setStatus('SYSTEM ONLINE');$('#orb').classList.remove('listening')};
  r.start();
};

function modal(html){$('#modalCard').innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden')}
$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};

$('#settingsBtn').onclick=()=>modal(`
  <h2>JARVIS Settings</h2>
  <div class="small">Backend URL (leave blank for local demo mode)</div>
  <input id="backendInput" value="${escapeHtml(state.backend)}" placeholder="https://your-jarvis-server.com">
  <button id="saveSettings">Save</button><button onclick="document.querySelector('#modal').classList.add('hidden')">Close</button>
`);
document.addEventListener('click',e=>{
  if(e.target.id==='saveSettings'){
    state.backend=$('#backendInput').value.trim();
    localStorage.setItem('jarvis_backend',state.backend);
    closeModal();
  }
});

function showTasks(){
  modal(`<h2>Tasks</h2>
  <input id="newTask" placeholder="New task">
  <button id="addTask">Add task</button>
  <div>${state.tasks.map((t,i)=>`<div class="list-item"><span>${escapeHtml(t)}</span><button data-del-task="${i}">Done</button></div>`).join('') || '<p class="small">No tasks yet.</p>'}</div>`);
}
function showProjects(){
  modal(`<h2>Projects</h2>
  <input id="newProject" placeholder="Project name">
  <button id="addProject">Add project</button>
  <div>${state.projects.map(p=>`<div class="list-item">${escapeHtml(p)}</div>`).join('') || '<p class="small">No projects yet.</p>'}</div>`);
}
function showMemory(){
  modal(`<h2>Memory</h2><p class="small">Stored locally on this phone.</p>
  <textarea id="newMemory" placeholder="Remember something important..."></textarea>
  <button id="addMemory">Remember</button>
  ${state.memory.slice().reverse().map(m=>`<div class="list-item">${escapeHtml(m)}</div>`).join('') || '<p class="small">No saved memories.</p>'}`);
}
document.addEventListener('click',e=>{
  if(e.target.id==='addTask'){const v=$('#newTask').value.trim();if(v){state.tasks.push(v);save();showTasks()}}
  if(e.target.dataset.delTask!==undefined){state.tasks.splice(+e.target.dataset.delTask,1);save();showTasks()}
  if(e.target.id==='addProject'){const v=$('#newProject').value.trim();if(v){state.projects.push(v);save();showProjects()}}
  if(e.target.id==='addMemory'){const v=$('#newMemory').value.trim();if(v){state.memory.push(v);save();showMemory()}}
});

document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  if(b.dataset.view==='tasks')showTasks();
  if(b.dataset.view==='projects')showProjects();
  if(b.dataset.view==='memory')showMemory();
  if(b.dataset.view==='home')closeModal();
});

document.querySelectorAll('.quick-actions button').forEach(b=>b.onclick=()=>{
  const a=b.dataset.action;
  if(a==='task')showTasks();
  else if(a==='project')showProjects();
  else sendCommand('Jarvis, prepare my briefing.');
});

renderChat();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
