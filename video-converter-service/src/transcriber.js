const { pipeline } = require("@xenova/transformers");
const fs = require("fs");
const wavefile = require("wavefile");

/**
 * Transcreve um arquivo de áudio para texto usando o modelo Whisper.
 * Carrega o modelo sob demanda e o descarta para economizar memória.
 * @param {string} audioPath O caminho para o arquivo de áudio a ser transcrito.
 * @returns {Promise<string>} O texto transcrito.
 */
async function transcribe(audioPath) {
  let transcriber; // Definido no escopo da função
  try {
    console.log("[TRANSCRIBER] Iniciando processo de transcrição...");

    // Carrega o pipeline de transcrição a cada chamada.
    console.log(
      "[TRANSCRIBER] Carregando o modelo Whisper (Xenova/whisper-tiny). Isso pode levar um momento...",
    );
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
    );
    console.log("[TRANSCRIBER] Modelo Whisper carregado com sucesso.");

    console.log(
      `[TRANSCRIBER] Lendo e processando o arquivo de áudio: ${audioPath}`,
    );

    // 1. Ler o arquivo de áudio para um buffer
    const buffer = fs.readFileSync(audioPath);

    // 2. Usar 'wavefile' para decodificar e formatar o áudio
    const wav = new wavefile.WaveFile(buffer);
    wav.toBitDepth("32f"); // O pipeline espera Float32Array
    wav.toSampleRate(16000); // Whisper espera uma taxa de amostragem de 16000Hz

    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
      if (audioData.length > 1) {
        // Se for estéreo, mescla os canais
        const SCALING_FACTOR = Math.sqrt(2);
        for (let i = 0; i < audioData[0].length; ++i) {
          audioData[0][i] =
            (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
        }
      }
      // Seleciona o primeiro canal
      audioData = audioData[0];
    }

    console.log("[TRANSCRIBER] Áudio processado. Enviando para o modelo...");

    // 3. Executa a transcrição com os dados de áudio processados
    const result = await transcriber(audioData, {
      return_timestamps: false,
      chunk_length_s: 30, // Recommended for long audio files
      stride_length_s: 5, // Recommended for overlapping chunks
    });

    console.log("[TRANSCRIBER] Transcrição concluída com sucesso.");

    return result.text;
  } catch (error) {
    console.error(
      "[TRANSCRIBER] Ocorreu um erro durante a transcrição:",
      error,
    );
    throw new Error("Falha ao transcrever o áudio.");
  } finally {
    // Garante que o modelo seja descartado para liberar memória
    if (transcriber && transcriber.model && transcriber.model.dispose) {
      console.log("[TRANSCRIBER] Descartando o modelo para liberar memória.");
      await transcriber.model.dispose();
    }
  }
}

module.exports = { transcribe };
