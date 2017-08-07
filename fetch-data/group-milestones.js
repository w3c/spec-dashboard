const fs = require('fs'),
      request = require('request');

function normalizeDate(d, uri) {
    if (d.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return d;
    } else if (d.match(/^[0-9]{4}-[0-9]{2}$/)) {
        return d + "-28";
    } else if (d.match(/^Q[0-9] [0-9]{4}$/)) {
        return d.slice(3) + "-" + ("0" + ("" + parseInt(d.slice(1,2), 10)*3)).slice(-2) + "-30";
    }  else if (d.match(/^[0-9]Q [0-9]{4}$/)) {
        return d.slice(3) + "-" + ("0" + ("" + parseInt(d.slice(0,1), 10)*3)).slice(-2) + "-30";
    } else {
        console.error((uri? "In " + uri + " : ": "") + "Unrecognized date " + d)
    }
}

const milestoneStages=["", "FPWD", "WR/LC", "CR", "", "PR", "REC"];

fs.readFile("./groups.json", (err, data) => {
    if (err) return console.error(err);
    const groups = JSON.parse(data);

    fs.writeFileSync("./pergroup/milestone-update.json", JSON.stringify(new Date()));

    Object.keys(groups).forEach(wgid => {
        request({
            method: 'GET',
            url: groups[wgid].url + '.csv.json',
        }, function (error, response, body) {
            let spreadsheet;
            try {
                spreadsheet = JSON.parse(body);
            } catch (e) {
                console.error("Failed to parse " + groups[wgid].url + " as JSON:" + e);
                return;
            }
            // Produce an object à la
            // { "https://www.w3.org/TR/foo" : {CR: "2017-03-31", "PR": "2016-06-30"}}
            const milestones = spreadsheet.slice(1).reduce((cumul, row) => {
                cumul[row[0]] = row.reduce( (a, b, i) => {
                    if (b && milestoneStages[i]) a[milestoneStages[i]] = normalizeDate(b, groups[wgid].url);
                    return a;
                }, {});
                return cumul;
            }, {});

            fs.writeFileSync("./pergroup/" + wgid + "-milestones.json", JSON.stringify(milestones, null, 2));
        });
    });
});
