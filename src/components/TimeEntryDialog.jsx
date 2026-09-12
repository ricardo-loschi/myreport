import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TimeEntryDialog = () => {
  const {
    isDialogOpen,
    closeDialog,
    selectedTicket,
    selectedDate,
    tickets,
    timeEntries,
    addTimeEntry,
    showSnackbar,
  } = useApp();

  const [hours, setHours] = useState(1);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Função para formatar a data sem problemas de fuso
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    // Divide a string da data (YYYY-MM-DD)
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Mês é 0-indexado
    const day = parseInt(parts[2]);
    // Cria a data no fuso local
    const dateObj = new Date(year, month, day);
    return format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Quando abrir o diálogo, carregar dados existentes se houver
  useEffect(() => {
    if (selectedTicket && selectedDate) {
      const existing = timeEntries.find(
        (e) => e.ticketId === selectedTicket && e.date === selectedDate
      );
      if (existing) {
        setHours(existing.hours);
        setDescription(existing.description || '');
      } else {
        setHours(1);
        setDescription('');
      }
    }
  }, [selectedTicket, selectedDate, timeEntries]);

  const ticketObj = tickets.find((t) => t.id === selectedTicket);

  const handleSubmit = async () => {
    if (!selectedTicket || !selectedDate) {
      showSnackbar('Dados incompletos', 'error');
      return;
    }
    if (!hours || hours === 0) {
      showSnackbar('Informe horas válidas (diferente de 0)', 'error');
      return;
    }

    setLoading(true);
    await addTimeEntry(selectedTicket, selectedDate, parseFloat(hours), description);
    setLoading(false);
  };

  return (
    <Dialog open={isDialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle>Apontamento de Horas</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Ticket com descrição completa */}
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Ticket
            </Typography>
            <Typography variant="h6">
              {ticketObj?.ticketid || 'Selecionado'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {ticketObj?.description || 'Sem descrição'}
            </Typography>
          </Box>

          <Typography variant="body2">
            Data: <strong>{formatDateDisplay(selectedDate)}</strong>
          </Typography>

          <TextField
            label="Horas"
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            inputProps={{ step: 0.5 }}
            helperText="Ex: 1.5 (para 1h30). Use números negativos para correções"
            fullWidth
          />

          <TextField
            label="Descrição do trabalho"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            placeholder="O que foi feito neste período?"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog} disabled={loading}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TimeEntryDialog;
