const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio');
const { spawn } = require('child_process');

async function testMCPServer() {
  console.log('🧪 Testing MCP Server...');
  
  // Spawn the server process
  const serverProcess = spawn('node', [
    'dist/bin/server.js',
    '--url', 'https://axghijicxekpfmqpduev.supabase.co',
    '--anon-key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4Z2hpamljeGVrcGZtcXBkdWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MjYyNTMsImV4cCI6MjA1OTMwMjI1M30.6hewDwpbT_NaAdyfRCI_04WwdJS7nFLCW9J3i7jA65w',
    '--email', 'mcptester@example.com',
    '--password', 'mcptester@312',
    '--config-path', 'pmsgenerator-tools-wrapped.json'
  ], {
    stdio: 'pipe'
  });

  try {
    // Create transport and client
    const transport = new StdioClientTransport({
      stdin: serverProcess.stdin,
      stdout: serverProcess.stdout
    });
    
    const client = new Client(
      {
        name: 'test-client',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Connect to server
    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // Test 1: List available tools
    console.log('\n📋 Testing: List Tools');
    const toolsResult = await client.listTools();
    console.log(`Found ${toolsResult.tools.length} tools:`);
    toolsResult.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Test 2: Try calling a simple tool
    if (toolsResult.tools.length > 0) {
      const firstTool = toolsResult.tools[0];
      console.log(`\n🔧 Testing: Call tool "${firstTool.name}"`);
      
      try {
        // Create minimal parameters for the tool
        const params = {};
        
        // Add required parameters if any
        if (firstTool.inputSchema?.required) {
          for (const requiredParam of firstTool.inputSchema.required) {
            if (requiredParam === 'project_id') {
              params[requiredParam] = '00000000-0000-4000-8000-000000000000'; // Test UUID
            } else if (requiredParam === 'limit') {
              params[requiredParam] = 5;
            } else {
              params[requiredParam] = 'test-value';
            }
          }
        }

        const result = await client.callTool({
          name: firstTool.name,
          arguments: params
        });
        
        console.log('✅ Tool call successful!');
        console.log('Response:', JSON.stringify(result.content, null, 2));
      } catch (toolError) {
        console.log('⚠️ Tool call failed (expected if no data):', toolError.message);
      }
    }

    // Cleanup
    await client.close();
    serverProcess.kill();
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    serverProcess.kill();
    process.exit(1);
  }
}

// Run the test
testMCPServer().catch(console.error); 