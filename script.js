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
    addDoc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    serverTimestamp,
    query,
    where,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDGmwk9FtwnjUKcH4T6alvMWVQqbhVrqfI",
    authDomain: "abyss-suicide-co.firebaseapp.com",
    projectId: "abyss-suicide-co",
    storageBucket: "abyss-suicide-co.appspot.com",
    messagingSenderId: "711710259422",
    appId: "1:711710259422:web:3c5ba7c93edb3d6d6baa4f"
};

// 탭 설정
const TABS = [
    { id: 'main', title: '메인' },
    { id: 'staff', title: '직원' },
    { id: 'me', title: '내 상태' },
    { id: 'map', title: '맵' },
    { id: 'dex', title: '도감' }
];

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 인증 상태 변화 감지 및 currentUser 설정
onAuthStateChanged(auth, user => {
    currentUser = user;
    // user가 변경되면 화면을 새로고침하거나 필요한 UI를 업데이트하는 로직 추가 가능
    // 예: renderStaff(); 
});

// [파일 최상단 또는 전역 변수 영역에 추가]
const DEFAULT_MAP_IMAGE = "https://via.placeholder.com/320x200?text=No+Image";
// 💡 참고: 'db', 'auth', 'currentUser', 'contentEl' 등은 기존처럼 전역에 정의되어 있어야 합니다.

// DOM 요소 참조
const header = document.getElementById('header');
const navEl = document.getElementById('nav');
const contentEl = document.getElementById('content');
const logOutEl = document.getElementById('log-out');
const nowTimeEl = document.getElementById('nowTime');
const systemInfo = document.getElementById('systemInfo');

const login = document.getElementById('login');
const loginForm = document.getElementById('login-form');
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

// [수정] 로그인 상태 감지 리스너 추가 (새로고침 해도 로그인 유지)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showLoggedInUI();
        renderAuthArea(user);
        initNav();
        loadTab('main'); // 로그인 시 메인 탭 로드
        startClock();
        subscribeSystem();
    } else {
        currentUser = null;
        showLogOutUI();
    }
});

// --- 유틸리티 함수 ---

/**
 * 직원 프로필 이미지를 Storage에 업로드하고 URL을 반환합니다.
 * @param {File} file 업로드할 파일 객체
 * @param {string} staffId 직원 문서 ID
 * @returns {Promise<string>} 다운로드 가능한 이미지 URL
 */
async function uploadStaffImage(file, staffId) {
    // 직원 이미지는 staff/[ID]/profile.png 등으로 저장하는 것이 좋습니다.
    const storageRef = ref(storage, `staff/${staffId}_${Date.now()}.png`);
    await uploadBytes(storageRef, file);
    showMessage('이미지 업로드 완료', 'info');
    return await getDownloadURL(storageRef);
}

function randomHex(){
    const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0'); 
    const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return '#' + r + g + b;
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

/**
 * Firestore Timestamp를 상대적인 시간 문자열로 포맷합니다.
 * @param {object} timestamp Firestore Timestamp 객체
 * @returns {string} 포맷된 시간 문자열 (예: '방금 전', '2025.12.12')
 */
function fmtTime(timestamp) {
    // timestamp 객체가 유효하지 않으면 빈 문자열 반환 (혹은 'N/A')
    if (!timestamp || !timestamp.seconds) return ''; 
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    // 24시간 이내: 상대 시간 표시
    if (diffSeconds < 60) return '방금 전';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}분 전`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}시간 전`;
    
    // 하루 이상 차이날 경우 YYYY.MM.DD 형식으로 표시
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
}

// --- UI 제어 함수 ---

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
    contentEl.innerHTML = ''; // 로그아웃 시 내용 비우기
}

function showLoggedInUI(){
    login.style.display = 'none';
    header.style.display = 'flex';
}

function startClock() {
    function tick() {
        const d = new Date();
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        if(nowTimeEl) nowTimeEl.textContent = d.toLocaleString(undefined, options);
    }
    tick();
    setInterval(tick, 1000);
}

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
        if (snap.exists() && systemInfo) {
            systemInfo.textContent = JSON.stringify(snap.data());
        } else if (systemInfo) {
            systemInfo.textContent = '시스템 정보 없음';
        }
    } catch(e) {
        if(systemInfo) systemInfo.textContent = '시스템 로드 실패';
    }
}

// --- 이벤트 리스너 (Auth) ---

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
            email, id, password: pw, nickname: nick, colorHex: randomHex(),
            decorations: [], silver: 0, inventory: {}, status: 'alive',
            achievements: {
                deathCount: 0, expeditionCount: 0, interviewCount: 0,
                objectCount: 0, creatureSubduedCount: 0, haveSilverCount: 0
            },
            createdAt: serverTimestamp()
        });
        await setDoc(doc(db, 'staff', uid), {
            uid, name: nick, status: 'alive', image: '', silver: 0, desc: '',
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
        const q = query(collection(db, 'users'), where('id', '==', id));
        const snap = await getDocs(q);
        if (snap.empty) {
            loginBoxMsg.textContent = '존재하지 않는 아이디입니다.';
            return;
        }
        const userDoc = snap.docs[0].data();
        const email = userDoc.email;
        await signInWithEmailAndPassword(auth, email, pw);
        loginBoxMsg.textContent = '로그인 성공.';
    } catch(e) {
        loginBoxMsg.textContent = '로그인 실패: ' + (e.message || e.code);
    }
});

loginForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); loginBth.click(); }
});

signupForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); signupBth.click(); }
});


// --- 탭 로드 로직 ---

async function loadTab(tabId){
    setActiveNav(tabId);
    contentEl.innerHTML = '<div class="card muted">로딩...</div>';
    switch(tabId) {
        case 'main': await renderMain(); break;
        case 'staff': await renderStaff(); break;
        case 'me': await renderMe(); break;
        case 'map': await renderMap(); break;
        case 'dex': await renderDex(); break; // [수정] renderDex 호출
        default: contentEl.innerHTML = '<div class="card">알 수 없는 탭</div>';
    }
}

// --- Main Tab ---
async function renderMain(){
    contentEl.innerHTML = '';
    
    // UI 뼈대 생성
    const flowCard = document.createElement('div');
    flowCard.className = 'card';
    flowCard.innerHTML = `<div class="muted">심연 상태</div><h3 id="abyssFlow">불러오는 중...</h3>`;
    contentEl.appendChild(flowCard);

    const statusCard = document.createElement('div');
    statusCard.className = 'card';
    statusCard.innerHTML = `<div class="muted">직원 현황</div><div id="staffStatus">불러오는 중...</div><div class="muted" style="margin-top:10px;">일정</div><div id="staffSchedule">불러오는 중...</div>`;
    contentEl.appendChild(statusCard);

    const eventCard = document.createElement('div');
    eventCard.className = 'card';
    eventCard.innerHTML = `<div class="muted">오늘의 이벤트</div><div id="todayEvent">불러오는 중...</div>`;
    contentEl.appendChild(eventCard);

    const rankCard = document.createElement('div');
    rankCard.className = 'card';
    rankCard.innerHTML = `<div class="muted">직원 순위</div><div id="staffRank">불러오는 중...</div>`;
    contentEl.appendChild(rankCard);

    // 데이터 로드
    try {
        const todayKey = getTodayKey();
        const todayRef = doc(db, 'system', 'abyssToday');
        const todaySnap = await getDoc(todayRef);
        let flowText = null, savedDate = null;

        if (todaySnap.exists()) {
            const data = todaySnap.data();
            flowText = data.flowText;
            savedDate = data.dateKey;
        }

        const cfgSnap = await getDoc(doc(db, 'system', 'abyssConfig'));

        if (flowText && savedDate === todayKey) {
            document.getElementById('abyssFlow').textContent = '오늘 심연은 ' + flowText + '습니다.';
        } else if (cfgSnap.exists()) {
            const flows = cfgSnap.data().flows || [];
            if (flows.length > 0) {
                const picked = pickByWeight(flows);
                await setDoc(todayRef, { flowText: picked, dateKey: todayKey, updatedAt: serverTimestamp() });
                document.getElementById('abyssFlow').textContent = '오늘 심연의 기류는 ' + picked + ' 입니다.';
            } else {
                document.getElementById('abyssFlow').textContent = '기류 데이터 없음';
            }
        } else {
            document.getElementById('abyssFlow').textContent = '기류 설정 없음';
        }

        const usersSnap = await getDocs(collection(db, 'users'));
        let alive=0, missing=0, dead=0, contaminated=0;
        let maxSilver = -1, minDeath = 999999;
        let topSilverName = '-', topSurvivorName = '-';

        usersSnap.forEach(docu => {
            const d = docu.data();
            const s = d.status || 'alive';
            if (s === 'alive') alive++;
            else if (s === 'missing') missing++;
            else if (s === 'dead') dead++;
            else if (s === 'contaminated') contaminated++;

            if ((d.silver || 0) > maxSilver) {
                maxSilver = d.silver || 0;
                topSilverName = d.nickname || d.id;
            }
            const dc = d.achievements?.deathCount ?? 0;
            if (dc < minDeath) {
                minDeath = dc;
                topSurvivorName = d.nickname || d.id;
            }
        });

        document.getElementById('staffStatus').innerHTML = `
            <div>생존: ${alive} | 실종: ${missing} | 오염: ${contaminated} | 사망: ${dead}</div>
        `;

        const daySnap = await getDoc(doc(db, 'system', 'day'));
        let currentDay = daySnap.exists() ? (daySnap.data().currentDay || 1) : 1;
        const schedSnap = await getDoc(doc(db, 'schedule', 'days'));

        if (schedSnap.exists()) {
            const daysData = schedSnap.data().days || {};
            const todayList = daysData[currentDay] || [];
            if (todayList.length > 0) {
                document.getElementById('staffSchedule').innerHTML = todayList.map(t => `<div>${t}</div>`).join('');
            } else {
                document.getElementById('staffSchedule').textContent = `${currentDay}일차 일정 없음`;
            }
        } else {
            document.getElementById('staffSchedule').textContent = '스케줄 데이터 없음';
        }

        document.getElementById('staffRank').innerHTML = `
            <div>은화: ${topSilverName} (${maxSilver}) | 생존왕: ${topSurvivorName} (${minDeath})</div>
        `;
        document.getElementById('todayEvent').textContent = '이벤트 데이터 없음'; // 임시

    } catch(e) {
        console.error(e);
        contentEl.innerHTML += `<div class="card muted">데이터 로드 실패</div>`;
    }
}

// --- Staff Tab ---

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
        item.innerHTML = `
        <div class="thumb-img" style="background-image:url('${f.image || ''}'); aspect-ratio: 3 / 4; background-size: cover; background-position: center;"></div>
        <div class="thumb-name">${f.name}</div>
        `;
        listEl.appendChild(item);
    });
}

let radarObj = null;

function drawStatChart(stats = { str:1, vit:1, agi:1, wil:1 }) {
    const ctx = document.getElementById("statRadar");
    if (!ctx) return;
    if (radarObj) radarObj.destroy();
    
    // Chart.js가 로드되어 있다고 가정
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js library not loaded');
        return;
    }

    const clamp = v => Math.max(1, Math.min(5, Number(v)));
    radarObj = new Chart(ctx, {
        type: 'radar',
        data: {
        labels: ["근력", "건강", "민첩", "정신력"],
        datasets: [{
            data: [clamp(stats.str), clamp(stats.vit), clamp(stats.agi), clamp(stats.wil)],
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            borderColor: "#000"
        }]
        },
        options: {
        scales: {
            r: { min: 1, max: 5, ticks: { stepSize: 1, callback: v => v } }
        }
        }
    });
}

function openProfileModal(docId, data) {
    profileModal.innerHTML = `
        <div class="modal-content profile-wide">
        <button id="closeProfile" class="back-btn">← 돌아가기</button>
        <div class="profile-top">
            <div class="profile-img-wrap"><img class="profile-img" src="${data.image || ""}" alt=""></div>
            <div class="profile-info">
            <p><span class="label">이름</span> ${data.name || ""}</p>
            <p><span class="label">성별</span> ${data.gender || ""}</p>
            <p><span class="label">나이</span> ${data.age || ""}</p>
            <p><span class="label">신체</span> ${data.body || ""}</p>
            <p><span class="label">국적</span> ${data.nation || ""}</p>
            <hr>
            <p><span class="label">비고</span></p>
            <p style="white-space:pre-line">${data.note || ""}</p>
            </div>
        </div>
        <div class="stat-area-fixed">
            <div class="stat-left">
            <p>근력: ${data.str || 1}</p><p>건강: ${data.vit || 1}</p>
            <p>민첩: ${data.agi || 1}</p><p>정신력: ${data.wil || 1}</p>
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
    editBtn.onclick = () => openInlineEdit(docId, data);
    document.getElementById("editArea").appendChild(editBtn);

    setTimeout(() => drawStatChart(data), 100); // 모달 렌더링 후 차트 그리기
}

function openInlineEdit(docId, data) {
  const editArea = document.getElementById("editArea");

  // 1. HTML을 먼저 생성 (버튼이 이때 생김)
  editArea.innerHTML = `
    <div class="edit-grid-inline">
      <label>이름</label><input id="editName" value="${data.name || ''}">
      <label>성별</label><input id="editGender" value="${data.gender || ''}">
      <label>나이</label><input id="editAge" value="${data.age || ''}">
      <label>키·체중</label><input id="editBody" value="${data.body || ''}">
      <label>국적</label><input id="editNation" value="${data.nation || ''}">
      <label>비고</label><textarea id="editNote">${data.note || ''}</textarea>

      <label>이미지 업로드</label><input id="editImageFile" type="file" accept="image/*">
      <label>이미지 URL</label><input id="editImage" value="${data.image || ''}">

      <div class="edit-stats-inline">
        <label>근력</label><input id="editStr" value="${data.str || 0}">
        <label>건강</label><input id="editVit" value="${data.vit || 0}">
        <label>민첩</label><input id="editAgi" value="${data.agi || 0}">
        <label>정신력</label><input id="editWil" value="${data.wil || 0}">
      </div>

      <button id="saveStaffInline">저장</button>
    </div>
  `;

  // 2. HTML이 생성된 '직후'에 이벤트를 연결해야 함 (함수 내부)
  document.getElementById("saveStaffInline").onclick = async () => {
    let finalImg = document.getElementById("editImage").value;
    const file = document.getElementById("editImageFile").files[0];

    if (file) {
      // 이미지 업로드 함수 호출 (uploadStaffImage가 정의되어 있어야 함)
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

    // 화면 갱신
    openProfileModal(docId, { ...data, ...newData });
    renderStaff();
    editArea.innerHTML = ''; // 편집 영역 초기화
  };
}


// --- Map Functionality ---

// [수정] 정의되지 않은 함수 추가 (빈 함수)
async function openMapInlineEdit(mapId, data) {
    const cardInner = document.querySelector(`.map-card-inner[data-id="${mapId}"]`);
    if (!cardInner) return;

    // 기존 내용을 숨기고 편집 폼 렌더링
    const originalContent = cardInner.innerHTML;
    
    // 이미지 URL과 위험도를 미리 변수에 저장
    const currentImage = data.image || '';
    const currentDanger = data.danger || 1;
    const currentTypes = Array.isArray(data.types) ? data.types.join(', ') : (data.types || '');

    cardInner.innerHTML = `
        <div class="map-edit-form">
            <h4>맵 편집 (ID: ${mapId})</h4>
            <div class="map-card-inner map-edit-layout">
                <div class="map-media">
                    <img class="map-img map-img-preview" src="${currentImage}" alt="맵 이미지 미리보기">
                    <div style="margin-top: 10px;">
                        <label class="muted" style="display:block; margin-bottom: 5px; font-size:13px;">이미지 URL</label>
                        <input id="editMapImage" value="${currentImage}" placeholder="이미지 URL">
                    </div>
                    <div style="margin-top: 10px;">
                        <label class="muted" style="display:block; margin-bottom: 5px; font-size:13px;">이미지 파일 업로드</label>
                        <input id="editMapImageFile" type="file" accept="image/*">
                    </div>
                </div>
                
                <div class="map-main">
                    <div class="map-head" style="flex-direction: column; align-items: flex-start;">
                        <label class="muted">이름</label>
                        <input id="editMapName" class="form-control-inline" value="${data.name || ''}" style="font-size: 1.2em; font-weight: bold; color: var(--accent); margin-bottom: 10px;">
                        
                        <div class="map-meta" style="text-align: left; width: 100%;">
                            <label class="muted" style="display:block;">위험도 (1~5)</label>
                            <input id="editMapDanger" type="number" min="1" max="5" value="${currentDanger}" class="form-control-inline" style="width: 50px;">
                            <span class="muted" id="dangerStars"></span>
                        </div>
                        
                        <div class="map-meta" style="text-align: left; width: 100%; margin-top: 10px;">
                            <label class="muted" style="display:block;">출현 타입 (쉼표 구분)</label>
                            <input id="editMapTypes" class="form-control-inline" value="${currentTypes}" placeholder="예: 불, 물, 풀">
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <label class="muted">설명</label>
                        <textarea id="editMapDesc" rows="6" class="form-control-inline" style="width: 100%; height: auto; min-height: 120px; resize: vertical; margin-top: 5px;">${data.description || ''}</textarea>
                    </div>

                    <div style="margin-top: 25px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                        <button id="saveMapInline" class="btn primary">저장</button>
                        <button id="cancelMapInline" class="btn link">취소</button>
                        <button id="deleteMapInline" class="btn danger" style="margin-left: auto;">맵 삭제</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 유틸리티 함수: 위험도 별 표시
    const updateDangerStars = (value) => {
        const starsEl = document.getElementById("dangerStars");
        if (starsEl) {
            const danger = Math.min(5, Math.max(1, Number(value) || 1));
            starsEl.textContent = '★'.repeat(danger) + '☆'.repeat(5 - danger);
        }
    };

    // 초기 별 표시
    updateDangerStars(currentDanger);

    // 이벤트 리스너: 이미지 미리보기 및 위험도 별표 업데이트
    const imgPreviewEl = cardInner.querySelector('.map-img-preview');
    const imgUrlInput = document.getElementById("editMapImage");
    const imgFileInput = document.getElementById("editMapImageFile");
    const dangerInput = document.getElementById("editMapDanger");

    // 1. URL 입력 시 미리보기 업데이트
    imgUrlInput.addEventListener('input', () => {
        imgPreviewEl.src = imgUrlInput.value;
        imgFileInput.value = ''; // URL 입력 시 파일 입력 비활성화/초기화
    });

    // 2. 파일 선택 시 미리보기 업데이트
    imgFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imgPreviewEl.src = e.target.result;
            };
            reader.readAsDataURL(file);
            imgUrlInput.value = ''; // 파일 입력 시 URL 입력 비활성화/초기화
        } else if (!imgUrlInput.value) {
             imgPreviewEl.src = ''; // 파일이 없고 URL도 없으면 미리보기 비우기
        }
    });
    
    // 3. 위험도 입력 시 별표 업데이트
    dangerInput.addEventListener('input', (e) => {
        updateDangerStars(e.target.value);
    });

    // 저장 로직 (기존과 동일)
    document.getElementById("saveMapInline").onclick = async () => {
        let finalImg = document.getElementById("editMapImage").value;
        const file = document.getElementById("editMapImageFile").files[0];

        try {
            if (file) {
                finalImg = await uploadMapImage(file, mapId);
            }

            const typesArray = document.getElementById("editMapTypes").value.split(',').map(t => t.trim()).filter(t => t);

            const newData = {
                name: document.getElementById("editMapName").value,
                danger: Number(document.getElementById("editMapDanger").value),
                types: typesArray,
                description: document.getElementById("editMapDesc").value,
                image: finalImg,
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, "maps", mapId), newData);
            showMessage('맵 정보 저장 완료', 'info');
            renderMap(); // 맵 목록 새로고침
        } catch(e) {
            console.error(e);
            showMessage('맵 정보 저장 실패', 'error');
        }
    };

    // 취소 로직 (기존과 동일)
    document.getElementById("cancelMapInline").onclick = () => {
        cardInner.innerHTML = originalContent; // 원래 내용으로 복구
        renderMap();
    };
    
    // 삭제 로직 (기존과 동일)
    document.getElementById("deleteMapInline").onclick = async () => {
        if (await showConfirm(`정말로 맵 '${data.name}'을 삭제하시겠습니까? (복구 불가)`)) {
            try {
                await deleteDoc(doc(db, "maps", mapId));
                showMessage('맵 삭제 완료', 'info');
                renderMap();
            } catch(e) {
                console.error(e);
                showMessage('맵 삭제 실패', 'error');
            }
        }
    };
}

async function renderMap() {
    contentEl.innerHTML = '<div class="card muted">맵 로딩중...</div>';
    try {
        const snap = await getDocs(collection(db, 'maps'));
        contentEl.innerHTML = '';
        
        // 맵 추가 버튼 (관리자용)
        if (await isAdminUser()) {
            const addBtn = document.createElement('button');
            addBtn.className = 'btn';
            addBtn.textContent = '새 맵 추가';
            addBtn.style.marginBottom = '20px';
            addBtn.onclick = () => openNewMapInlineEdit();
            contentEl.appendChild(addBtn);
        }

        if(snap.empty){
            contentEl.innerHTML += '<div class="card">등록된 맵이 없습니다.</div>';
            return;
        }
        
        snap.forEach(d => {
            contentEl.appendChild(renderMapCard(d));
        });
    } catch(e){
        console.error(e);
        contentEl.innerHTML = '<div class="card">맵 로드 실패</div>';
    }
}

async function openNewMapInlineEdit() {
    const tempId = 'new_map_' + Date.now();
    const tempEl = document.createElement('div');
    tempEl.className = 'map-card card';
    tempEl.id = tempId;
    tempEl.style.marginBottom = '20px';
    
    // 임시 카드를 최상단 맵 추가 버튼 바로 아래에 삽입
    const mapAddBtn = contentEl.querySelector('.btn');
    contentEl.insertBefore(tempEl, mapAddBtn.nextSibling);

    const defaultImage = ''; // 새 맵은 기본 이미지 없음

    // 편집 폼 렌더링
    tempEl.innerHTML = `
        <div class="map-card-inner" data-id="new">
            <div class="map-edit-form">
                <h4>새 맵 생성</h4>
                <div class="map-card-inner map-edit-layout">
                    <div class="map-media">
                        <img class="map-img map-img-preview" src="${defaultImage}" alt="맵 이미지 미리보기">
                        <div style="margin-top: 10px;">
                            <label class="muted" style="display:block; margin-bottom: 5px; font-size:13px;">이미지 URL</label>
                            <input id="newMapImage" value="" placeholder="이미지 URL">
                        </div>
                        <div style="margin-top: 10px;">
                            <label class="muted" style="display:block; margin-bottom: 5px; font-size:13px;">이미지 파일 업로드</label>
                            <input id="newMapImageFile" type="file" accept="image/*">
                        </div>
                    </div>
                    
                    <div class="map-main">
                        <div class="map-head" style="flex-direction: column; align-items: flex-start;">
                            <label class="muted">이름</label>
                            <input id="newMapName" class="form-control-inline" value="" placeholder="맵 이름" style="font-size: 1.2em; font-weight: bold; color: var(--accent); margin-bottom: 10px;">
                            
                            <div class="map-meta" style="text-align: left; width: 100%;">
                                <label class="muted" style="display:block;">위험도 (1~5)</label>
                                <input id="newMapDanger" type="number" min="1" max="5" value="1" class="form-control-inline" style="width: 50px;">
                                <span class="muted" id="dangerStars"></span>
                            </div>
                            
                            <div class="map-meta" style="text-align: left; width: 100%; margin-top: 10px;">
                                <label class="muted" style="display:block;">출현 타입 (쉼표 구분)</label>
                                <input id="newMapTypes" class="form-control-inline" value="" placeholder="예: 불, 물, 풀">
                            </div>
                        </div>

                        <div style="margin-top: 20px;">
                            <label class="muted">설명</label>
                            <textarea id="newMapDesc" rows="6" class="form-control-inline" style="width: 100%; height: auto; min-height: 120px; resize: vertical; margin-top: 5px;" placeholder="맵에 대한 설명을 입력하세요."></textarea>
                        </div>

                        <div style="margin-top: 25px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                            <button id="saveNewMapInline" class="btn primary">생성</button>
                            <button id="cancelNewMapInline" class="btn link">취소</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      `;
    
    // 유틸리티 함수: 위험도 별 표시
    const updateDangerStars = (value) => {
        const starsEl = tempEl.querySelector("#dangerStars");
        if (starsEl) {
            const danger = Math.min(5, Math.max(1, Number(value) || 1));
            starsEl.textContent = '★'.repeat(danger) + '☆'.repeat(5 - danger);
        }
    };
    updateDangerStars(1); // 초기 별 표시

    // 이벤트 리스너: 이미지 미리보기 및 위험도 별표 업데이트
    const imgPreviewEl = tempEl.querySelector('.map-img-preview');
    const imgUrlInput = document.getElementById("newMapImage");
    const imgFileInput = document.getElementById("newMapImageFile");
    const dangerInput = document.getElementById("newMapDanger");

    // 1. URL 입력 시 미리보기 업데이트
    imgUrlInput.addEventListener('input', () => {
        imgPreviewEl.src = imgUrlInput.value;
        imgFileInput.value = ''; // URL 입력 시 파일 입력 비활성화/초기화
    });

    // 2. 파일 선택 시 미리보기 업데이트
    imgFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imgPreviewEl.src = e.target.result;
            };
            reader.readAsDataURL(file);
            imgUrlInput.value = ''; // 파일 입력 시 URL 입력 비활성화/초기화
        } else if (!imgUrlInput.value) {
             imgPreviewEl.src = ''; // 파일이 없고 URL도 없으면 미리보기 비우기
        }
    });
    
    // 3. 위험도 입력 시 별표 업데이트
    dangerInput.addEventListener('input', (e) => {
        updateDangerStars(e.target.value);
    });

    // 저장 로직 (기존과 동일)
    document.getElementById("saveNewMapInline").onclick = async () => {
        let finalImg = document.getElementById("newMapImage").value;
        const file = document.getElementById("newMapImageFile").files[0];

        if (!document.getElementById("newMapName").value) {
            showMessage('맵 이름을 입력해주세요.', 'error');
            return;
        }

        try {
            // 새 문서 ID를 미리 생성하여 이미지 업로드에 사용
            const newDocRef = doc(collection(db, "maps"));
            const newMapId = newDocRef.id;

            if (file) {
                finalImg = await uploadMapImage(file, newMapId);
            }

            const typesArray = document.getElementById("newMapTypes").value.split(',').map(t => t.trim()).filter(t => t);

            const newData = {
                name: document.getElementById("newMapName").value,
                danger: Number(document.getElementById("newMapDanger").value),
                types: typesArray,
                description: document.getElementById("newMapDesc").value,
                image: finalImg,
                createdAt: serverTimestamp()
            };

            await setDoc(newDocRef, newData);
            showMessage('새 맵 생성 완료', 'info');
            renderMap(); // 맵 목록 새로고침
        } catch(e) {
            console.error(e);
            showMessage('새 맵 생성 실패', 'error');
        }
    };
    
    // 취소 로직 (기존과 동일)
    document.getElementById("cancelNewMapInline").onclick = () => {
        tempEl.remove();
    };
}

function showMessage(msg, type='info') {
    const el = document.createElement('div');
    el.className = `in-browser-msg ${type}`;
    el.textContent = msg;
    Object.assign(el.style, {
        position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)',
        background:'#222', color:'#fff', padding:'10px 20px', borderRadius:'6px',
        zIndex:9999, boxShadow:'0 2px 6px rgba(0,0,0,0.4)'
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

function showConfirm(msg) {
    return new Promise(resolve => {
        const confirmDiv = document.createElement('div');
        confirmDiv.className = 'fullscreen confirm-popup';
        confirmDiv.innerHTML = `
        <div class="card" style="max-width:400px; width:90%; padding:20px; display:flex; flex-direction:column; gap:12px; text-align:center;">
            <div>${msg}</div>
            <div style="display:flex; justify-content:center; gap:12px;">
            <button class="btn confirm-yes">확인</button>
            <button class="btn confirm-no">취소</button>
            </div>
        </div>
        `;
        document.body.appendChild(confirmDiv);
        confirmDiv.querySelector('.confirm-yes').onclick = () => { resolve(true); confirmDiv.remove(); };
        confirmDiv.querySelector('.confirm-no').onclick = () => { resolve(false); confirmDiv.remove(); };
    });
}

async function uploadMapImage(file, mapId) {
    const storageRef = ref(storage, `maps/${mapId || 'tmp'}_${Date.now()}.png`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

function renderMapCard(mapDoc) {
    const mapId = mapDoc.id;
    const data = mapDoc.data ? mapDoc.data() : mapDoc;
    const img = data.image || DEFAULT_MAP_IMAGE;
    const name = data.name || '이름 없음';
    const desc = data.description || '';
    const danger = data.danger || 1;
    const types = Array.isArray(data.types) ? data.types.join(', ') : (data.types || '');

    const el = document.createElement('div');
    el.className = 'map-card card';
    el.innerHTML = `
        <div class="map-card-inner" data-id="${mapId}">
        <div class="map-media"><img class="map-img" src="${img}" alt="${name}"></div>
        <div class="map-main">
            <div class="map-head">
            <h3 class="map-name">${name}</h3>
            <div class="map-meta">
                <div class="map-danger">${'★'.repeat(danger)}${'☆'.repeat(5 - danger)}</div>
                <div class="map-types">출현: ${types}</div>
            </div>
            </div>
            <div class="map-desc">${desc}</div>
            <div class="map-actions">
            <button class="btn map-open-comments">댓글 보기</button>
            <button class="btn link map-edit-btn" style="display:none">편집</button>
            </div>
            
            <div class="map-comment-input-area" style="margin-top: 15px;">
                <input type="text" id="commentInput-${mapId}" placeholder="댓글 작성 (엔터로 등록)" 
                       style="width: 100%; padding: 8px; border-radius: 6px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: inherit;">
            </div>

            <div class="map-comments-preview">
            <div class="comments-count muted">댓글 0개</div>
            <div class="comments-list"></div>
            <div class="comments-more" style="display:none">
                <button class="link map-more-comments">더보기</button>
            </div>
            </div>
        </div>
        </div>
    `;
    
    // [수정] 인라인 댓글 등록 이벤트 리스너 추가
    const commentInput = el.querySelector(`#commentInput-${mapId}`);
    if (commentInput) {
        commentInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = commentInput.value.trim();
                if (text) {
                    postMapComment(mapId, text, () => {
                        commentInput.value = ''; // 성공 후 입력창 비우기
                        // 댓글 새로고침을 위해 맵 전체를 다시 렌더링
                        renderMap(); 
                    });
                }
            }
        });
    }


    el.querySelector('.map-open-comments').addEventListener('click', () => openCommentsPopup(mapId));
    // 기존 댓글 작성 버튼(focusCommentInput) 대신 인라인 입력 필드를 사용하므로 제거
    // el.querySelector('.map-add-comment').addEventListener('click', () => focusCommentInput(mapId)); 
    el.querySelector('.map-more-comments').addEventListener('click', () => openCommentsPopup(mapId));
    el.querySelector('.map-edit-btn').addEventListener('click', async () => openMapInlineEdit(mapId, data));

    (async () => {
        if (await isAdminUser()) {
            const btn = el.querySelector('.map-edit-btn');
            if (btn) btn.style.display = 'inline-block';
        }
    })();

    // Preview Comments (최신 3개)
    (async () => {
        try {
            const cSnap = await getDocs(collection(db, 'maps', mapId, 'comments'));
            const arr = [];
            cSnap.forEach(d => arr.push({ id: d.id, ...d.data() }));
            arr.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
            const preview = arr.slice(0, 3);
            const commentsList = el.querySelector('.comments-list');
            const commentsCount = el.querySelector('.comments-count');
            commentsCount.textContent = `댓글 ${arr.length}개`;

            if (!preview.length) commentsList.innerHTML = `<div class="muted">댓글이 없습니다.</div>`;
            else {
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

                    // ... (관리자 편집/삭제 로직, 세부 댓글창과 동일)
                    (async () => {
                        if (await isAdminUser()) {
                            const btnWrap = item.querySelector('.cm-admin');
                            btnWrap.style.display = 'flex';
                            
                            // 수정
                            btnWrap.querySelector('.cm-edit').onclick = async () => {
                                const newText = prompt('댓글 내용을 수정하시오.', c.text||'');
                                if (!newText) return;
                                try {
                                    await updateDoc(doc(db, 'maps', mapId, 'comments', c.id), { text: newText, editedAt: serverTimestamp() });
                                    renderMap(); // 목록 갱신
                                    showMessage('댓글 수정 완료', 'info');
                                } catch(e) {
                                    console.error(e);
                                    showMessage('댓글 수정 실패', 'error');
                                }
                            };
                            
                            // 삭제
                            btnWrap.querySelector('.cm-del').onclick = async () => {
                                if (await showConfirm('정말 이 댓글을 삭제하시겠습니까?')) {
                                    try {
                                        await deleteDoc(doc(db, 'maps', mapId, 'comments', c.id));
                                        renderMap(); // 목록 갱신
                                        showMessage('댓글 삭제 완료', 'info');
                                    } catch(e) {
                                        console.error(e);
                                        showMessage('댓글 삭제 실패', 'error');
                                    }
                                }
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

/**
 * 맵 댓글 등록 함수 (콜백 추가)
 * @param {string} mapId 맵 ID
 * @param {string} text 댓글 내용
 * @param {function} onSuccess 성공 시 실행할 콜백 함수
 */
async function postMapComment(mapId, text, onSuccess) {
    if (!currentUser) { showMessage('로그인이 필요합니다.', 'error'); return; }
    try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const me = userSnap.exists() ? userSnap.data() : {};
        const newRef = doc(collection(db, 'maps', mapId, 'comments'));
        await setDoc(newRef, {
            uid: currentUser.uid,
            name: me.nickname || me.id || '사용자',
            photo: me.photo||'',
            text,
            createdAt: serverTimestamp()
        });
        showMessage('댓글 등록 완료', 'info');
        if (onSuccess) onSuccess();
    } catch(e) {
        console.error('postMapComment err', e);
        showMessage('댓글 등록 실패', 'error');
    }
}

function openCommentsPopup(mapId) {
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
            <input id="commentsInput" placeholder="댓글을 입력하세요 (엔터로 등록)" style="flex:1; padding:8px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.04); color:inherit;">
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
    
    // [수정] 세부 댓글창의 '등록' 버튼 및 엔터 키 이벤트 리스너
    const postCommentAction = async () => {
        if (!currentUser) { showMessage('로그인이 필요합니다.', 'error'); return; }
        const v = inputEl.value.trim();
        if (!v) return;
        await postMapComment(mapId, v, () => {
            // 성공 후 팝업 갱신
            popup.remove();
            openCommentsPopup(mapId);
            renderMap(); // 메인 맵 목록의 댓글 수도 갱신
        });
    };
    
    postBtn.onclick = postCommentAction;
    inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            postCommentAction();
        }
    });

    (async () => {
        try {
            const cSnap = await getDocs(collection(db, 'maps', mapId, 'comments'));
            const arr = [];
            cSnap.forEach(d => arr.push({ id: d.id, ...d.data() }));
            arr.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            if (!arr.length) {
                listEl.innerHTML = `<div class="muted">댓글이 없습니다.</div>`;
            } else {
                listEl.innerHTML = '';
                arr.forEach(c => {
                    const item = document.createElement('div');
                    item.className = 'comment-item';
                    item.style = 'margin-bottom:10px; border-bottom:1px dashed rgba(255,255,255,0.1); padding-bottom:10px;';
                    item.innerHTML = `
                        <div style="display:flex; align-items:center;">
                            <strong style="margin-right:10px;">${c.name||'익명'}</strong> 
                            <span class="muted" style="font-size:0.8em;">${fmtTime(c.createdAt)}</span>
                        </div>
                        <div style="margin-top:5px;">${c.text || ''}</div>
                        <div class="cm-admin" style="margin-top:6px; display:none; gap:8px;">
                            <button class="link cm-edit">수정</button>
                            <button class="link cm-del">삭제</button>
                        </div>
                    `;
                    
                    (async () => {
                        if (await isAdminUser()) {
                            const btnWrap = item.querySelector('.cm-admin');
                            btnWrap.style.display = 'flex';
                            btnWrap.querySelector('.cm-edit').onclick = async () => {
                                const newText = prompt('댓글 내용을 수정하시오.', c.text||'');
                                if (!newText) return;
                                try {
                                    await updateDoc(doc(db, 'maps', mapId, 'comments', c.id), { text: newText, editedAt: serverTimestamp() });
                                    // 팝업 새로고침
                                    popup.remove();
                                    openCommentsPopup(mapId);
                                    showMessage('댓글 수정 완료', 'info');
                                } catch(e) {
                                    showMessage('댓글 수정 실패', 'error');
                                }
                            };
                            btnWrap.querySelector('.cm-del').onclick = async () => {
                                if (await showConfirm('정말로 이 댓글을 삭제하시겠습니까?')) {
                                    try {
                                        await deleteDoc(doc(db, 'maps', mapId, 'comments', c.id));
                                        // 팝업 새로고침
                                        popup.remove();
                                        openCommentsPopup(mapId);
                                        showMessage('댓글 삭제 완료', 'info');
                                    } catch(e) {
                                        showMessage('댓글 삭제 실패', 'error');
                                    }
                                }
                            };
                        }
                    })();
                    listEl.appendChild(item);
                });
            }
        } catch(e) {
            console.error('load full comments err', e);
            listEl.innerHTML = `<div class="muted">댓글 로드 실패</div>`;
        }
    })();
}

// --- Dex Tab (도감) ---

// 코드명 생성에 사용될 상수
const DANGER_TYPES = {
    '유광': '유광',
    '해수': '해수',
    '심해': '심해',
    '파생': '파생' // 파생은 코드명 규칙이 다름
};
const SHAPE_TYPES = ['P', 'F', 'O', 'C'];

// 계산 로직 상수
const BASE_HP = 100;
const BASE_MP = 50;
const HP_PER_STR = 15;
const HP_PER_HEALTH = 20;
const MP_PER_AGI = 5;
const MP_PER_MIND = 10;
const ATTACK_PER_STR = 8;
const ATTACK_PER_AGI = 5;
const M_ATTACK_PER_MIND = 10;

/**
 * 심연체 스탯 기반 계산
 * @param {object} stats - { strength, health, agility, mind }
 * @returns {object} 계산된 능력치
 */
function calculateAbyssStats(stats) {
    const str = stats.strength || 0;
    const health = stats.health || 0;
    const agi = stats.agility || 0;
    const mind = stats.mind || 0;

    const maxHp = BASE_HP + (str * HP_PER_STR) + (health * HP_PER_HEALTH);
    const maxMp = BASE_MP + (agi * MP_PER_AGI) + (mind * MP_PER_MIND);
    const physicalAttack = ATTACK_PER_STR * str + ATTACK_PER_AGI * agi;
    const mentalAttack = M_ATTACK_PER_MIND * mind;

    return { maxHp, maxMp, physicalAttack, mentalAttack };
}

/**
 * 인라인 편집 필드 값 변경을 처리하고 데이터 객체에 반영합니다.
 * @param {object} data - 전체 심연체 데이터 객체 (참조로 전달)
 * @param {string} section - 'basic', 'stats', 'management', 'logs'
 * @param {string} key - 변경할 필드 키 또는 인덱스 및 서브 키 (e.g., 'name', 'basicInfo[1].value')
 * @param {*} value - 새로운 값
 */
function handleEditFieldChange(data, section, key, value) {
    if (key.includes('[')) {
        // 동적 배열 처리 (예: 'basicInfo[1].value')
        const match = key.match(/(\w+)\[(\d+)\].(\w+)/);
        if (match) {
            const arrKey = match[1];
            const index = parseInt(match[2]);
            const subKey = match[3];
            if (data[section] && data[section][arrKey] && data[section][arrKey][index]) {
                 data[section][arrKey][index][subKey] = value;
            }
        }
    } else if (section === 'basic' && (key === 'discoverySeq' || key === 'derivedSeq')) {
        // 숫자 필드는 강제 변환
        data[section][key] = Number(value);
    } else if (section === 'basic' || section === 'stats') {
         data[section][key] = value;
    } 
    
    // 코드명 실시간 업데이트 (필요한 경우)
    if (section === 'basic' && ['danger', 'shape', 'discoverySeq', 'derivedSeq'].includes(key)) {
        const d = data.basic;
        data.basic.code = generateAbyssCode(d.danger, d.shape, d.discoverySeq, d.derivedSeq);
    }
    // console.log('Data Updated:', section, key, value, data);
}

/**
 * 심연체 코드명 생성 로직
 * @param {string} danger 위험도 (유광, 해수 등)
 * @param {string} shape 외형 (P, F 등)
 * @param {number} discoverySeq 발견 순서
 * @param {number} [derivedSeq] 파생 순서 (파생일 경우)
 * @returns {string} 생성된 코드명
 */
function generateAbyssCode(danger, shape, discoverySeq, derivedSeq) {
    const dangerCode = DANGER_TYPES[danger] || '';
    const shapeCode = shape || '';
    
    // discoverySeq, derivedSeq가 undefined일 경우 0으로 처리하여 오류 방지
    discoverySeq = discoverySeq || 0;
    derivedSeq = derivedSeq || 0;

    if (danger === '파생' && derivedSeq > 0) {
        // (외형)(발견 순서)-(파생 순서)
        return `${shapeCode}${discoverySeq}-${derivedSeq}`;
    } else {
        // (위험도)-(외형)(발견 순서)
        return `${dangerCode}-${shapeCode}${discoverySeq}`;
    }
}

/**
 * 공개 여부 퍼센티지를 계산하는 스텁 함수 (실제 로직 구현 필요)
 */
function calculateDisclosurePercentage(abyssData) {
    // 임시 로직: 기본 정보의 공개 필드 갯수를 세어 임시 퍼센티지 반환
    const totalFields = 8 + 4; // Basic (8) + Stats (4)
    let publicCount = 0;
    
    Object.values(abyssData.basic.isPublic || {}).forEach(isP => { if (isP) publicCount++; });
    Object.values(abyssData.stats.isPublic || {}).forEach(isP => { if (isP) publicCount++; });
    
    // 관리 정보와 로그의 isPublic 필드도 계산해야 함. 여기서는 임시로 50% 반환
    return Math.min(100, Math.floor((publicCount / totalFields) * 50) + 50);
}

/**
 * DB에 데이터를 저장하는 함수 (Firestore setDoc 사용)
 * @param {string} id - 심연체 ID
 * @param {object} data - 저장할 심연체 데이터 객체
 */
async function saveAbyssData(id, data) {
    showMessage('데이터를 Firebase에 저장 중...', 'info');
    try {
        // data 객체의 유효성을 검사하고 Firestore에 setDoc을 호출 (merge: true로 부분 업데이트 가능)
        // save 전에 코드명, 계산된 스탯 등을 최종 업데이트하는 것이 좋습니다.
        data.basic.code = generateAbyssCode(data.basic.danger, data.basic.shape, data.basic.discoverySeq, data.basic.derivedSeq);
        
        await setDoc(doc(db, 'abyssal_dex', id), data, { merge: true });
        showMessage('저장 완료!', 'success');
    } catch (error) {
        console.error("Error saving data:", error);
        showMessage('저장 중 오류 발생', 'error');
        throw error;
    }
}

// 이전에 정의된 contentEl 사용 가정

async function renderDex() {
    contentEl.innerHTML = '<div class="card muted">도감 정보 로딩중...</div>';
    const isManager = await isAdminUser();
    
    try {
        const snap = await getDocs(collection(db, 'abyssal_dex'));
        const abyssList = [];
        snap.forEach(d => abyssList.push({ id: d.id, ...d.data() }));

        const totalCount = abyssList.length;
        const completedCount = abyssList.filter(a => calculateDisclosurePercentage(a) === 100).length;

        let html = '';

        // 0-1. 심연체 개방 정보 요약
        html += `<div class="card" style="margin-bottom: 20px;">
            <h2>도감 개방 현황: ${completedCount} / ${totalCount}</h2>
            <p class="muted">총 ${totalCount}개의 심연체 중 ${completedCount}개의 정보가 완전히 개방되었습니다.</p>
        </div>`;

        // 0-2. 관리자: 새 심연체 추가 버튼
        if (isManager) {
            html += `<button class="btn" id="addNewAbyssBtn" style="margin-bottom: 20px;">
                새 심연체 추가 +
            </button>`;
        }

        html += '<div class="dex-grid" style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">';
        
        abyssList.forEach(abyss => {
            html += renderDexCard(abyss, isManager);
        });
        
        html += '</div>';
        
        contentEl.innerHTML = html;

        // 이벤트 리스너 부착
        if (isManager) {
            document.getElementById('addNewAbyssBtn').onclick = () => createNewAbyss();
        }
        document.querySelectorAll('.dex-card').forEach(card => {
            const abyssId = card.dataset.id;
            card.onclick = () => renderDexDetail(abyssId);
        });

    } catch(e) {
        console.error(e);
        contentEl.innerHTML = '<div class="card error">도감 정보를 로드하는 데 실패했습니다.</div>';
    }
}

/**
 * 관리 정보 섹션 렌더링 (동적 추가/삭제, 인라인 편집 적용)
 */
function renderManagementSection(el, data, isEditMode, isManager) {
    const d = data.management;
    const section = 'management';
    
    const renderArrayInfo = (key, title, labelBase) => {
        let html = `<h4>${title}</h4><table class="info-table" style="width: 100%;">`;
        
        d[key].forEach((item, index) => {
            const isPublic = item.isPublic !== undefined ? item.isPublic : false;
            const masked = !isPublic && !isManager;
            const itemLabel = index === 0 && key === 'basicInfo' ? '기본 정보' : `${labelBase} (${index + 1})`;

            html += `
                <tr class="${masked ? 'masked-row' : ''}">
                    <td style="width: 30%; font-weight: bold; vertical-align: top; padding-top: 8px;">
                        ${isManager && isEditMode ? `<input type="checkbox" data-key="${key}[${index}].isPublic" data-section="${section}" ${isPublic ? 'checked' : ''} style="margin-right: 5px;">` : ''}
                        ${itemLabel}
                        ${isManager && isEditMode && index > 0 ? `<button class="btn-xs danger" data-action="delete" data-key="${key}" data-index="${index}" style="margin-left: 5px;">-</button>` : ''}
                    </td>
                    <td>
                        ${masked ? '<div class="masked-data"></div>' : renderInlineField({key, type: 'textarea', readOnly: false}, item.value, isEditMode, section, index, 'value')}
                    </td>
                </tr>
            `;
        });
        
        if (isManager && isEditMode) {
            html += `<tr><td colspan="2"><button class="btn-xs primary" data-action="add" data-key="${key}">+ ${title} 추가</button></td></tr>`;
        }
        
        html += '</table>';
        return html;
    };

    el.innerHTML = `
        <h3>관리 정보</h3>
        ${renderArrayInfo('basicInfo', '관리 정보', '추가 정보')}
        ${renderArrayInfo('collectionInfo', '채취 정보', '채취 정보')}
        ${renderArrayInfo('otherInfo', '기타 정보', '기타 정보')}
    `;

    if (isEditMode) {
        // 인라인 편집 이벤트 리스너
        el.querySelectorAll('.inline-edit-field').forEach(field => {
            field.onchange = (e) => {
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
            };
        });
        
        // 체크박스 이벤트 리스너
        el.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.onchange = (e) => {
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.checked);
            };
        });

        // 동적 배열 관리 버튼 이벤트 리스너
        el.querySelectorAll('button[data-action]').forEach(button => {
            button.onclick = (e) => {
                const action = e.target.dataset.action;
                const key = e.target.dataset.key;
                const index = parseInt(e.target.dataset.index);

                if (action === 'add') {
                    if (data.management[key].length < 10) { // 임시 최대 제한
                        data.management[key].push({ label: '새 정보', value: '', isPublic: false });
                    } else {
                        showMessage('더 이상 정보를 추가할 수 없습니다.', 'warning');
                    }
                } else if (action === 'delete') {
                    if (key === 'basicInfo' && index === 0) {
                        showMessage('기본 관리 정보는 삭제할 수 없습니다.', 'error');
                        return;
                    }
                    data.management[key].splice(index, 1);
                }
                // 변경 후 섹션 리렌더링
                renderManagementSection(el, data, isEditMode, isManager);
            };
        });
    }
}

/**
 * 연구 일지 섹션 렌더링
 */
function renderLogsSection(el, data, isEditMode, isManager) {
    const d = data.logs || [];
    const section = 'logs';
    
    let logsHtml = d.map((log, index) => {
        const logLabel = index === 0 ? '기본 일지' : `연구 일지 (${index})`;
        const isPublic = log.isPublic || false; // 7. 기본 일지는 항상 공개
        const masked = !isPublic && !isManager;

        return `
            <div class="card log-entry ${masked ? 'masked-log' : ''}" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0;">${logLabel}</h4>
                    <span class="muted" style="font-size: 0.9em;">${log.createdAt ? fmtTime(log.createdAt) : '날짜 없음'}</span>
                </div>
                
                ${isManager && isEditMode && index > 0 ? 
                    `<button class="btn-xs danger" data-action="delete" data-index="${index}" style="float: right;">- 삭제</button>` : ''}
                
                <p style="margin-top: 10px;">
                    <strong>제목:</strong> 
                    ${masked ? '<div class="masked-data"></div>' : renderInlineField({key:'logs', type:'text'}, log.title, isEditMode, section, index, 'title')}
                </p>
                <p>
                    <strong>내용:</strong>
                    ${masked ? '<div class="masked-data" style="height: 50px;"></div>' : renderInlineField({key:'logs', type:'textarea'}, log.content, isEditMode, section, index, 'content')}
                </p>
            </div>
        `;
    }).join('');

    el.innerHTML = `
        <h3>연구 일지</h3>
        <div class="log-list">${logsHtml}</div>
        ${isManager && isEditMode && d.length < 4 ? 
            `<button class="btn primary" id="addLogBtn" style="margin-top: 15px;">+ 연구 일지 추가</button>` : ''}
    `;

    if (isEditMode) {
        // 인라인 편집 이벤트 리스너
        el.querySelectorAll('.inline-edit-field').forEach(field => {
            field.onchange = (e) => {
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
            };
        });

        // 일지 추가 버튼
        document.getElementById('addLogBtn')?.addEventListener('click', () => {
            if (d.length < 4) {
                d.push({ title: '새 일지', content: '내용 없음', createdAt: serverTimestamp(), isPublic: false });
                renderLogsSection(el, data, isEditMode, isManager);
            }
        });

        // 일지 삭제 버튼
        el.querySelectorAll('button[data-action="delete"]').forEach(button => {
            button.onclick = (e) => {
                const index = parseInt(e.target.dataset.index);
                if (index > 0) { // 기본 일지는 삭제 불가 (index 0)
                    d.splice(index, 1);
                    renderLogsSection(el, data, isEditMode, isManager);
                }
            };
        });
    }
}

/**
 * 심연체 카드 렌더링 (그리드 뷰)
 * @param {object} abyssData - 심연체 데이터 객체
 * @param {boolean} isManager - 관리자 여부
 */
function renderDexCard(abyssData, isManager) {
    const id = abyssData.id;
    const basic = abyssData.basic || {};
    const disclosurePercent = calculateDisclosurePercentage(abyssData);
    
    // --- 공개 여부 확인 ---
    // 사진 공개 여부
    const isImagePublic = basic.isPublic?.image || false;
    const showImage = isImagePublic || isManager;
    const imgUrl = showImage ? (basic.image || '') : ''; // 비공개 시 URL을 비웁니다.

    // 코드명/이름 공개 여부
    const isCodePublic = basic.isPublic?.code || false;
    const isNamePublic = basic.isPublic?.name || false;
    
    // 표시할 이름과 코드명 결정
    const displayName = (isNamePublic || isManager) ? (basic.name || '정보 없음') : '???';
    const displayCode = (isCodePublic || isManager) ? (basic.code || '???') : '???';
    
    // 관리자가 아닐 경우, 세 가지 주요 필드(사진, 코드, 이름)가 모두 비공개이면 카드를 숨깁니다.
    // (이 로직은 renderDex에서 필터링하는 것이 더 효율적이지만, 현재 함수 내에서 시각적으로 처리합니다.)
    const isCompletelyHidden = !isManager && !isImagePublic && !isCodePublic && !isNamePublic;

    // 테두리 색상 계산 (0% > Red, 100% > Green)
    const red = 255 - Math.floor(disclosurePercent * 2.55);
    const green = Math.floor(disclosurePercent * 2.55);
    const borderColor = `rgb(${red}, ${green}, 0)`;
    
    // 비공개 시 회색 배경 처리
    const backgroundStyle = showImage && imgUrl
        ? `background-image: url('${imgUrl}'); background-color: #222;`
        : `background-color: #555;`; // 이미지가 없거나 비공개일 경우 회색 배경

    if (isCompletelyHidden) {
        // 관리자가 아니면서 주요 정보가 모두 비공개일 경우, 빈 문자열 반환 (목록에서 제외)
        return '';
    }

    // 1. 1:1 비율의 정사각형 사진이 한 줄에 4개씩 배치됨
    return `
        <div class="dex-card" data-id="${id}" 
             style="width: calc(25% - 15px); aspect-ratio: 1 / 1; 
                    ${backgroundStyle} background-size: cover; 
                    background-position: center; border: 5px solid ${borderColor}; 
                    position: relative; cursor: pointer; overflow: hidden;
                    transition: all 0.3s;">
            
            <div class="dex-overlay" 
                 style="position: absolute; bottom: 0; left: 0; width: 100%; min-height: 40px;
                        background: rgba(0, 0, 0, 0.7); padding: 5px; box-sizing: border-box; 
                        display: flex; flex-direction: column; justify-content: center; align-items: center;
                        color: white; text-align: center;">
                
                <strong style="font-size: 1.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${displayName}</strong>
                <span style="font-size: 0.9em; margin-top: 2px; color: #ccc;">${displayCode}</span>
            </div>
            
            <div class="dex-hover-overlay" 
                 style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0, 0, 0, 0.6); opacity: 0; transition: opacity 0.3s;
                        display: flex; flex-direction: column; justify-content: center; align-items: center;
                        color: white;">
                <strong style="font-size: 1.2em; text-align: center;">${displayName}</strong>
                <span style="margin-top: 5px;">개방률: ${disclosurePercent}%</span>
            </div>
        </div>
        <style>
            .dex-card[data-id="${id}"]:hover .dex-hover-overlay { opacity: 1; background: rgba(var(--accent-rgb), 0.7); }
            .dex-card[data-id="${id}"]:hover { transform: scale(1.05); }
        </style>
    `;
}

/**
 * 새 심연체 생성 (관리자)
 */
async function createNewAbyss() {
    showMessage('새 심연체 순서를 계산하고 있습니다...', 'info');

    const abyssCollectionRef = collection(db, 'abyssal_dex');
    const newDocRef = doc(abyssCollectionRef);
    const newId = newDocRef.id;

    let nextDiscoverySeq = 1;

    try {
        // 1. 모든 심연체 데이터 조회
        const snap = await getDocs(abyssCollectionRef);
        let maxSeq = 0;
        
        snap.forEach(d => {
            const data = d.data();
            const danger = data.basic?.danger;
            const seq = data.basic?.discoverySeq || 0;
            
            // 2. '파생'이 아닌 심연체의 discoverySeq만 확인하여 최대값을 찾음
            if (danger !== '파생' && seq > maxSeq) {
                maxSeq = seq;
            }
        });
        
        // 3. 다음 순서는 최대값 + 1
        nextDiscoverySeq = maxSeq + 1;
        
    } catch(e) {
        console.error("최대 discoverySeq 조회 실패:", e);
        // 조회 실패 시 기본값 1 사용
        showMessage('순서 조회 중 오류 발생. 기본값 1을 사용합니다.', 'warning');
    }

    // 템플릿 데이터 (기본값 설정)
    const initialData = {
        id: newId, 
        basic: {
            // 조회된 nextDiscoverySeq 적용
            discoverySeq: nextDiscoverySeq, 
            danger: '유광', // 기본 위험도
            shape: 'P',
            name: `새 심연체 ${nextDiscoverySeq}`, // 이름도 순서에 맞춰 초기 설정
            derivedSeq: 0, 
            image: '',
            majorDamage: '',
            deathChance: '',
            sanityChance: '',
            isPublic: {
                name: false, code: false, danger: false, shape: false, discoverySeq: false,
                majorDamage: false, deathChance: false, sanityChance: false, image: false
            }
        },
        stats: { 
            strength: 1, health: 1, agility: 1, mind: 1, 
            isPublic: { strength: false, health: false, agility: false, mind: false } 
        },
        management: {
            basicInfo: [{ label: '기본 정보', value: '초기 관리 정보', isPublic: false }],
            collectionInfo: [{ label: '채취 정보', value: '초기 채취 정보', isPublic: false }],
            otherInfo: [{ label: '기타 정보', value: '초기 기타 정보', isPublic: false }]
        },
        logs: [
            { title: '기본 일지', content: '기록 시작', createdAt: serverTimestamp(), isPublic: true },
        ],
        comments: [],
        createdAt: serverTimestamp(),
    };
    
    // 코드명 최종 계산
    initialData.basic.code = generateAbyssCode(
        initialData.basic.danger, 
        initialData.basic.shape, 
        initialData.basic.discoverySeq, 
        initialData.basic.derivedSeq
    );

    // 4. DB에 데이터 저장 및 상세 편집 모드로 이동
    try {
        await setDoc(newDocRef, initialData);
        showMessage(`새 심연체 [${initialData.basic.code}] 템플릿 추가 완료. 내용을 편집하세요.`, 'info');
        renderDexDetail(newId, true, initialData); 
    } catch (e) {
        console.error("새 심연체 추가 실패:", e);
        showMessage('새 심연체 추가 실패', 'error');
    }
}

/**
 * 심연체 상세 보기/편집 렌더링
 * @param {string} id 심연체 ID
 * @param {boolean} [isEditMode=false] 편집 모드로 시작할지 여부
 * @param {object} [preloadedData=null] 미리 로드된 데이터 (선택 사항)
 */
async function renderDexDetail(id, isEditMode = false, preloadedData = null) {
    let data;
    
    if (preloadedData) {
        data = preloadedData;
    } else {
        const abyssDoc = await getDoc(doc(db, 'abyssal_dex', id));
        if (!abyssDoc.exists()) {
            showMessage('존재하지 않는 심연체입니다.', 'error');
            renderDex();
            return;
        }
        data = abyssDoc.data();
    }
    
    const isManager = await isAdminUser();
    
    // (이하 기존 renderDexDetail 로직은 동일)
    // ...
    // 코드명 자동 업데이트 및 스탯 계산
    const code = generateAbyssCode(data.basic.danger, data.basic.shape, data.basic.discoverySeq, data.basic.derivedSeq);
    data.basic.code = code;

    const calculatedStats = calculateAbyssStats(data.stats);
    const disclosurePercent = calculateDisclosurePercentage(data);

    let html = `
        <div class="dex-detail-wrap card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <button class="btn link" id="backToDexList">← 도감 목록으로</button>
                <div style="display: flex; gap: 10px;">
                    <div style="font-size: 1.2em; color: ${disclosurePercent === 100 ? 'var(--green)' : 'var(--accent)'};">
                        개방률: ${disclosurePercent}%
                    </div>
                    ${isManager ? `<button class="btn ${isEditMode ? 'warning' : ''}" id="toggleEditMode">
                        ${isEditMode ? '저장 및 편집 종료' : '편집'}
                    </button>` : ''}
                </div>
            </div>

            <div class="dex-sections-container">
                <div class="dex-section" id="basicInfoSection"></div>
                <div class="dex-section" id="statsSection"></div>
                <div class="dex-section" id="managementSection"></div>
                <div class="dex-section" id="logsSection"></div>
            </div>

            <hr style="margin: 30px 0;">

            <div class="dex-comments-area" data-id="${id}">
                ${renderCommentArea(id, data.comments || [])}
            </div>
        </div>
    `;
    
    contentEl.innerHTML = html;

    // 각 섹션 렌더링 시 isEditMode와 data 객체를 전달하여 인라인 편집 구현
    renderBasicInfoSection(document.getElementById('basicInfoSection'), data, isEditMode, isManager);
    renderStatsSection(document.getElementById('statsSection'), data, calculatedStats, isEditMode, isManager);
    renderManagementSection(document.getElementById('managementSection'), data, isEditMode, isManager);
    renderLogsSection(document.getElementById('logsSection'), data, isEditMode, isManager);

    // 이벤트 리스너 부착
    document.getElementById('backToDexList').onclick = renderDex;
    
    if (isManager) {
        document.getElementById('toggleEditMode').onclick = () => {
            if (isEditMode) {
                // 편집 종료 시 저장 로직
                saveAbyssData(id, data).then(() => {
                    // 저장 성공 후 다시 읽기 모드로 리렌더링
                    renderDexDetail(id, false); 
                }).catch((e) => {
                    console.error('Save failed:', e);
                    showMessage('저장 중 오류 발생', 'error');
                    // 저장 실패 시 편집 모드 유지
                });
            } else {
                renderDexDetail(id, true); // 편집 모드로 전환
            }
        };
    }
    
    // 댓글 이벤트 리스너 (9, 10)
    attachCommentEventListeners(id);
}

/**
 * 입력/선택 필드를 렌더링하거나, 일반 텍스트를 렌더링합니다.
 */
function renderInlineField(f, currentValue, isEditMode, section, index = null, subKey = null) {
    // 배열 필드의 키 생성 (e.g., 'basicInfo[1].value')
    const key = index !== null ? `${f.key}[${index}].${subKey}` : f.key;

    if (isEditMode && !f.readOnly) {
        if (f.type === 'select') {
            const optionsHtml = f.options.map(opt => 
                `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`
            ).join('');
            return `
                <select data-key="${key}" data-section="${section}" class="inline-edit-field form-control-inline">
                    ${optionsHtml}
                </select>
            `;
        }
        
        const type = f.type || 'text';
        if (type === 'textarea') {
            return `
                <textarea data-key="${key}" data-section="${section}" 
                          class="inline-edit-field form-control-inline" rows="3" style="width:100%;">${currentValue}</textarea>
            `;
        }
        
        return `
            <input type="${type}" data-key="${key}" data-section="${section}" 
                   class="inline-edit-field form-control-inline" value="${currentValue}" 
                   min="${f.min || ''}" style="width:100%;">
        `;
    }
    return currentValue; // 읽기 모드
}

// --- 섹션 렌더링 함수 ---

/**
 * 기본 정보 섹션 렌더링 (인라인 편집 적용)
 */
function renderBasicInfoSection(el, data, isEditMode, isManager) {
    const d = data.basic;
    const section = 'basic';
    
    // 3.1: 1:1 정사각형 사진 인라인 편집
    const imgHtml = `
        <div style="width: 100%; aspect-ratio: 1 / 1; 
                    background-image: url('${d.image || ''}'); background-size: cover; 
                    background-position: center; border-radius: 8px; margin-bottom: 15px;">
        </div>
        ${isEditMode ? `
            <input type="text" id="editImageURL" placeholder="이미지 URL" value="${d.image || ''}" style="width: 100%; margin-top: 5px;" 
                   data-key="image" data-section="${section}" class="inline-edit-field form-control-inline">
            <input type="file" id="editImageFile" accept="image/*" style="width: 100%; margin-top: 5px;">
        ` : ''}
    `;

    // 3.1: 기본 정보 표
    const discoveryKey = d.danger === '파생' ? 'derivedSeq' : 'discoverySeq';
    const discoveryLabel = d.danger === '파생' ? '파생 순서' : '발견 순서';
    
    const fields = [
        { label: '코드명', key: 'code', type: 'text', readOnly: true },
        { label: '명칭', key: 'name', type: 'text' },
        { label: '위험도', key: 'danger', type: 'select', options: Object.keys(DANGER_TYPES) },
        { label: '외형', key: 'shape', type: 'select', options: SHAPE_TYPES },
        { label: discoveryLabel, key: discoveryKey, type: 'number', min: 1 },
        { label: '주요 피해', key: 'majorDamage', type: 'text' },
        { label: '사망 가능성', key: 'deathChance', type: 'text' },
        { label: '광기 가능성', key: 'sanityChance', type: 'text' }
    ];

    let tableHtml = '<table class="info-table" style="width: 100%;">';
    fields.forEach(f => {
        const value = d[f.key] || (f.type === 'number' ? 0 : '');
        const isPublic = d.isPublic[f.key] !== undefined ? d.isPublic[f.key] : false;
        const masked = !isPublic && !isManager;

        tableHtml += `
            <tr class="${masked ? 'masked-row' : ''}">
                <td style="width: 30%; font-weight: bold;">
                    ${isManager && isEditMode && !f.readOnly ? `<input type="checkbox" data-key="${f.key}" data-section="${section}-isPublic" ${isPublic ? 'checked' : ''} style="margin-right: 5px;">` : ''}
                    ${f.label}
                </td>
                <td>
                    ${masked ? '<div class="masked-data"></div>' : renderInlineField(f, value, isEditMode, section)}
                </td>
            </tr>
        `;
    });
    tableHtml += '</table>';

    el.innerHTML = `
        <h3>기본 정보</h3>
        <div style="display: flex; gap: 20px;">
            <div style="flex: 0 0 200px; max-width: 200px;">${imgHtml}</div>
            <div style="flex: 1;">${tableHtml}</div>
        </div>
    `;
    
    // **인라인 편집 이벤트 리스너 부착**
    if (isEditMode) {
        el.querySelectorAll('.inline-edit-field').forEach(field => {
            field.onchange = (e) => {
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
                // 실시간 코드명 및 필드 레이블 반영을 위해 섹션만 리렌더링
                renderBasicInfoSection(el, data, isEditMode, isManager);
            };
        });
        
        // 공개 체크박스 이벤트 리스너 부착
        el.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.onchange = (e) => {
                const key = e.target.dataset.key;
                data.basic.isPublic[key] = e.target.checked;
            };
        });

        document.getElementById('editImageFile')?.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          showMessage('이미지 업로드 중...', 'info');
          
          try {
              // Firebase Storage의 uploadBytes와 getDownloadURL 함수 필요
              const storageRef = ref(storage, `abyss_images/${data.id}_${file.name}`);
              const uploadTask = await uploadBytes(storageRef, file);
              const imageUrl = await getDownloadURL(uploadTask.ref);

              // data 객체 업데이트
              handleEditFieldChange(data, section, 'image', imageUrl);

              // 업데이트된 데이터로 화면 리렌더링
              renderBasicInfoSection(el, data, isEditMode, isManager);
              showMessage('이미지 업로드 및 반영 완료', 'success');

          } catch (error) {
              console.error("이미지 업로드 실패:", error);
              showMessage('이미지 업로드 실패', 'error');
          }
      });
    }
}

/**
 * 심연체 정보 섹션 렌더링 (스탯 및 계산된 능력치)
 */
function renderStatsSection(el, data, calculatedStats, isEditMode, isManager) {
    const d = data.stats;
    const section = 'stats';
    const statsKeys = ['strength', 'health', 'agility', 'mind'];
    
    let statTable = '<table class="info-table" style="width: 100%;">';
    statsKeys.forEach(key => {
        const label = { strength: '근력', health: '건강', agility: '민첩', mind: '정신력' }[key];
        const value = d[key] || 0;
        const isPublic = d.isPublic[key] !== undefined ? d.isPublic[key] : false;
        const masked = !isPublic && !isManager;

        statTable += `
            <tr class="${masked ? 'masked-row' : ''}">
                <td style="width: 50%; font-weight: bold;">
                    ${isManager && isEditMode ? `<input type="checkbox" data-key="${key}" data-section="${section}-isPublic" ${isPublic ? 'checked' : ''} style="margin-right: 5px;">` : ''}
                    ${label}
                </td>
                <td>
                    ${masked ? '<div class="masked-data"></div>' : renderInlineField({key, type: 'number', min: 1}, value, isEditMode, section)}
                </td>
            </tr>
        `;
    });
    statTable += '</table>';
    
    el.innerHTML = `
        <h3>심연체 정보 (스테이터스)</h3>
        <div style="display: flex; gap: 20px;">
            <div style="flex: 1;">
                <h4>스테이터스</h4>
                ${statTable}
                <canvas id="radarChart-${data.id}" width="200" height="200" style="margin-top: 15px;"></canvas>
            </div>
            <div style="flex: 1;">
                <h4>계산된 능력치</h4>
                <table class="info-table" style="width: 100%;">
                    <tr><td style="width: 50%;">최대 체력</td><td>${calculatedStats.maxHp}</td></tr>
                    <tr><td>최대 정신력</td><td>${calculatedStats.maxMp}</td></tr>
                    <tr><td>물리 공격력</td><td>${calculatedStats.physicalAttack}</td></tr>
                    <tr><td>정신 공격력</td><td>${calculatedStats.mentalAttack}</td></tr>
                </table>
            </div>
        </div>
    `;

    // **인라인 편집 이벤트 리스너 부착**
    if (isEditMode) {
        el.querySelectorAll('.inline-edit-field').forEach(field => {
            field.onchange = (e) => {
                // 스탯 변경 시 계산된 값과 그래프까지 반영하기 위해 전체 상세 화면을 다시 렌더링합니다.
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
                renderDexDetail(data.id, true); 
            };
        });
        
        // 공개 체크박스 이벤트 리스너 부착
        el.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.onchange = (e) => {
                const key = e.target.dataset.key;
                data.stats.isPublic[key] = e.target.checked;
            };
        });
    }

    // 그래프 그리기 (Chart.js 등의 라이브러리가 필요함)
    // drawRadarChart(document.getElementById(`radarChart-${data.id}`), d); 
}

/**
 * 댓글 영역 렌더링 (9. 인라인 댓글, 미리보기 3개)
 */
function renderCommentArea(abyssId, comments = []) {
    // 최신 순 정렬
    comments.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    
    const preview = comments.slice(0, 3);
    const count = comments.length;

    let listHtml = '';
    if (count === 0) {
        listHtml = '<div class="muted">아직 댓글이 없습니다.</div>';
    } else {
        preview.forEach(c => {
            listHtml += renderCommentItem(c); // 댓글 아이템 렌더링 함수 사용
        });
    }

    return `
        <h4>댓글 (${count}개)</h4>
        <div class="comments-list" style="margin-bottom: 15px;">
            ${listHtml}
        </div>
        ${count > 3 ? `<button class="btn link" data-action="open-full-comments">댓글 전체 보기 (${count}개)</button>` : ''}
        
        <div class="comment-input-area" style="margin-top: 15px;">
            <input type="text" id="dexCommentInput-${abyssId}" placeholder="댓글 작성 (엔터로 등록)" 
                   style="width: 100%; padding: 8px; border-radius: 6px; background: transparent; 
                          border: 1px solid rgba(255,255,255,0.1); color: inherit;">
        </div>
    `;
}

/**
 * 댓글 아이템 HTML 렌더링 (9, 10. 수정됨 표시 및 권한에 따른 액션)
 */
function renderCommentItem(comment) {
    const userHex = comment.userColor || '#CCCCCC'; // users/유저 uid/colorHex 값 사용 가정
    const isEdited = !!comment.editedAt;
    
    // 배경 색상 밝기 판단 (대략적인 판단 로직)
    const r = parseInt(userHex.slice(1, 3), 16);
    const g = parseInt(userHex.slice(3, 5), 16);
    const b = parseInt(userHex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const iconColor = brightness > 125 ? 'black' : 'white';

    return `
        <div class="comment-item" data-id="${comment.id}" data-uid="${comment.uid}" style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; border-radius: 50%; background-color: ${userHex}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span class="material-icons" style="font-size: 20px; color: ${iconColor};">person</span>
            </div>
            <div style="flex-grow: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${comment.name || '익명'}</strong>
                    <span class="muted" style="font-size: 0.8em;">${fmtTime(comment.createdAt)}${isEdited ? ' (수정됨)' : ''}</span>
                </div>
                <div class="comment-text">${comment.text || ''}</div>
                <div class="comment-actions" style="margin-top: 5px; font-size: 0.9em; display: none;">
                    <button class="link comment-edit">수정</button>
                    <button class="link comment-delete">삭제</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 댓글 이벤트 리스너 부착 및 처리 (10. 수정/삭제 권한)
 */
function attachCommentEventListeners(abyssId) {
    const inputEl = document.getElementById(`dexCommentInput-${abyssId}`);
    
    // 9. 인라인 댓글 등록 (Enter)
    if (inputEl) {
        inputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = inputEl.value.trim();
                if (text) {
                    // postMapComment와 유사한 postDexComment 함수 사용 가정
                    postDexComment(abyssId, text).then(() => {
                        inputEl.value = '';
                        renderDexDetail(abyssId); // 댓글 후 상세 페이지 새로고침
                    });
                }
            }
        });
    }

    // 9. 전체 댓글 보기
    document.querySelector('[data-action="open-full-comments"]')?.addEventListener('click', () => {
        openCommentsPopup(abyssId, 'abyssal_dex'); // 기존 팝업 함수 재사용 (컬렉션 지정)
    });

    // 10. 댓글 수정/삭제 권한 처리
    document.querySelectorAll('.comment-item').forEach(async item => {
        const commentId = item.dataset.id;
        const commentUid = item.dataset.uid;
        
        const isManager = await isAdminUser();
        const isOwner = currentUser && currentUser.uid === commentUid;

        if (isManager || isOwner) {
            const actions = item.querySelector('.comment-actions');
            actions.style.display = 'block';

            // 수정
            actions.querySelector('.comment-edit').onclick = async () => {
                const originalText = item.querySelector('.comment-text').textContent;
                const newText = prompt('댓글 내용을 수정하시오.', originalText);
                if (newText) {
                    await updateDoc(doc(db, 'abyssal_dex', abyssId, 'comments', commentId), { 
                        text: newText, 
                        editedAt: serverTimestamp() 
                    });
                    renderDexDetail(abyssId);
                }
            };
            
            // 삭제
            actions.querySelector('.comment-delete').onclick = async () => {
                if (await showConfirm('정말로 이 댓글을 삭제하시겠습니까?')) {
                    await deleteDoc(doc(db, 'abyssal_dex', abyssId, 'comments', commentId));
                    renderDexDetail(abyssId);
                }
            };
        }
    });
}

/**
 * 현재 로그인된 사용자가 관리자인지 확인합니다.
 * @returns {Promise<boolean>}
 */
async function isAdminUser() {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        // 'users' 컬렉션에서 사용자 UID로 문서 조회
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        // 사용자가 존재하고 역할(role)이 'admin'인지 확인
        return uDoc.exists() && uDoc.data().role === 'admin';
    } catch(e) {
        console.error('isAdminUser check failed:', e);
        return false;
    }
}

/**
 * 현재 로그인된 사용자 ID (시트 ID로 사용)를 반환합니다.
 * @returns {Promise<string|null>}
 */
async function getCurrentUserSheetId() {
    // onAuthStateChanged는 비동기적으로 사용하기 어려우므로,
    // auth.currentUser를 직접 사용하거나, 랩핑된 Promise를 사용해야 함.
    const user = auth.currentUser;
    return user ? user.uid : null;
}

/**
 * 특정 시트 ID에 대한 데이터를 Firestore에서 가져옵니다.
 * 'sheets' 컬렉션에 모든 데이터가 저장되어 있다고 가정합니다.
 * @param {string} sheetId - 가져올 시트의 ID (사용자 UID와 동일)
 * @returns {Promise<Object>} 시트 데이터 객체
 */
async function fetchSheetData(sheetId) {
    // 'sheets' 컬렉션에서 해당 ID의 문서 조회
    const sheetDoc = await getDoc(doc(db, 'sheets', sheetId));
    if (!sheetDoc.exists()) {
        throw new Error(`Sheet data not found for ID: ${sheetId}`);
    }
    
    // 데이터 구조가 깊어지면 깊은 복사나 추가 처리가 필요할 수 있지만,
    // 여기서는 문서 데이터를 직접 반환
    return sheetDoc.data();
}

/**
 * 인벤토리 아이템에 대한 설명을 데이터베이스에서 가져옵니다.
 * 'items' 컬렉션에 아이템 정보가 저장되어 있다고 가정합니다.
 * @param {string} itemName - 아이템 이름
 * @returns {Promise<string>} 아이템 설명
 */
async function fetchItemDescription(itemName) {
    try {
        // 'items' 컬렉션에서 name 필드가 itemName과 일치하는 문서 쿼리
        const q = query(collection(db, 'items'), where('name', '==', itemName));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            // 첫 번째 일치하는 아이템의 description 반환
            return snap.docs[0].data().description || "설명 없음";
        }
    } catch(e) {
        console.error("Failed to fetch item description:", e);
    }
    return "설명 없음 (DB 로드 실패)";
}

// 부상도/오염도에 따른 텍스트 구절 반환
function getStatusText(injuryPercent, contaminationPercent) {
    let injuryText = "";
    let contaminationText = "";

    // 부상도 텍스트
    if (injuryPercent === 0) injuryText = "부상 없음.";
    else if (injuryPercent <= 10) injuryText = "경미한 찰과상.";
    else if (injuryPercent <= 30) injuryText = "타박상 및 출혈.";
    else if (injuryPercent <= 60) injuryText = "깊은 상처 및 골절 가능성.";
    else injuryText = "심각한 부상, 활동 불가 수준.";
    
    // 오염도 텍스트
    if (contaminationPercent === 0) contaminationText = "오염 없음.";
    else if (contaminationPercent <= 10) contaminationText = "경미한 오염, 즉시 제거 가능.";
    else if (contaminationPercent <= 30) contaminationText = "중간 오염, 징후 발현.";
    else if (contaminationPercent <= 60) contaminationText = "심각한 오염, 신체 능력 저하.";
    else contaminationText = "치명적인 오염, 변이 진행 중.";

    return [injuryText, contaminationText];
}

// 부위별 색상을 계산하는 함수 (검은색 -> 파란색(부상) / 보라색(오염) / 섞임)
function calculatePartColor(injury, contamination) {
    // 0~100 스케일
    const i = Math.min(100, injury) / 100;
    const c = Math.min(100, contamination) / 100;

    // 검정(0,0,0)을 베이스로 파랑(부상)과 보라색(오염)을 섞음
    // 부상(Blue) 증가, 오염(Purple=Red+Blue) 증가
    
    // R: 오염도에 의해 증가
    const r = Math.round(i * 10 + c * 100); 
    // G: 기본적으로 낮음
    const g = Math.round(i * 10 + c * 10);
    // B: 부상도와 오염도 모두에 의해 증가
    const b = Math.round(i * 150 + c * 150); 
    
    // 부상도와 오염도가 모두 0일 때 (어두운 배경색과 섞여야 하므로)
    if (i === 0 && c === 0) return 'rgba(255, 255, 255, 0.1)'; 
    
    // 색상 포화도를 높여서 변화를 명확하게 (최대 255를 넘지 않도록 제한)
    const red = Math.min(200, r + 50);
    const green = Math.min(200, g + 50);
    const blue = Math.min(255, b + 50);

    return `rgb(${red}, ${green}, ${blue})`;
}

// ----------------------------------------------------------------------

/**
 * 개인 캐릭터 시트 전체를 렌더링합니다.
 * (이전 응답과 동일한 로직을 사용하며, 위에 정의된 Firebase 헬퍼 함수를 통해 데이터를 가져옴)
 * @param {string} [targetSheetId] - 관리자가 특정 유저 시트를 볼 때 사용하는 ID.
 */
async function renderMe(targetSheetId = null) {
    // 0-2. 관리자/본인 시트 확인
    const isAdmin = await isAdminUser();
    let currentSheetId = targetSheetId;
    
    if (!targetSheetId) {
        currentSheetId = await getCurrentUserSheetId();
        if (!currentSheetId) {
            contentEl.innerHTML = '<div class="card muted">로그인 후 본인의 시트를 확인하세요.</div>';
            return;
        }
    } else if (!isAdmin) {
        contentEl.innerHTML = '<div class="card error">권한이 없습니다.</div>';
        return;
    }
    
    contentEl.innerHTML = '<div class="card muted">시트 로딩중...</div>';
    
    try {
        // 1. 시트 데이터를 데이터베이스에서 가져옴 (Firebase 연동)
        const sheetData = await fetchSheetData(currentSheetId);
        
        const sheetContainer = document.createElement('div');
        sheetContainer.className = 'char-sheet-container';
        
        // 2. 인적사항 섹션 렌더링
        sheetContainer.appendChild(renderPersonnelSection(sheetData.personnel, currentSheetId, isAdmin));
        
        // 3. 스탯 섹션 렌더링
        // 스탯 섹션에는 두 개의 방사형 그래프가 포함됩니다.
        // 
        sheetContainer.appendChild(renderStatsSection(sheetData.stats, isAdmin));
        
        // 4. 인벤토리 섹션 렌더링 (비동기 함수 사용)
        sheetContainer.appendChild(await renderInventorySection(sheetData.inventory, isAdmin));

        // 5. 현재 상태 섹션 렌더링
        sheetContainer.appendChild(renderStatusSection(sheetData.status, sheetData.stats.spirit, isAdmin));
        
        contentEl.innerHTML = '';
        contentEl.appendChild(sheetContainer);
        
    } catch(e) {
        console.error("Sheet load failed:", e);
        contentEl.innerHTML = `<div class="card error">시트 로드 실패: ${e.message}</div>`;
    }
}

// 인적사항 섹션 렌더링
function renderPersonnelSection(p, sheetId, isAdmin) {
    const section = document.createElement('div');
    section.className = 'card map-card'; // 기존 카드 스타일 활용
    section.innerHTML = `
        <h2 style="margin-top:0;">👤 인적사항 (ID: ${sheetId})</h2>
        <div class="personnel-grid">
            <div class="photo-area">
                <img src="${p.photoUrl}" alt="프로필 사진" style="width:100%; height:auto; aspect-ratio: 3/4; object-fit: cover;">
            </div>
            <div class="details-area">
                ${renderHorizontalTable('표 1: 기본 정보', [
                    { label: '이름', value: p.name },
                    { label: '성별', value: p.gender },
                    { label: '나이', value: p.age },
                    { label: '키/체중', value: `${p.height}cm / ${p.weight}kg` },
                    { label: '국적', value: p.nationality },
                ], isAdmin)}
                
                ${renderHorizontalTable('표 2: 상세 정보', [
                    { label: '학력', value: p.education },
                    { label: '경력', value: p.career },
                    { label: '가족관계', value: p.family },
                    { label: '연락처', value: p.contact },
                    { label: '결혼 여부', value: p.marriage },
                    { label: '병력', value: p.medical },
                    { label: '범죄 전과', value: p.criminal },
                    { label: '비고', value: p.etc, isLong: true },
                ], isAdmin)}
            </div>
        </div>
        ${isAdmin ? `<button class="btn link admin-edit-btn" onclick="openPersonnelEdit('${sheetId}', ${JSON.stringify(p)})">인적사항 편집</button>` : ''}
    `;
    return section;
}

// 스탯 섹션 렌더링
function renderStatsSection(s, isAdmin) {
    const section = document.createElement('div');
    section.className = 'card map-card';
    section.innerHTML = `
        <h2>💪 스탯</h2>
        <div class="stats-grid">
            <div class="radar-chart-wrap">
                <div class="chart-container-1">
                    
                </div>
                ${renderHorizontalTable('표 1: 신체 스탯', [
                    { label: '근력', value: s.muscle },
                    { label: '민첩', value: s.agility },
                    { label: '지구력', value: s.endurance },
                    { label: '유연성', value: s.flexibility },
                    { label: '시각', value: s.visual },
                    { label: '청각', value: s.auditory },
                    { label: '상황 인지 능력', value: s.situation },
                    { label: '반응속도', value: s.reaction },
                ], isAdmin, true)}
            </div>
            <div class="radar-chart-wrap">
                ${renderHorizontalTable('표 2: 정신 스탯', [
                    { label: '지능', value: s.intellect },
                    { label: '판단력', value: s.judgment },
                    { label: '기억력', value: s.memory },
                    { label: '정신력', value: s.spirit },
                    { label: '의사 결정 능력', value: s.decision },
                    { label: '스트레스 내성', value: s.stress },
                ], isAdmin, true)}
                <div class="chart-container-2">
                    
                </div>
            </div>
        </div>
        ${isAdmin ? `<button class="btn link admin-edit-btn" onclick="openStatsEdit(sheetId, ${JSON.stringify(s)})">스탯 편집</button>` : ''}
    `;
    return section;
}

// 인벤토리 섹션 렌더링
async function renderInventorySection(inv, isAdmin) {
    const section = document.createElement('div');
    section.className = 'card map-card';
    
    let itemRows = '';
    if (inv.items.length === 0) {
        itemRows = `<tr><td colspan="5" style="text-align: center; color: #aaa;">소지한 물건이 없습니다.</td></tr>`;
    } else {
        for (const [index, item] of inv.items.entries()) {
            // 4. 인벤토리 설명은 DB에서 받아와야 함을 가정
            const desc = item.desc || await fetchItemDescription(item.name);
            itemRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${desc}</td>
                    <td>${item.source}</td>
                    <td>${item.count}</td>
                </tr>
            `;
        }
    }
    
    section.innerHTML = `
        <h2>🎒 인벤토리</h2>
        <div style="margin-bottom: 15px; font-weight: bold; padding: 5px; background: rgba(255, 255, 255, 0.05);">
            소지한 은화: <span style="color: gold;">${inv.silver}</span> 개
        </div>
        
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th>번호</th>
                    <th>이름</th>
                    <th>설명</th>
                    <th>출처</th>
                    <th>수량</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
            </tbody>
        </table>
        
        ${isAdmin ? `<button class="btn link admin-edit-btn" onclick="openInventoryEdit(sheetId, ${JSON.stringify(inv)})">인벤토리 편집</button>` : ''}
    `;
    return section;
}

// 현재 상태 섹션 렌더링
function renderStatusSection(s, spiritStat, isAdmin) {
    const section = document.createElement('div');
    section.className = 'card map-card';
    
    const injuryParts = ['head', 'neck', 'leftEye', 'rightEye', 'leftArm', 'leftHand', 'leftLeg', 'leftFoot', 'torso', 'rightArm', 'rightHand', 'rightLeg', 'rightFoot'];
    const mapKeyToLabel = {
        head: '<머리>', neck: '목', leftEye: '왼쪽 안구', rightEye: '오른쪽 안구',
        leftArm: '<왼팔>', leftHand: '<왼손>', leftLeg: '<왼다리>', leftFoot: '왼발',
        torso: '<상체>', rightArm: '<오른팔>', rightHand: '<오른손>', rightLeg: '<오른다리>', rightFoot: '오른발'
    };
    const mainParts = ['head', 'leftArm', 'leftLeg', 'torso', 'rightArm', 'rightLeg']; // 사람 아이콘 부위

    // 5-1. 정신력 바 및 상태 구절
    const spiritPercent = (s.currentSpirit / s.maxSpirit) * 100;
    
    let physicalStatusText = '양호';
    const totalInjury = injuryParts.reduce((sum, key) => sum + s.injuries[key], 0);
    const totalContamination = injuryParts.reduce((sum, key) => sum + s.contaminations[key], 0);
    
    if (totalInjury > 50) physicalStatusText = '불안정';
    if (totalInjury > 100) physicalStatusText = '심각';
    if (totalInjury === 0 && totalContamination === 0) physicalStatusText = '여유로움';


    section.innerHTML = `
        <h2>⚕️ 현재 상태</h2>

        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
            <div style="flex-grow: 1;">
                <div style="font-weight: bold; margin-bottom: 5px;">
                    현재 정신력: ${s.currentSpirit} / ${s.maxSpirit} (정신력 스탯: ${spiritStat})
                </div>
                <div style="background: rgba(255, 255, 255, 0.1); height: 15px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${spiritPercent}%; background: ${spiritPercent > 30 ? 'green' : 'red'}; height: 100%; transition: width 0.3s;"></div>
                </div>
            </div>
            <div style="min-width: 200px; text-align: right;">
                <div style="color: ${physicalStatusText === '여유로움' ? 'lime' : 'yellow'}; font-weight: bold;">
                    현재 신체 상태는 '${physicalStatusText}'입니다.
                </div>
                <div>현재 오염도: ${s.currentContamination}%</div>
                <div>현재 침식도: ${s.currentErosion}%</div>
            </div>
        </div>

        <div class="injury-status-grid">
            <div class="injury-list left-side">
                ${renderInjuryBlock(['head', 'neck', 'leftEye', 'rightEye'], s, mapKeyToLabel)}
                ${renderInjuryBlock(['leftArm', 'leftHand'], s, mapKeyToLabel)}
                ${renderInjuryBlock(['leftLeg', 'leftFoot'], s, mapKeyToLabel)}
            </div>
            
            <div class="human-icon-container">
                
            </div>
            
            <div class="injury-list right-side">
                ${renderInjuryBlock(['torso'], s, mapKeyToLabel)}
                ${renderInjuryBlock(['rightArm', 'rightHand'], s, mapKeyToLabel)}
                ${renderInjuryBlock(['rightLeg', 'rightFoot'], s, mapKeyToLabel)}
            </div>
        </div>
        
        <h3 style="margin-top: 30px;">📊 현재 통계</h3>
        ${renderHorizontalTable('현재 통계', [
            { label: '죽은 횟수', value: s.stats.deaths },
            { label: '탐사를 나간 횟수', value: s.stats.explorations },
            { label: '면담을 진행한 횟수', value: s.stats.interviews },
            { label: '소지하고 있는 소지품 수', value: s.stats.itemsCarried },
            { label: '심연체를 제압한 횟수', value: s.stats.abyssDefeated },
            { label: '소지 은화', value: s.stats.silverCarried },
        ], isAdmin, true)}

        ${isAdmin ? `<button class="btn link admin-edit-btn" onclick="openStatusEdit(sheetId, ${JSON.stringify(s)})">상태 및 통계 편집</button>` : ''}
    `;
    return section;
}

// 부상도 상세 단락을 렌더링하는 함수 (5-2)
function renderInjuryBlock(parts, status, mapKeyToLabel) {
    let detailRows = '';
    
    parts.forEach(key => {
        const isMainPart = mapKeyToLabel[key].startsWith('<'); // 대표 부위 확인
        const injury = status.injuries[key];
        const contamination = status.contaminations[key];
        
        const [injuryText, contaminationText] = getStatusText(injury, contamination);
        const color = calculatePartColor(injury, contamination);

        if (isMainPart) {
            // 대표 부위: 바로 아래 행을 내용으로 사용 (부상/오염 텍스트)
            detailRows += `
                <div class="injury-row main-part" style="border: 1px solid ${color};">
                    <div class="part-label" style="font-weight: bold;">
                        ${mapKeyToLabel[key].replace(/[<>]/g, '')} (${injury}%, ${contamination}%)
                    </div>
                    <div class="part-content">
                        <p style="color: #ff9999; margin: 0;">부상: ${injuryText}</p>
                        <p style="color: #ccccff; margin: 0;">오염: ${contaminationText}</p>
                    </div>
                </div>
            `;
        } else {
            // 비대표 부위: 두 행과 열 중 왼쪽 세부 부위, 오른쪽 내용
            detailRows += `
                <div class="injury-row sub-part">
                    <div class="sub-label">
                        ${mapKeyToLabel[key]} (${injury}%, ${contamination}%)
                    </div>
                    <div class="sub-content" style="border-left: 1px solid rgba(255,255,255,0.1);">
                        <p style="color: #ff9999; margin: 0;">부상: ${injuryText}</p>
                        <p style="color: #ccccff; margin: 0;">오염: ${contaminationText}</p>
                    </div>
                </div>
            `;
        }
    });

    return `<div class="injury-block">${detailRows}</div>`;
}


/**
 * 가로형 테이블 HTML을 생성합니다.
 * @param {string} title - 표의 제목 (사용하지 않을 수도 있음).
 * @param {Array<Object>} rows - {label: string, value: any, isLong: boolean} 객체 배열.
 * @param {boolean} isAdmin - 관리자 권한 여부.
 * @param {boolean} isStatLike - 스탯/통계와 같이 레이아웃이 단순한 경우.
 * @returns {string} HTML 테이블 마크업.
 */
function renderHorizontalTable(title, rows, isAdmin, isStatLike = false) {
    let rowHtml = '';
    rows.forEach(row => {
        const inputId = `${isStatLike ? 'stat' : 'person'}${row.label.replace(/\s/g, '')}`;
        let valueContent;

        if (isAdmin) {
            // 관리자일 경우 Input 필드로 대체 (편집 모드 가정)
            const inputType = typeof row.value === 'number' ? 'number' : 'text';
            valueContent = row.isLong 
                ? `<textarea id="${inputId}" style="width:100%; min-height:60px;">${row.value}</textarea>`
                : `<input type="${inputType}" id="${inputId}" value="${row.value}" style="width:100%;">`;
        } else {
            // 일반 사용자일 경우 값만 표시
            valueContent = row.value;
        }

        rowHtml += `
            <tr class="horizontal-table-row">
                <td class="table-label" style="font-weight: bold; padding: 8px; background: rgba(255, 255, 255, 0.03); width: 150px;">${row.label}</td>
                <td class="table-value" style="padding: 8px;">${valueContent}</td>
            </tr>
        `;
    });

    return `
        <table class="data-table horizontal" style="width: 100%; margin-top: 10px; border-collapse: collapse;">
            <tbody>
                ${rowHtml}
            </tbody>
        </table>
    `;
}
