const request = require('request'),
      async = require('async'),
      w3c = require('node-w3capi'),
      utils = require('./utils');


const relevantSpecStatus = status => ['Retired', 'Group Note', 'Recommendation'].indexOf(status) === -1

const shortNamer = url => utils.last(url.split('/').filter(x => x));
const specShortnameSorter = (s1, s2) => shortNamer(s1.shortlink).localeCompare(shortNamer(s2.shortlink));
const groupId = g => utils.last(g.href.split('/'));


const preferGroup = (preferedGroup, otherGroup) => {
    return (g1, g2) => {if (preferedGroup == g1 && otherGroup == g2) { return -1;} else if (g1 == otherGroup && preferedGroup == g2) { return 1;} else { return 0;}};
};
const sharedSpecGroupSorter = (gid1, gid2) => {
    for (let prefers =  [
        // Prefer WebRTC to DAS
        [47318,43696],
        [32061,34270]
    ], i = 0; i < prefers.length; i++) {
        const gs = prefers[i];
        const cmp = preferGroup(gs[0], gs[1])(gid1, gid2);
        if (cmp !== 0) return cmp;
    }
    return gid2 - gid1;
};
const sharedSpecGroupPicker = (wgid, groupList) => !groupList || groupList.map(g => groupId(g)).sort(sharedSpecGroupSorter)[0] == wgid;


module.exports = function(wgid, w3capikey, cb) {
    w3c.apiKey = w3capikey;
    w3c.group(wgid).specifications().fetch({embed: true}, (err, specs) => {
        if (err) return cb(err);
        // only keep specs that aren't finished (i.e. Note, Rec, or Retired)
        const unfinishedSpecs = specs.filter(s => s._links ? !s._links['superseded-by'] && relevantSpecStatus(s._links['latest-version'].title) : console.error(s))
              .sort(specShortnameSorter); // sort by shortname
        // filter to keep specs associated with one group only
        // by default, the one with the lower group id
        // but can be overridden in sharedSpecGroupSorter
        async.filter(unfinishedSpecs,
                     (s, filtercb) => {
                         w3c.specification(s.shortname).version(utils.specDate(s)).deliverers().fetch((err, groups) => {
                             //if (err) return filtercb(err);
                             filtercb(null, sharedSpecGroupPicker(wgid, groups));
                         });
                     },
                     cb);
    });
};
