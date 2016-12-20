const fs = require('fs'),
      request = require('request');

function normalizeDate(d) {
    if (d.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return d;
    } else if (d.match(/^[0-9]{4}-[0-9]{2}$/)) {
        return d + "-31";
    } else if (d.match(/^Q[0-9] [0-9]{4}$/)) {
        return d.slice(3) + "-" + ("0" + ("" + parseInt(d.slice(1,2), 10)*3)).slice(-2) + "-31";
    } else {
        console.error("Unrecognized date " + d)
    }
}

const milestoneStages=["", "FPWD", "WR/LC", "CR", "", "PR/PER", "PR/PER", "REC"];

fs.readFile("./groups.json", (err, data) => {
    if (err) return console.error(err);
    const groups = JSON.parse(data);

    Object.keys(groups).forEach(wgid => {
        request({
            method: 'GET',
            url: groups[wgid].url + '.csv.json',
        }, function (error, response, body) {
            const spreadsheet = JSON.parse(body);
            // Produce an object à la
            // { "https://www.w3.org/TR/foo" : {CR: "2017-03-31", "PR/PER": "2016-06-30"}}
            const milestones = spreadsheet.slice(1).reduce((cumul, row) => {
                cumul[row[0]] = row.reduce( (a, b, i) => {
                    if (b && milestoneStages[i]) a[milestoneStages[i]] = normalizeDate(b);
                    return a;
                }, {});
                return cumul;
            }, {});

            fs.writeFileSync("./pergroup/" + wgid + "-milestones.json", JSON.stringify(milestones, null, 2));
        });
    });
});
