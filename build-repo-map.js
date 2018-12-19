const fs = require("fs");

const repos = {};

fs.readdir('./pergroup/', (err, files) => {
  files.filter(f => f.match('[0-9]+-repo\.json'))
    .forEach(file => {
      const groupSpecs = JSON.parse(fs.readFileSync('./pergroup/' + file, 'utf-8'));
      Object.keys(groupSpecs).forEach(url => {
        const spec = groupSpecs[url];
        const repo = spec.repo.owner + '/' + spec.repo.name;
        const specData = {
          title: spec.title,
          recTrack: spec.recTrack,
          url: url,
          group: parseInt(file.match(/^([0-9]+)/)[1], 10)
        };
        if (!repos[repo]) {
          repos[repo] = [];
        }
        repos[repo].push(specData);
      });
    })
  console.log(JSON.stringify(repos, null, 2));

});
