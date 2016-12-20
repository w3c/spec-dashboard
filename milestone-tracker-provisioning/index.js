const config = require("../config.json"),
      request = require('request'),
      async = require('async'),
      fs = require('fs'),
      utils = require('../lib/utils'),
      activespecs = require('../lib/active-specs'),
      w3c = require('node-w3capi');

w3c.apiKey = config.w3capikey;

const jsonify = o => JSON.stringify(o, null, 2);

w3c.groups().fetch({embed:true}, (err, groups) => {
    if (err) return console.error(err);
    const workinggroups = groups.filter(g => g.type === 'working group') ;
    async.map(workinggroups, (wg,cb) => {
        activespecs(wg.id, w3c.apiKey, (err, unfinishedSpecs) => {
            if (!unfinishedSpecs) return console.error("undefined result for " + wg.name);
            if (err) console.error(err);
            createSpreadSheet(wg, unfinishedSpecs.map(s=> s.shortlink), cb);
        });
    }, (err, results) => {
        if (err) return console.error(err);
        const groups = results.filter(g => g).reduce((a,b) => { a[b.id] = b; return a;}, {});
        fs.writeFileSync("./groups.json", jsonify(groups, null, 2));
    });
});


function createSpreadSheet(wg, specs, cb) {
    if (specs.length) {
        const body = "TR shortlink,FPWD,Wide Review end, CR, Test Suite status, PR, PER, Rec, Comments & notes\n" + specs.join("\n");
        request({
            method: 'POST',
            url: config.ethercalc + '/_',
            headers: {
            'Content-Type': 'text/csv'
            },
            body: body
        }, function (error, response, body) {
            cb(null, {id: wg.id, name: wg.name, start: wg["start-date"], end: wg["end-date"], url: config.ethercalc + body});
        });
    } else {
        console.error(wg.name + " has no active spec to track");
        cb(null);
    }
}
