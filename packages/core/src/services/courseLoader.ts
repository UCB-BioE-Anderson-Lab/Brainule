import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ZodError } from 'zod';
import { logger } from '@brainule/shared';
import {
  CoursePackage,
  AssessmentItem,
  CorpusDocument,
  LeafTopic,
  Misconception,
  Module,
  Topic,
  Unit,
  LearningObjective,
} from '../types/course';
import {
  CourseMetadataSchema,
  ModuleSchema,
  UnitSchema,
  TopicSchema,
  LeafTopicSchema,
  MisconceptionSchema,
  LearningObjectiveSchema,
  AssessmentItemSchema,
  CorpusDocumentSchema,
} from '../schemas/course';

type Parser<T> = { parse(v: unknown): T };

function parseYamlFile<T>(filePath: string, schema: Parser<T>): T {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = yaml.load(raw);
  return schema.parse(parsed);
}

function parseJsonFile<T>(filePath: string, schema: Parser<T>): T {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}

function globDir<T>(
  dir: string,
  ext: 'yaml' | 'json',
  schema: Parser<T>,
  errors: string[],
): T[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.' + ext));
  const results: T[] = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const raw = ext === 'yaml'
        ? yaml.load(fs.readFileSync(filePath, 'utf8'))
        : JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // Support both single objects and arrays in a file
      const items = Array.isArray(raw) ? raw : [raw];
      for (let i = 0; i < items.length; i++) {
        try {
          results.push(schema.parse(items[i]));
        } catch (e) {
          if (e instanceof ZodError) {
            errors.push(`Validation error in ${filePath}[${i}]:\n  ${e.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n  ')}`);
          } else {
            errors.push(`Parse error in ${filePath}[${i}]: ${(e as Error).message}`);
          }
        }
      }
    } catch (e) {
      if (!(e instanceof ZodError)) {
        errors.push(`Failed to read ${filePath}: ${(e as Error).message}`);
      }
    }
  }
  return results;
}

export async function loadCoursePackage(courseDir: string): Promise<CoursePackage> {
  const errors: string[] = [];

  // course.yaml
  const metadataPath = path.join(courseDir, 'course.yaml');
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Course directory missing course.yaml: ${courseDir}`);
  }
  const metadata = parseYamlFile(metadataPath, CourseMetadataSchema);

  const modules = globDir<Module>(path.join(courseDir, 'modules'), 'yaml', ModuleSchema, errors);
  const units = globDir<Unit>(path.join(courseDir, 'units'), 'yaml', UnitSchema, errors);
  const topics = globDir<Topic>(path.join(courseDir, 'topics'), 'yaml', TopicSchema, errors);
  const leafTopics = globDir<LeafTopic>(path.join(courseDir, 'leaf-topics'), 'yaml', LeafTopicSchema, errors);
  const misconceptions = globDir<Misconception>(path.join(courseDir, 'misconceptions'), 'yaml', MisconceptionSchema, errors);
  const learningObjectives = globDir<LearningObjective>(path.join(courseDir, 'learning-objectives'), 'yaml', LearningObjectiveSchema, errors);

  // question banks — each file is an array of AssessmentItems
  const questionBankDir = path.join(courseDir, 'question-banks');
  const assessmentItems: AssessmentItem[] = [];
  if (fs.existsSync(questionBankDir)) {
    const bankFiles = fs.readdirSync(questionBankDir).filter((f) => f.endsWith('.json'));
    for (const file of bankFiles) {
      const filePath = path.join(questionBankDir, file);
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const items = Array.isArray(raw) ? raw : [raw];
        for (let i = 0; i < items.length; i++) {
          try {
            assessmentItems.push(AssessmentItemSchema.parse(items[i]));
          } catch (e) {
            if (e instanceof ZodError) {
              errors.push(`Question ${i} in ${file}: ${e.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`);
            }
          }
        }
      } catch (e) {
        if (!(e instanceof ZodError)) {
          errors.push(`Failed to parse ${file}: ${(e as Error).message}`);
        }
      }
    }
  }

  // corpus manifest
  const corpusDocuments: CorpusDocument[] = [];
  const manifestPath = path.join(courseDir, 'corpus-manifest.yaml');
  if (fs.existsSync(manifestPath)) {
    try {
      const raw = yaml.load(fs.readFileSync(manifestPath, 'utf8')) as unknown[];
      if (Array.isArray(raw)) {
        for (let i = 0; i < raw.length; i++) {
          try {
            corpusDocuments.push(CorpusDocumentSchema.parse(raw[i]));
          } catch (e) {
            if (e instanceof ZodError) {
              errors.push(`Corpus doc ${i} in corpus-manifest.yaml: ${e.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')}`);
            }
          }
        }
      }
    } catch (e) {
      errors.push(`Failed to parse corpus-manifest.yaml: ${(e as Error).message}`);
    }
  }

  if (errors.length > 0) {
    logger.warn('Course loaded with validation errors', { count: errors.length, courseId: metadata.courseId });
    for (const err of errors) {
      logger.warn(err);
    }
  }

  logger.info('Course package loaded', {
    courseId: metadata.courseId,
    modules: modules.length,
    leafTopics: leafTopics.length,
    questions: assessmentItems.length,
  });

  return {
    metadata,
    modules,
    units,
    topics,
    leafTopics,
    misconceptions,
    learningObjectives,
    assessmentItems,
    corpusDocuments,
  };
}
