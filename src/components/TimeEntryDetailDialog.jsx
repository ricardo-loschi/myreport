import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TimeEntryDetailDialog = ({ 
  open, 
  onClose, 
  entries, 
  ticketId, 
  date, 
  tickets 
}) => {
  // Função para formatar a data sem problemas de fuso
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const dateObj = new Date(year, month, day);
    return format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Remove duplicatas baseado no ID
  const uniqueEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const seenIds = new Set();
    return entries.filter(entry => {
      const id = entry.id || entry.LABTRANSID || `temp-${Math.random()}`;
      if (seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    });
  }, [entries]);

  // Encontra o ticket para exibir a descrição
  const ticketObj = tickets?.find(t => t.id === ticketId || t.ticketid === ticketId);

  // Calcula o total de horas (incluindo negativas)
  const totalHours = uniqueEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Apontamentos do dia</Typography>
          <Chip 
            label={`Total: ${totalHours.toFixed(2)}h`} 
            color={totalHours < 0 ? 'error' : 'primary'} 
            size="small"
          />
        </Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1 }}>
          {ticketId} - {ticketObj?.description || 'Sem descrição'}
        </Typography>
        <Typography variant="subtitle2" color="textSecondary">
          {formatDateDisplay(date)}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {uniqueEntries.length === 0 ? (
          <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
            Nenhum apontamento para este dia
          </Typography>
        ) : (
          <List>
            {uniqueEntries.map((entry, index) => {
              const isNegative = entry.hours < 0;
              return (
                <ListItem key={entry.id || index} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body1" sx={{ flex: 1 }}>
                          {entry.description || 'Sem descrição'}
                        </Typography>
                        <Chip 
                          label={`${entry.hours}h`} 
                          size="small" 
                          color={isNegative ? 'error' : 'primary'}
                          variant={isNegative ? 'outlined' : 'filled'}
                        />
                      </Box>
                    }
                    secondary={
                      // Usando React.Fragment em vez de Box para evitar div dentro de p
                      <>
                        {entry.startTime && entry.finishTime && (
                          <Typography variant="caption" color="textSecondary" component="span">
                            {entry.startTime} - {entry.finishTime}
                          </Typography>
                        )}
                        {entry.startTime && entry.finishTime && entry.id && (
                          <Typography variant="caption" color="textSecondary" component="span" sx={{ ml: 1 }}>
                            •
                          </Typography>
                        )}
                        {entry.id && (
                          <Typography variant="caption" color="textSecondary" component="span">
                            ID: {entry.id}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TimeEntryDetailDialog;
