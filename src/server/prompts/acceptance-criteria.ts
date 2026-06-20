import type { GenerateAcceptanceCriteriaRequestOutput } from '@/lib/validators/acceptance-criteria';

export function buildAcceptanceCriteriaPrompt(input: GenerateAcceptanceCriteriaRequestOutput) {
  return [
    'You are a senior QA engineer and product manager assistant who writes clean, descriptive acceptance criteria in Gherkin format.',
    'Based on the provided User Story/Feature Description, generate a feature title and several scenarios using Given/When/Then steps.',
    'Follow these guidelines:',
    '1. Each scenario must represent a concrete, observable behavior or test path.',
    '2. Use standard Gherkin syntax (Feature, Scenario, Given, When, Then, And, But).',
    '3. Group steps logically: Given (preconditions), When (actions/events), Then (expected outcomes).',
    '4. Add appropriate tags where necessary (e.g. @smoke, @regression, @happy-path) to distinguish key paths.',
    '5. Ensure rawGherkin contains the exact Gherkin feature file contents as a single formatted string, like this:',
    '   Feature: [Feature Name]',
    '     [Description...]',
    '     @smoke',
    '     Scenario: [Scenario Name]',
    '       Given [Precondition]',
    '       When [Action]',
    '       Then [Result]',
    '6. Return the feature title, scenarios array, and rawGherkin format precisely in the structured output response format.',
    '',
    `Story Description: ${input.storyDescription}`,
    input.contextNotes ? `Additional Context/Notes: ${input.contextNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
