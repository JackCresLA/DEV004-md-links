import mdLinks from './src';

mdLinks('README.lock', {stats: true}).then(console.log).catch(console.error);
