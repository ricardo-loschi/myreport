import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useApp } from '../context/AppContext';

const LoginScreen = () => {
  const { login, loading, error } = useApp();
  const [server, setServer] = useState('https://servicedesk.it-eam.com');
  const [username, setUsername] = useState('ricardo.freitas@it-eam.com');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password, server);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        bgcolor: '#f5f5f5',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            My Report Labor
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
            Conectar ao IBM Control Desk
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Servidor"
              variant="outlined"
              fullWidth
              margin="normal"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="https://icd.maxinst.com"
              required
              disabled={loading}
            />
            <TextField
              label="Usuário"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
            <TextField
              label="Senha"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginScreen;
