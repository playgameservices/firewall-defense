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

var graphics = {};

// Sets the palette to use (defines the colors that will be used to draw
// certain elements).
graphics.setPalette = function(pal) {
  graphics.palette = pal;
}

// Draws a 3D-looking box at the given coordinates.
// Style can be a single color value like "#f00" in which case a 2D box
// will be drawn. However, if it's three color values like "#f00/#800/#400",
// a 3D box will be drawn (colors are for front, side and top).
graphics.drawBox = function(ctx, x, y, w, h, style) {
  var SIDE_X = 5, SIDE_Y = -5;

  var colors = style.split("/");
  var frontColor = colors[0];
  var rightColor = colors[1];
  var topColor = colors[2];

  if (rightColor) {
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + SIDE_X, y + SIDE_Y);
    ctx.lineTo(x + w + SIDE_X, y + h + SIDE_Y);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  if (topColor) {
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + SIDE_X, y + SIDE_Y);
    ctx.lineTo(x + w + SIDE_X , y + SIDE_Y);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = frontColor;
  ctx.fillRect(x, y, w, h);
}

// Draw the "firewall"
graphics.drawWall = function(ctx, w) {
  graphics.drawBox(ctx, 0, 0, w, WALL_H, graphics.palette.wall);
}

// Draw the player
graphics.drawPlayer = function(ctx, x, withScope) {
  graphics.drawBox(ctx, x, SCREEN_H - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE,
      graphics.palette.player);
  if (withScope) {
    graphics.drawBox(ctx, x + PLAYER_SIZE/2 - SCOPE_WIDTH/2,
      SCREEN_H - PLAYER_SIZE - SCOPE_HEIGHT, SCOPE_WIDTH, SCOPE_HEIGHT,
      graphics.palette.player);
  }
}

// Draw an ally ("data packet")
graphics.drawAlly = function(ctx, a) {
  var fifth = ALLY_W / 5;
  var fill = a.angry ? graphics.palette.ally_angry :
      graphics.ovum ? "#fcc/#f99/#f66" : graphics.palette.ally;
  graphics.drawBox(ctx, a.x, a.y, ALLY_W, ALLY_H, fill);
  graphics.drawBox(ctx, a.x + fifth, a.y + fifth, fifth, fifth, EYE_FILL);
  graphics.drawBox(ctx, a.x + 3 * fifth, a.y + fifth, fifth, fifth, EYE_FILL);

  if (graphics.ovum) {
    var c = [ "#f00", "#f80", "#ff0", "#0f0", "#08f" ];
    for (var i = 0; i < 5; i++) {
      graphics.drawBox(ctx, a.x + ALLY_W, a.y + i * ALLY_H/5, SCREEN_W, ALLY_H/5, c[i]);
    }
  }
}

// Draw an enemy
graphics.drawEnemy = function(ctx, e) {
  var fifth = ENEMY_H / 5;

  // head
  graphics.drawBox(ctx, e.x, e.y, ENEMY_W * ENEMY_HEAD_PROP, ENEMY_H,
      graphics.palette.enemy);

  // eyes
  graphics.drawBox(ctx, e.x + fifth, e.y + fifth, fifth, fifth, EYE_FILL);
  graphics.drawBox(ctx, e.x + fifth, e.y + 3 * fifth, fifth, fifth, EYE_FILL);

  // tentacles
  var tailH = fifth, tailW = ENEMY_W * ENEMY_TENTACLE_PROP;
  var tailX = ENEMY_W * ENEMY_HEAD_PROP + e.x;
  graphics.drawBox(ctx, tailX, e.y, util.triWave(0, tailW, 1, 0), tailH,
      graphics.palette.enemy);
  graphics.drawBox(ctx, tailX, e.y + 2 * tailH,
      util.triWave(0, tailW, 1, 0.3), tailH, graphics.palette.enemy);
  graphics.drawBox(ctx, tailX, e.y + 4 * tailH,
      util.triWave(0, tailW, 1, 0.6), tailH, graphics.palette.enemy);
}

// Draw the bullet
graphics.drawBullet = function(ctx, x, y) {
  graphics.drawBox(ctx, x, y, BULLET_W, BULLET_H, graphics.palette.player);
}

// Draw particles
graphics.drawParticles = function(ctx, particles) {
  for (var i = 0; i < particles.length; ++i) {
    var p = particles[i];
    graphics.drawBox(ctx, p.x, p.y, p.w, p.h, p.fill);
  }
}

// Draw the player's score
graphics.drawScore = function(ctx, score) {
  var displayScore = score;

  if (score > graphics._lastScore) {
    displayScore = graphics._lastScore + graphics.MAX_SCORE_INC;
    if (displayScore > score) displayScore = score;
  }
  ctx.fillStyle = SCORE_FILL;
  ctx.font = SCORE_FONT;
  ctx.fillText(util.formatScore(displayScore), SCORE_X, SCORE_Y);
  graphics._lastScore = displayScore;
}
graphics._lastScore = 0;
graphics.MAX_SCORE_INC = 5;

// Draw combo meter
graphics.drawCombo = function(ctx, combo) {
  if (combo < 2) return;
  var f = (1.0 * combo) / COMBO_MAX;
  ctx.fillStyle = COMBO_FILL;
  ctx.font = COMBO_FONT;
  ctx.fillText("COMBO", COMBO_X, COMBO_Y);
  graphics.drawBox(ctx, COMBO_BAR_X, COMBO_BAR_Y, COMBO_BAR_W, COMBO_BAR_H,
    COMBO_BAR_DARK_FILL);
  graphics.drawBox(ctx, COMBO_BAR_X, COMBO_BAR_Y, COMBO_BAR_W * f, COMBO_BAR_H,
    COMBO_BAR_LIGHT_FILL);
}


// Draw the score popup (the little number that appears when you kill an enemy
// showing how many points you scored for the kill)
//    x, y: position of the popup
//    value: the value to show
//    extra: the extra string to show above the value
graphics.drawScorePopup = function(ctx, value, x, y, extra) {
  ctx.font = SCORE_POPUP_FONT;
  ctx.fillStyle = SCORE_POPUP_FILL;
  ctx.fillText(value, x, y);
  if (extra) {
    ctx.font = SCORE_POPUP_EXTRA_FONT;
    ctx.fillStyle = SCORE_POPUP_EXTRA_FILL;
    ctx.fillText(extra, x + SCORE_POPUP_EXTRA_DX, y + SCORE_POPUP_EXTRA_DY);
  }
}

// Draw background
graphics.drawBackground = function(ctx) {
  //ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = graphics.palette.background;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

