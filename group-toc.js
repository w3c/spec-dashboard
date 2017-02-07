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
