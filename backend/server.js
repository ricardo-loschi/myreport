const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const app = express();
const PORT = 3001;
const https = require('https');

app.use(cors({
  origin: 'http://localhost:3000', // URL do seu React
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: 'maximo-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // se usar HTTPS, mude para true
}));

// Rota de autenticação
app.post('/auth', async (req, res) => {
  const { username, password, server } = req.body;
  if (!username || !password || !server) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    // 1. Verifica a pessoa
    const personUrl = `${server}/maximo/rest/mbo/PERSON?_format=json&personid=${username}&_lid=${username}&_lpwd=${password}`;
    const personRes = await axios.get(personUrl);
    const personData = personRes.data.PERSONMboSet.PERSON[0];
    const status = personData.Attributes.STATUS?.content;
    if (status !== 'ACTIVE' && status !== 'ATIVO') {
      return res.status(401).json({ error: 'Usuário não ativo no Maximo' });
    }

    // 2. Obtém DEFSITE do MAXUSER
    const maxuserUrl = `${server}/maximo/rest/mbo/MAXUSER?_format=json&personid=${username}&_lid=${username}&_lpwd=${password}`;
    const maxuserRes = await axios.get(maxuserUrl);
    const maxuserData = maxuserRes.data.MAXUSERMboSet.MAXUSER[0];
    const defsite = maxuserData.Attributes.DEFSITE?.content;
    if (!defsite) {
      return res.status(400).json({ error: 'Site padrão não definido' });
    }

    // 3. Obtém LABORCODE
    const laborUrl = `${server}/maximo/rest/mbo/LABOR?_format=json&personid=${username}&_lid=${username}&_lpwd=${password}`;
    const laborRes = await axios.get(laborUrl);
    const laborData = laborRes.data.LABORMboSet.LABOR[0];
    const laborcode = laborData.Attributes.LABORCODE?.content;

    // 4. Busca os tickets (work orders) abertos atribuídos ao usuário
    //    (mesma lógica do Python: busca LABTRANS e depois TICKET)
    const tickets = await getTickets(server, username, password);
    const timeEntries = await getTimeEntries(server, username, password);

    // Guarda informações na sessão
    req.session.username = username;
    req.session.password = password;
    req.session.server = server;
    req.session.defsite = defsite;
    req.session.laborcode = laborcode;

    res.json({
      success: true,
      defsite,
      laborcode,
      tickets,
      timeEntries,	    
    });
  } catch (error) {
    console.error('Erro na autenticação:', error.message);
    res.status(500).json({ error: 'Falha na autenticação com o Maximo' });
  }
});

// Função para buscar tickets (igual ao Python)
async function getTickets(server, username, password) {
  try {
    console.log(`🔍 Buscando tickets para: ${username}`);
    
    // Busca LABTRANS do usuário
    const labtransUrl = `${server}/maximo/rest/mbo/LABTRANS?_format=json&laborcode=${username}&_lid=${username}&_lpwd=${password}`;
    const response = await axios.get(labtransUrl, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });
    
    const labtransData = response.data.LABTRANSMboSet?.LABTRANS || [];
    console.log(`📊 Encontrados ${labtransData.length} registros de LABTRANS`);
    
    // Extrai ticketids únicos
    const ticketIds = [...new Set(
      labtransData
        .map(item => item.Attributes?.TICKETID?.content)
        .filter(Boolean)
    )];
    console.log(`📌 Ticket IDs encontrados: ${ticketIds.length}`);
    
    const tickets = [];
    for (const ticketId of ticketIds) {
      try {
        // Busca o ticket com status
        const ticketUrl = `${server}/maximo/rest/mbo/TICKET?_format=json&ticketid=${ticketId}&_lid=${username}&_lpwd=${password}`;
        const ticketRes = await axios.get(ticketUrl, {
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });
        
        const ticketData = ticketRes.data.TICKETMboSet?.TICKET?.[0];
        if (ticketData) {
          const status = ticketData.Attributes?.STATUS?.content || '';
          const description = ticketData.Attributes?.DESCRIPTION?.content || 'Sem descrição';
          
          // ========== FILTRO: APENAS TICKETS ABERTOS ==========
          // Exclui tickets com status SOLUC ou FECHADO
          const statusUpper = status.toUpperCase();
          if (statusUpper !== 'SOLUC' && statusUpper !== 'FECHADO' && statusUpper !== 'CLOSED' && statusUpper !== 'RESOLVED') {
            tickets.push({
              id: ticketId,
              ticketid: ticketId,
              description: description,
              status: status,
            });
            console.log(`✅ Ticket ${ticketId} - Status: ${status} (INCLUÍDO)`);
          } else {
            console.log(`⏭️ Ticket ${ticketId} - Status: ${status} (EXCLUÍDO - solucionado/fechado)`);
          }
        }
      } catch (e) {
        console.log(`⚠️ Erro ao buscar ticket ${ticketId}:`, e.message);
      }
    }
    
    console.log(`✅ Total de tickets abertos: ${tickets.length}`);
    return tickets;
  } catch (error) {
    console.error('❌ Erro ao buscar tickets:', error.message);
    return [];
  }
}
async function getTimeEntries(server, username, password) {
  try {
    const url = `${server}/maximo/rest/mbo/LABTRANS?_format=json&laborcode=${username}&_lid=${username}&_lpwd=${password}`;
    const response = await axios.get(url, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });
    const labtransData = response.data.LABTRANSMboSet?.LABTRANS || [];
    // Filtra apenas os registros onde laborcode == username (ou personid)
    const filtered = labtransData.filter(item => {
      //const laborcode = item.Attributes?.LABORCODE?.content;
      let laborcode = laborData?.Attributes?.LABORCODE?.content || laborData?.Attributes?.LABORCODE || '';
      laborcode = String(laborcode);
      return laborcode === username;
    });
    // Mapeia para o formato esperado
    return filtered.map(item => {
      const attrs = item.Attributes;
      return {
        id: attrs?.LABTRANSID?.content || Math.random().toString(36).substr(2, 9),
        ticketId: attrs?.TICKETID?.content,
        date: attrs?.STARTDATETIME?.content ? attrs.STARTDATETIME.content.substring(0, 10) : null,
        hours: parseFloat(attrs?.REGULARHRS?.content?.replace(',', '.') || 0),
        description: attrs?.MEMO?.content || '',
      };
    }).filter(e => e.ticketId && e.date);
  } catch (error) {
    console.error('Erro ao buscar apontamentos:', error.message);
    return [];
  }
}


// Rota para listar tickets (já autenticado)
app.get('/tickets', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { username, password, server } = req.session;
  try {
    const tickets = await getTickets(server, username, password);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tickets' });
  }
});

// Rota para lançar horas (LABTRANS)
app.post('/labor', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const { ticketId, date, hours, description } = req.body;
  const { username, password, server, defsite, laborcode } = req.session;

  if (!ticketId || !date || !hours || hours <= 0) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  try {
    // Data no formato YYYY-MM-DD
    const selectedDate = date;
    
    // Formata a data para o Maximo (YYYY-MM-DDThh:mm:ss-03:00)
    // Usamos um horário padrão (08:00) pois o Maximo precisa de um datetime
    const dateTime = `${selectedDate}T08:00:00-03:00`;
    
    // Prepara os parâmetros para o Maximo
    const params = {
      _action: 'AddChange',
      LABORCODE: laborcode,
      REGULARHRS: String(hours).replace('.', ','), // Maximo usa vírgula como decimal
      ticketid: ticketId,
      ticketclass: 'SS', // Service Request
      siteid: defsite,
      memo: description || 'Apontamento via React',
      // Campos de data - todos com a mesma data selecionada
      STARTDATE: selectedDate,
      //FINISHDATE: dateTime,
      //TRANSDATE: dateTime,
      // Horários fixos (opcionais, mas ajudam)
      //STARTTIME: '08:00:00',
      //FINISHTIME: '08:00:00',
    };

    console.log('📝 Lançando horas:', {
      ticketId,
      date: selectedDate,
      hours,
      description,
    });

    const url = `${server}/maximo/rest/mbo/LABTRANS?_lid=${username}&_lpwd=${password}`;
    const response = await axios.post(url, null, { 
      params,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });
    
    if (response.status === 200) {
      console.log('✅ Horas lançadas com sucesso!');
      res.json({ success: true, message: 'Horas lançadas com sucesso' });
    } else {
      console.error('❌ Resposta inesperada:', response.status);
      res.status(500).json({ error: 'Falha ao gravar no Maximo' });
    }
  } catch (error) {
    console.error('❌ Erro ao lançar horas:');
    console.error('Mensagem:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    }
    res.status(500).json({ error: 'Erro ao comunicar com o Maximo: ' + error.message });
  }
});


// Rota para detalhes de um dia específico
app.get('/timeEntries/detail', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { ticketId, date } = req.query;
  if (!ticketId || !date) {
    return res.status(400).json({ error: 'ticketId e date são obrigatórios' });
  }
  const { username, password, server } = req.session;
  try {
    // Busca todos os LABTRANS para esse ticket e data
    const url = `${server}/maximo/rest/mbo/LABTRANS?_format=json&_lid=${username}&_lpwd=${password}`;
    const response = await axios.get(url, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });
    const labtransData = response.data.LABTRANSMboSet?.LABTRANS || [];
    const filtered = labtransData.filter(item => {
      const attrs = item.Attributes;
      const laborcode = attrs?.LABORCODE?.content;
      const ticketIdAttr = attrs?.TICKETID?.content;
      const startDate = attrs?.STARTDATETIME?.content?.substring(0, 10);
      return laborcode === username && ticketIdAttr === ticketId && startDate === date;
    });
    const entries = filtered.map(item => {
      const attrs = item.Attributes;
      return {
        id: attrs?.LABTRANSID?.content || Math.random().toString(36).substr(2, 9),
        hours: parseFloat(attrs?.REGULARHRS?.content?.replace(',', '.') || 0),
        description: attrs?.MEMO?.content || '',
        startTime: attrs?.STARTDATETIME?.content,
        endTime: attrs?.FINISHDATETIME?.content,
      };
    });
    res.json(entries);
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error.message);
    res.status(500).json({ error: 'Erro ao buscar detalhes' });
  }
});

// Rota para buscar os apontamentos (timeEntries) do usuário
app.get('/timeEntries', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const { username, password, server } = req.session;
  
  try {
    console.log(`🔍 Buscando apontamentos para: ${username}`);
    
    const labtransUrl = `${server}/maximo/rest/mbo/LABTRANS?_format=json&laborcode=${username}&_lid=${username}&_lpwd=${password}`;
    console.log('📡 URL:', labtransUrl);
    
    const response = await axios.get(labtransUrl, {
      httpsAgent: new (require('https').Agent)({ 
        rejectUnauthorized: false,
        keepAlive: true,
      }),
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    console.log('✅ Status:', response.status);
    
    if (!response.data) {
      console.log('❌ Resposta vazia');
      return res.json([]);
    }
    
    const labtransSet = response.data?.LABTRANSMboSet;
    if (!labtransSet) {
      console.log('❌ LABTRANSMboSet não encontrado');
      return res.json([]);
    }
    
    const labtransData = labtransSet.LABTRANS || [];
    console.log(`📊 Encontrados ${labtransData.length} registros`);
    
    const timeEntries = labtransData
      .map((item, index) => {
        const attrs = item.Attributes || {};
        
        // Extrai ticketId
        let ticketId = attrs.TICKETID?.content || attrs.TICKETID || '';
        ticketId = String(ticketId);
        
        // Extrai data e NORMALIZA (remove o horário)
        let rawDate = attrs.STARTDATE?.content || attrs.STARTDATE || attrs.TRANSDATE?.content || attrs.TRANSDATE || '';
        // Se for string, pega apenas a parte da data (antes do T)
        let date = String(rawDate);
        if (date.includes('T')) {
          date = date.split('T')[0];
        }
        // Se tiver formato diferente, tenta extrair a data
        if (date.length > 10) {
          // Tenta extrair data no formato YYYY-MM-DD
          const match = date.match(/(\d{4}-\d{2}-\d{2})/);
          if (match) {
            date = match[1];
          }
        }
        
        // Extrai horas
        let hoursStr = '0';
        if (attrs.REGULARHRS !== undefined && attrs.REGULARHRS !== null) {
          if (typeof attrs.REGULARHRS === 'object' && attrs.REGULARHRS.content !== undefined) {
            hoursStr = String(attrs.REGULARHRS.content);
          } else {
            hoursStr = String(attrs.REGULARHRS);
          }
        }
        //hoursStr = hoursStr.replace(/[^0-9.,]/g, '');
	hoursStr = hoursStr.replace(/[^0-9.,-]/g, '');
        const hours = parseFloat(hoursStr.replace(',', '.')) || 0;
        
        // Extrai descrição
        let description = attrs.MEMO?.content || attrs.MEMO || '';
        description = String(description);
        
        // Extrai startTime e finishTime
        let startTime = attrs.STARTTIME?.content || attrs.STARTTIME || '';
        startTime = String(startTime);
        let finishTime = attrs.FINISHTIME?.content || attrs.FINISHTIME || '';
        finishTime = String(finishTime);
        
        return {
          id: attrs.LABTRANSID?.content || attrs.LABTRANSID || `temp-${index}`,
          ticketId: ticketId,
          date: date, // Agora no formato YYYY-MM-DD
          hours: hours,
          description: description,
          startTime: startTime,
          finishTime: finishTime,
        };
      })
      .filter(entry => entry.ticketId && entry.date);
    
    console.log(`✅ Total processado: ${timeEntries.length}`);
    
    if (timeEntries.length > 0) {
      console.log('📝 Exemplo do primeiro apontamento (data normalizada):', {
        ticketId: timeEntries[0].ticketId,
        date: timeEntries[0].date,
        hours: timeEntries[0].hours,
        description: timeEntries[0].description,
      });
    }
    
    res.json(timeEntries);
    
  } catch (error) {
    console.error('❌ ERRO AO BUSCAR APONTAMENTOS:');
    console.error('Mensagem:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    }
    res.json([]);
  }
});

// Rota para buscar dias de férias (MODAVAIL)
app.get('/ferias', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const { username, password, server } = req.session;
  
  try {
    console.log(`🔍 Buscando férias para: ${username}`);
    
    const feriasUrl = `${server}/maximo/rest/mbo/MODAVAIL?_format=json&personid=${username}&_lid=${username}&_lpwd=${password}`;
    console.log('📡 URL:', feriasUrl);
    
    const response = await axios.get(feriasUrl, {
      httpsAgent: new (require('https').Agent)({ 
        rejectUnauthorized: false,
        keepAlive: true,
      }),
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    console.log('✅ Status:', response.status);
    
    if (!response.data) {
      console.log('❌ Resposta vazia');
      return res.json([]);
    }
    
    const modavailSet = response.data?.MODAVAILMboSet;
    if (!modavailSet) {
      console.log('❌ MODAVAILMboSet não encontrado');
      return res.json([]);
    }
    
    const modavailData = modavailSet.MODAVAIL || [];
    console.log(`📊 Encontrados ${modavailData.length} registros de férias`);
    
    // Processa os dados
    const ferias = modavailData
      .map((item) => {
        const attrs = item.Attributes || {};
        
        // Extrai a data
        let rawDate = attrs.WORKDATE?.content || '';
        let date = String(rawDate);
        if (date.includes('T')) {
          date = date.split('T')[0];
        }
        if (date.length > 10) {
          const match = date.match(/(\d{4}-\d{2}-\d{2})/);
          if (match) {
            date = match[1];
          }
        }
        
        // Extrai horas
        const workHours = attrs.WORKHOURS?.content || 0;
        const reasonCode = attrs.REASONCODE?.content || '';
        const dayOfWeek = attrs.DAY?.content || '';
        
        return {
          date: date,
          hours: workHours,
          reason: reasonCode,
          day: dayOfWeek,
        };
      })
      .filter(entry => entry.date);
    
    console.log(`✅ Total de dias de férias processados: ${ferias.length}`);
    res.json(ferias);
    
  } catch (error) {
    console.error('❌ ERRO AO BUSCAR FÉRIAS:');
    console.error('Mensagem:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    }
    res.json([]);
  }
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    authenticated: !!req.session?.username,
  });
});

app.use(cors({
  origin: [
    'http://localhost:3000',
    /\.vercel\.app$/,  // aceita qualquer subdomínio .vercel.app
  ],
  credentials: true,
}));

app.use(session({
  secret: 'maximo-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,        // true porque a Render usa HTTPS
    sameSite: 'none',    // necessário para cookies cross-domain
    httpOnly: true,
  },
}));

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
