import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const { db } = window._firebase;

// 페이지 로딩 부분 네 코드 그대로 유지
const content = document.getElementById("content");

const pages = {
  main: `
    <h2>메인</h2>
    <p>· 직원 생존·실종·사망 현황</p>
    <p>· 심연의 기류</p>
    <p>· 일정 및 공지</p>
    <p>· 이벤트 현황</p>
    <p>· 직원 순위</p>
  `,
  staff: `
    <h2>직원</h2>
    <p>· 직원 목록</p>
    <p>· 타 직원 프로필</p>
  `,
  me: `
    <h2>내 상태</h2>
    <p>· 부상 · 침식 · 오염도</p>
    <p>· 소지 은화</p>
    <p>· 소지품</p>
    <p>· 개인 통계</p>
  `,
  map: `
    <h2>맵</h2>
    <p>· 장소 소개</p>
    <p>· 탐사 기록</p>
    <p>· 댓글</p>
  `,
  dex: `
    <h2>도감</h2>
    <p>· 심연체 도감</p>
    <p>· 도감 달성률</p>
    <p>· 댓글</p>
  `,
  etc: `
    <h2>기타</h2>
    <p>· 현재 시간</p>
    <p>· 스티커</p>
  `
};

function loadPage(key) {
  content.innerHTML = pages[key] || "오류 발생";
  if (key === "main") fetchEmployeeCount();
}

async function fetchEmployeeCount() {
  const docRef = doc(db, "system", "employeeStatus");
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    const elem = document.createElement("div");
    elem.style.marginTop = "20px";
    elem.innerHTML = `
      <h3>직원 현황 (실시간)</h3>
      <p>생존: ${data.alive}</p>
      <p>실종: ${data.missing}</p>
      <p>사망: ${data.dead}</p>
    `;
    content.appendChild(elem);
  }
}

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => loadPage(btn.dataset.tab));
});

// ------------------------
// Firebase Auth Login
// ------------------------

const auth = getAuth();

const loginBox = document.getElementById("loginBox");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const msg = document.getElementById("loginMsg");

// 로그인
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value;
  const pw = document.getElementById("pwInput").value;

  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch (e) {
    msg.textContent = "로그인 실패";
  }
});

// 회원가입
signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value;
  const pw = document.getElementById("pwInput").value;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pw);
    const uid = userCred.user.uid;

    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      nickname: "",
      profileColor: "",
      decorations: []
    });

    msg.textContent = "회원가입 완료";
  } catch (e) {
    msg.textContent = "회원가입 실패";
  }
});

// 로그인 상태 감지
onAuthStateChanged(auth, async user => {
  if (user) {
    loginBox.style.display = "none";

    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        nickname: "",
        profileColor: "",
        decorations: []
      });
    }

    loadPage("main");
  } else {
    loginBox.style.display = "block";
  }
});
