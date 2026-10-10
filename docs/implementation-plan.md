# Plano de implementação

A fonte de escopo é a mudança `openspec/changes/market-analysis-primeira-entrega`, com dez capacidades e tarefas verificáveis. O checklist OpenSpec registra somente itens completamente implementados e verificados.

Ordem: estrutura/versões; infraestrutura; banco/isolamento; autenticação/seed; sistema visual; solicitações; administração; arquivos; chat; notificações/tour; assets; aceite integrado. Cada incremento deve funcionar na API e persistência antes de ser apresentado como completo na interface.

Verificar políticas com unitários, RLS/constraints/concorrência com PostgreSQL real e fluxos de navegador com Playwright e SMTP/S3 locais. Contas demo amplas não comprovam isolamento negativo: fixtures restritas são obrigatórias.

Não publicar em produção. Não gerar mídia, usar Higgsfield/builders ou substituir NestJS/PostgreSQL. Não implementar cobrança, chat entre pessoas, RAG/OCR ou métricas fictícias.
