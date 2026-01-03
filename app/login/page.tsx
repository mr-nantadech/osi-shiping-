'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import Image from 'next/image';
import TruckAnimationBackground from '@/components/TruckAnimationBackground';
import type { LoginResponse } from '@/types/auth';
const LOGIN_URL = '/api/login';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('test@snjinter.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [vehiclePhase, setVehiclePhase] = useState<'enter' | 'idle' | 'exit'>(
    'enter',
  );
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVehiclePhase('idle'), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await axios.post<LoginResponse>(
        LOGIN_URL,
        { email, password },
        { headers: { 'Content-Type': 'application/json' } },
      );

      if (data?.data_model) {
        setVehiclePhase('exit');
        setIsExiting(true); // Disable button during exit animation
        setTimeout(() => {
          router.replace('/');
          router.refresh();
          setIsExiting(false); // Reset exiting state after redirect
        }, 1500);
        return;
      }

      setError('Invalid credentials or missing account.');
    } catch (err) {
      console.error('Login error', err);
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <TruckAnimationBackground phase={vehiclePhase} />
      <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
        <Card className="w-[400px] h-[450px] shadow-xl rounded-2xl flex flex-col justify-center bg-white bg-opacity-90 backdrop-blur-sm">
          <CardContent className="px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex justify-center mb-9">
              <Image
                src="/logo/osi_logo.png"
                alt="OSI logo"
                width={150}
                height={100}
                priority
              />
            </div>

            {error && (
              <Alert severity="error" className="mb-4">
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={5} className="mt-4">
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || isExiting}
                  startIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : null
                  }
                >
                  {loading || isExiting ? 'Signing in...' : 'Sign In'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
