# Assets fornecidos

Os cinco arquivos do usuário foram preservados. Os hashes SHA-256 e tamanhos de originais e derivados estão em [assets-manifest.json](assets-manifest.json).

| Arquivo fornecido | Original no projeto | Uso |
| --- | --- | --- |
| bg_login.mp4 | assets/source/auth/bg_login.mp4 | Vídeo decorativo do AuthLayout |
| main_logo.svg | assets/source/brand/main_logo.svg | Marca estática nas superfícies claras/escuras |
| logo_transicao.svg | assets/source/brand/logo_transicao.svg | Original preservado; animação por letra não aplicada |
| referencia login.png | docs/references/login.png | Referência de composição |
| Referencia solicitação de cadastro.png | docs/references/request-access.png | Referência de composição |

O MP4 original tem 1280×720, 25 fps, aproximadamente 28,49 s, H.264 com áudio AAC. O derivado `apps/web/public/media/auth-background.mp4` usa H.264/yuv420p, faststart e nenhum áudio, aproximadamente 28,4 s. O poster JPEG é um quadro real em 00:00:04, extraído localmente com FFmpeg 7.1 distribuído por imageio-ffmpeg 0.6.0. Seu comentário JPEG registra a origem; não houve geração de imagem ou vídeo.

Com FFmpeg instalado, a transformação é reproduzível:

```sh
ffmpeg -i assets/source/auth/bg_login.mp4 -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart apps/web/public/media/auth-background.mp4
ffmpeg -ss 4 -i assets/source/auth/bg_login.mp4 -frames:v 1 -q:v 2 apps/web/public/media/auth-poster.jpg
```

Os derivados `brand/logo-dark.svg` e `brand/logo-light.svg` removem o retângulo de fundo, ajustam o viewBox à geometria original e usam preenchimento preto/branco. Nenhum traço foi redesenhado. A marca entra como conjunto; não há splash obrigatório, espera artificial nem animação de letras.

O vídeo usa cover atrás de máscara escura independente. Textos HTML e formulário sólido continuam interativos antes da mídia. Pausa manual, aba oculta, reduced motion, economia de dados, erro e autoplay bloqueado têm fallback para poster. O mobile prioriza o formulário. Referências não fornecem destinos jurídicos; não foram inventados links de termos/privacidade.

Montserrat vem do pacote local Fontsource e mantém licença OFL em `docs/licenses/montserrat.txt`. Lucide, shadcn/ui e o BlurFade adaptado de Magic UI são locais; licenças dos componentes copiados estão em `docs/licenses/`. Não há fonte ou biblioteca carregada de CDN em runtime.
