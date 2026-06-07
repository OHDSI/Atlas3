import { z } from 'zod'

const authProviderSchema = z.object({
  name: z.string(),
  url: z.string(),
  ajax: z.boolean(),
  icon: z.string(),
  isUseCredentialsForm: z.boolean().optional(),
  logoutUrl: z.string().optional(),
  loginPlaceholder: z.string().optional(),
  passwordPlaceholder: z.string().optional(),
})

export const appConfigOverridesSchema = z
  .object({
    api: z.object({ url: z.string() }).partial(),
    userAuthenticationEnabled: z.boolean(),
    enableSkipLogin: z.boolean(),
    enablePermissionManagement: z.boolean(),
    authProviders: z.array(authProviderSchema),
    refreshTokenThreshold: z.number(),
    enableIAPSession: z.boolean(),
    enableTermsAndConditions: z.boolean(),
    enablePythia: z.boolean(),
    enablePersonCount: z.boolean(),
    enableTaggingSection: z.boolean(),
    defaultLocale: z.string(),
    pollInterval: z.number(),
  })
  .partial()

export type AppConfigOverrides = z.infer<typeof appConfigOverridesSchema>
