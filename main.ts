import mdLinks from './src';

mdLinks('README.md', {validate: true}).then(console.log).catch(console.error);
