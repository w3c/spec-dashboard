var groupid = window.location.href.split('?')[1];

const last = a => a[a.length - 1];
const shortNamer = url => last(url.split('/').filter(x => x));
const dateFormat = d3.timeFormat("%Y-%m-%d") ;
const parseDate = d3.timeParse("%Y-%m-%d");

const logError = err => document.querySelector("#msg").textContent = err;

const recStages = ["FPWD", "WD", "WR/LC", "CR", "PR/PER", "REC"];
// structure of the columns in the spreadsheet
// matched to the list of stages known here

function futureVersions(spec, specMilestones, milestoneOnly = false) {
    const lastVersion = spec.versions[0];
    var now =  new Date();
    // By default, if we don't know, we just keep the current line
    var future = [Object.assign({}, lastVersion, {date: dateFormat(now)})];
    if (!Object.keys(specMilestones).length) return milestoneOnly ? [] : future;
    var minDate = Math.min.apply(null, Object.keys(specMilestones).map(k => parseDate(specMilestones[k]))); 
    // We ignore milestones if one of the date is anterior to now or if none were set
    if (minDate >= now.getTime()) {
        future = Object.keys(specMilestones)
            .sort((a,b) => specMilestones[a].localeCompare(specMilestones[b])) // sort by date
            .map(d => Object.assign({}, lastVersion, {date: specMilestones[d], status: d}));
    } else {
        console.error("Ignored milestones for " + spec.shortname + " as it contains dates anterior to today");
    }
    return future;
}
fetch("groups.json")
    .then(r => r.json())
    .then(groups => {
        groupToc(groups, document.getElementById("toc"), "./?");
        if (groupid) {
            dashboard(groupid, groups[groupid]);
            if (groups[groupid]) {
                document.querySelector("title").textContent += " for "+ groups[groupid].name;
                document.querySelector("h1").textContent += " for "+ groups[groupid].name;
            }
        } else {
            const toc = document.getElementById("toc");
            toc.id = "";
            document.getElementById("content").appendChild(toc.cloneNode(true));
        }
    }).catch(logError);

function dashboard(groupid, group) {
    var margin = {top: 30, right: 50, bottom: 30, left: 50},
        width = 800 - margin.left - margin.right,
        height = 800 - margin.top - margin.bottom;

    // Set the ranges
    var x = d3.scaleTime().range([0, width]);
    var y = d3.scaleBand().range([height, 0]);

    y.domain(recStages)

    var durationColorScheme = d3.scaleLinear().domain([3, 6, 12, 24])
        .range(["#afa", "white", "yellow","red"]);

    const durationColor = (d1, d2) => durationColorScheme((d2-d1) / (30*3600*24*1000));

    const statusNormalizer = version => {
        switch(version.status) {
        case "Candidate Recommendation":
            return "CR";
        case "Proposed Recommendation":
        case "Proposed Edited Recommendation":
            return "PR/PER";
        case "Recommendation":
            return "REC";
        case "Last Call":
            return "WR/LC";
        case "Working Draft":
            if (version._links["predecessor-version"]) return "WD";
            return "FPWD";
        }
        return version.status;
    };

    function markerLine(svg, date, text) {
        const g = svg.append("g")
              .attr("class", "marker");
        const l = g
              .datum(date);
        l.append("line")
            .attr("y1", height)
            .attr("y2", -5)
            .style("stroke-width", 2)
            .style("stroke", "#FAA");
        l.append("text")
            .attr("y", -5)
            .attr("text-anchor", "end")
            .text(text);
        return g;
    }


    // Define the axes
    var xAxis = d3.axisBottom(x).ticks(17);
    var yAxis = d3.axisLeft(y).ticks(6);
    yAxis.scale(y)

    // Adds the svg canvas
    var svg = d3.select("#content")
        .append("svg")
        .attr("width", width + margin.left + margin.right + 300)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "#333")
        .append("g")
        .attr("aria-busy", true)
        .attr("transform", 
              "translate(" + margin.left + "," + margin.top + ")");
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // filter for background color on text
    var filter = d3.select("svg")
        .append("defs")
        .append("filter")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 1)
        .attr("height", 1)
        .attr("id", "solid");
    filter.append("feFlood")
        .attr("flood-color", "black")
        .attr("flood-opacity", "0.8");
    filter.append("feComposite")
        .attr("in", "SourceGraphic");

    const addMonth = (date, n) => new Date(new Date(date).setMonth(date.getMonth() + n));

    var radius = 4;

    var now = new Date();
    var month6 = addMonth(now, 6);
    var startDate = parseDate(group.start);
    var defaultExtent = [Math.max(startDate, addMonth(now, -24)), month6];
    x.domain(defaultExtent).nice();

    var lines = [];

    var zoom = d3.zoom()
        .translateExtent([[x(addMonth(startDate, -3)),0],[x(Math.max(addMonth(parseDate(group.end), 3), month6)) + 400 + margin.right,height]])
        .scaleExtent([.1,5]);
    svg.append("rect")
        .attr("class", "pane")
        .attr("fill", "none")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top)
        .attr("y", -margin.top)
        .attr("x", -margin.left)
        .call(zoom);

    lines.push(markerLine(svg, now, "Today"));

    lines.push(markerLine(svg, parseDate(group.start), "First charter"));

    lines.push(markerLine(svg, parseDate(group.end), "End of charter"));

    var legendRectSize = 20, legendSpacing = 5;
    var legendLeft =  width + margin.right + 100;
    var legend = d3.select('svg')
        .append("g")
        .attr("class", "legendbox")
        .attr('role', 'region')
        .selectAll("g")
        .data(recStages)
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
            var y = (i+1) * legendRectSize;
            return 'translate(' + legendLeft + ',' + y + ')';
        });

    legend.append("title")
        .text("Legend of the diagram");

    legend.append('circle')
        .attr('r', radius)
        .attr('cy', legendRectSize / 2)
        .attr('role', 'img')
        .attr('aria-labelledby', d => 'legend-' + d)
        .attr("class", d => statusNormalizer({status: d}).split('/')[0]);

    legend.append('text')
        .attr('id', d => 'legend-' + d)
        .attr('x', legendSpacing )
        .attr('y', legendRectSize - legendSpacing)
        .text(d =>  d);

    const historyLegend = d3.select("g.legendbox")
          .append('g')
          .attr('class','history')
          .attr('transform', 'translate(' + legendLeft + ',' + (recStages.length + 2) * legendRectSize + ')');
    historyLegend
        .append('path')
        .attr('role', 'img')
        .attr('aria-labelledby', 'legend-spechistory')
        .attr('class', 'spechistory')
        .attr('d', 'M0,10L20,10');

    historyLegend
        .append('text')
        .attr('id', 'legend-spechistory')
        .attr('x', legendRectSize + legendSpacing )
        .attr('y', legendRectSize - legendSpacing)
        .text('Spec history');


    const durationLegend = d3.select("g.legendbox")
        .selectAll("g.duration")
        .data([3, 6, 12, 24])
        .enter()
        .append('g')
        .attr('class','duration')
        .attr('transform', function(d, i) {
            var y = (recStages.length +i + 3) * legendRectSize;
            return 'translate(' + legendLeft + ',' + y + ')';
        });

    durationLegend.append('path')
        .attr('class', 'future')
        .attr('role', 'img')
        .attr('aria-labelledby', d => 'legend-spechistory-' + d)
        .attr('d', 'M0,10L20,10')
        .attr('stroke', durationColorScheme);

    durationLegend.append('text')
        .attr('x', legendRectSize + legendSpacing )
        .attr('y', legendRectSize - legendSpacing)
        .attr('id', d => 'legend-spechistory-' + d)
        .text(d => d + ' months since last publication');

    const line = ((xscale,specOffset) => d3.line()
                  .x(d => xscale(parseDate(d.date)))
                  .y(d => y(statusNormalizer(d)) + specOffset(d.shortname)));

    d3.json('pergroup/' + groupid + '.json', (err, specs) => {
        if (err) return logError(err);
        var drawer = (specOffset => u => {
            var transform = d3.event ? d3.event.transform : d3.zoomIdentity;
            var xNewScale = transform.rescaleX(x);
            xAxis.scale(xNewScale)
            svg.select("g.x.axis").call(xAxis);

            lines.forEach(l => {
                l.selectAll("line").attr("x1", xNewScale(l.datum()))
                    .attr("x2", xNewScale(l.datum()));
                l.selectAll("text").attr("x", xNewScale(l.datum()));
            });
            svg.selectAll("path.spechistory")
                .attr("d", line(xNewScale, specOffset));
            svg.selectAll("path.future")
                .attr("d", line(xNewScale, specOffset));

            svg.selectAll("circle")
                .attr("cx", d => xNewScale(parseDate(d.date)))

        });

        const recTrackSpecs = specs.filter(s => s.versions[0]["rec-track"]);
        const specOffset = d3.scaleBand().range([0, y.bandwidth()]).domain(specs.map(s => s.shortname));
        svg.selectAll("path.spechistory")
            .data(recTrackSpecs)
            .enter()
            .append("path")
            .datum(d => d.versions.map(v => {v.shortname = d.shortname; return v;}))
            .attr("class", "spechistory");


        svg.selectAll("g.pub")
            .data(recTrackSpecs)
            .enter()
            .append("g")
            .attr("class", "pub")
            .attr("role", "region")
            .selectAll("a")
            .data(s => s.versions)
            .enter()
            .append("a")
            .attr("href", d => d.uri)
            .append("circle")
            .attr("role", "img")
            .attr("r", 5)
            .attr("cy", d => y(statusNormalizer(d)) + specOffset(d.shortname))
            .attr("class", d => statusNormalizer(d).split('/')[0])
            .append("title")
            .text(d => statusNormalizer(d) + " of " + d.title + " on " + d.date);

        function drawFuture(err, milestones) {
            // Log but do not stop
            if (err) logError(err);

            // Normalize milestones to shortname instead of shortlink
            milestones = Object.keys(milestones).reduce((a, shortlink) => { const shortname = shortlink.replace(/https?:\/\/www.w3.org\/TR\/([^\/]*)\/?$/, '$1'); a[shortname] = milestones[shortlink]; return a;}, {});

            svg.attr("aria-busy", false)
            svg.selectAll("g.pub")
                .append("path")
                .datum(s => {const lastVersion = s.versions[0]; lastVersion.shortname = s.shortname; return [lastVersion].concat(futureVersions(s, milestones[s.shortname] || {})); })
                .attr("class", "future")
                .attr("stroke", d => durationColor(parseDate(d[0].date), now));

            svg.selectAll("g.pub")
                .selectAll("circle.futurepub")
                .data(s => futureVersions(s, milestones[s.shortname] || {}, true))
                .enter()
                .append("circle")
                .attr("class", "futurepub")
                .attr("role", "img")
                .attr("r", 5)
                .attr("cy", d => y(statusNormalizer(d)) + specOffset(d.shortname))
                .attr("class", d => statusNormalizer(d).split('/')[0])
                .append("title")
                .text(d => statusNormalizer(d) + " of " + d.title + " scheduled before " + d.date);

            draw();
        }
        const draw = drawer(specOffset);
        zoom.on("zoom", draw)
        drawFuture(null, {});

        d3.json("pergroup/" + groupid + '-milestones.json', drawFuture);

        function updateView() {
            document.querySelector("option[value='" + location.hash.slice(2) +"']")
                .selected = true;
            // needed because Chrome doesn't implement :target correctly?
            d3.selectAll("foreignObject[style]").attr("style", undefined);
            d3.select(document.querySelector("#" + location.hash.slice(1) + " foreignObject")).style("display", "block");
        };

        // Add the X Axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")");


    });
}
