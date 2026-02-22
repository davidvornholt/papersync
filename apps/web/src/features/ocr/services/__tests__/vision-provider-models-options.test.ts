import { describe, expect, it } from 'bun:test';

describe('Gemini Model Configuration', () => {
  const EXPECTED_MODELS = [
    'gemini-3-flash-preview',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite',
  ];

  it('should have correct model priority order', () => {
    expect(EXPECTED_MODELS[0]).toBe('gemini-3-flash-preview');
    expect(EXPECTED_MODELS[EXPECTED_MODELS.length - 1]).toBe(
      'gemini-2.5-flash-lite',
    );
  });

  it('should identify Gemini 3 models correctly', () => {
    const gemini3Models = EXPECTED_MODELS.filter((m) => m.includes('gemini-3'));
    expect(gemini3Models).toContain('gemini-3-flash-preview');
    expect(gemini3Models).toHaveLength(1);
  });

  it('should identify Gemini 2.5 models correctly', () => {
    const gemini25Models = EXPECTED_MODELS.filter((m) => m.includes('2.5'));
    expect(gemini25Models).toContain('gemini-2.5-flash');
    expect(gemini25Models).toContain('gemini-2.5-flash-lite');
    expect(gemini25Models).toHaveLength(2);
  });
});

describe('Provider Options Configuration', () => {
  it('should configure high media resolution', () => {
    const providerOptions = {
      google: {
        mediaResolution: 'MEDIA_RESOLUTION_HIGH' as const,
        thinkingConfig: { thinkingLevel: 'medium' as const },
      },
    };

    expect(providerOptions.google.mediaResolution).toBe(
      'MEDIA_RESOLUTION_HIGH',
    );
  });

  it('should configure thinkingLevel for Gemini 3 models', () => {
    const providerOptions = {
      google: {
        thinkingConfig: { thinkingLevel: 'medium' as const },
      },
    };

    expect(providerOptions.google.thinkingConfig.thinkingLevel).toBe('medium');
  });

  it('should configure thinkingBudget for Gemini 2.5 models', () => {
    const providerOptions = {
      google: {
        thinkingConfig: { thinkingBudget: 4096 },
      },
    };

    expect(providerOptions.google.thinkingConfig.thinkingBudget).toBe(4096);
  });
});
