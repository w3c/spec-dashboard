const async = require('async'),
      fs = require('fs'),
      utils = require('../lib/utils'),
      activespecs = require('../lib/active-specs'),
      w3c = require('node-w3capi');

const jsonify = o => JSON.stringify(o, null, 2);

w3c.groups().fetch({embed:true}, (err, groups) => {
    if (err) return console.error(err);
    const workinggroups = groups.filter(g => g.type === 'working group') ;
    async.map(workinggroups, (wg, wgcb) => {
        activespecs({shortname: wg.shortname, type: "wg"}, (err, unfinishedSpecs) => {
            if (err) return console.error(err);
            if (!unfinishedSpecs) return console.error("undefined result for " + wg.name);
            if (!unfinishedSpecs.length) return console.error("no spec found for " + wg.name);
            async.map(unfinishedSpecs,
                      (s, cb)  => {
                          w3c.specification(s.shortname).version(utils.specDate(s)).fetch((err, datedversion) => {
                              if (err) return cb(err);
                              // we collect info on editors draft
                              s.editorsdraft = datedversion ? datedversion["editor-draft"]: null;
                              w3c.specification(s.shortname).versions().fetch({embed:true}, (err, versions) => {
                                  if (err) return cb(err);
                                  // and on version history
                                  s.versions = versions;
                                  return cb(null, s);
                              });
                          });
                      },
                      (err, annotatedSpecs) => {
                          if (err) console.error(err);
                          fs.writeFileSync("./pergroup/" + wg.id + ".json", jsonify(annotatedSpecs));
                          wgcb(null, wg.id);
                      });
        });
    },
              (err, wgids) => {
                  fs.writeFileSync("./pergroup/spec-update.json", JSON.stringify(new Date()));
              });
});
