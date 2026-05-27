import { AISkill } from '../skills/types';

export class SkillRegistry {
  private skills: Map<string, AISkill> = new Map();

  register(skill: AISkill): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[SkillRegistry] Skill with ID ${skill.id} is already registered. Overwriting.`);
    }
    this.skills.set(skill.id, skill);
  }

  getSkill(id: string): AISkill | undefined {
    return this.skills.get(id);
  }

  getAllSkills(): AISkill[] {
    return Array.from(this.skills.values());
  }
}

export const globalSkillRegistry = new SkillRegistry();
