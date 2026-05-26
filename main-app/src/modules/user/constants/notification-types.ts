export const NotificationType = {
  GENERIC: 'generic',
  ROOM_FILE: 'room_file',
  SHARED_GRANT: 'shared_grant',
  SHARED_UPLOAD: 'shared_upload',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const DEFAULT_NOTIFICATION_TITLE = 'DropHub';
export const DEFAULT_ACTOR_NAME = 'Пользователь';

type NotificationTemplate = {
  title: string;
  buildBody: (params: Record<string, string>) => string;
};

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  [NotificationType.GENERIC]: {
    title: DEFAULT_NOTIFICATION_TITLE,
    buildBody: () => 'Новое уведомление',
  },
  [NotificationType.ROOM_FILE]: {
    title: DEFAULT_NOTIFICATION_TITLE,
    buildBody: (params) => `${resolveActorName(params.actorName)} добавил(а) файл в комнату`,
  },
  [NotificationType.SHARED_GRANT]: {
    title: DEFAULT_NOTIFICATION_TITLE,
    buildBody: (params) =>
      `${resolveActorName(params.actorName)} предоставил(а) вам доступ к папке`,
  },
  [NotificationType.SHARED_UPLOAD]: {
    title: DEFAULT_NOTIFICATION_TITLE,
    buildBody: (params) =>
      `${resolveActorName(params.actorName)} загрузил(а) файл в общую папку`,
  },
};

export function buildNotificationContent(
  type: NotificationType,
  params: Record<string, string> = {},
): { title: string; body: string } {
  const template = NOTIFICATION_TEMPLATES[type] ?? NOTIFICATION_TEMPLATES[NotificationType.GENERIC];
  return {
    title: template.title,
    body: template.buildBody(params),
  };
}

export function resolveActorName(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed || DEFAULT_ACTOR_NAME;
}
