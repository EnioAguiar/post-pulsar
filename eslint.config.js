import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import tailwind from 'eslint-plugin-tailwindcss';

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	...astro.configs.recommended,
    ...tailwind.configs['flat/recommended'],
	{
		files: ['**/*.astro'],
		languageOptions: {
			parser: astro.parser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: ['.astro'],
			},
		},
	},
);