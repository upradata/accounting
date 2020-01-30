#!/usr/bin/env node
import { parseArgs } from './program.arguments';
import { Run } from './program.run';

new Run(parseArgs()).run();
