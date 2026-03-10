import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@brainule/shared';

export interface PromptRepository {
  getPrompt(promptName: string, variables?: Record<string, string>): Promise<string>;
}

export class FilePromptRepository implements PromptRepository {
  private cache = new Map<string, string>();

  constructor(private readonly promptsDir: string) {}

  async getPrompt(promptName: string, variables: Record<string, string> = {}): Promise<string> {
    let template = this.cache.get(promptName);
    if (!template) {
      const filePath = path.join(this.promptsDir, `${promptName}.md`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Prompt not found: ${promptName} (looked at ${filePath})`);
      }
      template = fs.readFileSync(filePath, 'utf8');
      this.cache.set(promptName, template);
    }

    return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key: string) => {
      if (key in variables) return variables[key];
      logger.warn(`Prompt variable not provided: {{${key}}} in prompt '${promptName}'`);
      return match;
    });
  }
}
