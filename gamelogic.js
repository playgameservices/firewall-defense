/*
 * Copyright (C) 2014 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var gamelogic = {};

// game state (initialized in startGame)
gamelogic.game = undefined;

// Start a new game. Call the given callback when the game ends.
gamelogic.startGame = function(endGameCallback) {
  // game state:
  gamelogic.game = {
    canvas: $('#game_canvas')[0],
    enemies: [],
    allies: [],
    keyDown: {}, // which keys are being held down at the moment
    bullet: undefined, // bullet currently onscreen (there can be only 1)
    prevFireKey: false, // previous state of the KEY_FIRE key
    playerX: SCREEN_W / 2, // player's current x coordinate
    score: 0,
    nextSpawn: Date.now(), // time when the next enemy spawn will happen
    lastFrameTime: Date.now(), // when the last frame was drawn
    particles: [],
    kills: 0, // # enemies killed in this game
    killsInARow: 0, // kills in a row (without missing)
    combo: 0, // combo (kills in a row) -- except that combo gets reset after
        // the combo maxes out; killsInARow does not.
    wallLeft: INIT_WALL_THICKNESS, // how much of the wall is left
    intactWallTime: 0,  // how long the wall has been intact for
    expiry: undefined, // if defined, this is the time when the game will end
    scorePopup: undefined, // if defined, indicates score popup params
    endGameCallback: endGameCallback,

    // for the purposes of incremental achievements:
    lastIncCall: Date.now(), // last time we submitted incremental ach's
    killsToSend: 0, // how many enemy kills we need to send as incremental ach

    // for the purposes of events and quests
    startTime: Date.now(),
    maxCombos: 0
  }
  gamelogic.doFrame();
}

// Do one frame of the game. This includes updating and rendering.
gamelogic.doFrame = function() {
  // calculate how many seconds elapsed since the last frame
  var now = Date.now();
  var delta = 0.001 * (now - gamelogic.game.lastFrameTime);
  gamelogic.game.lastFrameTime = now;
  if (delta > DELTA_MAX) delta = DELTA_MAX;

  // spawn enemies, if it's time
  if (gamelogic.game.nextSpawn < now) gamelogic.spawnEnemy();

  // update stuff
  var continueGame = gamelogic.update(delta);

  // get canvas context
  var ctx = gamelogic.game.canvas.getContext("2d");

  // update game palette based on combo level
  var combo = gamelogic.game.combo;
  var palNo = (combo >= PALETTE_FOR_COMBO.length) ? 0 :
      PALETTE_FOR_COMBO[combo];
  graphics.setPalette(PALETTES[palNo]);

  // draw background
  graphics.drawBackground(ctx);

  // draw wall
  if (gamelogic.game.wallLeft > 0) {
    graphics.drawWall(ctx, gamelogic.game.wallLeft);
  }

  // draw player
  if (gamelogic.game.wallLeft > 0) {
    graphics.drawPlayer(ctx, gamelogic.game.playerX, !gamelogic.game.bullet);
  }

  // draw allies
  for (var i = 0; i < gamelogic.game.allies.length; ++i) {
    graphics.drawAlly(ctx, gamelogic.game.allies[i]);
  }

  // draw enemies
  for (var i = 0; i < gamelogic.game.enemies.length; ++i) {
    graphics.drawEnemy(ctx, gamelogic.game.enemies[i]);
  }

  // draw bullet
  if (gamelogic.game.bullet) {
    graphics.drawBullet(ctx, gamelogic.game.bullet.x, gamelogic.game.bullet.y);
  }

  // draw particles
  graphics.drawParticles(ctx, gamelogic.game.particles);

  // draw score
  graphics.drawScore(ctx, gamelogic.game.score);

  // draw combo meter
  graphics.drawCombo(ctx, gamelogic.game.combo);

  // draw score popup, if any
  if (gamelogic.game.scorePopup) {
    graphics.drawScorePopup(ctx, gamelogic.game.scorePopup.value,
        gamelogic.game.scorePopup.x, gamelogic.game.scorePopup.y,
        gamelogic.game.scorePopup.extra);
  }

  // schedule next frame
  if (continueGame) {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(gamelogic.doFrame);
    }
    else setTimeout(gamelogic.doFrame, 1);
  }
}

// Calculate what's the current enemy spawn interval (varies with score).
gamelogic.calcSpawnInterval = function() {
  var f = gamelogic.game.score / 5000.0;
  return SPAWN_INTERVAL_START + f * (SPAWN_INTERVAL_AT_5000
      - SPAWN_INTERVAL_START);
}

// Spawn an enemy.
gamelogic.spawnEnemy = function() {
  // enemy speed range is influenced by how many enemies player has killed
  var minSpeed = ENEMY_SPEED_MIN + 0.5 * ENEMY_SPEEDUP_UNIT *
      gamelogic.game.kills;
  var maxSpeed = ENEMY_SPEED_MAX + 1.0 * ENEMY_SPEEDUP_UNIT *
      gamelogic.game.kills;

  var y = util.randBetween(MIN_ENEMY_Y, MAX_ENEMY_Y);
  gamelogic.game.enemies.push({ x: SCREEN_W, y: y,
      speed: util.randBetween(minSpeed, maxSpeed), w: ENEMY_W, h: ENEMY_H});

  // decide whether or not to spawn an ally ("data packet") as well
  if (Math.random() < ALLY_SPAWN_PROB &&
      gamelogic.game.allies.length < ALLIES_MAX) {

    gamelogic.game.allies.push({ x: SCREEN_W, y: Math.random() * MAX_ENEMY_Y,
        speed: util.randBetween(ALLY_SPEED_MIN, ALLY_SPEED_MAX),
        w: ALLY_W, h: ALLY_H});
  }
  gamelogic.game.nextSpawn = Date.now() + 1000 * gamelogic.calcSpawnInterval();
}

// Updates game entities (this function runs once per frame). Returns true
// to mean the game should continue; false to mean the game should end.
gamelogic.update = function(delta) {
  if (gamelogic.game.combo < TIME_FACTOR_FOR_COMBO.length) {
    delta *= TIME_FACTOR_FOR_COMBO[gamelogic.game.combo];
  }

  // update each enemy's and ally's position, based on speed.
  for (var c = 0; c <= 1; c++) {
    coll = c ? gamelogic.game.enemies : gamelogic.game.allies;
    for (var i = coll.length - 1; i >= 0; --i) {
      coll[i].x -= delta * coll[i].speed;
      if (coll[i].x < -coll[i].w) util.removeAt(coll, i);
    }
  }

  // did an enemy hit the wall?
  gamelogic.checkWallHit();

  // move player
  var m = gamelogic.game.keyDown[KEY_LEFT] ? -1 :
      gamelogic.game.keyDown[KEY_RIGHT] ? 1 : 0;
  gamelogic.game.playerX = util.clamp(gamelogic.game.playerX + m * delta *
      PLAYER_SPEED, 0, SCREEN_W - PLAYER_SIZE);

  // process fire key. A bullet is requested if the fire key was not down
  // before and it is down now (this check is made so that pressing the
  // fire key and holding it down only fires 1 shot).
  var bulletRequested = gamelogic.game.keyDown[KEY_FIRE] &&
      !gamelogic.prevFireKey;
  gamelogic.prevFireKey = gamelogic.game.keyDown[KEY_FIRE];

  // update bullet, if it exists
  if (gamelogic.game.bullet) {
    // bullet speed increases with # of kills
    var bulletSpeed = BULLET_SPEED + gamelogic.game.kills *
        ENEMY_SPEEDUP_UNIT;
    gamelogic.game.bullet.y -= bulletSpeed * delta;

    // if bullet went off screen, remove it.
    if (gamelogic.game.bullet.y < -BULLET_H) {
      gamelogic.game.bullet = undefined;
      gamelogic.game.killsInARow = 0; // missed!
      gamelogic.game.combo = 0; // missed!
    }
    else gamelogic.checkBulletHit(); // check if bullet hit something
  } else if (bulletRequested) {
    // bullet was requested, so fire it.
    gamelogic.fireBullet();
  }

  // update particles
  for (var i = gamelogic.game.particles.length - 1; i >= 0; --i) {
    var p = gamelogic.game.particles[i];
    if (Date.now() > p.expiry) {
      util.removeAt(gamelogic.game.particles, i);
    } else {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      var GRAVITY_ACC = 600;
      p.vy += delta * GRAVITY_ACC;
    }
  }

  // update score popup, remove it if it expired
  if (gamelogic.game.scorePopup) {
    gamelogic.game.scorePopup.y += SCORE_POPUP_Y_SPEED * delta;
    if (Date.now() > gamelogic.game.scorePopup.expiry) {
      gamelogic.game.scorePopup = undefined;
    }
  }

  // combo maxed out?
  if (gamelogic.game.combo >= COMBO_MAX) {
    gamelogic.blastAll();
    gamelogic.game.combo = 0;
    gamelogic.game.maxCombos++;
  }

  // end of game?
  if (gamelogic.game.expiry && Date.now() > gamelogic.game.expiry) {
    gamelogic.checkIncrementalAchievements(true);
    gamelogic.checkEvents(true);
    var cb = gamelogic.game.endGameCallback;
    gamelogic.game.endGameCallback = undefined;
    if (cb) cb(gamelogic.game.score);
    return false; // means the game should end
  }

  // update intact wall time (used to grant achievements)
  if (gamelogic.game.wallLeft == INIT_WALL_THICKNESS) {
    gamelogic.game.intactWallTime += delta;
    gamelogic.checkIntegrityAchievements();
  }

  // check for incremental achievements and submit them if needed
  gamelogic.checkIncrementalAchievements(false);

  return true; // means the game should continue
}

// Makes a disintegration particle effect. x, y, w, h is the original
// object that's being destroyed. sourceX,sourceY is where the
// "disintegration force" originates (where the object was hit by a bullet,
// for example).
gamelogic.makeDisintegrationEffect = function(x, y, w, h, sourceX, sourceY,
    fill) {
  var rows = Math.round(h / PART_EFFECT.FRAG_SIZE);
  var cols = Math.round(w / PART_EFFECT.FRAG_SIZE);
  if (rows < 2) rows = 2;
  if (cols < 2) cols = 2;

  var partW = w / cols, partH = h / rows;
  for (var i = 0; i < rows; ++i) {
    for (var j = 0; j < cols; ++j) {
      var p = { x: x + j * partW, y: y + i * partH, w: partW, h: partH };
      p.vx = (p.x - sourceX) * PART_EFFECT.VEL_FACTOR;
      p.vy = (p.y - sourceY) * PART_EFFECT.VEL_FACTOR;
      p.vx *= util.randBetween(PART_EFFECT.VEL_MOD_MIN,
          PART_EFFECT.VEL_MOD_MAX);
      p.vy *= util.randBetween(PART_EFFECT.VEL_MOD_MIN,
          PART_EFFECT.VEL_MOD_MAX);
      p.expiry = Date.now() + 1000 * PART_EFFECT.DURATION;
      p.fill = fill;
      gamelogic.game.particles.push(p);
    }
  }
}

// Fires the bullet.
gamelogic.fireBullet = function() {
  if (gamelogic.game.expiry) return;
  gamelogic.game.bullet = {
    x: gamelogic.game.playerX + PLAYER_SIZE/2 - BULLET_W/2,
    y: SCREEN_H - PLAYER_SIZE - BULLET_H };
  audio.playSound("laser");
}

// Handles a key up/down event.
gamelogic.handleKey = function(code, down) {
  if (gamelogic.game) {
    gamelogic.game.keyDown[code] = down;
    if (!down) gamelogic.ovumProc(code);
  }
}

// for the e-a-s-t-e-r e-g-g
// intentionally obfuscated :-)
gamelogic.ovumProc = function(code) {
  if (code < 0) return;
  if (!gamelogic.ovum || gamelogic.ovum.t + 2000 < Date.now()) {
    gamelogic.ovum = { p:0, q:0, r:0, s:0, t:Date.now() };
  }
  var o = gamelogic.ovum;
  o.p = ((o.p << 2) | (code & 3)) & 1048575;
  o.q = ((o.q << 2) | ((code >> 2) & 3)) & 1048575;
  o.r = ((o.r << 2) | ((code >> 4) & 3)) & 1048575;
  o.s = ((o.s << 2) | ((code >> 6) & 3)) & 1048575;
  o.t = Date.now();
  if (o.p == 657273 && o.q == 370000 && o.r == 699040 && o.s == 5) {
    graphics.ovum = !graphics.ovum;
    gameservices.unlockAchievement(gameservices.ACHIEVEMENTS.OVUM);
    if (gamelogic.game.score % 10 != 1) gamelogic.game.score += 1;
  }
}

// Makes a disintegration effect of the given entity (ally or enemy).
// This does the visual effect only; it does NOT remove it from the array.
gamelogic.disintegrate = function(e, isEnemy, impactX, impactY) {
  gamelogic.makeDisintegrationEffect(e.x, e.y, e.w, e.h, impactX, impactY,
    (isEnemy ? graphics.palette.enemy : graphics.palette.ally_angry));
}


// Checks if the bullet hit something (enemy or ally).
gamelogic.checkBulletHit = function() {
  if (!gamelogic.game.bullet) return;
  var b = gamelogic.game.bullet;
  for (var c = 0; c <= 1; c++) {
    var collection = c ? gamelogic.game.allies : gamelogic.game.enemies;
    for (var i = collection.length - 1; i >= 0; --i) {
      var e = collection[i];
      if (e.x + e.w < b.x) continue;
      if (b.x + BULLET_W < e.x) continue;
      if (e.y + e.h < b.y) continue;
      if (b.y + BULLET_H < e.y) continue;

      // Hit! Remove item and bullet, play animations.
      if (collection == gamelogic.game.enemies || e.angry) {
        // enemy (or angry ally) killed
        gamelogic.disintegrate(e, collection==gamelogic.game.enemies, b.x, b.y);
        util.removeAt(collection, i);
      } else {
        // ally made angry
        e.angry = true;
        e.speed = ALLY_SPEED_ANGRY;
        audio.playSound("badhit");
      }

      var value;
      if (collection == gamelogic.game.allies) {
        // player hit an ally. No points awareded.
        value = 0;
        gamelogic.game.killsInARow = 0;
        gamelogic.game.combo = 0;
      } else {
        // player hit an enemy.
        gamelogic.game.kills++;
        gamelogic.game.killsToSend++;
        gamelogic.game.killsInARow++;
        gamelogic.game.combo++;

        // play "powerup" audio, if this is the right time
        if (gamelogic.game.combo == COMBO_SFX_LEVEL) {
          audio.playSound("powerup");
        }

        // compute the value of the kill
        value = util.interpolate(0, ENEMY_VALUE_MAX, SCREEN_H,
            ENEMY_VALUE_MIN, e.y + ENEMY_H);
        value = 50 * Math.round(value / 50);
        if (value < ENEMY_VALUE_MIN) value = ENEMY_VALUE_MIN;

        // unlock "kill one enemy" achievement, if it wasn't unlocked yet:
        gameservices.unlockAchievement(
            gameservices.ACHIEVEMENTS.KILL_ENEMY);

        // check if a 'precision' achievements should be awareded
        gamelogic.checkPrecisionAchievements();

        audio.playSound("explosion");
      }

      // compute combo bonus
      var comboBonus = gamelogic.game.combo * COMBO_BONUS;
      value += comboBonus;

      // add to score
      gamelogic.game.score += value;
      if (gamelogic.game.score < 0) gamelogic.game.score = 0;
      if (value > 0) {
        // if points were awarded, show a score popup
        gamelogic.game.scorePopup = {
          x: e.x + SCORE_POPUP_XLATE_X, y: e.y + SCORE_POPUP_XLATE_Y,
          value: value, expiry: Date.now() + 1000 * SCORE_POPUP_DURATION
        };
        var combo = gamelogic.game.combo; // shorthand
        if (combo > 1) {
          var comboName = combo + "-COMBO";
          gamelogic.game.scorePopup.extra = comboName + " +" + comboBonus;
        }
      }
      gamelogic.game.bullet = undefined;
      gamelogic.checkRankAchievements();
      return;
    }
  }
}

// Checks if the firewall was hit by an enemy.
gamelogic.checkWallHit = function() {
  if (gamelogic.game.wallLeft <= 0) return;

  for (var i = gamelogic.game.enemies.length - 1; i >= 0; --i) {
    var e = gamelogic.game.enemies[i];
    if (gamelogic.checkWallHitWith(e)) {
      util.removeAt(gamelogic.game.enemies, i);
    }
  }
  for (var i = gamelogic.game.allies.length - 1; i >= 0; --i) {
    var e = gamelogic.game.allies[i];

    // only angry allies (the ones that were hit by the player) can
    // hurt the firewall
    if (e.angry && gamelogic.checkWallHitWith(e)) {
      util.removeAt(gamelogic.game.allies, i);
    }
  }
}

// Checks if the firewall was hit by the given enemy/ally.
// Returns true if wall was hit by given enemy/ally; false otherwise.
gamelogic.checkWallHitWith = function(e) {
  if (e.x >= gamelogic.game.wallLeft) return false;

  // Wall was hit. Add damage to wall
  gamelogic.game.wallLeft -= WALL_DAMAGE_UNIT;

  // do particle effects
  gamelogic.makeDisintegrationEffect(e.x, e.y, e.w, e.h, e.x, e.y,
      e.angry ? graphics.palette.ally_angry : graphics.palette.enemy);
  gamelogic.makeDisintegrationEffect(gamelogic.game.wallLeft, 0,
      WALL_DAMAGE_UNIT, WALL_H, gamelogic.game.wallLeft, WALL_H/2,
      graphics.palette.wall);

  audio.playSound("wallbreak");

  if (gamelogic.game.wallLeft <= 0) {
    // last piece of wall was destroyed. Game over!

    // show player getting disintegrated
    gamelogic.makeDisintegrationEffect(gamelogic.game.playerX,
        SCREEN_H - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE,
        gamelogic.game.playerX + PLAYER_SIZE/2, SCREEN_H,
        graphics.palette.player);

    // game will end in DEATH_ANIM_DURATION seconds.
    gamelogic.game.expiry = Date.now() + 1000 * DEATH_ANIM_DURATION;
  }
  return true;
}

// Check to see if any precision-related achievements should be awarded.
gamelogic.checkPrecisionAchievements = function() {
  for (var i = 0; i < gameservices.ACHIEVEMENTS.PRECISION.length; ++i) {
    var a = gameservices.ACHIEVEMENTS.PRECISION[i];
    if (gamelogic.game.killsInARow >= a.kills) {
      gameservices.unlockAchievement(a.id);
    }
  }
}

// Check to see if any wall integrity achievements should be awarded.
gamelogic.checkIntegrityAchievements = function() {
  for (var i = 0; i < gameservices.ACHIEVEMENTS.INTEGRITY.length; ++i) {
    var a = gameservices.ACHIEVEMENTS.INTEGRITY[i];
    if (gamelogic.game.intactWallTime >= a.time) {
      gameservices.unlockAchievement(a.id);
    }
  }
}

// Check to see if any score-based achievements should be awarded.
gamelogic.checkRankAchievements = function() {
  for (var i = 0; i < gameservices.ACHIEVEMENTS.RANK.length; ++i) {
    var a = gameservices.ACHIEVEMENTS.RANK[i];
    if (gamelogic.game.score >= a.score) gameservices.unlockAchievement(a.id);
  }
}

// Check to see if any incremental achievements should be submitted.
// endOfGame indicates whether the game is ending or not. If true, then the
// game is ending and we should submit incremental achievements immediately;
// if false, then we're in the middle of a game, so we don't necessarily
// need to send incremental achievements right now, and can batch them up
// for later to implement throttling. It is a bad practice to try to
// call the increment achievement API too often (may cause quota exceeded
// errors).
gamelogic.checkIncrementalAchievements = function(endOfGame) {
  var tooSoon = (gamelogic.game.lastIncCall + 1000 * MIN_INC_ACH_INTERVAL
     > Date.now());
  if (tooSoon && !endOfGame) return; // throttle

  if (gamelogic.game.killsToSend > 0) {
    for (var i = 0; i < gameservices.ACHIEVEMENTS.EXPERIENCE.length; ++i) {
      var a = gameservices.ACHIEVEMENTS.EXPERIENCE[i];
      gameservices.incrementAchievement(a.id, gamelogic.game.killsToSend);
    }
    // TODO: your game should implement error handling -- if the
    // increment call fails, you should handle it in a way that
    // doesn't make the player lose progress!
    gamelogic.game.killsToSend = 0;
  }

  if (endOfGame) {
    // increment achievements related to having played the game.
    gameservices.incrementAchievement(gameservices.ACHIEVEMENTS.FREQUENT, 1);
    if (gamelogic.game.score >= gameservices.ACHIEVEMENTS.SERIOUS.minScore) {
      gameservices.incrementAchievement(
        gameservices.ACHIEVEMENTS.SERIOUS.id, 1);
    }
  }
}

// Check to see which events we should submit.
gamelogic.checkEvents = function(endOfGame) {
  var evts = [];

  // Submit kills
  if (gamelogic.game.kills > 0) {
    var evt = {
      definitionId: gameservices.EVENTS.ENEMIES_KILLED,
      updateCount: gamelogic.game.kills
    }
    evts.push(evt);
  }

  // Submit 12 combos
  if (gamelogic.game.maxCombos > 0) {
    var evt = {
      definitionId: gameservices.EVENTS.COMBOS_ACHIEVED,
      updateCount: gamelogic.game.maxCombos
    }
    evts.push(evt);
  }

  // Submit game played
  if (endOfGame) {
    var evt = {
      definitionId: gameservices.EVENTS.GAMES_PLAYED,
      updateCount: 1
    }
    evts.push(evt);
  }

  gameservices.recordEvents(evts, gamelogic.game.startTime, function(resp) {
    // Check quests after pushing events
    gamelogic.checkQuests();
  });
}

// Check to see if we completed any quests
gamelogic.checkQuests = function() {
  gameservices.claimCompletedMilestones(function(milestone) {
    // This callback may be called multiple times, each time with the
    // milestone of something we have just claimed
    console.log('Completed QuestMilestone: ' + milestone.id);
    gameservices.showQuestToast();
  });
}

// Clears the board
gamelogic.blastAll = function() {
  for (var i = 0; i < gamelogic.game.enemies.length; i++) {
    var e = gamelogic.game.enemies[i];
    gamelogic.disintegrate(e, true, e.x, e.y);
  }
  for (var i = 0; i < gamelogic.game.allies.length; i++) {
    var a = gamelogic.game.allies[i];
    gamelogic.disintegrate(a, false, a.x, a.y);
  }
  gamelogic.game.enemies = [];
  gamelogic.game.allies = [];
  audio.playSound("blast");
}


