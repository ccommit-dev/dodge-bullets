const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach(
      (entry) => entry.isIntersecting && entry.target.classList.add("visible"),
    ),
  { threshold: 0.12 },
);

document
  .querySelectorAll(".reveal")
  .forEach((element) => observer.observe(element));

// A file:// preview cannot execute a directory URL. Open the running Vite app
// locally, while GitHub Pages opens the generated game entry file directly.
const demoUrl =
  window.location.protocol === "file:"
    ? "http://localhost:5173/"
    : new URL("game/index.html", window.location.href).href;

document.querySelectorAll(".demo-link").forEach((link) => {
  link.setAttribute("href", demoUrl);
});

const poster = document.querySelector(".poster");
const visual = document.querySelector(".poster-wrap");
if (poster && visual && matchMedia("(pointer: fine)").matches) {
  visual.addEventListener("mousemove", (event) => {
    const box = visual.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    poster.style.transform = `rotateY(${x * 10 - 7}deg) rotateX(${-y * 8 + 3}deg)`;
  });
  visual.addEventListener("mouseleave", () => {
    poster.style.transform = "rotateY(-7deg) rotateX(3deg)";
  });
}

const notifyForm = document.querySelector("#notify-form");
const phoneInput = document.querySelector("#notify-phone");
const consentInput = document.querySelector("#notify-consent");
const phoneMessage = document.querySelector("#phone-message");

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

phoneInput?.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
  phoneMessage.textContent = "";
  phoneMessage.classList.remove("success");
});

notifyForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const validPhone = /^010-\d{4}-\d{4}$/.test(phoneInput?.value ?? "");

  phoneMessage.classList.remove("success");
  if (!validPhone) {
    phoneMessage.textContent = "010으로 시작하는 휴대폰 번호를 확인해 주세요.";
    phoneInput?.focus();
    return;
  }
  if (!consentInput?.checked) {
    phoneMessage.textContent = "출시 알림을 신청하려면 필수 동의가 필요합니다.";
    consentInput?.focus();
    return;
  }

  phoneMessage.textContent =
    "프론트 화면 테스트가 완료되었습니다. 번호는 저장되지 않았습니다.";
  phoneMessage.classList.add("success");
});
