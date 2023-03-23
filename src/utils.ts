import path from "path";
import fs from "fs";
import axios from "axios";

import { BaseLink, MDOptions, ValidatedLink } from "./types";

export function readFile(path: string) {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export function parseLinksToStats(
  allLinks: (BaseLink | ValidatedLink)[],
  options: MDOptions = { validate: false, stats: false }
) {
  const total = allLinks.length;
  const unique = new Set(allLinks.map((link) => link.href)).size;

  if (isValidateOption(options, allLinks)) {
    const broken = allLinks.filter((link) => link.ok !== "ok").length;

    return { total, unique, broken };
  }

  return { total, unique };
}

export async function extractLinksInfoFromPath(filePath: string, options: MDOptions) {
  return readFile(filePath).then<BaseLink[] | Promise<ValidatedLink[]>>((fileContent) => {
    const links = getAllLinksFromMdFile(fileContent, filePath);

    return options.validate ? validateLinks(links) : links;
  });
}

export function pathExists(path: string) {
  try {
    // Check if the path exists synchronously
    fs.accessSync(path);
    return true;
  } catch (_err) {
    // Return false if the path does not exist or if there was an error
    return false;
  }
}

export function isDirectory(path: string) {
  return fs.lstatSync(path).isDirectory();
}

export function isFile(path: string) {
  return fs.lstatSync(path).isFile();
}

export function isMdFile(path: string) {
  return path.endsWith(".md");
}

export function isValidateOption(
  options: MDOptions,
  allLinks: (BaseLink | ValidatedLink)[]
): allLinks is ValidatedLink[] {
  return !!options.validate;
}

export function getFilesFromDirectory(
  sourcePath: string,
  files: string[] = []
) {
  const pathEntries = fs.readdirSync(sourcePath);

  for (const entry of pathEntries) {
    const fullPath = path.join(sourcePath, entry);

    if (isDirectory(fullPath)) {
      getFilesFromDirectory(fullPath, files);
    }

    if (isFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

export function getAllLinksFromMdFile(fileContent: string, filePath: string) {
  const linkRegex = /\[([^\[]+)\]\((https?:\/\/[^\)]+)\)/g;
  const links: BaseLink[] = [];

  let match;
  while ((match = linkRegex.exec(fileContent)) !== null) {
    // Extract the URL and link text from the regex match groups
    const [, linkText, url] = match;

    // Add the URL and link text to the links array
    links.push({ href: url, text: linkText, file: filePath });
  }

  return links;
}

export function validateLinks(links: BaseLink[]) {
  const promises = links.map((link) => {
    return axios
      .get(link.href)
      .then((response) => {
        return {
          ...link,
          status: response.status,
          ok: "ok",
        };
      })
      .catch((error) => {
        return {
          ...link,
          status: (error.response?.status as number) || 500,
          ok: (error.response?.statusText as string) || "Internal Server Error",
        };
      });
  });

  return Promise.all<ValidatedLink>(promises);
}
