import { readFile } from "node:fs/promises";

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readOptionalSnapshotFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw new Error(
      `Could not read previous offline snapshot file ${filePath}; refusing to reset the route inventory.`,
      { cause: error },
    );
  }
}

function parseSnapshotJson(contents, filePath) {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Previous offline snapshot file ${filePath} is invalid JSON; refusing to publish without its prior route inventory.`,
      { cause: error },
    );
  }
}

export async function loadPreviousOfflineSnapshot(manifestPath, kidsPath) {
  const [manifestContents, kidsContents] = await Promise.all([
    readOptionalSnapshotFile(manifestPath),
    readOptionalSnapshotFile(kidsPath),
  ]);

  if (manifestContents === null) {
    if (kidsContents !== null) {
      throw new Error(
        "Previous Kids dataset exists without its offline manifest; refusing to reset the route inventory.",
      );
    }
    return {
      previous: { routes: [], datasets: {} },
      previousKidsRows: [],
    };
  }

  const previous = parseSnapshotJson(manifestContents, manifestPath);
  if (
    !isRecord(previous) ||
    !Array.isArray(previous.routes) ||
    previous.routes.some((route) => typeof route !== "string") ||
    !isRecord(previous.datasets)
  ) {
    throw new Error(
      "Previous offline manifest must contain a string route array and a dataset object; refusing to reset the route inventory.",
    );
  }

  const hasKidsDefinition = Object.prototype.hasOwnProperty.call(previous.datasets, "kids");
  let previousKidsRows = [];
  if (kidsContents === null) {
    if (hasKidsDefinition) {
      throw new Error(
        "Previous Kids dataset file is missing while the manifest still references it; refusing to publish an incomplete snapshot.",
      );
    }
  } else {
    const previousKids = parseSnapshotJson(kidsContents, kidsPath);
    if (!Array.isArray(previousKids)) {
      throw new Error(
        "Previous Kids dataset must contain a JSON array; refusing to publish an incomplete snapshot.",
      );
    }
    previousKidsRows = previousKids;

    if (hasKidsDefinition) {
      const definition = previous.datasets.kids;
      if (
        !isRecord(definition) ||
        definition.path !== "/offline-content/v1/kids.json" ||
        !Number.isInteger(definition.count) ||
        definition.count !== previousKidsRows.length
      ) {
        throw new Error(
          "Previous Kids dataset manifest path or count does not match its file; refusing to reset the route inventory.",
        );
      }
    }
  }

  return { previous, previousKidsRows };
}
