import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { Locale } from "@market/contracts";
import { aiCopy } from "./ai-copy";
const copy: Record<string, [string, string, string]> = {
  ...aiCopy,
  "collection.view": [
    "Visualização da listagem",
    "List view",
    "Vista de la lista",
  ],
  "collection.cards": ["Cards", "Cards", "Tarjetas"],
  "collection.table": ["Tabela", "Table", "Tabla"],
  "collection.noAgencies": [
    "Nenhuma agência",
    "No agencies",
    "Ninguna agencia",
  ],
  "collection.noClients": ["Nenhum cliente", "No clients", "Ningún cliente"],
  "collection.date": ["Data", "Date", "Fecha"],
  "auth.intro": [
    "Apresentação Market Analysis",
    "Market Analysis introduction",
    "Presentación de Market Analysis",
  ],
  "auth.skipIntro": [
    "Pular introdução",
    "Skip introduction",
    "Omitir introducción",
  ],
  "role.GLOBAL": ["Global", "Global", "Global"],
  "role.SUPER_ADMIN": ["Super Admin", "Super Admin", "Super Admin"],
  "role.ADMIN": ["Admin", "Admin", "Admin"],
  "role.USER": ["User", "User", "User"],
  "management.title": [
    "Central de gestão",
    "Management center",
    "Centro de gestión",
  ],
  "management.description": [
    "Gerencie usuários, permissões, agências e clientes.",
    "Manage users, permissions, agencies and clients.",
    "Gestiona usuarios, permisos, agencias y clientes.",
  ],
  "management.users": ["Usuários", "Users", "Usuarios"],
  "management.permissions": ["Permissões", "Permissions", "Permisos"],
  "management.agencies": ["Agências", "Agencies", "Agencias"],
  "management.clients": ["Clientes", "Clients", "Clientes"],
  "management.user": ["Usuário", "User", "Usuario"],
  "management.permissionsDescription": [
    "Gerencie as permissões de acesso nas suas agências.",
    "Manage access permissions within your agencies.",
    "Gestiona los permisos de acceso en tus agencias.",
  ],
  "management.userName": ["Nome do usuário", "User name", "Nombre del usuario"],
  "management.permission": ["Permissão", "Permission", "Permiso"],
  "management.scope": ["Escopo de acesso", "Access scope", "Ámbito de acceso"],
  "management.searchUsers": [
    "Buscar por nome ou e-mail",
    "Search by name or email",
    "Buscar por nombre o correo",
  ],
  "management.allAgencies": [
    "Todas as agências",
    "All agencies",
    "Todas las agencias",
  ],
  "management.create.users": ["Criar usuário", "Create user", "Crear usuario"],
  "management.create.permissions": [
    "Criar permissão",
    "Create permission",
    "Crear permiso",
  ],
  "management.create.agencies": [
    "Criar agência",
    "Create agency",
    "Crear agencia",
  ],
  "management.create.clients": [
    "Criar cliente",
    "Create client",
    "Crear cliente",
  ],
  "management.edit.users": ["Editar usuário", "Edit user", "Editar usuario"],
  "management.edit.permissions": [
    "Editar permissão",
    "Edit permission",
    "Editar permiso",
  ],
  "management.edit.agencies": [
    "Editar agência",
    "Edit agency",
    "Editar agencia",
  ],
  "management.edit.clients": [
    "Editar cliente",
    "Edit client",
    "Editar cliente",
  ],
  "management.hint.users": [
    "Atualize os dados e o acesso ao cliente.",
    "Update personal details and client access.",
    "Actualiza los datos y el acceso al cliente.",
  ],
  "management.hint.permissions": [
    "Gerencie o perfil e o escopo deste acesso.",
    "Manage the role and scope of this access.",
    "Gestiona el perfil y el ámbito de este acceso.",
  ],
  "management.hint.agencies": [
    "Gerencie os dados e a disponibilidade da agência.",
    "Manage agency details and availability.",
    "Gestiona los datos y la disponibilidad de la agencia.",
  ],
  "management.hint.clients": [
    "Gerencie o cliente e seu administrador responsável.",
    "Manage the client and its responsible administrator.",
    "Gestiona el cliente y su administrador responsable.",
  ],
  "management.details.users": [
    "Dados do usuário",
    "User details",
    "Datos del usuario",
  ],
  "management.details.agencies": [
    "Dados da agência",
    "Agency details",
    "Datos de la agencia",
  ],
  "management.details.clients": [
    "Dados do cliente",
    "Client details",
    "Datos del cliente",
  ],
  "management.email": ["E-mail", "Email", "Correo electrónico"],
  "management.clientLink": [
    "Vínculo com cliente",
    "Client access",
    "Vínculo con el cliente",
  ],
  "management.agencyClient": [
    "Cliente da agência",
    "Agency client",
    "Cliente de la agencia",
  ],
  "management.clientHint": [
    "Clientes da agência selecionada.",
    "Clients of the selected agency.",
    "Clientes de la agencia seleccionada.",
  ],
  "management.accessRole": [
    "Permissão de acesso",
    "Access permission",
    "Permiso de acceso",
  ],
  "management.roleHint": [
    "Esta permissão vale para o cliente selecionado.",
    "This permission applies to the selected client.",
    "Este permiso se aplica al cliente seleccionado.",
  ],
  "management.removeLink": [
    "Remover vínculo",
    "Remove access",
    "Eliminar vínculo",
  ],
  "management.addLink": [
    "Vincular cliente",
    "Add client access",
    "Vincular cliente",
  ],
  "management.newLink": ["Novo vínculo", "New access", "Nuevo vínculo"],
  "management.selectAgency": [
    "Selecione a agência",
    "Select an agency",
    "Selecciona una agencia",
  ],
  "management.selectClient": [
    "Selecione o cliente",
    "Select a client",
    "Selecciona un cliente",
  ],
  "management.selectUser": [
    "Selecione o usuário",
    "Select a user",
    "Selecciona un usuario",
  ],
  "management.clientAgency": [
    "Agência e responsável",
    "Agency and administrator",
    "Agencia y responsable",
  ],
  "management.responsibleAdmin": [
    "Admin responsável",
    "Responsible Admin",
    "Admin responsable",
  ],
  "management.keepAdmin": [
    "Manter os responsáveis atuais",
    "Keep current administrators",
    "Mantener los responsables actuales",
  ],
  "management.adminHint": [
    "O usuário selecionado receberá acesso Admin a este cliente.",
    "The selected user receives Admin access to this client.",
    "El usuario seleccionado recibirá acceso Admin a este cliente.",
  ],
  "management.createUserHint": [
    "Cadastre o usuário e defina seu acesso aos clientes.",
    "Create the user and set their client access.",
    "Crea el usuario y define su acceso a los clientes.",
  ],
  "management.setupEmail": [
    "O usuário receberá por e-mail um link para definir sua senha, válido por 24 horas.",
    "The user will receive an email link to set their password, valid for 24 hours.",
    "El usuario recibirá un enlace por correo para definir su contraseña, válido por 24 horas.",
  ],
  "management.scopeHint.GLOBAL": [
    "Global administra toda a plataforma e acessa todas as agências e clientes.",
    "Global manages the entire platform and can access all agencies and clients.",
    "Global administra toda la plataforma y accede a todas las agencias y clientes.",
  ],
  "management.scopeHint.AGENCY": [
    "Super Admin administra os clientes da agência selecionada.",
    "Super Admin manages clients of the selected agency.",
    "Super Admin administra los clientes de la agencia seleccionada.",
  ],
  "management.scopeHint.CLIENT": [
    "Admin gerencia membros e arquivos; User utiliza as próprias conversas neste cliente.",
    "Admin manages members and files; User accesses their own conversations within this client.",
    "Admin gestiona miembros y archivos; User utiliza sus propias conversaciones en este cliente.",
  ],
  "management.edit": ["Editar", "Edit", "Editar"],
  "management.delete": ["Excluir", "Delete", "Eliminar"],
  "management.restore": ["Restaurar", "Restore", "Restaurar"],
  "management.save": ["Salvar alterações", "Save changes", "Guardar cambios"],
  "management.confirmDelete": [
    "Confirmar exclusão",
    "Confirm deletion",
    "Confirmar eliminación",
  ],
  "management.delete.users": [
    "Excluir usuário",
    "Delete user",
    "Eliminar usuario",
  ],
  "management.delete.permissions": [
    "Excluir permissão",
    "Delete permission",
    "Eliminar permiso",
  ],
  "management.delete.agencies": [
    "Excluir agência",
    "Delete agency",
    "Eliminar agencia",
  ],
  "management.delete.clients": [
    "Excluir cliente",
    "Delete client",
    "Eliminar cliente",
  ],
  "management.archiveHint.users": [
    "O usuário será arquivado e perderá o acesso. O histórico será preservado e a conta poderá ser restaurada.",
    "The user will be archived and lose access. History is preserved and the account can be restored.",
    "El usuario se archivará y perderá el acceso. Se preservará el historial y se podrá restaurar la cuenta.",
  ],
  "management.archiveHint.agencies": [
    "A agência será arquivada e seus clientes ficarão indisponíveis para operar até a restauração. O histórico será preservado.",
    "The agency will be archived and its clients unavailable until restoration. History is preserved.",
    "La agencia se archivará y sus clientes no estarán disponibles hasta su restauración. Se preservará el historial.",
  ],
  "management.archiveHint.clients": [
    "O cliente será arquivado e ficará indisponível para operar. Conversas e arquivos serão preservados para restauração.",
    "The client will be archived and unavailable. Conversations and files are preserved for restoration.",
    "El cliente se archivará y no estará disponible. Las conversaciones y archivos se preservarán para su restauración.",
  ],
  "management.revokeHint": [
    "Este vínculo de acesso será removido. Outros acessos do usuário serão mantidos.",
    "This access assignment will be removed. The user’s other access is preserved.",
    "Se eliminará este vínculo de acceso. Se mantendrán los demás accesos del usuario.",
  ],
  "management.restoreHint": [
    "A restauração reativa este cadastro e os acessos associados. As regras de responsáveis continuam sendo verificadas.",
    "Restoring reactivates this record and associated access. Required administrator rules still apply.",
    "La restauración reactiva este registro y sus accesos. Se siguen verificando las reglas de responsables.",
  ],
  "management.recordView": [
    "Exibir registros",
    "Show records",
    "Mostrar registros",
  ],
  "management.notArchived": ["Não arquivados", "Not archived", "No archivados"],
  "management.archivedRecords": ["Arquivados", "Archived", "Archivados"],
  "management.archived": ["Arquivado", "Archived", "Archivado"],
  "management.empty": [
    "Nenhum registro encontrado",
    "No records found",
    "No se encontraron registros",
  ],
  "management.emptyHint": [
    "Ajuste a busca ou os filtros, ou crie um novo registro.",
    "Adjust your search or filters, or create a record.",
    "Ajusta la búsqueda o los filtros, o crea un registro.",
  ],
  "management.count": [
    "{{count}} registros nesta visualização.",
    "{{count}} records in this view.",
    "{{count}} registros en esta vista.",
  ],
  "management.checkFields": [
    "Revise os campos destacados.",
    "Review the highlighted fields.",
    "Revisa los campos destacados.",
  ],

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
  "auth.agencyOrClient": [
    "Nome da agência ou cliente",
    "Agency or client name",
    "Nombre de la agencia o cliente",
  ],
  "auth.agencyOrClientPlaceholder": [
    "Digite o nome da agência ou cliente",
    "Enter the agency or client name",
    "Escribe el nombre de la agencia o cliente",
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
  "shell.clients": ["Clientes", "Clients", "Clientes"],
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
  "shell.workspaceSearch": [
    "Buscar agência ou cliente...",
    "Search agencies or clients...",
    "Buscar agencia o cliente...",
  ],
  "shell.agenciesAndClients": [
    "Agências e clientes",
    "Agencies and clients",
    "Agencias y clientes",
  ],
  "shell.noWorkspaceResults": [
    "Nenhuma agência ou cliente encontrado.",
    "No agencies or clients found.",
    "No se encontraron agencias ni clientes.",
  ],
  "shell.clientCountOne": ["1 cliente", "1 client", "1 cliente"],
  "shell.clientCount": [
    "{{count}} clientes",
    "{{count}} clients",
    "{{count}} clientes",
  ],
  "shell.agencyClients": [
    "Clientes de {{name}}",
    "Clients of {{name}}",
    "Clientes de {{name}}",
  ],
  "shell.openAgency": [
    "Acessar agência",
    "Open agency",
    "Acceder a la agencia",
  ],
  "shell.noAgencyClients": [
    "Nenhum cliente disponível para operar.",
    "No clients available to work with.",
    "No hay clientes disponibles para operar.",
  ],
  "shell.noAccess": [
    "Nenhum espaço disponível",
    "No workspace available",
    "No hay espacios disponibles",
  ],
  "shell.noAccessSub": [
    "Aguarde um convite ou procure o administrador do seu cliente.",
    "Wait for an invitation or contact your client administrator.",
    "Espera una invitación o contacta al administrador de tu cliente.",
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
  "chat.reconnectGlobal": [
    "Você pode continuar escrevendo. Para enviar, restabeleça a conexão em Configurações de IA.",
    "You can keep writing. To send, restore the connection in AI settings.",
    "Puedes seguir escribiendo. Para enviar, restablece la conexión en Configuración de IA.",
  ],
  "chat.reconnectAdmin": [
    "Você pode continuar escrevendo. Para enviar, peça ao administrador que restabeleça a conexão de IA.",
    "You can keep writing. To send, ask your administrator to restore the AI connection.",
    "Puedes seguir escribiendo. Para enviar, pide al administrador que restablezca la conexión de IA.",
  ],
  "chat.openSettings": [
    "Abrir configurações em outra aba",
    "Open settings in another tab",
    "Abrir configuración en otra pestaña",
  ],
  "chat.checkConnection": [
    "Verificar conexão",
    "Check connection",
    "Verificar conexión",
  ],
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
  "admin.client": ["Cliente", "Client", "Cliente"],
  "admin.adminEmail": [
    "E-mail do Admin responsável",
    "Responsible Admin email",
    "Correo del Admin responsable",
  ],
  "admin.newAgency": ["Criar agência", "Create agency", "Crear agencia"],
  "admin.newClient": ["Criar cliente", "Create client", "Crear cliente"],
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
    "O convite concede acesso apenas ao cliente selecionado.",
    "The invitation grants access only to the selected client.",
    "La invitación concede acceso solo al cliente seleccionado.",
  ],
  "preferences.sub": [
    "Personalize sua experiência no Market Analysis.",
    "Personalize your Market Analysis experience.",
    "Personaliza tu experiencia en Market Analysis.",
  ],
  "preferences.photoSub": [
    "Personalize como você aparece.",
    "Personalize how you appear.",
    "Personaliza cómo te ven.",
  ],
  "preferences.themeSub": [
    "Escolha o visual da interface.",
    "Choose the appearance of the interface.",
    "Elige la apariencia de la interfaz.",
  ],
  "preferences.languageSub": [
    "Escolha o idioma da interface e o fuso horário.",
    "Choose the interface language and time zone.",
    "Elige el idioma de la interfaz y la zona horaria.",
  ],
  "preferences.default": ["Padrão", "Default", "Predeterminado"],
  "preferences.discard": [
    "Descartar alterações",
    "Discard changes",
    "Descartar cambios",
  ],
  "preferences.adjustPhoto": [
    "Ajustar enquadramento",
    "Adjust framing",
    "Ajustar encuadre",
  ],
  "preferences.cropHint": [
    "Arraste a foto para posicionar e ajuste o zoom. Você também pode usar as setas do teclado sobre a imagem.",
    "Drag the photo to position it and adjust the zoom. You can also use the arrow keys on the image.",
    "Arrastra la foto para colocarla y ajusta el zoom. También puedes usar las flechas del teclado sobre la imagen.",
  ],
  "preferences.cropArea": [
    "Enquadramento da foto. Use as setas para mover.",
    "Photo framing. Use arrow keys to move.",
    "Encuadre de la foto. Usa las flechas para mover.",
  ],
  "preferences.zoom": ["Zoom", "Zoom", "Zoom"],
  "preferences.resetCrop": [
    "Redefinir enquadramento",
    "Reset framing",
    "Restablecer encuadre",
  ],
  "preferences.applyCrop": [
    "Aplicar enquadramento",
    "Apply framing",
    "Aplicar encuadre",
  ],
  "preferences.photoPending": [
    "Prévia atualizada. Salve as alterações para confirmar.",
    "Preview updated. Save changes to confirm.",
    "Vista previa actualizada. Guarda los cambios para confirmar.",
  ],
  "preferences.photoRemovalPending": [
    "A foto será removida ao salvar as alterações.",
    "The photo will be removed when you save changes.",
    "La foto se eliminará al guardar los cambios.",
  ],
  "preferences.theme": ["Aparência", "Appearance", "Apariencia"],
  "preferences.photo": ["Foto de perfil", "Profile photo", "Foto de perfil"],
  "preferences.photoHint": [
    "JPG, PNG ou WebP. Até 2 MB. Sua foto será exibida em formato circular.",
    "JPG, PNG or WebP. Up to 2 MB. Your photo will be displayed in a circle.",
    "JPG, PNG o WebP. Hasta 2 MB. Tu foto se mostrará en formato circular.",
  ],
  "preferences.choosePhoto": ["Escolher foto", "Choose photo", "Elegir foto"],
  "preferences.changePhoto": ["Alterar foto", "Change photo", "Cambiar foto"],
  "preferences.savePhoto": ["Salvar foto", "Save photo", "Guardar foto"],
  "preferences.removePhoto": ["Remover foto", "Remove photo", "Eliminar foto"],
  "preferences.photoSaved": [
    "Foto de perfil atualizada.",
    "Profile photo updated.",
    "Foto de perfil actualizada.",
  ],
  "preferences.photoRemoved": [
    "Foto de perfil removida.",
    "Profile photo removed.",
    "Foto de perfil eliminada.",
  ],
  "preferences.photoInvalid": [
    "Escolha uma imagem JPG, PNG ou WebP válida, sem animação e de até 20 megapixels.",
    "Choose a valid JPG, PNG or WebP image without animation, up to 20 megapixels.",
    "Elige una imagen JPG, PNG o WebP válida, sin animación y de hasta 20 megapíxeles.",
  ],
  "preferences.photoTooLarge": [
    "A foto deve ter no máximo 2 MB.",
    "The photo must be no larger than 2 MB.",
    "La foto debe tener un máximo de 2 MB.",
  ],
  "preferences.light": ["Claro", "Light", "Claro"],
  "preferences.dark": ["Escuro", "Dark", "Oscuro"],
  "preferences.darkMode": ["Modo escuro", "Dark mode", "Modo oscuro"],
  "preferences.useLight": [
    "Ativar modo claro",
    "Switch to light mode",
    "Activar modo claro",
  ],
  "preferences.useDark": [
    "Ativar modo escuro",
    "Switch to dark mode",
    "Activar modo oscuro",
  ],
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
    "Mantenha pelo menos um Admin ativo neste cliente.",
    "Keep at least one active Admin in this client.",
    "Mantén al menos un Admin activo en este cliente.",
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
