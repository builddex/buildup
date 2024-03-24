export namespace modulekit {
  export function loadModule(modulePath: string): any {
    return require(modulePath);
  }

  export function loadPackage(packageName: string): any {
    return require(packageName);
  }
}
