{
    const now = new Date();

    const upcoming = d => new Date(d) < monthFromNow(4);
    const upcoming6 = d => new Date(d) < monthFromNow(6);
    const outdated = d => new Date(d) < now;

    const monthFromNow = (n) => new Date(new Date().setMonth(now.getMonth() + n));
    const last = a => a[a.length - 1];

    const specLink = (spec) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = spec.shortlink;
        a.textContent = spec.title;
        li.appendChild(a);
        return li;
    }

    const listMilestoneTest = (id, milestone, test) => {
        return (milestoneData, specData, groupname) => {
            const el = document.querySelector("#" + id + " ol");
            if (!el) return console.error("Invalid id " + id);
            el.setAttribute("data-sort", "span,a")
            Object.keys(milestoneData).forEach(s => {
                Object.keys(milestoneData[s]).filter(m => m === milestone || milestone === "*").forEach(m => {
                    if (test(milestoneData[s][m])) {
                        const spec = extractSpecData(s, specData);
                        if (spec) {
                            const li = specLink(spec);
                            const date = document.createElement("span");
                            date.appendChild(document.createTextNode(milestoneData[s][m]));
                            if (outdated(milestoneData[s][m])) date.className='outdated';
                            li.appendChild(document.createTextNode(" (" + groupname + ") : "));
                            li.appendChild(date);
                            el.appendChild(li);
                        } else {
                            console.error("Could not find data on " + s);
                        }
                    }
                });
            });
        };
    };

    const schemeLess = url => url.split(':').slice(1).join(':');
    const extractSpecData = (shortlink, specs) => specs.filter(s => schemeLess(s.shortlink) === schemeLess(shortlink))[0];

    fetch("groups.json")
        .then(r => r.json())
        .then(groups => {
            return Promise.all(Object.keys(groups).map(gid =>  {
                const specDataPromise = fetch("./pergroup/" + gid + ".json")
                    .then(r => r.json());
                const milestoneDataPromise = fetch("./pergroup/" + gid + "-milestones.json")
                      .then(r => r.json());
                const repoDataPromise = fetch("./pergroup/" + gid + "-repo.json")
                      .then(r => r.json());
                const groupnamePromise = new Promise((res) => res(groups[gid].name));
                return Promise.all([specDataPromise, milestoneDataPromise, repoDataPromise, groupnamePromise])
                    .then(([specData, milestoneData, repoData, groupname]) => {
                        const count = document.getElementById('count');
                        const reccount = document.getElementById('reccount');
                        count.textContent = parseInt(count.textContent, 10) + specData.length;
                        reccount.textContent = parseInt(reccount.textContent, 10) + specData.filter(s => s.versions[0]["rec-track"]).length;

                        listMilestoneTest("upcomingwr", "WR/LC", upcoming)(milestoneData, specData, groupname);
                        listMilestoneTest("upcomingcr", "CR", upcoming)(milestoneData, specData, groupname);
                        listMilestoneTest("upcomingpr", "PR/PER", upcoming6)(milestoneData, specData, groupname);

                        listMilestoneTest("beyondcharter", "*", d => d > groups[gid].end)(milestoneData, specData, groupname);

                        var abandoned = document.querySelector("#abandoned ol");
                        abandoned.setAttribute("data-sort", "span,a");
                        var longRunning = document.querySelector("#longrunning ol");
                        longRunning.setAttribute("data-sort", "span,a");
                        var noRepo = document.querySelector("#norepo ol");
                        norepo.setAttribute("data-sort", "a");
                        var noEd = document.querySelector("#noed ol");
                        noEd.setAttribute("data-sort", "a");
                        Object.keys(specData).filter(s => specData[s].versions[0]["rec-track"]).forEach(s => {
                            const spec = specData[s];
                            if (new Date(spec.versions[0].date) < monthFromNow(-36)) {
                                const li = specLink(spec);
                                const date = document.createElement("span");
                                date.appendChild(document.createTextNode(spec.versions[0].date));
                                li.appendChild(document.createTextNode(": "));
                                li.appendChild(date);
                                abandoned.appendChild(li);
                            }
                            if (new Date(last(spec.versions).date) < monthFromNow(-60)) {
                                const li = specLink(spec);
                                const date = document.createElement("span");
                                date.appendChild(document.createTextNode(last(spec.versions).date));
                                li.appendChild(document.createTextNode(": "));
                                li.appendChild(date);
                                longRunning.appendChild(li);
                            }
                            if (!repoData[spec.shortlink]) {
                                const li = specLink(spec);
                                li.appendChild(document.createTextNode(": "));
                                if (spec.editorsdraft) {
                                    const edDraft = document.createElement("a");
                                    edDraft.href = spec.editorsdraft;
                                    edDraft.textContent = "editors draft on " + edDraft.hostname;
                                    li.appendChild(edDraft);
                                    noRepo.appendChild(li);
                                } else {
                                    li.appendChild(document.createTextNode("No editors draft known"));
                                    noEd.appendChild(li);
                                }
                            }
                        });
                    });
            }))
        }, console.error.bind(console))
        .then(() => {
            // Sort lists as appropriate
            [...document.querySelectorAll("ol[data-sort]")].forEach(ol => {
                const sortSelectors = ol.dataset.sort.split(',');
                const items = [...ol.children];
                items.sort((li1, li2) => {
                    for (i = 0 ; i < sortSelectors.length; i++) {
                        const comp = li1.querySelector(sortSelectors[i]).textContent.localeCompare(li2.querySelector(sortSelectors[i]).textContent);
                        if (comp !== 0) return comp;
                    }
                    return 0;
                });
                ol.innerHTML = "";
                items.forEach(li => ol.appendChild(li));
            });
        });
}
