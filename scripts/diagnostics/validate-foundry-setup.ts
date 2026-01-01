/**
 * Validates Azure AI Foundry setup and connectivity
 * Usage: npx tsx validate-foundry-setup.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  .env.local not found');
}

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';

interface ValidationResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  fix?: string;
}

const results: ValidationResult[] = [];

function check(name: string, condition: boolean, errorMsg: string, fix?: string): void {
  if (condition) {
    results.push({ name, status: 'ok', message: 'OK' });
    console.log(`${GREEN}✅${RESET} ${name}`);
  } else {
    results.push({ name, status: 'error', message: errorMsg, fix });
    console.log(`${RED}❌${RESET} ${name}`);
    console.log(`   ${RED}Error: ${errorMsg}${RESET}`);
    if (fix) {
      console.log(`   ${YELLOW}Fix: ${fix}${RESET}`);
    }
  }
}

function warn(name: string, condition: boolean, warningMsg: string, fix?: string): void {
  if (!condition) {
    results.push({ name, status: 'warning', message: warningMsg, fix });
    console.log(`${YELLOW}⚠️ ${RESET} ${name}`);
    console.log(`   ${YELLOW}Warning: ${warningMsg}${RESET}`);
    if (fix) {
      console.log(`   ${YELLOW}Fix: ${fix}${RESET}`);
    }
  } else {
    results.push({ name, status: 'ok', message: 'OK' });
    console.log(`${GREEN}✅${RESET} ${name}`);
  }
}

async function validateSetup(): Promise<void> {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Azure AI Foundry Setup Validation${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  // 1. Check environment variables
  console.log(`${BLUE}📋 Environment Variables:${RESET}`);
  check(
    'AZURE_AI_FOUNDRY_PROJECT_ENDPOINT set',
    !!process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT,
    'AZURE_AI_FOUNDRY_PROJECT_ENDPOINT not set',
    'Set AZURE_AI_FOUNDRY_PROJECT_ENDPOINT in .env.local (e.g., https://your-project.services.ai.azure.com/api/projects/your-project)'
  );

  const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
  if (endpoint) {
    check(
      'AZURE_AI_FOUNDRY_PROJECT_ENDPOINT is valid URL',
      endpoint.startsWith('https://') && endpoint.includes('services.ai.azure.com'),
      'Invalid endpoint format',
      'Should be: https://your-project.services.ai.azure.com/api/projects/your-project'
    );
  }

  check(
    'FOUNDRY_AGENT_1_ID set',
    !!process.env.FOUNDRY_AGENT_1_ID,
    'FOUNDRY_AGENT_1_ID not set',
    'Set FOUNDRY_AGENT_1_ID in .env.local to your agent name (e.g., EFSAGENT) or agent ID'
  );

  warn(
    'FOUNDRY_AGENT_2_ID set',
    !!process.env.FOUNDRY_AGENT_2_ID,
    'FOUNDRY_AGENT_2_ID not set (optional)',
    'Set if you have a second agent'
  );

  warn(
    'FOUNDRY_AGENT_3_ID set',
    !!process.env.FOUNDRY_AGENT_3_ID,
    'FOUNDRY_AGENT_3_ID not set (optional)',
    'Set if you have a third agent'
  );

  warn(
    'AGENT_TOKEN set',
    !!process.env.AGENT_TOKEN,
    'AGENT_TOKEN not set (will use DefaultAzureCredential)',
    'Optional: Set if you have a service principal token'
  );

  // 2. Check file structure
  console.log(`\n${BLUE}📁 File Structure:${RESET}`);
  check(
    'services/foundryAgentClient.ts exists',
    fs.existsSync('./services/foundryAgentClient.ts'),
    'foundryAgentClient.ts not found',
    'File should exist at: ./services/foundryAgentClient.ts'
  );

  check(
    'services/foundryAnalysisService.ts exists',
    fs.existsSync('./services/foundryAnalysisService.ts'),
    'foundryAnalysisService.ts not found',
    'File should exist at: ./services/foundryAnalysisService.ts'
  );

  check(
    'agent-bridge-service.py exists',
    fs.existsSync('./agent-bridge-service.py'),
    'agent-bridge-service.py not found',
    'Bridge service Python file should exist at: ./agent-bridge-service.py'
  );

  // 3. Check dependencies
  console.log(`\n${BLUE}📦 Dependencies:${RESET}`);
  
  const packageJsonPath = './package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    check(
      '@azure/identity installed',
      !!deps['@azure/identity'],
      '@azure/identity not found in package.json',
      'Run: npm install @azure/identity'
    );

    check(
      '@opentelemetry/api installed',
      !!deps['@opentelemetry/api'],
      '@opentelemetry/api not found in package.json',
      'Run: npm install @opentelemetry/api'
    );

    check(
      'express installed',
      !!deps['express'],
      'express not found in package.json',
      'Run: npm install express'
    );
  } else {
    console.log(`${RED}❌${RESET} package.json not found`);
    results.push({ name: 'package.json exists', status: 'error', message: 'package.json not found' });
  }

  // 4. Check Python setup
  console.log(`\n${BLUE}🐍 Python Setup:${RESET}`);
  
  try {
    const { stdout: pythonVersion } = await execAsync('python --version');
    check(
      'Python installed',
      !!pythonVersion,
      'Python not found',
      'Install Python 3.8 or later'
    );

    // Check for required Python packages
    try {
      await execAsync('python -c "import fastapi"');
      results.push({ name: 'fastapi installed', status: 'ok', message: 'OK' });
      console.log(`${GREEN}✅${RESET} fastapi installed`);
    } catch {
      results.push({
        name: 'fastapi installed',
        status: 'error',
        message: 'fastapi not found',
        fix: 'Run: pip install fastapi uvicorn'
      });
      console.log(`${RED}❌${RESET} fastapi installed`);
      console.log(`   ${RED}Error: fastapi not found${RESET}`);
      console.log(`   ${YELLOW}Fix: Run: pip install fastapi uvicorn${RESET}`);
    }

    try {
      await execAsync('python -c "import azure"');
      results.push({ name: 'azure SDK installed', status: 'ok', message: 'OK' });
      console.log(`${GREEN}✅${RESET} azure SDK installed`);
    } catch {
      results.push({
        name: 'azure SDK installed',
        status: 'error',
        message: 'azure SDK not found',
        fix: 'Run: pip install azure-identity azure-ai-projects'
      });
      console.log(`${RED}❌${RESET} azure SDK installed`);
      console.log(`   ${RED}Error: azure SDK not found${RESET}`);
      console.log(`   ${YELLOW}Fix: Run: pip install azure-identity azure-ai-projects${RESET}`);
    }
  } catch {
    results.push({
      name: 'Python installed',
      status: 'error',
      message: 'Python not found',
      fix: 'Install Python 3.8 or later from python.org'
    });
    console.log(`${RED}❌${RESET} Python installed`);
    console.log(`   ${RED}Error: Python not found in PATH${RESET}`);
  }

  // 5. Check connectivity (if endpoint is set)
  if (endpoint) {
    console.log(`\n${BLUE}🌐 Connectivity:${RESET}`);
    try {
      const response = await fetch(endpoint, { method: 'GET' });
      // Azure endpoints return 404 for GET requests without proper API call
      // This is normal and expected - it means the endpoint is reachable
      // Accept: 200 (OK), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found)
      if (response.ok || response.status === 401 || response.status === 403 || response.status === 404) {
        results.push({ name: 'Endpoint reachable', status: 'ok', message: 'OK' });
        console.log(`${GREEN}✅${RESET} Endpoint reachable (HTTP ${response.status})`);
        console.log(`   ${GREEN}Note: 404 is normal for Azure endpoints${RESET}`);
      } else {
        // Only fail for unexpected status codes
        results.push({
          name: 'Endpoint reachable',
          status: 'error',
          message: `HTTP ${response.status}`,
          fix: 'Check endpoint URL and network connectivity'
        });
        console.log(`${RED}❌${RESET} Endpoint reachable`);
        console.log(`   ${RED}Error: HTTP ${response.status}${RESET}`);
      }
    } catch (err) {
      const errMsg = (err as Error).message;
      // Network errors like ENOTFOUND are real problems
      results.push({
        name: 'Endpoint reachable',
        status: 'error',
        message: 'Network error',
        fix: 'Check endpoint URL and network connectivity. Make sure you have internet access.'
      });
      console.log(`${RED}❌${RESET} Endpoint reachable`);
      console.log(`   ${RED}Error: ${errMsg}${RESET}`);
      if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
        console.log(`   ${YELLOW}Hint: Cannot resolve endpoint URL. Check the domain is correct.${RESET}`);
      }
    }
  }

  // Summary
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}Summary:${RESET}`);

  const errors = results.filter(r => r.status === 'error');
  const warnings = results.filter(r => r.status === 'warning');
  const ok = results.filter(r => r.status === 'ok');

  console.log(`${GREEN}✅ OK:${RESET} ${ok.length}`);
  if (warnings.length > 0) console.log(`${YELLOW}⚠️  Warnings:${RESET} ${warnings.length}`);
  if (errors.length > 0) console.log(`${RED}❌ Errors:${RESET} ${errors.length}`);

  console.log(`\n${BLUE}Next Steps:${RESET}`);
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`${GREEN}✅ Your setup is ready!${RESET}`);
    console.log(`\nStart the services with:`);
    console.log(`  1. npm run agent-bridge      (in one terminal)`);
    console.log(`  2. npm run start:dev         (in another terminal)`);
  } else if (errors.length === 0 && warnings.length > 0) {
    console.log(`${GREEN}✅ Setup is good to go! (warnings are optional)${RESET}`);
    console.log(`\nStart the services with:`);
    console.log(`  1. npm run agent-bridge      (in one terminal)`);
    console.log(`  2. npm run start:dev         (in another terminal)`);
  } else {
    console.log(`Fix the errors above and run this validation again.`);
  }

  console.log(`\n${BLUE}Useful Commands:${RESET}`);
  console.log(`  npm run discover:agents      - List all available agents`);
  console.log(`  npm run test:foundry         - Test Foundry connection`);
  console.log(`  npm run agent-bridge         - Start bridge service`);
  console.log(`  npm run start:dev            - Start app in dev mode`);
  console.log(`  npm run start:with-bridge    - Start both services together`);
  console.log(`\n`);
}

validateSetup().catch(err => {
  console.error(`${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
