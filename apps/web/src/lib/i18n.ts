import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { Locale } from "@market/contracts";
const copy: Record<string, [string, string, string]> = {
  "auth.headline": [
    "Dados que revelam. Decisões que transformam.",
    "Data that reveals. Decisions that transform.",
    "Datos que revelan. Decisiones que transforman.",
  ],
  "auth.description": [
    "Transforme informações em estratégias para o seu negócio.",
    "Turn information into strategies for your business.",
    "Transforma la información en estrategias para tu negocio.",
  ],
  "auth.login": [
    "Bem-vindo de volta",
    "Welcome back",
    "Te damos la bienvenida",
  ],
  "auth.loginSub": [
    "Acesse sua conta para continuar.",
    "Sign in to your account to continue.",
    "Accede a tu cuenta para continuar.",
  ],
  "auth.email": ["E-mail corporativo", "Work email", "Correo corporativo"],
  "auth.emailPlaceholder": [
    "voce@empresa.com.br",
    "you@company.com",
    "tu@empresa.com",
  ],
  "auth.password": ["Senha", "Password", "Contraseña"],
  "auth.showPassword": ["Mostrar senha", "Show password", "Mostrar contraseña"],
  "auth.hidePassword": ["Ocultar senha", "Hide password", "Ocultar contraseña"],
  "auth.remember": ["Lembrar de mim", "Remember me", "Recordarme"],
  "auth.forgot": [
    "Esqueceu a senha?",
    "Forgot password?",
    "¿Olvidaste tu contraseña?",
  ],
  "auth.enter": ["Entrar", "Sign in", "Entrar"],
  "auth.needAccess": [
    "Precisa de acesso?",
    "Need access?",
    "¿Necesitas acceso?",
  ],
  "auth.request": ["Solicitar acesso", "Request access", "Solicitar acceso"],
  "auth.requestSub": [
    "Preencha seus dados para solicitar acesso à plataforma.",
    "Enter your details to request access to the platform.",
    "Completa tus datos para solicitar acceso a la plataforma.",
  ],
  "auth.name": ["Nome completo", "Full name", "Nombre completo"],
  "auth.namePlaceholder": [
    "Como você se chama?",
    "What is your name?",
    "¿Cómo te llamas?",
  ],
  "auth.organization": [
    "Nome da agência ou organização",
    "Agency or organization name",
    "Nombre de la agencia u organización",
  ],
  "auth.organizationPlaceholder": [
    "Digite o nome da sua organização",
    "Enter your organization name",
    "Escribe el nombre de tu organización",
  ],
  "auth.message": [
    "Mensagem (opcional)",
    "Message (optional)",
    "Mensaje (opcional)",
  ],
  "auth.send": ["Enviar solicitação", "Send request", "Enviar solicitud"],
  "auth.reviewNotice": [
    "Sua solicitação será analisada. Você receberá uma resposta por e-mail.",
    "Your request will be reviewed. You will receive a response by email.",
    "Revisaremos tu solicitud. Recibirás una respuesta por correo.",
  ],
  "auth.received": [
    "Solicitação recebida",
    "Request received",
    "Solicitud recibida",
  ],
  "auth.receivedSub": [
    "Seus dados foram recebidos. Aguarde a análise e acompanhe seu e-mail.",
    "Your details have been received. Please wait for the review and check your email.",
    "Recibimos tus datos. Espera la revisión y revisa tu correo.",
  ],
  "auth.back": [
    "Voltar para o login",
    "Back to sign in",
    "Volver al inicio de sesión",
  ],
  "auth.recover": [
    "Recuperar senha",
    "Recover password",
    "Recuperar contraseña",
  ],
  "auth.recoverSub": [
    "Informe seu e-mail para receber as instruções.",
    "Enter your email to receive instructions.",
    "Introduce tu correo para recibir las instrucciones.",
  ],
  "auth.recoverSend": [
    "Enviar instruções",
    "Send instructions",
    "Enviar instrucciones",
  ],
  "auth.recoverSuccess": [
    "Se houver uma conta ativa para este e-mail, enviaremos as instruções de recuperação.",
    "If an active account exists for this email, we will send recovery instructions.",
    "Si existe una cuenta activa con este correo, enviaremos las instrucciones.",
  ],
  "auth.reset": [
    "Definir nova senha",
    "Set a new password",
    "Crear una nueva contraseña",
  ],
  "auth.passwordHint": [
    "Use pelo menos 12 caracteres.",
    "Use at least 12 characters.",
    "Usa al menos 12 caracteres.",
  ],
  "auth.resetSuccess": [
    "Senha atualizada. Entre novamente para continuar.",
    "Password updated. Sign in again to continue.",
    "Contraseña actualizada. Vuelve a iniciar sesión.",
  ],
  "auth.invite": ["Aceitar convite", "Accept invitation", "Aceptar invitación"],
  "auth.inviteSub": [
    "Crie sua senha para ativar o acesso. Se já possui conta, entre com o e-mail convidado antes de aceitar.",
    "Create a password to activate access. If you already have an account, sign in with the invited email before accepting.",
    "Crea una contraseña para activar el acceso. Si ya tienes cuenta, inicia sesión con el correo invitado antes de aceptar.",
  ],
  "auth.inviteSuccess": [
    "Convite aceito. Seu acesso está pronto.",
    "Invitation accepted. Your access is ready.",
    "Invitación aceptada. Tu acceso está listo.",
  ],
  "auth.signInExisting": [
    "Entrar com minha conta",
    "Sign in with my account",
    "Entrar con mi cuenta",
  ],
  "common.language": ["Idioma", "Language", "Idioma"],
  "common.pause": ["Pausar vídeo", "Pause video", "Pausar video"],
  "common.play": ["Reproduzir vídeo", "Play video", "Reproducir video"],
  "common.loading": ["Carregando…", "Loading…", "Cargando…"],
  "common.saving": ["Salvando…", "Saving…", "Guardando…"],
  "common.save": ["Salvar alterações", "Save changes", "Guardar cambios"],
  "common.cancel": ["Cancelar", "Cancel", "Cancelar"],
  "common.close": ["Fechar", "Close", "Cerrar"],
  "common.confirm": ["Confirmar", "Confirm", "Confirmar"],
  "common.retry": ["Tentar novamente", "Try again", "Intentar de nuevo"],
  "common.saved": [
    "Alterações salvas.",
    "Changes saved.",
    "Cambios guardados.",
  ],
  "common.search": ["Buscar", "Search", "Buscar"],
  "common.empty": [
    "Nenhum resultado encontrado",
    "No results found",
    "No se encontraron resultados",
  ],
  "common.emptySub": [
    "Os itens aparecerão aqui quando estiverem disponíveis.",
    "Items will appear here when available.",
    "Los elementos aparecerán aquí cuando estén disponibles.",
  ],
  "common.previous": ["Anterior", "Previous", "Anterior"],
  "common.next": ["Próxima", "Next", "Siguiente"],
  "common.page": [
    "Página {{page}} de {{total}}",
    "Page {{page}} of {{total}}",
    "Página {{page}} de {{total}}",
  ],
  "common.actions": ["Ações", "Actions", "Acciones"],
  "common.name": ["Nome", "Name", "Nombre"],
  "common.status": ["Status", "Status", "Estado"],
  "common.created": ["Criado em", "Created", "Creado"],
  "common.email": ["E-mail", "Email", "Correo"],
  "common.open": ["Abrir", "Open", "Abrir"],
  "common.back": ["Voltar", "Back", "Volver"],
  "common.required": [
    "Confira os campos destacados.",
    "Check the highlighted fields.",
    "Revisa los campos resaltados.",
  ],
  "common.error": [
    "Não foi possível concluir. Tente novamente.",
    "Could not complete the action. Please try again.",
    "No se pudo completar. Inténtalo de nuevo.",
  ],
  "common.optional": ["Opcional", "Optional", "Opcional"],
  "common.logout": ["Sair", "Sign out", "Salir"],
  "common.active": ["Ativo", "Active", "Activo"],
  "common.inactive": ["Inativo", "Inactive", "Inactivo"],
  "common.role": ["Perfil", "Role", "Rol"],
  "common.change": ["Alterar", "Change", "Cambiar"],
  "common.new": ["Novo", "New", "Nuevo"],
  "common.delete": ["Excluir", "Delete", "Eliminar"],
  "shell.chat": ["Conversas", "Conversations", "Conversaciones"],
  "shell.files": ["Arquivos", "Files", "Archivos"],
  "shell.members": ["Membros", "Members", "Miembros"],
  "shell.requests": [
    "Solicitações de acesso",
    "Access requests",
    "Solicitudes de acceso",
  ],
  "shell.preferences": ["Preferências", "Preferences", "Preferencias"],
  "shell.notifications": ["Notificações", "Notifications", "Notificaciones"],
  "shell.agencies": ["Agências", "Agencies", "Agencias"],
  "shell.organizations": ["Organizações", "Organizations", "Organizaciones"],
  "shell.users": [
    "Contas da plataforma",
    "Platform accounts",
    "Cuentas de la plataforma",
  ],
  "shell.platform": [
    "Administração global",
    "Global administration",
    "Administración global",
  ],
  "shell.agencyArea": ["Minhas agências", "My agencies", "Mis agencias"],
  "shell.switch": ["Trocar espaço", "Switch workspace", "Cambiar espacio"],
  "shell.noAccess": [
    "Nenhum espaço disponível",
    "No workspace available",
    "No hay espacios disponibles",
  ],
  "shell.noAccessSub": [
    "Aguarde um convite ou procure o administrador da sua organização.",
    "Wait for an invitation or contact your organization administrator.",
    "Espera una invitación o contacta al administrador de tu organización.",
  ],
  "shell.menu": ["Abrir navegação", "Open navigation", "Abrir navegación"],
  "shell.accountMenu": [
    "Menu de {{name}}",
    "Account menu for {{name}}",
    "Menú de {{name}}",
  ],
  "shell.collapse": [
    "Recolher navegação",
    "Collapse navigation",
    "Contraer navegación",
  ],
  "shell.expand": [
    "Expandir navegação",
    "Expand navigation",
    "Expandir navegación",
  ],
  "shell.forbidden": [
    "Você não tem acesso a esta área",
    "You do not have access to this area",
    "No tienes acceso a esta área",
  ],
  "shell.notFound": [
    "Página não encontrada",
    "Page not found",
    "Página no encontrada",
  ],
  "shell.expired": [
    "Sua sessão expirou. Entre novamente.",
    "Your session expired. Please sign in again.",
    "Tu sesión caducó. Vuelve a iniciar sesión.",
  ],
  "chat.new": ["Nova conversa", "New conversation", "Nueva conversación"],
  "chat.untitled": [
    "Conversa sem título",
    "Untitled conversation",
    "Conversación sin título",
  ],
  "chat.welcome": [
    "Qual decisão vamos explorar?",
    "What decision shall we explore?",
    "¿Qué decisión vamos a explorar?",
  ],
  "chat.welcomeSub": [
    "Organize suas perguntas, compare ideias e construa seu raciocínio em um espaço só seu.",
    "Organize your questions, compare ideas and develop your thinking in your own space.",
    "Organiza tus preguntas, compara ideas y desarrolla tu razonamiento en tu propio espacio.",
  ],
  "chat.placeholder": [
    "Escreva sua pergunta…",
    "Write your question…",
    "Escribe tu pregunta…",
  ],
  "chat.send": ["Enviar mensagem", "Send message", "Enviar mensaje"],
  "chat.cancel": ["Interromper resposta", "Stop response", "Detener respuesta"],
  "chat.hint": [
    "Enter para enviar · Shift + Enter para nova linha",
    "Enter to send · Shift + Enter for a new line",
    "Enter para enviar · Shift + Enter para nueva línea",
  ],
  "chat.demo": ["Modo demonstrativo", "Demo mode", "Modo de demostración"],
  "chat.demoSub": [
    "Respostas de exemplo. Sem consulta ao mercado ou análise dos arquivos.",
    "Example responses. No market research or file analysis.",
    "Respuestas de ejemplo. Sin consulta de mercado ni análisis de archivos.",
  ],
  "chat.unavailable": [
    "O assistente está indisponível. Suas conversas continuam salvas.",
    "The assistant is unavailable. Your conversations remain saved.",
    "El asistente no está disponible. Tus conversaciones siguen guardadas.",
  ],
  "chat.you": ["Você", "You", "Tú"],
  "chat.assistant": ["Assistente", "Assistant", "Asistente"],
  "chat.partial": [
    "Resposta interrompida. O conteúdo parcial foi salvo.",
    "Response interrupted. Partial content was saved.",
    "Respuesta interrumpida. El contenido parcial se guardó.",
  ],
  "chat.generating": [
    "Preparando resposta…",
    "Preparing response…",
    "Preparando respuesta…",
  ],
  "chat.transportRetry": [
    "A conexão caiu. Reconecte para consultar a mesma tentativa.",
    "Connection lost. Reconnect to check the same attempt.",
    "Se perdió la conexión. Reconecta para consultar el mismo intento.",
  ],
  "chat.scroll": [
    "Ir para a última mensagem",
    "Go to latest message",
    "Ir al último mensaje",
  ],
  "files.sub": [
    "Arquivos privados deste espaço. O envio não inicia uma análise pelo chat.",
    "Private files for this workspace. Uploading does not start a chat analysis.",
    "Archivos privados de este espacio. El envío no inicia un análisis del chat.",
  ],
  "files.upload": ["Enviar arquivo", "Upload file", "Subir archivo"],
  "files.drop": [
    "Arraste um arquivo ou escolha no seu dispositivo",
    "Drop a file or choose one from your device",
    "Arrastra un archivo o elige uno de tu dispositivo",
  ],
  "files.limits": [
    "PDF, CSV, XLSX ou TXT · Até 25 MiB",
    "PDF, CSV, XLSX or TXT · Up to 25 MiB",
    "PDF, CSV, XLSX o TXT · Hasta 25 MiB",
  ],
  "files.progress": [
    "Enviando {{progress}}%",
    "Uploading {{progress}}%",
    "Subiendo {{progress}}%",
  ],
  "files.verifying": [
    "Verificando arquivo…",
    "Verifying file…",
    "Verificando archivo…",
  ],
  "files.success": [
    "Arquivo disponível.",
    "File available.",
    "Archivo disponible.",
  ],
  "files.download": ["Baixar arquivo", "Download file", "Descargar archivo"],
  "files.size": ["Tamanho", "Size", "Tamaño"],
  "files.deleteConfirm": [
    "Excluir “{{name}}” deste espaço? Essa ação remove o arquivo armazenado.",
    "Delete “{{name}}” from this workspace? This removes the stored file.",
    "¿Eliminar «{{name}}» de este espacio? Se eliminará el archivo almacenado.",
  ],
  "status.pending": ["Pendente", "Pending", "Pendiente"],
  "status.uploading": ["Enviando", "Uploading", "Subiendo"],
  "status.available": ["Disponível", "Available", "Disponible"],
  "status.failed": ["Falhou", "Failed", "Falló"],
  "status.deleting": [
    "Exclusão pendente",
    "Deletion pending",
    "Eliminación pendiente",
  ],
  "status.deleted": ["Excluído", "Deleted", "Eliminado"],
  "status.active": ["Ativo", "Active", "Activo"],
  "status.disabled": ["Desativado", "Disabled", "Desactivado"],
  "status.provisioning": [
    "Aguardando primeiro Admin",
    "Awaiting first Admin",
    "Esperando al primer Admin",
  ],
  "status.approved": ["Aprovada", "Approved", "Aprobada"],
  "status.rejected": ["Rejeitada", "Rejected", "Rechazada"],
  "status.sent": ["Enviado", "Sent", "Enviado"],
  "status.sending": ["Enviando", "Sending", "Enviando"],
  "admin.membersSub": [
    "Gerencie apenas os vínculos deste espaço.",
    "Manage memberships in this workspace.",
    "Gestiona los miembros de este espacio.",
  ],
  "admin.invite": ["Convidar membro", "Invite member", "Invitar miembro"],
  "admin.invitations": ["Convites", "Invitations", "Invitaciones"],
  "admin.resend": ["Reenviar e-mail", "Resend email", "Reenviar correo"],
  "admin.inviteSent": [
    "Convite agendado para envio.",
    "Invitation queued for delivery.",
    "Invitación programada para envío.",
  ],
  "admin.roleConfirm": [
    "Alterar o perfil de {{name}} em {{scope}}?",
    "Change the role of {{name}} in {{scope}}?",
    "¿Cambiar el rol de {{name}} en {{scope}}?",
  ],
  "admin.deactivate": [
    "Desativar vínculo",
    "Deactivate membership",
    "Desactivar vínculo",
  ],
  "admin.activate": ["Ativar", "Activate", "Activar"],
  "admin.deactivateConfirm": [
    "Desativar o vínculo de {{name}} em {{scope}}? Os outros espaços serão preservados.",
    "Deactivate the membership of {{name}} in {{scope}}? Other workspaces will be preserved.",
    "¿Desactivar a {{name}} en {{scope}}? Los demás espacios se conservarán.",
  ],
  "admin.slug": ["Identificador", "Identifier", "Identificador"],
  "admin.agency": ["Agência", "Agency", "Agencia"],
  "admin.agenciesSub": [
    "Gerencie suas agências e seus administradores.",
    "Manage your agencies and their administrators.",
    "Gestiona tus agencias y sus administradores.",
  ],
  "admin.agencySearch": [
    "Buscar por nome ou identificador",
    "Search by name or identifier",
    "Buscar por nombre o identificador",
  ],
  "admin.allStatuses": ["Todos os status", "All statuses", "Todos los estados"],
  "common.actionsFor": [
    "Ações de {{name}}",
    "Actions for {{name}}",
    "Acciones de {{name}}",
  ],
  "admin.agencyCount_zero": [
    "{{count}} agências nesta visualização",
    "{{count}} agencies in this view",
    "{{count}} agencias en esta vista",
  ],
  "admin.agencyCount_one": [
    "{{count}} agência nesta visualização",
    "{{count}} agency in this view",
    "{{count}} agencia en esta vista",
  ],
  "admin.agencyCount_other": [
    "{{count}} agências nesta visualização",
    "{{count}} agencies in this view",
    "{{count}} agencias en esta vista",
  ],
  "admin.noAgencies": [
    "Nenhuma agência encontrada",
    "No agencies found",
    "No se encontraron agencias",
  ],
  "admin.noAgenciesSub": [
    "Tente outro nome, identificador ou status.",
    "Try another name, identifier or status.",
    "Prueba otro nombre, identificador o estado.",
  ],
  "shell.platformLabel": ["Plataforma", "Platform", "Plataforma"],
  "shell.breadcrumb": ["Localização", "Breadcrumb", "Ubicación"],
  "shell.profile": [
    "Preferências de {{name}}",
    "Preferences for {{name}}",
    "Preferencias de {{name}}",
  ],
  "admin.organization": ["Organização", "Organization", "Organización"],
  "admin.adminEmail": [
    "E-mail do Admin responsável",
    "Responsible Admin email",
    "Correo del Admin responsable",
  ],
  "admin.newAgency": ["Criar agência", "Create agency", "Crear agencia"],
  "admin.newOrganization": [
    "Criar organização",
    "Create organization",
    "Crear organización",
  ],
  "admin.superAdmins": [
    "Super Admins da agência",
    "Agency Super Admins",
    "Super Admins de la agencia",
  ],
  "admin.setSuperAdmin": [
    "Atribuir Super Admin",
    "Assign Super Admin",
    "Asignar Super Admin",
  ],
  "admin.removeSuperAdmin": [
    "Remover Super Admin",
    "Remove Super Admin",
    "Quitar Super Admin",
  ],
  "admin.reason": ["Motivo", "Reason", "Motivo"],
  "admin.globalConfirm": [
    "Esta alteração afeta a conta em toda a plataforma. Informe um motivo.",
    "This change affects the account across the platform. Provide a reason.",
    "Este cambio afecta a la cuenta en toda la plataforma. Indica un motivo.",
  ],
  "admin.promote": ["Conceder Global", "Grant Global", "Conceder Global"],
  "admin.demote": ["Remover Global", "Remove Global", "Quitar Global"],
  "admin.disableAccount": [
    "Desativar conta",
    "Deactivate account",
    "Desactivar cuenta",
  ],
  "admin.enableAccount": [
    "Reativar conta",
    "Reactivate account",
    "Reactivar cuenta",
  ],
  "admin.audit": [
    "Consultar conversas",
    "Review conversations",
    "Consultar conversaciones",
  ],
  "admin.auditSub": [
    "Consulta global somente leitura. Cada abertura exige motivo e fica registrada.",
    "Read-only global review. Each access requires a reason and is recorded.",
    "Consulta global de solo lectura. Cada acceso requiere un motivo y queda registrado.",
  ],
  "requests.sub": [
    "Analise o pedido, defina o espaço e envie um convite. O acesso só começa após o aceite.",
    "Review the request, set the workspace and send an invitation. Access begins only after acceptance.",
    "Revisa la solicitud, define el espacio y envía una invitación. El acceso comienza tras la aceptación.",
  ],
  "requests.unscoped": ["Sem classificação", "Unclassified", "Sin clasificar"],
  "requests.classify": ["Classificar", "Classify", "Clasificar"],
  "requests.approve": [
    "Aprovar e convidar",
    "Approve and invite",
    "Aprobar e invitar",
  ],
  "requests.reject": [
    "Rejeitar solicitação",
    "Reject request",
    "Rechazar solicitud",
  ],
  "requests.reviewer": ["Revisado por", "Reviewed by", "Revisado por"],
  "requests.roleHint": [
    "O convite concede acesso apenas à organização selecionada.",
    "The invitation grants access only to the selected organization.",
    "La invitación concede acceso solo a la organización seleccionada.",
  ],
  "preferences.sub": [
    "Estas escolhas acompanham sua conta.",
    "These choices follow your account.",
    "Estas opciones se guardan en tu cuenta.",
  ],
  "preferences.theme": ["Aparência", "Appearance", "Apariencia"],
  "preferences.light": ["Claro", "Light", "Claro"],
  "preferences.dark": ["Escuro", "Dark", "Oscuro"],
  "preferences.zone": ["Fuso horário", "Time zone", "Zona horaria"],
  "preferences.tour": [
    "Conheça seu espaço",
    "Explore your workspace",
    "Conoce tu espacio",
  ],
  "preferences.restart": [
    "Reiniciar apresentação",
    "Restart tour",
    "Reiniciar presentación",
  ],
  "notifications.all": [
    "Ver todas as notificações",
    "View all notifications",
    "Ver todas las notificaciones",
  ],
  "notifications.readAll": [
    "Marcar todas como lidas",
    "Mark all as read",
    "Marcar todas como leídas",
  ],
  "notifications.read": [
    "Marcar como lida",
    "Mark as read",
    "Marcar como leída",
  ],
  "notifications.empty": [
    "Tudo em dia",
    "You are all caught up",
    "Todo al día",
  ],
  "notifications.emptySub": [
    "Novos convites, solicitações e atualizações aparecerão aqui.",
    "New invitations, requests and updates will appear here.",
    "Las invitaciones, solicitudes y actualizaciones aparecerán aquí.",
  ],
  "notification.access.received": [
    "Nova solicitação de acesso",
    "New access request",
    "Nueva solicitud de acceso",
  ],
  "notification.access.assigned": [
    "Solicitação classificada",
    "Request classified",
    "Solicitud clasificada",
  ],
  "notification.access.reviewed": [
    "Solicitação revisada",
    "Request reviewed",
    "Solicitud revisada",
  ],
  "notification.invitation.accepted": [
    "Convite aceito",
    "Invitation accepted",
    "Invitación aceptada",
  ],
  "notification.membership.changed": [
    "Seu perfil foi atualizado",
    "Your role was updated",
    "Tu rol fue actualizado",
  ],
  "notification.file.available": [
    "Arquivo disponível: {{name}}",
    "File available: {{name}}",
    "Archivo disponible: {{name}}",
  ],
  "notification.file.failed": [
    "Não foi possível verificar: {{name}}",
    "Could not verify: {{name}}",
    "No se pudo verificar: {{name}}",
  ],
  "tour.context": [
    "Este é o seu espaço atual. Troque de cliente por aqui.",
    "This is your current workspace. Switch clients here.",
    "Este es tu espacio actual. Cambia de cliente aquí.",
  ],
  "tour.chat": [
    "Suas conversas são pessoais e ficam neste espaço.",
    "Your conversations are personal and stay in this workspace.",
    "Tus conversaciones son personales y se guardan en este espacio.",
  ],
  "tour.files": [
    "Envie e organize os arquivos privados do cliente.",
    "Upload and organize the client’s private files.",
    "Sube y organiza los archivos privados del cliente.",
  ],
  "tour.members": [
    "Convide pessoas e gerencie os vínculos deste espaço.",
    "Invite people and manage workspace memberships.",
    "Invita a personas y gestiona los miembros del espacio.",
  ],
  "tour.notifications": [
    "Acompanhe atualizações relacionadas ao seu acesso.",
    "Follow updates related to your access.",
    "Sigue las actualizaciones relacionadas con tu acceso.",
  ],
  "tour.start": [
    "Conhecer o espaço",
    "Explore workspace",
    "Conocer el espacio",
  ],
  "tour.skip": ["Agora não", "Not now", "Ahora no"],
  "tour.done": ["Concluir", "Finish", "Finalizar"],
  "errors.INVALID_CREDENTIALS": [
    "E-mail ou senha incorretos. Confira e tente novamente.",
    "Incorrect email or password. Check and try again.",
    "Correo o contraseña incorrectos. Revisa e inténtalo de nuevo.",
  ],
  "errors.LAST_ADMIN": [
    "Mantenha pelo menos um Admin ativo nesta organização.",
    "Keep at least one active Admin in this organization.",
    "Mantén al menos un Admin activo en esta organización.",
  ],
  "errors.LAST_GLOBAL": [
    "Mantenha pelo menos um Global ativo.",
    "Keep at least one active Global.",
    "Mantén al menos un Global activo.",
  ],
  "errors.INVALID_TOKEN": [
    "Este link é inválido ou expirou. Solicite um novo.",
    "This link is invalid or expired. Request a new one.",
    "El enlace no es válido o caducó. Solicita uno nuevo.",
  ],
  "errors.CONFLICT": [
    "Os dados mudaram. Atualize a página e revise sua ação.",
    "Data has changed. Refresh and review your action.",
    "Los datos cambiaron. Actualiza la página y revisa tu acción.",
  ],
  "errors.RATE_LIMITED": [
    "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "Too many attempts. Wait a few minutes and try again.",
    "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
  ],
  "errors.FORBIDDEN": [
    "Você não tem permissão para esta ação.",
    "You do not have permission for this action.",
    "No tienes permiso para esta acción.",
  ],
  "errors.NOT_FOUND": [
    "O item não está disponível neste espaço.",
    "The item is not available in this workspace.",
    "El elemento no está disponible en este espacio.",
  ],
  "errors.CSRF_INVALID": [
    "Atualize a página e tente novamente.",
    "Refresh the page and try again.",
    "Actualiza la página e inténtalo de nuevo.",
  ],
  "errors.UPLOAD_INVALID": [
    "Arquivo inválido. Confira o formato e tente novamente.",
    "Invalid file. Check the format and try again.",
    "Archivo no válido. Revisa el formato e inténtalo de nuevo.",
  ],
  "errors.UPLOAD_TOO_LARGE": [
    "O tamanho excede o limite disponível.",
    "The size exceeds the available limit.",
    "El tamaño supera el límite disponible.",
  ],
  "errors.SERVICE_UNAVAILABLE": [
    "Serviço temporariamente indisponível. Tente novamente.",
    "Service temporarily unavailable. Please try again.",
    "Servicio temporalmente no disponible. Inténtalo de nuevo.",
  ],
  "errors.OPERATION_ACTIVE": [
    "Há uma resposta em andamento nesta conversa.",
    "A response is already in progress in this conversation.",
    "Ya hay una respuesta en curso en esta conversación.",
  ],
  "errors.UNAUTHENTICATED": [
    "Entre novamente para continuar.",
    "Sign in again to continue.",
    "Vuelve a iniciar sesión para continuar.",
  ],
  "errors.VALIDATION_ERROR": [
    "Confira os dados informados.",
    "Check the provided details.",
    "Revisa los datos introducidos.",
  ],
};
export const supported: Locale[] = ["pt-BR", "en", "es"];
let saved = "";
try {
  saved = localStorage.getItem("ma.locale") ?? "";
} catch {
  /* storage optional */
}
const browser = navigator.language.startsWith("es")
  ? "es"
  : navigator.language.startsWith("en")
    ? "en"
    : "pt-BR";
void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    supported.map((lng, i) => [
      lng,
      {
        translation: Object.fromEntries(
          Object.entries(copy).map(([key, v]) => [key, v[i]]),
        ),
      },
    ]),
  ),
  lng: supported.includes(saved as Locale) ? saved : browser,
  fallbackLng: "pt-BR",
  keySeparator: false,
  interpolation: { escapeValue: false },
});
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem("ma.locale", lng);
  } catch {
    /* storage optional */
  }
});
document.documentElement.lang = i18n.language;
export default i18n;
