import { useMemo } from 'react';
import {
  DevNotesProvider,
  DevNotesButton,
  createDevNotesClient,
} from '@the-portland-company/devnotes';
import '@the-portland-company/devnotes/styles.css';

interface DevNotesWrapperProps {
  children: React.ReactNode;
}

export default function DevNotesWrapper({ children }: DevNotesWrapperProps) {
  // TODO: Replace with your auth/session source.
  const session = null as any;

  const adapter = useMemo(
    () =>
      createDevNotesClient({
        getAuthToken: async () => session?.accessToken || '',
      }),
    [session?.accessToken]
  );

  const devNotesUser = useMemo(
    () =>
      session?.user?.id
        ? { id: session.user.id, email: session.user.email || '', fullName: session.user.fullName }
        : null,
    [session?.user?.id, session?.user?.email, session?.user?.fullName]
  );

  if (!session?.isAuthenticated || !devNotesUser) {
    return <>{children}</>;
  }

  return (
    <DevNotesProvider
      adapter={adapter}
      user={devNotesUser}
      config={{ storagePrefix: 'devnotes' }}
    >
      {children}
      <DevNotesButton position="%%POSITION%%" />
    </DevNotesProvider>
  );
}
