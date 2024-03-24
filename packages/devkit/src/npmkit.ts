import { exec } from "child_process";
import * as JSON5 from "json5";
import * as process from "process";
import * as chalk from "chalk";
import * as path from "path";
import { logkit } from "./logkit";

const logger = new logkit.NodeLogger("builder-devkit npm");

const NPM_ENV: Record<string, string> = {};

export namespace npmkit {

  /**
   * 检查更新并安装
   *  - 如果没有安装则安装
   *  - 如果已经安装则检查更新
   * @param packageName
   * @param options
   */
  export async function checkUpdateInstall(packageName: string, options?: { force?: boolean }): Promise<unknown> {
    await _checkUpdateInstall(packageName, options);
    return Promise.resolve();
  }

  export async function install(packageName, packageVersion) {
    return new Promise((resolve, reject) => {
      const command = "npm install -g " + packageName + "@" + packageVersion;
      logger.info(chalk.blueBright(command));

      const childProcess = exec(command, {
        cwd: process.cwd(),
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      }, (error, stdout, stderr) => {

        if (stdout.trim().endsWith('npm info ok')) {
          logger.info(chalk.greenBright(`[[install ${packageName}@${packageVersion} success]]`));
          return resolve(stdout);
        }

        if (stderr.trim().endsWith('npm info ok')) {
          logger.info(chalk.greenBright(`[[install ${packageName}@${packageVersion} success]]`));
          return resolve(stderr);
        }

        if (stderr) {
          logger.error(chalk.redBright(`[[stderr]]: \n${stderr}`));
        }

        if (error) {
          logger.error(chalk.redBright(`[[error]]: \n${error.message}`));
          reject(error);
          return;
        }
        logger.info(chalk.blueBright(`[[stdout]]: ${stdout}`));
        resolve(stdout);
      });

      childProcess.stdout.on('data', (data) => {
        logger.info(chalk.green(`[[installing ${packageName}@${packageVersion}]]: ${data}`));
      });

      childProcess.stderr.on('data', (data) => {
        logger.info(chalk.redBright(`[[installing ${packageName}@${packageVersion}]]: ${data}`));
      });

      childProcess.on('close', (code) => {
        logger.info(chalk.blueBright(`[[installing ${packageName}@${packageVersion}]]: ${code}`));
      });

    });
  }

  async function _getGlobalPackageVersion(packageName: string): Promise<string | null> {
    try {
      const globalPackageJSONPath = path.resolve(await _getGlobalNodeModulesPath(), packageName + '/package.json');
      logger.info(`${packageName} global package.json path: ${globalPackageJSONPath}`);
      const packageJson = require(globalPackageJSONPath);
      return packageJson.version;
    } catch (e) {
      logger.warn(e.message);
      return null;
    }
  }

  async function _getRegistryLatestVersion(packageName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const viewCommand = "npm view " + packageName + " versions";
      logger.info('command', viewCommand);
      exec(viewCommand, {
        cwd: process.cwd(),
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      }, (error, stdout, stderr) => {

        if (stderr) {
          logger.error(stderr);
        }

        if (error) {
          logger.info(error.message);
          reject(error);
          return
        }

        stdout = /^\[/.test(stdout) ? stdout : ("[\"" + stdout.trim() + "\"]");

        try {
          const versions = JSON5.parse(stdout);
          const version = versions[versions.length - 1];
          logger.info(`latest version of ${packageName} is ${version}`);
          resolve(version);
        } catch (e) {
          logger.error(`can not get ${packageName} version from registry, ${e.message}, \n${stdout}`);
          reject(e);
        }
      })
    });
  }

  async function _getGlobalNodeModulesPath(): Promise<string> {

    if (NPM_ENV.GLOBAL_NODE_MODULES_PATH) {
      return NPM_ENV.GLOBAL_NODE_MODULES_PATH;
    }

    return new Promise<string>((resolve, reject) => {
      exec("npm root -g", {
        cwd: process.cwd(),
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(stderr);
          return;
        }
        NPM_ENV.GLOBAL_NODE_MODULES_PATH = stdout.trim();
        resolve(NPM_ENV.GLOBAL_NODE_MODULES_PATH);
      });
    });

  }


  function _checkUpdateInstall(packageName: string, options?: { force?: boolean }) {
    return Promise.all([_getGlobalPackageVersion(packageName), _getRegistryLatestVersion(packageName)]).then(([globalVersion, registryVersion]) => {
      logger.info(`${packageName} global version`, globalVersion);
      logger.info(`${packageName} registry version`, registryVersion);

      if (!registryVersion) {
        logger.error(`can not get ${packageName} version from registry`);
        return Promise.resolve();
      }

      if (!globalVersion) {
        return install(packageName, registryVersion);
      }

      if (process.argv.includes("--force-update") || options?.force) {
        return install(packageName, registryVersion);
      }

      const [globalVersionMajor, globalVersionMinor, globalVersionPatch] = globalVersion.split(".").map((v) => parseInt(v));
      const [registryVersionMajor, registryVersionMinor, registryVersionPatch] = registryVersion.split(".").map((v) => parseInt(v));

      if (globalVersionMajor < registryVersionMajor
        || globalVersionMinor < registryVersionMinor
        || globalVersionPatch < registryVersionPatch
      ) {
        logger.info(`update ${packageName} from ${globalVersion} to ${registryVersion}`);
        return install(packageName, registryVersion);
      }

      logger.info(`no need to update ${packageName}, current version is ${globalVersion}`);

      return Promise.resolve();
    });
  }
}
