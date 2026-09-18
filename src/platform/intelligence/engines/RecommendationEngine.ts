import { RecommendationResult, NextBestActionResult } from '../models/HIEModels.js';

export interface RecommendationEngine {
  generateRecommendations(domain: string, entityId: string): Promise<RecommendationResult[]>;
  determineNextBestAction(domain: string, entityId: string): Promise<NextBestActionResult>;
}
