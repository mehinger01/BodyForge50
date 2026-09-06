const START_DATE = new Date('2026-09-06T00:00:00');
const STORAGE_KEY = 'bodyforge50-v1';

const defaultState = {
  profile: {
    name: 'Mike', age: 53, heightIn: 72, startWeight: 250,
    diabetes: 'Type 2', medication: 'Metformin 500 mg morning and night',
    a1c: 7.5, avgBp: '118/78', walkPaceMph: 3,
    goalHike: '21-mile hike by May 2027', goalRun: 'Run 5 miles continuously by summer 2027'
  },
  measurements: [],
  readiness: {},
  workouts: {},
  overrides: {},
  notes: []
};

let state = loadState();
let currentView = 'today';

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed ? {...structuredClone(defaultState), ...parsed} : structuredClone(defaultState);
  } catch { return structuredClone(defaultState); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function key(date=new Date()){ return date.toISOString().slice(0,10); }
function clamp(n,min,max){ return Math.min(max,Math.max(min,n)); }
function fmtDate(d){ return d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}); }
function daysBetween(a,b){ return Math.floor((a-b)/86400000); }
function getProgramDay(date=new Date()){
  const diff = daysBetween(new Date(date.toDateString()), new Date(START_DATE.toDateString()));
  if(diff < 0) return {week:0, dayIndex: diff, dow: date.getDay()};
  return {week: clamp(Math.floor(diff/7)+1,1,6), dayIndex: diff, dow: date.getDay()};
}

const walkTargets = [1.25,1.5,1.75,1.9,2.25,2.75];
const bikeTargets = [10,14,17,18,20,24];

const strengthA = [
  ['Bike warm-up','5 min','Easy · RPE 2–3'],
  ['Sit-to-stand','2 × 8–12','Controlled'],
  ['Glute bridge','2 × 8–12','Pause at top'],
  ['Supported calf raise','2 × 8–12','2 sec up / 2 sec down'],
  ['Hip hinge','2 × 8–12','Bodyweight first'],
  ['Supported one-arm DB row','2 × 8–12/side','Start light · right side sets workload'],
  ['Wall push-up','2 × 6–10','Pain-free range'],
  ['Farmer carry','2 × 30 sec','Start ~10 lb/hand'],
  ['Bird dog','2 × 5–8/side','Slow'],
  ['Dead bug','2 × 5–8/side','Controlled']
];
const strengthB = [
  ['Bike warm-up','5 min','Easy · RPE 2–3'],
  ['Sit-to-stand','2 × 8–12','Controlled'],
  ['Glute bridge','2 × 8–12','Pause at top'],
  ['Supported calf raise','2 × 8–12','Slow'],
  ['Low step-up','2 × 6–10/leg','Use support'],
  ['Supported one-arm DB row','2 × 8–12/side','Right side sets workload'],
  ['Wall/incline push-up','2 × 6–10','Pain-free range'],
  ['Farmer carry','2 × 30 sec','Stop when right side fatigues'],
  ['Bird dog','2 × 5–8/side','Slow'],
  ['Dead bug','2 × 5–8/side','Controlled']
];
const mobility = [
  ['Ankle circles','10 each direction/side','Easy'],
  ['Calf raise','8 reps','Slow'],
  ['Sit-to-stand','8 reps','Easy'],
  ['Hip hinge','8 reps','Practice'],
  ['Bird dog','5/side','Slow'],
  ['Thoracic rotation','5/side','Gentle'],
  ['Shoulder mobility','1–2 min','Comfortable range']
];

function scheduledFor(date=new Date()) {
  const {week,dow} = getProgramDay(date);
  if(week === 0) return {type:'prestart', title:'Program begins Sunday', duration:'', exercises:[]};
  const override = state.overrides[key(date)];
  if(override?.type === 'rest') return {type:'rest', title:'Recovery day', duration:'', exercises:[]};
  if(dow === 0) return {type:'strengthA',title:'Strength A + Bike',duration:'35–45 min',exercises:[...strengthA,['Easy bike finish',`${bikeTargets[week-1]} min`,'RPE 3–4 · conversational']]};
  if(dow === 2) return {type:'mobility',title:'Mobility Reset',duration:'8–12 min',exercises:mobility};
  if(dow === 3) return {type:'strengthB',title:'Strength B + Bike',duration:'35–45 min',exercises:[...strengthB,['Easy bike finish',`${bikeTargets[week-1]} min`,'RPE 3–4 · conversational']]};
  if(dow === 5) return {type:'walk',title:'Endurance Walk',duration:`~${Math.round(walkTargets[week-1]/3*60)} min`,exercises:[['Easy endurance walk',`${walkTargets[week-1]} miles`,'~3 mph · RPE 3–4 · finish with reserve']]};
  if(dow === 4) return {type:'optional',title:'Rest or Easy Bike',duration:'0–10 min',exercises:[['Optional easy bike','Up to 10 min','RPE 2–3 only']]};
  return {type:'rest',title:'Recovery / Normal Activity',duration:'',exercises:[]};
}

function assessReadiness(r){
  if(r.sick || r.foot >= 5 || r.arm >= 5 || r.soreness >= 6 || r.energy <= 2) return {level:'red',label:'RED',message:'Recovery only today. Skip the planned workout and reassess tomorrow. Sharp, escalating, chest-related, dizzying, or movement-altering symptoms warrant medical evaluation.'};
  if(r.sleep==='poor' || r.energy <=4 || r.foot >=3 || r.arm >=3 || r.soreness >=4) return {level:'yellow',label:'YELLOW',message:'Modify today: cut workload about 30–50%. Keep effort easy and stop if symptoms rise.'};
  return {level:'green',label:'GREEN',message:'Proceed with the planned session. Finish feeling like you could have done more.'};
}

function modifiedWorkout(plan, readiness){
  if(readiness.level==='green') return plan;
  if(readiness.level==='red') return {type:'recovery',title:'Recovery Session',duration:'0–15 min',exercises:[['Optional easy mobility or walking','5–15 min max','Only if it feels restorative']]};
  return {...plan, title:`Modified ${plan.title}`, exercises:plan.exercises.map(([name,dose,note])=>{
    let d=dose.replace('2 ×','1 ×');
    d=d.replace(/(\d+) min/g,(m,n)=>`${Math.max(5,Math.round(Number(n)*.6))} min`);
    const mile=d.match(/([\d.]+) miles/); if(mile) d=`${Math.max(.5,Number(mile[1])*.6).toFixed(2)} miles`;
    return [name,d,`${note} · reduced day`];
  })};
}

function render(){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
  document.getElementById('headerTitle').textContent = ({today:'Today',plan:'6-Week Plan',progress:'Progress',profile:'Profile'})[currentView];
  ({today:renderToday,plan:renderPlan,progress:renderProgress,profile:renderProfile})[currentView]();
}

document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{currentView=btn.dataset.view;render();}));

function renderToday(){
  const app=document.getElementById('app'); const today=new Date(); const k=key(today); const {week}=getProgramDay(today); const plan=scheduledFor(today); const savedR=state.readiness[k]; const result=savedR?assessReadiness(savedR):null; const finalPlan=result?modifiedWorkout(plan,result):plan;
  app.innerHTML=`
    <section class="card hero-card">
      <p class="eyebrow">${fmtDate(today).toUpperCase()} · WEEK ${week || '—'}</p>
      <div class="section-heading"><div><h2>${finalPlan.title}</h2><p>${finalPlan.duration || 'Normal daily activity is enough today.'}</p></div>${result?`<span class="badge ${result.level}">${result.label}</span>`:''}</div>
      ${result?`<div class="status-box ${result.level}"><strong>${result.message}</strong></div>`:'<p>Check readiness first. The app will keep, reduce, or replace today’s session.</p>'}
    </section>
    <div id="readinessMount"></div>
    ${result?renderWorkoutCard(finalPlan,k):''}
    ${renderQuickMeasurement(k)}
  `;
  const mount=document.getElementById('readinessMount'); const tpl=document.getElementById('readinessTemplate'); mount.appendChild(tpl.content.cloneNode(true));
  wireReadiness(savedR);
  if(result) wireWorkout(finalPlan,k);
  wireMeasurement(k);
}

function wireReadiness(saved){
  const ids=['energy','foot','arm','soreness'];
  ids.forEach(n=>{const input=document.getElementById(`${n}Input`), out=document.getElementById(`${n}Value`); if(saved) input.value=saved[n]; out.textContent=input.value; input.oninput=()=>out.textContent=input.value;});
  if(saved){document.getElementById('sleepInput').value=saved.sleep;document.getElementById('sickInput').checked=saved.sick;}
  document.getElementById('assessBtn').onclick=()=>{
    state.readiness[key()]={sleep:document.getElementById('sleepInput').value,energy:+document.getElementById('energyInput').value,foot:+document.getElementById('footInput').value,arm:+document.getElementById('armInput').value,soreness:+document.getElementById('sorenessInput').value,sick:document.getElementById('sickInput').checked}; saveState(); renderToday();
  };
}

function renderWorkoutCard(plan,k){
  const existing=state.workouts[k]||{};
  if(plan.type==='rest' || plan.type==='prestart') return `<section class="card"><h2>Recovery focus</h2><p>Normal movement is enough. Do not make up missed mileage or stack hard sessions.</p></section>`;
  return `<section class="card"><div class="section-heading"><div><p class="eyebrow">TODAY'S SESSION</p><h2>${plan.title}</h2></div></div>
    <div class="workout-list">${plan.exercises.map((ex,i)=>{
      const log=existing.exercises?.[i]||{};
      return `<div class="exercise-card"><div class="exercise-top"><div><h3>${ex[0]}</h3><div class="exercise-meta">${ex[1]} · ${ex[2]}</div></div><label class="checkline"><input type="checkbox" data-ex-check="${i}" ${log.done?'checked':''}> Done</label></div>
      <div class="exercise-log"><label>Reps/min<input type="text" data-ex-dose="${i}" value="${log.actual||''}" placeholder="actual"></label><label>Weight<input type="number" step=".5" data-ex-weight="${i}" value="${log.weight||''}" placeholder="lb"></label><label>Pain<input type="number" min="0" max="10" data-ex-pain="${i}" value="${log.pain??''}" placeholder="0–10"></label></div></div>`;
    }).join('')}</div>
    <div class="field-grid" style="margin-top:16px"><label>Overall RPE<input id="sessionRpe" type="number" min="1" max="10" value="${existing.rpe||''}" placeholder="1–10"></label><label>Next-day recovery<select id="recovery"><option value="">Record later</option><option ${existing.recovery==='good'?'selected':''}>good</option><option ${existing.recovery==='normal'?'selected':''}>normal</option><option ${existing.recovery==='poor'?'selected':''}>poor</option></select></label></div>
    <label>Notes<textarea id="workoutNotes" rows="2" placeholder="Anything unusual?">${existing.notes||''}</textarea></label>
    <div class="btn-row" style="margin-top:12px"><button id="saveWorkout" class="primary-btn">Save workout</button><button id="missWorkout" class="secondary-btn">Missed / sick</button></div>
  </section>`;
}

function wireWorkout(plan,k){
  const save=()=>{
    const exercises=plan.exercises.map((_,i)=>({done:document.querySelector(`[data-ex-check="${i}"]`)?.checked||false,actual:document.querySelector(`[data-ex-dose="${i}"]`)?.value||'',weight:+document.querySelector(`[data-ex-weight="${i}"]`)?.value||0,pain:+document.querySelector(`[data-ex-pain="${i}"]`)?.value||0}));
    state.workouts[k]={status:'completed',type:plan.type,exercises,rpe:+document.getElementById('sessionRpe').value||0,recovery:document.getElementById('recovery').value,notes:document.getElementById('workoutNotes').value,updatedAt:new Date().toISOString()}; saveState(); renderToday();
  };
  document.getElementById('saveWorkout').onclick=save;
  document.getElementById('missWorkout').onclick=()=>{
    const reason=prompt('Reason: schedule, sick, fatigue, pain, or other?','schedule'); if(!reason)return;
    state.workouts[k]={status:'missed',type:plan.type,reason,updatedAt:new Date().toISOString()}; saveState(); alert(missedDayAdvice(reason,plan.type)); renderToday();
  };
}
function missedDayAdvice(reason,type){
  if(/sick|pain|fatigue/i.test(reason)) return 'Do not make it up automatically. Recover first. Your next session should be reduced if symptoms or fatigue remain.';
  if(type==='strengthA') return 'If Monday is practical, move this strength session to Monday. Otherwise skip it and keep Wednesday normal. Do not stack strength days.';
  if(type==='strengthB') return 'If Thursday is practical, move it to Thursday. Otherwise skip it and continue Friday.';
  if(type==='walk') return 'Move the walk to Saturday or Sunday only if recovered. Otherwise skip it. Do not double next week’s mileage.';
  return 'Skip it and continue the normal schedule. No catch-up required.';
}

function renderQuickMeasurement(k){
  const m=state.measurements.find(x=>x.date===k)||{};
  return `<section class="card"><p class="eyebrow">QUICK TRACK</p><h2>Morning numbers</h2><div class="field-grid"><label>Weight<input id="mWeight" type="number" step=".1" value="${m.weight||''}" placeholder="lb"></label><label>Resting HR<input id="mHr" type="number" value="${m.hr||''}" placeholder="bpm"></label><label>BP systolic<input id="mSys" type="number" value="${m.sys||''}"></label><label>BP diastolic<input id="mDia" type="number" value="${m.dia||''}"></label></div><button id="saveMeasurement" class="secondary-btn">Save measurements</button></section>`;
}
function wireMeasurement(k){ document.getElementById('saveMeasurement').onclick=()=>{const rec={date:k,weight:+document.getElementById('mWeight').value||null,hr:+document.getElementById('mHr').value||null,sys:+document.getElementById('mSys').value||null,dia:+document.getElementById('mDia').value||null};state.measurements=state.measurements.filter(x=>x.date!==k);state.measurements.push(rec);state.measurements.sort((a,b)=>a.date.localeCompare(b.date));saveState();renderToday();}; }

function renderPlan(){
  const app=document.getElementById('app'); const now=new Date(); const {week}=getProgramDay(now);
  const days=[['Sunday','Strength A + bike'],['Monday','Normal activity / recovery'],['Tuesday','Mobility reset'],['Wednesday','Strength B + bike'],['Thursday','Rest or easy bike'],['Friday','Endurance walk'],['Saturday','Rest / mobility']];
  app.innerHTML=`<section class="card hero-card"><p class="eyebrow">PHASE 1 · BLOCK 1</p><h2>Build the chassis</h2><p>Six weeks of strength, connective-tissue tolerance, aerobic base, and recovery capacity. No running yet.</p><div class="progress-bar"><div style="width:${week?week/6*100:0}%"></div></div><p class="note">Current program week: ${week || 'not started'} of 6</p></section>
  <section class="card"><h2>Weekly rhythm</h2><div class="plan-grid">${days.map((d,i)=>`<div class="plan-day ${i===now.getDay()?'today':''}"><div><strong>${d[0]}</strong><br><small>${d[1]}</small></div></div>`).join('')}</div></section>
  <section class="card"><h2>Friday walking progression</h2><div class="plan-grid">${walkTargets.map((m,i)=>`<div class="plan-day"><div><strong>Week ${i+1}</strong><br><small>${m} miles</small></div><span>${i+1===week?'Current':''}</span></div>`).join('')}</div><p class="note warning">Only progress if the previous walk caused no meaningful foot/joint flare and next-day recovery was normal. Otherwise repeat the distance.</p></section>
  <section class="card"><h2>If life happens</h2><p><strong>Miss 2–3 days:</strong> resume without compensating.</p><p><strong>Miss 4–7 days:</strong> return at ~80% volume.</p><p><strong>Miss 8–14 days:</strong> step back about one training week.</p><p><strong>Sick:</strong> significant fatigue, fever, chest symptoms, or GI illness = rest. First session back at ~50–70% volume.</p></section>`;
}

function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;}
function renderProgress(){
  const app=document.getElementById('app'); const ms=[...state.measurements].sort((a,b)=>a.date.localeCompare(b.date)); const weights=ms.filter(x=>x.weight).map(x=>x.weight); const latest=weights.at(-1); const first=weights[0]||state.profile.startWeight; const change=latest?latest-first:0;
  const last7=ms.slice(-7).map(x=>x.weight).filter(Boolean); const avg7=avg(last7); const hrs=ms.slice(-7).map(x=>x.hr).filter(Boolean); const workoutEntries=Object.entries(state.workouts); const complete=workoutEntries.filter(([,w])=>w.status==='completed').length; const missed=workoutEntries.filter(([,w])=>w.status==='missed').length; const adherence=(complete+missed)?Math.round(complete/(complete+missed)*100):0;
  app.innerHTML=`<section class="card"><p class="eyebrow">CURRENT TREND</p><div class="summary-strip"><div class="metric"><strong>${latest?latest.toFixed(1):'—'}</strong><span>latest weight</span></div><div class="metric"><strong>${avg7?avg7.toFixed(1):'—'}</strong><span>7-day avg</span></div><div class="metric"><strong>${latest?change.toFixed(1):'—'}</strong><span>change lb</span></div><div class="metric"><strong>${hrs.length?Math.round(avg(hrs)):'—'}</strong><span>resting HR avg</span></div><div class="metric"><strong>${adherence}%</strong><span>logged adherence</span></div><div class="metric"><strong>${complete}</strong><span>sessions done</span></div></div></section>
  <section class="card"><h2>Recent measurements</h2><div class="log-list">${ms.slice(-10).reverse().map(m=>`<div class="log-item"><span>${m.date}</span><strong>${m.weight?m.weight+' lb':''} ${m.sys?`· ${m.sys}/${m.dia}`:''} ${m.hr?`· HR ${m.hr}`:''}</strong></div>`).join('')||'<p>No measurements yet.</p>'}</div></section>
  <section class="card"><h2>Workout history</h2><div class="log-list">${workoutEntries.sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12).map(([d,w])=>`<div class="log-item"><span>${d} · ${w.type}</span><strong>${w.status}${w.rpe?` · RPE ${w.rpe}`:''}</strong></div>`).join('')||'<p>No workouts logged yet.</p>'}</div></section>`;
}

function renderProfile(){
  const p=state.profile; const app=document.getElementById('app');
  app.innerHTML=`<section class="card"><p class="eyebrow">USER ZERO</p><h2>${p.name}'s profile</h2><div class="field-grid"><label>Age<input id="pAge" type="number" value="${p.age}"></label><label>Start weight<input id="pWeight" type="number" step=".1" value="${p.startWeight}"></label><label>A1C<input id="pA1c" type="number" step=".1" value="${p.a1c}"></label><label>Average BP<input id="pBp" type="text" value="${p.avgBp}"></label><label>Walking pace mph<input id="pPace" type="number" step=".1" value="${p.walkPaceMph}"></label></div><label>Medical / medication notes<textarea id="pMed" rows="3">${p.diabetes}; ${p.medication}</textarea></label><button id="saveProfile" class="primary-btn" style="margin-top:12px">Save profile</button></section>
  <section class="card"><h2>Performance goals</h2><p><strong>Hike:</strong> ${p.goalHike}</p><p><strong>Run:</strong> ${p.goalRun}</p><p class="note">The app treats goals as targets, not commands. Progression is governed by recovery, pain, adherence, and demonstrated capacity.</p></section>
  <section class="card"><h2>Safety boundary</h2><p class="note">BodyForge50 is a training and tracking tool, not medical diagnosis or treatment. Stop and seek appropriate medical care for chest pain, fainting, severe shortness of breath, neurological symptoms, sharp/escalating pain, or other concerning symptoms.</p></section>
  <section class="card"><h2>Data</h2><p class="note">V1 stores data only in this browser using localStorage. Clearing browser/site data will erase it.</p><button id="exportBtn" class="secondary-btn">Export data</button></section>`;
  document.getElementById('saveProfile').onclick=()=>{state.profile={...state.profile,age:+document.getElementById('pAge').value,startWeight:+document.getElementById('pWeight').value,a1c:+document.getElementById('pA1c').value,avgBp:document.getElementById('pBp').value,walkPaceMph:+document.getElementById('pPace').value};saveState();alert('Profile saved.');};
  document.getElementById('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`bodyforge50-${key()}.json`;a.click();URL.revokeObjectURL(a.href);};
}

render();
