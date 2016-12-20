const fs = require('fs'),
      Octokat = require("octokat"),
      config = require('../config.json'),
      request = require('request');

const octo = new Octokat({ token: config.ghapitoken });

const urlToGHRepo = (url = "") => {
    const githubio = url.match(/^https?:\/\/([^\.]*)\.github\.io\/([^\/]*)\//);
//    console.log(url, githubio);
    if (githubio) {
        return {owner: githubio[1], name: githubio[2]};
    }
};

fs.readFile("./groups.json", (err, data) => {
    if (err) return console.error(err);
    const groups = JSON.parse(data);

    Object.keys(groups).forEach(wgid => {
        fs.readFile("./pergroup/" + wgid + ".json", (err, data) => {
            const specs = JSON.parse(data);
            Promise.all(
                specs.map(s => Object.assign({}, s, {repo: urlToGHRepo(s.editorsdraft)}))
                    .filter(s => s.repo)
                    .map(s =>
                         octo.repos(s.repo.owner, s.repo.name).issues.fetch({state: "all"}).
                         then(issues => {
                             const hash = {};
                             hash[s.shortlink] =  { issues: issues.map(i => {
                                 return {state: i.state, number: i.number};
                             }), repo: s.repo}; return hash;})
                         .catch(console.error.bind(console))
                        )

            ).then(repoHashList => {
                const repoSpecs = repoHashList.reduce(
                    (a,b) => {a[Object.keys(b)[0]] = b[Object.keys(b)[0]]; return a;},
                    {});
                fs.writeFileSync("./pergroup/" + wgid + "-repo.json", JSON.stringify(repoSpecs,null, 2));
            }).catch(console.error.bind(console));
        });
    });
});
