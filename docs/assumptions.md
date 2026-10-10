# Premissas e limites operacionais

Tenant representa cliente/espaço de agência. Uma identidade pode ter vários vínculos e papéis diferentes. Esses pontos, o chat com assistente e o escopo sem RAG são premissas explícitas do briefing.

Decisões implementadas: SeaweedFS local S3; sessão até 12 h sem lembrar e 30 dias com lembrar; convite 72 h; recuperação 30 min; upload 25 MiB, reserva de armazenamento de 1 GiB por tenant inicialmente; policy de upload 5 min e download 60 s; chat 8.000 caracteres de entrada, 32.000 de saída, timeout 120 s; revalidação de streams até 5 s. São limites de implementação, não planos comerciais.

Tenant em provisioning só ativa junto do primeiro Admin válido; convite antigo não reativa tenant disabled. A conta demo é restrita a desenvolvimento/teste. Sem provedor real, o chat local é claramente demonstrativo e produção retorna indisponibilidade.

Os SVGs originais foram preservados; a apresentação da marca evita animação individual de letras. Referências orientam composição; valores escritos de cor e tipografia prevalecem. Termos/privacidade não têm links sem conteúdo fornecido. IA/SMTP/storage de produção dependem de configuração externa autorizada.
