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

// namespace
audio = {};

// Correct sound extension (use ogg on Chrome, wav on others)
audio.EXT = (/Chrome/.test(navigator.userAgent)) ? "ogg" : "wav";

// Our sounds:
audio.availableSounds = {
  explosion: "sounds/explosion." + audio.EXT,
  laser: "sounds/laser." + audio.EXT,
  wallbreak: "sounds/wallbreak." + audio.EXT,
  badhit: "sounds/badhit." + audio.EXT,
  blast: "sounds/blast." + audio.EXT,
  powerup: "sounds/powerup." + audio.EXT
};

// are sounds enabled?
audio.soundsEnabled = false;

// sounds currently loaded:
audio.sounds = {};

// Play a sound
audio.playSound = function(soundName) {
  if (!audio.soundsEnabled) return;
  var s = audio.sounds[soundName];
  if (s) s.play();
}

// Wait for sounds to be loaded, then calls the given callback.
audio.waitForSounds = function(callback) {
  var numReady = 0, total = 0;
  for (var i in audio.sounds) {
    if (audio.sounds[i].readyState == 4) numReady++;
    total++;
  }
  if (numReady >= total) {
    // all sounds ready
    audio.soundsEnabled = true;
    callback();
  }
  else {
    setTimeout(function() { audio.waitForSounds(callback); }, 1000);
  }
}

// Load all sounds and calls the given callback when ready.
audio.prepareSounds = function(callback) {
  if (audio.soundsEnabled) {
    // we're already prepared, so just call the callback.
    callback();
  } else {
    // start loading sounds and wait until they are loaded
    for (i in audio.availableSounds) {
      console.log("Loading audio: " + audio.availableSounds[i]);
      audio.sounds[i] = new Audio(audio.availableSounds[i]);
      console.log("Audio is " + audio.sounds[i]);
    }
    audio.waitForSounds(callback);
  }
}

