export function buildMCPCommandsPrompt(step: string, context: any) {
  const systemPrompt = `You are an expert E2E testing assistant. Convert the following test step into MCP tool calls.

Guidelines:
- Convert the step into one or more specific, actionable MCP tool calls.
- Use the "ref" from the page elements for actions like click and type.
- **CRITICAL RULE:** After any 'browser_navigate' call or a 'browser_click' call that likely causes a page transition (e.g., clicking 'Login', 'Submit', or a major link), you MUST follow it with a 'browser_wait_for' call.
- Intelligently decide what to wait for. Look at the user's instruction to predict what should appear next. For example, if the step is "Click 'Sign in' button", the subsequent wait should be for an element on the dashboard, like "Welcome" text or a "Logout" button.
- If the user step is just "Wait for URL to be /", you should use the 'browser_wait_for' tool and wait for a piece of text you expect to see on the home page.

Respond with a JSON array of tool calls in this format:
[{ "tool": "tool_name", "args": { "param": "value" } }]`;

  const prompt = `Test Step: ${step}

Current Page Context:
- URL: ${context.url || 'unknown'}
- Elements: ${
    context.elements
      ? context.elements
          .slice(0, 10)
          .map((el: any) => `${el.type}: "${el.name || el.text}"`)
          .join(', ')
      : 'none'
  }

Available MCP Tools: ${
    context.availableTools || 'browser_navigate, browser_type, browser_click, browser_snapshot'
  }`;

  return { prompt, systemPrompt };
}

export function buildParseScenarioPrompt(markdownContent: string) {
  const systemPrompt = `You are an expert test analyst. Your task is to parse a markdown document that describes a test scenario and convert it into a structured JSON object.

The markdown has three main parts:
1. A main title or description, usually starting with '#'.
2. A section for test steps. This section might be titled '## Test Steps', '## Steps', '## Actions', or something similar. All list items ('- ' or '* ') in this section are the 'rawSteps'.
3. A section for expected results. This might be titled '## Expected Results', '## Assertions', '## Verify', or something similar. All list items ('- ' or '* ') in this section are the 'rawOutcomes'.

Your job is to intelligently identify these three parts and return them in a single JSON object with the keys "description", "rawSteps", and "rawOutcomes". If the steps or outcomes sections are missing, return an empty array for the corresponding key.`;

  const prompt = `Parse the following markdown content:

\`\`\`markdown
${markdownContent}
\`\`\``;

  return { prompt, systemPrompt };
}

export function buildBatchVerifyOutcomesPrompt(outcomes: string[], pageState: any) {
  const systemPrompt = `You are an expert web testing assistant. Your task is to analyze a web page's state and determine if a list of expected outcomes has been met.

For each outcome in the list, you must determine if it is true based *only* on the provided Page Elements.

Respond with a JSON array where each object corresponds to an outcome from the input list. Each object must have this structure:
{
  "description": "The original outcome text",
  "status": "passed" | "failed",
  "error": "A brief explanation ONLY if the status is failed, otherwise omit this key"
}`;

  const prompt = `Based on the Current Page Elements provided below, verify each of the following Expected Outcomes:

Expected Outcomes:
${outcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Current Page Elements:
${
  pageState.elements && pageState.elements.length > 0
    ? pageState.elements.map((el: any) => `${el.type}: "${el.name || el.text}"`).join('\n')
    : 'none'
}`;
  return { prompt, systemPrompt };
}

export function buildAnalysisPrompt(analysisInput: string) {
  const systemPrompt = `You are an expert QA analyst. Your task is to provide actionable insights from test results.

Return ONLY valid JSON with this structure:
{
  "summary": "A brief summary of the key findings.",
  "suggestions": ["Specific, actionable suggestion 1", "Suggestion 2"]
}

Guidelines:
- Provide a concise summary and practical, actionable suggestions.
- Focus on the root causes of failures, performance bottlenecks (based on the provided step durations), and accessibility issues.
- **IMPORTANT**: The first step's duration often includes one-time setup costs (like launching a browser) and should be analyzed with that in mind. Do not flag it as an application performance issue unless it is exceptionally long (e.g., >10 seconds).
- Suggest specific, preventative improvements for both the test script and the application code.`;

  const prompt = `Analyze the following test execution data and provide a comprehensive analysis with specific, actionable recommendations for improving this test and the application being tested.

${analysisInput}`;

  return { prompt, systemPrompt };
}
