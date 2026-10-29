// Loaded through NODE_OPTIONS by scripts/lib/local-backend.mjs on Windows only.
// The local Convex backend's Node executor links node_modules with a directory
// symlink, which Windows refuses without Developer Mode or elevation (EPERM).
// A junction needs neither, so directory links are made as junctions instead.
"use strict";
const fs = require("node:fs");

function asJunction(type, target) {
  if (type !== undefined && type !== "dir") return type;
  try {
    return fs.statSync(target).isDirectory() ? "junction" : type;
  } catch {
    return type;
  }
}

const symlink = fs.symlink;
fs.symlink = function (target, path, type, cb) {
  if (typeof type === "function") return symlink.call(fs, target, path, asJunction(undefined, target), type);
  return symlink.call(fs, target, path, asJunction(type, target), cb);
};
const symlinkSync = fs.symlinkSync;
fs.symlinkSync = function (target, path, type) {
  return symlinkSync.call(fs, target, path, asJunction(type, target));
};
const promised = fs.promises.symlink;
fs.promises.symlink = function (target, path, type) {
  return promised.call(fs.promises, target, path, asJunction(type, target));
};
