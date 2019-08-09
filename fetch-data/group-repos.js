const fs = require('fs'),
      config = require('../config.json'),
      ghrequest = require('gh-api-request');

const httpIze = u => u.replace(/^https:/, 'http:');

ghrequest.ghToken = config.ghapitoken;
ghrequest.userAgent = 'W3C spec dashboard https://github.com/w3c/spec-dashboard';
const queueGhRequest = ghrequest.request;

const urlToGHRepo = (url = "", tr_shortname) => {
    const nofilter = x => true;

    const versionless = s => s.replace(/-[0-9]*$/,'');
   const cssIssueFilter = shortname => x => {
       return x.title.match(new RegExp("\\[" + versionless(shortname) + "\\]"))
              || x.title.match(new RegExp("\\[" + shortname + "\\]"))
              || x.title.match(new RegExp("\\[" + tr_shortname + "\\]"))
              || x.title.match(new RegExp("\\[" + versionless(tr_shortname) + "\\]"));
   };

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
    const staticaly = url.match(/^https:\/\/cdn.staticaly.com\/gh\/([^\/]*)\/([^\/]*)/);
    if (staticaly) {
        return {owner: staticaly[1], name: staticaly[2], issuefilter: nofilter};
    }
    const whatwg = url.match(/https:\/\/([^\.]*).spec.whatwg.org\//);
    if (whatwg) {
        return {owner: "whatwg", name: whatwg[1], issuefilter: nofilter};
    }

    const csswg = url.match(/^https?:\/\/drafts.csswg.org\/([^\/]*)\/?/);
    if (csswg) {
        return {owner: 'w3c', name: 'csswg-drafts', issuefilter: cssIssueFilter(csswg[1])};
    }
    const devcss = url.match(/^https?:\/\/dev.w3.org\/csswg\/([^\/]*)\/?/);
    if (devcss) {
        return {owner: 'w3c', name: 'csswg-drafts', issuefilter: cssIssueFilter(devcss[1])};
    }
    const devfxtf = url.match(/^https?:\/\/dev.w3.org\/fxtf\/([^\/]*)\/?/);
    if (devfxtf) {
        return {owner: 'w3c', name: 'fxtf-drafts', issuefilter: cssIssueFilter(devfxtf[1])};
    }
    const ghfxtf = url.match(/^https:\/\/drafts.fxtf.org\/([^\/]*)\/?/);
    if (ghfxtf) {
        return {owner: 'w3c', name: 'fxtf-drafts', issuefilter: cssIssueFilter(ghfxtf[1])};
    }
    const houdini = url.match(/^https:\/\/drafts.css-houdini.org\/([^\/]*)\/?/);
    if (houdini) {
        return {owner: 'w3c', name: 'css-houdini-drafts', issuefilter: cssIssueFilter(houdini[1])};
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


const selectedgroups = process.argv[3] ? process.argv[3].split(",") : false;
const restrictGroups = g => !selectedgroups || selectedgroups.includes(g);

fs.readFile("./groups.json", (err, data) => {
    if (err) return console.error(err);
    const groups = JSON.parse(data);

    const updateIssues = process.argv[2] == "--update-issues";

  if (!updateIssues)
    fs.writeFileSync("./pergroup/repo-update.json", JSON.stringify(new Date()));

  Object.keys(groups).filter(restrictGroups).forEach(wgid => {
        fs.readFile("./pergroup/" + wgid + ".json", (err, data) => {
            const specs = JSON.parse(data);
            Promise.all(
                specs.map(s => Object.assign({}, s, {repo: urlToGHRepo(s.editorsdraft, s.shortname)}))
                    .filter(s => s.repo)
                    .map(s => {
                        const hash = {}
                        hash[s.shortlink] = {repo: s.repo, recTrack: s.versions[0]['rec-track']};
                        hash[s.shortlink].issuefilter = s.repo.issuefilter;
                        if (updateIssues) {
                            return queueGhRequest('https://api.github.com/repos/' + s.repo.owner + '/' + s.repo.name + '/issues?state=all&per_page=100')
                                .then(issues => {
                                    hash[s.shortlink]["issues"] = issues.filter(s.repo.issuefilter)
                                        .map(i => {
                                     return {state: i.state, number: i.number, created_at: i.created_at, closed_at: i.closed_at, title: i.title, labels: i.labels, assignee: i.assignee ? i.assignee.login: null, isPullRequest: i.pull_request !== undefined};
                                        });
                                    return hash;
                                }).catch(console.error.bind(console));
                        } else {
                            // we re-use the previously fetched issues
                            return new Promise((res, rej) => {
                                fs.readFile("./pergroup/" + wgid + "-repo.json", (err, data) => {
                                    if (err) return rej(err);
                                    const repos = JSON.parse(data);
                                    hash[s.shortlink].issues = (repos[s.shortlink] || repos[httpIze(s.shortlink)] || {}).issues ;
                                    res(hash);
                                });
                            });
                        }
                    })
            ).then(repoHashList => {
                const repoSpecs = repoHashList.reduce(
                    (a,b) => {a[Object.keys(b)[0]] = b[Object.keys(b)[0]]; return a;},
                    {});
                fs.writeFileSync("./pergroup/" + wgid + "-repo.json", JSON.stringify(repoSpecs,null, 2));
            }).catch(console.error.bind(console));
        });
    });
});
