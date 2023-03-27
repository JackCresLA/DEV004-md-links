import fs from "fs";
import path from "path";
import axios from "axios";

import {
  extractLinksInfoFromPath,
  getAllLinksFromMdFile,
  getFilesFromDirectory,
  isDirectory,
  isFile,
  isMdFile,
  isValidateOption,
  parseLinksToStats,
  pathExists,
  readFile,
  validateLinks,
} from "../src/utils";

jest.mock("fs");

describe("getFilesFromDirectory", () => {
  const mockReaddirSync = jest.fn();
  const mockLstatSync = jest.fn();

  beforeAll(() => {
    fs.readdirSync = mockReaddirSync.mockImplementation(
      (sourcePath: string) => {
        if (sourcePath === "/path/to/directory/directory1") {
          return ["file3.txt"];
        }

        return ["file1.txt", "file2.txt", "directory1"];
      }
    );

    // @ts-ignore
    fs.lstatSync = mockLstatSync.mockImplementation((sourcePath: string) => ({
      isDirectory: () => sourcePath === "/path/to/directory/directory1",
      isFile: () => sourcePath !== "/path/to/directory/directory1",
    }));
  });

  afterEach(() => {
    mockReaddirSync.mockClear();
    mockLstatSync.mockClear();
  });

  it("should return a list of files from a directory", () => {
    const mockSourcePath = "/path/to/directory";

    const expectedFiles = [
      path.join(mockSourcePath, "file1.txt"),
      path.join(mockSourcePath, "file2.txt"),
      path.join(mockSourcePath, "directory1", "file3.txt"),
    ];

    expect(getFilesFromDirectory(mockSourcePath)).toEqual(expectedFiles);
    expect(mockReaddirSync).toHaveBeenCalledWith(mockSourcePath);
    expect(mockReaddirSync).toHaveBeenCalledWith(
      path.join(mockSourcePath, "directory1")
    );
  });
});

describe("isMdFile", () => {
  it("should return true if the file is a markdown file", () => {
    expect(isMdFile("file.md")).toBe(true);
  });

  it("should return false if the file is not a markdown file", () => {
    expect(isMdFile("file.txt")).toBe(false);
  });
});

describe("getAllLinksFromMdFile", () => {
  it("should return a list of links from a markdown file", () => {
    const mockFileContent = `# Title

    [Link 1](https://www.link1.com)
    [Link 2](https://www.link2.com)
    [Link 3](https://www.link3.com)`;

    const expectedLinks = [
      {
        text: "Link 1",
        href: "https://www.link1.com",
        file: "path/to/file.md",
      },
      {
        text: "Link 2",
        href: "https://www.link2.com",
        file: "path/to/file.md",
      },
      {
        text: "Link 3",
        href: "https://www.link3.com",
        file: "path/to/file.md",
      },
    ];

    expect(getAllLinksFromMdFile(mockFileContent, "path/to/file.md")).toEqual(
      expectedLinks
    );
  });
});

describe("validateLinks", () => {
  const mockResponse = {
    status: 200,
  };

  const mockError = {
    response: {
      status: 404,
      statusText: "Not Found",
    },
  };

  it("should validate a valid link", async () => {
    const links = [
      {
        file: "file1.txt",
        text: "Link 1",
        href: "http://example.com",
      },
    ];

    jest.spyOn(axios, "get").mockResolvedValue(mockResponse);

    const result = await validateLinks(links);

    expect(result).toEqual([
      {
        file: "file1.txt",
        text: "Link 1",
        href: "http://example.com",
        status: 200,
        ok: "ok",
      },
    ]);
  });

  it("should validate an invalid link", async () => {
    const links = [
      {
        file: "file2.txt",
        text: "Link 2",
        href: "http://invalid.example.com",
      },
    ];

    jest.spyOn(axios, "get").mockRejectedValue(mockError);

    const result = await validateLinks(links);

    expect(result).toEqual([
      {
        file: "file2.txt",
        text: "Link 2",
        href: "http://invalid.example.com",
        status: 404,
        ok: "Not Found",
      },
    ]);
  });

  it("should handle the error without response", async () => {
    const links = [
      {
        file: "file3.txt",
        text: "Link 3",
        href: "http://invalid.example.com",
      },
    ];

    jest.spyOn(axios, "get").mockRejectedValue({});

    const result = await validateLinks(links);

    expect(result).toEqual([
      {
        file: "file3.txt",
        text: "Link 3",
        href: "http://invalid.example.com",
        status: 500,
        ok: "Internal Server Error",
      },
    ]);
  });
});

describe("isDirectory", () => {
  const mockLstatSync = jest.fn();

  beforeAll(() => {
    // @ts-ignore
    fs.lstatSync = mockLstatSync.mockImplementation((sourcePath: string) => ({
      isDirectory: () => sourcePath === "/path/to/directory",
    }));
  });

  afterEach(() => {
    mockLstatSync.mockClear();
  });

  it("should return true if the path is a directory", () => {
    expect(isDirectory("/path/to/directory")).toBe(true);
  });

  it("should return false if the path is not a directory", () => {
    expect(isDirectory("/path/to/file.txt")).toBe(false);
  });
});

describe("isFile", () => {
  const mockLstatSync = jest.fn();

  beforeAll(() => {
    // @ts-ignore
    fs.lstatSync = mockLstatSync.mockImplementation((sourcePath: string) => ({
      isFile: () => sourcePath === "/path/to/file.txt",
    }));
  });

  afterEach(() => {
    mockLstatSync.mockClear();
  });

  it("should return true if the path is a file", () => {
    expect(isFile("/path/to/file.txt")).toBe(true);
  });

  it("should return false if the path is not a file", () => {
    expect(isFile("/path/to/directory")).toBe(false);
  });
});

describe("pathExists", () => {
  const mockAccessSync = jest.fn();

  beforeAll(() => {
    fs.accessSync = mockAccessSync;
  });

  afterEach(() => {
    mockAccessSync.mockClear();
  });

  it("should return true if the path exists", () => {
    expect(pathExists("/path/to/file.txt")).toBe(true);
    expect(mockAccessSync).toHaveBeenCalledWith("/path/to/file.txt");
  });

  it("should return false if the path does not exist", () => {
    mockAccessSync.mockImplementationOnce(() => {
      throw new Error();
    });

    expect(pathExists("/path/to/file.txt")).toBe(false);
    expect(mockAccessSync).toHaveBeenCalledWith("/path/to/file.txt");
  });
});

describe("parseLinksToStats", () => {
  it("should return a list of stats from a list of validated links", () => {
    const links = [
      {
        file: "file1.txt",
        text: "Link 1",
        href: "http://example.com",
        status: 200,
        ok: "ok",
      },
      {
        file: "file2.txt",
        text: "Link 2",
        href: "http://invalid.example.com",
        status: 404,
        ok: "Not Found",
      },
    ];

    const expectedStats = {
      total: 2,
      unique: 2,
      broken: 1,
    };

    expect(parseLinksToStats(links, { validate: true })).toEqual(expectedStats);
  });

  it("should return a list of stats from a list of unvalidated links", () => {
    const links = [
      {
        file: "file1.txt",
        text: "Link 1",
        href: "http://example.com",
      },
      {
        file: "file2.txt",
        text: "Link 2",
        href: "http://invalid.example.com",
      },
    ];

    const expectedStats = {
      total: 2,
      unique: 2,
    };

    expect(parseLinksToStats(links)).toEqual(expectedStats);
  });
});

describe("isValidateOption", () => {
  it("should return true if the option is there", () => {
    expect(isValidateOption({ validate: true }, [])).toBe(true);
  });

  it("should return false if the option is not there", () => {
    expect(isValidateOption({}, [])).toBe(false);
  });
});

describe("readFile", () => {
  const mockReadFile = jest.fn();

  beforeAll(() => {
    // @ts-ignore
    fs.readFile = mockReadFile;
  });

  afterEach(() => {
    mockReadFile.mockClear();
  });

  it("should read a file", async () => {
    mockReadFile.mockImplementationOnce((_sourcePath, _encoding, callback) => {
      callback(null, "file content");
    });

    const result = await readFile("/path/to/file.txt");

    expect(result).toEqual("file content");
    expect(mockReadFile).toHaveBeenCalledWith(
      "/path/to/file.txt",
      "utf8",
      expect.any(Function)
    );
  });

  it("should handle the error", async () => {
    mockReadFile.mockImplementationOnce((_sourcePath, _encoding, callback) => {
      callback(new Error("Error reading file"), null);
    });

    await expect(readFile("/path/to/file.txt")).rejects.toThrow("Error reading file");
  });
});

describe("extractLinksInfoFromPath", () => {
  const mockReadFile = jest.fn();
  const mockResponse = {
    status: 200,
  };

  beforeAll(() => {
    // @ts-ignore
    fs.readFile = mockReadFile;
  });

  afterEach(() => {
    mockReadFile.mockClear();
  });

  it("should extract links from a file (validate: false)", async () => {
    mockReadFile.mockImplementationOnce((_sourcePath, _encoding, callback) => {
      callback(null, "[Link 1](http://example.com)");
    });
    jest.spyOn(axios, "get").mockResolvedValue(mockResponse);

    const result = await extractLinksInfoFromPath("/path/to/file.txt", {
      validate: false,
    });

    expect(result).toEqual([
      {
        file: "/path/to/file.txt",
        text: "Link 1",
        href: "http://example.com",
      },
    ]);
  });

  it("should extract links from a file (validate: true)", async () => {
    mockReadFile.mockImplementationOnce((_sourcePath, _encoding, callback) => {
      callback(null, "[Link 1](http://example.com)");
    });

    const result = await extractLinksInfoFromPath("/path/to/file.txt", {
      validate: true,
    });

    expect(result).toEqual([
      {
        file: "/path/to/file.txt",
        text: "Link 1",
        href: "http://example.com",
        status: 200,
        ok: "ok",
      },
    ]);
  });
});
