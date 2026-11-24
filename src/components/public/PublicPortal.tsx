import React, { useState } from 'react';
import { PublicLayout, PublicPage } from './PublicLayout.tsx';
import { PublicHome } from './PublicHome.tsx';
import { PublicAbout } from './PublicAbout.tsx';
import { PublicNews } from './PublicNews.tsx';
import { PublicAnnouncements } from './PublicAnnouncements.tsx';
import { PublicSchedule } from './PublicSchedule.tsx';
import { PublicDocuments } from './PublicDocuments.tsx';
import { PublicContact } from './PublicContact.tsx';
import { SchoolWebsiteEditModal, WebsiteTab } from './SchoolWebsiteEditModal.tsx';
import { LoginModal } from '../auth/LoginModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface PublicPortalProps {
  onEnterInternalPortal: () => void;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({ onEnterInternalPortal }) => {
  const { currentUser, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState<PublicPage>('home');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<WebsiteTab>('general');
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const handleOpenEdit = (tab: WebsiteTab = 'general') => {
    setEditModalTab(tab);
    setEditModalOpen(true);
  };

  const handleEnterInternalPortal = () => {
    if (currentUser) {
      onEnterInternalPortal();
    } else {
      setLoginModalOpen(true);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return (
          <PublicHome
            onNavigate={setCurrentPage}
            onEnterInternalPortal={handleEnterInternalPortal}
            onOpenEditModal={handleOpenEdit}
          />
        );
      case 'about':
        return <PublicAbout onOpenEditModal={handleOpenEdit} />;
      case 'news':
        return <PublicNews onOpenEditModal={handleOpenEdit} />;
      case 'announcements':
        return <PublicAnnouncements />;
      case 'schedule':
        return <PublicSchedule />;
      case 'documents':
        return <PublicDocuments />;
      case 'contact':
        return <PublicContact onOpenEditModal={handleOpenEdit} />;
      default:
        return (
          <PublicHome
            onNavigate={setCurrentPage}
            onEnterInternalPortal={handleEnterInternalPortal}
            onOpenEditModal={handleOpenEdit}
          />
        );
    }
  };

  return (
    <>
      <PublicLayout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onEnterInternalPortal={handleEnterInternalPortal}
        onOpenEditModal={handleOpenEdit}
      >
        {renderContent()}
      </PublicLayout>

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      {isAdmin && (
        <SchoolWebsiteEditModal
          isOpen={editModalOpen}
          initialTab={editModalTab}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </>
  );
};
