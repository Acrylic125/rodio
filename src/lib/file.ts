// https://github.com/jonschlinkert/is-invalid-path/blob/master/index.js
import path from "path";

type Options = {
  windows?: boolean;
  extended?: boolean;
  file?: boolean;
};

// export function isWindows(opts: Options) {
//   return ;
// }

export function isValidFilepath(filepath: string, options: Options = {}) {
  if (filepath === "") return true;

  if (navigator.userAgent.indexOf("Win") === -1) {
    return true;
  }

  // https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx#maxpath
  const MAX_PATH = options.extended ? 32767 : 260;
  if (typeof filepath !== "string" || filepath.length > MAX_PATH - 12) {
    return true;
  }

  const rootPath = path.parse(filepath).root;
  if (rootPath) filepath = filepath.slice(rootPath.length);

  // https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx#Naming_Conventions
  if (options.file) {
    return /[<>:"/\\|?*]/.test(filepath);
  }
  return /[<>:"|?*]/.test(filepath);
}
