// ============================================================
//  GROCERY HELPER — A Game About Empathy
//  p5.js single-file game
//
//  FIXES vs previous version:
//  - Intro click logic rewritten (Start button was unreachable)
//  - Stars pre-computed once (was re-randomizing every frame)
//  - Memory items locked at init (was re-shuffling in draw loop)
//  - Background drawn efficiently (was 580 line-draws per frame)
//  - transitioning flag blocks all input during fade
//  - All button hit-areas match their drawn positions exactly
// ============================================================

// ─── ASSETS ────────────────────────────────────────────────
let storeImg, milkAisleImg, milkCarton1;

// ─── GLOBAL STATE ──────────────────────────────────────────
let gameState = "intro";
let fadeAlpha = 0;
let fadingOut = false;
let fadeTarget = "";
let fadeSpeed = 7;
let transitioning = false; // blocks all input during fade

// ─── PLAYER ────────────────────────────────────────────────
let player = {
  x: 200,
  y: 430,
  w: 36,
  h: 52,
  speed: 3,
  facing: 1,
  walkFrame: 0,
  walkTimer: 0,
};

// ─── CAMERA ────────────────────────────────────────────────
let camX = 0;
const STORE_W = 2400;

// ─── STORE ZONES ───────────────────────────────────────────
let zones = [
  {
    id: "memory",
    x: 420,
    label: "🥦 Produce",
    color: [100, 190, 90],
    done: false,
    near: false,
  },
  {
    id: "overload",
    x: 820,
    label: "🥫 Snacks",
    color: [230, 150, 50],
    done: false,
    near: false,
  },
  {
    id: "navigation",
    x: 1250,
    label: "❓ Dairy",
    color: [80, 170, 230],
    done: false,
    near: false,
  },
  {
    id: "decision",
    x: 1700,
    label: "🥛 Milk",
    color: [190, 110, 190],
    done: false,
    near: false,
  },
];

// ─── INTRO DIALOGUE ────────────────────────────────────────
let dlg = {
  lines: [
    "Hi, I'm Alex. 👋",
    "Today I need to do the grocery shopping.",
    "Sounds simple, right?",
    "For me... it can feel really overwhelming.",
    "Every aisle is a new challenge.",
    "I hope you'll understand by the end.",
    "Let's go. →  (click to start)",
  ],
  idx: 0,
  done: false,
};

// ─── HINT ──────────────────────────────────────────────────
let hintMsg = "",
  hintTimer = 0;

// ─── PROGRESS ──────────────────────────────────────────────
let completedCount = 0;
let currentMG = null;

// ─── MEMORY STATE ──────────────────────────────────────────
let MEM = {
  phase: "show",
  shown: [],
  allItems: [],
  selected: [],
  timer: 0,
  duration: 200,
  result: null,
};

// ─── OVERLOAD STATE ────────────────────────────────────────
let OVR = {
  target: "",
  options: [],
  timeLeft: 450,
  selected: null,
  result: null,
  noiseOff: 0,
};

// ─── NAVIGATION STATE ──────────────────────────────────────
let NAV = { signs: [], selected: -1, result: null };

// ─── DECISION STATE ────────────────────────────────────────
let DEC = { milks: [], selected: -1, result: null, panicTimer: 0 };

// ─── CACHED VISUALS ────────────────────────────────────────
let stars = [];
let shelves = [];

// ─── PALETTE ───────────────────────────────────────────────
const C = {
  dark: [28, 34, 52],
  accent: [70, 140, 255],
  green: [70, 190, 120],
  red: [230, 80, 80],
  yellow: [255, 205, 50],
  muted: [130, 138, 158],
};

// ============================================================
//  PRELOAD
// ============================================================
function preload() {
  storeImg = loadImage("assets/store.png");
  milkAisleImg = loadImage("assets/milk_aisle.png");
  milkCarton1 = loadImage("assets/milkcarton1.png");
}

// ============================================================
//  SETUP
// ============================================================
function setup() {
  createCanvas(880, 580);
  textFont("Georgia");

  // Pre-compute star positions once
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: random(880),
      y: random(400),
      r: random(1, 3),
      seed: random(100),
    });
  }

  // Shelf data
  let shelfCols = [
    [180, 220, 180],
    [220, 200, 160],
    [160, 200, 230],
    [230, 180, 180],
    [200, 180, 230],
    [220, 220, 160],
  ];
  for (let i = 0; i < 13; i++) {
    shelves.push({
      x: 80 + i * 185,
      y: 190,
      w: 155,
      h: 225,
      color: shelfCols[i % shelfCols.length],
    });
  }
}

// ============================================================
//  DRAW ROUTER
// ============================================================
function draw() {
  switch (gameState) {
    case "intro":
      drawIntro();
      break;
    case "tutorial":
      drawTutorial();
      break;
    case "store":
      drawStore();
      break;
    case "minigame":
      drawMiniGame();
      break;
    case "debrief":
      drawDebrief();
      break;
    case "win":
      drawWin();
      break;
  }
  drawFadeOverlay();
  drawHintBar();
}

// ============================================================
//  FADE SYSTEM
// ============================================================
function drawFadeOverlay() {
  if (fadingOut) fadeAlpha = min(fadeAlpha + fadeSpeed, 255);
  else fadeAlpha = max(fadeAlpha - fadeSpeed, 0);

  if (fadeAlpha > 0) {
    noStroke();
    fill(28, 34, 52, fadeAlpha);
    rect(0, 0, width, height);
  }

  if (fadingOut && fadeAlpha >= 255) {
    fadingOut = false;
    transitioning = false;
    gameState = fadeTarget;
    onEnterState(gameState);
  }
}

function goTo(next) {
  if (transitioning) return;
  transitioning = true;
  fadingOut = true;
  fadeTarget = next;
}

function onEnterState(s) {
  if (s === "minigame") {
    if (currentMG === "memory") initMemory();
    if (currentMG === "overload") initOverload();
    if (currentMG === "navigation") initNavigation();
    if (currentMG === "decision") initDecision();
  }
}

// ============================================================
//  HINT BAR
// ============================================================
function showHint(msg) {
  hintMsg = msg;
  hintTimer = 240;
}

function drawHintBar() {
  if (hintTimer <= 0) return;
  hintTimer--;
  let a = hintTimer < 50 ? map(hintTimer, 50, 0, 255, 0) : 255;
  noStroke();
  fill(28, 34, 52, a * 0.9);
  let bw = 460,
    bh = 48,
    bx = width / 2 - bw / 2,
    by = height - 82;
  rect(bx, by, bw, bh, 10);
  fill(255, 205, 50, a);
  textAlign(CENTER, CENTER);
  textSize(14);
  text("💡 " + hintMsg, width / 2, by + bh / 2);
}

// ============================================================
//  INTRO
// ============================================================
function drawIntro() {
  background(30, 40, 70);

  // Animated stars (position fixed, only brightness varies)
  noStroke();
  for (let s of stars) {
    let a = 80 + sin(frameCount * 0.025 + s.seed) * 60;
    fill(255, 255, 255, a);
    ellipse(s.x, s.y, s.r);
  }

  // Title
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  textStyle(BOLD);
  text("Grocery Helper", width / 2, 110);
  textStyle(NORMAL);
  textSize(19);
  fill(170, 205, 255);
  text("A Game About Empathy", width / 2, 158);

  if (!dlg.done) {
    drawDialogueBox(dlg.lines[dlg.idx], width / 2, 320);
    let a = 140 + sin(frameCount * 0.09) * 80;
    fill(170, 205, 255, a);
    textSize(13);
    textAlign(CENTER, CENTER);
    text("click anywhere to continue", width / 2, 415);
  } else {
    // Start button centred at (440, 360)
    drawBtn("Start the game →", width / 2, 360, 230, 54, C.accent);
  }

  fill(90, 110, 150);
  textSize(12);
  textAlign(CENTER, CENTER);
  text("Understanding begins with experience.", width / 2, height - 22);
}

// ============================================================
//  TUTORIAL
// ============================================================
function drawTutorial() {
  background(245, 245, 250);
  noStroke();
  fill(...C.dark);
  textAlign(CENTER, TOP);
  textSize(32);
  textStyle(BOLD);
  text("How to Play", width / 2, 44);
  textStyle(NORMAL);

  let steps = [
    ["🚶", "Use ← → arrow keys (or A / D) to walk through the store"],
    ["🏪", "Walk into a glowing aisle entrance to start a challenge"],
    ["🎯", "Each challenge simulates a real everyday difficulty"],
    ["💡", "Press H at any time for a hint"],
    ["🤝", "There's no failing — only understanding"],
  ];
  for (let i = 0; i < steps.length; i++) {
    let yy = 118 + i * 68;
    fill(255);
    stroke(215, 220, 235);
    strokeWeight(1);
    rect(70, yy, width - 140, 52, 10);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(24);
    text(steps[i][0], 105, yy + 26);
    fill(...C.dark);
    textSize(15);
    text(steps[i][1], 148, yy + 26);
  }

  // Button centred at (440, height-64)
  drawBtn("Let's go! →", width / 2, height - 64, 210, 50, C.accent);
}

// ============================================================
//  STORE
// ============================================================
function drawStore() {
  background(225, 230, 242);
  push();
  translate(-camX, 0);
  fill(205, 212, 228);
  noStroke();
  rect(0, 75, STORE_W, 260);
  drawShelves();
  drawZoneBeacons();
  // Floor tiles
  for (let x = 0; x < STORE_W; x += 76) {
    for (let y = 335; y < height; y += 56) {
      fill((x / 76 + y / 56) % 2 === 0 ? 248 : 238);
      noStroke();
      rect(x, y, 76, 56);
    }
  }
  drawPlayer();
  pop();
  drawStoreHUD();
  if (!transitioning) {
    updatePlayer();
    updateCamera();
    checkZones();
  }
}

function drawShelves() {
  for (let s of shelves) {
    fill(0, 0, 0, 16);
    noStroke();
    rect(s.x + 5, s.y + 5, s.w, s.h, 6);
    fill(...s.color, 200);
    stroke(255, 255, 255, 70);
    strokeWeight(1);
    rect(s.x, s.y, s.w, s.h, 6);
    stroke(0, 0, 0, 25);
    strokeWeight(1);
    for (let r = 1; r < 4; r++)
      line(s.x, s.y + (s.h / 4) * r, s.x + s.w, s.y + (s.h / 4) * r);
    let pc = [
      [220, 80, 80],
      [80, 180, 220],
      [240, 175, 55],
      [110, 200, 110],
      [175, 110, 220],
      [235, 115, 75],
    ];
    noStroke();
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4; col++) {
        fill(...pc[(row * 4 + col) % pc.length], 210);
        rect(s.x + 10 + col * 34, s.y + 22 + row * 54, 26, 38, 3);
      }
  }
}

function drawZoneBeacons() {
  for (let z of zones) {
    if (z.done) continue;
    let pulse = sin(frameCount * 0.055) * 0.5 + 0.5;
    noFill();
    for (let ring = 3; ring >= 0; ring--) {
      stroke(...z.color, 35 + ring * 20 - pulse * 15);
      strokeWeight(3 - ring * 0.4);
      ellipse(z.x, 488, 90 + pulse * 28 - ring * 10, 22 - ring * 3);
    }
    noStroke();
    fill(...z.color, 215);
    rect(z.x - 58, 88, 116, 34, 7);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    textStyle(BOLD);
    text(z.label, z.x, 105);
    textStyle(NORMAL);
    noFill();
    stroke(...z.color, 90 + pulse * 80);
    strokeWeight(2);
    arc(z.x, 335, 115, 210, PI, 0);
  }
}

function drawPlayer() {
  let px = player.x,
    py = player.y;
  player.walkTimer++;
  if (player.walkTimer > 9) {
    player.walkFrame = (player.walkFrame + 1) % 4;
    player.walkTimer = 0;
  }
  let bob = player.walkFrame % 2 === 0 ? 0 : -3;
  fill(0, 0, 0, 35);
  noStroke();
  ellipse(px, py + player.h / 2 + 4, player.w + 8, 9);
  push();
  translate(px, py + bob);
  scale(player.facing, 1);
  fill(55, 45, 75);
  rect(-11, 21, 10, 8, 2);
  rect(2, 21, 10, 8, 2);
  fill(75, 105, 195);
  rect(-11, 4, 10, 18, 2);
  rect(2, 4, 10, 18, 2);
  fill(255, 195, 55);
  rect(-13, -21, 26, 26, 3);
  fill(75, 105, 195);
  rect(-6, -21, 5, 26, 1);
  rect(2, -21, 5, 26, 1);
  fill(225, 175, 125);
  rect(-19, -19, 8, 20, 3);
  rect(12, -19, 8, 20, 3);
  fill(225, 175, 125);
  ellipse(0, -31, 29, 29);
  fill(75, 48, 28);
  arc(0, -37, 29, 18, PI, 0);
  fill(35);
  ellipse(-5, -31, 5, 5);
  ellipse(5, -31, 5, 5);
  noFill();
  stroke(75, 38, 18);
  strokeWeight(1.5);
  arc(0, -27, 10, 6, 0, PI);
  noStroke();
  fill(215, 55, 55);
  rect(-14, -46, 28, 14, 3, 3, 0, 0);
  rect(-19, -35, 38, 6, 2);
  pop();
}

function updatePlayer() {
  let moving = false;
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    player.x -= player.speed;
    player.facing = -1;
    moving = true;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    player.x += player.speed;
    player.facing = 1;
    moving = true;
  }
  if (!moving) player.walkFrame = 0;
  player.x = constrain(player.x, 40, STORE_W - 40);
}

function updateCamera() {
  let t = constrain(player.x - width / 2, 0, STORE_W - width);
  camX = lerp(camX, t, 0.09);
}

function checkZones() {
  for (let z of zones) {
    if (z.done) continue;
    z.near = abs(player.x - z.x) < 60;
    if (z.near) showHint("Press SPACE or ENTER to enter " + z.label);
  }
}

function drawStoreHUD() {
  fill(255, 255, 255, 200);
  noStroke();
  rect(18, 14, 204, 26, 8);
  fill(...C.accent, 200);
  rect(18, 14, map(completedCount, 0, zones.length, 0, 204), 26, 8);
  fill(...C.dark);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Progress  " + completedCount + " / " + zones.length, 26, 27);
  fill(255, 255, 255, 150);
  noStroke();
  rect(width - 106, 14, 90, 26, 8);
  fill(...C.muted);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("H = hint", width - 61, 27);
}

// ============================================================
//  MINI-GAME ROUTER
// ============================================================
function drawMiniGame() {
  if (currentMG === "memory") drawMemory();
  else if (currentMG === "overload") drawOverload();
  else if (currentMG === "navigation") drawNavigation();
  else if (currentMG === "decision") drawDecision();
}

// ============================================================
//  MINI-GAME 1 — MEMORY
// ============================================================
function initMemory() {
  let pool = [
    "Apples",
    "Bread",
    "Eggs",
    "Milk",
    "Bananas",
    "Cheese",
    "Yogurt",
    "Butter",
    "Cereal",
    "Juice",
  ];
  MEM.shown = shuffleArr(pool).slice(0, 5);
  MEM.allItems = shuffleArr(pool.slice()); // locked once — never reshuffled
  MEM.selected = [];
  MEM.phase = "show";
  MEM.timer = MEM.duration;
  MEM.result = null;
}

function drawMemory() {
  background(244, 247, 255);
  drawHeader(
    "🧠 Memory Challenge",
    "Remember what's on the list — then find the items.",
  );

  if (MEM.phase === "show") {
    MEM.timer--;
    fill(225, 230, 245);
    noStroke();
    rect(120, 98, width - 240, 10, 5);
    fill(...C.accent);
    rect(120, 98, (width - 240) * (MEM.timer / MEM.duration), 10, 5);
    fill(...C.dark);
    textAlign(CENTER, TOP);
    textSize(15);
    text("Memorise these items — they will disappear!", width / 2, 118);

    let cols = 3,
      pad = 140;
    for (let i = 0; i < MEM.shown.length; i++) {
      let col = i % cols,
        row = floor(i / cols);
      let ix = pad + col * 210,
        iy = 172 + row * 88;
      fill(255);
      stroke(195, 208, 228);
      strokeWeight(1);
      rect(ix, iy - 28, 190, 56, 10);
      noStroke();
      fill(...C.dark);
      textAlign(CENTER, CENTER);
      textSize(15);
      textStyle(BOLD);
      text(MEM.shown[i], ix + 95, iy);
      textStyle(NORMAL);
    }
    if (MEM.timer <= 0) MEM.phase = "pick";
  } else if (MEM.phase === "pick") {
    fill(...C.dark);
    textAlign(CENTER, TOP);
    textSize(15);
    text("Select all the items that were on your list.", width / 2, 98);
    fill(...C.muted);
    textSize(13);
    text(
      "Selected: " + MEM.selected.length + " — need " + MEM.shown.length,
      width / 2,
      120,
    );

    let cols = 5;
    for (let i = 0; i < MEM.allItems.length; i++) {
      let col = i % cols,
        row = floor(i / cols);
      let bx = 55 + col * 162,
        by = 158 + row * 82;
      let item = MEM.allItems[i];
      let sel = MEM.selected.includes(item);

      if (MEM.result !== null) {
        let was = MEM.shown.includes(item);
        if (sel && was) fill(120, 215, 145);
        else if (sel) fill(230, 110, 110);
        else if (was) fill(255, 215, 90);
        else fill(244, 247, 255);
      } else {
        fill(sel ? [70, 140, 255, 210] : [255, 255, 255]);
      }
      stroke(sel && MEM.result === null ? C.accent : [195, 208, 228]);
      strokeWeight(sel ? 2 : 1);
      rect(bx, by - 22, 148, 48, 9);
      noStroke();
      fill(sel && MEM.result === null ? 255 : C.dark);
      textAlign(CENTER, CENTER);
      textSize(13);
      text(item, bx + 74, by);
    }

    if (MEM.result === null && MEM.selected.length > 0) {
      drawBtn("✓ Done", width / 2, 490, 160, 46, C.green);
    }
    if (MEM.result !== null) {
      drawResultBanner(MEM.result);
      drawBtn("Continue →", width / 2, 535, 200, 46, C.accent);
    }
  }
  drawBackBtn();
}

function clickMemory(mx, my) {
  if (MEM.phase === "pick" && MEM.result === null) {
    let cols = 5;
    for (let i = 0; i < MEM.allItems.length; i++) {
      let col = i % cols,
        row = floor(i / cols);
      let bx = 55 + col * 162,
        by = 158 + row * 82;
      if (mx > bx && mx < bx + 148 && my > by - 22 && my < by + 26) {
        let item = MEM.allItems[i];
        if (MEM.selected.includes(item))
          MEM.selected = MEM.selected.filter((x) => x !== item);
        else MEM.selected.push(item);
        return;
      }
    }
    // Done button at (440,490)
    if (mx > width / 2 - 80 && mx < width / 2 + 80 && my > 467 && my < 513) {
      let correct = MEM.selected.filter((x) => MEM.shown.includes(x)).length;
      MEM.result = { correct, total: MEM.shown.length };
    }
  }
  if (MEM.result !== null && my > 512 && my < 558) finishMG("memory");
}

// ============================================================
//  MINI-GAME 2 — OVERLOAD
// ============================================================
function initOverload() {
  let pool = [
    "🍕 Pizza",
    "🥤 Soda",
    "🍫 Chocolate",
    "🥜 Peanut Butter",
    "🍪 Cookies",
    "🥣 Granola",
    "🍿 Popcorn",
    "🧃 Juice",
  ];
  OVR.target = random(pool);
  OVR.options = shuffleArr(pool.slice());
  OVR.timeLeft = 450;
  OVR.selected = null;
  OVR.result = null;
  OVR.noiseOff = random(1000);
}

function drawOverload() {
  let n = noise(frameCount * 0.015);
  background(240 + n * 15, 235 + n * 10, 225 + n * 8);
  if (OVR.result === null) {
    OVR.timeLeft--;
    OVR.noiseOff += 0.018;
    let u = 1 - OVR.timeLeft / 450;
    noStroke();
    for (let i = 0; i < u * 25; i++) {
      fill(random(255), random(255), random(255), random(25, 90));
      ellipse(random(width), random(height), random(4, 18));
    }
  }
  drawHeader(
    "😵 Sensory Overload",
    'Find "' + OVR.target + '" — as fast as you can.',
  );
  fill(225, 230, 245);
  noStroke();
  rect(120, 98, width - 240, 10, 5);
  let ratio = max(OVR.timeLeft / 450, 0);
  fill(ratio > 0.5 ? C.green : ratio > 0.25 ? C.yellow : C.red);
  rect(120, 98, (width - 240) * ratio, 10, 5);

  let cols = 4,
    cw = 190,
    ch = 92,
    sx = (width - cols * cw) / 2,
    sy = 140;
  for (let i = 0; i < OVR.options.length; i++) {
    let col = i % cols,
      row = floor(i / cols);
    let u = 1 - OVR.timeLeft / 450;
    let wx =
      OVR.result === null ? noise(i * 31 + OVR.noiseOff) * u * 14 - u * 7 : 0;
    let wy =
      OVR.result === null
        ? noise(i * 31 + OVR.noiseOff + 100) * u * 9 - u * 4
        : 0;
    let bx = sx + col * cw + wx,
      by = sy + row * ch + wy;
    if (OVR.result !== null) {
      if (OVR.options[i] === OVR.target) fill(120, 215, 145, 220);
      else if (OVR.options[i] === OVR.selected) fill(230, 110, 110, 220);
      else fill(244, 247, 255, 200);
    } else {
      fill(
        200 + noise(frameCount * 0.09 + i) * 55,
        200 + noise(frameCount * 0.07 + i + 4) * 55,
        195 + noise(frameCount * 0.11 + i + 9) * 55,
      );
    }
    stroke(215, 220, 232);
    strokeWeight(1);
    rect(bx, by, cw - 14, ch - 14, 10);
    noStroke();
    fill(
      OVR.result !== null
        ? C.dark
        : [30 + noise(i + frameCount * 0.04) * 40, 28, 58],
    );
    textAlign(CENTER, CENTER);
    textSize(14);
    text(OVR.options[i], bx + (cw - 14) / 2, by + (ch - 14) / 2);
  }
  if (OVR.timeLeft <= 0 && OVR.result === null)
    OVR.result = { correct: 0, total: 1, timeout: true };
  if (OVR.result !== null) {
    drawResultBanner(OVR.result);
    drawBtn("Continue →", width / 2, 535, 200, 46, C.accent);
  }
  drawBackBtn();
}

function clickOverload(mx, my) {
  if (OVR.result !== null) {
    if (my > 512 && my < 558) finishMG("overload");
    return;
  }
  let cols = 4,
    cw = 190,
    ch = 92,
    sx = (width - cols * cw) / 2,
    sy = 140;
  for (let i = 0; i < OVR.options.length; i++) {
    let bx = sx + (i % cols) * cw,
      by = sy + floor(i / cols) * ch;
    if (mx > bx && mx < bx + cw - 14 && my > by && my < by + ch - 14) {
      OVR.selected = OVR.options[i];
      OVR.result = { correct: OVR.options[i] === OVR.target ? 1 : 0, total: 1 };
      return;
    }
  }
}

// ============================================================
//  MINI-GAME 3 — NAVIGATION
// ============================================================
function initNavigation() {
  let correct = "Dairy";
  let wrongs = shuffleArr([
    "Dary",
    "Daily",
    "Daisy",
    "Aisle 7",
    "Aisle 4",
    "Laundry",
    "Bakery",
    "Frozen",
    "Produce",
    "Deli",
  ]).slice(0, 7);
  let pool = shuffleArr([...wrongs, correct]);
  NAV.signs = pool.map((l) => ({ label: l, correct: l === correct }));
  NAV.selected = -1;
  NAV.result = null;
}

function drawNavigation() {
  background(238, 233, 222);
  for (let x = 0; x < width; x += 38) {
    fill(x % 76 === 0 ? 228 : 218, 222, 212);
    noStroke();
    rect(x, 315, 38, height - 315);
  }
  fill(198, 193, 182);
  noStroke();
  rect(0, 74, width, 242);
  drawHeader(
    "😕 Where do I go?",
    'Find the sign for "Dairy". Some signs are misleading...',
  );

  let sw = 92,
    sh = 52,
    cols = 4,
    sx = 50;
  for (let i = 0; i < NAV.signs.length; i++) {
    let row = floor(i / cols),
      col = i % cols;
    let x = sx + col * (sw + 30),
      y = 112 + row * 88;
    let s = NAV.signs[i];
    let sway =
      NAV.result === null && !s.correct
        ? sin(frameCount * 0.04 + i * 1.3) * 3
        : 0;
    if (NAV.result !== null) {
      if (s.correct) fill(120, 215, 145);
      else if (i === NAV.selected) fill(230, 110, 110);
      else fill(215, 210, 200);
    } else {
      fill(218 + ((i * 3) % 18), 213 + ((i * 2) % 14), 198 + ((i * 5) % 22));
    }
    stroke(155, 150, 138);
    strokeWeight(1.5);
    rect(x + sway, y, sw, sh, 5);
    stroke(98, 88, 78);
    strokeWeight(1);
    line(x + sw / 2 + sway, y, x + sw / 2 + sway, y - 18);
    noStroke();
    fill(NAV.result !== null ? C.dark : [38 + (i % 3) * 28, 38, 58]);
    textAlign(CENTER, CENTER);
    textSize(s.correct && NAV.result === null ? 14 : 11 + (i % 3) * 2);
    textStyle(s.correct && NAV.result === null ? BOLD : NORMAL);
    text(s.label, x + sw / 2 + sway, y + sh / 2);
    textStyle(NORMAL);
  }
  if (NAV.result !== null) {
    drawResultBanner(NAV.result);
    drawBtn("Continue →", width / 2, 535, 200, 46, C.accent);
  }
  drawBackBtn();
}

function clickNavigation(mx, my) {
  if (NAV.result !== null) {
    if (my > 512 && my < 558) finishMG("navigation");
    return;
  }
  let sw = 92,
    sh = 52,
    cols = 4,
    sx = 50;
  for (let i = 0; i < NAV.signs.length; i++) {
    let x = sx + (i % cols) * (sw + 30),
      y = 112 + floor(i / cols) * 88;
    if (mx > x && mx < x + sw && my > y && my < y + sh) {
      NAV.selected = i;
      NAV.result = { correct: NAV.signs[i].correct ? 1 : 0, total: 1 };
      return;
    }
  }
}

// ============================================================
//  MINI-GAME 4 — DECISION FATIGUE
// ============================================================
function initDecision() {
  DEC.milks = [
    { label: "Whole Milk\n3.25% • 2L", price: "$3.99", correct: false },
    { label: "Skim Milk\n0% fat • 2L", price: "$3.49", correct: false },
    { label: "2% Milk\n2% fat • 2L", price: "$3.79", correct: true },
    { label: "Lactose Free\nWhole • 2L", price: "$5.29", correct: false },
    { label: "Oat Milk\nOrganic • 1.75L", price: "$6.49", correct: false },
    { label: "Almond Milk\nUnsweetened", price: "$4.99", correct: false },
    { label: "2% Milk\n2% fat • 4L", price: "$5.49", correct: false },
    { label: "Chocolate Milk\n2% • 1L", price: "$3.29", correct: false },
  ];
  DEC.selected = -1;
  DEC.result = null;
  DEC.panicTimer = 0;
}

function drawDecision() {
  drawImageFit(milkAisleImg);
  fill(244, 247, 255, 205);
  noStroke();
  rect(0, 0, width, height);
  if (DEC.result === null) DEC.panicTimer++;
  let panic = DEC.panicTimer > 180;
  if (panic && DEC.result === null) {
    let pa = map(DEC.panicTimer, 180, 500, 0, 38);
    fill(215, 55, 55, pa);
    noStroke();
    rect(0, 0, width, height);
  }
  drawHeader(
    "😰 Decision Fatigue",
    'Alex needs "2% Milk, 2L". There are SO many options...',
  );

  let cols = 4,
    cw = 192,
    ch = 102,
    sx = (width - cols * cw) / 2,
    sy = 138;
  for (let i = 0; i < DEC.milks.length; i++) {
    let m = DEC.milks[i];
    let bx = sx + (i % cols) * cw + 3,
      by = sy + floor(i / cols) * ch + 3;
    if (DEC.result !== null) {
      if (m.correct) fill(120, 215, 145, 215);
      else if (i === DEC.selected) fill(230, 110, 110, 215);
      else fill(255, 255, 255, 155);
    } else {
      fill(255, 255, 255, 195);
    }
    stroke(175, 195, 218);
    strokeWeight(1.5);
    rect(bx, by, cw - 12, ch - 12, 8);
    if (milkCarton1) image(milkCarton1, bx + 6, by + 10, 26, 42);
    noStroke();
    fill(...C.dark);
    textAlign(LEFT, CENTER);
    textSize(11);
    text(m.label, bx + 38, by + 26);
    fill(...C.muted);
    textSize(12);
    text(m.price, bx + 38, by + 70);
  }
  if (panic && DEC.result === null) {
    fill(215, 55, 55, 195);
    noStroke();
    rect(0, height - 72, width, 72);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(
      "💭 So many options... which one is right? I can't think...",
      width / 2,
      height - 36,
    );
  }
  if (DEC.result !== null) {
    drawResultBanner(DEC.result);
    drawBtn("Continue →", width / 2, 535, 200, 46, C.accent);
  }
  drawBackBtn();
}

function clickDecision(mx, my) {
  if (DEC.result !== null) {
    if (my > 512 && my < 558) finishMG("decision");
    return;
  }
  let cols = 4,
    cw = 192,
    ch = 102,
    sx = (width - cols * cw) / 2,
    sy = 138;
  for (let i = 0; i < DEC.milks.length; i++) {
    let bx = sx + (i % cols) * cw + 3,
      by = sy + floor(i / cols) * ch + 3;
    if (mx > bx && mx < bx + cw - 12 && my > by && my < by + ch - 12) {
      DEC.selected = i;
      DEC.result = { correct: DEC.milks[i].correct ? 1 : 0, total: 1 };
      return;
    }
  }
}

// ============================================================
//  DEBRIEF
// ============================================================
const DEBRIEF = {
  memory: {
    emoji: "🧠",
    title: "What Alex experiences",
    body: "For many people with intellectual disabilities, short-term memory works differently. Keeping a list in your head while navigating a busy store can be genuinely exhausting.",
    reflection: "Try doing this every time you shop.",
  },
  overload: {
    emoji: "😵",
    title: "Sensory overload is real",
    body: "Bright lights, sounds, and too much visual information can make it very hard to focus. What feels like a simple task becomes overwhelming when your brain processes sensory input differently.",
    reflection: "The chaos you felt for 10 seconds... imagine that every day.",
  },
  navigation: {
    emoji: "😕",
    title: "Reading and wayfinding",
    body: "Similar-looking words and inconsistent signage can make navigation confusing for people with reading difficulties. A simple trip to buy milk can require a lot of guesswork.",
    reflection: "Good signage design can change someone's whole day.",
  },
  decision: {
    emoji: "😰",
    title: "Too many choices",
    body: "Decision fatigue hits harder when decision-making is already a cognitive challenge. More options don't mean better outcomes — for Alex, they can mean paralysis.",
    reflection:
      "A familiar routine and fewer choices can make independence possible.",
  },
};

function drawDebrief() {
  background(244, 247, 255);
  let d = DEBRIEF[currentMG] || {};
  textAlign(CENTER, CENTER);
  textSize(54);
  text(d.emoji || "✨", width / 2, 80);
  fill(...C.dark);
  textSize(24);
  textStyle(BOLD);
  text(d.title || "Reflection", width / 2, 140);
  textStyle(NORMAL);
  fill(76, 85, 108);
  textSize(16);
  textLeading(27);
  text(d.body || "", width / 2, 230, width - 160);
  fill(70, 140, 255, 20);
  stroke(70, 140, 255, 55);
  strokeWeight(1.5);
  rect(78, 358, width - 156, 72, 10);
  noStroke();
  fill(...C.accent);
  textSize(14);
  textStyle(ITALIC);
  text('"' + (d.reflection || "") + '"', width / 2, 394, width - 200);
  textStyle(NORMAL);
  let lbl =
    completedCount >= zones.length
      ? "See how Alex feels →"
      : "Back to the store →";
  drawBtn(lbl, width / 2, 492, 260, 50, C.accent);
}

function clickDebrief(mx, my) {
  if (my > 467 && my < 517)
    goTo(completedCount >= zones.length ? "win" : "store");
}

// ============================================================
//  WIN SCREEN
// ============================================================
function drawWin() {
  background(38, 52, 38);
  noStroke();
  for (let i = 0; i < 28; i++) {
    let px = (frameCount * (i * 0.28 + 0.4)) % width;
    let py = height - ((frameCount * (0.38 + i * 0.09) + i * 55) % height);
    fill(255, 255, 255, 55 + sin(frameCount * 0.05 + i) * 38);
    ellipse(px, py, 7);
  }
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(50);
  textStyle(BOLD);
  text("You did it! 🎉", width / 2, 105);
  textStyle(NORMAL);
  fill(185, 235, 185);
  textSize(18);
  text("Alex made it through the store.", width / 2, 168);
  fill(255, 255, 255, 172);
  noStroke();
  rect(78, 212, width - 156, 210, 12);
  fill(38, 52, 38);
  textSize(15);
  textLeading(29);
  text(
    "Every day brings these small battles.\nFor Alex, this is the grocery store.\nFor others it might be a classroom, an office,\nor just navigating a busy street.\n\nEmpathy means imagining that experience —\nand then doing something about it.",
    width / 2,
    318,
  );
  drawBtn("Play Again", width / 2, 500, 190, 50, [255, 255, 255]);
}

function clickWin(mx, my) {
  if (my > 475 && my < 525) {
    completedCount = 0;
    player.x = 200;
    camX = 0;
    dlg.idx = 0;
    dlg.done = false;
    for (let z of zones) {
      z.done = false;
      z.near = false;
    }
    goTo("intro");
  }
}

// ============================================================
//  FINISH MINI-GAME
// ============================================================
function finishMG(id) {
  let z = zones.find((z) => z.id === id);
  if (z && !z.done) {
    z.done = true;
    completedCount++;
  }
  goTo("debrief");
}

// ============================================================
//  SHARED UI
// ============================================================
function drawHeader(title, sub) {
  fill(255, 255, 255, 238);
  noStroke();
  rect(0, 0, width, 86);
  stroke(215, 220, 232);
  strokeWeight(1);
  line(0, 86, width, 86);
  noStroke();
  fill(...C.dark);
  textAlign(LEFT, CENTER);
  textSize(21);
  textStyle(BOLD);
  text(title, 18, 28);
  textStyle(NORMAL);
  fill(...C.muted);
  textSize(13);
  text(sub, 18, 62);
}

function drawBtn(label, bx, by, bw, bh, col) {
  let ho =
    mouseX > bx - bw / 2 &&
    mouseX < bx + bw / 2 &&
    mouseY > by - bh / 2 &&
    mouseY < by + bh / 2;
  noStroke();
  fill(...col, ho ? 245 : 195);
  rect(bx - bw / 2, by - bh / 2, bw, bh, 10);
  fill(col[0] > 210 ? C.dark : [255, 255, 255]);
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text(label, bx, by);
  textStyle(NORMAL);
  cursor(ho ? HAND : ARROW);
}

function drawDialogueBox(txt, bx, by) {
  fill(28, 34, 52, 218);
  noStroke();
  rect(bx - 330, by - 60, 660, 108, 14);
  fill(70, 140, 255);
  ellipse(bx - 278, by - 8, 52, 52);
  fill(255);
  textSize(24);
  textAlign(CENTER, CENTER);
  text("😊", bx - 278, by - 8);
  fill(255);
  textSize(17);
  textAlign(LEFT, CENTER);
  text(txt, bx - 248, by - 8, 550);
}

function drawResultBanner(result) {
  let ok = result && result.correct > 0 && !result.timeout;
  fill(ok ? [...C.green, 215] : [...C.red, 215]);
  noStroke();
  rect(0, 448, width, 64);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  if (result && result.timeout)
    text("⏱ Time ran out — that's the challenge.", width / 2, 480);
  else if (ok) text("✓ Well done!", width / 2, 480);
  else
    text(
      "Not quite — but that's okay. This is genuinely hard.",
      width / 2,
      480,
    );
  textStyle(NORMAL);
}

function drawBackBtn() {
  fill(244, 247, 255);
  noStroke();
  rect(width - 108, 8, 98, 34, 8);
  fill(...C.muted);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("← Back", width - 59, 25);
}

function drawImageFit(img) {
  if (!img) return;
  let r = img.width / img.height,
    cr = width / height;
  let dw, dh;
  if (r > cr) {
    dw = width;
    dh = width / r;
  } else {
    dh = height;
    dw = height * r;
  }
  image(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

// ============================================================
//  INPUT
// ============================================================
function mousePressed() {
  if (transitioning) return;
  let mx = mouseX,
    my = mouseY;

  // Back button in mini-games
  if (
    gameState === "minigame" &&
    mx > width - 108 &&
    mx < width - 10 &&
    my > 8 &&
    my < 42
  ) {
    goTo("store");
    return;
  }

  switch (gameState) {
    case "intro":
      if (!dlg.done) {
        if (dlg.idx < dlg.lines.length - 1) dlg.idx++;
        else dlg.done = true;
      } else {
        // Start button: centre=(440,360), size=230×54
        if (mx > 440 - 115 && mx < 440 + 115 && my > 360 - 27 && my < 360 + 27)
          goTo("tutorial");
      }
      break;

    case "tutorial":
      // Button centre=(440, height-64=516), size=210×50
      if (
        mx > width / 2 - 105 &&
        mx < width / 2 + 105 &&
        my > height - 64 - 25 &&
        my < height - 64 + 25
      )
        goTo("store");
      break;

    case "store":
      for (let z of zones) {
        if (z.near && !z.done) {
          currentMG = z.id;
          goTo("minigame");
          return;
        }
      }
      break;

    case "minigame":
      if (currentMG === "memory") clickMemory(mx, my);
      if (currentMG === "overload") clickOverload(mx, my);
      if (currentMG === "navigation") clickNavigation(mx, my);
      if (currentMG === "decision") clickDecision(mx, my);
      break;

    case "debrief":
      clickDebrief(mx, my);
      break;
    case "win":
      clickWin(mx, my);
      break;
  }
}

function keyPressed() {
  if (transitioning) return;

  if (key === "h" || key === "H") {
    let m = {
      store:
        "Walk right to find the glowing aisle arches. Press SPACE to enter!",
      minigame:
        currentMG === "memory"
          ? "Look for items that feel familiar from the list."
          : currentMG === "overload"
            ? "Focus only on the text — ignore the movement."
            : currentMG === "navigation"
              ? "The correct sign is spelled D-A-I-R-Y exactly."
              : currentMG === "decision"
                ? "Alex needs 2% fat milk in a 2-litre jug."
                : "",
    };
    showHint(m[gameState] || "Keep going — you're doing great!");
    return;
  }

  if ((key === " " || keyCode === ENTER) && gameState === "store") {
    for (let z of zones) {
      if (z.near && !z.done) {
        currentMG = z.id;
        goTo("minigame");
        return;
      }
    }
  }
  if (keyCode === ENTER && gameState === "intro") {
    if (!dlg.done) {
      if (dlg.idx < dlg.lines.length - 1) dlg.idx++;
      else dlg.done = true;
    }
  }
}

// ============================================================
//  UTILITY
// ============================================================
function shuffleArr(arr) {
  let a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
