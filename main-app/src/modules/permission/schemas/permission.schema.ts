import { z, ZodType } from 'zod';
import { AccessRole, ResourceType } from 'src/modules/permission/entities/permission.entity';

export type PermissionType = {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  role: AccessRole;
  user: {
    id: number;
    name?: string;
    email?: string;
  };
};

export const PermissionSchema: ZodType<PermissionType> = z.object({
  id: z.string().uuid(),
  resourceId: z.string(),
  resourceType: z.enum(Object.values(ResourceType) as [ResourceType, ...ResourceType[]]),
  role: z.enum(Object.values(AccessRole) as [AccessRole, ...AccessRole[]]),
  user: z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().email().optional(),
  }),
});
