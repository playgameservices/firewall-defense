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

// When document is ready, attach callbacks.
$(document).ready(function() {
  $('#play_button').click(onPlayClicked);
  $('#lb_button').click(onLbClicked);
  $('#ach_button').click(onAchClicked);
  $('#stats_button').click(onStatsClicked);
  $('.back_to_menu_button').click(onBackToMenuClicked);
  $('#sign_out_button').click(onSignOutClicked);
  $(document).keydown(function(evt) { gamelogic.handleKey(evt.which, true); });
  $(document).keyup(function(evt) { gamelogic.handleKey(evt.which, false); });
});

// when the Play button is clicked, get ready to play:
function onPlayClicked() {
  $('.screen').hide();
  $('#wait_div').show();
  console.log("Loading sounds...");
  audio.prepareSounds(onReadyToPlay);
}

function onReadyToPlay() {
  console.log("Ready to play.");
  $('.screen').hide();
  $('#game_div').show();
  console.log("Starting game.");
  gamelogic.startGame(onGameEnded);
}

// Game ended. Post high score and to results screen.
function onGameEnded(score) {
  $('#game_div').hide();
  $('#score').html(score);
  $('#result_div').show();

  // post score, if necessary
  gameservices.postHighScore(score);
}

// Shows the main screen.
function showMainScreen() {
  updatePodium();
  $('.screen').hide(); // hide all screens
  $('#main_menu').show(); // show main menu
}

// Update podium on main screen
function updatePodium() {
  if (gameservices.signedIn) {
    fillInHighscores("#podium", gameservices.highScores["public"], 3);
    $('#podium').show();
  } else {
    $('#podium').hide();
  }
}

// Called when user wants to go back to the menu.
function onBackToMenuClicked() {
  $('.screen').hide(); // hide all screens
  $('#wait_div').show(); // say "please wait"

  // refresh high scores, if needed
  gameservices.refreshHighScores(showMainScreen);
}

// Called when user wants to view the leaderboard.
function onLbClicked() {
  if (!gameservices.signedIn) {
    alert("Please sign in with Google to see high scores.");
    return;
  }

  // put up the wait screen while we load the leaderboards
  $('.screen').hide();
  $('#wait_div').show();

  // load the leaderboards. When done, fill in the leaderboards screen
  // and show it.
  gameservices.refreshHighScores(function() {
    var scores = gameservices.highScores;
    fillInHighscores("#hssoc", scores["social"]);
    fillInHighscores("#hspub", scores["public"]);
    $('#your_high_score').text(scores.playerScore ?
        util.formatScore(scores.playerScore) : "NO SCORE");
    $('.screen').hide();
    $('#highscores_div').show();
  });
}

// Fill in the high scores elements with the given list of scores.
function fillInHighscores(idPrefix, scoreList, numScores) {
  var scoresAdded = 0;
  var MAX_SCORES = 10;
  if (!numScores) numScores = MAX_SCORES;

  for (var i = 0; i < scoreList.length || i < numScores; ++i) {
    if (i < scoreList.length) {
      // show image
      var s = scoreList[i];
      img = s.image;
      if (!img) img = "images/empty.png";
      $(idPrefix + "_img" + i).attr("src", img + "?size=32");
      $(idPrefix + "_img" + i).show();

      // show score and player name
      $(idPrefix + "_span" + i).text(util.formatScore(s.score) + " " + s.name);
      $(idPrefix + "_span" + i).show();
    } else {
      // clear the image and the text
      $(idPrefix + "_img" + i).hide();
      $(idPrefix + "_span" + i).hide();
    }
  }
  if (scoreList.length == 0) {
    $(idPrefix + "_empty").show();
  } else {
    $(idPrefix + "_empty").hide();
  }
}

// Called when the "Achievements" button is clicked. React by showing the
// achievements screen.
function onAchClicked() {
  if (!gameservices.signedIn) {
    alert("Please sign in with Google to see achievements.");
    return;
  }

  // fill in achievements screen
  var htmlv = [];
  htmlv.push(_makeAchBox(gameservices.ACHIEVEMENTS.OVUM));
  htmlv.push(_makeAchBox(gameservices.ACHIEVEMENTS.KILL_ENEMY));
  htmlv.push(_makeAchBoxV(gameservices.ACHIEVEMENTS.PRECISION));
  htmlv.push(_makeAchBoxV(gameservices.ACHIEVEMENTS.INTEGRITY));
  htmlv.push(_makeAchBoxV(gameservices.ACHIEVEMENTS.RANK));
  htmlv.push(_makeAchBoxV(gameservices.ACHIEVEMENTS.EXPERIENCE));
  htmlv.push(_makeAchBox(gameservices.ACHIEVEMENTS.FREQUENT));
  htmlv.push(_makeAchBox(gameservices.ACHIEVEMENTS.SERIOUS.id));
  $('#ach_list').html(htmlv.join(''));

  // show achievements screen
  $('.screen').hide();
  $('#ach_div').show();
}

// Helper function to format a list of achievements.
function _makeAchBoxV(achs) {
  var s = [];
  for (var i = 0; i < achs.length; ++i) {
    s.push(_makeAchBox(achs[i].id));
  }
  return s.join("");
}

// Helper function to format an achievement.
function _makeAchBox(id) {
  var ach = gameservices.achievements[id];
  if (!ach) {
    console.log("BUG: achievement ID not found: " + id);
    return "?";
  }

  // if this achievement is hidden, we obviously don't want to show it:
  if (ach.hidden) return "";

  var inc = "";
  if (ach.def.achievementType == "INCREMENTAL" && !ach.unlocked) {
    inc = " (progress: " + ach.currentSteps + "/" + ach.def.totalSteps + ")";
  }

  return "<div class='ach_list_item'><img src='" +
    (ach.unlocked ?  ach.def.unlockedIconUrl : ach.def.revealedIconUrl) +
    "?size=32' class='ach_icon'><div class='ach_info'>" +
    "<span class='ach_name_" + (ach.unlocked ? "unlocked" : "locked") + "'>"+
    ach.def.name + "</span><br/><span class='ach_desc_" +
    (ach.unlocked ? "unlocked" : "locked") + "'>" +
    ach.def.description + inc + "</span></div></div>";
}

function onStatsClicked() {
  if (!gameservices.signedIn) {
    alert("Please sign in with Google to see stats.");
    return;
  }

  // fill in achievements screen
  var htmlv = [];
  htmlv.push(_makeEvtBox(gameservices.EVENTS.ENEMIES_KILLED));
  htmlv.push(_makeEvtBox(gameservices.EVENTS.GAMES_PLAYED));
  htmlv.push(_makeEvtBox(gameservices.EVENTS.COMBOS_ACHIEVED));
  $('#evt_list').html(htmlv.join(''));

  // show achievements screen
  $('.screen').hide();
  $('#evt_div').show();
}

function _makeEvtBox(id) {
  var evt = gameservices.events[id];
  if (!evt) {
    console.log("BUG: event ID not found: " + id);
    return "?";
  }

  return "<div class='ach_list_item'><img src='" +
    (evt.def.imageUrl) +
    "?size=32' class='ach_icon'><div class='ach_info'>" +
    "<span class='ach_name_unlocked'>"+
    evt.def.displayName + "</span><br/><span class='ach_desc_unlocked'>" +
    evt.numEvents + "</span></div></div>";
}

// Called when user clicked on the "Sign Out" button.
function onSignOutClicked() {
  $('.screen').hide();
  $('#wait_div').show();
  gameservices.disconnectUser();
}

function onSignInResult(result) {
  gameservices.onSignInResult(result);
}
