# Configurações de IA — revisão visual

- Source visual truth: `/Users/erik/Downloads/Configurações de IA simplificadas.png`.
- Implementação: instância principal em `http://127.0.0.1:5173/plataforma/configuracoes-ia` (API real sem credencial). A revisão inicial usou a prévia em `http://localhost:5174/plataforma/configuracoes-ia` e testes controlados em `http://localhost:5175/plataforma/configuracoes-ia`.
- Evidências: `docs/evidence/ai/desktop-connected-chromium.png`, `desktop-connected-webkit.png`, `1440-chromium.png`, `390-chromium.png`, `390-webkit.png`, `desktop-empty.png`.
- Fonte: 1616 × 973 px. Viewport desktop de comparação: 1616 × 973 CSS px, escala 1. Captura full-page inclui a extensão vertical dos metadados operacionais (janela, imagens e cota); largura normalizada 1:1, sem esticar a fonte. Também verificados viewports 1440 e 390 px.
- Estado comparado: PT-BR, claro, Global, token temporário conectado, modelos ainda não selecionados. A fixture visual usa 12.480/50.000, 9.600 de entrada e 2.880 de saída para corresponder à referência; esses números existem somente no teste. A página real usa exclusivamente a API e mostra zero/Não configurado sem credencial.

## Histórico e correções

1. Comparação inicial entre referência e captura sem chave identificou [P2] controles excessivamente altos: os mínimos globais de formulário aumentavam radios e selects, alongando cards. Foram aplicados mínimos locais de 19/38/23 px para radio/select/switch, mantendo labels e foco.
2. A primeira comparação no estado conectado identificou [P2] painel lateral alto: label redundante do provedor, revogação em linha própria e espaçamento acumulado. O label ficou acessível sem ocupar linha; expiração/revogação compartilham linha no desktop; espaçamentos do painel foram compactados.
3. Capturas posteriores foram abertas junto com a referência na mesma comparação. A composição mantém origem acima, proporção aproximadamente 62/38, cards de funcionalidades à esquerda, conexão/uso à direita e rodapé separado. Metadados adicionais de janela/limites explicam a extensão vertical; no mobile o painel de conexão antecede os modelos e não há overflow horizontal.
4. O teste de duplo clique identificou [P1 funcional] troca imediata de “Testar” por “Cancelar” na mesma posição. Agora Testar permanece desabilitado enquanto Cancelar aparece separado, evitando cancelar no segundo clique. O teste confirma uma única geração.
5. A conferência na instância principal identificou diferença de configuração em relação à prévia: o `.env` local existente não continha `APP_ENV`, `AI_GEMINI_ENABLED` e `AI_LOCAL_TOKEN_ENABLED`. As três opções foram configuradas explicitamente para o uso local solicitado, e a API foi reiniciada em loopback. Verificação no Chrome do usuário (1470 × 779 CSS px, DPR 2) confirmou ambiente local, token temporário e limite local; título permanece em 30px. Evidência real de página inteira: `docs/evidence/ai/desktop-local-5173.png`. A captura inteira inclui conteúdo abaixo da dobra; não representa tudo visível simultaneamente nesse viewport. Nenhuma chave foi cadastrada.

## Superfícies verificadas

- **Tipografia:** Montserrat existente, título 30px (25px mobile), subtítulos 14–16px e textos auxiliares 11–13px. Hierarquia e pesos preservados. Selects têm labels explícitos e opções longas permanecem acessíveis no menu nativo.
- **Espaçamento:** bordas finas, raios 5–7px, padding de cards 15–21px, proporções de colunas e alinhamento do rodapé conferidos. 390px usa coluna única e botões quebram linha sem esconder controles.
- **Cores:** tokens do shell existente, azul primário/seleção, fundo claro, badge verde de conectado, âmbar local e violeta de imagem. Sem cores novas aplicadas ao restante do produto.
- **Assets:** logo vetorial oficial existente, ícones Lucide do produto. Não há imagens ou ilustrações novas a gerar. Avatar usa a identidade real da conta, sem reproduzir o avatar ilustrativo da referência.
- **Conteúdo:** textos localizados em PT-BR/EN/ES; “Google Gemini” substitui o genérico “API de teste”. Fonte, expiração, uso e disponibilidade vêm do backend. Ações adicionais de revogar/cancelar e informação sobre limites são requisitos funcionais do módulo.

As imagens desktop foram comparadas em resolução legível para os campos, títulos, badges e números; não foi necessário um recorte adicional para identificar esses detalhes. Mobile foi aberto separadamente para verificar quebras, labels e alcance dos controles. Não restam diferenças P0/P1/P2 na implementação da tela.

## Interações e acessibilidade

Conectar, apagar a chave do campo, substituir/cancelar, selecionar/salvar sem imagem, testes explícitos, duplo clique, navegação por teclado, origem gerenciada indisponível, troca de idioma e proteção do deep link exercitados no navegador. O teste captura erros de JavaScript e verifica ausência do token sentinela em storage e logs. Conflito de versão preserva o rascunho até recarregar. Radios, selects, switches e botões possuem nomes acessíveis; foco é visível pelo estilo existente.

## Ajustes opcionais (P3)

- A referência possui menos informações operacionais e cabe integralmente em 973px; a implementação admite pequena rolagem vertical para mostrar janela, limite de imagens e distinção entre cota externa e limite local.
- Header, avatar e largura da sidebar seguem o shell real, incluindo seletor de idioma/tema, em vez de redesenhar elementos fora do módulo.

final result: passed
