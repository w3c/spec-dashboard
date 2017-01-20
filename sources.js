fetch("groups.json")
    .then(r => r.json())
    .then(groups => {
        const toc = document.getElementById("sources");
        Object.keys(groups)
            .sort((a,b) => groups[a].name.localeCompare(groups[b].name))
            .forEach(gid => {
                const li = document.createElement("li");
                const link = document.createElement("a");
                link.href = groups[gid].url;
                link.textContent = "On-line spreadsheet with " + groups[gid].name + "'s milestones";
                li.appendChild(link);
                toc.appendChild(li);
            });
    });
