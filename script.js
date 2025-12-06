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
const auth = getAuth();

// DOM 요소들
const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");

const loginBtn = document.getElementById("loginBtn");
const goSignupBtn = document.getElementById("showSignupBtn");
const signupSubmitBtn = document.getElementById("signupSubmitBtn");
const goLoginBtn = document.getElementById("goLoginBtn");

const loginMsg = document.getElementById("loginMsg");
const signupMsg = document.getElementById("signupMsg");
const content = document.getElementById("content");

// HEX 색상
function randomHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

// 페이지 내용
const pages = {
  main: "<h2>메인</h2>",
  staff: "<h2>직원</h2>",
  me: "<h2>내 상태</h2>",
  map: "<h2>맵</h2>",
  dex: "<h2>도감</h2>",
  etc: "<h2>기타</h2>"
};

function loadPage(key) {
  content.innerHTML = pages[key];
}

// ----------------- 기능들 -----------------

// 로그인
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value;
  const pw = document.getElementById("pwInput").value;

  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch (e) {
    loginMsg.textContent = "로그인 실패";
  }
});

// 회원가입 화면으로 이동
goSignupBtn.addEventListener("click", () => {
  loginBox.style.display = "none";
  signupBox.style.display = "block";
});

// 회원가입 제출
signupSubmitBtn.addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value;
  const pw = document.getElementById("signupPw").value;
  const nickname = document.getElementById("signupNick").value;

  if (!nickname) {
    signupMsg.textContent = "닉네임 입력 필요";
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pw);
    const uid = userCred.user.uid;

    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      nickname,
      profileColor: randomHex(),
      decorations: []
    });

    signupMsg.textContent = "회원가입 완료";
  } catch {
    signupMsg.textContent = "회원가입 실패";
  }
});

// 회원가입 → 로그인 이동
goLoginBtn.addEventListener("click", () => {
  signupBox.style.display = "none";
  loginBox.style.display = "block";
});

// 로그인 상태 감지
onAuthStateChanged(auth, async user => {
  if (user) {
    loginBox.style.display = "none";
    signupBox.style.display = "none";
    loadPage("main");
  } else {
    loginBox.style.display = "block";
    signupBox.style.display = "none";
  }
});
