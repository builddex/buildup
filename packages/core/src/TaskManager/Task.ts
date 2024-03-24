import * as child_process from "child_process";
import { BuildItem, BuildOptions, Builder } from "../types";


export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCESS = "success",
  FAILED = "failed",
}


export class Task {

  public timeStart: number;

  public timeEnd: number;

  public status: TaskStatus = TaskStatus.PENDING;

  public result: unknown;

  public readonly stdout: [number, string][] = [];

  constructor(public index: number, public item: BuildItem<any>, public options: BuildOptions) { }

  public async run() {
    this.status = TaskStatus.RUNNING;
    this.timeStart = Date.now();

    const promise = (this.options.parallel
      ? this._runParallelTask()
      : this._runSerialTask());

    await promise
      .then((result) => {
        this.status = TaskStatus.SUCCESS;
        this.result = result;
      })
      .catch((reason) => {
        this.status = TaskStatus.FAILED;
        throw reason;
      }).finally(() => {
        this.timeEnd = Date.now();
      });

    return this.result;
  }


  private _runParallelTask() {

    return new Promise((resolve, reject) => {

      const childProcess = child_process.fork(__filename, [], {
        env: {
          BUILDUP_CLI_ITEM: JSON.stringify(this.item),
          BUILDUP_CLI_OPTIONS: JSON.stringify({ ...this.options, parallel: false }),
        },
        stdio: ["pipe", "pipe", "pipe", "ipc"],
      });

      childProcess.stdout.on("data", (data) => {
        this.stdout.push([Date.now(), data.toString()]);
      });

      childProcess.stderr.on("data", (data) => {
        this.stdout.push([Date.now(), data.toString()]);
      });

      childProcess.on("message", (message: { status: TaskStatus, result: any, reason: string }) => {
        switch (message.status) {
          case TaskStatus.SUCCESS:
            this.status = TaskStatus.SUCCESS;
            this.result = message.result;
            resolve(this.result);
            break;
          case TaskStatus.FAILED:
            this.status = TaskStatus.FAILED;
            reject(message.reason);
            break;
        }
      });

      childProcess.on("exit", (code) => {
        if (code === 0) {
          this.status = TaskStatus.SUCCESS;
          resolve(code);
        } else {
          this.status = TaskStatus.FAILED;
          reject(code);
        }
      });

    });

  }

  private async _runSerialTask() {
    const builder = await this._loadBuilder(this.item.builder);
    const { action } = this.options;

    try {
      this.result = await builder[action](this.item, this.item.options);
      this.status = TaskStatus.SUCCESS;
      return this.result;
    } catch (e) {
      this.status = TaskStatus.FAILED;
      throw e;
    }
  }

  private async _loadBuilder(name: string): Promise<Builder> {
    throw new Error("Method not implemented.");
  }
}



if (require.main === module) {
  const item = JSON.parse(process.env.BUILDUP_CLI_ITEM);
  const options = JSON.parse(process.env.BUILDUP_CLI_OPTIONS);
  const task = new Task(0, item, options);
  task.run()
    .then((result) => process.send({ item, result, status: TaskStatus.SUCCESS }))
    .catch((e) => process.send({ item, e, status: TaskStatus.FAILED }));
}

