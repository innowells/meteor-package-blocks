Package.describe({
  name: 'moaclib:blocks',
  summary: 'Provides informations about the current and last 50 blocks',
  version: '0.1.0',
  git: 'http://github.com/innowells/meteor-package-blocks'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use('underscore', ['client', 'server']);
  api.use('mongo', ['client', 'server']);

  // api.use('frozeman:persistent-minimongo@0.1.3', 'client');
  api.use('moaclib:chain3@0.1.2', ['client', 'server']);

  api.export(['McBlocks'], ['client', 'server']);

  api.addFiles('blocks.js', ['client', 'server']);
});

// Package.onTest(function(api) {
//   api.use('tinytest');
//   api.use('moaclib:blocks');
//   api.addFiles('blocks-tests.js');
// });

