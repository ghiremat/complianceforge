/**
 * EU AI Act compliance score (v2 spec name). Implementation lives in `compliance-scoring.ts`
 * alongside helpers used by the trust passport UI.
 */
export {
  calculateComplianceScore,
  getScoreGrade,
  getScoreStyle,
  type ScoreCriterion,
} from "@/lib/compliance-scoring";
