import { AISkill, SkillResult } from './types';
import { globalSkillRegistry } from '../orchestrator/SkillRegistry';

export interface ResumeParserInput {
  rawText: string;
  sourceContext?: string; // e.g. "PDF upload", "LinkedIn Sync"
}

export interface ResumeParserOutput {
  name: string;
  email: string;
  skills: string[];
  experience: string;
  education?: string[];
  [key: string]: any;
}

export class ResumeParserSkill implements AISkill<ResumeParserInput, ResumeParserOutput> {
  id = 'skill.resume.parser';
  name = 'Cognitive Resume Extraction';
  description = 'Extracts structured semantic data (skills, experience, metadata) from unstructured text payloads.';
  version = '1.0.0';

  async execute(input: ResumeParserInput, context?: any): Promise<SkillResult<ResumeParserOutput>> {
    // Scaffold phase: This will encapsulate the current logic sitting in /api/extract-text.ts
    // For now, returning a mock to establish the architectural pattern.
    return {
      success: true,
      data: {
        name: 'Pending Structure',
        email: 'pending@architecture.net',
        skills: [],
        experience: 'N/A'
      }
    };
  }
}

// Auto-register
globalSkillRegistry.register(new ResumeParserSkill());
