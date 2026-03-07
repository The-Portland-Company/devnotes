import { createExpressDevNotesHandler } from '@the-portland-company/devnotes/express';

export const devNotesProxy = createExpressDevNotesHandler({
  forge: {
    baseUrl: process.env.FOCUS_FORGE_BASE_URL || 'https://focusforge.theportlandcompany.com',
    pat: process.env.FOCUS_FORGE_PAT || '',
    projectName: process.env.FOCUS_FORGE_PROJECT_NAME || null,
  },
  async getCurrentUser(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;

    // Replace this with your app's real auth lookup.
    return {
      id: 'current-user-id',
      email: 'user@example.com',
      fullName: 'Current User',
    };
  },
});
