const last = module.exports.last = a => a[a.length - 1];
module.exports.specDate = s => last(s._links['latest-version'].href.split('/'));
