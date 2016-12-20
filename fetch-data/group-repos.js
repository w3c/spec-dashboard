const fs = require('fs'),
      Octokat = require("octokat"),
      config = require('../config.json'),
      request = require('request');

const octo = new Octokat({ token: config.ghapitoken });

const urlToGHRepo = (url = "") => {
    const nofilter = x => true;
    const githubio = url.match(/^https?:\/\/([^\.]*)\.github\.io\/([^\/]*)\/?/);
    if (githubio) {
        return {owner: githubio[1], name: githubio[2], issuefilter: nofilter};
    }
    const githubcom = url.match(/^https:\/\/github.com\/([^\/]*)\/([^\/]*)\//);
    if (githubcom) {
        return {owner: githubcom[1], name: githubcom[2], issuefilter: nofilter};
    }
    const rawgit = url.match(/^https?:\/\/rawgit.com\/([^\/]*)\/([^\/]*)/);
    if (rawgit) {
        return {owner: rawgit[1], name: rawgit[2], issuefilter: nofilter};
    }
    const whatwg = url.match(/https:\/\/([^\.]*).spec.whatwg.org\//);
    if (whatwg) {
        return {owner: "whatwg", name: whatwg[1], issuefilter: nofilter};
    }

    const csswg = url.match(/^https?:\/\/drafts.csswg.org\/([^\/]*)\/?/);
    if (csswg) {
        return {owner: 'w3c', name: 'csswg-drafts', issuefilter: x => x.title.match(new RegExp("\\[" + csswg[1] + "\\]"))};
    }
    const devcss = url.match(/^https?:\/\/dev.w3.org\/csswg\/([^\/]*)\/?/);
    if (devcss) {
        return {owner: 'w3c', name: 'csswg-drafts', issuefilter: x => x.title.match(new RegExp("\\[" + devcss[1] + "\\]"))};
    }
    const devfxtf = url.match(/^https?:\/\/dev.w3.org\/fxtf\/([^\/]*)\/?/);
    if (devfxtf) {
        return {owner: 'w3c', name: 'fxtf-drafts', issuefilter: x => x.title.match(new RegExp("\\[" + devfxtf[1] + "\\]"))};
    }

    const svgwg = url.match(/^https?:\/\/svgwg.org\/specs\/([^\/]*)\/?/);
    if (svgwg) {
        return {owner: 'w3c', name: 'svgwg', issuefilter: x => x.labels.map(l => l.name.toLowerCase()).indexOf("svg " + svgwg[1]) !== -1};
    }
    // Specific cases
    if (url === "https://svgwg.org/svg2-draft/") {
        return {owner: 'w3c', name: 'svgwg', issuefilter: x => x.labels.map(l => l.name.toLowerCase()).indexOf("svg core") !== -1};
    }
    if (url === "https://linkedresearch.org/ldn/") {
        return {owner: 'w3c', name: 'ldn', issuefilter: nofilter};
    }
    if (url === "https://micropub.net/draft/") {
        return {owner: 'w3c', name: 'micropub', issuefilter: nofilter};
    }
    if (url === "https://webmention.net/draft/") {
        return {owner: 'w3c', name: 'webmention', issuefilter: nofilter};
    }
    if (url === "http://dev.w3.org/2009/dap/camera/") {
        return {owner: 'w3c', name: 'html-media-capture', issuefilter: nofilter};
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
                         // TODO: Need to walk through pagination
                         octo.repos(s.repo.owner, s.repo.name).issues.fetch({state: "all"}).
                         then(issues => {
                             const hash = {};
                             hash[s.shortlink] =  { issues: issues.filter(s.repo.issuefilter)
                                                    .map(i => {
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
