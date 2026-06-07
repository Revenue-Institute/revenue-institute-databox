#!/usr/bin/env node
/**
 * databox-executive-dashboard installer
 * Adds the MCP server to Claude Desktop config automatically
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillPath = join(__dirname, '..', 'skill.js');

// Claude Desktop config location by OS
function getConfigPath() {
  const os = platform();
  if (os === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  if (os === 'win32') return join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json');
  return join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

const configPath = getConfigPath();
const serverEntry = {
  command: 'node',
  args: [skillPath]
};

console.log('\n🚀 Databox Executive Dashboard Architect');
console.log('   by Revenue Institute\n');

// Read or create config
let config = { mcpServers: {} };
if (existsSync(configPath)) {
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
    if (!config.mcpServers) config.mcpServers = {};
  } catch (e) {
    console.error('⚠️  Could not parse existing Claude Desktop config. Creating fresh.');
    config = { mcpServers: {} };
  }
} else {
  // Create directory if needed
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
}

// Check if already installed
if (config.mcpServers['databox-executive-dashboard']) {
  console.log('✅ Already installed in Claude Desktop.');
  console.log('   Restart Claude Desktop if you just updated.\n');
  process.exit(0);
}

// Add the server
config.mcpServers['databox-executive-dashboard'] = serverEntry;
writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('✅ Installed successfully!\n');
console.log('   Config updated:', configPath);
console.log('   Skill location:', skillPath);
console.log('\n📋 Next steps:');
console.log('   1. Quit Claude Desktop completely');
console.log('   2. Reopen Claude Desktop');
console.log('   3. Say: "Build me an executive Databox dashboard"\n');
console.log('   The skill will auto-discover your connected Databox data');
console.log('   sources and build the right dashboard — no setup required.\n');
