const config = require("../config.json"),
      request = require('request'),
      async = require('async'),
      fs = require('fs'),
      utils = require('../lib/utils'),
      activespecs = require('../lib/active-specs'),
      w3c = require('node-w3capi');

w3c.apiKey = config.w3capikey;

const jsonify = o => JSON.stringify(o, null, 2);

const specDate = utils.specDate;
const last = utils.last;
const groupId = g => last(g.href.split('/'));
const shortNamer = url => last(url.split('/').filter(x => x));
const specShortnameSorter = (url1, url2) => shortNamer(url1).localeCompare(shortNamer(url2));

const preferGroup = (preferedGroup, otherGroup) => {
    return (g1, g2) => {if (preferedGroup == g1 && otherGroup == g2) { return -1;} else if (g1 == otherGroup && preferedGroup == g2) { return 1;} else { return 0;}};
};
const sharedSpecGroupSorter = (gid1, gid2) => {
    for (let prefers =  [
        // Prefer WebRTC to DAS
        [47318,43696]
    ], i = 0; i < prefers.length; i++) {
        const gs = prefers[i];
        const cmp = preferGroup(gs[0], gs[1])(gid1, gid2);
        if (cmp !== 0) return cmp;
    }
    return gid2 - gid1;
};
const sharedSpecGroupPicker = (wg, groupList) => !groupList || groupList.map(g => groupId(g)).sort(sharedSpecGroupSorter)[0] == wg.id;

w3c.groups().fetch({embed:true}, (err, groups) => {
    if (err) return console.error(err);
    const workinggroups = groups.filter(g => g.type === 'working group') ;
    async.map(workinggroups, (wg,cb) => {
        activespecs(wg.id, w3c.apiKey, (err, unfinishedSpecs) => {
            if (!unfinishedSpecs) return console.error("undefined result for " + wg.name);
            const oldSpecs = unfinishedSpecs.filter(s => specDate(s) <= "20131215");
            if (oldSpecs.length) {
                console.error("The following " + wg.name + " specs have not been touched in 3 years:\n" + oldSpecs.map(s => "* "  + s.title + " (" + specDate(s) + ")").join("\n"));
            }
            async.filter(unfinishedSpecs,
                         (s, filtercb) => {
                             w3c.specification(s.shortname).version(specDate(s)).fetch((err, datedversion) => {
                                 s.editorsdraft = datedversion ? datedversion["editor-draft"]: null;
                                 w3c.specification(s.shortname).versions().fetch({embed:true}, (err, versions) => {
                                     s.versions = versions;
                                     w3c.specification(s.shortname).version(specDate(s)).deliverers().fetch((err, groups) => {
                                         //if (err) return filtercb(err);
                                         filtercb(null, sharedSpecGroupPicker(wg, groups));
                                     });
                                 });
                             });
                         },
                         (err, ownedSpecs) => {
                             if (err) console.error(err);
                             fs.writeFileSync("./pergroup/" + wg.id + ".json", jsonify(ownedSpecs));
                             createSpreadSheet(wg, ownedSpecs.map(s=> s.shortlink), cb);
                         });
        });
    }, (err, results) => {
        if (err) return console.error(err);
        const groups = results.filter(g => g).reduce((a,b) => { a[b.id] = b; return a;}, {});
        fs.writeFileSync("./groups.json", jsonify(groups, null, 2));
    });
});


function createSpreadSheet(wg, specs, cb) {
    if (specs.length) {
        const body = "TR shortlink,FPWD,Wide Review end, CR, Test Suite status, PR, PER, Rec, Comments & notes\n" + specs.sort(specShortnameSorter).join("\n");
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
