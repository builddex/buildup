import * as chalk from "chalk";
import { logkit } from "@buildup/devkit";
import { Task, TaskStatus } from "./Task";
import { BuildItem, BuildOptions } from "../types";
import * as YAML from 'yaml'
import * as path from "path";
import * as fs from "fs";

const logger = new logkit.NodeLogger("builder-devkit taskPipeline");

export class TaskManager {

  private _taskMap: Map<string, Task> = new Map();


  constructor(public options: BuildOptions) {
  }

  public async load() {

    const configPath = path.resolve(process.cwd(), "buildup.yaml");
    const config = YAML.parse(fs.readFileSync(configPath, 'utf8'));

    console.log(chalk.greenBright('buildup.yml:'));
    console.log(config);


  }


  /**
   * 执行
   */
  public async doTask(): Promise<void> {

    const startTime = Date.now();
    const abortController = new AbortController();

    const promise = new Promise<void>((resolve, reject) => {

      const _doPendingTask = async () => {

        if (abortController.signal.aborted) {
          return reject(abortController.signal.reason);
        }

        const doneTasks = Array.from(this._taskMap.values()).filter((task) => task.status === TaskStatus.SUCCESS);
        if (doneTasks.length === this._taskMap.size) {
          const endTime = Date.now();
          const cost = endTime - startTime;
          console.log(chalk.greenBright(`task done: ${doneTasks.length}, cost: ${cost}ms`));
          return resolve();
        }

        const pendingTasks = Array.from(this._taskMap.values()).filter((task) => task.status === TaskStatus.PENDING);

        for (const task of pendingTasks) {
          const deps = task.item.deps;
          const isReadyRun = deps.every((dep) => this._taskMap.get(dep).status === TaskStatus.SUCCESS);
          if (isReadyRun) {
            task.run()
              .then(_doPendingTask)
              .catch((e) => {
                abortController.abort(e);
                reject(e);
              });
          }
        }
      }

      _doPendingTask();

    });

    return promise;
  }

}
