var margin = {top: 30, right: 50, bottom: 30, left: 50},
    width = 800 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;
var dateFormat = d3.timeFormat("%Y-%m-%d") ;
var parseDate = d3.timeParse("%Y-%m-%d");

// Set the ranges
var x = d3.scaleTime().range([0, width]);
var y = d3.scaleBand().range([height, 0]);

y.domain(["FPWD", "WD", "WR/LC", "CR", "PR/PER", "REC"])

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
};

// Define the axes
var xAxis = d3.axisBottom(x).ticks(17);
var yAxis = d3.axisLeft(y).ticks(6);
yAxis.scale(y)

// Adds the svg canvas
var svg = d3.select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right + 300)
    .attr("height", height + margin.top + margin.bottom)
    .style("background-color", "#333")
    .append("g")
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

var radius = 4;

var groupid = window.location.href.split('?')[1];

var now = new Date();
var defaultExtent = [new Date().setMonth(now.getMonth() - 24), new Date().setMonth(now.getMonth() + 6)];
x.domain(defaultExtent).nice();

var zoom = d3.zoom()
    .translateExtent([[x(parseDate("1994-01-01")),0],[x(parseDate("2020-12-31")) + 400 + margin.right,height]])
    .scaleExtent([.1,5]);
svg.append("rect")
    .attr("class", "pane")
    .attr("fill", "none")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top)
    .attr("y", -margin.top)
    .attr("x", -margin.left)
    .call(zoom);

svg.append("line")
    .attr("class", "today")
    .attr("y1", height)
    .attr("y2", -5)
    .style("stroke-width", 2)
        .style("stroke", "#FAA");
svg.append("text")
    .attr("class", "today")
    .attr("y", -5)
    .attr("text-anchor", "end")
    .text("Today");

var legendRectSize = 20, legendSpacing = 5;
var legend = d3.select('svg')
    .append("g")
    .attr("class", "legendbox")
    .selectAll("g")
    .data([-1, 0,1,2,3,4,5,6])
    .enter()
    .append('g')
    .attr('class', 'legend')
    .attr('transform', function(d, i) {
        var x = width + margin.right + 10;
        var y = i * legendRectSize;
        return 'translate(' + x + ',' + y + ')';
    });

/*d3.select("g.legendbox")
    .append('foreignObject')
    .attr("width", 320)
    .attr("height", 30)
    .attr("x", width + margin.right + 10)
    .attr("y", 9*legendRectSize)
    .append('xhtml:select')
    .attr('id', 'groupSelector')
    .append('option').text("View a specific group…")
;
d3.select('select')
    .selectAll("option.group")
    .data(d3.values([]).sort((a,b) => a.name < b.name ? -1 : 1))
    .enter()
    .append("option")
    .attr("class","group")
    .attr("value", d => d.id)
    .property("selected", d => location.hash === '#g' + d.id ? 'selected'  : null)
    .text(d => d.name.replace("Working Group", "WG"));

document.getElementById('groupSelector')
    .addEventListener('change', function(e) {
        location.hash = '#g' + this.options[this.selectedIndex].value;
    });
window.addEventListener("hashchange", updateView);
*/

const line = ((xscale,specOffset) => d3.line()
              .x(d => xscale(parseDate(d.date)))
              .y(d => y(statusNormalizer(d)) + specOffset(d.shortname)));

d3.json('pergroup/' + groupid + '.json', (err, specs) => {
    const specOffset = d3.scaleBand().range([0, y.bandwidth()]).domain(specs.map(s => s.shortname));
    svg.selectAll("path.spechistory")
        .data(specs)
        .enter()
        .append("path")
        .datum(d => d.versions.map(v => {v.shortname = d.shortname; return v;}))
        .attr("class", "spechistory");

    svg.selectAll("path.lastpub")
        .data(specs)
        .enter()
        .append("path")
        .datum(d => {const lastVersion = d.versions[0]; lastVersion.shortname = d.shortname; return [lastVersion, Object.assign({}, lastVersion, {date: dateFormat(now)})];})
        .attr("class", "lastpub")
        .attr("stroke", d => durationColor(parseDate(d[0].date), now));

    svg.selectAll("g.pub")
        .data(specs)
        .enter()
        .append("g")
        .attr("class", "pub")
        .selectAll("circle")
        .data(s => s.versions)
        .enter()
        .append("circle")
        .attr("r", 5)
        .attr("cy", d => y(statusNormalizer(d)) + specOffset(d.shortname))
        .attr("class", d => statusNormalizer(d).split('/')[0])
        .append("title")
            .text(d => statusNormalizer(d) + " of " + d.title);
    const draw = drawer(specOffset);
    zoom.on("zoom", draw)
    draw();

});

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


var drawer = (specOffset => u => {
    var transform = d3.event ? d3.event.transform : d3.zoomIdentity;
    var xNewScale = transform.rescaleX(x);
    xAxis.scale(xNewScale)
    svg.select("g.x.axis").call(xAxis);

    var now = new Date();
    svg.selectAll("line.today")
        .attr("x1", xNewScale(now))
        .attr("x2", xNewScale(now));
    svg.selectAll("text.today")
        .attr("x", xNewScale(now));
    svg.selectAll("path.spechistory")
        .attr("d", line(xNewScale, specOffset));
    svg.selectAll("path.lastpub")
        .attr("d", line(xNewScale, specOffset));

    svg.selectAll("circle")
        .attr("cx", d => xNewScale(parseDate(d.date)))

});

