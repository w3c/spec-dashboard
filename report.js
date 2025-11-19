{
    const now = new Date();

    const upcoming = d => new Date(d) < monthFromNow(4);
    const upcoming6 = d => new Date(d) < monthFromNow(6);
    const outdated = d => new Date(d) < now;

  const monthFrom = (n, d) => new Date(new Date(d).setMonth(d.getMonth() + n));
  const monthFromNow = (n) => monthFrom(n, now);
    const last = a => a[a.length - 1];

    const specLink = (spec) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = spec.shortlink;
        a.textContent = spec.title;
        li.appendChild(a);
        return li;
    }

    const fetchJSON = path => fetch(path).then(r => r.json()).catch(e => { console.error(`Loading JSON from ${path} failed with`); console.error(e);});
    const schemeLess = url => url.split(':').slice(1).join(':');
    const extractSpecData = (shortlink, specs) => specs.filter(s => schemeLess(s.shortlink) === schemeLess(shortlink))[0];

    fetchJSON("groups.json")
        .then(groups => {
            return Promise.all(Object.keys(groups).map(gid =>  {
                const specDataPromise = fetchJSON("./pergroup/" + gid + ".json");
                const repoDataPromise = fetchJSON("./pergroup/" + gid + "-repo.json");
                const groupnamePromise = new Promise((res) => res(groups[gid].name));
                return Promise.all([specDataPromise, repoDataPromise, groupnamePromise])
                    .then(([specData, repoData, groupname]) => {
                        const count = document.getElementById('count');
                        const reccount = document.getElementById('reccount');
                      count.textContent = parseInt(count.textContent, 10) + (specData?.length ?? 0);
                        reccount.textContent = parseInt(reccount.textContent, 10) + specData?.filter(s => s.versions[0]["rec-track"] ?? 0).length;


		      const lateCRSnapshot = document.querySelector("#latecrs ol");
                        lateCRSnapshot.setAttribute("data-sort", "span,a");
                        var abandoned = document.querySelector("#abandoned ol");
                        abandoned.setAttribute("data-sort", "span,a");
                        var longRunning = document.querySelector("#longrunning ol");
                        longRunning.setAttribute("data-sort", "span,a");
                        const noRepo = document.querySelector("#norepo ol");
                        noRepo.setAttribute("data-sort", "a");
                        var noEd = document.querySelector("#noed ol");
                        noEd.setAttribute("data-sort", "a");
                      Object.keys(specData ?? {}).filter(s => specData[s].versions[0]["rec-track"]).forEach(s => {
                          const spec = specData[s];
			if (spec.versions[0].status === "Candidate Recommendation Draft") {
			  const crd = spec.versions[0];
			  const crs = spec.versions.find(v => v.status === "Candidate Recommendation Snapshot");
			  if (new Date(crs.date) < monthFrom(-24, new Date(crd.date))) {
			    const age = Math.floor((new Date(crd.date) - new Date(crs.date)) / (1000*3600*24*30));
			    const li = specLink(spec);
			    const date = document.createElement("span");
                            date.append(crs.date);
			    li.append(": last CRS on ", date, " (" + age + " months from CRD)");
			      lateCRSnapshot.appendChild(li);
			    }
			  }
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
                    for (const selector of sortSelectors) {
                        const comp = li1.querySelector(selector).textContent.localeCompare(li2.querySelector(selector).textContent);
                        if (comp !== 0) return comp;
                    }
                    return 0;
                });
                ol.innerHTML = "";
                items.forEach(li => ol.appendChild(li));
            });
        });
}
