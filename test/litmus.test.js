var test = require('tap').test;

test('litmus test', function (t) {
  var lib = require('../lib');
  t.ok(!!lib, 'module loaded');
  t.end();
});