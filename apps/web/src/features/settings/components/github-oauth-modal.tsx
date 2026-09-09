'use client';

import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect } from 'react';
import { Modal } from '@/shared/components/modal';
import {
  OAuthAwaitingState,
  OAuthErrorState,
  OAuthLoadingState,
  OAuthSuccessState,
} from './github-oauth-modal-states';
import type { OAuthState } from './github-oauth-modal-types';

const feedbackMilliseconds = 1500;
type GitHubOAuthModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: (accessToken: string) => void;
  readonly oauthState: OAuthState;
  readonly onStartOAuth: () => void;
  readonly onCancel: () => void;
};

export const GitHubOAuthModal = ({
  isOpen,
  onClose,
  onSuccess,
  oauthState,
  onStartOAuth,
  onCancel,
}: GitHubOAuthModalProps): React.ReactElement => {
  useEffect(() => {
    if (oauthState.status === 'success') {
      const timer = setTimeout(() => {
        onSuccess(oauthState.accessToken);
        onClose();
      }, feedbackMilliseconds);
      return () => clearTimeout(timer);
    }
  }, [oauthState, onSuccess, onClose]);

  useEffect(() => {
    if (isOpen && oauthState.status === 'idle') {
      onStartOAuth();
    }
  }, [isOpen, oauthState.status, onStartOAuth]);

  const handleClose = useCallback(() => {
    if (
      oauthState.status === 'awaiting-authorization' ||
      oauthState.status === 'loading'
    ) {
      onCancel();
    }
    onClose();
  }, [oauthState.status, onCancel, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connect to GitHub"
      description="Authorize PaperSync to access your vault repository"
      size="md"
      closeOnOverlayClick={oauthState.status !== 'loading'}
    >
      <div className="flex flex-col items-center py-4">
        <AnimatePresence mode="wait">
          {oauthState.status === 'loading' ? <OAuthLoadingState /> : null}

          {oauthState.status === 'awaiting-authorization' ? (
            <OAuthAwaitingState
              userCode={oauthState.userCode}
              verificationUri={oauthState.verificationUri}
              expiresAt={oauthState.expiresAt}
              onClose={handleClose}
            />
          ) : null}

          {oauthState.status === 'success' ? <OAuthSuccessState /> : null}

          {oauthState.status === 'error' ? (
            <OAuthErrorState
              message={oauthState.message}
              onClose={handleClose}
              onRetry={onStartOAuth}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </Modal>
  );
};
