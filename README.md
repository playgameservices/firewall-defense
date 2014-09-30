Firewall Defense: a simple web game
===================================

Firewall Defense: a simple web game illustrating how to integrate the [Google Play game services](https://developers.google.com/games/services/) web API.

To use this code, you must create your own application instance and client ID's in the Developer Console. Please refer to the [instructions](https://developers.google.com/games/services/web/gettingstarted) on how to set up Google Play game services for a web application for more information.

After setting up your own application and getting your own Client ID and setting up achievements, leaderboards, events, and quests, place your ID's in the `gameservices.js` file.  Additionally, put your Client ID in the `data-clientid` attribute of the SignIn button in the `index.html` file.

To run on your local machine, run `python -m SimpleHTTPServer` in the `firewall-defense` directory and then navigate to `localhost:8000` in your web browser.

A demo instance of this application can be accessed at the following URL:
http://firewall-defense-demo.appspot.com

_Copyright (C) 2014 Google Inc._

_Licensed under the Apache License, Version 2.0 (the "License");_
_you may not use this file except in compliance with the License._
_You may obtain a copy of the License at_

_http://www.apache.org/licenses/LICENSE-2.0_

_Unless required by applicable law or agreed to in writing, software_
_distributed under the License is distributed on an "AS IS" BASIS,_
_WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied._
_See the License for the specific language governing permissions and_
_limitations under the License._
