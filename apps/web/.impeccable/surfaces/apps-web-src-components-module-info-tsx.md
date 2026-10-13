---
version: 1
slug: "apps-web-src-components-module-info-tsx"
primary_target: "apps/web/src/components/module-info.tsx"
related_targets: ["apps/web/src/components/module-info.css"]
---

# Informações do módulo

Modo: Read. Refinamento do modal compartilhado para consultar atividades, sem alterar permissões, dados ou identidade visual.

## Direction contract

THESIS: Ler cada atividade com todos os dados disponíveis imediatamente, em uma sequência vertical conectada, sem expandir detalhes.

OWN-WORLD: Herdar Montserrat, superfícies e cores semânticas, avatares, diálogos e controles do Market Analysis nos temas claro e escuro.

STORY: Identificar autor, data, ação, registro e contexto; comparar Antes/Depois e ler o motivo; navegar ao registro ou à próxima página.

FIRST VIEWPORT: Cabeçalho com X e rodapé com paginação permanecem visíveis, separados do conteúdo por bordas do sistema. O rodapé só aparece quando há paginação e não repete a ação Fechar. A timeline começa pelo evento mais recente. Foto de perfil do responsável à esquerda, com iniciais quando indisponível. Autor e horário completo, sem o rótulo de fuso horário, à direita no desktop e empilhados no celular. Detalhes no fluxo de leitura.

FORM: Timeline vertical explicitamente solicitada. Extensão local; seed não aplicável. Dados tabulares no desktop e campos empilhados e rotulados no celular, preservando filtros, abas e paginação existentes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
