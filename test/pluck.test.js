var test = require('tap').test;
var pluck = require('../lib/pluck');
var deps = require('../lib/deps');
var path = require('path');

test('walk (with all fixtures)', function (t) {
  var fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/');

  deps(fixture, { dev: false }).then(function (res) {

    var plucked = null;
    var name = 'semver';

    plucked = pluck(res, name, '*');
    t.equal(plucked.length, 2, 'found two instances of ' + name);
    plucked = pluck(res, name, '*');
    t.equal(plucked.length, 2, 'found two instances of ' + name);

  }).catch(t.fail).then(t.end);

});