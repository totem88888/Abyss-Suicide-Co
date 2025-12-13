/* =========================================================
    firebase 불러오기
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


/* =========================================================
    firebase 콘픽
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyDGmwk9FtwnjUKcH4T6alvMWVQqbhVrqfI",
    authDomain: "abyss-suicide-co.firebaseapp.com",
    projectId: "abyss-suicide-co",
    storageBucket: "abyss-suicide-co.firebasestorage.app",
    messagingSenderId: "711710259422",
    appId: "1:711710259422:web:3c5ba7c93edb3d6d6baa4f"
};

/* =========================================================
    firebase 초기화
========================================================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* =========================================================
    DOM 요소 참조/선언
========================================================= */

const header = document.getElementById('header');
const navEl = document.getElementById('nav');
const contentEl = document.getElementById('content');
const abyssFlowEl = document.getElementById('abyssFlow');
const staffStatusEl = document.getElementById('staffStatus');
const staffScheduleEl = document.getElementById('staffSchedule');
const staffRankEl = document.getElementById('staffRank');

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

const DEFAULT_MAP_IMAGE = './images/default-map.png';
const DEFAULT_PROFILE_IMAGE = './images/default-profile.png';

let currentUser = null;

/* =========================================================
    데이터 값 선언
========================================================= */

const baseStats = {
    muscle: 1, agility: 1, endurance: 1,flexibility: 1, visual: 1, auditory: 1, situation: 1, reaction: 1, intellect: 1, judgment: 1, memory: 1, spirit: 1, decision: 1, stress: 1
};

const TABS = [
    { id: 'main', title: '메인' },
    { id: 'staff', title: '직원' },
    { id: 'me', title: '내 상태' },
    { id: 'map', title: '맵' },
    { id: 'dex', title: '도감' }
];

function mapStatKeyToLabel(key) {
    const map = {
        muscle: '근력', agility: '민첩', endurance: '지구력', flexibility: '유연성', 
        visual: '시각', auditory: '청각', situation: '상황 인지 능력', reaction: '반응속도', 
        intellect: '지능', judgment: '판단력', memory: '기억력', spirit: '정신력', 
        decision: '의사 결정 능력', stress: '스트레스 내성',
        currentHP: '현재 체력', maxHP: '최대 체력',
        currentSpirit: '현재 정신력', maxSpirit: '최대 정신력'
    };
    return map[key] || key;
}

const DANGER_TYPES = {
    '유광': '유광',
    '해수': '해수',
    '심해': '심해',
    '파생': '파생' // 파생은 코드명 규칙이 다름
};

const SHAPE_TYPES = ['P', 'F', 'O', 'C'];

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

/* =========================================================
    어드민 확인
========================================================= */

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

/* =========================================================
    css
========================================================= */

/* =========================================================
    메세지 출력
========================================================= */

// 공통 스타일 적용 함수
function applyStyles(el, styles) {
    Object.assign(el.style, styles);
}

// 브라우저 상단 메시지 표시
function showMessage(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `in-browser-msg ${type}`;
    el.textContent = msg;

    applyStyles(el, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#222',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '6px',
        zIndex: 9999,
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        fontFamily: 'sans-serif',
        textAlign: 'center'
    });

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// 브라우저 전체 확인 팝업
function showConfirm(msg) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen confirm-popup';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div>${msg}</div>
            <div style="display:flex; justify-content:center; gap:12px; margin-top:12px;">
                <button class="btn confirm-yes">확인</button>
                <button class="btn confirm-no">취소</button>
            </div>
        `;

        applyStyles(overlay, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
        });

        applyStyles(card, {
            maxWidth: '400px',
            width: '90%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'center'
        });

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        card.querySelector('.confirm-yes').onclick = () => { resolve(true); overlay.remove(); };
        card.querySelector('.confirm-no').onclick = () => { resolve(false); overlay.remove(); };
    });
}

/* =========================================================
    UI 관련
========================================================= */

function renderDangerStars(level, max = 5) {
    return '★'.repeat(level) + '☆'.repeat(max - level);
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

/* =========================================================
    컬러 코드
========================================================= */

/**
 * 단색 프로필 배경 밝기 계산 (대략)
 * @param {string} hex - 16진수 색상 코드 (#RRGGBB)
 * @returns {number} 밝기 값
 */
function getBrightness(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (r*299 + g*587 + b*114)/1000;
}

function calculatePartColor(injury, contamination) {
    // 0~100 스케일을 0~1로 변환
    const i = Math.min(100, injury) / 100;
    const c = Math.min(100, contamination) / 100;

    // R: 오염도 기반, G: 낮게 유지, B: 부상+오염 기반
    let r = Math.round(i * 10 + c * 100);
    let g = Math.round(i * 10 + c * 10);
    let b = Math.round(i * 150 + c * 150);

    // 부상/오염 모두 없으면 매우 옅은 색
    if (i === 0 && c === 0) return 'rgba(255, 255, 255, 0.1)';

    // 색상 포화도 보정 (최대값 제한)
    r = Math.min(200, r + 50);
    g = Math.min(200, g + 50);
    b = Math.min(255, b + 50);

    return `rgb(${r}, ${g}, ${b})`;
}


/* =========================================================
   방사형 그래프 만들기
========================================================= */

const radarCharts = {};

// 얘는 평소에 쓰이는 거
/**
 * 범용 레이더 차트 생성/업데이트
 * @param {string} containerClass 차트를 그릴 div 클래스
 * @param {string[]} labels 축 이름
 * @param {number[]} data 값
 * @param {number} max 최대값
 * @param {string} bgColor 배경색
 * @param {string} borderColor 테두리색
 */
function drawRadarChart(containerClass, labels, data, max = 5, bgColor = 'rgba(0,0,0,0.1)', borderColor = '#000') {
    const container = document.querySelector(`.${containerClass}`);
    if (!container) return;

    // 기존 캔버스 제거 후 새 캔버스 생성
    container.innerHTML = `<canvas id="${containerClass}-canvas"></canvas>`;
    const ctx = document.getElementById(`${containerClass}-canvas`);
    if (!ctx) return;

    if (radarCharts[containerClass]) radarCharts[containerClass].destroy();

    const clamp = v => Math.max(0, Number(v));

    radarCharts[containerClass] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '스테이터스 레벨',
                data: data.map(clamp),
                backgroundColor: bgColor,
                borderColor: borderColor,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: borderColor
            }]
        },
        options: {
            responsive: true,
            aspectRatio: 1,
            scales: {
                r: {
                    min: 0,
                    max: max,
                    ticks: {
                        stepSize: 1,
                        color: 'rgba(255,255,255,0.7)',
                        backdropColor: 'rgba(0,0,0,0.5)'
                    },
                    pointLabels: {
                        color: 'rgba(255,255,255,0.9)',
                        font: { size: 11 }
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    angleLines: { color: 'rgba(255,255,255,0.2)' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 세부 정보 테이블(직원 탭에 넣어야지)

/**
 * 스테이터스 객체를 받아서 신체/정신 차트 그리기
 * @param {object} stats 스테이터스 객체
 */
function initStatsRadarCharts(stats) {
    if (typeof Chart === 'undefined') return console.warn('Chart.js library not loaded');

    // 신체 스테이터스
    drawRadarChart(
        'chart-container-1',
        ['근력','민첩','지구력','유연성','시각','청각','상황 인지 능력','반응속도'],
        [stats.muscle, stats.agility, stats.endurance, stats.flexibility, stats.visual, stats.auditory, stats.situation, stats.reaction],
        5,
        'rgba(255,99,132,0.2)',
        'rgb(255,99,132)'
    );

    // 정신 스테이터스
    drawRadarChart(
        'chart-container-2',
        ['지능','판단력','기억력','정신력','의사 결정 능력','스트레스 내성'],
        [stats.intellect, stats.judgment, stats.memory, stats.spirit, stats.decision, stats.stress],
        5,
        'rgba(54,162,235,0.2)',
        'rgb(54,162,235)'
    );
}

/* =========================================================
   가로형 테이블
========================================================= */

function renderHorizontalTable(title, rows, isAdmin, isStatLike = false) {
    const rowHtml = rows.map(row => {
        const inputId = `${isStatLike ? 'stat' : 'person'}${row.label.replace(/\s/g, '')}`;
        const valueContent = isAdmin
            ? (row.isLong 
                ? `<textarea id="${inputId}" style="width:100%; min-height:60px;">${row.value}</textarea>`
                : `<input type="${typeof row.value === 'number' ? 'number' : 'text'}" id="${inputId}" value="${row.value}" style="width:100%;">`)
            : row.value;

        return `
            <tr class="horizontal-table-row">
                <td class="table-label" style="font-weight: bold; padding: 8px; background: rgba(255,255,255,0.03); width: 150px;">${row.label}</td>
                <td class="table-value" style="padding: 8px;">${valueContent}</td>
            </tr>
        `;
    }).join('');

    return `
        <table class="data-table horizontal" style="width:100%; margin-top:10px; border-collapse:collapse;">
            <tbody>${rowHtml}</tbody>
        </table>
    `;
}


/* =========================================================
    시간 함수
========================================================= */
 
// 현재 시간 확인. 사이드 바에 띄우는 용
function startClock() {
    function tick() {
        const d = new Date();
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        if(nowTimeEl) nowTimeEl.textContent = d.toLocaleString(undefined, options);
    }
    tick();
    setInterval(tick, 1000);
}

// 메세지 표시에 사용, 몇 시간 전이었는지 표시한다
function fmtTime(timestamp) {
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

/* =========================================================
    인증 상태 변화 감지 및 유지
========================================================= */

onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
        const nickname = user.displayName || '인턴 사원';

        await checkAndCreateSheet(user.uid, nickname);

        showLoggedInUI();
        renderAuthArea(user);
        initNav();
        loadTab('main');
        startClock();
        subscribeSystem();

        await renderMain();
        await renderMap();
        await renderStaff();
        await renderDex();
        await renderMe();

    } else {
        currentUser = null;

        // 로그아웃 UI
        showLogOutUI();
    }
});

async function getCurrentUserSheetId() {
    if (auth.currentUser) return auth.currentUser.uid;

    return new Promise(resolve => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user ? user.uid : null);
        });
    });
}

async function checkAndCreateSheet(uid, nickname) {
    const sheetDocRef = doc(db, 'sheets', uid);
    const sheetDoc = await getDoc(sheetDocRef);

    if (!sheetDoc.exists()) {
        const defaultSheetData = createDefaultSheet(uid, nickname);
        await setDoc(sheetDocRef, defaultSheetData);
        console.log(`Default sheet created for user: ${uid}`);

        openNewUserCustomization(uid, nickname);
    }
}


/* =========================================================
    댓글
========================================================= */

// 댓글 카드. 미리보기+더보기랑 댓글 입력...
/**
 * 댓글 카드 생성
 * @param {string} id - 댓글 대상 ID (맵, 덱 등)
 * @param {string} dbCollection - 댓글이 저장될 Firestore 컬렉션 이름
 * @returns {HTMLElement} 댓글 카드 DOM
 */
function renderCommentCard({ id, dbCollection = 'maps' }) {
    const el = document.createElement('div');
    el.className = 'comment-card card';
    el.innerHTML = `
        <div class="comment-card-inner" data-id="${id}">
            <div class="comment-input-area" style="margin-bottom: 15px;">
                <input type="text" id="commentInput-${id}" placeholder="댓글 작성 (엔터로 등록)"
                       style="width:100%; padding:8px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.1); color:inherit;">
            </div>
            <div class="comments-preview">
                <div class="comments-count muted">댓글 0개</div>
                <div class="comments-list"></div>
                <div class="comments-more" style="display:none">
                    <button class="link more-comments">더보기</button>
                </div>
            </div>
        </div>
    `;

    attachCommentListeners({ el, id, dbCollection });
    return el;
}

// 버튼 이벤트+미리보기 로드
function attachCommentListeners({ el, id, dbCollection }) {
    const inputEl = el.querySelector(`#commentInput-${id}`);

    if (inputEl) {
        inputEl.addEventListener('keydown', async e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = inputEl.value.trim();
                if (!text) return;
                await postComment({ id, text, dbCollection });
                inputEl.value = '';
                loadCommentPreview({ el, id, dbCollection });
            }
        });
    }

    el.querySelector('.more-comments')?.addEventListener('click', () => openCommentsPopup(id, dbCollection));

    loadCommentPreview({ el, id, dbCollection });
}

// db에서 댓글 불러와서 미리보기 표시
async function loadCommentPreview({ el, id, dbCollection }) {
    try {
        const snap = await getDocs(collection(db, dbCollection, id, 'comments'));
        const arr = [];
        snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
        arr.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        const preview = arr.slice(0, 3);

        const listEl = el.querySelector('.comments-list');
        const countEl = el.querySelector('.comments-count');
        countEl.textContent = `댓글 ${arr.length}개`;

        if (!preview.length) listEl.innerHTML = `<div class="muted">댓글이 없습니다.</div>`;
        else {
            listEl.innerHTML = '';
            preview.forEach(c => {
                const brightness = getBrightness(c.userColor || '#CCCCCC');
                const iconColor = brightness > 125 ? 'black' : 'white';
                const item = document.createElement('div');
                item.className = 'comment-item';
                item.style.display = 'flex';
                item.style.gap = '10px';
                item.style.marginBottom = '10px';
                item.innerHTML = `
                    <div style="width:30px; height:30px; border-radius:50%; background-color:${c.userColor||'#CCCCCC'};
                                display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-icons" style="font-size:20px; color:${iconColor}">person</span>
                    </div>
                    <div style="flex-grow:1;">
                        <div style="font-weight:bold;">${c.name||'익명'}</div>
                        <div style="font-size:0.8em; color:#aaa;">${fmtTime(c.createdAt)}${c.editedAt ? ' (수정됨)' : ''}</div>
                        <div>${c.text}</div>
                    </div>
                `;
                listEl.appendChild(item);
            });
        }

        const moreBtn = el.querySelector('.more-comments');
        moreBtn.style.display = arr.length > 3 ? 'inline-block' : 'none';

    } catch(e) {
        console.error('댓글 로드 실패', e);
    }
}

// 댓글 등록
async function postComment({ id, text, dbCollection }) {
    const user = auth.currentUser;
    if (!user) return showMessage('로그인이 필요합니다.', 'warning');

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    await addDoc(collection(db, dbCollection, id, 'comments'), {
        uid: user.uid,
        name: userData.nickname || '익명',
        userColor: userData.colorHex || '#CCCCCC',
        text,
        createdAt: serverTimestamp(),
        editedAt: null
    });
}

/* =========================================================
    로그인
========================================================= */

// 버튼 누르면 반대로 바꿔주어요
function switchAuthMode(mode) {
    const isSignup = mode === 'signup';

    loginForm.style.display = isSignup ? 'none' : 'block';
    signupForm.style.display = isSignup ? 'block' : 'none';

    loginBoxMsg.textContent = '';
    signupBoxMsg.textContent = '';

    document.getElementById('loginTitle').textContent =
        isSignup ? '회원가입' : '로그인';
}

// 회원가입/로그인으로 가기 버튼
gotoSignupBth.addEventListener('click', () => {
    switchAuthMode('signup');
});

gotoLoginBth.addEventListener('click', () => {
    switchAuthMode('login');
});

// 엔터 누르면 자동 로그인
loginForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); loginBth.click(); }
});

signupForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); signupBth.click(); }
});

// 회원가입
signupBth.addEventListener('click', async ()=> {
    signupBoxMsg.textContent = '';

    const id = signupId.value.trim();
    const email = signupEmail.value.trim();
    const pw = signupPassword.value;
    const nick = signupNickname.value.trim();

    if (!id) {
        signupBoxMsg.textContent = '아이디를 입력해 주세요.';
        return;
    }
    if (!nick) {
        signupBoxMsg.textContent = '닉네임을 입력해 주세요.';
        return;
    }
    if (!email || !pw) {
        signupBoxMsg.textContent = '이메일과 비밀번호를 입력해 주세요.';
        return;
    }

    signupBth.disabled = true;

    try {
        const idQuery = query(
            collection(db, 'users'),
            where('id', '==', id)
        );
        const idSnap = await getDocs(idQuery);

        if (!idSnap.empty) {
            signupBoxMsg.textContent = '이미 사용 중인 아이디입니다.';
            return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        const user = cred.user;
        const uid = user.uid;

        await updateProfile(user, {
            displayName: nick
        });

        await setDoc(doc(db, 'users', uid), {
            email,
            id,
            nickname: nick,
            colorHex: randomHex(),
            decorations: [],
            silver: 0,
            createdAt: serverTimestamp()
        });
        await setDoc(doc(db, 'staff', uid), {
            uid,
            name: nick,
            status: 'alive',
            image: '',
            silver: 0,
            desc: '',
            updatedAt: serverTimestamp()
        });

        const defaultSheet = createDefaultSheet(uid, nick);
        await setDoc(doc(db, 'sheets', uid), defaultSheet);

        signupBoxMsg.textContent = '가입 완료. 설정을 진행합니다.';

        openNewUserCustomization(uid, nick);

    } catch (e) {
        console.error(e);

        let msg = '가입 중 오류가 발생했습니다.';
        if (e.code === 'auth/email-already-in-use') {
            msg = '이미 사용 중인 이메일입니다.';
        } else if (e.code === 'auth/weak-password') {
            msg = '비밀번호가 너무 약합니다.';
        }

        signupBoxMsg.textContent = msg;
    } finally {
        signupBth.disabled = false;
    }
});

// 로그인
loginBth.addEventListener('click', async () => {
    loginBoxMsg.textContent = '';

    const id = loginId.value.trim();
    const pw = loginPassword.value;

    if (!id || !pw) {
        loginBoxMsg.textContent = '아이디와 비밀번호를 입력해 주세요.';
        return;
    }

    loginBth.disabled = true;

    try {
        const q = query(
            collection(db, 'users'),
            where('id', '==', id)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            loginBoxMsg.textContent = '존재하지 않는 아이디입니다.';
            return;
        }

        if (snap.size > 1) {
            // 데이터 무결성 문제
            console.error('Duplicate user id:', id);
            loginBoxMsg.textContent = '계정 데이터에 문제가 있습니다.';
            return;
        }

        const { email } = snap.docs[0].data();

        await signInWithEmailAndPassword(auth, email, pw);

        loginBoxMsg.textContent = '로그인 성공.';
    } catch (e) {
        console.error(e);

        let msg = '로그인에 실패했습니다.';
        if (e.code === 'auth/wrong-password') {
            msg = '비밀번호가 올바르지 않습니다.';
        } else if (e.code === 'auth/user-disabled') {
            msg = '비활성화된 계정입니다.';
        }

        loginBoxMsg.textContent = msg;
    } finally {
        loginBth.disabled = false;
    }
});

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

function renderAuthArea(user){
    logOutEl.innerHTML = '';
    if (!user) return;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = '로그아웃';
    btn.addEventListener('click', ()=> signOut(auth));
    logOutEl.appendChild(btn);
}

/* =========================================================
    본인 시트 작성
========================================================= */

// 커스터마이징 팝업
function openNewUserCustomization(uid, nickname) {
    const defaultData = createDefaultSheet(uid, nickname);
    const p = defaultData.personnel;
    const s = defaultData.stats;
    
    // 인적사항 입력 폼
    const personnelForm = `
        <h3 style="border-bottom: 1px solid #333; padding-bottom: 10px;">기본 인적사항 설정</h3>
        <p style="color: #aaa;">(${nickname}님을 위한 초기 설정입니다. 이름은 수정 불가능합니다.)</p>
        <div class="form-row">
            <label>이름</label> <input type="text" value="${p.name}" disabled>
        </div>
        <div class="form-row">
            <label>성별</label> 
            <select id="custGender">
                <option value="남성">남성</option>
                <option value="여성">여성</option>
            </select>
        </div>
        <div class="form-row"><label>나이</label> <input type="number" id="custAge" value="${p.age || 20}"></div>
        <div class="form-row"><label>키 (cm)</label> <input type="number" id="custHeight" value="${p.height || 170}"></div>
        <div class="form-row"><label>체중 (kg)</label> <input type="number" id="custWeight" value="${p.weight || 60}"></div>
    `;

    // 스테이터스 입력 폼 (슬라이더 및 총 포인트 제한 로직은 프론트엔드에서 구현 필요)
    const statsKeys = Object.keys(baseStats || {});
    let statsForm = `<h3 style="border-bottom: 1px solid #333; padding: 10px 0;">기본 스테이터스 설정 (총 포인트 제한: 55)</h3>`;
    let currentTotal = statsKeys.reduce(
        (sum, key) => sum + (baseStats[key] || 1),
        0
    );
    statsForm += `<p style="color: yellow; margin-bottom: 15px;">현재 사용 포인트: <span id="currentPoints">${currentTotal}</span> / 55</p>`;

    statsKeys.forEach(key => {
        const label = mapStatKeyToLabel(key);
        statsForm += `
            <div class="form-row stat-row">
                <label style="width: 150px;">${label}</label>
                <input type="range" id="stat-${key}" min="1" max="5" value="${baseStats[key] || 1}" class="stat-slider">
                <span id="value-${key}" class="stat-value">${baseStats[key] || 1}</span>
            </div>
        `;
    });
    
    // 팝업 HTML (실제 팝업/모달 라이브러리 사용 가정)
    const popupContent = `
        <div class="customization-popup">
            <h2>캐릭터 생성: 초기 설정</h2>
            <div style="display: flex; gap: 30px;">
                <div style="flex: 1;">${personnelForm}</div>
                <div style="flex: 1;">${statsForm}</div>
            </div>
            <button id="saveCustomSheetBtn" class="btn primary" style="width: 100%; margin-top: 20px;">설정 저장 및 시트 시작</button>
        </div>
    `;

    // showPopup(popupContent); // 실제 팝업/모달을 띄우는 함수 호출 가정
    // 임시로 body에 삽입
    document.body.insertAdjacentHTML('beforeend', `<div id="custModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;"><div class="card" style="width: 700px; max-height: 80vh; overflow-y: auto;">${popupContent}</div></div>`);


    // 이벤트 리스너 부착
    document.getElementById('saveCustomSheetBtn').onclick = () => {
        if (typeof saveCustomizedSheet === 'function') {
            saveCustomizedSheet(uid, nickname);
        }
        document.getElementById('custModal')?.remove(); // 팝업 닫기
    };
    
    // 슬라이더 변경 이벤트 처리 (포인트 합계 계산)
    document.querySelectorAll('.stat-slider').forEach(slider => {
        slider.addEventListener('input', updateStatPoints);
    });

    updateStatPoints(); // 초기 포인트 계산
}

// 포인트 계산
function updateStatPoints() {
    let totalPoints = 0;

    document.querySelectorAll('.stat-slider').forEach(slider => {
        const value = parseInt(slider.value, 10) || 0;
        totalPoints += value;

        const valueEl = document.getElementById(
            `value-${slider.id.replace('stat-', '')}`
        );
        if (valueEl) valueEl.textContent = value;
    });

    const currentPointsEl = document.getElementById('currentPoints');
    const saveBtn = document.getElementById('saveCustomSheetBtn');

    if (!currentPointsEl) return;

    currentPointsEl.textContent = totalPoints;
    currentPointsEl.style.color = totalPoints > 55 ? 'red' : 'lime';

    if (saveBtn) {
        saveBtn.disabled = totalPoints > 55;
    }
}

// 시트값 저장
async function saveCustomizedSheet(uid, nickname) {
    const initialSheet = createDefaultSheet(uid, nickname);
    
    const $ = id => document.getElementById(id);

    const personnel = {
        ...initialSheet.personnel,
        gender: $('custGender')?.value || initialSheet.personnel.gender,
        age: parseInt($('custAge')?.value, 10) || initialSheet.personnel.age,
        height: parseInt($('custHeight')?.value, 10) || initialSheet.personnel.height,
        weight: parseInt($('custWeight')?.value, 10) || initialSheet.personnel.weight,
    };
    
    const stats = {
        ...initialSheet.stats
    };

    document.querySelectorAll('.stat-slider').forEach(slider => {
        const key = slider.id.replace('stat-', '');
        stats[key] = parseInt(slider.value, 10) || 1;
    });

    const finalSheetData = {
        ...initialSheet,
        personnel: personnel,
        stats: stats,
        status: {
            ...initialSheet.status,
            maxSpirit: (10 * (stats.spirit || 1)) + 50,
            currentSpirit: (10 * (stats.spirit || 1)) + 50,
        },
        updatedAt: serverTimestamp()
    };
    
    try {
        await setDoc(doc(db, 'sheets', uid), finalSheetData); 
        showMessage('캐릭터 시트가 성공적으로 저장되었습니다.', 'success');
        
        renderMe(); 
        
    } catch(e) {
        console.error("커스터마이징 시트 저장 실패:", e);
        showMessage('시트 저장에 실패했습니다. 다시 시도해 주세요.', 'error');
    }
}

/* =========================================================
    탭 메뉴 로드
========================================================= */

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

function setActiveNav(tabId) {
    navEl.querySelectorAll('button').forEach( b => b.classList.toggle('active', b.dataset.tab === tabId));
}

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

/* =========================================================
   매인 탭
========================================================= */

async function renderMain() {
    contentEl.innerHTML = '';

    createMainUICards();

    try {
        await updateAbyssFlow(); // 심연 기류
        await updateStaffStatusAndSchedule(); // 일정 및 상태
        await updateStaffRank(); // 순위
        document.getElementById('todayEvent').textContent = '이벤트 데이터 없음'; // 임시
    } catch(e) {
        console.error(e);
        contentEl.innerHTML += `<div class="card muted">데이터 로드 실패</div>`;
    }
}

// 얜 카드만 넣어여
function createMainUICards() {
    const flowCard = document.createElement('div');
    flowCard.className = 'card';
    flowCard.innerHTML = `<div class="muted">심연 상태</div><h3 id="abyssFlow">불러오는 중...</h3>`;
    contentEl.appendChild(flowCard);

    const statusCard = document.createElement('div');
    statusCard.className = 'card';
    statusCard.innerHTML = `
        <div class="muted">직원 현황</div>
        <div id="staffStatus">불러오는 중...</div>
        <div class="muted" style="margin-top:10px;">일정</div>
        <div id="staffSchedule">불러오는 중...</div>
    `;
    contentEl.appendChild(statusCard);

    const eventCard = document.createElement('div');
    eventCard.className = 'card';
    eventCard.innerHTML = `<div class="muted">오늘의 이벤트</div><div id="todayEvent">불러오는 중...</div>`;
    contentEl.appendChild(eventCard);

    const rankCard = document.createElement('div');
    rankCard.className = 'card';
    rankCard.innerHTML = `<div class="muted">직원 순위</div><div id="staffRank">불러오는 중...</div>`;
    contentEl.appendChild(rankCard);
}

// 심연 기류
async function updateAbyssFlow() {
    if (!abyssFlowEl) return;

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
        abyssFlowEl.textContent = '오늘 심연은 ' + flowText + '습니다.';
    } else if (cfgSnap.exists()) {
        const flows = cfgSnap.data().flows || [];
        if (flows.length > 0) {
            const picked = pickByWeight(flows);
            await setDoc(todayRef, { flowText: picked, dateKey: todayKey, updatedAt: serverTimestamp() });
            abyssFlowEl.textContent = '오늘 심연은 ' + picked + '습니다.';
        } else {
            abyssFlowEl.textContent = '기류 데이터 없음';
        }
    } else {
        abyssFlowEl.textContent = '기류 설정 없음';
    }
}

// 일정 & 상태
async function updateStaffStatusAndSchedule() {
    const usersSnap = await getDocs(collection(db, 'users'));
    let alive=0, missing=0, dead=0, contaminated=0;

    usersSnap.forEach(docu => {
        const d = docu.data();
        const s = d.status || 'alive';
        if (s === 'alive') alive++;
        else if (s === 'missing') missing++;
        else if (s === 'dead') dead++;
        else if (s === 'contaminated') contaminated++;
    });

    if (staffStatusEl) {
        staffStatusEl.innerHTML = `
            <div>생존: ${alive} | 실종: ${missing} | 오염: ${contaminated} | 사망: ${dead}</div>
        `;
    }

    // 일정 로드
    const daySnap = await getDoc(doc(db, 'system', 'day'));
    let currentDay = daySnap.exists() ? (daySnap.data().currentDay || 1) : 1;
    const schedSnap = await getDoc(doc(db, 'schedule', 'days'));

    if (staffScheduleEl) {
        if (schedSnap.exists()) {
            const daysData = schedSnap.data().days || {};
            // 현재 요일 / 일차에 맞게 조정 필요
            const todayList = daysData['월요일'] || [];
            staffScheduleEl.innerHTML = todayList.length > 0 ? todayList.map(t => `<div>${t}</div>`).join('') : `월요일 일정 없음`;
        } else {
            staffScheduleEl.textContent = '스케줄 데이터 없음';
        }
    }
}

// 직원 순위 계산 
async function updateStaffRank() {
    if (!staffRankEl) return;

    const usersSnap = await getDocs(collection(db, 'users'));
    let maxSilver = -1, minDeath = 999999;
    let topSilverName = '-', topSurvivorName = '-';

    usersSnap.forEach(docu => {
        const d = docu.data();
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

    staffRankEl.innerHTML = `
        <div>은화: ${topSilverName} (${maxSilver}) | 생존왕: ${topSurvivorName} (${minDeath})</div>
    `;
}

/* =========================================================
   직원 탭
========================================================= */

// 일단 로드하다
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

// 세부적 프로필
async function openProfileModal(docId, data) {
    profileModal.innerHTML = `
        <div class="modal-content profile-wide">
            <button id="closeProfile" class="back-btn">← 돌아가기</button>

            <div class="profile-top">
                <div class="profile-img-wrap">
                    <img class="profile-img" src="${data.image || ''}" alt="">
                </div>
                <div class="profile-info">
                    <p><span class="label">이름</span> ${data.name || ''}</p>
                    <p><span class="label">성별</span> ${data.gender || ''}</p>
                    <p><span class="label">나이</span> ${data.age || ''}</p>
                    <p><span class="label">키/체중</span> ${data.height || '-'}cm / ${data.weight || '-'}kg</p>
                    <p><span class="label">국적</span> ${data.nationality || ''}</p>
                </div>
            </div>

            <div class="stats-grid-2x2">
                <div class="stats-table-container">
                    ${renderHorizontalTable('표 1: 신체 스테이터스', [
                        { label: '근력', value: data.muscle },
                        { label: '민첩', value: data.agility },
                        { label: '지구력', value: data.endurance },
                        { label: '유연성', value: data.flexibility },
                        { label: '시각', value: data.visual },
                        { label: '청각', value: data.auditory },
                        { label: '상황 인지 능력', value: data.situation },
                        { label: '반응속도', value: data.reaction },
                    ], isAdminUser(), true)}
                </div>
                <div class="chart-container-1" style="width:100%; height:auto; min-height:300px;"></div>

                <div class="stats-table-container">
                    ${renderHorizontalTable('표 2: 정신 스테이터스', [
                        { label: '지능', value: data.intellect },
                        { label: '판단력', value: data.judgment },
                        { label: '기억력', value: data.memory },
                        { label: '정신력', value: data.spirit },
                        { label: '의사 결정 능력', value: data.decision },
                        { label: '스트레스 내성', value: data.stress },
                    ], isAdminUser(), true)}
                </div>
                <div class="chart-container-2" style="width:100%; height:auto; min-height:300px;"></div>
            </div>

            <div id="editArea"></div>
        </div>
    `;

    profileModal.showModal();
    document.getElementById("closeProfile").onclick = () => profileModal.close();

    // 관리자 편집 버튼
    const editArea = document.getElementById("editArea");
    const isAdmin = await isAdminUser();
    if (isAdmin) {
        const editBtn = document.createElement("button");
        editBtn.textContent = "편집";
        editBtn.className = "edit-btn";
        editBtn.onclick = () => openInlineEdit(docId, data);
        editArea.appendChild(editBtn);
    }

    // 스테이터스 차트 렌더링 (기존 스테이터스 데이터 사용)
    setTimeout(() => initStatsRadarCharts(data), 100);
}

// 수정 버튼 눌렀을 때
async function openInlineEdit(docId, data) {
    const editArea = document.getElementById("editArea");

    // 1. 편집용 HTML 생성
    editArea.innerHTML = `
        <div class="edit-grid-inline">
            <label>이름</label><input id="editName" value="${data.name || ''}">
            <label>성별</label><input id="editGender" value="${data.gender || ''}">
            <label>나이</label><input id="editAge" value="${data.age || ''}">
            <label>키/체중</label><input id="editHeight" value="${data.height || ''}">
            <label>국적</label><input id="editNationality" value="${data.nationality || ''}">

            <label>이미지 업로드</label><input id="editImageFile" type="file" accept="image/*">
            <label>이미지 URL</label><input id="editImage" value="${data.image || ''}">

            <div class="edit-stats-inline">
                <label>근력</label><input id="editMuscle" value="${data.muscle || 0}">
                <label>민첩</label><input id="editAgility" value="${data.agility || 0}">
                <label>지구력</label><input id="editEndurance" value="${data.endurance || 0}">
                <label>유연성</label><input id="editFlexibility" value="${data.flexibility || 0}">
                <label>시각</label><input id="editVisual" value="${data.visual || 0}">
                <label>청각</label><input id="editAuditory" value="${data.auditory || 0}">
                <label>상황 인지 능력</label><input id="editSituation" value="${data.situation || 0}">
                <label>반응속도</label><input id="editReaction" value="${data.reaction || 0}">
                
                <label>지능</label><input id="editIntellect" value="${data.intellect || 0}">
                <label>판단력</label><input id="editJudgment" value="${data.judgment || 0}">
                <label>기억력</label><input id="editMemory" value="${data.memory || 0}">
                <label>정신력</label><input id="editSpirit" value="${data.spirit || 0}">
                <label>의사 결정 능력</label><input id="editDecision" value="${data.decision || 0}">
                <label>스트레스 내성</label><input id="editStress" value="${data.stress || 0}">
            </div>

            <button id="saveStaffInline">저장</button>
        </div>
    `;

    // 2. 저장 버튼 이벤트
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
            height: document.getElementById("editHeight").value,
            nationality: document.getElementById("editNationality").value,
            image: finalImg,
            muscle: Number(document.getElementById("editMuscle").value),
            agility: Number(document.getElementById("editAgility").value),
            endurance: Number(document.getElementById("editEndurance").value),
            flexibility: Number(document.getElementById("editFlexibility").value),
            visual: Number(document.getElementById("editVisual").value),
            auditory: Number(document.getElementById("editAuditory").value),
            situation: Number(document.getElementById("editSituation").value),
            reaction: Number(document.getElementById("editReaction").value),
            intellect: Number(document.getElementById("editIntellect").value),
            judgment: Number(document.getElementById("editJudgment").value),
            memory: Number(document.getElementById("editMemory").value),
            spirit: Number(document.getElementById("editSpirit").value),
            decision: Number(document.getElementById("editDecision").value),
            stress: Number(document.getElementById("editStress").value),
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, "staff", docId), newData);

        // 화면 갱신
        openProfileModal(docId, { ...data, ...newData });
        renderStaff();
        editArea.innerHTML = ''; // 편집 영역 초기화
    };
}

/* =========================================================
   맵
========================================================= */

// 일단 맵을 열 게 한 다
async function renderMap() {
    contentEl.innerHTML = '<div class="card muted">맵 로딩중...</div>';
    try {
        const snap = await getDocs(collection(db, 'maps'));
        contentEl.innerHTML = '';
        
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
        
        for (const d of snap.docs) {
            const cardNode = await renderMapCard(d); // await 필요
            contentEl.appendChild(cardNode);
        }
    } catch(e){
        console.error(e);
        contentEl.innerHTML = '<div class="card">맵 로드 실패</div>';
    }
}

// 맵 렌더링
async function renderMapCard(mapDoc) {
    const mapId = mapDoc.id;
    const data = mapDoc.data ? mapDoc.data() : mapDoc;

    const img = data.image || DEFAULT_MAP_IMAGE;
    const name = data.name || '이름 없음';
    const danger = data.danger || 1;
    const types = Array.isArray(data.types) ? data.types.join(', ') : (data.types || '');

    const el = document.createElement('div');
    el.className = 'map-card card';
    el.style.transition = 'transform 0.2s';
    el.onmouseenter = () => el.style.transform = 'scale(1.03)';
    el.onmouseleave = () => el.style.transform = 'scale(1)';

    // 탭 메뉴에서 미리보기용 카드
    el.innerHTML = `
        <div class="map-card-inner" data-id="${mapId}">
            <div class="map-media"><img class="map-img" src="${img}" alt="${name}"></div>
            <div class="map-main">
                <h3 class="map-name">${name}</h3>
                <div class="map-meta">
                    <div class="map-danger">${renderDangerStars(danger)}</div>
                    <div class="map-types">출현: ${types}</div>
                </div>
            </div>
        </div>
    `;

    // 클릭하면 팝업 열기
    el.onclick = () => openMapPopup(mapId, data);

    return el;
}

// 팝업 렌더링
async function openMapPopup(mapId, data) {
    const modal = document.createElement('div');
    modal.className = 'map-popup';
    document.body.appendChild(modal);

    modal.innerHTML = `
        <div class="popup-top">
            <img src="${data.image}" class="map-popup-img">
            <h2>${data.name}</h2>
            <p>${data.description}</p>
            <div class="map-meta">
                <div class="map-danger">${renderDangerStars(danger)}</div>
                <div class="map-types">출현: ${Array.isArray(data.types)?data.types.join(', '):data.types||''}</div>
            </div>
        </div>
        <div class="popup-bottom">
            <div class="map-left-grid"></div>
            <div class="map-right-teams"></div>
        </div>
        <div class="popup-comments-area"></div>
    `;

    (async () => {
        if (await isAdminUser()) {
            const popupTop = modal.querySelector('.popup-top');
            const editBtn = document.createElement('button');
            editBtn.textContent = '편집';
            editBtn.className = 'btn';
            editBtn.style.marginLeft = '10px';
            editBtn.onclick = (e) => {
                e.stopPropagation(); // 클릭이 카드 전체 클릭 이벤트에 걸리지 않도록
                openMapInlineEdit(mapId, data);
            };
            popupTop.appendChild(editBtn);
        }
    })();

    const gridContainer = modal.querySelector('.map-left-grid');
    const teamsContainer = modal.querySelector('.map-right-teams');
    const commentsArea = modal.querySelector('.popup-comments-area');

    // 격자 생성
    const rows = data.grid?.rows || 8;
    const cols = data.grid?.cols || 8;
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateRows = `repeat(${rows}, 40px)`;
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
    for(let y=0; y<rows; y++){
        for(let x=0; x<cols; x++){
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.style.border = '1px solid #888';
            cell.style.position = 'relative';
            gridContainer.appendChild(cell);
        }
    }

    // 탐사팀 목록
    const visits = data.visits || [];
    const sortedVisits = visits.sort((a,b)=>b.timestamp-a.timestamp);
    const recentVisits = sortedVisits.slice(0,5);
    for(const v of recentVisits){
        const teamEl = document.createElement('div');
        teamEl.textContent = v.teamName;
        teamEl.style.color = v.colorHex || '#fff';
        teamEl.className = 'explore-team';
        teamsContainer.appendChild(teamEl);

        // 클릭 시 탐사원/결과 표시 + 선 애니메이션
        teamEl.onclick = () => showTeamVisit(v, gridContainer);
    }

    // 더보기 버튼
    if(visits.length > 5){
        const moreBtn = document.createElement('button');
        moreBtn.textContent = '더보기';
        moreBtn.className = 'link';
        moreBtn.onclick = () => {
            teamsContainer.innerHTML = '';
            for(const v of sortedVisits){
                const teamEl = document.createElement('div');
                teamEl.textContent = v.teamName;
                teamEl.style.color = v.colorHex || '#fff';
                teamEl.className = 'explore-team';
                teamEl.onclick = () => showTeamVisit(v, gridContainer);
                teamsContainer.appendChild(teamEl);
            }
        };
        teamsContainer.appendChild(moreBtn);
    }

    // 댓글 단락
    const commentCard = renderCommentCard({ id: mapId, dbCollection:'maps' });
    commentsArea.appendChild(commentCard);
}

// 탐사팀 클릭 시 격자 경로 표시 + 말풍선
function showTeamVisit(visit, gridContainer){
    const path = visit.path || [];
    const members = visit.members || [];

    // 먼저 모든 이전 선 제거 (필요 시)
    gridContainer.querySelectorAll('.visit-line').forEach(l=>l.remove());
    gridContainer.querySelectorAll('.visit-bubble').forEach(b=>b.remove());

    path.forEach((p, i)=>{
        const cell = gridContainer.querySelector(`.grid-cell[data-x='${p.x}'][data-y='${p.y}']`);
        if(!cell) return;

        // 경로 선
        if(i>0){
            const prev = path[i-1];
            const line = document.createElement('div');
            line.className = 'visit-line';
            line.style.position='absolute';
            line.style.height='2px';
            line.style.background='#0f0';
            line.style.left='50%';
            line.style.top='50%';
            line.style.transformOrigin='0 0';
            // 위치/길이/각도 계산
            const dx = (p.x - prev.x)*40;
            const dy = (p.y - prev.y)*40;
            const length = Math.sqrt(dx*dx+dy*dy);
            const angle = Math.atan2(dy, dx)*180/Math.PI;
            line.style.width = `${length}px`;
            line.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            line.style.transition='width 0.5s linear';
            cell.appendChild(line);
        }

        // 특수 상황 말풍선 (사망, 실종, 오염 등)
        const events = members.filter(m=>['dead','missing','contaminated'].includes(m.status));
        events.forEach(m=>{
            const bubble = document.createElement('div');
            bubble.className='visit-bubble';
            bubble.textContent = `${m.name} ${statusText(m.status)}`;
            bubble.style.position='absolute';
            bubble.style.top='-20px';
            bubble.style.left='50%';
            bubble.style.transform='translateX(-50%)';
            bubble.style.background='rgba(255,0,0,0.8)';
            bubble.style.color='#fff';
            bubble.style.padding='2px 4px';
            bubble.style.borderRadius='4px';
            cell.appendChild(bubble);
        });
    });
}

// 상태 텍스트 변환
function statusText(status){
    switch(status){
        case 'dead': return '사망';
        case 'missing': return '실종';
        case 'contaminated': return '오염';
        case 'aborted': return '귀환 불가';
        case 'completed': return '탐사 종료';
        default: return '';
    }
}

async function openMapInlineEdit(mapId, data) {
    const cardInner = document.querySelector(`.map-card-inner[data-id="${mapId}"]`);
    if (!cardInner) return;

    const originalContent = cardInner.innerHTML;

    const currentImage = data.image || '';
    const currentDanger = data.danger || 1;
    const currentTypes = Array.isArray(data.types) ? data.types.join(', ') : (data.types || '');

    cardInner.innerHTML = `
        <div class="map-edit-form">
            <div class="map-card-inner map-edit-layout">
                <div class="map-media">
                    <img class="map-img map-img-preview" src="${currentImage}" alt="맵 이미지">
                    <div style="margin-top:10px;">
                        <label class="muted">이미지 URL</label>
                        <input id="editMapImage" value="${currentImage}" placeholder="이미지 URL">
                    </div>
                    <div style="margin-top:10px;">
                        <label class="muted">이미지 파일 업로드</label>
                        <input id="editMapImageFile" type="file" accept="image/*">
                    </div>
                </div>
                <div class="map-main">
                    <div class="map-head" style="flex-direction: column; align-items: flex-start;">
                        <label class="muted">이름</label>
                        <input id="editMapName" class="form-control-inline" value="${data.name || ''}">
                        
                        <div class="map-meta" style="margin-top:10px;">
                            <label class="muted">위험도 (1~5)</label>
                            <input id="editMapDanger" type="number" min="1" max="5" value="${currentDanger}" style="width:50px;">
                            <span id="dangerStars" class="muted"></span>
                        </div>

                        <div class="map-meta" style="margin-top:10px;">
                            <label class="muted">출현 타입 (쉼표 구분)</label>
                            <input id="editMapTypes" value="${currentTypes}" placeholder="예: 불, 물, 풀">
                        </div>
                    </div>

                    <div style="margin-top:20px;">
                        <label class="muted">설명</label>
                        <textarea id="editMapDesc" rows="6" style="width:100%;">${data.description || ''}</textarea>
                    </div>

                    <div style="margin-top:15px; display:flex; gap:10px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
                        <button id="saveMapInline" class="btn primary">저장</button>
                        <button id="cancelMapInline" class="btn link">취소</button>
                        <button id="deleteMapInline" class="btn danger" style="margin-left:auto;">삭제</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const updateDangerStars = (value) => {
        const starsEl = cardInner.querySelector("#dangerStars");
        if (!starsEl) return;
        const danger = Math.min(5, Math.max(1, Number(value) || 1));
        starsEl.textContent = renderDangerStars(danger);
    };
    updateDangerStars(currentDanger);

    const imgPreview = cardInner.querySelector('.map-img-preview');
    const imgUrlInput = document.getElementById("editMapImage");
    const imgFileInput = document.getElementById("editMapImageFile");
    const dangerInput = document.getElementById("editMapDanger");
    const nameInput = document.getElementById("editMapName");
    const typesInput = document.getElementById("editMapTypes");
    const descInput = document.getElementById("editMapDesc");

    const collectFormData = async () => {
        let finalImg = imgUrlInput.value;
        const file = imgFileInput.files[0];
        if (file) finalImg = await uploadMapImage(file, mapId);
        return {
            name: nameInput.value,
            danger: Number(dangerInput.value),
            types: typesInput.value.split(',').map(t => t.trim()).filter(t => t),
            description: descInput.value,
            image: finalImg,
            updatedAt: serverTimestamp()
        };
    };

    const saveData = async () => {
        try {
            const newData = await collectFormData();
            await updateDoc(doc(db, "maps", mapId), newData);
            updateDangerStars(newData.danger);
        } catch(e) {
            console.error(e);
            showMessage('자동 저장 실패', 'error');
        }
    };

    // 이벤트: 입력 시 자동 저장 (1초 딜레이)
    let saveTimeout;
    const autoSaveHandler = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveData, 1000);
    };

    [imgUrlInput, imgFileInput, dangerInput, nameInput, typesInput, descInput].forEach(el => {
        el.addEventListener('input', autoSaveHandler);
        el.addEventListener('change', autoSaveHandler);
    });

    // 이미지 미리보기
    imgUrlInput.addEventListener('input', () => { imgPreview.src = imgUrlInput.value; imgFileInput.value = ''; });
    imgFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => imgPreview.src = ev.target.result;
            reader.readAsDataURL(file);
            imgUrlInput.value = '';
        } else if (!imgUrlInput.value) imgPreview.src = '';
    });

    dangerInput.addEventListener('input', (e) => updateDangerStars(e.target.value));

    document.getElementById("saveMapInline").onclick = async () => { await saveData(); renderMap(); };
    document.getElementById("cancelMapInline").onclick = () => { cardInner.innerHTML = originalContent; renderMap(); };
    document.getElementById("deleteMapInline").onclick = async () => {
        if (await showConfirm(`정말로 맵 '${data.name}'을 삭제하시겠습니까?`)) {
            try { await deleteDoc(doc(db, "maps", mapId)); showMessage('맵 삭제 완료', 'info'); renderMap(); }
            catch(e){ console.error(e); showMessage('맵 삭제 실패', 'error'); }
        }
    };

    // 페이지 벗어날 때 자동 저장
    window.addEventListener('beforeunload', saveData);
}

async function openNewMapInlineEdit() {
    const tempId = 'new_map_' + Date.now();
    const tempEl = document.createElement('div');
    tempEl.className = 'map-card card';
    tempEl.id = tempId;
    tempEl.style.marginBottom = '20px';

    // 맵 추가 버튼 바로 아래에 삽입
    const mapAddBtn = contentEl.querySelector('.btn');
    contentEl.insertBefore(tempEl, mapAddBtn.nextSibling);

    // 초기값
    const defaultImage = '';
    const defaultDanger = 1;

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
                            <input id="newMapName" class="form-control-inline" placeholder="맵 이름" style="font-size: 1.2em; font-weight: bold; color: var(--accent); margin-bottom: 10px;">
                            
                            <div class="map-meta" style="text-align: left; width: 100%;">
                                <label class="muted" style="display:block;">위험도 (1~5)</label>
                                <input id="newMapDanger" type="number" min="1" max="5" value="${defaultDanger}" class="form-control-inline" style="width: 50px;">
                                <span class="muted" id="dangerStars">${renderDangerStars(defaultDanger)}</span>
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

    const imgPreviewEl = tempEl.querySelector('.map-img-preview');
    const imgUrlInput = tempEl.querySelector('#newMapImage');
    const imgFileInput = tempEl.querySelector('#newMapImageFile');
    const dangerInput = tempEl.querySelector('#newMapDanger');

    // ✅ 이미지 미리보기 & 위험도 별표 업데이트
    const updatePreviewAndStars = () => {
        // 별표
        dangerInput.addEventListener('input', e => {
            const starsEl = tempEl.querySelector('#dangerStars');
            if (starsEl) starsEl.textContent = renderDangerStars(Number(e.target.value) || 1);
        });

        // URL 입력
        imgUrlInput.addEventListener('input', () => {
            imgPreviewEl.src = imgUrlInput.value;
            imgFileInput.value = '';
        });

        // 파일 선택
        imgFileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => imgPreviewEl.src = e.target.result;
                reader.readAsDataURL(file);
                imgUrlInput.value = '';
            } else if (!imgUrlInput.value) imgPreviewEl.src = '';
        });
    };
    updatePreviewAndStars();

    // 저장
    tempEl.querySelector('#saveNewMapInline').onclick = async () => {
        if (!tempEl.querySelector('#newMapName').value) {
            showMessage('맵 이름을 입력해주세요.', 'error');
            return;
        }

        try {
            const newDocRef = doc(collection(db, "maps"));
            const newMapId = newDocRef.id;
            let finalImg = imgUrlInput.value;
            const file = imgFileInput.files[0];
            if (file) finalImg = await uploadMapImage(file, newMapId);

            const typesArray = tempEl.querySelector('#newMapTypes').value.split(',').map(t => t.trim()).filter(t => t);

            await setDoc(newDocRef, {
                name: tempEl.querySelector('#newMapName').value,
                danger: Number(dangerInput.value),
                types: typesArray,
                description: tempEl.querySelector('#newMapDesc').value,
                image: finalImg,
                createdAt: serverTimestamp()
            });

            showMessage('새 맵 생성 완료', 'info');
            renderMap();
        } catch(e) {
            console.error(e);
            showMessage('새 맵 생성 실패', 'error');
        }
    };

    // 취소
    tempEl.querySelector('#cancelNewMapInline').onclick = () => tempEl.remove();
}

/* =========================================================
   도감
========================================================= */

// 심연체들 렌더링
async function renderDex() {
    contentEl.innerHTML = '<div class="card muted">도감 정보 로딩중...</div>';
    const isManager = await isAdminUser();

    try {
        const snap = await getDocs(collection(db, 'abyssal_dex'));
        const abyssList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const totalCount = abyssList.length;
        const completedCount = abyssList.filter(a => calculateDisclosurePercentage(a) === 100).length;

        contentEl.innerHTML = '';
        contentEl.appendChild(renderSummaryCard(completedCount, totalCount));

        if (isManager) {
            contentEl.appendChild(renderAdminAddButton('새 심연체 추가 +', createNewAbyss));
        }

        const gridContainer = document.createElement('div');
        gridContainer.className = 'dex-grid';
        gridContainer.style = 'display:flex; flex-wrap:wrap; gap:20px; justify-content:center;';

        abyssList.forEach(abyss => {
            const card = renderDexCard(abyss, isManager);
            if (card) {
                card.onclick = () => renderDexDetail(abyss.id); // 여기서 연결
                gridContainer.appendChild(card);
            }
        });

        contentEl.appendChild(gridContainer);

        if (isManager) {
            contentEl.appendChild(renderAdminAddButton('새 심연체 추가 +', createNewAbyss));
        }
    } catch(e) {
        console.error(e);
        contentEl.innerHTML = '<div class="card error">도감 정보를 로드하는 데 실패했습니다.</div>';
    }
}

// 개방된 심연체 퍼센트
function renderSummaryCard(completed, total) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '20px';
    card.innerHTML = `
        <h2>도감 개방 현황: ${completed} / ${total}</h2>
        <p class="muted">총 ${total}개의 심연체 중 ${completed}개의 정보가 완전히 개방되었습니다.</p>
    `;
    return card;
}

function calculateDisclosurePercentage(abyssData) {
    let totalFields = 0;
    let publicCount = 0;

    // 1. Basic
    const basicCounts = countPublicFromObject(abyssData.basic?.isPublic);
    totalFields += basicCounts.total;
    publicCount += basicCounts.publicCount;

    // 2. Stats
    const statsCounts = countPublicFromObject(abyssData.stats?.isPublic);
    totalFields += statsCounts.total;
    publicCount += statsCounts.publicCount;

    // 3. Management
    const managementKeys = ['basicInfo', 'collectionInfo', 'otherInfo'];
    managementKeys.forEach(key => {
        const items = abyssData.management?.[key] || [];
        const startIndex = key === 'basicInfo' ? 1 : 0; // 첫 항목 제외
        const counts = countPublic(items.slice(startIndex));
        totalFields += counts.total;
        publicCount += counts.publicCount;
    });

    // 4. Logs
    const logs = abyssData.logs || [];
    const logCounts = countPublic(logs.slice(1)); // 첫 로그 제외
    totalFields += logCounts.total;
    publicCount += logCounts.publicCount;

    return totalFields === 0 ? 0 : Math.min(100, Math.floor((publicCount / totalFields) * 100));
}

// 유틸 함수
function countPublic(fields) {
    let total = 0, publicCount = 0;
    fields.forEach(f => {
        total++;
        if (f.isPublic) publicCount++;
    });
    return { total, publicCount };
}

function countPublicFromObject(obj) {
    const keys = Object.keys(obj || {});
    const total = keys.length;
    const publicCount = keys.reduce((acc, k) => acc + (obj[k] ? 1 : 0), 0);
    return { total, publicCount };
}

// 심연체 카드
function renderDexCard(abyssData, isManager) {
    const { id, basic = {} } = abyssData;
    const disclosurePercent = calculateDisclosurePercentage(abyssData);

    const isImagePublic = basic.isPublic?.image || false;
    const showImage = isImagePublic || isManager;
    const imgUrl = showImage ? (basic.image || DEFAULT_PROFILE_IMAGE) : '';

    const displayName = getDisplayField(basic.name, basic.isPublic?.name, '정보 없음', isManager);
    const displayCode = getDisplayField(basic.code, basic.isPublic?.code, '???', isManager);

    const isCompletelyHidden = !isManager && !isImagePublic && !basic.isPublic?.code && !basic.isPublic?.name;
    if (isCompletelyHidden) return null;

    const borderColor = `rgb(${255 - Math.floor(disclosurePercent*2.55)}, ${Math.floor(disclosurePercent*2.55)}, 0)`;
    const cardStyles = [
        `width: calc(25% - 15px)`,
        `aspect-ratio: 1 / 1`,
        `background-size: cover`,
        `background-position: center`,
        `border: 5px solid ${borderColor}`,
        `position: relative`,
        `cursor: pointer`,
        `overflow: hidden`,
        `transition: all 0.3s`,
        showImage && imgUrl ? `background-image: url('${imgUrl}')` : `background-color: #555`
    ].filter(Boolean).join('; ');

    const el = document.createElement('div');
    el.className = 'dex-card';
    el.dataset.id = id;
    el.style.cssText = cardStyles;

    el.innerHTML = `
        <div class="dex-overlay">
            <strong>${displayName}</strong>
            <span>${displayCode}</span>
        </div>
        <div class="dex-hover-overlay">
            <strong>${displayName}</strong>
            <span>개방률: ${disclosurePercent}%</span>
        </div>
    `;

    return el;
}

function getDisplayField(value, isPublic, fallback = '???', isManager) {
    return (isPublic || isManager) ? (value || fallback) : '???';
}

// 심연체 삭제
async function deleteAbyssData(id) {
    if (!confirm('정말로 이 심연체를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    showMessage('데이터를 Firebase에서 삭제 중...', 'danger');
    try {
        await deleteDoc(doc(db, 'abyssal_dex', id));
        showMessage('삭제 완료! 도감 목록으로 돌아갑니다.', 'success');
        // 삭제 후 목록으로 돌아갑니다.
        renderDex(); 
    } catch (error) {
        console.error("Error deleting data:", error);
        showMessage('삭제 중 오류 발생', 'error');
        throw error;
    }
}

// 심연체 저장
async function saveAbyssData(id, data) {
    showMessage('데이터를 Firebase에 저장 중...', 'info');
    try {
        data.basic.code = generateAbyssCode(data.basic.danger, data.basic.shape, data.basic.discoverySeq, data.basic.derivedSeq);
        
        await setDoc(doc(db, 'abyssal_dex', id), data, { merge: true });
        showMessage('저장 완료!', 'success');
    } catch (error) {
        console.error("Error saving data:", error);
        showMessage('저장 중 오류 발생', 'error');
        throw error;
    }
}

async function renderDexDetail(id, isEditMode = false, preloadedData = null) {
    const data = await loadAbyssData(id, preloadedData);
    if (!data) return;

    const isManager = await isAdminUser();
    data.basic.code = generateAbyssCode(
        data.basic.danger, data.basic.shape, data.basic.discoverySeq, data.basic.derivedSeq
    );

    const calculatedStats = calculateAbyssStats(data.stats);
    const disclosurePercent = calculateDisclosurePercentage(data);

    // HTML 렌더링
    contentEl.innerHTML = `
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
                    ${isManager && !isEditMode ? `<button class="btn danger" id="deleteAbyssBtn">심연체 삭제</button>` : ''}
                </div>
            </div>
            ${isManager && isEditMode ? renderDisclosurePresetHtml() : ''}
            <div class="dex-sections-container" style="display: flex; flex-wrap: wrap;">
                <div class="dex-section" id="basicInfoSection" style="flex: 1 1 50%; padding-right: 15px;"></div>
                <div class="dex-section" id="statsSection" style="flex: 1 1 50%; padding-left: 15px;"></div>
                <div class="dex-section" id="radarChartSection" style="flex: 1 1 100%; margin-top: 20px;">
                    <h3>스테이터스 분포</h3>
                    <div id="radarChartContainer" style="width: 100%; height: 400px; margin-top: 10px;"></div>
                </div>
                <hr style="flex: 1 1 100%; margin: 20px 0;">
                <div class="dex-section" id="managementSection" style="flex: 1 1 50%; padding-right: 15px;"></div>
                <div class="dex-section" id="logsSection" style="flex: 1 1 50%; padding-left: 15px;"></div>
            </div>
            <hr style="margin: 30px 0;">
            <div class="dex-comments-area" data-id="${id}">
                ${renderCommentArea(id, data.comments || [])}
            </div>
        </div>
    `;

    // 섹션 렌더링
    renderBasicInfoSection(document.getElementById('basicInfoSection'), data, isEditMode, isManager);
    renderStatsSection(document.getElementById('statsSection'), data, calculatedStats, isEditMode, isManager);
    renderManagementSection(document.getElementById('managementSection'), data, isEditMode, isManager);
    renderLogsSection(document.getElementById('logsSection'), data, isEditMode, isManager);
    drawRadarChart('radarChartContainer', Object.keys(calculatedStats), Object.values(calculatedStats), 5, 'rgba(0,0,0,0.1)', 'var(--accent)'
);

    // 이벤트
    document.getElementById('backToDexList').onclick = renderDex;

    if (isManager) {
        document.getElementById('toggleEditMode').onclick = async () => {
            if (isEditMode) {
                try {
                    await saveAbyssData(id, data);
                    renderDexDetail(id, false);
                } catch(e) {
                    console.error(e);
                    showMessage('저장 중 오류 발생', 'error');
                }
            } else {
                renderDexDetail(id, true);
            }
        };

        document.getElementById('deleteAbyssBtn')?.addEventListener('click', () => deleteAbyssData(id));

        attachDisclosurePresetButtons(data, isEditMode, isManager);
    }

    attachCommentEventListeners(id);
}

async function loadAbyssData(id, preloadedData = null) {
    if (preloadedData) return preloadedData;

    contentEl.innerHTML = '<div class="card muted">상세 정보 로딩중...</div>';
    try {
        const docSnap = await getDoc(doc(db, 'abyssal_dex', id));
        if (!docSnap.exists()) throw new Error('심연체 정보를 찾을 수 없음');
        const data = docSnap.data();
        if (!data.basic) throw new Error("'basic' 정보 없음");
        return data;
    } catch (e) {
        console.error("데이터 로딩 실패:", e);
        showMessage(e.message || '데이터 로딩 중 오류 발생', 'error');
        renderDex();
        return null;
    }
}

function attachDisclosurePresetButtons(data, isEditMode, isManager) {
    if (!isManager || !isEditMode) return;

    document.querySelectorAll('.disclosure-preset-btn').forEach(button => {
        button.onclick = (e) => {
            const sectionKey = e.target.dataset.section;
            const isPublic = e.target.dataset.public === 'true';

            setSectionDisclosure(data, sectionKey, isPublic);

            // 섹션 UI 업데이트
            renderBasicInfoSection(document.getElementById('basicInfoSection'), data, isEditMode, isManager);
            renderStatsSection(document.getElementById('statsSection'), data, calculateAbyssStats(data.stats), isEditMode, isManager);
            renderManagementSection(document.getElementById('managementSection'), data, isEditMode, isManager);
            renderLogsSection(document.getElementById('logsSection'), data, isEditMode, isManager);

            const newPercent = calculateDisclosurePercentage(data);
            showMessage(`${sectionKey} 섹션을 ${isPublic ? '공개' : '비공개'}로 설정했습니다. 개방률: ${newPercent}%`, 'info');
            
            // 개방률 UI 업데이트
            const percentEl = document.querySelector('.dex-detail-wrap .gap:last-child > div');
            if (percentEl) percentEl.textContent = `개방률: ${newPercent}%`;
        };
    });
}

function renderBasicInfoSection(el, data, isEditMode, isManager) {
    const d = data.basic;
    const section = 'basic';

    // 이미지 HTML 생성
    const imgHtml = `
        <div style="width:100%; aspect-ratio:1/1; 
                    background-image: url('${d.image || ''}'); 
                    background-size: cover; background-position: center; 
                    border-radius:8px; margin-bottom:15px;"></div>
        ${isEditMode ? `
            <input type="text" id="editImageURL" placeholder="이미지 URL" value="${d.image || ''}" 
                   data-key="image" data-section="${section}" class="inline-edit-field form-control-inline" 
                   style="width:100%; margin-top:5px;">
            <input type="file" id="editImageFile" accept="image/*" style="width:100%; margin-top:5px;">
        ` : ''}
    `;

    const discoveryKey = d.danger === '파생' ? 'derivedSeq' : 'discoverySeq';
    const discoveryLabel = d.danger === '파생' ? '파생 순서' : '발견 순서';

    // 렌더링할 필드 목록
    const fields = [
        { label: '코드명', key: 'code', type: 'text', readOnly:true, hasPublicCheckbox:true },
        { label: '명칭', key: 'name', type: 'text', hasPublicCheckbox:true },
        { label: '위험도', key: 'danger', type: 'select', options:Object.keys(DANGER_TYPES), hasPublicCheckbox:false },
        { label: '외형', key: 'shape', type: 'select', options:SHAPE_TYPES, hasPublicCheckbox:false },
        { label: discoveryLabel, key: discoveryKey, type: 'number', min:1, hasPublicCheckbox:false },
        { label: '주요 피해', key: 'majorDamage', type: 'text', hasPublicCheckbox:true },
        { label: '사망 가능성', key: 'deathChance', type: 'text', hasPublicCheckbox:true },
        { label: '광기 가능성', key: 'sanityChance', type: 'text', hasPublicCheckbox:true }
    ];

    // 필드 테이블 생성
    const tableHtml = `<table class="info-table" style="width:100%;">
        ${fields.map(f => {
            const value = d[f.key] || (f.type==='number'?0:'');
            const isPublic = d.isPublic[f.key] || false;
            const masked = !isPublic && !isManager;
            const showCheckbox = isManager && isEditMode && f.hasPublicCheckbox;

            return `
            <tr class="${masked?'masked-row':''}">
                <td style="width:30%; font-weight:bold;">
                    ${showCheckbox?`<input type="checkbox" data-key="${f.key}" data-section="${section}-isPublic" ${isPublic?'checked':''} style="margin-right:5px;">`:''}
                    ${f.label}
                </td>
                <td>${masked?'<div class="masked-data"></div>': renderInlineField(f, value, isEditMode, section)}</td>
            </tr>
            `;
        }).join('')}
    </table>`;

    // 최종 HTML
    el.innerHTML = `
        <h3>기본 정보</h3>
        <div style="display:flex; gap:20px;">
            <div style="flex:0 0 200px; max-width:200px;">
                ${isManager && isEditMode ? `<input type="checkbox" data-key="image" data-section="${section}-isPublic" ${d.isPublic.image?'checked':''} style="margin-right:5px; margin-bottom:5px;"> 이미지 공개` : ''}
                ${imgHtml}
            </div>
            <div style="flex:1;">${tableHtml}</div>
        </div>
    `;

    // 이벤트 리스너 부착
    if (isEditMode) {
        el.querySelectorAll('.inline-edit-field').forEach(field => {
            field.onchange = e => {
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
                renderBasicInfoSection(el, data, isEditMode, isManager);
            };
        });

        el.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.onchange = e => {
                const key = e.target.dataset.key;
                data.basic.isPublic[key] = e.target.checked;
            };
        });

        const fileInput = document.getElementById('editImageFile');
        fileInput?.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;

            showMessage('이미지 업로드 중...', 'info');
            try {
                const storageRef = ref(storage, `abyss_images/${data.id}_${file.name}`);
                const uploadTask = await uploadBytes(storageRef, file);
                const imageUrl = await getDownloadURL(uploadTask.ref);

                handleEditFieldChange(data, section, 'image', imageUrl);
                renderBasicInfoSection(el, data, isEditMode, isManager);
                showMessage('이미지 업로드 및 반영 완료', 'success');
            } catch (err) {
                console.error('이미지 업로드 실패:', err);
                showMessage('이미지 업로드 실패', 'error');
            }
        });
    }
}

function renderStatsSection(el, data, calculatedStats, isEditMode, isManager) {
    const d = data.stats;
    const section = 'stats';
    const statsKeys = ['strength', 'health', 'agility', 'mind'];
    const labels = { strength: '근력', health: '건강', agility: '민첩', mind: '정신력' };

    // 스테이터스 테이블 생성
    const statTable = `<table class="info-table" style="width:100%;">
        ${statsKeys.map(key => {
            const value = d[key] || 0;
            const isPublic = d.isPublic[key] ?? false;
            const masked = !isPublic && !isManager;
            const showCheckbox = isManager && isEditMode;

            return `
            <tr class="${masked?'masked-row':''}">
                <td style="width:50%; font-weight:bold;">
                    ${showCheckbox ? `<input type="checkbox" data-key="${key}" data-section="${section}-isPublic" ${isPublic?'checked':''} style="margin-right:5px;">` : ''}
                    ${labels[key]}
                </td>
                <td>${masked ? '<div class="masked-data"></div>' : renderInlineField({key, type:'number', min:1}, value, isEditMode, section)}</td>
            </tr>
            `;
        }).join('')}
    </table>`;

    // 계산된 능력치 테이블 생성
    const calcTable = `<table class="info-table" style="width:100%;">
        <tr><td style="width:50%;">최대 체력</td><td>${calculatedStats.maxHp}</td></tr>
        <tr><td>최대 정신력</td><td>${calculatedStats.maxMp}</td></tr>
        <tr><td>물리 공격력</td><td>${calculatedStats.physicalAttack}</td></tr>
        <tr><td>정신 공격력</td><td>${calculatedStats.mentalAttack}</td></tr>
    </table>`;

    // 최종 HTML
    el.innerHTML = `
        <h3>심연체 정보</h3>
        <div style="display:flex; gap:20px;">
            <div style="flex:1;">
                <h4>스테이터스</h4>
                ${statTable}
                <canvas id="radarChart-${data.id}" width="200" height="200" style="margin-top:15px;"></canvas>
            </div>
            <div style="flex:1;">
                <h4>계산된 능력치</h4>
                ${calcTable}
            </div>
        </div>
    `;

    // 이벤트 리스너 부착
    if (isEditMode) {
        el.querySelectorAll('.inline-edit-field').forEach(field => {
            field.onchange = e => {
                handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
                renderDexDetail(data.id, true); // 스테이터스 변경 시 전체 상세 화면 갱신
            };
        });

        el.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.onchange = e => {
                const key = e.target.dataset.key;
                d.isPublic[key] = e.target.checked;
            };
        });
    }
}

/**
 * 데이터 객체의 필드를 실시간으로 업데이트
 * @param {Object} data - 전체 심연체 데이터 객체
 * @param {string} section - 수정할 섹션 ('basic', 'stats', 등)
 * @param {string} key - 수정할 키 (배열 포함 가능, e.g. 'basicInfo[1].value')
 * @param {any} value - 새로운 값
 */
function handleEditFieldChange(data, section, key, value) {
    if (key.includes('[')) {
        const match = key.match(/(\w+)\[(\d+)\]\.(\w+)/);
        if (match) {
            const [_, arrKey, indexStr, subKey] = match;
            const index = parseInt(indexStr);
            if (data[section]?.[arrKey]?.[index]) {
                data[section][arrKey][index][subKey] = value;
            }
        }
        return;
    }

    if (section === 'basic' && (key === 'discoverySeq' || key === 'derivedSeq')) {
        data[section][key] = Number(value);
    } 
    else if (section === 'basic' || section === 'stats') {
        data[section][key] = value;
    }

    if (section === 'basic' && ['danger', 'shape', 'discoverySeq', 'derivedSeq'].includes(key)) {
        const d = data.basic;
        data.basic.code = generateAbyssCode(d.danger, d.shape, d.discoverySeq, d.derivedSeq);
    }
}

/**
 * 관리 정보 섹션 렌더링
 * @param {HTMLElement} el - 렌더링할 컨테이너
 * @param {Object} data - 심연체 전체 데이터
 * @param {boolean} isEditMode - 편집 모드 여부
 * @param {boolean} isManager - 관리자 여부
 */
function renderManagementSection(el, data, isEditMode, isManager) {
    const d = data.management;
    const section = 'management';

    const renderArrayInfo = (key, title, labelBase) => {
        const items = d[key] || [];
        let html = `<h4>${title}</h4><table class="info-table" style="width: 100%;">`;
        let hasVisibleRows = false;

        // 안내 문구
        const emptyMessages = {
            otherInfo: '기타 정보가 존재하지 않습니다.',
            collectionInfo: '채취 정보가 존재하지 않습니다.'
        };
        const emptyMessage = emptyMessages[key] || '관리 정보가 존재하지 않습니다.';

        items.forEach((item, index) => {
            const isBasicInfoDefault = key === 'basicInfo' && index === 0;
            
            // 비관리자 + 비공개 + 기본 정보 항목 아니면 스킵
            if (!isManager && !item.isPublic && !isBasicInfoDefault) return;

            hasVisibleRows = true;
            const isPublic = item.isPublic ?? false;
            const masked = !isPublic && !isManager;
            const itemLabel = isBasicInfoDefault ? '기본 정보' : `${labelBase} (${index + 1})`;
            const isProtectedBasicInfo = isBasicInfoDefault && items.length > 1;

            html += `
                <tr class="${masked ? 'masked-row' : ''}">
                    <td style="width: 30%; font-weight: bold; vertical-align: top; padding-top: 8px;">
                        ${isManager && isEditMode ? `<input type="checkbox" data-key="${key}[${index}].isPublic" data-section="${section}" ${isPublic ? 'checked' : ''} style="margin-right: 5px;">` : ''}
                        ${itemLabel}
                        ${isManager && isEditMode && !isProtectedBasicInfo ? 
                            `<button class="btn-xs danger" data-action="delete" data-key="${key}" data-index="${index}" style="margin-left: 5px;">-</button>` : ''}
                    </td>
                    <td>
                        ${masked ? '<div class="masked-data"></div>' : renderInlineField({ key, type: 'textarea' }, item.value, isEditMode, section, index, 'value')}
                    </td>
                </tr>
            `;
        });

        if (!hasVisibleRows) {
            html += `<tr><td colspan="2" class="muted" style="text-align: center;">${emptyMessage}</td></tr>`;
        }

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

    if (!isEditMode) return;

    // 인라인 편집 이벤트
    el.querySelectorAll('.inline-edit-field').forEach(field => {
        field.onchange = (e) => handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
    });

    // 공개 체크박스
    el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.onchange = (e) => handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.checked);
    });

    // 추가/삭제 버튼
    el.querySelectorAll('button[data-action]').forEach(btn => {
        btn.onclick = (e) => {
            const action = e.target.dataset.action;
            const key = e.target.dataset.key;
            const index = parseInt(e.target.dataset.index);
            const arr = data.management[key];

            if (action === 'add') {
                if (arr.length < 10) arr.push({ label: '새 정보', value: '', isPublic: false });
                else showMessage('더 이상 정보를 추가할 수 없습니다.', 'warning');
            } 
            else if (action === 'delete') {
                if (key === 'basicInfo' && index === 0 && arr.length > 1) {
                    showMessage('기본 관리 정보는 삭제할 수 없습니다. (최소 1개 유지 필요)', 'error');
                    return;
                }
                arr.splice(index, 1);
            }

            renderManagementSection(el, data, isEditMode, isManager);
        };
    });
}

/**
 * 연구 일지 섹션 렌더링
 * @param {HTMLElement} el - 렌더링할 컨테이너
 * @param {Object} data - 심연체 전체 데이터
 * @param {boolean} isEditMode - 편집 모드 여부
 * @param {boolean} isManager - 관리자 여부
 */
function renderLogsSection(el, data, isEditMode, isManager) {
    const logsData = data.logs || [];
    const section = 'logs';

    const renderLogCard = (log, index) => {
        const logLabel = index === 0 ? '기본 일지' : `연구 일지 (${index})`;
        const isPublic = log.isPublic || false;
        const masked = !isPublic && !isManager;
        const canDelete = isManager && isEditMode && logsData.length > 0;

        return `
            <div class="card log-entry ${masked ? 'masked-log' : ''}" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0;">${logLabel}</h4>
                    <span class="muted" style="font-size: 0.9em;">${log.createdAt ? fmtTime(log.createdAt) : '날짜 없음'}</span>
                </div>
                
                ${canDelete ? `<button class="btn-xs danger" data-action="delete" data-index="${index}" style="float: right;">- 삭제</button>` : ''}

                <p style="margin-top: 10px;">
                    <strong>제목:</strong> 
                    ${masked ? '<div class="masked-data"></div>' : renderInlineField({key: section, type: 'text'}, log.title, isEditMode, section, index, 'title')}
                </p>
                <p>
                    <strong>내용:</strong> 
                    ${masked ? '<div class="masked-data" style="height:50px;"></div>' : renderInlineField({key: section, type: 'textarea'}, log.content, isEditMode, section, index, 'content')}
                </p>

                ${isManager && isEditMode ? `
                    <p>
                        <input type="checkbox" data-key="${section}[${index}].isPublic" data-section="${section}" ${isPublic ? 'checked' : ''} style="margin-right:5px;"> 공개
                    </p>` : ''}
            </div>
        `;
    };

    // 일지가 없으면 안내 및 추가 버튼
    if (logsData.length === 0) {
        el.innerHTML = `
            <h3>연구 일지</h3>
            <div class="card muted" style="text-align:center; padding:20px;">연구 일지가 존재하지 않습니다.</div>
            ${isManager && isEditMode ? `<button class="btn primary" id="addLogBtn" style="margin-top:15px;">+ 연구 일지 추가</button>` : ''}
        `;
    } else {
        el.innerHTML = `
            <h3>연구 일지</h3>
            <div class="log-list">${logsData.map(renderLogCard).join('')}</div>
            ${isManager && isEditMode && logsData.length < 4 ? `<button class="btn primary" id="addLogBtn" style="margin-top:15px;">+ 연구 일지 추가</button>` : ''}
        `;
    }

    if (!isEditMode) return;

    // 인라인 편집 이벤트
    el.querySelectorAll('.inline-edit-field').forEach(field => {
        field.onchange = (e) => handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.value);
    });

    // 공개 체크박스 이벤트
    el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.onchange = (e) => handleEditFieldChange(data, e.target.dataset.section, e.target.dataset.key, e.target.checked);
    });

    // 추가 버튼
    document.getElementById('addLogBtn')?.addEventListener('click', () => {
        if (logsData.length < 4) {
            logsData.push({ title: '새 일지', content: '내용 없음', createdAt: new Date(), isPublic: false });
            renderLogsSection(el, data, isEditMode, isManager);
        }
    });

    // 삭제 버튼
    el.querySelectorAll('button[data-action="delete"]').forEach(btn => {
        btn.onclick = (e) => {
            const index = parseInt(e.target.dataset.index);
            logsData.splice(index, 1);
            renderLogsSection(el, data, isEditMode, isManager);
        };
    });
}

/**
 * 섹션 전체 공개 여부 설정
 * @param {Object} data - 심연체 전체 데이터
 * @param {string} sectionKey - 'basic', 'stats', 'management', 'logs'
 * @param {boolean} isPublic - 공개(true)/비공개(false)
 */
function setSectionDisclosure(data, sectionKey, isPublic) {
    switch(sectionKey) {
        case 'basic':
        case 'stats':
            const isPublicObj = data[sectionKey]?.isPublic;
            if (isPublicObj) {
                Object.keys(isPublicObj).forEach(key => isPublicObj[key] = isPublic);
            }
            break;

        case 'management':
            ['basicInfo', 'collectionInfo', 'otherInfo'].forEach(arrayKey => {
                data.management[arrayKey]?.forEach(item => item.isPublic = isPublic);
            });
            break;

        case 'logs':
            data.logs?.forEach(log => log.isPublic = isPublic);
            break;
    }
}

/**
 * 인라인 편집 필드 렌더링
 * @param {Object} f - 필드 설정 { key, type, readOnly, options, min }
 * @param {*} currentValue - 현재 값
 * @param {boolean} isEditMode - 편집 모드 여부
 * @param {string} section - 섹션 이름 (basic, stats, management 등)
 * @param {number|null} index - 배열 필드 인덱스 (없으면 null)
 * @param {string|null} subKey - 배열 내 서브 키 (없으면 null)
 * @returns {string} HTML 문자열
 */
function renderInlineField(f, currentValue, isEditMode, section, index = null, subKey = null) {
    // 배열 필드용 키 생성 (예: 'basicInfo[1].value')
    const key = index !== null ? `${f.key}[${index}].${subKey}` : f.key;

    if (!isEditMode || f.readOnly) return currentValue;

    switch(f.type) {
        case 'select':
            return `
                <select data-key="${key}" data-section="${section}" class="inline-edit-field form-control-inline">
                    ${f.options.map(opt => `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            `;
        case 'textarea':
            return `
                <textarea data-key="${key}" data-section="${section}" 
                          class="inline-edit-field form-control-inline" rows="3" style="width:100%;">${currentValue}</textarea>
            `;
        default:
            const type = f.type || 'text';
            return `
                <input type="${type}" data-key="${key}" data-section="${section}" 
                       class="inline-edit-field form-control-inline" value="${currentValue}" 
                       ${f.min !== undefined ? `min="${f.min}"` : ''} style="width:100%;">
            `;
    }
}

/* =========================================================
   내 정보
========================================================= */


// 진짜 내 정보 보여줌
async function renderMe(targetSheetId = null) {
    const isAdmin = await isAdminUser();
    let currentSheetId = targetSheetId || await getCurrentUserSheetId();

    if (!currentSheetId) {
        contentEl.innerHTML = '<div class="card muted">로그인 후 본인의 시트를 확인하세요.</div>';
        return;
    }
    if (targetSheetId && !isAdmin) {
        contentEl.innerHTML = '<div class="card error">권한이 없습니다.</div>';
        return;
    }

    contentEl.innerHTML = '<div class="card muted">시트 로딩중...</div>';

    try {
        const sheetData = await fetchSheetData(currentSheetId);
        const sheetContainer = document.createElement('div');
        sheetContainer.className = 'char-sheet-container';

        const nickname = sheetData.personnel?.name || currentSheetId;

        sheetContainer.appendChild(renderPersonnelSection(sheetData.personnel, nickname, currentSheetId, isAdmin));
        sheetContainer.appendChild(renderMeStatsSection(sheetData.stats, isAdmin, currentSheetId));
        sheetContainer.appendChild(await renderInventorySection(sheetData.inventory, isAdmin, currentSheetId));
        sheetContainer.appendChild(renderStatusSection(sheetData.status, sheetData.stats.spirit, isAdmin, currentSheetId));

        contentEl.innerHTML = '';
        contentEl.appendChild(sheetContainer);
    } catch(e) {
        console.error("Sheet load failed:", e);
        contentEl.innerHTML = `<div class="card error">시트 로드 실패: ${e.message}</div>`;
    }
}

// 인적사항
function renderPersonnelSection(p, nickname, sheetId, isAdmin) {
    const section = document.createElement('div');
    section.className = 'card map-card';

    section.innerHTML = `
        <h2 style="margin-top:0;">${nickname}님의 시트</h2>
        <div class="personnel-grid">
            <div class="photo-area">
                <img src="${p.photoUrl}" alt="프로필 사진" style="width:100%; aspect-ratio: 3/4; object-fit: cover;">
            </div>
            <div class="details-area">
                ${renderHorizontalTable('표 1: 기본 정보', [
                    { label: '이름', value: p.name },
                    { label: '성별', value: p.gender },
                    { label: '나이', value: p.age },
                    { label: '키/체중', value: `${p.height}cm / ${p.weight}kg` },
                    { label: '국적', value: p.nationality }
                ], isAdmin)}

                ${renderHorizontalTable('표 2: 상세 정보', [
                    { label: '학력', value: p.education },
                    { label: '경력', value: p.career },
                    { label: '가족관계', value: p.family },
                    { label: '연락처', value: p.contact },
                    { label: '결혼 여부', value: p.marriage },
                    { label: '병력', value: p.medical },
                    { label: '범죄 전과', value: p.criminal },
                    { label: '비고', value: p.etc, isLong: true }
                ], isAdmin)}
            </div>
        </div>
        ${isAdmin ? `<button class="btn link admin-edit-btn" onclick='openPersonnelEdit("${sheetId}", ${JSON.stringify(p)})'>인적사항 편집</button>` : ''}
    `;
    
    return section;
}

// 스텟
function renderMeStatsSection(s, isAdmin, sheetId) {
    const section = document.createElement('div');
    section.className = 'card map-card';

    const style = `
        .stats-grid-2x2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .stats-grid-2x2 > div {
            display: flex;
            flex-direction: column;
        }
        .stats-table-container {
            height: 100%; 
            display: flex;
            flex-direction: column;
        }
        .stats-table-container > div:first-child { 
            flex-grow: 1; 
        }
        .stats-row {
            display: flex;
            gap: 20px;
            flex-wrap: nowrap;
        }
        .stats-row > div {
            flex: 1;
            min-width: 0;
        }
        .stats-table-container {
            display: flex;
            flex-direction: column;
        }
    `;

    section.innerHTML = `
        <style>${style}</style>
        <h2>스테이터스</h2>
    <div class="stats-row">
        <div class="stats-table-container">
            ${renderHorizontalTable('표 1: 신체 스테이터스', [
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
        <div class="chart-container-1" style="min-height:300px;"></div>
        <div class="chart-container-2" style="min-height:300px;"></div>
        <div class="stats-table-container">
            ${renderHorizontalTable('표 2: 정신 스테이터스', [
                { label: '지능', value: s.intellect },
                { label: '판단력', value: s.judgment },
                { label: '기억력', value: s.memory },
                { label: '정신력', value: s.spirit },
                { label: '의사 결정 능력', value: s.decision },
                { label: '스트레스 내성', value: s.stress },
            ], isAdmin, true)}
        </div>
    </div>
    ${isAdmin ? `<button class="btn link admin-edit-btn" onclick='openStatsEdit("${sheetId}", ${JSON.stringify(s)})'>스테이터스 편집</button>` : ''}
`;

    // DOM에 삽입 후 차트 초기화
    setTimeout(() => initStatsRadarCharts(s), 0);

    return section;
}

async function renderInventorySection(inv, isAdmin, sheetId) {
    const section = document.createElement('div');
    section.className = 'card map-card';

    // 각 아이템 설명을 병렬로 가져오기 (desc가 있으면 바로 사용)
    const itemPromises = inv.items.map(item => item.desc ? Promise.resolve(item.desc) : fetchItemDescription(item.name));
    const descriptions = await Promise.all(itemPromises);

    let itemRows = '';
    if (inv.items.length === 0) {
        itemRows = `<tr><td colspan="4" style="text-align:center; color:#aaa;">소지한 물건이 없습니다.</td></tr>`;
    } else {
        inv.items.forEach((item, index) => {
            const desc = item.desc || descriptions[index];
            itemRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${desc}</td>
                    <td>${item.count}</td>
                </tr>
            `;
        });
    }

    section.innerHTML = `
        <h2>인벤토리</h2>
        <div style="margin-bottom:15px; font-weight:bold; padding:5px; background: rgba(255,255,255,0.05);">
            소지한 은화: <span style="color: gold;">${inv.silver}</span> 개
        </div>

        <table class="data-table" style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>번호</th>
                    <th>이름</th>
                    <th>설명</th>
                    <th>수량</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
            </tbody>
        </table>

        ${isAdmin ? `<button class="btn link admin-edit-btn" onclick='openInventoryEdit("${sheetId}", ${JSON.stringify(inv)})'>인벤토리 편집</button>` : ''}
    `;

    return section;
}

// 부위랑 통계
function renderStatusSection(s, spiritStat, isAdmin, sheetId) {
    const section = document.createElement('div');
    section.className = 'card map-card';

    const injuryParts = [
        'head', 'neck', 'leftEye', 'rightEye', 
        'leftArm','leftHand','leftLeg','leftFoot',
        'torso','rightArm','rightHand','rightLeg','rightFoot'
    ];

    const mapKeyToLabel = {
        head: '머리', neck: '목', leftEye: '왼쪽 안구', rightEye: '오른쪽 안구',
        leftArm: '왼팔', leftHand: '왼손', leftLeg: '왼다리', leftFoot: '왼발',
        torso: '상체', rightArm: '오른팔', rightHand: '오른손', rightLeg: '오른다리', rightFoot: '오른발'
    };

    const spiritPercent = (s.currentSpirit / s.maxSpirit) * 100;

    const totalInjury = injuryParts.reduce((sum, key) => sum + s.injuries[key], 0);
    const totalContamination = injuryParts.reduce((sum, key) => sum + s.contaminations[key], 0);
    let physicalStatusText = '양호';
    if (totalInjury > 50) physicalStatusText = '불안정';
    if (totalInjury > 100) physicalStatusText = '심각';
    if (totalInjury === 0 && totalContamination === 0) physicalStatusText = '여유로움';

    const humanIconHtml = renderHumanIcon(s.injuries, s.contaminations);

    const statusGridStyle = `
        .injury-status-grid-revised { display: flex; gap: 20px; align-items: stretch; }
        .injury-status-grid-revised > div { flex-grow: 1; flex-basis: 0; min-height: 400px; border: 1px solid rgba(255,255,255,0.1); padding: 10px; }
        .human-icon-container { display:flex; justify-content:center; align-items:center; background: rgba(255,255,255,0.05); }
    `;

    // 부위별 라벨에 의수 표시 추가
    const mapKeyToLabelWithProsthetics = {};
    injuryParts.forEach(key => {
        const prosthetic = s.status?.prosthetics?.[key] ? ' (의수)' : '';
        mapKeyToLabelWithProsthetics[key] = mapKeyToLabel[key] + prosthetic;
    });

    section.innerHTML = `
        <style>${statusGridStyle}</style>
        <h2>현재 상태</h2>

        <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px;">
            <div style="flex-grow:1;">
                <div style="font-weight:bold; margin-bottom:5px;">
                    현재 정신력: ${s.currentSpirit} / ${s.maxSpirit} (정신력 스탯: ${spiritStat})
                </div>
                <div style="background: rgba(255,255,255,0.1); height:15px; border-radius:4px; overflow:hidden;">
                    <div style="width:${spiritPercent}%; background:${spiritPercent>30?'green':'red'}; height:100%; transition:width 0.3s;"></div>
                </div>
            </div>
            <div style="min-width:200px; text-align:right;">
                <div style="color:${physicalStatusText==='여유로움'?'lime':'yellow'}; font-weight:bold;">
                    현재 신체 상태는 '${physicalStatusText}'입니다.
                </div>
                <div>현재 오염도: ${s.currentContamination}%</div>
                <div>현재 침식도: ${s.currentErosion}%</div>
            </div>
        </div>

        <div class="injury-status-grid-revised">
            <div class="injury-list left-side">
                ${renderInjuryBlock(['head','neck','leftEye','rightEye'], s, mapKeyToLabelWithProsthetics)}
                ${renderInjuryBlock(['leftArm','leftHand'], s, mapKeyToLabelWithProsthetics)}
                ${renderInjuryBlock(['leftLeg','leftFoot'], s, mapKeyToLabelWithProsthetics)}
            </div>

            <div class="human-icon-container">
                ${humanIconHtml}
            </div>

            <div class="injury-list right-side">
                ${renderInjuryBlock(['torso'], s, mapKeyToLabelWithProsthetics)}
                ${renderInjuryBlock(['rightArm','rightHand'], s, mapKeyToLabelWithProsthetics)}
                ${renderInjuryBlock(['rightLeg','rightFoot'], s, mapKeyToLabelWithProsthetics)}
            </div>
        </div>

        <h3 style="margin-top:30px;">현재 통계</h3>
        ${renderHorizontalTable('현재 통계', [
            { label:'죽은 횟수', value: s.stats.deaths },
            { label:'탐사를 나간 횟수', value: s.stats.explorations },
            { label:'면담을 진행한 횟수', value: s.stats.interviews },
            { label:'소지하고 있는 소지품 수', value: s.stats.itemsCarried },
            { label:'심연체를 제압한 횟수', value: s.stats.abyssDefeated },
            { label:'소지 은화', value: s.stats.silverCarried },
            { label:'현재 체력', value: s.currentHP },
            { label:'현재 정신력', value: s.currentSpirit },
        ], isAdmin, true)}

        ${isAdmin ? `<button class="btn link admin-edit-btn" onclick='openStatusEdit("${sheetId}", ${JSON.stringify(s)})'>상태 및 통계 편집</button>` : ''}
    `;

    return section;
}

// 사람 모양을 만들어 주다
function renderHumanIcon(injuries, contaminations) {
    // 부위별 색상 계산
    const colors = {
        head: calculatePartColor(injuries.head, contaminations.head),
        torso: calculatePartColor(injuries.torso, contaminations.torso),
        leftArm: calculatePartColor(injuries.leftArm, contaminations.leftArm),
        rightArm: calculatePartColor(injuries.rightArm, contaminations.rightArm),
        leftLeg: calculatePartColor(injuries.leftLeg, contaminations.leftLeg),
        rightLeg: calculatePartColor(injuries.rightLeg, contaminations.rightLeg),
    };

    // 간단화된 사람 SVG 아이콘
    return `
        <svg viewBox="0 0 100 170" style="width:100%; max-width:250px; height:400px;">
            <!-- 머리 -->
            <path d="M50 5 A1 1 0 0 0 50 31 A1 1 0 0 0 50 5 Z"
                  fill="${colors.head}" stroke="#888" stroke-width="1"/>
            
            <!-- 상체 -->
            <path d="M35 35 L65 35 L65 90 L35 90 Z"
                  fill="${colors.torso}" stroke="#888" stroke-width="1"/>
            
            <!-- 왼팔 -->
            <path d="M35 35 L28 35 C24 35 20 39 20 43 L20 90 C20 99 32 99 32 90 L32 56 C32 55 34 53 35 53 Z"
                  fill="${colors.leftArm}" stroke="#888" stroke-width="1"/>
            
            <!-- 오른팔 -->
            <path d="M65 35 L72 35 C76 35 79 39 79 43 L80 90 C80 99 68 99 68 90 L68 56 C68 54 67 53 65 53 Z"
                  fill="${colors.rightArm}" stroke="#888" stroke-width="1"/>
            
            <!-- 왼다리 -->
            <path d="M35 90 L35 153 C35 162 48 162 48 153 L48 97 C48 96 49 95 50 95 L50 90 Z"
                  fill="${colors.leftLeg}" stroke="#888" stroke-width="1"/>
            
            <!-- 오른다리 -->
            <path d="M50 90 L50 95 C51 95 52 96 52 97 L52 153 C52 162 65 162 65 153 L65 90 Z"
                  fill="${colors.rightLeg}" stroke="#888" stroke-width="1"/>
        </svg>
    `;
}

function renderInjuryBlock(parts, status, mapKeyToLabel) {
    let detailRows = '';

    parts.forEach(key => {
        const isMainPart = mapKeyToLabel[key].startsWith('<'); // 대표 부위인지 확인
        const injury = status.injuries[key];
        const contamination = status.contaminations[key];

        const [injuryText, contaminationText] = getStatusText(injury, contamination);
        const color = calculatePartColor(injury, contamination);

        if (isMainPart) {
            // 대표 부위: 강조 표시, 부상/오염 텍스트 포함
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
            // 서브 부위: 왼쪽 라벨, 오른쪽 내용
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

function getStatusText(injuryPercent, contaminationPercent) {
    // 부상 텍스트
    let injuryText = injuryPercent === 0 ? "부상 없음."
                    : injuryPercent <= 10 ? "경미한 찰과상."
                    : injuryPercent <= 30 ? "타박상 및 출혈."
                    : injuryPercent <= 60 ? "깊은 상처 및 골절 가능성."
                    : "심각한 부상, 활동 불가 수준.";

    // 오염 텍스트
    let contaminationText = contaminationPercent === 0 ? "오염 없음."
                          : contaminationPercent <= 10 ? "경미한 오염, 즉시 제거 가능."
                          : contaminationPercent <= 30 ? "중간 오염, 징후 발현."
                          : contaminationPercent <= 60 ? "심각한 오염, 신체 능력 저하."
                          : "치명적인 오염, 변이 진행 중.";

    return [injuryText, contaminationText];
}

// 아이템 가져오기
async function fetchItemDescription(itemName) {
    try {
        const q = query(collection(db, 'items'), where('name', '==', itemName));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            return snap.docs[0].data().description || "설명 없음";
        }
    } catch(e) {
        console.error("Failed to fetch item description:", e);
    }
    return "설명 없음 (DB 로드 실패)";
}

/* =========================================================
    새 시트 만들기
========================================================= */

function createDefaultSheet(uid, nickname) {
    const injuryKeys = [
        'head','neck','leftEye','rightEye',
        'leftArm','leftHand','leftLeg','leftFoot',
        'torso','rightArm','rightHand','rightLeg','rightFoot'
    ];
    const initialInjuryState = injuryKeys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

    // 머리 제외한 부위 의수 여부 초기화
    const prostheticsState = injuryKeys
        .filter(k => k !== 'head')
        .reduce((acc, key) => ({ ...acc, [key]: false }), {});

    return {
        personnel: {
            name: nickname || '인턴 사원',
            gender: '미상',
            age: 0,
            height: 0,
            weight: 0,
            nationality: '미상',
            education: '미상',
            career: '미상',
            family: '없음',
            contact: '없음',
            marriage: '미상',
            medical: '없음',
            criminal: '없음',
            etc: '특이사항 없음',
            photoUrl: ''
        },
        stats: baseStats,
        inventory: {
            silver: 0,
            items: []
        },
        status: {
            currentSpirit: 60,
            maxSpirit: (10 * (baseStats.spirit || 1)) + 50,
            currentHP: 60,
            maxHP: (10 * (baseStats.spirit || 1)) + 50,
            injuries: { ...initialInjuryState },
            contaminations: { ...initialInjuryState },
            prosthetics: { ...prostheticsState },
            currentContamination: 0,
            currentErosion: 0,
            stats: { deaths: 0, explorations: 0, interviews: 0, itemsCarried: 0, abyssDefeated: 0, silverCarried: 0 }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

/* =========================================================
    시트 관련
========================================================= */

async function fetchSheetData(sheetId) {
    const docRef = doc(db, 'sheets', sheetId);
    const sheetDoc = await getDoc(docRef);

    if (!sheetDoc.exists()) {
        throw new Error(`Sheet data not found for ID: ${sheetId}`);
    }

    return sheetDoc.data();
}
