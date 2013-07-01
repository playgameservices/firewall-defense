/*
 * Copyright (C) 2013 Google Inc.
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

// namespace
var util = {};

util.baseTime = Date.now();

// Evaluates a triangle wave function bound to the given interval, with
// the given period (seconds), and phase (seconds). Useful for animations.
util.triWave = function(min, max, period, phase) {
  var t = phase + (Date.now() - util.baseTime) * 0.001;
  var x = (t % period) / period;
  if (x > 0.5) x = 1.0 - x;
  return min + x * 2.0 * (max - min);
}

// Returns a random number in the half-open range [min,max)
util.randBetween = function(min, max) {
  return min + Math.random() * (max - min);
}

// If value < min, returns min; if value > max, returns max. Otherwise returns
// value.
util.clamp = function(value, min, max) {
  return (value < min) ? min : (value > max) ? max : value;
}

// Formats a score for display. The format is 5 digits, with leading zeroes
// as appropriate.
util.formatScore = function(score) {
  score = "" + score;
  while (score.length < 5) score = "0" + score;
  return score;
}

// Interpolate. x1,y1,x2,y2 specify a linear function. If x is in [x1,x2],
// returns the value of that linear function at that point. If x is outside
// [x1,x2], it is clamped to that interval before evaluation.
util.interpolate = function(x1, y1, x2, y2, x) {
  if (x <= x1) return y1;
  if (x >= x2) return y2;
  return y1 + (y2 - y1) * (x - x1) / (1.0 * (x2 - x1));
}

// Remove an element from an array by swapping it with the last element and
// shortening the array. CAUTION: the order of elements on and after [index]
// will change, so if you are doing this as part of an iteration on the array,
// make sure you are iterating backwards, that is, from the end to the
// beginning.
util.removeAt = function(array, index) {
  array[index] = array[array.length - 1];
  array.pop();
}

