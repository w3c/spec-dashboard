# Milestone tracker

To track milestones, a [script](milestone-tracker-provisioning/index.js) is provided that will create as many spreadsheets as there are Rec-track producing Working Groups known in the W3C API.

This script needs a `config.json` file in the root directory, derived from `[config.json.dist]` with a W3C API key and an instance of ethercalc where to create the spreadsheets.

It is recommended to use a local instance of ethercalc when developing; it is available via `npm install ethercalc` and should be launched as `./node_modules/ethercalc/bin/ethercalc --cors`.

Once all of this is configured and dependencies installed (`npm install`), `node milestone-tracker-provisioning/index.js` will create the spreadsheets, and create a `groups.json` file that identifies all the created spreadsheets.