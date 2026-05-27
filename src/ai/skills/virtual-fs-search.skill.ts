import { AISkill, SkillResult, SkillContext } from './types';
import { globalSkillRegistry } from '../orchestrator/SkillRegistry';
import { vfsAdapter, VFSQueryResult } from '../mirage/VirtualFilesystemAdapter';
import { z } from 'zod';

export const VirtualFSSearchInputSchema = z.object({
  query: z.string().min(3),
  paths: z.array(z.string()).default(['/']), // e.g., ['/gmail', '/slack', '/drive', '/vendors']
});

export const VirtualFSSearchOutputSchema = z.object({
  results: z.array(z.object({
    path: z.string(),
    source: z.string(),
    contentSnippet: z.string()
  }).catchall(z.any())),
  summary: z.string()
}).catchall(z.any());

export type VirtualFSSearchInput = z.infer<typeof VirtualFSSearchInputSchema>;
export type VirtualFSSearchOutput = z.infer<typeof VirtualFSSearchOutputSchema>;

export class VirtualFSSearchSkill implements AISkill<VirtualFSSearchInput, VirtualFSSearchOutput> {
  id = 'skill.mirage.vfs.search';
  name = 'Cross-Platform VFS Search Engine';
  description = 'Performs read-only global intelligence searches across mounted external integrations (Gmail, Slack, Drive) using a virtual filesystem abstraction.';
  version = '1.0.0';

  inputSchema = VirtualFSSearchInputSchema;
  outputSchema = VirtualFSSearchOutputSchema;

  async execute(input: VirtualFSSearchInput, context?: SkillContext): Promise<SkillResult<VirtualFSSearchOutput>> {
    const tenantId = context?.tenantId || 'system';
    
    // EXTREMELY STRICT BOUNDARIES: Read-Only execution ONLY
    // We enforce tenant isolation at the adapter layer
    const searchResults = await vfsAdapter.search(input.query, input.paths, tenantId);
    
    return {
      success: true,
      data: {
        results: searchResults,
        summary: `Found ${searchResults.length} cross-platform operational signals matching "${input.query}".`
      }
    };
  }
}

globalSkillRegistry.register(new VirtualFSSearchSkill());
