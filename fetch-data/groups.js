const fs = require('fs/promises');

(async function() {
  const workinggroups = await (await fetch("https://api.w3.org/groups/wg?embed=1")).json();
  fs.writeFile("groups.json", JSON.stringify(
    workinggroups._embedded.groups.map(g => {
      return {id: g.id, shortname: g.shortname, start: g["start-date"], end: g["end-date"], name: g.name};
    }).reduce((a, b) => {
      a[b.id] = b;
      return a;
    }, {})
    , null, 2));
})();

