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
var gameservices = {};

// IDs (obtained from the Google Play developer console)
gameservices.CLIENT_ID = "295169592941-lde7pd84p5p2ftca065jqgmbk1jv5bf5.apps.googleusercontent.com";
gameservices.LEADERBOARD_ID = "CgkI7Zzqy8sIEAIQCg";
gameservices.ACHIEVEMENTS = {
  // Achievement for killing your first enemy
  KILL_ENEMY: "CgkI7Zzqy8sIEAIQAQ",
  // Achievements for killing <kills> enemies in a row
  PRECISION: [
    { kills:  5, id: "CgkI7Zzqy8sIEAIQAg" },
    { kills: 10, id: "CgkI7Zzqy8sIEAIQAw" },
    { kills: 25, id: "CgkI7Zzqy8sIEAIQBA" },
    { kills: 50, id: "CgkI7Zzqy8sIEAIQBQ" }
  ],
  // Achievements for keeping the wall intact for <time> seconds
  INTEGRITY: [
    { time:  30, id: "CgkI7Zzqy8sIEAIQBg" },
    { time:  60, id: "CgkI7Zzqy8sIEAIQBw" },
    { time: 120, id: "CgkI7Zzqy8sIEAIQCA" },
    { time: 300, id: "CgkI7Zzqy8sIEAIQCQ" }
  ],
  // Achievements for <score> total score
  RANK: [
    { score:  1000, id: "CgkI7Zzqy8sIEAIQCw" },
    { score:  2000, id: "CgkI7Zzqy8sIEAIQDA" },
    { score:  3000, id: "CgkI7Zzqy8sIEAIQDQ" },
    { score:  5000, id: "CgkI7Zzqy8sIEAIQDg" },
    { score:  8000, id: "CgkI7Zzqy8sIEAIQDw" },
    { score: 15000, id: "CgkI7Zzqy8sIEAIQEA" }
  ],
  // Achievements for <kills> total kills (incremental)
  EXPERIENCE: [
    { kills:  50, id: "CgkI7Zzqy8sIEAIQEQ" },
    { kills: 100, id: "CgkI7Zzqy8sIEAIQEg" },
    { kills: 200, id: "CgkI7Zzqy8sIEAIQEw" },
    { kills: 500, id: "CgkI7Zzqy8sIEAIQFA" },
  ],
  // Achievement for playing 25 times (incremental)
  FREQUENT: "CgkI7Zzqy8sIEAIQFQ",
  // Achievement for scoring <minScore> points
  SERIOUS: { minScore: 2000, id: "CgkI7Zzqy8sIEAIQFg" },
  // Secret achievement (hidden)
  OVUM: "CgkI7Zzqy8sIEAIQFw"
};
gameservices.EVENTS = {
  // Event for killing an enemy
  ENEMIES_KILLED: "CgkI7Zzqy8sIEAIQGA",
  // Event for playing a game
  GAMES_PLAYED: "CgkI7Zzqy8sIEAIQGQ" ,
  // Event for achieving a 12-kill "MAX" combo
  COMBOS_ACHIEVED: "CgkI7Zzqy8sIEAIQGg"
};

// are we signed in?
gameservices.signedIn = false;

// highest score we posted to the leaderboard
gameservices.highestScorePosted = 0;

// achievement data
gameservices.achievements = {};

// event data
gameservices.events = {};

// quest data
gameservices.quests = {};

// this keeps track of async stuff we are loading. When everything is done
// loading, we call gameservices.loadFinishedCallback.
gameservices.asyncLoads = {
  achievements: false,
  events: false,
  quests: false,
  definitions: false,
  publicHighScores: false,
  socialHighScores: false
}
gameservices.loadFinishedCallback = undefined;

// when was the last time we refreshed the high scores?
gameservices.lastHighScoreRefresh = 0;

// result of the high scores loading operation
gameservices.highScores = { social: [], public: [], playerScore: 0 };

// From https://developers.google.com/+/web/signin/#using_the_client-side_flow
$(document).ready(function() {
  var po = document.createElement('script');
  po.type = 'text/javascript'; po.async = true;
  po.src = 'https://apis.google.com/js/client:plusone.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(po, s);
});

// Called when sign in succeeds or fails.
gameservices.onSignInResult = function(authResult) {
  if (authResult['access_token']) {
    // sign in was successful.
    gameservices.signedIn = true;
    $('#sign_in_bar').hide();
    $('#sign_out_bar').show();
    $('.screen').hide();
    $('#wait_div').show();

    // load the API via discovery service
    gapi.client.load("games", "v1", gameservices.onApiLoaded);
  }
  else {
    // sign in failed.
    gameservices.signedIn = false;
    $('#sign_in_bar').show();
    $('#sign_out_bar').hide();
    showMainScreen();
  }
}

// Called when API is ready to use.
gameservices.onApiLoaded = function() {
  var req;

  for (var k in gameservices.asyncLoads) {
    gameservices.asyncLoads[k] = false;
  }
  gameservices.loadFinishedCallback = showMainScreen;

  // load achievement definitions
  req = gapi.client.games.achievementDefinitions.list();
  req.execute(gameservices.onAchievementDefinitionsLoaded);

  // load player's achievements
  req = gapi.client.games.achievements.list({ playerId: "me" });
  req.execute(gameservices.onAchievementsLoaded);

  // load event definitions
  req = gapi.client.games.events.listDefinitions();
  req.execute(gameservices.onEventDefinitionsLoaded);

  // load player's events
  req = gapi.client.games.events.listByPlayer();
  req.execute(gameservices.onEventsLoaded);

  // load quests
  req = gapi.client.games.quests.list({ playerId: "me" });
  req.execute(gameservices.onQuestsLoaded);

  // load high scores
  gameservices.loadHighScores();

  // DEBUG: handle debug request to reset achievements
  if ((""+window.location).indexOf("debug_reset=1") > 0) {
    alert("DEBUG: achievements reset requested.");
    gapi.client.request({
      path: "/games/v1management/achievements/reset",
      method: "post",
      callback: function(resp) {
        alert("Reset result: " + (resp ? "OK" : "Failed"));
      }
    });
  }
}

// If all async loads are finished, call the async load finished callback.
gameservices.checkAsyncLoadsFinished = function() {
  console.log("Async loads so far: ");
  for (var k in gameservices.asyncLoads) {
    console.log(" - " + k + ": " + gameservices.asyncLoads[k]);
    if (!gameservices.asyncLoads[k]) return;
  }
  if (gameservices.loadFinishedCallback) {
    console.log("Async loads finished. Calling callback.");
    gameservices.loadFinishedCallback();
  } else {
    console.log("No callback.");
  }
}

// Called when achievements have been loaded.
gameservices.onAchievementsLoaded = function(result) {
  if (!result) {
    alert("Failed to sign in (failed to load achievements).");
    gameservices.onSignInResult(false);
    return;
  }

  if (result.items) {
    for (var i = 0; i < result.items.length; i++) {
      var a = result.items[i];

      if (!gameservices.achievements[a.id]) {
        gameservices.achievements[a.id] = {};
      }

      gameservices.achievements[a.id].unlocked =
          (a.achievementState == "UNLOCKED");
      gameservices.achievements[a.id].hidden =
          (a.achievementState == "HIDDEN");
      gameservices.achievements[a.id].currentSteps = a.currentSteps ?
          a.currentSteps : 0;
    }
  }

  if (result.nextPageToken) {
    // there's more to load
    var req = gapi.client.games.achievements.list({
      playerId: "me" , pageToken: result.nextPageToken });
    req.execute(gameservices.onAchievementsLoaded);
  } else {
    // done loading
    gameservices.asyncLoads.achievements = true;
    gameservices.checkAsyncLoadsFinished();
  }
}

// Called when the achievement definitions have been loaded.
gameservices.onAchievementDefinitionsLoaded = function(result) {
  if (!result) {
    alert("Failed to sign in (failed to load achievement definitions).");
    gameservices.onSignInResult(false);
    return;
  }

  if (result.items) {
    for (var i = 0; i < result.items.length; ++i) {
      var d = result.items[i];
      if (!gameservices.achievements[d.id]) {
        gameservices.achievements[d.id] = {};
      }
      gameservices.achievements[d.id].def = d;
    }
  }

  if (result.nextPageToken) {
    // there's more to load
    var req = gapi.client.games.achievementDefinitions.list({
      pageToken: result.nextPageToken });
    req.execute(gameservices.onAchievementDefinitionsLoaded);
    return;
  }

  gameservices.asyncLoads.definitions = true;
  gameservices.checkAsyncLoadsFinished();
}

// Called when the event definitions have been loaded
gameservices.onEventDefinitionsLoaded = function(result) {
  if (!result) {
    alert('Failed to sign in (failed to load event definitions).');
    gameservices.onSignInResult(false);
    return;
  }

  if (result.items) {
    for (var i = 0; i < result.items.length; ++i) {
      var d = result.items[i];
      if (!gameservices.events[d.id]) {
        gameservices.events[d.id] = {};
      }
      gameservices.events[d.id].def = d;
    }
  }

  if (result.nextPageToken) {
    // there's more to load
    var req = gapi.client.events.listDefinitions({
      pageToken: result.nextPageToken
    });
    req.execute(gameservices.onEventDefinitionsLoaded);
    return;
  }
}

// Called when the player's events have been loaded
gameservices.onEventsLoaded = function(result) {
  if (!result) {
    alert("Failed to sign in (failed to load events).");
    gameservices.onSignInResult(false);
    return;
  }

  if (result.items) {
    for (var i = 0; i < result.items.length; i++) {
      var e = result.items[i];

      if (!gameservices.events[e.definitionId]) {
        gameservices.events[e.definitionId] = {};
      }

      gameservices.events[e.definitionId].numEvents = e.numEvents;
    }
  }

  if (result.nextPageToken) {
    // there's more to load
    var req = gapi.client.games.events.listByPlayer({
      pageToken: result.nextPageToken
    });
    req.execute(gameservices.onEventsLoaded);
  } else {
    // done loading
    gameservices.asyncLoads.events = true;
    gameservices.checkAsyncLoadsFinished();
  }
}

// Callled when quests have been loaded
gameservices.onQuestsLoaded = function(result) {
  if (!result) {
    alert("Failed to sign in (failed to load quests).");
    gameservices.onSignInResult(false);
    return;
  }

  if (result.items) {
    for (var i = 0; i < result.items.length; i++) {
      var q = result.items[i];

      if (!gameservices.quests[q.id]) {
        gameservices.quests[q.id] = {};
      }

      gameservices.quests[q.id] = q;
    }
  }

  if (result.nextPageToken) {
    // there's more to load
    var req = gapi.client.games.quests.list({
      playerId: "me",
      pageToken: result.nextPageToken
    });
    req.execute(gameservices.onQuestsLoaded);
  } else {
    // done loading
    gameservices.asyncLoads.quests = true;
    gameservices.checkAsyncLoadsFinished();
  }
}

gameservices.loadHighScores = function() {
  // throw away the scores we have
  gameservices.highScores["public"] = [];
  gameservices.highScores["social"] = [];
  gameservices.asyncLoads.publicHighScores = false;
  gameservices.asyncLoads.socialHighScores = false;

  // request social scores:
  var req = gapi.client.games.scores.list({
    collection: "SOCIAL",
    leaderboardId: gameservices.LEADERBOARD_ID,
    timeSpan: HIGHSCORE_TIME_SPAN
  });
  req.execute(function(data) {
    gameservices.onHighScoresLoaded("social", data);
  });

  // request public scores:
  var req = gapi.client.games.scores.list({
    collection: "PUBLIC",
    leaderboardId: gameservices.LEADERBOARD_ID,
    timeSpan: HIGHSCORE_TIME_SPAN
  });
  req.execute(function(data) {
    gameservices.onHighScoresLoaded("public", data);
  });
}

gameservices.refreshHighScores = function(callback, force) {
  // if not logged in, no refreshing...
  if (!gameservices.signedIn) {
    callback();
    return;
  }
  // too soon?
  if (!force && Date.now() < gameservices.lastHighScoreRefresh +
      (1000 * MIN_HIGHSCORE_REFRESH_INTERVAL)) {
    callback();
    return;
  }

  gameservices.asyncLoads.publicHighScores = false;
  gameservices.asyncLoads.socialHighScores = false;
  gameservices.loadFinishedCallback = callback;
  gameservices.loadHighScores();
}

gameservices.onHighScoresLoaded = function(collection, data) {
  var MIN_HIGH_SCORES = 10;

  if (!data || !data.kind) {
    // Failed to load (in a real app, you would do something more robust
    // than this!)
    alert("Failed to load " + collection + " high scores.");
    return;
  }

  if (data.items) {
    for (var i = 0; i < data.items.length; ++i) {
      gameservices.highScores[collection].push({
        name: data.items[i].player.displayName,
        image: data.items[i].player.avatarImageUrl,
        score: data.items[i].scoreValue
      });
    }
  }

  if (data.playerScore) {
    gameservices.highScores.playerScore = data.playerScore.scoreValue;
  }

  // if we don't have enough data yet, get next page
  if (gameservices.highScores[collection].length < MIN_HIGH_SCORES &&
        data.nextPageToken) {
    var req = gapi.client.games.scores.list({
      collection: collection.toUpperCase(),
      leaderboardId: gameservices.LEADERBOARD_ID,
      timeSpan: HIGHSCORE_TIME_SPAN,
      pageToken: data.nextPageToken
    });
    req.execute(function(data) {
      gameservices.onHighScoresLoaded(collection, data);
    });
  } else {
    // done loading
    gameservices.lastHighScoreRefresh = Date.now();
    gameservices.asyncLoads[collection + "HighScores"] = true;
    gameservices.checkAsyncLoadsFinished();
  }
}

gameservices.postHighScore = function(score) {
  if (!gameservices.signedIn || score <= gameservices.highestScorePosted) {
    return;
  }
  var req = gapi.client.games.scores.submit({
    leaderboardId: gameservices.LEADERBOARD_ID, score: score });
  req.execute(function(resp) {
    if (resp) gameservices.highestScorePosted = score;
  });
}

gameservices.showAchToast = function(achId) {
  $("#ach_toast").html("ACHIEVEMENT: " +
      gameservices.achievements[achId].def.name);
  $("#ach_toast").show();
  setTimeout(function() { $("#ach_toast").hide(); }, 2000);
}

gameservices.showQuestToast = function() {
  $("#ach_toast").html("QUEST COMPLETED: REWARD CLAIMED");
  $("#ach_toast").show();
  setTimeout(function() { $("#ach_toast").hide(); }, 2000);
}

gameservices.unlockAchievement = function(achId) {
  if (!gameservices.signedIn) return;
  if (gameservices.achievements[achId].unlocked) return;
  gameservices.achievements[achId].unlocked = true;

  var req = gapi.client.games.achievements.unlock({ achievementId: achId });
  req.execute(function(resp) {
    if (resp) {
      gameservices.achievements[achId].unlocked = true;
      if (resp.newlyUnlocked) gameservices.showAchToast(achId);
    }
  });
}

gameservices.incrementAchievement = function(achId, steps) {
  if (!gameservices.signedIn) return;
  var req = gapi.client.games.achievements.increment({
    achievementId: achId,
    stepsToIncrement: steps
  });
  req.execute(function(resp) {
    if (resp) {
      var ach = gameservices.achievements[achId];
      if (resp.currentSteps) {
        ach.currentSteps = resp.currentSteps;
      }
      else {
        ach.currentSteps += steps;
        if (ach.currentSteps > ach.def.totalSteps) {
          ach.currentSteps = ach.def.totalSteps;
        }
      }

      if (resp.newlyUnlocked) {
        ach.unlocked = true;
        gameservices.showAchToast(achId);
      }
    }
  });
}

gameservices.recordEvents = function(evts, startTime, callback) {
  if (!gameservices.signedIn) return;
  var nowMillis = Date.now();
  var req = gapi.client.games.events.record({
    requestId: nowMillis,
    currentTimeMillis: nowMillis,
    timePeriods: [
      {
        timePeriod: {
          periodStartMillis: startTime - 100000,
          periodEndMillis: (nowMillis - 100)
        },
        updates: evts
      }
    ]
  });
  req.execute(callback);
}

gameservices.acceptQuest = function(id, callback) {
  // Accept quest
  var req = gapi.client.games.quests.accept({
    questId: id
  });
  req.execute(callback);
};

gameservices.claimCompletedMilestones = function(callback) {
  gapi.client.games.quests.list({ playerId: 'me' }).execute(function(resp) {
    if (resp.items) {
      for (var i = 0; i < resp.items.length; i++) {
        // Find all unclaimed milestones of each quest
        var quest = resp.items[i];
        var unclaimed = quest.milestones
          .filter(function(m) { return m.state == "COMPLETED_NOT_CLAIMED" });

        // Claim each one
        for (var j = 0; j < unclaimed.length; j++) {
          var milestone = unclaimed[j];
          gameservices.claimQuestMilestone(quest.id, milestone.id, function(claimed) {
            if (claimed) {
              callback(milestone);
            }
          });
        }
      }
    }
  });
};

gameservices.claimQuestMilestone = function(questId, milestoneId, callback) {
  var req = gapi.client.games.questMilestones.claim({
    requestId: Date.now(),
    questId: questId,
    milestoneId: milestoneId
  });

  req.execute(function(resp) {
    // Successful response looks like { "result": {} }
    if (resp.result && (resp.result.keys == undefined)) {
      callback(true);
    } else {
      // Non-empty means there was an error
      console.log('BUG: Could not claim quest. ' + JSON.stringify(resp));
      callback(false);
    }
  });
}

// adapted from: https://developers.google.com/+/web/signin/:
gameservices.disconnectUser = function() {
  if (!gameservices.signedIn) return;
  var access_token = gapi.auth.getToken();
  var revokeUrl = 'https://accounts.google.com/o/oauth2/revoke?token=' +
    access_token.access_token;

  gameservices.signedIn = false;

  // Perform an asynchronous GET request.
  $.ajax({
    type: 'GET',
    url: revokeUrl,
    async: false,
    contentType: "application/json",
    dataType: 'jsonp',
    success: function(nullResponse) {
      gameservices.onSignInResult(false);
    },
    error: function(e) {
      console.log(e);
      alert("Failed to disconnect. You can also do this manually at " +
          "https://plus.google.com/apps.");
    }
  });
}

