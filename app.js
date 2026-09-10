import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

const directions = {
  preserve: {
    index: "01",
    kicker: "Сохранить",
    title: "Защитить заводское состояние",
    lead: "Защита кузова, стекол и элементов автомобиля от ежедневных эксплуатационных воздействий.",
    angle: 0.35,
    services: [
      "ppf",
      "windshield-film",
      "protective-polish",
      "protective-coating",
      "radiator-mesh",
      "anticorrosion"
    ]
  },
  restore: {
    index: "02",
    kicker: "Восстановить",
    title: "Вернуть внешний вид и состояние",
    lead: "Работа с дефектами кузова, стекол и салона с приоритетом сохранения заводских элементов автомобиля.",
    angle: -0.55,
    services: [
      "detailing-wash",
      "body-polish",
      "pdr",
      "paint",
      "chips",
      "glass-repair",
      "interior-clean",
      "leather",
      "plastic"
    ]
  },
  tune: {
    index: "03",
    kicker: "Тюнинг",
    title: "Изменить стиль, комфорт и оснащение",
    lead: "Внешняя персонализация, комфорт движения и дополнительное оборудование с индивидуальным подбором под автомобиль.",
    angle: 1.2,
    services: [
      "soundproof",
      "anti-chrome",
      "tint",
      "steering",
      "interior-trim",
      "alarm",
      "closers",
      "ambient",
      "steps",
      "dashcam",
      "towbar",
      "forged-wheels",
      "suspension"
    ]
  }
};

const services = {
  "ppf": {
    title: "Антигравийная полиуретановая плёнка",
    direction: "preserve",
    lead: "Защита кузова от сколов с возможностью полной или частичной оклейки.",
    benefits: ["Защита от сколов", "Самовосстановление", "УФ-защита", "Полная или частичная оклейка"],
    note: "Работа выполняется по технологическим регламентам TI Detailing с применением сертифицированных материалов."
  },
  "windshield-film": {
    title: "Оклейка лобового стекла плёнкой",
    direction: "preserve",
    lead: "Дополнительная защита лобового стекла в процессе эксплуатации.",
    benefits: ["Защита от сколов", "Продление срока службы стекла"],
    note: "Конкретный материал, доступные варианты и условия гарантии должны быть подтверждены TI Detailing перед публикацией."
  },
  "protective-polish": {
    title: "Защитная полировка",
    direction: "preserve",
    lead: "Полировка как часть профессионального ухода и сохранения состояния лакокрасочного покрытия.",
    benefits: ["Работа с внешним видом ЛКП", "Профессиональный технологический процесс", "Бережный подход к толщине лака"],
    note: "В презентации TI указана восстановительная и защитная полировка как отдельное направление специализации."
  },
  "protective-coating": {
    title: "Защитные покрытия",
    direction: "preserve",
    lead: "Профессиональные защитные покрытия входят в специализацию TI Detailing Kostanay.",
    benefits: ["Профессиональный подбор решения", "Подбор технологии по состоянию автомобиля", "Контроль результата перед выдачей"],
    note: "Типы покрытий, составы, сроки службы и гарантийные условия нужно дополнить после подтверждения TI Detailing."
  },
  "radiator-mesh": {
    title: "Сетка в решётку радиатора",
    direction: "preserve",
    lead: "Практичная защита радиатора от механических повреждений.",
    benefits: ["Защита радиатора от повреждений"],
    note: "Индивидуальный подбор решения под автомобиль и задачи владельца."
  },
  "anticorrosion": {
    title: "Антикоррозийная обработка",
    direction: "preserve",
    lead: "Защита уязвимых элементов автомобиля от реагентов и влаги.",
    benefits: ["Обработка днища", "Обработка колесных арок", "Защита от реагентов и влаги"],
    note: "Состав материалов и регламент обработки уточняются под конкретный автомобиль."
  },
  "detailing-wash": {
    title: "Профессиональная детейлинг-мойка",
    direction: "restore",
    lead: "Профессиональная детейлинг-мойка указана в презентации как одно из основных направлений TI Detailing Kostanay.",
    benefits: ["Профессиональный уход за автомобилем", "Работа по стандартам сети TI Detailing", "Контроль результата"],
    note: "Этапы мойки и конкретный перечень операций необходимо получить у TI Detailing для полноценной страницы услуги."
  },
  "body-polish": {
    title: "Полировка кузова",
    direction: "restore",
    lead: "Восстановление визуального состояния лакокрасочного покрытия с бережным отношением к толщине лака.",
    benefits: ["Восстановление глубины цвета", "Удаление царапин и потертостей", "Максимальное сохранение толщины ЛКП", "Профессиональные пасты без силикона"],
    note: "Перед работой TI Detailing подбирает решение по состоянию автомобиля и толщине ЛКП."
  },
  "pdr": {
    title: "PDR — удаление вмятин без покраски",
    direction: "restore",
    lead: "Восстановление геометрии детали без традиционного малярного ремонта, где технология применима.",
    benefits: ["Сохранение заводского ЛКП", "Без шпаклевки", "Быстрое восстановление геометрии"],
    note: "Применимость PDR определяется после диагностики конкретного повреждения."
  },
  "paint": {
    title: "Малярные работы",
    direction: "restore",
    lead: "Локальные и полные малярные работы с профессиональным подбором цвета.",
    benefits: ["Локальный и полный окрас", "Точный подбор цвета", "Камерная покраска"],
    note: "Объем ремонта определяется после осмотра автомобиля."
  },
  "chips": {
    title: "Восстановление сколов и царапин без покраса",
    direction: "restore",
    lead: "Локальная работа с дефектами при приоритете сохранения заводского покрытия.",
    benefits: ["Устранение локальных дефектов", "Сохранение заводского покрытия"],
    note: "Возможность восстановления без окраса определяется после диагностики дефекта."
  },
  "glass-repair": {
    title: "Ремонт сколов и трещин стёкол",
    direction: "restore",
    lead: "Локальное восстановление повреждений автомобильного стекла.",
    benefits: ["Полимерное восстановление", "Предотвращение роста трещин"],
    note: "Ремонтопригодность зависит от типа, размера и расположения повреждения."
  },
  "interior-clean": {
    title: "Химчистка салона",
    direction: "restore",
    lead: "Глубокая профессиональная очистка салона автомобиля.",
    benefits: ["Глубокая очистка", "Удаление запахов", "Антибактериальная обработка"],
    note: "TI Detailing заявляет химчистку салона любой сложности как одно из ключевых направлений."
  },
  "leather": {
    title: "Восстановление кожи",
    direction: "restore",
    lead: "Работа с повреждениями и следами эксплуатации кожаных элементов салона.",
    benefits: ["Устранение трещин и потертостей", "Подбор цвета"],
    note: "Технология выбирается после оценки состояния конкретного элемента."
  },
  "plastic": {
    title: "Восстановление пластика",
    direction: "restore",
    lead: "Восстановление внешнего вида пластиковых и декоративных элементов салона.",
    benefits: ["Удаление царапин", "Обновление декоративных элементов"],
    note: "Результат и технология зависят от материала и глубины повреждения."
  },
  "soundproof": {
    title: "Премиальная шумоизоляция",
    direction: "tune",
    lead: "Комплексная работа с акустическим комфортом автомобиля.",
    benefits: ["Снижение дорожного шума", "Улучшение акустики", "Повышение комфорта"],
    note: "В презентации TI указан премиальный сегмент материалов ComfortMat."
  },
  "anti-chrome": {
    title: "Антихром",
    direction: "tune",
    lead: "Изменение внешнего образа автомобиля с акцентом на Black Edition стилистику.",
    benefits: ["Удаление хрома", "Окрашивание и лакировка", "Стиль Black Edition"],
    note: "Конкретная технология выбирается для каждого элемента отдельно."
  },
  "tint": {
    title: "Тонировка",
    direction: "tune",
    lead: "Изменение уровня приватности и комфорта салона.",
    benefits: ["УФ-защита", "Комфорт и приватность"],
    note: "Виды пленок и допустимые параметры следует дополнить после согласования ассортимента TI Detailing."
  },
  "steering": {
    title: "Перешив руля",
    direction: "tune",
    lead: "Обновление или персонализация одного из главных тактильных элементов салона.",
    benefits: ["Премиальные материалы", "Индивидуальный дизайн"],
    note: "Материалы и варианты исполнения согласовываются индивидуально."
  },
  "interior-trim": {
    title: "Перешив элементов салона",
    direction: "tune",
    lead: "Персонализация и обновление отдельных элементов интерьера.",
    benefits: ["Кожа / алькантара", "Индивидуальный стиль"],
    note: "Конфигурация проекта и материалы подбираются индивидуально."
  },
  "alarm": {
    title: "Сигнализации Pandora / StarLine",
    direction: "tune",
    lead: "Установка дополнительного оборудования с подбором под автомобиль и задачи владельца.",
    benefits: ["Pandora", "StarLine", "Индивидуальный подбор под автомобиль"],
    note: "Модели оборудования, функции и совместимость подтверждаются перед установкой."
  },
  "closers": {
    title: "Доводчики дверей",
    direction: "tune",
    lead: "Дополнительное оборудование для повышения повседневного комфорта.",
    benefits: ["Индивидуальный подбор под автомобиль", "Интеграция в задачи владельца"],
    note: "Совместимость и комплект оборудования определяются по модели автомобиля."
  },
  "ambient": {
    title: "Амбиентная подсветка",
    direction: "tune",
    lead: "Персонализация атмосферы салона с помощью дополнительной подсветки.",
    benefits: ["Индивидуальный подбор", "Персонализация салона"],
    note: "Варианты исполнения и интеграции уточняются под конкретный автомобиль."
  },
  "steps": {
    title: "Выдвижные пороги",
    direction: "tune",
    lead: "Дополнительное оборудование для удобства посадки и повседневной эксплуатации.",
    benefits: ["Индивидуальный подбор под автомобиль"],
    note: "Совместимость и комплектация уточняются по автомобилю."
  },
  "dashcam": {
    title: "Видеорегистраторы",
    direction: "tune",
    lead: "Подбор и установка автомобильных видеорегистраторов.",
    benefits: ["Индивидуальный подбор под автомобиль", "Профессиональная установка"],
    note: "Модели и варианты интеграции необходимо дополнить актуальным ассортиментом TI Detailing."
  },
  "towbar": {
    title: "Фаркопы и блоки согласования",
    direction: "tune",
    lead: "Подбор и установка дополнительного оборудования с учетом электроники автомобиля.",
    benefits: ["Фаркоп", "Блок согласования", "Индивидуальный подбор"],
    note: "Комплект определяется по модели и задачам владельца."
  },
  "forged-wheels": {
    title: "Кованые диски",
    direction: "tune",
    lead: "Индивидуальный подбор колесных дисков под автомобиль и визуальную задачу проекта.",
    benefits: ["Индивидуальный подбор под автомобиль", "Персонализация внешнего вида"],
    note: "Бренды, размеры и доступные дизайны необходимо подключить из актуального каталога TI Detailing."
  },
  "suspension": {
    title: "Усиленная подвеска",
    direction: "tune",
    lead: "Модернизация подвески с индивидуальным подбором решения.",
    benefits: ["Индивидуальный подбор под автомобиль", "Подбор под задачи владельца"],
    note: "Комплектация и параметры проекта должны определяться специалистом после консультации."
  }
};

const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const panel = document.getElementById("directionPanel");
const panelIndex = document.getElementById("panelIndex");
const panelKicker = document.getElementById("panelKicker");
const panelTitle = document.getElementById("panelTitle");
const panelLead = document.getElementById("panelLead");
const panelServices = document.getElementById("panelServices");
const serviceDirections = document.getElementById("serviceDirections");
const serviceModal = document.getElementById("serviceModal");
const modalDirection = document.getElementById("modalDirection");
const modalTitle = document.getElementById("serviceModalTitle");
const modalLead = document.getElementById("modalLead");
const modalBenefits = document.getElementById("modalBenefits");
const modalNote = document.getElementById("modalNote");
const modalNoteWrap = document.getElementById("modalNoteWrap");
const stage = document.getElementById("stageWrap");
const canvas = document.getElementById("carCanvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let activeDirection = null;
let lastFocused = null;

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 20);
}, { passive: true });

menuToggle.addEventListener("click", () => {
  const open = !mobileMenu.classList.contains("open");
  mobileMenu.classList.toggle("open", open);
  menuToggle.classList.toggle("active", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  mobileMenu.setAttribute("aria-hidden", String(!open));
});
mobileMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mobileMenu.classList.remove("open");
  menuToggle.classList.remove("active");
  menuToggle.setAttribute("aria-expanded", "false");
  mobileMenu.setAttribute("aria-hidden", "true");
}));

document.querySelector(".panel-close").addEventListener("click", closeDirection);

function renderServiceColumns() {
  serviceDirections.innerHTML = Object.entries(directions).map(([key, direction]) => `
    <section class="direction-column" data-column="${key}">
      <div class="direction-column-head">
        <div class="index">${direction.index} / 03</div>
        <h3>${direction.kicker}</h3>
        <p>${direction.lead}</p>
      </div>
      ${direction.services.map(slug => {
        const service = services[slug];
        return `<button class="service-row" type="button" data-service="${slug}"><span>${service.title}</span><span class="arrow">↗</span></button>`;
      }).join("")}
    </section>
  `).join("");
}
renderServiceColumns();

function selectDirection(key) {
  const direction = directions[key];
  if (!direction) return;
  activeDirection = key;
  targetRotation = direction.angle;
  targetCameraDistance = 8.0;
  panelIndex.textContent = `0${direction.index} / 03`;
  panelKicker.textContent = direction.kicker;
  panelTitle.textContent = direction.title;
  panelLead.textContent = direction.lead;
  panelServices.innerHTML = direction.services.slice(0, 6).map(slug => `
    <div class="panel-service"><span>${services[slug].title}</span><button type="button" data-service="${slug}" aria-label="Подробнее об услуге">↗</button></div>
  `).join("");
  panel.classList.add("open");
  document.querySelectorAll("[data-direction]").forEach(node => node.classList.toggle("active", node.dataset.direction === key));
}

function closeDirection() {
  activeDirection = null;
  targetCameraDistance = 9.4;
  panel.classList.remove("open");
  document.querySelectorAll("[data-direction]").forEach(node => node.classList.remove("active"));
}

document.querySelectorAll(".hotspot, .direction-tab").forEach(button => {
  button.addEventListener("click", () => selectDirection(button.dataset.direction));
});

function openService(slug) {
  const service = services[slug];
  if (!service) return;
  lastFocused = document.activeElement;
  modalDirection.textContent = directions[service.direction].kicker;
  modalTitle.textContent = service.title;
  modalLead.textContent = service.lead;
  modalBenefits.innerHTML = service.benefits.map(item => `<li>${item}</li>`).join("");
  modalNote.textContent = service.note || "";
  modalNoteWrap.hidden = !service.note;
  serviceModal.classList.add("open");
  serviceModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => serviceModal.querySelector(".modal-close").focus());
}

function closeService() {
  serviceModal.classList.remove("open");
  serviceModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocused) lastFocused.focus();
}

document.addEventListener("click", event => {
  const serviceTrigger = event.target.closest("[data-service]");
  if (serviceTrigger) openService(serviceTrigger.dataset.service);
  if (event.target.closest("[data-close-modal]")) closeService();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (serviceModal.classList.contains("open")) closeService();
    else closeDirection();
  }
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(node => revealObserver.observe(node));

// ---------------------------------------------------------------------------
// Procedural 3D concept car. Production asset will replace this group later.
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.35 : 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080808, 0.042);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
let targetCameraDistance = 9.4;
let currentCameraDistance = 9.4;
const cameraAngle = 0.78;

const ambient = new THREE.HemisphereLight(0xbfc9ff, 0x181812, 1.5);
scene.add(ambient);

const key = new THREE.SpotLight(0xffffff, 75, 30, Math.PI / 5.5, .5, 1.5);
key.position.set(4, 9, 4);
key.target.position.set(0, .8, 0);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key, key.target);

const rim = new THREE.SpotLight(0x8fa6ff, 42, 24, Math.PI / 4.5, .55, 1.5);
rim.position.set(-5, 5, -5);
rim.target.position.set(0, 1, 0);
scene.add(rim, rim.target);

const accentLight = new THREE.PointLight(0xd8ff3e, 12, 10, 2);
accentLight.position.set(1, .4, 2.2);
scene.add(accentLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(18, 96),
  new THREE.MeshStandardMaterial({ color: 0x070707, roughness: .6, metalness: .1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -.22;
floor.receiveShadow = true;
scene.add(floor);

const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(4.15, 4.45, .22, 96),
  new THREE.MeshStandardMaterial({ color: 0x111112, metalness: .72, roughness: .24 })
);
platform.position.y = -.08;
platform.receiveShadow = true;
platform.castShadow = true;
scene.add(platform);

const platformRing = new THREE.Mesh(
  new THREE.TorusGeometry(4.22, .018, 10, 120),
  new THREE.MeshBasicMaterial({ color: 0x808080, transparent: true, opacity: .38 })
);
platformRing.rotation.x = Math.PI / 2;
platformRing.position.y = .04;
scene.add(platformRing);

const car = new THREE.Group();
car.position.y = .04;
scene.add(car);

const paint = new THREE.MeshPhysicalMaterial({
  color: 0x111215,
  metalness: .78,
  roughness: .18,
  clearcoat: 1,
  clearcoatRoughness: .08
});
const darkPaint = new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: .82, roughness: .2, clearcoat: .9 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x101824, metalness: .1, roughness: .08, transmission: .12, transparent: true, opacity: .84 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .68, metalness: .04 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0x5a5d60, roughness: .22, metalness: .92 });
const lightWhite = new THREE.MeshStandardMaterial({ color: 0xf4f7ff, emissive: 0xcddcff, emissiveIntensity: 4.5 });
const lightRed = new THREE.MeshStandardMaterial({ color: 0x6b0608, emissive: 0xff1426, emissiveIntensity: 2.8 });

function box(w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 3, 2, 3), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  car.add(mesh);
  return mesh;
}

// Main volumes: intentionally abstract, not a branded vehicle model.
box(4.55, .60, 1.86, paint, 0, .76, 0);
box(1.55, .34, 1.78, paint, 1.38, 1.10, 0, 0, 0, -.055);
box(1.12, .30, 1.72, paint, -1.68, 1.06, 0, 0, 0, .05);
box(2.15, .62, 1.56, paint, -.22, 1.42, 0);
box(1.55, .06, 1.46, darkPaint, -.25, 1.77, 0);

// Glasshouse.
box(.78, .48, 1.50, glass, .48, 1.48, 0, 0, 0, -.44);
box(.80, .48, 1.50, glass, -.90, 1.48, 0, 0, 0, .42);
box(.98, .42, .025, glass, -.20, 1.47, .79, 0, 0, 0);
box(.98, .42, .025, glass, -.20, 1.47, -.79, 0, 0, 0);

// Bumpers, skirts, lights.
box(.20, .26, 1.72, darkPaint, 2.32, .70, 0);
box(.20, .25, 1.72, darkPaint, -2.32, .70, 0);
box(2.62, .13, .11, darkPaint, -.05, .46, 1.00);
box(2.62, .13, .11, darkPaint, -.05, .46, -1.00);
box(.08, .10, .55, lightWhite, 2.34, 1.00, .54, 0, 0, -.05);
box(.08, .10, .55, lightWhite, 2.34, 1.00, -.54, 0, 0, -.05);
box(.08, .11, .50, lightRed, -2.34, 1.00, .54);
box(.08, .11, .50, lightRed, -2.34, 1.00, -.54);

// Mirrors.
box(.34, .13, .18, paint, .42, 1.46, 1.02, 0, .16, 0);
box(.34, .13, .18, paint, .42, 1.46, -1.02, 0, -.16, 0);

function wheel(x, z) {
  const wheelGroup = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .34, 40, 1), rubber);
  tire.rotation.x = Math.PI / 2;
  tire.castShadow = true;
  const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(.29, .29, .355, 16, 1), rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .37, 24), darkPaint);
  hub.rotation.x = Math.PI / 2;
  wheelGroup.add(tire, rimMesh, hub);
  wheelGroup.position.set(x, .50, z);
  car.add(wheelGroup);
}
wheel(1.43, 1.00); wheel(1.43, -1.00); wheel(-1.43, 1.00); wheel(-1.43, -1.00);

// Subtle center line and grille details.
for (let i = -3; i <= 3; i++) box(.035, .24, .05, rimMat, 2.425, .70 + i * .035, i * .18);

const anchorMap = {
  preserve: new THREE.Vector3(1.28, 1.37, .78),
  restore: new THREE.Vector3(-.35, 1.76, -.70),
  tune: new THREE.Vector3(-1.42, .62, 1.06)
};

const hotspotEls = {
  preserve: document.querySelector(".hotspot-preserve"),
  restore: document.querySelector(".hotspot-restore"),
  tune: document.querySelector(".hotspot-tune")
};

let targetRotation = .12;
let currentRotation = .12;
let pointerDown = false;
let dragged = false;
let lastX = 0;

canvas.addEventListener("pointerdown", event => {
  pointerDown = true;
  dragged = false;
  lastX = event.clientX;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", event => {
  if (!pointerDown) return;
  const dx = event.clientX - lastX;
  if (Math.abs(dx) > 1) dragged = true;
  targetRotation += dx * .008;
  lastX = event.clientX;
});
canvas.addEventListener("pointerup", event => {
  pointerDown = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener("pointercancel", () => { pointerDown = false; });

function resize() {
  const rect = stage.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

const projected = new THREE.Vector3();
function updateHotspots() {
  const rect = stage.getBoundingClientRect();
  Object.entries(anchorMap).forEach(([name, local]) => {
    projected.copy(local);
    car.localToWorld(projected);
    projected.project(camera);
    const x = (projected.x * .5 + .5) * rect.width;
    const y = (-projected.y * .5 + .5) * rect.height;
    const visible = projected.z < 1 && x > -40 && x < rect.width + 40 && y > -40 && y < rect.height + 40;
    const el = hotspotEls[name];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.opacity = visible ? "1" : "0";
    el.style.pointerEvents = visible ? "auto" : "none";
  });
}

const clock = new THREE.Clock();
function animate() {
  const delta = Math.min(clock.getDelta(), .05);
  const speed = reduceMotion ? 1 : 1 - Math.pow(.001, delta);
  currentRotation += (targetRotation - currentRotation) * speed;
  currentCameraDistance += (targetCameraDistance - currentCameraDistance) * speed;
  car.rotation.y = currentRotation;
  platform.rotation.y += reduceMotion ? 0 : delta * .012;

  const responsivePull = window.innerWidth < 820 ? 1.12 : 1;
  const distance = currentCameraDistance * responsivePull;
  camera.position.set(Math.sin(cameraAngle) * distance, window.innerWidth < 820 ? 3.25 : 3.65, Math.cos(cameraAngle) * distance);
  camera.lookAt(0, .88, 0);

  renderer.render(scene, camera);
  updateHotspots();
}
renderer.setAnimationLoop(animate);

// Give the hero a living initial state without distracting from the interaction.
if (!reduceMotion) {
  let idleStart = performance.now();
  const idle = () => {
    if (!activeDirection && !pointerDown && performance.now() - idleStart < 4200) {
      targetRotation = .12 + Math.sin((performance.now() - idleStart) / 1700) * .09;
      requestAnimationFrame(idle);
    }
  };
  requestAnimationFrame(idle);
}

// Hash deep-link for a direction, e.g. #preserve.
const hashDirection = location.hash.replace("#", "");
if (directions[hashDirection]) setTimeout(() => selectDirection(hashDirection), 600);
