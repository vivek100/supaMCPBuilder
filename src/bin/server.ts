#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { startSupaMCPServer } from '../server.js';
import { CLIArgs } from '../types.js';

// ASCII art banner
const banner = `
${chalk.cyan('╔══════════════════════════════════════╗')}
${chalk.cyan('║')}       ${chalk.bold.white('SupaMCP Server')}              ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('Supabase → MCP Bridge')}           ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════╝')}
`;

console.log(banner);

program
  .name('supabase-mcp-server')
  .description('A runtime-configurable MCP server for Supabase')
  .version('1.0.0')
  .requiredOption('--url <url>', 'Supabase project URL')
  .requiredOption('--anon-key <key>', 'Supabase anonymous key')
  .requiredOption('--email <email>', 'User email for authentication')
  .requiredOption('--password <password>', 'User password for authentication')
  .option('--config-path <path>', 'Path to configuration JSON file (optional, overrides database config)')
  .option('--config-json <json>', 'Inline JSON configuration (optional, overrides database config)')
  .option('--tools-json <json>', 'Inline JSON tools configuration (optional, overrides database config)')
  .option('--tools-json-base64 <base64>', 'Base64 encoded inline JSON tools configuration (optional, overrides database config)')
  .option('--port <port>', 'Port for HTTP transport (default: stdio)', parseInt)
  .option('--verbose', 'Enable verbose logging')
  .addHelpText('after', `\nIf no configuration is provided via --config-path, --config-json, --tools-json, or --tools-json-base64,\nthe server will automatically load the latest active configuration from the 'tool_configurations' table in your Supabase database after authentication.\n`)
  .parse();

const options = program.opts();

// Validate required options
if (!options.url) {
  console.error(chalk.red('❌ Error: --url is required'));
  process.exit(1);
}

if (!options.anonKey) {
  console.error(chalk.red('❌ Error: --anon-key is required'));
  process.exit(1);
}

if (!options.email) {
  console.error(chalk.red('❌ Error: --email is required'));
  process.exit(1);
}

if (!options.password) {
  console.error(chalk.red('❌ Error: --password is required'));
  process.exit(1);
}

// Validate URL format
try {
  new URL(options.url);
} catch {
  console.error(chalk.red('❌ Error: Invalid URL format'));
  process.exit(1);
}

// Validate configuration options
if (options.configPath && options.configJson) {
  console.error(chalk.red('❌ Error: Cannot specify both --config-path and --config-json'));
  process.exit(1);
}

if (options.configPath && options.toolsJson) {
  console.error(chalk.red('❌ Error: Cannot specify both --config-path and --tools-json'));
  process.exit(1);
}

if (options.configPath && options.toolsJsonBase64) {
  console.error(chalk.red('❌ Error: Cannot specify both --config-path and --tools-json-base64'));
  process.exit(1);
}

if (options.configJson && options.toolsJson) {
  console.error(chalk.red('❌ Error: Cannot specify both --config-json and --tools-json'));
  process.exit(1);
}

if (options.configJson && options.toolsJsonBase64) {
  console.error(chalk.red('❌ Error: Cannot specify both --config-json and --tools-json-base64'));
  process.exit(1);
}

if (options.toolsJson && options.toolsJsonBase64) {
  console.error(chalk.red('❌ Error: Cannot specify both --tools-json and --tools-json-base64'));
  process.exit(1);
}

// Prepare CLI arguments
const cliArgs: CLIArgs = {
  url: options.url,
  anonKey: options.anonKey,
  email: options.email,
  password: options.password,
  configPath: options.configPath,
  configJson: options.configJson,
  toolsJson: options.toolsJson,
  toolsJsonBase64: options.toolsJsonBase64,
  port: options.port,
  verbose: options.verbose
};

// Start server
async function main() {
  try {
    console.log(chalk.blue('🚀 Starting SupaMCP Server...'));
    console.log(chalk.gray('   URL:'), options.url);
    console.log(chalk.gray('   User:'), options.email);
    const configSource = options.configPath 
      ? `File: ${options.configPath}`
      : options.configJson 
        ? 'Inline JSON configuration'
        : options.toolsJson 
          ? 'Inline tools JSON'
          : options.toolsJsonBase64
            ? 'Base64 encoded tools JSON'
            : 'Database: tool_configurations table (default)';
    
    console.log(chalk.gray('   Config:'), configSource);
    console.log();

    const server = await startSupaMCPServer(cliArgs);
    
    // Log server status
    const status = server.getStatus();
    console.log(chalk.green('✅ Server Status:'));
    console.log(chalk.gray('   Authenticated:'), status.authenticated ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.gray('   User:'), status.user?.email || 'Unknown');
    console.log(chalk.gray('   Tools:'), chalk.yellow(status.toolCount.toString()));
    console.log(chalk.gray('   Resources:'), chalk.yellow(status.resourceCount.toString()));
    console.log();
    console.log(chalk.green('🎯 MCP Server is ready to accept connections!'));
    console.log(chalk.gray('   Transport: stdio'));
    console.log(chalk.gray('   Press Ctrl+C to stop'));
    console.log();

  } catch (error) {
    console.error(chalk.red('❌ Failed to start server:'));
    console.error(chalk.red((error as Error).message));
    
    if (cliArgs.verbose) {
      console.error(chalk.gray('Stack trace:'));
      console.error(chalk.gray((error as Error).stack));
    }
    
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:'), error.message);
  if (cliArgs.verbose) {
    console.error(chalk.gray(error.stack));
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error(chalk.red('❌ Fatal error:'), error);
  process.exit(1);
}); 