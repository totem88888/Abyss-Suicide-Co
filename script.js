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

async function uploadStaffImage(file, uid) {
    const storageRef = ref(storage, `staff/${uid}_${Date.now()}.png`);
    await uploadBytes(storageRef, file);
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

function fmtTime(ts) {
    if (!ts) return '';
    try {
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString();
    } catch(e) {
        return String(ts);
    }
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
        case 'me': 
            // await renderMe(); // renderMe 함수 없음, 임시 처리
            contentEl.innerHTML = '<div class="card">내 정보 기능 준비중</div>';
            break;
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
    cardInner.innerHTML = `
        <div class="map-edit-form card-dark">
            <h4>맵 편집 (ID: ${mapId})</h4>
            <div class="edit-grid-inline">
                <label>이름</label><input id="editMapName" value="${data.name || ''}">
                <label>위험도 (1~5)</label><input id="editMapDanger" type="number" min="1" max="5" value="${data.danger || 1}">
                <label>출현 타입 (쉼표 구분)</label><input id="editMapTypes" value="${Array.isArray(data.types) ? data.types.join(', ') : (data.types || '')}">
                <label>설명</label><textarea id="editMapDesc">${data.description || ''}</textarea>
                <label>이미지 URL</label><input id="editMapImage" value="${data.image || ''}">
                <label>이미지 파일 업로드</label><input id="editMapImageFile" type="file" accept="image/*">
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button id="saveMapInline" class="btn">저장</button>
                <button id="cancelMapInline" class="btn link">취소</button>
                <button id="deleteMapInline" class="btn" style="background-color: darkred; margin-left: auto;">맵 삭제</button>
            </div>
        </div>
    `;

    // 저장 로직
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

    // 취소 로직
    document.getElementById("cancelMapInline").onclick = () => {
        cardInner.innerHTML = originalContent; // 원래 내용으로 복구
        // 취소 후 관리자 버튼 재활성화 등을 위해 카드만 리로드
        renderMap();
    };
    
    // 삭제 로직
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
     const mapAddBtn = contentEl.querySelector('.btn'); // 첫 번째 버튼(새 맵 추가)
     contentEl.insertBefore(tempEl, mapAddBtn.nextSibling);

     const newMapData = {
         name: '', danger: 1, types: '', description: '', image: ''
     };

     // 편집 폼 렌더링
     tempEl.innerHTML = `
        <div class="map-card-inner" data-id="new">
            <div class="map-edit-form card-dark">
                <h4>새 맵 생성</h4>
                <div class="edit-grid-inline">
                    <label>이름</label><input id="newMapName" value="">
                    <label>위험도 (1~5)</label><input id="newMapDanger" type="number" min="1" max="5" value="1">
                    <label>출현 타입 (쉼표 구분)</label><input id="newMapTypes" value="">
                    <label>설명</label><textarea id="newMapDesc"></textarea>
                    <label>이미지 URL</label><input id="newMapImage" value="">
                    <label>이미지 파일 업로드</label><input id="newMapImageFile" type="file" accept="image/*">
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button id="saveNewMapInline" class="btn">생성</button>
                    <button id="cancelNewMapInline" class="btn link">취소</button>
                </div>
            </div>
        </div>
     `;
     
     // 저장 로직
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
    
    // 취소 로직
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

async function uploadMapImage(file, mapId) {
    const storageRef = ref(storage, `maps/${mapId || 'tmp'}_${Date.now()}.png`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

function renderMapCard(mapDoc) {
    const mapId = mapDoc.id;
    const data = mapDoc.data ? mapDoc.data() : mapDoc;
    const img = data.image || '';
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

// --- 유틸리티 및 헬퍼 함수 (추가) ---

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
 * DB에 데이터를 저장하는 스텁 함수 (실제 DB 연동 로직 구현 필요)
 */
async function saveAbyssData(id, data) {
    showMessage('데이터를 Firebase에 저장 중...', 'info');
    try {
        // 실제로는 data 객체의 유효성을 검사하고 Firestore에 updateDoc/setDoc을 호출해야 함.
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 딜레이 시뮬레이션
        await setDoc(doc(db, 'abyssal_dex', id), data, { merge: true });
        showMessage('저장 완료!', 'success');
    } catch (error) {
        console.error("Error saving data:", error);
        throw error;
    }
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


// --- 기존의 renderDex, createNewAbyss, renderDexDetail 함수는 위에 제공된 코드를 그대로 사용합니다. ---
// (중복된 renderBasicInfoSection 함수는 삭제해야 합니다.)

// --- 댓글 관련 함수 (fmtTime, postDexComment, openCommentsPopup) 스텁 ---

/**
 * Firebase Timestamp를 포맷하는 스텁 함수
 */
function fmtTime(timestamp) {
    if (!timestamp) return '방금';
    // 실제로는 timestamp.toDate().toLocaleString() 등을 사용해야 함.
    return '2025.12.12'; 
}

/**
 * 댓글을 DB에 포스팅하는 스텁 함수
 */
async function postDexComment(abyssId, text) {
    console.log(`[STUB] 댓글 등록: ${abyssId}, ${text}`);
    // 실제로는 Firestore에 addDoc(collection(db, 'abyssal_dex', abyssId, 'comments'), { ... }) 호출
    await new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * 전체 댓글 팝업을 여는 스텁 함수
 */
function openCommentsPopup(id, collectionName) {
    alert(`[STUB] ${collectionName}/${id}의 전체 댓글을 팝업으로 표시합니다.`);
}

// --- 중복된 함수를 제거하고 나머지 코드를 이어서 붙여넣으면 됩니다. ---
// **주의: 중복된 `renderBasicInfoSection`는 반드시 제거해야 합니다.**

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

