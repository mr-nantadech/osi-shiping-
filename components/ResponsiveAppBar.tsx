'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { SessionUser } from '@/types/auth';
import { usePermission } from '@/contexts/PermissionContext';
import { PERMISSIONS } from '@/constants/permissions';

const pages = [
  { label: 'Home', path: '/', permission: null },
  {
    label: 'Shipping',
    path: '/shipping',
    permission: PERMISSIONS.ACCESS_SHIPPING_PAGE,
  },
  {
    label: 'Collector',
    path: '/collector',
    permission: PERMISSIONS.ACCESS_COLLECTOR_PAGE,
  },
  {
    label: 'Master Data',
    path: '/master',
    permission: PERMISSIONS.ACCESS_MASTER_DATA_PAGE,
  },
];
const settings = ['Logout'];

export default function ResponsiveAppBar() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasPermission, isLoading } = usePermission();
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null,
  );
  const [userName, setUserName] = React.useState<string>('');
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [mobileUserOpen, setMobileUserOpen] = React.useState(false);
  const menuContainerRef = React.useRef<HTMLDivElement>(null);
  const menuItemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Filter pages based on user permissions
  const visiblePages = React.useMemo(() => {
    return pages.filter((page) => {
      if (page.permission === null) return true;
      return hasPermission(page.permission);
    });
  }, [hasPermission]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const res = await fetch('/api/session', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) {
            setUserName('User');
          }
          return;
        }

        const json = (await res.json()) as { user: SessionUser };
        const first = json?.user?.firstName_EN ?? '';
        const last = json?.user?.lastName_EN ?? '';
        const fullName = `${first} ${last}`.trim();
        if (!cancelled) {
          setUserName(fullName || 'User');
        }
      } catch (err) {
        console.error('Failed to load session user', err);
        if (!cancelled) {
          setUserName('User');
        }
      }
    }

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const isActivePath = React.useCallback(
    (path: string) => {
      if (path === '/') {
        return pathname === '/';
      }
      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname],
  );

  const updateIndicator = React.useCallback((element: HTMLButtonElement) => {
    if (menuContainerRef.current && element) {
      const baseWidth = element.offsetWidth;
      const width = baseWidth * 1.05;
      const height = element.offsetHeight * 1.05;
      // Adjust left position to account for scale from center
      const offsetLeft = element.offsetLeft - (baseWidth * 0.05 / 2);
      menuContainerRef.current.style.setProperty(
        '--indicator-left',
        `${offsetLeft}px`,
      );
      menuContainerRef.current.style.setProperty(
        '--indicator-width',
        `${width}px`,
      );
      menuContainerRef.current.style.setProperty(
        '--indicator-height',
        `${height}px`,
      );
    }
  }, []);

  React.useEffect(() => {
    if (isLoading) return;

    const activeIndex = visiblePages.findIndex((page) =>
      isActivePath(page.path),
    );
    if (activeIndex !== -1 && menuItemRefs.current[activeIndex]) {
      updateIndicator(menuItemRefs.current[activeIndex]!);
    }
  }, [pathname, visiblePages, isActivePath, updateIndicator, isLoading]);

  React.useEffect(() => {
    const handleResize = () => {
      const activeIndex = visiblePages.findIndex((page) =>
        isActivePath(page.path),
      );
      if (activeIndex !== -1 && menuItemRefs.current[activeIndex]) {
        updateIndicator(menuItemRefs.current[activeIndex]!);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [visiblePages, isActivePath, updateIndicator]);

  const handleOpenNavMenu = () => {
    setMobileNavOpen((prev) => {
      const next = !prev;
      if (next) {
        setMobileUserOpen(false);
        setAnchorElUser(null);
      }
      return next;
    });
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    if (isMobile) {
      setMobileUserOpen((prev) => {
        const next = !prev;
        if (next) {
          setMobileNavOpen(false);
        }
        return next;
      });
      return;
    }
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = (page?: (typeof pages)[number] | null) => {
    setMobileNavOpen(false);
    setMobileUserOpen(false);
    if (page?.path) {
      router.push(page.path);
    }
  };

  const handleCloseUserMenu = async (setting?: string) => {
    setAnchorElUser(null);
    setMobileUserOpen(false);

    if (setting === 'Logout') {
      setUserName('User');
      await fetch('/api/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <AppBar
      position="fixed"
      color="primary"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ gap: 2, position: 'relative' }}>
          {/* Desktop brand */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
            }}
          >
            <Image
              src="/logo/osi_logo_white.png"
              alt="OSI logo"
              width={70}
              height={40}
              style={{ objectFit: 'contain' }}
              priority
            />
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                router.push('/');
              }}
              sx={{
                fontWeight: 700,
                letterSpacing: '.08rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Shipping
            </Typography>
          </Box>

          {/* Mobile brand (logo only, centered) */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              position: 'absolute',
              left: 0,
              right: 0,
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Image
              src="/logo/osi_logo_white.png"
              alt="OSI logo"
              width={70}
              height={48}
              style={{ objectFit: 'contain' }}
              priority
            />
          </Box>

          {/* Desktop center menu */}
          <Box
            ref={menuContainerRef}
            sx={{
              flexGrow: 1,
              display: { xs: 'none', md: 'flex' },
              justifyContent: 'center',
              position: 'relative',
              gap: 2.5,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: 0,
                transform:
                  'translateX(var(--indicator-left, 0)) translateY(-50%)',
                width: 'var(--indicator-width, 0)',
                height: 'var(--indicator-height, 0)',
                borderRadius: '999px',
                backgroundColor: '#0d29d1',
                boxShadow: '0 4px 12px rgba(13, 41, 209, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 0,
              },
            }}
          >
            {visiblePages.map((page, index) => (
              <Button
                key={page.path}
                ref={(el) => {
                  menuItemRefs.current[index] = el;
                }}
                onClick={() => handleCloseNavMenu(page)}
                sx={{
                  my: 2,
                  display: 'block',
                  minWidth: 140,
                  width: 140,
                  color: 'white',
                  fontWeight: isActivePath(page.path) ? 800 : 500,
                  backgroundColor: 'transparent',
                  borderRadius: 999,
                  px: 2,
                  justifyContent: 'center',
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                  zIndex: 1,
                  transform: isActivePath(page.path)
                    ? 'scale(1.05)'
                    : 'scale(1)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    fontWeight: 700,
                    transform: 'scale(1.05)',
                  },
                }}
              >
                {page.label}
              </Button>
            ))}
          </Box>

          {/* Mobile burger */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <IconButton
              size="large"
              aria-label="menu"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="left"
              open={mobileNavOpen}
              onClose={() => setMobileNavOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': {
                  transition: 'transform 0.3s ease-in-out',
                },
              }}
            >
              <Box
                sx={{
                  width: 260,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100%',
                  bgcolor: 'background.paper',
                }}
                role="presentation"
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    mt: 7,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    OSI Shipping
                  </Typography>
                </Box>
                <Divider />
                <List>
                  {visiblePages.map((page) => (
                    <ListItem key={page.path} disablePadding>
                      <ListItemButton
                        selected={isActivePath(page.path)}
                        onClick={() => handleCloseNavMenu(page)}
                        sx={{
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateX(8px)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(13, 41, 209, 0.12)',
                            '&:hover': {
                              backgroundColor: 'rgba(13, 41, 209, 0.2)',
                            },
                          },
                        }}
                      >
                        <ListItemText
                          primary={page.label}
                          primaryTypographyProps={{
                            fontWeight: isActivePath(page.path) ? 700 : 500,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ mt: 'auto' }} />
              </Box>
            </Drawer>
          </Box>

          <Box
            sx={{
              flexGrow: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography
              sx={{ display: { xs: 'none', sm: 'block', fontSize: '1.1rem' } }}
            >
              {userName}
            </Typography>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt="User" />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={() => handleCloseUserMenu()}
            >
              {settings.map((setting) => (
                <MenuItem
                  key={setting}
                  onClick={() => handleCloseUserMenu(setting)}
                >
                  <Typography sx={{ textAlign: 'center' }}>
                    {setting}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>
            <Drawer
              anchor="right"
              open={mobileUserOpen}
              onClose={() => handleCloseUserMenu()}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': {
                  transition: 'transform 0.3s ease-in-out',
                },
              }}
            >
              <Box
                sx={{
                  width: 240,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100%',
                }}
                role="presentation"
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 2,
                    mt: 6,
                  }}
                >
                  <Avatar alt="User" />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {userName || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Account
                    </Typography>
                  </Box>
                </Box>
                <Divider />
                <List>
                  {settings.map((setting) => (
                    <ListItem key={setting} disablePadding>
                      <ListItemButton
                        onClick={() => handleCloseUserMenu(setting)}
                      >
                        <ListItemText primary={setting} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Drawer>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
