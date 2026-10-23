import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { PoiCategoryDefinition, ScoringProfile } from '@saferoute/shared-types';

const require = createRequire(import.meta.url);

/**
 * Loads the scoring configuration that ships with @saferoute/scoring-engine.
 *
 * A deployment can point CONFIG_DIR at its own copy to re-weight factors or add
 * POI categories for a region without touching code — this is the seam that
 * makes "another version of SafeRoute" a config change, not a fork.
 */
export class ScoringConfigService {
  readonly #configDir: string;
  #categories: PoiCategoryDefinition[] | null = null;
  #profiles: ScoringProfile[] | null = null;

  constructor(configDir = ScoringConfigService.defaultConfigDir()) {
    this.#configDir = configDir;
  }

  static defaultConfigDir(): string {
    const enginePackage = require.resolve('@saferoute/scoring-engine/package.json');
    return path.join(path.dirname(enginePackage), 'config');
  }

  async categories(): Promise<PoiCategoryDefinition[]> {
    this.#categories ??= await this.#read<PoiCategoryDefinition[]>('poi-categories.json');
    return this.#categories;
  }

  async profiles(): Promise<ScoringProfile[]> {
    this.#profiles ??= await this.#read<ScoringProfile[]>('profiles.json');
    return this.#profiles;
  }

  async #read<T>(fileName: string): Promise<T> {
    const raw = await readFile(path.join(this.#configDir, fileName), 'utf8');
    return JSON.parse(raw) as T;
  }
}
