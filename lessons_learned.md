# Lições Aprendidas: Publicação de Mídia via API

Este documento resume as principais descobertas e soluções encontradas durante a implementação da publicação de imagens e vídeos, especialmente com as APIs do Instagram e Twitter.

## 1. Publicação de Vídeo no Instagram (API Graph)

A publicação de vídeos no Instagram é um processo assíncrono e com requisitos técnicos rigorosos.

### Principais Descobertas:

1.  **`media_type` é `REELS`**: Para publicar um vídeo no feed, o `media_type` obrigatório é `REELS`. O tipo `VIDEO` foi descontinuado para esta finalidade e resulta em erro.

2.  **Polling de Status é Obrigatório**: Após a criação do contêiner do vídeo, é essencial implementar um loop de verificação (polling) para consultar o status do contêiner. A publicação só deve ser tentada quando o `status_code` do contêiner for `FINISHED`. Tentar publicar imediatamente após a criação resulta no erro "Media ID is not available".

3.  **Especificações Técnicas Rígidas**: Um status de `ERROR` durante o processamento do vídeo quase sempre indica que o arquivo de vídeo não atende às especificações técnicas da API. As principais são:
    *   **Contêiner**: MP4 ou MOV.
    *   **Codec de Vídeo**: H.264 ou HEVC.
    *   **Taxa de Quadros**: Constante (não variável), entre 23-60 FPS.
    *   **Faixa de Áudio**: **Obrigatória**. O arquivo precisa ter uma faixa de áudio (mesmo que silenciosa) com codec `AAC` e bitrate de `128 kbps`.
    *   **Resolução**: Recomendado 1080x1920 (9:16).

4.  **Arquivos de Vídeo Não Confiáveis**: Vídeos baixados de outras plataformas (como YouTube Shorts) ou gerados por algumas ferramentas de IA podem não ter uma estrutura de arquivo "limpa" ou podem não conter uma faixa de áudio, causando falha no processamento do Instagram.

### Solução Robusta:

A maneira mais confiável de garantir a compatibilidade é re-codificar o vídeo usando uma ferramenta como o **HandBrake** para forçar todas as especificações corretas, incluindo a criação de uma faixa de áudio silenciosa caso o vídeo original não a possua.

---

## 2. Publicação no Twitter/X

A API v2 do Twitter tem suas próprias particularidades, especialmente no plano gratuito.

### Principais Descobertas:

1.  **Erro `403 Forbidden`**: Este erro pode ter duas causas principais:
    *   **Permissão da App**: A causa mais óbvia é a permissão do aplicativo no Portal de Desenvolvedor não estar como "Read and Write".
    *   **Regra Anti-Spam**: A causa mais sutil e comum durante testes é a proteção contra conteúdo duplicado. Tentar publicar o mesmo texto (ou muito similar) várias vezes resulta em um erro `403`. A solução é garantir que cada post de teste seja único (ex: adicionando um número ao final).

2.  **Limitações do Plano Gratuito**: O plano `Free` da API do Twitter é extremamente restrito. Mesmo que o painel mostre cotas para "puxar" (pull) posts, a cota para **publicar** (post) é diferente e pode ser facilmente excedida, também resultando em erros `403`.
