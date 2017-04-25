var querystring = window.location.href.split('?')[1] || "";
if (querystring) {
    var comp = querystring.split("&");
    var groupid = comp[0].split("=")[1];
    if (comp[1]) {
        var shortname = comp[1].split("=")[1];
    }
}

const logError = err => document.querySelector("#msg").textContent = err;

fetch("groups.json")
    .then(r => r.json())
    .then(groups => {
        if (!groupid) {
            document.querySelector("body").appendChild(document.createElement("ol"));
            groupToc(groups, document.querySelector("ol"), "issues.html?groupid=");
        } else {
            fetch("pergroup/" + groupid + ".json")
                .then( r => r.json())
                .then(specs => {
                    fetch("pergroup/" + groupid + "-repo.json")
                        .then(r => r.json())
                        .then(repos => {
                            if (!shortname) {
                                document.querySelector("title").textContent += " for " + groups[groupid].name;
                                document.querySelector("h1").textContent += " for " + groups[groupid].name;

                                document.querySelector("body").appendChild(document.createElement("ol"));
                                const annotatedSpecs = specs.map(s => {if (!repos[s.shortlink]) return s; const a = Object.assign({}, s); a.title = s.title + " (" + repos[s.shortlink].issues.filter(i => !i.isPullRequest && i.state == "open").length + " open issues)"; return a;});
                                specToc(annotatedSpecs, document.querySelector("ol"), "issues.html?groupdi=" + groupid + "&shortname=");
                            } else {
                                const spec = specs.filter(s => s.shortname === shortname)[0];
                                document.querySelector("title").textContent += " for " + spec.title;
                                document.querySelector("h1").textContent += " for "+ spec.title;
                                dashboard(repos[spec.shortlink]);
                            }
                        });
                });
        }
    }).catch(logError);

function dashboard(repoinfo) {
    const issues = repoinfo.issues.filter(i => !i.isPullRequest);
    const repo = repoinfo.repo;
    var margin = {top: 30, right: 50, bottom: 30, left: 50},
        width = 800 - margin.left - margin.right,
        height = 800 - margin.top - margin.bottom;

    // Set the ranges
    var x = d3.scaleTime().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);


    // Define the axes
    var xAxis = d3.axisBottom(x).ticks(10);
    var yAxis = d3.axisLeft(y).ticks(10);

    // Adds the svg canvas
    var svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right + 300)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")");
    svg.append("g")
        .attr("class", "y axis");

    const addMonth = (date, n) => new Date(new Date(date).setMonth(date.getMonth() + n));

    const dateFormat = d3.timeFormat("%Y-%m-%d") ;
    const parseDate = d3.timeParse("%Y-%m");
    const parseMonth = d3.timeParse("%Y-%m");

    var now = new Date();
    var month6 = addMonth(now, 6);

    var durations = {"-1": "issue closed during that month", 0: "issue raised during that month", 1: "1 month old", 6: "6 months old", 24: "2 years old"};
    var durationColorScheme = d3.scaleLinear().domain([-1, 0, 1, 6, 24])
        .range([ "#66f", "#afa", "white", "yellow","red"]);

    const durationColor = (d1, d2) => durationColorScheme((d2-d1) / (30*3600*24*1000));

    var legendRectSize = 20, legendSpacing = 5;
    var legendLeft =  width + margin.right;
    var legend = d3.select('svg')
        .append("g")
        .attr("class", "legendbox")
        .selectAll("g")
        .data(Object.keys(durations))
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
            var y = (i+1) * legendRectSize;
            return 'translate(' + legendLeft + ',' + y + ')';
        });

    legend.append('rect')
        .attr('stroke-width', 1)
        .attr('stroke', '#333')
        .attr('width', 20)
        .attr('height',15)
        .attr('fill', durationColorScheme);

    legend.append('text')
        .attr('x', 20 + legendSpacing )
        .attr('y', legendRectSize - legendSpacing)
        .text(d =>  durations[d]);


    var months = {};
    issues.forEach(function(i) {
        i.months = [];
        const startMonth = i.created_at.slice(0,7);
        const endMonth = i.closed_at ? i.closed_at.slice(0,7) : dateFormat(addMonth(now, 1)).slice(0,7);
        let curMonth = startMonth;
        while (curMonth <= endMonth) {
            i.months.push(curMonth);
            if (!months[curMonth])  months[curMonth] = [];
            months[curMonth].push(i.number);
            curMonth = dateFormat(addMonth(parseMonth(curMonth), 1)).slice(0,7);
        }
    });
    x.domain(d3.extent(Object.keys(months), m => parseDate(m))).nice();
    y.domain([0, d3.max(Object.keys(months).map(k => months[k].length))]).nice();
    svg.select("g.x.axis").call(xAxis);
    svg.select("g.y.axis").call(yAxis);
    svg.append("text")
        .attr("x", -15)
        .attr("y", -10)
        .attr("font-size", 10)
        .text("Open Issues");

    var barWidth = x(parseDate('2015-06')) - x(parseDate('2015-05'));
    var barHeight = height / y.domain()[1];
    svg.selectAll("a.issue").data(issues)
        .enter()
        .append("a")
        .attr("xlink:href", d => 'https://github.com/' + repo.owner + "/" + repo.name + '/issues/' + d.number)
        .attr("class", d => "issue issue" + d.number)
        .selectAll("rect")
        .data(i => i.months)
        .enter()
        .append("rect")
        .attr('fill', function(d) { const issue = d3.select(this.parentNode).datum(); if (issue.closed_at && issue.closed_at.slice(0,7) == d) { return durationColorScheme(-1) } else { return durationColor(parseDate(issue.created_at.slice(0,7)), parseDate(d));}})
        .attr("stroke-width", "1")
        .attr("stroke", "#000")
        .attr("x", d => x(parseDate(d)))
        .attr("y", function(d,i) { const issue = d3.select(this.parentNode).datum(); return y(months[d].indexOf(issue.number) + 1);})
        .attr("width", barWidth)
        .attr("height", barHeight)
        .append("title")
        .text(function(d) { const issue = d3.select(this.parentNode.parentNode).datum(); return "#" + issue.number + " " + issue.title; });

    svg.selectAll("g.month").data(Object.keys(months)).enter()
        .append("g")
        .attr("class", "month")
        .append("text")
        .attr("class", "total")
        .attr("x", d => x(parseDate(d)))
        .attr("y", d => y(months[d].length + 1))
        .text(d => months[d].length)
        .append("title")
        .text(d => months[d].length + " open issues in " + d);

    var toggle = d3.select("body")
        .append("button")
        .text("Switch to issue trail");

    toggle.on("click", function() {
        if (toggle.text() === "Switch to issue trail") {
            toggle.text("Switch to issue stack");
            drawHistory();
        } else {
            toggle.text("Switch to issue trail");
            drawStack();
        }
    });

    function drawStack() {
        y.domain([0, d3.max(Object.keys(months).map(k => months[k].length))]).nice();
        svg.select("g.y.axis").call(yAxis);
        svg.selectAll("a.issue")
            .selectAll("rect")
            .transition().duration(1500)
            .attr("y", function(d,i) { const issue = d3.select(this.parentNode).datum(); return y(months[d].indexOf(issue.number) + 1);})
            .attr("stroke-width", 1)
            .attr("height", barHeight);
        svg.selectAll("text.total")
           .transition().duration(1500)
            .attr("y", d => y(months[d].length + 1));
    }
    function drawHistory() {
        y.domain([0, issues.length]).nice();
        svg.select("g.y.axis").call(yAxis);
        svg.selectAll("a.issue")
            .selectAll("rect")
           .transition().duration(1500)
            .attr("y", function(d) { const issue = d3.select(this.parentNode).datum(); return y(issues.map(i => i.number).indexOf(issue.number));})
            .attr("height", height / issues.length)
            .attr("stroke-width", 0);
        svg.selectAll("text.total")
           .transition().duration(1500)
            .attr("y", d => y(months[d].length + 1));
    }

}
