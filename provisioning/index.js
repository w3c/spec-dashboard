const config = require("../config.json"),
      request = require('request'),
      w3c = require('node-w3capi');

w3c.apiKey = config.w3capikey;

const relevantSpecStatus = status => ['Retired', 'Group Note', 'Recommendation'].indexOf(status) === -1
const last = a => a[a.length - 1];
const specDate = s => last(s._links['latest-version'].href.split('/'));
const specDateSorter = (s1, s2) => specDate(s2) - specDate(s1);

w3c.groups().fetch({embed:true}, (err, groups) => {
    const workinggroups = groups.filter(g => g.type === 'working group');
    workinggroups.forEach(wg => {
        w3c.group(wg.id).specifications().fetch({embed: true}, (err, specs) => {
            const unfinishedSpecs = specs.filter(s => s._links ? !s._links['superseded-by'] && relevantSpecStatus(s._links['latest-version'].title) : console.error(s))
                  .sort(specDateSorter);
            createSpreadSheet(wg, unfinishedSpecs.map(s=> s.shortlink));
            const oldSpecs = unfinishedSpecs.filter(s => specDate(s) <= "20131215");
            if (oldSpecs.length) {
                console.error("The following " + wg.title + " specs have not been touched in 3 years:\n" + oldSpecs.map(s => "* "  + s.title + " (" + specDate(s) + ")").join("\n"));
            }
        });
    });
});

function createSpreadSheet(wg, specs) {
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
            console.log(wg.name, config.ethercalc + body);
        });
    } else {
        console.error(wg.name + " has no active spec to track");
    }
}
