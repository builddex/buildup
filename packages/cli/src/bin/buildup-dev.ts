#!/usr/bin/env node

import {program} from 'commander';
import * as chalk from "chalk";

program.showHelpAfterError();

program
  .usage('<command> [options]')
  .description('A tool for building and deploying packages')

  // version and help
  .version(require('../../package.json').version)

  .helpOption('-h, --help', 'read more information')
  .allowUnknownOption();
