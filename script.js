/* =========================================================
   Firebase Core
========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

/* =========================================================
   Firebase Init
========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyDGmwk9FtwnjUKcH4T6alvMWVQqbhVrqfI",
  authDomain: "abyss-suicide-co.firebaseapp.com",
  projectId: "abyss-suicide-co",
  storageBucket: "abyss-suicide-co.appspot.com",
  messagingSenderId: "711710259422",
  appId: "1:711710259422:web:3c5ba7c93edb3d6d6baa4f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* =========================================================
   Constants / State
========================================================= */
const TABS = [
  { id: 'main', title: '메인' },
  { id: 'staff', title: '직원' },
  { id: 'me', title: '내 상태' },
  { id: 'map', title: '맵' },
  { id: 'dex', title: '도감' }
];

const BASE_STATS = {
  muscle: 1, agility: 1, endurance: 1, flexibility: 1,
  visual: 1, auditory: 1, situation: 1, reaction: 1,
  intellect: 1, judgment: 1, memory: 1, spirit: 1,
  decision: 1, stress: 1
};

const DEFAULT_MAP_IMAGE = './images/default-map.png';
const DEFAULT_PROFILE_IMAGE = './images/default-profile.png';

let currentUser = null;

/* =========================================================
   DOM Cache
========================================================= */
const header = document.getElementById('header');
const navEl = document.getElementById('nav');
const contentEl = document.getElementById('content');
const login = document.getElementById('login');

/* =========================================================
   Utils
========================================================= */
function randomHex() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function fmtTime(ts) {
  if (!ts?.seconds) return '';
  const diff = Math.floor((Date.now() - ts.toDate()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return ts.toDate().toLocaleDateString('ko-KR');
}

function showMessage(msg) {
  alert(msg);
}

/* =========================================================
   Storage
========================================================= */
async function uploadFileToStorage(file, path) {
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

/* =========================================================
   Sheet
========================================================= */
function createDefaultSheet(uid, nickname) {
  return {
    uid,
    personnel: {
      name: nickname,
      gender: '미상',
      age: 20,
      height: 170,
      weight: 60
    },
    stats: { ...BASE_STATS },
    status: {
      maxSpirit: 60,
      currentSpirit: 60
    },
    createdAt: serverTimestamp()
  };
}

async function ensureSheet(uid, nickname) {
  const ref = doc(db, 'sheets', uid);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, createDefaultSheet(uid, nickname));
  }
}

/* =========================================================
   Auth
========================================================= */
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (!user) {
    header.style.display = 'none';
    login.style.display = 'flex';
    return;
  }

  const nickname = user.displayName || user.email.split('@')[0];
  await ensureSheet(user.uid, nickname);

  login.style.display = 'none';
  header.style.display = 'flex';
  initNav();
  loadTab('main');
});

/* =========================================================
   Navigation
========================================================= */
function initNav() {
  navEl.innerHTML = '';
  TABS.forEach(tab => {
    const b = document.createElement('button');
    b.textContent = tab.title;
    b.onclick = () => loadTab(tab.id);
    navEl.appendChild(b);
  });
}

async function loadTab(id) {
  contentEl.innerHTML = '<div class="card muted">로딩...</div>';
  if (id === 'main') return renderMain();
  if (id === 'staff') return renderStaff();
  if (id === 'me') return renderMe();
  if (id === 'map') return renderMap();
  if (id === 'dex') return renderDex();
}

/* =========================================================
   Renderers
========================================================= */
async function renderMain() {
  contentEl.innerHTML = '<div class="card">메인</div>';
}

async function renderStaff() {
  const snap = await getDocs(collection(db, 'staff'));
  contentEl.innerHTML = '<div class="card"></div>';
  snap.forEach(d => {
    const p = document.createElement('p');
    p.textContent = d.data().name;
    contentEl.appendChild(p);
  });
}

async function renderMe() {
  const snap = await getDoc(doc(db, 'sheets', currentUser.uid));
  contentEl.innerHTML = `<pre>${JSON.stringify(snap.data(), null, 2)}</pre>`;
}

async function renderMap() {
  contentEl.innerHTML = '<div class="card">맵</div>';
}

function renderDex() {
  contentEl.innerHTML = '<div class="card">도감 준비 중</div>';
}

/* =========================================================
   Main Tab
========================================================= */
async function renderMain() {
  contentEl.innerHTML = '';

  // --- 카드 생성 ---
  const flowCard = createCard('심연 상태', '<h3 class="abyss-flow">불러오는 중...</h3>');
  const statusCard = createCard(
    '직원 현황',
    `<div class="staff-status">불러오는 중...</div>
     <div class="muted" style="margin-top:10px;">일정</div>
     <div class="staff-schedule">불러오는 중...</div>`
  );
  const eventCard = createCard('오늘의 이벤트', '<div class="today-event">불러오는 중...</div>');
  const rankCard = createCard('직원 순위', '<div class="staff-rank">불러오는 중...</div>');

  contentEl.append(flowCard, statusCard, eventCard, rankCard);

  const flowEl = flowCard.querySelector('.abyss-flow');
  const statusEl = statusCard.querySelector('.staff-status');
  const scheduleEl = statusCard.querySelector('.staff-schedule');
  const eventEl = eventCard.querySelector('.today-event');
  const rankEl = rankCard.querySelector('.staff-rank');

  try {
    await loadAbyssFlow(flowEl);
    await loadStaffSummary(statusEl, rankEl);
    await loadTodaySchedule(scheduleEl);
    eventEl.textContent = '이벤트 데이터 없음';
  } catch (e) {
    console.error(e);
    contentEl.innerHTML += `<div class="card muted">데이터 로드 실패</div>`;
  }
}

/* =========================================================
   Main helpers
========================================================= */
function createCard(title, innerHtml) {
  const c = document.createElement('div');
  c.className = 'card';
  c.innerHTML = `<div class="muted">${title}</div>${innerHtml}`;
  return c;
}

async function loadAbyssFlow(targetEl) {
  const todayKey = getTodayKey();
  const todayRef = doc(db, 'system', 'abyssToday');
  const cfgRef = doc(db, 'system', 'abyssConfig');

  const todaySnap = await getDoc(todayRef);
  if (todaySnap.exists() && todaySnap.data().dateKey === todayKey) {
    targetEl.textContent = `오늘 심연의 기류는 ${todaySnap.data().flowText} 입니다.`;
    return;
  }

  const cfgSnap = await getDoc(cfgRef);
  const flows = cfgSnap.exists() ? cfgSnap.data().flows || [] : [];
  if (!flows.length) {
    targetEl.textContent = '기류 설정 없음';
    return;
  }

  const picked = pickByWeight(flows);
  await setDoc(todayRef, { flowText: picked, dateKey: todayKey, updatedAt: serverTimestamp() });
  targetEl.textContent = `오늘 심연의 기류는 ${picked} 입니다.`;
}

async function loadStaffSummary(statusEl, rankEl) {
  const usersSnap = await getDocs(collection(db, 'users'));
  let alive = 0, missing = 0, dead = 0, contaminated = 0;
  let maxSilver = -1, minDeath = Infinity;
  let topSilver = '-', topSurvivor = '-';

  usersSnap.forEach(d => {
    const u = d.data();
    const s = u.status || 'alive';
    if (s === 'alive') alive++;
    if (s === 'missing') missing++;
    if (s === 'dead') dead++;
    if (s === 'contaminated') contaminated++;

    if ((u.silver || 0) > maxSilver) {
      maxSilver = u.silver || 0;
      topSilver = u.nickname || u.id;
    }

    const dc = u.achievements?.deathCount ?? Infinity;
    if (dc < minDeath) {
      minDeath = dc;
      topSurvivor = u.nickname || u.id;
    }
  });

  statusEl.innerHTML = `생존: ${alive} | 실종: ${missing} | 오염: ${contaminated} | 사망: ${dead}`;
  rankEl.innerHTML = `은화: ${topSilver} (${maxSilver}) | 생존왕: ${topSurvivor} (${minDeath})`;
}

async function loadTodaySchedule(targetEl) {
  const schedSnap = await getDoc(doc(db, 'schedule', 'days'));
  if (!schedSnap.exists()) {
    targetEl.textContent = '스케줄 데이터 없음';
    return;
  }

  const dayName = new Date().toLocaleDateString('ko-KR', { weekday: 'long' });
  const list = schedSnap.data().days?.[dayName] || [];

  targetEl.innerHTML = list.length
    ? list.map(v => `<div>${v}</div>`).join('')
    : `${dayName} 일정 없음`;
}

/* =========================================================
   Map Inline Edit (공용)
========================================================= */
function bindMapEditEvents(rootEl, mapId, isNew = false) {
  const imgPreview = rootEl.querySelector('.map-img-preview');
  const imgUrlInput = rootEl.querySelector('.map-img-url');
  const imgFileInput = rootEl.querySelector('.map-img-file');
  const dangerInput = rootEl.querySelector('.map-danger-input');
  const starsEl = rootEl.querySelector('.danger-stars');

  const updateStars = v => {
    const d = Math.min(5, Math.max(1, Number(v) || 1));
    dangerInput.value = d;
    starsEl.textContent = '★'.repeat(d) + '☆'.repeat(5 - d);
  };

  updateStars(dangerInput.value);

  imgUrlInput.addEventListener('input', () => {
    imgPreview.src = imgUrlInput.value;
    imgFileInput.value = '';
  });

  imgFileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => imgPreview.src = ev.target.result;
    r.readAsDataURL(file);
    imgUrlInput.value = '';
  });

  dangerInput.addEventListener('input', e => updateStars(e.target.value));
}

/* =========================================================
   Edit Existing Map
========================================================= */
async function openMapInlineEdit(mapId, data) {
  const cardInner = document.querySelector(`.map-card-inner[data-id="${mapId}"]`);
  if (!cardInner) return;

  const original = cardInner.innerHTML;
  const img = data.image || '';
  const types = Array.isArray(data.types) ? data.types.join(', ') : '';

  cardInner.innerHTML = `
  <div class="map-edit-form">
    <h4>맵 편집 (ID: ${mapId})</h4>
    <div class="map-edit-layout">
      <div class="map-media">
        <img class="map-img map-img-preview" src="${img}">
        <input class="map-img-url" value="${img}" placeholder="이미지 URL">
        <input class="map-img-file" type="file" accept="image/*">
      </div>
      <div class="map-main">
        <input class="map-name" value="${data.name||''}">
        <input type="number" class="map-danger-input" min="1" max="5" value="${data.danger||1}">
        <span class="danger-stars"></span>
        <input class="map-types" value="${types}">
        <textarea class="map-desc">${data.description||''}</textarea>
        <div class="map-actions">
          <button class="btn save">저장</button>
          <button class="btn cancel">취소</button>
          <button class="btn danger delete">삭제</button>
        </div>
      </div>
    </div>
  </div>
  `;

  bindMapEditEvents(cardInner, mapId);

  cardInner.querySelector('.save').onclick = async () => {
    const btn = cardInner.querySelector('.save');
    btn.disabled = true;

    try {
      let finalImg = cardInner.querySelector('.map-img-url').value;
      const file = cardInner.querySelector('.map-img-file').files[0];
      if (file) finalImg = await uploadMapImage(file, mapId);

      const newData = {
        name: cardInner.querySelector('.map-name').value,
        danger: Number(cardInner.querySelector('.map-danger-input').value),
        types: cardInner.querySelector('.map-types').value.split(',').map(v=>v.trim()).filter(Boolean),
        description: cardInner.querySelector('.map-desc').value,
        image: finalImg,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db,'maps',mapId), newData);
      showMessage('맵 저장 완료','info');
      renderMap();
    } catch(e) {
      showMessage('저장 실패','error');
    } finally {
      btn.disabled = false;
    }
  };

  cardInner.querySelector('.cancel').onclick = () => {
    cardInner.innerHTML = original;
    renderMap();
  };

  cardInner.querySelector('.delete').onclick = async () => {
    if (!await showConfirm('정말 삭제하겠나.')) return;
    await deleteDoc(doc(db,'maps',mapId));
    showMessage('삭제 완료','info');
    renderMap();
  };
}

/* =========================================================
   New Map
========================================================= */
async function openNewMapInlineEdit() {
  const temp = document.createElement('div');
  temp.className = 'map-card card';

  temp.innerHTML = `
  <div class="map-card-inner">
    <h4>새 맵 생성</h4>
    <img class="map-img map-img-preview">
    <input class="map-img-url" placeholder="이미지 URL">
    <input class="map-img-file" type="file">
    <input class="map-name" placeholder="맵 이름">
    <input type="number" class="map-danger-input" min="1" max="5" value="1">
    <span class="danger-stars"></span>
    <input class="map-types" placeholder="출현 타입">
    <textarea class="map-desc"></textarea>
    <button class="btn save">생성</button>
    <button class="btn cancel">취소</button>
  </div>
  `;

  contentEl.prepend(temp);
  bindMapEditEvents(temp, null, true);

  temp.querySelector('.save').onclick = async () => {
    const name = temp.querySelector('.map-name').value;
    if (!name) return showMessage('이름 필요','error');

    const refDoc = doc(collection(db,'maps'));
    let img = temp.querySelector('.map-img-url').value;
    const file = temp.querySelector('.map-img-file').files[0];
    if (file) img = await uploadMapImage(file, refDoc.id);

    await setDoc(refDoc,{
      name,
      danger:Number(temp.querySelector('.map-danger-input').value),
      types: temp.querySelector('.map-types').value.split(',').filter(Boolean),
      description: temp.querySelector('.map-desc').value,
      image: img,
      createdAt: serverTimestamp()
    });

    showMessage('맵 생성 완료','info');
    renderMap();
  };

  temp.querySelector('.cancel').onclick = () => temp.remove();
}

// ==============================
// Dex Tab (도감) – Refactored
// ==============================

// ---------- Constants ----------
const DANGER_TYPES = { 유광:'유광', 해수:'해수', 심해:'심해', 파생:'파생' };
const SHAPE_TYPES = ['P','F','O','C'];

const BASE_HP = 100, BASE_MP = 50;
const HP_PER_STR = 15, HP_PER_HEALTH = 20;
const MP_PER_AGI = 5, MP_PER_MIND = 10;
const ATTACK_PER_STR = 8, ATTACK_PER_AGI = 5, M_ATTACK_PER_MIND = 10;

// ---------- Utils ----------
const num = v => Number(v || 0);
const clamp = (v,min=0)=>Math.max(min,num(v));

function generateAbyssCode(danger, shape, discoverySeq=0, derivedSeq=0){
  const d = DANGER_TYPES[danger] || '';
  const s = shape || '';
  return danger==='파생' && derivedSeq>0 ? `${s}${discoverySeq}-${derivedSeq}` : `${d}-${s}${discoverySeq}`;
}

function calculateAbyssStats({strength=0,health=0,agility=0,mind=0}){
  return {
    maxHp: BASE_HP + strength*HP_PER_STR + health*HP_PER_HEALTH,
    maxMp: BASE_MP + agility*MP_PER_AGI + mind*MP_PER_MIND,
    physicalAttack: strength*ATTACK_PER_STR + agility*ATTACK_PER_AGI,
    mentalAttack: mind*M_ATTACK_PER_MIND
  };
}

// ---------- Disclosure ----------
function calculateDisclosurePercentage(a){
  let total=0, pub=0;
  const countObj=o=>Object.keys(o||{}).forEach(k=>{ total++; if(o[k]) pub++; });

  countObj(a.basic?.isPublic);
  countObj(a.stats?.isPublic);

  ['basicInfo','collectionInfo','otherInfo'].forEach(k=>{
    (a.management?.[k]||[]).forEach((it,i)=>{
      if(k==='basicInfo' && i===0) return;
      total++; if(it.isPublic) pub++;
    });
  });

  (a.logs||[]).forEach((l,i)=>{
    if(i===0) return;
    total++; if(l.isPublic) pub++;
  });

  return total?Math.floor(Math.min(100,(pub/total)*100)):0;
}

function setSectionDisclosure(data, section, isPublic){
  if(section==='basic'||section==='stats'){
    Object.keys(data[section].isPublic||{}).forEach(k=>data[section].isPublic[k]=isPublic);
  }
  if(section==='management'){
    ['basicInfo','collectionInfo','otherInfo'].forEach(k=>{
      (data.management[k]||[]).forEach(i=>i.isPublic=isPublic);
    });
  }
  if(section==='logs'){
    (data.logs||[]).forEach(l=>l.isPublic=isPublic);
  }
}

// ---------- Inline Edit ----------
function handleEditFieldChange(data, section, key, value){
  if(key.includes('[')){
    const [,arr,i,sub]=key.match(/(\w+)\[(\d+)\]\.(\w+)/);
    data[section][arr][num(i)][sub]=value;
  }else{
    data[section][key]=['discoverySeq','derivedSeq'].includes(key)?num(value):value;
  }
  if(section==='basic' && ['danger','shape','discoverySeq','derivedSeq'].includes(key)){
    const b=data.basic;
    b.code=generateAbyssCode(b.danger,b.shape,b.discoverySeq,b.derivedSeq);
  }
}

function renderInlineField(f,val,isEdit,section,idx=null,sub=null){
  const key=idx!==null?`${f.key}[${idx}].${sub}`:f.key;
  if(!isEdit||f.readOnly) return val;
  if(f.type==='select'){
    return `<select data-key="${key}" data-section="${section}" class="inline-edit-field">
      ${f.options.map(o=>`<option ${o===val?'selected':''}>${o}</option>`).join('')}
    </select>`;
  }
  if(f.type==='textarea'){
    return `<textarea data-key="${key}" data-section="${section}" class="inline-edit-field">${val||''}</textarea>`;
  }
  return `<input type="${f.type||'text'}" data-key="${key}" data-section="${section}" value="${val||''}" class="inline-edit-field">`;
}

// ---------- DB ----------
async function saveAbyssData(id,data){
  data.basic.code=generateAbyssCode(data.basic.danger,data.basic.shape,data.basic.discoverySeq,data.basic.derivedSeq);
  await setDoc(doc(db,'abyssal_dex',id),data,{merge:true});
}
async function deleteAbyssData(id){
  await deleteDoc(doc(db,'abyssal_dex',id));
  renderDex();
}

// ---------- List ----------
function renderDexCard(a,isManager){
  const b=a.basic||{};
  const p=calculateDisclosurePercentage(a);
  if(!isManager && !b.isPublic?.image && !b.isPublic?.code && !b.isPublic?.name) return '';
  const show=isManager||b.isPublic?.image;
  const img=show?(b.image||DEFAULT_PROFILE_IMAGE):'';
  const r=255-Math.floor(p*2.55), g=Math.floor(p*2.55);
  return `
  <div class="dex-card" data-id="${a.id}" style="border:5px solid rgb(${r},${g},0);background:${img?`url('${img}') center/cover`:'#555'}">
    <div class="dex-overlay">
      <strong>${(isManager||b.isPublic?.name)?(b.name||''):'???'}</strong>
      <span>${(isManager||b.isPublic?.code)?(b.code||''):'???'}</span>
    </div>
  </div>`;
}

async function renderDex(){
  const isManager=await isAdminUser();
  const snap=await getDocs(collection(db,'abyssal_dex'));
  const list=[]; snap.forEach(d=>list.push({id:d.id,...d.data()}));
  const done=list.filter(a=>calculateDisclosurePercentage(a)===100).length;

  contentEl.innerHTML=`
    <div class="card"><h2>도감 개방 ${done}/${list.length}</h2></div>
    ${isManager?'<button id="addNewAbyssBtn">+ 새 심연체</button>':''}
    <div class="dex-grid">${list.map(a=>renderDexCard(a,isManager)).join('')}</div>
  `;

  document.getElementById('addNewAbyssBtn')?.onclick=createNewAbyss;
  document.querySelectorAll('.dex-card').forEach(c=>c.onclick=()=>renderDexDetail(c.dataset.id));
}

// ---------- Detail ----------
async function renderDexDetail(id,isEdit=false,pre=null){
  const data=pre||((await getDoc(doc(db,'abyssal_dex',id))).data());
  const isManager=await isAdminUser();
  data.basic.code=generateAbyssCode(data.basic.danger,data.basic.shape,data.basic.discoverySeq,data.basic.derivedSeq);
  const calc=calculateAbyssStats(data.stats);
  const percent=calculateDisclosurePercentage(data);

  contentEl.innerHTML=`
  <div class="card">
    <button id="back">←</button>
    ${isManager?`<button id="toggle">${isEdit?'저장':'편집'}</button>`:''}
    <div>개방률 ${percent}%</div>
    <div id="basic"></div>
    <div id="stats"></div>
    <div id="management"></div>
    <div id="logs"></div>
  </div>`;

  renderBasicInfoSection(basic,data,isEdit,isManager);
  renderStatsSection(stats,data,calc,isEdit,isManager);
  renderManagementSection(management,data,isEdit,isManager);
  renderLogsSection(logs,data,isEdit,isManager);

  back.onclick=renderDex;
  toggle?.addEventListener('click',async()=>{
    if(isEdit){ await saveAbyssData(id,data); renderDexDetail(id,false); }
    else renderDexDetail(id,true);
  });
}

// ---------- Admin ----------
async function isAdminUser(){
  const u=auth.currentUser;
  if(!u) return false;
  const d=await getDoc(doc(db,'users',u.uid));
  return d.exists() && d.data().role==='admin';
}

/**
 * Firestore helpers
 */
async function fetchSheetData(sheetId) {
    try {
        const snap = await getDoc(doc(db, 'sheets', sheetId));
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        console.error('Fetch Sheet Data Failed:', e);
        return null;
    }
}

async function fetchItemDescription(itemName) {
    try {
        const q = query(collection(db, 'items'), where('name', '==', itemName));
        const snap = await getDocs(q);
        if (!snap.empty) {
            return snap.docs[0].data().description || '설명 없음';
        }
    } catch (e) {
        console.error('Failed to fetch item description:', e);
    }
    return '설명 없음 (DB 로드 실패)';
}

/**
 * Status text & color
 */
function getStatusText(injuryPercent = 0, contaminationPercent = 0) {
    let injuryText, contaminationText;

    if (injuryPercent === 0) injuryText = '부상 없음.';
    else if (injuryPercent <= 10) injuryText = '경미한 찰과상.';
    else if (injuryPercent <= 30) injuryText = '타박상 및 출혈.';
    else if (injuryPercent <= 60) injuryText = '깊은 상처 및 골절 가능성.';
    else injuryText = '심각한 부상, 활동 불가 수준.';

    if (contaminationPercent === 0) contaminationText = '오염 없음.';
    else if (contaminationPercent <= 10) contaminationText = '경미한 오염, 즉시 제거 가능.';
    else if (contaminationPercent <= 30) contaminationText = '중간 오염, 징후 발현.';
    else if (contaminationPercent <= 60) contaminationText = '심각한 오염, 신체 능력 저하.';
    else contaminationText = '치명적인 오염, 변이 진행 중.';

    return [injuryText, contaminationText];
}

function calculatePartColor(injury = 0, contamination = 0) {
    const i = Math.min(100, injury) / 100;
    const c = Math.min(100, contamination) / 100;

    if (i === 0 && c === 0) return 'rgba(255,255,255,0.1)';

    const r = Math.min(200, Math.round(c * 200 + 50));
    const g = Math.min(200, Math.round((i + c) * 30 + 40));
    const b = Math.min(255, Math.round((i + c) * 200 + 40));

    return `rgb(${r},${g},${b})`;
}

/**
 * Main render
 */
async function renderMe() {
    if (!currentUser) {
        contentEl.innerHTML = `<div class="card muted" style="text-align:center;">로그인 후 이용해 주세요.</div>`;
        return;
    }

    const uid = currentUser.uid;
    const sheetData = await fetchSheetData(uid);
    const isAdmin = await isAdminUser();

    if (!sheetData?.personnel || !sheetData?.stats) {
        contentEl.innerHTML = `
            <div class="card muted" style="text-align:center;">
                캐릭터 시트 데이터가 없습니다.
            </div>
            <div style="text-align:center; margin-top:15px;">
                <button class="btn primary" onclick="openNewUserCustomization('${uid}','${currentUser.displayName || currentUser.email.split('@')[0]}')">
                    캐릭터 시트 초기 설정
                </button>
            </div>
        `;
        return;
    }

    const p = sheetData.personnel;
    const s = sheetData.stats;
    const inv = sheetData.inventory || { silver: 0, items: [] };
    const nickname = p.name || currentUser.displayName || currentUser.email.split('@')[0];

    contentEl.innerHTML = `
        <div class="me-container">
            ${renderMePersonnelSection(p, nickname, uid, isAdmin)}
            ${renderMeStatsSection(s, isAdmin, uid).outerHTML}
            <div class="card map-card" id="me-inventory-section"></div>
            <div class="card map-card">
                ${renderMeStatusSection(s, s.spirit || 1, isAdmin, uid)}
            </div>
            <hr style="margin:30px 0;">
            <div class="card" style="text-align:center;">
                <p>계정 관련 모든 데이터를 영구적으로 삭제합니다.</p>
                <button class="btn danger" id="deleteAccountButton">회원 탈퇴</button>
            </div>
        </div>
    `;

    document.getElementById('me-inventory-section').innerHTML =
        await renderMeInventorySection(inv, isAdmin, uid).then(el => el.outerHTML);

    document.getElementById('deleteAccountButton')?.addEventListener('click', () => {
        handleAccountDeletion(uid);
    });

    setTimeout(() => initStatsRadarCharts(s), 0);
}

/**
 * Sections
 */
function renderMePersonnelSection(p, nickname, sheetId, isAdmin) {
    const photoUrl = p.photoUrl || 'placeholder-profile.png';

    return `
        <div class="card map-card">
            <h2>${nickname}님의 시트</h2>
            <div class="personnel-grid">
                <div class="photo-area">
                    <img src="${photoUrl}" style="width:100%;aspect-ratio:3/4;object-fit:cover;">
                </div>
                <div class="details-area">
                    ${renderHorizontalTable('', [
                        { label: '이름', value: p.name },
                        { label: '성별', value: p.gender },
                        { label: '나이', value: p.age },
                        { label: '키/체중', value: `${p.height} / ${p.weight}` },
                        { label: '국적', value: p.nationality },
                    ], isAdmin)}
                </div>
            </div>
            ${isAdmin ? `<button class="btn link" onclick="openPersonnelEdit('${sheetId}',${JSON.stringify(p)})">편집</button>` : ''}
        </div>
    `;
}

function renderMeStatsSection(s, isAdmin, sheetId) {
    const section = document.createElement('div');
    section.className = 'card map-card';

    section.innerHTML = `
        <h2>스탯</h2>
        ${renderHorizontalTable('', [
            { label: '근력', value: s.muscle },
            { label: '민첩', value: s.agility },
            { label: '지구력', value: s.endurance },
            { label: '지능', value: s.intellect },
            { label: '정신력', value: s.spirit },
        ], isAdmin, true)}
        ${isAdmin ? `<button class="btn link" onclick="openStatsEdit('${sheetId}',${JSON.stringify(s)})">편집</button>` : ''}
    `;
    return section;
}

async function renderMeInventorySection(inv, isAdmin, sheetId) {
    const section = document.createElement('div');
    section.className = 'card map-card';

    const descriptions = await Promise.all(
        inv.items.map(it => it.desc ? it.desc : fetchItemDescription(it.name))
    );

    const rows = inv.items.length
        ? inv.items.map((it, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${it.name}</td>
                <td>${descriptions[i]}</td>
                <td>${it.count}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="4" style="text-align:center;">소지품 없음</td></tr>`;

    section.innerHTML = `
        <h2>인벤토리</h2>
        <div>은화: <strong>${inv.silver}</strong></div>
        <table class="data-table">
            <thead><tr><th>#</th><th>이름</th><th>설명</th><th>수량</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        ${isAdmin ? `<button class="btn link" onclick="openInventoryEdit('${sheetId}',${JSON.stringify(inv)})">편집</button>` : ''}
    `;
    return section;
}

function renderMeStatusSection(s, spiritStat, isAdmin, sheetId) {
    const parts = ['head','torso','leftArm','rightArm','leftLeg','rightLeg'];
    const totalInjury = parts.reduce((a,k)=>a+(s.injuries?.[k]||0),0);

    return `
        <h2>현재 상태</h2>
        <div>정신력 ${s.currentSpirit}/${s.maxSpirit}</div>
        <div>신체 상태: ${totalInjury > 100 ? '심각' : totalInjury > 50 ? '불안정' : '양호'}</div>
        ${renderHumanIcon(s.injuries||{}, s.contaminations||{})}
        ${isAdmin ? `<button class="btn link" onclick="openStatusEdit('${sheetId}',${JSON.stringify(s)})">편집</button>` : ''}
    `;
}

/**
 * Visual helpers
 */
function renderHumanIcon(injuries = {}, contaminations = {}) {
    const c = k => calculatePartColor(injuries[k], contaminations[k]);
    return `
        <svg viewBox="0 0 100 150" style="max-width:200px;">
            <path d="M 50 5 A 1 1 0 0 0 50 31 A 1 1 0 0 0 50 5 Z" fill="${c('head')}" />
            <path d="M 35 35 L 65 35 L 65 90 L 35 90 Z" fill="${c('torso')}" />
            <path d="M 35 35 L 28 35 C 24 35 20 39 20 43 L 20 90 C 20 99 32 99 32 90 L 32 56 C 32 55 34 53 35 53 Z" fill="${c('leftArm')}" />
            <path d="M 65 35 L 72 35 C 76 35 79 39 79 43 L 80 90 C 80 99 68 99 68 90 L 68 56 C 68 54 67 53 65 53 Z" fill="${c('rightArm')}" />
            <path d="M 35 90 L 35 153 C 35 162 48 162 48 153 L 48 97 C 48 96 49 95 50 95 L 50 90 Z" fill="${c('leftLeg')}" />
            <path d="M 50 90 L 50 95 C 51 95 52 96 52 97 L 52 153 C 52 162 65 162 65 153 L 65 90 Z" fill="${c('rightLeg')}" />
        </svg>
    `;
}

/**
 * Table helper
 */
function renderHorizontalTable(title, rows, isAdmin, isStatLike = false) {
    return `
        <table class="data-table horizontal">
            <tbody>
                ${rows.map(r => `
                    <tr>
                        <td style="font-weight:bold;">${r.label}</td>
                        <td>
                            ${isAdmin
                                ? `<input type="${typeof r.value === 'number' ? 'number' : 'text'}" value="${r.value ?? ''}">`
                                : (r.value ?? '')
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

