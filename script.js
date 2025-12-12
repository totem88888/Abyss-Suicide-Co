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

/**
 * 도감 화면 렌더링 함수
 */
async function renderDex() {
    contentEl.innerHTML = `
        <div class="card">
            <h3>📖 심연 도감</h3>
            <div class="dex-tabs" style="margin-bottom: 20px;">
                <button class="btn dex-tab-btn active" data-dex-type="creature">생물 도감</button>
                <button class="btn dex-tab-btn" data-dex-type="object">물품 도감</button>
            </div>
            <div id="dexContent"></div>
        </div>
    `;

    const dexContentEl = document.getElementById('dexContent');
    const tabBtns = contentEl.querySelectorAll('.dex-tab-btn');

    // 탭 클릭 이벤트 리스너
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.dexType;
            await loadDexContent(type, dexContentEl);
        });
    });

    // 기본적으로 '생물 도감' 로드
    await loadDexContent('creature', dexContentEl);
}

/**
 * 도감 내용을 로드하고 렌더링하는 함수
 * @param {'creature' | 'object'} type 로드할 도감 타입 (생물 또는 물품)
 * @param {HTMLElement} targetEl 내용을 삽입할 DOM 요소
 */
async function loadDexContent(type, targetEl) {
    targetEl.innerHTML = '<div class="muted">도감 데이터 로딩 중...</div>';
    
    try {
        const collectionName = type === 'creature' ? 'creatures' : 'objects';
        const snap = await getDocs(collection(db, collectionName));
        
        targetEl.innerHTML = '';

        if (snap.empty) {
            targetEl.innerHTML = `<div class="muted">등록된 ${type === 'creature' ? '생물' : '물품'} 정보가 없습니다.</div>`;
            return;
        }

        const listContainer = document.createElement('div');
        listContainer.className = 'dex-grid-list';
        listContainer.style.display = 'grid';
        listContainer.style.gap = '15px';
        listContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const card = renderDexCard(docSnap.id, data, type);
            listContainer.appendChild(card);
        });

        targetEl.appendChild(listContainer);

    } catch(e) {
        console.error(`Error loading ${type} dex:`, e);
        targetEl.innerHTML = `<div class="error-msg">도감 로드 실패: ${e.message}</div>`;
    }
}

/**
 * 단일 도감 항목 카드를 렌더링하는 함수
 * @param {string} id 문서 ID
 * @param {object} data 도감 데이터
 * @param {'creature' | 'object'} type 도감 타입
 * @returns {HTMLElement} 렌더링된 카드 요소
 */
function renderDexCard(id, data, type) {
    const isCreature = type === 'creature';
    const name = data.name || '이름 없음';
    const image = data.image || '';
    const description = data.description || '설명 없음';
    const danger = data.danger || (isCreature ? 1 : 0);
    const category = data.category || (isCreature ? '미확인 생물' : '미확인 물품');

    const card = document.createElement('div');
    card.className = 'dex-card card';
    card.style.cursor = 'pointer';
    card.onclick = () => openDexModal(id, data, type); 

    card.innerHTML = `
        <div class="dex-media" style="aspect-ratio: 4/3; background: #333; overflow:hidden; border-radius: 4px 4px 0 0;">
            <img src="${image}" alt="${name}" style="width:100%; height:100%; object-fit: cover;">
        </div>
        <div style="padding: 10px;">
            <div class="muted" style="font-size: 0.8em; margin-bottom: 5px;">${category}</div>
            <h4 style="margin: 0; line-height: 1.2;">${name}</h4>
            <div style="font-size: 0.9em; margin-top: 5px;">
                ${isCreature ? `위험도: ${'★'.repeat(danger)}${'☆'.repeat(5 - danger)}` : ''}
            </div>
            <p style="font-size: 0.8em; margin: 5px 0 0; color: #aaa; height: 3em; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${description}</p>
        </div>
    `;

    return card;
}

const dexModal = document.createElement('dialog');
dexModal.id = 'dexModal';
document.body.appendChild(dexModal);

/**
 * 도감 항목 상세 모달을 띄우는 함수
 * @param {string} id 문서 ID
 * @param {object} data 도감 데이터
 * @param {'creature' | 'object'} type 도감 타입
 */
function openDexModal(id, data, type) {
    const isCreature = type === 'creature';
    const title = data.name || '이름 없음';
    
    // Creature 상세 정보
    const creatureDetails = isCreature ? `
        <p><span class="label">위험도</span> ${'★'.repeat(data.danger || 1)}${'☆'.repeat(5 - (data.danger || 1))}</p>
        <p><span class="label">서식지</span> ${data.habitat || '알 수 없음'}</p>
        <p><span class="label">특징</span> ${data.traits || '특징 없음'}</p>
        <hr>
        <p><span class="label">약점</span> ${data.weakness || '미확인'}</p>
        <p><span class="label">보상</span> ${data.reward || '없음'}</p>
    ` : '';
    
    // Object 상세 정보
    const objectDetails = !isCreature ? `
        <p><span class="label">분류</span> ${data.category || '기타'}</p>
        <p><span class="label">획득처</span> ${data.source || '미확인'}</p>
        <p><span class="label">효능</span> ${data.effect || '없음'}</p>
        <p><span class="label">무게</span> ${data.weight || 0}kg</p>
    ` : '';

    dexModal.innerHTML = `
        <div class="modal-content profile-wide" style="max-width: 600px;">
            <button id="closeDexModal" class="back-btn">← 돌아가기</button>
            <h3 style="margin-top: 10px;">${isCreature ? '생물' : '물품'} 도감: ${title}</h3>
            
            <div class="profile-top">
                <div class="profile-img-wrap" style="flex: none;"><img class="profile-img" src="${data.image || ""}" alt="${title}"></div>
                <div class="profile-info">
                    <p><span class="label">이름</span> ${title}</p>
                    <p><span class="label">분류</span> ${data.category || (isCreature ? '미확인 생물' : '미확인 물품')}</p>
                    <hr>
                    ${creatureDetails}
                    ${objectDetails}
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <p><span class="label">설명</span></p>
                <p style="white-space:pre-line">${data.description || '상세 설명 없음'}</p>
            </div>
            
            <div id="dexEditArea" style="margin-top: 20px;"></div>
        </div>
    `;

    dexModal.showModal();
    document.getElementById("closeDexModal").onclick = () => dexModal.close();

    // 관리자 편집 버튼 추가
    const editArea = document.getElementById("dexEditArea");
    (async () => {
        if (await isAdminUser()) {
            const editBtn = document.createElement("button");
            editBtn.textContent = "편집";
            editBtn.onclick = () => openDexInlineEdit(id, data, type);
            editArea.appendChild(editBtn);
        }
    })();
}

/**
 * 도감 항목 편집 폼을 렌더링하는 함수 (간단화)
 */
function openDexInlineEdit(id, data, type) {
    const isCreature = type === 'creature';
    const editArea = document.getElementById("dexEditArea");

    // 기본 필드
    let html = `
        <h4 style="margin-top: 15px;">편집 모드</h4>
        <div class="edit-grid-inline">
            <label>이름</label><input id="editName" value="${data.name || ''}">
            <label>분류</label><input id="editCategory" value="${data.category || ''}">
            <label>설명</label><textarea id="editDesc">${data.description || ''}</textarea>
            <label>이미지 URL</label><input id="editImage" value="${data.image || ''}">
            <label>이미지 파일 업로드</label><input id="editImageFile" type="file" accept="image/*">
    `;

    // 타입별 필드
    if (isCreature) {
        html += `
            <label>위험도 (1~5)</label><input id="editDanger" type="number" min="1" max="5" value="${data.danger || 1}">
            <label>서식지</label><input id="editHabitat" value="${data.habitat || ''}">
            <label>특징</label><textarea id="editTraits">${data.traits || ''}</textarea>
            <label>약점</label><input id="editWeakness" value="${data.weakness || ''}">
            <label>보상</label><input id="editReward" value="${data.reward || ''}">
        `;
    } else {
        html += `
            <label>획득처</label><input id="editSource" value="${data.source || ''}">
            <label>효능</label><textarea id="editEffect">${data.effect || ''}</textarea>
            <label>무게 (kg)</label><input id="editWeight" type="number" value="${data.weight || 0}">
        `;
    }

    html += `
            <button id="saveDexInline" style="grid-column: 1 / -1; margin-top: 15px;" class="btn">저장</button>
            <button id="deleteDexInline" style="grid-column: 1 / -1; background-color: darkred;" class="btn">삭제</button>
        </div>
    `;
    
    editArea.innerHTML = html;

    const collectionName = isCreature ? 'creatures' : 'objects';
    
    document.getElementById("saveDexInline").onclick = async () => {
        const loadingMsg = document.createElement('div');
        loadingMsg.textContent = '저장 중...';
        editArea.appendChild(loadingMsg);
        
        let finalImg = document.getElementById("editImage").value;
        const file = document.getElementById("editImageFile").files[0];

        if (file) {
            const storageRef = ref(storage, `${collectionName}/${id}_${Date.now()}.png`);
            await uploadBytes(storageRef, file);
            finalImg = await getDownloadURL(storageRef);
        }

        const newData = {
            name: document.getElementById("editName").value,
            category: document.getElementById("editCategory").value,
            description: document.getElementById("editDesc").value,
            image: finalImg,
            updatedAt: serverTimestamp()
        };

        if (isCreature) {
            newData.danger = Number(document.getElementById("editDanger").value);
            newData.habitat = document.getElementById("editHabitat").value;
            newData.traits = document.getElementById("editTraits").value;
            newData.weakness = document.getElementById("editWeakness").value;
            newData.reward = document.getElementById("editReward").value;
        } else {
            newData.source = document.getElementById("editSource").value;
            newData.effect = document.getElementById("editEffect").value;
            newData.weight = Number(document.getElementById("editWeight").value);
        }

        try {
            await updateDoc(doc(db, collectionName, id), newData);
            showMessage('도감 항목 저장 완료', 'info');
            
            // 모달 갱신 및 목록 갱신
            dexModal.close();
            await renderDex();
        } catch(e) {
            showMessage('저장 실패: ' + e.message, 'error');
            loadingMsg.textContent = '저장 실패';
            console.error(e);
        } finally {
            loadingMsg.remove();
        }
    };
    
    document.getElementById("deleteDexInline").onclick = async () => {
        if (await showConfirm('정말로 이 도감 항목을 삭제하시겠습니까?')) {
            try {
                await deleteDoc(doc(db, collectionName, id));
                showMessage('도감 항목 삭제 완료', 'info');
                dexModal.close();
                await renderDex();
            } catch(e) {
                showMessage('삭제 실패: ' + e.message, 'error');
                console.error(e);
            }
        }
    };
}
