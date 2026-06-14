const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const timeEl = document.querySelector("#time");
const startButton = document.querySelector("#start");
const continueButton = document.querySelector("#continue");
const resultPanel = document.querySelector("#result-panel");
const resultTitleEl = document.querySelector("#result-title");
const resultTimeEl = document.querySelector("#result-time");
const resultTotalEl = document.querySelector("#result-total");
const resultAEl = document.querySelector("#result-a");
const resultBEl = document.querySelector("#result-b");
const resultCEl = document.querySelector("#result-c");
const restartButton = document.querySelector("#restart");

const durationSeconds = 40;

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

const itemTypes = [
  { key: "a", label: "A", motion: "ground", radius: 18, spriteSize: 75, color: "#f0c85a", glow: "rgba(240, 200, 90, 0.20)", speed: 62 },
  { key: "b", label: "B", motion: "flutter", radius: 34, spriteSize: 126, color: "#d9bd42", glow: "rgba(240, 200, 90, 0.18)", speed: 148 },
  { key: "c", label: "C", motion: "dragonfly", radius: 30, spriteSize: 118, color: "#74a6cf", glow: "rgba(116, 166, 207, 0.22)", speed: 285 },
];

const hazardTypes = [
  { label: "!", width: 38, height: 54, spriteSize: 144, impactSize: 220, color: "#df7367", speed: 215 },
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
  items: [],
  hazards: [],
  impacts: [],
  sparks: [],
  floaters: [],
  damageShake: 0,
  keys: new Set(),
};

const jumpPhysics = {
  power: 610,
  gravity: 1560,
  maxHeightRatio: 0.34,
};

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function view() {
  const rect = canvas.getBoundingClientRect();
  return {
    w: rect.width,
    h: rect.height,
    floorY: rect.height * 0.84,
    skyLine: rect.height * 0.18,
  };
}

function resetGame() {
  const now = performance.now();
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
  state.items = [];
  state.hazards = [];
  state.impacts = [];
  state.sparks = [];
  state.floaters = [];
  state.damageShake = 0;
  scoreEl.textContent = "0";
  timeEl.textContent = String(durationSeconds);
  startButton.textContent = "RESET";
  continueButton.hidden = true;
  resultPanel.hidden = true;
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
  resultTimeEl.textContent = `${survivedSeconds().toFixed(1)}s`;
  resultTotalEl.textContent = String(state.score);
  resultAEl.textContent = String(state.itemCounts.a);
  resultBEl.textContent = String(state.itemCounts.b);
  resultCEl.textContent = String(state.itemCounts.c);
  resultPanel.hidden = false;
}

function survivedSeconds() {
  const end = state.endedAt || performance.now();
  return Math.min(durationSeconds, Math.max(0, (end - state.startedAt) / 1000));
}

function spawnItem(now) {
  const v = view();
  const roll = Math.random();
  const type = roll < 0.32 ? itemTypes[0] : roll < 0.82 ? itemTypes[1] : itemTypes[2];
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
    const airTop = v.skyLine + v.h * 0.19;
    const airBottom = v.floorY - v.h * 0.24;
    y = airTop + ((airLane + 0.5) / airLaneCount) * Math.max(60, airBottom - airTop);
    y = clamp(y, reachable.top - wave, reachable.bottom - wave);
  } else if (type.motion === "dragonfly") {
    const airLaneCount = v.w < 620 ? 3 : 4;
    const airLane = Math.floor(Math.random() * airLaneCount);
    const airTop = v.skyLine + v.h * 0.16;
    const airBottom = v.floorY - v.h * 0.31;
    y = airTop + ((airLane + 0.5) / airLaneCount) * Math.max(60, airBottom - airTop);
    y = clamp(y, reachable.top + spriteSize * 0.08, reachable.bottom - spriteSize * 0.08);
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
    nextHoverAt: type.motion === "dragonfly" ? now + 900 + Math.random() * 1400 : 0,
    burstUntil: 0,
    bornAt: now,
    hit: false,
  });
}

function reachableAirRange(v) {
  const playerSize = Math.min(v.h * 0.32, v.w < 620 ? 142 : 176);
  const maxLift = v.h * jumpPhysics.maxHeightRatio;
  const topAtMaxJump = v.floorY + 10 - playerSize * 0.88 - maxLift;
  const bottomOnGround = v.floorY + 10 - playerSize * 0.12;
  const top = topAtMaxJump + Math.max(12, v.h * 0.025);
  const bottom = bottomOnGround - Math.max(22, v.h * 0.05);
  return { top, bottom: Math.max(top + 48, bottom) };
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
  if (!state.running || !state.grounded) {
    return;
  }

  state.grounded = false;
  state.playerLiftVelocity = jumpPhysics.power;
  state.jumpSquash = -0.14;
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
    state.targetX -= dt * 1.8;
    state.facing = 1;
  }
  if (state.keys.has("ArrowRight") || state.keys.has("d")) {
    state.targetX += dt * 1.8;
    state.facing = -1;
  }

  state.targetX = Math.max(0, Math.min(1, state.targetX));
  if (Math.abs(state.targetX - state.playerX) > 0.006) {
    state.facing = state.targetX > state.playerX ? -1 : 1;
  }
  state.playerX += (state.targetX - state.playerX) * Math.min(1, dt * 12);
  state.catcherOpen = Math.max(0, state.catcherOpen - dt * 3.2);
  state.jumpSquash += (0 - state.jumpSquash) * Math.min(1, dt * 10);
  state.damageShake = Math.max(0, state.damageShake - dt * 42);

  if (!state.grounded) {
    const maxLift = v.h * jumpPhysics.maxHeightRatio;
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
    state.timeLeft = Math.max(0, durationSeconds - Math.floor((now - state.startedAt) / 1000));
    timeEl.textContent = String(state.timeLeft);
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
          item.hoverUntil = now + 280 + Math.random() * 440;
          item.burstUntil = item.hoverUntil + 320 + Math.random() * 260;
          item.nextHoverAt = now + 1500 + Math.random() * 2300;
          speed = 0;
        } else if (item.burstUntil > now) {
          speed *= 1.85;
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
    spark.vy += 250 * dt;
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
      addFloater("+1", player.x, player.y + player.h * 0.1, item.color);
      spawnSparks(item.x, item.y, now, item.color, 8);
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
    drawCoverImage(backgroundImage, 0, 0, v.w, v.h);
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
    ctx.globalAlpha = alpha * 0.68;
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.ellipse(spark.x, spark.y, spark.size * (1 + age * 1.8), spark.size * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
  }
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
  image.src = src;
  return image;
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
  const rect = canvas.getBoundingClientRect();
  state.targetX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
}

canvas.addEventListener("pointermove", (event) => {
  setTargetFromClientX(event.clientX);
});

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  setTargetFromClientX(event.clientX);
  jump(event.timeStamp || performance.now());
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

startButton.addEventListener("click", resetGame);
continueButton.addEventListener("click", showResult);
restartButton.addEventListener("click", resetGame);
window.addEventListener("resize", fitCanvas);

fitCanvas();
state.lastTime = performance.now();
requestAnimationFrame(frame);
