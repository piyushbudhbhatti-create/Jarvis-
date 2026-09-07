(() => {
  const $ = id => document.getElementById(id);
  const els = {
    chat:$('chat'), input:$('commandInput'), wake:$('wakeBtn'), mic:$('micBtn'),
    send:$('sendBtn'), orb:$('orb'), state:$('stateText'), status:$('status'),
    modal:$('modal'), modalTitle:$('modalTitle'), modalBody:$('modalBody')
  };

  const store = {
    get(k, fallback=[]){ try{return JSON.parse(localStorage.getItem(k)) ?? fallback}catch{return fallback} },
    set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  };

  let recognition = null, wakeMode = false, manuallyStopped = true;

  function addMessage(text, who='jarvis'){
    const d=document.createElement('div'); d.className='msg '+who; d.textContent=text;
    els.chat.appendChild(d); els.chat.scrollTop=els.chat.scrollHeight;
  }
  function setState(text, mode=''){
    els.state.textContent=text; els.orb.className='orb '+mode;
  }
  function speak(text){
    if(!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.rate=1; u.pitch=.95;
    setState('JARVIS speaking…','speaking');
    u.onend=()=>{ if(!wakeMode) setState('Ready for your command, Dev.'); else setState('Wake mode active. Say “Jarvis”…'); };
    speechSynthesis.speak(u);
  }
  function jarvis(text, voice=true){
    addMessage(text,'jarvis'); if(voice) speak(text);
  }
  function openUrl(url,label){
    window.open(url,'_blank','noopener');
    jarvis('Opening '+label+'.');
  }

  function showModal(title, html){
    els.modalTitle.textContent=title; els.modalBody.innerHTML=html; els.modal.classList.remove('hidden');
  }
  function closeModal(){ els.modal.classList.add('hidden'); }

  function showTasks(){
    const tasks=store.get('jarvis_tasks',[]);
    showModal('TASKS', `<div class="taskRow"><input id="newTask" placeholder="New task"><button id="addTaskBtn">Add</button></div>
      <div id="taskList">${tasks.length?tasks.map((t,i)=>`<div class="taskItem">☐ ${escapeHtml(t)} <button onclick="window.JARVIS_DELETE_TASK(${i})">✕</button></div>`).join(''):'<p>No tasks yet.</p>'}</div>`);
    $('addTaskBtn').onclick=()=>{const v=$('newTask').value.trim();if(v){tasks.push(v);store.set('jarvis_tasks',tasks);showTasks();}};
  }
  window.JARVIS_DELETE_TASK=i=>{const t=store.get('jarvis_tasks',[]);t.splice(i,1);store.set('jarvis_tasks',t);showTasks();};

  function showProjects(){
    const p=store.get('jarvis_projects',[]);
    showModal('PROJECTS', `<div class="taskRow"><input id="newProject" placeholder="New project"><button id="addProjectBtn">Add</button></div>
      ${p.length?p.map(x=>`<div class="projectItem">◇ ${escapeHtml(x)}</div>`).join(''):'<p>No projects yet.</p>'}`);
    $('addProjectBtn').onclick=()=>{const v=$('newProject').value.trim();if(v){p.push(v);store.set('jarvis_projects',p);showProjects();}};
  }
  function showMemory(){
    const m=store.get('jarvis_memory',[]);
    showModal('MEMORY', m.length?m.map(x=>`<div class="memoryItem">◉ ${escapeHtml(x)}</div>`).join(''):'<p>No saved memories yet.</p>');
  }
  function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

  function briefing(){
    const tasks=store.get('jarvis_tasks',[]);
    const projects=store.get('jarvis_projects',[]);
    const now=new Date();
    const text=`Briefing, Dev. It is ${now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. You have ${tasks.length} saved task${tasks.length===1?'':'s'} and ${projects.length} project${projects.length===1?'':'s'}.`;
    jarvis(text);
  }

  function remember(text){
    const m=store.get('jarvis_memory',[]);
    m.unshift(text); store.set('jarvis_memory',m.slice(0,100));
  }

  function execute(raw){
    let command=(raw||'').trim();
    if(!command) return;
    addMessage(command,'user');
    command=command.replace(/^jarvis[\s,]*/i,'').trim();
    const c=command.toLowerCase();

    if(c==='brief me'||c.includes('briefing')) return briefing();

    if(c.startsWith('add task')){
      let task=command.replace(/^add task\s*/i,'').replace(/^to\s*/i,'').trim();
      if(!task){ showTasks(); return; }
      const tasks=store.get('jarvis_tasks',[]);tasks.push(task);store.set('jarvis_tasks',tasks);
      return jarvis(`Task added: ${task}.`);
    }
    if(c.startsWith('create project')||c.startsWith('add project')){
      const name=command.replace(/^(create|add) project\s*/i,'').trim();
      if(!name){showProjects();return;}
      const p=store.get('jarvis_projects',[]);p.push(name);store.set('jarvis_projects',p);
      return jarvis(`Project created: ${name}.`);
    }
    if(c==='tasks'||c.includes('show tasks')) return showTasks();
    if(c==='projects'||c.includes('show projects')) return showProjects();
    if(c==='memory'||c.includes('show memory')) return showMemory();

    if(c.startsWith('remember ')){
      const note=command.replace(/^remember\s*/i,'').trim();
      if(note){remember(note);return jarvis('I saved that to local memory.');}
    }
    if(c.includes('open youtube')||c==='youtube') return openUrl('https://www.youtube.com/','YouTube');
    if(c.includes('open google')||c==='google') return openUrl('https://www.google.com/','Google');
    if(c.includes('open instagram')||c==='instagram') return openUrl('https://www.instagram.com/','Instagram');
    if(c.includes('open github')||c==='github') return openUrl('https://github.com/','GitHub');
    if(c.startsWith('search for ')||c.startsWith('search ')){
      const q=command.replace(/^search( for)?\s*/i,'');
      return openUrl('https://www.google.com/search?q='+encodeURIComponent(q),'Google search results');
    }
    if(c.includes('hello')||c.includes('hi jarvis')) return jarvis('Hello, Dev. Systems operational.');
    jarvis(`I understood: “${command}”. That command is not connected to an external automation yet, but I can save tasks, projects, memory, search the web, and open supported services.`);
  }

  function setupRecognition(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ jarvis('Voice recognition is not supported in this browser. You can still type commands.',false); return false; }
    recognition=new SR(); recognition.lang='en-IN'; recognition.continuous=false; recognition.interimResults=false;
    recognition.onstart=()=>{setState(wakeMode?'Listening for “Jarvis”…':'Listening…','listening');};
    recognition.onresult=e=>{
      const text=e.results[e.results.length-1][0].transcript;
      if(wakeMode){
        if(/\bjarvis\b/i.test(text)){
          const after=text.replace(/^.*?\bjarvis\b[\s,]*/i,'').trim();
          if(after){ wakeMode=false; els.wake.classList.remove('active'); execute(after); }
          else { wakeMode=false; els.wake.classList.remove('active'); jarvis('Yes, Dev. I am listening.'); setTimeout(startOneShot,500); }
        } else {
          setState('Wake mode active. Say “Jarvis”…'); setTimeout(startWake,350);
        }
      } else execute(text);
    };
    recognition.onerror=e=>{
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){
        wakeMode=false; els.wake.classList.remove('active');
        jarvis('Microphone permission is required for voice commands.',false);
      } else if(wakeMode && e.error!=='aborted') setTimeout(startWake,700);
      else setState('Ready for your command, Dev.');
    };
    recognition.onend=()=>{
      if(wakeMode && manuallyStopped===false) setTimeout(startWake,500);
      else if(!wakeMode) setState('Ready for your command, Dev.');
    };
    return true;
  }
  function startOneShot(){
    if(!recognition && !setupRecognition()) return;
    manuallyStopped=false; wakeMode=false; recognition.start();
  }
  function startWake(){
    if(!wakeMode) return;
    if(!recognition && !setupRecognition()) return;
    manuallyStopped=false;
    try{recognition.start()}catch(e){}
  }

  els.send.onclick=()=>{const v=els.input.value;els.input.value='';execute(v);};
  els.input.addEventListener('keydown',e=>{if(e.key==='Enter')els.send.click();});
  els.mic.onclick=startOneShot;
  els.wake.onclick=()=>{
    wakeMode=!wakeMode;
    els.wake.classList.toggle('active',wakeMode);
    if(wakeMode){ els.wake.textContent='⚡ Awake'; setState('Wake mode active. Say “Jarvis”…','listening'); startWake(); }
    else { manuallyStopped=true; els.wake.textContent='⚡ Wake'; if(recognition)try{recognition.abort()}catch(e){} setState('Ready for your command, Dev.'); }
  };

  document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>execute(b.dataset.command));
  document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    const v=b.dataset.view;if(v==='tasks')showTasks();if(v==='projects')showProjects();if(v==='memory')showMemory();if(v==='home')closeModal();
  });
  $('closeModal').onclick=closeModal;
  els.modal.onclick=e=>{if(e.target===els.modal)closeModal()};
  $('settingsBtn').onclick=()=>showModal('SETTINGS', `<p><b>JARVIS V11</b></p><p>Voice recognition depends on your browser and microphone permission.</p><p>Wake mode works while this web app remains open in the foreground.</p><button id="clearData">Clear local JARVIS data</button>`);
  document.addEventListener('click',e=>{if(e.target.id==='clearData'){if(confirm('Delete local tasks, projects and memory?')){localStorage.removeItem('jarvis_tasks');localStorage.removeItem('jarvis_projects');localStorage.removeItem('jarvis_memory');jarvis('Local JARVIS data cleared.',false);closeModal();}}});

  addMessage('JARVIS V11 online. Type a command or use the microphone.','jarvis');
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js'));
})();