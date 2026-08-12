const observer = new IntersectionObserver(
  (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible")),
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

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
