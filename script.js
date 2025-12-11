import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    serverTimestamp,
    query,
    where,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDGmwk9FtwnjUKcH4T6alvMWVQqbhVrqfI",
    authDomain: "abyss-suicide-co.firebaseapp.com",
    projectId: "abyss-suicide-co",
    storageBucket: "abyss-suicide-co.appspot.com",
    messagingSenderId: "711710259422",
    appId: "1:711710259422:web:3c5ba7c93edb3d6d6baa4f"
};

const TABS = [
    { id: 'main', title: '메인' },
    { id: 'staff', title: '직원' },
    { id: 'me', title: '내 상태' },
    { id: 'map', title: '맵' },
    { id: 'dex', title: '도감' }
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

async function uploadStaffImage(file, uid) {
    const storageRef = ref(storage, `staff/${uid}_${Date.now()}.png`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

const header = document.getElementById('header');
const mainApp = document.getElementById('mainApp');
const navEl = document.getElementById('nav');
const contentEl = document.getElementById('content');
const logOutEl = document.getElementById('log-out');
const nowTimeEl = document.getElementById('nowTime');
const miniProfile = document.getElementById('miniProfile');
const systemInfo = document.getElementById('systemInfo');


const login = document.getElementById('login');
const loginForm = document.getElementById('login-form');
const loginAuthForms = document.getElementById('login-auth-forms');
const loginId = document.getElementById('login-id');
const loginPassword = document.getElementById('login-password');
const loginBth = document.getElementById('login-bth');
const gotoSignupBth = document.getElementById('goto-signup-bth');
const loginBoxMsg = document.getElementById('login-box-msg');

const signupForm = document.getElementById('signup-form');
const signupId = document.getElementById('signup-id');
const signupPassword = document.getElementById('signup-password');
const signupEmail = document.getElementById('signup-email');
const signupNickname = document.getElementById('signup-nickname');
const signupBth = document.getElementById('signup-bth');
const gotoLoginBth = document.getElementById('goto-login-bth');
const signupBoxMsg = document.getElementById('signup-box-msg');

const profileModal = document.getElementById("profileModal");

let currentUser = null;

function initNav() {
    navEl.innerHTML = '';
    TABS.forEach( tab => {
        const b = document.createElement('button');

        b.textContent = tab.title;
        b.dataset.tab = tab.id;
        b.addEventListener('click', () => loadTab(tab.id, true));

        navEl.appendChild(b);
    });
}
    
function setActiveNav(tabId) {
      navEl.querySelectorAll('button').forEach( b => b.classList.toggle('active', b.dataset.tab === tabId));
}

function showLogOutUI() {
    header.style.display = 'none';
    login.style.display = 'flex';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
}

function showLoggedInUI(){
    login.style.display = 'none';
    header.style.display = 'flex';
}

function randomHex(){
    const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0'); 
    const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    
    return '#' + r + g + b;
}

function startClock() {
    function tick() {
    const d = new Date();
    // 시간 표시에서 초 제외
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    nowTimeEl.textContent = d.toLocaleString(undefined, options);
    }
    tick();
    setInterval(tick, 1000);
}

gotoSignupBth.addEventListener('click', () => {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    loginBoxMsg.textContent = '';
    signupBoxMsg.textContent = '';
    document.getElementById('loginTitle').textContent = '회원가입';
});

gotoLoginBth.addEventListener('click', () => {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    signupBoxMsg.textContent = '';
    loginBoxMsg.textContent = '';
    document.getElementById('loginTitle').textContent = '로그인';
});

signupBth.addEventListener('click', async ()=>{
    signupBoxMsg.textContent = '';

    const id = signupId.value;
    const email = signupEmail.value.trim();
    const pw = signupPassword.value;
    const nick = signupNickname.value.trim();

    if (!id) { signupBoxMsg.textContent = '아이디를 입력해 주세요.'; return; }

    if (!nick) { signupBoxMsg.textContent = '닉네임을 입력해 주세요.'; return; }

    if (!email || !pw) { signupBoxMsg.textContent = '이메일과 비밀번호를 입력해 주세요.'; return; }

    try { 
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    const uid = cred.user.uid;
    await setDoc(doc(db,'users',uid), {
        email,
        id,
        password: pw,
        nickname: nick,
        colorHex: randomHex(),
        decorations: [],
        silver: 0,
        inventory: {},
        status: 'alive',
        achievements: {
            deathCount: 0,
            expeditionCount: 0,
            interviewCount: 0,
            objectCount: 0,
            creatureSubduedCount: 0,
            haveSilverCount: 0
        },
        createdAt: serverTimestamp()
    });
    await setDoc(doc(db, 'staff', uid), {
        uid,
        name: nick,          // 닉네임을 직원명으로 사용
        status: 'alive',
        image: '',
        silver: 0,
        desc: '',
        updatedAt: serverTimestamp()
    });

    signupBoxMsg.textContent = '가입 성공. 로그인 처리 중.';
    } catch(e) {
    signupBoxMsg.textContent = '가입 실패: ' + (e.message || e.code);
    }
});

loginBth.addEventListener('click', async ()=> {
    loginBoxMsg.textContent = '';

    const id = loginId.value.trim();
    const pw = loginPassword.value;

    if (!id || !pw) { 
        loginBoxMsg.textContent = '아이디와 비밀번호를 입력해 주세요.'; 
        return; 
    }

    try {
        // 1. Firestore에서 id로 유저 찾기
        const q = query(collection(db, 'users'), where('id', '==', id));
        const snap = await getDocs(q);

        if (snap.empty) {
            loginBoxMsg.textContent = '존재하지 않는 아이디입니다.';
            return;
        }

        // 2. 이메일 추출
        const userDoc = snap.docs[0].data();
        const email = userDoc.email;

        // 3. 실제 Firebase Auth 로그인
        await signInWithEmailAndPassword(auth, email, pw);
        loginBoxMsg.textContent = '로그인 성공.';
    } catch(e) {
        loginBoxMsg.textContent = '로그인 실패: ' + (e.message || e.code);
    }
});

loginForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        loginBth.click();
    }
});

signupForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        signupBth.click();
    }
});

function renderAuthArea(user){
    logOutEl.innerHTML = '';

    if (!user) return;
    
    const btn = document.createElement('button');
    
    btn.className = 'btn';
    btn.textContent = '로그아웃';
    btn.addEventListener('click', ()=> signOut(auth));
    logOutEl.appendChild(btn);
}

async function subscribeSystem(){
    const sysDocRef = doc(db, 'system', 'employeeStatus');

    try {
    const snap = await getDoc(sysDocRef);
    if (snap.exists()) {
        systemInfo.textContent = JSON.stringify(snap.data());
    } else {
        systemInfo.textContent = '시스템 정보 없음';
    }
    } catch(e) {
    systemInfo.textContent = '시스템 로드 실패';
    }
}

async function loadTab(tabId){
    setActiveNav(tabId);
    contentEl.innerHTML = '<div class="card muted">로딩...</div>';
    switch(tabId) {
    case 'main': await renderMain(); break;
    case 'staff': await renderStaff(); break;
    case 'me': await renderMe(); break;
    case 'map': renderMap(); break;
    case 'dex': renderDex(); break;
    default: contentEl.innerHTML = '<div class="card">알 수 없는 탭</div>';
    }
}

function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${y}${m}${day}`;
}

function pickByWeight(list) {
    const total = list.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * total;

    for (const item of list) {
        if (r < item.weight) return item.text;
        r -= item.weight;
    }
    return list[list.length - 1].text;
}

async function renderMain(){
    contentEl.innerHTML = '';

    // 1. 심연 기류
    const flowCard = document.createElement('div');
    flowCard.className = 'card';
    flowCard.innerHTML = `
        <div class="muted">심연 상태</div>
        <h3 id="abyssFlow">오늘 심연의 기류는 불러오는 중...</h3>
    `;
    contentEl.appendChild(flowCard);

    // 2. 직원 현황 + 일정
    const statusCard = document.createElement('div');
    statusCard.className = 'card';
    statusCard.innerHTML = `
        <div class="muted">직원 현황</div>
        <div id="staffStatus">불러오는 중...</div>

        <div class="muted" style="margin-top:10px;">일정</div>
        <div id="staffSchedule">불러오는 중...</div>
    `;
    contentEl.appendChild(statusCard);

    // 3. 오늘 이벤트
    const eventCard = document.createElement('div');
    eventCard.className = 'card';
    eventCard.innerHTML = `
        <div class="muted">오늘의 이벤트</div>
        <div id="todayEvent">불러오는 중...</div>
    `;
    contentEl.appendChild(eventCard);

    // 4. 직원 순위
    const rankCard = document.createElement('div');
    rankCard.className = 'card';
    rankCard.innerHTML = `
        <div class="muted">직원 순위</div>
        <div id="staffRank">불러오는 중...</div>
    `;
    contentEl.appendChild(rankCard);

    // ---- 여기부터 DB 로딩 영역 ----
    try {
        // 1. 심연 기류
        const todayKey = getTodayKey();

        const todayRef = doc(db, 'system', 'abyssToday');
        const todaySnap = await getDoc(todayRef);

        let flowText = null;
        let savedDate = null;

        if (todaySnap.exists()) {
            const data = todaySnap.data();
            flowText = data.flowText;
            savedDate = data.dateKey;
        }

        // 설정 불러오기
        const cfgSnap = await getDoc(doc(db, 'system', 'abyssConfig'));

        if (flowText && savedDate === todayKey) {
            // 이미 오늘 값이 있으면 그대로 사용
            document.getElementById('abyssFlow').textContent =
                '오늘 심연은 ' + flowText + '습니다.';
        } else if (cfgSnap.exists()) {
            const flows = cfgSnap.data().flows || [];

            if (flows.length > 0) {
                const picked = pickByWeight(flows);

                // DB에 저장
                await setDoc(todayRef, {
                    flowText: picked,
                    dateKey: todayKey,
                    updatedAt: serverTimestamp()
                });

                document.getElementById('abyssFlow').textContent =
                    '오늘 심연의 기류는 ' + picked + ' 입니다.';
            } else {
                document.getElementById('abyssFlow').textContent =
                    '기류 데이터 없음';
            }
        } else {
            document.getElementById('abyssFlow').textContent =
                '기류 설정 없음';
        }

        // 2. 직원 현황
        const usersSnap = await getDocs(collection(db, 'users'));
        let alive=0, missing=0, dead=0, contaminated=0;

        let maxSilver = -1;
        let minDeath = 999999;
        let topSilverName = '-';
        let topSurvivorName = '-';

        usersSnap.forEach(docu => {
            const d = docu.data();
            const s = d.status || 'alive';

            if (s === 'alive') alive++;
            else if (s === 'missing') missing++;
            else if (s === 'dead') dead++;
            else if (s === 'contaminated') contaminated++;

            // silver 랭킹
            if ((d.silver || 0) > maxSilver) {
                maxSilver = d.silver || 0;
                topSilverName = d.nickname || d.id;
            }

            // 최소 사망자
            const dc = d.achievements?.deathCount ?? 0;
            if (dc < minDeath) {
                minDeath = dc;
                topSurvivorName = d.nickname || d.id;
            }
        });

        // 직원 통계 출력
        document.getElementById('staffStatus').innerHTML = `
            <div>생존: ${alive}</div>
            <div>실종: ${missing}</div>
            <div>오염: ${contaminated}</div>
            <div>사망: ${dead}</div>
        `;

        // 2-2. 일정
        // 현재 일차 불러오기
        const daySnap = await getDoc(doc(db, 'system', 'day'));
        let currentDay = 1;

        if (daySnap.exists()) {
            currentDay = daySnap.data().currentDay || 1;
        }

        // 스케줄 불러오기
        const schedSnap = await getDoc(doc(db, 'schedule', 'days'));

        if (schedSnap.exists()) {
            const daysData = schedSnap.data().days || {};
            const todayList = daysData[currentDay] || [];

            if (todayList.length > 0) {
                document.getElementById('staffSchedule').innerHTML =
                    todayList.map(t => `<div>${t}</div>`).join('');
            } else {
                document.getElementById('staffSchedule').textContent =
                    `${currentDay}일차 일정 없음`;
            }
        } else {
            document.getElementById('staffSchedule').textContent = '스케줄 데이터 없음';
        }

        // 4. 랭킹
        document.getElementById('staffRank').innerHTML = `
            <div>은화 최다 보유: ${topSilverName} (${maxSilver})</div>
            <div>최소 사망 기록: ${topSurvivorName} (${minDeath})</div>
        `;
    } catch(e) {
        contentEl.innerHTML += `<div class="card muted">데이터 로드 실패</div>`;
    }
}

async function renderStaff() {
  contentEl.innerHTML = `
    <div class="card">
      <div class="muted">직원 목록</div>
      <div id="staffList" class="staff-grid"></div>
    </div>
  `;

  const listEl = document.getElementById("staffList");
  const snap = await getDocs(collection(db, "staff"));
  listEl.innerHTML = "";

  snap.forEach(docSnap => {
    const f = docSnap.data();

    const item = document.createElement("div");
    item.className = "staff-thumb";
    item.onclick = () => openProfileModal(docSnap.id, f);

    // 3:4 비율 유지된 썸네일
    item.innerHTML = `
      <div class="thumb-img"
        style="
          background-image:url('${f.image || ''}');
          aspect-ratio: 3 / 4;
          background-size: cover;
          background-position: center;
        ">
      </div>
      <div class="thumb-name">${f.name}</div>
    `;

    listEl.appendChild(item);
  });
}

async function updateStaff(docId, prevData) {
  const send = {
    name: document.getElementById("editName").value,
    status: document.getElementById("editStatus").value,
    image: document.getElementById("editImage").value,
    desc: document.getElementById("editDesc").value,
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, "staff", docId), send);

  // 갱신된 데이터로 다시 로드
  openProfileModal(docId, { ...prevData, ...send });
  renderStaff();  // 목록 새로고침
}

let radarObj = null;

function drawStatChart(stats = { str:1, vit:1, agi:1, wil:1 }) {
  const ctx = document.getElementById("statRadar");
  if (!ctx) return;

  if (radarObj) radarObj.destroy();

  const clamp = v => Math.max(1, Math.min(5, Number(v))); // 최소 1

  radarObj = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ["근력", "건강", "민첩", "정신력"],
      datasets: [{
        data: [
          clamp(stats.str),
          clamp(stats.vit),
          clamp(stats.agi),
          clamp(stats.wil)
        ],
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        borderColor: "#000"
      }]
    },
    options: {
      scales: {
        r: {
          min: 1,  // 레이더 최소값
          max: 5,  // 레이더 최대값
          ticks: {
            stepSize: 1,
            callback: v => v // 보조선에 숫자 표시
          }
        }
      }
    }
  });
}

function openProfileModal(docId, data) {
  profileModal.innerHTML = `
    <div class="modal-content profile-wide">

      <button id="closeProfile" class="back-btn">← 돌아가기</button>

      <div class="profile-top">

        <div class="profile-img-wrap">
          <img class="profile-img" src="${data.image || ""}" alt="">
        </div>

        <div class="profile-info">
          <p><span class="label">이름</span> ${data.name || ""}</p>
          <p><span class="label">성별</span> ${data.gender || ""}</p>
          <p><span class="label">나이</span> ${data.age || ""}</p>
          <p><span class="label">키·체중</span> ${data.body || ""}</p>
          <p><span class="label">국적</span> ${data.nation || ""}</p>
          <hr>
          <p><span class="label">비고</span></p>
          <p style="white-space:pre-line">${data.note || ""}</p>
        </div>

      </div>

      <div class="stat-area-fixed">
        <div class="stat-left">
          <p>근력: ${data.str || 1}</p>
          <p>건강: ${data.vit || 1}</p>
          <p>민첩: ${data.agi || 1}</p>
          <p>정신력: ${data.wil || 1}</p>
        </div>

        <canvas id="statRadar" width="260" height="260"></canvas>
      </div>

      <div id="editArea"></div>

    </div>
  `;

  profileModal.showModal();

  document.getElementById("closeProfile").onclick = () => profileModal.close();

  const editBtn = document.createElement("button");
  editBtn.textContent = "편집";
  editBtn.onclick = () => openEditModal(docId, data);
  document.getElementById("editArea").appendChild(editBtn);

  drawStatChart(data);
}


function openEditModal(docId, data) {
  editModal.innerHTML = `
    <div class="modal-content">

      <button id="closeEdit" class="back-btn">← 돌아가기</button>

      <div class="edit-grid">

        <label>이름</label>
        <input id="editName" value="${data.name || ""}">

        <label>성별</label>
        <input id="editGender" value="${data.gender || ""}">

        <label>나이</label>
        <input id="editAge" value="${data.age || ""}">

        <label>키·체중</label>
        <input id="editBody" value="${data.body || ""}">

        <label>국적</label>
        <input id="editNation" value="${data.nation || ""}">

        <label>비고</label>
        <textarea id="editNote">${data.note || ""}</textarea>

        <label>이미지 업로드</label>
        <input id="editImageFile" type="file" accept="image/*">

        <label>이미지 URL</label>
        <input id="editImage" value="${data.image || ""}">
      </div>

      <div class="edit-stats">
        <label>근력</label><input id="editStr" value="${data.str || 0}">
        <label>건강</label><input id="editVit" value="${data.vit || 0}">
        <label>민첩</label><input id="editAgi" value="${data.agi || 0}">
        <label>정신력</label><input id="editWil" value="${data.wil || 0}">
      </div>

      <button id="saveStaff">저장</button>
    </div>
  `;

  editModal.showModal();

  document.getElementById("closeEdit").onclick = () => editModal.close();

  document.getElementById("saveStaff").onclick = async () => {

    let finalImg = document.getElementById("editImage").value;
    const file = document.getElementById("editImageFile").files[0];

    if (file) {
      finalImg = await uploadStaffImage(file, docId);
    }

    const newData = {
      name: document.getElementById("editName").value,
      gender: document.getElementById("editGender").value,
      age: document.getElementById("editAge").value,
      body: document.getElementById("editBody").value,
      nation: document.getElementById("editNation").value,
      note: document.getElementById("editNote").value,
      image: finalImg,

      str: Number(document.getElementById("editStr").value),
      vit: Number(document.getElementById("editVit").value),
      agi: Number(document.getElementById("editAgi").value),
      wil: Number(document.getElementById("editWil").value),

      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, "staff", docId), newData);

    editModal.close();

    const merged = { ...data, ...newData };

    openProfileModal(docId, merged);

    setTimeout(() => renderStaff(), 20);
  };
}

// ---------- MAP 기능 (추가) ----------

// helper: check if current user is admin by reading users/{uid}.role
async function isAdminUser() {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        return uDoc.exists() && uDoc.data().role === 'admin';
    } catch(e) {
        console.error('isAdminUser err', e);
        return false;
    }
}

// upload map image to storage
async function uploadMapImage(file, mapId) {
  const storageRef = ref(storage, `maps/${mapId || 'tmp'}_${Date.now()}.png`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// format timestamp to readable string
function fmtTime(ts) {
  if (!ts) return '';
  try {
    // Firestore Timestamp -> toDate
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch(e) {
    return String(ts);
  }
}

// render single map card
function renderMapCard(mapDoc) {
  const mapId = mapDoc.id;
  const data = mapDoc.data ? mapDoc.data() : mapDoc; // accept either DocumentSnapshot or raw object
  const img = data.image || '';
  const name = data.name || '이름 없음';
  const desc = data.description || '';
  const danger = data.danger || 1; // 1..5
  const types = Array.isArray(data.types) ? data.types.join(', ') : (data.types || '');

  // card HTML
  const el = document.createElement('div');
  el.className = 'map-card card';

  el.innerHTML = `
    <div class="map-card-inner" data-id="${mapId}">
      <div class="map-media">
        <img class="map-img" src="${img}" alt="${name}">
      </div>

      <div class="map-main">
        <div class="map-head">
          <h3 class="map-name">${name}</h3>
          <div class="map-meta">
            <div class="map-danger">
            ${'★'.repeat(danger)}${'☆'.repeat(5 - danger)}
            </div>
            <div class="map-types">출현: ${types}</div>
          </div>
        </div>

        <div class="map-desc">${desc}</div>

        <div class="map-actions">
          <button class="btn map-open-comments">댓글 보기</button>
          <button class="btn map-add-comment">댓글 작성</button>
          <button class="btn link map-edit-btn" style="display:none">편집</button>
        </div>

        <div class="map-comments-preview">
          <div class="comments-count muted">댓글 0개</div>
          <div class="comments-list"></div>
          <div class="comments-more" style="display:none"><button class="link map-more-comments">더보기</button></div>
        </div>
      </div>
    </div>
  `;

  // attach events
  el.querySelector('.map-open-comments').addEventListener('click', () => openCommentsPopup(mapId));
  el.querySelector('.map-add-comment').addEventListener('click', () => focusCommentInput(mapId));
  el.querySelector('.map-more-comments').addEventListener('click', () => openCommentsPopup(mapId));
  el.querySelector('.map-edit-btn').addEventListener('click', async () => openMapEditModal(mapId));

  // show edit if admin
  (async () => {
    const admin = await isAdminUser();
    if (admin) {
      const btn = el.querySelector('.map-edit-btn');
      if (btn) btn.style.display = 'inline-block';
    }
  })();

  // load preview comments (up to 3)
  (async () => {
    try {
      const cSnap = await getDocs(collection(db, 'maps', mapId, 'comments'));
      const arr = [];
      cSnap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      // sort desc by createdAt
      arr.sort((a,b) => {
        const at = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        const bt = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return bt - at;
      });

      const preview = arr.slice(0, 3);
      const commentsList = el.querySelector('.comments-list');
      const commentsCount = el.querySelector('.comments-count');
      commentsCount.textContent = `댓글 ${arr.length}개`;

      if (preview.length === 0) {
        commentsList.innerHTML = `<div class="muted">댓글이 없습니다.</div>`;
      } else {
        commentsList.innerHTML = '';
        preview.forEach(c => {
          const item = document.createElement('div');
          item.className = 'comment-item';
          item.innerHTML = `
            <div class="cm-left"><img class="cm-avatar" src="${c.photo||''}" alt=""></div>
            <div class="cm-right">
                <div class="cm-head">
                <strong class="cm-name">${c.name||'익명'}</strong> 
                <span class="muted cm-time">${fmtTime(c.createdAt)}</span>
                </div>
                <div class="cm-body">${c.text || ''}</div>
                <div class="cm-admin" style="margin-top:6px; display:none; gap:8px;">
                <button class="link cm-edit">수정</button>
                <button class="link cm-del">삭제</button>
                </div>
            </div>
            `;

        (async () => {
            const admin = await isAdminUser();
            if (admin) {
                const btnWrap = item.querySelector('.cm-admin');
                btnWrap.style.display = 'flex';

                // 수정
                btnWrap.querySelector('.cm-edit').onclick = async () => {
                const newText = prompt('댓글 내용을 수정하시오.', c.text || '');
                if (!newText) return;
                await updateDoc(doc(db, 'maps', mapId, 'comments', c.id), {
                    text: newText,
                    editedAt: serverTimestamp()
                });
                renderMap();
                };

                // 삭제
                btnWrap.querySelector('.cm-del').onclick = async () => {
                const ok = confirm('정말 삭제하겠나.');
                if (!ok) return;
                await deleteDoc(doc(db, 'maps', mapId, 'comments', c.id));
                renderMap();
                };
            }
        })();
        commentsList.appendChild(item);
        });
      }

    const moreWrap = el.querySelector('.comments-more');
    if (arr.length > 3 && moreWrap) moreWrap.style.display = 'block';
    } catch(e) {
    console.error('load comments preview err', e);
    }
  })();

  return el;
}

// focus an inline quick comment input (will open a small prompt)
function focusCommentInput(mapId) {
  // simple prompt for now (you can replace with inline input UI)
  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }
  const text = prompt('댓글을 작성하시오 (최대 500자):');
  if (!text || !text.trim()) return;
  postMapComment(mapId, text.trim());
}

// post comment
async function postMapComment(mapId, text) {
  try {
    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
    const me = userSnap.exists() ? userSnap.data() : {};
    const newRef = doc(collection(db, 'maps', mapId, 'comments'));
    await setDoc(newRef, {
      uid: currentUser.uid,
      name: me.nickname || me.id || '사용자',
      photo: me.colorHex ? '' : (me.photo || ''), // photo optional
      text,
      createdAt: serverTimestamp()
    });
    // refresh map area
    renderMap();
  } catch(e) {
    console.error('postMapComment err', e);
    alert('댓글 등록 실패');
  }
}

// open full comments popup (scrollable)
function openCommentsPopup(mapId) {
  // create popup
  const popup = document.createElement('div');
  popup.className = 'fullscreen comments-popup';
  popup.innerHTML = `
    <div class="card" style="max-width:800px; width:90%; max-height:80vh; overflow:hidden; display:flex; flex-direction:column;">
      <div style="padding:12px; display:flex; justify-content:space-between; align-items:center;">
        <div class="muted">댓글</div>
        <button class="btn close-comments">닫기</button>
      </div>
      <div class="comments-scroll" style="overflow:auto; padding:12px; flex:1; border-top:1px solid rgba(255,255,255,0.02);">
        <div class="comments-full-list"></div>
      </div>
      <div style="padding:12px; border-top:1px solid rgba(255,255,255,0.02); display:flex; gap:8px;">
        <input id="commentsInput" placeholder="댓글을 입력하세요" style="flex:1; padding:8px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.04); color:inherit;">
        <button class="btn post-comment">등록</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  const closeBtn = popup.querySelector('.close-comments');
  const listEl = popup.querySelector('.comments-full-list');
  const postBtn = popup.querySelector('.post-comment');
  const inputEl = popup.querySelector('#commentsInput');

  closeBtn.onclick = () => popup.remove();
  postBtn.onclick = async () => {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const v = inputEl.value.trim();
    if (!v) return;
    await postMapComment(mapId, v);
    popup.remove();
    openCommentsPopup(mapId); // reopen to refresh (simple)
  };

  // load all comments then render
  (async () => {
    try {
      const cSnap = await getDocs(collection(db, 'maps', mapId, 'comments'));
      const arr = [];
      cSnap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a,b) => {
        const at = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        const bt = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return bt - at;
      });

      if (arr.length === 0) {
        listEl.innerHTML = `<div class="muted">댓글이 없습니다.</div>`;
      } else {
        listEl.innerHTML = '';
        arr.forEach(c => {
          const item = document.createElement('div');
          item.className = 'comment-item';
          item.style.marginBottom = '12px';
          item.innerHTML = `
            <div style="display:flex; gap:10px;">
                <div style="width:44px; height:44px; border-radius:50%; overflow:hidden; background:#333;">
                <img src="${c.photo||''}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${c.name||'익명'}</strong>
                    <span class="muted">${fmtTime(c.createdAt)}</span>
                </div>
                <div class="cm-body" style="margin-top:6px;">${c.text||''}</div>

                <div class="cm-admin" style="margin-top:6px; display:none; gap:10px;">
                    <button class="link cm-edit">수정</button>
                    <button class="link cm-del">삭제</button>
                </div>
                </div>
            </div>
            `;

        (async () => {
            const admin = await isAdminUser();
            if (admin) {
                const wrap = item.querySelector('.cm-admin');
                wrap.style.display = 'flex';

                wrap.querySelector('.cm-edit').onclick = async () => {
                const newText = prompt('댓글 내용을 수정하시오.', c.text||'');
                if (!newText) return;
                await updateDoc(doc(db, 'maps', mapId, 'comments', c.id), {
                    text: newText,
                    editedAt: serverTimestamp()
                });
                popup.remove();
                openCommentsPopup(mapId);
                };

                wrap.querySelector('.cm-del').onclick = async () => {
                if (!confirm('삭제하겠나.')) return;
                await deleteDoc(doc(db, 'maps', mapId, 'comments', c.id));
                popup.remove();
                openCommentsPopup(mapId);
                };
            }
        })();

        listEl.appendChild(item);
        });
      }
    } catch(e) {
      console.error('load all comments err', e);
      listEl.innerHTML = `<div class="muted">댓글 로드 실패</div>`;
    }
  })();
}

// open map edit modal (admin)
function openMapEditModal(mapId) {
  (async () => {
    const isAdmin = await isAdminUser();
    if (!isAdmin) { alert('관리자 권한이 필요합니다.'); return; }

    let data = {};
    if (mapId) {
      const snap = await getDoc(doc(db, 'maps', mapId));
      if (snap.exists()) data = snap.data();
    }

    // build modal
    const modal = document.createElement('div');
    modal.className = 'fullscreen map-edit-popup';
    modal.innerHTML = `
      <div class="card" style="max-width:900px; width:95%; max-height:90vh; overflow:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="muted">${mapId ? '맵 수정' : '맵 추가'}</div>
          <button class="btn close-edit">닫기</button>
        </div>
        <div style="padding:12px; display:grid; gap:10px;">
          <label>이름</label>
          <input id="mapName" value="${data.name||''}">
          <label>설명</label>
          <textarea id="mapDesc" rows="4">${data.description||''}</textarea>
          <label>위험도 (1-5)</label>
          <input id="mapDanger" type="number" min="1" max="5" value="${data.danger||1}">
          <label>출현 유형 (쉼표로 구분)</label>
          <input id="mapTypes" value="${(data.types||[]).join ? (data.types||[]).join(', ') : (data.types||'')}">
          <label>이미지 업로드</label>
          <input id="mapImageFile" type="file" accept="image/*">
          <label>이미지 URL</label>
          <input id="mapImageUrl" value="${data.image||''}">
          <div style="display:flex; gap:8px;">
            <button class="btn save-map">${mapId ? '저장' : '생성'}</button>
            <button class="link cancel-map">취소</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close-edit').onclick = () => modal.remove();
    modal.querySelector('.cancel-map').onclick = () => modal.remove();

    modal.querySelector('.save-map').onclick = async () => {
      try {
        const name = modal.querySelector('#mapName').value.trim();
        const desc = modal.querySelector('#mapDesc').value.trim();
        const danger = Number(modal.querySelector('#mapDanger').value) || 1;
        const types = modal.querySelector('#mapTypes').value.split(',').map(s=>s.trim()).filter(Boolean);
        let imageUrl = modal.querySelector('#mapImageUrl').value.trim();

        const file = modal.querySelector('#mapImageFile').files[0];
        let targetId = mapId;

        if (!name) { alert('이름을 입력하세요'); return; }

        if (!targetId) {
          // new map: create doc id first
          const newRef = doc(collection(db, 'maps'));
          targetId = newRef.id;
        }

        if (file) {
          imageUrl = await uploadMapImage(file, targetId);
        }

        const payload = {
          name,
          description: desc,
          danger,
          types,
          image: imageUrl,
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'maps', targetId), { ...( (await getDoc(doc(db,'maps',targetId))).exists() ? (await getDoc(doc(db,'maps',targetId))).data() : {} ), ...payload }, { merge: true });

        modal.remove();
        renderMap();
      } catch(e) {
        console.error('save map err', e);
        alert('저장 실패');
      }
    };
  })();
}

// main renderMap: load maps from db and render cards
async function renderMap() {
  contentEl.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="muted">맵 목록</div>
        <div id="mapControls"></div>
      </div>
    </div>
    <div id="mapsGrid" class="maps-grid"></div>
  `;

  // admin '새 맵 추가' 버튼
  (async () => {
    const controls = document.getElementById('mapControls');
    const admin = await isAdminUser();
    if (admin) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = '새 맵 추가';
      b.onclick = () => openMapEditModal(null);
      controls.appendChild(b);
    }
  })();

  const grid = document.getElementById('mapsGrid');
  grid.innerHTML = '';

  try {
    const snap = await getDocs(collection(db, 'maps'));
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    // sort by createdAt if exists
    arr.sort((a,b) => {
      const at = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
      const bt = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
      return bt - at;
    });

    if (arr.length === 0) {
      grid.innerHTML = `<div class="card muted">맵 데이터가 없습니다.</div>`;
      return;
    }

    arr.forEach(m => {
      const cardEl = renderMapCard({ id: m.id, data: () => m });
      grid.appendChild(cardEl);
    });
  } catch(e) {
    console.error('renderMap err', e);
    contentEl.innerHTML += `<div class="card muted">데이터 로드 실패</div>`;
  }
}

function renderDex(){ contentEl.innerHTML = '<div class="card">도감 탭</div>'; }

onAuthStateChanged(auth, async (user)=>{
    currentUser = user;
    if(user){
    showLoggedInUI();
    renderAuthArea(user);
    initNav();
    startClock();
    subscribeSystem();
    loadTab('main');
    try {
        const snap = await getDoc(doc(db,'users',user.uid));
        miniProfile.textContent = snap.exists() ? snap.data().nickname || user.email : user.email || '사용자';
    } catch(e) {
        miniProfile.textContent = user.email || '사용자';
    }
    } else {
    currentUser = null;
    renderAuthArea(null);
    showLogOutUI();;
    miniProfile.textContent = '로그인 필요';
    systemInfo.textContent = '불러오는 중...';
    }
});

showLogOutUI();