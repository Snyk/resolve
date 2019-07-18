let test = require('tap-only');
let pluck = require('../lib/pluck');
let path = require('path');
let remoteFixtures = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/');
let npm2fixtures = require(remoteFixtures + '/snyk-resolve-deps-npm2.json');
let npm3fixtures = require(remoteFixtures + '/snyk-resolve-deps-npm3.json');
let pm2fixtures = require(remoteFixtures + '/pm2-disk.json');
let logicalTree = require('../lib/logical');

test('pluck (with npm@2 modules)', function (t) {
  let res = npm2fixtures;
  res.npm = 2;
  pluckTests(t, res);
});

test('pluck (with npm@3 modules)', function (t) {
  let res = npm3fixtures;
  res.npm = 3;
  pluckTests(t, res);
});

test('pluck (try github as version)', function (t) {
  let res = require(path.resolve(__dirname, '..', 'node_modules', 'snyk-resolve-deps-fixtures', 'jsbin-file-tree.json'));
  let plucked = null;
  let name = 'memcached';

  plucked = pluck(res, ['jsbin', 'memcached'], name, '2.0.0');
  t.equal(plucked.name, 'memcached', 'memcached found with git version');
  t.end();
});

function pluckTests(t, res) {
  let plucked = null;
  let name = 'lodash';
  plucked = pluck(res, ['snyk-resolve-deps', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found lodash in direct dep');
  plucked = pluck(res, ['snyk-resolve-deps','snyk','inquirer', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found in deduped path');

  plucked = pluck(res, ['this-module-does-not-exist','inquirer'], name, '*');
  t.equal(plucked, false, 'should not find a package with invalid path');

  plucked = pluck(res, ['snyk-resolve-deps'], name, '*');
  t.equal(plucked.name, name, 'found lodash in direct dep');

  plucked = pluck(res, ['snyk-resolve-deps'], name, 'latest');
  t.equal(plucked.name, name, 'found lodash in direct dep');

  let from = [
    'snyk-resolve-deps@1.1.0',
    'tap@5.2.0',
    'codecov.io@0.1.6',
    'request@2.42.0',
    'hawk@1.1.1'
  ];
  plucked = pluck(res, from, 'hawk', '1.1.1');
  t.equal(plucked.name, 'hawk', 'found with more complex path');

  from = [
    'snyk-resolve-deps@1.1.2',
    'snyk-resolve-deps-fixtures@1.1.1',
    '@remy/vuln-test@1.0.1',
    'semver@2.3.2'
  ];

  plucked = pluck(res, from, 'semver', '2.3.2');
  t.equal(plucked.name, 'semver', 'found with more complex path');

  // skip this test in npm2 because ansicolors
  // got deduped (into the root).
  if (res.npm === 3) {
    from = [
      'snyk-resolve-deps-fixtures',
      '@remy/npm-tree'
    ];

    plucked = pluck(res.dependencies['snyk-resolve-deps-fixtures'], from, 'ansicolors', '^0.3.2');
    t.equal(plucked.name, 'ansicolors', 'found on a shallow path');

    from = [
      'snyk-resolve-deps',
      '@remy/vuln-test'
    ];

    plucked = pluck(res, from, 'semver', '2.3.2');
    t.equal(plucked.name, 'semver', 'found on a straight path');
  }

  if (res.npm === 2) {
    from = ['snyk-resolve-deps', 'tap', 'nyc', 'istanbul', 'handlebars', 'uglify-js', 'source-map'];
    plucked = pluck(res, from, 'source-map', '~0.5.1');
    t.equal(plucked.name, 'source-map', 'found on a straight path');
    t.notOk(plucked.extraneous, 'not extraneous');
  }

  from = [
    'snyk-resolve-deps',
    'snyk-resolve-deps-fixtures',
    'semver-rs-demo',
    'semver'
  ];

  plucked = pluck(res, from, 'semver', '*');
  t.equal(plucked.name, 'semver', 'found correct package on deep path (where package also appears higher up');
  t.equal(plucked.version[0], '2', 'semver is at 2');

  plucked = pluck(res, from, 'semver', '0.0.0');
  t.equal(plucked, false, 'unable to find correct semver');

  t.end();
}

test('forward pluck', function (t) {
  let from = [
    'foo@0',
    'glue@3.2.0',
    'hapi@13.0.0',
    'statehood@4.0.0',
    'joi@7.1.0',
    'moment@2.11.0'
  ];

  let plucked = pluck(require(__dirname + '/fixtures/not-found.json'), from, 'moment', '2.11.0');
  t.ok(plucked);
  t.end();
});

test('shrinkwrap compatible', function (t) {
  let fixture = require('./fixtures/glue-npm-shrinkwrap.json');

  let from = [
    'foo@1.0.0',
    'glue@3.2.0',
    'hapi@13.0.0',
    'heavy@4.0.0',
    'joi@7.1.0',
    'moment@2.11.0'
  ];

  let plucked;
  plucked = pluck(fixture, from, 'moment', '2.11.0');
  t.equal(plucked.version, '2.11.0', 'was able to pluck from shrinkwrap');

  t.end();
});

test('shrinkwrap compatible (finds all vuln shrinkwrap)', function (t) {
  let vulns = require(__dirname + '/fixtures/glue-npm-shrinkwrap-vulns.json').vulnerabilities;
  let fixture = require(__dirname + '/fixtures/glue-npm-shrinkwrap.json');

  vulns.forEach(function (vuln) {
    let plucked = pluck(fixture, vuln.from, 'moment', '2.11.0');

    t.equal(plucked.version, '2.11.0', vuln.id + ': was able to pluck from shrinkwrap');
    t.equal(plucked.shrinkwrap, 'hapi@13.0.0', vuln.id + ': shrinkwrap detected');
  });
  t.end();
});

test('handles unsupported git urls', function (t) {
  let from = [ 'pm2-demo@1.0.0', 'pm2@1.0.1' ];

  let plucked;
  plucked = pluck(pm2fixtures, from, 'ikt', 'git+http://ikt.pm2.io/ikt.git#master');
  t.equal(plucked.name, 'ikt', 'was able to pluck from unsupported git url');

  t.end();
});
