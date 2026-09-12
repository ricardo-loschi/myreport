import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import TicketGrid from './components/TicketGrid';
import TimeEntryDialog from './components/TimeEntryDialog';
import TimeEntryDetailDialog from './components/TimeEntryDetailDialog';
import LoginScreen from './components/LoginScreen';
import { Snackbar, Alert } from '@mui/material';

// Componente que usa o contexto
const AppContent = () => {
  const { snackbar, setSnackbar, isAuthenticated, tickets } = useApp();
  console.log('🔍 isAuthenticated =', isAuthenticated);  
  // Estado para o diálogo de detalhes
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailEntries, setDetailEntries] = useState([]);
  const [detailTicket, setDetailTicket] = useState(null);
  const [detailDate, setDetailDate] = useState(null);

  const handleClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Função para abrir o diálogo de detalhes (será passada para o TicketGrid)
  const openDetailDialog = (ticketId, date, entries) => {
    setDetailTicket(ticketId);
    setDetailDate(date);
    setDetailEntries(entries);
    setDetailDialogOpen(true);
  };

  const closeDetailDialog = () => {
    setDetailDialogOpen(false);
    setDetailEntries([]);
    setDetailTicket(null);
    setDetailDate(null);
  };

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      <TicketGrid 
        onOpenDetailDialog={openDetailDialog}
      />
      <TimeEntryDialog />
      <TimeEntryDetailDialog
        open={detailDialogOpen}
        onClose={closeDetailDialog}
        entries={detailEntries}
        ticketId={detailTicket}
        date={detailDate}
        tickets={tickets}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
