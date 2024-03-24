import * as rl from "readline";

export namespace logkit {

  function logInline(message) {
    rl.clearLine(process.stdout, 0);
    rl.cursorTo(process.stdout, 0);
    process.stdout.write(message);
  }


  export class NodeLogger {


    constructor(private _name: string) {}


    info(...args: any[]) {
      console.log(`[${this._name}]`,...args);
    }

    error(...args: any[]) {
      console.error(`[${this._name}]`,...args);
    }

    warn(...args: any[]) {
      console.warn(`[${this._name}]`,...args);
    }

    debug(...args: any[]) {
      console.debug(`[${this._name}]`,...args);
    }


    inline(message: string) {
      logInline(message);
    }

  }


}
