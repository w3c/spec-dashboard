const fs = require('fs/promises'),
      utils = require('../lib/utils'),
      activespecs = require('../lib/active-specs'),
      w3c = require('node-w3capi');

const jsonify = o => JSON.stringify(o, null, 2);


(async function() {
  const groups = await w3c.groups().fetch({embed:true});
  const workinggroups = groups.filter(g => g.type === 'working group') ;
  for (const wg of workinggroups) {
    const unfinishedSpecs = await activespecs({shortname: wg.shortname, type: "wg"});
    if (!unfinishedSpecs) {
      console.error("undefined result for " + wg.name);
      continue;
    }
    if (!unfinishedSpecs.length) {
      console.error("no spec found for " + wg.name);
      continue;
    }
    for (const s of unfinishedSpecs) {
      const datedversion = await w3c.specification(s.shortname).version(utils.specDate(s)).fetch();
      s.editorsdraft = datedversion ? datedversion["editor-draft"]: null;
      s.versions = await w3c.specification(s.shortname).versions().fetch({embed:true});
    }
    fs.writeFile("./pergroup/" + wg.id + ".json", jsonify(unfinishedSpecs));
  }
  fs.writeFile("./pergroup/spec-update.json", JSON.stringify(new Date()));
})().catch(err => console.error(err));
