export const CODE_COMPLETION_PROMPT = (codeContext: string) =>
	`Proporciona una sugerencia de autocompletado de código concisa basada en el siguiente contexto de código. Devuelve solo el código sugerido, sin explicaciones ni markdown:\n\n${codeContext}`;
