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
    storageBucket: "abyss-suicide-co.firebasestorage.app",
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
  renderStaffDetail(docId, { ...prevData, ...send });
  renderStaff();  // 목록 새로고침
}

let radarObj = null;

function drawStatChart(stats = { str:1, vit:1, agi:1, wil:1 }) {
  const ctx = document.getElementById("statRadar");
  if (!ctx) return;

  // 1 ~ 5 사이로 고정
  const clamp = v => Math.max(1, Math.min(5, Number(v)));

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ["근력", "건강", "민첩", "정신력"],
      datasets: [{
        data: [
          clamp(stats.str),
          clamp(stats.vit),
          clamp(stats.agi),
          clamp(stats.wil)
        ]
      }]
    },
    options: {
      responsive: false,
      scales: {
        r: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

function openProfileModal(docId, data) {
  profileModal.innerHTML = `
    <div class="modal-content">

      <button id="closeProfile" class="back-btn">← 돌아가기</button>

      <h2>${data.name}</h2>

      <div class="avatar big"
           style="width:180px; height:180px; margin:10px auto;
                  background-image:url('${data.image || ""}')">
      </div>

      <div class="profile-block">
        <p><span class="label">이름</span> ${data.name || ""}</p>
        <p><span class="label">성별</span> ${data.gender || ""}</p>
        <p><span class="label">나이</span> ${data.age || ""}</p>
        <p><span class="label">키·체중</span> ${data.body || ""}</p>
        <p><span class="label">국적</span> ${data.nation || ""}</p>

        <hr>

        <p><span class="label">비고</span></p>
        <p style="white-space:pre-line">${data.note || ""}</p>
      </div>

      <div class="stat-area">
        <div class="stat-left">
          <p>근력: ${data.str || 1}</p>
          <p>건강: ${data.vit || 1}</p>
          <p>민첩: ${data.agi || 1}</p>
          <p>정신력: ${data.wil || 1}</p>
        </div>
        <canvas id="statChart" class="stat-right" width="250" height="250"></canvas>
      </div>

      <div id="editArea"></div>

    </div>
  `;

  profileModal.showModal();

  document.getElementById("closeProfile").onclick = () => profileModal.close();

  const editArea = document.getElementById("editArea");
  const editBtn = document.createElement("button");

  editBtn.textContent = "편집";
  editBtn.onclick = () => openEditModal(docId, data);

  editArea.appendChild(editBtn);

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

async function renderMe(){ contentEl.innerHTML = '<div class="card">내 상태 탭</div>'; }
function renderMap(){ contentEl.innerHTML = '<div class="card">맵 탭</div>'; }
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