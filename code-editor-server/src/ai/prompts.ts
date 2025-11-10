/**
 * Generates a prompt string for code completion requests.
 *
 * @param {string} codeContext - The partial code snippet or context that needs completion.
 * @returns {string} The formatted prompt instructing the model to generate only raw code completion.
 */
export const CODE_COMPLETION_PROMPT = (codeContext: string) =>
	`GENERATE ONLY CODE COMPLETION. Based on the following code context, output a single, concise code suggestion that directly completes the snippet. DO NOT include any explanations, markdown formatting, preamble, or commentary. The output must be the raw, suggested code:\n\nCode Context:\n${codeContext}`;
