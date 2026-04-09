import express from 'express';
import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listen } = vi.hoisted(() => {
  const listen = vi.fn((_port: unknown, cb?: () => void) => {
    cb?.();
    return {} as import('node:http').Server;
  });
  return { listen };
});

vi.mock('node:http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:http')>();
  return {
    ...actual,
    createServer: vi.fn(() => ({
      listen,
    })) as unknown as typeof actual.createServer,
  };
});

vi.mock('../createApp.js', () => ({
  createApp: vi.fn(),
}));

vi.mock('../serverLog.js', () => ({
  logServerError: vi.fn(),
}));

import { createApp } from '../createApp.js';
import { logServerError } from '../serverLog.js';
import { startServer } from '../startServer.js';

describe('startServer', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.mocked(createApp).mockReset();
    vi.mocked(logServerError).mockReset();
    vi.mocked(createServer).mockClear();
    listen.mockClear();
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('creates an HTTP server and logs when listening', async () => {
    process.env.NODE_ENV = 'development';
    vi.mocked(createApp).mockResolvedValue(express());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await startServer();

    expect(createApp).toHaveBeenCalledWith('development');
    expect(createServer).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Server running'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Vite integrated'));
  });

  it('uses production mode when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    vi.mocked(createApp).mockResolvedValue(express());
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await startServer();

    expect(createApp).toHaveBeenCalledWith('production');
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Vite integrated'));
  });

  it('logs and exits when createApp throws an Error', async () => {
    vi.mocked(createApp).mockRejectedValue(new Error('setup fail'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await startServer();

    expect(logServerError).toHaveBeenCalledWith(
      'startServer',
      expect.objectContaining({ message: 'setup fail' }),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(createServer).not.toHaveBeenCalled();
  });

  it('logs non-Error rejections', async () => {
    vi.mocked(createApp).mockRejectedValue('weird');
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await startServer();

    expect(logServerError).toHaveBeenCalledWith(
      'startServer',
      expect.objectContaining({ message: 'weird' }),
    );
  });
});
