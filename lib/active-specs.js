const request = require('request'),
      async = require('async'),
      w3c = require('node-w3capi'),
      utils = require('./utils');


const relevantSpecStatus = status => ['Retired', 'Group Note', 'Recommendation'].indexOf(status) === -1
const specDateSorter = (s1, s2) => utils.specDate(s2) - utils.specDate(s1);


module.exports = function(wgid, w3capikey, cb) {
    w3c.apiKey = w3capikey;
    w3c.group(wgid).specifications().fetch({embed: true}, (err, specs) => {
        if (err) return cb(err);
        const unfinishedSpecs = specs.filter(s => s._links ? !s._links['superseded-by'] && relevantSpecStatus(s._links['latest-version'].title) : console.error(s))
              .sort(specDateSorter);
        cb(null, unfinishedSpecs)
    });
};
