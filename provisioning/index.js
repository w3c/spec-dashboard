const config = require("../config.json"),
      request = require('request'),
      async = require('async'),
      fs = require('fs'),
      w3c = require('node-w3capi');

w3c.apiKey = config.w3capikey;

const relevantSpecStatus = status => ['Retired', 'Group Note', 'Recommendation'].indexOf(status) === -1
const last = a => a[a.length - 1];
const specDate = s => last(s._links['latest-version'].href.split('/'));
const specDateSorter = (s1, s2) => specDate(s2) - specDate(s1);

w3c.groups().fetch({embed:true}, (err, groups) => {
    const workinggroups = groups.filter(g => g.type === 'working group');
    async.map(workinggroups, (wg,cb) => {
        w3c.group(wg.id).specifications().fetch({embed: true}, (err, specs) => {
            const unfinishedSpecs = specs.filter(s => s._links ? !s._links['superseded-by'] && relevantSpecStatus(s._links['latest-version'].title) : console.error(s))
                  .sort(specDateSorter);
            const oldSpecs = unfinishedSpecs.filter(s => specDate(s) <= "20131215");
            if (oldSpecs.length) {
                console.error("The following " + wg.name + " specs have not been touched in 3 years:\n" + oldSpecs.map(s => "* "  + s.title + " (" + specDate(s) + ")").join("\n"));
            }
            createSpreadSheet(wg, unfinishedSpecs.map(s=> s.shortlink), cb);
        });
    }, (err, results) => {
        if (err) return console.error(err);
        const groups = results.filter(g => g).reduce((a,b) => { a[b.id] = {name: b.name, url: b.url}; return a;}, {});
        fs.writeFileSync("./groups.json", JSON.stringify(groups, null, 2));
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
            cb(null, {id: wg.id, name: wg.name, url: config.ethercalc + body});
        });
    } else {
        console.error(wg.name + " has no active spec to track");
        cb(null);
    }
}
