export type OAuthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'awaiting-authorization';
      userCode: string;
      verificationUri: string;
      expiresAt: Date;
    }
  | { status: 'success'; accessToken: string }
  | { status: 'error'; message: string };
