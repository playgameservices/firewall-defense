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

// Maximum amount of time between two successive frames. If the actual time
// between frames is bigger than that, we clamp it to this maximum so that
// things don't jump around too suddenly.
var DELTA_MAX = 0.05;

// Width and height of the gameplay screen, in pixels.
var SCREEN_W = 1000, SCREEN_H = 600;

// Player's size, in pixels
var PLAYER_SIZE = 30;

// Player's speed in pixels/second
var PLAYER_SPEED = 400;

// player's "aim" size (the vertical line that appears indicating where
// the bullet will appear)
var SCOPE_WIDTH = 4;
var SCOPE_HEIGHT = 8;

// wall settings:
var INIT_WALL_THICKNESS = 100; // initial thickness
var WALL_DAMAGE_UNIT = 20; // how much of the wall is lost when it gets hit
var WALL_H = 530;

// enemy settings:
var ENEMY_W = 50;
var ENEMY_H = 30;
var EYE_FILL = "#000";
var ENEMY_SPEED_MIN = 100;
var ENEMY_SPEED_MAX = 150;
var ENEMY_HEAD_PROP = 0.7; // proportion of the head (for drawing)
var ENEMY_TENTACLE_PROP = 0.7; // proportion of the tentacles (for drawing)
var ENEMY_VALUE_MIN = 20; // minimum points awarded for killing enemy
var ENEMY_VALUE_MAX = 200; // maximum points awarded for killing enemy
var COMBO_BONUS = 10; // bonus for combo

// new enemies get this additional speed every time an enemy is killed:
var ENEMY_SPEEDUP_UNIT = 3;

// bullet settings:
var BULLET_W = 4;
var BULLET_H = 20;
var BULLET_SPEED = 500;

// allies ("data packets"): the things the player should NOT shoot.
var ALLY_W = 30, ALLY_H = 30;
var ALLY_SPEED_MIN = 30;
var ALLY_SPEED_MAX = 50;
var ALLY_SPEED_ANGRY = 300; // speed when ally has been hit and turns angry

// enemy/ally spawn settings (spawn interval is interpolated linearly
// between using the two data points below):
var SPAWN_INTERVAL_START = 2.0; // interval at 0 points (start of game)
var SPAWN_INTERVAL_AT_5000 = 1.0;  // interval at 5000 points
var MIN_ENEMY_Y = 50;
var MAX_ENEMY_Y = 500;
var ALLY_SPAWN_PROB = 0.5;
var ALLIES_MAX = 6; // maximum number of allies on the screen

// key codes
var KEY_LEFT = 37;
var KEY_RIGHT = 39;
var KEY_FIRE = 32;

// how long we play the "death animation" after the player dies.
var DEATH_ANIM_DURATION = 3.0;

// minimum interval between consecutive incremental achievement calls (seconds)
// (unless we are finishing a game, in which case we call immediately)
var MIN_INC_ACH_INTERVAL = 30;

// particle effect settings
var PART_EFFECT = { FRAG_SIZE: 20, VEL_FACTOR: 10, DURATION: 2.0,
  VEL_MOD_MIN: 0.5, VEL_MOD_MAX: 1.0 };

// score popup: the little number that appears when you kill an enemy
// to show you scored X points for killing it.
var SCORE_POPUP_FONT = "15px 'Press Start 2P'";
var SCORE_POPUP_FILL = "#0f0";
var SCORE_POPUP_DURATION = 1.0;
var SCORE_POPUP_XLATE_X = 0;
var SCORE_POPUP_XLATE_Y = 0;
var SCORE_POPUP_Y_SPEED = -100;

// score font settings
var SCORE_FONT = "20px 'Press Start 2P'";
var SCORE_FILL = "#0f0";
var SCORE_X = 880, SCORE_Y = 50;

// combo display settings
var COMBO_FONT = "10px 'Press Start 2P'";
var COMBO_FILL = "#ff0";
var COMBO_X = 820, COMBO_Y = 20;
var COMBO_BAR_W = 100, COMBO_BAR_H = 10;
var COMBO_BAR_X = 880, COMBO_BAR_Y = 10;
var COMBO_BAR_DARK_FILL = "#440/#220/#110";
var COMBO_BAR_LIGHT_FILL = "#ff0/#880/#440";

// displacement of the "score extra" string (usually to display combos, etc)
// relative to the score popup
var SCORE_POPUP_EXTRA_DX = -30;
var SCORE_POPUP_EXTRA_DY = -20;
var SCORE_POPUP_EXTRA_FONT = "10px 'Press Start 2P'";
var SCORE_POPUP_EXTRA_FILL = "#ff0";

// high score time span
var HIGHSCORE_TIME_SPAN = "ALL_TIME";
var MIN_HIGHSCORE_REFRESH_INTERVAL = 30.0;  // in seconds

// how many combo gives you the "super bonus"
var COMBO_MAX = 12;

// palettes (we start with the first one and rotate as combo level rises)
var PALETTES = [
  { background: "#000", player: "#fff/#888/#fff", wall: "#0ff/#088/#044",
    enemy: "#0F0/#080/#040", ally: "#08F/#048/#024",
    ally_angry: "#A00/#800/#400" },

  { background: "#220", player: "#fff/#888/#fff", wall: "#0ff/#088/#044",
    enemy: "#ff0/#880/#440", ally: "#08F/#048/#024",
    ally_angry: "#A00/#800/#400" },

  { background: "#420", player: "#fff/#888/#fff", wall: "#0ff/#088/#044",
    enemy: "#fa0/#840/#420", ally: "#08F/#048/#024",
    ally_angry: "#A00/#800/#400" },

  { background: "#400", player: "#fff/#888/#fff", wall: "#0ff/#088/#044",
    enemy: "#f00/#800/#400", ally: "#08F/#048/#024",
    ally_angry: "#A00/#800/#400" }
];

// which palette to use for each combo level
var PALETTE_FOR_COMBO = [ 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3 ];

// time slowdown effect for each combo level
var TIME_FACTOR_FOR_COMBO = [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 0.5 ];

// at which combo level we should play the "powerup" sound effect
var COMBO_SFX_LEVEL = 9;

