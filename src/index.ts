import path from 'path';

import { MDOptions } from './types';
import {
  isDirectory,
  getFilesFromDirectory,
  isMdFile,
  parseLinksToStats,
  extractLinksInfoFromPath,
  pathExists,
} from './utils';

function mdLinks(rawPath: string, options: MDOptions = { validate: false, stats: false }) {
  const userPath = path.resolve(rawPath);

  if (!pathExists(userPath)) {
    return Promise.reject(new Error('The given path does not exist'));
  }

  const rawFilesPaths = isDirectory(userPath) ? getFilesFromDirectory(userPath) : [userPath];
  const filesPaths = rawFilesPaths.filter(isMdFile);

  if (filesPaths.length === 0) {
    return Promise.reject(new Error('No .md files were found in the given path'));
  }

  const resultPromises = filesPaths.map((filePath) => extractLinksInfoFromPath(filePath, options));

  return Promise.all(resultPromises).then((links) => {
    const allLinks = links.flat();

    if (options.stats) {
      return parseLinksToStats(allLinks, options);
    }

    return allLinks;
  });
}

export default mdLinks;
