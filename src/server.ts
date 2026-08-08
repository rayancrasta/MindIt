import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerAddFeatureTool } from './tools/addFeature.js';
import { registerAddStoryTool } from './tools/addStory.js';
import { registerAddTaskTool } from './tools/addTask.js';
import { registerAddBugTool } from './tools/addBug.js';
import { registerUpdateFeatureTool } from './tools/updateFeature.js';
import { registerUpdateStoryTool } from './tools/updateStory.js';
import { registerUpdateTaskTool } from './tools/updateTask.js';
import { registerUpdateBugTool } from './tools/updateBug.js';
import { registerDeleteFeatureTool } from './tools/deleteFeature.js';
import { registerDeleteStoryTool } from './tools/deleteStory.js';
import { registerDeleteTaskTool } from './tools/deleteTask.js';
import { registerDeleteBugTool } from './tools/deleteBug.js';
import { registerListFeaturesTool } from './tools/listFeatures.js';
import { registerListStoriesTool } from './tools/listStories.js';
import { registerListTasksTool } from './tools/listTasks.js';
import { registerListBugsTool } from './tools/listBugs.js';
import { registerLinkStoriesTool } from './tools/linkStories.js';
import { registerUnlinkStoriesTool } from './tools/unlinkStories.js';
import { registerGetStatusTool } from './tools/getStatus.js';
import { registerLogSessionTool } from './tools/logSession.js';
import { registerGetResumeTool } from './tools/getResume.js';
import { registerGetItemTool } from './tools/getItem.js';
import { registerAddCommentTool } from './tools/addComment.js';
import { registerUpdateCommentTool } from './tools/updateComment.js';
import { registerDeleteCommentTool } from './tools/deleteComment.js';
import { registerCreateWikiPageTool } from './tools/createWikiPage.js';
import { registerUpdateWikiPageTool } from './tools/updateWikiPage.js';
import { registerAppendWikiPageTool } from './tools/appendWikiPage.js';
import { registerReadWikiPageTool } from './tools/readWikiPage.js';
import { registerDeleteWikiPageTool } from './tools/deleteWikiPage.js';
import { registerListWikiTool } from './tools/listWiki.js';

const server = new McpServer({ name: 'work-tracker', version: '0.1.0' });

registerAddFeatureTool(server);
registerAddStoryTool(server);
registerAddTaskTool(server);
registerAddBugTool(server);
registerUpdateFeatureTool(server);
registerUpdateStoryTool(server);
registerUpdateTaskTool(server);
registerUpdateBugTool(server);
registerDeleteFeatureTool(server);
registerDeleteStoryTool(server);
registerDeleteTaskTool(server);
registerDeleteBugTool(server);
registerListFeaturesTool(server);
registerListStoriesTool(server);
registerListTasksTool(server);
registerListBugsTool(server);
registerLinkStoriesTool(server);
registerUnlinkStoriesTool(server);
registerGetStatusTool(server);
registerLogSessionTool(server);
registerGetResumeTool(server);
registerGetItemTool(server);
registerAddCommentTool(server);
registerUpdateCommentTool(server);
registerDeleteCommentTool(server);
registerCreateWikiPageTool(server);
registerUpdateWikiPageTool(server);
registerAppendWikiPageTool(server);
registerReadWikiPageTool(server);
registerDeleteWikiPageTool(server);
registerListWikiTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error starting work-tracker MCP server:', err);
  process.exit(1);
});
