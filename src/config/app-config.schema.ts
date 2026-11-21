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

const analyticsSchema = z
  .object({
    provider: z.enum(['none', 'otlp']),
    endpoint: z.string(),
    sampleRatio: z.number().min(0).max(1),
    traceApiCalls: z.boolean(),
    traceDocumentLoad: z.boolean(),
    identifyUsers: z.boolean(),
    // Typed strictly on purpose: a non-boolean here fails the whole config,
    // which makes the loader fall back to the scrubbed-by-default value rather
    // than quietly accepting a truthy string.
    scrubUrlQueryStrings: z.boolean(),
  })
  .partial()

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
    analytics: analyticsSchema,
  })
  .partial()

export type AppConfigOverrides = z.infer<typeof appConfigOverridesSchema>
