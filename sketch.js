// ============================================================
//  GROCERY HELPER
// ============================================================

// ─── ASSETS ────────────────────────────────────────────────
let storeImg, milkAisleImg, milkCarton1;

// ─── AUDIO ─────────────────────────────────────────────────
let audioCtx = null;
let melodyTimer = 0,
  melodyStep = 0;
const MELODY_NOTES = [220, 277, 330, 277, 220, 330, 277, 220];
const MELODY_INTERVAL = 72;

function getAudioCtx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, dur = 0.12, vol = 0.18, type = "sine") {
  try {
    let ctx = getAudioCtx();
    let osc = ctx.createOscillator(),
      g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.05);
  } catch (e) {}
}
// ─── AUDIO TIMER FOR LOW-TIME ALERT ───────────────────────
let lowTimeAlertTimer = 0;

function updateMelody() {
  // Background music plays in store
  if (gameState === "store") {
    if (++melodyTimer >= MELODY_INTERVAL) {
      melodyTimer = 0;
      playTone(
        MELODY_NOTES[melodyStep++ % MELODY_NOTES.length],
        0.14,
        0.1,
        "sine",
      );
    }
  }
  // Low-time alert during minigames (every ~30 frames when timer < 30%)
  if (gameState === "minigame") {
    let timeRatio = 1;
    if (currentMG === "decision" && DEC.result === null)
      timeRatio = DEC.timeLeft / 480;
    else if (currentMG === "checkout" && CHK.result === null)
      timeRatio = CHK.timeLeft / 1200;
    else if (currentMG === "memory" && MEM.phase === "show")
      timeRatio = MEM.timer / MEM.duration;
    else if (currentMG === "frozen" && FRZ.result === null)
      timeRatio = FRZ.timeLeft / 600;
    else if (
      currentMG === "drinks" &&
      DRK.result === null &&
      DRK.phase === "select"
    )
      timeRatio = DRK.selectTimeLeft / 480;
    if (timeRatio < 0.3 && timeRatio > 0) {
      if (++lowTimeAlertTimer >= 30) {
        lowTimeAlertTimer = 0;
        playTone(440, 0.06, 0.12, "square");
      }
    } else {
      lowTimeAlertTimer = 0;
    }
  }
}
function playSuccess() {
  playTone(523, 0.12, 0.22);
  setTimeout(() => playTone(659, 0.12, 0.22), 120);
  setTimeout(() => playTone(784, 0.22, 0.24), 240);
}
function playFail() {
  playTone(220, 0.18, 0.18);
  setTimeout(() => playTone(185, 0.28, 0.16), 150);
}
function playClick() {
  playTone(440, 0.07, 0.12);
}
function playTick() {
  playTone(880, 0.04, 0.08);
}
function playAlarm() {
  playTone(330, 0.08, 0.16);
  setTimeout(() => playTone(330, 0.08, 0.16), 120);
}

// ─── GLOBAL STATE ──────────────────────────────────────────
let gameState = "intro";
let fadeAlpha = 0,
  fadingOut = false,
  fadeTarget = "",
  fadeSpeed = 7,
  transitioning = false;
let score = 0,
  streak = 0;
let completedCount = 0,
  currentMG = null;
let lastTickSecond = -1;

// ─── PLAYER ────────────────────────────────────────────────
let player = {
  x: 200,
  y: 430,
  w: 36,
  h: 52,
  speed: 4.2,
  facing: 1,
  walkFrame: 0,
  walkTimer: 0,
};
let camX = 0;
const STORE_W = 3500;

// ─── ZONES (8) ─────────────────────────────────────────────
let zones = [
  {
    id: "memory",
    x: 380,
    label: "Produce",
    color: [100, 190, 90],
    done: false,
    near: false,
  },
  {
    id: "overload",
    x: 780,
    label: "Snacks",
    color: [230, 150, 50],
    done: false,
    near: false,
  },
  {
    id: "navigation",
    x: 1200,
    label: "Dairy",
    color: [80, 170, 230],
    done: false,
    near: false,
  },
  {
    id: "decision",
    x: 1660,
    label: "Milk",
    color: [190, 110, 190],
    done: false,
    near: false,
  },
  {
    id: "frozen",
    x: 2100,
    label: "Frozen",
    color: [100, 200, 220],
    done: false,
    near: false,
  },
  {
    id: "drinks",
    x: 2520,
    label: "Drinks",
    color: [80, 200, 140],
    done: false,
    near: false,
  },
  {
    id: "maze",
    x: 2960,
    label: "Maze",
    color: [240, 180, 60],
    done: false,
    near: false,
  },
  {
    id: "checkout",
    x: 3360,
    label: "Checkout",
    color: [220, 60, 80],
    done: false,
    near: false,
  },
];

// ─── INTRO ─────────────────────────────────────────────────
let dlg = {
  lines: [
    "Hey. I'm Alex. This is my weekly grocery run.",
    "It looks simple, but every aisle takes work.",
    "Crowds, signs, choices — they stack up fast.",
    "You'll walk the store and handle each zone once.",
    "Watch the timers, keep your focus, and see how you do.",
    "Ready to try it?",
  ],
  idx: 0,
  done: false,
};

// ─── HUD MESSAGES ──────────────────────────────────────────
let hintMsg = "",
  hintTimer = 0,
  levelMsg = "",
  levelMsgTimer = 0;

// ─── MINIGAME STATES ───────────────────────────────────────
let MEM = {
  phase: "show",
  shown: [],
  allItems: [],
  selected: [],
  timer: 0,
  duration: 0,
  result: null,
};
let OVR = {
  target: "",
  options: [],
  timeLeft: 0,
  selected: null,
  result: null,
  noiseOff: 0,
  flashPhase: 0,
  npcs: [],
};
let NAV = {
  signs: [],
  selected: -1,
  result: null,
  shuffleTriggered: false,
  shuffleTimer: 180,
  npcs: [],
};
let DEC = { milks: [], selected: -1, result: null, panicTimer: 0, timeLeft: 0 };

// Frozen — wipe mechanic
let FRZ = {
  items: [],
  target: "",
  selected: -1,
  result: null,
  timeLeft: 0,
  wipes: [],
};

// Drinks — memory + glitch + select
let DRK = {
  phase: "memorise", // "memorise" | "glitch" | "select"
  origLabels: [],
  allOptions: [],
  shownLabels: [], // scrambled view during glitch
  positions: [],
  selected: [],
  result: null,
  memoriseTimer: 0,
  glitchTimer: 0,
  flickerFrame: 0,
  selectTimeLeft: 0,
};

// Maze
let MZE = {
  grid: [],
  cols: 15,
  rows: 12,
  cellW: 0,
  cellH: 0,
  px: 1,
  py: 1,
  cartX: 0,
  cartY: 0,
  result: null,
  moveTimer: 0,
  moveCooldown: 8,
  shakeTimer: 0,
  noiseDecoys: [],
};

let CHK = {
  items: [],
  total: 0,
  playerAnswer: "",
  timeLeft: 0,
  result: null,
  phase: "count",
  flashTimer: 0,
  choices: [],
  correctAnswer: "",
};

// ─── VISUALS ───────────────────────────────────────────────
let stars = [],
  shelves = [];
const C = {
  dark: [28, 34, 52],
  accent: [70, 140, 255],
  green: [70, 190, 120],
  red: [230, 80, 80],
  yellow: [255, 205, 50],
  muted: [130, 138, 158],
};

// ============================================================
//  PRELOAD / SETUP
// ============================================================
function preload() {
  storeImg = loadImage("Assets/store.png");
  milkAisleImg = loadImage("Assets/milk_aisle.png");
  milkCarton1 = loadImage("Assets/milkcarton1.png");
}
function setup() {
  createCanvas(880, 580);
  textFont("Georgia");
  for (let i = 0; i < 70; i++)
    stars.push({
      x: random(880),
      y: random(400),
      r: random(1, 3),
      seed: random(100),
    });
  let sc = [
    [180, 220, 180],
    [220, 200, 160],
    [160, 200, 230],
    [230, 180, 180],
    [200, 180, 230],
    [220, 220, 160],
  ];
  for (let i = 0; i < 25; i++)
    shelves.push({
      x: 80 + i * 140,
      y: 190,
      w: 118,
      h: 218,
      color: sc[i % sc.length],
    });
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
    case "win":
      drawWin();
      break;
  }
  drawFadeOverlay();
  drawHintBar();
  drawLevelMsg();
}

// ─── FADE ──────────────────────────────────────────────────
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
  playClick();
}
function onEnterState(s) {
  if (s === "minigame") {
    if (currentMG === "memory") initMemory();
    if (currentMG === "overload") initOverload();
    if (currentMG === "navigation") initNavigation();
    if (currentMG === "decision") initDecision();
    if (currentMG === "frozen") initFrozen();
    if (currentMG === "drinks") initDrinks();
    if (currentMG === "maze") initMaze();
    if (currentMG === "checkout") initCheckout();
  }
  melodyTimer = 0;
  melodyStep = 0;
}
function timeScale(base) {
  return max(0.45, 1.0 - completedCount * 0.07) * base;
}

// ─── HUD MESSAGES ──────────────────────────────────────────
function showHint(msg) {
  hintMsg = msg;
  hintTimer = 240;
}
function showLevelMsg(msg) {
  levelMsg = msg;
  levelMsgTimer = 60;
}
function drawHintBar() {
  if (hintTimer <= 0) return;
  hintTimer--;
  let a = hintTimer < 50 ? map(hintTimer, 50, 0, 255, 0) : 255;
  noStroke();
  fill(28, 34, 52, a * 0.9);
  let bw = 500,
    bh = 48,
    bx = width / 2 - bw / 2,
    by = height - 82;
  rect(bx, by, bw, bh, 10);
  fill(255, 205, 50, a);
  textAlign(CENTER, CENTER);
  textSize(14);
  text("Hint: " + hintMsg, width / 2, by + bh / 2);
}
function drawLevelMsg() {
  if (levelMsgTimer <= 0) return;
  levelMsgTimer--;
  let a = map(levelMsgTimer, 0, 60, 0, 255);
  noStroke();
  fill(28, 34, 52, a * 0.7);
  rect(width / 2 - 160, 70, 320, 40, 10);
  fill(255, 205, 50, a);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(levelMsg, width / 2, 90);
}

// ============================================================
//  INTRO (Alex character + speech bubble)
// ============================================================
function drawIntro() {
  background(18, 22, 38);
  noStroke();
  for (let s of stars) {
    fill(255, 255, 255, 80 + sin(frameCount * 0.025 + s.seed) * 60);
    ellipse(s.x, s.y, s.r);
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(44);
  textStyle(BOLD);
  text("Grocery Helper", width / 2, 74);
  textStyle(NORMAL);
  fill(130, 170, 255);
  textSize(15);
  text("can you keep up?", width / 2, 116);

  // Player character — left side (same as in-game player)
  let ax = 120,
    ay = 340;

  // Draw in-game player at intro position
  push();
  // temporarily set player position for drawing
  let _px = player.x,
    _py = player.y;
  player.x = ax;
  player.y = ay;
  drawPlayer();
  player.x = _px;
  player.y = _py;
  pop();

  if (!dlg.done) {
    drawSpeechBubble(dlg.lines[dlg.idx], ax, ay);
    let a = 140 + sin(frameCount * 0.09) * 80;
    fill(170, 205, 255, a);
    textSize(13);
    textAlign(CENTER, CENTER);
    text("click to continue", width / 2, 462);
  } else {
    drawSpeechBubble("Let's go! The store is waiting.", ax, ay);
    drawBtn("Start", width / 2, 408, 200, 50, C.accent);
  }

  if (score > 0) {
    fill(255, 205, 50, 180);
    textSize(13);
    textAlign(CENTER);
    text("Last score: " + score + " pts", width / 2, 512);
  }
  fill(70, 80, 110);
  textSize(11);
  textAlign(CENTER, CENTER);
  text(
    "8 challenges  •  score attack  •  press H for hints",
    width / 2,
    height - 14,
  );
}

function drawAlexCharacter(ax, ay) {
  push();
  translate(ax, ay);
  // shadow
  fill(0, 0, 0, 28);
  noStroke();
  ellipse(0, 44, 38, 10);
  // legs
  fill(45, 55, 90);
  rect(-10, 22, 9, 20, 2);
  rect(2, 22, 9, 20, 2);
  // shoes
  fill(28, 26, 22);
  rect(-12, 39, 13, 6, 3);
  rect(1, 39, 13, 6, 3);
  // torso — apron
  fill(65, 105, 175);
  rect(-13, -4, 26, 28, 3);
  fill(220, 200, 148);
  rect(-2, -4, 4, 28);
  // arms
  fill(225, 180, 130);
  rect(-20, -2, 9, 20, 3);
  rect(12, -2, 9, 20, 3);
  // head
  fill(225, 180, 130);
  ellipse(0, -22, 30, 30);
  // hair
  fill(60, 40, 25);
  arc(0, -28, 30, 18, PI, 0);
  rect(-15, -31, 6, 8, 2);
  // eyes
  fill(30);
  ellipse(-5, -22, 5, 5);
  ellipse(6, -22, 5, 5);
  // smile
  noFill();
  stroke(80, 40, 20);
  strokeWeight(1.5);
  arc(1, -16, 10, 7, 0, PI);
  // name tag
  noStroke();
  fill(255, 255, 255, 210);
  rect(-9, 4, 18, 10, 2);
  fill(C.accent[0], C.accent[1], C.accent[2]);
  textAlign(CENTER, CENTER);
  textSize(6);
  text("ALEX", 0, 9);
  pop();
}

function drawSpeechBubble(txt, ax, ay) {
  let bx = ax + 62,
    by = ay - 100,
    bw = 580,
    bh = 108;
  noStroke();
  fill(255, 255, 255, 235);
  rect(bx, by, bw, bh, 14);
  // tail pointing left toward player
  triangle(bx, by + 28, bx - 22, by + 46, bx, by + 60);
  fill(...C.dark);
  textAlign(CENTER, CENTER);
  textSize(15);
  textLeading(24);
  let pad = 20;
  text(txt, bx + 18, by + 16, bw - 36);
}

// ============================================================
//  TUTORIAL
// ============================================================
function drawTutorial() {
  background(22, 26, 44);
  noStroke();
  for (let s of stars) {
    fill(255, 255, 255, 30 + sin(frameCount * 0.02 + s.seed) * 20);
    ellipse(s.x, s.y, s.r * 0.8);
  }
  fill(255);
  textAlign(CENTER, TOP);
  textSize(27);
  textStyle(BOLD);
  text("How to Play", width / 2, 22);
  textStyle(NORMAL);
  let steps = [
    [
      "Arrow Keys",
      "Use the arrow keys to move left and right through the store.",
    ],
    [
      "Enter Aisles",
      "Walk into a glowing aisle arch to start that zone's challenge.",
    ],
    [
      "Each Aisle is Different",
      "Every zone presents a unique challenge — stay alert.",
    ],
    ["Work Quickly", "Timers are tight. Stay focused and act fast."],
  ];
  for (let i = 0; i < steps.length; i++) {
    let yy = 62 + i * 60;
    fill(255, 255, 255, 18);
    stroke(255, 255, 255, 28);
    strokeWeight(1);
    rect(50, yy, width - 100, 50, 8);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(13);
    fill(200, 215, 255);
    text(steps[i][0], 78, yy + 25);
    fill(170, 185, 228);
    text(steps[i][1], 220, yy + 25);
  }
  fill(255, 205, 50, 200);
  textAlign(CENTER, CENTER);
  textSize(13);
  text(
    "Faster and accurate = more points. Timers shrink each level.",
    width / 2,
    height - 66,
  );
  drawBtn("Let's go", width / 2, height - 38, 210, 44, C.accent);
}

// ============================================================
//  STORE
// ============================================================
function drawStore() {
  background(200, 208, 225);
  push();
  translate(-camX, 0);
  fill(185, 195, 215);
  noStroke();
  rect(0, 75, STORE_W, 260);
  drawShelves();
  fill(235, 235, 240);
  rect(0, 335, STORE_W, height - 335);
  stroke(220, 220, 230, 80);
  strokeWeight(1);
  for (let y = 360; y < height; y += 40) line(0, y, STORE_W, y);
  noStroke();
  drawZoneBeacons();
  drawPlayer();
  pop();
  drawStoreHUD();
  updateMelody();
  if (!transitioning) {
    updatePlayer();
    updateCamera();
    checkZones();
  }
}

function drawShelves() {
  for (let s of shelves) {
    fill(0, 0, 0, 14);
    noStroke();
    rect(s.x + 5, s.y + 5, s.w, s.h, 6);
    fill(s.color[0], s.color[1], s.color[2], 200);
    stroke(255, 255, 255, 70);
    strokeWeight(1);
    rect(s.x, s.y, s.w, s.h, 6);
    stroke(0, 0, 0, 22);
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
      for (let c2 = 0; c2 < 3; c2++) {
        let c = pc[(row * 3 + c2) % pc.length];
        fill(c[0], c[1], c[2], 210);
        rect(s.x + 6 + c2 * 32, s.y + 18 + row * 50, 26, 32, 3);
      }
  }
}

function drawZoneBeacons() {
  for (let z of zones) {
    if (z.done) {
      fill(100, 220, 130, 120);
      noStroke();
      ellipse(z.x, 488, 60, 14);
      fill(100, 220, 130, 180);
      textAlign(CENTER, CENTER);
      textSize(14);
      text("✓", z.x, 470);
      continue;
    }
    let pulse = sin(frameCount * 0.06) * 0.5 + 0.5;
    noFill();
    for (let ring = 3; ring >= 0; ring--) {
      stroke(...z.color, 38 + ring * 20 - pulse * 15);
      strokeWeight(3 - ring * 0.4);
      ellipse(z.x, 488, 95 + pulse * 30 - ring * 10, 22 - ring * 3);
    }
    fill(...z.color, 220);
    noStroke();
    rect(z.x - 56, 88, 112, 28, 7);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(9);
    textStyle(BOLD);
    text(z.label, z.x, 102);
    textStyle(NORMAL);
    noFill();
    stroke(...z.color, 95 + pulse * 80);
    strokeWeight(2);
    arc(z.x, 335, 115, 210, PI, 0);
  }
}

function drawPlayer() {
  let px = player.x,
    py = player.y;
  if (++player.walkTimer > 8) {
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
  camX = lerp(camX, constrain(player.x - width / 2, 0, STORE_W - width), 0.09);
}
function checkZones() {
  for (let z of zones) {
    if (z.done) {
      z.near = false;
      continue;
    }
    z.near = abs(player.x - z.x) < 62;
    if (z.near) showHint("Press SPACE or ENTER to enter " + z.label);
  }
}
function drawStoreHUD() {
  fill(255, 255, 255, 180);
  noStroke();
  rect(18, 14, 200, 24, 8);
  fill(...C.accent, 200);
  rect(18, 14, map(completedCount, 0, zones.length, 0, 200), 24, 8);
  fill(...C.dark);
  textAlign(LEFT, CENTER);
  textSize(11);
  text("Progress  " + completedCount + " / " + zones.length, 24, 26);
  fill(255, 255, 255, 180);
  rect(228, 14, 110, 24, 8);
  fill(...C.yellow);
  textAlign(CENTER, CENTER);
  textSize(12);
  textStyle(BOLD);
  text("★ " + score, 283, 26);
  textStyle(NORMAL);
  fill(255, 255, 255, 130);
  rect(width - 106, 14, 90, 24, 8);
  fill(...C.muted);
  textAlign(CENTER, CENTER);
  textSize(11);
  text("H = hint", width - 61, 26);
}

// ─── MG ROUTER ─────────────────────────────────────────────
function drawMiniGame() {
  updateMelody();
  if (currentMG === "memory") drawMemory();
  else if (currentMG === "overload") drawOverload();
  else if (currentMG === "navigation") drawNavigation();
  else if (currentMG === "decision") drawDecision();
  else if (currentMG === "frozen") drawFrozen();
  else if (currentMG === "drinks") drawDrinks();
  else if (currentMG === "maze") drawMaze();
  else if (currentMG === "checkout") drawCheckout();
}

// ============================================================
//  MG1 — MEMORY
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
    "Pasta",
    "Rice",
    "Onions",
    "Garlic",
    "Tomatoes",
  ];
  MEM.shown = shuffleArr(pool).slice(0, floor(random(6, 8)));
  function mk(w) {
    let v = [];
    if (w.length > 3) {
      v.push(w + w[w.length - 1]);
      v.push(w.slice(0, -1));
      let m = floor(w.length / 2);
      v.push(w.slice(0, m) + w.slice(m + 1));
    }
    return v.map((s) => s[0].toUpperCase() + s.slice(1).toLowerCase());
  }
  let fSet = new Set();
  for (let item of MEM.shown)
    for (let f of mk(item)) if (!MEM.shown.includes(f)) fSet.add(f);
  for (let e of shuffleArr(pool.filter((p) => !MEM.shown.includes(p))).slice(
    0,
    4,
  ))
    fSet.add(e);
  MEM.allItems = shuffleArr([
    ...MEM.shown,
    ...shuffleArr([...fSet]).slice(0, 8),
  ]);
  MEM.selected = [];
  MEM.phase = "show";
  MEM.timer = floor(timeScale(240));
  MEM.duration = MEM.timer;
  MEM.result = null;
  lastTickSecond = -1;
}
function drawMemory() {
  background(244, 247, 255);
  drawHeader(
    "Memory",
    "Memorise the items. They disappear. Pick them from a larger list.",
  );
  if (MEM.phase === "show") {
    MEM.timer--;
    fill(220, 228, 248);
    noStroke();
    rect(100, 96, width - 200, 10, 5);
    let r = MEM.timer / MEM.duration;
    fill(r > 0.5 ? C.green : r > 0.25 ? C.yellow : C.red);
    rect(100, 96, (width - 200) * r, 10, 5);
    let sec = floor(MEM.timer / 60);
    if (sec !== lastTickSecond && MEM.timer < MEM.duration * 0.5) {
      playTick();
      lastTickSecond = sec;
    }
    fill(...C.dark);
    textAlign(CENTER, TOP);
    textSize(14);
    text("Memorise these " + MEM.shown.length + " items.", width / 2, 116);
    let cols = 3,
      pad = 100;
    for (let i = 0; i < MEM.shown.length; i++) {
      let col = i % cols,
        row = floor(i / cols),
        iw = 210,
        ix = pad + col * (iw + 15),
        iy = 158 + row * 90;
      fill(255);
      stroke(180, 200, 228);
      strokeWeight(1.5);
      rect(ix, iy - 28, iw, 54, 10);
      noStroke();
      fill(...C.dark);
      textAlign(CENTER, CENTER);
      textSize(15);
      text(MEM.shown[i], ix + iw / 2, iy);
    }
    if (MEM.timer <= 0) {
      MEM.phase = "pick";
      lastTickSecond = -1;
    }
  } else {
    fill(...C.dark);
    textAlign(CENTER, TOP);
    textSize(14);
    text(
      "Select the " + MEM.shown.length + " items that were on your list.",
      width / 2,
      96,
    );
    fill(...C.muted);
    textSize(12);
    text(
      "Selected: " + MEM.selected.length + " / " + MEM.shown.length,
      width / 2,
      114,
    );
    for (let i = 0; i < MEM.allItems.length; i++) {
      let col = i % 4,
        row = floor(i / 4),
        bx = 36 + col * 204,
        by = 148 + row * 72,
        item = MEM.allItems[i],
        sel = MEM.selected.includes(item);
      if (MEM.result !== null) {
        let was = MEM.shown.includes(item);
        if (sel && was) fill(120, 215, 145);
        else if (sel) fill(230, 110, 110);
        else if (was) fill(255, 215, 90);
        else fill(244, 247, 255);
      } else fill(sel ? [70, 140, 255, 210] : [255, 255, 255]);
      stroke(sel && MEM.result === null ? C.accent : [195, 208, 228]);
      strokeWeight(sel ? 2 : 1);
      rect(bx, by - 20, 190, 48, 9);
      noStroke();
      fill(sel && MEM.result === null ? 255 : C.dark);
      textAlign(CENTER, CENTER);
      textSize(12);
      text(item, bx + 95, by + 3);
    }
    if (MEM.result === null && MEM.selected.length > 0)
      drawBtn("Submit", width / 2, 488, 160, 44, C.green);
    if (MEM.result !== null) {
      drawResultBanner(MEM.result);
      drawBtn("Continue", width / 2, 535, 200, 44, C.accent);
    }
  }
  drawBackBtn();
  drawScoreBadge();
}
function clickMemory(mx, my) {
  if (MEM.phase === "pick" && MEM.result === null) {
    for (let i = 0; i < MEM.allItems.length; i++) {
      let col = i % 4,
        row = floor(i / 4),
        bx = 36 + col * 204,
        by = 148 + row * 72;
      if (mx > bx && mx < bx + 190 && my > by - 20 && my < by + 28) {
        let item = MEM.allItems[i];
        if (MEM.selected.includes(item))
          MEM.selected = MEM.selected.filter((x) => x !== item);
        else MEM.selected.push(item);
        playClick();
        return;
      }
    }
    if (mx > width / 2 - 80 && mx < width / 2 + 80 && my > 466 && my < 510) {
      let correct = MEM.selected.filter((x) => MEM.shown.includes(x)).length;
      let wrong = MEM.selected.filter((x) => !MEM.shown.includes(x)).length;
      MEM.result = { correct, total: MEM.shown.length, wrong };
      score += max(-30, correct * 10 - wrong * 15);
      if (correct === MEM.shown.length && wrong === 0) {
        streak++;
        playSuccess();
      } else {
        streak = 0;
        playFail();
      }
    }
  }
  if (MEM.result !== null && my > 513 && my < 557) finishMG("memory");
}

// ============================================================
//  MG2 — OVERLOAD
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
    "🌶 Hot Sauce",
    "🧂 Salt",
    "🥞 Pancake Mix",
    "🍯 Honey",
    "🍩 Donuts",
    "🍟 Fries",
    "🍬 Candy",
  ];
  OVR.target = random(pool);
  OVR.options = shuffleArr(pool.slice()).slice(0, 12);
  OVR.timeLeft = floor(timeScale(320));
  OVR.selected = null;
  OVR.result = null;
  OVR.noiseOff = random(1000);
  OVR.flashPhase = 0;
  lastTickSecond = -1;
  OVR.npcs = [];
  for (let i = 0; i < 3; i++)
    OVR.npcs.push({
      x: random(80, width - 80),
      y: random(260, 420),
      dir: random([-1, 1]),
      speed: random(0.5, 1.1),
      pauseTimer: 0,
    });
}
function drawOverload() {
  let maxBase = 320,
    ratio = max(OVR.timeLeft / maxBase, 0),
    u = 1 - ratio,
    n = noise(frameCount * 0.018);
  background(235 + n * 20, 228 + n * 16, 218 + n * 12);
  if (OVR.result === null) {
    if (OVR.timeLeft < maxBase * 0.35) OVR.timeLeft -= 2;
    OVR.timeLeft--;
    OVR.noiseOff += 0.03;
    OVR.flashPhase += 0.08;
    noStroke();
    for (let i = 0; i < 40 + u * 80; i++) {
      let c = lerpColor(
        color(220, 230, 255, 40),
        color(255, 180, 180, 90),
        random(),
      );
      fill(c);
      let w = random(4, 26),
        h = random(4, 26);
      if (random() < 0.4) rect(random(width), random(height), w, h);
      else ellipse(random(width), random(height), w, h);
    }
    if (u > 0.4) {
      fill(255, 220, 220, map(u, 0.4, 1, 0, 90));
      rect(0, 0, width, height);
    }
    let sec = floor(OVR.timeLeft / 60);
    if (sec !== lastTickSecond && OVR.timeLeft < 160) {
      if (OVR.timeLeft < 60) playAlarm();
      else playTick();
      lastTickSecond = sec;
    }
  }
  drawHeader(
    "Sensory Overload",
    'Find "' + OVR.target + '" — text is your only anchor.',
  );
  fill(220, 228, 248);
  noStroke();
  rect(100, 96, width - 200, 10, 5);
  fill(ratio > 0.5 ? C.green : ratio > 0.25 ? C.yellow : C.red);
  rect(100, 96, (width - 200) * ratio, 10, 5);
  let cols = 4,
    cw = 190,
    ch = 88,
    sx = (width - cols * cw) / 2,
    sy = 130;
  for (let i = 0; i < OVR.options.length; i++) {
    let col = i % cols,
      row = floor(i / cols);
    let wx =
        OVR.result === null ? (noise(i * 31 + OVR.noiseOff) - 0.5) * u * 26 : 0,
      wy =
        OVR.result === null
          ? (noise(i * 31 + OVR.noiseOff + 100) - 0.5) * u * 18
          : 0;
    let bx = sx + col * cw + wx,
      by = sy + row * ch + wy;
    if (OVR.result !== null) {
      if (OVR.options[i] === OVR.target) fill(120, 215, 145, 230);
      else if (OVR.options[i] === OVR.selected) fill(230, 110, 110, 230);
      else fill(244, 247, 255, 210);
    } else fill(210 + random(-10, 10), 215 + random(-10, 10), 235, 230);
    stroke(210, 218, 230);
    strokeWeight(1);
    rect(bx, by, cw - 12, ch - 10, 10);
    noStroke();
    fill(28, 34, 52);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(OVR.options[i], bx + (cw - 12) / 2, by + (ch - 10) / 2);
  }
  for (let npc of OVR.npcs) {
    if (npc.pauseTimer > 0) npc.pauseTimer--;
    else {
      npc.x += npc.dir * npc.speed;
      if (npc.x < 40 || npc.x > width - 40) npc.dir *= -1;
      if (random() < 0.01) npc.pauseTimer = floor(random(30, 90));
    }
    fill(0, 0, 0, 60);
    noStroke();
    ellipse(npc.x, npc.y + 20, 30, 10);
    fill(120, 130, 170, 230);
    rect(npc.x - 9, npc.y - 10, 18, 28, 6);
    ellipse(npc.x, npc.y - 22, 18, 18);
  }
  if (OVR.timeLeft <= 0 && OVR.result === null) {
    OVR.result = { correct: 0, total: 1, timeout: true };
    streak = 0;
    playFail();
  }
  if (OVR.result !== null) {
    drawResultBanner(OVR.result);
    drawBtn("Continue", width / 2, 535, 200, 44, C.accent);
  }
  drawBackBtn();
  drawScoreBadge();
}
function clickOverload(mx, my) {
  if (OVR.result !== null) {
    if (my > 512 && my < 558) finishMG("overload");
    return;
  }
  let cols = 4,
    cw = 190,
    ch = 88,
    sx = (width - cols * cw) / 2,
    sy = 130;
  for (let i = 0; i < OVR.options.length; i++) {
    let bx = sx + (i % cols) * cw,
      by = sy + floor(i / cols) * ch;
    if (mx > bx && mx < bx + cw - 12 && my > by && my < by + ch - 10) {
      OVR.selected = OVR.options[i];
      let correct = OVR.options[i] === OVR.target ? 1 : 0;
      OVR.result = { correct, total: 1 };
      if (correct) {
        score += 30 + floor((OVR.timeLeft / 320) * 30);
        streak++;
        playSuccess();
      } else {
        score -= 25;
        streak = 0;
        playFail();
      }
      return;
    }
  }
}

// ============================================================
//  MG3 — NAVIGATION
// ============================================================
function initNavigation() {
  let correct = "Dairy";
  let allWrongs = [
    "Dary",
    "Daily",
    "Dairyy",
    "Da1ry",
    "Dairy?",
    "Diary",
    "Dairy-",
    "Dairy+",
    "Dairy Free",
    "Dairy Aisle",
    "Dariy",
    "Dairy.",
  ];
  let pool = shuffleArr([...shuffleArr(allWrongs).slice(0, 11), correct]);
  NAV.signs = [];
  let minSp = 74;
  for (let i = 0; i < pool.length; i++) {
    let tx,
      ty,
      attempts = 0,
      placed = false;
    while (!placed && attempts < 200) {
      tx = random(60, width - 178);
      ty = random(120, 265);
      let ok = true;
      for (let s of NAV.signs)
        if (abs(s.baseX - tx) < minSp && abs(s.baseY - ty) < minSp) {
          ok = false;
          break;
        }
      if (ok) placed = true;
      attempts++;
    }
    NAV.signs.push({
      label: pool[i],
      correct: pool[i] === correct,
      wobbleSpeed: random(0.04, 0.09) * (random() > 0.5 ? 1 : -1),
      wobbleAmp: random(3, 8),
      wobbleOffset: random(100),
      rotAmp: random() > 0.5 ? random(3, 5) : -random(3, 5),
      baseX: tx,
      baseY: ty,
      x: tx,
      y: ty,
      targetX: tx,
      targetY: ty,
    });
  }
  NAV.selected = -1;
  NAV.result = null;
  NAV.shuffleTriggered = false;
  NAV.shuffleTimer = 180;
  lastTickSecond = -1;
  NAV.npcs = [];
  for (let i = 0; i < 2; i++)
    NAV.npcs.push({
      x: random(120, width - 120),
      y: random(290, 420),
      dir: random([-1, 1]),
      speed: random(0.5, 0.9),
      pauseTimer: 0,
    });
}
function drawNavigation() {
  background(232, 226, 214);
  for (let x = 0; x < width; x += 38) {
    fill(x % 76 === 0 ? 222 : 212, 216, 205);
    noStroke();
    rect(x, 315, 38, height - 315);
  }
  fill(192, 186, 174);
  noStroke();
  rect(0, 74, width, 242);
  drawHeader(
    "Where do I go?",
    'Find "Dairy" exactly — tiny differences matter.',
  );
  if (!NAV.shuffleTriggered && NAV.result === null) {
    if (--NAV.shuffleTimer <= 0) {
      NAV.shuffleTriggered = true;
      for (let s of NAV.signs) {
        let tx,
          ty,
          attempts = 0,
          placed = false;
        while (!placed && attempts < 200) {
          tx = random(60, width - 178);
          ty = random(120, 265);
          let ok = true;
          for (let o of NAV.signs)
            if (
              o !== s &&
              abs(o.targetX - tx) < 74 &&
              abs(o.targetY - ty) < 74
            ) {
              ok = false;
              break;
            }
          if (ok) placed = true;
          attempts++;
        }
        s.targetX = tx;
        s.targetY = ty;
      }
    }
  }
  let sw = 118,
    sh = 50;
  for (let i = 0; i < NAV.signs.length; i++) {
    let s = NAV.signs[i];
    s.x = lerp(s.x, s.targetX, 0.1);
    s.y = lerp(s.y, s.targetY, 0.1);
    let sway =
      NAV.result === null && !s.correct
        ? sin(frameCount * s.wobbleSpeed + s.wobbleOffset) * s.wobbleAmp
        : 0;
    let rot =
      NAV.result === null && !s.correct
        ? sin(frameCount * s.wobbleSpeed * 0.7 + s.wobbleOffset) * s.rotAmp
        : 0;
    if (NAV.result !== null) {
      if (s.correct) fill(120, 215, 145);
      else if (i === NAV.selected) fill(230, 110, 110);
      else fill(210, 204, 192);
    } else
      fill(215 + ((i * 3) % 18), 210 + ((i * 2) % 14), 195 + ((i * 5) % 22));
    push();
    translate(s.x + sw / 2 + sway, s.y + sh / 2);
    rotate(radians(rot));
    stroke(150, 144, 132);
    strokeWeight(1.5);
    rect(-sw / 2, -sh / 2, sw, sh, 5);
    stroke(95, 85, 72);
    strokeWeight(1);
    line(0, -sh / 2, 0, -sh / 2 - 14);
    noStroke();
    fill(NAV.result !== null ? C.dark : [35 + (i % 3) * 30, 35, 55]);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(s.label, 0, 0);
    pop();
  }
  for (let npc of NAV.npcs) {
    if (npc.pauseTimer > 0) npc.pauseTimer--;
    else {
      npc.x += npc.dir * npc.speed;
      if (npc.x < 60 || npc.x > width - 60) npc.dir *= -1;
      if (random() < 0.015) npc.pauseTimer = floor(random(40, 100));
    }
    fill(0, 0, 0, 40);
    noStroke();
    ellipse(npc.x, 500, 26, 8);
    fill(120, 130, 170, 210);
    rect(npc.x - 8, 470, 16, 26, 6);
    ellipse(npc.x, 460, 16, 16);
  }
  if (NAV.result !== null) {
    drawResultBanner(NAV.result);
    drawBtn("Continue", width / 2, 535, 200, 44, C.accent);
  }
  drawBackBtn();
  drawScoreBadge();
}
function clickNavigation(mx, my) {
  if (NAV.result !== null) {
    if (my > 512 && my < 558) finishMG("navigation");
    return;
  }
  for (let i = 0; i < NAV.signs.length; i++) {
    let s = NAV.signs[i],
      sway = sin(frameCount * s.wobbleSpeed + s.wobbleOffset) * s.wobbleAmp;
    if (mx > s.x + sway && mx < s.x + sway + 118 && my > s.y && my < s.y + 50) {
      NAV.selected = i;
      let correct = s.correct ? 1 : 0;
      NAV.result = { correct, total: 1 };
      if (correct) {
        score += 30;
        streak++;
        playSuccess();
      } else {
        score -= 25;
        streak = 0;
        playFail();
      }
      return;
    }
  }
}

// ============================================================
//  MG4 — DECISION
// ============================================================
function initDecision() {
  DEC.milks = [
    { label: "Whole Milk\n3.25% • 2L", price: "$3.99", correct: false },
    { label: "Skim Milk\n0% fat • 2L", price: "$3.49", correct: false },
    { label: "2% Milk\n2% fat • 2L", price: "$3.79", correct: true },
    { label: "Lactose Free\nWhole • 2L", price: "$5.29", correct: false },
    { label: "Oat Milk\n2% style • 2L", price: "$6.49", correct: false },
    { label: "Almond Milk\n2% • 2L", price: "$4.99", correct: false },
    { label: "2% Milk\n2% fat • 4L", price: "$5.49", correct: false },
    { label: "2% Milk\n2% fat • 1L", price: "$2.99", correct: false },
  ];
  DEC.selected = -1;
  DEC.result = null;
  DEC.panicTimer = 0;
  DEC.timeLeft = floor(timeScale(floor(480 * 0.6) + 240));
  lastTickSecond = -1;
}
function drawDecision() {
  drawImageFit(milkAisleImg);
  fill(244, 247, 255, 200);
  noStroke();
  rect(0, 0, width, height);
  if (DEC.result === null) {
    DEC.panicTimer++;
    if (DEC.timeLeft < 200) DEC.timeLeft -= 2;
    DEC.timeLeft--;
    let sec = floor(DEC.timeLeft / 60);
    if (sec !== lastTickSecond && DEC.timeLeft < 180) {
      if (DEC.timeLeft < 60) playAlarm();
      else playTick();
      lastTickSecond = sec;
    }
  }
  let panic = DEC.panicTimer > 150 && DEC.result === null;
  if (panic) {
    fill(215, 55, 55, map(DEC.panicTimer, 150, 450, 0, 60));
    noStroke();
    rect(0, 0, width, height);
  }
  let maxTime = 480,
    shakeX =
      DEC.timeLeft < maxTime * 0.4 && DEC.result === null
        ? sin(frameCount * 0.9) * 4
        : 0;
  let shakeY =
    DEC.timeLeft < maxTime * 0.4 && DEC.result === null
      ? cos(frameCount * 1.1) * 2
      : 0;
  drawHeader(
    "Decision Fatigue",
    'Need: "2% Milk, 2L" — everything looks similar, time is short.',
  );
  let ratio = max(DEC.timeLeft / maxTime, 0);
  fill(220, 228, 248);
  noStroke();
  rect(100, 96, width - 200, 8, 5);
  fill(ratio > 0.4 ? (ratio > 0.6 ? C.green : C.yellow) : C.red);
  rect(100, 96, (width - 200) * ratio, 8, 5);
  let cols = 4,
    cw = 208,
    ch = 100,
    sx = (width - cols * cw) / 2,
    sy = 118;
  for (let i = 0; i < DEC.milks.length; i++) {
    let m = DEC.milks[i];
    let shiftX =
      DEC.result === null ? sin(frameCount * 0.05 + i * 1.3) * 5 + shakeX : 0;
    let shiftY =
      DEC.result === null ? cos(frameCount * 0.04 + i * 0.9) * 3 + shakeY : 0;
    let bx = sx + (i % cols) * cw + 3 + shiftX,
      by = sy + floor(i / cols) * ch + 3 + shiftY;
    if (DEC.result !== null) {
      if (m.correct) fill(120, 215, 145, 215);
      else if (i === DEC.selected) fill(230, 110, 110, 215);
      else fill(255, 255, 255, 140);
    } else fill(255, 255, 255, 188);
    stroke(170, 190, 215);
    strokeWeight(1.5);
    rect(bx, by, cw - 14, ch - 14, 8);
    if (milkCarton1) image(milkCarton1, bx + 5, by + 8, 22, 36);
    noStroke();
    fill(...C.dark);
    textAlign(LEFT, TOP);
    textSize(10);
    text(m.label, bx + 32, by + 10, cw - 44);
    fill(...C.muted);
    textSize(11);
    textAlign(LEFT, BOTTOM);
    text(m.price, bx + 32, by + ch - 18);
  }
  if (DEC.timeLeft <= 0 && DEC.result === null) {
    DEC.result = { correct: 0, total: 1, timeout: true };
    streak = 0;
    playFail();
  }
  if (panic && DEC.result === null) {
    fill(215, 55, 55, 200);
    noStroke();
    rect(0, height - 66, width, 66);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(13);
    text("Too many options. Hard to choose fast.", width / 2, height - 33);
  }
  if (DEC.result !== null) {
    drawResultBanner(DEC.result);
    drawBtn("Continue", width / 2, 535, 200, 44, C.accent);
  }
  drawBackBtn();
  drawScoreBadge();
}
function clickDecision(mx, my) {
  if (DEC.result !== null) {
    if (my > 512 && my < 558) finishMG("decision");
    return;
  }
  let cols = 4,
    cw = 208,
    ch = 100,
    sx = (width - cols * cw) / 2,
    sy = 118;
  for (let i = 0; i < DEC.milks.length; i++) {
    let bx = sx + (i % cols) * cw + 3,
      by = sy + floor(i / cols) * ch + 3;
    if (mx > bx && mx < bx + cw - 14 && my > by && my < by + ch - 14) {
      DEC.selected = i;
      let correct = DEC.milks[i].correct ? 1 : 0;
      DEC.result = { correct, total: 1 };
      if (correct) {
        score += 25 + floor((DEC.timeLeft / 480) * 30);
        streak++;
        playSuccess();
      } else {
        score -= 25;
        streak = 0;
        playFail();
      }
      return;
    }
  }
}

// ============================================================
//  MG5 — FROZEN  (Freezer Search: wipe frost to reveal items)
// ============================================================
function initFrozen() {
  let pool = [
    { label: "🍦 Ice Cream" },
    { label: "🥶 Frozen Peas" },
    { label: "❄️ Waffles" },
    { label: "🐟 Fish Sticks" },
    { label: "🍕 Frozen Pizza" },
    { label: "🍨 Sorbet" },
    { label: "🫐 Frozen Berries" },
    { label: "🍗 Chicken Strips" },
  ];
  let chosen = shuffleArr(pool.slice()).slice(0, 6);
  FRZ.target = random(chosen).label;
  let cols = 3,
    cw = 264,
    ch = 168,
    sx = (width - cols * cw) / 2 + 8,
    sy = 112;
  FRZ.items = chosen.map((it, i) => ({
    label: it.label,
    correct: it.label === FRZ.target,
    bx: sx + (i % cols) * cw + 6,
    by: sy + floor(i / cols) * ch + 6,
    bw: cw - 18,
    bh: ch - 18,
  }));
  FRZ.selected = -1;
  FRZ.result = null;
  FRZ.timeLeft = floor(timeScale(480));
  FRZ.wipes = [];
  lastTickSecond = -1;
}

function drawFrozen() {
  background(198, 222, 248);

  // ── items (underlay) ──────────────────────────────────────
  for (let i = 0; i < FRZ.items.length; i++) {
    let it = FRZ.items[i];
    if (FRZ.result !== null) {
      if (it.correct) fill(120, 215, 145, 230);
      else if (i === FRZ.selected) fill(230, 110, 110, 220);
      else fill(220, 234, 252, 200);
    } else fill(222, 236, 254, 215);
    stroke(155, 195, 228);
    strokeWeight(2);
    rect(it.bx, it.by, it.bw, it.bh, 12);
    noStroke();
    fill(...C.dark);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(it.label, it.bx + it.bw / 2, it.by + it.bh / 2);
  }

  // ── frost overlay (tiled, holes punched by wipes) ─────────
  if (FRZ.result === null) {
    let TILE = 14;
    for (let gx = 0; gx < width; gx += TILE) {
      for (let gy = 84; gy < height - 80; gy += TILE) {
        let revealed = false;
        for (let w of FRZ.wipes) {
          if (dist(gx + TILE / 2, gy + TILE / 2, w.x, w.y) < w.r) {
            revealed = true;
            break;
          }
        }
        if (!revealed) {
          fill(210, 232, 255, 210);
          noStroke();
          rect(gx, gy, TILE, TILE);
        }
      }
    }
    // sparkles
    for (let i = 0; i < 20; i++) {
      fill(255, 255, 255, 80 + sin(frameCount * 0.04 + i) * 50);
      noStroke();
      ellipse(random(width), random(84, height - 80), random(2, 5));
    }
  }

  drawHeader(
    "Freezer Search",
    "Its Frosty in here, Find and click: " + FRZ.target,
  );

  // timer bar
  fill(200, 220, 242);
  noStroke();
  rect(100, 96, width - 200, 10, 5);
  let ratio = max(FRZ.timeLeft / 480, 0);
  fill(ratio > 0.5 ? C.green : ratio > 0.25 ? C.yellow : C.red);
  rect(100, 96, (width - 200) * ratio, 10, 5);

  if (FRZ.result === null) {
    FRZ.timeLeft--;
    let sec = floor(FRZ.timeLeft / 60);
    if (sec !== lastTickSecond && FRZ.timeLeft < 200) {
      if (FRZ.timeLeft < 60) playAlarm();
      else playTick();
      lastTickSecond = sec;
    }
  }

  // target reminder
  fill(28, 34, 52, 215);
  noStroke();
  rect(width / 2 - 160, height - 70, 320, 46, 10);
  fill(255, 220, 60);
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);
  text("Find: " + FRZ.target, width / 2, height - 47);
  textStyle(NORMAL);

  if (FRZ.timeLeft <= 0 && FRZ.result === null) {
    FRZ.result = { correct: 0, total: 1, timeout: true };
    streak = 0;
    playFail();
  }
  if (FRZ.result !== null) {
    drawResultBanner(FRZ.result);
    drawBtn("Continue", width / 2, 535, 200, 44, C.accent);
  }
  drawBackBtn();
  drawScoreBadge();
}

// p5 mouseDragged — add wipe circles as mouse moves
function mouseDragged() {
  if (
    currentMG === "frozen" &&
    FRZ.result === null &&
    gameState === "minigame"
  ) {
    FRZ.wipes.push({ x: mouseX, y: mouseY, r: 32 });
    if (FRZ.wipes.length > 800)
      FRZ.wipes = FRZ.wipes.slice(FRZ.wipes.length - 800);
  }
}

function clickFrozen(mx, my) {
  if (FRZ.result !== null) {
    if (my > 512 && my < 558) finishMG("frozen");
    return;
  }
  // add a wipe dot on click too
  FRZ.wipes.push({ x: mx, y: my, r: 32 });
  // only register item click if spot has been wiped
  let wiped = FRZ.wipes.some((w) => dist(mx, my, w.x, w.y) < w.r);
  if (!wiped) return;
  for (let i = 0; i < FRZ.items.length; i++) {
    let it = FRZ.items[i];
    if (mx > it.bx && mx < it.bx + it.bw && my > it.by && my < it.by + it.bh) {
      FRZ.selected = i;
      let correct = it.correct ? 1 : 0;
      FRZ.result = { correct, total: 1 };
      if (correct) {
        score += 30 + floor((FRZ.timeLeft / 480) * 35);
        streak++;
        playSuccess();
      } else {
        score -= 25;
        streak = 0;
        playFail();
      }
      return;
    }
  }
}

// ============================================================
//  MG6 — DRINKS  (Memory → Glitch → Select)
// ============================================================
function initDrinks() {
  let pool = [
    "Green Tea",
    "Apple Juice",
    "Oat Milk",
    "Lemonade",
    "Cold Brew",
    "Kombucha",
    "Sparkling Water",
    "Orange Juice",
    "Coconut Water",
    "Ginger Beer",
  ];
  let count = floor(random(6, 9));
  DRK.origLabels = shuffleArr(pool.slice()).slice(0, count);

  function glitch(s) {
    let opts = [
      s + " Zero",
      s + " Plus",
      s.replace("a", "@").replace("o", "0"),
      s.slice(0, -1) + "!",
      "Org. " + s,
      s.replace("e", "3"),
    ].filter((v) => v !== s);
    return opts.length ? opts[floor(random(opts.length))] : s + "x";
  }
  let fakePool = pool.filter((p) => !DRK.origLabels.includes(p));
  while (fakePool.length < 4)
    fakePool.push(glitch(DRK.origLabels[floor(random(DRK.origLabels.length))]));
  DRK.allOptions = shuffleArr([
    ...DRK.origLabels,
    ...shuffleArr(fakePool).slice(0, 4),
  ]);

  let cols = 3,
    bw = 230,
    bh = 62,
    sx = (width - cols * (bw + 10)) / 2,
    sy = 138;
  DRK.positions = DRK.allOptions.map((_, i) => ({
    x: sx + (i % cols) * (bw + 10),
    y: sy + floor(i / cols) * (bh + 10),
    bw,
    bh,
  }));

  DRK.phase = "memorise";
  DRK.memoriseTimer = floor(timeScale(300));
  DRK.glitchTimer = floor(timeScale(110));
  DRK.shownLabels = [...DRK.allOptions];
  DRK.selected = [];
  DRK.result = null;
  DRK.flickerFrame = 0;
  DRK.selectTimeLeft = floor(timeScale(420));
  lastTickSecond = -1;
}

function drawDrinks() {
  background(228, 248, 235);
  for (let y = 74; y < height; y += 32) {
    fill(210, 240, 220, 30 + sin(frameCount * 0.018 + y * 0.05) * 14);
    noStroke();
    rect(0, y, width, 16);
  }

  if (DRK.phase === "memorise") {
    drawHeader(
      "Label Memory",
      "Memorise these " + DRK.origLabels.length + " drink labels.",
    );
    DRK.memoriseTimer--;
    fill(200, 238, 215);
    noStroke();
    rect(100, 96, width - 200, 10, 5);
    let r = max(DRK.memoriseTimer / floor(timeScale(300)), 0);
    fill(r > 0.5 ? C.green : r > 0.25 ? C.yellow : C.red);
    rect(100, 96, (width - 200) * r, 10, 5);
    fill(...C.dark);
    textAlign(CENTER, TOP);
    textSize(13);
    text(
      "Memorise these labels. " + ceil(DRK.memoriseTimer / 60) + "s left",
      width / 2,
      112,
    );
    let cols = 3,
      bw = 230,
      bh = 62,
      sx = (width - cols * (bw + 10)) / 2,
      sy = 138;
    for (let i = 0; i < DRK.origLabels.length; i++) {
      let x = sx + (i % cols) * (bw + 10),
        y = sy + floor(i / cols) * (bh + 10);
      fill(255, 255, 255, 225);
      stroke(150, 210, 170);
      strokeWeight(1.5);
      rect(x, y, bw, bh, 9);
      noStroke();
      fill(...C.dark);
      textAlign(CENTER, CENTER);
      textSize(14);
      text(DRK.origLabels[i], x + bw / 2, y + bh / 2);
    }
    if (DRK.memoriseTimer <= 0) {
      DRK.phase = "glitch";
      DRK.flickerFrame = 0;
      // scramble fakes slightly
      DRK.shownLabels = [...DRK.allOptions];
      for (let i = 0; i < DRK.shownLabels.length; i++) {
        if (!DRK.origLabels.includes(DRK.shownLabels[i]) && random() < 0.5) {
          let cs = DRK.shownLabels[i].split("");
          cs[floor(random(cs.length))] = ["#", "!", "*", "%", "@", "3", "0"][
            floor(random(7))
          ];
          DRK.shownLabels[i] = cs.join("");
        }
      }
    }
  } else if (DRK.phase === "glitch") {
    drawHeader("Glitch!", "Labels are scrambling — get ready to select.");
    DRK.glitchTimer--;
    DRK.flickerFrame++;
    fill(200, 238, 215);
    noStroke();
    rect(100, 96, width - 200, 10, 5);
    fill(...C.yellow);
    rect(
      100,
      96,
      (width - 200) * max(DRK.glitchTimer / floor(timeScale(110)), 0),
      10,
      5,
    );
    let cols = 3,
      bw = 230,
      bh = 62,
      sx = (width - cols * (bw + 10)) / 2,
      sy = 138;
    for (let i = 0; i < DRK.shownLabels.length; i++) {
      let x = sx + (i % cols) * (bw + 10),
        y = sy + floor(i / cols) * (bh + 10);
      let fx = DRK.flickerFrame % 4 < 2 ? random(-5, 5) : 0,
        fy = DRK.flickerFrame % 6 < 3 ? random(-3, 3) : 0;
      let r2 = 160 + random(-40, 40),
        g2 = 220 + random(-30, 30),
        b2 = 185 + random(-30, 30);
      fill(r2, g2, b2, 200);
      stroke(100, 180, 130, 160);
      strokeWeight(1);
      rect(x + fx, y + fy, bw, bh, 9);
      let disp = DRK.shownLabels[i];
      if (
        DRK.flickerFrame % 8 < 4 &&
        !DRK.origLabels.includes(DRK.allOptions[i])
      ) {
        let cs = disp.split("");
        cs[floor(random(cs.length))] = ["?", "_", "■", "░"][floor(random(4))];
        disp = cs.join("");
      }
      noStroke();
      fill(...C.dark);
      textAlign(CENTER, CENTER);
      textSize(13);
      text(disp, x + fx + bw / 2, y + fy + bh / 2);
    }
    if (DRK.glitchTimer <= 0) {
      DRK.phase = "select";
      lastTickSecond = -1;
    }
  } else {
    drawHeader(
      "Drinks Aisle",
      "Select the " +
        DRK.origLabels.length +
        " labels that were originally shown.",
    );
    DRK.selectTimeLeft--;
    fill(200, 238, 215);
    noStroke();
    rect(100, 96, width - 200, 10, 5);
    let r = max(DRK.selectTimeLeft / floor(timeScale(420)), 0);
    fill(r > 0.5 ? C.green : r > 0.25 ? C.yellow : C.red);
    rect(100, 96, (width - 200) * r, 10, 5);
    let sec = floor(DRK.selectTimeLeft / 60);
    if (sec !== lastTickSecond && DRK.selectTimeLeft < 200) {
      if (DRK.selectTimeLeft < 60) playAlarm();
      else playTick();
      lastTickSecond = sec;
    }
    fill(...C.muted);
    textAlign(CENTER, TOP);
    textSize(12);
    text(
      "Selected: " + DRK.selected.length + " / " + DRK.origLabels.length,
      width / 2,
      113,
    );
    for (let i = 0; i < DRK.allOptions.length; i++) {
      let pos = DRK.positions[i],
        label = DRK.allOptions[i],
        sel = DRK.selected.includes(label);
      if (DRK.result !== null) {
        let was = DRK.origLabels.includes(label);
        if (sel && was) fill(120, 215, 145, 230);
        else if (sel) fill(230, 110, 110, 220);
        else if (was) fill(255, 215, 80, 200);
        else fill(228, 248, 235, 180);
      } else fill(sel ? [70, 140, 255, 210] : [240, 252, 244, 220]);
      stroke(sel && DRK.result === null ? C.accent : [150, 210, 170]);
      strokeWeight(sel ? 2 : 1);
      rect(pos.x, pos.y, pos.bw, pos.bh, 10);
      noStroke();
      fill(sel && DRK.result === null ? 255 : C.dark);
      textAlign(CENTER, CENTER);
      textSize(13);
      text(label, pos.x + pos.bw / 2, pos.y + pos.bh / 2);
    }
    if (DRK.result === null && DRK.selected.length > 0)
      drawBtn("Submit", width / 2, 490, 160, 44, C.green);
    if (DRK.selectTimeLeft <= 0 && DRK.result === null) {
      DRK.result = { correct: 0, total: 1, timeout: true };
      streak = 0;
      playFail();
    }
    if (DRK.result !== null) {
      drawResultBanner(DRK.result);
      drawBtn("Continue", width / 2, 535, 200, 44, C.accent);
    }
  }
  drawBackBtn();
  drawScoreBadge();
}

function clickDrinks(mx, my) {
  if (DRK.result !== null) {
    if (my > 512 && my < 558) finishMG("drinks");
    return;
  }
  if (DRK.phase !== "select") return;
  // Submit
  if (
    DRK.selected.length > 0 &&
    mx > width / 2 - 80 &&
    mx < width / 2 + 80 &&
    my > 468 &&
    my < 512
  ) {
    let correct = DRK.selected.filter((x) => DRK.origLabels.includes(x)).length;
    let wrong = DRK.selected.filter((x) => !DRK.origLabels.includes(x)).length;
    DRK.result = { correct, total: DRK.origLabels.length, wrong };
    score += max(-40, correct * 10 - wrong * 15);
    if (correct === DRK.origLabels.length && wrong === 0) {
      streak++;
      playSuccess();
    } else {
      streak = 0;
      playFail();
    }
    return;
  }
  for (let i = 0; i < DRK.allOptions.length; i++) {
    let pos = DRK.positions[i],
      label = DRK.allOptions[i];
    if (
      mx > pos.x &&
      mx < pos.x + pos.bw &&
      my > pos.y &&
      my < pos.y + pos.bh
    ) {
      if (DRK.selected.includes(label))
        DRK.selected = DRK.selected.filter((x) => x !== label);
      else DRK.selected.push(label);
      playClick();
      return;
    }
  }
}

// ============================================================
//  MG7 — MAZE  (arrow-key navigation, reach the cart)
// ============================================================
function initMaze() {
  let C2 = MZE.cols,
    R2 = MZE.rows;
  MZE.cellW = floor((width - 20) / C2);
  MZE.cellH = floor((height - 90 - 18) / R2);
  // fill all walls
  MZE.grid = [];
  for (let r = 0; r < R2; r++) {
    MZE.grid.push([]);
    for (let c = 0; c < C2; c++) MZE.grid[r].push(1);
  }
  // recursive backtracker
  function carve(r, c) {
    let dirs = shuffleArr([
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0],
    ]);
    for (let [dr, dc] of dirs) {
      let nr = r + dr,
        nc = c + dc;
      if (
        nr > 0 &&
        nr < R2 - 1 &&
        nc > 0 &&
        nc < C2 - 1 &&
        MZE.grid[nr][nc] === 1
      ) {
        MZE.grid[r + dr / 2][c + dc / 2] = 0;
        MZE.grid[nr][nc] = 0;
        carve(nr, nc);
      }
    }
  }
  MZE.grid[1][1] = 0;
  carve(1, 1);
  // noise decoys (slightly lighter wall tiles)
  MZE.noiseDecoys = [];
  for (let r = 1; r < R2 - 1; r++)
    for (let c = 1; c < C2 - 1; c++)
      if (MZE.grid[r][c] === 1 && random() < 0.07)
        MZE.noiseDecoys.push({ r, c });
  // player start
  MZE.px = 1;
  MZE.py = 1;
  // cart — bottom-right corner, ensure open
  MZE.cartX = C2 - 2;
  MZE.cartY = R2 - 2;
  MZE.grid[R2 - 2][C2 - 2] = 0;
  if (MZE.grid[R2 - 3][C2 - 2] === 1 && MZE.grid[R2 - 2][C2 - 3] === 1)
    MZE.grid[R2 - 3][C2 - 2] = 0;
  MZE.result = null;
  MZE.moveTimer = 0;
  MZE.shakeTimer = 0;
  lastTickSecond = -1;
}

function drawMaze() {
  background(238, 232, 220);
  drawHeader("Maze Delivery", "Arrow keys — navigate to the 🛒 cart.");
  let offX = 10,
    offY = 88;
  let cw = MZE.cellW,
    ch = MZE.cellH;
  let sx = MZE.shakeTimer > 0 ? random(-3, 3) : 0,
    sy = MZE.shakeTimer > 0 ? random(-2, 2) : 0;
  if (MZE.shakeTimer > 0) MZE.shakeTimer--;
  push();
  translate(offX + sx, offY + sy);

  // grid
  for (let r = 0; r < MZE.rows; r++)
    for (let c = 0; c < MZE.cols; c++) {
      if (MZE.grid[r][c] === 1) {
        fill(65, 55, 85);
        noStroke();
        rect(c * cw, r * ch, cw, ch);
      } else {
        fill(244, 238, 228);
        noStroke();
        rect(c * cw, r * ch, cw, ch);
      }
    }
  // decoys
  for (let d of MZE.noiseDecoys) {
    fill(100, 90, 118, 130);
    noStroke();
    rect(d.c * cw + 2, d.r * ch + 2, cw - 4, ch - 4, 2);
  }

  // cart
  let gx = MZE.cartX * cw + cw / 2,
    gy = MZE.cartY * ch + ch / 2;
  fill(255, 215, 60, 220);
  noStroke();
  rect(gx - cw * 0.38, gy - ch * 0.36, cw * 0.76, ch * 0.72, 4);
  textAlign(CENTER, CENTER);
  textSize(min(cw, ch) * 0.58);
  text("🛒", gx, gy);

  // player box
  let ppx = MZE.px * cw,
    ppy = MZE.py * ch;
  fill(255, 115, 55);
  noStroke();
  rect(ppx + 2, ppy + 2, cw - 4, ch - 4, 5);
  fill(255, 200, 55);
  rect(ppx + 4, ppy + 4, cw - 8, ch - 8, 3);
  textAlign(CENTER, CENTER);
  textSize(min(cw, ch) * 0.52);
  text("📦", ppx + cw / 2, ppy + ch / 2);

  pop();

  if (MZE.result === null) updateMazePlayer();
  if (MZE.px === MZE.cartX && MZE.py === MZE.cartY && MZE.result === null) {
    MZE.result = { correct: 1, total: 1 };
    score += 40;
    streak++;
    playSuccess();
  }

  fill(28, 34, 52, 175);
  noStroke();
  rect(width / 2 - 174, height - 60, 348, 40, 8);
  fill(255, 220, 100);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("Arrow keys to move  •  reach the 🛒", width / 2, height - 40);

  if (MZE.result !== null) {
    drawResultBanner(MZE.result);
    drawBtn("Continue", width / 2, 535, 200, 44, C.accent);
  }
  drawBackBtn();
  drawScoreBadge();
}

function updateMazePlayer() {
  if (++MZE.moveTimer < MZE.moveCooldown) return;
  let nx = MZE.px,
    ny = MZE.py,
    moved = false;
  if (keyIsDown(LEFT_ARROW)) {
    nx--;
    moved = true;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    nx++;
    moved = true;
  }
  if (keyIsDown(UP_ARROW)) {
    ny--;
    moved = true;
  }
  if (keyIsDown(DOWN_ARROW)) {
    ny++;
    moved = true;
  }
  if (moved) {
    if (
      nx >= 0 &&
      nx < MZE.cols &&
      ny >= 0 &&
      ny < MZE.rows &&
      MZE.grid[ny][nx] === 0
    ) {
      MZE.px = nx;
      MZE.py = ny;
      playTick();
    } else MZE.shakeTimer = 8;
    MZE.moveTimer = 0;
  }
}
function clickMaze(mx, my) {
  if (MZE.result !== null) {
    if (my > 512 && my < 558) finishMG("maze");
  }
}

// ============================================================
//  MG8 — CHECKOUT  (timer +120 frames = +2 sec)
// ============================================================
function initCheckout() {
  let pool = [
    { name: "Milk", price: 3.79 },
    { name: "Bread", price: 2.99 },
    { name: "Eggs", price: 4.49 },
    { name: "Apples", price: 1.99 },
    { name: "Cheese", price: 5.49 },
    { name: "Yogurt", price: 3.29 },
    { name: "Pasta", price: 2.49 },
    { name: "Juice", price: 3.99 },
    { name: "Cereal", price: 4.19 },
    { name: "Snacks", price: 2.79 },
  ];
  let count = floor(random(5, 8));
  CHK.items = shuffleArr(pool).slice(0, count);
  CHK.total = CHK.items.reduce((s, it) => s + it.price, 0);
  CHK.playerAnswer = "";
  CHK.timeLeft = floor(timeScale((floor(600 * 0.75) + 120) * 2)); // doubled
  CHK.result = null;
  CHK.phase = "count";
  CHK.flashTimer = 0;
  lastTickSecond = -1;
  let correct = CHK.total.toFixed(2),
    wrongs = [];
  while (wrongs.length < 3) {
    let off =
      (random() > 0.5 ? 1 : -1) *
      (floor(random(1, 8)) * 0.5 + random([-0.99, 0.01, 0.5]));
    let w = (CHK.total + off).toFixed(2);
    if (w > 0 && w !== correct && !wrongs.includes(w)) wrongs.push(w);
  }
  CHK.choices = shuffleArr([correct, ...wrongs]);
  CHK.correctAnswer = correct;
}
function drawCheckout() {
  background(235, 230, 245);
  for (let x = 0; x < width; x += 60) {
    fill(x % 120 === 0 ? 225 : 215, 220, 235);
    noStroke();
    rect(x, 340, 60, height - 340);
  }
  fill(180, 174, 200);
  noStroke();
  rect(0, 74, width, 268);
  if (CHK.result === null) {
    CHK.timeLeft--;
    CHK.flashTimer++;
    if (CHK.timeLeft < 220) CHK.timeLeft--;
    let sec = floor(CHK.timeLeft / 60);
    if (sec !== lastTickSecond && CHK.timeLeft < 200) {
      if (CHK.timeLeft < 60) playAlarm();
      else playTick();
      lastTickSecond = sec;
    }
  }
  drawHeader("Checkout", "Add it up fast. People are waiting behind you.");
  fill(210, 205, 228);
  noStroke();
  rect(100, 96, width - 200, 10, 5);
  let ratio = max(CHK.timeLeft / 600, 0);
  fill(ratio > 0.5 ? C.green : ratio > 0.25 ? C.yellow : C.red);
  rect(100, 96, (width - 200) * ratio, 10, 5);
  if (CHK.timeLeft < 200 && CHK.result === null) {
    fill(255, 80, 80, 160);
    noStroke();
    rect(0, 0, width, height);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(
      "Other people are waiting. Feels rushed.",
      width / 2 + sin(CHK.flashTimer * 0.4) * 3,
      420,
    );
  }
  fill(255);
  noStroke();
  rect(68, 112, width - 136, 200, 10);
  for (let x = 68; x < width - 68; x += 28) {
    fill(
      (floor(x / 28) + floor(frameCount / 6)) % 2 === 0 ? 248 : 238,
      245,
      255,
    );
    noStroke();
    rect(x, 282, 28, 30, 2);
  }
  let itemW = min(130, (width - 160) / CHK.items.length),
    startX = 88;
  for (let i = 0; i < CHK.items.length; i++) {
    let it = CHK.items[i],
      ix = startX + i * (itemW + 8);
    fill(220, 215, 240);
    stroke(185, 178, 210);
    strokeWeight(1);
    rect(ix, 122, itemW, 150, 8);
    noStroke();
    fill(...C.dark);
    textAlign(CENTER, TOP);
    textSize(10);
    text(it.name, ix + itemW / 2, 176);
    fill(...C.muted);
    textSize(12);
    text("$" + it.price.toFixed(2), ix + itemW / 2, 196);
  }
  if (CHK.result === null && CHK.flashTimer % 80 < 22) {
    fill(255, 230, 230, 190);
    noStroke();
    rect(width / 2 - 140, 320, 280, 40, 8);
    fill(200, 80, 80);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(
      "Random total: $" + (CHK.total + random(-6, 6)).toFixed(2),
      width / 2,
      340,
    );
  }
  fill(...C.dark);
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);
  text("What's the total?", width / 2, 352);
  textStyle(NORMAL);
  if (CHK.result === null) {
    for (let i = 0; i < CHK.choices.length; i++) {
      let bx = 60 + (i % 2) * 380,
        by = 378 + floor(i / 2) * 58;
      let ho =
        mouseX > bx && mouseX < bx + 340 && mouseY > by && mouseY < by + 46;
      fill(ho ? [70, 140, 255, 230] : [255, 255, 255, 210]);
      stroke(180, 175, 210);
      strokeWeight(1.5);
      rect(bx, by, 340, 46, 8);
      noStroke();
      fill(ho ? 255 : C.dark);
      textAlign(CENTER, CENTER);
      textSize(16);
      textStyle(BOLD);
      text("$" + CHK.choices[i], bx + 170, by + 23);
      textStyle(NORMAL);
    }
  } else {
    drawResultBanner(CHK.result);
    for (let i = 0; i < CHK.choices.length; i++) {
      let bx = 60 + (i % 2) * 380,
        by = 378 + floor(i / 2) * 58;
      let ic = CHK.choices[i] === CHK.correctAnswer,
        ws = CHK.choices[i] === CHK.playerAnswer;
      fill(
        ic
          ? [120, 215, 145, 220]
          : ws
            ? [230, 110, 110, 220]
            : [244, 247, 255, 180],
      );
      stroke(180, 175, 210);
      strokeWeight(1);
      rect(bx, by, 340, 46, 8);
      noStroke();
      fill(...C.dark);
      textAlign(CENTER, CENTER);
      textSize(16);
      textStyle(BOLD);
      text("$" + CHK.choices[i], bx + 170, by + 23);
      textStyle(NORMAL);
    }
    drawBtn("Continue", width / 2, 543, 200, 44, C.accent);
  }
  if (CHK.timeLeft <= 0 && CHK.result === null) {
    CHK.result = { correct: 0, total: 1, timeout: true };
    streak = 0;
    playFail();
  }
  drawBackBtn();
  drawScoreBadge();
}
function clickCheckout(mx, my) {
  if (CHK.result !== null) {
    if (my > 520 && my < 564) finishMG("checkout");
    return;
  }
  for (let i = 0; i < CHK.choices.length; i++) {
    let bx = 60 + (i % 2) * 380,
      by = 378 + floor(i / 2) * 58;
    if (mx > bx && mx < bx + 340 && my > by && my < by + 46) {
      CHK.playerAnswer = CHK.choices[i];
      let correct = CHK.choices[i] === CHK.correctAnswer ? 1 : 0;
      CHK.result = { correct, total: 1 };
      if (correct) {
        score += 30 + floor((CHK.timeLeft / 600) * 40);
        streak++;
        playSuccess();
      } else {
        score -= 30;
        streak = 0;
        playFail();
      }
      return;
    }
  }
}

// ============================================================
//  WIN SCREEN
// ============================================================
function drawWin() {
  background(22, 34, 22);
  noStroke();
  for (let i = 0; i < 30; i++) {
    let px = (frameCount * (i * 0.28 + 0.4)) % width,
      py = height - ((frameCount * (0.38 + i * 0.09) + i * 55) % height);
    fill(255, 255, 255, 50 + sin(frameCount * 0.05 + i) * 35);
    ellipse(px, py, 7);
  }
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(46);
  textStyle(BOLD);
  text("Done", width / 2, 88);
  textStyle(NORMAL);
  fill(255, 205, 50);
  textSize(28);
  textStyle(BOLD);
  text("Final Score: " + score + " pts", width / 2, 144);
  textStyle(NORMAL);
  let grade =
    score >= 500
      ? "S"
      : score >= 360
        ? "A"
        : score >= 240
          ? "B"
          : score >= 130
            ? "C"
            : "D";
  let gc =
    score >= 500
      ? [100, 255, 140]
      : score >= 360
        ? [100, 200, 255]
        : score >= 240
          ? [255, 220, 100]
          : [255, 150, 100];
  fill(...gc);
  textSize(22);
  text("Grade: " + grade, width / 2, 186);
  fill(255, 255, 255, 160);
  noStroke();
  rect(76, 210, width - 152, 208, 12);
  fill(22, 34, 22);
  textSize(14);
  textLeading(28);
  textAlign(CENTER, CENTER);
  text(
    "Alex made it through the whole store.\nEvery aisle took focus and energy.\n\nFor Alex, this is groceries.\nFor others — classrooms, offices,\nor just getting across town.\n\nStress is real. The load is real.\nDesign can make it lighter or heavier.",
    width / 2,
    314,
  );
  drawBtn("Play Again", width / 2, 490, 220, 52, C.accent);
}

// ============================================================
//  FINISH MG
// ============================================================
function finishMG(id) {
  let z = zones.find((z) => z.id === id);
  if (z && !z.done) {
    z.done = true;
    completedCount++;
  }
  showLevelMsg("Zone complete");
  if (completedCount >= zones.length) goTo("win");
  else goTo("store");
}

// ============================================================
//  SHARED UI
// ============================================================
function drawHeader(title, sub) {
  fill(255, 255, 255, 235);
  noStroke();
  rect(0, 0, width, 84);
  stroke(210, 218, 232);
  strokeWeight(1);
  line(0, 84, width, 84);
  noStroke();
  fill(...C.dark);
  textAlign(LEFT, CENTER);
  textSize(20);
  textStyle(BOLD);
  text(title, 16, 26);
  textStyle(NORMAL);
  fill(...C.muted);
  textSize(12);
  text(sub, 16, 60, width - 150);
}
function drawScoreBadge() {
  fill(255, 205, 50, 200);
  noStroke();
  rect(width - 128, 8, 118, 28, 8);
  fill(...C.dark);
  textAlign(CENTER, CENTER);
  textSize(12);
  textStyle(BOLD);
  text("★ " + score + (streak > 1 ? "  x" + streak : ""), width - 69, 22);
  textStyle(NORMAL);
}
function drawBtn(label, bx, by, bw, bh, col) {
  let ho =
    mouseX > bx - bw / 2 &&
    mouseX < bx + bw / 2 &&
    mouseY > by - bh / 2 &&
    mouseY < by + bh / 2;
  noStroke();
  fill(0, 0, 0, 40);
  rect(bx - bw / 2 + 2, by - bh / 2 + 3, bw, bh, 10);
  fill(...col, ho ? 248 : 210);
  rect(bx - bw / 2, by - bh / 2, bw, bh, 10);
  fill(col[0] > 210 ? C.dark : [255, 255, 255]);
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);
  text(label, bx, by);
  textStyle(NORMAL);
  cursor(ho ? HAND : ARROW);
}
function drawResultBanner(result) {
  let ok = result && result.correct > 0 && !result.timeout;
  fill(ok ? [...C.green, 215] : [...C.red, 215]);
  noStroke();
  rect(0, 448, width, 62);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);
  if (result && result.timeout) text("Too slow.", width / 2, 479);
  else if (ok) text("Nice.", width / 2, 479);
  else text("Missed.", width / 2, 479);
  textStyle(NORMAL);
}
function drawBackBtn() {
  fill(240, 244, 255, 200);
  noStroke();
  rect(width - 108, 8, 98, 30, 8);
  fill(...C.muted);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("Back", width - 59, 23);
}
function drawImageFit(img) {
  if (!img) return;
  let r = img.width / img.height,
    cr = width / height,
    dw,
    dh;
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
  try {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
  let mx = mouseX,
    my = mouseY;
  if (
    gameState === "minigame" &&
    mx > width - 108 &&
    mx < width - 10 &&
    my > 8 &&
    my < 38
  ) {
    goTo("store");
    return;
  }
  switch (gameState) {
    case "intro":
      if (!dlg.done) {
        if (dlg.idx < dlg.lines.length - 1) dlg.idx++;
        else dlg.done = true;
        playClick();
      } else if (
        mx > width / 2 - 100 &&
        mx < width / 2 + 100 &&
        my > 382 &&
        my < 434
      )
        goTo("tutorial");
      break;
    case "tutorial":
      if (
        mx > width / 2 - 105 &&
        mx < width / 2 + 105 &&
        my > height - 38 - 22 &&
        my < height - 38 + 22
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
      if (currentMG === "frozen") clickFrozen(mx, my);
      if (currentMG === "drinks") clickDrinks(mx, my);
      if (currentMG === "maze") clickMaze(mx, my);
      if (currentMG === "checkout") clickCheckout(mx, my);
      break;
    case "win":
      if (
        mx > width / 2 - 110 &&
        mx < width / 2 + 110 &&
        my > 490 - 26 &&
        my < 490 + 26
      ) {
        score = 0;
        streak = 0;
        completedCount = 0;
        for (let z of zones) {
          z.done = false;
          z.near = false;
        }
        dlg.idx = 0;
        dlg.done = false;
        player.x = 200;
        player.y = 430;
        player.facing = 1;
        player.walkFrame = 0;
        camX = 0;
        goTo("intro");
      }
      break;
  }
}

function keyPressed() {
  if (transitioning) return;
  try {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
  if (key === "h" || key === "H") {
    let hints = {
      store: "Walk right to find glowing aisle arches. Press SPACE to enter.",
      minigame: {
        memory: "Focus on the exact spelling of each item.",
        overload: "Ignore colour and motion. Read the labels only.",
        navigation: "Check every letter. D-A-I-R-Y exactly.",
        decision: "2% and 2L must both match. Ignore similar ones.",
        frozen: "Drag to wipe frost, then click the revealed target item.",
        drinks: "In select phase, pick only the labels shown during memorise.",
        maze: "Arrow keys move tile by tile. Dead ends are real.",
        checkout: "Add the prices you see. Don't trust the flashing totals.",
      },
    };
    if (gameState === "minigame" && currentMG)
      showHint(hints.minigame[currentMG] || "Keep going.");
    else showHint(hints[gameState] || "Keep going.");
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
      playClick();
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
