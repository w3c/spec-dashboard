function groupToc(groups, tocEl, baseHref) {
    Object.keys(groups)
        .sort((a,b) => groups[a].name.localeCompare(groups[b].name))
        .forEach(gid => {
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = baseHref + gid;
            link.textContent = groups[gid].name;
            li.appendChild(link);
            tocEl.appendChild(li);
        });
}


function specToc(specs, tocEl, baseHref) {
    specs.sort((a,b) => a.title.localeCompare(b.title))
        .forEach(spec => {
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = baseHref + spec.shortname;
            link.textContent = spec.title;
            li.appendChild(link);
            tocEl.appendChild(li);
        });
}
