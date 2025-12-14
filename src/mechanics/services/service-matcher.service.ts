import { Injectable } from '@nestjs/common';

/**
 * Enhanced Service Matching Algorithm
 * Uses specialized scoring and service compatibility matrix
 */
@Injectable()
export class ServiceMatcherService {
  // Service categories with priority weights
  private readonly serviceCategories = {
    critical: ['towing', 'accident-response', 'ev-charging-issue'],
    urgent: ['battery-jump', 'flat-tire', 'fuel-delivery', 'lockout'],
    standard: ['oil-change', 'brake-repair', 'engine-diagnostic'],
    specialized: ['ev-specialist', 'transmission', 'hybrid-repair'],
  };

  // Service compatibility matrix - which services work well together
  private readonly compatibilityMatrix: Record<string, string[]> = {
    'battery-jump': ['electrical-repair', 'alternator-replacement', 'starter-replacement'],
    'flat-tire': ['tire-change', 'wheel-alignment', 'suspension-repair'],
    'towing': ['accident-response', 'mechanical-breakdown', 'collision-repair'],
    'engine-diagnostic': ['engine-repair', 'fuel-system', 'transmission'],
    'ev-charging-issue': ['ev-specialist', 'battery-management', 'charging-port-repair'],
    'fuel-delivery': ['fuel-system', 'tank-repair'],
    'lockout': ['key-replacement', 'ignition-repair', 'security-system'],
    'oil-change': ['filter-replacement', 'fluid-service', 'maintenance'],
    'brake-repair': ['brake-pad-replacement', 'rotor-service', 'brake-fluid'],
    'accident-response': ['towing', 'body-work', 'frame-repair', 'insurance-claims'],
  };

  // Problem type to required services mapping
  private readonly problemTypeServices: Record<string, string[]> = {
    battery_dead: ['battery-jump', 'battery-replacement', 'electrical-repair'],
    flat_tire: ['flat-tire', 'tire-change', 'tire-repair'],
    out_of_fuel: ['fuel-delivery', 'fuel-system'],
    engine_trouble: ['engine-diagnostic', 'engine-repair', 'towing'],
    towing_required: ['towing', 'mechanical-breakdown'],
    ev_charging_issue: ['ev-specialist', 'ev-charging-issue', 'battery-management'],
    accident: ['accident-response', 'towing', 'collision-repair'],
    general: ['general-repair', 'diagnostic', 'maintenance'],
  };

  /**
   * Calculate enhanced service match score
   * Returns a score between 0-100 based on service compatibility
   */
  calculateServiceMatchScore(
    mechanicServices: string[],
    requiredServices?: string[],
    problemType?: string,
  ): number {
    if (!requiredServices && !problemType) {
      return 50; // Neutral score if no services specified
    }

    // Get required services from problem type
    const targetServices = requiredServices || this.getServicesForProblem(problemType || '');
    
    if (targetServices.length === 0) {
      return 50;
    }

    let totalScore = 0;
    let maxPossibleScore = 0;

    targetServices.forEach(service => {
      const category = this.getServiceCategory(service);
      const categoryWeight = this.getCategoryWeight(category);
      
      maxPossibleScore += categoryWeight;

      // Direct match
      if (mechanicServices.includes(service)) {
        totalScore += categoryWeight;
      } else {
        // Check for compatible services
        const compatibleServices = this.compatibilityMatrix[service] || [];
        const hasCompatible = compatibleServices.some(cs => mechanicServices.includes(cs));
        
        if (hasCompatible) {
          // Partial credit for compatible service
          totalScore += categoryWeight * 0.5;
        }
      }
    });

    // Bonus for specialized services
    const specializedBonus = this.calculateSpecializedBonus(
      mechanicServices,
      targetServices,
    );

    // Calculate percentage score
    const baseScore = maxPossibleScore > 0 
      ? (totalScore / maxPossibleScore) * 100 
      : 50;

    return Math.min(100, baseScore + specializedBonus);
  }

  /**
   * Get detailed service match breakdown
   */
  getServiceMatchDetails(
    mechanicServices: string[],
    requiredServices?: string[],
    problemType?: string,
  ): {
    score: number;
    matches: string[];
    compatibleMatches: string[];
    missing: string[];
    specializedServices: string[];
    matchPercentage: number;
  } {
    const targetServices = requiredServices || this.getServicesForProblem(problemType || '');
    
    const matches: string[] = [];
    const compatibleMatches: string[] = [];
    const missing: string[] = [];
    const specializedServices: string[] = [];

    targetServices.forEach(service => {
      if (mechanicServices.includes(service)) {
        matches.push(service);
      } else {
        const compatibleServices = this.compatibilityMatrix[service] || [];
        const foundCompatible = compatibleServices.find(cs => mechanicServices.includes(cs));
        
        if (foundCompatible) {
          compatibleMatches.push(foundCompatible);
        } else {
          missing.push(service);
        }
      }
    });

    // Find specialized services
    const specialized = this.serviceCategories.specialized;
    mechanicServices.forEach(service => {
      if (specialized.includes(service)) {
        specializedServices.push(service);
      }
    });

    const score = this.calculateServiceMatchScore(mechanicServices, requiredServices, problemType);
    const matchPercentage = targetServices.length > 0 
      ? ((matches.length + compatibleMatches.length * 0.5) / targetServices.length) * 100
      : 0;

    return {
      score,
      matches,
      compatibleMatches,
      missing,
      specializedServices,
      matchPercentage,
    };
  }

  /**
   * Get recommended services for a problem type
   */
  getServicesForProblem(problemType: string): string[] {
    return this.problemTypeServices[problemType] || [];
  }

  /**
   * Get service category
   */
  private getServiceCategory(service: string): 'critical' | 'urgent' | 'standard' | 'specialized' {
    for (const [category, services] of Object.entries(this.serviceCategories)) {
      if (services.includes(service)) {
        return category as any;
      }
    }
    return 'standard';
  }

  /**
   * Get weight for service category
   */
  private getCategoryWeight(category: string): number {
    const weights = {
      critical: 40,
      urgent: 30,
      standard: 20,
      specialized: 35,
    };
    return weights[category] || 20;
  }

  /**
   * Calculate bonus for specialized services
   */
  private calculateSpecializedBonus(
    mechanicServices: string[],
    targetServices: string[],
  ): number {
    let bonus = 0;

    // Bonus for having specialized skills related to the problem
    const specializedServices = this.serviceCategories.specialized;
    const hasSpecialized = mechanicServices.some(s => specializedServices.includes(s));
    
    if (hasSpecialized) {
      bonus += 5; // +5% for specialized expertise
    }

    // Bonus for offering multiple compatible services
    const compatibleCount = targetServices.reduce((count, target) => {
      const compatible = this.compatibilityMatrix[target] || [];
      const hasAny = compatible.some(c => mechanicServices.includes(c));
      return count + (hasAny ? 1 : 0);
    }, 0);

    if (compatibleCount >= 2) {
      bonus += 3; // +3% for multiple compatible services
    }

    return bonus;
  }

  /**
   * Generate match explanation for users
   */
  generateMatchExplanation(
    mechanicServices: string[],
    requiredServices?: string[],
    problemType?: string,
  ): string[] {
    const details = this.getServiceMatchDetails(mechanicServices, requiredServices, problemType);
    const explanations: string[] = [];

    if (details.matches.length === details.matches.length + details.compatibleMatches.length + details.missing.length) {
      explanations.push('✅ Offers all required services');
    } else if (details.matches.length > 0) {
      explanations.push(`✅ Offers ${details.matches.length} required service(s)`);
    }

    if (details.compatibleMatches.length > 0) {
      explanations.push(`🔧 Has ${details.compatibleMatches.length} compatible service(s)`);
    }

    if (details.specializedServices.length > 0) {
      explanations.push(`⭐ Specialized in ${details.specializedServices[0]}`);
    }

    if (details.matchPercentage >= 80) {
      explanations.push('🎯 Excellent service match');
    } else if (details.matchPercentage >= 60) {
      explanations.push('👍 Good service match');
    }

    return explanations;
  }

  /**
   * Rank mechanics by service match quality
   */
  rankMechanicsByServiceMatch(
    mechanics: Array<{ id: string; services: string[] }>,
    requiredServices?: string[],
    problemType?: string,
  ): Array<{ mechanicId: string; score: number; matchDetails: any }> {
    return mechanics
      .map(mechanic => ({
        mechanicId: mechanic.id,
        score: this.calculateServiceMatchScore(
          mechanic.services,
          requiredServices,
          problemType,
        ),
        matchDetails: this.getServiceMatchDetails(
          mechanic.services,
          requiredServices,
          problemType,
        ),
      }))
      .sort((a, b) => b.score - a.score);
  }
}
