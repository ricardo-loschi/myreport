import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // ==================== ESTADOS ====================
  const [tickets, setTickets] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [ferias, setFerias] = useState([]); // <-- ADICIONADO
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Estado de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [error, setError] = useState('');

  // Dias do mês atual
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // ==================== FUNÇÃO DE LOGIN ====================
  const login = async (username, password, server) => {
    const startTime = Date.now();
    console.log('🔄 Iniciando login...');
    
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth', { username, password, server });
      if (response.data.success) {
        setIsAuthenticated(true);
        setUsername(username);
        setPassword(password);
        setServer(server);
        setTickets(response.data.tickets || []);
        
        // Busca apontamentos e férias em paralelo
        console.log('📡 Carregando dados em paralelo...');
        const parallelStart = Date.now();
        
        try {
          const [entriesResult, feriasResult] = await Promise.all([
            api.get('/timeEntries'),
            api.get('/ferias')
          ]);
          
          console.log(`✅ Dados carregados em: ${Date.now() - parallelStart}ms`);
          console.log(`📊 Apontamentos: ${entriesResult.data?.length || 0}`);
          console.log(`📊 Dias de férias: ${feriasResult.data?.length || 0}`);
          
          setTimeEntries(entriesResult.data || []);
          setFerias(feriasResult.data || []);
          
          showSnackbar(`Autenticado! ${entriesResult.data?.length || 0} apontamentos, ${feriasResult.data?.length || 0} dias de férias.`, 'success');
        } catch (parallelError) {
          console.error('❌ Erro ao carregar dados paralelos:', parallelError);
          setTimeEntries([]);
          setFerias([]);
          showSnackbar('Autenticado, mas não foi possível carregar todos os dados.', 'warning');
        }
      }
      
      console.log(`✅ TOTAL LOGIN: ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error('❌ Erro no login:', err.message);
      const msg = err.response?.data?.error || 'Erro ao conectar ao servidor';
      setError(msg);
      showSnackbar(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== LOGOUT ====================
  const logout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setServer('');
    setTickets([]);
    setTimeEntries([]);
    setFerias([]);
    setError('');
  };

  // ==================== FUNÇÕES AUXILIARES ====================
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const openDialog = (ticketId, date) => {
    setSelectedTicket(ticketId);
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedTicket(null);
    setSelectedDate(null);
  };

  // ==================== ADICIONAR HORAS ====================
  const addTimeEntry = async (ticketId, date, hours, description) => {
    setLoading(true);
    try {
      const response = await api.post('/labor', {
        ticketId,
        date,
        hours,
        description,
      });
      if (response.data.success) {
        // Atualiza localmente
        const existingIndex = timeEntries.findIndex(
          (e) => e.ticketId === ticketId && e.date === date
        );
        if (existingIndex >= 0) {
          const updated = [...timeEntries];
          updated[existingIndex] = { ...updated[existingIndex], hours, description };
          setTimeEntries(updated);
        } else {
          setTimeEntries([...timeEntries, { ticketId, date, hours, description }]);
        }
        showSnackbar('Horas salvas com sucesso!', 'success');
        closeDialog();
      } else {
        showSnackbar('Erro ao salvar', 'error');
      }
    } catch (err) {
      showSnackbar('Erro ao comunicar com o servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== NAVEGAÇÃO ENTRE MESES ====================
  const goToPrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // ==================== PROVIDER ====================
  return (
    <AppContext.Provider
      value={{
        // Dados
        tickets,
        timeEntries,
        ferias, // <-- ADICIONADO
        monthDays,
        currentMonth,
        // Navegação
        goToPrevMonth,
        goToNextMonth,
        goToToday,
        // Estados
        loading,
        snackbar,
        setSnackbar,
        showSnackbar,
        // Diálogos
        openDialog,
        closeDialog,
        isDialogOpen,
        selectedTicket,
        selectedDate,
        // Ações
        addTimeEntry,
        // Autenticação
        isAuthenticated,
        login,
        logout,
        error,
        username,
        server,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
