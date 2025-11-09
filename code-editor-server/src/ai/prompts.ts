export const CODE_COMPLETION_PROMPT = (codeContext: string) =>
	`GENERATE ONLY CODE COMPLETION. Based on the following code context, output a single, concise code suggestion that directly completes the snippet. DO NOT include any explanations, markdown formatting, preamble, or commentary. The output must be the raw, suggested code:\n\nCode Context:\n${codeContext}`;
