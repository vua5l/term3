// rep(obj, key, a, b): replace exactly one occurrence of a in obj[key], or throw
module.exports.rep = (o, k, a, b) => { const n = o[k].split(a).length - 1; if (n !== 1) throw new Error('rep ' + k + ': ' + n + ' × «' + a.slice(0, 50) + '»'); o[k] = o[k].replace(a, b); };
