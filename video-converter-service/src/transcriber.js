const { pipeline } = require('@xenova/transformers');

// Variável para armazenar o pipeline de transcrição e evitar recarregá-lo.
// O modelo será carregado na primeira chamada e reutilizado nas subsequentes.
let transcriber;

/**
 * Transcreve um arquivo de áudio para texto usando o modelo Whisper.
 * @param {string} audioPath O caminho para o arquivo de áudio a ser transcrito.
 * @returns {Promise<string>} O texto transcrito.
 */
async function transcribe(audioPath) {
  try {
    console.log('[TRANSCRIBER] Iniciando processo de transcrição...');

    // Carrega o pipeline de transcrição na primeira vez que a função é chamada.
    if (!transcriber) {
      console.log('[TRANSCRIBER] Carregando o modelo Whisper (Xenova/whisper-tiny). Isso pode levar um momento...');
      // Usamos o modelo 'tiny' para um bom equilíbrio entre performance e uso de recursos.
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
      console.log('[TRANSCRIBER] Modelo Whisper carregado com sucesso.');
    }

    console.log(`[TRANSCRIBER] Transcrevendo o arquivo: ${audioPath}`);
    
    // Executa a transcrição.
    const result = await transcriber(audioPath, {
      // Garante que o resultado seja um texto simples.
      return_timestamps: false,
    });

    console.log('[TRANSCRIBER] Transcrição concluída com sucesso.');
    
    // O resultado é um objeto com a propriedade 'text'.
    return result.text;

  } catch (error) {
    console.error('[TRANSCRIBER] Ocorreu um erro durante a transcrição:', error);
    // Lança o erro para que o chamador possa tratá-lo.
    throw new Error('Falha ao transcrever o áudio.');
  }
}

module.exports = { transcribe };
