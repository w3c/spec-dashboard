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
                var specDataPromise = fetch("./pergroup/" + gid + ".json")
                    .then(r => r.json());
                var milestoneDataPromise = fetch("./pergroup/" + gid + "-milestones.json")
                    .then(r => r.json());
                Promise.all([specDataPromise, milestoneDataPromise])
                    .then(([specData, milestoneData]) => {
                        const upcoming = d => new Date(d) < monthFromNow(4);
                        listMilestoneTest("upcomingwr", "WR/LC", upcoming)(milestoneData, specData, groups[gid].name);
                        listMilestoneTest("upcomingcr", "CR", upcoming)(milestoneData, specData, groups[gid].name);

                        listMilestoneTest("beyondcharter", "*", d => d > groups[gid].end)(milestoneData, specData, groups[gid].name);

                        var abandonned = document.querySelector("#abandonned ol");
                        var longRunning = document.querySelector("#longrunning ol");
                        Object.keys(specData).forEach(s => {
                            const spec = specData[s];
                            if (new Date(spec.versions[0].date) < monthFromNow(-36)) {
                                const li = specLink(spec);
                                li.appendChild(document.createTextNode(": " + spec.versions[0].date));
                                abandonned.appendChild(li);
                            }
                            console.log(last(spec.versions).date);
                            if (new Date(last(spec.versions).date) < monthFromNow(-60)) {
                                const li = specLink(spec);
                                li.appendChild(document.createTextNode(": " + last(spec.versions).date));
                                longrunning.appendChild(li);
                            }
                        });
                    });
            }
        });
})();
