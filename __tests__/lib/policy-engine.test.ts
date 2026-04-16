import { describe, it, expect } from 'vitest'
import { parsePolicyConfig, evaluatePrCompliance, globMatch } from '@/lib/policy-engine'
import type { ScanFinding } from '@/lib/github-scanner'

describe('parsePolicyConfig', () => {
  it('returns defaults for empty input', () => {
    const config = parsePolicyConfig('')
    expect(config.version).toBe(1)
    expect(config.compliance.framework).toBe('eu-ai-act')
    expect(config.compliance.enforcement).toBe('warning')
  })

  it('parses a complete YAML config', () => {
    const yaml = `
version: 1
compliance:
  framework: eu-ai-act
  enforcement: blocking
rules:
  require_registration: true
  require_documentation:
    - risk_assessment
    - human_oversight_plan
  max_risk_tier_without_approval: limited
  auto_classify: true
ignore:
  paths:
    - "tests/**"
  models:
    - "dev-*"
`
    const config = parsePolicyConfig(yaml)
    expect(config.compliance.enforcement).toBe('blocking')
    expect(config.rules.require_registration).toBe(true)
    expect(config.rules.require_documentation).toEqual(['risk_assessment', 'human_oversight_plan'])
    expect(config.rules.max_risk_tier_without_approval).toBe('limited')
    expect(config.ignore.paths).toEqual(['tests/**'])
    expect(config.ignore.models).toEqual(['dev-*'])
  })

  it('parses JSON policy', () => {
    const json = JSON.stringify({
      version: 1,
      compliance: { framework: 'eu-ai-act', enforcement: 'informational' },
      rules: { require_registration: false, require_documentation: [], max_risk_tier_without_approval: 'high', auto_classify: false },
      ignore: { paths: [], models: [] },
      notifications: {},
    })
    const config = parsePolicyConfig(json)
    expect(config.compliance.enforcement).toBe('informational')
    expect(config.rules.auto_classify).toBe(false)
  })
})

describe('globMatch', () => {
  it('matches simple wildcard', () => {
    expect(globMatch('src/model.py', 'src/*.py')).toBe(true)
    expect(globMatch('src/model.ts', 'src/*.py')).toBe(false)
  })

  it('matches double star', () => {
    expect(globMatch('tests/unit/test_model.py', 'tests/**')).toBe(true)
    expect(globMatch('src/tests/test.py', '**/tests/**')).toBe(true)
  })
})

describe('evaluatePrCompliance', () => {
  const baseFinding: ScanFinding = {
    name: 'fraud-detector',
    framework: 'PyTorch',
    files: ['src/model.py'],
    dependencies: ['torch'],
    suggestedRiskTier: 'high',
    suggestedSector: 'financial_services',
    confidence: 0.9,
  }

  it('passes with no violations when rules are permissive', () => {
    const policy = parsePolicyConfig('')
    const result = evaluatePrCompliance([baseFinding], policy)
    expect(result.passed).toBe(true)
    expect(result.violations.length).toBe(0)
  })

  it('flags unregistered models when registration required', () => {
    const policy = parsePolicyConfig(`
rules:
  require_registration: true
`)
    const result = evaluatePrCompliance([baseFinding], policy)
    expect(result.violations.some(v => v.rule === 'require_registration')).toBe(true)
  })

  it('flags risk tier violations', () => {
    const policy = parsePolicyConfig(`
compliance:
  enforcement: blocking
rules:
  max_risk_tier_without_approval: limited
`)
    const result = evaluatePrCompliance([baseFinding], policy)
    expect(result.violations.some(v => v.rule === 'max_risk_tier_without_approval')).toBe(true)
    expect(result.passed).toBe(false)
  })

  it('ignores models matching ignore patterns', () => {
    const policy = parsePolicyConfig(`
rules:
  require_registration: true
ignore:
  models:
    - "fraud-*"
`)
    const result = evaluatePrCompliance([baseFinding], policy)
    expect(result.violations.length).toBe(0)
  })

  it('ignores files matching path patterns', () => {
    const finding = { ...baseFinding, files: ['tests/test_model.py'], dependencies: [] }
    const policy = parsePolicyConfig(`
rules:
  require_registration: true
ignore:
  paths:
    - "tests/**"
`)
    const result = evaluatePrCompliance([finding], policy)
    expect(result.violations.length).toBe(0)
  })
})
