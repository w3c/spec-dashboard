(function() {
    const now = new Date();
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
            Object.keys(milestoneData).forEach(s => {
                Object.keys(milestoneData[s]).filter(m => m === milestone || milestone === "*").forEach(m => {
                    if (test(milestoneData[s][m])) {
                        const li = specLink(extractSpecData(s, specData));
                        li.appendChild(document.createTextNode(" (" + groupname + ") : " + milestoneData[s][m]));
                        el.appendChild(li);
                    }
                });
            });
        };
    };

    const extractSpecData = (shortlink, specs) => specs.filter(s => s.shortlink === shortlink)[0];

    fetch("groups.json")
        .then(r => r.json())
        .then(groups => {
            for (let gid in groups) {
                const specDataPromise = fetch("./pergroup/" + gid + ".json")
                    .then(r => r.json());
                const milestoneDataPromise = fetch("./pergroup/" + gid + "-milestones.json")
                      .then(r => r.json());
                const repoDataPromise = fetch("./pergroup/" + gid + "-repo.json")
                      .then(r => r.json());
                const groupnamePromise = new Promise((res) => res(groups[gid].name));
                Promise.all([specDataPromise, milestoneDataPromise, repoDataPromise, groupnamePromise])
                    .then(([specData, milestoneData, repoData, groupname]) => {
                        const count = document.getElementById('count');
                        const reccount = document.getElementById('reccount');
                        count.textContent = parseInt(count.textContent, 10) + specData.length;
                        reccount.textContent = parseInt(reccount.textContent, 10) + specData.filter(s => s.versions[0]["rec-track"]).length;

                        const upcoming = d => new Date(d) < monthFromNow(4);
                        const upcoming6 = d => new Date(d) < monthFromNow(6);
                        listMilestoneTest("upcomingwr", "WR/LC", upcoming)(milestoneData, specData, groupname);
                        listMilestoneTest("upcomingcr", "CR", upcoming)(milestoneData, specData, groupname);
                        listMilestoneTest("upcomingpr", "PR", upcoming6)(milestoneData, specData, groupname);

                        listMilestoneTest("beyondcharter", "*", d => d > groups[gid].end)(milestoneData, specData, groupname);

                        var abandoned = document.querySelector("#abandoned ol");
                        var longRunning = document.querySelector("#longrunning ol");
                        var noRepo = document.querySelector("#norepo ol");
                        var noEd = document.querySelector("#noed ol");
                        Object.keys(specData).filter(s => specData[s].versions[0]["rec-track"]).forEach(s => {
                            const spec = specData[s];
                            if (new Date(spec.versions[0].date) < monthFromNow(-36)) {
                                const li = specLink(spec);
                                li.appendChild(document.createTextNode(": " + spec.versions[0].date));
                                abandoned.appendChild(li);
                            }
                            if (new Date(last(spec.versions).date) < monthFromNow(-60)) {
                                const li = specLink(spec);
                                li.appendChild(document.createTextNode(": " + last(spec.versions).date));
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
            }
        });
})();
