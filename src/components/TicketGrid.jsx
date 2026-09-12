import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Box,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import { ArrowBack, ArrowForward, Today, Search } from '@mui/icons-material';
import { format, isToday, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '../context/AppContext';

const TicketGrid = ({ onOpenDetailDialog }) => {
  // ==================== ÚNICO useApp() ====================
  const {
    tickets,
    timeEntries,
    ferias,
    monthDays,
    currentMonth,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    loading,
    openDialog,
  } = useApp();
  // ========================================================

  const [searchTerm, setSearchTerm] = useState('');

  // FORÇA RE-RENDERIZAÇÃO QUANDO TIMEENTRIES MUDAR
  useEffect(() => {
    console.log('🔄 TimeEntries mudou, quantidade:', timeEntries.length);
    if (timeEntries.length > 0) {
      console.log('📝 Primeiro apontamento:', timeEntries[0]);
      console.log('🔍 Tickets disponíveis:', tickets.map(t => t.ticketid));
    }
  }, [timeEntries, tickets]);

  // LOGS para depuração
  console.log('🎫 Tickets:', tickets);
  console.log('⏰ TimeEntries:', timeEntries);
  console.log('📅 Dias do mês:', monthDays.length);
  console.log('🏖️ Dias de férias:', ferias);

  // Função para verificar se uma data é de férias
  const isFerias = (dateStr) => {
    return ferias.some(f => f.date === dateStr);
  };

  // Verifica a correspondência
  console.log('📌 IDs dos tickets:', tickets.map(t => ({ id: t.id, ticketid: t.ticketid })));

  // Filtra tickets com base no termo de pesquisa
  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    return tickets.filter(ticket =>
      ticket.ticketid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tickets, searchTerm]);

  // Função para obter a soma de horas de um ticket em uma data
  const getHoursForTicketAndDate = (ticket, dateStr) => {
    if (!timeEntries || timeEntries.length === 0) return 0;
    
    const ticketId = ticket.ticketid || ticket.id;
    
    const entries = timeEntries.filter(
      (e) => String(e.ticketId) === String(ticketId) && e.date === dateStr
    );
    
    const total = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    
    return total;
  };

  // Função para obter todos os apontamentos de um ticket em uma data (com deduplicação)
  const getEntriesForTicketAndDate = (ticket, dateStr) => {
    const ticketId = ticket.ticketid || ticket.id;
    
    let entries = timeEntries.filter(
      (e) => String(e.ticketId) === String(ticketId) && e.date === dateStr
    );
    
    // Remove duplicatas baseado no ID
    const seenIds = new Set();
    entries = entries.filter(entry => {
      const id = entry.id || entry.LABTRANSID || `temp-${Math.random()}`;
      if (seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    });
    
    return entries;
  };

  // Soma de horas por dia (rodapé)
  const getDailyTotal = (dateStr) => {
    const filteredIds = new Set(filteredTickets.map(t => t.ticketid || t.id));
    const total = timeEntries
      .filter((e) => filteredIds.has(e.ticketId) && e.date === dateStr)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
    return total;
  };

  // Handler para clique na célula
  const handleCellClick = (ticket, dateStr) => {
    const entries = getEntriesForTicketAndDate(ticket, dateStr);
    const ticketId = ticket.ticketid || ticket.id;
    
    console.log(`🖱️ Clicou em ${ticketId} - ${dateStr}: ${entries.length} apontamento(s)`);
    
    if (entries.length > 1) {
      onOpenDetailDialog(ticketId, dateStr, entries);
    } else {
      openDialog(ticketId, dateStr);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </Typography>
        <IconButton onClick={goToPrevMonth}>
          <ArrowBack />
        </IconButton>
        <IconButton onClick={goToNextMonth}>
          <ArrowForward />
        </IconButton>
        <IconButton onClick={goToToday} color="primary">
          <Today />
        </IconButton>

        <TextField
          size="small"
          placeholder="Pesquisar ticket..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ ml: 'auto', minWidth: 200 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography variant="caption" color="textSecondary">
          {filteredTickets.length} de {tickets.length} tickets
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 200, fontWeight: 'bold' }}>
                Tickets ({tickets.length})
              </TableCell>
              {monthDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isWeekendDay = isWeekend(day);
                const isTodayDay = isToday(day);
                return (
                  <TableCell
                    key={dateStr}
                    align="center"
                    sx={{
                      minWidth: 50,
                      backgroundColor: isTodayDay ? '#e3f2fd' : 'inherit',
                      fontWeight: isTodayDay ? 'bold' : 'normal',
                      color: isWeekendDay ? '#bdbdbd' : 'inherit',
                    }}
                  >
                    <div>{format(day, 'dd')}</div>
                    <div style={{ fontSize: '0.7rem' }}>
                      {format(day, 'EEE', { locale: ptBR })}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                  <div>
                    <strong>{ticket.ticketid}</strong>
                  </div>
                  <div 
                    style={{ 
                      fontSize: '0.8rem', 
                      color: '#666',
                      maxWidth: '200px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      cursor: 'default',
                    }}
                    title={ticket.description}
                  >
                    {ticket.description || 'Sem descrição'}
                  </div>
                </TableCell>
                {monthDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const totalHours = getHoursForTicketAndDate(ticket, dateStr);
                  const entries = getEntriesForTicketAndDate(ticket, dateStr);
                  const isWeekendDay = isWeekend(day);
                  const isFeriasDay = isFerias(dateStr);
                  
                  // Define cores
                  let backgroundColor = 'transparent';
                  let textColor = isWeekendDay ? '#bdbdbd' : 'inherit';
                  let displayText = '-';
                  
                  if (totalHours > 0) {
                    backgroundColor = '#c8e6c9'; // Verde para positivo
                    textColor = '#2e7d32';
                    displayText = totalHours;
                  } else if (totalHours < 0) {
                    backgroundColor = '#ffcdd2'; // Vermelho para negativo
                    textColor = '#c62828';
                    displayText = totalHours;
                  } else if (isFeriasDay) {
                    backgroundColor = '#bbdefb'; // Azul para férias
                    textColor = '#0d47a1';
                    displayText = 'F';
                  }
                  
                  return (
                    <TableCell
                      key={dateStr}
                      align="center"
                      sx={{
                        cursor: isFeriasDay ? 'default' : 'pointer',
                        backgroundColor: backgroundColor,
                        '&:hover': { backgroundColor: isFeriasDay ? '#bbdefb' : '#bbdefb' },
                        color: textColor,
                        fontWeight: totalHours !== 0 ? 'bold' : 'normal',
                      }}
                      onClick={() => {
                        if (!isFeriasDay) {
                          handleCellClick(ticket, dateStr);
                        }
                      }}
                    >
                      {displayText}
                      {entries.length > 1 && (
                        <span style={{ fontSize: '0.7rem', marginLeft: '4px', color: '#666' }}>
                          ({entries.length})
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Total horas</TableCell>
              {monthDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const total = getDailyTotal(dateStr);
                const isFeriasDay = isFerias(dateStr);
                return (
                  <TableCell 
                    key={dateStr} 
                    align="center" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: total < 0 ? '#c62828' : (isFeriasDay ? '#0d47a1' : 'inherit'),
                      backgroundColor: isFeriasDay && total === 0 ? '#bbdefb' : 'transparent',
                    }}
                  >
                    {total !== 0 ? total : (isFeriasDay ? 'F' : '0')}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TicketGrid;
