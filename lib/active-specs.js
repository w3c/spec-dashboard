const request = require('request'),
      async = require('async'),
      w3c = require('node-w3capi'),
      utils = require('./utils');


const relevantSpecStatus = status => !['Retired', 'Discontinued', 'Group Note', 'Recommendation'].includes(status);

const shortNamer = url => utils.last(url.split('/').filter(x => x));
const specShortnameSorter = (s1, s2) => shortNamer(s1.shortlink).localeCompare(shortNamer(s2.shortlink));
const groupShortname = g => utils.last(g.href.split('/'));


const preferGroup = (preferedGroup, otherGroup) => {
    return (g1, g2) => {if (preferedGroup == g1 && otherGroup == g2) { return -1;} else if (g1 == otherGroup && preferedGroup == g2) { return 1;} else { return 0;}};
};
const sharedSpecGroupSorter = (gid1, gid2) => {
    for (let prefers =  [
        // Prefer WebRTC to DAS
        ["webrtc","das"],
        ["css","tag"]
    ], i = 0; i < prefers.length; i++) {
        const gs = prefers[i];
        const cmp = preferGroup(gs[0], gs[1])(gid1, gid2);
        if (cmp !== 0) return cmp;
    }
    return gid1.localeCompare(gid2);
};
const sharedSpecGroupPicker = (wgshortname, groupList) => !groupList || groupList.map(g => groupShortname(g)).sort(sharedSpecGroupSorter)[0] == wgshortname;


module.exports = function(wgshortname, cb) {
    w3c.group(wgshortname).specifications().fetch({embed: true}, (err, specs) => {
        if (err) return cb(err);
        // only keep specs that aren't finished (i.e. Note, Rec, or Retired)
        const unfinishedSpecs = specs.filter(s => s._links ? !s._links['superseded-by'] && relevantSpecStatus(s._links['latest-version'].title) : console.error(s))
              .sort(specShortnameSorter); // sort by shortname
        // filter to keep specs associated with one group only
        // by default, the one with the alphabetically first group shortname
        // but can be overridden in sharedSpecGroupSorter
        async.filter(unfinishedSpecs,
                     (s, filtercb) => {
                         w3c.specification(s.shortname).version(utils.specDate(s)).deliverers().fetch((err, groups) => {
                             //if (err) return filtercb(err);
                             filtercb(null, sharedSpecGroupPicker(wgshortname.shortname, groups));
                         });
                     },
                     cb);
    });
};
