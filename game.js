const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const timeEl = document.querySelector("#time");
const startButton = document.querySelector("#start");
const soundToggleButton = document.querySelector("#sound-toggle");
const continueButton = document.querySelector("#continue");
const resultPanel = document.querySelector("#result-panel");
const resultTitleEl = document.querySelector("#result-title");
const resultTimeRowEl = document.querySelector("#result-time-row");
const resultTimeEl = document.querySelector("#result-time");
const resultTotalEl = document.querySelector("#result-total");
const resultAEl = document.querySelector("#result-a");
const resultBEl = document.querySelector("#result-b");
const resultCEl = document.querySelector("#result-c");
const restartButton = document.querySelector("#restart");
const endButton = document.querySelector("#end");
const saveScreenButton = document.querySelector("#save-screen");
const saveResultButton = document.querySelector("#save-result");
const shareOpenButton = document.querySelector("#share-open");
const sharePanel = document.querySelector("#share-panel");
const shareNativeButton = document.querySelector("#share-native");
const copyUrlButton = document.querySelector("#copy-url");
const shareStatusEl = document.querySelector("#share-status");
const profileOpenButton = document.querySelector("#profile-open");
const profilePanel = document.querySelector("#profile-panel");
const profileCloseButton = document.querySelector("#profile-close");
const stickZone = document.querySelector("#stick-zone");
const stickThumb = document.querySelector("#stick-thumb");
const moveLeftButton = document.querySelector("#move-left");
const moveRightButton = document.querySelector("#move-right");
const jumpButton = document.querySelector("#jump-button");
const mobileControlsQuery = window.matchMedia("(max-width: 760px) and (pointer: coarse)");

const durationSeconds = 40;
const gameUrl = "https://erinui.github.io/inutaro-game/?share=20260616-ogp";
const assetPromises = [];
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
const renderState = {
  ratio: 1,
  rect: { left: 0, top: 0, width: 960, height: 540 },
  view: { w: 960, h: 540, floorY: 454, skyLine: 97 },
};
const backgroundCache = {
  canvas: document.createElement("canvas"),
  w: 0,
  h: 0,
  ratio: 0,
  ready: false,
};

const backgroundImage = loadImage("assets/bg.jpg?v=20260614-bg");

const playerImages = {
  idle: loadImage("assets/player_idle.png"),
  jump: loadImage("assets/player_jump.png"),
};

const enemyImages = {
  idle: loadImage("assets/enemy_idle.png"),
  hazard: loadImage("assets/hazard_1.png"),
  impact: loadImage("assets/hazard_2.png"),
};

const itemImages = {
  a: loadImage("assets/item_a.png"),
  b: loadImage("assets/item_b.png"),
  c: loadImage("assets/item_c.png"),
};

const soundEffects = {
  jump: loadSound("assets/sound_jump.mp3", 0.48, { maxDuration: 0.34, minInterval: 80 }),
  itemGet: loadSound("assets/sound_itemget.mp3", 0.48, { maxDuration: 0.62, minInterval: 90 }),
  hazardHit: loadSound("assets/sound_hazard-hit.mp3", 0.66, { maxDuration: 0.32, minInterval: 120 }),
};
const backgroundMusic = loadBgm("assets/bgm.mp3", 0.18);
let audioContext = null;
let soundUnlocked = false;
let bgmStarted = false;
let bgmLoadRequested = false;
let soundEnabled = true;

const itemTypes = [
  { key: "a", label: "A", motion: "ground", radius: 18, spriteSize: 75, color: "#f0c85a", glow: "rgba(240, 200, 90, 0.20)", speed: 62 },
  { key: "b", label: "B", motion: "flutter", radius: 34, spriteSize: 126, color: "#d9bd42", glow: "rgba(240, 200, 90, 0.18)", speed: 148 },
  { key: "c", label: "C", motion: "dragonfly", radius: 30, spriteSize: 118, color: "#74a6cf", glow: "rgba(116, 166, 207, 0.22)", speed: 340 },
];

const hazardTypes = [
  { label: "!", width: 34.2, height: 48.6, spriteSize: 129.6, impactSize: 220, color: "#df7367", speed: 236.5 },
];

const palettes = {
  skyTop: "#f8fbf6",
  skyBottom: "#dce9e3",
  hillBack: "#c9ddd5",
  hillFront: "#b8d0bd",
  floor: "#a7bdaa",
  floorLine: "rgba(35,48,41,0.08)",
  text: "#233029",
  shadow: "rgba(37,46,40,0.18)",
  danger: "#7d3842",
  safe: "#4f7d65",
};

const state = {
  running: false,
  startedAt: 0,
  lastTime: 0,
  score: 0,
  endedAt: 0,
  endReason: "",
  resultPending: false,
  resultRevealAt: 0,
  continueVisible: false,
  resultVisible: false,
  itemCounts: { a: 0, b: 0, c: 0 },
  timeLeft: durationSeconds,
  playerX: 0.55,
  targetX: 0.55,
  facing: 1,
  playerLift: 0,
  playerLiftVelocity: 0,
  grounded: true,
  jumpSquash: 0,
  catcherOpen: 0,
  enemyX: 0.5,
  enemyDirection: 1,
  enemyBob: 0,
  nextItemAt: 0,
  nextHazardAt: 0,
  itemBag: [],
  items: [],
  hazards: [],
  impacts: [],
  sparks: [],
  floaters: [],
  damageShake: 0,
  keys: new Set(),
  stickPointerId: null,
  virtualStickX: 0,
  virtualStickY: 0,
};

const jumpPhysics = {
  power: 610,
  gravity: 1560,
  maxHeightRatio: 0.34,
};

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const maxPixelRatio = 2;
  const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  renderState.ratio = ratio;
  renderState.rect = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
  renderState.view = {
    w: rect.width,
    h: rect.height,
    floorY: rect.height * 0.84,
    skyLine: rect.height * 0.18,
  };
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = coarsePointerQuery.matches ? "low" : "medium";
  backgroundCache.ready = false;
}

function view() {
  return renderState.view;
}

function resetGame() {
  const now = performance.now();
  startBgm();
  state.running = true;
  state.startedAt = now;
  state.lastTime = now;
  state.score = 0;
  state.endedAt = 0;
  state.endReason = "";
  state.resultPending = false;
  state.resultRevealAt = 0;
  state.continueVisible = false;
  state.resultVisible = false;
  state.itemCounts = { a: 0, b: 0, c: 0 };
  state.timeLeft = durationSeconds;
  state.playerX = 0.55;
  state.targetX = 0.55;
  state.facing = 1;
  state.playerLift = 0;
  state.playerLiftVelocity = 0;
  state.grounded = true;
  state.jumpSquash = 0.16;
  state.catcherOpen = 0;
  state.enemyX = 0.22 + Math.random() * 0.56;
  state.enemyDirection = Math.random() < 0.5 ? -1 : 1;
  state.nextItemAt = now + 420;
  state.nextHazardAt = now + 1300 + Math.random() * 600;
  state.itemBag = [];
  state.items = [];
  state.hazards = [];
  state.impacts = [];
  state.sparks = [];
  state.floaters = [];
  state.damageShake = 0;
  scoreEl.textContent = "0";
  timeEl.textContent = String(durationSeconds);
  startButton.textContent = "RESET";
  startButton.classList.add("is-compact");
  continueButton.hidden = true;
  resultPanel.hidden = true;
}

function showTitle() {
  const now = performance.now();
  state.running = false;
  state.startedAt = 0;
  state.lastTime = now;
  state.score = 0;
  state.endedAt = 0;
  state.endReason = "";
  state.resultPending = false;
  state.resultRevealAt = 0;
  state.continueVisible = false;
  state.resultVisible = false;
  state.itemCounts = { a: 0, b: 0, c: 0 };
  state.timeLeft = durationSeconds;
  state.playerX = 0.55;
  state.targetX = 0.55;
  state.facing = 1;
  state.playerLift = 0;
  state.playerLiftVelocity = 0;
  state.grounded = true;
  state.jumpSquash = 0;
  state.catcherOpen = 0;
  state.enemyX = 0.5;
  state.enemyDirection = 1;
  state.enemyBob = 0;
  state.nextItemAt = 0;
  state.nextHazardAt = 0;
  state.itemBag = [];
  state.items = [];
  state.hazards = [];
  state.impacts = [];
  state.sparks = [];
  state.floaters = [];
  state.damageShake = 0;
  scoreEl.textContent = "0";
  timeEl.textContent = String(durationSeconds);
  startButton.textContent = "START";
  startButton.classList.remove("is-compact");
  continueButton.hidden = true;
  resultPanel.hidden = true;
  sharePanel.hidden = true;
  profilePanel.hidden = true;
  setShareStatus("");
  resetStick();
}

function finishGame(now, reason) {
  if (!state.running) {
    return;
  }

  state.running = false;
  state.endedAt = now;
  state.endReason = reason;
  state.continueVisible = false;
  state.resultVisible = false;
  startButton.textContent = "RESTART";
  if (reason === "hazard") {
    state.resultPending = true;
    state.resultRevealAt = now + 950;
    return;
  }

  showContinue();
}

function showContinue() {
  state.resultPending = false;
  state.continueVisible = true;
  continueButton.hidden = false;
}

function showResult() {
  state.resultPending = false;
  state.continueVisible = false;
  state.resultVisible = true;
  continueButton.hidden = true;
  resultTitleEl.textContent = state.endReason === "hazard" ? "GAME OVER" : "CLEAR";
  const isGameOver = state.endReason === "hazard";
  resultTimeRowEl.hidden = !isGameOver;
  resultTimeEl.textContent = isGameOver ? `${survivedSeconds().toFixed(1)}s` : "";
  resultTotalEl.textContent = String(state.score);
  resultAEl.textContent = String(state.itemCounts.a);
  resultBEl.textContent = String(state.itemCounts.b);
  resultCEl.textContent = String(state.itemCounts.c);
  sharePanel.hidden = true;
  profilePanel.hidden = true;
  setShareStatus("");
  resultPanel.hidden = false;
}

function survivedSeconds() {
  const end = state.endedAt || performance.now();
  return Math.min(durationSeconds, Math.max(0, (end - state.startedAt) / 1000));
}

function resultText() {
  const total = `${state.score}ひき`;
  if (state.endReason === "hazard") {
    return `犬タローの虫さんまってまってで ${total} 捕まえたよ！${survivedSeconds().toFixed(1)}秒でゲームオーバー…もう一回！`;
  }

  return `犬タローの虫さんまってまってで ${total} 捕まえたよ！`;
}

function spawnItem(now) {
  const v = view();
  const type = nextItemType();
  const laneCount = v.w < 620 ? 4 : 5;
  const lane = Math.floor(Math.random() * laneCount);
  const playableTop = v.floorY - Math.min(v.h * 0.43, 230);
  const playableBottom = v.floorY - 54;
  const scale = v.w < 620 ? 0.88 : 1;
  const spriteSize = type.spriteSize * scale;
  const wave =
    type.motion === "flutter"
      ? 18 + Math.random() * 18
      : type.motion === "dragonfly"
        ? 0
        : 8 + Math.random() * 10;
  const reachable = reachableAirRange(v);
  let y = playableTop + ((lane + 0.5) / laneCount) * (playableBottom - playableTop);

  if (type.motion === "ground") {
    y = v.floorY - spriteSize * 0.22;
  } else if (type.motion === "flutter") {
    const airLaneCount = v.w < 620 ? 3 : 4;
    const airLane = Math.floor(Math.random() * airLaneCount);
    const airTop = Math.max(v.skyLine + v.h * 0.19, reachable.top - wave);
    const airBottom = Math.max(airTop, reachable.bottom - wave * 0.45);
    y = airTop + ((airLane + 0.5) / airLaneCount) * Math.max(60, airBottom - airTop);
    y = clamp(y, reachable.top - wave, airBottom);
  } else if (type.motion === "dragonfly") {
    const dragonflyTop = reachable.top + Math.max(12, spriteSize * 0.18);
    const dragonflyBottom = dragonflyTop + (reachable.bottom - dragonflyTop) * 0.22;
    y = dragonflyTop + Math.random() * Math.max(1, dragonflyBottom - dragonflyTop);
  }

  state.items.push({
    ...type,
    radius: type.radius * scale,
    spriteSize,
    x: -spriteSize * 0.45,
    y,
    baseY: y,
    speed: type.speed * (v.w < 620 ? 0.78 : 1),
    wave,
    phase: Math.random() * Math.PI * 2,
    hoverUntil: 0,
    nextHoverAt: type.motion === "dragonfly" ? now + 650 + Math.random() * 1000 : 0,
    burstUntil: 0,
    bornAt: now,
    hit: false,
  });
}

function nextItemType() {
  if (state.itemBag.length === 0) {
    state.itemBag = shuffleItems([0, 1, 2, 0, 1, 2]);
  }
  return itemTypes[state.itemBag.pop()];
}

function shuffleItems(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function reachableAirRange(v) {
  const playerSize = Math.min(v.h * 0.32, v.w < 620 ? 142 : 176);
  const maxLift = maxPlayerLift(v);
  const topAtMaxJump = v.floorY + 10 - playerSize * 0.88 - maxLift;
  const bottomOnGround = v.floorY + 10 - playerSize * 0.12;
  const top = topAtMaxJump + Math.max(12, v.h * 0.025);
  const bottom = bottomOnGround - Math.max(22, v.h * 0.05);
  return { apex: topAtMaxJump, top, bottom: Math.max(top + 48, bottom) };
}

function maxPlayerLift(v) {
  const physicsLift = (jumpPhysics.power * jumpPhysics.power) / (2 * jumpPhysics.gravity);
  return Math.min(v.h * jumpPhysics.maxHeightRatio, physicsLift);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnHazard(now) {
  const v = view();
  const type = hazardTypes[0];
  const scale = v.w < 620 ? 0.84 : 1;
  const enemy = enemyPosition(v, now);

  state.hazards.push({
    ...type,
    width: type.width * scale,
    height: type.height * scale,
    spriteSize: type.spriteSize * scale,
    impactSize: type.impactSize * scale,
    x: enemy.x,
    y: enemy.y + 32,
    speed: type.speed * (v.w < 620 ? 0.86 : 1),
    drift: 0,
    bornAt: now,
    hit: false,
  });
}

function jump(now) {
  const canPreviewJump = !state.running && !state.startedAt;
  if ((!state.running && !canPreviewJump) || !state.grounded) {
    return;
  }

  state.grounded = false;
  state.playerLiftVelocity = jumpPhysics.power;
  state.jumpSquash = -0.14;
  playSound("jump");
  spawnSparks(playerPosition(view()).x, view().floorY + 4, now, "#f4eddb", 10);
}

function addFloater(text, x, y, color) {
  state.floaters.push({
    text,
    x,
    y,
    color,
    bornAt: performance.now(),
    life: 0.78,
  });
}

function spawnSparks(x, y, now, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.sparks.push({
      kind: "dust",
      x,
      y,
      vx: (Math.random() - 0.5) * 150,
      vy: -40 - Math.random() * 70,
      size: 3 + Math.random() * 5,
      color,
      bornAt: now,
      life: 0.34 + Math.random() * 0.2,
    });
  }
}

function spawnTwinkles(x, y, now) {
  const offsets = [
    { x: -18, y: -10, vx: -16, vy: -32, size: 9, kind: "cross" },
    { x: 4, y: -22, vx: 2, vy: -38, size: 12, kind: "diamond" },
    { x: 20, y: 2, vx: 18, vy: -24, size: 8, kind: "cross" },
  ];
  for (const sparkle of offsets) {
    state.sparks.push({
      kind: "twinkle",
      shape: sparkle.kind,
      x: x + sparkle.x,
      y: y + sparkle.y,
      vx: sparkle.vx,
      vy: sparkle.vy,
      size: sparkle.size,
      color: "#ffd84d",
      rotation: sparkle.kind === "diamond" ? Math.PI / 4 : 0,
      spin: sparkle.kind === "diamond" ? 1.4 : 0,
      bornAt: now,
      life: 0.38,
    });
  }
}

function enemyPosition(v, now) {
  const margin = Math.max(70, v.w * 0.08);
  const x = margin + state.enemyX * (v.w - margin * 2);
  const y = v.skyLine + 24 + Math.sin(now * 0.004 + state.enemyBob) * 11;
  return { x, y };
}

function playerPosition(v) {
  const size = Math.min(v.h * 0.32, v.w < 620 ? 142 : 176);
  const minX = size * 0.42;
  const maxX = v.w - size * 0.42;
  const shake = state.damageShake > 0 ? Math.sin(performance.now() * 0.06) * state.damageShake : 0;
  const x = minX + state.playerX * (maxX - minX) + shake;
  const y = v.floorY - size + 10 - state.playerLift;

  return {
    x,
    y,
    w: size,
    h: size,
    catch: {
      left: x - size * 0.44,
      right: x + size * 0.44,
      top: y + size * 0.12,
      bottom: y + size * 0.88,
    },
    body: {
      left: x - size * 0.27,
      right: x + size * 0.27,
      top: y + size * 0.22,
      bottom: y + size * 0.95,
    },
  };
}

function update(dt, now) {
  const v = view();

  if (state.resultPending && now >= state.resultRevealAt) {
    showContinue();
  }

  if (!state.running && state.startedAt) {
    state.damageShake = Math.max(0, state.damageShake - dt * 70);
    return;
  }

  if (state.keys.has("ArrowLeft") || state.keys.has("a")) {
    state.targetX -= dt * 0.9;
    state.facing = 1;
  }
  if (state.keys.has("ArrowRight") || state.keys.has("d")) {
    state.targetX += dt * 0.9;
    state.facing = -1;
  }
  const stickX = mobileControlsEnabled() ? state.virtualStickX : 0;
  if (Math.abs(stickX) > 0.08) {
    state.targetX += stickX * dt * 0.96;
    state.facing = stickX > 0 ? -1 : 1;
  }

  state.targetX = Math.max(0, Math.min(1, state.targetX));
  if (Math.abs(state.targetX - state.playerX) > 0.006) {
    state.facing = state.targetX > state.playerX ? -1 : 1;
  }
  state.playerX += (state.targetX - state.playerX) * Math.min(1, dt * 6);
  state.catcherOpen = Math.max(0, state.catcherOpen - dt * 3.2);
  state.jumpSquash += (0 - state.jumpSquash) * Math.min(1, dt * 10);
  state.damageShake = Math.max(0, state.damageShake - dt * 42);

  if (!state.grounded) {
    const maxLift = maxPlayerLift(v);
    state.playerLiftVelocity -= jumpPhysics.gravity * dt;
    state.playerLift += state.playerLiftVelocity * dt;
    if (state.playerLift >= maxLift && state.playerLiftVelocity > 0) {
      state.playerLift = maxLift;
      state.playerLiftVelocity = 0;
    }
    if (state.playerLift <= 0 && state.playerLiftVelocity < 0) {
      state.playerLift = 0;
      state.playerLiftVelocity = 0;
      state.grounded = true;
      state.jumpSquash = 0.22;
      spawnSparks(playerPosition(v).x, v.floorY + 4, now, "#f4eddb", 11);
    }
  }

  state.enemyX += state.enemyDirection * dt * (v.w < 620 ? 0.18 : 0.14);
  if (state.enemyX <= 0 || state.enemyX >= 1) {
    state.enemyX = Math.max(0, Math.min(1, state.enemyX));
    state.enemyDirection *= -1;
    state.enemyBob = Math.random() * Math.PI * 2;
  }

  if (state.running) {
    const nextTimeLeft = Math.max(0, durationSeconds - Math.floor((now - state.startedAt) / 1000));
    if (nextTimeLeft !== state.timeLeft) {
      state.timeLeft = nextTimeLeft;
      timeEl.textContent = String(state.timeLeft);
    }
    if (state.timeLeft <= 0) {
      finishGame(now, "timeup");
      return;
    }

    if (now >= state.nextItemAt) {
      spawnItem(now);
      state.nextItemAt = now + 560 + Math.random() * 420;
    }

    if (now >= state.nextHazardAt) {
      spawnHazard(now);
      state.nextHazardAt = now + 820 + Math.random() * 1350;
    }
  }

  if (!state.running) {
    return;
  }

  for (const item of state.items) {
    const age = (now - item.bornAt) * 0.001;
    let speed = item.speed;
    if (item.motion === "dragonfly") {
      if (item.hoverUntil > now) {
        speed = 0;
      } else {
        if (item.nextHoverAt && now >= item.nextHoverAt) {
          item.hoverUntil = now + 360 + Math.random() * 560;
          item.burstUntil = item.hoverUntil + 420 + Math.random() * 420;
          item.nextHoverAt = now + 950 + Math.random() * 1500;
          speed = 0;
        } else if (item.burstUntil > now) {
          speed *= 2.35;
        }
      }
    }

    item.x += speed * dt;
    if (item.motion === "flutter") {
      item.y = item.baseY + Math.sin(age * 4.8 + item.phase) * item.wave;
    }
  }
  for (const hazard of state.hazards) {
    hazard.y += hazard.speed * dt;
    hazard.x += hazard.drift * dt;
  }
  for (const spark of state.sparks) {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    if (spark.kind === "twinkle") {
      spark.vx *= Math.max(0, 1 - dt * 1.6);
      spark.vy *= Math.max(0, 1 - dt * 1.6);
      spark.rotation += spark.spin * dt;
    } else {
      spark.vy += 250 * dt;
    }
  }
  for (const floater of state.floaters) {
    floater.y -= 9 * dt;
  }

  state.items = state.items.filter((item) => item.x < v.w + item.spriteSize * 0.7 && !item.hit);
  state.hazards = state.hazards.filter((hazard) => hazard.y < v.h + hazard.height * 2 && !hazard.hit);
  state.impacts = state.impacts.filter((impact) => (now - impact.bornAt) * 0.001 < impact.life);
  state.sparks = state.sparks.filter((spark) => (now - spark.bornAt) * 0.001 < spark.life);
  state.floaters = state.floaters.filter((floater) => (now - floater.bornAt) * 0.001 < floater.life);
}

function collide(now) {
  const v = view();
  const player = playerPosition(v);

  for (const item of state.items) {
    if (item.hit) {
      continue;
    }
    const caught =
      item.x > player.catch.left &&
      item.x < player.catch.right &&
      item.y > player.catch.top &&
      item.y < player.catch.bottom;
    if (caught) {
      item.hit = true;
      state.score += 1;
      state.itemCounts[item.key] += 1;
      state.catcherOpen = 1;
      scoreEl.textContent = String(state.score);
      addFloater("+1", player.x, player.y + player.h * 0.1, "#d39b24");
      spawnTwinkles(item.x, item.y, now);
      playSound("itemGet");
    }
  }

  for (const hazard of state.hazards) {
    if (hazard.hit) {
      continue;
    }
    const rect = {
      left: hazard.x - hazard.width * 0.44,
      right: hazard.x + hazard.width * 0.44,
      top: hazard.y - hazard.height * 0.44,
      bottom: hazard.y + hazard.height * 0.44,
    };
    if (rectsOverlap(player.body, rect)) {
      hazard.hit = true;
      state.damageShake = 5;
      state.jumpSquash = 0.22;
      spawnImpact(hazard.x, Math.min(hazard.y + hazard.height * 0.34, player.body.bottom), hazard.impactSize, now, true);
      addFloater("OUT", player.x, player.y + player.h * 0.24, palettes.danger);
      playSound("hazardHit");
      finishGame(now, "hazard");
      return;
    } else if (hazard.y + hazard.height * 0.5 >= v.floorY) {
      hazard.hit = true;
      spawnImpact(hazard.x, v.floorY + 3, hazard.impactSize, now);
    }
  }
}

function spawnImpact(x, y, size, now, persist = false) {
  state.impacts.push({
    x,
    y,
    size,
    persist,
    bornAt: now,
    life: 0.46,
  });
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function drawBackground(v, now) {
  if (backgroundImage.complete && backgroundImage.naturalWidth) {
    drawCachedBackground(v);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, v.h);
  gradient.addColorStop(0, palettes.skyTop);
  gradient.addColorStop(1, palettes.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, v.w, v.h);

  ctx.fillStyle = "rgba(255,255,255,0.46)";
  for (let i = 0; i < 9; i += 1) {
    const x = ((i * 151 + now * 0.006) % (v.w + 150)) - 76;
    const y = 58 + ((i * 61) % Math.max(88, v.h * 0.38));
    ctx.beginPath();
    ctx.ellipse(x, y, 58, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = palettes.hillBack;
  ctx.beginPath();
  ctx.moveTo(0, v.floorY - v.h * 0.11);
  ctx.bezierCurveTo(v.w * 0.24, v.floorY - v.h * 0.23, v.w * 0.42, v.floorY - v.h * 0.02, v.w * 0.62, v.floorY - v.h * 0.14);
  ctx.bezierCurveTo(v.w * 0.77, v.floorY - v.h * 0.23, v.w * 0.92, v.floorY - v.h * 0.05, v.w, v.floorY - v.h * 0.12);
  ctx.lineTo(v.w, v.floorY);
  ctx.lineTo(0, v.floorY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palettes.hillFront;
  ctx.beginPath();
  ctx.moveTo(0, v.floorY - v.h * 0.055);
  ctx.bezierCurveTo(v.w * 0.2, v.floorY - v.h * 0.12, v.w * 0.42, v.floorY + v.h * 0.02, v.w * 0.62, v.floorY - v.h * 0.06);
  ctx.bezierCurveTo(v.w * 0.82, v.floorY - v.h * 0.13, v.w * 0.94, v.floorY - v.h * 0.02, v.w, v.floorY - v.h * 0.05);
  ctx.lineTo(v.w, v.floorY);
  ctx.lineTo(0, v.floorY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palettes.floor;
  ctx.fillRect(0, v.floorY, v.w, v.h - v.floorY);

  ctx.strokeStyle = palettes.floorLine;
  ctx.lineWidth = 1;
  for (let x = -40; x < v.w + 40; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, v.floorY);
    ctx.lineTo(x + 54, v.h);
    ctx.stroke();
  }
}

function drawCachedBackground(v) {
  const targetW = Math.max(1, Math.round(v.w * renderState.ratio));
  const targetH = Math.max(1, Math.round(v.h * renderState.ratio));
  if (!backgroundCache.ready || backgroundCache.w !== targetW || backgroundCache.h !== targetH || backgroundCache.ratio !== renderState.ratio) {
    backgroundCache.canvas.width = targetW;
    backgroundCache.canvas.height = targetH;
    const bgCtx = backgroundCache.canvas.getContext("2d");
    bgCtx.imageSmoothingEnabled = true;
    bgCtx.imageSmoothingQuality = coarsePointerQuery.matches ? "low" : "medium";
    drawCoverImageTo(bgCtx, backgroundImage, 0, 0, targetW, targetH);
    backgroundCache.w = targetW;
    backgroundCache.h = targetH;
    backgroundCache.ratio = renderState.ratio;
    backgroundCache.ready = true;
  }

  ctx.drawImage(backgroundCache.canvas, 0, 0, v.w, v.h);
}

function drawCoverImage(image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) * 0.5;
  const sourceY = (image.naturalHeight - sourceHeight) * 0.5;

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawEnemy(v, now) {
  const enemy = enemyPosition(v, now);
  const size = v.w < 620 ? 92 : 112;
  const image = enemyImages.idle;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const directionScale = state.enemyDirection > 0 ? -1 : 1;
  ctx.scale(directionScale, 1);
  if (image.complete && image.naturalWidth) {
    ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
  } else {
    drawFallbackEnemy(size, now);
  }
  ctx.restore();
}

function drawFallbackEnemy(size, now) {
  const bodyW = size * 0.58;
  const bodyH = bodyW * 0.48;
  const wing = Math.sin(now * 0.025) * 8;

  ctx.fillStyle = "#f1d58a";
  roundedRect(-bodyW * 0.5, -bodyH * 0.5, bodyW, bodyH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(35,48,41,0.32)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#7a99a3";
  ctx.beginPath();
  ctx.ellipse(-bodyW * 0.62, -wing * 0.12, bodyW * 0.27, bodyH * 0.28 + Math.abs(wing) * 0.12, -0.35, 0, Math.PI * 2);
  ctx.ellipse(bodyW * 0.62, wing * 0.12, bodyW * 0.27, bodyH * 0.28 + Math.abs(wing) * 0.12, 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawItem(item, now) {
  const age = (now - item.bornAt) * 0.001;
  const image = itemImages[item.key];

  if (image && image.complete && image.naturalWidth) {
    drawItemImage(item, image, age);
    return;
  }

  drawPlaceholderItem(item, age);
}

function drawItemImage(item, image, age) {
  ctx.save();
  ctx.translate(item.x, item.y);
  if (item.motion === "flutter") {
    ctx.rotate(Math.sin(age * 5.4 + item.phase) * 0.08);
  } else if (item.motion === "dragonfly" && item.hoverUntil > performance.now()) {
    ctx.rotate(Math.sin(age * 24 + item.phase) * 0.035);
  }
  ctx.drawImage(image, -item.spriteSize * 0.5, -item.spriteSize * 0.5, item.spriteSize, item.spriteSize);
  ctx.restore();
}

function drawPlaceholderItem(item, age) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(Math.sin(age * 4 + item.phase) * 0.15);
  ctx.fillStyle = item.glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, item.radius * 1.55, item.radius * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = item.color;
  ctx.strokeStyle = "rgba(35,48,41,0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = `800 ${Math.max(13, item.radius * 0.9)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.label, 0, 1);
  ctx.restore();
}

function drawHazard(hazard, now) {
  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  if (enemyImages.hazard.complete && enemyImages.hazard.naturalWidth) {
    ctx.drawImage(enemyImages.hazard, -hazard.spriteSize * 0.5, -hazard.spriteSize * 0.5, hazard.spriteSize, hazard.spriteSize);
  } else {
    ctx.fillStyle = hazard.color;
    ctx.strokeStyle = "rgba(35,48,41,0.36)";
    ctx.lineWidth = 2;
    roundedRect(-hazard.width * 0.5, -hazard.height * 0.5, hazard.width, hazard.height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = `800 ${Math.max(13, hazard.height * 0.34)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hazard.label, 0, 0);
  }
  ctx.restore();
}

function drawImpacts(now) {
  ctx.save();
  for (const impact of state.impacts) {
    const age = (now - impact.bornAt) * 0.001;
    const t = Math.min(1, age / impact.life);
    const size = impact.persist ? impact.size : impact.size * (0.82 + t * 0.24);
    ctx.globalAlpha = impact.persist ? 1 : Math.max(0, 1 - t);
    if (enemyImages.impact.complete && enemyImages.impact.naturalWidth) {
      ctx.drawImage(enemyImages.impact, impact.x - size * 0.5, impact.y - size * 0.86, size, size);
    } else {
      ctx.fillStyle = "#f3f4df";
      ctx.beginPath();
      ctx.ellipse(impact.x, impact.y, size * 0.18, size * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPlayer(v, now) {
  const player = playerPosition(v);
  const air = Math.min(1, state.playerLift / Math.max(1, v.h * jumpPhysics.maxHeightRatio));
  const scaleX = 1 + state.jumpSquash * 0.42 - air * 0.02;
  const scaleY = 1 - state.jumpSquash * 0.48 + air * 0.02;
  const image = state.grounded ? playerImages.idle : playerImages.jump;

  ctx.save();
  ctx.fillStyle = palettes.shadow;
  ctx.globalAlpha = 1 - air * 0.52;
  ctx.beginPath();
  ctx.ellipse(player.x, v.floorY + 11, player.w * (0.28 - air * 0.06), 12 - air * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.translate(player.x, player.y + player.h);
  ctx.scale(scaleX * state.facing, scaleY);

  if (image.complete && image.naturalWidth) {
    ctx.drawImage(image, -player.w * 0.5, -player.h, player.w, player.h);
  } else {
    drawFallbackPlayer(player);
  }
  ctx.restore();
}

function drawFallbackPlayer(player) {
  const armOpen = 0.32 + state.catcherOpen * 0.52;

  ctx.fillStyle = "#25322e";
  roundedRect(-player.w * 0.19, -player.h * 0.72, player.w * 0.38, player.h * 0.7, 8);
  ctx.fill();

  ctx.strokeStyle = "#25322e";
  ctx.lineWidth = Math.max(5, player.w * 0.07);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-player.w * 0.15, -player.h * 0.53);
  ctx.lineTo(-player.w * (0.42 + armOpen * 0.32), -player.h * 0.72);
  ctx.moveTo(player.w * 0.15, -player.h * 0.53);
  ctx.lineTo(player.w * (0.42 + armOpen * 0.32), -player.h * 0.72);
  ctx.stroke();

  ctx.fillStyle = "#f3d3b0";
  ctx.beginPath();
  ctx.arc(0, -player.h * 0.88, player.w * 0.17, 0, Math.PI * 2);
  ctx.fill();
}

function drawSparks(now) {
  ctx.save();
  for (const spark of state.sparks) {
    const age = (now - spark.bornAt) * 0.001;
    const alpha = Math.max(0, 1 - age / spark.life);
    if (spark.kind === "twinkle") {
      drawTwinkle(spark, age, alpha);
    } else {
      ctx.globalAlpha = alpha * 0.68;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.ellipse(spark.x, spark.y, spark.size * (1 + age * 1.8), spark.size * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTwinkle(spark, age, alpha) {
  const pulse = Math.sin(Math.min(1, age / spark.life) * Math.PI);
  const size = spark.size * (0.78 + pulse * 0.38);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.rotation);
  ctx.globalAlpha = alpha * 0.82;
  ctx.fillStyle = spark.color;
  ctx.strokeStyle = spark.color;
  ctx.lineCap = "round";

  if (spark.shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.58, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.58, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.strokeStyle = spark.color;
  ctx.lineWidth = Math.max(1.6, size * 0.22);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.stroke();
  ctx.restore();
}

function drawFloaters(now) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "800 20px system-ui, sans-serif";
  for (const floater of state.floaters) {
    const age = (now - floater.bornAt) * 0.001;
    const t = Math.min(1, age / floater.life);
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y - t * 42);
  }
  ctx.restore();
}

function drawGameOver(v, now) {
  ctx.save();
  const elapsed = Math.max(0, now - state.endedAt);
  const reveal = Math.min(1, elapsed / 260);
  ctx.fillStyle = `rgba(255,255,255,${0.52 * reveal})`;
  ctx.fillRect(0, 0, v.w, v.h);
  ctx.fillStyle = palettes.text;
  ctx.globalAlpha = reveal;
  ctx.textAlign = "center";
  ctx.font = `800 ${Math.max(32, v.w * 0.044)}px system-ui, sans-serif`;
  ctx.fillText(state.endReason === "hazard" ? "GAME OVER" : "CLEAR", v.w / 2, v.h * 0.45);
  ctx.restore();
}

function drawEndOverlay(targetCtx, width, height) {
  targetCtx.save();
  targetCtx.fillStyle = "rgba(255,255,255,0.52)";
  targetCtx.fillRect(0, 0, width, height);
  targetCtx.fillStyle = palettes.text;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.font = `800 ${Math.max(46, width * 0.06)}px system-ui, sans-serif`;
  targetCtx.fillText(state.endReason === "hazard" ? "GAME OVER" : "CLEAR", width / 2, height * 0.45);
  targetCtx.restore();
}

function createEndScreenCanvas() {
  const output = document.createElement("canvas");
  output.width = canvas.width;
  output.height = canvas.height;
  const outputCtx = output.getContext("2d");
  outputCtx.drawImage(canvas, 0, 0, output.width, output.height);
  drawEndOverlay(outputCtx, output.width, output.height);
  return output;
}

function createResultCardCanvas() {
  const output = document.createElement("canvas");
  output.width = 1200;
  output.height = 630;
  const card = output.getContext("2d");

  card.fillStyle = "#dff2f2";
  card.fillRect(0, 0, output.width, output.height);
  if (backgroundImage.complete && backgroundImage.naturalWidth) {
    drawCoverImageTo(card, backgroundImage, 0, 0, output.width, output.height);
  }

  card.fillStyle = "rgba(255,255,255,0.72)";
  roundRectOn(card, 58, 54, 1084, 522, 28);
  card.fill();

  card.fillStyle = palettes.text;
  card.textAlign = "left";
  card.textBaseline = "alphabetic";
  card.font = "800 52px system-ui, sans-serif";
  card.fillText("犬タローの虫さんまってまって", 102, 130);

  card.font = "900 82px system-ui, sans-serif";
  card.fillText(state.endReason === "hazard" ? "GAME OVER" : "CLEAR", 102, 230);

  if (playerImages.idle.complete && playerImages.idle.naturalWidth) {
    card.drawImage(playerImages.idle, 790, 112, 230, 230);
  }

  card.fillStyle = "rgba(29,37,33,0.08)";
  roundRectOn(card, 102, 280, 390, 136, 20);
  card.fill();
  card.fillStyle = "#5f6a64";
  card.font = "800 24px system-ui, sans-serif";
  card.fillText("TOTAL", 132, 322);
  card.fillStyle = palettes.text;
  card.font = "900 78px system-ui, sans-serif";
  card.fillText(String(state.score), 132, 390);
  card.font = "800 30px system-ui, sans-serif";
  card.fillText("ひき", 132 + String(state.score).length * 48 + 10, 389);

  if (state.endReason === "hazard") {
    card.fillStyle = "#5f6a64";
    card.font = "800 25px system-ui, sans-serif";
    card.fillText(`${survivedSeconds().toFixed(1)}秒でゲームオーバー`, 522, 342);
  }

  const rows = [
    { image: itemImages.a, count: state.itemCounts.a, x: 120 },
    { image: itemImages.b, count: state.itemCounts.b, x: 284 },
    { image: itemImages.c, count: state.itemCounts.c, x: 448 },
  ];

  for (const row of rows) {
    card.fillStyle = "rgba(255,255,255,0.62)";
    roundRectOn(card, row.x, 440, 128, 86, 18);
    card.fill();
    if (row.image.complete && row.image.naturalWidth) {
      card.drawImage(row.image, row.x + 12, 451, 62, 62);
    }
    card.fillStyle = palettes.text;
    card.font = "900 32px system-ui, sans-serif";
    card.fillText(String(row.count), row.x + 78, 495);
    card.font = "800 17px system-ui, sans-serif";
    card.fillText("ひき", row.x + 78 + String(row.count).length * 20 + 5, 495);
  }

  card.fillStyle = "#5f6a64";
  card.font = "800 24px system-ui, sans-serif";
  card.fillText(gameUrl, 658, 502);

  return output;
}

function drawCoverImageTo(targetCtx, image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) * 0.5;
  const sourceY = (image.naturalHeight - sourceHeight) * 0.5;
  targetCtx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function roundRectOn(targetCtx, x, y, w, h, r) {
  targetCtx.beginPath();
  targetCtx.moveTo(x + r, y);
  targetCtx.arcTo(x + w, y, x + w, y + h, r);
  targetCtx.arcTo(x + w, y + h, x, y + h, r);
  targetCtx.arcTo(x, y + h, x, y, r);
  targetCtx.arcTo(x, y, x + w, y, r);
  targetCtx.closePath();
}

function canvasToBlob(sourceCanvas) {
  return new Promise((resolve, reject) => {
    sourceCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("画像の作成に失敗しました"));
      }
    }, "image/png");
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveImageBlob(blob, filename, successText) {
  const file = new File([blob], filename, { type: "image/png" });
  if (mobileControlsEnabled() && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: "犬タローの虫さんまってまって",
      text: "犬タローの虫さんまってまって",
      files: [file],
    });
    setShareStatus("保存先を選択しました");
    return;
  }

  downloadBlob(blob, filename);
  setShareStatus(successText);
}

async function saveEndScreenCapture() {
  const blob = await canvasToBlob(createEndScreenCanvas());
  await saveImageBlob(blob, "inutaro-screen.png", "画面を保存しました");
}

async function saveResultCapture() {
  const blob = await canvasToBlob(createResultCardCanvas());
  await saveImageBlob(blob, "inutaro-result.png", "リザルトを保存しました");
}

async function shareResult() {
  const screenBlob = await canvasToBlob(createEndScreenCanvas());
  const resultBlob = await canvasToBlob(createResultCardCanvas());
  const files = [
    new File([screenBlob], "inutaro-screen.png", { type: "image/png" }),
    new File([resultBlob], "inutaro-result.png", { type: "image/png" }),
  ];
  const shareData = {
    title: "犬タローの虫さんまってまって",
    text: resultText(),
    url: gameUrl,
    files,
  };

  if (navigator.canShare && navigator.canShare({ files })) {
    await navigator.share(shareData);
    setShareStatus("共有しました");
    return;
  }

  if (navigator.share) {
    await navigator.share({ title: shareData.title, text: shareData.text, url: shareData.url });
    setShareStatus("共有しました");
    return;
  }

  await copyGameUrl();
}

async function copyGameUrl() {
  const text = `${resultText()}\n${gameUrl}`;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  setShareStatus("URLをコピーしました");
}

function setShareStatus(text) {
  shareStatusEl.textContent = text;
}

function runAction(action) {
  action().catch(() => {
    setShareStatus("この環境では実行できませんでした");
  });
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src) {
  const image = new Image();
  const ready = new Promise((resolve) => {
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => resolve(image), { once: true });
  });
  assetPromises.push(ready);
  image.src = src;
  return image;
}

function loadSound(src, volume, options = {}) {
  const fallbackPool = Array.from({ length: 2 }, () => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;
    return audio;
  });

  return {
    src,
    volume,
    buffer: null,
    loading: null,
    fallbackPool,
    maxDuration: options.maxDuration || 0,
    minInterval: options.minInterval || 0,
    lastPlayedAt: 0,
  };
}

function loadBgm(src, volume) {
  const audio = new Audio(src);
  audio.preload = "none";
  audio.loop = true;
  audio.volume = volume;
  audio.setAttribute("playsinline", "");
  return audio;
}

function primeBgm() {
  if (!backgroundMusic || bgmLoadRequested) {
    return;
  }

  bgmLoadRequested = true;
  try {
    backgroundMusic.load();
  } catch {}
}

function startBgm() {
  bgmStarted = true;
  if (!soundEnabled) {
    return;
  }

  if (!backgroundMusic || !backgroundMusic.paused) {
    return;
  }

  try {
    primeBgm();
    const playback = backgroundMusic.play();
    if (playback) {
      playback.catch(() => {});
    }
  } catch {
    // Background music can be blocked until a direct user gesture.
  }
}

function stopBgm() {
  if (!backgroundMusic || backgroundMusic.paused) {
    return;
  }

  try {
    backgroundMusic.pause();
  } catch {}
}

function updateSoundToggle() {
  if (!soundToggleButton) {
    return;
  }

  soundToggleButton.textContent = soundEnabled ? "🔊" : "🔇";
  soundToggleButton.classList.toggle("is-muted", !soundEnabled);
  soundToggleButton.setAttribute("aria-pressed", String(!soundEnabled));
  soundToggleButton.setAttribute("aria-label", soundEnabled ? "サウンドをOFFにする" : "サウンドをONにする");
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    if (bgmStarted) {
      startBgm();
    }
  } else {
    stopBgm();
  }
  updateSoundToggle();
}

function playSound(name) {
  if (!soundEnabled) {
    return;
  }

  const sound = soundEffects[name];
  if (!sound) {
    return;
  }

  const now = performance.now();
  if (sound.minInterval && now - sound.lastPlayedAt < sound.minInterval) {
    return;
  }
  sound.lastPlayedAt = now;

  const context = getAudioContext();
  if (context) {
    const playPreparedSound = () => {
      if (sound.buffer) {
        playBufferedSound(context, sound);
        return;
      }

      prepareSound(sound).then((buffer) => {
        if (buffer) {
          playBufferedSound(context, sound);
        } else {
          playFallbackSound(sound);
        }
      });
    };

    if (context.state === "suspended") {
      context.resume().then(playPreparedSound).catch(() => playFallbackSound(sound));
    } else {
      playPreparedSound();
    }
    return;
  }

  playFallbackSound(sound);
}

function unlockSounds() {
  if (soundUnlocked) {
    if (bgmStarted) {
      startBgm();
    }
    return;
  }
  soundUnlocked = true;

  const context = getAudioContext();
  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }
  playSilentUnlockBuffer(context);

  for (const sound of Object.values(soundEffects)) {
    prepareSound(sound);
    for (const fallback of sound.fallbackPool) {
      try {
        fallback.load();
        unlockFallbackAudio(fallback);
      } catch {}
    }
  }

  primeBgm();
  if (soundEnabled && bgmStarted) {
    startBgm();
  }
}

function scheduleBgmAfterLoad() {
  const playAfterLoad = () => {
    startBgm();
  };

  if (window.requestIdleCallback) {
    window.requestIdleCallback(playAfterLoad, { timeout: 800 });
    return;
  }

  window.setTimeout(playAfterLoad, 200);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    try {
      audioContext = new AudioContextClass({ latencyHint: "interactive" });
    } catch {
      audioContext = new AudioContextClass();
    }
  }

  return audioContext;
}

function prepareSound(sound) {
  if (sound.buffer) {
    return Promise.resolve(sound.buffer);
  }
  if (sound.loading) {
    return sound.loading;
  }

  const context = getAudioContext();
  if (!context || !window.fetch) {
    return Promise.resolve(null);
  }

  sound.loading = fetch(sound.src)
    .then((response) => response.arrayBuffer())
    .then((data) => decodeSoundData(context, data))
    .then((buffer) => {
      sound.buffer = buffer;
      return buffer;
    })
    .catch(() => null);
  return sound.loading;
}

function decodeSoundData(context, data) {
  return new Promise((resolve, reject) => {
    const promise = context.decodeAudioData(
      data.slice(0),
      (buffer) => resolve(buffer),
      (error) => reject(error),
    );
    if (promise) {
      promise.then(resolve).catch(reject);
    }
  });
}

function playBufferedSound(context, sound) {
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = sound.buffer;
  gain.gain.value = sound.volume;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
  if (sound.maxDuration) {
    source.stop(context.currentTime + sound.maxDuration);
  }
}

function playSilentUnlockBuffer(context) {
  if (!context) {
    return;
  }

  try {
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, 22050);
    source.connect(context.destination);
    source.start(0);
  } catch {}
}

function unlockFallbackAudio(audio) {
  const wasMuted = audio.muted;
  try {
    audio.muted = true;
    const playback = audio.play();
    if (playback) {
      playback
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = wasMuted;
        })
        .catch(() => {
          audio.muted = wasMuted;
        });
    } else {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = wasMuted;
    }
  } catch {
    audio.muted = wasMuted;
  }
}

function playFallbackSound(sound) {
  const audio = sound.fallbackPool.find((candidate) => candidate.paused || candidate.ended);
  if (!audio) {
    return;
  }

  try {
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback) {
      playback.catch(() => {});
    }
  } catch {
    // Audio playback can be blocked until the first user gesture.
  }
}

function drawLoadingScreen(v) {
  ctx.fillStyle = "#dff2f2";
  ctx.fillRect(0, 0, v.w, v.h);

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.beginPath();
  ctx.ellipse(v.w * 0.16, v.h * 0.18, v.w * 0.1, v.h * 0.035, 0, 0, Math.PI * 2);
  ctx.ellipse(v.w * 0.78, v.h * 0.22, v.w * 0.12, v.h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#abd8bf";
  ctx.fillRect(0, v.h * 0.84, v.w, v.h * 0.16);
}

function frame(now) {
  const dt = Math.min(0.05, (now - state.lastTime) / 1000 || 0);
  state.lastTime = now;
  update(dt, now);

  const v = view();
  drawBackground(v, now);
  drawEnemy(v, now);
  for (const item of state.items) {
    if (!item.hit) {
      drawItem(item, now);
    }
  }
  for (const hazard of state.hazards) {
    if (!hazard.hit) {
      drawHazard(hazard, now);
    }
  }
  drawImpacts(now);
  drawSparks(now);
  drawPlayer(v, now);
  if (state.running) {
    collide(now);
  } else if (state.startedAt && !state.resultVisible) {
    drawGameOver(v, now);
  }
  drawFloaters(now);

  requestAnimationFrame(frame);
}

function setTargetFromClientX(clientX) {
  state.targetX = Math.max(0, Math.min(1, (clientX - renderState.rect.left) / renderState.rect.width));
}

function mobileControlsEnabled() {
  return mobileControlsQuery.matches;
}

function updateStickFromPointer(event) {
  if (!stickZone || !stickThumb) {
    return;
  }
  const rect = stickZone.getBoundingClientRect();
  const max = Math.max(24, Math.min(rect.width, rect.height) * 0.28);
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const dx = clamp(event.clientX - centerX, -max, max);
  const dy = clamp(event.clientY - centerY, -max, max);

  state.virtualStickX = Math.abs(dx / max) < 0.08 ? 0 : dx / max;
  state.virtualStickY = dy / max;
  stickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetStick() {
  state.stickPointerId = null;
  state.virtualStickX = 0;
  state.virtualStickY = 0;
  stickZone?.classList.remove("is-active");
  stickThumb?.style.removeProperty("transform");
  moveLeftButton?.classList.remove("is-active");
  moveRightButton?.classList.remove("is-active");
}

function eventInGameShell(event) {
  return event.target instanceof Element && Boolean(event.target.closest(".game-shell"));
}

for (const eventName of ["contextmenu", "selectstart", "dragstart"]) {
  document.addEventListener(eventName, (event) => {
    if (eventInGameShell(event)) {
      event.preventDefault();
    }
  });
}

for (const eventName of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(
    eventName,
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );
}

let lastTouchEndAt = 0;
document.addEventListener(
  "touchend",
  (event) => {
    if (!eventInGameShell(event)) {
      return;
    }
    const now = Date.now();
    if (now - lastTouchEndAt < 320) {
      event.preventDefault();
    }
    lastTouchEndAt = now;
  },
  { passive: false },
);

canvas.addEventListener("pointermove", (event) => {
  if (mobileControlsEnabled()) {
    return;
  }
  setTargetFromClientX(event.clientX);
});

canvas.addEventListener("pointerdown", (event) => {
  if (mobileControlsEnabled()) {
    return;
  }
  canvas.setPointerCapture(event.pointerId);
  setTargetFromClientX(event.clientX);
  jump(event.timeStamp || performance.now());
});

if (stickZone) {
  stickZone.addEventListener("pointerdown", (event) => {
    if (!mobileControlsEnabled()) {
      return;
    }
    event.preventDefault();
    state.stickPointerId = event.pointerId;
    stickZone.setPointerCapture(event.pointerId);
    stickZone.classList.add("is-active");
    updateStickFromPointer(event);
  });

  stickZone.addEventListener("pointermove", (event) => {
    if (!mobileControlsEnabled() || state.stickPointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    updateStickFromPointer(event);
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    stickZone.addEventListener(eventName, (event) => {
      if (state.stickPointerId === event.pointerId) {
        resetStick();
      }
    });
  }
}

function bindMoveButton(button, direction) {
  if (!button) {
    return;
  }

  button.addEventListener("pointerdown", (event) => {
    if (!mobileControlsEnabled()) {
      return;
    }
    event.preventDefault();
    state.stickPointerId = event.pointerId;
    state.virtualStickX = direction;
    button.setPointerCapture(event.pointerId);
    button.classList.add("is-active");
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, (event) => {
      if (state.stickPointerId === event.pointerId && state.virtualStickX === direction) {
        resetStick();
      }
    });
  }
}

bindMoveButton(moveLeftButton, -1);
bindMoveButton(moveRightButton, 1);

jumpButton.addEventListener("pointerdown", (event) => {
  if (!mobileControlsEnabled()) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  jump(event.timeStamp || performance.now());
});

jumpButton.addEventListener("click", (event) => {
  if (mobileControlsEnabled()) {
    event.preventDefault();
  }
});

window.addEventListener("keydown", (event) => {
  state.keys.add(event.key);
  if (event.key === " " || event.key === "ArrowUp" || event.key === "w") {
    event.preventDefault();
    jump(performance.now());
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

document.addEventListener("pointerdown", unlockSounds, { once: true, capture: true });
document.addEventListener("touchstart", unlockSounds, { once: true, capture: true, passive: true });
document.addEventListener("keydown", unlockSounds, { once: true });

soundToggleButton?.addEventListener("click", toggleSound);
startButton.addEventListener("click", resetGame);
continueButton.addEventListener("click", showResult);
restartButton.addEventListener("click", resetGame);
endButton.addEventListener("click", showTitle);
saveScreenButton.addEventListener("click", () => runAction(saveEndScreenCapture));
saveResultButton.addEventListener("click", () => runAction(saveResultCapture));
shareOpenButton.addEventListener("click", () => {
  sharePanel.hidden = !sharePanel.hidden;
  profilePanel.hidden = true;
  setShareStatus("");
});
shareNativeButton.addEventListener("click", () => runAction(shareResult));
copyUrlButton.addEventListener("click", () => runAction(copyGameUrl));
profileOpenButton.addEventListener("click", () => {
  profilePanel.hidden = !profilePanel.hidden;
  sharePanel.hidden = true;
  setShareStatus("");
});
profileCloseButton.addEventListener("click", () => {
  profilePanel.hidden = true;
});
window.addEventListener("resize", fitCanvas);
window.addEventListener("orientationchange", fitCanvas);
window.visualViewport?.addEventListener("resize", fitCanvas);
const resetStickOnDesktop = () => {
  if (!mobileControlsEnabled()) {
    resetStick();
  }
};
if (mobileControlsQuery.addEventListener) {
  mobileControlsQuery.addEventListener("change", resetStickOnDesktop);
} else {
  mobileControlsQuery.addListener(resetStickOnDesktop);
}

fitCanvas();
updateSoundToggle();
drawLoadingScreen(view());
Promise.all(assetPromises).then(() => {
  state.lastTime = performance.now();
  requestAnimationFrame(frame);
  scheduleBgmAfterLoad();
});
